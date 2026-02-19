function renderGame() {
    ctx.save();
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    ctx.clearRect(-20, -20, 940, 590);
    drawMap();

    mapDebris.forEach(d => {
        if (d.type === 'rock') {
            const grad = ctx.createRadialGradient(d.x, d.y, 2, d.x, d.y, d.size / 2);
            grad.addColorStop(0, "#e74c3c"); grad.addColorStop(1, "#c0392b");
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2); ctx.fill();
        } else { drawVisual(ctx, d.type, d.x, d.y, d.size, d.size, 1, "white"); }
    });

    p1.draw(ctx);
    drawPlayerTag(ctx, p1, "P1", "#00c6ff");

    p2.draw(ctx);
    drawPlayerTag(ctx, p2, "P2", "#f12711");

    projectiles.forEach(p => p.draw());

    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.size || 5, p.size || 5);
    });

    visuals.forEach(v => {
        ctx.globalAlpha = Math.min(1, v.life / 20);
        ctx.fillStyle = v.c;
        ctx.font = "bold 20px Arial";
        ctx.shadowColor = "black"; ctx.shadowBlur = 4;
        ctx.fillText(v.t, v.x, v.y);
        ctx.shadowBlur = 0;
    });

    ctx.globalAlpha = 1;
    ctx.restore();
    updateUI();
}

function renderSnapshot(state) {
    try {
        screenShake = state.shake || 0;

        if (state.sfx && state.sfx.length > 0) {
            state.sfx.forEach(s => {
                if (typeof playLocalSfx === 'function') playLocalSfx(s);
            });
        }

        if (state.platforms) {
            selectedMap.platforms = state.platforms;
        }

        ctx.save();
        if (screenShake > 0) {
            const dx = (Math.random() - 0.5) * screenShake; const dy = (Math.random() - 0.5) * screenShake; ctx.translate(dx, dy);
        }
        ctx.clearRect(-20, -20, 940, 590);
        drawMap();

        if (state.debris) {
            state.debris.forEach(d => {
                if (d.type === 'rock') {
                    const grad = ctx.createRadialGradient(d.x, d.y, 2, d.x, d.y, d.size / 2);
                    grad.addColorStop(0, "#e74c3c"); grad.addColorStop(1, "#c0392b");
                    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2); ctx.fill();
                }
                else { drawVisual(ctx, d.type, d.x, d.y, d.size, d.size, 1, "white"); }
            });
        }

        updateBar(1, state.p1.hp, state.p1.maxHp); updateBar(2, state.p2.hp, state.p2.maxHp);
        let showP1 = true, showP2 = true; if (isOnline) { showP1 = (myPlayerIndex === 0); showP2 = (myPlayerIndex === 1); }
        updateCDDisplay(1, state.p1.cd, showP1); updateCDDisplay(2, state.p2.cd, showP2);

        applySnapshotToChar(p1, state.p1);
        applySnapshotToChar(p2, state.p2);

        p1.draw(ctx);
        drawPlayerTag(ctx, p1, "P1", "#00c6ff");

        p2.draw(ctx);
        drawPlayerTag(ctx, p2, "P2", "#f12711");

        state.projs.forEach(p => {
            const alpha = 1 - (p.age / p.visualLife); ctx.globalAlpha = Math.max(0, alpha);
            if (p.isProj) {
                ctx.beginPath(); ctx.strokeStyle = p.color; ctx.lineWidth = 5;
                if (p.trail) p.trail.forEach((t, i) => { ctx.lineWidth = i / 2; ctx.lineTo(t.x, t.y); }); ctx.stroke();
                drawVisual(ctx, p.visualType, p.x - 10, p.y - 10, 20, 20, p.facing, p.color);
            } else { drawVisual(ctx, p.visualType, p.x, p.y, p.w, p.h, p.facing, p.color); }
            ctx.globalAlpha = 1;
        });
        state.vis.forEach(v => { ctx.fillStyle = v.c; ctx.font = "bold 20px Arial"; ctx.fillText(v.t, v.x, v.y); });
        state.parts.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.size || 5, p.size || 5); });
        ctx.globalAlpha = 1; ctx.restore();
    } catch (e) { console.error(e); }
}

