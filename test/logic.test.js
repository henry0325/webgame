const assert = require('assert');
const {
  evaluateTiming,
  calculateDamage,
  autoSortInventory,
  getComfortEffects,
  seedFromDate,
  seededRandom,
  buildMissions
} = require('../logic');

const perfect = evaluateTiming(50);
assert.equal(perfect.rating, 'Perfect');
assert.equal(perfect.multiplier, 1.8);

const miss = evaluateTiming(90);
assert.equal(miss.rating, 'Miss');

assert.equal(calculateDamage(10, 1, 0, 0), 10);
assert.ok(calculateDamage(10, 1.8, 3, 2) > 20);

const sorted = autoSortInventory([
  { name: 'B', rarity: 'common' },
  { name: 'A', rarity: 'epic' },
  { name: 'C', rarity: 'rare' }
]);
assert.deepEqual(sorted.map((i) => i.rarity), ['epic', 'rare', 'common']);

assert.equal(getComfortEffects(90).tier, 'Zen');
assert.equal(getComfortEffects(0).tier, 'Messy');

assert.equal(seedFromDate(new Date('2026-04-13T00:00:00Z')), 20260413);

const randA = seededRandom(42);
const randB = seededRandom(42);
assert.equal(randA().toFixed(8), randB().toFixed(8));

const missions = buildMissions(seededRandom(100));
assert.equal(missions.length, 3);
assert.equal(new Set(missions.map((m) => m.id)).size, 3);

console.log('logic tests passed');
