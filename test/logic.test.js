const assert = require('assert');
const {
  evaluateTiming,
  evaluateTimingWithAssist,
  calculateDamage,
  bpmRiskMultiplier,
  autoSortInventory,
  getComfortEffects,
  seedFromDate,
  seededRandom,
  buildMissions,
  applyProfileExp,
  skillTreeEffects
} = require('../logic');

assert.equal(evaluateTiming(50).rating, 'Perfect');
assert.equal(evaluateTiming(90).rating, 'Miss');
assert.equal(evaluateTimingWithAssist(55, 2).rating, 'Perfect');
assert.equal(calculateDamage(10, 1, 0, 0), 10);
assert.ok(calculateDamage(10, 1.8, 3, 2) > 20);
assert.equal(bpmRiskMultiplier(90), 1);
assert.equal(bpmRiskMultiplier(160), 1.35);

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

const profile = applyProfileExp({ level: 1, exp: 90, kills: 0, permBonus: 0, points: 0 }, 20);
assert.equal(profile.level, 2);
assert.equal(profile.permBonus, 1);
assert.equal(profile.points, 1);

const tree = skillTreeEffects({ timing: 2, guard: 1, loot: 3 });
assert.equal(tree.timingAssist, 2);
assert.equal(tree.guard, 1);
assert.equal(tree.loot, 1.6);

console.log('logic tests passed');
