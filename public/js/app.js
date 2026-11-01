const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let locMap = new Map();

async function api(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { data });
  return data;
}

// --- setup ---
function fillLocations(sel, locations) {
  const groups = {};
  locations.forEach(l => (groups[l.area] ||= []).push(l));
  const areas = Object.keys(groups).sort((a, b) => (a === 'Unknown') - (b === 'Unknown'));
  sel.innerHTML = '<option value="">Select a location…</option>' + areas.map(a =>
    `<optgroup label="${esc(a === 'Unknown' ? 'Other' : a)}">` +
    groups[a].map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('') +
    '</optgroup>').join('');
}

function setType(type) {
  const found = type === 'found';
  $('#found-fields').classList.toggle('hidden', !found);
  $$('#found-fields input').forEach(i => { i.disabled = !found; i.required = found; });
  $('#loc-label').textContent = found ? 'Where did you find it?' : 'Where did you lose it?';
}

function setToday() {
  const today = new Date().toLocaleDateString('en-CA');   // YYYY-MM-DD, local time
  $('#date').value = today;
  $('#date').max = today;
}

async function init() {
  const [locations, categories] = await Promise.all([api('/api/locations'), api('/api/categories')]);
  locMap = new Map(locations.map(l => [l.id, l]));
  fillLocations($('#location'), locations);
  const opts = categories.map(c => `<option>${esc(c)}</option>`).join('');
  $('#category').innerHTML = '<option value="">Select…</option>' + opts;
  $('#filter-category').innerHTML = '<option value="">All categories</option>' + opts;
  setToday();
  setType('lost');
}

// --- tabs and type toggle ---
$$('.tab').forEach(b => b.addEventListener('click', () => {
  $$('.tab').forEach(t => t.classList.toggle('active', t === b));
  $$('.panel').forEach(p => p.classList.toggle('hidden', p.id !== b.dataset.tab));
  if (b.dataset.tab === 'browse') loadItems();
}));
$$('input[name=type]').forEach(r => r.addEventListener('change', () => setType(r.value)));

// --- one card used by both Browse and match results ---
function itemCard(it, m) {
  const loc = locMap.get(it.locationId);
  const photo = it.image
    ? `<img src="/uploads/${encodeURIComponent(it.image)}" alt="">`
    : `<div class="noimg">${it.type === 'found' ? '📦' : '❓'}</div>`;
  const score = m ? `<span class="score">${m.score}/100</span>` : '';
  const why = m
    ? `<p class="why">Category ${m.breakdown.category}/40 · Location ${m.breakdown.location}/25 · ` +
      `Date ${m.breakdown.date}/15 · Keywords ${m.breakdown.keywords}/20` +
      (m.breakdown.sharedWords.length ? ` (${m.breakdown.sharedWords.map(esc).join(', ')})` : '') + '</p>'
    : '';
  const claim = it.type === 'found' && it.status === 'open' ? `
    <button class="claim-btn" type="button">This is mine</button>
    <div class="claim-box hidden">
      <p><b>Verification:</b> ${esc(it.verifyQuestion)}</p>
      <form class="claim-form" data-id="${it.id}">
        <input name="claimantName" placeholder="Your name" required>
        <input name="answer" placeholder="Your answer" required>
        <button type="submit">Verify</button>
      </form>
      <div class="claim-out"></div>
    </div>` : '';
  return `<article class="card">${photo}
    <div class="info">
      <h3>${esc(it.title)} <span class="tag ${it.type}">${it.type}</span>${score}</h3>
      <p class="meta">${esc(it.category)} · ${esc(loc ? loc.name : '?')} · ${esc(it.date)}</p>
      ${it.description ? `<p>${esc(it.description)}</p>` : ''}
      ${why}${claim}
    </div></article>`;
}

// --- report form ---
$('#report-form').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#report-msg'), box = $('#matches'), btn = $('#submit-btn');
  msg.className = ''; msg.textContent = 'Posting…'; box.innerHTML = ''; btn.disabled = true;
  try {
    const item = await api('/api/items', { method: 'POST', body: new FormData(e.target) });
    const matches = await api(`/api/items/${item.id}/matches`);
    msg.className = 'ok';
    msg.textContent = `✅ Posted "${item.title}".`;
    const heading = item.type === 'found'
      ? 'Similar items reported lost (owners can claim yours from Browse)'
      : 'Possible matches';
    box.innerHTML = matches.length
      ? `<h2>${heading} (${matches.length})</h2>` + matches.map(m => itemCard(m.item, m)).join('')
      : '<p class="muted">No matches yet. Check Browse again later.</p>';
    e.target.reset();
    setToday();
    setType('lost');
  } catch (err) {
    msg.className = 'err';
    msg.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// --- browse ---
async function loadItems() {
  const t = $('#filter-type').value, c = $('#filter-category').value;
  let items = await api('/api/items' + (t ? `?type=${t}` : ''));
  items = items.filter(i => i.status === 'open' && (!c || i.category === c));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $('#items').innerHTML = items.length
    ? items.map(i => itemCard(i)).join('')
    : '<p class="muted">Nothing here yet.</p>';
}
$('#filter-type').addEventListener('change', loadItems);
$('#filter-category').addEventListener('change', loadItems);

// --- claiming (works on any card, in Browse or in match results) ---
document.addEventListener('click', e => {
  const btn = e.target.closest('.claim-btn');
  if (btn) btn.parentElement.querySelector('.claim-box').classList.toggle('hidden');
});

document.addEventListener('submit', async e => {
  if (!e.target.classList.contains('claim-form')) return;
  e.preventDefault();
  const f = e.target, out = f.parentElement.querySelector('.claim-out');
  try {
    const r = await api(`/api/items/${f.dataset.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimantName: f.elements.claimantName.value,
        answer: f.elements.answer.value
      })
    });
    out.className = 'claim-out ok';
    out.innerHTML = `✅ ${esc(r.message)}<br><b>${esc(r.contactName)}</b> · ${esc(r.contact)}`;
    f.querySelector('button').disabled = true;
  } catch (err) {
    out.className = 'claim-out err';
    const left = err.data && err.data.attemptsLeft;
    out.textContent = err.message + (left !== undefined ? ` (${left} attempt${left === 1 ? '' : 's'} left)` : '');
  }
});

init().catch(err => {
  document.body.insertAdjacentHTML('afterbegin', `<p class="err" style="padding:12px">Could not load: ${esc(err.message)}</p>`);
});
