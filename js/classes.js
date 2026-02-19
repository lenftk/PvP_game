/* js/classes.js */

class Fighter {
    constructor(isP1, charKey) {
        const d = CHAR_DATA[charKey];
        this.isP1 = isP1;
        this.charKey = charKey;
        this.name = d.name;
        this.maxHp = d.hp;
        this.hp = d.hp;
        this.color = d.color;
        this.w = 40;
        this.h = 70;
        this.speed = d.speed;
        this.skills = d.skills;
        this.x = isP1 ? 100 : 800 - 40;
        this.y = GROUND_Y - 70;
        this.vx = 0;
        this.vy = 0;
        this.facing = isP1 ? 1 : -1;
        this.cd = { e: 0, r: 0, s: 0 };
        
        // 상태이상 목록 (bleed, globalFreeze 등 추가)
        this.status = { 
            root: 0, slow: 0, confuse: 0, brainFreeze: 0, vuln: 0, 
            def: 0, invuln: 0, dmgBuff: 0, hiddenHP: 0, reflect: 0, 
            painJump: 0, dot_ms: 0, grabbed: 0,
            bleed: 0, speedBuff: 0, globalFreeze: 0 
        };
        
        this.grabber = null;
        this.grabSpeed = 0;
        
        this.passive = d.passive || null;
        this.ehCharge = 0;
        this.isGrounded = false;
        
        // 이미지 로딩
        this.sprites = {};
        this.loaded = false;
        this.animFrame = 0;
        this.animTimer = 0;

        const types = ['idle', 'walk1', 'walk2'];
        let loadCount = 0;
        types.forEach(type => {
            const img = new Image();
            img.src = `${d.imgPath || ''}${type}.png`;
            img.onload = () => { loadCount++; if (loadCount === types.length) this.loaded = true; };
            img.onerror = () => { console.log(`이미지 로드 실패: ${type}.png`); };
            this.sprites[type] = img;
        });
    }

    update(opp, input) {
        // 상태 및 쿨타임 감소
        for (let k in this.status) if (this.status[k] > 0) this.status[k]--;
        for (let k in this.cd) if (this.cd[k] > 0) this.cd[k] -= 1 / 60;
        
        // MS DoT
        if (this.status.dot_ms > 0 && globalFrame % 30 === 0) this.hit(1, null, 0);

        // ★ DY 궁극기: 필드 전체 냉기 (1초마다 데미지)
        if (this.status.globalFreeze > 0 && globalFrame % 60 === 0) {
            opp.hit(4, null, 0);
            visuals.push({ t: "❄️", x: opp.x, y: opp.y - 40, life: 30, c: "cyan" });
        }

        // ★ DY 2스킬: 출혈 (움직이면 데미지)
        if (this.status.bleed > 0 && Math.abs(this.vx) > 0.1 && globalFrame % 15 === 0) {
            this.hit(2, null, 0);
            visuals.push({ t: "🩸", x: this.x, y: this.y - 20, life: 30, c: "red" });
        }

        // BJ 잡기 로직
        if (this.status.grabbed > 0 && this.grabber) {
            const dx = this.grabber.x - this.x;
            const dy = this.grabber.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50) {
                this.status.grabbed = 0; this.grabber = null; this.vx = 0; this.vy = 0;
            } else {
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * this.grabSpeed;
                this.y += Math.sin(angle) * this.grabSpeed;
                this.vx = 0; this.vy = 0;
                return; 
            }
        }

        // 이동 로직
        let spd = this.speed;
        if (this.status.slow > 0) spd *= 0.5;
        if (this.status.speedBuff > 0) spd *= 1.2; // DY 이속 버프

        this.vx = 0;
        let l = input.left, r = input.right;
        if (this.status.confuse > 0) [l, r] = [r, l];

        if (this.status.brainFreeze > 0) {
            input.left = false; input.right = false; input.up = false; input.down = false;
            input.e = false; input.r = false;
        }

        if (this.status.root <= 0 && this.status.brainFreeze <= 0) {
            if (l) { this.vx = -spd; this.facing = -1; }
            if (r) { this.vx = spd; this.facing = 1; }
            if (input.up && this.isGrounded) {
                this.vy = -13; this.isGrounded = false; this.y -= 1;
                playSfx('jump');
                if (this.status.painJump > 0) this.hit(5, null, 0);
            }
            if (input.down && input.up && this.isGrounded && this.y + this.h < GROUND_Y) {
                this.y += 5; this.isGrounded = false;
            }
        }

