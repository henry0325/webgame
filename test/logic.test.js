const assert = require('assert');
const { evaluateTiming, calculateDamage, autoSortInventory } = require('../logic');

const perfect = evaluateTiming(50);
assert.equal(perfect.rating, 'Perfect');
assert.equal(perfect.multiplier, 1.8);

const miss = evaluateTiming(90);
assert.equal(miss.rating, 'Miss');

assert.equal(calculateDamage(10, 1, 0), 10);
assert.ok(calculateDamage(10, 1.8, 3) > 18);

const sorted = autoSortInventory([
  { name: 'B', rarity: 'common' },
  { name: 'A', rarity: 'epic' },
  { name: 'C', rarity: 'rare' }
]);
assert.deepEqual(sorted.map((i) => i.rarity), ['epic', 'rare', 'common']);

console.log('logic tests passed');
