(() => {
  const {
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
  } = window.GameLogic;

  const enemyTemplate = [
    { name: '鴨力山大魔王', hp: 70, line: '今天你有多鴨力？', drop: { name: '鴨力穩定器', rarity: 'common', bonus: 1, comfort: 2 } },
    { name: '蒜泥狠辣騎士', hp: 85, line: '蒜味重擊要來了！', drop: { name: '蒜你狠刀柄', rarity: 'rare', bonus: 3, comfort: 1 } },
    { name: '蝦趴DJ史萊姆', hp: 95, line: '跟不上節拍就出局。', drop: { name: '蝦趴混音器', rarity: 'rare', bonus: 2, comfort: 3 } },
    { name: '梨害審判官', hp: 105, line: '你的發音不夠標準。', drop: { name: '梨害準星', rarity: 'epic', bonus: 5, comfort: 5 } },
    { name: '終極社畜鴨王', hp: 140, line: '加班節奏，無限循環。', drop: { name: '下班許願券', rarity: 'epic', bonus: 6, comfort: 8 }, boss: true }
  ];

  const punPool = [
    { name: '梨害重擊', base: 12, text: '你這招真的「梨害」！', tag: '單體爆發' },
    { name: '蒜你狠斬', base: 15, text: '蒜你狠，辣到敵人流淚。', tag: '高風險高傷' },
    { name: '鴨力退散', base: 10, text: '鴨力山大？先退散！', tag: '穩定輸出' },
    { name: '蕉流閃電', base: 13, text: '香蕉導電，電到懷疑人生。', tag: '節奏連段' },
    { name: '蝦趴音浪', base: 11, text: '全場最蝦趴，怪物跟著搖。', tag: '舒適連動' }
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
    danger: 1,
    profile: { level: 1, exp: 0, kills: 0, permBonus: 0, points: 0, skills: { timing: 0, guard: 0, loot: 0 } },
    bossCharge: 0,
    metronomeOn: false,
    audioCtx: null,
    nextBeatAt: 0
  };

  const $ = (id) => document.getElementById(id);
  const ids = ['player-hp','enemy-hp','combo','comfort','comfort-tier','score','wave','beat-marker','timing-result','actions','log','inventory','enemy-line','enemy-name','equipped','comfort-effect','bpm-input','bpm-value','rhythm-panel','missions','mode-note','daily-best','profile-level','profile-exp','profile-kills','profile-bonus','danger','bpm-bonus','action-detail','equip-detail','profile-points','boss-alert'];
  const el = Object.fromEntries(ids.map((id) => [id, $(id)]));

  function loadProfile() {
    try {
      const raw = localStorage.getItem('player_profile');
      if (raw) {
        const parsed = JSON.parse(raw);
        state.profile = { ...state.profile, ...parsed, skills: { ...state.profile.skills, ...(parsed.skills || {}) } };
      }
    } catch {}
  }
  const saveProfile = () => localStorage.setItem('player_profile', JSON.stringify(state.profile));

  function cloneEnemies(rand) {
    return enemyTemplate.map((enemy, idx) => {
      const modeBoost = state.mode === 'daily' ? 1.12 : 1;
      const progressive = 1 + idx * 0.1;
      const randomBoost = 1 + rand() * 0.1;
      return { ...enemy, hp: Math.round(enemy.hp * modeBoost * progressive * randomBoost * state.danger), drop: { ...enemy.drop, bonus: enemy.drop.bonus + (state.mode === 'daily' ? 1 : 0) } };
    });
  }

  function resetRun(mode) {
    state.mode = mode;
    state.danger = mode === 'daily' ? 1.2 : 1;
    const rand = seededRandom(mode === 'daily' ? seedFromDate() : Date.now() % 100000);
    state.enemies = cloneEnemies(rand);
    state.missions = buildMissions(rand);
    state.playerHp = 120 + state.profile.level * 2;
    state.enemyHp = state.enemies[0].hp;
    state.combo = 0;
    state.comfort = mode === 'daily' ? 25 : 20;
    state.score = 0;
    state.bpm = mode === 'daily' ? 102 : 90;
    state.wave = 0;
    state.bossCharge = 0;
    state.inventory = [
      { name: '新手節拍器', rarity: 'common', bonus: 1, comfort: 2, note: '穩定初期節奏' },
      { name: '整齊收納盒', rarity: 'common', bonus: 0, comfort: 4, note: '舒適度上升更快' }
    ];
    state.equipped = null;

    el['enemy-name'].textContent = state.enemies[0].name;
    el['enemy-line'].textContent = `「${state.enemies[0].line}」`;
    el['mode-note'].textContent = mode === 'daily' ? `每日挑戰：${seedFromDate()}（固定種子，高分競速）` : '標準遠征：完整 5 波戰鬥。';
    el['bpm-input'].value = String(state.bpm);
    el['bpm-value'].textContent = String(state.bpm);
    el['equipped'].textContent = '尚未裝備符文';
    el['boss-alert'].textContent = '';

    randomActions();
    renderActions();
    renderInventory();
    renderMissions();
    updateHUD();
    el.log.textContent = '新冒險開始，跟著節拍出招！';
  }

  function randomActions() {
    state.actions = [...punPool].sort(() => Math.random() - 0.5).slice(0, 3);
    renderActionDetail();
  }

  function renderActionDetail() {
    const skill = state.actions[state.selectedAction];
    if (skill) el['action-detail'].textContent = `招式資訊：${skill.name}｜基礎傷害 ${skill.base}｜類型 ${skill.tag}`;
  }

  function renderActions() {
    el.actions.innerHTML = '';
    state.actions.forEach((action, i) => {
      const node = document.createElement('div');
      node.className = `action ${state.selectedAction === i ? 'selected' : ''}`;
      node.innerHTML = `<strong>${i + 1}</strong><span>${action.name}</span>`;
      node.onclick = () => { state.selectedAction = i; renderActions(); renderActionDetail(); };
      el.actions.appendChild(node);
    });
  }

  function renderInventory() {
    el.inventory.innerHTML = '';
    state.inventory.forEach((item) => {
      const node = document.createElement('button');
      node.className = `item ${item.rarity}`;
      node.textContent = `${item.name} +${item.bonus}`;
      node.onclick = () => {
        state.equipped = item;
        el.equipped.textContent = `已裝備：${item.name}（攻擊 +${item.bonus}，舒適 +${item.comfort}）`;
        el['equip-detail'].textContent = `裝備說明：${item.note || '戰鬥向加成道具'}`;
        state.comfort += item.comfort;
        gainScore(20);
        syncMission('comfort', state.comfort);
        updateHUD();
      };
      el.inventory.appendChild(node);
    });
  }

  function renderMissions() {
    el.missions.innerHTML = '';
    state.missions.forEach((m) => {
      const li = document.createElement('li');
      li.textContent = `${m.done ? '✅' : '⬜'} ${m.text}（${Math.min(m.progress, m.target)}/${m.target}）`;
      el.missions.appendChild(li);
    });
  }

  function gainScore(v) { state.score += v; }

  function syncMission(type, value) {
    state.missions.forEach((m) => {
      if (m.done || m.type !== type) return;
      m.progress = type === 'comfort' ? value : m.progress + value;
      if (m.progress >= m.target) { m.done = true; gainScore(m.reward); }
    });
    renderMissions();
  }

  function updateHUD() {
    const comfortEff = getComfortEffects(state.comfort);
    const tree = skillTreeEffects(state.profile.skills);
    el['player-hp'].textContent = state.playerHp;
    el['enemy-hp'].textContent = state.enemyHp;
    el.combo.textContent = state.combo;
    el.comfort.textContent = state.comfort;
    el['comfort-tier'].textContent = comfortEff.tier;
    el['comfort-effect'].textContent = comfortEff.text;
    el.wave.textContent = `${state.wave + 1} / ${state.enemies.length}`;
    el.score.textContent = state.score;
    el.danger.textContent = `${state.danger.toFixed(2)}x`;
    el['bpm-bonus'].textContent = `${bpmRiskMultiplier(state.bpm).toFixed(2)}x`;
    el['profile-level'].textContent = state.profile.level;
    el['profile-exp'].textContent = state.profile.exp;
    el['profile-kills'].textContent = state.profile.kills;
    el['profile-bonus'].textContent = `+${state.profile.permBonus}`;
    el['profile-points'].textContent = state.profile.points;
    el['daily-best'].textContent = String(Number(localStorage.getItem('daily_best') || 0));

    el['boss-alert'].textContent = state.enemies[state.wave]?.boss ? `Boss 蓄力: ${state.bossCharge}/3（滿3會放大招）` : '';
    el['rhythm-panel'].classList.remove('chaos-1', 'chaos-2');
    if (comfortEff.uiChaos >= 2) el['rhythm-panel'].classList.add('chaos-2');
    else if (comfortEff.uiChaos > 1) el['rhythm-panel'].classList.add('chaos-1');
    el['action-detail'].textContent += `｜天賦節拍輔助 +${tree.timingAssist}`;
  }

  function finishRun() {
    state.profile = applyProfileExp(state.profile, Math.round(state.score / 8));
    saveProfile();
    if (state.mode === 'daily') {
      const best = Number(localStorage.getItem('daily_best') || 0);
      if (state.score > best) localStorage.setItem('daily_best', String(state.score));
    }
    updateHUD();
  }

  function spawnNextEnemy() {
    state.wave += 1;
    state.profile.kills += 1;
    syncMission('wave', 1);
    gainScore(120);
    state.bossCharge = 0;

    if (state.wave >= state.enemies.length) {
      el['enemy-name'].textContent = '地下城征服完成';
      el['enemy-line'].textContent = '「恭喜，你已達成節奏與整齊的極致。」';
      el['enemy-hp'].textContent = 0;
      el.log.textContent = `全破成功！總分 ${state.score}。`;
      finishRun();
      return;
    }

    const enemy = state.enemies[state.wave];
    state.enemyHp = enemy.hp;
    state.danger = +(state.danger + 0.1).toFixed(2);
    el['enemy-name'].textContent = enemy.name;
    el['enemy-line'].textContent = `「${enemy.line}」`;
    randomActions(); renderActions(); updateHUD();
  }

  function enemyTurn() {
    const comfortEff = getComfortEffects(state.comfort);
    const tree = skillTreeEffects(state.profile.skills);
    const enemy = state.enemies[state.wave];

    let base = Math.ceil(Math.random() * 9) + 4;
    if (enemy?.boss) {
      state.bossCharge += 1;
      if (state.bossCharge >= 3) {
        base += 12;
        state.bossCharge = 0;
        el['enemy-line'].textContent = '「終極加班波動砲！！」';
      }
    }
    const dmg = Math.max(1, Math.round(base * state.danger) - comfortEff.enemyDamageReduction - tree.guard);
    state.playerHp = Math.max(0, state.playerHp - dmg);

    if (state.playerHp <= 0) {
      el.log.textContent = `你被節奏壓垮了…本輪分數 ${state.score}。`;
      finishRun();
    }
  }

  function rewardDrop() {
    const tree = skillTreeEffects(state.profile.skills);
    const drop = { ...state.enemies[state.wave].drop, bonus: Math.round(state.enemies[state.wave].drop.bonus * tree.loot), note: '由強敵掉落，適合中後期高BPM爆發' };
    state.inventory.push(drop);
    gainScore(80);
    renderInventory();
  }

  function attackOnBeat() {
    if (state.playerHp <= 0 || state.wave >= state.enemies.length) return;
    const tree = skillTreeEffects(state.profile.skills);
    const skill = state.actions[state.selectedAction];
    const judge = evaluateTimingWithAssist(state.markerPos, tree.timingAssist);
    const comfortEff = getComfortEffects(state.comfort);

    el['timing-result'].textContent = judge.rating;
    el['timing-result'].className = judge.rating === 'Perfect' ? 'good' : judge.rating === 'Miss' ? 'bad' : 'warn';
    el['rhythm-panel'].classList.add('rhythm-hit');
    setTimeout(() => el['rhythm-panel'].classList.remove('rhythm-hit'), 180);

    if (judge.rating === 'Miss') { state.combo = 0; gainScore(10); }
    else { state.combo += 1; gainScore(35); syncMission('combo', 1); }
    if (judge.rating === 'Perfect') syncMission('perfect', 1);

    state.comfort = Math.max(0, state.comfort + judge.comfort);
    syncMission('comfort', state.comfort);

    const gearBonus = (state.equipped?.bonus || 0) + comfortEff.damageBonus + state.profile.permBonus;
    const dmg = Math.round(calculateDamage(skill.base, judge.multiplier, state.combo, gearBonus) * bpmRiskMultiplier(state.bpm));
    state.enemyHp = Math.max(0, state.enemyHp - dmg);

    if (state.enemyHp <= 0) { rewardDrop(); setTimeout(spawnNextEnemy, 700); }
    else { enemyTurn(); randomActions(); renderActions(); }

    updateHUD();
  }

  function tick() {
    const speed = (state.bpm / 60) * 0.6;
    state.markerPos += state.direction * speed;
    if (state.markerPos >= 100) { state.markerPos = 100; state.direction = -1; }
    if (state.markerPos <= 0) { state.markerPos = 0; state.direction = 1; }
    el['beat-marker'].style.left = `${state.markerPos}%`;
    if (state.metronomeOn) scheduleMetronome();
    requestAnimationFrame(tick);
  }

  function beep() {
    if (!state.audioCtx) return;
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.02;
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(); osc.stop(state.audioCtx.currentTime + 0.04);
  }

  function scheduleMetronome() {
    if (!state.audioCtx) return;
    const now = state.audioCtx.currentTime;
    const beatInterval = 60 / state.bpm;
    if (state.nextBeatAt < now) state.nextBeatAt = now;
    while (state.nextBeatAt < now + 0.05) { beep(); state.nextBeatAt += beatInterval; }
  }

  function spendPoint(key) {
    if (state.profile.points <= 0) return;
    state.profile.skills[key] = (state.profile.skills[key] || 0) + 1;
    state.profile.points -= 1;
    saveProfile();
    updateHUD();
  }

  $('hit-button').addEventListener('click', attackOnBeat);
  $('sort-button').addEventListener('click', () => {
    state.inventory = autoSortInventory(state.inventory);
    state.comfort += 8;
    syncMission('sort', 1);
    syncMission('comfort', state.comfort);
    gainScore(50);
    renderInventory();
    updateHUD();
  });
  el['bpm-input'].addEventListener('input', (e) => { state.bpm = Number(e.target.value); el['bpm-value'].textContent = String(state.bpm); updateHUD(); });
  $('metronome-toggle').addEventListener('click', async (e) => {
    if (!state.audioCtx) state.audioCtx = new AudioContext();
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    state.metronomeOn = !state.metronomeOn;
    e.target.textContent = state.metronomeOn ? '關閉節拍音' : '開啟節拍音';
    state.nextBeatAt = state.audioCtx.currentTime;
  });
  $('mode-arcade').addEventListener('click', () => resetRun('arcade'));
  $('mode-daily').addEventListener('click', () => resetRun('daily'));
  $('skill-timing').addEventListener('click', () => spendPoint('timing'));
  $('skill-guard').addEventListener('click', () => spendPoint('guard'));
  $('skill-loot').addEventListener('click', () => spendPoint('loot'));

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') attackOnBeat();
    if (['1', '2', '3'].includes(e.key)) { state.selectedAction = Number(e.key) - 1; renderActions(); renderActionDetail(); }
  });

  loadProfile();
  resetRun('arcade');
  requestAnimationFrame(tick);
})();
