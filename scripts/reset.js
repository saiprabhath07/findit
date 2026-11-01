const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const data = path.join(root, 'data');
const uploads = path.join(root, 'uploads');
const write = (name, obj) => fs.writeFileSync(path.join(data, name), JSON.stringify(obj, null, 2));

// wipe uploads, items and claims (locations.json is never touched)
fs.mkdirSync(uploads, { recursive: true });
for (const f of fs.readdirSync(uploads)) fs.rmSync(path.join(uploads, f), { recursive: true, force: true });
write('claims.json', []);

const day = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
};

let items = [];

if (process.argv.includes('--demo')) {
  const found = (id, title, category, locationId, daysAgo, description, contactName, contact, q, a) => ({
    id, type: 'found', title, category, description, locationId, date: day(daysAgo), image: null,
    contactName, contact, verifyQuestion: q, verifyAnswer: a, status: 'open', createdAt: new Date().toISOString()
  });
  const lost = (id, title, category, locationId, daysAgo, description) => ({
    id, type: 'lost', title, category, description, locationId, date: day(daysAgo), image: null,
    contactName: null, contact: null, verifyQuestion: null, verifyAnswer: null,
    status: 'open', createdAt: new Date().toISOString()
  });

  items = [
    found(1, 'Black leather wallet', 'Wallet', 8, 1, 'Has a blue sticker inside', 'Ravi', '9876500001',
          'What colour is the sticker inside?', 'blue'),
    found(2, 'Blue steel water bottle', 'Bottle / Lunchbox', 11, 2, 'Dent near the bottom, name tag on cap', 'Sneha', '9876500002',
          'What name is on the cap tag?', 'meera'),
    found(3, 'College ID card', 'ID Card', 3, 0, 'Student ID with a lanyard', 'Kiran', '9876500003',
          'What colour is the lanyard?', 'red'),
    found(4, 'White wireless earbuds case', 'Earphones', 9, 1, 'Small scratch on the lid', 'Anil', '9876500004',
          'Which brand is printed on the case?', 'boat'),
    found(5, 'Bike key with keychain', 'Keys', 26, 3, 'Has a small keychain', 'Divya', '9876500005',
          'What shape is the keychain?', 'football'),
    lost(6, 'Black wallet', 'Wallet', 9, 1, 'Brown stitching, blue sticker inside'),
    lost(7, 'Student ID card', 'ID Card', 22, 0, 'Not sure where I dropped it'),
    lost(8, 'Blue bottle', 'Bottle / Lunchbox', 13, 2, 'Steel bottle with a dent')
  ];
}

write('items.json', items);

console.log(items.length ? `Demo data loaded: ${items.length} items.` : 'Clean slate: all items, claims and photos removed.');
if (items.length) console.log('Demo claim answers: wallet=blue, bottle=meera, ID=red, earbuds=boat, keys=football');