        if (input.e) this.skill('e', opp);
        if (input.r) this.skill('r', opp);
        if (input.s) this.skill('s', opp);

        this.vy += GRAVITY; this.x += this.vx; this.y += this.vy;
        
        this.isGrounded = false;
        if (this.y + this.h > GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; this.isGrounded = true; }
        if (selectedMap.platforms && this.vy >= 0) {
            selectedMap.platforms.forEach(plat => {
                if (plat.isJumpPad && this.y + this.h >= plat.y && this.y + this.h <= plat.y + 20 &&
                    this.x + this.w > plat.x && this.x < plat.x + plat.w) {
                    this.vy = -20; this.isGrounded = false; return;
                }
                if (this.y + this.h >= plat.y && this.y + this.h <= plat.y + this.vy + 15 &&
                    this.x + this.w > plat.x && this.x < plat.x + plat.w) {
                    this.y = plat.y - this.h; this.vy = 0; this.isGrounded = true;
                }
            });
        }
        if (this.x < 0) this.x = 0; if (this.x + this.w > 900) this.x = 900 - this.w;

        if (Math.abs(this.vx) > 0 && this.isGrounded) {
            this.animTimer++;
            if (this.animTimer > 10) { this.animFrame = (this.animFrame + 1) % 2; this.animTimer = 0; }
        } else { this.animFrame = 0; }
    }

    skill(key, opp) {
        if (this.cd[key] > 0) return;
        if (this.status.grabbed > 0) return;

        const s = this.skills[key];

        // NH2 S스킬: 사용 시 체력 회복 +20
        if (this.charKey === 'NH2' && key === 's') {
            const heal = 20;
            this.hp = Math.min(this.hp + heal, this.maxHp);
            visuals.push({ t: `+${heal}HP`, x: this.x, y: this.y - 40, life: 60, c: "lime" });
            try { playSfx('heal'); } catch (e) {}
        }
        
        if (s.type === 'heal' || s.type === 'hp_based_nuke') {
            if (opp.charKey === 'NH2' || opp.passive === 'nh2_passive') {
                let healAmt = (s.type === 'heal' ? s.val || 10 : (this.maxHp - this.hp) * 0.5);
                let reduction = healAmt * 1;
                opp.cd.e = Math.max(0, opp.cd.e - reduction); opp.cd.r = Math.max(0, opp.cd.r - reduction); opp.cd.s = Math.max(0, opp.cd.s - reduction);
                visuals.push({ t: `NH2 CD -${reduction.toFixed(1)}`, x: opp.x, y: opp.y - 40, life: 40, c: "lime" });
            }
        }
        
        if (s.type === 'passive_desc') return;

        this.cd[key] = s.cd;
        if (s.type !== 'gamble_cd') visuals.push({ t: s.name, x: this.x, y: this.y - 30, life: 40, c: this.color });
        playSfx('shoot');

        let dmg = s.dmg;
        if (this.status.dmgBuff > 0) dmg *= 2;
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;

        if (s.type === 'gamble_cd') {
            // ZH V2 1스킬: 도박
            setTimeout(() => visuals.push({ t: "3", x: this.x, y: this.y - 50, life: 30, c: "white" }), 0);
            setTimeout(() => visuals.push({ t: "2", x: this.x, y: this.y - 50, life: 30, c: "white" }), 500);
            setTimeout(() => visuals.push({ t: "1", x: this.x, y: this.y - 50, life: 30, c: "white" }), 1000);
            setTimeout(() => {
                if (!gameRunning) return;
                const success = Math.random() < 0.5;
                if (success) {
                    this.cd.s = Math.max(0, this.cd.s - 40);
                    visuals.push({ t: "JACKPOT! (Ult Ready)", x: this.x, y: this.y - 60, life: 60, c: "lime" });
                } else {
                    const penalty = this.maxHp * 0.30;
                    this.hit(penalty, null, 0);
                    visuals.push({ t: "FAIL... (-30% HP)", x: this.x, y: this.y - 60, life: 60, c: "red" });
                }
            }, 1500);

        } else if (s.type === 'delayed_homing') {
            // ZH V2 궁극기
            opp.hit(0, s.effect, s.time);
            visuals.push({ t: "LOCK ON!", x: this.x, y: this.y - 50, life: 120, c: "red" });
            setTimeout(() => {
                if (!gameRunning) return;
                const fireX = this.x + this.w/2; const fireY = this.y + this.h/2;
                projectiles.push(new Projectile(fireX, fireY, this.facing * 8, true, this, dmg, { visual: 'bullet' }, opp));
                visuals.push({ t: "FIRE!", x: this.x, y: this.y - 50, life: 40, c: "red" });
            }, 2000);

        } else if (s.type === 'global_burn_buff') {
            // DY 궁극기 (냉기)
            this.status.speedBuff = s.buffTime;
            this.status.globalFreeze = s.buffTime;
            visuals.push({ t: "❄️FREEZE FIELD❄️", x: this.x, y: this.y - 50, life: 60, c: "cyan" });

        } else if (s.type === 'melee' || s.type === 'field') {
            let hx = (this.facing === 1) ? cx : cx - s.w;
            if (this.charKey === 'JH' && key === 'r') {
                const distX = Math.abs(opp.x - this.x); const distY = Math.abs(opp.y - this.y);
                if (distX < s.w && distY < s.h) { hx = opp.x + (opp.w/2) - (s.w/2); }
            }
            const hy = cy - s.h / 2; 
            projectiles.push(new HitBox(hx, hy, s.w, s.h, s.time || 15, this, dmg, s, s.dot));

        } else if (s.type === 'grab_projectile') {
            const dx = opp.x - this.x; const dy = opp.y - this.y;
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * s.speed; const vy = Math.sin(angle) * s.speed;
            projectiles.push(new Projectile(cx, cy, vx, false, this, dmg, s, opp, vy));

        } else if (s.type === 'projectile') {
            if (s.selfSlow) this.status.slow = s.selfSlow;
            if (s.chanceEffect && Math.random() < s.chance) s.effect = 'vuln';
            projectiles.push(new Projectile(cx, cy, this.facing * s.speed, s.homing, this, dmg, s, opp));

        } else if (s.type === 'multi_shot') {
            let count = 0;
            const interval = setInterval(() => {
                if (!gameRunning || count >= s.count) { clearInterval(interval); return; }
                let info = { ...s, effect: (count === 0 ? s.firstEffect : null), time: (count === 0 ? s.firstTime : 0), visual: JH_LETTERS[count] };
                projectiles.push(new Projectile(this.x + this.w / 2, this.y + this.h / 2, this.facing * 9, true, this, (count===0?0:s.dmg), info, opp));
                count++;
            }, s.interval * 1000 / 60);

        } else if (s.type === 'double_hit') {
            projectiles.push(new HitBox(this.facing === 1 ? cx : cx - 90, cy - 15, 90, 30, 10, this, s.dmg, { visual: s.visual }, false));
            setTimeout(() => { if (gameRunning) projectiles.push(new HitBox(this.facing === 1 ? cx : cx - 90, cy - 15, 90, 30, 10, this, s.secDmg, { visual: 'ruler' }, false)); }, 300);

        } else if (s.type === 'buff_atk') {
            if (s.buff.includes('defense')) this.status.def = s.time;
            projectiles.push(new HitBox(cx - 125, cy - 20, 250, 40, 15, this, dmg, s, false));

        } else if (s.type === 'instant' || s.type === 'debuff' || s.type === 'pull' || s.type === 'complex_cc' || s.type === 'delayed_debuff') {
            if (s.type === 'pull') opp.x = this.x + (this.facing * 60);
            if (s.type === 'delayed_debuff') {
                opp.hit(0, s.effect, s.time); visuals.push({ t: "어지럽쥬!", x: opp.x, y: opp.y - 40, life: 60, c: "orange" });
                setTimeout(() => { if (gameRunning) { opp.hit(dmg, null, 0); visuals.push({ t: "안경 깨짐!", x: opp.x, y: opp.y - 60, life: 40, c: "white" }); } }, s.damageDelay * 1000 / 60);
            } else if (s.type === 'complex_cc') {
                opp.hit(dmg, 'root', 180);
                setTimeout(() => { if (gameRunning) { opp.hit(0, 'slow', 360); opp.hit(0, 'vuln', 360); visuals.push({ t: "OVERLOAD!", x: opp.x, y: opp.y - 40, life: 60, c: "purple" }); } }, 3000);
            } else { opp.hit(dmg, s.effect, s.time); }
            if (s.type !== 'delayed_debuff') spawnHitEffect(opp.x + 20, opp.y + 30, this.color);

        } else if (s.type === 'buff') {
            if (s.buff === 'double_dmg') this.status.dmgBuff = s.time;
        } else if (s.type === 'release_charge') {
            let discharge = this.ehCharge; this.ehCharge = 0;
            visuals.push({ t: `Release ${Math.floor(discharge)}!`, x: this.x, y: this.y - 50, life: 60, c: "magenta" });
            projectiles.push(new HitBox(this.facing === 1 ? cx : cx - 60, cy - 20, 60, 40, 15, this, discharge, s, false));
        } else if (s.type === 'game_mode') {
            this.status.invuln = s.time; this.status.root = s.time;
        } else if (s.type === 'hp_based_nuke') {
            let missing = this.maxHp - this.hp; let amount = missing * 0.5;
            this.hp += amount; opp.hit(missing * 0.3, null, 0);
            visuals.push({ t: `Heal & Dmg ${Math.floor(amount)}`, x: this.x, y: this.y - 50, life: 60, c: "blue" });
        } else if (s.type === 'global_cc') {
            opp.hit(0, s.effect, s.time);
        }
    }

    hit(dmg, eff, time) {
        if (this.status.invuln > 0) return;
        
        if (this.passive === 'teleport_heal' && dmg > 0) {
            if (Math.random() < 0.2) {
                this.x = Math.random() * 800 + 50; this.hp = Math.min(this.hp + 20, this.maxHp);
                if (this.status.grabbed > 0) { this.status.grabbed = 0; this.grabber = null; visuals.push({ t: "탈출!", x: this.x, y: this.y - 60, life: 60, c: "lime" }); }
                visuals.push({ t: "피했죠? +20HP", x: this.x, y: this.y - 40, life: 60, c: "lime" }); return;
            }
        }
        
        if ((this.charKey === 'NH2' || this.passive === 'nh2_passive') && dmg > 0) {
            let reduction = dmg * 0.5;
            this.cd.e = Math.max(0, this.cd.e - reduction); this.cd.r = Math.max(0, this.cd.r - reduction); this.cd.s = Math.max(0, this.cd.s - reduction);
            visuals.push({ t: `CD -${reduction.toFixed(1)}`, x: this.x, y: this.y - 40, life: 30, c: "lime" });
        }
        if (this.status.vuln > 0) { dmg *= 1.5; visuals.push({ t: "CRITICAL!", x: this.x, y: this.y - 60, life: 40, c: "red" }); }
        if (this.status.def > 0) dmg *= 0.5;

        if (dmg > 0) { playSfx('hit'); screenShake = Math.min(20, dmg * 1.5); spawnHitEffect(this.x + 20, this.y + 30, "white"); }
        this.hp -= dmg;
        if (this.charKey === 'EH') this.ehCharge += dmg * 1.5;
        visuals.push({ t: `-${Math.ceil(dmg)}`, x: this.x + Math.random() * 20, y: this.y, life: 60, c: "red" });
        
        if (eff) {
            if (typeof this.status[eff] !== 'undefined') this.status[eff] = time;
            if (eff.includes('slow')) visuals.push({ t: "SLOW!", x: this.x, y: this.y - 50, life: 60, c: "cyan" });
            if (eff.includes('vuln')) visuals.push({ t: "취약!", x: this.x, y: this.y - 60, life: 60, c: "purple" });
            if (eff.includes('bleed')) visuals.push({ t: "출혈!", x: this.x, y: this.y - 60, life: 60, c: "crimson" });
        }
    }

    draw(ctx) {
        if (this.status) drawStatusAura(ctx, this.x, this.y, this.w, this.h, this.status);

        if (this.status.invuln > 0 && Date.now() % 200 < 100) {
            ctx.fillStyle = "white"; ctx.fillRect(this.x, this.y, this.w, this.h);
        } else {
            if (this.loaded) {
                let img = this.sprites.idle; 
                if (!this.isGrounded) { img = this.sprites.walk1; } 
                else if (Math.abs(this.vx) > 0.5) { img = (this.animFrame === 0 ? this.sprites.walk1 : this.sprites.walk2); }
                
                if (img) {
                    const scale = (this.h / img.height) * 1.3; 
                    const drawWidth = img.width * scale;
                    const drawHeight = img.height * scale;
                    const offsetX = (this.w - drawWidth) / 2;
                    const offsetY = (this.h - drawHeight); 
                    ctx.save();
                    if (this.facing === -1) {
                        ctx.translate(this.x + this.w, this.y); ctx.scale(-1, 1);
                        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                    } else {
                        ctx.translate(this.x, this.y);
                        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                    }
                    ctx.restore();
                } else { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.w, this.h); }
            } else {
                ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.fillStyle = "white"; ctx.fillRect(this.facing === 1 ? this.x + 25 : this.x + 5, this.y + 10, 10, 10);
            }
        }
        if (this.status.brainFreeze > 0) { ctx.fillStyle = "#e74c3c"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center"; ctx.fillText("⚡뇌정지⚡", this.x + this.w / 2, this.y - 15); }
        if (this.status.confuse > 0) { ctx.fillStyle = "yellow"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center"; ctx.fillText("😵", this.x + this.w / 2, this.y - 35); }
    }
}

