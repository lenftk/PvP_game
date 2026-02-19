const PEER_CONFIG = { debug: 1, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], iceTransportPolicy: 'all' } };
let peer, conn, isOnline = false, isHost = false, myPlayerIndex = 0;
let roomPassword = "";

function createRoom() {
    const roomId = document.getElementById('create-room-id').value.trim();
    const pw = document.getElementById('create-room-pw').value.trim();
    if (!roomId) return msg("방 제목을 입력하세요.");

    msg("방 생성 요청 중...");
    if (peer) peer.destroy();

    peer = new Peer(roomId, PEER_CONFIG);
    roomPassword = pw;

    peer.on('open', (id) => {
        document.getElementById('online-menu').classList.add('hidden');
        document.getElementById('host-wait-screen').classList.remove('hidden');
        document.getElementById('host-room-name').innerText = "방 제목: " + id;
    });
    peer.on('error', (err) => { if (err.type === 'unavailable-id') msg("이미 존재하는 방 제목입니다."); else msg("오류 발생: " + err.type); });
    peer.on('connection', (connection) => {
        connection.on('data', (data) => handleHostData(connection, data));
        connection.on('close', handleDisconnect);
        connection.on('error', handleDisconnect);
    });
}

function joinRoom() {
    const destId = document.getElementById('join-room-id').value.trim();
    const pw = document.getElementById('join-room-pw').value.trim();
    if (!destId) return msg("방 제목을 입력하세요.");
    msg("서버 연결 시도...");
    if (peer) peer.destroy();
    peer = new Peer(PEER_CONFIG);
    peer.on('open', () => {
        const connAttempt = peer.connect(destId, { reliable: false, serialization: 'json' });
        connAttempt.on('open', () => { msg("방 접속! 인증 중..."); connAttempt.send({ type: 'auth', pw: pw }); });
        connAttempt.on('data', (data) => handleClientData(connAttempt, data));
        connAttempt.on('error', () => msg("연결 실패. 방이 없거나 오류."));
    });
    peer.on('error', (err) => msg("오류: " + err.type));
}

function handleHostData(connection, data) {
    if (data.type === 'auth') {
        if (data.pw === roomPassword) {
            conn = connection; isHost = true; myPlayerIndex = 0;
            conn.send({ type: 'auth_ok' });
            setTimeout(() => { startGameMode('online'); if (conn && conn.open) conn.send({ type: 'start_char_select' }); }, 500);
        } else { connection.send({ type: 'auth_fail' }); setTimeout(() => connection.close(), 500); }
    } else if (data.type === 'input') {
        if (data.pressed) onlineInput.p2[data.action] = true; else delete onlineInput.p2[data.action];
    } else if (data.type === 'peer_picked') {
        p2Char = data.char; updateSelectStatus(); checkBothReady();
    } else if (data.type === 'request_rematch') {
        rematchState.p2 = true; checkRematch();
    } else if (data.type === 'quit_to_menu') {
        alert("상대방이 나갔습니다."); location.reload();
    }
}

function handleClientData(connection, data) {
    if (data.type === 'auth_ok') {
        conn = connection; isHost = false; myPlayerIndex = 1;
        msg("접속 성공! 대기 중...");
    } 
    else if (data.type === 'auth_fail') { 
        alert("비밀번호가 틀렸습니다!"); connection.close(); 
    }
    else if (data.type === 'start_char_select') { 
        document.getElementById('overlay').style.display = 'none';
        startGameMode('online'); 
    }
    else if (data.type === 'start_game') { 
        p1Char = data.p1; p2Char = data.p2; selectedMap = MAP_DATA[data.mapIdx]; 
        startCountdown(); 
    }
    else if (data.type === 'snapshot') { renderSnapshot(data.state); }
    else if (data.type === 'gameover') { showGameOver(data.winner); }
    else if (data.type === 'rematch_status') { 
        document.getElementById('overlay-subtext').innerText = data.msg; 
        document.getElementById('overlay-subtext').style.display = 'block'; // 메시지 표시
    }
    else if (data.type === 'quit_to_menu') { alert("상대방이 나갔습니다."); location.reload(); }
}

function handleDisconnect() { if (gameRunning) { alert("상대방 연결 끊김"); location.reload(); } }
function checkOnlineInput(code, isPressed) {
    let myAction = null;
    for (let act in currentKeys) if (currentKeys[act] === code) myAction = act;
    if (myAction) {
        if (conn && conn.open) conn.send({ type: 'input', action: myAction, pressed: isPressed });
        if (isHost) { if (isPressed) onlineInput.p1[myAction] = true; else delete onlineInput.p1[myAction]; }
    }
}