function applySnapshotToChar(localChar, snapshotData) {
    if (!localChar || !snapshotData) return;
    localChar.x = snapshotData.x;
    localChar.y = snapshotData.y;
    localChar.hp = snapshotData.hp;
    localChar.maxHp = snapshotData.maxHp;
    localChar.facing = snapshotData.facing;
    localChar.status = snapshotData.status;
    localChar.cd = snapshotData.cd;
    localChar.vx = snapshotData.vx;
    localChar.isGrounded = snapshotData.isGrounded;
    localChar.animFrame = snapshotData.animFrame;
}

function drawPlayerTag(ctx, player, text, color) {
    if (!player) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";

    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;

    const tx = player.x + player.w / 2;
    const ty = player.y - 15;

    ctx.fillText(`▼ ${text}`, tx, ty);

    ctx.restore();
}

function drawMap() {
    const grd = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grd.addColorStop(0, selectedMap.bgStart); grd.addColorStop(1, selectedMap.bgEnd);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 900, 550);
    if (selectedMap.type === 'jungle') { ctx.font = "100px Arial"; ctx.textAlign = "center"; ctx.globalAlpha = 0.3; ctx.fillText("🐒", 450, 300); ctx.globalAlpha = 1.0; }
    if (selectedMap.type === 'cyber') { drawVisual(ctx, 'teleport_gate', 0, 350, 40, 80, 1, "cyan"); drawVisual(ctx, 'teleport_gate', 860, 350, 40, 80, 1, "magenta"); }
    ctx.fillStyle = selectedMap.ground; ctx.fillRect(0, GROUND_Y, 900, 550 - GROUND_Y);
    if (selectedMap.platforms) {
        selectedMap.platforms.forEach(p => { ctx.fillStyle = p.c || "#555"; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(p.x + 5, p.y + p.h, p.w, 5); });
    }
}

function drawStatusAura(ctx, x, y, w, h, status) {
    const cx = x + w / 2; const cy = y + h / 2; const radius = Math.max(w, h) * 0.8;
    ctx.save(); ctx.globalAlpha = 0.6; ctx.shadowBlur = 15;

    if (status.invuln > 0) { ctx.shadowColor = "gold"; ctx.strokeStyle = "gold"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke(); }
    if (status.vuln > 0) { ctx.shadowColor = "purple"; ctx.strokeStyle = "purple"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke(); }
    if (status.slow > 0) { ctx.shadowColor = "cyan"; ctx.strokeStyle = "cyan"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2); ctx.stroke(); }
    if (status.root > 0 || status.brainFreeze > 0) {
        ctx.shadowColor = "yellow"; ctx.strokeStyle = status.brainFreeze ? "yellow" : "gray";
        ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(x - 5, y - 5, w + 10, h + 10); ctx.stroke();
        if (status.brainFreeze > 0) { ctx.fillStyle = "rgba(255,255,0,0.2)"; ctx.fill(); }
    }
    if (status.painJump > 0) { ctx.shadowColor = "red"; ctx.strokeStyle = "darkred"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke(); }
    if (status.confuse > 0) { ctx.shadowColor = "orange"; ctx.strokeStyle = "orange"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, y - 10, 10, 0, Math.PI * 2); ctx.stroke(); }
    if (status.bleed > 0) { ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(x + w / 2, y, 5, 0, Math.PI * 2); ctx.fill(); }
    if (status.globalFreeze > 0) { ctx.strokeStyle = "cyan"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2); ctx.stroke(); }

    ctx.restore();
}

function updateUI() {
    updateBar(1, p1.hp, p1.maxHp); updateBar(2, p2.hp, p2.maxHp);
    let showP1 = true, showP2 = true;
    if (isOnline) { showP1 = (myPlayerIndex === 0); showP2 = (myPlayerIndex === 1); }
    updateCDDisplay(1, p1.cd, showP1); updateCDDisplay(2, p2.cd, showP2);
}

function updateBar(p, hp, max) {
    document.getElementById(`p${p}-hp`).style.width = Math.max(0, hp / max * 100) + "%";
    document.getElementById(`p${p}-hp-text`).innerText = Math.ceil(hp);
}

function updateCDDisplay(p, cdObj, isVisible) {
    const setCD = (key, val) => {
        const el = document.getElementById(`p${p}-cd-${key}`);
        if (!isVisible) { el.innerText = "???"; el.style.color = "gray"; }
        else { if (val > 0) { el.innerText = val.toFixed(1); el.style.color = "#e74c3c"; } else { el.innerText = "READY"; el.style.color = "#2ecc71"; } }
    };
    if (cdObj) { setCD('e', cdObj.e); setCD('r', cdObj.r); setCD('s', cdObj.s); }
}

