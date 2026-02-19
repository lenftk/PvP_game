let currentKeys = JSON.parse(localStorage.getItem('fightGameKeys')) || { ...DEFAULT_KEYS };
let ctx;

window.onload = function () {
    ctx = document.getElementById('gameCanvas').getContext('2d');
    window.addEventListener('keydown', e => {
        if (gameRunning) {
            if (gameMode === 'local') inputState[e.code] = true;
            else checkOnlineInput(e.code, true);
        }
    });
    window.addEventListener('keyup', e => {
        if (gameRunning) {
            if (gameMode === 'local') inputState[e.code] = false;
            else checkOnlineInput(e.code, false);
        }
    });
    initCharSelect();
    initMapSelect();
};