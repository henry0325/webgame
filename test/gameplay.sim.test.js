const assert = require('assert');
const {
  evaluateTimingWithAssist,
  calculateDamage,
  bpmRiskMultiplier,
  getComfortEffects,
  skillTreeEffects,
  applyProfileExp
} = require('../logic');

// deterministic long-run simulation: 300 turns
let hp = 180;
let enemyHp = 220;
let combo = 0;
let comfort = 25;
let score = 0;
let kills = 0;
const profile = { level: 3, exp: 0, kills: 0, permBonus: 2, points: 0, skills: { timing: 1, guard: 1, loot: 1 } };

for (let t = 0; t < 300; t += 1) {
  const marker = (t * 7) % 100;
  const judge = evaluateTimingWithAssist(marker, skillTreeEffects(profile.skills).timingAssist);
  combo = judge.rating === 'Miss' ? 0 : combo + 1;
  comfort = Math.max(0, comfort + judge.comfort);

  const comfortFx = getComfortEffects(comfort);
  const dmg = Math.round(calculateDamage(12, judge.multiplier, combo, profile.permBonus + comfortFx.damageBonus) * bpmRiskMultiplier(110));
  enemyHp -= dmg;
  score += Math.max(5, dmg);

  if (enemyHp <= 0) {
    kills += 1;
    enemyHp = 220 + kills * 30;
    score += 120;
  }

  // enemy turn
  const incoming = Math.max(1, 11 + Math.floor(t % 5) - comfortFx.enemyDamageReduction - skillTreeEffects(profile.skills).guard);
  hp -= incoming;
  if (hp <= 0) {
    const next = applyProfileExp(profile, Math.round(score / 8));
    assert.ok(next.level >= profile.level);
    hp = 180 + next.level * 2;
  }

  assert.ok(Number.isFinite(hp) && Number.isFinite(enemyHp) && Number.isFinite(score));
}

assert.ok(kills >= 1);
assert.ok(score > 1000);
console.log('gameplay simulation passed');
