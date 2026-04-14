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

  const ENEMIES = [
    { id: 'duck', name: '鴨力山大魔王', hp: 80, line: '今天你有多鴨力？', boss: false },
    { id: 'garlic', name: '蒜泥狠辣騎士', hp: 100, line: '蒜味重擊要來了！', boss: false },
    { id: 'dj', name: '蝦趴DJ史萊姆', hp: 120, line: '跟不上節拍就出局。', boss: false },
    { id: 'judge', name: '梨害審判官', hp: 135, line: '你的發音不夠標準。', boss: false },
    { id: 'king', name: '終極社畜鴨王', hp: 170, line: '加班節奏，無限循環。', boss: true }
  ];

  const EQUIPMENT_DB = {
    metronome: { id: 'metronome', name: '新手節拍器', rarity: 'common', atk: 1, comfort: 2, note: '穩定初期節奏' },
    sorter: { id: 'sorter', name: '整齊收納盒', rarity: 'common', atk: 0, comfort: 4, note: '整理會額外加分' },
    garlic_hilt: { id: 'garlic_hilt', name: '蒜你狠刀柄', rarity: 'rare', atk: 4, comfort: 1, note: '高BPM爆發' },
    pear_scope: { id: 'pear_scope', name: '梨害準星', rarity: 'epic', atk: 6, comfort: 3, note: 'Perfect 提升感明顯' },
    offwork_ticket: { id: 'offwork_ticket', name: '下班許願券', rarity: 'epic', atk: 8, comfort: 5, note: '長局續航核心' }
  };

  const DROP_TABLE = ['garlic_hilt', 'pear_scope', 'offwork_ticket'];

  const SKILLS = [
    { name: '梨害重擊', base: 12, tag: '單體爆發', text: '你這招真的梨害！' },
    { name: '蒜你狠斬', base: 15, tag: '高風險高傷', text: '蒜你狠，辣到敵人流淚。' },
    { name: '鴨力退散', base: 10, tag: '穩定輸出', text: '鴨力先退散！' },
    { name: '蕉流閃電', base: 13, tag: '節奏連段', text: '香蕉導電，命中神速。' },
    { name: '蝦趴音浪', base: 11, tag: '舒適連動', text: '全場蝦趴，怪物跟著搖。' }
  ];

  const state = {
    hp: 120, enemyHp: 80, combo: 0, comfort: 20, score: 0,
    bpm: 92, marker: 0, dir: 1, selected: 0,
    wave: 1, cycle: 1, danger: 1,
    profile: { level: 1, exp: 0, kills: 0, permBonus: 0, points: 0, skills: { timing: 0, guard: 0, loot: 0 } },
    inventory: new Map(), equippedId: null, actions: [], missions: [],
    enemy: ENEMIES[0], bossCharge: 0, mode: 'arcade',
    metronomeOn: false, audioCtx: null, nextBeat: 0
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    hp:$('player-hp'), combo:$('combo'), comfort:$('comfort'), comfortTier:$('comfort-tier'), score:$('score'),
    profilePoints:$('profile-points'), enemyHp:$('enemy-hp'), enemyName:$('enemy-name'), wave:$('wave'), danger:$('danger'),
    enemyLine:$('enemy-line'), bossAlert:$('boss-alert'), bpm:$('bpm-input'), bpmValue:$('bpm-value'), bpmBonus:$('bpm-bonus'),
    marker:$('beat-marker'), actions:$('actions'), actionDetail:$('action-detail'), hit:$('hit-button'), timing:$('timing-result'),
    log:$('log'), equipped:$('equipped'), equipDetail:$('equip-detail'), inventory:$('inventory'), sort:$('sort-button'),
    profileLevel:$('profile-level'), profileExp:$('profile-exp'), profileKills:$('profile-kills'), profileBonus:$('profile-bonus'),
    dailyBest:$('daily-best'), modeNote:$('mode-note'), missions:$('missions'), rhythm:$('rhythm-panel'),
    playerArt:$('player-art'), enemyArt:$('enemy-art')
  };

  const loadProfile = () => {
    try {
      const p = JSON.parse(localStorage.getItem('player_profile') || 'null');
      if (p) state.profile = { ...state.profile, ...p, skills: { ...state.profile.skills, ...(p.skills || {}) } };
    } catch {}
  };
  const saveProfile = () => localStorage.setItem('player_profile', JSON.stringify(state.profile));

  function applySoraArtIfAvailable() {
    const candidates = [
      { key: 'playerArt', file: 'assets/player_sora.png', fallback: 'assets/player.svg' },
      { key: 'enemyArt', file: 'assets/enemy_sora.png', fallback: 'assets/enemy.svg' }
    ];

    candidates.forEach(({ key, file, fallback }) => {
      if (!el[key]) return;
      const img = new Image();
      img.onload = () => { el[key].src = file; };
      img.onerror = () => { el[key].src = fallback; };
      img.src = file;
    });
  }

  function upsertItem(id, qty = 1) {
    state.inventory.set(id, (state.inventory.get(id) || 0) + qty);
  }

  function itemById(id) { return EQUIPMENT_DB[id]; }

  function resetRun(mode) {
    state.mode = mode;
    state.hp = 120 + state.profile.level * 2;
    state.combo = 0; state.score = 0; state.comfort = 22;
    state.bpm = mode === 'daily' ? 102 : 92;
    state.wave = 1; state.cycle = 1; state.danger = mode === 'daily' ? 1.2 : 1;
    state.enemy = ENEMIES[0]; state.enemyHp = scaledHp(state.enemy); state.bossCharge = 0;
    state.inventory.clear(); upsertItem('metronome', 1); upsertItem('sorter', 1);
    state.equippedId = null;
    const rand = seededRandom(mode === 'daily' ? seedFromDate() : Date.now());
    state.missions = buildMissions(rand);
    state.actions = [...SKILLS].sort(() => Math.random() - 0.5).slice(0, 3);
    renderAll();
    el.modeNote.textContent = mode === 'daily' ? `每日挑戰 seed ${seedFromDate()}` : '標準遠征（無限循環波次）';
  }

  function scaledHp(enemy) {
    return Math.round(enemy.hp * state.danger * (1 + (state.cycle - 1) * 0.12));
  }

  function renderAll() {
    const comfort = getComfortEffects(state.comfort);
    const tree = skillTreeEffects(state.profile.skills);
    el.hp.textContent = state.hp;
    el.combo.textContent = state.combo;
    el.comfort.textContent = state.comfort;
    el.comfortTier.textContent = comfort.tier;
    el.score.textContent = state.score;
    el.profilePoints.textContent = state.profile.points;
    el.enemyName.textContent = state.enemy.name;
    el.enemyHp.textContent = state.enemyHp;
    el.wave.textContent = `${state.wave}C${state.cycle}`;
    el.danger.textContent = `${state.danger.toFixed(2)}x`;
    el.enemyLine.textContent = state.enemy.line;
    el.bossAlert.textContent = state.enemy.boss ? `Boss蓄力 ${state.bossCharge}/3` : '';
    el.bpm.value = state.bpm;
    el.bpmValue.textContent = state.bpm;
    el.bpmBonus.textContent = `${bpmRiskMultiplier(state.bpm).toFixed(2)}x`;
    el.profileLevel.textContent = state.profile.level;
    el.profileExp.textContent = state.profile.exp;
    el.profileKills.textContent = state.profile.kills;
    el.profileBonus.textContent = state.profile.permBonus;
    el.dailyBest.textContent = localStorage.getItem('daily_best') || '0';

    el.actions.innerHTML = '';
    state.actions.forEach((a, i) => {
      const n = document.createElement('button');
      n.className = `action ${i === state.selected ? 'selected' : ''}`;
      n.textContent = `${i + 1}. ${a.name}`;
      n.onclick = () => { state.selected = i; renderAll(); };
      el.actions.appendChild(n);
    });
    const act = state.actions[state.selected];
    el.actionDetail.textContent = `${act.name}｜基礎${act.base}｜${act.tag}｜節拍輔助+${tree.timingAssist}`;

    const eq = state.equippedId ? itemById(state.equippedId) : null;
    el.equipped.textContent = eq ? `${eq.name} (ATK+${eq.atk}, COM+${eq.comfort})` : '尚未裝備';
    el.equipDetail.textContent = eq ? eq.note : '選擇一件裝備進行搭配';

    const inv = [...state.inventory.entries()].sort((a,b)=>itemById(a[0]).rarity.localeCompare(itemById(b[0]).rarity));
    el.inventory.innerHTML = '';
    inv.forEach(([id, qty]) => {
      const it = itemById(id);
      const btn = document.createElement('button');
      btn.className = `item ${it.rarity}`;
      btn.innerHTML = `<strong>${it.name}</strong><br/>ATK ${it.atk} / COM ${it.comfort}<br/>x${qty}`;
      btn.onclick = () => {
        if (state.equippedId === id) {
          el.log.textContent = `已維持裝備：${it.name}`;
          return;
        }
        state.equippedId = id;
        state.comfort += Math.min(3, it.comfort);
        el.log.textContent = `已裝備 ${it.name}（固定詞綴：${it.note}）`;
        renderAll();
      };
      el.inventory.appendChild(btn);
    });

    el.missions.innerHTML = state.missions.map((m) => `${m.done ? '✅' : '⬜'} ${m.text} (${Math.min(m.progress,m.target)}/${m.target})`).join('<br/>');
  }

  function missionTick(type, value) {
    state.missions.forEach((m) => {
      if (m.done || m.type !== type) return;
      m.progress = type === 'comfort' ? value : m.progress + value;
      if (m.progress >= m.target) {
        m.done = true;
        state.score += m.reward;
      }
    });
  }

  function dropReward() {
    const tree = skillTreeEffects(state.profile.skills);
    const idx = Math.floor(Math.random() * DROP_TABLE.length);
    const id = DROP_TABLE[idx];
    const copies = Math.max(1, Math.round(tree.loot));
    upsertItem(id, copies);
  }

  function nextEnemy() {
    state.profile.kills += 1;
    state.score += 120;
    missionTick('wave', 1);
    state.wave += 1;
    if (state.wave > ENEMIES.length) {
      state.wave = 1;
      state.cycle += 1;
      state.danger = +(state.danger + 0.08).toFixed(2);
    }
    state.enemy = ENEMIES[state.wave - 1];
    state.enemyHp = scaledHp(state.enemy);
    state.bossCharge = 0;
    renderAll();
  }

  function enemyAttack() {
    const comfort = getComfortEffects(state.comfort);
    const tree = skillTreeEffects(state.profile.skills);
    let base = 8 + Math.floor(Math.random() * 8);
    if (state.enemy.boss) {
      state.bossCharge += 1;
      if (state.bossCharge >= 3) {
        base += 14;
        state.bossCharge = 0;
      }
    }
    const dmg = Math.max(1, Math.round(base * state.danger) - comfort.enemyDamageReduction - tree.guard);
    state.hp = Math.max(0, state.hp - dmg);
    if (state.hp <= 0) {
      const gained = Math.round(state.score / 8);
      state.profile = applyProfileExp(state.profile, gained);
      saveProfile();
      if (state.mode === 'daily') {
        const best = Number(localStorage.getItem('daily_best') || 0);
        if (state.score > best) localStorage.setItem('daily_best', String(state.score));
      }
      el.log.textContent = `倒下了！本輪分數 ${state.score}，獲得EXP ${gained}`;
    }
  }

  function attack() {
    if (state.hp <= 0) return;
    const skill = state.actions[state.selected];
    const tree = skillTreeEffects(state.profile.skills);
    const judge = evaluateTimingWithAssist(state.marker, tree.timingAssist);
    const comfort = getComfortEffects(state.comfort);
    const eq = state.equippedId ? itemById(state.equippedId) : { atk: 0 };

    state.combo = judge.rating === 'Miss' ? 0 : state.combo + 1;
    state.comfort = Math.max(0, state.comfort + judge.comfort);
    missionTick('comfort', state.comfort);
    missionTick('combo', judge.rating === 'Miss' ? 0 : 1);
    if (judge.rating === 'Perfect') missionTick('perfect', 1);

    const gear = eq.atk + state.profile.permBonus + comfort.damageBonus;
    const damage = Math.round(calculateDamage(skill.base, judge.multiplier, state.combo, gear) * bpmRiskMultiplier(state.bpm));
    state.enemyHp = Math.max(0, state.enemyHp - damage);

    el.timing.textContent = judge.rating;
    el.timing.className = judge.rating === 'Perfect' ? 'good' : judge.rating === 'Miss' ? 'bad' : 'warn';
    el.log.textContent = `${skill.text} 造成 ${damage}`;
    el.rhythm.classList.add('rhythm-hit');
    setTimeout(() => el.rhythm.classList.remove('rhythm-hit'), 150);

    if (state.enemyHp <= 0) {
      dropReward();
      nextEnemy();
    } else {
      enemyAttack();
      state.actions = [...SKILLS].sort(() => Math.random() - 0.5).slice(0, 3);
    }
    renderAll();
  }

  function tick() {
    state.marker += state.dir * (state.bpm / 60) * 0.62;
    if (state.marker >= 100) { state.marker = 100; state.dir = -1; }
    if (state.marker <= 0) { state.marker = 0; state.dir = 1; }
    el.marker.style.left = `${state.marker}%`;
    if (state.metronomeOn) scheduleBeep();
    requestAnimationFrame(tick);
  }

  function scheduleBeep() {
    if (!state.audioCtx) return;
    const now = state.audioCtx.currentTime;
    const interval = 60 / state.bpm;
    if (state.nextBeat < now) state.nextBeat = now;
    while (state.nextBeat < now + 0.05) {
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.frequency.value = 820; gain.gain.value = 0.02;
      osc.connect(gain); gain.connect(state.audioCtx.destination);
      osc.start(); osc.stop(state.audioCtx.currentTime + 0.04);
      state.nextBeat += interval;
    }
  }

  function spendSkill(key) {
    if (state.profile.points <= 0) return;
    state.profile.skills[key] += 1;
    state.profile.points -= 1;
    saveProfile();
    renderAll();
  }

  // controls
  el.hit.onclick = attack;
  el.sort.onclick = () => {
    const sorted = autoSortInventory([...state.inventory.entries()].map(([id]) => itemById(id)));
    const next = new Map();
    sorted.forEach((it) => next.set(it.id, state.inventory.get(it.id) || 1));
    state.inventory = next;
    state.comfort += 8;
    state.score += 50;
    missionTick('sort', 1);
    renderAll();
  };
  el.bpm.oninput = (e) => { state.bpm = Number(e.target.value); renderAll(); };
  $('mode-arcade').onclick = () => resetRun('arcade');
  $('mode-daily').onclick = () => resetRun('daily');
  $('skill-timing').onclick = () => spendSkill('timing');
  $('skill-guard').onclick = () => spendSkill('guard');
  $('skill-loot').onclick = () => spendSkill('loot');
  $('metronome-toggle').onclick = async () => {
    if (!state.audioCtx) state.audioCtx = new AudioContext();
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    state.metronomeOn = !state.metronomeOn;
    state.nextBeat = state.audioCtx.currentTime;
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') attack();
    if (['1', '2', '3'].includes(e.key)) { state.selected = Number(e.key) - 1; renderAll(); }
  });

  applySoraArtIfAvailable();
  loadProfile();
  resetRun('arcade');
  requestAnimationFrame(tick);
})();
