/* PixelAI：世界、物理与角色自主行为（无 DOM，浏览器和 Node 都能用）
 * 分三层：
 *   1) 意图层 goal   —— 由性格 traits 决定：发呆 / 闲逛 / 看东西 / 找人聊天 / 躲开 / 蹲下
 *   2) 操控层 want   —— 意图层每帧输出：{dir, run, jump, jump2, crouch}，玩家接管时由键盘写入同一份 want
 *   3) 运动层 loc    —— 物理 + 状态：idle walk run skid pre air flip land crouch
 * framePose(a) 把状态翻译成骨架姿势，交给 PixelRig 绘制。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rig.js'), require('./cast.js'));
  else root.PixelAI = factory(root.PixelRig, root.PixelCast);
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (Rig, Cast) {
  'use strict';
  const WW = 1200, BASE = 150, STEP = 4, G = 520, JV = 175, DJV = 140;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- 地形：一条横向地面，带台阶、浅沟、宽沟、矮墙 ---------- */
  function buildTerrain() {
    const H = new Array(WW).fill(BASE);
    const set = (x0, x1, y) => { for (let x = x0; x < x1; x++) H[x] = y; };
    set(0, 10, BASE - 70); set(WW - 10, WW, BASE - 70);        // 世界边界墙
    set(150, 166, BASE + 10);                                  // 窄沟 16px：走着跳就能过
    set(400, 410, BASE - 4); set(410, 420, BASE - 8); set(420, 470, BASE - 12); // 台阶 + 平台
    set(470, 480, BASE - 8); set(480, 490, BASE - 4);
    set(640, 674, BASE + 12);                                  // 宽沟 34px：要助跑，必要时二段跳
    set(820, 836, BASE + 10);                                  // 窄沟
    set(960, 974, BASE - 20);                                  // 矮墙 20px：要跳
    const pois = [
      { type: 'lamp', x: 250, sx: 238 }, { type: 'bench', x: 445, sx: 445 }, { type: 'crate', x: 770, sx: 756 },
      { type: 'ruin', x: 1010, sx: 996 }, { type: 'lamp', x: 1090, sx: 1076 }, { type: 'crate', x: 92, sx: 106 }
    ];
    return { H, pois };
  }

  /* ---------- 创建世界 ---------- */
  function createDummy(w, id, x) {
    const rx = clamp(Math.round(x), 24, WW - 24);
    return {
      id,
      name: id === 'dummy1' ? '试剑木桩·甲' : '试剑木桩·乙',
      x: rx,
      y: w.H[rx],
      hp: 300,
      maxHp: 300,
      hitT: 0,
      flashT: 0,
      tilt: 0,
      shakeDir: 1,
      comboHits: 0,
      comboTimer: 0,
      lastDmg: 0,
      totalDmg: 0,
      totalHits: 0,
    };
  }

  function createWorld(seed, opts) {
    opts = opts || {};
    const ter = buildTerrain(), rng = mulberry32(seed || 1);
    const w = { WW, BASE, H: ter.H, pois: ter.pois, dummies: [], katanaBursts: [], rng, t: 0, agents: [], input: { dir: 0, run: false, crouch: false, jumpEdge: false, interactEdge: false, blinkEdge: false, attackHold: false }, lineup: false, log: [], fx: [] };
    const starts = opts.starts || [220, 345, 520, 760, 1000, 126];
    Cast.CAST.forEach((spec, i) => {
      const T = spec.traits, a = {
        id: spec.id, spec, poser: Rig.poser(spec), tr: T,
        x: starts[i % starts.length], y: BASE, vx: 0, vy: 0, face: i === 5 ? 1 : (i % 2 ? -1 : 1), grounded: true, loc: 'idle',
        want: { dir: 0, run: false, jump: false, jump2: false, crouch: false, sprint: false, sneak: false, blink: false },
        ab: spec.abilities || {}, suit: false, weapon: null, aim: 90, wAction: 'aim', wT: 0, wDur: 0, ammo: 6, maxAmmo: 6, aimMouse: false,
        comboStep: 0, comboResetT: 0, comboQueued: false, skillFired: false, swingHitDone: false, hitstopT: 0, combatHoldT: 0, hurtT: 0,
        walkV: 30 + 14 * T.en, runV: 70 + 34 * T.en, sprintV: 112, cwalkV: 15, airV: 0, blT: 0, blDir: 1, blCd: 0, blinkMin: 10, blinkMax: 28, gapPick: null, t: rng() * 10, phase: 0,
        preT: 0, landT: 0, landDur: 0.1, skidT: 0, flipT: -1, canDouble: false, jumpDest: null,
        goal: { type: 'idle', t: 0.5 + rng() * 2 }, cd: 3 + rng() * 6, fleeCd: 0, senseT: rng(), talk: false, say: null, manual: false,
        stats: { time: { idle: 0, walk: 0, run: 0, sprint: 0, cwalk: 0, skid: 0, pre: 0, air: 0, flip: 0, land: 0, crouch: 0, blinkPre: 0, blinkPost: 0 }, blinks: 0, shots: 0, reloads: 0, combos: 0, skills: 0, dummyHits: 0, goals: {}, jumps: 0, doubles: 0, chats: 0, refused: 0, flees: 0, blocked: 0, falls: 0 }
      };
      a.y = w.H[Math.round(a.x)];
      w.agents.push(a);
    });
    // 默认在 #6 星 (x=126, 朝右) 身前 x=144 处与场地中段 x=546 处各布置一座木桩，方便直接测试三段连招与剑气打击感
    w.dummies.push(createDummy(w, 'dummy1', 144));
    w.dummies.push(createDummy(w, 'dummy2', 546));

    w.hitDummy = (d, dir, dmg, heavy, attacker) => {
      if (!d) return false;
      const hitDir = dir || 1;
      d.hitT = heavy ? 0.32 : 0.24;
      d.flashT = heavy ? 0.09 : 0.06;
      d.shakeDir = hitDir;
      d.tilt = hitDir * (heavy ? 3 : 2);
      d.comboHits = d.comboTimer > 0 ? d.comboHits + 1 : 1;
      d.comboTimer = 1.8;
      d.lastDmg = dmg;
      d.totalDmg += dmg;
      d.totalHits++;
      d.hp -= dmg;
      let broken = false;
      if (d.hp <= 0) {
        broken = true;
        d.hp = d.maxHp;
      }
      if (attacker) {
        attacker.hitstopT = heavy ? 0.065 : 0.042;
        attacker.stats.dummyHits = (attacker.stats.dummyHits || 0) + 1;
      }
      w.fx.push({
        type: 'dummyHit',
        dummyId: d.id,
        x: d.x,
        y: d.y - 16,
        dir: hitDir,
        dmg,
        combo: d.comboHits,
        heavy: !!heavy,
        broken,
      });
      return true;
    };

    w.summonDummyNear = a => {
      if (!a || !w.dummies.length) return null;
      const d = w.dummies[0];
      const face = a.face || 1;
      let tx = clamp(Math.round(a.x + face * 20), 24, WW - 24);
      // 避开深沟，确保木桩立在平整地面
      let tries = 0;
      while (Math.abs(w.H[tx] - a.y) > STEP && tries++ < 30) {
        tx = clamp(tx + face * 2, 24, WW - 24);
      }
      d.x = tx;
      d.y = w.H[tx];
      d.hp = d.maxHp;
      d.hitT = 0.16;
      d.flashT = 0.05;
      d.tilt = 0;
      d.comboHits = 0;
      d.comboTimer = 0;
      w.fx.push({ type: 'puff', x: d.x, y: d.y });
      return d;
    };

    w.step = dt => step(w, dt);
    w.interact = a => interact(w, a);
    w.setLineup = on => setLineup(w, on);
    w.toggleSuit = (a, on) => { a.suit = on == null ? !a.suit : !!on; a.flipT = -1; return a.suit; };
    w.applyAgentSpec = (idx, spec) => {
      const a = w.agents[idx];
      if (!a || !spec) return null;
      a.id = spec.id;
      a.spec = spec;
      a.poser = Rig.poser(spec);
      a.tr = spec.traits || a.tr;
      a.ab = spec.abilities || { sprint: true, blink: true, sneak: true };
      w.fx.push({ type: 'puff', x: a.x, y: a.y });
      return a;
    };
    w.applyBatchSpecs = specs => {
      if (!Array.isArray(specs)) return;
      w.agents.forEach((a, i) => {
        const s = specs[i % specs.length];
        if (s) w.applyAgentSpec(i, s);
      });
    };
    w.hurtAgent = (a, dur) => {
      if (!a) return false;
      a.hurtT = dur != null ? dur : 0.75;
      w.fx.push({ type: 'puff', x: a.x, y: a.y - 12 });
      return a.hurtT;
    };
    w.setWeapon = (a, id) => {
      a.weapon = (!id || id === 'none') ? null : id;
      a.wAction = 'aim'; a.wT = 0; a.wDur = 0; a.ammo = a.maxAmmo;
      a.comboStep = 0; a.comboResetT = 0; a.comboQueued = false; a.skillFired = false; a.swingHitDone = false; a.hitstopT = 0; a.combatHoldT = 0;
      a.aimMouse = !!a.weapon;
      return a.weapon;
    };
    w.cycleWeapon = a => {
      const order = [null, 'blade', 'katana', 'greatsword', 'pistol'];
      const next = order[(order.indexOf(a.weapon) + 1) % order.length];
      return w.setWeapon(a, next);
    };
    w.aimAt = (a, wx, wy) => {
      if (!a) return;
      const dx = wx - a.x, dy = wy - (a.y - 16);
      if (a.weapon && a.loc !== 'skid' && a.loc !== 'blinkPre' && a.loc !== 'blinkPost') {
        if (Math.abs(dx) > 0.5) a.face = dx >= 0 ? 1 : -1;
      }
      const lx = dx * (a.face || 1), ly = dy;
      a.aim = (Math.abs(lx) < 0.01 && Math.abs(ly) < 0.01) ? 90 : Math.atan2(lx, ly) * 180 / Math.PI;
      a.aimMouse = true;
    };
    w.reload = a => {
      if (!a || !a.weapon || a.weapon !== 'pistol' || a.wAction === 'reload') return false;
      a.wAction = 'reload'; a.wT = 0; a.wDur = 0.68; a.combatHoldT = 0.42; a.stats.reloads = (a.stats.reloads || 0) + 1;
      w.fx.push({ type: 'reload', id: a.id, x: a.x, y: a.y - 14, face: a.face });
      return 'reload';
    };
    w.swing = (a, forceStep) => {
      if (!a) return false;
      if (!a.weapon || a.weapon === 'pistol') a.weapon = 'blade';
      if (forceStep == null && a.wAction && a.wAction.startsWith('combo') && a.wDur > 0 && (a.wT / a.wDur) < 0.78) {
        a.comboQueued = true;
        a.combatHoldT = 0.42;
        return a.wAction;
      }
      const wMeta = (Rig.WEAPONS && Rig.WEAPONS[a.weapon]) || (Rig.WEAPONS && Rig.WEAPONS.blade) || {};
      const comboCount = wMeta.comboCount || (a.weapon === 'katana' ? 4 : a.weapon === 'greatsword' ? 2 : 3);
      const durs = wMeta.comboDurs || (a.weapon === 'katana' ? [0.38, 0.24, 0.24, 0.52] : a.weapon === 'greatsword' ? [0.62, 0.72] : [0.42, 0.44, 0.54]);
      // 若上一段挥砍已结束且未衔接（没有连起来），则必须从第一段 (combo1, step=0) 重新开始打
      const isChaining = !!(a.wAction && a.wAction.startsWith('combo'));
      const nextStep = forceStep != null
        ? (forceStep % comboCount)
        : isChaining
          ? ((a.comboStep || 0) % comboCount)
          : 0;
      a.comboStep = (nextStep + 1) % comboCount;
      a.comboResetT = durs[nextStep];
      a.comboQueued = false;
      a.swingHitDone = false;
      a.wAction = 'combo' + (nextStep + 1);
      a.wT = 0;
      a.wDur = durs[nextStep];
      a.combatHoldT = 0.42;
      a.stats.combos = (a.stats.combos || 0) + 1;
      const isMoving = !!(a.want && a.want.dir) || a.loc === 'walk' || a.loc === 'run' || a.loc === 'sprint' || a.loc === 'cwalk';
      if (a.grounded && !isMoving) {
        const impArr = a.weapon === 'katana' ? [12, 10, 10, 16] : a.weapon === 'greatsword' ? [12, 18] : [8, 6, 10];
        let imp = impArr[nextStep] != null ? impArr[nextStep] : 8;
        // 若正前方木桩已在贴身距离内，减小微垫步避免穿过木桩
        for (const d of w.dummies) {
          const dist = (d.x - a.x) * (a.face || 1);
          if (dist >= 6 && dist <= 24 && Math.abs(d.y - a.y) <= 18) {
            imp = Math.min(imp, Math.max(0, (dist - 14) * 0.8));
          }
        }
        a.vx = (a.face || 1) * imp;
      }
      const ar = (a.aim || 90) * Math.PI / 180, ux = Math.sin(ar) * a.face, uy = Math.cos(ar);
      w.fx.push({ type: 'swing', id: a.id, weapon: a.weapon, step: nextStep + 1, action: a.wAction, x: a.x + ux * 10, y: (a.y - 16) + uy * 8, face: a.face, aim: a.aim });
      return a.wAction;
    };
    w.skill = a => {
      if (!a) return false;
      if (a.weapon === 'pistol') return w.reload(a);
      if (!a.weapon) a.weapon = 'blade';
      if (a.wAction === 'skill' && a.wT < a.wDur * 0.75) return 'skill';
      a.wAction = 'skill';
      a.wT = 0;
      a.wDur = a.weapon === 'katana' ? 0.88 : a.weapon === 'greatsword' ? 0.86 : 0.76;
      a.combatHoldT = 0.42;
      a.skillFired = false;
      a.swingHitDone = false;
      a.comboStep = 0;
      a.comboResetT = 0;
      a.comboQueued = false;
      a.stats.skills = (a.stats.skills || 0) + 1;
      const isMoving = !!(a.want && a.want.dir) || a.loc === 'walk' || a.loc === 'run' || a.loc === 'sprint' || a.loc === 'cwalk';
      if (a.grounded && !isMoving && a.weapon !== 'katana') a.vx = -(a.face || 1) * 10;
      w.fx.push({ type: 'skillCharge', id: a.id, weapon: a.weapon, x: a.x, y: a.y - 16, face: a.face, aim: a.aim });
      return 'skill';
    };
    w.shoot = a => {
      if (!a) return false;
      if (!a.weapon) a.weapon = 'blade';
      if (a.weapon === 'blade' || a.weapon === 'sword' || a.weapon === 'katana' || a.weapon === 'greatsword') return w.swing(a);
      if (a.wAction === 'reload') return false;
      if (a.ammo <= 0) return w.reload(a);
      a.ammo--;
      a.wAction = 'shoot'; a.wT = 0; a.wDur = 0.18; a.combatHoldT = 0.42; a.stats.shots = (a.stats.shots || 0) + 1;
      const ar = (a.aim || 90) * Math.PI / 180, ux = Math.sin(ar) * a.face, uy = Math.cos(ar);
      const nx = uy * a.face, ny = -ux * a.face;
      const mx = a.x + ux * 8.5 + nx * 1.2, my = (a.y - 16) + uy * 8.5 + ny * 1.2;
      w.fx.push({ type: 'shot', id: a.id, x: mx, y: my, ux, uy, face: a.face, aim: a.aim });
      return 'shoot';
    };
    return w;
  }

  const gx = (w, x) => w.H[clamp(Math.round(x), 0, WW - 1)];
  const say = (a, text, dur) => { a.say = { text, t: dur || 2.4 }; };
  const pick = (w, arr) => arr[Math.floor(w.rng() * arr.length)];
  const goalName = a => a.goal.type;
  function setGoal(a, g) { a.goal = g; a.stats.goals[g.type] = (a.stats.goals[g.type] || 0) + 1; }

  /* ---------- 操控层：朝目标走，自动判断台阶、墙、沟并给出跳跃 ---------- */
  function steer(w, a, tx, run, tol) {
    const dx = tx - a.x;
    if (Math.abs(dx) <= tol) return 'arrived';
    const dir = dx > 0 ? 1 : -1, W = a.want;
    W.dir = dir; W.run = run;
    if (!a.grounded || a.loc === 'pre' || a.loc === 'land') return 'moving';
    const rd = d => gx(w, a.x + dir * d), y = a.y;
    for (let d = 2; d <= 14; d++) {                       // 前方有墙/高台阶
      const rise = y - rd(d);
      if (rise > STEP) {
        if (rise > 24) return 'blocked';
        if (d <= (run ? 10 : 7)) { W.jump = true; a.jumpDest = null; }
        return 'moving';
      }
    }
    const lim = Math.min(60, Math.abs(dx));
    for (let d = 2; d <= lim; d++) {                      // 前方有沟
      if (rd(d) - y > 5) {
        let e = d; while (e < 140 && rd(e) - y > 5) e++;
        const width = e - d;
        if (width > 56) break;                            // 一直往下没有对岸：这是下坡，直接走下去
        if (y - rd(e) > 20) return 'blocked';
        if (width > 20 && a.ab.blink) {                    // 会瞬移的角色：宽沟有一半概率直接瞬移过去
          if (a.gapPick == null) a.gapPick = w.rng() < 0.55 ? 'blink' : 'jump';
          if (a.gapPick === 'blink') {
            if (d <= 6 && a.blCd <= 0) { W.blink = true; a.blinkMin = e + 1; a.blinkMax = Math.min(60, e + 10); }
            else if (d > 6) W.run = true;
            return 'moving';
          }
        }
        if (width > 20) W.run = true;                     // 宽沟：助跑
        if (d <= 6) { W.jump = true; a.jumpDest = width > 20 ? a.x + dir * (e + 3) : null; }
        return 'moving';
      }
    }
    return 'moving';
  }

  /* ---------- 意图层 ---------- */
  function weightedPick(w, opts) {
    let tot = 0; for (const o of opts) tot += o[1];
    let r = w.rng() * tot;
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts[0][0];
  }
  function flatNear(w, a, tx) {                           // 目标点别落在沟里
    const base = a.y; let n = 0;
    while (Math.abs(gx(w, tx) - base) > 5 && n++ < 40) tx += Math.sign(tx - a.x) * 3;
    return clamp(tx, 24, WW - 24);
  }
  function think(w, a) {
    const T = a.tr, r = w.rng;
    let best = null, bs = -9;
    if (a.cd <= 0) for (const o of w.agents) {
      if (o === a) continue;
      const d = Math.abs(o.x - a.x); if (d > 320) continue;
      if (o.goal.type === 'chat' || o.goal.type === 'flee') continue;
      const aff = (Cast.AFFINITY[a.id] && Cast.AFFINITY[a.id][o.id] != null) ? Cast.AFFINITY[a.id][o.id] : 0.25;
      const s = aff + 0.35 + r() * 0.5 - d / 900;
      if (s > bs) { bs = s; best = o; }
    }
    const opts = [['idle', 0.3 + T.pat * 1.0], ['wander', 0.8 + T.en * 1.5], ['poi', T.cur * 1.8]];
    if (best && bs > 0.2) opts.push(['approach', T.soc * 2.6 * Math.min(1.2, bs)]);
    const k = weightedPick(w, opts);
    if (k === 'idle') setGoal(a, { type: 'idle', t: 1.5 + r() * 2.5 + T.pat * 4 });
    else if (k === 'wander') {
      const dir = r() < 0.5 ? -1 : 1, dist = 60 + r() * (120 + T.en * 160);
      setGoal(a, { type: 'wander', tx: flatNear(w, a, a.x + dir * dist), run: r() < T.en * 0.55 && dist > 90, age: 0, sprint: !!a.ab.sprint && dist > 130 && r() < 0.7 });
    } else if (k === 'poi') {
      const ps = w.pois.slice().sort((p, q) => Math.abs(p.sx - a.x) + r() * 300 - Math.abs(q.sx - a.x) - r() * 300);
      setGoal(a, { type: 'poi', poi: ps[0], stage: 'go', t: 0, age: 0, sneak: !!a.ab.sneak && Math.abs(ps[0].sx - a.x) < 160 && r() < 0.4 });
    } else if (k === 'approach') setGoal(a, { type: 'approach', target: best, age: 0 });
  }

  function startChat(w, a, o) {
    const c = { a, b: o, t: 6 + 8 * (a.tr.soc + o.tr.soc) / 2 + w.rng() * 3, lt: 0, spk: a, n: 0 };
    setGoal(a, { type: 'chat', c }); setGoal(o, { type: 'chat', c });
    a.stats.chats++; o.stats.chats++;
    a.face = Math.sign(o.x - a.x) || a.face; o.face = -a.face;
  }
  function endChat(w, c) {
    for (const p of [c.a, c.b]) {
      p.talk = false; p.cd = 14 + w.rng() * 16;
      setGoal(p, { type: 'idle', t: 1 + w.rng() * 2 });
    }
  }
  /* a 向 o 搭话：o 按亲密度 + 自己的社交倾向决定接不接 */
  function propose(w, a, o) {
    const busy = o.goal.type === 'chat' || o.goal.type === 'flee' || !o.grounded;
    const aff = (Cast.AFFINITY[o.id] && Cast.AFFINITY[o.id][a.id] != null) ? Cast.AFFINITY[o.id][a.id] : 0.25;
    const p = clamp(0.5 + 0.5 * aff + 0.3 * (o.tr.soc - 0.5), 0.05, 0.95);
    if (!busy && w.rng() < p) { say(a, pick(w, a.spec.lines.greet), 2); say(o, pick(w, o.spec.lines.greet), 2); startChat(w, a, o); return true; }
    a.stats.refused++; a.cd = 12; o.cd = Math.max(o.cd, 5);
    if (!busy) {
      say(o, pick(w, o.spec.lines.refuse), 2.4);
      if (o.tr.cau > 0.8 && aff < -0.2) startFlee(w, o, a);
    }
    say(a, pick(w, a.spec.lines.react), 2.2);
    if (a.goal.type !== 'idle') setGoal(a, { type: 'idle', t: 1.5 + w.rng() * 2 });
    return false;
  }
  function startFlee(w, a, from) {
    a.fleeCd = 9; a.stats.flees++;
    setGoal(a, { type: 'flee', from, t: 2.2 + w.rng() * 1.5, run: a.tr.cau > 0.7 });
    say(a, pick(w, a.spec.lines.flee), 2);
  }
  function interact(w, a) {                               // 玩家按 Y：向最近的人搭话
    let o = null, bd = 60;
    for (const q of w.agents) { if (q === a) continue; const d = Math.abs(q.x - a.x); if (d < bd) { bd = d; o = q; } }
    if (!o) return false;
    a.face = Math.sign(o.x - a.x) || a.face;
    return propose(w, a, o);
  }
  function setLineup(w, on) {
    w.lineup = on;
    w.agents.forEach((a, i) => {
      a.manual = false; a.say = null; a.talk = false;
      if (on) { a.x = 190 + i * 26; a.y = gx(w, a.x); a.vx = a.vy = 0; a.grounded = true; a.loc = 'idle'; a.face = 1; setGoal(a, { type: 'hold' }); }
      else setGoal(a, { type: 'idle', t: 0.5 + w.rng() * 1.5 });
    });
  }

  function senseThreat(w, a, dt) {
    a.senseT -= dt; a.fleeCd -= dt; if (a.senseT > 0) return; a.senseT = 0.25;
    if (a.fleeCd > 0 || a.manual || ['chat', 'flee', 'hold'].includes(a.goal.type)) return;
    for (const o of w.agents) {
      if (o === a || Math.abs(o.x - a.x) > 30) continue;
      const aff = (Cast.AFFINITY[a.id] && Cast.AFFINITY[a.id][o.id] != null) ? Cast.AFFINITY[a.id][o.id] : 0.25;
      if (aff >= -0.1) continue;
      if (a.tr.cau > 0.7) { startFlee(w, a, o); return; }
      if (aff < -0.15) {                                  // 暴躁型：嘟囔着走开
        a.fleeCd = 9; say(a, pick(w, a.spec.lines.react), 2.2);
        const dir = Math.sign(a.x - o.x) || 1;
        setGoal(a, { type: 'wander', tx: flatNear(w, a, a.x + dir * (70 + w.rng() * 60)), run: false, age: 0 }); return;
      }
    }
  }

  function runGoal(w, a, dt) {
    const g = a.goal, W = a.want, T = a.tr;
    a.talk = false;
    switch (g.type) {
      case 'hold': break;
      case 'idle':
        g.t -= dt; if (g.talk) a.talk = true;
        if (w.rng() < dt * 0.06 * (1 - T.pat * 0.7)) a.face = -a.face;     // 偶尔换个方向看
        if (g.t <= 0) think(w, a);
        break;
      case 'wander': {
        g.age += dt;
        const res = steer(w, a, g.tx, g.run || g.sprint, 4);
        if (g.sprint) W.sprint = true;
        if (a.ab.blink && a.blCd <= 0 && a.grounded && Math.abs(g.tx - a.x) > 70 && w.rng() < dt * 0.07 && !W.blink) { W.blink = true; a.blinkMin = 10; a.blinkMax = 28; }   // 一时兴起瞬移一下
        if (T.en > 0.6 && T.cau < 0.4 && a.grounded && a.loc !== 'pre' && w.rng() < dt * 0.14) { W.jump = true; a.jumpDest = null; a.joy = true; }   // 精力旺盛的人会蹦
        if (res === 'blocked') a.stats.blocked++;
        if (res !== 'moving' || g.age > 22) setGoal(a, { type: 'idle', t: 1 + w.rng() * 2 + T.pat * 4 });
        break;
      }
      case 'poi': {
        g.age += dt;
        if (g.stage === 'go') {
          const res = steer(w, a, g.poi.sx, !g.sneak && T.en > 0.7 && Math.abs(g.poi.sx - a.x) > 100, 3);
          if (g.sneak) W.sneak = true;
          if (res === 'blocked' || g.age > 25) setGoal(a, { type: 'idle', t: 1.5 });
          else if (res === 'arrived') { g.stage = 'look'; g.t = 4 + T.pat * 8 + w.rng() * 3; a.face = Math.sign(g.poi.x - a.x) || a.face; if (T.cur > 0.6 || w.rng() < 0.3) say(a, pick(w, a.spec.lines.chat), 2.6); }
        } else { g.t -= dt; if (g.t <= 0) setGoal(a, { type: 'idle', t: 1 + w.rng() * 2 }); }
        break;
      }
      case 'approach': {
        g.age += dt; const o = g.target;
        if (o.goal.type === 'chat' || o.goal.type === 'flee' || g.age > 16) { a.cd = 8; setGoal(a, { type: 'idle', t: 1 }); break; }
        const res = steer(w, a, o.x - Math.sign(o.x - a.x) * 18, T.en > 0.6 && Math.abs(o.x - a.x) > 80, 4);
        if (res === 'blocked') { a.cd = 8; setGoal(a, { type: 'idle', t: 1 }); }
        else if (Math.abs(o.x - a.x) < 28) { a.face = Math.sign(o.x - a.x) || a.face; propose(w, a, o); }
        break;
      }
      case 'flee': {
        g.t -= dt;
        const dir = Math.sign(a.x - g.from.x) || (w.rng() < 0.5 ? 1 : -1);
        const res = steer(w, a, clamp(a.x + dir * 200, 24, WW - 24), g.run, 2);
        if (res !== 'moving' || g.t <= 0) {
          if (T.cau > 0.8 || res === 'blocked') setGoal(a, { type: 'crouch', t: 2.5 + w.rng() * 3 });
          else setGoal(a, { type: 'idle', t: 2 });
        }
        break;
      }
      case 'crouch': g.t -= dt; W.crouch = true; if (g.t <= 0) setGoal(a, { type: 'idle', t: 1.5 }); break;
      case 'chat': {
        const c = g.c, o = c.a === a ? c.b : c.a;
        a.face = Math.sign(o.x - a.x) || a.face;
        a.talk = c.spk === a;
        if (c.a !== a) break;                             // 每段对话只由发起者推进
        c.t -= dt; c.lt -= dt;
        if (c.lt <= 0) {
          if (c.n > 0) c.spk = c.spk === c.a ? c.b : c.a;
          c.n++;
          if (c.n > 1) say(c.spk, pick(w, c.spk.spec.lines.chat), 2.4);
          c.lt = 2.5 + w.rng() * 0.8;
          if (c.spk.tr.en > 0.8 && w.rng() < 0.35) { c.spk.want.jump = true; c.spk.joy = true; }   // 太兴奋就原地蹦一下
        }
        if (c.t <= 0) endChat(w, c);
        break;
      }
    }
  }

  /* 瞬移：沿朝向在 [blinkMin, blinkMax] 内找最远的、地面平整的落点，找不到就取消 */
  function doBlink(w, a) {
    const dir = a.blDir; let nx = null;
    for (let d = a.blinkMax; d >= a.blinkMin; d--) {
      const x = clamp(a.x + dir * d, 16, WW - 16);
      if (Math.abs(gx(w, x) - a.y) <= STEP) { nx = x; break; }
    }
    if (nx == null) { a.loc = 'idle'; a.blCd = 1; return; }
    w.fx.push({ type: 'blink', id: a.id, x0: a.x, x1: nx, y: a.y, face: dir });
    a.x = nx; a.y = gx(w, nx); a.loc = 'blinkPost'; a.blT = 0; a.vx = dir * 45; a.blCd = 2 + w.rng() * 2.5; a.stats.blinks++;
    a.blinkMin = 10; a.blinkMax = 28;
  }

  /* ---------- 运动层：物理 + 状态 ---------- */
  function physics(w, a, dt) {
    const W = a.want;
    a.t += dt;
    const tgt = (v, t, acc) => v < t ? Math.min(t, v + acc * dt) : Math.max(t, v - acc * dt);
    if (a.grounded) {
      if (a.loc === 'pre') {
        a.preT += dt; a.vx *= 0.94;
        if (a.preT >= 0.12) { a.vy = -JV; a.grounded = false; a.loc = 'air'; a.canDouble = true; a.flipT = -1; a.stats.jumps++; if (W.dir === 0) a.airV = 0; w.fx.push({ type: 'puff', x: a.x, y: a.y }); }
      } else if (a.loc === 'land') {
        a.landT += dt; a.vx *= 0.86;
        if (a.landT >= a.landDur) a.loc = 'idle';
      }
      else if (a.loc === 'blinkPre') {
        a.blT += dt; a.vx = tgt(a.vx, 0, 300);
        if (a.blT >= 0.09) doBlink(w, a);
      } else if (a.loc === 'blinkPost') {
        a.blT += dt; a.vx = tgt(a.vx, 0, 260);
        if (a.blT >= 0.22) { a.loc = 'idle'; a.gapPick = null; }
      }
      const lockAim = !!(a.weapon && (a.manual || a.aimMouse));
      if (a.grounded && a.loc !== 'pre' && a.loc !== 'land' && a.loc !== 'blinkPre' && a.loc !== 'blinkPost') {
        if (W.blink && a.ab.blink && a.blCd <= 0) { a.loc = 'blinkPre'; a.blT = 0; a.blDir = W.dir || a.face; a.face = a.blDir; a.vx *= 0.3; }
        else if (W.jump) { a.loc = 'pre'; a.preT = 0; a.airV = Math.abs(a.vx) > 8 ? Math.abs(a.vx) : (W.dir ? (W.run ? a.runV : a.walkV) : 0); if (!W.dir) a.vx = 0; }
        else if (W.crouch || W.sneak) {
          if (W.dir) { a.vx = tgt(a.vx, W.dir * a.cwalkV, 500); if (!lockAim) a.face = W.dir; a.loc = 'cwalk'; }
          else { a.loc = 'crouch'; a.vx = tgt(a.vx, 0, 700); }
        }
        else {
          const spr = W.sprint && a.ab.sprint;
          let tv = W.dir ? W.dir * (spr ? a.sprintV : W.run ? a.runV : a.walkV) : 0, acc = 520;
          if (a.skidT > 0) { a.skidT -= dt; tv = 0; acc = 700; }
          else if (!lockAim && Math.abs(a.vx) > a.runV * 0.7 && (!W.dir || Math.sign(W.dir) !== Math.sign(a.vx))) { a.skidT = 0.16; a.face = Math.sign(a.vx); w.fx.push({ type: 'puff', x: a.x, y: a.y }); }
          a.vx = tgt(a.vx, tv, acc);
          if (W.dir && a.skidT <= 0 && !lockAim) a.face = W.dir;
          a.loc = a.skidT > 0 ? 'skid' : (Math.abs(a.vx) < 4 && !W.dir ? 'idle' : (spr && Math.abs(a.vx) > a.runV * 1.15 ? 'sprint' : W.run && Math.abs(a.vx) > a.walkV * 1.25 ? 'run' : 'walk'));
          if (a.loc === 'idle') a.vx = 0;
        }
      }
    } else {
      // 空中：保持动量，二段跳
      const lockAim = !!(a.weapon && (a.manual || a.aimMouse));
      if (W.dir && !lockAim) a.face = W.dir;
      a.vx = tgt(a.vx, W.dir ? W.dir * a.airV : a.vx, 260);
      if (W.jump2) a.djBuf = 0.3; a.djBuf = (a.djBuf || 0) - dt;
      let dj = a.djBuf > 0;
      if (!dj && a.jumpDest != null && a.vy > 20) {       // 宽沟：预测落点不够远就补一次二段跳
        const dir = Math.sign(a.jumpDest - a.x) || 1, dy = a.jumpDest - a.x;
        const tl = (a.vy + Math.sqrt(a.vy * a.vy + 2 * G * Math.max(0, gx(w, a.jumpDest) - a.y))) / G;
        if (dir * (dy - a.vx * tl) > 2) dj = true;
      }
      if (dj && a.canDouble && a.flipT < 0 && a.vy > -60) { a.vy = -DJV; a.canDouble = false; a.flipT = 0; a.djBuf = 0; a.stats.doubles++; a.jumpDest = null; w.fx.push({ type: 'puff', x: a.x, y: a.y }); if (a.suit) { w.fx.push({ type: 'puff', x: a.x - 2, y: a.y + 1 }); w.fx.push({ type: 'puff', x: a.x + 2, y: a.y + 1 }); } }
      if (a.flipT >= 0) { a.flipT += dt; a.loc = 'flip'; if (a.flipT >= (a.suit ? 0.3 : 0.24)) { a.flipT = -1; a.loc = 'air'; } } else a.loc = 'air';
    }
    // 水平移动 + 地形
    const nx = clamp(a.x + a.vx * dt, 14, WW - 14), h = gx(w, nx);
    if (a.grounded) {
      if (a.y - h > STEP) a.vx = 0;
      else {
        a.x = nx;
        if (h - a.y > STEP) { a.grounded = false; a.vy = 0; a.loc = 'air'; a.airV = Math.abs(a.vx); a.canDouble = true; a.flipT = -1; a.stats.falls++; }
        else a.y = h;
      }
    } else {
      if (a.y > h + 1) a.vx = 0; else a.x = nx;
      a.vy += G * dt; a.y += a.vy * dt;
      const gh = gx(w, a.x);
      if (a.vy >= 0 && a.y >= gh) { a.landDur = a.vy > 140 ? 0.16 : 0.09; a.y = gh; a.grounded = true; a.loc = 'land'; a.landT = 0; a.vx *= 0.6; a.flipT = -1; a.jumpDest = null; a.vy = 0; a.gapPick = null; if (a.landDur > 0.12) w.fx.push({ type: 'puff', x: a.x, y: a.y }); }
    }
    if (a.loc === 'walk' || a.loc === 'run' || a.loc === 'sprint' || a.loc === 'cwalk') a.phase += Math.abs(a.vx) * dt / (a.loc === 'sprint' ? 62 : a.loc === 'run' ? 46 : a.loc === 'cwalk' ? 14 : 26);
    else if (a.loc === 'idle') a.phase = 0;
    // 45° 待机与侧面动作之间插一帧“转身”过渡
    if (a.loc === 'idle') { if (a.lastFace !== a.face) a.idleT = 0; a.idleT = (a.idleT || 0) + dt; }
    else { if (a.prevLoc === 'idle') a.leaveT = 0.07; a.idleT = 0; }
    a.leaveT = Math.max(0, (a.leaveT || 0) - dt); a.prevLoc = a.loc; a.lastFace = a.face;
    a.blCd = Math.max(0, a.blCd - dt);
    if (a.weapon && ((a.wAction && a.wAction !== 'aim') || (a.manual && w.input.attackHold))) {
      a.combatHoldT = 0.42;
    } else if (a.combatHoldT > 0) {
      a.combatHoldT = Math.max(0, a.combatHoldT - dt);
    }
    if (a.comboResetT > 0 && (!a.wAction || a.wAction === 'aim')) {
      a.comboResetT = Math.max(0, a.comboResetT - dt);
      if (a.comboResetT <= 0) a.comboStep = 0;
    }
    if (a.hitstopT > 0) {
      a.hitstopT = Math.max(0, a.hitstopT - dt);
      if (!a.want || !a.want.dir) a.vx *= 0.65;
    } else if (a.weapon && a.wAction && a.wAction !== 'aim') {
      a.wT += dt;
      // 近战连击命中木桩判定：长刀第4段大上段重下劈在 p >= 0.52 触发，大剑势大力沉3帧前摇在 p >= 0.40 触发，其余挥砍在 p >= 0.28 触发顿帧、木桩受击摇晃与伤害跳字
      const comboHitThr = (a.weapon === 'katana' && a.wAction === 'combo4') ? 0.52 : a.weapon === 'greatsword' ? 0.40 : 0.28;
      if (a.wAction.startsWith('combo') && !a.swingHitDone && a.wDur > 0 && (a.wT / a.wDur) >= comboHitThr) {
        a.swingHitDone = true;
        const stepIdx = a.wAction === 'combo4' ? 4 : a.wAction === 'combo3' ? 3 : a.wAction === 'combo2' ? 2 : 1;
        let dmg = stepIdx === 3 ? 38 : stepIdx === 2 ? 24 : 18;
        let isHeavy = stepIdx === 3;
        if (a.weapon === 'katana') {
          dmg = stepIdx === 4 ? 46 : stepIdx === 3 ? 28 : stepIdx === 2 ? 22 : 18;
          isHeavy = stepIdx === 4;
        } else if (a.weapon === 'greatsword') {
          dmg = stepIdx === 2 ? 58 : 38;
          isHeavy = true;
        }
        const reach = (a.weapon === 'katana' || a.weapon === 'greatsword') ? 46 : 38;
        for (const d of (w.dummies || [])) {
          const dx = (d.x - a.x) * (a.face || 1);
          if (dx >= -6 && dx <= reach && Math.abs(d.y - a.y) <= 22) {
            w.hitDummy(d, a.face || 1, dmg, isHeavy, a);
          }
        }
      }
      const skillFireThr = (a.weapon === 'katana' || a.weapon === 'greatsword') ? 0.42 : 0.56;
      if (a.wAction === 'skill' && !a.skillFired && a.wDur > 0 && (a.wT / a.wDur) >= skillFireThr) {
        a.skillFired = true;
        const isMoving = !!(a.want && a.want.dir) || a.loc === 'walk' || a.loc === 'run' || a.loc === 'sprint' || a.loc === 'cwalk';
        if (a.weapon === 'katana') {
          // 长刀右键「纳刀聚气·爆星独立三连环绕刀光」：蓄力时刀鞘口吸引粒子，p=0.42 爆发成一颗小星，
          // 在人物正前方独立世界坐标图层（不随人物移动）打出快速环绕半周身的 3 道序列帧刀光，并同步触发三段伤害判定（18 -> 22 -> 32）！
          for (const d of (w.dummies || [])) {
            const dx = (d.x - a.x) * (a.face || 1);
            if (dx >= -8 && dx <= 48 && Math.abs(d.y - a.y) <= 24) {
              w.hitDummy(d, a.face || 1, 18, false, a);
            }
          }
          if (!w.katanaBursts) w.katanaBursts = [];
          w.katanaBursts.push({
            x: a.x,
            y: a.y,
            face: a.face || 1,
            aim: a.aim || 90,
            age: 0,
            hitsDone: 1,
            agent: a,
          });
          w.fx.push({
            type: 'katanaTear',
            id: a.id,
            x: a.x,
            y: a.y,
            face: a.face || 1,
            aim: a.aim || 90,
          });
        } else {
          if (a.grounded && !isMoving) a.vx = (a.face || 1) * 20;
          // 蓄力剑气斩挥出瞬间若近身有木桩，也直接造成斩击伤害
          const skDmg = a.weapon === 'greatsword' ? 52 : 32;
          for (const d of (w.dummies || [])) {
            const dx = (d.x - a.x) * (a.face || 1);
            if (dx >= -4 && dx <= 46 && Math.abs(d.y - a.y) <= 22) {
              w.hitDummy(d, a.face || 1, skDmg, true, a);
            }
          }
          const ar = (a.aim != null ? a.aim : 90) * Math.PI / 180;
          const ux = Math.sin(ar) * (a.face || 1), uy = Math.cos(ar);
          w.fx.push({
            type: 'swordWave',
            id: a.id,
            x: a.x + ux * 10,
            y: (a.y - 16) + uy * 8,
            ux,
            uy,
            face: a.face || 1,
            aim: a.aim || 90,
          });
        }
      }
      const holdChain = a.wAction.startsWith('combo') && ((a.manual && w.input.attackHold) || a.comboQueued);
      if (holdChain && a.wDur > 0 && (a.wT / a.wDur) >= 0.94) {
        w.swing(a, a.comboStep);
      } else if (a.wT >= a.wDur) {
        if (a.wAction === 'reload') {
          a.ammo = a.maxAmmo;
          a.wAction = 'aim';
          a.wT = 0;
          if (a.manual && w.input.attackHold) w.shoot(a);
        } else if (a.wAction === 'shoot') {
          if (a.ammo <= 0) {
            w.reload(a);
          } else if (a.manual && w.input.attackHold) {
            w.shoot(a);
          } else {
            a.wAction = 'aim';
            a.wT = 0;
          }
        } else if (holdChain) {
          w.swing(a, a.comboStep);
        } else {
          // 挥砍动作结束且未继续连击：立即归零连段计数，下次出剑必定从第一段开始
          a.wAction = 'aim';
          a.wT = 0;
          a.comboStep = 0;
          a.comboResetT = 0;
          a.comboQueued = false;
        }
      }
    }
    if (a.hurtT > 0) a.hurtT = Math.max(0, a.hurtT - dt);
    a.stats.time[a.loc] += dt; a.stats.gt = a.stats.gt || {}; a.stats.gt[a.goal.type] = (a.stats.gt[a.goal.type] || 0) + dt;
  }

  function step(w, dt) {
    w.t += dt;
    const inp = w.input;
    // 推进长刀右键独立三道剑气的三段伤害判定（第1道 0.00s 已触发，第2道在 0.11s 触发，第3道在 0.22s 触发重击）
    if (w.katanaBursts && w.katanaBursts.length) {
      for (let i = w.katanaBursts.length - 1; i >= 0; i--) {
        const b = w.katanaBursts[i];
        b.age += dt;
        if (b.hitsDone === 1 && b.age >= 0.11) {
          b.hitsDone = 2;
          for (const d of (w.dummies || [])) {
            const dx = (d.x - b.x) * (b.face || 1);
            if (dx >= -8 && dx <= 48 && Math.abs(d.y - b.y) <= 24) {
              w.hitDummy(d, b.face || 1, 22, false, b.agent);
            }
          }
        }
        if (b.hitsDone === 2 && b.age >= 0.22) {
          b.hitsDone = 3;
          for (const d of (w.dummies || [])) {
            const dx = (d.x - b.x) * (b.face || 1);
            if (dx >= -8 && dx <= 48 && Math.abs(d.y - b.y) <= 24) {
              w.hitDummy(d, b.face || 1, 32, true, b.agent);
            }
          }
        }
        if (b.age >= 0.45) {
          w.katanaBursts.splice(i, 1);
        }
      }
    }
    for (const d of (w.dummies || [])) {
      if (d.hitT > 0) {
        d.hitT = Math.max(0, d.hitT - dt);
        const osc = Math.sin(d.hitT * 52) * Math.ceil(d.hitT * 8);
        d.tilt = d.shakeDir * Math.round(osc);
      } else {
        d.tilt = 0;
      }
      if (d.flashT > 0) d.flashT = Math.max(0, d.flashT - dt);
      if (d.comboTimer > 0) {
        d.comboTimer = Math.max(0, d.comboTimer - dt);
        if (d.comboTimer <= 0) d.comboHits = 0;
      }
    }
    for (const a of w.agents) {
      const W = a.want; W.dir = 0; W.run = false; W.jump = false; W.jump2 = false; W.crouch = false; W.sprint = false; W.sneak = false; W.blink = false;
      if (a.say) { a.say.t -= dt; if (a.say.t <= 0) a.say = null; }
      a.cd -= dt;
      if (a.goal.type === 'hold') { a.talk = false; }
      else {
        senseThreat(w, a, dt);
        if (a.manual && a.goal.type !== 'chat') {
          a.talk = false;
          W.dir = inp.dir; W.run = inp.run; W.crouch = inp.crouch; W.sprint = inp.run && !!a.ab.sprint;
          if (inp.blinkEdge) { W.blink = true; a.blinkMin = 10; a.blinkMax = 28; }
          if (inp.jumpEdge) { if (a.grounded) W.jump = true; else W.jump2 = true; }
          if (inp.interactEdge) interact(w, a);
          if (inp.attackHold && (!a.wAction || a.wAction === 'aim')) {
            w.shoot(a);
          }
        } else runGoal(w, a, dt);
      }
      if (a.manual && a.goal.type === 'chat') { /* 对话期间交给对话系统 */ }
      physics(w, a, dt);
    }
    inp.jumpEdge = false; inp.interactEdge = false; inp.blinkEdge = false;
  }

  /* ---------- 状态 → 姿势 ---------- */
  function framePose(a) {
    const P = a.poser; let po, phi = 0, up = 0, flame = 0, flash = false;
    const isBack = !!(a.weapon && ((a.want && a.want.dir && a.want.dir * (a.face || 1) < 0) || (Math.abs(a.vx) > 2 && a.vx * (a.face || 1) < 0)));
    const activeCombat = !!(a.weapon && ((a.wAction && a.wAction !== 'aim' && a.wAction !== 'idle') || (a.weapon === 'pistol' && a.combatHoldT > 0)));
    switch (a.loc) {
      case 'walk': {
        const i = Math.floor(a.phase * 8) % 8;
        po = isBack ? P.loco('walkBack', i) : (a.leaveT > 0 ? P.stand() : P.loco('walk', i));
        break;
      }
      case 'run': {
        const i = Math.floor(a.phase * 8) % 8;
        po = P.loco(isBack ? 'runBack' : 'run', i);
        if (isBack ? (P.runBackBob ? P.runBackBob(i) : P.runBob(i)) : P.runBob(i)) up = 1;
        break;
      }
      case 'sprint': {
        const i = Math.floor(a.phase * 8) % 8;
        po = P.loco(isBack ? 'runBack' : 'sprint', i);
        if (isBack ? (P.runBackBob ? P.runBackBob(i) : P.runBob(i)) : P.runBob(i)) up = 1;
        break;
      }
      case 'cwalk': po = P.loco(isBack ? 'cwalkBack' : 'cwalk', Math.floor(a.phase * 8) % 8); break;
      case 'skid': po = P.skid(); break;
      case 'pre': po = P.pre(a.preT); break;
      case 'land': po = P.land(a.landT); break;
      case 'crouch': po = P.crouchIdle(); break;
      case 'blinkPre': po = P.blinkWind(); flash = a.blT > 0.05; break;
      case 'blinkPost': po = P.blinkLand(); flash = a.blT < 0.04; break;
      case 'flip':
        if (a.suit) { po = P.kick(Math.max(0, a.flipT)); flame = Math.max(0, Math.min(1, 1 - a.flipT / 0.3)); }
        else { const f = P.flip(Math.max(0, a.flipT)); po = f.po; phi = f.phi; }
        break;
      case 'air': po = P.air(Math.round((-a.vy / 68) / 0.4) * 0.4); break;
      default:
        if (a.weapon) {
          po = activeCombat ? P.idleSide(a.t, a.talk) : P.weaponIdle(a.weapon, a.t, a.talk);
        } else {
          po = a.idleT < 0.07 ? P.stand() : P.idle(a.t, a.talk);
        }
    }
    let weapon = null;
    if (a.weapon && (a.loc !== 'flip' || a.suit)) {
      if (po && po.v34 && !activeCombat) {
        const cyc = a.weapon === 'pistol' ? 2.2 : 2.4;
        const idleP = (((a.t % cyc) + cyc) % cyc) / cyc;
        weapon = { id: a.weapon, aim: a.aim != null ? a.aim : 90, action: 'idle', p: idleP, v34: true };
      } else {
        weapon = { id: a.weapon, aim: a.aim != null ? a.aim : 90, action: a.wAction || 'aim', p: a.wDur > 0 ? clamp(a.wT / a.wDur, 0, 1) : 0, v34: false };
      }
    }
    return { po, phi, hy: P.hyGround(po), up, suit: a.suit, flame, flash, weapon, backpedal: isBack, hurt: (a.hurtT || 0) > 0 };
  }

  return { WW, BASE, createWorld, framePose, step, buildTerrain, mulberry32 };
});