class HitBox {
    constructor(x, y, w, h, duration, owner, dmg, info, isDot) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.owner = owner; this.dmg = dmg; this.info = info; this.hit = false; this.isDot = isDot; this.tick = 0; this.facing = owner.facing; this.color = owner.color; this.visualLife = duration; this.activeTime = duration; if (!isDot) { this.visualLife = 12; this.activeTime = 8; } this.age = 0;
    }
    update(opp) {
        this.age++; if (this.age >= this.visualLife) return false;
        if (this.age <= this.activeTime) {
            if (this.x < opp.x + opp.w && this.x + this.w > opp.x && this.y < opp.y + opp.h && this.y + this.h > opp.y) {
                if (this.isDot) { if (this.tick % 30 === 0) { opp.hit(this.dmg, this.info.effect, this.info.time || 30); } this.tick++; }
                else if (!this.hit) { opp.hit(this.dmg, this.info.effect, this.info.time); if (this.info.knockback) { opp.vx += this.facing * this.info.knockback; opp.x += this.facing * 10; } this.hit = true; }
            }
        }
        return true;
    }
    draw() { ctx.globalAlpha = Math.max(0, 1 - (this.age / this.visualLife)); drawVisual(ctx, this.info.visual, this.x, this.y, this.w, this.h, this.facing, this.color, false); ctx.globalAlpha = 1.0; }
}

