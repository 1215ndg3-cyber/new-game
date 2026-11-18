import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore
import * as RigModule from './rig.js';
// @ts-ignore
import * as CastModule from './cast.js';
// @ts-ignore
import * as AIModule from './ai.js';

const Rig: any = (RigModule as any).default?.GW ? (RigModule as any).default : (globalThis as any).PixelRig || RigModule;
const Cast: any = (CastModule as any).default?.CAST ? (CastModule as any).default : (globalThis as any).PixelCast || CastModule;
const AI: any = (AIModule as any).default?.createWorld ? (AIModule as any).default : (globalThis as any).PixelAI || AIModule;

test('Cast includes all 6 characters including Xing with abilities', () => {
  assert.equal(Cast.CAST.length, 6);
  const ids = Cast.CAST.map((c: any) => c.id);
  assert.deepEqual(ids, ['lin', 'bai', 'su', 'tie', 'mi', 'xing']);
  const xing = Cast.CAST[5];
  assert.equal(xing.name, '星');
  assert.equal(xing.idle, 'free');
  assert.equal(xing.abilities.sprint, true);
  assert.equal(xing.abilities.blink, true);
  assert.equal(xing.abilities.sneak, true);
});

test('Su 45-degree idle has bob=0 and consistent hip/foot height (no leg shortening)', () => {
  const su = Cast.CAST[2];
  assert.equal(su.id, 'su');
  const P = Rig.poser(su);
  const heights = new Set<string>();
  for (let t = 0; t < 10; t += 0.05) {
    const po = P.idle(t, false);
    assert.equal(po.bob, 0, `Expected Su idle bob to be 0 at t=${t}`);
    const hy = P.hyGround(po);
    const g = Rig.charGrid(su, po, hy, 0);
    let low = -1;
    for (let r = 0; r < Rig.GH; r++) {
      if (g[r].some((c: any) => c)) low = r;
    }
    heights.add(`${hy}|${low}`);
  }
  assert.deepEqual([...heights], ['34|75']);
});

test('Spacesuit layer renders cleanly for both 45-degree idle and profile actions including jetpack double-jump', () => {
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);
  const idlePo = P.idle(0.5, false);
  const gIdleSuit = Rig.charGrid(xing, idlePo, P.hyGround(idlePo), 0, { suit: true, flame: 0 });
  const flatIdle = gIdleSuit.flat().filter(Boolean);
  assert.ok(flatIdle.includes('#e3e9f1'), 'Suit white should be present in 45° idle');
  assert.ok(flatIdle.includes('#ef7b3a'), 'Suit orange accent should be present in 45° idle');

  const kickPo = P.kick(0.1);
  const gKickSuit = Rig.charGrid(xing, kickPo, P.hyGround(kickPo), 0, { suit: true, flame: 1.0 });
  const flatKick = gKickSuit.flat().filter(Boolean);
  assert.ok(flatKick.includes('#7fb4e6'), 'Helmet visor should be present in profile kick');
  assert.ok(flatKick.some((c: string) => ['#fff2b8', '#ffc24d', '#ff8a33'].includes(c)), 'Jetpack flame pixels should be rendered');
});

test('Crouch-walk (cwalk) keeps legs tucked under body with negative shin angles and steady hip height', () => {
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);
  const b = xing.build;
  for (let i = 0; i < 8; i++) {
    const po = P.loco('cwalk', i);
    const hy = P.hyGround(po);
    assert.equal(hy, 36, `Expected cwalk frame ${i} hip height hy=36, got ${hy}`);
    for (const leg of [po.nl, po.fl]) {
      const [th, sh] = leg;
      assert.ok(th <= 38, `Expected cwalk thigh <= 38° (not jutting out horizontally), got ${th}`);
      assert.ok(sh <= -20, `Expected cwalk shin <= -20° (bent backward under knee), got ${sh}`);
      const kx = b.thigh * Math.sin(Rig.rad(th));
      const ax = kx + b.shin * Math.sin(Rig.rad(sh));
      assert.ok(kx <= 3.8, `Expected knee offset kx <= 3.8, got ${kx}`);
      assert.ok(ax <= 1.6, `Expected ankle offset ax <= 1.6 (underneath body), got ${ax}`);
    }
  }
});

test('Spacesuit double-jump (kick) and airPose never extend legs awkwardly forward and blend seamlessly at t=0.3', () => {
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);
  for (let i = 0; i <= 30; i++) {
    const t = i / 100;
    const po = P.kick(t);
    for (const leg of [po.nl, po.fl]) {
      const [th, sh] = leg;
      assert.ok(th <= 25, `Expected spacesuit double-jump thigh <= 25° at t=${t}, got ${th}`);
      assert.ok(sh < 0, `Expected spacesuit double-jump shin < 0° (trailing gracefully) at t=${t}, got ${sh}`);
    }
  }
  for (let v = -2.6; v <= 2.5; v += 0.2) {
    const po = P.air(v);
    for (const leg of [po.nl, po.fl]) {
      const [th, sh] = leg;
      assert.ok(th <= 25, `Expected airPose thigh <= 25° at v=${v.toFixed(1)}, got ${th}`);
      assert.ok(sh <= 0, `Expected airPose shin <= 0° at v=${v.toFixed(1)}, got ${sh}`);
    }
  }
  const endKick = P.kick(0.3);
  const apexAir = P.air(0.0);
  assert.deepEqual(endKick.nl, apexAir.nl, 'End of spacesuit double-jump should match apex airPose nl');
  assert.deepEqual(endKick.fl, apexAir.fl, 'End of spacesuit double-jump should match apex airPose fl');
});

test('Normal double-jump somersault (flip) curls into a compact ball at airborne height (hy=35) with 8 smooth steps', () => {
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);
  const phis: number[] = [];
  for (let i = 0; i < 8; i++) {
    const ft = (i / 8) * 0.24 + 0.001;
    const f = P.flip(ft);
    const hy = P.hyGround(f.po);
    assert.equal(hy, 35, `Expected somersault step ${i} to stay at airborne height hy=35 (no floor teleport), got ${hy}`);
    phis.push(f.phi);
    const g = Rig.charGrid(xing, f.po, hy, f.phi);
    let minR = Rig.GH, maxR = -1, minC = Rig.GW, maxC = -1;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (g[r][c]) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    const h = maxR - minR + 1;
    const w = maxC - minC + 1;
    if (i < 7) {
      assert.ok(h <= 14 && w <= 14, `Expected curled somersault ball at step ${i} to be compact (<=14x14), got ${w}x${h}`);
    }
  }
  assert.deepEqual(phis, [30, 80, 130, 180, 230, 280, 325, 0]);
});

test('Jump ascent and descent arms: downward on ascent, above horizontal on descent with angle from horizontal increasing over descent time', () => {
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);

  // Ascent (v > 0): arms point downward (below horizontal, i.e., |angle| < 50 deg from straight down 0 deg)
  for (const v of [2.5, 1.8, 1.0, 0.6]) {
    const po = P.air(v);
    for (const a of [po.na[0], po.na[1], po.fa[0], po.fa[1]]) {
      assert.ok(Math.abs(a) < 55, `Expected arm angle downward (|a| < 55°) during ascent at v=${v}, got ${a}`);
    }
  }

  // Descent (v < 0): arms angled upward above horizontal (|angle| > 90 deg), and angle with horizontal (|angle| - 90) increases as descent speed increases
  const descentVs = [-0.6, -1.0, -1.6, -2.2, -2.6];
  let prevNaUpperAboveHoriz = -Infinity;
  let prevFaUpperAboveHoriz = -Infinity;
  for (const v of descentVs) {
    const po = P.air(v);
    const naUpperAbove = po.na[0] - 90;
    const naLowerAbove = po.na[1] - 90;
    const faUpperAbove = Math.abs(po.fa[0]) - 90;
    const faLowerAbove = Math.abs(po.fa[1]) - 90;
    assert.ok(naUpperAbove > 0 && naLowerAbove > 0, `Expected near arm above horizontal (>90°) during descent at v=${v}, got ${po.na}`);
    assert.ok(faUpperAbove > 0 && faLowerAbove > 0, `Expected far arm above horizontal (<-90°) during descent at v=${v}, got ${po.fa}`);
    assert.ok(naUpperAbove > prevNaUpperAboveHoriz, `Expected near arm angle above horizontal to increase at v=${v}: ${naUpperAbove} > ${prevNaUpperAboveHoriz}`);
    assert.ok(faUpperAbove > prevFaUpperAboveHoriz, `Expected far arm angle above horizontal to increase at v=${v}: ${faUpperAbove} > ${prevFaUpperAboveHoriz}`);
    prevNaUpperAboveHoriz = naUpperAbove;
    prevFaUpperAboveHoriz = faUpperAbove;
  }
});

test('AI simulation runs 6 agents including blink, sprint, and suit toggle without NaN or out-of-bounds', () => {
  // Attach globals for UMD cross-references if needed
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;
  const w = AI.createWorld(11);
  assert.equal(w.agents.length, 6);

  const xing = w.agents[5];
  assert.equal(xing.id, 'xing');

  // Toggle suit on Xing
  w.toggleSuit(xing, true);
  assert.equal(xing.suit, true);

  // Trigger manual blink on Xing
  xing.manual = true;
  xing.goal = { type: 'manual' };
  const startX = xing.x;
  w.input.blinkEdge = true;
  for (let i = 0; i < 20; i++) w.step(1 / 60);
  assert.ok(xing.x !== startX, 'Xing should have blinked to a new X position');
  assert.ok(w.fx.some((e: any) => e.type === 'blink'), 'World fx queue should record blink event');

  // Release manual and run 600 steps of autonomous AI
  xing.manual = false;
  xing.goal = { type: 'idle', t: 0.1 };
  for (let i = 0; i < 600; i++) {
    w.step(1 / 60);
    for (const a of w.agents) {
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), `Agent ${a.id} position must be finite`);
      const fp = AI.framePose(a);
      const g = Rig.charGrid(a.spec, fp.po, fp.hy, fp.phi, { suit: fp.suit, flame: fp.flame, weapon: fp.weapon });
      assert.ok(g && g.length === Rig.GH);
    }
  }
});

test('Decoupled 4-layer Starbound arm & weapon rig works across all 6 characters and 360-degree aim angles', () => {
  const aims = [0, 45, 90, 135, 180, -135, -90, -45];
  for (const spec of Cast.CAST) {
    const P = Rig.poser(spec);
    const runPo = P.loco('run', 2);
    const hy = P.hyGround(runPo);
    for (const aim of aims) {
      const layers = Rig.charLayers(spec, runPo, hy, 0, {
        weapon: { id: 'pistol', aim, action: 'aim', p: 0 },
      });
      assert.equal(layers.decoupled, true, `Expected decoupled layers for ${spec.id} at aim=${aim}`);
      assert.ok(layers.backArm.flat().some(Boolean), `Expected backArm pixels for ${spec.id} at aim=${aim}`);
      assert.ok(layers.body.flat().some(Boolean), `Expected body pixels for ${spec.id} at aim=${aim}`);
      assert.ok(layers.weapon.flat().some(Boolean), `Expected weapon pixels for ${spec.id} at aim=${aim}`);
      assert.ok(layers.frontArm.flat().some(Boolean), `Expected frontArm pixels for ${spec.id} at aim=${aim}`);
      assert.ok(layers.muzzle && Number.isFinite(layers.muzzle.x), `Expected valid muzzle point for ${spec.id}`);
    }
  }
});

test('Pistol shoot and 4-stage reload animations & armed run/jump/flip rules work as specified', () => {
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;
  const w = AI.createWorld(11);
  const xing = w.agents[5];

  // 1. Unarmed by default in createWorld -> normal arms (decoupled=false)
  assert.equal(xing.weapon, null);
  let fp = AI.framePose(xing);
  assert.equal(fp.weapon, null);

  // 2. Equip pistol and aim at mouse cursor in front and above
  w.setWeapon(xing, 'pistol');
  assert.equal(xing.weapon, 'pistol');
  assert.equal(xing.ammo, 6);
  w.aimAt(xing, xing.x + 40, xing.y - 56); // 45 deg up-right -> aim ~ 135 deg
  assert.equal(xing.face, 1);
  assert.ok(xing.aim > 120 && xing.aim < 150, `Expected upward-forward aim ~135°, got ${xing.aim}`);

  // 3. Running and jumping while holding weapon keeps torso/legs moving while arm tracks mouse
  xing.loc = 'run';
  xing.phase = 0.25;
  fp = AI.framePose(xing);
  assert.ok(fp.weapon && fp.weapon.id === 'pistol' && Math.abs(fp.weapon.aim - xing.aim) < 0.01);

  xing.loc = 'air';
  xing.vy = -120;
  fp = AI.framePose(xing);
  assert.ok(fp.weapon && fp.weapon.id === 'pistol', 'Expected weapon to stay active during normal jump');

  // 4. Normal somersault double-jump (flip without spacesuit) plays normal somersault frames without weapon override
  xing.suit = false;
  xing.loc = 'flip';
  xing.flipT = 0.08;
  fp = AI.framePose(xing);
  assert.equal(fp.weapon, null, 'Expected weapon to be hidden during normal somersault flip');
  const flipLayers = Rig.charLayers(xing.spec, fp.po, fp.hy, fp.phi, { weapon: { id: 'pistol', aim: 90 } });
  assert.equal(flipLayers.decoupled, false, 'Somersault flip must use normal curled roll frames');

  // 5. Shoot 6 rounds -> triggers recoil/muzzle flash/shell casing -> auto-reloads on 6th shot completion
  xing.loc = 'idle';
  const shootPose = Rig.computeWeaponPose({ id: 'pistol', aim: 90, action: 'shoot', p: 0.15 });
  assert.ok(shootPose.gunAng > 90, 'Expected upward recoil kick during shoot');
  assert.equal(shootPose.slideBack, 1, 'Expected slide blowback during shoot');
  assert.ok(shootPose.flash > 0, 'Expected muzzle flash during shoot');

  const reloadStage1 = Rig.computeWeaponPose({ id: 'pistol', aim: 90, action: 'reload', p: 0.15 });
  const reloadStage2 = Rig.computeWeaponPose({ id: 'pistol', aim: 90, action: 'reload', p: 0.35 });
  const reloadStage3 = Rig.computeWeaponPose({ id: 'pistol', aim: 90, action: 'reload', p: 0.65 });
  const reloadStage4 = Rig.computeWeaponPose({ id: 'pistol', aim: 90, action: 'reload', p: 0.82 });
  assert.ok(reloadStage1.magDrop > 0, 'Stage 1 reload should drop empty magazine');
  assert.equal(reloadStage2.handMag, true, 'Stage 2 reload should show fresh magazine in off-hand');
  assert.equal(reloadStage3.magLockGlow, true, 'Stage 3 reload should lock magazine into grip');
  assert.equal(reloadStage4.slideBack, 1, 'Stage 4 reload should rack the slide');

  assert.equal(w.shoot(xing), 'shoot');
  assert.equal(xing.ammo, 5);
  assert.equal(w.reload(xing), 'reload');
  for (let i = 0; i < 50; i++) w.step(1 / 60);
  assert.equal(xing.wAction, 'aim');
  assert.equal(xing.ammo, 6, 'Expected ammo to refill to 6 after reload finishes');
});

test('Sword module 4-hit stepped 8-frame upper-body-only combo (swordHoriz3D -> swordUp3D -> swordCleave3D -> swordThrust3D) and 16-frame 3D Sword Flourish skill work across all characters', () => {
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;
  const w = AI.createWorld(11);
  const xing = w.agents[5];
  w.setWeapon(xing, 'blade');
  assert.equal(xing.weapon, 'blade');
  assert.equal(Rig.WEAPONS.blade.comboCount, 4, 'Expected 4-stage sword combo');

  // Verify 4-combo sequence progression via swing(xing, forceStep)
  const expectedSlashTypes = ['swordHoriz3D', 'swordUp3D', 'swordCleave3D', 'swordThrust3D'];
  for (let s = 0; s < 4; s++) {
    const act = w.swing(xing, s);
    assert.equal(act, `combo${s + 1}`, `Expected combo step ${s + 1}`);
    const wpMid = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: act, p: 0.44 });
    assert.equal(wpMid.slashType, expectedSlashTypes[s], `Expected slashType ${expectedSlashTypes[s]} for ${act}`);
    if (s === 1 || s === 2) {
      assert.equal(wpMid.twoHand, true, `Expected two-handed power grip on ${act}`);
    }
    // Check UPPER-BODY-ONLY skeletal participation: legs (nl, fl) and hopY=0 are preserved from basePo!
    const runPo = xing.poser.loco('run', 2);
    const meleeBody = Rig.computeMeleeBodyPose(runPo, { id: 'blade', aim: 90, action: act, p: 0.44 });
    assert.deepEqual(meleeBody.po.nl, runPo.nl, `Expected ${act} to preserve lower-body near leg (nl) when running`);
    assert.deepEqual(meleeBody.po.fl, runPo.fl, `Expected ${act} to preserve lower-body far leg (fl) when running`);
    assert.equal(meleeBody.hopY, 0, `Expected ${act} hopY=0 so upper-body-only melee never teleports legs`);
    assert.ok(Math.abs(meleeBody.po.lean) <= 1, `Expected subtle torso bend (|lean| <= 1), got ${meleeBody.po.lean}`);

    const elbowBend = Math.abs(meleeBody.po.na[1] - meleeBody.po.na[0]);
    assert.ok(
      elbowBend >= 35,
      `Expected natural elbow bend (>=35°) during ${act} swing peak, got |${meleeBody.po.na[1]} - ${meleeBody.po.na[0]}| = ${elbowBend}°`
    );

    if (s === 0) {
      // 1st hit (一段·疾风平斩) cocks deep behind the back (-118°) and sweeps >200° horizontally forward (90°)
      const wpWind1 = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'combo1', p: 0.14 });
      assert.equal(wpWind1.gunAng, -118, `Expected 1st hit windup to cock sword deep behind the back (-118°), got ${wpWind1.gunAng}°`);
      const wpSlash1 = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'combo1', p: 0.42 });
      assert.equal(wpSlash1.gunAng, 90, `Expected 1st hit forward horizontal slash peak to align horizontally forward (90°), got ${wpSlash1.gunAng}°`);
      assert.ok(wpSlash1.gunAng - wpSlash1.trailFrom >= 195, `Expected >195° horizontal slash sweep on combo1, got ${wpSlash1.gunAng - wpSlash1.trailFrom}°`);
      assert.equal(wpSlash1.slashType, 'swordHoriz3D');

      // Verify 3D swordHoriz3D trail wraps behind the character's back (backArm + weapon) AND extends a sharp horizontal needle tip in front of the 17.5px sword tip
      const P = Rig.poser(xing.spec);
      const po = P.idleSide(0, false);
      const layers1: any = Rig.charLayers(xing.spec, po, P.hyGround(po), 0, {
        weapon: { id: 'blade', aim: 90, action: 'combo1', p: 0.42 },
      });
      const trailCols1: number[] = [];
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          const wCol = layers1.weapon[r][c];
          const bCol = layers1.backArm[r][c];
          if (wCol === '#eef1f6' || wCol === '#9aa1b0' || bCol === '#eef1f6' || bCol === '#9aa1b0') {
            trailCols1.push(c);
          }
        }
      }
      const minTrailCol = Math.min(...trailCols1);
      const maxTrailCol = Math.max(...trailCols1);
      const shoulderGridCol = layers1.shoulder.x + Rig.GX;
      assert.ok(minTrailCol <= shoulderGridCol - 7, `Expected swordHoriz3D 3D crescent trail to wrap behind character's back (<= ${shoulderGridCol - 7}), got minCol=${minTrailCol}`);
      assert.ok(maxTrailCol >= layers1.muzzle.x + Rig.GX + 4, `Expected swordHoriz3D needle tip to extend past lengthened 17.5px sword tip (>= ${layers1.muzzle.x + Rig.GX + 4}), got maxCol=${maxTrailCol}`);
    }

    if (s === 1) {
      // 2nd hit (二段·掠月斜上挑) sweeps >200° past vertical crown (reaching 204°)
      const wpUpPeak = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'combo2', p: 0.42 });
      assert.ok(wpUpPeak.gunAng >= 200, `Expected 2nd hit upward slash to sweep high past overhead crown (>=200°), got ${wpUpPeak.gunAng}°`);
      assert.ok(wpUpPeak.gunAng - wpUpPeak.trailFrom >= 185, `Expected >185° single-frame trajectory trail on combo2, got span=${wpUpPeak.gunAng - wpUpPeak.trailFrom}°`);
    }

    if (s === 2) {
      // 3rd hit (三段·裂空斜下劈) raises sword overhead tilted 36° backward (180° + 36° = 216°) and cleaves >190° down to 24°
      const wpWindup = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'combo3', p: 0.30 });
      assert.equal(wpWindup.gunAng, 216, `Expected 3rd hit swordCleave3D windup to tilt 36° backward past vertical overhead (216°), got ${wpWindup.gunAng}°`);
      const wpImpact = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'combo3', p: 0.56 });
      assert.ok(wpImpact.gunAng <= 24, `Expected 3rd hit swordCleave3D to cleave all the way down (<=24°), got ${wpImpact.gunAng}°`);
      assert.ok(wpImpact.trailFrom - wpImpact.gunAng >= 190, `Expected >190° full overhead-to-ground slash trail, got ${wpImpact.trailFrom - wpImpact.gunAng}°`);
      const wpBurst = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'combo3', p: 0.68 });
      assert.ok(wpBurst.slamBurst > 0, 'Expected 3rd hit swordCleave3D to trigger normal-aligned tip shockwave slamBurst at impact');
    }

    if (s === 3) {
      // 4th hit (四段·回风贯日刺) executes horizontal piercing thrust (90°) with twin 3D wind-vortex rings
      const wpThrust = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'combo4', p: 0.42 });
      assert.equal(wpThrust.gunAng, 90, 'Expected 4th hit spiral thrust to drive horizontally at 90°');
      assert.equal(wpThrust.slashType, 'swordThrust3D');
    }
    // Render across all 6 characters without error
    for (const spec of Cast.CAST) {
      const P = Rig.poser(spec);
      const po = P.idleSide(0.1, false);
      const layers: any = Rig.charLayers(spec, po, P.hyGround(po), 0, {
        weapon: { id: 'blade', aim: 90, action: act, p: 0.44 },
      });
      assert.equal(layers.decoupled, true);
      assert.ok(layers.weapon.flat().some(Boolean), `Expected sword & slash pixels for ${spec.id} on ${act}`);
    }
  }

  // Verify symmetric double-edged pointed straight sword sprite (上下对称开刃且尖头部居中对称，加长至 17.5px)
  {
    const P = Rig.poser(xing.spec);
    const po = P.idleSide(0, false);
    // Render sword pointing horizontally at gunAng=90° without trail (use custom aim so gunAng = 114 + (66 - 90) = 90°)
    const layersHoriz: any = Rig.charLayers(xing.spec, po, P.hyGround(po), 0, {
      weapon: { id: 'blade', aim: 66, action: 'aim', p: 0 },
    });
    assert.equal(layersHoriz.wp.gunAng, 90, 'Expected horizontal sword angle 90° for symmetry check');
    const centerRow = layersHoriz.muzzle.y;
    assert.equal(
      layersHoriz.weapon[centerRow][layersHoriz.muzzle.x + Rig.GX],
      '#f2f4f8',
      'Expected centered pointed sword tip (#f2f4f8) on blade axis'
    );
    // Check that upper edge (centerRow - 1) and lower edge (centerRow + 1) have identical symmetric pixels along the blade
    for (let c = 0; c < Rig.GW; c++) {
      assert.equal(
        layersHoriz.weapon[centerRow - 1][c],
        layersHoriz.weapon[centerRow + 1][c],
        `Expected symmetric double-edged sword at col=${c}: upper=${layersHoriz.weapon[centerRow - 1][c]} vs lower=${layersHoriz.weapon[centerRow + 1][c]}`
      );
    }
  }

  // Verify shoulder-pivot rotation with mouse aim (武器和手臂单独扣出来在肩膀处随鼠标旋转)
  for (const act of ['combo1', 'combo2', 'combo3', 'combo4', 'skill']) {
    const wp90 = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: act, p: 0.42 });
    const wp135 = Rig.computeWeaponPose({ id: 'blade', aim: 135, action: act, p: 0.42 });
    const wp45 = Rig.computeWeaponPose({ id: 'blade', aim: 45, action: act, p: 0.42 });
    assert.equal(wp135.gunAng - wp90.gunAng, 45, `Expected ${act} sword angle to rotate +45° around shoulder when mouse aims at 135°`);
    assert.equal(wp135.na[0] - wp90.na[0], 45, `Expected ${act} near arm to rotate +45° around shoulder when mouse aims at 135°`);
    assert.equal(wp135.fa[0] - wp90.fa[0], 45, `Expected ${act} far arm to rotate +45° around shoulder when mouse aims at 135°`);
    assert.equal(wp45.gunAng - wp90.gunAng, -45, `Expected ${act} sword angle to rotate -45° around shoulder when mouse aims at 45°`);
  }

  // Verify Right-Click 16-Frame Gorgeous Sword Flourish skill ('秘技·流云千瓣剑花' / swordFlourish3D)
  xing.manual = true;
  xing.goal = { type: 'manual' };
  w.summonDummyNear(xing);
  w.fx.length = 0;
  const skillAct = w.skill(xing);
  assert.equal(skillAct, 'skill');
  const wpSeal = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'skill', p: 0.08 });
  assert.ok(wpSeal.chargeLv > 0, 'Expected chargeLv > 0 during opening sword-seal poise');
  assert.equal(wpSeal.slashType, null, 'Should not release flourish petals before p=0.125');

  const wpFlourish = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'skill', p: 0.65 });
  assert.equal(wpFlourish.slashType, 'swordFlourish3D', 'Expected swordFlourish3D 3D slash arc during flourish finisher');
  assert.ok(wpFlourish.flourishPhase >= 9, 'Expected finisher flourishPhase >= 9 at p=0.65');

  // Step world forward through the slower 1.28s skill and verify 4 sequential swordFlourish bursts + 4 dummy hits
  assert.equal(Rig.WEAPONS.blade.skillDur, 1.28, 'Expected Longsword skillDur slowed down to 1.28s');
  assert.equal(xing.wDur, 1.28, 'Expected agent wDur to use slower 1.28s Longsword skill playback');
  for (let i = 0; i < 90; i++) w.step(1 / 60);
  const flourishEvts = w.fx.filter((e: any) => e.type === 'swordFlourish');
  const flourishHits = w.fx.filter((e: any) => e.type === 'dummyHit');
  assert.equal(flourishEvts.length, 4, `Expected world.fx to emit 4 sequential swordFlourish bursts, got ${flourishEvts.length}`);
  assert.equal(flourishHits.length, 4, `Expected 4 sequential dummyHit judgments during Sword Flourish, got ${flourishHits.length}`);
});

