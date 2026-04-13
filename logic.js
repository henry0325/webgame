(function (global) {
  function evaluateTiming(markerPosition) {
    const distance = Math.abs(markerPosition - 50);
    if (distance <= 3) return { rating: 'Perfect', multiplier: 1.8, comfort: 8 };
    if (distance <= 8) return { rating: 'Great', multiplier: 1.3, comfort: 4 };
    if (distance <= 15) return { rating: 'Good', multiplier: 1.0, comfort: 2 };
    return { rating: 'Miss', multiplier: 0.2, comfort: -2 };
  }

  function calculateDamage(baseDamage, multiplier, combo) {
    const comboBonus = 1 + Math.min(combo, 20) * 0.03;
    return Math.max(1, Math.round(baseDamage * multiplier * comboBonus));
  }

  function autoSortInventory(items) {
    const rarityOrder = { epic: 0, rare: 1, common: 2 };
    return [...items].sort((a, b) => {
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name, 'zh-Hant');
    });
  }

  const api = { evaluateTiming, calculateDamage, autoSortInventory };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.GameLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