function drawVisual(ctx, type, x, y, w, h, facing, color, isProj) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(facing, 1);

    const hw = w / 2, hh = h / 2, minSize = Math.min(w, h) / 2;
    const time = Date.now() / 200;

    ctx.fillStyle = color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    switch (type) {
        case 'fist': case 'big_fist': case 'blue_fist':
            ctx.shadowColor = color; ctx.shadowBlur = 10;
            ctx.fillStyle = (type === 'blue_fist') ? "#3498db" : color;
            ctx.beginPath(); ctx.arc(10, 0, minSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10 + minSize * 0.5, 0, minSize * 0.6, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
            ctx.beginPath(); ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.moveTo(-hw, -hh / 2); ctx.lineTo(0, -hh / 2); ctx.stroke();
            break;

        case 'shoelace':
            ctx.shadowColor = "yellow"; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.strokeStyle = "yellow"; ctx.lineWidth = 4;
            ctx.moveTo(-hw, 0);
            ctx.bezierCurveTo(-hw / 2, Math.sin(time * 10) * 10 - hh, hw / 2, Math.cos(time * 10) * 10 + hh, hw, 0);
            ctx.stroke();
            break;

        case 'cat_paw':
            ctx.fillStyle = "#ffcccc"; ctx.shadowColor = "pink"; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.7, hh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ff69b4";
            [[-0.4, -0.5], [0, -0.7], [0.4, -0.5]].forEach(p => {
                ctx.beginPath(); ctx.arc(hw * p[0], hh * p[1], minSize * 0.25, 0, Math.PI * 2); ctx.fill();
            });
            break;

        case 'shotgun_blast': case 'ac_wind':
            const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, w);
            if (type === 'ac_wind') {
                grad.addColorStop(0, "rgba(255, 255, 255, 0.9)"); grad.addColorStop(1, "rgba(0, 255, 255, 0)");
                ctx.shadowColor = "cyan"; ctx.shadowBlur = 10;
            } else {
                grad.addColorStop(0, "rgba(255, 165, 0, 0.9)"); grad.addColorStop(1, "rgba(255, 0, 0, 0)");
            }
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.arc(-hw, 0, w, -0.6, 0.6); ctx.fill();
            if (type === 'ac_wind') {
                ctx.fillStyle = "white"; ctx.font = `${minSize}px Arial`; ctx.fillText("❄️", w / 2, Math.sin(time) * 10);
            }
            break;

        case 'car':
            ctx.shadowColor = "blue"; ctx.shadowBlur = 10;
            ctx.fillStyle = "#3498db";
            ctx.beginPath(); ctx.moveTo(-hw, hh * 0.3); ctx.lineTo(-hw, -hh * 0.2); ctx.lineTo(-hw * 0.4, -hh * 0.6); ctx.lineTo(hw * 0.7, -hh * 0.6); ctx.lineTo(hw, 0); ctx.lineTo(hw, hh * 0.3); ctx.fill();
            ctx.fillStyle = "#ecf0f1";
            ctx.fillRect(-hw * 0.3, -hh * 0.5, hw * 0.8, hh * 0.4);
            ctx.fillStyle = "black";
            ctx.beginPath(); ctx.arc(-hw * 0.5, hh * 0.3, minSize * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(hw * 0.5, hh * 0.3, minSize * 0.4, 0, Math.PI * 2); ctx.fill();
            break;

        case 'palm': case 'huge_hand': case 'hand_grab':
            ctx.shadowColor = "orange"; ctx.shadowBlur = 5;
            ctx.fillStyle = (type === 'huge_hand') ? "#d35400" : "#f39c12";
            ctx.beginPath(); ctx.roundRect(-hw * 0.6, -hh * 0.6, w * 0.8, h * 0.8, 10); ctx.fill();
            if (type === 'hand_grab') { ctx.strokeStyle = "red"; ctx.lineWidth = 3; ctx.strokeRect(-hw * 0.6, -hh * 0.6, w * 0.8, h * 0.8); }
            break;

        case 'glasses':
            ctx.strokeStyle = "black"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(-hw / 2, 0, minSize * 0.8, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(hw / 2, 0, minSize * 0.8, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-hw / 10, 0); ctx.lineTo(hw / 10, 0); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(-hw / 2, 0, minSize * 0.8, Math.PI + time, 2 * Math.PI + time); ctx.fill();
            break;

        case 'anvil':
            ctx.fillStyle = "#2c3e50"; ctx.shadowColor = "black"; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(hw, hh); ctx.lineTo(hw * 0.8, 0); ctx.lineTo(-hw * 0.8, 0); ctx.fill();
            ctx.fillRect(-hw * 1.2, -hh, w * 2.4, hh);
            break;

        case 'dumbbell':
            const metalGrad = ctx.createLinearGradient(0, -hh, 0, hh);
            metalGrad.addColorStop(0, "#95a5a6"); metalGrad.addColorStop(0.5, "#ecf0f1"); metalGrad.addColorStop(1, "#7f8c8d");
            ctx.fillStyle = metalGrad;
            ctx.beginPath(); ctx.roundRect(-hw, -hh / 1.5, w * 0.3, h, 5); ctx.fill();
            ctx.beginPath(); ctx.roundRect(hw * 0.7, -hh / 1.5, w * 0.3, h, 5); ctx.fill();
            ctx.fillStyle = "gray"; ctx.fillRect(-hw, -hh / 8, w * 2, h / 4);
            break;

        case 'bullet':
            ctx.shadowColor = "gold"; ctx.shadowBlur = 15;
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.ellipse(-w / 4, -h / 6, w / 6, h / 8, 0, 0, Math.PI * 2); ctx.fill();
            break;

        case 'kick_effect':
            ctx.strokeStyle = "#f1c40f"; ctx.shadowColor = "yellow"; ctx.shadowBlur = 10; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(0, 0); ctx.lineTo(hw, -hh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(Math.random() * 10, Math.random() * 10); ctx.lineTo(Math.random() * w, -Math.random() * h); ctx.stroke();
            break;

        case 'sword':
            ctx.shadowColor = "cyan"; ctx.shadowBlur = 8;
            ctx.fillStyle = "#bdc3c7";
            ctx.beginPath(); ctx.moveTo(-hw, -hh / 4); ctx.lineTo(hw, 0); ctx.lineTo(-hw, hh / 4); ctx.fill();
            ctx.fillStyle = "#2980b9";
            ctx.fillRect(-hw, -hh / 8, w / 4, h / 4);
            ctx.fillStyle = "#ecf0f1"; ctx.fillRect(0, -2, w * 0.8, 4);
            break;

        case 'fire_aura':
            const iceGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, w);
            iceGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)"); iceGrad.addColorStop(1, "rgba(0, 255, 255, 0)");
            ctx.fillStyle = iceGrad;
            ctx.beginPath(); ctx.arc(0, 0, w, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.fillText("❄️", Math.sin(time) * 20, Math.cos(time) * 20);
            break;

        case 'text_lol': case 'text_conf': case 'heart_break': case 'score_f': case 'korean_chars':
            ctx.font = `bold ${h * 0.8}px Arial`;
            ctx.shadowColor = "white"; ctx.shadowBlur = 5;
            ctx.fillStyle = (type === 'score_f' || type === 'heart_break') ? "#e74c3c" : (type === 'text_conf' ? "#f1c40f" : "white");
            let txt = "XXX";
            if (type === 'text_lol') txt = "ㅋ"; if (type === 'text_conf') txt = "자신감!";
            if (type === 'score_f') txt = "0점"; if (type === 'heart_break') txt = "💔";
            ctx.fillText(txt, 0, 0);
            break;

        case 'ruler':
            ctx.fillStyle = "#f1c40f"; ctx.fillRect(-hw, -hh, w, h); ctx.fillStyle = "black"; for (let i = -w / 2; i < w / 2; i += 10) ctx.fillRect(i, -10, 1, 5); break;
        case 'shuttlecock':
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(hw * 0.5, 0, minSize * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(hw * 0.2, -5); ctx.lineTo(-hw, -hh); ctx.lineTo(-hw, hh); ctx.lineTo(hw * 0.2, 5); ctx.stroke(); break;
        case 'flash_coat':
            ctx.fillStyle = "yellow"; ctx.beginPath(); for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.rect(0, 0, minSize * 2, 5); } ctx.fill(); break;
        case 'hand_chop':
            ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-hw, -hh / 2); ctx.lineTo(hw, 0); ctx.lineTo(-hw, hh / 2); ctx.fill(); break;
        case 'plus_green':
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(-hw / 4, -hh, w / 2, h); ctx.fillRect(-hw, -hh / 4, w, h / 2); break;
        case 'racket':
            ctx.beginPath(); ctx.arc(0, -hh * 0.2, minSize, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, hh * 0.5); ctx.lineTo(0, hh); ctx.stroke(); break;
        case 'crown':
            ctx.fillStyle = "gold"; ctx.beginPath(); ctx.moveTo(-hw, hh / 2); ctx.lineTo(-hw, -hh / 2); ctx.lineTo(-hw / 2, 0); ctx.lineTo(0, -hh); ctx.lineTo(hw / 2, 0); ctx.lineTo(hw, -hh / 2); ctx.lineTo(hw, hh / 2); ctx.fill(); break;
        case 'comic_book':
            ctx.fillStyle = "white"; ctx.fillRect(-hw, -hh, w, h); ctx.strokeRect(-hw, -hh, w, h); ctx.fillStyle = "black"; ctx.font = `${h / 3}px Arial`; ctx.fillText("만화", -hw + 5, 0); break;
        case 'sparta_boot':
            ctx.fillStyle = "#8e44ad"; ctx.beginPath(); ctx.moveTo(hw / 2, -hh); ctx.lineTo(hw / 2, hh); ctx.lineTo(-hw / 2, hh); ctx.lineTo(-hw / 2, 0); ctx.lineTo(-hw, 0); ctx.fill(); break;
        case 'knife_stab':
            ctx.fillStyle = "gray"; ctx.beginPath(); ctx.moveTo(-hw, -hh / 4); ctx.lineTo(hw, 0); ctx.lineTo(-hw, hh / 4); ctx.fill(); break;
        case 'soccer_ball':
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0, 0, minSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
        case 'game_shield':
            ctx.strokeStyle = "cyan"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, minSize, 0, Math.PI * 2); ctx.stroke(); break;
        case 'bone_crack':
            ctx.fillStyle = "white"; ctx.fillRect(-hw, -hh / 4, w, hh / 2); ctx.beginPath(); ctx.arc(-hw, -hh / 4, hh / 4, 0, Math.PI * 2); ctx.fill(); ctx.arc(hw, -hh / 4, hh / 4, 0, Math.PI * 2); ctx.fill(); break;
        case 'leaf_slap':
            ctx.fillStyle = "#2ecc71"; ctx.beginPath(); ctx.ellipse(0, 0, hw, hh / 2, 0, 0, Math.PI * 2); ctx.fill(); break;
        case 'brain_zap':
            ctx.fillStyle = "pink"; ctx.beginPath(); ctx.arc(0, 0, minSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
        case 'vampire_fang':
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.moveTo(-hw / 2, -hh / 2); ctx.lineTo(0, hh / 2); ctx.lineTo(hw / 2, -hh / 2); ctx.fill(); break;
        case 'rice_ball':
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(hw, hh * 0.8); ctx.lineTo(-hw, hh * 0.8); ctx.fill(); ctx.fillStyle = "black"; ctx.fillRect(-hw / 4, hh * 0.5, w / 2, h / 4); break;
        case 'clock_icon':
            ctx.strokeStyle = "white"; ctx.beginPath(); ctx.arc(0, 0, minSize, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -minSize * 0.7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(minSize * 0.5, 0); ctx.stroke(); break;
        case 'banana':
            ctx.fillStyle = "yellow"; ctx.beginPath(); ctx.arc(0, 0, minSize, 0.5, 2.5); ctx.fill(); ctx.stroke(); break;
        case 'medkit':
            ctx.fillStyle = "white"; ctx.fillRect(-hw, -hh, w, h); ctx.fillStyle = "red"; ctx.fillRect(-hw / 3, -hh * 0.7, w / 1.5, h * 0.2); ctx.fillRect(-hw * 0.1, -hh * 0.9, w * 0.2, h * 0.6); break;
        case 'ammo_box':
            ctx.fillStyle = "green"; ctx.fillRect(-hw, -hh, w, h); ctx.fillStyle = "yellow"; ctx.fillText("AMMO", -hw + 5, 0); break;
        case 'teleport_gate':
            ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2); ctx.stroke(); break;

        default:
            if (type && type.length === 1) {
                ctx.font = `bold ${Math.min(w, h)}px Arial`;
                ctx.fillStyle = "white"; ctx.shadowColor = color; ctx.shadowBlur = 5;
                ctx.fillText(type, 0, 0);
            } else {
                ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, minSize, 0, Math.PI * 2); ctx.fill();
            }
            break;
    }

    ctx.restore();
}