test('Continuous pistol firing while standing still never flickers to 45-degree idle between shots, unchained sword attacks always start from combo1, and running while swinging sword does not overwrite running velocity', () => {
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;
  const w = AI.createWorld(11);
  const xing = w.agents[5];

  // 1. Continuous pistol firing while standing still
  w.setWeapon(xing, 'pistol');
  xing.manual = true;
  xing.goal = { type: 'manual' };
  xing.loc = 'idle';
  xing.vx = 0;
  w.input.attackHold = true;

  let v34FlickerCount = 0;
  let shotsFired = 0;
  for (let f = 0; f < 65; f++) {
    w.step(1 / 60);
    const fp = AI.framePose(xing);
    if (fp.po.v34 || (fp.weapon && fp.weapon.v34)) {
      v34FlickerCount++;
    }
    while (w.fx.length) {
      const ev = w.fx.shift();
      if (ev.type === 'shot') shotsFired++;
    }
  }
  w.input.attackHold = false;
  assert.ok(shotsFired >= 5, `Expected continuous attackHold to fire multiple shots, got ${shotsFired}`);
  assert.equal(
    v34FlickerCount,
    0,
    `Expected ZERO frames flickering back to 45-degree weaponIdle during continuous pistol firing, got ${v34FlickerCount}`
  );

  // 2. Unchained sword attack MUST reset and start from Stage 1 (combo1)
  w.setWeapon(xing, 'blade');
  assert.equal(w.swing(xing), 'combo1', 'First attack starts at combo1');
  // Let combo1 finish completely without holding attackHold or queuing next hit
  for (let f = 0; f < 35; f++) w.step(1 / 60);
  assert.equal(xing.wAction, 'aim', 'Combo1 should have finished and returned to aim');
  assert.equal(xing.comboStep, 0, 'Unchained combo must reset comboStep to 0 immediately upon finishing');
  assert.equal(w.swing(xing), 'combo1', 'Subsequent unchained attack MUST start from combo1 (Stage 1) again');

  // Whereas chaining during the swing advances to combo2
  for (let f = 0; f < 10; f++) w.step(1 / 60);
  w.swing(xing); // Queues next hit while combo1 is active
  for (let f = 0; f < 25; f++) w.step(1 / 60);
  assert.equal(xing.wAction, 'combo2', 'Chained attack during combo1 should advance to combo2');
  for (let f = 0; f < 40; f++) w.step(1 / 60); // Let combo2 finish without chaining
  assert.equal(w.swing(xing), 'combo1', 'After combo2 finishes without chaining to combo3, next attack must start from combo1');

  // 3. Running while swinging sword preserves running velocity and leg animation
  w.input.dir = 1;
  w.input.run = true;
  for (let f = 0; f < 18; f++) w.step(1 / 60);
  assert.ok(xing.loc === 'run' || xing.loc === 'sprint', `Expected run or sprint, got ${xing.loc}`);
  const vxBeforeSwing = xing.vx;
  assert.ok(vxBeforeSwing > 50, `Expected character to be running at high speed (>50), got ${vxBeforeSwing}`);
  w.swing(xing, 0);
  assert.equal(
    xing.vx,
    vxBeforeSwing,
    'Expected w.swing while running NOT to overwrite running velocity (no sliding lunge while running)'
  );
  w.input.dir = 0;
  w.input.run = false;
});

test('Armed standing still uses 45-degree per-weapon idle across all 6 characters, and moving opposite to mouse aim plays walkBack/runBack animations', () => {
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;
  const w = AI.createWorld(11);
  const xing = w.agents[5];

  // 1. Verify each weapon ('blade' and 'pistol') has its own 45-degree idle pose (v34=true) applied across all 6 characters
  for (const wId of ['blade', 'pistol']) {
    w.setWeapon(xing, wId);
    xing.loc = 'idle';
    xing.vx = 0;
    xing.wAction = 'aim';
    const fp = AI.framePose(xing);
    assert.equal(fp.po.v34, true, `Expected 45-degree stance (v34=true) when standing still with ${wId}`);
    assert.ok(fp.weapon && fp.weapon.v34 === true && fp.weapon.action === 'idle', `Expected weapon idle action in 45-degree view for ${wId}`);

    for (const spec of Cast.CAST) {
      const P = Rig.poser(spec);
      const po45 = P.weaponIdle(wId, 0.6, false);
      assert.equal(po45.v34, true, `Expected P.weaponIdle(${wId}) to be 45-degree view for ${spec.id}`);
      const hy = P.hyGround(po45);
      const layers: any = Rig.charLayers(spec, po45, hy, 0, {
        weapon: { id: wId, aim: 90, action: 'idle', p: 0.35, v34: true },
      });
      assert.equal(layers.decoupled, true);
      assert.ok(layers.weapon.flat().some(Boolean), `Expected weapon pixels for ${spec.id} in 45-degree ${wId} idle`);
      assert.ok(layers.wp.idleGlint >= 0, `Expected idleGlint on ${wId} 45-degree idle`);
    }
  }

  // Verify blade and pistol 45-degree idles have distinct weapon angles
  const wpBladeIdle = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: 'idle', p: 0.25, v34: true });
  const wpPistolReal = Rig.computeWeaponPose({ id: 'pistol', aim: 90, action: 'idle', p: 0.25, v34: true });
  assert.notEqual(wpBladeIdle.gunAng, wpPistolReal.gunAng, 'Expected distinct 45-degree weapon angles for blade vs pistol');

  // 2. Verify moving backward while aiming forward triggers walkBack / runBack / cwalkBack
  w.setWeapon(xing, 'blade');
  w.aimAt(xing, xing.x + 60, xing.y - 16); // Aiming right -> face = 1
  assert.equal(xing.face, 1);

  // Moving backward (vx < 0 while face = 1) in walk
  xing.loc = 'walk';
  xing.vx = -25;
  xing.want.dir = -1;
  xing.phase = 0.25; // frame i = 2
  const fpWalkBack = AI.framePose(xing);
  assert.equal(fpWalkBack.backpedal, true, 'Expected backpedal=true when walking opposite to facing');
  const expectedWalkBack = xing.poser.loco('walkBack', 2);
  const forwardWalk = xing.poser.loco('walk', 2);
  assert.deepEqual(fpWalkBack.po.nl, expectedWalkBack.nl, 'Expected framePose to use walkBack leg keyframes');
  assert.notDeepEqual(fpWalkBack.po.nl, forwardWalk.nl, 'Expected walkBack leg keyframes to differ from forward walk');

  // Verify moving backward (vx < 0 while face = 1) in run
  xing.loc = 'run';
  xing.vx = -65;
  xing.want.dir = -1;
  xing.phase = 0.125; // frame i = 1
  const fpRunBack = AI.framePose(xing);
  assert.equal(fpRunBack.backpedal, true, 'Expected backpedal=true when running opposite to facing');
  assert.equal(fpRunBack.po.lean, -1, 'Expected runBack to brace torso slightly back (lean=-1) instead of leaning forward');
  const forwardRun = xing.poser.loco('run', 1);
  assert.ok(forwardRun.lean >= 1, 'Forward run leans forward (lean>=1)');
  assert.notDeepEqual(fpRunBack.po.nl, forwardRun.nl, 'Expected runBack leg keyframes to differ from forward run');
});

test('45-degree weapon idle translates the entire weapon sprite rigidly as a whole block with zero relative pixel deformation', () => {
  for (const spec of Cast.CAST) {
    const P = Rig.poser(spec);
    for (const wId of ['blade', 'pistol']) {
      const cyc = wId === 'pistol' ? 2.2 : 2.4;
      let refShape: string[] | null = null;
      for (let i = 0; i < 8; i++) {
        const p = i / 8;
        const po = P.weaponIdle(wId, p * cyc, false);
        const hy = P.hyGround(po);
        const layers: any = Rig.charLayers(spec, po, hy, 0, {
          weapon: { id: wId, aim: 90, action: 'idle', p, v34: true },
        });
        // Collect all weapon pixel coordinates normalized by (r - po.bob, c)
        const coords: string[] = [];
        for (let r = 0; r < Rig.GH; r++) {
          for (let c = 0; c < Rig.GW; c++) {
            if (layers.weapon[r][c]) {
              coords.push(`${r - (po.bob || 0)},${c}`);
            }
          }
        }
        assert.ok(coords.length > 0, `Weapon ${wId} should have pixels in 45° idle frame ${i} for ${spec.id}`);
        if (refShape === null) {
          refShape = coords;
        } else {
          assert.deepEqual(
            coords,
            refShape,
            `Expected ${wId} in 45° idle frame ${i} for ${spec.id} to move rigidly as an identical block of pixels offset only by po.bob=${po.bob}`
          );
        }
      }
    }
  }
});

test('Lengthened 17.5px iron longsword 4-combo & 16-frame sword flourish, pure steel slash palette, zero canvas clipping, and wooden training dummy hit feel work end-to-end', () => {
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;

  assert.equal(Rig.GW, 96, 'Expected Rig.GW to be 96px so 360° Greatsword whirlwinds and wide slash trails are never clipped');
  assert.equal(Rig.GH, 108, 'Expected Rig.GH to be 108px so downward-pointed colossal blades render completely without bottom truncation');
  assert.equal(Rig.GX, 28, 'Expected Rig.GX horizontal offset to be 28px');

  // 1. Verify stepped keyframe table (8 frames for combo1..combo4, 16 frames for skill) with natural bent elbows and small torso lean (-1..+1) on every frame
  const kfTable = Rig.SWORD_ACT_KF;
  assert.ok(kfTable, 'Expected Rig.SWORD_ACT_KF to be exported');
  for (const act of ['combo1', 'combo2', 'combo3', 'combo4', 'skill']) {
    const expectedLen = act === 'skill' ? 16 : 8;
    assert.equal(kfTable[act].length, expectedLen, `Expected ${act} to have exactly ${expectedLen} stepped keyframes, got ${kfTable[act].length}`);
    for (let i = 0; i < expectedLen; i++) {
      const kf = kfTable[act][i];
      const bend = Math.abs(kf.na[1] - kf.na[0]);
      assert.ok(
        bend >= 35,
        `Expected ${act} frame ${i} to maintain natural elbow bend (>=35°), got na=[${kf.na[0]}, ${kf.na[1]}] (bend=${bend}°)`
      );
      assert.ok(
        Math.abs(kf.shoulderDx) <= 1,
        `Expected ${act} frame ${i} shoulderDx to stay compact (|shoulderDx|<=1), got ${kf.shoulderDx}`
      );
      assert.ok(
        Math.abs(kf.lean) <= 1,
        `Expected ${act} frame ${i} torso bend lean to stay small (|lean|<=1), got ${kf.lean}`
      );
    }
  }

  // 2. Verify NO sword or slash trail pixel is clipped in the 96x76 Inspector window (c in 0..95, r in 20..95)
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);
  const basePo = P.idleSide(0, false);
  for (const act of ['combo1', 'combo2', 'combo3', 'combo4', 'skill']) {
    const fCount = act === 'skill' ? 16 : 8;
    for (let i = 0; i < fCount; i++) {
      const p = (i + 0.35) / fCount;
      const layers: any = Rig.charLayers(xing, basePo, P.hyGround(basePo), 0, {
        weapon: { id: 'blade', aim: 90, action: act, p },
      });
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (layers.composite[r][c]) {
            assert.ok(
              c >= 0 && c <= Rig.GW - 1,
              `Expected zero horizontal clipping on ${act} frame ${i}, found pixel at col=${c}`
            );
            assert.ok(
              r >= 20 && r <= 95,
              `Expected zero vertical clipping inside 96x76 Inspector window (gr 20..95) on ${act} frame ${i}, found pixel at row=${r}`
            );
          }
        }
      }
    }
  }

  // 3. Verify lengthened 17.5px dark wrought-iron blade & adapted 3D white/silver slash trail palette fused to the sword blade
  const slashChecks = [
    { act: 'combo1', p: 0.42 },
    { act: 'combo2', p: 0.42 },
    { act: 'combo3', p: 0.42 },
    { act: 'combo4', p: 0.42 },
    { act: 'skill', p: 0.65 },
  ];
  const bladeMetalCols = new Set(['#4e5463', '#8a91a1', '#dce1eb', '#f2f4f8', '#7d8494', '#b8bfd0']);
  const trailCols = new Set(['#ffffff', '#eef1f6', '#dce1eb', '#b8bfd0', '#9aa1b0']);
  for (const { act, p } of slashChecks) {
    const layers: any = Rig.charLayers(xing, basePo, P.hyGround(basePo), 0, {
      weapon: { id: 'blade', aim: 90, action: act, p },
    });
    const bladePts: Array<[number, number]> = [];
    const trailPts: Array<[number, number]> = [];
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        const col = layers.weapon[r][c] || layers.backArm[r][c];
        if (!col) continue;
        if (layers.weapon[r][c] && bladeMetalCols.has(layers.weapon[r][c])) bladePts.push([r, c]);
        if (trailCols.has(col)) trailPts.push([r, c]);
      }
    }
    assert.ok(bladePts.length >= 16, `Expected lengthened 17.5px iron longsword blade pixels (>=16) on ${act} at p=${p}, got ${bladePts.length}`);
    assert.ok(trailPts.length >= 24, `Expected adapted 3D white/silver slash trail (>=24) on ${act} at p=${p}, got ${trailPts.length}`);
    let minDist = Infinity;
    for (const [tr, tc] of trailPts) {
      for (const [br, bc] of bladePts) {
        const d = Math.hypot(tr - br, tc - bc);
        if (d < minDist) minDist = d;
      }
    }
    assert.ok(minDist <= 1.5, `Expected 3D slash trail on ${act} at p=${p} to be fused to the iron blade (minDist=${minDist})`);
  }

  // 4. Verify holding attackHold chains through all 4 combo hits AND hits the wooden training dummy with hitstop & recoil
  const w = AI.createWorld(11);
  assert.ok(w.dummies && w.dummies.length >= 2, 'Expected wooden training dummies in world');
  const dummy = w.dummies[0];
  const ag = w.agents[5]; // Xing starts at x=126 facing right, dummy1 is at x=144
  w.setWeapon(ag, 'blade');
  ag.manual = true;
  ag.goal = { type: 'manual' };
  w.input.attackHold = true;

  const seenActions = new Set<string>();
  let sawHitstop = false;
  let dummyHitEvents = 0;
  for (let f = 0; f < 135; f++) {
    w.step(1 / 60);
    if (ag.wAction && ag.wAction.startsWith('combo')) {
      seenActions.add(ag.wAction);
    }
    if (ag.hitstopT > 0) sawHitstop = true;
    while (w.fx.length) {
      const ev = w.fx.shift();
      if (ev.type === 'dummyHit') dummyHitEvents++;
    }
  }
  w.input.attackHold = false;
  assert.deepEqual(
    [...seenActions],
    ['combo1', 'combo2', 'combo3', 'combo4'],
    `Expected holding attackHold to chain through 4-stage combo1..combo4, saw ${[...seenActions]}`
  );
  assert.ok(dummyHitEvents >= 4, `Expected all 4 combo hits to strike the wooden training dummy, got ${dummyHitEvents} hits`);
  assert.ok(sawHitstop, 'Expected attacker hitstop freeze-frame (hitstopT > 0) when striking wooden dummy');
  assert.ok(dummy.comboHits >= 4, `Expected dummy combo counter >= 4, got ${dummy.comboHits}`);
});

