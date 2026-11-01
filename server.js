const express = require('express');
const multer = require('multer');
const path = require('path');
const store = require('./lib/store');
const matcher = require('./lib/matcher');

const app = express();
const PORT = process.env.PORT || 3000;
require('fs').mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

const CATEGORIES = [
  'Wallet', 'Phone', 'Keys', 'ID Card', 'Bag', 'Books / Notes',
  'Laptop / Charger', 'Earphones', 'Watch / Jewellery',
  'Bottle / Lunchbox', 'Clothing', 'Other'
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- image upload setup (multer) ---
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
      cb(null, Date.now() + '-' + safe);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 },               // 3 MB max
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

// What the browser is allowed to see: never the contact or the secret answer
function publicView(item) {
  const { contact, verifyAnswer, ...safe } = item;
  return safe;
}

// --- routes ---
app.get('/api/locations', (req, res) => res.json(store.readJSON('locations.json')));
app.get('/api/categories', (req, res) => res.json(CATEGORIES));

app.get('/api/items', (req, res) => {
  let items = store.readJSON('items.json');
  if (req.query.type) items = items.filter(i => i.type === req.query.type);
  res.json(items.map(publicView));
});

app.post('/api/items', upload.single('image'), (req, res) => {
  const b = req.body;
  const locations = store.readJSON('locations.json');

  // validation (contact details are only needed for found items)
  if (!['lost', 'found'].includes(b.type))
    return res.status(400).json({ error: 'type must be lost or found' });
  const required = ['title', 'category', 'locationId', 'date'];
  if (b.type === 'found') required.push('contactName', 'contact');
  for (const f of required)
    if (!b[f] || !b[f].trim())
      return res.status(400).json({ error: `${f} is required` });
  if (!CATEGORIES.includes(b.category))
    return res.status(400).json({ error: 'unknown category' });
  if (!locations.some(l => l.id === Number(b.locationId)))
    return res.status(400).json({ error: 'unknown location' });
  if (b.type === 'found' && (!b.verifyQuestion?.trim() || !b.verifyAnswer?.trim()))
    return res.status(400).json({ error: 'found items need a verification question and answer' });

  const items = store.readJSON('items.json');
  const item = {
    id: items.length ? Math.max(...items.map(i => i.id)) + 1 : 1,
    type: b.type,
    title: b.title.trim(),
    category: b.category,
    description: (b.description || '').trim(),
    locationId: Number(b.locationId),
    date: b.date,
    image: req.file ? req.file.filename : null,
    contactName: (b.contactName || '').trim() || null,
    contact: (b.contact || '').trim() || null,
    verifyQuestion: b.type === 'found' ? b.verifyQuestion.trim() : null,
    verifyAnswer: b.type === 'found' ? b.verifyAnswer.trim().toLowerCase() : null,
    status: 'open',
    createdAt: new Date().toISOString()
  };

  items.push(item);
  store.writeJSON('items.json', items);
  res.status(201).json(publicView(item));
});

app.get('/api/items/:id/matches', (req, res) => {
  const items = store.readJSON('items.json');
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'item not found' });

  const matches = matcher.findMatches(item, items, store.readJSON('locations.json'));
  res.json(matches.map(m => ({
    score: m.score,
    breakdown: m.breakdown,
    item: publicView(m.item)
  })));
});

const MAX_ATTEMPTS = 3;
const norm = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

app.post('/api/items/:id/claim', (req, res) => {
  const items = store.readJSON('items.json');
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'item not found' });
  if (item.type !== 'found')
    return res.status(400).json({ error: 'only found items can be claimed' });
  if (item.status !== 'open')
    return res.status(409).json({ error: 'this item has already been claimed' });

  const answer = norm(req.body.answer);
  const claimantName = (req.body.claimantName || '').trim();
  if (!answer || !claimantName)
    return res.status(400).json({ error: 'claimantName and answer are required' });

  const claims = store.readJSON('claims.json');
  const wrong = claims.filter(c => c.itemId === item.id && !c.success).length;
  if (wrong >= MAX_ATTEMPTS)
    return res.status(429).json({ error: 'Too many wrong attempts for this item.' });

  const success = answer === norm(item.verifyAnswer);
  claims.push({
    id: claims.length ? Math.max(...claims.map(c => c.id)) + 1 : 1,
    itemId: item.id,
    claimantName,
    success,
    at: new Date().toISOString()
  });
  store.writeJSON('claims.json', claims);

  if (!success)
    return res.status(403).json({ error: 'Wrong answer', attemptsLeft: MAX_ATTEMPTS - wrong - 1 });

  item.status = 'claimed';
  store.writeJSON('items.json', items);
  res.json({ message: 'Verified! Contact the finder to collect your item.',
             contactName: item.contactName, contact: item.contact });
});

// catches multer errors like "file too large"
app.use((err, req, res, next) => res.status(400).json({ error: err.message }));

app.listen(PORT, () => console.log(`FindIt running on http://localhost:${PORT}`));