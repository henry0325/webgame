(function (global) {
  function evaluateTiming(markerPosition) {
    const distance = Math.abs(markerPosition - 50);
    if (distance <= 4) return { rating: 'Perfect', multiplier: 1.8, comfort: 8 };
    if (distance <= 10) return { rating: 'Great', multiplier: 1.35, comfort: 4 };
    if (distance <= 18) return { rating: 'Good', multiplier: 1.05, comfort: 2 };
    return { rating: 'Miss', multiplier: 0.2, comfort: -3 };
  }

  function calculateDamage(baseDamage, multiplier, combo, gearBonus) {
    const comboBonus = 1 + Math.min(combo, 20) * 0.03;
    return Math.max(1, Math.round(baseDamage * multiplier * comboBonus + (gearBonus || 0)));
  }

  function autoSortInventory(items) {
    const rarityOrder = { epic: 0, rare: 1, common: 2 };
    return [...items].sort((a, b) => {
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name, 'zh-Hant');
    });
  }

  function getComfortEffects(comfortScore) {
    if (comfortScore >= 80) return { tier: 'Zen', damageBonus: 4, enemyDamageReduction: 2, uiChaos: 0, text: '心流模式：攻擊更穩、受到傷害降低。' };
    if (comfortScore >= 40) return { tier: 'Stable', damageBonus: 2, enemyDamageReduction: 1, uiChaos: 0.5, text: '穩定模式：節奏與視覺保持整齊。' };
    if (comfortScore >= 10) return { tier: 'Normal', damageBonus: 0, enemyDamageReduction: 0, uiChaos: 1, text: '普通模式：沒有額外效果。' };
    return { tier: 'Messy', damageBonus: -1, enemyDamageReduction: 0, uiChaos: 2, text: '混亂模式：畫面微晃，輸出下降。' };
  }

  function seedFromDate(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    return y * 10000 + m * 100 + d;
  }

  function seededRandom(seed) {
    let x = seed || 1;
    return function next() {
      x = (x * 1664525 + 1013904223) % 4294967296;
      return x / 4294967296;
    };
  }

  function buildMissions(rand) {
    const source = [
      { id: 'combo3', text: '達成 3 連擊', target: 3, type: 'combo', reward: 80 },
      { id: 'perfect2', text: '打出 2 次 Perfect', target: 2, type: 'perfect', reward: 120 },
      { id: 'sort1', text: '整理背包 1 次', target: 1, type: 'sort', reward: 60 },
      { id: 'comfort50', text: '舒適度達 50', target: 50, type: 'comfort', reward: 100 },
      { id: 'wave3', text: '擊敗 3 隻敵人', target: 3, type: 'wave', reward: 140 }
    ];
    const picked = [];
    while (picked.length < 3) {
      const idx = Math.floor(rand() * source.length);
      const choice = source[idx];
      if (!picked.some((x) => x.id === choice.id)) {
        picked.push({ ...choice, progress: 0, done: false });
      }
    }
    return picked;
  }

  const api = { evaluateTiming, calculateDamage, autoSortInventory, getComfortEffects, seedFromDate, seededRandom, buildMissions };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.GameLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