test('All sword slashes (combo1..combo4, skill) use pure white slash trails and procedural NPC batch generator composes modular heads (base head + hair + hat) over a unified body compatible with all actions', () => {
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;

  // 1. Verify all 5 sword slash actions (combo1..combo4, skill) render pure white (#eef1f6 / #ffffff) slash trails without dark grey
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);
  const basePo = P.idleSide(0, false);
  for (const { act, p } of [
    { act: 'combo1', p: 0.42 },
    { act: 'combo2', p: 0.42 },
    { act: 'combo3', p: 0.56 },
    { act: 'combo4', p: 0.42 },
    { act: 'skill', p: 0.65 },
  ]) {
    const layers: any = Rig.charLayers(xing, basePo, P.hyGround(basePo), 0, {
      weapon: { id: 'blade', aim: 90, action: act, p },
    });
    let pureWhiteCount = 0;
    let gradientCount = 0;
    let darkGreyCount = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        const wCol = layers.weapon[r][c];
        const bCol = layers.backArm[r][c];
        for (const col of [wCol, bCol]) {
          if (!col) continue;
          if (col === '#eef1f6' || col === '#ffffff') pureWhiteCount++;
          if (col === '#dce1eb' || col === '#b8bfd0' || col === '#9aa1b0') gradientCount++;
          if (col === '#3d414b' || col === '#646a78') darkGreyCount++;
        }
      }
    }
    assert.ok(
      pureWhiteCount >= 18,
      `Expected ${act} at p=${p} to have a prominent pure white (#eef1f6/#ffffff) outer tip arc (>=18 px), got ${pureWhiteCount}`
    );
    assert.ok(
      gradientCount >= 12,
      `Expected ${act} at p=${p} to have inner/tail gradient tones (#dce1eb/#b8bfd0/#9aa1b0 >=12 px), got ${gradientCount}`
    );
    assert.equal(
      darkGreyCount,
      0,
      `Expected ${act} slash trail to use white gradient without dark grey (#3d414b/#646a78), got ${darkGreyCount}`
    );
  }

  // 2. Verify modular head parts (BASE_HEAD, HEADS, HATS) and procedural NPC batch generation
  assert.ok(Rig.BASE_HEAD && Rig.BASE_HEAD34, 'Expected Rig.BASE_HEAD and Rig.BASE_HEAD34 to be exported');
  assert.ok(Rig.HATS && Rig.HATS34, 'Expected Rig.HATS and Rig.HATS34 to be exported');
  assert.ok(Cast.NPC_PARTS && Cast.generateNPC && Cast.generateNPCBatch, 'Expected Cast.NPC_PARTS, generateNPC, and generateNPCBatch to be exported');

  // Verify all 9 hair styles and 8 hat styles exist in both side and 45° views
  for (const h of Cast.NPC_PARTS.HAIR_STYLES) {
    assert.ok(Rig.HEADS[h.id], `Missing side hair template for ${h.id}`);
    assert.ok(Rig.HEADS34[h.id], `Missing 45° hair template for ${h.id}`);
  }
  for (const ht of Cast.NPC_PARTS.HAT_STYLES) {
    assert.ok(Rig.HATS[ht.id], `Missing side hat template for ${ht.id}`);
    assert.ok(Rig.HATS34[ht.id], `Missing 45° hat template for ${ht.id}`);
  }

  // 3. Verify full-coverage hats (beret, cap, strawHat, hood) use ' ' space mask entries above the hat to erase tall hair (bun, spiky, mohawk)
  const fullCoverHats = ['beret', 'cap', 'strawHat', 'hood'];
  const tallHairs = ['bun', 'spiky', 'mohawk'];
  for (const hatId of fullCoverHats) {
    const sideSpaceEntries = Rig.HATS[hatId].filter((m: any) => m[2] === ' ');
    const v34SpaceEntries = Rig.HATS34[hatId].filter((m: any) => m[2] === ' ');
    assert.ok(sideSpaceEntries.length >= 4, `Expected ${hatId} in HATS to have >=4 ' ' space hair-erasing mask entries, got ${sideSpaceEntries.length}`);
    assert.ok(v34SpaceEntries.length >= 4, `Expected ${hatId} in HATS34 to have >=4 ' ' space hair-erasing mask entries, got ${v34SpaceEntries.length}`);

    for (const v34 of [false, true]) {
      let totalErasedForHat = 0;
      const maskList = v34 ? v34SpaceEntries : sideSpaceEntries;
      for (const hairId of tallHairs) {
        const npc = Cast.generateNPC(99, { hair: hairId, hat: hatId });
        const hairCols = new Set([npc.look.cols.hair, npc.look.cols.hairHi]);
        const bd = Rig.headLayerBreakdown(npc, v34);
        for (const [dx, dy] of maskList) {
          const gx = bd.ox + dx + Rig.GX;
          const gy = bd.oy + dy;
          if (bd.hairLayer[gy][gx]) totalErasedForHat++;
          assert.equal(
            bd.hatLayer[gy][gx],
            null,
            `Expected ' ' space entry at (${dx},${dy}) on ${hatId} + ${hairId} (v34=${v34}) to erase pixel in hatLayer`
          );
          assert.equal(
            bd.fullChar[gy][gx],
            null,
            `Expected ' ' space entry at (${dx},${dy}) on ${hatId} + ${hairId} (v34=${v34}) to stay erased in fullChar`
          );
        }
        // Verify ZERO hair pixels leak above or through the crown (dy in -2..0)
        for (let dy = -2; dy <= 0; dy++) {
          for (let dx = -1; dx <= 5; dx++) {
            const c = bd.fullChar[bd.oy + dy][bd.ox + dx + Rig.GX];
            assert.equal(
              hairCols.has(c),
              false,
              `Expected zero protruding hair color at (${dx},${dy}) when wearing full-coverage ${hatId} with ${hairId} (v34=${v34}), got ${c}`
            );
          }
        }
      }
      assert.ok(
        totalErasedForHat >= 2,
        `Expected ${hatId} ' ' space mask to actively erase protruding tall hair pixels (v34=${v34}), erased=${totalErasedForHat}`
      );
    }
  }

  // Open headgear (bandana, visor) should NOT have ' ' space masks and should let tall hair (bun, spiky) show above the headband
  for (const openHat of ['bandana', 'visor']) {
    const npcBun = Cast.generateNPC(101, { hair: 'bun', hat: openHat });
    const bdSide = Rig.headLayerBreakdown(npcBun, false);
    const topBunRow = bdSide.oy - 2;
    const hasTopBunPx = bdSide.fullChar[topBunRow].some(Boolean);
    assert.equal(hasTopBunPx, true, `Expected open headgear ${openHat} to preserve top bun hair at oy-2 in fullChar`);
  }

  const batch = Cast.generateNPCBatch(8, 2026);
  assert.equal(batch.length, 8, 'Expected generateNPCBatch(8) to return 8 procedural NPCs');

  // Verify every NPC in batch has modular head, suit+sleeve, shoe, and back-slot parts, and adapts to all animations
  const headCombos = new Set<string>();
  const validSuitOutfits = new Set(Cast.NPC_PARTS.OUTFIT_SUITS.map((s: any) => s.outfit));
  const validSleeves = new Set(Cast.NPC_PARTS.OUTFIT_SUITS.map((s: any) => s.sleeve));
  const validShoes = new Set(Cast.NPC_PARTS.SHOE_STYLES.map((sh: any) => sh.id));
  const validBacks = new Set(Cast.NPC_PARTS.BACK_STYLES.map((b: any) => b.id));

  for (const npc of batch) {
    headCombos.add(`${npc.look.hair}:${npc.look.hat}`);
    assert.deepEqual(npc.build, Cast.NPC_PARTS.UNIFIED_BODY.build, 'Expected unified body build');
    assert.ok(validSuitOutfits.has(npc.look.outfit), `Expected valid suit outfit, got ${npc.look.outfit}`);
    assert.ok(validSleeves.has(npc.look.sleeve), `Expected valid sleeve style, got ${npc.look.sleeve}`);
    assert.ok(validShoes.has(npc.look.shoes), `Expected valid shoe style, got ${npc.look.shoes}`);
    assert.ok(validBacks.has(npc.look.back), `Expected valid back slot style, got ${npc.look.back}`);

    // Check headLayerBreakdown in both side and 45° views (including new suitLayer, shoeBackLayer, runCapePreview)
    for (const v34 of [false, true]) {
      const bd = Rig.headLayerBreakdown(npc, v34);
      assert.ok(bd.baseHead.flat().some(Boolean), `Expected non-empty baseHead layer for ${npc.id} (v34=${v34})`);
      assert.ok(bd.hairLayer.flat().some(Boolean), `Expected non-empty hairLayer for ${npc.id} (v34=${v34})`);
      if (npc.look.hat && npc.look.hat !== 'none') {
        assert.ok(bd.hatLayer.flat().some(Boolean), `Expected non-empty hatLayer for ${npc.id} with hat=${npc.look.hat} (v34=${v34})`);
      }
      assert.ok(bd.suitLayer.flat().some(Boolean), `Expected non-empty suitLayer for ${npc.id} (v34=${v34})`);
      assert.ok(bd.shoeBackLayer.flat().some(Boolean), `Expected non-empty shoeBackLayer for ${npc.id} (v34=${v34})`);
      assert.ok(bd.runCapePreview.flat().some(Boolean), `Expected non-empty runCapePreview for ${npc.id} (v34=${v34})`);
      assert.ok(bd.fullChar.flat().some(Boolean), `Expected non-empty fullChar composite for ${npc.id} (v34=${v34})`);
    }

    // Verify full compatibility with all animations & weapons without any out-of-bounds pixels
    const NP = Rig.poser(npc);
    const testPoses = [
      { po: NP.idle(0.2, false), wep: null, suit: false },
      { po: NP.weaponIdle('blade', 0.4, false), wep: { id: 'blade', aim: 90, action: 'idle', p: 0.25, v34: true }, suit: false },
      { po: NP.weaponIdle('pistol', 0.4, false), wep: { id: 'pistol', aim: 90, action: 'idle', p: 0.25, v34: true }, suit: false },
      { po: NP.loco('walk', 2), wep: null, suit: false },
      { po: NP.loco('run', 3), wep: { id: 'blade', aim: 90, action: 'combo1', p: 0.42 }, suit: false },
      { po: NP.loco('runBack', 2), wep: { id: 'blade', aim: 90, action: 'combo2', p: 0.56 }, suit: false },
      { po: NP.loco('walkBack', 1), wep: { id: 'blade', aim: 90, action: 'combo3', p: 0.56 }, suit: false },
      { po: NP.loco('sprint', 4), wep: { id: 'pistol', aim: 90, action: 'shoot', p: 0.15 }, suit: false },
      { po: NP.loco('cwalk', 2), wep: null, suit: true },
      { po: NP.air(1.6), wep: null, suit: true },
    ];
    for (const tp of testPoses) {
      const g = Rig.charGrid(npc, tp.po, NP.hyGround(tp.po), 0, { suit: tp.suit, weapon: tp.wep });
      let pxCount = 0;
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (g[r][c]) {
            pxCount++;
            assert.ok(r >= 20 && r <= 95, `Expected procedural NPC ${npc.id} pixel row=${r} within 96x76 Inspector [20..95]`);
            assert.ok(c >= 0 && c < Rig.GW, `Expected procedural NPC ${npc.id} pixel col=${c} within [0..${Rig.GW - 1}]`);
          }
        }
      }
      assert.ok(pxCount >= 35, `Expected procedural NPC ${npc.id} to render full character sprite (>=35 px), got ${pxCount}`);
    }
  }
  assert.equal(headCombos.size, 8, 'Expected all 8 NPCs in a batch to have distinct hair+hat combinations');

  // 4. Verify deploying a procedural NPC batch into live AI world works seamlessly
  const w = AI.createWorld(11);
  w.applyBatchSpecs(batch.slice(0, 6));
  for (let f = 0; f < 30; f++) w.step(1 / 60);
  assert.equal(w.agents[0].spec.id, batch[0].id, 'Expected world agent 0 to use deployed procedural NPC spec');
});

test('17. 9 Full-body OUTFIT_SUITS (zero chest gaps on overalls/all suits, idle arm-sleeve adaptation), SHOE_STYLES, and BACK_STYLES (smooth walk cape, jump transition, hidden on double-jump)', () => {
  assert.equal(Cast.NPC_PARTS.OUTFIT_SUITS.length, 9, 'Expected 9 full-body outfit suits');
  assert.equal(Cast.NPC_PARTS.SHOE_STYLES.length, 5, 'Expected 5 shoe styles');
  assert.equal(Cast.NPC_PARTS.BACK_STYLES.length, 3, 'Expected 3 shared back-slot styles (none, cape, pack)');

  // 1) Verify all 9 OUTFIT_SUITS have ZERO missing torso/chest pixels in both 45° idle and side view across all 4 idle styles
  const bodyLayerSignatures = new Set<string>();
  const compositeSignatures = new Set<string>();
  for (const suitMeta of Cast.NPC_PARTS.OUTFIT_SUITS) {
    for (const idleStyle of ['free', 'cross', 'think', 'hips']) {
      const npc = Cast.generateNPC(303, {
        hair: 'ponytail',
        hat: 'none',
        suit: suitMeta.id,
        shoes: 'sneakers',
        back: 'cape',
        skinIdx: 0,
        idle: idleStyle,
      });
      assert.equal(npc.look.sleeve, suitMeta.sleeve, `Expected NPC with suit ${suitMeta.id} to have sleeve=${suitMeta.sleeve}`);
      const P = Rig.poser(npc);

      // Check 45° idle (where workOveralls previously had missing chest pixels at col 16 +GX)
      const po34 = P.idle(0.1, false);
      assert.equal(po34.v34, true);
      const hy34 = P.hyGround(po34);
      const g34 = Rig.charGrid(npc, po34, hy34, 0, { suit: false });
      const ub34 = po34.bob || 0;
      // In 45° view, torso columns are x=14..16 -> grid cols (14+GX)..(16+GX), rows (hy34-6+ub34+32)..(hy34+32)
      for (let r = hy34 - 6 + ub34; r <= hy34; r++) {
        for (let x = 14; x <= 16; x++) {
          const px = g34[r + 32][x + Rig.GX];
          assert.ok(
            px,
            `Expected solid torso/pelvis pixel (no hole) at x=${x}, r=${r + 32} in 45° idle (${idleStyle}) for suit ${suitMeta.id}, got ${px}`
          );
        }
      }

      // Check side view torso columns x=15..16
      const poSide = P.idleSide(0.2, false);
      const hySide = P.hyGround(poSide);
      const gSide = Rig.charGrid(npc, poSide, hySide, 0, { suit: false });
      const ubSide = poSide.bob || 0;
      for (let r = hySide - 6 + ubSide; r <= hySide; r++) {
        for (let x = 15; x <= 16; x++) {
          const px = gSide[r + 32][x + Rig.GX];
          assert.ok(
            px,
            `Expected solid torso/pelvis pixel (no hole) at x=${x}, r=${r + 32} in side idle for suit ${suitMeta.id}, got ${px}`
          );
        }
      }
    }

    const npcRef = Cast.generateNPC(303, {
      hair: 'short',
      hat: 'none',
      suit: suitMeta.id,
      shoes: 'sneakers',
      back: 'none',
      skinIdx: 0,
    });
    const P = Rig.poser(npcRef);
    const po = P.idleSide(0.2, false);
    const layers = Rig.charLayers(npcRef, po, P.hyGround(po), 0, {
      suit: false,
      weapon: { id: 'blade', aim: 90, action: 'combo1', p: 0.42 },
    });
    bodyLayerSignatures.add(JSON.stringify(layers.body));
    compositeSignatures.add(JSON.stringify(layers.composite));
  }
  assert.equal(
    bodyLayerSignatures.size,
    9,
    `Expected all 9 OUTFIT_SUITS to produce distinct torso/pants pixel layers, got ${bodyLayerSignatures.size}`
  );
  assert.equal(
    compositeSignatures.size,
    9,
    `Expected all 9 OUTFIT_SUITS to produce distinct full composite sprites, got ${compositeSignatures.size}`
  );

  // 2) Verify all 5 SHOE_STYLES produce distinct lower-leg/foot pixels
  const shoeSignatures = new Set<string>();
  for (const shoeMeta of Cast.NPC_PARTS.SHOE_STYLES) {
    const npc = Cast.generateNPC(404, {
      hair: 'short',
      hat: 'none',
      suit: 'tacticalTee',
      shoes: shoeMeta.id,
      back: 'none',
      skinIdx: 0,
    });
    const P = Rig.poser(npc);
    const po = P.loco('walk', 2);
    const g = Rig.charGrid(npc, po, P.hyGround(po), 0, { suit: false });
    const footSlice = g.slice(68, 79);
    shoeSignatures.add(JSON.stringify(footSlice));
  }
  assert.equal(shoeSignatures.size, 5, `Expected all 5 SHOE_STYLES to produce distinct footwear pixels, got ${shoeSignatures.size}`);

  // 3) Verify Cape physics:
  //    a) Smooth walking cape (no erratic vertical jump between adjacent walk frames)
  //    b) Running cape billows far back
  //    c) Jump ascent -> apex -> descent transitions smoothly
  //    d) Double-jump (both flip and kick) hides the cape completely (0 cape pixels)
  const npcCape = Cast.generateNPC(505, { hair: 'short', hat: 'none', suit: 'roninCoat', shoes: 'combatBoots', back: 'cape', backColorIdx: 0 });
  const capeColors = new Set([npcCape.look.cols.back, npcCape.look.cols.backHi, npcCape.look.cols.backSh]);
  const P = Rig.poser(npcCape);

  const measureCape = (po: any, suit = false, phi = 0) => {
    const g = Rig.charGrid(npcCape, po, P.hyGround(po), 0, { suit, phi });
    let count = 0;
    let minCol = 999;
    let maxRowRel = -999;
    const sy = P.hyGround(po) - 6 + (po.bob || 0) + 32;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (capeColors.has(g[r][c])) {
          count++;
          if (c < minCol) minCol = c;
          if (r - sy > maxRowRel) maxRowRel = r - sy;
        }
      }
    }
    return { count, minCol, maxRowRel };
  };

  // a) Walking cape: vertical bottom relative to shoulder (maxRowRel) must stay steady (<=1px delta) across all 8 walk frames
  const walkMaxRows: number[] = [];
  for (let f = 0; f < 8; f++) {
    const m = measureCape(P.loco('walk', f));
    assert.ok(m.count >= 14, `Expected walking cape on frame ${f} to have >=14 pixels, got ${m.count}`);
    walkMaxRows.push(m.maxRowRel);
  }
  const walkRowSpan = Math.max(...walkMaxRows) - Math.min(...walkMaxRows);
  assert.ok(
    walkRowSpan <= 1,
    `Expected walking cape vertical bottom relative to shoulder to stay steady without vertical frame jumping (span <= 1px), got span=${walkRowSpan} (${walkMaxRows})`
  );

  // b) Running cape billows farther back than standing idle
  const idleM = measureCape(P.idleSide(0, false));
  let runMinCol = 999;
  for (let f = 0; f < 8; f++) {
    const rm = measureCape(P.loco('run', f));
    if (rm.minCol < runMinCol) runMinCol = rm.minCol;
  }
  assert.ok(runMinCol <= idleM.minCol - 4, `Expected running cape to billow farther back than idle (${runMinCol} vs ${idleM.minCol})`);

  // c) Jump ascent -> apex -> descent smooth transition across all 8 jump frames
  const airVs = [2.5, 1.6, 0.8, 0.4, 0.0, -0.8, -1.6, -2.6];
  const airBottoms = airVs.map((av) => measureCape(P.air(av)).maxRowRel);
  // Ascent (av=2.5) drapes down (maxRowRel >= 7), apex (av=0.0) is mid-transition (2..6), descent (av=-2.6) trails high (<= 2)
  assert.ok(airBottoms[0] >= 7, `Expected jump ascent start (av=2.5) cape to drape down (>=7), got ${airBottoms[0]}`);
  assert.ok(
    airBottoms[4] < airBottoms[0] && airBottoms[4] > airBottoms[7],
    `Expected jump apex (av=0.0) cape height (${airBottoms[4]}) to form an intermediate bridge between ascent (${airBottoms[0]}) and descent (${airBottoms[7]})`
  );
  for (let i = 1; i < airBottoms.length; i++) {
    const stepDelta = Math.abs(airBottoms[i] - airBottoms[i - 1]);
    assert.ok(
      stepDelta <= 3,
      `Expected smooth frame-to-frame cape height transition during jump (stepDelta <= 3px between frame ${i - 1} and ${i}), got ${stepDelta} (${airBottoms})`
    );
  }

  // d) Double-jump (both flip and kick) hides the cape completely (0 cape pixels) in both charGrid and 34 view
  for (let f = 0; f < 8; f++) {
    const fRes = P.flip((f / 8) * 0.24 + 0.001);
    const flipM = measureCape(fRes.po, false, fRes.phi);
    assert.equal(flipM.count, 0, `Expected cape to be completely hidden (0 px) during double-jump flip frame ${f}, got ${flipM.count}`);

    const kickPo = P.kick((f / 8) * 0.3);
    const kickM = measureCape(kickPo, true, 0);
    assert.equal(kickM.count, 0, `Expected cape to be completely hidden (0 px) during space-suit double-jump kick frame ${f}, got ${kickM.count}`);
  }
});

