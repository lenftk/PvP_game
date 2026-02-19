const GRAVITY = 0.6;
const GROUND_Y = 500;
const FPS = 60;
const SELECT_TIME = 15;

const DEFAULT_KEYS = { left: 'KeyA', right: 'KeyD', up: 'KeyW', e: 'KeyF', r: 'KeyG', s: 'KeyH' };
const KEYS_P2 = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', e: 'Numpad1', r: 'Numpad2', s: 'Numpad3' };
const JH_LETTERS = ['ㅍ', 'ㅐ', 'ㄷ', 'ㅡ', 'ㄹ', 'ㅣ', 'ㅂ'];

// imgPath: "assets/characters/폴더명/" 으로 지정해야 합니다.
/* js/constants.js 내 CHAR_DATA 부분 수정 */

const CHAR_DATA = {
    "ZM": {
        name: "캐릭ZM", hp: 240, color: "#3498db", speed: 5, imgPath: "assets/characters/ZM/",
        skills: {
            e: { name: "쫑발진", desc: "전방으로 돌진하며 적을 타격하고 느리게 만듭니다.", dmg: 10, cd: 0.5, type: 'melee', w: 80, h: 60, visual: 'fist', effect: 'slow', time: 60 },
            r: { name: "묻지마폭력", desc: "전방에 강력한 주먹을 날립니다.", dmg: 15, cd: 0.8, type: 'melee', w: 100, h: 80, visual: 'big_fist' },
            s: { name: "신발끈", desc: "유도 성능이 있는 신발끈을 던져 적을 묶습니다.", dmg: 0, cd: 24, type: 'projectile', speed: 10, homing: true, effect: 'root', time: 210, visual: 'shoelace' }
        }
    },
    "ZH": {
        name: "캐릭ZH", hp: 180, color: "#e74c3c", speed: 6, imgPath: "assets/characters/ZH/",
        skills: {
            e: { name: "냥펀치", desc: "빠르게 앞을 할큅니다.", dmg: 9, cd: 0.4, type: 'melee', w: 60, h: 40, visual: 'cat_paw' },
            r: { name: "샷건", desc: "전방 부채꼴 범위에 강력한 피해를 줍니다.", dmg: 13, cd: 0.6, type: 'melee', w: 90, h: 90, visual: 'shotgun_blast' },
            s: { name: "빼빼로", desc: "자신과 전방의 방어력을 높이는 버프를 겁니다.", dmg: 30, cd: 27, type: 'buff_atk', w: 250, h: 40, buff: 'defense_50', time: 120, visual: 'pocky' }
        }
    },
    "JH": {
        name: "캐릭JH", hp: 190, color: "#9b59b6", speed: 5, imgPath: "assets/characters/JH/",
        skills: {
            e: { name: "급발진", desc: "자동차를 타고 돌진하여 적을 밀쳐냅니다.", dmg: 18, cd: 0.5, type: 'melee', w: 80, h: 50, knockback: 30, visual: 'car' },
            r: { name: "에어컨", desc: "전방 넓은 범위에 찬바람을 일으켜 지속 피해와 슬로우를 줍니다.", dmg: 4, cd: 5, type: 'melee', w: 350, h: 100, effect: 'slow', time: 60, visual: 'ac_wind', dot: true },
            s: { name: "패드립", desc: "7개의 글자 투사체를 연사합니다. 첫 타격은 적을 묶습니다.", dmg: 5, cd: 22, type: 'multi_shot', count: 7, interval: 10, firstEffect: 'root', firstTime: 120, visual: 'korean_chars' }
        }
    },
    "BJ": {
        name: "캐릭BJ", hp: 190, color: "#f39c12", speed: 5, imgPath: "assets/characters/BJ/",
        skills: {
            e: { name: "등짝스매싱", desc: "전방을 강력하게 내려칩니다.", dmg: 18, cd: 0.5, type: 'melee', w: 80, h: 80, visual: 'palm' },
            r: { name: "안경씌우기", desc: "적에게 안경을 씌워 혼란(방향키 반대)을 주고 잠시 후 피해를 줍니다.", dmg: 24, cd: 15, type: 'delayed_debuff', effect: 'confuse', time: 120, damageDelay: 120, visual: 'glasses' },
            s: { name: "머리잡기", desc: "손을 뻗어 적중한 적을 내 위치로 강제로 끌고 옵니다.", dmg: 35, cd: 27, type: 'grab_projectile', speed: 15, range: 600, effect: 'pull_to_owner', time: 240, visual: 'hand_grab' }
        }
    },
    "AS": {
        name: "캐릭AS", hp: 200, color: "#2ecc71", speed: 5, imgPath: "assets/characters/AS/",
        skills: {
            e: { name: "자공격", desc: "자를 휘둘러 두 번 연속 공격합니다.", dmg: 10, cd: 0.7, type: 'double_hit', secDmg: 5, visual: 'ruler' },
            r: { name: "라켓그립", desc: "셔틀콕을 날립니다. 확률적으로 적을 취약 상태로 만듭니다.", dmg: 2, cd: 5, type: 'projectile', speed: 12, chanceEffect: 'vuln', chance: 0.3, time: 180, visual: 'shuttlecock' },
            s: { name: "아바바리맨", desc: "적을 뇌정지 상태(이동/공격 불가)로 만듭니다.", dmg: 0, cd: 20, type: 'global_cc', effect: 'brainFreeze', time: 180, visual: 'flash_coat' }
        }
    },
    "MS": {
        name: "캐릭MS", hp: 186, color: "#34495e", speed: 5.5, imgPath: "assets/characters/MS/",
        skills: {
            e: { name: "시험점수", desc: "즉시 적에게 정신적 피해를 줍니다.", dmg: 5, cd: 0.5, type: 'instant', visual: 'score_f' },
            r: { name: "넥슬라이스", desc: "빠르고 강력한 근접 공격을 합니다.", dmg: 14, cd: 0.4, type: 'melee', w: 70, h: 40, visual: 'hand_chop' },
            s: { name: "슈퍼스매싱", desc: "거대한 손바닥으로 내려쳐 지속 피해를 입힙니다.", dmg: 32, cd: 24, type: 'melee', w: 140, h: 120, effect: 'dot_ms', time: 240, visual: 'huge_hand' }
        }
    },
    "NH": {
        name: "캐릭NH", hp: 190, color: "#16a085", speed: 5, imgPath: "assets/characters/NH/",
        passive: 'teleport_heal',
        passiveDesc: "피격 시 20% 확률로 회복(+20HP) 및 순간이동",
        skills: {
            e: { name: "도망(패시브)", desc: "패시브 효과를 설명합니다.", dmg: 0, cd: 0, type: 'passive_desc' },
            r: { name: "라켓때리기", desc: "라켓을 휘둘러 적을 공격합니다.", dmg: 15, cd: 0.7, type: 'melee', w: 80, h: 70, visual: 'racket' },
            s: { name: "잘난척", desc: "자신에게 데미지 2배 버프를 겁니다.", dmg: 0, cd: 23, type: 'buff', buff: 'double_dmg', time: 180, visual: 'crown' }
        }
    },
    "SH": {
        name: "캐릭SH", hp: 230, color: "#d35400", speed: 4.5, imgPath: "assets/characters/SH/",
        skills: {
            e: { name: "만화책", desc: "만화책으로 적을 때립니다.", dmg: 10, cd: 0.6, type: 'melee', w: 60, h: 60, visual: 'comic_book' },
            r: { name: "펀치", desc: "주먹을 날려 적을 잠시 묶습니다.", dmg: 10, cd: 0.6, type: 'melee', w: 60, h: 60, effect: 'root', time: 30, visual: 'fist' },
            s: { name: "스파르타", desc: "강력한 발차기로 큰 피해를 줍니다.", dmg: 35, cd: 25, type: 'melee', w: 120, h: 120, visual: 'sparta_boot' }
        }
    },
    "EH": {
        name: "캐릭EH", hp: 170, color: "#8e44ad", speed: 6, imgPath: "assets/characters/EH/",
        passiveDesc: "받은 피해량의 1.5배를 충전하여 E스킬로 반격",
        skills: {
            e: { name: "배찌르기", desc: "충전된 피해량을 방출하여 공격합니다.", dmg: 0, cd: 0.8, type: 'release_charge', visual: 'knife_stab' },
            r: { name: "축구소년", desc: "축구공을 발사합니다.", dmg: 10, cd: 0.4, type: 'projectile', speed: 13, visual: 'soccer_ball' },
            s: { name: "게임충", desc: "일정 시간 동안 무적 및 고정 상태가 됩니다.", dmg: 0, cd: 25, type: 'game_mode', time: 240, visual: 'game_shield' }
        }
    },
    "HS": {
        name: "캐릭HS", hp: 200, color: "#7f8c8d", speed: 5, imgPath: "assets/characters/HS/",
        skills: {
            e: { name: "주먹공격", desc: "기본적인 주먹 공격을 합니다.", dmg: 12, cd: 0.3, type: 'melee', w: 50, h: 50, visual: 'fist' },
            r: { name: "깔아뭉게기", desc: "눈앞에 무거운 물체를 떨어뜨려 적을 느리게 합니다.", dmg: 20, cd: 5, type: 'melee', w: 100, h: 80, effect: 'slow', time: 40, visual: 'anvil', dot: false },
            s: { name: "갈비뼈", desc: "적에게 저주를 걸어 점프 시 피해를 입게 합니다.", dmg: 20, cd: 30, type: 'debuff', effect: 'painJump', time: 240, visual: 'bone_crack' }
        }
    },
    "SCT": {
        name: "캐릭SCT", hp: 200, color: "#27ae60", speed: 5, imgPath: "assets/characters/SCT/",
        skills: {
            e: { name: "물리공격", desc: "평범한 물리 공격입니다.", dmg: 15, cd: 0.3, type: 'melee', w: 50, h: 50, visual: 'fist' },
            r: { name: "자연공격", desc: "나뭇잎으로 때립니다.", dmg: 15, cd: 0.4, type: 'melee', w: 70, h: 70, visual: 'leaf_slap' },
            s: { name: "지식공격", desc: "적을 속박한 뒤, 잠시 후 취약 상태로 만듭니다.", dmg: 10, cd: 25, type: 'complex_cc', time: 180, visual: 'brain_zap' }
        }
    },
    "ZM2": {
        name: "ZM Ver.2", hp: 180, color: "#2980b9", speed: 6, imgPath: "assets/characters/ZM2/",
        skills: {
            e: { name: "슈퍼쫑발진", desc: "더 강력한 주먹을 날립니다.", dmg: 25, cd: 1, type: 'melee', w: 90, h: 70, visual: 'blue_fist' },
            r: { name: "동심파괴", desc: "적을 오랫동안 취약 상태(피해 증가)로 만듭니다.", dmg: 0, cd: 20, type: 'debuff', effect: 'vuln', time: 600, visual: 'heart_break' },
            s: { name: "별명부르기", desc: "자신의 잃은 체력에 비례해 회복하고 적에게 피해를 줍니다.", dmg: 0, cd: 28, type: 'hp_based_nuke', visual: 'vampire_fang' }
        }
    },
    "NH2": {
        name: "NH Ver.2", hp: 190, color: "#1abc9c", speed: 5, imgPath: "assets/characters/NH2/",
        passive: 'nh2_passive',
        passiveDesc: "피격 시 모든 스킬 쿨타임 감소 (회복 시에도 발동)",
        skills: {
            e: { name: "패시브", desc: "패시브 효과를 설명합니다.", dmg: 0, cd: 0, type: 'passive_desc' },
            r: { name: "훈발놈", desc: "주먹밥을 먹여 공격합니다.", dmg: 10, cd: 0.5, type: 'melee', w: 60, h: 60, visual: 'rice_ball' },
            s: { name: "자신감", desc: "자신감 텍스트를 날려 공격합니다.", dmg: 23, cd: 23, type: 'projectile', speed: 16, visual: 'text_conf' }
        }
    },
    "ZH2": {
        name: "ZH Ver.2", hp: 200, color: "#8e44ad", speed: 5, imgPath: "assets/characters/ZH2/",
        skills: {
            e: { name: "3, 2, 1!", desc: "50% 확률로 궁극기 쿨타임을 줄이거나, 실패 시 체력을 잃습니다.", dmg: 0, cd: 10, type: 'gamble_cd', visual: 'countdown' },
            r: { name: "덤벨던지기", desc: "자신이 느려지며 무거운 덤벨을 던집니다.", dmg: 20, cd: 3, type: 'projectile', speed: 10, selfSlow: 120, visual: 'dumbbell' },
            s: { name: "쏠수있어!", desc: "적을 당황시킨 후 2초 뒤 강력한 유도탄을 발사합니다.", dmg: 50, cd: 40, type: 'delayed_homing', delay: 120, effect: 'confuse', time: 120, visual: 'gun_aim' }
        }
    },
    "DY": {
        name: "캐릭DY", hp: 200, color: "#2c3e50", speed: 5, imgPath: "assets/characters/DY/",
        skills: {
            e: { name: "마비킥", desc: "발차기로 적을 0.5초간 뇌정지시킵니다.", dmg: 15, cd: 1, type: 'melee', w: 60, h: 50, effect: 'brainFreeze', time: 30, visual: 'kick_effect' },
            r: { name: "용사소환", desc: "검을 던집니다. 적중 시 적이 움직이면 피해를 입는 출혈을 겁니다.", dmg: 20, cd: 4, type: 'projectile', speed: 12, effect: 'bleed', time: 120, visual: 'sword' },
            s: { name: "추위안타!", desc: "이동속도가 빨라지고 필드 전체 적에게 지속적인 냉기 피해를 줍니다.", dmg: 0, cd: 42, type: 'global_burn_buff', buffTime: 720, dotDmg: 4, visual: 'fire_aura' }
        }
    },
};

