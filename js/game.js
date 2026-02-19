let gameMode = 'local', turn = 1, p1Char = null, p2Char = null, selectedMap = MAP_DATA[0];
let gameRunning = false, inputState = {}, onlineInput = { p1: {}, p2: {} };
let p1, p2, projectiles = [], visuals = [], particles = [], mapDebris = [], gameInterval;
let screenShake = 0, globalFrame = 0, selectTimer = null, selectTimeLeft = SELECT_TIME, mySelectedChar = null, rematchState = { p1: false, p2: false };

function startGameMode(mode) {
    initAudio(); 
    gameMode = mode; 
    isOnline = (mode === 'online'); 
    resetGameSession();
    
    inputState = {}; 
    onlineInput = { p1: {}, p2: {} };
    
    if(typeof soundQueue !== 'undefined') soundQueue = [];

    document.getElementById('main-menu').classList.add('hidden'); 
    document.getElementById('online-menu').classList.add('hidden'); 
    document.getElementById('char-select-screen').classList.remove('hidden');
    
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('overlay-subtext').style.display = 'none';
    
    if (mode === 'local') {
        document.getElementById('select-title').innerText = "PLAYER 1 선택"; 
        document.getElementById('select-status').innerText = ""; 
        document.getElementById('select-timer').style.display = 'none'; 
        turn = 1;
    } else {
        document.getElementById('select-title').innerText = "내 캐릭터 선택"; 
        document.getElementById('select-status').innerText = "상대방 기다리는 중..."; 
        document.getElementById('select-timer').style.display = 'block'; 
        startSelectTimer();
    }
}

function resetGameSession() {
    p1Char = null; p2Char = null; mySelectedChar = null; rematchState = { p1: false, p2: false };
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected', 'p1-selected', 'p2-selected'));
    document.getElementById('overlay').style.display = 'none';
}

function startCountdown() {
    initAudio();
    document.getElementById('main-menu').classList.add('hidden'); 
    document.getElementById('online-menu').classList.add('hidden'); 
    document.getElementById('host-wait-screen').classList.add('hidden'); 
    document.getElementById('char-select-screen').classList.add('hidden'); 
    document.getElementById('map-select-screen').classList.add('hidden');
    
    document.getElementById('hud').style.display = 'flex'; 
    document.getElementById('gameCanvas').style.display = 'block'; 
    document.getElementById('overlay').style.display = 'flex';
    
    initGameEntities();
    
    let count = 3; 
    const t = document.getElementById('overlay-text'); 
    t.innerText = count;
    
    const iv = setInterval(() => {
        count--; 
        if (count > 0) t.innerText = count;
        else if (count === 0) { t.innerText = "FIGHT!"; t.style.color = "red"; }
        else { 
            clearInterval(iv); 
            document.getElementById('overlay').style.display = 'none'; 
            gameRunning = true; 
            startGameLoop(); 
        }
    }, 1000);
}

function initGameEntities() {
    p1 = new Fighter(true, p1Char); 
    p2 = new Fighter(false, p2Char);
    document.getElementById('p1-name-display').innerText = `P1: ${p1.name}`; 
    document.getElementById('p2-name-display').innerText = `P2: ${p2.name}`;
    projectiles = []; visuals = []; particles = []; mapDebris = []; 
    globalFrame = 0; screenShake = 0; 
    inputState = {}; onlineInput = { p1: {}, p2: {} };
}

function startGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        if (!gameRunning) return;
        globalFrame++;
        
        // 호스트 혹은 로컬만 로직 계산
        if (!isOnline || isHost) { 
            updateGameLogic(); 
            updateMapGimmicks(); 
        }

        // 렌더링 및 동기화
        if (!isOnline || isHost) {
            renderGame();
            
            // 호스트인 경우 클라이언트에게 스냅샷 전송
            if (isHost && conn && conn.open) {
                const snapshot = {
                    p1: getEntityData(p1), 
                    p2: getEntityData(p2), 
                    projs: projectiles.map(p => getProjData(p)),
                    parts: particles, 
                    vis: visuals, 
                    debris: mapDebris, 
                    shake: screenShake,
                    
                    // [추가] 맵 플랫폼(구름) 위치 동기화
                    platforms: selectedMap.platforms,
                    
                    // [추가] 사운드 동기화
                    sfx: (typeof soundQueue !== 'undefined') ? soundQueue : []
                };
                conn.send({ type: 'snapshot', state: snapshot });
                
                // 전송 후 사운드 큐 비움
                if(typeof soundQueue !== 'undefined') soundQueue = [];
            }
        }
    }, 1000 / FPS);
}