test('18. 15 Hairstyles (distinct side & 45° sprites, zero hair leakage above full-coverage hats) and 10 Idle Animations (distinct hand placements + active leg movements across 8-frame cycle)', () => {
  // 1) Verify all 15 hairstyles exist in Cast.NPC_PARTS.HAIR_STYLES, Rig.HEADS, and Rig.HEADS34
  assert.equal(Cast.NPC_PARTS.HAIR_STYLES.length, 15, 'Expected 15 hairstyles in Cast.NPC_PARTS.HAIR_STYLES');
  const sideHairSigs = new Set<string>();
  const v34HairSigs = new Set<string>();

  for (const hMeta of Cast.NPC_PARTS.HAIR_STYLES) {
    assert.ok(Rig.HEADS[hMeta.id], `Expected Rig.HEADS.${hMeta.id} to exist`);
    assert.ok(Rig.HEADS34[hMeta.id], `Expected Rig.HEADS34.${hMeta.id} to exist`);

    const npc = Cast.generateNPC(606, {
      hair: hMeta.id,
      hat: 'none',
      suit: 'tacticalTee',
      shoes: 'sneakers',
      back: 'none',
      skinIdx: 0,
      hairColorIdx: 3, // copperRed
      idle: 'free',
    });
    const bdSide = Rig.headLayerBreakdown(npc, false);
    const bd34 = Rig.headLayerBreakdown(npc, true);
    sideHairSigs.add(JSON.stringify(bdSide.hairLayer));
    v34HairSigs.add(JSON.stringify(bd34.hairLayer));
  }
  assert.equal(sideHairSigs.size, 15, `Expected all 15 hairstyles to produce distinct side-view hair layers, got ${sideHairSigs.size}`);
  assert.equal(v34HairSigs.size, 15, `Expected all 15 hairstyles to produce distinct 45°-view hair layers, got ${v34HairSigs.size}`);

  // 2) Verify all 16 everyday standing idle styles exist in Cast.NPC_PARTS.IDLES, Rig.IDLES34, and Rig.IDLES, with distinct hand placements, distinct leg stances, and smooth 8-frame transitions (no sudden leg jumps)
  assert.equal(Cast.NPC_PARTS.IDLES.length, 16, 'Expected 16 idle styles in Cast.NPC_PARTS.IDLES');
  const expectedIdleIds = [
    'free', 'hips', 'cross', 'pockets', 'backhands', 'salute', 'beltHook', 'crossLeg',
    'hug', 'think', 'collarFix', 'stretch', 'rubHands', 'headScratch', 'toeTap', 'lookout',
  ];
  assert.deepEqual(
    Cast.NPC_PARTS.IDLES.map((x: any) => x.id),
    expectedIdleIds,
    'Expected exact 16 everyday idle IDs in Cast.NPC_PARTS.IDLES'
  );

  const idle34ArmPoseSigs = new Set<string>();
  const idleSideArmPoseSigs = new Set<string>();
  const idle34LegPoseSigs = new Set<string>();
  const idleSideLegPoseSigs = new Set<string>();

  for (const idItem of Cast.NPC_PARTS.IDLES) {
    assert.ok(idItem.handDesc && idItem.handDesc.length > 4, `Expected handDesc for idle ${idItem.id}`);
    assert.ok(idItem.legDesc && idItem.legDesc.length > 4, `Expected legDesc for idle ${idItem.id}`);
    assert.equal(typeof Rig.IDLES34[idItem.id], 'function', `Expected Rig.IDLES34.${idItem.id} to be a function`);
    assert.equal(typeof Rig.IDLES[idItem.id], 'function', `Expected Rig.IDLES.${idItem.id} to be a function`);

    const npc = Cast.generateNPC(707, {
      hair: 'twintails',
      hat: 'none',
      suit: 'scholarVest',
      shoes: 'combatBoots',
      back: 'cape',
      idle: idItem.id,
    });
    const P = Rig.poser(npc);

    const leg34Set = new Set<string>();
    const legSideSet = new Set<string>();
    const arm34Seq: string[] = [];
    const armSideSeq: string[] = [];
    const leg34Seq: string[] = [];
    const legSideSeq: string[] = [];
    const po34Frames: any[] = [];
    const poSideFrames: any[] = [];

    for (let i = 0; i < 8; i++) {
      const t = i * 0.4;
      const po34 = P.idle(t, false);
      const poSide = P.idleSide(t, false);
      po34Frames.push(po34);
      poSideFrames.push(poSide);

      assert.equal(po34.v34, true, `Expected 45° idle (${idItem.id}) at frame ${i} to have v34=true`);
      if (idItem.id === 'backhands') {
        assert.equal(po34.behindBack, true, 'Expected backhands 45° idle to set behindBack=true');
        assert.equal(poSide.behindBack, true, 'Expected backhands side idle to set behindBack=true');
      }

      const l34 = `${Math.round(po34.nl[0])},${Math.round(po34.nl[1])}|${Math.round(po34.fl[0])},${Math.round(po34.fl[1])}`;
      const lSide = `${Math.round(poSide.nl[0])},${Math.round(poSide.nl[1])}|${Math.round(poSide.fl[0])},${Math.round(poSide.fl[1])}`;
      leg34Set.add(l34);
      legSideSet.add(lSide);
      leg34Seq.push(l34);
      legSideSeq.push(lSide);
      arm34Seq.push(`${Math.round(po34.na[0])},${Math.round(po34.na[1])}|${Math.round(po34.fa[0])},${Math.round(po34.fa[1])}|${!!po34.behindBack}`);
      armSideSeq.push(`${Math.round(poSide.na[0])},${Math.round(poSide.na[1])}|${Math.round(poSide.fa[0])},${Math.round(poSide.fa[1])}|${!!poSide.behindBack}`);

      // Verify rendered 48x46 canvas has zero out-of-bounds pixels in both 45° and side views
      for (const po of [po34, poSide]) {
        const g = Rig.charGrid(npc, po, P.hyGround(po), 0, { suit: false });
        let pxCount = 0;
        for (let r = 0; r < Rig.GH; r++) {
          for (let c = 0; c < Rig.GW; c++) {
            if (g[r][c]) {
              pxCount++;
              assert.ok(r >= 22 && r <= 78, `Expected idle ${idItem.id} frame ${i} row=${r} within [22..78]`);
              assert.ok(c >= 0 && c < Rig.GW, `Expected idle ${idItem.id} frame ${i} col=${c} within [0..${Rig.GW - 1}]`);
            }
          }
        }
        assert.ok(pxCount >= 35, `Expected idle ${idItem.id} frame ${i} to render >=35 pixels, got ${pxCount}`);
      }
    }

    // Verify smooth frame-to-frame leg transitions (no sudden leg jumps across adjacent frames i -> (i+1)%8)
    for (let i = 0; i < 8; i++) {
      const next = (i + 1) % 8;
      const d34Nl = Math.abs(po34Frames[next].nl[0] - po34Frames[i].nl[0]);
      const d34Fl = Math.abs(po34Frames[next].fl[0] - po34Frames[i].fl[0]);
      const dSideNl = Math.abs(poSideFrames[next].nl[0] - poSideFrames[i].nl[0]);
      const dSideFl = Math.abs(poSideFrames[next].fl[0] - poSideFrames[i].fl[0]);
      assert.ok(d34Nl <= 8 && d34Fl <= 8, `Expected smooth 45° leg transition in '${idItem.id}' frame ${i}->${next}, got dNl=${d34Nl}, dFl=${d34Fl}`);
      assert.ok(dSideNl <= 8 && dSideFl <= 8, `Expected smooth side leg transition in '${idItem.id}' frame ${i}->${next}, got dNl=${dSideNl}, dFl=${dSideFl}`);
    }

    assert.ok(
      leg34Set.size >= 2,
      `Expected 45° idle '${idItem.id}' to have active leg movement (>=2 distinct leg states across 8 frames), got ${leg34Set.size}`
    );
    assert.ok(
      legSideSet.size >= 2,
      `Expected side idle '${idItem.id}' to have active leg movement (>=2 distinct leg states across 8 frames), got ${legSideSet.size}`
    );

    idle34ArmPoseSigs.add(arm34Seq.join(';'));
    idleSideArmPoseSigs.add(armSideSeq.join(';'));
    idle34LegPoseSigs.add(leg34Seq.join(';'));
    idleSideLegPoseSigs.add(legSideSeq.join(';'));
  }

  assert.equal(idle34ArmPoseSigs.size, 16, `Expected all 16 45° idles to have distinct hand/arm sequences, got ${idle34ArmPoseSigs.size}`);
  assert.equal(idleSideArmPoseSigs.size, 16, `Expected all 16 side idles to have distinct hand/arm sequences, got ${idleSideArmPoseSigs.size}`);
  assert.equal(idle34LegPoseSigs.size, 16, `Expected all 16 45° idles to have distinct leg pose sequences, got ${idle34LegPoseSigs.size}`);
  assert.equal(idleSideLegPoseSigs.size, 16, `Expected all 16 side idles to have distinct leg pose sequences, got ${idleSideLegPoseSigs.size}`);
});

test('19. Three Humanoid Alien Races (Cathode-Folk, Myco-Hosts, Cinderborn) preserve human proportions, render exact head/torso/limb slots & dynamic micro-FX, and adapt to all 19 actions & 10 idles', () => {
  assert.ok(Rig.ALIEN_SPECIES && Rig.drawAlienHead && Rig.drawAlienTorso, 'Expected Rig.ALIEN_SPECIES, drawAlienHead, and drawAlienTorso to be exported');
  assert.ok(Cast.NPC_PARTS.SPECIES && Cast.generateAlienNPC, 'Expected Cast.NPC_PARTS.SPECIES and Cast.generateAlienNPC to be exported');
  assert.equal(Cast.NPC_PARTS.SPECIES.length, 4, 'Expected 4 species entries (human + 3 humanoid alien races)');

  const cathode = Cast.generateAlienNPC('cathode', 2026);
  const myco = Cast.generateAlienNPC('myco', 2027);
  const cinder = Cast.generateAlienNPC('cinder', 2028);

  // 1) Verify all 3 alien species share the standard human skeleton proportions
  for (const sp of [cathode, myco, cinder]) {
    assert.deepEqual(sp.build, Cast.NPC_PARTS.UNIFIED_BODY.build, `Expected ${sp.species} to preserve human skeleton proportions`);
  }

  // 2) Verify Cathode-Folk (显像管族):
  //    - 7×6 CRT TV head with cold grey-blue shell (#98a9be / #4f5d73), 5×4 pure black screen (#0d0f14), and 4~5 white ring pixels (#f4f7fc)
  //    - High-collar wasteland coat (#323946 / #455063) with ice-cyan chest LED (#6be6ff) preserved even when aiming a weapon
  //    - Pure black mechanical limbs (#12141a) with light-grey elbow/knee pivot pixels (#9aa4b8)
  //    - Dynamic Micro-FX: white ring floats 1px in idle; switches to bright cyan crosshair (#6be6ff) on shoot; flashes red/white snow static (#ff4d4d / #ffffff) on hurt
  {
    const P = Rig.poser(cathode);
    const poIdle0 = P.idleSide(0.0, false); // rest frame (t = 0.0)
    const poIdle1 = P.idleSide(0.4, false); // float frame (t = 0.4, white ring floats up 1px)
    const gIdle0 = Rig.charGrid(cathode, poIdle0, P.hyGround(poIdle0), 0, {});
    const gIdle1 = Rig.charGrid(cathode, poIdle1, P.hyGround(poIdle1), 0, {});

    const collectColorCoords = (grid: any, hex: string) => {
      const pts: Array<[number, number]> = [];
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (grid[r][c] === hex) pts.push([r, c]);
        }
      }
      return pts;
    };

    const ring0 = collectColorCoords(gIdle0, '#eef3fa');
    const ring1 = collectColorCoords(gIdle1, '#eef3fa');
    assert.equal(ring0.length, 5, `Expected 5 white pixels (#eef3fa) forming the broken minimal ring on Cathode screen, got ${ring0.length}`);
    assert.equal(ring1.length, 5, `Expected 5 white pixels (#eef3fa) on Cathode screen at bob=-1, got ${ring1.length}`);
    assert.notDeepEqual(ring0, ring1, 'Expected Cathode screen white ring to float vertically with idle breathing');
    assert.ok(collectColorCoords(gIdle0, '#7ec8e3').length >= 1, 'Expected cold-steel ice-cyan chest indicator pixel (#7ec8e3) on Cathode coat');
    assert.ok(collectColorCoords(gIdle0, '#9aa4b8').length >= 2, 'Expected light-grey elbow/knee pivot pixels (#9aa4b8) on Cathode mechanical limbs');

    // Firing instant: screen switches to bright cyan crosshair (#6be6ff inside head rows)
    const gShoot = Rig.charGrid(cathode, poIdle0, P.hyGround(poIdle0), 0, {
      weapon: { id: 'pistol', aim: 90, action: 'shoot', p: 0.14 },
    });
    const cyanPtsShoot = collectColorCoords(gShoot, '#6be6ff');
    assert.ok(
      cyanPtsShoot.length >= 5,
      `Expected Cathode screen to switch to 5px bright cyan crosshair (>=5 #6be6ff pixels) on shoot, got ${cyanPtsShoot.length}`
    );

    // Hurt instant: screen flashes red/white snow static (#ff4d4d and #ffffff)
    const gHurt = Rig.charGrid(cathode, poIdle0, P.hyGround(poIdle0), 0, { hurt: true });
    assert.ok(collectColorCoords(gHurt, '#ff4d4d').length >= 2, 'Expected red static pixels (#ff4d4d) on Cathode screen when hurt');
    assert.ok(collectColorCoords(gHurt, '#ffffff').length >= 2, 'Expected white static pixels (#ffffff) on Cathode screen when hurt');
  }

  // 3) Verify Myco-Hosts (孢子傀儡):
  //    - 12×5 flat giant red mushroom cap (#b8322a / #d14338 / #3d1e2e) + 3px glowing spore chain (#ffffff, #e6fff2, #b8ffd8)
  //    - Worn dark-brown spacesuit torso (#543d32) with 4×6 dorsal life-pack (#261c18 / #382924) and green mycelium (#4d8f52 / #6bc46f)
  //    - Dynamic Micro-FX: spore chain swings back by 1px during run; cap brims lift 1px in midair + red/green drifting spore pixels (#b8322a / #6eff82)
  {
    const P = Rig.poser(myco);
    const poIdle = P.idleSide(0, false);
    const gIdle = Rig.charGrid(myco, poIdle, P.hyGround(poIdle), 0, {});
    const findFirstCol = (grid: any, hex: string) => {
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (grid[r][c] === hex) return c;
        }
      }
      return -1;
    };
    const idleSporeCol = findFirstCol(gIdle, '#b8ffd8');
    assert.ok(idleSporeCol > 0, 'Expected glowing spore chain tip (#b8ffd8) on Myco-Host');

    const poRun = P.loco('run', 1);
    const gRun = Rig.charGrid(myco, poRun, P.hyGround(poRun), 0, {});
    const runSporeCol = findFirstCol(gRun, '#b8ffd8');
    assert.ok(runSporeCol !== idleSporeCol, 'Expected Myco-Host glowing spore pendant to lag/swing during running');

    const poAir = P.air(1.6);
    const gAir = Rig.charGrid(myco, poAir, P.hyGround(poAir), 0, {});
    const layersAir = Rig.charLayers(myco, poAir, P.hyGround(poAir), 0, {});
    const fxPixelsAir = layersAir.alienFX.flat().filter(Boolean).length;
    assert.equal(fxPixelsAir, 0, 'Expected Myco-Host alienFX layer to have ZERO resident floating particles');
    assert.ok(gAir.flat().filter(Boolean).length >= 50, 'Expected Myco-Host in midair to render full connected body and lifted cap');
  }

  // 4) Verify Cinderborn (烬骸族):
  //    - 6×6 jagged volcanic obsidian head (#1c1918 / #0f0d0d) with 2px golden vertical slit (#ffd23f)
  //    - 8×11 inverted-triangle black rock chestplate (#171515) + charred mantle (#332a27) + 2×3 Furnace Heart (#ffffff center, #ffd23f / #ff5a1f surround)
  //    - Rock-ridge forearm (#2e2725) with orange wrist fissure (#ff6a2b) and dark-orange sole ember (#e05319)
  //    - Zero resident floating particles beside the character
  {
    const P = Rig.poser(cinder);
    const poIdle = P.idleSide(0.0, false);
    const gIdle = Rig.charGrid(cinder, poIdle, P.hyGround(poIdle), 0, {});
    const layersIdle = Rig.charLayers(cinder, poIdle, P.hyGround(poIdle), 0, {});
    assert.equal(layersIdle.alienFX.flat().filter(Boolean).length, 0, 'Expected Cinderborn alienFX layer to have ZERO resident floating particles');
    const hasHex = (grid: any, hex: string) => grid.some((row: any[]) => row.includes(hex));
    assert.equal(hasHex(gIdle, '#ffffff'), true, 'Expected pure-white Furnace Heart core (#ffffff) on Cinderborn');
    assert.equal(hasHex(gIdle, '#ff5a1f'), true, 'Expected orange-red Furnace Heart surround (#ff5a1f) on Cinderborn');
    assert.equal(hasHex(gIdle, '#ff6a2b'), true, 'Expected glowing orange wrist fissure (#ff6a2b) on Cinderborn');
    assert.equal(hasHex(gIdle, '#e05319'), true, 'Expected dark-orange foot sole ember (#e05319) on Cinderborn');
  }

  // 5) Verify all 3 alien species render cleanly across all 19 actions and all 10 idles without out-of-bounds pixels or detached particles
  for (const alien of [cathode, myco, cinder]) {
    const P = Rig.poser(alien);
    for (const idItem of Cast.NPC_PARTS.IDLES) {
      const spIdle = Object.assign({}, alien, { idle: idItem.id });
      const PI = Rig.poser(spIdle);
      const po34 = PI.idle(0.4, false);
      const g34 = Rig.charGrid(spIdle, po34, PI.hyGround(po34), 0, {});
      assert.ok(g34.flat().filter(Boolean).length >= 35, `Expected ${alien.species} in idle ${idItem.id} to render >=35 pixels`);
      const poSide = PI.idleSide(0.4, false);
      const gSide = Rig.charGrid(spIdle, poSide, PI.hyGround(poSide), 0, {});
      assert.ok(gSide.flat().filter(Boolean).length >= 35, `Expected ${alien.species} in side idle ${idItem.id} to render >=35 pixels`);
    }
    const samplePoses = [
      { po: P.weaponIdle('blade', 0.4, false), wep: { id: 'blade', aim: 90, action: 'idle', p: 0.25, v34: true }, suit: false },
      { po: P.loco('walk', 2), wep: null, suit: false },
      { po: P.loco('run', 3), wep: { id: 'blade', aim: 90, action: 'combo1', p: 0.42 }, suit: false },
      { po: P.loco('runBack', 2), wep: { id: 'blade', aim: 90, action: 'combo3', p: 0.56 }, suit: false },
      { po: P.loco('sprint', 4), wep: { id: 'pistol', aim: 90, action: 'shoot', p: 0.14 }, suit: false },
      { po: P.air(1.6), wep: null, suit: false },
      { po: P.air(-1.6), wep: null, suit: true },
    ];
    for (const sp of samplePoses) {
      const layers = Rig.charLayers(alien, sp.po, P.hyGround(sp.po), 0, { suit: sp.suit, weapon: sp.wep });
      assert.equal(layers.alienFX.flat().filter(Boolean).length, 0, `Expected ${alien.species} alienFX layer to remain empty`);
      const g = layers.composite;
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (g[r][c]) {
            assert.ok(r >= 20 && r <= 95, `Expected ${alien.species} pixel row=${r} within 96x76 Inspector [20..95]`);
            assert.ok(c >= 0 && c < Rig.GW, `Expected ${alien.species} pixel col=${c} within [0..${Rig.GW - 1}]`);
          }
        }
      }
    }
  }
});

