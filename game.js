(() => {
  const {
    evaluateTiming,
    calculateDamage,
    autoSortInventory,
    getComfortEffects,
    seedFromDate,
    seededRandom,
    buildMissions
  } = window.GameLogic;

  const enemyTemplate = [
    { name: '鴨力山大魔王', hp: 70, line: '今天你有多鴨力？', drop: { name: '鴨力穩定器', rarity: 'common', bonus: 1, comfort: 2 } },
    { name: '蒜泥狠辣騎士', hp: 85, line: '蒜味重擊要來了！', drop: { name: '蒜你狠刀柄', rarity: 'rare', bonus: 3, comfort: 1 } },
    { name: '蝦趴DJ史萊姆', hp: 95, line: '跟不上節拍就出局。', drop: { name: '蝦趴混音器', rarity: 'rare', bonus: 2, comfort: 3 } },
    { name: '梨害審判官', hp: 105, line: '你的發音不夠標準。', drop: { name: '梨害準星', rarity: 'epic', bonus: 5, comfort: 5 } },
    { name: '終極社畜鴨王', hp: 120, line: '加班節奏，無限循環。', drop: { name: '下班許願券', rarity: 'epic', bonus: 6, comfort: 8 } }
  ];

  const state = {
    playerHp: 120,
    enemyHp: enemyTemplate[0].hp,
    combo: 0,
    comfort: 20,
    score: 0,
    bpm: 90,
    markerPos: 0,
    direction: 1,
    selectedAction: 0,
    inventory: [],
    equipped: null,
    actions: [],
    wave: 0,
    enemies: [],
    missions: [],
    mode: 'arcade',
    metronomeOn: false,
    audioCtx: null,
    nextBeatAt: 0
  };

  const punPool = [
    { name: '梨害重擊', base: 12, text: '你這招真的「梨害」！' },
    { name: '蒜你狠斬', base: 15, text: '蒜你狠，辣到敵人流淚。' },
    { name: '鴨力退散', base: 10, text: '鴨力山大？先退散！' },
    { name: '蕉流閃電', base: 13, text: '香蕉導電，電到懷疑人生。' },
    { name: '蝦趴音浪', base: 11, text: '全場最蝦趴，怪物跟著搖。' }
  ];

  const $ = (id) => document.getElementById(id);
  const pHp = $('player-hp');
  const eHp = $('enemy-hp');
  const combo = $('combo');
  const comfort = $('comfort');
  const comfortTier = $('comfort-tier');
  const scoreEl = $('score');
  const waveEl = $('wave');
  const marker = $('beat-marker');
  const timingResult = $('timing-result');
  const actionsEl = $('actions');
  const logEl = $('log');
  const inventoryEl = $('inventory');
  const enemyLine = $('enemy-line');
  const enemyName = $('enemy-name');
  const equippedEl = $('equipped');
  const comfortEffect = $('comfort-effect');
  const bpmInput = $('bpm-input');
  const bpmValue = $('bpm-value');
  const rhythmPanel = $('rhythm-panel');
  const missionsEl = $('missions');
  const modeNote = $('mode-note');
  const dailyBest = $('daily-best');

  function cloneEnemies(rand) {
    return enemyTemplate.map((enemy, idx) => {
      const scale = state.mode === 'daily' ? 1 + idx * 0.08 + rand() * 0.12 : 1;
      return {
        ...enemy,
        hp: Math.round(enemy.hp * scale),
        drop: { ...enemy.drop, bonus: enemy.drop.bonus + (state.mode === 'daily' ? 1 : 0) }
      };
    });
  }

  function resetRun(mode) {
    state.mode = mode;
    const seed = seedFromDate();
    const rand = seededRandom(mode === 'daily' ? seed : Date.now() % 100000);
    state.enemies = cloneEnemies(rand);
    state.missions = buildMissions(rand);
    state.playerHp = mode === 'daily' ? 110 : 120;
    state.enemyHp = state.enemies[0].hp;
    state.combo = 0;
    state.comfort = mode === 'daily' ? 25 : 20;
    state.score = 0;
    state.bpm = mode === 'daily' ? 98 : 90;
    state.wave = 0;
    state.inventory = [
      { name: '新手節拍器', rarity: 'common', bonus: 1, comfort: 2 },
      { name: '整齊收納盒', rarity: 'common', bonus: 0, comfort: 4 }
    ];
    state.equipped = null;

    enemyName.textContent = state.enemies[0].name;
    enemyLine.textContent = `「${state.enemies[0].line}」`;
    modeNote.textContent = mode === 'daily'
      ? `每日挑戰：${seed}（固定種子，高分競速）`
      : '標準遠征：完整 5 波戰鬥。';
    bpmInput.value = String(state.bpm);
    bpmValue.textContent = String(state.bpm);
    equippedEl.textContent = '尚未裝備符文';

    randomActions();
    renderActions();
    renderInventory();
    renderMissions();
    updateHUD();
    logEl.textContent = '新冒險開始，跟著節拍出招！';
  }

  function randomActions() {
    const shuffled = [...punPool].sort(() => Math.random() - 0.5);
    state.actions = shuffled.slice(0, 3);
  }

  function renderActions() {
    actionsEl.innerHTML = '';
    state.actions.forEach((action, i) => {
      const node = document.createElement('div');
      node.className = `action ${state.selectedAction === i ? 'selected' : ''}`;
      node.innerHTML = `<strong>${i + 1}</strong><span>${action.name}</span>`;
      node.onclick = () => {
        state.selectedAction = i;
        renderActions();
      };
      actionsEl.appendChild(node);
    });
  }

  function renderInventory() {
    inventoryEl.innerHTML = '';
    state.inventory.forEach((item) => {
      const node = document.createElement('button');
      node.className = `item ${item.rarity}`;
      node.textContent = `${item.name} +${item.bonus}`;
      node.onclick = () => {
        state.equipped = item;
        equippedEl.textContent = `已裝備：${item.name}（攻擊 +${item.bonus}，舒適 +${item.comfort}）`;
        state.comfort += item.comfort;
        gainScore(20);
        syncMission('comfort', state.comfort);
        updateHUD();
        logEl.textContent = `你裝備了 ${item.name}，技能與背包已融合。`;
      };
      inventoryEl.appendChild(node);
    });
  }

  function renderMissions() {
    missionsEl.innerHTML = '';
    state.missions.forEach((m) => {
      const li = document.createElement('li');
      const doneMark = m.done ? '✅' : '⬜';
      li.textContent = `${doneMark} ${m.text}（${Math.min(m.progress, m.target)}/${m.target}）`;
      missionsEl.appendChild(li);
    });
  }

  function gainScore(value) {
    state.score += value;
  }

  function syncMission(type, value) {
    state.missions.forEach((m) => {
      if (m.done || m.type !== type) return;
      if (type === 'comfort') m.progress = value;
      else m.progress += value;
      if (m.progress >= m.target) {
        m.done = true;
        gainScore(m.reward);
        logEl.textContent = `任務完成：${m.text}（+${m.reward} 分）`;
      }
    });
    renderMissions();
  }

  function updateHUD() {
    const effect = getComfortEffects(state.comfort);
    pHp.textContent = state.playerHp;
    eHp.textContent = state.enemyHp;
    combo.textContent = state.combo;
    comfort.textContent = state.comfort;
    comfortTier.textContent = effect.tier;
    comfortEffect.textContent = effect.text;
    waveEl.textContent = `${state.wave + 1} / ${state.enemies.length}`;
    scoreEl.textContent = state.score;

    rhythmPanel.classList.remove('chaos-1', 'chaos-2');
    if (effect.uiChaos >= 2) rhythmPanel.classList.add('chaos-2');
    else if (effect.uiChaos > 1) rhythmPanel.classList.add('chaos-1');

    const best = Number(localStorage.getItem('daily_best') || 0);
    dailyBest.textContent = String(best);
  }

  function finishRun() {
    if (state.mode === 'daily') {
      const best = Number(localStorage.getItem('daily_best') || 0);
      if (state.score > best) {
        localStorage.setItem('daily_best', String(state.score));
        logEl.textContent = `新每日最高分！${state.score}`;
      }
    }
    updateHUD();
  }

  function spawnNextEnemy() {
    state.wave += 1;
    syncMission('wave', 1);
    gainScore(120);

    if (state.wave >= state.enemies.length) {
      enemyName.textContent = '地下城征服完成';
      enemyLine.textContent = '「恭喜，你已達成節奏與整齊的極致。」';
      eHp.textContent = 0;
      logEl.textContent = `全破成功！總分 ${state.score}。可切換模式再次挑戰。`;
      finishRun();
      return;
    }

    const enemy = state.enemies[state.wave];
    state.enemyHp = enemy.hp;
    enemyName.textContent = enemy.name;
    enemyLine.textContent = `「${enemy.line}」`;
    randomActions();
    renderActions();
    updateHUD();
    logEl.textContent = `下一隻敵人登場：${enemy.name}`;
  }

  function enemyTurn() {
    const effect = getComfortEffects(state.comfort);
    const base = Math.ceil(Math.random() * 9) + 4;
    const dmg = Math.max(1, base - effect.enemyDamageReduction);
    state.playerHp = Math.max(0, state.playerHp - dmg);
    enemyLine.textContent = `「吃我一招節奏疲勞炮！(-${dmg})」`;
    if (state.playerHp <= 0) {
      logEl.textContent = `你被節奏壓垮了…本輪分數 ${state.score}。`; 
      finishRun();
    }
  }

  function rewardDrop() {
    const drop = state.enemies[state.wave].drop;
    state.inventory.push(drop);
    gainScore(80);
    logEl.textContent = `你擊敗 ${state.enemies[state.wave].name}，獲得 ${drop.name}！`;
    renderInventory();
  }

  function attackOnBeat() {
    if (state.playerHp <= 0 || state.wave >= state.enemies.length) return;

    const picked = state.actions[state.selectedAction];
    const judge = evaluateTiming(state.markerPos);
    const comfortEffectObj = getComfortEffects(state.comfort);
    timingResult.textContent = judge.rating;
    timingResult.className = judge.rating === 'Perfect' ? 'good' : judge.rating === 'Miss' ? 'bad' : 'warn';

    if (judge.rating === 'Miss') {
      state.combo = 0;
      gainScore(10);
    } else {
      state.combo += 1;
      gainScore(35);
      syncMission('combo', 1);
    }
    if (judge.rating === 'Perfect') syncMission('perfect', 1);

    state.comfort = Math.max(0, state.comfort + judge.comfort);
    syncMission('comfort', state.comfort);

    const gearBonus = (state.equipped?.bonus || 0) + comfortEffectObj.damageBonus;
    const dmg = calculateDamage(picked.base, judge.multiplier, state.combo, gearBonus);
    state.enemyHp = Math.max(0, state.enemyHp - dmg);

    logEl.textContent = `${picked.text} ${judge.rating}！造成 ${dmg} 傷害。`;

    if (state.enemyHp <= 0) {
      rewardDrop();
      setTimeout(spawnNextEnemy, 800);
    } else {
      enemyTurn();
      randomActions();
      renderActions();
    }

    updateHUD();
  }

  function tick() {
    const speed = (state.bpm / 60) * 0.6;
    state.markerPos += state.direction * speed;
    if (state.markerPos >= 100) {
      state.markerPos = 100;
      state.direction = -1;
    }
    if (state.markerPos <= 0) {
      state.markerPos = 0;
      state.direction = 1;
    }
    marker.style.left = `${state.markerPos}%`;

    if (state.metronomeOn) scheduleMetronome();
    requestAnimationFrame(tick);
  }

  function beep() {
    if (!state.audioCtx) return;
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.02;
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);
    osc.start();
    osc.stop(state.audioCtx.currentTime + 0.04);
  }

  function scheduleMetronome() {
    if (!state.audioCtx) return;
    const now = state.audioCtx.currentTime;
    const beatInterval = 60 / state.bpm;
    if (state.nextBeatAt < now) state.nextBeatAt = now;
    while (state.nextBeatAt < now + 0.05) {
      beep();
      state.nextBeatAt += beatInterval;
    }
  }

  $('hit-button').addEventListener('click', attackOnBeat);
  $('sort-button').addEventListener('click', () => {
    state.inventory = autoSortInventory(state.inventory);
    state.comfort += 8;
    syncMission('sort', 1);
    syncMission('comfort', state.comfort);
    gainScore(50);
    logEl.textContent = '背包整理完畢：舒適度提升，戰鬥更穩定。';
    renderInventory();
    updateHUD();
  });

  bpmInput.addEventListener('input', (e) => {
    state.bpm = Number(e.target.value);
    bpmValue.textContent = String(state.bpm);
  });

  $('metronome-toggle').addEventListener('click', async (e) => {
    if (!state.audioCtx) state.audioCtx = new AudioContext();
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    state.metronomeOn = !state.metronomeOn;
    e.target.textContent = state.metronomeOn ? '關閉節拍音' : '開啟節拍音';
    state.nextBeatAt = state.audioCtx.currentTime;
  });

  $('mode-arcade').addEventListener('click', () => resetRun('arcade'));
  $('mode-daily').addEventListener('click', () => resetRun('daily'));

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') attackOnBeat();
    if (['1', '2', '3'].includes(e.key)) {
      state.selectedAction = Number(e.key) - 1;
      renderActions();
    }
  });

  resetRun('arcade');
  requestAnimationFrame(tick);
})();
