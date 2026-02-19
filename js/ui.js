function openSettings() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('settings-screen').classList.remove('hidden');
    renderKeyConfig();
}
function renderKeyConfig() {
    const list = document.getElementById('key-config-list'); list.innerHTML = "";
    const labels = { left: "이동: 좌", right: "이동: 우", up: "점프", down: "아래", e: "스킬 E", r: "스킬 R", s: "궁극기 S" };
    for (let action in DEFAULT_KEYS) {
        const row = document.createElement('div'); row.className = "key-row";
        row.innerHTML = `<span>${labels[action]}</span> <div class="key-btn" onclick="remapKey('${action}', this)">${currentKeys[action]}</div>`;
        list.appendChild(row);
    }
}
function remapKey(action, btn) {
    btn.innerText = "키를 누르세요..."; btn.classList.add('listening');
    const handler = (e) => { e.preventDefault(); currentKeys[action] = e.code; renderKeyConfig(); window.removeEventListener('keydown', handler); };
    window.addEventListener('keydown', handler);
}
function saveSettings() { localStorage.setItem('fightGameKeys', JSON.stringify(currentKeys)); document.getElementById('settings-screen').classList.add('hidden'); document.getElementById('main-menu').classList.remove('hidden'); }
function resetSettings() { currentKeys = { ...DEFAULT_KEYS }; renderKeyConfig(); }
function openOnlineMenu() { document.getElementById('main-menu').classList.add('hidden'); document.getElementById('online-menu').classList.remove('hidden'); msg("대기 중"); switchTab('create'); }
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'create') { document.getElementById('panel-create').classList.remove('hidden'); document.getElementById('panel-join').classList.add('hidden'); }
    else { document.getElementById('panel-create').classList.add('hidden'); document.getElementById('panel-join').classList.remove('hidden'); }
}
function msg(txt) { const el = document.getElementById('online-status'); if (el) el.innerText = txt; }


function initCharSelect() {
    const grid = document.getElementById('char-grid');
    const randomBtn = document.querySelector('.char-card.random');

    let tooltip = document.getElementById('global-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'global-tooltip';
        document.body.appendChild(tooltip);
    }

    while (grid.firstChild && grid.firstChild !== randomBtn) {
        grid.removeChild(grid.firstChild);
    }

    for (let key in CHAR_DATA) {
        const char = CHAR_DATA[key];
        const card = document.createElement('div');
        card.className = 'char-card';
        card.id = `card-${key}`;

        card.innerHTML = `
            <div class="char-name" style="color:${char.color}">${char.name}</div>
            <div style="font-size:10px;">HP:${char.hp}</div>
        `;

        card.onmouseenter = function () {
            const passiveInfo = char.passiveDesc
                ? `<div class="passive-box">★ 패시브: ${char.passiveDesc}</div>` : '';

            tooltip.innerHTML = `
                <h3>${char.name}</h3>
                <div class="skill-row"><strong>[E] ${char.skills.e.name}</strong><span class="skill-desc">${char.skills.e.desc || ''}</span></div>
                <div class="skill-row"><strong>[R] ${char.skills.r.name}</strong><span class="skill-desc">${char.skills.r.desc || ''}</span></div>
                <div class="skill-row"><strong>[S] ${char.skills.s.name}</strong><span class="skill-desc">${char.skills.s.desc || ''}</span></div>
                ${passiveInfo}
            `;

            tooltip.style.display = 'block';

            const rect = card.getBoundingClientRect();
            const tooltipHeight = tooltip.offsetHeight;
            const tooltipWidth = 280;

            let leftPos = rect.left + (rect.width / 2) - (tooltipWidth / 2);

            if (leftPos < 10) leftPos = 10;
            if (leftPos + tooltipWidth > window.innerWidth - 10) leftPos = window.innerWidth - tooltipWidth - 10;

            tooltip.style.left = leftPos + 'px';

            if (rect.top < 350) {
                tooltip.style.top = (rect.bottom + 15) + 'px';
                tooltip.style.bottom = 'auto';
            } else {
                tooltip.style.bottom = (window.innerHeight - rect.top + 15) + 'px';
                tooltip.style.top = 'auto';
            }
        };

        card.onmouseleave = function () {
            tooltip.style.display = 'none';
        };

        card.onclick = () => selectMyChar(key);

        grid.insertBefore(card, randomBtn);
    }
}


function startSelectTimer() {
    if (selectTimer) clearInterval(selectTimer); selectTimeLeft = SELECT_TIME; document.getElementById('select-timer').innerText = selectTimeLeft;
    selectTimer = setInterval(() => {
        selectTimeLeft--; document.getElementById('select-timer').innerText = selectTimeLeft;
        if (selectTimeLeft <= 0) {
            clearInterval(selectTimer);
            if (!mySelectedChar && isOnline) selectMyChar('random');
            if (gameMode === 'local') { if (turn === 1 && !p1Char) selectMyChar('random'); if (turn === 2 && !p2Char) selectMyChar('random'); }
        }
    }, 1000);
}
function selectMyChar(key) {
    playSfx('shoot');
    if (key === 'random') { const keys = Object.keys(CHAR_DATA); key = keys[Math.floor(Math.random() * keys.length)]; }
    if (gameMode === 'local') {
        if (turn === 1) { p1Char = key; document.getElementById(`card-${key}`).classList.add('p1-selected'); turn = 2; document.getElementById('select-title').innerText = "PLAYER 2 선택"; document.getElementById('select-title').style.color = "orange"; }
        else { p2Char = key; document.getElementById(`card-${key}`).classList.add('p2-selected'); goToMapSelect(); }
    } else {
        if (mySelectedChar) return; mySelectedChar = key; document.getElementById(`card-${key}`).classList.add('selected');
        if (conn && conn.open) conn.send({ type: 'peer_picked', char: key });
        if (isHost) { p1Char = key; updateSelectStatus(); checkBothReady(); } else { document.getElementById('select-status').innerText = "선택 완료. 호스트 대기 중..."; }
    }
}
function updateSelectStatus() { if (!isHost) return; const p1State = p1Char ? "완료" : "선택 중"; const p2State = p2Char ? "완료" : "선택 중"; document.getElementById('select-status').innerText = `나(P1): ${p1State} | 상대(P2): ${p2State}`; }
function goToMapSelect() { document.getElementById('char-select-screen').classList.add('hidden'); document.getElementById('map-select-screen').classList.remove('hidden'); }
function initMapSelect() {
    const grid = document.getElementById('map-grid');
    MAP_DATA.forEach((map, idx) => {
        const card = document.createElement('div'); card.className = 'map-card';
        card.innerHTML = `<div class="map-preview" style="background: linear-gradient(to bottom, ${map.bgStart}, ${map.bgEnd})"></div><div class="map-name">${map.name}</div>`;
        card.onclick = () => { playSfx('shoot'); if (gameMode === 'local') { selectedMap = MAP_DATA[idx]; startCountdown(); } };
        grid.appendChild(card);
    });
}
function checkBothReady() {
    if (p1Char && p2Char) {
        clearInterval(selectTimer); const randMap = Math.floor(Math.random() * MAP_DATA.length); selectedMap = MAP_DATA[randMap];
        conn.send({ type: 'start_game', p1: p1Char, p2: p2Char, mapIdx: randMap }); startCountdown();
    }
}