test('20. Myco-Hosts support connected stipe necks, 5 presets, and full modular randomization across 6 cap shapes, 7 cap palettes, 9 body builds, 7 suit palettes, and 10 idles', () => {
  assert.ok(Rig.MYCO_VARIANTS, 'Expected Rig.MYCO_VARIANTS to be exported');
  assert.equal(Cast.NPC_PARTS.MYCO_VARIANTS.length, 5, 'Expected 5 Myco-Host preset variants');
  assert.equal(Cast.NPC_PARTS.MYCO_CAP_SHAPES.length, 6, 'Expected 6 Myco-Host cap shapes');
  assert.equal(Cast.NPC_PARTS.MYCO_CAP_PALETTES.length, 7, 'Expected 7 Myco-Host cap palettes');
  assert.equal(Cast.NPC_PARTS.MYCO_BODY_BUILDS.length, 9, 'Expected 9 height/obesity/mechanical body builds');
  assert.equal(Cast.NPC_PARTS.MYCO_SUIT_PALETTES.length, 7, 'Expected 7 Myco-Host suit palettes');

  // 1) Verify all 5 presets produce distinct cap + radial gill matrices and connected stipe necks (zero empty horizontal rows between cap top and feet)
  const headSigs = new Set<string>();
  for (const mvMeta of Cast.NPC_PARTS.MYCO_VARIANTS) {
    const mvRig = Rig.MYCO_VARIANTS[mvMeta.id];
    const spec = Cast.generateAlienNPC('myco', 2026, { mycoVariant: mvMeta.id });
    const bd = Rig.headLayerBreakdown(spec, true);
    const flatHead = bd.baseHead.flat().filter(Boolean) as string[];
    assert.ok(
      flatHead.includes(mvRig.gillHi) || flatHead.includes(mvRig.gillMid),
      `Expected ${mvMeta.id} mushroom head to include bright radial gill rib colors`
    );
    assert.ok(flatHead.includes(mvRig.gillSh), `Expected ${mvMeta.id} mushroom head to include gill shadow groove color`);
    const sig = bd.baseHead.map((row: any[]) => row.map((v) => v || '.').join('')).join('|');
    headSigs.add(sig);

    // Check vertical continuity (neck connection) in both 45° and Side idle
    const P = Rig.poser(spec);
    for (const po of [P.idle(0.2, false), P.idleSide(0.2, false)]) {
      const g = Rig.charGrid(spec, po, P.hyGround(po), 0, {});
      let topRow = -1;
      let botRow = -1;
      for (let r = 0; r < Rig.GH; r++) {
        if (g[r].some(Boolean)) {
          if (topRow === -1) topRow = r;
          botRow = r;
        }
      }
      assert.ok(topRow > 0 && botRow > topRow, 'Expected non-empty character rows');
      for (let r = topRow; r <= botRow; r++) {
        assert.equal(
          g[r].some(Boolean),
          true,
          `Expected connected stipe neck with zero empty gap rows for ${mvMeta.id}, but row ${r} was empty between ${topRow}..${botRow}`
        );
      }
    }
  }
  assert.equal(headSigs.size, 5, 'Expected all 5 Myco-Host presets to produce distinct cap matrices');

  // 2) Verify modular free combination across all 6 cap shapes and all 9 body builds
  const shapeSigs = new Set<string>();
  for (const sh of Cast.NPC_PARTS.MYCO_CAP_SHAPES) {
    const spec = Cast.generateAlienNPC('myco', 3001, {
      mycoCapShape: sh.id,
      mycoCapColor: 'crimson',
      mycoBodyBuild: 'standard',
      mycoSuitColor: 'rustBark',
    });
    assert.equal(spec.mycoConfig.capShape, sh.id);
    const bd = Rig.headLayerBreakdown(spec, true);
    shapeSigs.add(bd.baseHead.map((row: any[]) => row.map((v) => v || '.').join('')).join('|'));
  }
  assert.equal(shapeSigs.size, 6, 'Expected all 6 modular cap shapes (including doubleTier) to produce distinct 3D mushroom cap silhouettes');

  // Verify height & obesity differences across the 9 bodyBuilds
  const buildMetrics: Record<string, { topRow: number; pixelCount: number }> = {};
  for (const bb of Cast.NPC_PARTS.MYCO_BODY_BUILDS) {
    const spec = Cast.generateAlienNPC('myco', 4001, {
      mycoCapShape: 'flatUmbrella',
      mycoCapColor: 'crimson',
      mycoBodyBuild: bb.id,
      mycoSuitColor: 'rustBark',
      idle: 'free',
    });
    assert.equal(spec.mycoConfig.bodyBuild, bb.id);
    const P = Rig.poser(spec);
    const po = P.idleSide(0, false);
    const g = Rig.charGrid(spec, po, P.hyGround(po), 0, {});
    let topRow = 999;
    let pixelCount = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (g[r][c]) {
          if (r < topRow) topRow = r;
          pixelCount++;
        }
      }
    }
    buildMetrics[bb.id] = { topRow, pixelCount };
  }
  assert.ok(
    buildMetrics.slender.topRow < buildMetrics.standard.topRow,
    `Expected slender Myco-Host (topRow=${buildMetrics.slender.topRow}) to stand taller than standard (${buildMetrics.standard.topRow})`
  );
  assert.ok(
    buildMetrics.shortChubby.topRow > buildMetrics.standard.topRow,
    `Expected shortChubby Myco-Host (topRow=${buildMetrics.shortChubby.topRow}) to be shorter than standard (${buildMetrics.standard.topRow})`
  );
  assert.ok(
    buildMetrics.chubby.pixelCount > buildMetrics.standard.pixelCount,
    `Expected chubby Myco-Host (pixels=${buildMetrics.chubby.pixelCount}) to have a fuller torso than standard (${buildMetrics.standard.pixelCount})`
  );
});