function updateGameLogic() {
    let p1Input = {}, p2Input = {};
    if (gameMode === 'local') {
        for (let act in currentKeys) if (inputState[currentKeys[act]]) p1Input[act] = true;
        for (let act in KEYS_P2) if (inputState[KEYS_P2[act]] || inputState[KEYS_P2[act + '2']]) p2Input[act] = true;
    } else { 
        p1Input = onlineInput.p1; 
        p2Input = onlineInput.p2; 
    }
    
    p1.update(p2, p1Input); 
    p2.update(p1, p2Input);
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const keep = projectiles[i] instanceof HitBox ? projectiles[i].update(projectiles[i].owner.isP1 ? p2 : p1) : (projectiles[i].update(projectiles[i].owner.isP1 ? p2 : p1), projectiles[i].active);
        if ((projectiles[i] instanceof Projectile && (projectiles[i].life <= 0 || !projectiles[i].active)) || (projectiles[i] instanceof HitBox && !keep)) projectiles.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) { particles[i].x += particles[i].vx; particles[i].y += particles[i].vy; particles[i].life -= 0.05; if (particles[i].life <= 0) particles.splice(i, 1); }
    for (let i = visuals.length - 1; i >= 0; i--) { visuals[i].y--; visuals[i].life--; if (visuals[i].life <= 0) visuals.splice(i, 1); }
    
    if (p1.hp <= 0 || p2.hp <= 0) { 
        playSfx('win'); 
        const winner = p1.hp > 0 ? "PLAYER 1 WIN!" : (p2.hp > 0 ? "PLAYER 2 WIN!" : "DRAW"); 
        gameOver(winner); 
    }
}

function updateMapGimmicks() {
    if (selectedMap.type === 'sky' && selectedMap.platforms) {
        selectedMap.platforms.forEach(p => {
            if (p.move && p.move.type === 'random') {
                if (Math.random() < 0.02) { p.move.vx += (Math.random() - 0.5) * 0.5; p.move.vy += (Math.random() - 0.5) * 0.5; p.move.vx = Math.max(-1.5, Math.min(1.5, p.move.vx)); p.move.vy = Math.max(-0.5, Math.min(0.5, p.move.vy)); }
                p.x += p.move.vx; p.y += p.move.vy;
                if (p.x < 50) p.move.vx = Math.abs(p.move.vx); if (p.x > 700) p.move.vx = -Math.abs(p.move.vx);
                if (p.y < 150) p.move.vy = Math.abs(p.move.vy); if (p.y > 450) p.move.vy = -Math.abs(p.move.vy);
            }
        });
    }
    if (selectedMap.type === 'volcano') { if (Math.random() < 0.01) { mapDebris.push({ type: 'rock', x: Math.random() * 800 + 50, y: -50, vy: Math.random() * 5 + 3, size: 20 }); } }
    if (selectedMap.type === 'jungle') {
        if (Math.random() < 0.005) {
            const target = Math.random() < 0.5 ? p1 : p2; const isBanana = Math.random() < 0.5; const startX = Math.random() < 0.5 ? -20 : 920; const vx = (target.x - startX) * 0.01 + (Math.random() - 0.5); const vy = -5 - Math.random() * 3;
            mapDebris.push({ type: isBanana ? 'banana' : 'stone', x: startX, y: 300, vx: vx, vy: vy, size: 20, isProjectile: true });
            visuals.push({ t: "끼끼!!", x: startX > 450 ? 850 : 50, y: 280, life: 60, c: "yellow" });
        }
    }
    if (selectedMap.type === 'military') { if (Math.random() < 0.003) { const isMed = Math.random() < 0.7; mapDebris.push({ type: isMed ? 'medkit' : 'ammo_box', x: Math.random() * 800 + 50, y: -50, vy: 2, size: 30, isDrop: true }); } }
    for (let i = mapDebris.length - 1; i >= 0; i--) {
        let d = mapDebris[i];
        if (d.isProjectile) { d.x += d.vx; d.y += d.vy; d.vy += 0.2; if (d.y > GROUND_Y + 100) { mapDebris.splice(i, 1); continue; } }
        else if (d.isDrop) {
            let onGround = false; if (d.y + d.size >= GROUND_Y) { d.y = GROUND_Y - d.size; d.vy = 0; onGround = true; }
            if (!onGround && selectedMap.platforms) { selectedMap.platforms.forEach(p => { if (d.y + d.size >= p.y && d.y + d.size <= p.y + d.vy + 10 && d.x + d.size > p.x && d.x < p.x + p.w) { d.y = p.y - d.size; d.vy = 0; onGround = true; } }); }
            if (!onGround) d.y += d.vy;
        } else { d.y += d.vy; if (d.y > GROUND_Y) { mapDebris.splice(i, 1); continue; } }
        let hit = false;
        [p1, p2].forEach(p => {
            if (!hit && d.x < p.x + p.w && d.x + d.size > p.x && d.y < p.y + p.h && d.y + d.size > p.y) {
                if (d.type === 'rock') { p.hit(10, null, 20); spawnHitEffect(p.x, p.y, 'red'); hit = true; }
                else if (d.type === 'banana' || d.type === 'stone') { p.hit(5, 'root', 60); visuals.push({ t: "아야!", x: p.x, y: p.y - 40, life: 60, c: "white" }); spawnHitEffect(p.x, p.y, 'yellow'); hit = true; }
                else if (d.type === 'medkit') { p.hp = Math.min(p.hp + 30, p.maxHp); visuals.push({ t: "+30 HP", x: p.x, y: p.y - 40, life: 60, c: "green" }); hit = true; }
                else if (d.type === 'ammo_box') { p.cd.e = 0; p.cd.r = 0; p.cd.s = 0; visuals.push({ t: "쿨타임 초기화!", x: p.x, y: p.y - 40, life: 60, c: "cyan" }); hit = true; }
            }
        });
        if (hit) mapDebris.splice(i, 1);
    }
}

