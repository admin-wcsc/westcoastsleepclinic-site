// Stamps partials/header.html and partials/footer.html into the marked
// section of every page listed below. Run this after editing a partial —
// it's also wired up to run automatically before `npm start` (see
// package.json's "prestart") and as a step in the dev-branch GitHub Actions
// build, so the deployed site can never drift from what's in partials/.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'dr-scuteri.html', 'provider-referral.html', 'registration.html'];
const SECTIONS = [
  { name: 'HEADER', partial: 'partials/header.html' },
  { name: 'FOOTER', partial: 'partials/footer.html' },
];

function syncSection(pageContent, pageName, section) {
  const startTag = `<!-- SHARED:${section.name}:START`;
  const endTag = `<!-- SHARED:${section.name}:END -->`;
  const startIdx = pageContent.indexOf(startTag);
  const endIdx = pageContent.indexOf(endTag);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`${pageName}: missing SHARED:${section.name} markers`);
  }
  const startLineEnd = pageContent.indexOf('\n', startIdx) + 1;
  const partialContent = fs.readFileSync(path.join(ROOT, section.partial), 'utf8');
  return pageContent.slice(0, startLineEnd) + partialContent + pageContent.slice(endIdx);
}

let changedCount = 0;
for (const page of PAGES) {
  const pagePath = path.join(ROOT, page);
  const original = fs.readFileSync(pagePath, 'utf8');
  let updated = original;
  for (const section of SECTIONS) {
    updated = syncSection(updated, page, section);
  }
  if (updated !== original) {
    fs.writeFileSync(pagePath, updated);
    console.log(`synced: ${page}`);
    changedCount++;
  }
}
console.log(changedCount === 0 ? 'All pages already in sync.' : `Done (${changedCount} file(s) updated).`);
