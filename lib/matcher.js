const WEIGHTS = { category: 40, location: 25, date: 15, keywords: 20 };
const MIN_SCORE = 50;

const STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'has', 'have', 'was', 'are', 'its',
  'this', 'that', 'from', 'inside', 'near', 'found', 'lost'
]);

// "Black Wallets!" -> Set { 'black', 'wallet' }
function tokens(item) {
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  const words = text
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
    .map(w => (w.length > 3 ? w.replace(/s$/, '') : w));   // keys -> key
  return new Set(words);
}

function categoryScore(a, b) {
  return a.category === b.category ? WEIGHTS.category : 0;
}

function locationScore(a, b, locMap) {
  const la = locMap.get(a.locationId);
  const lb = locMap.get(b.locationId);
  if (!la || !lb) return 0;
  if (la.area === 'Unknown' || lb.area === 'Unknown') return 10;  // "not sure": neutral credit
  if (la.id === lb.id) return WEIGHTS.location;                   // same exact spot
  if (la.area === lb.area) return 15;                             // same area
  return 0;
}

function dateScore(lost, found) {
  const days = (new Date(found.date) - new Date(lost.date)) / 86400000;
  if (days < -1) return 0;            // found before it was lost: unlikely
  if (days <= 1) return WEIGHTS.date;
  if (days <= 3) return 10;
  if (days <= 7) return 5;
  return 0;
}

function keywordScore(a, b) {
  const ta = tokens(a), tb = tokens(b);
  const shared = [...ta].filter(w => tb.has(w));
  if (!ta.size || !tb.size) return { points: 0, shared };
  const points = Math.round(WEIGHTS.keywords * shared.length / Math.min(ta.size, tb.size));
  return { points, shared };
}

function scorePair(item, other, locMap) {
  const lost = item.type === 'lost' ? item : other;
  const found = item.type === 'found' ? item : other;
  const kw = keywordScore(item, other);

  const breakdown = {
    category: categoryScore(item, other),
    location: locationScore(item, other, locMap),
    date: dateScore(lost, found),
    keywords: kw.points,
    sharedWords: kw.shared
  };
  const score = breakdown.category + breakdown.location + breakdown.date + breakdown.keywords;
  return { score, breakdown };
}

function findMatches(item, allItems, locations, minScore = MIN_SCORE) {
  const locMap = new Map(locations.map(l => [l.id, l]));
  return allItems
    .filter(o => o.id !== item.id && o.type !== item.type && o.status === 'open')
    .map(o => ({ item: o, ...scorePair(item, o, locMap) }))
    .filter(m => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

module.exports = { findMatches, WEIGHTS, MIN_SCORE };
