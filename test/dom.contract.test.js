const assert = require('assert');
const fs = require('fs');

const game = fs.readFileSync('game.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const ids = new Set();
const re = /\$\('([a-zA-Z0-9-]+)'\)/g;
let m;
while ((m = re.exec(game)) !== null) ids.add(m[1]);

for (const id of ids) {
  assert.ok(html.includes(`id="${id}"`), `Missing DOM id in index.html: ${id}`);
}

console.log('dom contract passed');