test('21. Myco-Hosts lock head & body to unified color tones, and Cathode-Folk use 8 industrial mechanical color themes across 10 monitor head shapes, 9 body variants, 6 screen motifs, and clean backs on chubby/shortChubby', () => {
  // 1) Verify Myco-Hosts head & body always share a unified color tone (capPal.suitColorId === spec.mycoSuitColor)
  const capPals = Cast.NPC_PARTS.MYCO_CAP_PALETTES;
  const suitPals = Cast.NPC_PARTS.MYCO_SUIT_PALETTES;
  assert.equal(capPals.length, 7);
  assert.equal(suitPals.length, 7);

  for (let k = 0; k < capPals.length; k++) {
    const cp = capPals[k];
    const sp = suitPals[k];
    assert.equal(cp.suitColorId, sp.id, `Expected cap palette ${cp.id} to pair with suit palette ${sp.id}`);
    assert.equal(sp.capColorId, cp.id, `Expected suit palette ${sp.id} to pair with cap palette ${cp.id}`);

    // Even if a caller passes a mismatched suitColor, generateAlienNPC locks head & body to the unified color theme
    const mSpec = Cast.generateAlienNPC('myco', 5000 + k, {
      mycoCapShape: 'flatUmbrella',
      mycoCapColor: cp.id,
      mycoSuitColor: 'frostSlate',
    });
    assert.equal(mSpec.mycoCapColor, cp.id);
    assert.equal(
      mSpec.mycoSuitColor,
      sp.id,
      `Expected Myco-Host with capColor=${cp.id} to lock body suitColor to unified tone ${sp.id}, got ${mSpec.mycoSuitColor}`
    );
  }

  // Verify random batch of 16 Myco-Hosts has 100% unified head & body color tones
  const mycoBatch = Cast.generateNPCBatch(16, 8888, { species: 'myco' });
  for (const mNpc of mycoBatch) {
    const cp = capPals.find((x: any) => x.id === mNpc.mycoCapColor);
    assert.ok(cp, `Expected valid cap palette for ${mNpc.id}`);
    assert.equal(
      mNpc.mycoSuitColor,
      cp.suitColorId,
      `Expected batch Myco-Host ${mNpc.id} to keep head (${mNpc.mycoCapColor}) and body (${mNpc.mycoSuitColor}) in the same color tone (${cp.suitColorId})`
    );
  }

  // 2) Verify Cathode-Folk 8 variants, 10 monitor shapes, 6 animated screen motifs, 9 body variants, and 8 mechanical color themes
  assert.ok(Rig.CATHODE_VARIANTS, 'Expected Rig.CATHODE_VARIANTS to be exported');
  assert.equal(Cast.NPC_PARTS.CATHODE_VARIANTS.length, 8, 'Expected 8 Cathode-Folk preset variants');
  assert.equal(Cast.NPC_PARTS.CATHODE_HEAD_SHAPES.length, 10, 'Expected 10 Cathode-Folk monitor head shapes');
  assert.equal(Cast.NPC_PARTS.CATHODE_SCREEN_MOTIFS.length, 6, 'Expected 6 Cathode-Folk animated screen motifs');
  assert.equal(Cast.NPC_PARTS.CATHODE_COLOR_THEMES.length, 8, 'Expected 8 Cathode-Folk industrial mechanical color themes');

  // Verify all 8 Cathode-Folk preset variants produce distinct sprites and connected necks
  const cathodeVariantSigs = new Set<string>();
  for (const cvMeta of Cast.NPC_PARTS.CATHODE_VARIANTS) {
    const cSpec = Cast.generateAlienNPC('cathode', 6000, { cathodeVariant: cvMeta.id });
    assert.equal(cSpec.cathodeHeadShape, cvMeta.headShape);
    assert.equal(cSpec.cathodeScreenMotif, cvMeta.screenMotif);
    assert.equal(cSpec.bodyBuild, cvMeta.bodyBuild);

    const P = Rig.poser(cSpec);
    for (const po of [P.idle(0.0, false), P.idleSide(0.0, false)]) {
      const g = Rig.charGrid(cSpec, po, P.hyGround(po), 0, {});
      let topRow = -1;
      let botRow = -1;
      for (let r = 0; r < Rig.GH; r++) {
        if (g[r].some(Boolean)) {
          if (topRow === -1) topRow = r;
          botRow = r;
        }
      }
      assert.ok(topRow > 0 && botRow > topRow, `Expected non-empty rows for Cathode variant ${cvMeta.id}`);
      for (let r = topRow; r <= botRow; r++) {
        assert.equal(
          g[r].some(Boolean),
          true,
          `Expected connected hydraulic neck with zero empty gap rows for Cathode variant ${cvMeta.id}, but row ${r} was empty between ${topRow}..${botRow}`
        );
      }
    }
    const bd = Rig.headLayerBreakdown(cSpec, true);
    cathodeVariantSigs.add(JSON.stringify(bd.fullChar));
  }
  assert.equal(cathodeVariantSigs.size, 8, 'Expected all 8 Cathode-Folk variants to produce distinct full character sprites');

  // Verify all 10 monitor shapes produce distinct head silhouettes
  const monitorShapeSigs = new Set<string>();
  for (const sh of Cast.NPC_PARTS.CATHODE_HEAD_SHAPES) {
    const cSpec = Cast.generateAlienNPC('cathode', 7000, {
      cathodeHeadShape: sh.id,
      cathodeScreenMotif: 'ring',
      cathodeBodyBuild: 'standard',
      cathodeColorTheme: 'polarBlue',
    });
    const bd = Rig.headLayerBreakdown(cSpec, true);
    monitorShapeSigs.add(bd.baseHead.map((row: any[]) => row.map((v) => v || '.').join('')).join('|'));
  }
  assert.equal(
    monitorShapeSigs.size,
    10,
    'Expected all 10 Cathode monitor shapes to produce distinct head matrices'
  );

  // Verify chubby and shortChubby have NO weird protruding back boxes (local x <= 11 in torso rows) during 45° idle, side idle, and run
  for (const bBuild of ['chubby', 'shortChubby', 'exoFrame', 'pistonHulk', 'ponchoMech']) {
    const cSpec = Cast.generateAlienNPC('cathode', 7200, {
      cathodeHeadShape: 'crtBox',
      cathodeScreenMotif: 'ring',
      cathodeBodyBuild: bBuild,
      cathodeColorTheme: 'gunmetal',
      idle: 'backhands',
    });
    const P = Rig.poser(cSpec);
    for (const po of [P.idle(0.2, false), P.idleSide(0.2, false)]) {
      const hy = P.hyGround(po);
      const g = Rig.charGrid(cSpec, po, hy, 0, {});
      // Torso rows: hy - 5 .. hy (grid row = y + 32)
      for (let y = hy - 5; y <= hy - 1; y++) {
        for (let lx = 0; lx <= 10; lx++) {
          assert.equal(
            g[y + 32][lx + Rig.GX],
            null,
            `Expected zero weird back protrusion at local x=${lx}, y=${y} on Cathode bodyBuild=${bBuild} during idle`
          );
        }
      }
    }
  }

  // Verify all 6 screen motifs (ring, heartbeat, eyeScan, hourglass, equalizer, radarTri) produce distinct screen patterns AND animate across idle breathing frames
  const motifSigs = new Set<string>();
  for (const mf of Cast.NPC_PARTS.CATHODE_SCREEN_MOTIFS) {
    const cSpec = Cast.generateAlienNPC('cathode', 7100, {
      cathodeHeadShape: 'hexOctagon',
      cathodeScreenMotif: mf.id,
      cathodeBodyBuild: 'standard',
      cathodeColorTheme: 'polarBlue',
      idle: 'free',
    });
    const P = Rig.poser(cSpec);
    const po0 = P.idleSide(0.0, false); // bob = 0
    const po1 = P.idleSide(0.4, false); // bob = -1
    const g0 = Rig.charGrid(cSpec, po0, P.hyGround(po0), 0, {});
    const g1 = Rig.charGrid(cSpec, po1, P.hyGround(po1), 0, {});

    // Extract screen pixels (#eef3fa or #7ec8e3) relative to head oy so we compare internal screen animation
    const oy0 = P.hyGround(po0) - 6 + (po0.bob || 0) - 5 + 32;
    const oy1 = P.hyGround(po1) - 6 + (po1.bob || 0) - 5 + 32;
    const relScreen0: string[] = [];
    const relScreen1: string[] = [];
    for (let dy = -3; dy <= 5; dy++) {
      for (let c = 0; c < Rig.GW; c++) {
        const col0 = g0[oy0 + dy]?.[c];
        const col1 = g1[oy1 + dy]?.[c];
        if (col0 === '#eef3fa' || col0 === '#7ec8e3' || col0 === '#ffffff') relScreen0.push(`${dy},${c}:${col0}`);
        if (col1 === '#eef3fa' || col1 === '#7ec8e3' || col1 === '#ffffff') relScreen1.push(`${dy},${c}:${col1}`);
      }
    }
    assert.ok(relScreen0.length >= 4, `Expected screen motif ${mf.id} to render >=4 active screen pixels`);
    assert.notDeepEqual(
      relScreen0,
      relScreen1,
      `Expected Cathode idle screen motif '${mf.id}' to dynamically animate between idle phase 0 and phase 1`
    );
    motifSigs.add(relScreen0.join('|'));
  }
  assert.equal(motifSigs.size, 6, 'Expected all 6 Cathode screen motifs to produce distinct screen patterns');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 22: Cinderborn (烬骸族) 12 Preset Variants + Modular Randomizer
// (8 Obsidian/Volcanic Head Shapes, 6 Furnace Heart Motifs, 9 Body Builds, 12 Color Themes)
// ─────────────────────────────────────────────────────────────────────────────
test('Cinderborn (cinder) supports 12 preset variants, 12 distinct mineral/magma color themes, and modular headShape + coreMotif + bodyBuild + colorTheme combinations', () => {
  assert.ok(Rig.CINDER_VARIANTS && typeof Rig.CINDER_VARIANTS === 'object', 'Expected Rig.CINDER_VARIANTS to be exported');
  assert.equal(Object.keys(Rig.CINDER_VARIANTS).length, 12, 'Expected 12 Cinderborn preset variants in Rig.CINDER_VARIANTS');
  assert.equal(Cast.NPC_PARTS.CINDER_VARIANTS.length, 12, 'Expected 12 Cinderborn variants in Cast.NPC_PARTS');
  assert.equal(Cast.NPC_PARTS.CINDER_HEAD_SHAPES.length, 8, 'Expected 8 Cinderborn head shapes in Cast.NPC_PARTS');
  assert.equal(Cast.NPC_PARTS.CINDER_CORE_MOTIFS.length, 6, 'Expected 6 Cinderborn core motifs in Cast.NPC_PARTS');
  assert.equal(Cast.NPC_PARTS.CINDER_COLOR_THEMES.length, 12, 'Expected 12 Cinderborn color themes in Cast.NPC_PARTS');

  // Verify all 12 preset variants generate distinct sprites with connected necks
  const presetSignatures = new Set<string>();
  for (const cv of Cast.NPC_PARTS.CINDER_VARIANTS) {
    const cSpec = Cast.generateAlienNPC('cinder', 8800, { cinderVariant: cv.id });
    assert.equal(cSpec.species, 'cinder');
    assert.equal(cSpec.cinderVariant, cv.id);

    const P = Rig.poser(cSpec);
    const po = P.idleSide(0.0, false);
    const hy = P.hyGround(po);
    const g = Rig.charGrid(cSpec, po, hy, 0, {});

    // Verify connected neck (zero empty gap rows between topRow and botRow)
    let topRow = 999;
    let botRow = -1;
    for (let r = 0; r < Rig.GH; r++) {
      let hasPx = false;
      for (let c = 0; c < Rig.GW; c++) {
        if (g[r][c] !== null) { hasPx = true; break; }
      }
      if (hasPx) {
        if (r < topRow) topRow = r;
        if (r > botRow) botRow = r;
      }
    }
    for (let r = topRow; r <= botRow; r++) {
      let rowHasPx = false;
      for (let c = 0; c < Rig.GW; c++) {
        if (g[r][c] !== null) { rowHasPx = true; break; }
      }
      assert.ok(
        rowHasPx,
        `Expected connected neck (no empty gap row at r=${r}) on Cinderborn variant ${cv.id}`
      );
    }

    const sig = g
      .map((row: (string | null)[]) => row.map((v) => v || '.').join(''))
      .join('\n');
    presetSignatures.add(sig);
  }
  assert.equal(
    presetSignatures.size,
    12,
    'Expected all 12 Cinderborn preset variants to produce distinct full-body sprites'
  );

  // Verify all 12 Cinderborn color themes produce distinct colored sprites even with identical head/body/motif
  const colorThemeSigs = new Set<string>();
  for (const ct of Cast.NPC_PARTS.CINDER_COLOR_THEMES) {
    const cSpec = Cast.generateAlienNPC('cinder', 8900, {
      cinderHeadShape: 'twinHorn',
      cinderCoreMotif: 'crossForge',
      cinderBodyBuild: 'standard',
      cinderColorTheme: ct.id,
      idle: 'beltHook',
    });
    const P = Rig.poser(cSpec);
    const po = P.idle(0.0, false);
    const g = Rig.charGrid(cSpec, po, P.hyGround(po), 0, {});
    colorThemeSigs.add(JSON.stringify(g));
  }
  assert.equal(
    colorThemeSigs.size,
    12,
    'Expected all 12 Cinderborn color themes to produce distinct colored sprites'
  );

  // Verify all 8 volcanic/obsidian head shapes render distinct head pixel silhouettes
  const headShapeSigs = new Set<string>();
  for (const hs of Cast.NPC_PARTS.CINDER_HEAD_SHAPES) {
    const cSpec = Cast.generateAlienNPC('cinder', 8001, {
      cinderHeadShape: hs.id,
      cinderCoreMotif: 'vertSlit',
      cinderBodyBuild: 'standard',
      cinderColorTheme: 'obsidianGold',
      idle: 'lookout',
    });
    const hb = Rig.headLayerBreakdown(cSpec);
    const sig = hb.baseHead
      .map((row: (string | null)[]) => row.map((v) => (v ? '#' : '.')).join(''))
      .join('\n');
    headShapeSigs.add(sig);
  }
  assert.equal(
    headShapeSigs.size,
    8,
    'Expected all 8 Cinderborn head shapes to produce distinct head matrices'
  );

  // Verify chubby, shortChubby, exoFrame, pistonHulk, and ponchoMech have zero weird back protrusions (lx <= 10)
  for (const bBuild of ['chubby', 'shortChubby', 'exoFrame', 'pistonHulk', 'ponchoMech']) {
    const cSpec = Cast.generateAlienNPC('cinder', 8200, {
      cinderHeadShape: 'jaggedCrag',
      cinderCoreMotif: 'vertSlit',
      cinderBodyBuild: bBuild,
      cinderColorTheme: 'obsidianGold',
      idle: 'lookout',
    });
    const P = Rig.poser(cSpec);
    for (const po of [P.idle(0.2, false), P.idleSide(0.2, false)]) {
      const hy = P.hyGround(po);
      const g = Rig.charGrid(cSpec, po, hy, 0, {});
      for (let y = hy - 5; y <= hy - 1; y++) {
        for (let lx = 0; lx <= 10; lx++) {
          assert.equal(
            g[y + 32][lx + Rig.GX],
            null,
            `Expected zero weird back protrusion at local x=${lx}, y=${y} on Cinderborn bodyBuild=${bBuild} during idle`
          );
        }
      }
    }
  }

  // Verify all 6 Furnace Heart core motifs produce distinct core/face patterns AND animate across idle breathing frames
  const coreMotifSigs = new Set<string>();
  for (const mf of Cast.NPC_PARTS.CINDER_CORE_MOTIFS) {
    const cSpec = Cast.generateAlienNPC('cinder', 8100, {
      cinderHeadShape: 'jaggedCrag',
      cinderCoreMotif: mf.id,
      cinderBodyBuild: 'standard',
      cinderColorTheme: 'obsidianGold',
      idle: 'free',
    });
    const P = Rig.poser(cSpec);
    const po0 = P.idleSide(0.0, false); // bob = 0 -> flameUp = 0
    const po1 = P.idleSide(0.4, false); // bob = -1 -> flameUp = -1
    const g0 = Rig.charGrid(cSpec, po0, P.hyGround(po0), 0, {});
    const g1 = Rig.charGrid(cSpec, po1, P.hyGround(po1), 0, {});

    // Extract bright core/flame pixels (#ffffff, #ffd23f, #ff5a1f) relative to torso ty
    const ty0 = P.hyGround(po0) - 6 + (po0.bob || 0) + 32;
    const ty1 = P.hyGround(po1) - 6 + (po1.bob || 0) + 32;
    const relCore0: string[] = [];
    const relCore1: string[] = [];
    for (let dy = -6; dy <= 6; dy++) {
      for (let c = 0; c < Rig.GW; c++) {
        const col0 = g0[ty0 + dy]?.[c];
        const col1 = g1[ty1 + dy]?.[c];
        if (col0 === '#ffffff' || col0 === '#ffd23f' || col0 === '#ff5a1f') relCore0.push(`${dy},${c}:${col0}`);
        if (col1 === '#ffffff' || col1 === '#ffd23f' || col1 === '#ff5a1f') relCore1.push(`${dy},${c}:${col1}`);
      }
    }
    assert.ok(relCore0.length >= 4, `Expected Cinderborn core motif ${mf.id} to render >=4 flame pixels`);
    assert.notDeepEqual(
      relCore0,
      relCore1,
      `Expected Cinderborn core motif '${mf.id}' to dynamically jump 1px between idle phase 0 and phase 1`
    );
    coreMotifSigs.add(relCore0.join('|'));
  }
  assert.equal(coreMotifSigs.size, 6, 'Expected all 6 Cinderborn core motifs to produce distinct flame patterns');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 23: Extra-Long Iron Katana (Sheathed Akimbo Idle, 4-Stage Reference Combo, Sheathed Star + 3 Vertical Crescent Tears)
// & Iron Greatsword (3-Stage Combo) Decoupled Arm + Weapon Layer Architecture
// ─────────────────────────────────────────────────────────────────────────────
test('23. Extra-Long Iron Katana (Stage 1 blade-attached aim-rotating 3D crescent, 4-stage combo, detached 3-slash skill) and Colossal Iron Greatsword (shoulder-carry idle & walk, 4-stage 3-beat heavy combo + 360° whirlwind finisher) work across all characters and procedural NPCs', () => {
  assert.ok(Rig.WEAPONS.katana, 'Expected Rig.WEAPONS.katana to be defined');
  assert.ok(Rig.WEAPONS.greatsword, 'Expected Rig.WEAPONS.greatsword to be defined');
  assert.equal(Rig.WEAPONS.katana.comboCount, 4, 'Expected Katana comboCount = 4');
  assert.equal(Rig.WEAPONS.greatsword.comboCount, 4, 'Expected Greatsword comboCount = 4');
  assert.ok(Rig.KATANA_ACT_KF && Rig.GREATSWORD_ACT_KF, 'Expected KATANA_ACT_KF and GREATSWORD_ACT_KF to be exported');

  // 1) Verify Katana stays SHEATHED with one hand gripping the hilt during 45° idle, side idle, walking, running, and aiming
  {
    const xing = Cast.CAST[5];
    const P = Rig.poser(xing);
    const poIdle34 = P.weaponIdle('katana', 0.2, false);
    assert.deepEqual(poIdle34.na, [-42, 44], 'Expected Katana 45° idle front hand to rest akimbo on hip (na=[-42, 44])');
    assert.deepEqual(poIdle34.fa, [26, -10], 'Expected Katana 45° idle back hand to grip hilt at waist (fa=[26, -10])');
    const wpIdle34 = Rig.computeWeaponPose({ id: 'katana', aim: 90, action: 'idle', p: 0.2, v34: true });
    assert.equal(wpIdle34.sheathed, true, 'Expected Katana to be sheathed inside waist scabbard during 45° idle');
    const wpWalkAim = Rig.computeWeaponPose({ id: 'katana', aim: 90, action: 'aim', p: 0, v34: false });
    assert.equal(wpWalkAim.sheathed, true, 'Expected Katana to stay sheathed inside waist scabbard while walking/running (action=aim)');
    assert.deepEqual(wpWalkAim.na, [-18, 42], 'Expected Katana walking/aiming hand to grip hilt at waist (na=[-18, 42])');
  }

  // 2) Verify Extra-Long 20px Waist Scabbard & Katana Stage 1 slash trail attached to blade AND rotating with mouse aim
  {
    const xing = Cast.CAST[5];
    const P = Rig.poser(xing);
    const poSide = P.idleSide(0, false);
    // Sheathed state: verify lengthened 20px scabbard + hilt spans >= 18 columns across the waist
    const layersSheathed: any = Rig.charLayers(xing, poSide, P.hyGround(poSide), 0, {
      weapon: { id: 'katana', aim: 90, action: 'aim', p: 0 },
    });
    let minScabCol = Rig.GW, maxScabCol = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (layersSheathed.weapon[r][c]) {
          if (c < minScabCol) minScabCol = c;
          if (c > maxScabCol) maxScabCol = c;
        }
      }
    }
    assert.ok(maxScabCol - minScabCol >= 18, `Expected lengthened 20px Katana scabbard + hilt to span >= 18 columns, got ${maxScabCol - minScabCol}`);

    // Verify Katana Stage 1 (combo1) slash trail rotates with mouse aim (aim=60° vs aim=90° vs aim=120°)
    const getKatanaC1Centroid = (aimDeg: number) => {
      const l: any = Rig.charLayers(xing, poSide, P.hyGround(poSide), 0, {
        weapon: { id: 'katana', aim: aimDeg, action: 'combo1', p: 0.28 },
      });
      let sumR = 0, sumC = 0, cnt = 0;
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 22 + Rig.GX; c < Rig.GW; c++) {
          if (l.weapon[r][c]) {
            sumR += r;
            sumC += c;
            cnt++;
          }
        }
      }
      return { r: sumR / Math.max(1, cnt), c: sumC / Math.max(1, cnt), cnt };
    };
    const c1AimUp = getKatanaC1Centroid(120);   // aiming up-forward -> lower row index
    const c1AimMid = getKatanaC1Centroid(90);   // aiming straight forward
    const c1AimDown = getKatanaC1Centroid(60);  // aiming down-forward -> higher row index
    assert.ok(
      c1AimUp.r < c1AimMid.r - 2.5 && c1AimDown.r > c1AimMid.r + 2.5,
      `Expected Katana Hit 1 slash trail to rotate with mouse aim: aim=120 row=${c1AimUp.r.toFixed(1)}, aim=90 row=${c1AimMid.r.toFixed(1)}, aim=60 row=${c1AimDown.r.toFixed(1)}`
    );
  }

  // 3) Verify Katana 3-Beat Slash Rhythm & 4-Stage Combo + Detached Skill Layer
  {
    assert.deepEqual(
      Rig.WEAPONS.katana.comboDurs,
      [0.38, 0.24, 0.24, 0.52],
      'Expected Katana comboDurs to have faster 0.24s playback on stages 2 & 3 for rapid Up-Down double slash'
    );

    const expectedStyles: Record<string, { style: string; endAng: number; beat2P: number; beat3P: number }> = {
      combo1: { style: 'katanaHoriz3D', endAng: 126, beat2P: 0.28, beat3P: 0.56 },
      combo2: { style: 'katanaFastUp', endAng: 164, beat2P: 0.28, beat3P: 0.56 },
      combo3: { style: 'katanaFastDown', endAng: 66, beat2P: 0.28, beat3P: 0.56 },
      combo4: { style: 'katanaDaiJodan', endAng: 50, beat2P: 0.56, beat3P: 0.70 },
    };

    for (const act of ['combo1', 'combo2', 'combo3', 'combo4']) {
      const cfg = expectedStyles[act];
      const beat1 = Rig.computeWeaponPose({ id: 'katana', aim: 90, action: act, p: 0.14 });
      const beat2 = Rig.computeWeaponPose({ id: 'katana', aim: 90, action: act, p: cfg.beat2P });
      const beat3 = Rig.computeWeaponPose({ id: 'katana', aim: 90, action: act, p: cfg.beat3P });

      assert.equal(beat1.trailFrom, null, `Expected ${act} Beat 1 (windup) to have trailFrom === null`);
      assert.equal(beat2.gunAng, cfg.endAng, `Expected ${act} Beat 2 end angle = ${cfg.endAng}`);
      assert.equal(beat2.slashStyle, cfg.style, `Expected ${act} slashStyle = ${cfg.style}`);
      assert.equal(beat2.slashRetract, 0, `Expected ${act} Beat 2 to have full trail (slashRetract = 0)`);
      assert.equal(beat3.gunAng, beat2.gunAng, `Expected ${act} Beat 3 to keep weapon angle frozen at ${beat2.gunAng}`);
      assert.deepEqual(beat3.na, beat2.na, `Expected ${act} Beat 3 to keep front arm frozen`);
      assert.deepEqual(beat3.fa, beat2.fa, `Expected ${act} Beat 3 to keep back arm frozen`);
      assert.equal(beat3.slashRetract, 0.5, `Expected ${act} Beat 3 to retract trail by half (slashRetract = 0.5)`);
    }
  }

  // 4) Verify Colossal Iron Greatsword: Shoulder-Carry in Both 45° Idle AND Side Walk/Run, Colossal Slab Proportions, and 2-Stage 3-Beat Heavy Combo
  {
    const lin = Cast.CAST[0];
    const P = Rig.poser(lin);

    // 4a) Shoulder-carry stance in 45° idle AND side walk/run/aim
    const poGsIdle34 = P.weaponIdle('greatsword', 0.2, false);
    assert.deepEqual(poGsIdle34.na, [32, 146], 'Expected Greatsword 45° idle front arm to bend up holding hilt at shoulder (na=[32, 146])');
    assert.deepEqual(poGsIdle34.fa, [24, -12], 'Expected Greatsword 45° idle back arm to balance at waist (fa=[24, -12])');
    const wpGsIdle34 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'idle', p: 0.2, v34: true });
    assert.equal(wpGsIdle34.shoulderCarry, true, 'Expected Greatsword 45° idle to have shoulderCarry = true');
    assert.equal(wpGsIdle34.gunAng, -126, 'Expected Greatsword 45° idle blade resting diagonally over shoulder (gunAng = -126°)');

    const wpGsWalk = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'aim', p: 0, v34: false });
    assert.equal(wpGsWalk.shoulderCarry, true, 'Expected Greatsword walking/running (action=aim) to keep shoulderCarry = true');
    assert.equal(wpGsWalk.gunAng, -130, 'Expected Greatsword walking/running blade resting on shoulder (gunAng = -130°)');
    assert.deepEqual(wpGsWalk.na, [36, 142], 'Expected Greatsword walking/running front arm to hold hilt on shoulder (na=[36, 142])');

    // Verify colossal Greatsword silhouette size in shoulder-carry side view (spans >= 18px horizontally and >= 16px vertically)
    const poWalk = P.loco('walk', 1);
    const layersGsWalk: any = Rig.charLayers(lin, poWalk, P.hyGround(poWalk), 0, {
      weapon: { id: 'greatsword', aim: 90, action: 'aim', p: 0 },
    });
    let minGsC = Rig.GW, maxGsC = 0, minGsR = Rig.GH, maxGsR = 0, gsPix = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (layersGsWalk.weapon[r][c]) {
          gsPix++;
          if (c < minGsC) minGsC = c;
          if (c > maxGsC) maxGsC = c;
          if (r < minGsR) minGsR = r;
          if (r > maxGsR) maxGsR = r;
        }
      }
    }
    assert.ok(
      maxGsC - minGsC >= 18 && maxGsR - minGsR >= 16 && gsPix >= 95,
      `Expected colossal shoulder-carried Greatsword sprite to span >=18 cols, >=16 rows, and >=95 pixels, got cols=${maxGsC - minGsC}, rows=${maxGsR - minGsR}, pix=${gsPix}`
    );

    // 4b) Verify Greatsword 4-stage heavy combo (including 360° Whirlwind Cleave with spinFlip character turn) + 16-frame Savage Lion's Claw skill
    assert.equal(Rig.WEAPONS.greatsword.comboCount, 4, 'Expected Greatsword comboCount to be upgraded to 4');
    const gsExpected: Record<string, { style: string; endAng: number }> = {
      combo1: { style: 'gsColossalUp3D', endAng: 152 },
      combo2: { style: 'gsWideSweep3D', endAng: 116 },
      combo3: { style: 'gsEarthShatter3D', endAng: 68 },
      combo4: { style: 'gsWhirlwind3D', endAng: 106 },
    };
    for (const act of ['combo1', 'combo2', 'combo3', 'combo4']) {
      const cfg = gsExpected[act];
      const b1 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: act, p: 0.14 });
      const b2 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: act, p: 0.42 });
      const b3 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: act, p: 0.70 });

      assert.equal(b1.trailFrom, null, `Expected Greatsword ${act} Beat 1 (p=0.14) windup to have trailFrom === null`);
      assert.equal(b2.gunAng, cfg.endAng, `Expected Greatsword ${act} Beat 2 (p=0.42) end angle = ${cfg.endAng}`);
      assert.equal(b2.slashStyle, cfg.style, `Expected Greatsword ${act} Beat 2 slashStyle = ${cfg.style}`);
      assert.equal(b2.slashRetract, 0, `Expected Greatsword ${act} Beat 2 full trail (slashRetract = 0)`);

      assert.equal(b3.gunAng, b2.gunAng, `Expected Greatsword ${act} Beat 3 (p=0.70) to freeze weapon angle at ${b2.gunAng}`);
      assert.deepEqual(b3.na, b2.na, `Expected Greatsword ${act} Beat 3 to freeze front arm`);
      assert.deepEqual(b3.fa, b2.fa, `Expected Greatsword ${act} Beat 3 to freeze back arm`);
      assert.equal(b3.slashRetract, 0.5, `Expected Greatsword ${act} Beat 3 to retract slash trail by half (slashRetract = 0.5)`);

      if (act !== 'combo4') {
        const tailEnd = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: act, p: 0.99 });
        assert.equal(tailEnd.gunAng, cfg.endAng, `Expected Greatsword ${act} p=0.99 to hold finished slash angle (${cfg.endAng}) without flashing next windup`);
      }
    }

    // Verify Greatsword combo4 Whirlwind character turn (spinFlip = true at p=0.28 flips body horizontally around hipCol, then snaps back at p=0.42)
    const poStand = P.idleSide(0, false);
    const wpWhirlTurn = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'combo4', p: 0.28 });
    const wpWhirlFront = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'combo4', p: 0.42 });
    assert.equal(wpWhirlTurn.spinFlip, true, 'Expected Greatsword combo4 p=0.28 to enable spinFlip character turn');
    assert.equal(wpWhirlFront.spinFlip, false, 'Expected Greatsword combo4 p=0.42 to turn back forward (spinFlip = false)');
    const lTurn: any = Rig.charLayers(lin, poStand, P.hyGround(poStand), 0, { weapon: { id: 'greatsword', aim: 90, action: 'combo4', p: 0.28 } });
    const lFront: any = Rig.charLayers(lin, poStand, P.hyGround(poStand), 0, { weapon: { id: 'greatsword', aim: 90, action: 'combo4', p: 0.42 } });
    const headAvgCol = (grid: any) => {
      let sc = 0, n = 0;
      for (let r = 46; r <= 58; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (grid[r][c]) { sc += c; n++; }
        }
      }
      return sc / Math.max(1, n);
    };
    assert.ok(
      headAvgCol(lTurn.body) < headAvgCol(lFront.body) - 2.0,
      `Expected Greatsword combo4 p=0.28 character turn to mirror head/torso toward rear (-x): turnCol=${headAvgCol(lTurn.body).toFixed(2)}, frontCol=${headAvgCol(lFront.body).toFixed(2)}`
    );

    // Verify 16-frame Savage Lion's Claw (勇猛狮子斩) skill: two 360° forward somersaults + two 3-beat overhead slams
    assert.equal(Rig.GREATSWORD_ACT_KF.skill.length, 16, 'Expected Greatsword Savage Lion\'s Claw skill to have 16 keyframes');
    const lionFlip1 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.14 });
    const lionSlam1Full = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.26 });
    const lionSlam1Half = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.33 });
    const lionFlip2 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.51 });
    const lionSlam2Full = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.64 });
    const lionSlam2Half = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.76 });
    assert.ok(lionFlip1.somersaultPhi >= 180 && lionFlip1.trailFrom === null, 'Expected Lion\'s Claw 1st somersault frame to rotate mid-air with trailFrom === null');
    // Verify all 4 airborne somersault frames (F0..F3) sweep the Greatsword monotonically clockwise across distinct quadrants (no collinear flip frames)
    const f0 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.02 });
    const f1 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.08 });
    const f2 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.14 });
    const f3 = Rig.computeWeaponPose({ id: 'greatsword', aim: 90, action: 'skill', p: 0.20 });
    assert.ok(f0.gunAng < -20 && f1.gunAng < f0.gunAng - 35 && f2.gunAng < f1.gunAng - 35 && f3.gunAng > 140, 'Expected Lion\'s Claw somersault frames F0..F3 to wheel the Greatsword monotonically clockwise through 4 distinct quadrants');
    assert.equal(lionSlam1Full.gunAng, 68, 'Expected Lion\'s Claw 1st slam angle = 68°');
    assert.equal(lionSlam1Full.slashRetract, 0, 'Expected Lion\'s Claw 1st slam full trail');
    assert.equal(lionSlam1Half.gunAng, 68, 'Expected Lion\'s Claw 1st slam Beat 3 to freeze weapon at 68°');
    assert.equal(lionSlam1Half.slashRetract, 0.5, 'Expected Lion\'s Claw 1st slam Beat 3 half-retract');
    assert.ok(lionFlip2.somersaultPhi >= 180 && lionFlip2.trailFrom === null, 'Expected Lion\'s Claw 2nd somersault frame to rotate mid-air with trailFrom === null');
    assert.equal(lionSlam2Full.gunAng, 62, 'Expected Lion\'s Claw 2nd finisher slam angle = 62°');
    assert.equal(lionSlam2Full.slashRetract, 0, 'Expected Lion\'s Claw 2nd slam full trail');
    assert.equal(lionSlam2Half.gunAng, 62, 'Expected Lion\'s Claw 2nd slam Beat 3 to freeze weapon at 62°');
    assert.equal(lionSlam2Half.slashRetract, 0.5, 'Expected Lion\'s Claw 2nd slam Beat 3 half-retract');

    // 4c) Verify ZERO bottom weapon truncation when Greatsword points straight downward (aim = 0° / 30°) AND ZERO horizontal y=75 ground-line bug!
    const layersDownAim: any = Rig.charLayers(lin, poStand, P.hyGround(poStand), 0, {
      weapon: { id: 'greatsword', aim: 20, action: 'combo3', p: 0.42 },
    });
    let maxDownRow = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (layersDownAim.weapon[r][c] && r > maxDownRow) maxDownRow = r;
      }
    }
    assert.ok(
      maxDownRow >= 86,
      `Expected downward-aimed Greatsword to render completely below foot row 75 without truncation (maxRow >= 86), got maxRow=${maxDownRow}`
    );

    // Check that horizontal ground-line bug on row 75 is completely gone on Greatsword combos & Savage Lion's Claw slams
    for (const [act, checkP] of [['combo1', 0.42], ['combo2', 0.42], ['combo3', 0.42], ['combo4', 0.42], ['skill', 0.26], ['skill', 0.64]] as const) {
      const lCheck: any = Rig.charLayers(lin, poStand, P.hyGround(poStand), 0, {
        weapon: { id: 'greatsword', aim: 90, action: act, p: checkP },
      });
      let maxContigWhiteOn75 = 0;
      let curRun = 0;
      for (let c = 0; c < Rig.GW; c++) {
        const px = lCheck.weapon[75][c];
        if (px === '#ffffff' || px === '#eef1f6') {
          curRun++;
          if (curRun > maxContigWhiteOn75) maxContigWhiteOn75 = curRun;
        } else {
          curRun = 0;
        }
      }
      assert.ok(
        maxContigWhiteOn75 <= 6,
        `Expected NO artificial horizontal white ground line on row 75 during Greatsword ${act} (p=${checkP}), got contiguous run=${maxContigWhiteOn75}`
      );
    }
  }

  // 5) Verify 3D slash trail pixel counts, 360° Whirlwind wrap, & Beat 3 half-retraction for both Katana and Colossal Greatsword
  const xing = Cast.CAST[5];
  const P = Rig.poser(xing);
  const poSide = P.idleSide(0, false);
  const isTrailCol = (col: string | null) =>
    col === '#ffffff' ||
    col === '#eef1f6' ||
    col === '#dce1eb' ||
    col === '#b8bfd0' ||
    col === '#9aa1b0' ||
    col === '#686e7c' ||
    col === '#4a4f5c';

  const countTrailPixels = (wep: any, useDetached = false, includeBack = false) => {
    const layers: any = Rig.charLayers(xing, poSide, P.hyGround(poSide), 0, { weapon: wep });
    const grids = useDetached
      ? [layers.detachedFX]
      : includeBack
      ? [layers.weapon, layers.backArm]
      : [layers.weapon];
    let white = 0;
    let shatteredGrey = 0;
    let total = 0;
    let touchesGround = false;
    let minCol = Rig.GW;
    let maxCol = 0;
    let minRow = Rig.GH;
    let maxRow = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        const col = grids[0][r][c] || (grids[1] && isTrailCol(grids[1][r][c]) ? grids[1][r][c] : null);
        if (!col) continue;
        if (isTrailCol(col)) {
          total++;
          if (col === '#eef1f6' || col === '#ffffff') white++;
          if (col === '#9aa1b0' || col === '#686e7c' || col === '#4a4f5c') shatteredGrey++;
          if (r >= 73) touchesGround = true;
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
        }
      }
    }
    return { white, shatteredGrey, total, touchesGround, minCol, maxCol, minRow, maxRow, layers };
  };

  const katanaC1Full = countTrailPixels({ id: 'katana', aim: 90, action: 'combo1', p: 0.28 });
  const katanaC1Half = countTrailPixels({ id: 'katana', aim: 90, action: 'combo1', p: 0.56 });
  const katanaC2Full = countTrailPixels({ id: 'katana', aim: 90, action: 'combo2', p: 0.28 });
  const katanaC2Half = countTrailPixels({ id: 'katana', aim: 90, action: 'combo2', p: 0.56 });
  const katanaC4Full = countTrailPixels({ id: 'katana', aim: 90, action: 'combo4', p: 0.56 });
  const katanaC4Half = countTrailPixels({ id: 'katana', aim: 90, action: 'combo4', p: 0.70 });
  const katanaSkDetached = countTrailPixels({ id: 'katana', aim: 90, action: 'skill', p: 0.62 }, true);
  const swordC3 = countTrailPixels({ id: 'blade', aim: 90, action: 'combo3', p: 0.56 });
  const gsC1Full = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo1', p: 0.42 });
  const gsC1Half = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo1', p: 0.70 });
  const gsC2Full = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo2', p: 0.42 });
  const gsC2Half = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo2', p: 0.70 });
  const gsC3Full = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo3', p: 0.42 });
  const gsC3Half = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo3', p: 0.70 });
  const gsC4Full = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo4', p: 0.42 }, false, true);
  const gsC4Half = countTrailPixels({ id: 'greatsword', aim: 90, action: 'combo4', p: 0.70 }, false, true);

  const c1Width = katanaC1Full.maxCol - katanaC1Full.minCol;
  const c1Height = katanaC1Full.maxRow - katanaC1Full.minRow;
  assert.ok(
    c1Width >= 32 && c1Height <= 24 && c1Width > c1Height * 1.4 && !katanaC1Full.touchesGround,
    `Expected Katana Hit 1 3D horizontal crescent attached to blade to be flat in 2D view (width=${c1Width}, height=${c1Height}, touchesGround=${katanaC1Full.touchesGround})`
  );
  assert.ok(
    katanaC1Half.total < katanaC1Full.total && katanaC1Half.total >= 25,
    `Expected Katana Hit 1 Beat 3 half-retracted trail (${katanaC1Half.total}) < Beat 2 full trail (${katanaC1Full.total})`
  );
  assert.ok(
    katanaC2Half.total < katanaC2Full.total && katanaC2Half.total >= 25,
    `Expected Katana Hit 2 Beat 3 half-retracted trail (${katanaC2Half.total}) < Beat 2 full trail (${katanaC2Full.total})`
  );
  assert.ok(
    katanaC4Half.total < katanaC4Full.total && katanaC4Half.total >= 25,
    `Expected Katana Hit 4 Beat 3 half-retracted trail (${katanaC4Half.total}) < Beat 2 full trail (${katanaC4Full.total})`
  );
  assert.ok(
    katanaSkDetached.white >= 35 && katanaSkDetached.shatteredGrey >= 25,
    `Expected Katana Skill detachedFX layer to contain the 3 half-body orbiting slashes (white=${katanaSkDetached.white}, grey=${katanaSkDetached.shatteredGrey})`
  );

  // Colossal Greatsword 4-stage slash trails must be heavy and retract cleanly by half on Beat 3
  assert.ok(
    gsC1Full.total > swordC3.total * 1.35 && gsC1Half.total < gsC1Full.total && gsC1Half.total >= 60,
    `Expected Greatsword Hit 1 upward hurricane full=${gsC1Full.total} > half=${gsC1Half.total}`
  );
  assert.ok(
    gsC2Full.maxCol - gsC2Full.minCol >= 38 && gsC2Half.total < gsC2Full.total && gsC2Half.total >= 60,
    `Expected Greatsword Hit 2 wide horizontal sweep span=${gsC2Full.maxCol - gsC2Full.minCol}, full=${gsC2Full.total} > half=${gsC2Half.total}`
  );
  assert.ok(
    gsC3Full.total > swordC3.total * 1.35 && gsC3Half.total < gsC3Full.total && gsC3Half.total >= 60,
    `Expected Greatsword Hit 3 Lion's Claw slam full=${gsC3Full.total} > half=${gsC3Half.total}`
  );
  // Stage 4 360° Whirlwind Cleave must wrap far behind the warrior's back AND far in front, with rear cyclone pixels on backArm layer!
  const hipGridCol = 16 + Rig.GX;
  let rearWhirlPixels = 0;
  for (let r = 0; r < Rig.GH; r++) {
    for (let c = 0; c < Rig.GW; c++) {
      const col = gsC4Full.layers.backArm[r][c];
      if (col === '#ffffff' || col === '#eef1f6' || col === '#dce1eb') rearWhirlPixels++;
    }
  }
  assert.ok(
    gsC4Full.minCol <= hipGridCol - 18 && gsC4Full.maxCol >= hipGridCol + 22 && rearWhirlPixels >= 15,
    `Expected Greatsword Hit 4 360° Whirlwind Cleave to wrap around body (minCol=${gsC4Full.minCol}, hip=${hipGridCol}, maxCol=${gsC4Full.maxCol}, rearLayerWhirlPixels=${rearWhirlPixels})`
  );
  assert.ok(
    gsC4Half.total < gsC4Full.total && gsC4Half.total >= 80,
    `Expected Greatsword Hit 4 360° Whirlwind Beat 3 half-retracted trail (${gsC4Half.total}) < Beat 2 full trail (${gsC4Full.total})`
  );

  // 6) Verify decoupled arm + weapon compatibility across ALL 6 CAST characters + procedural Human, Cathode, Myco, and Cinder NPCs
  const testRoster = [
    ...Cast.CAST,
    Cast.generateNPC(9101, { species: 'human', suit: 'roninCoat', back: 'cape' }),
    Cast.generateAlienNPC('cathode', 9102, { cathodeVariant: 'diamondPrism' }),
    Cast.generateAlienNPC('myco', 9103, { mycoVariant: 'crimsonUmbrella' }),
    Cast.generateAlienNPC('cinder', 9104, { cinderVariant: 'basaltHornLord' }),
  ];

  for (const spec of testRoster) {
    const SP = Rig.poser(spec);
    const spBasePo = SP.idleSide(0.2, false);
    for (const [wId, acts] of [
      ['katana', ['combo1', 'combo2', 'combo3', 'combo4', 'skill']] as const,
      ['greatsword', ['combo1', 'combo2', 'combo3', 'combo4', 'skill']] as const,
    ]) {
      const po0 = SP.weaponIdle(wId, 0.0, false); // bob = 0
      const po1 = SP.weaponIdle(wId, 1.0, false); // bob = -1
      const l0: any = Rig.charLayers(spec, po0, SP.hyGround(po0), 0, { weapon: { id: wId, aim: 90, action: 'idle', p: 0, v34: true } });
      const l1: any = Rig.charLayers(spec, po1, SP.hyGround(po1), 0, { weapon: { id: wId, aim: 90, action: 'idle', p: 0, v34: true } });
      const pts0: string[] = [];
      const pts1: string[] = [];
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (l0.weapon[r][c]) pts0.push(`${r - (po0.bob || 0)},${c}`);
          if (l1.weapon[r][c]) pts1.push(`${r - (po1.bob || 0)},${c}`);
        }
      }
      assert.deepEqual(pts0, pts1, `Expected 45° ${wId} idle on ${spec.id} to translate rigidly with bob without relative pixel deformation`);

      for (const act of acts) {
        const pSamples =
          wId === 'greatsword' && act === 'skill'
            ? Array.from({ length: 16 }, (_, fi) => (fi + 0.5) / 16)
            : [wId === 'katana' && act === 'combo4' ? 0.56 : wId === 'greatsword' ? 0.42 : 0.28];
        for (const strikeP of pSamples) {
          const layers: any = Rig.charLayers(spec, spBasePo, SP.hyGround(spBasePo), 0, {
            weapon: { id: wId, aim: 90, action: act, p: strikeP },
          });
          assert.ok(layers.backArm.flat().some(Boolean), `Expected non-empty backArm layer for ${spec.id} wielding ${wId} (${act} p=${strikeP})`);
          assert.ok(layers.body.flat().some(Boolean), `Expected non-empty body layer for ${spec.id} wielding ${wId} (${act} p=${strikeP})`);
          assert.ok(layers.weapon.flat().some(Boolean), `Expected non-empty weapon layer for ${spec.id} wielding ${wId} (${act} p=${strikeP})`);
          assert.ok(layers.frontArm.flat().some(Boolean), `Expected non-empty frontArm layer for ${spec.id} wielding ${wId} (${act} p=${strikeP})`);
          for (let r = 0; r < Rig.GH; r++) {
            for (let c = 0; c < Rig.GW; c++) {
              if (layers.composite[r][c]) {
                assert.ok(r >= 20 && r <= 95, `Expected ${spec.id} (${wId} ${act} p=${strikeP.toFixed(3)}) row=${r} within 96x76 Inspector [20..95]`);
                assert.ok(c >= 2 && c < Rig.GW - 1, `Expected ${spec.id} (${wId} ${act} p=${strikeP.toFixed(3)}) col=${c} within unclipped canvas bounds`);
              }
            }
          }
        }
      }
    }
  }

  // 7) Verify AI world chaining, clean mid-combo mouse release direct return to 45° idle, and Greatsword Savage Lion's Claw 2-hit skill
  const w = AI.createWorld(11);
  const ag = w.agents[5];
  ag.manual = true;
  ag.goal = { type: 'manual' };

  // 7a) Clean mid-combo mouse release for both Katana and Greatsword: must return DIRECTLY to 45° idle without flashing next-stage windup or side-aim frame
  for (const [wepId, forbiddenNextWindupAng] of [['katana', 40], ['greatsword', -58]] as const) {
    w.setWeapon(ag, wepId);
    w.swing(ag); // Start combo1 and immediately release mouse
    w.input.attackHold = false;
    let returnedToAim = false;
    for (let f = 0; f < 60; f++) {
      w.step(1 / 60);
      const fp = AI.framePose(ag);
      assert.notEqual(ag.wAction, 'combo2', `Expected ${wepId} single click + release NOT to enter combo2`);
      const wpNow = Rig.computeWeaponPose(fp.weapon);
      assert.notEqual(wpNow.gunAng, forbiddenNextWindupAng, `Expected ${wepId} mid-combo release NEVER to flash next-stage windup angle ${forbiddenNextWindupAng}°`);
      if (ag.wAction === 'aim') {
        assert.equal(fp.po.v34, true, `Expected ${wepId} to return DIRECTLY to 45° v34 idle on the very first frame wAction becomes 'aim'`);
        assert.equal(fp.weapon.action, 'idle', `Expected ${wepId} weapon action to be 'idle' immediately upon mid-combo release completion`);
        returnedToAim = true;
        break;
      }
    }
    assert.ok(returnedToAim, `Expected ${wepId} combo1 to finish and return directly to idle`);
  }

  w.setWeapon(ag, 'katana');
  w.input.attackHold = true;
  const seenKatana = new Set<string>();
  for (let f = 0; f < 150; f++) {
    w.step(1 / 60);
    if (ag.wAction && ag.wAction.startsWith('combo')) seenKatana.add(ag.wAction);
  }
  w.input.attackHold = false;
  assert.deepEqual(
    [...seenKatana],
    ['combo1', 'combo2', 'combo3', 'combo4'],
    `Expected Katana attackHold to chain through all 4 stages combo1..combo4, saw ${[...seenKatana]}`
  );

  // Test Katana Right-Click Skill
  const dummy = w.summonDummyNear(ag);
  assert.ok(dummy, 'Expected dummy summoned in front of character');
  w.fx.length = 0;
  const hitsBefore = ag.stats.dummyHits || 0;
  const startX = ag.x;
  w.skill(ag);
  for (let f = 0; f < 70; f++) {
    w.step(1 / 60);
  }
  const tearEvt = w.fx.find((e: any) => e.type === 'katanaTear');
  assert.ok(tearEvt, 'Expected Katana right-click skill to emit detached katanaTear FX event');
  assert.equal(tearEvt.x, startX, 'Expected katanaTear FX to lock to fixed world x where skill was cast');
  ag.x += 40;
  assert.equal(tearEvt.x, startX, 'Expected detached katanaTear FX world position to remain stationary when character moves');
  const dummyHitEvts = w.fx.filter((e: any) => e.type === 'dummyHit');
  assert.equal(dummyHitEvts.length, 3, `Expected Katana right-click 3-slash skill to trigger 3 separate damage judgments, got ${dummyHitEvts.length}`);
  assert.equal((ag.stats.dummyHits || 0) - hitsBefore, 3, 'Expected agent dummyHits counter to increment by 3');

  // Test Greatsword 4-combo chain (including combo4 360° Whirlwind Cleave hitting nearby dummy)
  ag.x -= 40;
  w.summonDummyNear(ag);
  w.fx.length = 0;
  w.setWeapon(ag, 'greatsword');
  w.input.attackHold = true;
  const seenGs = new Set<string>();
  for (let f = 0; f < 220; f++) {
    w.step(1 / 60);
    if (ag.wAction && ag.wAction.startsWith('combo')) seenGs.add(ag.wAction);
  }
  w.input.attackHold = false;
  assert.deepEqual(
    [...seenGs],
    ['combo1', 'combo2', 'combo3', 'combo4'],
    `Expected Greatsword attackHold to chain through all 4 heavy stages combo1..combo4, saw ${[...seenGs]}`
  );
  const gsDummyHits = w.fx.filter((e: any) => e.type === 'dummyHit');
  assert.ok(gsDummyHits.length >= 5, `Expected Greatsword 4-combo (with 2-hit 360° whirlwind finisher) to land >=5 dummy hits, got ${gsDummyHits.length}`);

  // 7b) Test Greatsword Right-Click "Savage Lion's Claw" (勇猛狮子斩): leaps twice, somersaults, and lands 2 separate heavy slams on dummy
  w.summonDummyNear(ag);
  w.fx.length = 0;
  const lionHitsBefore = ag.stats.dummyHits || 0;
  const groundY = ag.y;
  let minLionY = groundY;
  let airToGroundTransitions = 0;
  let prevGrounded = ag.grounded;
  w.skill(ag);
  for (let f = 0; f < 95; f++) {
    w.step(1 / 60);
    if (ag.y < minLionY) minLionY = ag.y;
    if (!prevGrounded && ag.grounded) airToGroundTransitions++;
    prevGrounded = ag.grounded;
  }
  const lionDummyHits = w.fx.filter((e: any) => e.type === 'dummyHit');
  assert.ok(minLionY <= groundY - 8, `Expected Savage Lion's Claw to leap high off the ground (minY=${minLionY.toFixed(1)}, groundY=${groundY})`);
  assert.equal(airToGroundTransitions, 2, `Expected Savage Lion's Claw to perform 2 distinct leaps + landings, got ${airToGroundTransitions}`);
  assert.equal(lionDummyHits.length, 2, `Expected Savage Lion's Claw to land 2 heavy slashes on the dummy, got ${lionDummyHits.length}`);
  assert.equal((ag.stats.dummyHits || 0) - lionHitsBefore, 2, 'Expected dummyHits counter to increment by 2 during Savage Lion\'s Claw');
});