const MAP_DATA = [
    { name: "도장", bgStart: "#2c3e50", bgEnd: "#000000", ground: "#555", platforms: [], type: 'normal' },
    { name: "해변", bgStart: "#ff7e5f", bgEnd: "#feb47b", ground: "#e67e22", platforms: [{ x: 150, y: 350, w: 150, h: 20, c: "#d35400" }, { x: 600, y: 350, w: 150, h: 20, c: "#d35400" }, { x: 375, y: 200, w: 150, h: 20, c: "#d35400" }], type: 'normal' },
    { name: "사이버", bgStart: "#2b003e", bgEnd: "#000000", ground: "#8e44ad", platforms: [{ x: 100, y: 380, w: 120, h: 15, c: "cyan" }, { x: 680, y: 380, w: 120, h: 15, c: "cyan" }, { x: 300, y: 250, w: 300, h: 15, c: "magenta" }], type: 'cyber' },
    { name: "하늘", bgStart: "#2980b9", bgEnd: "#6dd5fa", ground: "#27ae60", platforms: [{ x: 150, y: 400, w: 150, h: 20, c: "rgba(255,255,255,0.8)", move: { type: 'random', speed: 1, vx: 1, vy: 0.5 } }, { x: 550, y: 400, w: 150, h: 20, c: "rgba(255,255,255,0.8)", move: { type: 'random', speed: 1.5, vx: -1, vy: -0.5 } }, { x: 350, y: 250, w: 150, h: 20, c: "rgba(255,255,255,0.8)", move: { type: 'random', speed: 0.8, vx: 0.5, vy: 0.2 } }], type: 'sky' },
    { name: "화산", bgStart: "#500000", bgEnd: "#200000", ground: "#c0392b", platforms: [{ x: 50, y: 350, w: 100, h: 20, c: "#333" }, { x: 400, y: 450, w: 100, h: 20, c: "red", isJumpPad: true }, { x: 750, y: 350, w: 100, h: 20, c: "#333" }], type: 'volcano' },
    { name: "정글", bgStart: "#004d00", bgEnd: "#002200", ground: "#006400", platforms: [{ x: 100, y: 450, w: 150, h: 20, c: "#4e3629" }, { x: 650, y: 450, w: 150, h: 20, c: "#4e3629" }, { x: 350, y: 320, w: 200, h: 20, c: "#2e8b57" }], type: 'jungle' },
    { name: "군사기지", bgStart: "#2c3e50", bgEnd: "#34495e", ground: "#7f8c8d", platforms: [{ x: 50, y: 400, w: 200, h: 30, c: "#27ae60" }, { x: 650, y: 400, w: 200, h: 30, c: "#27ae60" }, { x: 350, y: 250, w: 200, h: 20, c: "#95a5a6" }], type: 'military' }
];