class Projectile {
    constructor(x, y, vx, homing, owner, dmg, info, target, vy = 0) {
        this.x = x; this.y = y; this.vx = vx; this.homing = homing; this.owner = owner; this.target = target; this.dmg = dmg; this.info = info; this.active = true; this.life = 120; this.trail = []; this.facing = owner.facing; this.color = owner.color; this.vy = vy;
    }
    update(opp) {
        if (!this.active) return;
        this.life--; if (this.life <= 0) this.active = false;
        
        // 궤적 생성
        this.trail.push({ x: this.x, y: this.y }); 
        if (this.trail.length > 10) this.trail.shift();
        
        // ★ [수정] 유도탄 로직 강화
        if (this.homing && this.target) {
            // 1. JH(패드립) 스킬: 기존처럼 약한 유도 유지 (글자 꺾임 효과)
            if (this.info.visual && JH_LETTERS.includes(this.info.visual)) { 
                let dx = this.target.x - this.x; 
                let dy = (this.target.y + 30) - this.y; 
                this.vx += (dx > 0 ? 0.2 : -0.2); 
                this.vy += (dy > 0 ? 0.2 : -0.2); 
                // 속도 제한
                this.vx = Math.min(Math.max(this.vx, -12), 12);
            } 
            // 2. ZH V2 (총알/유도탄) 등 강력한 유도탄
            else { 
                const dx = (this.target.x + this.target.w / 2) - this.x;
                const dy = (this.target.y + this.target.h / 2) - this.y;
                const angle = Math.atan2(dy, dx);
                
                // 유도 성능: 꺾이는 속도 조절 (0.1: 느림 ~ 1.0: 즉시)
                // 여기서는 매우 강력하게 따라가도록 설정
                const speed = 7.2; // 탄속
                
                // 현재 벡터를 목표 각도로 부드럽게(혹은 급격하게) 변경
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
            }
        }
        
        this.x += this.vx; this.y += (this.vy || 0);

        if (this.x < opp.x + opp.w && this.x + 20 > opp.x && this.y < opp.y + opp.h && this.y + 20 > opp.y) { 
            opp.hit(this.dmg, this.info.effect, this.info.time); 
            if (this.info.effect === 'pull_to_owner') {
                opp.status.grabbed = 120; opp.grabber = this.owner;
                opp.grabSpeed = this.info.speed;
                opp.hit(dmg, 'root', 120);
                visuals.push({ t: "으딜 나대!", x: opp.x, y: opp.y - 50, life: 60, c: "yellow" });
            }
            this.active = false; 
        }
    }
    draw() { ctx.beginPath(); ctx.strokeStyle = this.color; ctx.lineWidth = 5; this.trail.forEach((p, i) => { ctx.lineWidth = i / 2; ctx.lineTo(p.x, p.y); }); ctx.stroke(); drawVisual(ctx, this.info.visual, this.x, this.y, 20, 20, this.facing, this.color, true); }
}