test('Reworked 17.5px Longsword (4-combo + 16-frame 3D Sword Flourish) and Universal Sequence-Frame Aim Lock + Inter-Move Gap Turning across all weapons', () => {
  (globalThis as any).PixelRig = Rig;
  (globalThis as any).PixelCast = Cast;

  // 1) Verify lengthened 17.5px Longsword physical reach & 3-beat frozen-weapon half-retract law + zero ground-line artifacts
  const xingSpec = Cast.CAST[5];
  const P = Rig.poser(xingSpec);
  const basePo = P.idleSide(0, false);
  const layersAim: any = Rig.charLayers(xingSpec, basePo, P.hyGround(basePo), 0, {
    weapon: { id: 'blade', aim: 66, action: 'aim', p: 0 },
  });
  const swordRow = layersAim.muzzle.y;
  const swordCols: number[] = [];
  for (let c = 0; c < Rig.GW; c++) {
    if (layersAim.weapon[swordRow][c]) swordCols.push(c);
  }
  const minSwordCol = Math.min(...swordCols);
  const maxSwordCol = Math.max(...swordCols);
  assert.ok(
    maxSwordCol - minSwordCol >= 19,
    `Expected lengthened 17.5px Iron Longsword horizontal span (pommel..tip) >= 19px, got ${maxSwordCol - minSwordCol}px (${minSwordCol}..${maxSwordCol})`
  );

  // Verify 3-beat law (Beat 2 peak gunAng == Beat 3 half-retract gunAng while slashRetract increases >= 0.45) on combo1..combo4 and skill
  for (const [act, pPeak, pRetract] of [
    ['combo1', 0.28, 0.56],
    ['combo2', 0.28, 0.56],
    ['combo3', 0.42, 0.70],
    ['combo4', 0.28, 0.56],
    ['skill', 0.65, 0.76],
  ] as const) {
    const wpPeak = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: act, p: pPeak });
    const wpRet = Rig.computeWeaponPose({ id: 'blade', aim: 90, action: act, p: pRetract });
    assert.equal(
      wpPeak.gunAng,
      wpRet.gunAng,
      `Expected Longsword ${act} Beat 3 (p=${pRetract}) to keep sword frozen at ${wpPeak.gunAng}°, got ${wpRet.gunAng}°`
    );
    assert.ok(
      wpRet.slashRetract >= 0.48 && wpRet.slashRetract > wpPeak.slashRetract,
      `Expected Longsword ${act} Beat 3 slashRetract (${wpRet.slashRetract}) >= 0.48`
    );
  }

  // Verify 16-frame Sword Flourish has nimble 180° body turn (spinFlip on F6 -> snap back on F7) and 4 SEQUENTIAL non-stacking slashes!
  const f6 = Rig.SWORD_ACT_KF.skill[6];
  const f7 = Rig.SWORD_ACT_KF.skill[7];
  assert.equal(f6.spinFlip, true, 'Expected Sword Flourish F6 to flip character (spinFlip: true) for nimble back-hand spin');
  assert.equal(f7.spinFlip, false, 'Expected Sword Flourish F7 to snap back forward (spinFlip: false) for 3rd horizontal wrap slash');

  // Verify sequential emergence: Slash #1 (F2, upward-right) and Slash #2 (F4, downward-right) have distinct vertical centroids & half-retract in between (F3)
  const countTrailStats = (pVal: number) => {
    const ly: any = Rig.charLayers(xingSpec, basePo, P.hyGround(basePo), 0, {
      weapon: { id: 'blade', aim: 90, action: 'skill', p: pVal },
    });
    let count = 0, sumR = 0, rearPx = 0, frontWhite = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        const wc = ly.weapon[r][c], bc = ly.backArm[r][c];
        if (wc === '#ffffff' || wc === '#eef1f6' || bc === '#ffffff' || bc === '#eef1f6') {
          count++;
          sumR += r;
        }
        if (bc === '#b8bfd0' || bc === '#9aa1b0' || bc === '#dce1eb') rearPx++;
        if (wc === '#ffffff' || wc === '#eef1f6') frontWhite++;
      }
    }
    return { count, avgR: count ? sumR / count : 0, rearPx, frontWhite };
  };
  const s1Full = countTrailStats(2.5 / 16); // F2: Slash #1 full (upward-right)
  const s1Half = countTrailStats(3.5 / 16); // F3: Slash #1 half-retracted
  const s2Full = countTrailStats(4.5 / 16); // F4: Slash #2 full (downward-right)
  const s2Half = countTrailStats(5.5 / 16); // F5: Slash #2 half-retracted
  const s4Full = countTrailStats(10.5 / 16); // F10: Slash #4 finisher full
  assert.ok(s1Half.count < s1Full.count, `Expected Slash #1 to retract on F3 (${s1Half.count} < ${s1Full.count}) before Slash #2 appears`);
  assert.ok(s2Half.count < s2Full.count, `Expected Slash #2 to retract on F5 (${s2Half.count} < ${s2Full.count}) before Slash #3 appears`);
  assert.ok(s2Full.avgR > s1Full.avgR + 2.5, `Expected Slash #1 (avgR=${s1Full.avgR.toFixed(1)}) and Slash #2 (avgR=${s2Full.avgR.toFixed(1)}) to appear in distinct upper vs lower planes rather than stacking`);
  assert.ok(s4Full.rearPx >= 8, `Expected 3D Sword Flourish finisher to wrap rear arc pixels behind character in backArm (>=8), got ${s4Full.rearPx}`);
  assert.ok(s4Full.frontWhite >= 24, `Expected 3D Sword Flourish finisher to render bright front arc & tip star in weapon (>=24), got ${s4Full.frontWhite}`);

  // 2) Universal Sequence-Frame Aim Lock & Inter-Move Gap Turning across ALL weapons (blade, katana, greatsword, pistol)
  const w = AI.createWorld(11);
  const ag = w.agents[5];
  ag.manual = true;
  ag.goal = { type: 'manual' };

  // 2a) Melee combo sequence lock + gap turning (test across blade, katana, greatsword)
  for (const wepId of ['blade', 'katana', 'greatsword'] as const) {
    w.setWeapon(ag, wepId);
    w.input.attackHold = false;
    // Aim right before starting combo1
    w.aimAt(ag, ag.x + 90, ag.y - 16);
    assert.equal(ag.face, 1, `Expected ${wepId} initial facing right (1)`);
    const lockedAimRight = ag.aim;

    // Launch combo1 -> sequence frames are now active!
    assert.equal(w.swing(ag), 'combo1');
    w.step(1 / 60);

    // Move mouse sharply behind character to the LEFT and upward while combo1 sequence frames are playing
    w.aimAt(ag, ag.x - 100, ag.y - 45);
    assert.equal(ag.face, 1, `Expected ${wepId} NOT to turn during active combo1 sequence frames when mouse moves behind`);
    assert.equal(ag.aim, lockedAimRight, `Expected ${wepId} aim angle (${ag.aim}) to stay 100% locked (${lockedAimRight}) during active combo1 frames`);

    // Even pressing left movement key during active combo1 must NOT flip ag.face!
    w.input.dir = -1;
    let enteredGap = false;
    for (let f = 0; f < 55; f++) {
      const wasCombo1 = ag.wAction === 'combo1';
      w.step(1 / 60);
      if (ag.wAction === 'combo1') {
        assert.equal(ag.face, 1, `Expected ${wepId} ag.face to remain locked to +1 on every single sequence frame of combo1 (tick ${f})`);
        assert.equal(ag.aim, lockedAimRight, `Expected ${wepId} ag.aim to remain locked on every single sequence frame of combo1 (tick ${f})`);
      } else if (wasCombo1 && ag.wAction === 'aim') {
        enteredGap = true;
        break;
      }
    }
    w.input.dir = 0;
    assert.ok(enteredGap, `Expected ${wepId} combo1 to finish and enter the inter-move gap ('aim')`);

    // Immediately upon entering the inter-move gap, pendingAim MUST flush so character turns LEFT (-1) and updates aim!
    assert.equal(ag.face, -1, `Expected ${wepId} to immediately turn to face mouse (-1) in the gap after combo1 finishes`);
    assert.notEqual(ag.aim, lockedAimRight, `Expected ${wepId} aim angle to update to pending mouse position in the gap`);

    // Moreover, clicking swing() inside the inter-move comboGraceT window chains into combo2 facing the NEW direction (-1), and locks again!
    const nextAct = w.swing(ag);
    assert.equal(nextAct, 'combo2', `Expected clicking during ${wepId} inter-combo gap window to chain smoothly into combo2`);
    const lockedAimLeft = ag.aim;
    // Now move mouse back to the RIGHT mid-combo2 -> must stay locked to LEFT (-1) until combo2 finishes!
    w.aimAt(ag, ag.x + 110, ag.y - 10);
    for (let f = 0; f < 8; f++) {
      w.step(1 / 60);
      if (ag.wAction === 'combo2') {
        assert.equal(ag.face, -1, `Expected ${wepId} combo2 sequence frames to stay locked to left (-1) even when mouse moves right`);
        assert.equal(ag.aim, lockedAimLeft, `Expected ${wepId} combo2 aim to stay locked during sequence frames`);
      }
    }
    // Step until combo2 finishes -> turns back to RIGHT (+1) in the gap!
    for (let f = 0; f < 60; f++) {
      w.step(1 / 60);
      if (ag.wAction === 'aim') break;
    }
    assert.equal(ag.face, 1, `Expected ${wepId} to turn back to right (+1) once combo2 sequence finishes`);
  }

  // 2b) Held attackHold chaining also turns cleanly ONLY at the exact inter-stage boundary (combo1 -> combo2), never mid-stage!
  w.setWeapon(ag, 'blade');
  w.aimAt(ag, ag.x + 80, ag.y - 16);
  assert.equal(ag.face, 1);
  w.input.attackHold = true;
  w.step(1 / 60); // Starts combo1 facing +1
  assert.equal(ag.wAction, 'combo1');
  // Move mouse to the LEFT while holding attackHold during combo1
  w.aimAt(ag, ag.x - 95, ag.y - 28);
  let sawCombo2Left = false;
  for (let f = 0; f < 40; f++) {
    w.step(1 / 60);
    if (ag.wAction === 'combo1') {
      assert.equal(ag.face, 1, 'Expected held combo1 never to flip mid-sequence');
    } else if (ag.wAction === 'combo2') {
      assert.equal(ag.face, -1, 'Expected held combo1 -> combo2 boundary gap to flush pendingAim and turn to -1 for combo2');
      sawCombo2Left = true;
      break;
    }
  }
  w.input.attackHold = false;
  assert.ok(sawCombo2Left, 'Expected held attackHold to transition into combo2 facing the new mouse direction (-1)');
  for (let f = 0; f < 45; f++) w.step(1 / 60);

  // 2c) Ranged weapon ('pistol') also locks aim during 'shoot' & 'reload' sequence frames and turns in the gap!
  w.setWeapon(ag, 'pistol');
  w.aimAt(ag, ag.x + 80, ag.y - 16);
  assert.equal(ag.face, 1);
  const pistolAimRight = ag.aim;
  assert.equal(w.shoot(ag), 'shoot');
  assert.equal(ag.wAction, 'shoot');
  w.aimAt(ag, ag.x - 80, ag.y - 35); // Move mouse left mid-shot recoil sequence
  assert.equal(ag.face, 1, 'Expected pistol NOT to flip during active shoot sequence frames');
  assert.equal(ag.aim, pistolAimRight, 'Expected pistol aim to remain locked during active shoot sequence frames');
  for (let f = 0; f < 25; f++) {
    w.step(1 / 60);
    if (ag.wAction === 'shoot') {
      assert.equal(ag.face, 1, 'Expected pistol face locked on every frame of shoot');
    } else if (ag.wAction === 'aim') {
      break;
    }
  }
  assert.equal(ag.wAction, 'aim');
  assert.equal(ag.face, -1, 'Expected pistol to turn to -1 immediately in the gap after shoot finishes');
});

