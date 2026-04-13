(() => {
  const { evaluateTiming, calculateDamage, autoSortInventory } = window.GameLogic;

  const state = {
    playerHp: 100,
    enemyHp: 100,
    combo: 0,
    comfort: 0,
    bpm: 120,
    markerPos: 0,
    direction: 1,
    selectedAction: 0,
    inventory: [
      { name: '蕉流電池', rarity: 'rare' },
      { name: '蒜你狠符咒', rarity: 'epic' },
      { name: '蝦趴藥水', rarity: 'common' },
      { name: '鴨力護符', rarity: 'rare' },
      { name: '梨害披風', rarity: 'common' }
    ],
    actions: []
  };

  const pHp = document.getElementById('player-hp');
  const eHp = document.getElementById('enemy-hp');
  const combo = document.getElementById('combo');
  const comfort = document.getElementById('comfort');
  const marker = document.getElementById('beat-marker');
  const timingResult = document.getElementById('timing-result');
  const actionsEl = document.getElementById('actions');
  const logEl = document.getElementById('log');
  const inventoryEl = document.getElementById('inventory');
  const enemyLine = document.getElementById('enemy-line');

  const punPool = [
    { name: '梨害重擊', base: 12, text: '你這招真的「梨害」！' },
    { name: '蒜你狠斬', base: 15, text: '蒜你狠，辣到敵人流淚。' },
    { name: '鴨力退散', base: 10, text: '鴨力山大？先退散！' },
    { name: '蕉流閃電', base: 13, text: '香蕉導電，電到懷疑人生。' },
    { name: '蝦趴音浪', base: 11, text: '全場最蝦趴，怪物跟著搖。' }
  ];

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
      const node = document.createElement('div');
      node.className = `item ${item.rarity}`;
      node.textContent = item.name;
      inventoryEl.appendChild(node);
    });
  }

  function updateHUD() {
    pHp.textContent = state.playerHp;
    eHp.textContent = state.enemyHp;
    combo.textContent = state.combo;
    comfort.textContent = state.comfort;
  }

  function enemyTurn() {
    const dmg = Math.ceil(Math.random() * 10) + 4;
    state.playerHp = Math.max(0, state.playerHp - dmg);
    enemyLine.textContent = `「吃我一招社畜鴨力炮！(-${dmg})」`;
    if (state.playerHp <= 0) {
      logEl.textContent = '你被鴨力擊倒了…按 F5 再戰。';
    }
  }

  function attackOnBeat() {
    if (state.playerHp <= 0 || state.enemyHp <= 0) return;

    const picked = state.actions[state.selectedAction];
    const judge = evaluateTiming(state.markerPos);
    timingResult.textContent = judge.rating;
    timingResult.className = judge.rating === 'Perfect' ? 'good' : judge.rating === 'Miss' ? 'bad' : 'warn';

    if (judge.rating === 'Miss') state.combo = 0;
    else state.combo += 1;

    state.comfort = Math.max(0, state.comfort + judge.comfort);
    const dmg = calculateDamage(picked.base, judge.multiplier, state.combo);
    state.enemyHp = Math.max(0, state.enemyHp - dmg);

    logEl.textContent = `${picked.text} ${judge.rating}！造成 ${dmg} 傷害。`;

    if (state.enemyHp <= 0) {
      enemyLine.textContent = '「不可能…你竟然完美踩點！」';
      logEl.textContent += ' 你獲勝了，刷新頁面可重玩。';
    } else {
      enemyTurn();
    }

    randomActions();
    renderActions();
    updateHUD();
  }

  function tick() {
    const speed = (state.bpm / 60) * 0.9;
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
    requestAnimationFrame(tick);
  }

  document.getElementById('hit-button').addEventListener('click', attackOnBeat);
  document.getElementById('sort-button').addEventListener('click', () => {
    state.inventory = autoSortInventory(state.inventory);
    state.comfort += 6;
    logEl.textContent = '背包整理完畢，視覺舒適度 +6。';
    renderInventory();
    updateHUD();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') attackOnBeat();
    if (['1', '2', '3'].includes(e.key)) {
      state.selectedAction = Number(e.key) - 1;
      renderActions();
    }
  });

  randomActions();
  renderActions();
  renderInventory();
  updateHUD();
  requestAnimationFrame(tick);
})();
