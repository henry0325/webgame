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
    { name: '梨害重擊', icon:'🍐', base: 12, tag: '單體爆發', text: '你這招真的梨害！' },
    { name: '蒜你狠斬', icon:'🧄', base: 15, tag: '高風險高傷', text: '蒜你狠，辣到敵人流淚。' },
    { name: '鴨力退散', icon:'🦆', base: 10, tag: '穩定輸出', text: '鴨力先退散！' },
    { name: '蕉流閃電', icon:'🍌', base: 13, tag: '節奏連段', text: '香蕉導電，命中神速。' },
    { name: '蝦趴音浪', icon:'🦐', base: 11, tag: '舒適連動', text: '全場蝦趴，怪物跟著搖。' }
  ];
  const PUZZLES = [
    { question: '同事說「我今天被鴨到」，最可能是在描述什麼？', options: ['被鴨子追', '壓力很大', '想吃烤鴨', '買到黃色外套'], answer: 1, success: '答對！你看穿了雙關，壓力下降。', fail: '答錯！敵人笑你聽不懂梗。' },
    { question: '「蒜你狠」在本作戰鬥語境裡偏向哪種屬性？', options: ['高風險高傷', '回血防禦', '召喚分身', '偷取裝備'], answer: 0, success: '答對！你抓到招式定位。', fail: '答錯！節奏判斷被干擾。' },
    { question: '要打出高傷，以下何者最關鍵？', options: ['一直狂點', '配合節拍命中窗口', '只靠高等裝備', '每次都換招'], answer: 1, success: '答對！節奏才是核心。', fail: '答錯！你的攻擊節奏被拉亂。' }
  ];

  const state = {
    hp: 120, enemyHp: 80, combo: 0, comfort: 20, score: 0,
    bpm: 92, marker: 0, dir: 1, selected: 0,
    wave: 1, cycle: 1, danger: 1,
    runSeed: Date.now(),
    profile: { level: 1, exp: 0, kills: 0, permBonus: 0, points: 0, skills: { timing: 0, guard: 0, loot: 0 } },
    inventory: new Map(), equippedId: null, actions: [], missions: [],
    enemy: ENEMIES[0], bossCharge: 0, mode: 'arcade', dead: false, continueTokens: 1,
    messages: [], msgFilter: 'all', stats: { perfect: 0, miss: 0, totalDamage: 0, attacks: 0 }, settings: { assistMode: true, highContrast: false }, metronomeOn: false, audioCtx: null, nextBeat: 0,
    puzzle: { active: false, question: '', options: [], answer: -1, selected: -1, success: '', fail: '' }
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
    playerArt:$('player-art'), enemyArt:$('enemy-art'), artSource:$('art-source'),
    gameoverActions:$('gameover-actions'), continueButton:$('continue-button'), restartButton:$('restart-button'),
    messageFeed:$('message-feed'), skillTimingLv:$('skill-timing-lv'), skillGuardLv:$('skill-guard-lv'), skillLootLv:$('skill-loot-lv'),
    filterAll:$('filter-all'), filterCombat:$('filter-combat'), filterLoot:$('filter-loot'), filterSystem:$('filter-system'),
    statPerfect:$('stat-perfect'), statMiss:$('stat-miss'), statDamage:$('stat-damage'),
    assistMode:$('assist-mode'), highContrast:$('high-contrast'),
    puzzlePanel:$('puzzle-panel'), puzzleWaveTag:$('puzzle-wave-tag'), puzzleQuestion:$('puzzle-question'),
    puzzleOptions:$('puzzle-options'), puzzleSubmit:$('puzzle-submit')
  };

  const loadProfile = () => {
    try {
      const p = JSON.parse(localStorage.getItem('player_profile') || 'null');
      if (p) state.profile = { ...state.profile, ...p, skills: { ...state.profile.skills, ...(p.skills || {}) } };
    } catch {}
  };
  const saveProfile = () => localStorage.setItem('player_profile', JSON.stringify(state.profile));

  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem('game_settings') || 'null');
      if (raw) state.settings = { ...state.settings, ...raw };
    } catch {}
  }
  function saveSettings() {
    localStorage.setItem('game_settings', JSON.stringify(state.settings));
  }

  function applyVisualSettings() {
    document.body.classList.toggle('high-contrast', !!state.settings.highContrast);
    if (el.highContrast) el.highContrast.checked = !!state.settings.highContrast;
    if (el.assistMode) el.assistMode.checked = !!state.settings.assistMode;
  }

  function pushMsg(type, text, pinned = false) {
    state.messages.push({ type, text, pinned, ts: Date.now() });
    state.messages = state.messages.slice(-80);
  }

  function applySoraArtIfAvailable() {
    const candidates = [
      { key: 'playerArt', files: ['assets/player_sora.jpg', 'assets/player_sora.png'], fallback: 'assets/player.svg' },
      { key: 'enemyArt', files: ['assets/enemy_sora.jpg', 'assets/enemy_sora.png'], fallback: 'assets/enemy.svg' }
    ];

    candidates.forEach(({ key, files, fallback }) => {
      if (!el[key]) return;
      const tryLoad = (idx) => {
        if (idx >= files.length) { el[key].src = fallback; if (el.artSource) el.artSource.textContent = 'Art: SVG fallback'; return; }
        const img = new Image();
        img.onload = () => { el[key].src = files[idx]; if (el.artSource) el.artSource.textContent = 'Art: Sora JPG/PNG'; };
        img.onerror = () => tryLoad(idx + 1);
        img.src = files[idx];
      };
      tryLoad(0);
    });
  }

  function upsertItem(id, qty = 1) {
    state.inventory.set(id, (state.inventory.get(id) || 0) + qty);
  }

  function itemById(id) { return EQUIPMENT_DB[id]; }

  function drawActionsForCurrentWave() {
    const pool = [...SKILLS];
    const seed = state.runSeed + state.cycle * 101 + state.wave * 37;
    const rand = seededRandom(seed);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    state.actions = pool.slice(0, 3);
    state.selected = Math.min(state.selected, state.actions.length - 1);
  }

  function maybeStartPuzzle() {
    const shouldStart = state.wave % 2 === 0 || state.enemy.boss;
    if (!shouldStart) {
      state.puzzle = { active: false, question: '', options: [], answer: -1, selected: -1, success: '', fail: '' };
      return;
    }
    const rand = seededRandom(state.runSeed + state.wave * 503 + state.cycle * 997);
    const picked = PUZZLES[Math.floor(rand() * PUZZLES.length)];
    state.puzzle = { active: true, question: picked.question, options: picked.options, answer: picked.answer, selected: -1, success: picked.success, fail: picked.fail };
    pushMsg('system', '解謎回合啟動：答題後獲得戰場修正', true);
  }

  function solvePuzzle() {
    if (!state.puzzle.active || state.puzzle.selected < 0) return;
    const ok = state.puzzle.selected === state.puzzle.answer;
    if (ok) {
      state.comfort += 6;
      state.score += 80;
      state.danger = Math.max(0.8, +(state.danger - 0.03).toFixed(2));
      pushMsg('system', state.puzzle.success, true);
      el.log.textContent = '解謎成功：舒適度+6、分數+80、危險度微降';
    } else {
      state.hp = Math.max(1, state.hp - 8);
      state.enemyHp = Math.round(state.enemyHp * 1.1);
      pushMsg('system', state.puzzle.fail, true);
      el.log.textContent = '解謎失敗：HP-8，敵人獲得10%護持';
    }
    state.puzzle.active = false;
    renderAll();
  }

  function resetRun(mode) {
    state.mode = mode;
    state.hp = 120 + state.profile.level * 2;
    state.combo = 0; state.score = 0; state.comfort = 22;
    state.bpm = mode === 'daily' ? 102 : 92;
    state.wave = 1; state.cycle = 1; state.danger = mode === 'daily' ? 1.2 : 1; state.dead = false; state.continueTokens = 1;
    state.enemy = ENEMIES[0]; state.enemyHp = scaledHp(state.enemy); state.bossCharge = 0;
    state.inventory.clear(); upsertItem('metronome', 1); upsertItem('sorter', 1);
    state.equippedId = null;
    state.runSeed = mode === 'daily' ? seedFromDate() : Date.now();
    const rand = seededRandom(state.runSeed);
    state.missions = buildMissions(rand);
    drawActionsForCurrentWave();
    maybeStartPuzzle();
    state.messages = [];
    state.stats = { perfect: 0, miss: 0, totalDamage: 0, attacks: 0 };
    pushMsg('system', '新冒險開始', true);
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
    applyVisualSettings();
    if (el.skillTimingLv) el.skillTimingLv.textContent = `Lv.${state.profile.skills.timing}`;
    if (el.skillGuardLv) el.skillGuardLv.textContent = `Lv.${state.profile.skills.guard}`;
    if (el.skillLootLv) el.skillLootLv.textContent = `Lv.${state.profile.skills.loot}`;
    if (el.statPerfect) el.statPerfect.textContent = state.stats.perfect;
    if (el.statMiss) el.statMiss.textContent = state.stats.miss;
    if (el.statDamage) el.statDamage.textContent = state.stats.totalDamage;

    el.actions.innerHTML = '';
    state.actions.forEach((a, i) => {
      const n = document.createElement('button');
      n.className = `action ${i === state.selected ? 'selected' : ''}`;
      n.innerHTML = `<span class="icon">${a.icon}</span>${i + 1}. ${a.name}`;
      n.onclick = () => { state.selected = i; renderAll(); };
      el.actions.appendChild(n);
    });
    const act = state.actions[state.selected];
    el.actionDetail.textContent = `快捷鍵 ${state.selected+1}｜${act.name}｜基礎${act.base}｜${act.tag}｜每波招式固定｜節拍輔助+${tree.timingAssist}`;
    if (el.hit) el.hit.disabled = state.puzzle.active;

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
          pushMsg('loot', `裝備維持：${it.name}`);
          return;
        }
        state.equippedId = id;
        state.comfort += Math.min(3, it.comfort);
        el.log.textContent = `已裝備 ${it.name}（固定詞綴：${it.note}）`;
        pushMsg('loot', `裝備更新：${it.name}`, true);
        renderAll();
      };
      el.inventory.appendChild(btn);
    });

    el.missions.innerHTML = state.missions.map((m) => `${m.done ? '✅' : '⬜'} ${m.text} (${Math.min(m.progress,m.target)}/${m.target})`).join('<br/>');
    if (el.gameoverActions) el.gameoverActions.classList.toggle('hidden', !state.dead);
    if (el.messageFeed) {
      const filtered = state.messages.filter((m) => state.msgFilter === 'all' || m.type === state.msgFilter || m.pinned);
      el.messageFeed.innerHTML = filtered.map((m) => `<div class=\"message-item\"><strong>[${m.type}]</strong> ${m.text}</div>`).join('');
      el.messageFeed.scrollTop = el.messageFeed.scrollHeight;
    }
    if (el.filterAll) el.filterAll.disabled = state.msgFilter === 'all';
    if (el.filterCombat) el.filterCombat.disabled = state.msgFilter === 'combat';
    if (el.filterLoot) el.filterLoot.disabled = state.msgFilter === 'loot';
    if (el.filterSystem) el.filterSystem.disabled = state.msgFilter === 'system';
    if (el.puzzlePanel) el.puzzlePanel.classList.toggle('hidden', !state.puzzle.active);
    if (el.puzzleWaveTag) el.puzzleWaveTag.textContent = state.puzzle.active ? `Wave ${state.wave}C${state.cycle}` : '';
    if (el.puzzleQuestion) el.puzzleQuestion.textContent = state.puzzle.question || '';
    if (el.puzzleOptions) {
      el.puzzleOptions.innerHTML = '';
      state.puzzle.options.forEach((opt, idx) => {
        const b = document.createElement('button');
        b.className = `puzzle-option ${state.puzzle.selected === idx ? 'selected' : ''}`;
        b.textContent = `${idx + 1}. ${opt}`;
        b.onclick = () => { state.puzzle.selected = idx; renderAll(); };
        el.puzzleOptions.appendChild(b);
      });
    }
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
    localStorage.setItem('last_run_snapshot', JSON.stringify({ score: state.score, wave: state.wave, cycle: state.cycle }));
    state.enemy = ENEMIES[state.wave - 1];
    state.enemyHp = scaledHp(state.enemy);
    state.bossCharge = 0;
    drawActionsForCurrentWave();
    maybeStartPuzzle();

    if (state.settings.assistMode && state.stats.attacks % 20 === 0) {
      const missRate = state.stats.miss / Math.max(1, state.stats.attacks);
      const perfectRate = state.stats.perfect / Math.max(1, state.stats.attacks);
      if (missRate > 0.35) {
        state.bpm = Math.max(70, state.bpm - 4);
        state.danger = Math.max(0.8, +(state.danger - 0.04).toFixed(2));
        pushMsg('system', '智慧輔助：已下調節奏與危險度', true);
      } else if (perfectRate > 0.45) {
        state.bpm = Math.min(160, state.bpm + 2);
        state.score += 40;
        pushMsg('system', '智慧輔助：你狀態很好，獲得高手獎勵 +40', true);
      }
    }

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
      state.dead = true;
      el.log.textContent = `倒下了！本輪分數 ${state.score}，獲得EXP ${gained}`;
      pushMsg('system', `角色倒下，獲得EXP ${gained}`, true);
    }
  }

  function attack() {
    if (state.hp <= 0 || state.dead) return;
    if (state.puzzle.active) {
      el.log.textContent = '先完成解謎回合，才能繼續出招。';
      return;
    }
    const skill = state.actions[state.selected];
    const tree = skillTreeEffects(state.profile.skills);
    const judge = evaluateTimingWithAssist(state.marker, tree.timingAssist);
    const comfort = getComfortEffects(state.comfort);
    const eq = state.equippedId ? itemById(state.equippedId) : { atk: 0 };

    state.stats.attacks += 1;
    state.combo = judge.rating === 'Miss' ? 0 : state.combo + 1;
    if (judge.rating === 'Perfect') state.stats.perfect += 1;
    if (judge.rating === 'Miss') state.stats.miss += 1;
    state.comfort = Math.max(0, state.comfort + judge.comfort);
    missionTick('comfort', state.comfort);
    missionTick('combo', judge.rating === 'Miss' ? 0 : 1);
    if (judge.rating === 'Perfect') missionTick('perfect', 1);

    const gear = eq.atk + state.profile.permBonus + comfort.damageBonus;
    const damage = Math.round(calculateDamage(skill.base, judge.multiplier, state.combo, gear) * bpmRiskMultiplier(state.bpm));
    state.stats.totalDamage += damage;
    state.enemyHp = Math.max(0, state.enemyHp - damage);

    el.timing.textContent = judge.rating;
    el.timing.className = judge.rating === 'Perfect' ? 'good' : judge.rating === 'Miss' ? 'bad' : 'warn';
    el.log.textContent = `${skill.text} 造成 ${damage}`;
    pushMsg('combat', `${judge.rating}｜${skill.name}：-${damage}`);
    el.rhythm.classList.add('rhythm-hit');
    setTimeout(() => el.rhythm.classList.remove('rhythm-hit'), 150);

    if (state.enemyHp <= 0) {
      dropReward();
      nextEnemy();
    } else {
      enemyAttack();
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
    pushMsg('system', `天賦提升：${key}`);
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
    pushMsg('loot', '背包已整理', true);
    renderAll();
  };
  el.bpm.oninput = (e) => { state.bpm = Number(e.target.value); renderAll(); };
  const arcadeBtn = $('mode-arcade');
  const dailyBtn = $('mode-daily');
  const timingBtn = $('skill-timing');
  const guardBtn = $('skill-guard');
  const lootBtn = $('skill-loot');
  if (arcadeBtn) arcadeBtn.onclick = () => resetRun('arcade');
  if (dailyBtn) dailyBtn.onclick = () => resetRun('daily');
  if (timingBtn) timingBtn.onclick = () => spendSkill('timing');
  if (guardBtn) guardBtn.onclick = () => spendSkill('guard');
  if (lootBtn) lootBtn.onclick = () => spendSkill('loot');
  $('metronome-toggle').onclick = async () => {
    if (!state.audioCtx) state.audioCtx = new AudioContext();
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    state.metronomeOn = !state.metronomeOn;
    state.nextBeat = state.audioCtx.currentTime;
  };

  if (el.continueButton) {
    el.continueButton.onclick = () => {
      if (!state.dead || state.continueTokens <= 0) return;
      state.continueTokens -= 1;
      state.dead = false;
      pushMsg('system', '使用續關道具成功', true);
      state.hp = Math.max(40, Math.round((120 + state.profile.level * 2) * 0.45));
      state.comfort = Math.max(10, state.comfort);
      el.log.textContent = '已續關，請把握這次機會！';
      renderAll();
    };
  }
  if (el.restartButton) {
    el.restartButton.onclick = () => resetRun(state.mode);
  }


  if (el.filterAll) el.filterAll.onclick = () => { state.msgFilter = 'all'; renderAll(); };
  if (el.filterCombat) el.filterCombat.onclick = () => { state.msgFilter = 'combat'; renderAll(); };
  if (el.filterLoot) el.filterLoot.onclick = () => { state.msgFilter = 'loot'; renderAll(); };
  if (el.filterSystem) el.filterSystem.onclick = () => { state.msgFilter = 'system'; renderAll(); };
  if (el.puzzleSubmit) el.puzzleSubmit.onclick = solvePuzzle;


  if (el.assistMode) {
    el.assistMode.onchange = (e) => {
      state.settings.assistMode = e.target.checked;
      saveSettings();
      pushMsg('system', `智慧輔助：${e.target.checked ? '開啟' : '關閉'}`);
      renderAll();
    };
  }
  if (el.highContrast) {
    el.highContrast.onchange = (e) => {
      state.settings.highContrast = e.target.checked;
      saveSettings();
      applyVisualSettings();
      pushMsg('system', `高對比模式：${e.target.checked ? '開啟' : '關閉'}`);
      renderAll();
    };
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') attack();
    if (['1', '2', '3'].includes(e.key)) { state.selected = Number(e.key) - 1; renderAll(); }
  });

  applySoraArtIfAvailable();
  loadProfile();
  loadSettings();
  resetRun('arcade');
  requestAnimationFrame(tick);
})();