function gameOver(msg) { gameRunning = false; clearInterval(gameInterval); if (isOnline && isHost && conn && conn.open) conn.send({ type: 'gameover', winner: msg }); showGameOver(msg); }

function showGameOver(msg) {
    document.getElementById('overlay').style.display = 'flex'; document.getElementById('restart-btn').style.display = 'block'; document.getElementById('rematch-btn').style.display = 'block'; document.getElementById('rematch-btn').classList.remove('ready', 'disabled'); document.getElementById('rematch-btn').innerText = "다시 하기";
    const t = document.getElementById('overlay-text'); t.innerText = msg; t.style.color = msg.includes("1") ? "cyan" : (msg.includes("2") ? "orange" : "white");
}

function requestRematch() {
    const btn = document.getElementById('rematch-btn'); btn.classList.add('ready', 'disabled'); btn.innerText = "대기 중...";
    if (gameMode === 'local') { startGameMode('local'); }
    else {
        if (isHost) { rematchState.p1 = true; checkRematch(); }
        else { conn.send({ type: 'request_rematch' }); document.getElementById('overlay-subtext').innerText = "호스트의 응답을 기다리는 중..."; document.getElementById('overlay-subtext').style.display = 'block'; }
    }
}

function quitToMainMenu() { if (isOnline && conn && conn.open) { conn.send({ type: 'quit_to_menu' }); } location.reload(); }

function checkRematch() {
    if (!isHost) return;
    let statusMsg = "";
    
    if (rematchState.p1 && rematchState.p2) { 
        // 양쪽 다 수락함 -> 캐릭터 선택으로 이동
        conn.send({ type: 'start_char_select' }); 
        startGameMode('online'); 
    }
    else if (rematchState.p1) statusMsg = "호스트가 다시하기를 원합니다."; 
    else if (rematchState.p2) statusMsg = "상대방이 다시하기를 원합니다.";
    
    if (statusMsg) { 
        document.getElementById('overlay-subtext').innerText = statusMsg; 
        document.getElementById('overlay-subtext').style.display = 'block'; 
        conn.send({ type: 'rematch_status', msg: statusMsg }); 
    }
}

function getEntityData(e) { 
    return { 
        x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, 
        facing: e.facing, color: e.color, w: e.w, h: e.h, 
        status: e.status, cd: e.cd,
        vx: e.vx,
        isGrounded: e.isGrounded,
        animFrame: e.animFrame
    }; 
}

function getProjData(p) { return { x: p.x, y: p.y, w: p.w, h: p.h, color: p.color, facing: p.facing, visualType: p.info.visual, age: p.age, visualLife: p.visualLife, isProj: (p instanceof Projectile), trail: p.trail }; }