test('25. Iron Dual Blades (dualBlades): true dual-wielding falcon scimitars, 45° rigid idle, zero clipping, reference-grounded 4-stage combo (Alternating Twin -> X-Scissor -> 360° Beyblade Spin -> Aerial Twin-Wing Rend), 16-frame sequential Demon Dance, and sequence-frame aim lock', () => {
  // 1) Weapon config & keyframe tables
  assert.ok(Rig.WEAPONS.dualBlades, 'Expected Rig.WEAPONS.dualBlades to be defined');
  assert.equal(Rig.WEAPONS.dualBlades.comboCount, 4, 'Expected Dual Blades comboCount === 4');
  assert.equal(Rig.WEAPONS.dualBlades.skillDur, 1.24, 'Expected Dual Blades Demon Dance skillDur === 1.24s');
  assert.ok(Rig.DUAL_BLADES_ACT_KF, 'Expected Rig.DUAL_BLADES_ACT_KF to be exported');
  for (const act of ['combo1', 'combo2', 'combo3', 'combo4']) {
    assert.equal(Rig.DUAL_BLADES_ACT_KF[act].length, 8, `Expected ${act} to have 8 keyframes`);
  }
  assert.equal(Rig.DUAL_BLADES_ACT_KF.skill.length, 16, 'Expected Demon Dance skill to have 16 keyframes');

  const xingSpec = Cast.CAST[5];
  const P = Rig.poser(xingSpec);
  const basePo = P.idleSide(0.2, false);

  // 2) True dual-wielding in 45° standing idle: off-hand scimitar in backArm + main-hand scimitar in weapon, rigid vertical translation with po.bob
  const scimitarSet = new Set([
    '#ffffff', '#eef1f6', '#dce1eb', '#b8bfd0',
    '#8a91a1', '#7d8494', '#686e7c', '#4a4f5c',
    '#3a3f4d', '#323744', '#23262e', '#6e2b32',
  ]);
  let refMainRel = '';
  let refOffRel = '';
  for (let i = 0; i < 8; i++) {
    const p = i / 8;
    const po45 = P.weaponIdle('dualBlades', p * 2.4, false);
    const ly: any = Rig.charLayers(xingSpec, po45, P.hyGround(po45), 0, {
      weapon: { id: 'dualBlades', aim: 90, action: 'idle', p, v34: true },
    });
    const mainPts: string[] = [];
    const offPts: string[] = [];
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (ly.weapon[r][c]) {
          mainPts.push(`${r - (po45.bob || 0)},${c}`);
        }
        if (ly.backArm[r][c] && scimitarSet.has(ly.backArm[r][c])) {
          offPts.push(`${r - (po45.bob || 0)},${c}`);
        }
      }
    }
    assert.ok(mainPts.length >= 16, `Expected >=16 main-hand falcon scimitar pixels in weapon layer on 45° idle frame ${i}, got ${mainPts.length}`);
    assert.ok(offPts.length >= 12, `Expected >=12 off-hand falcon scimitar pixels in backArm layer on 45° idle frame ${i}, got ${offPts.length}`);
    const mSig = mainPts.join(';');
    const oSig = offPts.join(';');
    if (i === 0) {
      refMainRel = mSig;
      refOffRel = oSig;
    } else {
      assert.equal(mSig, refMainRel, `Expected main-hand scimitar to translate rigidly with po.bob on 45° idle frame ${i}`);
      assert.equal(oSig, refOffRel, `Expected off-hand scimitar to translate rigidly with po.bob on 45° idle frame ${i}`);
    }
  }

  // 3) Zero clipping (all pixels strictly within 96×76 Inspector window r ∈ [20..95], c ∈ [0..95]) across combo1..4 & 16-frame skill on humans & aliens
  const testSpecs = [
    xingSpec,
    Cast.generateAlienNPC('cathode', 2026),
    Cast.generateAlienNPC('myco', 2027),
    Cast.generateAlienNPC('cinder', 2028),
  ];
  for (const sp of testSpecs) {
    const PS = Rig.poser(sp);
    const poS = PS.idleSide(0.2, false);
    for (const act of ['combo1', 'combo2', 'combo3', 'combo4']) {
      for (let i = 0; i < 8; i++) {
        const g = Rig.charGrid(sp, poS, PS.hyGround(poS), 0, {
          weapon: { id: 'dualBlades', aim: 90, action: act, p: (i + 0.5) / 8 },
        });
        for (let r = 0; r < Rig.GH; r++) {
          for (let c = 0; c < Rig.GW; c++) {
            if (g[r][c]) {
              assert.ok(r >= 20 && r <= 95, `Expected ${sp.id} dualBlades ${act} F${i} row=${r} within [20..95]`);
              assert.ok(c >= 0 && c < Rig.GW, `Expected ${sp.id} dualBlades ${act} F${i} col=${c} within [0..${Rig.GW - 1}]`);
            }
          }
        }
      }
    }
    for (let i = 0; i < 16; i++) {
      const g = Rig.charGrid(sp, poS, PS.hyGround(poS), 0, {
        weapon: { id: 'dualBlades', aim: 90, action: 'skill', p: (i + 0.5) / 16 },
      });
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          if (g[r][c]) {
            assert.ok(r >= 20 && r <= 95, `Expected ${sp.id} dualBlades skill F${i} row=${r} within [20..95]`);
            assert.ok(c >= 0 && c < Rig.GW, `Expected ${sp.id} dualBlades skill F${i} col=${c} within [0..${Rig.GW - 1}]`);
          }
        }
      }
    }
  }

  // 4) Reference motion fidelity:
  //    - combo1: sequential alternating twin cuts (F2 off-hand diagonal down -> F3 half-retract -> F4 main-hand rising -> F5 frozen gunAng + half-retract)
  const c1Hit1 = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo1', p: 0.28 });
  const c1Ret1 = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo1', p: 0.42 });
  const c1Hit2 = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo1', p: 0.56 });
  const c1Ret2 = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo1', p: 0.70 });
  assert.ok(c1Hit1.offTrailFrom != null && c1Hit1.trailFrom == null, 'Expected combo1 Hit 1 (p=0.28) to swing ONLY off-hand blade first');
  assert.equal(c1Hit1.offAng, c1Ret1.offAng, 'Expected combo1 Hit 1 Beat 3 (p=0.42) to freeze off-hand blade while trail retracts');
  assert.ok(c1Hit2.trailFrom != null && c1Hit2.offTrailFrom == null, 'Expected combo1 Hit 2 (p=0.56) to swing ONLY main-hand blade second');
  assert.equal(c1Hit2.gunAng, c1Ret2.gunAng, 'Expected combo1 Hit 2 Beat 3 (p=0.70) to freeze main-hand blade while trail retracts');

  //    - combo2: Elden Ring powerstanced scimitars 'X' Scissor Cross-Slash (both blades swing simultaneously & freeze on Beat 3)
  const c2Peak = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo2', p: 0.28 });
  const c2Ret = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo2', p: 0.56 });
  assert.ok(c2Peak.trailFrom != null && c2Peak.offTrailFrom != null, 'Expected combo2 X-Scissor Cross-Slash to swing both curved blades simultaneously');
  assert.equal(c2Peak.gunAng, c2Ret.gunAng, 'Expected combo2 Beat 3 to freeze main-hand blade');
  assert.equal(c2Peak.offAng, c2Ret.offAng, 'Expected combo2 Beat 3 to freeze off-hand blade');

  //    - combo3: MH Beyblade 360° spin (spinFlip: true on F2 -> false on F3, wrapping rear vortex in backArm & front vortex in weapon)
  assert.equal(Rig.DUAL_BLADES_ACT_KF.combo3[2].spinFlip, true, 'Expected combo3 F2 to flip character for 360° spinning rush');
  assert.equal(Rig.DUAL_BLADES_ACT_KF.combo3[3].spinFlip, false, 'Expected combo3 F3 to complete 360° turn back forward');
  const lySpin: any = Rig.charLayers(xingSpec, basePo, P.hyGround(basePo), 0, {
    weapon: { id: 'dualBlades', aim: 90, action: 'combo3', p: 0.42 },
  });
  let spinRearPx = 0, spinFrontWhite = 0;
  for (let r = 0; r < Rig.GH; r++) {
    for (let c = 0; c < Rig.GW; c++) {
      if (['#b8bfd0', '#9aa1b0', '#dce1eb'].includes(lySpin.backArm[r][c])) spinRearPx++;
      if (['#ffffff', '#eef1f6'].includes(lySpin.weapon[r][c])) spinFrontWhite++;
    }
  }
  assert.ok(spinRearPx >= 12, `Expected combo3 360° vortex to render >=12 rear ring pixels in backArm, got ${spinRearPx}`);
  assert.ok(spinFrontWhite >= 20, `Expected combo3 360° vortex to render >=20 bright front ring pixels in weapon, got ${spinFrontWhite}`);

  //    - combo4: Aerial hop (hopY > 0 on F1..F2) -> heavy twin-wing rend (p=0.42 -> frozen half-retract p=0.70)
  assert.ok(Rig.DUAL_BLADES_ACT_KF.combo4[1].hopY >= 3 && Rig.DUAL_BLADES_ACT_KF.combo4[2].hopY >= 4, 'Expected combo4 F1..F2 to hop into air');
  const c4Peak = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo4', p: 0.42 });
  const c4Ret = Rig.computeWeaponPose({ id: 'dualBlades', aim: 90, action: 'combo4', p: 0.70 });
  assert.equal(c4Peak.gunAng, c4Ret.gunAng, 'Expected combo4 Beat 3 to freeze main-hand blade');
  assert.equal(c4Peak.offAng, c4Ret.offAng, 'Expected combo4 Beat 3 to freeze off-hand blade');

  //    - skill (Demon Dance): 4 strictly sequential non-stacking slashes (F2->F3, F4->F5, F6->F7, F8[spinFlip]->F9) + F10..F12 synchronized X finisher!
  assert.equal(Rig.DUAL_BLADES_ACT_KF.skill[8].spinFlip, true, 'Expected Demon Dance F8 to trigger spinFlip during 4th spinning slash');
  const countDanceBright = (fIdx: number) => {
    const ly: any = Rig.charLayers(xingSpec, basePo, P.hyGround(basePo), 0, {
      weapon: { id: 'dualBlades', aim: 90, action: 'skill', p: (fIdx + 0.5) / 16 },
    });
    let cnt = 0;
    for (let r = 0; r < Rig.GH; r++) {
      for (let c = 0; c < Rig.GW; c++) {
        if (ly.weapon[r][c] === '#ffffff' || ly.weapon[r][c] === '#eef1f6') cnt++;
      }
    }
    return cnt;
  };
  assert.ok(countDanceBright(3) < countDanceBright(2), 'Expected Demon Dance Slash #1 to retract on F3 before Slash #2 appears on F4');
  assert.ok(countDanceBright(5) < countDanceBright(4), 'Expected Demon Dance Slash #2 to retract on F5 before Slash #3 appears on F6');
  assert.ok(countDanceBright(7) < countDanceBright(6), 'Expected Demon Dance Slash #3 to retract on F7 before Slash #4 appears on F8');
  assert.ok(countDanceBright(10) >= 28, 'Expected Demon Dance F10 grand X finisher to burst with >=28 bright pixels');

  // 5) Live AI World Simulation: 7-hit 4-stage combo, 5-hit Demon Dance skill, mid-combo release -> 45° idle, and sequence-frame aim lock
  const w = AI.createWorld(11);
  const ag = w.agents[5];
  ag.manual = true;
  ag.goal = { type: 'manual' };
  w.setWeapon(ag, 'dualBlades');
  w.aimAt(ag, ag.x + 80, ag.y - 16);
  w.summonDummyNear(ag);
  const dummy = w.dummies[0];
  dummy.x = ag.x + 22;
  dummy.y = ag.y;

  // Hold attackHold through full 4-stage combo -> combo1(2) + combo2(2) + combo3(2) + combo4(1) = 7 hits!
  w.input.attackHold = true;
  const seenComboActs = new Set<string>();
  for (let f = 0; f < 130; f++) {
    dummy.x = ag.x + 22; // Keep dummy within reach as agent lunges
    w.step(1 / 60);
    if (ag.wAction && ag.wAction.startsWith('combo')) seenComboActs.add(ag.wAction);
    if (seenComboActs.size === 4 && ag.wAction === 'combo4' && ag.wT > 0.25) break;
  }
  w.input.attackHold = false;
  for (let f = 0; f < 30; f++) w.step(1 / 60);
  assert.deepEqual([...seenComboActs], ['combo1', 'combo2', 'combo3', 'combo4'], 'Expected held attackHold to chain all 4 Dual Blades combo stages');
  assert.ok(dummy.comboHits >= 7, `Expected full 4-stage Dual Blades combo to land >=7 multi-hits on dummy, got ${dummy.comboHits}`);

  // Mid-combo mouse release returns directly to 45° standing idle without playing extra recovery frame
  w.aimAt(ag, ag.x + 80, ag.y - 16);
  assert.equal(w.swing(ag), 'combo1');
  w.input.attackHold = false;
  let returnedDirectIdle = false;
  for (let f = 0; f < 25; f++) {
    w.step(1 / 60);
    if (ag.wAction === 'aim') {
      const fp = AI.framePose(ag);
      assert.equal(fp.weapon.action, 'idle', 'Expected mid-combo mouse release on Dual Blades to return directly to 45° idle');
      assert.equal(fp.weapon.v34, true, 'Expected mid-combo mouse release on Dual Blades to use v34=true 45° idle');
      returnedDirectIdle = true;
      break;
    }
  }
  assert.ok(returnedDirectIdle, 'Expected Dual Blades combo1 release to return directly to idle');

  // Right-click Demon Dance skill lands 5 sequential multi-hits (4 rapid slashes + 1 heavy X finisher) and locks aim mid-sequence!
  dummy.comboHits = 0;
  dummy.x = ag.x + 22;
  dummy.y = ag.y;
  w.aimAt(ag, ag.x + 80, ag.y - 16);
  assert.equal(ag.face, 1);
  assert.equal(w.skill(ag), 'skill');
  // Move mouse behind character to the LEFT during active Demon Dance sequence frames -> must stay locked to +1 until skill finishes!
  w.aimAt(ag, ag.x - 100, ag.y - 30);
  for (let f = 0; f < 95; f++) {
    dummy.x = ag.x + 22;
    w.step(1 / 60);
    if (ag.wAction === 'skill') {
      assert.equal(ag.face, 1, `Expected Dual Blades Demon Dance sequence frames to lock facing (+1) on tick ${f}`);
    } else if (ag.wAction === 'aim') {
      break;
    }
  }
  assert.equal(dummy.comboHits, 5, `Expected Dual Blades Demon Dance skill to land 5 sequential multi-hits on dummy, got ${dummy.comboHits}`);
  assert.equal(ag.face, -1, 'Expected Dual Blades to turn to pending mouse direction (-1) immediately in the gap after Demon Dance finishes');
});



