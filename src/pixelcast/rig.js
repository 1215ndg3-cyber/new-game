/* PixelRig：像素人物通用骨架与渲染（无 DOM，浏览器和 Node 都能用）
 * 角度约定：以“垂直向下”为 0，朝向前方为正，单位度。人物默认朝右，镜像得到朝左。
 * 一个人物 = 骨架(SKELETON) + 角色规格(spec: build/look/gait/idle) + 姿势(pose)。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PixelRig = factory();
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';
  const GW = 80, GH = 80, GOFF = 30, GX = 20, FOOT = 45, SHY = 35;
  const rad = d => d * Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const SKELETON = {
    note: '像素人物通用骨架。角度以垂直向下为0，朝前为正，单位度；默认朝右，镜像得到朝左。',
    grid: { width: GW, height: GH, rowOffset: GOFF, colOffset: GX, footRow: FOOT, standingHipRow: SHY, spriteCell: [80, 48] },
    defaultBuild: { thigh: 6, shin: 5, upper: 3, fore: 3 },
    bones: [
      { name: 'pelvis', parent: null, note: '根骨骼，髋关节在 列15.5(+GX=19.5)、行hy，骨盆2行' },
      { name: 'torso', parent: 'pelvis', length: 4, widthPx: 2, note: '躯干4行，宽2（45°视角肩宽4）；lean 让上身逐行前倾，bob 让上身整体上下 ±1 行' },
      { name: 'neck', parent: 'torso', length: 1 },
      { name: 'head', parent: 'neck', size: [5, 5], note: '头 5列x5行（侧面）/6列x5行（45°）。上两行全是头发，脸从第3行开始；head:[dx,dy] 可整体偏移（低头、探头）' },
      { name: 'upperArmNear', parent: 'torso', length: 3, note: '肩在 列16+lean、行hy-7+bob，角度 na[0]' },
      { name: 'foreArmNear', parent: 'upperArmNear', length: 3, note: '角度 na[1]，末端是手' },
      { name: 'upperArmFar', parent: 'torso', length: 3, note: '肩在 列15+lean，画在身体后面，角度 fa[0]' },
      { name: 'foreArmFar', parent: 'upperArmFar', length: 3, note: '角度 fa[1]' },
      { name: 'thighNear', parent: 'pelvis', length: 6, note: '宽2像素，角度 nl[0]' },
      { name: 'shinNear', parent: 'thighNear', length: 5, note: '角度 nl[1]（绝对角，不是相对角）' },
      { name: 'footNear', parent: 'shinNear', length: 3, note: '脚3像素，朝前' },
      { name: 'thighFar', parent: 'pelvis', length: 6, note: '角度 fl[0]' },
      { name: 'shinFar', parent: 'thighFar', length: 5, note: '角度 fl[1]' },
      { name: 'footFar', parent: 'shinFar', length: 3 },
      { name: 'hairChain', parent: 'head', note: '马尾/长发/外套下摆：两节链，角度 tail[0]、tail[1]，表示向后下方的飘动' },
      { name: 'armMount', parent: 'torso', note: '独立手臂挂载枢轴（参考星界边境）：持武器时与躯干/腿部动作解耦，围绕肩关节(16+lean, hy-6+bob)做 360° 鼠标跟随旋转' },
      { name: 'weaponSocket', parent: 'foreArmNear', note: '武器挂点：绑定在主手手腕(wx,wy)，支持手枪瞄准/开火后座/战术换弹与近战挥砍精灵图层' }
    ],
    layers: ['backArm (后臂图层)', 'body (躯干与双腿图层)', 'weapon (武器与弹匣/枪口焰图层)', 'frontArm (前臂与握持手图层)'],
    view34: '待机用 45° 视角：po.v34=true；此时 na/fa 为画面左/右臂、nl/fl 为画面左/右腿，角度在画面平面内（向下为0，向画面右为正）',
    pose: {
      nl: '近侧腿 [大腿角, 小腿绝对角]', fl: '远侧腿', na: '近侧手臂 [上臂角, 前臂角]', fa: '远侧手臂',
      tail: '头发/外套飘动 [第一节角, 第二节角]', lean: '躯干前倾像素 -2..3', bob: '上身下沉像素（呼吸、叹气、缩肩）',
      head: '[dx,dy] 头部偏移', blink: '是否闭眼'
    }
  };

  const mkG = () => Array.from({ length: GH }, () => Array(GW).fill(null));
  function put(g, x, y, c) { x = Math.round(x) + GX; y = Math.round(y); if (c && x >= 0 && y >= 0 && x < GW && y < GH) g[y][x] = c; }
  function clr(g, x, y) { x = Math.round(x) + GX; y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) g[y][x] = null; }
  function recolor(g, x, y, c) { x = Math.round(x) + GX; y = Math.round(y); if (c && x >= 0 && y >= 0 && x < GW && y < GH && g[y][x]) g[y][x] = c; }
  function line(g, x0, y0, x1, y1, c, w) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), stx = x0 < x1 ? 1 : -1, sty = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    while (true) {
      for (let i = 0; i < w; i++) put(g, x0 + i, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += stx; }
      if (e2 <= dx) { e += dx; y0 += sty; }
    }
  }
  function legPts(b, th, sh) {
    const kx = b.thigh * Math.sin(rad(th)), ky = b.thigh * Math.cos(rad(th));
    return { kx, ky, ax: kx + b.shin * Math.sin(rad(sh)), ay: ky + b.shin * Math.cos(rad(sh)) };
  }
  function armPts(b, u, f) {
    const ex = b.upper * Math.sin(rad(u)), ey = b.upper * Math.cos(rad(u));
    return { ex, ey, wx: ex + b.fore * Math.sin(rad(f)), wy: ey + b.fore * Math.cos(rad(f)) };
  }
  function gHy(b, po) {
    if (po.hy != null) return po.hy;
    const a = legPts(b, po.nl[0], po.nl[1]), c = legPts(b, po.fl[0], po.fl[1]);
    return FOOT - Math.max(Math.round(a.ay), Math.round(c.ay));
  }
  function drawLeg2(g, L, hx, hy, cols, shoeStyle) {
    const ax = Math.round(hx + L.ax), ay = Math.round(hy + L.ay);
    const kx = Math.round(hx + L.kx), ky = Math.round(hy + L.ky);
    if (shoeStyle === 'cathodeMech') {
      // 显像管族四肢插槽（腿 2×5）：机械液压大腿 + 膝盖浅灰轴承转轴 (#9aa4b8) + 机械小腿与三趾抓地机械足
      line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0] || '#12141a', 1);
      put(g, hx + L.kx * 0.45, hy + L.ky * 0.45, cols[3] || '#2b3240');
      line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1] || '#12141a', 1);
      put(g, kx, ky, cols[4] || '#9aa4b8');
      put(g, ax, ay, cols[2] || '#12141a');
      put(g, ax + 1, ay, cols[3] || '#2b3240');
      put(g, ax + 2, ay, cols[4] || '#9aa4b8');
      return;
    }
    if (shoeStyle === 'mycoWrap') {
      // 孢子傀儡四肢插槽：大腿绗缝宇航服绑腿 (2px) + 亮色菌柄甲壳护膝 (cols[4]) + 绑带小腿与荧光孢子脚踝环 (cols[3]) + 3px 勘探靴与亮色靴头
      line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0] || '#423632', 2);
      put(g, hx + L.kx * 0.5 + 1, hy + L.ky * 0.5, cols[3] || '#4d8f52');
      line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1] || '#121216', 1);
      put(g, kx, ky, cols[4] || '#e6cfa1');
      put(g, ax, ay - 1, cols[3] || '#4d8f52');
      put(g, ax, ay, cols[2] || '#121216');
      put(g, ax + 1, ay, cols[2] || '#121216');
      put(g, ax + 2, ay, cols[4] || '#e6cfa1');
      return;
    }
    if (shoeStyle === 'cinderEmber') {
      // 烬骸族四肢插槽（腿 2×5）：黑曜石重甲双腿 + 膝盖熔岩裂纹 + 脚底常亮暗橙余烬像素 (#e05319)
      line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0] || '#141212', 2);
      line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1] || '#141212', 2);
      put(g, kx + 1, ky, cols[3] || '#2b1e1a');
      put(g, ax, ay, cols[2] || '#141212');
      put(g, ax + 1, ay, cols[4] || '#e05319');
      put(g, ax + 2, ay, cols[3] || '#2b1e1a');
      return;
    }
    line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0], 2);
    line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1], 2);
    if (cols[3]) { put(g, ax, ay - 1, cols[3]); put(g, ax + 1, ay - 1, cols[3]); }
    if (shoeStyle === 'combatBoots' && cols[3]) put(g, ax + 1, ay - 2, cols[3]);
    else if (shoeStyle === 'striderWraps' && cols[3]) put(g, ax, ay - 2, cols[3]);
    else if (shoeStyle === 'ironGreaves') put(g, ax + 1, ay - 2, cols[4] || cols[3] || '#b8c2d4');
    for (let i = 0; i < 3; i++) put(g, ax + i, ay, (i === 2 && cols[4]) ? cols[4] : cols[2]);
  }
  function sleeveThick(look, isNear, is34) {
    const o = look.outfit, sl = look.sleeve;
    if (o === 'labcoat' || sl === 'wide' || sl === 'short' || sl === 'pauldron' || sl === 'cinderRock' || sl === 'mycoWrap') {
      return is34 ? (isNear ? -1 : 1) : (isNear ? 1 : -1);
    }
    return 0;
  }
  function drawArm2(g, A, sx, sy, cols, thick, sleeveStyle) {
    const fdx = A.wx - A.ex, fdy = A.wy - A.ey, flen = Math.hypot(fdx, fdy) || 1;
    const tipX = sx + A.wx + (fdx / flen) * 0.92;
    const tipY = sy + A.wy + (fdy / flen) * 0.92;
    if (sleeveStyle === 'cathodeMech') {
      // 显像管族四肢插槽（臂 2×7）：肩部轴承环 + 纯黑机械细骨架 (#12141a) + 手肘浅灰转轴 (#9aa4b8) + 2px 机械钳手
      put(g, sx, sy, cols[2] || '#2b3240');
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0] || '#12141a', 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1] || '#12141a', 1);
      put(g, sx + A.ex, sy + A.ey, cols[3] || '#9aa4b8');
      put(g, sx + A.wx, sy + A.wy, cols[2] || '#2b3240');
      put(g, tipX, tipY, cols[4] || cols[3] || '#9aa4b8');
      return;
    }
    if (sleeveStyle === 'mycoWrap') {
      // 孢子傀儡四肢插槽：肩甲护垫 + 2px 宇航服绑带上臂 + 亮色菌柄甲壳护肘 (cols[4]) + 护腕前臂 + 荧光菌丝腕箍 (cols[3]) + 2px 双色手掌与指尖
      const shOff = thick < 0 ? -1 : 0;
      line(g, sx + shOff, sy, sx + A.ex * 0.78 + shOff, sy + A.ey * 0.78, cols[0] || '#423632', 2);
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0] || '#423632', 1);
      put(g, sx + shOff, sy, cols[4] || cols[0] || '#e6cfa1');
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1] || '#121216', 1);
      put(g, sx + A.ex, sy + A.ey, cols[4] || cols[3] || '#e6cfa1');
      const wx = sx + A.ex + fdx * 0.62, wy = sy + A.ey + fdy * 0.62;
      put(g, wx, wy, cols[3] || '#6bc46f');
      put(g, sx + A.wx, sy + A.wy, cols[2] || '#121216');
      put(g, tipX, tipY, cols[4] || cols[3] || '#e6cfa1');
      return;
    }
    if (sleeveStyle === 'cinderRock') {
      // 烬骸族四肢插槽（臂 3×7）：粗壮岩石手臂 (2px #1c1918) + 小臂外侧 1px 凸起岩石棱角 (#2e2725) + 手肘/手腕裂隙橘红光 (#ff6a2b) + 熔岩指爪
      const shOff = thick < 0 ? -1 : 0;
      const ridgeDir = thick < 0 ? -1 : 1;
      line(g, sx + shOff, sy, sx + A.ex + shOff, sy + A.ey, cols[0] || '#1c1918', 2);
      line(g, sx + shOff, sy + A.ey, sx + A.wx + shOff, sy + A.wy, cols[1] || '#1c1918', 2);
      put(g, sx + A.ex, sy + A.ey, '#bd3b14');
      const rx = sx + A.ex + fdx * 0.42 + (ridgeDir > 0 ? 1 : -1);
      const ry = sy + A.ey + fdy * 0.42;
      put(g, rx, ry, '#2e2725');
      put(g, rx + (ridgeDir > 0 ? 1 : -1), ry, '#2e2725');
      const wx = sx + A.ex + fdx * 0.80, wy = sy + A.ey + fdy * 0.80;
      put(g, wx, wy, cols[3] || '#ff6a2b');
      put(g, sx + A.wx, sy + A.wy, cols[2] || '#141212');
      put(g, tipX, tipY, cols[4] || '#ff7b29');
      return;
    }
    if (!sleeveStyle) {
      if (thick) {                                      // 袖子：靠肩膀的前 2/3 上臂加粗到 2 像素
        const px = sx + A.ex * 0.67, py = sy + A.ey * 0.67, off = thick < 0 ? -1 : 0;
        line(g, sx + off, sy, px + off, py, cols[0], 2);
      }
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
      put(g, sx + A.wx, sy + A.wy, cols[2]);
      return;
    }
    const off = thick < 0 ? -1 : 1;
    const shOff = thick < 0 ? -1 : 0;
    if (sleeveStyle === 'sleeveless') {
      // 无袖露肩：上臂与前臂全露肤色，手腕前 55% 处缠绕高对比武道护腕 (cols[3])，末端画手掌 (cols[2])
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
      if (cols[3]) {
        const bx = sx + A.ex + (A.wx - A.ex) * 0.55, by = sy + A.ey + (A.wy - A.ey) * 0.55;
        put(g, bx, by, cols[3]);
      }
      put(g, sx + A.wx, sy + A.wy, cols[2]);
      return;
    }
    if (sleeveStyle === 'short') {
      // 利落短袖：肩头前 45% 加宽袖肩，上臂为短袖布料，前臂与手部完全裸露肤色
      if (thick) line(g, sx + shOff, sy, sx + A.ex * 0.45 + shOff, sy + A.ey * 0.45, cols[0], 2);
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
      put(g, sx + A.wx, sy + A.wy, cols[2]);
      return;
    }
    if (sleeveStyle === 'rolled') {
      // 工装挽袖（中袖）：上臂为衬衫布料，手肘处卷起亮色袖箍 (cols[3])，前臂与手部露肤
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
      put(g, sx + A.ex * 0.9, sy + A.ey * 0.9, cols[3] || cols[0]);
      put(g, sx + A.wx, sy + A.wy, cols[2]);
      return;
    }
    if (sleeveStyle === 'wide') {
      // 浪人宽袖 / 羽织长袍袖：根据前臂朝向自动决定宽袖垂落方向（垂直下垂时向外侧加宽，水平抬起时向下垂落宽袖摆），绝不遮挡手部
      const px = sx + A.ex * 0.7, py = sy + A.ey * 0.7;
      if (thick) line(g, sx + shOff, sy, px + shOff, py, cols[0], 2);
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
      const fdx = A.wx - A.ex, fdy = A.wy - A.ey;
      if (Math.abs(fdx) > Math.abs(fdy)) {
        line(g, sx + A.ex, sy + A.ey + 1, sx + A.ex + fdx * 0.72, sy + A.ey + fdy * 0.72 + 1, cols[3] || cols[1], 1);
      } else {
        line(g, sx + A.ex + off, sy + A.ey, sx + A.ex + fdx * 0.68 + off, sy + A.ey + fdy * 0.68, cols[3] || cols[1], 1);
      }
      put(g, sx + A.wx, sy + A.wy, cols[2]);
      return;
    }
    if (sleeveStyle === 'pauldron') {
      // 重装立体肩铠 + 护臂铁甲：肩部绘制 2×2 立体铁肩甲与高光棱边，前臂带钢制护手
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
      put(g, sx, sy, cols[3] || cols[0]);
      put(g, sx + off, sy, cols[3] || cols[0]);
      put(g, sx + off, sy + 1, cols[0]);
      put(g, sx + A.wx, sy + A.wy, cols[2]);
      return;
    }
    if (sleeveStyle === 'cuffed') {
      // 炼金长风衣翻折宽袖口：长袖延伸至手腕上方，腕部带醒目皮革翻折袖箍 (cols[3])
      line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
      line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
      if (cols[3]) {
        const cx = sx + A.ex + (A.wx - A.ex) * 0.65, cy = sy + A.ey + (A.wy - A.ey) * 0.65;
        put(g, cx, cy, cols[3]);
      }
      put(g, sx + A.wx, sy + A.wy, cols[2]);
      return;
    }
    // 默认 'long'（修身长袖 / 衬衫长袖 / 夜行长袖）：上臂与前臂全覆盖长袖布料，腕部带袖口边 (cols[3])
    line(g, sx, sy, sx + A.ex, sy + A.ey, cols[0], 1);
    line(g, sx + A.ex, sy + A.ey, sx + A.wx, sy + A.wy, cols[1], 1);
    if (cols[3]) {
      const cx = sx + A.ex + (A.wx - A.ex) * 0.68, cy = sy + A.ey + (A.wy - A.ey) * 0.68;
      put(g, cx, cy, cols[3]);
    }
    put(g, sx + A.wx, sy + A.wy, cols[2]);
  }

  /* 头部模块化像素系统（基础头骨像素 BASE_HEAD + 发型叠加层 HAIR_PARTS + 帽饰叠加层 HAT_PARTS）：
   * 色键：h发 H发高光 s皮肤 e眼 a耳/皮肤暗部 x帽 X帽高光 b帽檐
   * 侧面：5列x5行（dy=-1..-2 是发髻/刺发/帽顶）。基础头骨先绘制完整颅骨与面部皮肤/耳部暗面，其上自由叠加任意发型与帽饰部件 */
  const BASE_HEAD = [
    [1,0,'a'],[2,0,'s'],[3,0,'s'],[4,0,'a'],
    [0,1,'a'],[1,1,'s'],[2,1,'s'],[3,1,'s'],[4,1,'s'],
    [0,2,'a'],[1,2,'s'],[2,2,'s'],[3,2,'s'],[4,2,'s'],
    [0,3,'a'],[1,3,'a'],[2,3,'s'],[3,3,'s'],[4,3,'s'],
    [0,4,'a'],[1,4,'s'],[2,4,'s'],[3,4,'s'],[4,4,'s']
  ];
  const BASE_HEAD34 = [
    [1,0,'a'],[2,0,'s'],[3,0,'s'],[4,0,'a'],
    [0,1,'a'],[1,1,'s'],[2,1,'s'],[3,1,'s'],[4,1,'s'],[5,1,'a'],
    [0,2,'a'],[1,2,'a'],[2,2,'s'],[3,2,'s'],[4,2,'s'],
    [0,3,'a'],[1,3,'a'],[2,3,'s'],[3,3,'s'],[4,3,'s'],
    [0,4,'a'],[1,4,'a'],[2,4,'s'],[3,4,'s'],[4,4,'s']
  ];
  const FACE = [[0,2,'h'],[1,2,'h'],[2,2,'h'],[3,2,'h'],[4,2,'s'],
    [0,3,'h'],[1,3,'a'],[2,3,'h'],[3,3,'s'],[4,3,'s'],
    [0,4,'h'],[1,4,'h'],[2,4,'h'],[3,4,'s'],[4,4,'s']];
  const TOP = [[0,0,'h'],[1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'h'],[0,1,'h'],[1,1,'h'],[2,1,'h'],[3,1,'H'],[4,1,'h']];
  const HEADS = {
    ponytail: [[1,-1,'h'],[2,-1,'h']].concat(TOP, FACE),
    short: [[1,-1,'h'],[2,-1,'H'],[3,-1,'h']].concat(TOP, FACE),
    long: TOP.concat(FACE),
    cap: [[1,-1,'x'],[2,-1,'X'],[3,-1,'x'],[0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'x'],[4,0,'x'],[0,1,'x'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'x'],[5,1,'b'],
      [0,2,'h'],[1,2,'h'],[2,2,'h'],[3,2,'h'],[4,2,'a'],[0,3,'h'],[1,3,'a'],[2,3,'h'],[3,3,'s'],[4,3,'s'],[0,4,'h'],[1,4,'h'],[2,4,'h'],[3,4,'s'],[4,4,'s']],
    bob: TOP.concat(FACE.slice(0, 14), [[0,5,'h'],[1,5,'h'],[2,5,'h']]),
    spiky: [[0,-1,'h'],[2,-2,'H'],[1,-1,'h'],[2,-1,'H'],[4,-1,'h']].concat(TOP, FACE),
    bun: [[1,-2,'h'],[2,-2,'H'],[1,-1,'h'],[2,-1,'H'],[3,-1,'h']].concat(TOP, FACE),
    mohawk: [[1,-2,'h'],[2,-2,'H'],[3,-2,'h'],[1,-1,'h'],[2,-1,'H'],[3,-1,'h'],[4,-1,'H'],
      [1,0,'h'],[2,0,'H'],[3,0,'h'],[0,1,'h'],[1,1,'h'],[2,1,'H'],[0,2,'h'],[1,2,'h'],[0,3,'h'],[0,4,'h']],
    parted: [[1,-1,'h'],[3,-1,'H']].concat(TOP, [[4,2,'H'],[0,2,'h'],[1,2,'h'],[2,2,'h'],[0,3,'h'],[1,3,'a'],[2,3,'h'],[0,4,'h'],[1,4,'h']]),
    bald: [[1,0,'a'],[0,1,'a'],[0,2,'a'],[1,3,'a'],[0,3,'a']],
    twintails: [[0,-2,'h'],[1,-2,'H'],[-1,-1,'h'],[0,-1,'H'],[1,-1,'h']].concat(TOP, FACE),
    samurai: [[0,-2,'h'],[1,-2,'H'],[2,-2,'H'],[0,-1,'h'],[1,-1,'H'],[2,-1,'h'],
      [1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'h'],[0,1,'h'],[1,1,'h'],[2,1,'H'],[3,1,'h'],[0,2,'h'],[1,2,'h'],[0,3,'h'],[1,3,'a'],[0,4,'h']],
    afro: [[0,-2,'h'],[1,-2,'H'],[2,-2,'H'],[3,-2,'h'],
      [-1,-1,'h'],[0,-1,'h'],[1,-1,'H'],[2,-1,'H'],[3,-1,'h'],[4,-1,'h'],
      [-1,0,'h'],[0,0,'h'],[1,0,'H'],[2,0,'h'],[3,0,'H'],[4,0,'h'],[5,0,'h'],
      [-1,1,'h'],[0,1,'h'],[1,1,'h'],[2,1,'H'],[3,1,'h'],[4,1,'h'],[5,1,'h'],
      [-1,2,'h'],[0,2,'h'],[1,2,'h'],[2,2,'h'],[-1,3,'h'],[0,3,'h'],[1,3,'a'],[0,4,'h'],[1,4,'h']],
    curls: [[0,-1,'h'],[1,-1,'H'],[2,-1,'h'],[3,-1,'H'],
      [-1,0,'h'],[0,0,'H'],[1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'H'],
      [-1,1,'H'],[0,1,'h'],[1,1,'H'],[2,1,'h'],[3,1,'H'],[4,1,'h'],
      [-1,2,'h'],[0,2,'H'],[1,2,'h'],[2,2,'h'],[3,2,'H'],
      [-1,3,'H'],[0,3,'h'],[1,3,'a'],[2,3,'h'],
      [-1,4,'h'],[0,4,'H'],[1,4,'h'],[2,4,'h'],
      [-1,5,'H'],[0,5,'h'],[1,5,'H'],[0,6,'h']],
    braid: [[1,-1,'h'],[2,-1,'H'],
      [0,0,'h'],[1,0,'H'],[2,0,'h'],[3,0,'H'],[4,0,'h'],
      [0,1,'H'],[1,1,'h'],[2,1,'H'],[3,1,'h'],[4,1,'h'],
      [0,2,'h'],[1,2,'H'],[2,2,'h'],[3,2,'h'],
      [0,3,'H'],[1,3,'a'],[2,3,'h'],
      [0,4,'h'],[1,4,'H'],[-1,4,'h'],[-1,5,'H'],[-1,6,'h'],[-1,7,'H']],
    undercut: [[1,-2,'H'],[2,-2,'H'],[3,-2,'h'],[0,-1,'h'],[1,-1,'H'],[2,-1,'h'],[3,-1,'H'],[4,-1,'H'],
      [0,0,'h'],[1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'H'],[5,0,'h'],
      [0,1,'a'],[1,1,'h'],[2,1,'h'],[3,1,'H'],[4,1,'h'],
      [0,2,'a'],[1,2,'a'],[0,3,'a'],[1,3,'a'],[0,4,'a']]
  };
  /* 45° 视角头：6列x5行，脸 2 列宽居中偏右，左侧露出耳/脸颊，头发在两侧包住 */
  const FACE34 = [[0,2,'h'],[1,2,'h'],[2,2,'h'],[3,2,'s'],[4,2,'s'],
    [0,3,'h'],[1,3,'a'],[2,3,'h'],[3,3,'s'],[4,3,'s'],
    [0,4,'h'],[1,4,'a'],[2,4,'h'],[3,4,'s'],[4,4,'s']];
  const TOP34 = [[0,0,'h'],[1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'h'],[5,0,'h'],[0,1,'h'],[1,1,'h'],[2,1,'h'],[3,1,'H'],[4,1,'h'],[5,1,'h']];
  const HEADS34 = {
    ponytail: [[1,-1,'h'],[2,-1,'h']].concat(TOP34, FACE34),
    short: [[1,-1,'h'],[2,-1,'H'],[3,-1,'h']].concat(TOP34, FACE34),
    long: TOP34.concat(FACE34, []),
    cap: [[1,-1,'x'],[2,-1,'X'],[3,-1,'x'],[4,-1,'x'],[0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'x'],[4,0,'x'],[5,0,'x'],[0,1,'x'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'x'],[5,1,'x'],[6,1,'b'],[7,1,'b'],
      [0,2,'h'],[1,2,'h'],[2,2,'h'],[3,2,'a'],[4,2,'a'],[0,3,'h'],[1,3,'a'],[2,3,'h'],[3,3,'s'],[4,3,'s'],[0,4,'h'],[1,4,'a'],[2,4,'h'],[3,4,'s'],[4,4,'s']],
    bob: TOP34.concat(FACE34, [[0,5,'h'],[1,5,'h']]),
    spiky: [[0,-1,'h'],[2,-2,'H'],[2,-1,'H'],[3,-1,'h'],[5,-1,'h']].concat(TOP34, FACE34),
    bun: [[2,-2,'h'],[3,-2,'H'],[1,-1,'h'],[2,-1,'H'],[3,-1,'h'],[4,-1,'h']].concat(TOP34, FACE34),
    mohawk: [[2,-2,'h'],[3,-2,'H'],[1,-1,'h'],[2,-1,'H'],[3,-1,'H'],[4,-1,'h'],
      [1,0,'h'],[2,0,'H'],[3,0,'h'],[0,1,'h'],[1,1,'h'],[2,1,'H'],[0,2,'h'],[1,2,'h'],[0,3,'h'],[0,4,'h']],
    parted: [[1,-1,'h'],[4,-1,'H']].concat(TOP34, [[5,2,'h'],[0,2,'h'],[1,2,'h'],[2,2,'h'],[0,3,'h'],[1,3,'a'],[2,3,'h'],[0,4,'h'],[1,4,'a']]),
    bald: [[1,0,'a'],[0,1,'a'],[0,2,'a'],[1,3,'a'],[0,3,'a']],
    twintails: [[0,-2,'h'],[5,-2,'h'],[-1,-1,'h'],[0,-1,'H'],[4,-1,'H'],[5,-1,'h'],[-1,0,'h'],[-1,1,'h'],[-1,2,'h'],[-1,3,'h'],[5,2,'h'],[5,3,'h']].concat(TOP34, FACE34),
    samurai: [[1,-2,'h'],[2,-2,'H'],[3,-2,'H'],[1,-1,'h'],[2,-1,'H'],[3,-1,'h'],
      [0,0,'h'],[1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'h'],[0,1,'h'],[1,1,'h'],[2,1,'H'],[3,1,'h'],[4,1,'h'],[0,2,'h'],[1,2,'h'],[0,3,'h'],[1,3,'a'],[0,4,'h']],
    afro: [[0,-2,'h'],[1,-2,'H'],[2,-2,'H'],[3,-2,'H'],[4,-2,'h'],
      [-1,-1,'h'],[0,-1,'h'],[1,-1,'H'],[2,-1,'H'],[3,-1,'H'],[4,-1,'h'],[5,-1,'h'],
      [-1,0,'h'],[0,0,'h'],[1,0,'H'],[2,0,'h'],[3,0,'H'],[4,0,'h'],[5,0,'h'],
      [-1,1,'h'],[0,1,'h'],[1,1,'h'],[2,1,'H'],[3,1,'h'],[4,1,'h'],[5,1,'h'],
      [-1,2,'h'],[0,2,'h'],[1,2,'h'],[2,2,'h'],[5,2,'h'],
      [-1,3,'h'],[0,3,'h'],[1,3,'a'],[2,3,'h'],[0,4,'h'],[1,4,'a']],
    curls: [[0,-1,'h'],[1,-1,'H'],[2,-1,'h'],[3,-1,'H'],[4,-1,'h'],
      [-1,0,'h'],[0,0,'H'],[1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'H'],[5,0,'h'],
      [-1,1,'H'],[0,1,'h'],[1,1,'H'],[2,1,'h'],[3,1,'H'],[4,1,'h'],[5,1,'H'],
      [-1,2,'h'],[0,2,'H'],[1,2,'h'],[2,2,'h'],[5,2,'h'],
      [-1,3,'H'],[0,3,'h'],[1,3,'a'],[2,3,'h'],[5,3,'H'],
      [-1,4,'h'],[0,4,'H'],[1,4,'a'],[2,4,'h'],[5,4,'h'],
      [0,5,'h'],[1,5,'H'],[5,5,'h']],
    braid: [[1,-1,'h'],[2,-1,'H'],[3,-1,'h'],
      [0,0,'h'],[1,0,'H'],[2,0,'h'],[3,0,'H'],[4,0,'h'],[5,0,'h'],
      [0,1,'H'],[1,1,'h'],[2,1,'H'],[3,1,'h'],[4,1,'h'],[5,1,'h'],
      [0,2,'h'],[1,2,'H'],[2,2,'h'],
      [0,3,'H'],[1,3,'a'],[2,3,'h'],
      [0,4,'h'],[1,4,'a'],[-1,4,'h'],[-1,5,'H'],[-1,6,'h'],[-1,7,'H']],
    undercut: [[2,-2,'H'],[3,-2,'H'],[4,-2,'h'],[1,-1,'h'],[2,-1,'H'],[3,-1,'h'],[4,-1,'H'],[5,-1,'H'],
      [0,0,'h'],[1,0,'h'],[2,0,'H'],[3,0,'h'],[4,0,'H'],[5,0,'h'],
      [0,1,'a'],[1,1,'h'],[2,1,'h'],[3,1,'H'],[4,1,'h'],[5,1,'a'],
      [0,2,'a'],[1,2,'a'],[0,3,'a'],[1,3,'a'],[0,4,'a']]
  };

  /* 帽饰/头饰叠加层（可自由叠加在任意基础头骨+发型之上）：侧面与 45° 视角
   * 支持 `' '`（空格色键）：针对完全包裹头顶的帽型（cap 鸭舌帽、strawHat 宽檐笠、hood 暗影兜帽、beret 战术贝雷帽），
   * 在帽顶轮廓上方放置 `[dx, dy, ' ']` 空格掩码像素，绘制时自动消除下方高耸或宽蓬发型（如丸子头、刺猬头、莫霍克、武士髻、爆炸头、双马尾、大背头）溢出帽顶的头发像素；
   * 而半开放头饰（bandana 束头巾、crown 三尖轻冠、visor 护目镜）不设顶部空格消除，自然保留头顶发丝。 */
  const HATS = {
    none: [],
    cap: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[2,-2,' '],[3,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[0,-1,' '],[4,-1,' '],[5,-1,' '],
      [-1,0,' '],[5,0,' '],
      [1,-1,'x'],[2,-1,'X'],[3,-1,'x'],
      [0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'x'],[4,0,'x'],
      [0,1,'x'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'x'],[5,1,'b'],[6,1,'b']
    ],
    strawHat: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[3,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[0,-1,' '],[4,-1,' '],[5,-1,' '],
      [2,-2,'X'],[1,-1,'x'],[2,-1,'X'],[3,-1,'x'],
      [-1,0,'b'],[0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'x'],[4,0,'x'],[5,0,'b'],
      [-2,1,'b'],[-1,1,'b'],[0,1,'b'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'b'],[5,1,'b'],[6,1,'b']
    ],
    bandana: [[-2,2,'b'],[-1,1,'b'],[0,1,'x'],[1,1,'x'],[2,1,'X'],[3,1,'x'],[4,1,'X']],
    hood: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[2,-2,' '],[3,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[4,-1,' '],[5,-1,' '],
      [0,-1,'x'],[1,-1,'x'],[2,-1,'X'],[3,-1,'x'],
      [-1,0,'x'],[0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'x'],[4,0,'x'],[5,0,'b'],
      [-1,1,'x'],[0,1,'x'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'b'],
      [-1,2,'x'],[0,2,'x'],[1,2,'x'],[-1,3,'x'],[0,3,'x'],[-1,4,'x'],[0,4,'x'],[-1,5,' '],[0,5,' '],[1,5,' '],[2,5,' '],[0,6,' '],[-1,6,' '],[-1,7,' ']
    ],
    beret: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[2,-2,' '],[3,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[4,-1,' '],[5,-1,' '],
      [5,0,' '],
      [0,-1,'x'],[1,-1,'X'],[2,-1,'X'],[3,-1,'x'],
      [-1,0,'x'],[0,0,'x'],[1,0,'X'],[2,0,'X'],[3,0,'x'],[4,0,'x'],
      [-1,1,'b'],[0,1,'x'],[1,1,'x'],[2,1,'b'],[3,1,'b'],[4,1,'b']
    ],
    crown: [[0,-1,'X'],[2,-1,'X'],[4,-1,'X'],[0,0,'x'],[1,0,'X'],[2,0,'x'],[3,0,'X'],[4,0,'x']],
    visor: [[1,1,'x'],[2,1,'x'],[3,1,'X'],[4,1,'X'],[5,1,'b'],[3,2,'X'],[4,2,'X']]
  };
  const HATS34 = {
    none: [],
    cap: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[2,-2,' '],[3,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[0,-1,' '],[5,-1,' '],
      [-1,0,' '],
      [1,-1,'x'],[2,-1,'X'],[3,-1,'x'],[4,-1,'x'],
      [0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'x'],[4,0,'x'],[5,0,'x'],
      [0,1,'x'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'x'],[5,1,'x'],[6,1,'b'],[7,1,'b']
    ],
    strawHat: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[0,-1,' '],[5,-1,' '],
      [2,-2,'X'],[3,-2,'X'],[1,-1,'x'],[2,-1,'X'],[3,-1,'X'],[4,-1,'x'],
      [-1,0,'b'],[0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'X'],[4,0,'x'],[5,0,'x'],[6,0,'b'],
      [-2,1,'b'],[-1,1,'b'],[0,1,'b'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'x'],[5,1,'b'],[6,1,'b'],[7,1,'b']
    ],
    bandana: [[-2,2,'b'],[-1,1,'b'],[0,1,'x'],[1,1,'x'],[2,1,'X'],[3,1,'x'],[4,1,'X'],[5,1,'x']],
    hood: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[2,-2,' '],[3,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[0,-1,' '],[5,-1,' '],
      [1,-1,'x'],[2,-1,'X'],[3,-1,'X'],[4,-1,'x'],
      [-1,0,'x'],[0,0,'x'],[1,0,'x'],[2,0,'X'],[3,0,'x'],[4,0,'x'],[5,0,'b'],
      [-1,1,'x'],[0,1,'x'],[1,1,'x'],[2,1,'x'],[3,1,'x'],[4,1,'x'],[5,1,'b'],
      [-1,2,'x'],[0,2,'x'],[1,2,'x'],[-1,3,'x'],[0,3,'x'],[-1,4,'x'],[0,4,'x'],[-1,5,' '],[0,5,' '],[1,5,' '],[5,5,' '],[-1,6,' '],[-1,7,' ']
    ],
    beret: [
      [-1,-2,' '],[0,-2,' '],[1,-2,' '],[2,-2,' '],[3,-2,' '],[4,-2,' '],[5,-2,' '],
      [-1,-1,' '],[5,-1,' '],
      [0,-1,'x'],[1,-1,'X'],[2,-1,'X'],[3,-1,'x'],[4,-1,'x'],
      [-1,0,'x'],[0,0,'x'],[1,0,'X'],[2,0,'X'],[3,0,'x'],[4,0,'x'],[5,0,'x'],
      [-1,1,'b'],[0,1,'x'],[1,1,'x'],[2,1,'b'],[3,1,'b'],[4,1,'b'],[5,1,'b']
    ],
    crown: [[1,-1,'X'],[3,-1,'X'],[5,-1,'X'],[0,0,'x'],[1,0,'X'],[2,0,'x'],[3,0,'X'],[4,0,'x'],[5,0,'X']],
    visor: [[1,1,'x'],[2,1,'x'],[3,1,'X'],[4,1,'X'],[5,1,'b'],[6,1,'b'],[3,2,'X'],[4,2,'X'],[5,2,'b']]
  };

  function headKey(look, po) {
    const c = look.cols;
    return {
      h: c.hair || '#1b1b1b',
      H: c.hairHi || c.hair || '#2c2c2c',
      s: c.skin || '#f3c9a5',
      e: po && po.blink ? c.skin : (c.eye || '#1b1b1b'),
      a: c.skinSh || c.skin || '#d9a987',
      x: c.hat || '#3a4150',
      X: c.hatHi || c.hat || '#566075',
      b: c.hatBrim || c.hat || '#252932'
    };
  }
  function drawHead(g, look, po, ox, oy) {
    const key = headKey(look, po);
    // 1. 先铺设基础头骨像素层 (BASE_HEAD)
    for (const m of BASE_HEAD) put(g, ox + m[0], oy + m[1], key[m[2]]);
    // 2. 叠加发型像素层 (HEADS)
    const map = HEADS[look.hair] || HEADS.ponytail;
    for (const m of map) put(g, ox + m[0], oy + m[1], key[m[2]]);
    // 3. 叠加可选帽饰像素层 (HATS)：遇到 ' ' 空格掩码自动消除帽顶上方的头发像素
    const hat = look.hat && HATS[look.hat] ? HATS[look.hat] : null;
    if (hat && hat.length) {
      for (const m of hat) {
        if (m[2] === ' ') clr(g, ox + m[0], oy + m[1]);
        else put(g, ox + m[0], oy + m[1], key[m[2]]);
      }
    }
  }
  function drawHead34(g, look, po, ox, oy) {
    const key = headKey(look, po);
    // 1. 先铺设 45° 基础头骨像素层 (BASE_HEAD34)
    for (const m of BASE_HEAD34) put(g, ox + m[0], oy + m[1], key[m[2]]);
    // 2. 叠加 45° 发型像素层 (HEADS34)
    const map = HEADS34[look.hair] || HEADS34.ponytail;
    for (const m of map) put(g, ox + m[0], oy + m[1], key[m[2]]);
    // 3. 叠加可选 45° 帽饰像素层 (HATS34)：遇到 ' ' 空格掩码自动消除帽顶上方的头发像素
    const hat = look.hat && HATS34[look.hat] ? HATS34[look.hat] : null;
    if (hat && hat.length) {
      for (const m of hat) {
        if (m[2] === ' ') clr(g, ox + m[0], oy + m[1]);
        else put(g, ox + m[0], oy + m[1], key[m[2]]);
      }
    }
  }

  /* ---------- 三大类人形外星种族（显像管族 Cathode-Folk / 孢子傀儡 Myco-Hosts / 烬骸族 Cinderborn）插槽与微特效渲染 ---------- */
  const ALIEN_SPECIES = {
    cathode: {
      id: 'cathode',
      name: '显像管族',
      subName: 'Cathode-Folk · 信号遗民',
      headSpec: '7×6 复古显像管电视机（左受光浅灰蓝 #98a9be / 右背光深蓝灰 #4f5d73 + 5×4 纯黑屏缺口白环）',
      torsoSpec: '9×11 高领防寒废土风衣（深石板灰梯形剪影 + 破损锯齿下摆 + 左胸冰青指示灯 #6be6ff）',
      limbSpec: '臂 2×7 / 腿 2×5 纯黑机械细骨架 (#12141a) + 肘膝浅灰转轴像素 (#9aa4b8)',
      fxSpec: '待机白环上下浮动 1px · 开火切换亮青十字准星 (#6be6ff) · 受击闪现红白雪花噪点',
    },
    myco: {
      id: 'myco',
      name: '孢子傀儡',
      subName: 'Myco-Hosts · 菌伞旅人',
      headSpec: '10~12×5~6 巨型伞菌（5种伞型纹理 + 伞底放射状明暗交替菌褶 + 右檐 3px 发光孢子链）',
      torsoSpec: '8×10 破旧宇航服躯干（5种变种配色） + 背部 4×6 深色维生背囊 + 胸口斜向共生菌丝',
      limbSpec: '臂 2×6 / 腿 2×6 宇航服绑腿 + 1px 纯黑极简细线小腿与手部 (#121216)',
      fxSpec: '跑动时伞檐发光孢子吊坠滞后 1px 摆动 · 跳跃滞空伞缘上扬并飘落双色孢子',
    },
    cinder: {
      id: 'cinder',
      name: '烬骸族',
      subName: 'Cinderborn · 余烬铸造者',
      headSpec: '6×6 焦黑火山岩头颅 (#1c1918) + 头顶 3 根尖锐黑曜石碎角 + 偏下 2px 亮金黄发光竖缝 (#ffd23f)',
      torsoSpec: '8×11 倒三角纯黑岩石胸甲 + 焦炭破损短披肩 + 中央 2×3 镂空“熔炉之心”（白核+亮黄+橘红）',
      limbSpec: '臂 3×7 粗壮岩石棱角臂（手腕透出橘红裂隙光 #ff6a2b） + 腿 2×5 纯黑剪影（脚底常亮暗橙余烬 #e05319）',
      fxSpec: '待机呼吸时胸口亮黄火光向上跳动 1px · 行走与跳跃时脚底与披肩飘散上升亮黄火星粒子',
    },
  };

  /* 孢子傀儡 (Myco-Hosts) 5 大菌伞变种：解放高矮胖瘦体型限制，涵盖立体高耸/漏斗/尖塔伞冠、放射状菌褶、完整菌环+纤维菌柄脖颈、丰富宇航服装备纹理及独立孢子特效层 */
  const MYCO_VARIANTS = {
    crimsonUmbrella: {
      id: 'crimsonUmbrella',
      name: '赤红巨伞·荒漠重装种',
      capType: 'flatUmbrella',
      capTypeName: '12×7 圆拱赤红斑点巨伞',
      bodyBuild: 'standard',
      bodyBuildName: '标准均衡体型 (1.0x)',
      defaultIdle: 'lookout',
      capHi: '#d14338',
      capMid: '#b8322a',
      capSh: '#8f221b',
      capSpot: '#f2a699',
      gillHi: '#f5e8bc',
      gillMid: '#d9be7e',
      gillSh: '#3d1e2e',
      gillShDeep: '#28121e',
      stipeHi: '#e6cfa1',
      stipeSh: '#9c7d54',
      sporeMid: '#e6fff2',
      sporeTip: '#b8ffd8',
      suitHi: '#664b3e',
      suitMid: '#543d32',
      suitSh: '#3b2a22',
      strapCol: '#8c6747',
      beltCol: '#291d17',
      beltBuckle: '#e6cfa1',
      gaugeCol: '#6eff82',
      packBorder: '#261c18',
      packFill: '#382924',
      mycHi: '#6bc46f',
      mycSh: '#4d8f52',
      wrapN: '#59443b',
      wrapF: '#382a24',
      foreN: '#2b2422',
      foreF: '#1c1817',
      jointN: '#e6cfa1',
      jointF: '#9c7d54',
      sporeAir1: '#6eff82',
      sporeAir2: '#b8322a',
    },
    ivoryGhost: {
      id: 'ivoryGhost',
      name: '苍白鬼伞·修长高挑种',
      capType: 'archedGill',
      capTypeName: '12×8 高拱透光宽褶鬼伞',
      bodyBuild: 'slender',
      bodyBuildName: '高挑修长体型 (高+2px·窄腰)',
      defaultIdle: 'cross',
      capHi: '#ffffff',
      capMid: '#dce6f5',
      capSh: '#8fa4c4',
      capSpot: '#b0c4de',
      gillHi: '#fff9c4',
      gillMid: '#ebcf78',
      gillSh: '#38304c',
      gillShDeep: '#241e33',
      stipeHi: '#f5ecc6',
      stipeSh: '#8c8270',
      sporeMid: '#fff9c4',
      sporeTip: '#96ebff',
      suitHi: '#526075',
      suitMid: '#39424f',
      suitSh: '#262d38',
      strapCol: '#7f92b0',
      beltCol: '#1d232b',
      beltBuckle: '#fff9c4',
      gaugeCol: '#96ebff',
      packBorder: '#1a202c',
      packFill: '#2d3748',
      mycHi: '#6ef2d6',
      mycSh: '#38b2ac',
      wrapN: '#4a5568',
      wrapF: '#2d3542',
      foreN: '#252b36',
      foreF: '#181c24',
      jointN: '#fff9c4',
      jointF: '#8fa4c4',
      sporeAir1: '#fff9c4',
      sporeAir2: '#6ef2d6',
    },
    luminaBell: {
      id: 'luminaBell',
      name: '幽光钟伞·深穴水母种',
      capType: 'domedBell',
      capTypeName: '11×9 高耸水母荧光钟伞',
      bodyBuild: 'tall',
      bodyBuildName: '深穴长臂修长型 (高+1px·长臂)',
      defaultIdle: 'think',
      capHi: '#5ce1e6',
      capMid: '#2978a0',
      capSh: '#1b4965',
      capSpot: '#c4fff9',
      gillHi: '#e0fff9',
      gillMid: '#8ce8d8',
      gillSh: '#163845',
      gillShDeep: '#0d222b',
      stipeHi: '#b8f2e6',
      stipeSh: '#4a8c8a',
      sporeMid: '#c4fff9',
      sporeTip: '#5ce1e6',
      suitHi: '#3d5a66',
      suitMid: '#283b42',
      suitSh: '#19272c',
      strapCol: '#4ea8b8',
      beltCol: '#121f24',
      beltBuckle: '#c4fff9',
      gaugeCol: '#5ce1e6',
      packBorder: '#101a1e',
      packFill: '#1d2e36',
      mycHi: '#5ce1e6',
      mycSh: '#2998a6',
      wrapN: '#344f59',
      wrapF: '#1f3036',
      foreN: '#1d2c33',
      foreF: '#121c21',
      jointN: '#c4fff9',
      jointF: '#4a8c8a',
      sporeAir1: '#5ce1e6',
      sporeAir2: '#e0fff9',
    },
    amberChanterelle: {
      id: 'amberChanterelle',
      name: '琥珀鸡油菌·丰满胖肚种',
      capType: 'wavyFunnel',
      capTypeName: '14×8 宽展翻卷漏斗号角伞',
      bodyBuild: 'chubby',
      bodyBuildName: '敦实丰满胖肚型 (宽腹9px·发酵罐)',
      defaultIdle: 'backhands',
      capHi: '#f5b041',
      capMid: '#d9822b',
      capSh: '#9c5518',
      capSpot: '#ffe6a3',
      gillHi: '#fff3c4',
      gillMid: '#e8bd6b',
      gillSh: '#4a2810',
      gillShDeep: '#301808',
      stipeHi: '#f5d78e',
      stipeSh: '#a67432',
      sporeMid: '#fff3c4',
      sporeTip: '#f5b041',
      suitHi: '#635942',
      suitMid: '#4a4333',
      suitSh: '#332e22',
      strapCol: '#9c7138',
      beltCol: '#262015',
      beltBuckle: '#ffe6a3',
      gaugeCol: '#fff3c4',
      packBorder: '#242016',
      packFill: '#383224',
      mycHi: '#f5b041',
      mycSh: '#c97a24',
      wrapN: '#5c523d',
      wrapF: '#383224',
      foreN: '#2e291f',
      foreF: '#1f1b14',
      jointN: '#ffe6a3',
      jointF: '#a67432',
      sporeAir1: '#ffe6a3',
      sporeAir2: '#d9822b',
    },
    violetMorel: {
      id: 'violetMorel',
      name: '紫渊网盖·尖塔魁梧种',
      capType: 'conicalMorel',
      capTypeName: '12×10 摩天蜂窝尖塔羊肚菌',
      bodyBuild: 'broad',
      bodyBuildName: '魁梧宽肩重甲型 (高+1px·宽肩甲)',
      defaultIdle: 'hug',
      capHi: '#b366ff',
      capMid: '#7b38a6',
      capSh: '#491d66',
      capSpot: '#ffb8ff',
      gillHi: '#f5e0ff',
      gillMid: '#cf9eff',
      gillSh: '#2b123d',
      gillShDeep: '#1a0926',
      stipeHi: '#dec2f5',
      stipeSh: '#7a5299',
      sporeMid: '#f5e0ff',
      sporeTip: '#d980fa',
      suitHi: '#523f61',
      suitMid: '#382c42',
      suitSh: '#241b2b',
      strapCol: '#8a56b5',
      beltCol: '#1b1321',
      beltBuckle: '#ffb8ff',
      gaugeCol: '#e066ff',
      packBorder: '#18111d',
      packFill: '#291e33',
      mycHi: '#e066ff',
      mycSh: '#9b38bd',
      wrapN: '#493859',
      wrapF: '#2b2036',
      foreN: '#241b2e',
      foreF: '#16101c',
      jointN: '#f5e0ff',
      jointF: '#7a5299',
      sporeAir1: '#e066ff',
      sporeAir2: '#6eff82',
    },
  };

  function resolveMycoStyle(spec) {
    const varId = (spec && spec.mycoVariant) || (spec && spec.look && spec.look.mycoVariant) || 'crimsonUmbrella';
    const base = MYCO_VARIANTS[varId] || MYCO_VARIANTS.crimsonUmbrella;
    const cfg = (spec && spec.mycoConfig) || (spec && spec.look && spec.look.mycoConfig);
    if (!cfg) return base;
    return Object.assign({}, base, cfg);
  }

  /* 显像管族 (Cathode-Folk) 6 大显示器变种：涵盖 6 种显示器几何轮廓（方正CRT、棱晶菱形、正三角金字塔、倒三角楔形雷达、八角球面监视器、双联宽屏示波仪）× 6 种待机动态屏显图案 × 6 种高矮胖瘦形态与同色系涂装 */
  const CATHODE_VARIANTS = {
    retroCrt: {
      id: 'retroCrt',
      name: '极地显像管·标准风衣种',
      headShape: 'crtBox',
      headShapeName: '7×6 方正复古显像管',
      screenMotif: 'ring',
      screenMotifName: '待机·缺口极简白环浮动',
      bodyBuild: 'standard',
      bodyBuildName: '标准防寒风衣体型',
      defaultIdle: 'lookout',
      caseHi: '#b0becf',
      caseMid: '#8496ab',
      caseSh: '#4a5869',
      caseDeep: '#2e3744',
      scrHi: '#e8f0f7',
      scrMid: '#8ab4cc',
      crossCol: '#a8d5eb',
      ledCol: '#9ac2d9',
      coatHi: '#455061',
      coatMid: '#323a47',
      coatSh: '#222832',
      collarHi: '#5a687d',
      strapCol: '#67758a',
      beltCol: '#1a1f26',
      beltBuckle: '#97a8bd',
      hemCol: '#282f3a',
      limbMain: '#12151a',
      limbSub: '#1d222b',
      limbJoint: '#95a3b5',
      limbHi: '#b0becf',
    },
    diamondPrism: {
      id: 'diamondPrism',
      name: '拉丝银铝·菱形屏修长观测官',
      headShape: 'diamond',
      headShapeName: '9×9 悬浮棱晶菱形显示器',
      screenMotif: 'hourglass',
      screenMotifName: '待机·双三角量子沙漏脉动',
      bodyBuild: 'slender',
      bodyBuildName: '修长观测官长大衣 (高+2px·窄腰排扣)',
      defaultIdle: 'cross',
      caseHi: '#c4ccd4',
      caseMid: '#97a1ab',
      caseSh: '#5c656e',
      caseDeep: '#383e45',
      scrHi: '#f0f4f8',
      scrMid: '#9cb2c7',
      crossCol: '#b8d0e6',
      ledCol: '#b0c4d8',
      coatHi: '#4a525c',
      coatMid: '#353b42',
      coatSh: '#24282e',
      collarHi: '#646e7a',
      strapCol: '#78828f',
      beltCol: '#1b1e24',
      beltBuckle: '#b8c2cc',
      hemCol: '#2b3036',
      limbMain: '#14171a',
      limbSub: '#22262b',
      limbJoint: '#a3adb8',
      limbHi: '#c4ccd4',
    },
    triangleSentinel: {
      id: 'triangleSentinel',
      name: '枪铁黑钛·正三角宽肩重甲卫士',
      headShape: 'triangle',
      headShapeName: '11×8 正三角棱锥重工显示器',
      screenMotif: 'eyeScan',
      screenMotifName: '待机·独眼机械光瞳左右扫描',
      bodyBuild: 'broad',
      bodyBuildName: '魁梧重型肩甲胸铠 (高+1px·铆钉宽肩甲)',
      defaultIdle: 'hips',
      caseHi: '#8c949e',
      caseMid: '#646c75',
      caseSh: '#3b4047',
      caseDeep: '#24282e',
      scrHi: '#e2e8f0',
      scrMid: '#8a99ad',
      crossCol: '#a3b8cc',
      ledCol: '#9cb0c4',
      coatHi: '#3d434a',
      coatMid: '#2b3036',
      coatSh: '#1d2024',
      collarHi: '#525a63',
      strapCol: '#68707a',
      beltCol: '#15181c',
      beltBuckle: '#8c949e',
      hemCol: '#23272b',
      limbMain: '#101214',
      limbSub: '#1c2024',
      limbJoint: '#858e99',
      limbHi: '#a6b0bd',
    },
    wedgeRadar: {
      id: 'wedgeRadar',
      name: '军工灰绿·倒三角高个侦察机兵',
      headShape: 'invTriangle',
      headShapeName: '11×8 楔形倒三角战术雷达头',
      screenMotif: 'heartbeat',
      screenMotifName: '待机·示波脉冲折线跳动',
      bodyBuild: 'tall',
      bodyBuildName: '高个外骨骼战术衣 (高+1px·X型液压带)',
      defaultIdle: 'think',
      caseHi: '#878f80',
      caseMid: '#626b5c',
      caseSh: '#3d4539',
      caseDeep: '#262b23',
      scrHi: '#dce6d8',
      scrMid: '#8fa68a',
      crossCol: '#a8bfa2',
      ledCol: '#9bb396',
      coatHi: '#42473d',
      coatMid: '#2f332b',
      coatSh: '#1f221c',
      collarHi: '#565e50',
      strapCol: '#6b7564',
      beltCol: '#171a15',
      beltBuckle: '#929c8a',
      hemCol: '#262a23',
      limbMain: '#121411',
      limbSub: '#1f241d',
      limbJoint: '#878f80',
      limbHi: '#a3ad9b',
    },
    hexDomeHeavy: {
      id: 'hexDomeHeavy',
      name: '锈铁铸铜·八角球丰满反应炉种',
      headShape: 'hexOctagon',
      headShapeName: '9×8 八角球面重工监视器',
      screenMotif: 'equalizer',
      screenMotifName: '待机·三柱频谱高低交替跃动',
      bodyBuild: 'chubby',
      bodyBuildName: '重装球形反应炉躯干 (圆腹散热格栅)',
      defaultIdle: 'backhands',
      caseHi: '#9c8470',
      caseMid: '#755f4e',
      caseSh: '#4a3b30',
      caseDeep: '#2e241d',
      scrHi: '#e8dfd5',
      scrMid: '#b8a38c',
      crossCol: '#cfbda8',
      ledCol: '#c4b097',
      coatHi: '#4a3e35',
      coatMid: '#362c25',
      coatSh: '#241d18',
      collarHi: '#635245',
      strapCol: '#7d6856',
      beltCol: '#1a1411',
      beltBuckle: '#a8907a',
      hemCol: '#2b231d',
      limbMain: '#14110e',
      limbSub: '#241e19',
      limbJoint: '#9c8470',
      limbHi: '#b89f8a',
    },
    wideScopeUnit: {
      id: 'wideScopeUnit',
      name: '旧化电木·双联宽屏矮敦工程兵',
      headShape: 'wideScope',
      headShapeName: '11×6 双联宽屏示波终端',
      screenMotif: 'radarTri',
      screenMotifName: '待机·三角信标准星缩放',
      bodyBuild: 'shortChubby',
      bodyBuildName: '矮敦工程机甲短袄 (矮-2px·紧凑机甲)',
      defaultIdle: 'salute',
      caseHi: '#c2bbb0',
      caseMid: '#968f83',
      caseSh: '#615c53',
      caseDeep: '#3d3933',
      scrHi: '#ebe6dc',
      scrMid: '#a89f91',
      crossCol: '#c4bdb0',
      ledCol: '#b8b0a2',
      coatHi: '#524c44',
      coatMid: '#3b3630',
      coatSh: '#26231f',
      collarHi: '#6e675c',
      strapCol: '#857d70',
      beltCol: '#1c1916',
      beltBuckle: '#b5ada0',
      hemCol: '#302c27',
      limbMain: '#141311',
      limbSub: '#24211d',
      limbJoint: '#a69f92',
      limbHi: '#c2bbb0',
    },
    tubeExoUnit: {
      id: 'tubeExoUnit',
      name: '钨钢玄铁·真空管镂空外骨骼种',
      headShape: 'cylinderTube',
      headShapeName: '7×9 竖置真空电子管屏',
      screenMotif: 'heartbeat',
      screenMotifName: '待机·示波脉冲折线跳动',
      bodyBuild: 'exoFrame',
      bodyBuildName: '镂空液压外骨骼机躯 (裸露机械脊柱)',
      defaultIdle: 'pockets',
      caseHi: '#78808a',
      caseMid: '#525861',
      caseSh: '#32363d',
      caseDeep: '#1e2126',
      scrHi: '#d8e4ed',
      scrMid: '#7c9cb0',
      crossCol: '#9cb8cc',
      ledCol: '#8eacbf',
      coatHi: '#383d45',
      coatMid: '#262a30',
      coatSh: '#181b20',
      collarHi: '#4f5661',
      strapCol: '#636b78',
      beltCol: '#121417',
      beltBuckle: '#8a94a1',
      hemCol: '#1f2329',
      limbMain: '#0f1114',
      limbSub: '#1c2026',
      limbJoint: '#78808a',
      limbHi: '#9aa4b0',
    },
    visorPistonUnit: {
      id: 'visorPistonUnit',
      name: '旧化黄铜·横缝装甲双缸重机兵',
      headShape: 'visorSlit',
      headShapeName: '9×7 重装横缝装甲头',
      screenMotif: 'eyeScan',
      screenMotifName: '待机·独眼机械光瞳左右扫描',
      bodyBuild: 'pistonHulk',
      bodyBuildName: '双缸重装液压巨躯 (重型双联活塞胸甲)',
      defaultIdle: 'stretch',
      caseHi: '#a89878',
      caseMid: '#7d6f54',
      caseSh: '#524735',
      caseDeep: '#332c20',
      scrHi: '#ece6d8',
      scrMid: '#b5a689',
      crossCol: '#cfc2a6',
      ledCol: '#c2b393',
      coatHi: '#4a4234',
      coatMid: '#363025',
      coatSh: '#241f18',
      collarHi: '#635845',
      strapCol: '#7d6f56',
      beltCol: '#1a1611',
      beltBuckle: '#a89878',
      hemCol: '#2b261d',
      limbMain: '#14120e',
      limbSub: '#242019',
      limbJoint: '#968769',
      limbHi: '#b5a689',
    },
  };

  function resolveCathodeStyle(spec) {
    const varId = (spec && spec.cathodeVariant) || (spec && spec.look && spec.look.cathodeVariant) || 'retroCrt';
    const base = CATHODE_VARIANTS[varId] || CATHODE_VARIANTS.retroCrt;
    const cfg = (spec && spec.cathodeConfig) || (spec && spec.look && spec.look.cathodeConfig);
    if (!cfg) return base;
    const m = Object.assign({}, base, cfg);
    if (cfg.shellHi && !cfg.caseHi) m.caseHi = cfg.shellHi;
    if (cfg.shellMid && !cfg.caseMid) m.caseMid = cfg.shellMid;
    if (cfg.shellSh && !cfg.caseSh) m.caseSh = cfg.shellSh;
    if (cfg.shellDark && !cfg.caseDeep) m.caseDeep = cfg.shellDark;
    if (cfg.scrMain && !cfg.scrHi) m.scrHi = cfg.scrMain;
    if (cfg.scrSub && !cfg.scrMid) m.scrMid = cfg.scrSub;
    if (cfg.coatHem && !cfg.hemCol) m.hemCol = cfg.coatHem;
    if (cfg.jointN && !cfg.limbJoint) m.limbJoint = cfg.jointN;
    if (cfg.jointF && !cfg.limbHi) m.limbHi = cfg.jointF;
    return m;
  }

  /* 烬骸族（Cinderborn / 余烬铸造者）12 大预设变种与模块化熔岩解析器：
   * 支持 8 种火山岩/黑曜石颅骨头型 × 6 种面部火缝与熔炉之心联动形态 × 9 种熔岩胸甲体型 × 12 种高辨识度火山矿岩与熔火色温搭配 */
  const CINDER_VARIANTS = {
    obsidianForge: {
      id: 'obsidianForge',
      name: '黑曜金焰·余烬标准铸造者',
      headShape: 'jaggedCrag',
      headShapeName: '6×6 三尖黑曜碎角颅',
      coreMotif: 'vertSlit',
      coreMotifName: '竖缝火瞳 × 2×3 经典熔炉之心',
      bodyBuild: 'standard',
      bodyBuildName: '倒三角黑岩胸甲+短披肩 (标准体型)',
      colorThemeId: 'obsidianGold',
      defaultIdle: 'lookout',
      rockHi: '#38302e',
      rockMid: '#2b2523',
      rockBase: '#1c1918',
      rockDeep: '#0f0d0d',
      shawlHi: '#473a35',
      shawlMid: '#332a27',
      shawlTrim: '#6e473b',
      beltCol: '#2e2422',
      beltGlow: '#bd3b14',
      flameCore: '#ffffff',
      flameHi: '#ffd23f',
      flameMid: '#ff7b29',
      flameLow: '#ff5a1f',
      wristGlow: '#ff6a2b',
      soleEmber: '#e05319',
    },
    basaltHornLord: {
      id: 'basaltHornLord',
      name: '赤红血曜·双角勾带熔岩督军',
      headShape: 'twinHorn',
      headShapeName: '8×8 双弯熔岩魔角颅',
      coreMotif: 'crossForge',
      coreMotifName: '十字锻纹火瞳 × 十字星芒炉心',
      bodyBuild: 'broad',
      bodyBuildName: '魁梧双肩火山角重铠 (高+1px·宽肩甲)',
      colorThemeId: 'basaltCrimson',
      defaultIdle: 'beltHook',
      rockHi: '#753236',
      rockMid: '#592428',
      rockBase: '#40181b',
      rockDeep: '#240c0e',
      shawlHi: '#9e3b37',
      shawlMid: '#732825',
      shawlTrim: '#d95b43',
      beltCol: '#4a1b1d',
      beltGlow: '#e62e2d',
      flameCore: '#fff5f2',
      flameHi: '#ff9478',
      flameMid: '#ff4738',
      flameLow: '#d91e1e',
      wristGlow: '#ff5738',
      soleEmber: '#cc2218',
    },
    sulfurCrownPriest: {
      id: 'sulfurCrownPriest',
      name: '硫磺钴蓝·日冕理领幽蓝祭司',
      headShape: 'crownSpire',
      headShapeName: '8×8 五棘日冕王冠颅',
      coreMotif: 'triEmber',
      coreMotifName: '三眼余烬火瞳 × 倒三角三核熔炉',
      bodyBuild: 'slender',
      bodyBuildName: '高挑修长黑曜祭司甲 (高+2px·窄腰长摆)',
      colorThemeId: 'blueSulfur',
      defaultIdle: 'collarFix',
      rockHi: '#426b99',
      rockMid: '#2e4e73',
      rockBase: '#1f3652',
      rockDeep: '#112033',
      shawlHi: '#4f86b8',
      shawlMid: '#35608a',
      shawlTrim: '#75b8eb',
      beltCol: '#243f5e',
      beltGlow: '#2998ff',
      flameCore: '#f2fcff',
      flameHi: '#8cf5ff',
      flameMid: '#45b6ff',
      flameLow: '#1f84ff',
      wristGlow: '#5ce1ff',
      soleEmber: '#1f7ae0',
    },
    ashAnvilSmith: {
      id: 'ashAnvilSmith',
      name: '苍白骨灰·锻砧叉腰矮敦铁匠',
      headShape: 'anvilFlat',
      headShapeName: '8×6 宽平锻砧重装颅',
      coreMotif: 'visoredMagma',
      coreMotifName: '横贯熔岩目镜 × 双列高炉火栅',
      bodyBuild: 'shortChubby',
      bodyBuildName: '矮敦锻造工匠短岩甲 (矮-2px·平整后背)',
      colorThemeId: 'whiteAsh',
      defaultIdle: 'hips',
      rockHi: '#a69f95',
      rockMid: '#857e75',
      rockBase: '#635d56',
      rockDeep: '#3d3935',
      shawlHi: '#9e6b47',
      shawlMid: '#784f33',
      shawlTrim: '#cf9259',
      beltCol: '#4f3928',
      beltGlow: '#e66724',
      flameCore: '#ffffff',
      flameHi: '#fff2a6',
      flameMid: '#ffab40',
      flameLow: '#ff7b29',
      wristGlow: '#ff9436',
      soleEmber: '#e0671f',
    },
    calderaGolem: {
      id: 'calderaGolem',
      name: '赭石熔渣·火山口背手巨釜魔像',
      headShape: 'calderaCrater',
      headShapeName: '8×7 火山口凹陷盆颅',
      coreMotif: 'hollowCore',
      coreMotifName: '空洞旋涡火眼 × 环状日冕熔炉',
      bodyBuild: 'chubby',
      bodyBuildName: '重装熔岩巨釜圆腹躯干 (圆腹格栅·平整后背)',
      colorThemeId: 'rustFurnace',
      defaultIdle: 'backhands',
      rockHi: '#944e2f',
      rockMid: '#733b22',
      rockBase: '#542a18',
      rockDeep: '#30170c',
      shawlHi: '#594e45',
      shawlMid: '#403832',
      shawlTrim: '#d49a42',
      beltCol: '#382418',
      beltGlow: '#f2741b',
      flameCore: '#ffffff',
      flameHi: '#ffff99',
      flameMid: '#ffad29',
      flameLow: '#e66019',
      wristGlow: '#ff991f',
      soleEmber: '#cc5214',
    },
    copperSlagHunter: {
      id: 'copperSlagHunter',
      name: '古铜翠焰·尖兜帽看表巡林游侠',
      headShape: 'hoodedObsidian',
      headShapeName: '8×8 尖锥兜帽岩壳颅',
      coreMotif: 'weepingLava',
      coreMotifName: '泣血熔岩双痕 × 纵向深渊裂谷',
      bodyBuild: 'tall',
      bodyBuildName: '高个熔岩巡林客胸铠 (高+1px·修长四肢)',
      colorThemeId: 'copperSlag',
      defaultIdle: 'lookout',
      rockHi: '#458068',
      rockMid: '#31614d',
      rockBase: '#224536',
      rockDeep: '#12291f',
      shawlHi: '#8a6642',
      shawlMid: '#664a2e',
      shawlTrim: '#bf9456',
      beltCol: '#3d3022',
      beltGlow: '#26c961',
      flameCore: '#f2fff5',
      flameHi: '#a8ff8f',
      flameMid: '#45e073',
      flameLow: '#1fbd59',
      wristGlow: '#47e078',
      soleEmber: '#1aa64c',
    },
    violetVoidWalker: {
      id: 'violetVoidWalker',
      name: '紫晶虚空·方尖碑交叉腿外骸种',
      headShape: 'cyclopsMonolith',
      headShapeName: '6×9 高耸方尖碑巨颅',
      coreMotif: 'vertSlit',
      coreMotifName: '竖缝火瞳 × 2×3 经典熔炉之心',
      bodyBuild: 'exoFrame',
      bodyBuildName: '镂空黑曜石肋骨外骸 (肋间透火·窄腰)',
      colorThemeId: 'voidViolet',
      defaultIdle: 'crossLeg',
      rockHi: '#6d4299',
      rockMid: '#512f75',
      rockBase: '#392054',
      rockDeep: '#201033',
      shawlHi: '#884fb8',
      shawlMid: '#623687',
      shawlTrim: '#bd78f0',
      beltCol: '#3d2259',
      beltGlow: '#a833ff',
      flameCore: '#fdf2ff',
      flameHi: '#ffa6f9',
      flameMid: '#e066ff',
      flameLow: '#b329ff',
      wristGlow: '#e65cff',
      soleEmber: '#9829e0',
    },
    ironMandibleHulk: {
      id: 'ironMandibleHulk',
      name: '赤铁赭金·裂颚双柱揉脖泰坦',
      headShape: 'splitMandible',
      headShapeName: '8×7 裂颚重甲战颅',
      coreMotif: 'crossForge',
      coreMotifName: '十字锻纹火瞳 × 十字星芒炉心',
      bodyBuild: 'pistonHulk',
      bodyBuildName: '双肩火山烟柱巨躯 (高+1px·双联熔岩柱)',
      colorThemeId: 'ironCinder',
      defaultIdle: 'stretch',
      rockHi: '#785038',
      rockMid: '#5c3c28',
      rockBase: '#422a1b',
      rockDeep: '#26170e',
      shawlHi: '#6c7682',
      shawlMid: '#4f5761',
      shawlTrim: '#9ba6b5',
      beltCol: '#382a22',
      beltGlow: '#e0701f',
      flameCore: '#fff9e6',
      flameHi: '#ffe066',
      flameMid: '#ff9429',
      flameLow: '#d95b19',
      wristGlow: '#ff881f',
      soleEmber: '#c44d14',
    },
    jadeLotusMonk: {
      id: 'jadeLotusMonk',
      name: '碧玉青莲·日冕摩挲斗篷苦修',
      headShape: 'crownSpire',
      headShapeName: '8×8 五棘日冕王冠颅',
      coreMotif: 'hollowCore',
      coreMotifName: '空洞旋涡火眼 × 环状日冕熔炉',
      bodyBuild: 'ponchoMech',
      bodyBuildName: '焦炭余烬破损大斗篷 (斜裁火山灰披肩)',
      colorThemeId: 'jadeMagma',
      defaultIdle: 'rubHands',
      rockHi: '#34787a',
      rockMid: '#245859',
      rockBase: '#183d3e',
      rockDeep: '#0d2324',
      shawlHi: '#498f82',
      shawlMid: '#32695e',
      shawlTrim: '#7cd4bd',
      beltCol: '#1d423e',
      beltGlow: '#1fd9a8',
      flameCore: '#f2fffa',
      flameHi: '#9effdc',
      flameMid: '#36e0b2',
      flameLow: '#19b38c',
      wristGlow: '#42ebbd',
      soleEmber: '#149975',
    },
    solarQuartzKnight: {
      id: 'solarQuartzKnight',
      name: '日冕金晶·双角交握耀金武士',
      headShape: 'twinHorn',
      headShapeName: '8×8 双弯熔岩魔角颅',
      coreMotif: 'crossForge',
      coreMotifName: '十字锻纹火瞳 × 十字星芒炉心',
      bodyBuild: 'tall',
      bodyBuildName: '高个熔岩巡林客胸铠 (高+1px·修长四肢)',
      colorThemeId: 'solarQuartz',
      defaultIdle: 'salute',
      rockHi: '#9c7838',
      rockMid: '#785b28',
      rockBase: '#57411b',
      rockDeep: '#33250e',
      shawlHi: '#a83832',
      shawlMid: '#7d2622',
      shawlTrim: '#e66547',
      beltCol: '#4d3618',
      beltGlow: '#ff9e1f',
      flameCore: '#ffffff',
      flameHi: '#fff7ad',
      flameMid: '#ffba26',
      flameLow: '#e67e17',
      wristGlow: '#ffc836',
      soleEmber: '#d96e14',
    },
    frostObsidianSentinel: {
      id: 'frostObsidianSentinel',
      name: '极地冰曜·锻砧抱胸极寒守卫',
      headShape: 'anvilFlat',
      headShapeName: '8×6 宽平锻砧重装颅',
      coreMotif: 'visoredMagma',
      coreMotifName: '横贯熔岩目镜 × 双列高炉火栅',
      bodyBuild: 'broad',
      bodyBuildName: '魁梧双肩火山角重铠 (高+1px·宽肩甲)',
      colorThemeId: 'frostObsidian',
      defaultIdle: 'cross',
      rockHi: '#5e85ab',
      rockMid: '#446382',
      rockBase: '#2f465e',
      rockDeep: '#1a2838',
      shawlHi: '#8ca6bf',
      shawlMid: '#688099',
      shawlTrim: '#bfd6eb',
      beltCol: '#293d52',
      beltGlow: '#38c7ff',
      flameCore: '#ffffff',
      flameHi: '#c4ffff',
      flameMid: '#5cd6ff',
      flameLow: '#299eff',
      wristGlow: '#6be0ff',
      soleEmber: '#2488e0',
    },
    nebulaRoseReaver: {
      id: 'nebulaRoseReaver',
      name: '星云绯晶·裂颚点地绯焰掠夺者',
      headShape: 'splitMandible',
      headShapeName: '8×7 裂颚重甲战颅',
      coreMotif: 'triEmber',
      coreMotifName: '三眼余烬火瞳 × 倒三角三核熔炉',
      bodyBuild: 'slender',
      bodyBuildName: '高挑修长黑曜祭司甲 (高+2px·窄腰长摆)',
      colorThemeId: 'nebulaRose',
      defaultIdle: 'toeTap',
      rockHi: '#8a3d64',
      rockMid: '#692c4b',
      rockBase: '#4a1d34',
      rockDeep: '#290e1c',
      shawlHi: '#6b3b73',
      shawlMid: '#4d2854',
      shawlTrim: '#cf6ba0',
      beltCol: '#3d192b',
      beltGlow: '#ff3898',
      flameCore: '#fff2fa',
      flameHi: '#ffb8e6',
      flameMid: '#ff5cb8',
      flameLow: '#d9268a',
      wristGlow: '#ff6bc2',
      soleEmber: '#bd1e75',
    },
  };

  function resolveCinderStyle(spec) {
    const varId = (spec && spec.cinderVariant) || (spec && spec.look && spec.look.cinderVariant) || 'obsidianForge';
    const base = CINDER_VARIANTS[varId] || CINDER_VARIANTS.obsidianForge;
    const cfg = (spec && spec.cinderConfig) || (spec && spec.look && spec.look.cinderConfig);
    if (!cfg) return base;
    return Object.assign({}, base, cfg);
  }

  /* 外星种族头部插槽绘制：
   * 1. 彻底补齐菌柄脖颈与机械/黑曜石颈部 (dy = 4..6)，消除抬头/低头/待机时的头部浮空断层；
   * 2. 显像管族支持 10 种机械几何显示器头型 × 6 种待机动态屏显图案；
   * 3. 菌伞人支持 6 种立体菌伞头型 × 7 种头身统一色调；
   * 4. 烬骸族支持 8 种火山岩/黑曜石颅骨头型 × 6 种面部火缝图案 × 7 种火山岩与熔火色温。 */
  function drawAlienHead(g, spec, po, ox, oy, v34, opts) {
    const sp = spec.species;
    opts = opts || {};
    if (sp === 'cathode') {
      const cv = resolveCathodeStyle(spec);
      const shape = cv.headShape || 'crtBox';
      const motif = cv.screenMotif || 'ring';

      // (A) 绘制 10 种机械几何显示器外壳与内部纯黑屏幕 (#0d0f14)
      if (shape === 'diamond') {
        // 2. 【悬浮棱晶菱形屏 (9×9：dx = -2..6, dy = -3..4)】：45° 斜切菱形金属外壳 + 菱形黑屏 + 顶部信号探针
        put(g, ox + 2, oy - 3, cv.caseHi);
        for (let dx = 1; dx <= 3; dx++) {
          put(g, ox + dx, oy - 2, dx === 1 ? cv.caseHi : dx === 2 ? cv.caseMid : cv.caseSh);
        }
        for (let dx = 0; dx <= 4; dx++) {
          const isScr = dx >= 1 && dx <= 3;
          put(g, ox + dx, oy - 1, isScr ? '#0d0f14' : (dx === 0 ? cv.caseHi : cv.caseSh));
        }
        for (let dx = -1; dx <= 5; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 0, isScr ? '#0d0f14' : (dx < 0 ? cv.caseHi : cv.caseSh));
        }
        for (let dx = -2; dx <= 6; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          const rimCol = dx === -2 ? cv.caseHi : dx === -1 ? cv.caseMid : dx === 5 ? cv.caseSh : cv.caseDeep;
          put(g, ox + dx, oy + 1, isScr ? '#0d0f14' : rimCol);
        }
        for (let dx = -1; dx <= 5; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 2, isScr ? '#0d0f14' : (dx < 0 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = 0; dx <= 4; dx++) {
          const isScr = dx >= 1 && dx <= 3;
          put(g, ox + dx, oy + 3, isScr ? '#0d0f14' : (dx === 0 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = 1; dx <= 3; dx++) {
          put(g, ox + dx, oy + 4, dx === 1 ? cv.caseMid : dx === 2 ? cv.caseSh : cv.caseDeep);
        }
      } else if (shape === 'triangle') {
        // 3. 【正三角棱锥屏 (11×8：dx = -3..7, dy = -3..4)】：尖顶朝上的正三角棱锥金属机壳 + 顶置信号柱
        put(g, ox + 2, oy - 3, cv.caseHi);
        for (let dx = 1; dx <= 3; dx++) {
          put(g, ox + dx, oy - 2, dx === 1 ? cv.caseHi : dx === 2 ? cv.caseMid : cv.caseSh);
        }
        for (let dx = 0; dx <= 4; dx++) {
          put(g, ox + dx, oy - 1, dx === 2 ? '#0d0f14' : (dx <= 1 ? cv.caseHi : cv.caseSh));
        }
        for (let dx = -1; dx <= 5; dx++) {
          const isScr = dx >= 1 && dx <= 3;
          put(g, ox + dx, oy + 0, isScr ? '#0d0f14' : (dx <= 0 ? cv.caseHi : cv.caseSh));
        }
        for (let dx = -1; dx <= 5; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 1, isScr ? '#0d0f14' : (dx < 0 ? cv.caseHi : cv.caseSh));
        }
        for (let dx = -2; dx <= 6; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 2, isScr ? '#0d0f14' : (dx < 0 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = -3; dx <= 7; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          const cCol = dx === -3 ? cv.caseHi : dx < 0 ? cv.caseMid : dx === 7 ? cv.caseDeep : cv.caseSh;
          put(g, ox + dx, oy + 3, isScr ? '#0d0f14' : cCol);
        }
        for (let dx = -2; dx <= 6; dx++) {
          put(g, ox + dx, oy + 4, dx <= 0 ? cv.caseMid : dx <= 4 ? cv.caseSh : cv.caseDeep);
        }
      } else if (shape === 'invTriangle') {
        // 4. 【楔形倒三角雷达屏 (11×8：dx = -3..7, dy = -2..4)】：上宽下尖的倒三角楔形机壳 + 两侧机械耳栓
        put(g, ox - 3, oy - 3, cv.caseHi);
        put(g, ox + 7, oy - 3, cv.caseSh);
        for (let dx = -3; dx <= 7; dx++) {
          put(g, ox + dx, oy - 2, dx <= 0 ? cv.caseHi : dx <= 4 ? cv.caseMid : cv.caseSh);
        }
        for (let dx = -2; dx <= 6; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy - 1, isScr ? '#0d0f14' : (dx < 0 ? cv.caseHi : cv.caseSh));
        }
        for (let dx = -2; dx <= 6; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 0, isScr ? '#0d0f14' : (dx < 0 ? cv.caseHi : cv.caseSh));
        }
        for (let dx = -1; dx <= 5; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 1, isScr ? '#0d0f14' : (dx < 0 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = 0; dx <= 4; dx++) {
          const isScr = dx >= 1 && dx <= 3;
          put(g, ox + dx, oy + 2, isScr ? '#0d0f14' : (dx === 0 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = 0; dx <= 4; dx++) {
          put(g, ox + dx, oy + 3, dx === 2 ? '#0d0f14' : (dx <= 1 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = 1; dx <= 3; dx++) {
          put(g, ox + dx, oy + 4, dx === 1 ? cv.caseMid : cv.caseDeep);
        }
      } else if (shape === 'hexOctagon') {
        // 5. 【八角球面重工监视器 (9×8：dx = -2..6, dy = -2..4)】：切角八边形厚装甲电视壳 + 两侧声呐耳轴
        for (let dx = 0; dx <= 4; dx++) {
          put(g, ox + dx, oy - 2, dx <= 2 ? cv.caseHi : cv.caseMid);
        }
        for (let dx = -1; dx <= 5; dx++) {
          put(g, ox + dx, oy - 1, dx <= 1 ? cv.caseHi : dx <= 3 ? cv.caseMid : cv.caseSh);
        }
        for (let dy = 0; dy <= 2; dy++) {
          for (let dx = -2; dx <= 6; dx++) {
            const isScr = dx >= 0 && dx <= 4;
            const cCol = dx === -2 ? cv.caseSh : dx === -1 ? cv.caseHi : dx === 5 ? cv.caseSh : cv.caseDeep;
            put(g, ox + dx, oy + dy, isScr ? '#0d0f14' : cCol);
          }
        }
        for (let dx = -1; dx <= 5; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 3, isScr ? '#0d0f14' : (dx < 0 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = 0; dx <= 4; dx++) {
          put(g, ox + dx, oy + 4, dx <= 1 ? cv.caseMid : dx <= 3 ? cv.caseSh : cv.caseDeep);
        }
      } else if (shape === 'wideScope') {
        // 6. 【双联宽屏示波终端 (11×6：dx = -3..7, dy = -1..4)】：横向加宽的全景示波器机壳 + 顶部散热鳍片
        put(g, ox - 1, oy - 2, cv.caseHi);
        put(g, ox + 2, oy - 2, cv.caseMid);
        put(g, ox + 5, oy - 2, cv.caseSh);
        for (let dy = -1; dy <= 4; dy++) {
          for (let dx = -3; dx <= 7; dx++) {
            let col;
            if (dy === -1) {
              col = dx <= 0 ? cv.caseHi : dx <= 4 ? cv.caseMid : cv.caseSh;
            } else if (dy === 4) {
              col = dx <= -1 ? cv.caseMid : dx <= 4 ? cv.caseSh : cv.caseDeep;
            } else if (dx <= -2) {
              col = dx === -3 ? cv.caseHi : cv.caseMid;
            } else if (dx >= 6) {
              col = dx === 6 ? cv.caseSh : cv.caseDeep;
            } else {
              col = '#0d0f14';
            }
            put(g, ox + dx, oy + dy, col);
          }
        }
      } else if (shape === 'cylinderTube') {
        // 7. 【竖置真空电子管屏 (7×9：dx = -1..5, dy = -3..4)】：高耸圆拱电子管金属圆筒头 + 顶置高压电极帽 + 竖向窄长观测窗
        put(g, ox + 2, oy - 4, cv.caseHi);
        for (let dx = 0; dx <= 4; dx++) {
          put(g, ox + dx, oy - 3, dx <= 1 ? cv.caseHi : dx <= 3 ? cv.caseMid : cv.caseSh);
        }
        for (let dx = -1; dx <= 5; dx++) {
          const isScr = dx >= 1 && dx <= 3;
          put(g, ox + dx, oy - 2, isScr ? '#0d0f14' : (dx === -1 ? cv.caseHi : dx === 0 ? cv.caseMid : cv.caseSh));
        }
        for (let dy = -1; dy <= 3; dy++) {
          for (let dx = -1; dx <= 5; dx++) {
            const isScr = dx >= 0 && dx <= 4;
            const cCol = dx === -1 ? (dy <= 0 ? cv.caseHi : cv.caseMid) : (dy <= 0 ? cv.caseSh : cv.caseDeep);
            put(g, ox + dx, oy + dy, isScr ? '#0d0f14' : cCol);
          }
        }
        for (let dx = 0; dx <= 4; dx++) {
          put(g, ox + dx, oy + 4, dx <= 1 ? cv.caseMid : dx <= 3 ? cv.caseSh : cv.caseDeep);
        }
      } else if (shape === 'visorSlit') {
        // 8. 【重装横缝装甲头 (9×7：dx = -2..6, dy = -1..4)】：宽幅扁平重型钢甲头盔式监视器 + 横向贯穿式窄缝示波窗 + 额头装甲棱
        for (let dx = -1; dx <= 5; dx++) {
          put(g, ox + dx, oy - 1, dx <= 1 ? cv.caseHi : dx <= 3 ? cv.caseMid : cv.caseSh);
        }
        for (let dx = -2; dx <= 6; dx++) {
          put(g, ox + dx, oy + 0, dx <= 0 ? cv.caseHi : dx <= 3 ? cv.caseMid : dx <= 5 ? cv.caseSh : cv.caseDeep);
        }
        for (let dy = 1; dy <= 2; dy++) {
          for (let dx = -2; dx <= 6; dx++) {
            const isScr = dx >= -1 && dx <= 5;
            put(g, ox + dx, oy + dy, isScr ? '#0d0f14' : (dx === -2 ? cv.caseHi : cv.caseDeep));
          }
        }
        for (let dx = -2; dx <= 6; dx++) {
          const isScr = dx >= 0 && dx <= 4;
          put(g, ox + dx, oy + 3, isScr ? '#0d0f14' : (dx < 0 ? cv.caseMid : cv.caseDeep));
        }
        for (let dx = -1; dx <= 5; dx++) {
          put(g, ox + dx, oy + 4, dx <= 1 ? cv.caseMid : dx <= 3 ? cv.caseSh : cv.caseDeep);
        }
      } else if (shape === 'twinLens') {
        // 9. 【双筒光学测距仪头 (10×7：dx = -2..7, dy = -1..4)】：不对称双联工业测距镜头机壳 + 顶部调焦旋钮 + 中隔金属梁
        put(g, ox + 0, oy - 2, cv.caseHi);
        put(g, ox + 1, oy - 2, cv.caseMid);
        put(g, ox + 5, oy - 2, cv.caseSh);
        for (let dy = -1; dy <= 4; dy++) {
          for (let dx = -2; dx <= 7; dx++) {
            let col;
            if (dy === -1) {
              col = dx <= 1 ? cv.caseHi : dx <= 4 ? cv.caseMid : cv.caseSh;
            } else if (dy === 4) {
              col = dx <= 0 ? cv.caseMid : dx <= 4 ? cv.caseSh : cv.caseDeep;
            } else if (dx === -2) {
              col = cv.caseHi;
            } else if (dx === 7) {
              col = cv.caseDeep;
            } else if (dx === 3 && (dy === 0 || dy === 3)) {
              // 双筒镜头之间的金属隔断鼻梁（保留中心 oy+1..2 连通以便动态屏显完整显示）
              col = cv.caseSh;
            } else {
              col = '#0d0f14';
            }
            put(g, ox + dx, oy + dy, col);
          }
        }
      } else if (shape === 'radarDish') {
        // 10. 【斜切抛物面天线头 (9×8：dx = -2..6, dy = -3..4)】：头顶搭载斜切抛物面机械雷达碗与信号馈源杆的工业通信头
        put(g, ox + 4, oy - 4, cv.scrHi);
        put(g, ox + 3, oy - 3, cv.caseHi);
        put(g, ox + 0, oy - 3, cv.caseHi);
        put(g, ox + 1, oy - 3, cv.caseMid);
        for (let dx = -1; dx <= 4; dx++) {
          put(g, ox + dx, oy - 2, dx <= 1 ? cv.caseHi : dx <= 2 ? cv.caseMid : cv.caseSh);
        }
        for (let dy = -1; dy <= 4; dy++) {
          for (let dx = -2; dx <= 5; dx++) {
            let col;
            if (dy === -1) {
              col = dx <= 0 ? cv.caseHi : dx <= 3 ? cv.caseMid : cv.caseSh;
            } else if (dy === 4) {
              col = dx <= 0 ? cv.caseMid : dx <= 3 ? cv.caseSh : cv.caseDeep;
            } else if (dx <= -1) {
              col = dx === -2 ? cv.caseHi : cv.caseMid;
            } else if (dx === 5) {
              col = cv.caseDeep;
            } else {
              col = '#0d0f14';
            }
            put(g, ox + dx, oy + dy, col);
          }
        }
      } else {
        // 1. 默认 'crtBox'：【7×6 方正复古显像管电视机 (dx = -1..5, dy = -1..4)】
        for (let dy = -1; dy <= 4; dy++) {
          for (let dx = -1; dx <= 5; dx++) {
            let col;
            if (dy === -1) {
              col = dx <= 1 ? cv.caseHi : dx <= 3 ? cv.caseMid : cv.caseSh;
            } else if (dy === 4) {
              col = dx <= 0 ? cv.caseMid : dx <= 3 ? cv.caseSh : cv.caseDeep;
            } else if (dx === -1) {
              col = dy <= 1 ? cv.caseHi : cv.caseMid;
            } else if (dx === 5) {
              col = dy <= 1 ? cv.caseSh : cv.caseDeep;
            } else {
              col = '#0d0f14';
            }
            put(g, ox + dx, oy + dy, col);
          }
        }
      }

      // (B) 颈部机械液压连接柱 (dy = 5..6)，确保任何抬头/待机动作头部与风衣高领严丝合缝
      put(g, ox + 1, oy + 5, cv.caseSh);
      put(g, ox + 2, oy + 5, cv.limbJoint || '#9aa4b8');
      put(g, ox + 3, oy + 5, cv.caseDeep);
      put(g, ox + 1, oy + 6, cv.caseSh);
      put(g, ox + 2, oy + 6, cv.caseDeep);
      put(g, ox + 3, oy + 6, cv.caseDeep);

      // (C) 屏幕显示内容：受击红白噪点 > 开火/挥砍亮色十字准星 > 6 种待机动态屏显图案
      const wepAct = opts.weapon && opts.weapon.action;
      const isFiring = opts.screenMode === 'crosshair' || !!(wepAct && (wepAct === 'shoot' || wepAct.startsWith('combo') || wepAct === 'skill'));
      const isHurt = opts.screenMode === 'static' || !!opts.hurt;

      if (isHurt) {
        const snow = [
          [0, 0, '#ff4d4d'], [1, 0, '#ffffff'], [3, 0, '#ff4d4d'], [4, 0, '#ffffff'],
          [0, 1, '#ffffff'], [2, 1, '#ff4d4d'], [3, 1, '#ffffff'],
          [1, 2, '#ff4d4d'], [2, 2, '#ffffff'], [4, 2, '#ff4d4d'],
          [0, 3, '#ffffff'], [2, 3, '#ff4d4d'], [3, 3, '#ffffff'], [4, 3, '#ff4d4d'],
        ];
        for (const p of snow) put(g, ox + p[0], oy + p[1], p[2]);
      } else if (isFiring) {
        const cCol = '#6be6ff';
        put(g, ox + 2, oy + 0, cCol);
        put(g, ox + 1, oy + 1, cCol);
        put(g, ox + 2, oy + 1, cCol);
        put(g, ox + 3, oy + 1, cCol);
        put(g, ox + 2, oy + 2, cCol);
        put(g, ox + 2, oy + 3, '#39b8db');
      } else {
        const floatUp = !!(
          opts.screenFloat ||
          (po && po.idleT != null ? Math.floor((po.idleT + 0.01) / 0.4) % 2 === 1 : po && po.bob < 0)
        );
        const sHi = cv.scrHi || '#e8f0f7';
        const sMid = cv.scrMid || sHi;

        if (motif === 'heartbeat') {
          // 2. 心电图脉冲折线 (ECG Pulse Wave)：波峰随待机呼吸在屏幕中央左右推进跳动
          if (!floatUp) {
            put(g, ox + 0, oy + 2, sMid);
            put(g, ox + 1, oy + 1, sHi);
            put(g, ox + 2, oy + 0, '#ffffff');
            put(g, ox + 2, oy + 1, sHi);
            put(g, ox + 3, oy + 2, sHi);
            put(g, ox + 4, oy + 1, sMid);
          } else {
            put(g, ox + 0, oy + 1, sMid);
            put(g, ox + 1, oy + 2, sHi);
            put(g, ox + 2, oy + 1, sHi);
            put(g, ox + 3, oy + 0, '#ffffff');
            put(g, ox + 3, oy + 1, sHi);
            put(g, ox + 4, oy + 2, sMid);
          }
        } else if (motif === 'eyeScan') {
          // 3. 独眼电子扫描光瞳 (Cyber Eye Scanner)：横向眼睑裂隙 + 左右巡视的亮色瞳孔
          put(g, ox + 1, oy + 0, sMid);
          put(g, ox + 2, oy + 0, sMid);
          put(g, ox + 3, oy + 0, sMid);
          put(g, ox + 0, oy + 1, sMid);
          put(g, ox + 4, oy + 1, sMid);
          put(g, ox + 1, oy + 2, sMid);
          put(g, ox + 2, oy + 2, sMid);
          put(g, ox + 3, oy + 2, sMid);
          const px = floatUp ? 3 : 1;
          put(g, ox + px, oy + 1, '#ffffff');
          put(g, ox + 2, oy + 1, sHi);
        } else if (motif === 'hourglass') {
          // 4. 双三角量子沙漏 (Quantum Hourglass)：上下对称三角沙漏随呼吸脉动流转
          put(g, ox + 1, oy + 0, sHi);
          put(g, ox + 2, oy + 0, floatUp ? sMid : '#ffffff');
          put(g, ox + 3, oy + 0, sHi);
          put(g, ox + 2, oy + 1, '#ffffff');
          put(g, ox + 2, oy + 2, sHi);
          if (floatUp) {
            put(g, ox + 1, oy + 1, sMid);
            put(g, ox + 3, oy + 1, sMid);
          } else {
            put(g, ox + 1, oy + 2, sMid);
            put(g, ox + 3, oy + 2, sMid);
          }
          put(g, ox + 1, oy + 3, sHi);
          put(g, ox + 2, oy + 3, floatUp ? '#ffffff' : sMid);
          put(g, ox + 3, oy + 3, sHi);
        } else if (motif === 'equalizer') {
          // 5. 三柱音频频谱跳动条 (Spectrum Equalizer)：三列频谱柱高低交替跃动
          const h0 = floatUp ? 3 : 1;
          const h1 = floatUp ? 1 : 3;
          const h2 = floatUp ? 2 : 0;
          for (let y = 3; y >= 3 - h0; y--) put(g, ox + 0, oy + y, y === 3 - h0 ? '#ffffff' : sHi);
          for (let y = 3; y >= 3 - h1; y--) put(g, ox + 2, oy + y, y === 3 - h1 ? '#ffffff' : sHi);
          for (let y = 3; y >= 3 - h2; y--) put(g, ox + 4, oy + y, y === 3 - h2 ? sMid : sHi);
          if (shape === 'wideScope' || shape === 'twinLens') {
            put(g, ox + 5, oy + (floatUp ? 2 : 3), sMid);
          }
        } else if (motif === 'radarTri') {
          // 6. 三角信标星芒 (Triangle Beacon Reticle)：在宽屏/雷达屏中央脉动闪烁的三角星芒
          put(g, ox + 2, oy + 0, '#ffffff');
          put(g, ox + 1, oy + 1, sHi);
          put(g, ox + 3, oy + 1, sHi);
          if (!floatUp) {
            put(g, ox + 0, oy + 2, sMid);
            put(g, ox + 1, oy + 2, sHi);
            put(g, ox + 2, oy + 2, sHi);
            put(g, ox + 3, oy + 2, sHi);
            put(g, ox + 4, oy + 2, sMid);
          } else {
            put(g, ox + 2, oy + 1, '#ffffff');
            put(g, ox + 0, oy + 1, sMid);
            put(g, ox + 4, oy + 1, sMid);
            put(g, ox + 1, oy + 2, sMid);
            put(g, ox + 3, oy + 2, sMid);
            put(g, ox + 2, oy + 3, sHi);
          }
        } else {
          // 1. 默认 'ring'：5 像素纯白缺口极简圆环，随呼吸上下浮动 1 像素
          const ry = floatUp ? 0 : 1;
          put(g, ox + 1, oy + ry, sHi);
          put(g, ox + 2, oy + ry, sHi);
          put(g, ox + 1, oy + ry + 1, sHi);
          put(g, ox + 3, oy + ry + 1, sHi);
          put(g, ox + 2, oy + ry + 2, sHi);
        }
      }
      return;
    }

    if (sp === 'myco') {
      // 2. 孢子傀儡头部与菌柄脖颈插槽：
      // (A) 6种立体饱满菌伞冠 (dy = -5..1) + (B) 放射状明暗交替双层/三层菌褶内腔 (dy = 1..3) + (C) 菌环裙边与粗壮纤维菌柄脖颈 (dy = 4..6) 直插宇航服领口
      const mv = resolveMycoStyle(spec);
      const isAir = !!(opts.airPreview || (po && (po.isAir || po.locoMode === 'air' || po.inFlip || po.inKick)));
      const mode = po && po.locoMode;
      const isMoving = !!(opts.lagPreview || mode === 'run' || mode === 'sprint' || mode === 'walk' || mode === 'cwalk');
      const frame = (po && po.locoFrame != null) ? po.locoFrame : 0;

      if (mv.capType === 'archedGill') {
        // 【高拱透光宽褶伞 (dy = -3..3)】：高耸伞尖 + 三层大面积外露的放射状菌褶拱腔
        for (let dx = 1; dx <= 4; dx++) put(g, ox + dx, oy - 3, dx <= 2 ? mv.capHi : mv.capMid);
        for (let dx = -1; dx <= 6; dx++) {
          const col = (dx === 0 || dx === 3) ? mv.capSpot : (dx <= 2 ? mv.capHi : dx <= 4 ? mv.capMid : mv.capSh);
          put(g, ox + dx, oy - 2, col);
        }
        for (let dx = -2; dx <= 7; dx++) {
          const col = (dx <= 0) ? mv.capHi : (dx === 2 || dx === 5) ? mv.capSpot : (dx <= 4 ? mv.capMid : mv.capSh);
          put(g, ox + dx, oy - 1, col);
        }
        for (let dx = -3; dx <= 8; dx++) {
          if (dx <= -1 || dx >= 6) {
            put(g, ox + dx, oy + 0, dx < 0 ? mv.capHi : dx === 6 ? mv.capMid : mv.capSh);
          } else {
            put(g, ox + dx, oy + 0, (dx === 0 || dx === 2 || dx === 3 || dx === 5) ? mv.gillHi : mv.gillSh);
          }
        }
        for (let dx = -3; dx <= 8; dx++) {
          if (dx === -3 || dx === 8) {
            put(g, ox + dx, oy + 1, dx < 0 ? mv.capHi : mv.capSh);
          } else {
            const isUpperRib = (dx === -2 || dx === 0 || dx === 2 || dx === 3 || dx === 5 || dx === 7);
            put(g, ox + dx, oy + 1, isUpperRib ? mv.gillHi : mv.gillSh);
          }
        }
      } else if (mv.capType === 'domedBell') {
        // 【高耸深穴水母钟伞 (dy = -4..3)】：8行高圆拱水母钟盖 + 荧光斑点 + 双侧垂挂孢子触须
        for (let dx = 1; dx <= 4; dx++) put(g, ox + dx, oy - 4, dx === 2 ? mv.capSpot : mv.capHi);
        for (let dx = 0; dx <= 5; dx++) {
          put(g, ox + dx, oy - 3, (dx === 1 || dx === 4) ? mv.capSpot : (dx <= 2 ? mv.capHi : mv.capMid));
        }
        for (let dx = -1; dx <= 6; dx++) {
          put(g, ox + dx, oy - 2, (dx === 0 || dx === 3 || dx === 5) ? mv.capSpot : (dx <= 1 ? mv.capHi : dx <= 4 ? mv.capMid : mv.capSh));
        }
        for (let dx = -2; dx <= 7; dx++) {
          put(g, ox + dx, oy - 1, (dx === -1 || dx === 2 || dx === 5) ? mv.capSpot : (dx <= 0 ? mv.capHi : dx <= 4 ? mv.capMid : mv.capSh));
        }
        for (let dx = -2; dx <= 7; dx++) {
          put(g, ox + dx, oy + 0, (dx === 0 || dx === 4) ? mv.capSpot : (dx <= 1 ? mv.capHi : dx <= 5 ? mv.capMid : mv.capSh));
        }
        for (let dx = -3; dx <= 8; dx++) {
          const isScallop = (dx === -2 || dx === 1 || dx === 4 || dx === 7);
          put(g, ox + dx, oy + 1, isScallop ? mv.capSpot : (dx <= 0 ? mv.capHi : dx <= 5 ? mv.capMid : mv.capSh));
        }
      } else if (mv.capType === 'wavyFunnel') {
        // 【14px宽大翻卷波浪漏斗号角伞 (dx = -4..9, dy = -3..3)】：两侧高高翘起的波浪卷翼 + 中央下凹漏斗 + 延生纵向棱褶
        put(g, ox - 4, oy - 3, mv.capSpot);
        put(g, ox - 3, oy - 3, mv.capHi);
        put(g, ox + 8, oy - 3, mv.capMid);
        put(g, ox + 9, oy - 3, mv.capSh);
        for (const dx of [-4, -3, -2, -1, 0, 5, 6, 7, 8, 9]) {
          const col = (dx === -3 || dx === -1 || dx === 6) ? mv.capSpot : (dx <= 0 ? mv.capHi : dx <= 7 ? mv.capMid : mv.capSh);
          put(g, ox + dx, oy - 2, col);
        }
        for (let dx = -4; dx <= 9; dx++) {
          const col = (dx >= 2 && dx <= 3) ? mv.capSh : (dx === -2 || dx === 0 || dx === 5 || dx === 7) ? mv.capSpot : (dx <= 1 ? mv.capHi : mv.capMid);
          put(g, ox + dx, oy - 1, col);
        }
        for (let dx = -3; dx <= 8; dx++) {
          const isRidge = (dx === -3 || dx === -1 || dx === 1 || dx === 4 || dx === 6 || dx === 8);
          put(g, ox + dx, oy + 0, isRidge ? mv.capSpot : (dx <= 1 ? mv.capHi : dx <= 5 ? mv.capMid : mv.capSh));
        }
        for (let dx = -3; dx <= 8; dx++) {
          const isGill = (dx === -2 || dx === 0 || dx === 2 || dx === 3 || dx === 5 || dx === 7);
          put(g, ox + dx, oy + 1, isGill ? mv.gillHi : mv.gillSh);
        }
      } else if (mv.capType === 'conicalMorel') {
        // 【9行摩天尖塔蜂窝羊肚菌 (dy = -5..3)】：高耸尖锥塔冠 + 3D 蜂窝网格凹坑与亮色棱脊
        put(g, ox + 2, oy - 5, mv.capSpot);
        put(g, ox + 3, oy - 5, mv.capHi);
        for (let dx = 1; dx <= 4; dx++) {
          put(g, ox + dx, oy - 4, dx === 2 ? mv.gillShDeep : (dx === 1 ? mv.capSpot : mv.capMid));
        }
        for (let dx = 0; dx <= 5; dx++) {
          const isPit = (dx === 1 || dx === 3);
          put(g, ox + dx, oy - 3, isPit ? mv.gillShDeep : (dx === 0 || dx === 2 || dx === 4 ? mv.capSpot : mv.capSh));
        }
        for (let dx = -1; dx <= 6; dx++) {
          const isPit = (dx === 0 || dx === 2 || dx === 4);
          put(g, ox + dx, oy - 2, isPit ? mv.gillSh : (dx === -1 || dx === 1 || dx === 3 ? mv.capSpot : mv.capMid));
        }
        for (let dx = -1; dx <= 6; dx++) {
          const isPit = (dx === 1 || dx === 3 || dx === 5);
          put(g, ox + dx, oy - 1, isPit ? mv.gillShDeep : (dx <= 2 ? mv.capHi : mv.capMid));
        }
        for (let dx = -2; dx <= 7; dx++) {
          const isPit = (dx === -1 || dx === 2 || dx === 4 || dx === 6);
          put(g, ox + dx, oy + 0, isPit ? mv.gillSh : (dx === -2 || dx === 0 || dx === 3 ? mv.capSpot : mv.capSh));
        }
        for (let dx = -3; dx <= 8; dx++) {
          const isPit = (dx === -1 || dx === 1 || dx === 5);
          put(g, ox + dx, oy + 1, isPit ? mv.gillShDeep : (dx <= 0 ? mv.capHi : dx <= 4 ? mv.capMid : mv.capSh));
        }
      } else if (mv.capType === 'doubleTier') {
        // 【双层叠冠灵芝星伞 (dy = -4..3, dx = -3..9)】：顶层宝塔小菌冠 + 中层发光子实体菌褶环 + 下层宽展云芝大伞盖
        for (let dx = 1; dx <= 4; dx++) put(g, ox + dx, oy - 4, dx === 1 ? mv.capSpot : (dx <= 2 ? mv.capHi : mv.capMid));
        for (let dx = -1; dx <= 6; dx++) {
          put(g, ox + dx, oy - 3, (dx === 0 || dx === 4) ? mv.capSpot : (dx <= 1 ? mv.capHi : dx <= 4 ? mv.capMid : mv.capSh));
        }
        // dy = -2: 上层伞底露出第一圈放射菌褶
        for (let dx = 0; dx <= 5; dx++) {
          put(g, ox + dx, oy - 2, (dx % 2 === 0) ? mv.gillHi : mv.gillSh);
        }
        // dy = -1..1: 下层宽展灵芝大伞盘与金色环纹
        for (let dx = -2; dx <= 7; dx++) {
          put(g, ox + dx, oy - 1, (dx === -2 || dx === 7) ? mv.capSpot : (dx <= 1 ? mv.capHi : dx <= 5 ? mv.capMid : mv.capSh));
        }
        for (let dx = -3; dx <= 8; dx++) {
          const isRing = (dx === -2 || dx === 1 || dx === 4 || dx === 7);
          put(g, ox + dx, oy + 0, isRing ? mv.capSpot : (dx <= 0 ? mv.capHi : dx <= 5 ? mv.capMid : mv.capSh));
        }
        for (let dx = -3; dx <= 9; dx++) {
          put(g, ox + dx, oy + 1, (dx === -3 || dx === 9) ? mv.capSpot : (dx <= 0 ? mv.capHi : dx <= 5 ? mv.capMid : mv.capSh));
        }
      } else {
        // 【饱满圆拱毒蝇巨伞 (dy = -2..3, dx = -3..8)】：厚实圆顶 + 凸起菌斑 + 宽阔伞盖
        for (let dx = 0; dx <= 5; dx++) {
          put(g, ox + dx, oy - 2, dx === 1 || dx === 4 ? mv.capSpot : (dx <= 2 ? mv.capHi : mv.capMid));
        }
        for (let dx = -1; dx <= 6; dx++) {
          const isSpot = (dx === 0 || dx === 3 || dx === 5);
          put(g, ox + dx, oy - 1, isSpot ? mv.capSpot : (dx <= 1 ? mv.capHi : dx <= 4 ? mv.capMid : mv.capSh));
        }
        for (let dx = -2; dx <= 7; dx++) {
          const isSpot = (dx === -1 || dx === 2 || dx === 6);
          put(g, ox + dx, oy + 0, isSpot ? mv.capSpot : (dx <= 0 ? mv.capHi : dx <= 4 ? mv.capMid : mv.capSh));
        }
        for (let dx = -3; dx <= 8; dx++) {
          const isSpot = (dx === -2 || dx === 1 || dx === 4 || dx === 7);
          put(g, ox + dx, oy + 1, isSpot ? mv.capSpot : (dx <= 0 ? mv.capHi : dx <= 5 ? mv.capMid : mv.capSh));
        }
      }

      // (B) dy = 2: 12 像素宽主伞檐外框 + 内拱上层放射状菌褶（跳跃滞空时左右伞缘 dx = -3, 8 微微上扬 1 像素）
      for (let dx = -3; dx <= 8; dx++) {
        const edgeUp = isAir && (dx === -3 || dx === 8) ? -1 : 0;
        if (dx <= -2 || dx >= 7) {
          const rimCol = dx === -3 ? mv.capHi : dx === -2 ? mv.capMid : dx === 7 ? mv.capMid : mv.capSh;
          put(g, ox + dx, oy + 2 + edgeUp, rimCol);
        } else {
          const isInnerGillRib = (dx === 0 || dx === 2 || dx === 3 || dx === 5);
          const gCol = isInnerGillRib
            ? ((dx === 2 || dx === 3) ? mv.gillHi : mv.gillMid)
            : mv.gillSh;
          put(g, ox + dx, oy + 2, gCol);
        }
      }

      // (C) dy = 3: 伞底主菌褶层 (dx = -2..7) —— 放射状亮色菌褶片与深色褶隙明暗交替，向中央菌柄顶端汇聚
      for (let dx = -2; dx <= 7; dx++) {
        const isOuterGillRib = (dx === -2 || dx === 0 || dx === 2 || dx === 3 || dx === 5 || dx === 7);
        let col;
        if (isOuterGillRib) {
          col = (dx === 0 || dx === 2 || dx === 3 || dx === 5) ? mv.gillHi : mv.gillMid;
        } else {
          col = dx <= 2 ? mv.gillSh : mv.gillShDeep;
        }
        put(g, ox + dx, oy + 3, col);
      }

      // (D) 完整立体菌柄脖颈 (Mushroom Stipe & Annulus Neck, dy = 4..6)：
      // - dy = 4: 菌环裙边 (Annulus Ring, dx = 0..5)
      put(g, ox + 0, oy + 4, mv.capType === 'wavyFunnel' ? mv.gillHi : mv.gillMid);
      put(g, ox + 1, oy + 4, mv.stipeHi);
      put(g, ox + 2, oy + 4, mv.stipeHi);
      put(g, ox + 3, oy + 4, mv.stipeSh);
      put(g, ox + 4, oy + 4, mv.gillSh);
      put(g, ox + 5, oy + 4, mv.gillShDeep);

      // - dy = 5: 纤维菌柄中段脖颈 (Stipe Column, dx = 1..4，胖肚/矮胖种加粗至 dx = 0..5)，彻底填补头部与领口之间的断层！
      if (mv.bodyBuild === 'chubby' || mv.bodyBuild === 'shortChubby') {
        put(g, ox + 0, oy + 5, mv.stipeHi);
        put(g, ox + 5, oy + 5, mv.gillSh);
      }
      put(g, ox + 1, oy + 5, mv.stipeHi);
      put(g, ox + 2, oy + 5, mv.mycHi); // 菌柄颈部共生荧光脉络
      put(g, ox + 3, oy + 5, mv.stipeSh);
      put(g, ox + 4, oy + 5, mv.gillShDeep);

      // - dy = 6: 菌柄根部汇入宇航服密封领圈 (dx = 1..4)，保证抬头 (hd[1] = -1) 时脖颈依然严丝合缝连接躯干
      put(g, ox + 1, oy + 6, mv.stipeHi);
      put(g, ox + 2, oy + 6, mv.stipeSh);
      put(g, ox + 3, oy + 6, mv.stipeSh);
      put(g, ox + 4, oy + 6, mv.gillShDeep);

      // (E) 右侧伞檐垂挂 1 串 3 像素长的纯白发光孢子链（水母钟伞与双层星伞额外在左侧伞檐垂挂副触须）；跑动时产生滞后 1~2 像素物理摆动
      const lag1 = isMoving ? 1 : 0;
      const lag2 = isMoving ? (frame % 2 === 1 ? 2 : 1) : 0;
      const chainX = (mv.capType === 'wavyFunnel' || mv.capType === 'doubleTier') ? 9 : 8;
      put(g, ox + chainX, oy + 3, '#ffffff');
      put(g, ox + chainX - lag1, oy + 4, mv.sporeMid || '#e6fff2');
      put(g, ox + chainX - lag2, oy + 5, mv.sporeTip || '#b8ffd8');
      if (mv.capType === 'domedBell' || mv.capType === 'doubleTier') {
        put(g, ox - 3, oy + 3, mv.capSpot);
        put(g, ox - 3 - lag1, oy + 4, mv.sporeTip);
      }
      return;
    }

    if (sp === 'cinder') {
      const iv = resolveCinderStyle(spec);
      const shape = iv.headShape || 'jaggedCrag';
      const motif = iv.coreMotif || 'vertSlit';
      const rHi = iv.rockHi || '#38302e';
      const rMid = iv.rockMid || '#2b2523';
      const rBase = iv.rockBase || '#1c1918';
      const rDeep = iv.rockDeep || '#0f0d0d';
      const fCore = iv.flameCore || '#ffffff';
      const fHi = iv.flameHi || '#ffd23f';
      const fMid = iv.flameMid || '#ff7b29';
      const fLow = iv.flameLow || '#ff5a1f';

      // (A) 8 种火山岩 / 黑曜石颅骨轮廓
      if (shape === 'twinHorn') {
        // 2. 【双弯熔岩魔角颅 (8×8：dx = -1..6, dy = -3..4)】：左右向外斜耸的玄武岩弯角 + 额头熔岩裂痕
        put(g, ox - 1, oy - 3, fHi);
        put(g, ox + 6, oy - 3, fMid);
        put(g, ox - 1, oy - 2, rHi);
        put(g, ox + 0, oy - 2, rMid);
        put(g, ox + 5, oy - 2, rMid);
        put(g, ox + 6, oy - 2, rDeep);
        put(g, ox + 0, oy - 1, rHi);
        put(g, ox + 1, oy - 1, rMid);
        put(g, ox + 4, oy - 1, rBase);
        put(g, ox + 5, oy - 1, rDeep);
        for (let dy = 0; dy <= 4; dy++) {
          const x0 = dy === 4 ? 1 : 0;
          const x1 = dy === 4 ? 4 : 5;
          for (let dx = x0; dx <= x1; dx++) {
            const col = dx === x0 ? rMid : dx === x1 ? rDeep : rBase;
            put(g, ox + dx, oy + dy, col);
          }
        }
        put(g, ox + 2, oy + 0, fLow);
      } else if (shape === 'crownSpire') {
        // 3. 【五棘日冕王冠颅 (8×8：dx = -1..6, dy = -3..4)】：头顶环绕 5 根高低错落的黑曜石晶刺，尖端闪烁余烬
        put(g, ox + 2, oy - 3, fHi);
        put(g, ox + 0, oy - 2, rHi);
        put(g, ox + 2, oy - 2, rHi);
        put(g, ox + 4, oy - 2, rMid);
        put(g, ox - 1, oy - 1, rMid);
        put(g, ox + 0, oy - 1, rMid);
        put(g, ox + 1, oy - 1, rBase);
        put(g, ox + 2, oy - 1, fLow);
        put(g, ox + 3, oy - 1, rBase);
        put(g, ox + 4, oy - 1, rDeep);
        put(g, ox + 6, oy - 1, rDeep);
        for (let dy = 0; dy <= 4; dy++) {
          const x0 = dy === 4 ? 1 : 0;
          const x1 = dy === 4 ? 4 : 5;
          for (let dx = x0; dx <= x1; dx++) {
            put(g, ox + dx, oy + dy, dx === x0 ? rHi : dx === x1 ? rDeep : rBase);
          }
        }
      } else if (shape === 'anvilFlat') {
        // 4. 【宽平锻砧重装颅 (8×6：dx = -1..6, dy = -1..4)】：厚重平顶锻砧头甲 + 两侧凸出耳护岩棱
        for (let dx = -1; dx <= 6; dx++) {
          put(g, ox + dx, oy - 1, dx <= 0 ? rHi : dx >= 5 ? rDeep : rMid);
        }
        for (let dx = -1; dx <= 6; dx++) {
          put(g, ox + dx, oy + 0, dx === -1 ? rHi : dx === 6 ? rDeep : rBase);
        }
        for (let dy = 1; dy <= 4; dy++) {
          const x0 = dy === 4 ? 0 : -1;
          const x1 = dy === 4 ? 5 : 6;
          for (let dx = x0; dx <= x1; dx++) {
            let col = dx === x0 ? rMid : dx === x1 ? rDeep : rBase;
            if (dy === 2 && (dx === -1 || dx === 6)) col = rHi;
            put(g, ox + dx, oy + dy, col);
          }
        }
      } else if (shape === 'calderaCrater') {
        // 5. 【火山口凹陷盆颅 (8×7：dx = -1..6, dy = -2..4)】：头顶中央内凹火山盆口，内部翻涌炽白与金橘色熔岩泡泡
        put(g, ox + 0, oy - 2, rHi);
        put(g, ox + 1, oy - 2, rMid);
        put(g, ox + 2, oy - 2, fHi);
        put(g, ox + 3, oy - 2, fLow);
        put(g, ox + 4, oy - 2, rMid);
        put(g, ox + 5, oy - 2, rDeep);
        for (let dx = -1; dx <= 6; dx++) {
          const isLava = dx >= 2 && dx <= 3;
          put(g, ox + dx, oy - 1, isLava ? (dx === 2 ? fCore : fHi) : (dx <= 0 ? rHi : dx >= 5 ? rDeep : rMid));
        }
        for (let dy = 0; dy <= 4; dy++) {
          const x0 = dy >= 3 ? 0 : -1;
          const x1 = dy >= 3 ? 5 : 6;
          for (let dx = x0; dx <= x1; dx++) {
            put(g, ox + dx, oy + dy, dx === x0 ? rMid : dx === x1 ? rDeep : rBase);
          }
        }
      } else if (shape === 'hoodedObsidian') {
        // 6. 【尖锥兜帽岩壳颅 (8×8：dx = -1..6, dy = -3..4)】：森林旅人风格的高耸前倾黑曜石尖顶兜帽壳
        put(g, ox + 1, oy - 3, rHi);
        put(g, ox + 2, oy - 3, rMid);
        for (let dx = 0; dx <= 3; dx++) put(g, ox + dx, oy - 2, dx === 0 ? rHi : rMid);
        for (let dx = 0; dx <= 4; dx++) put(g, ox + dx, oy - 1, dx === 0 ? rHi : dx === 4 ? rDeep : rMid);
        for (let dy = 0; dy <= 4; dy++) {
          const x0 = dy <= 2 ? -1 : 0;
          const x1 = dy === 0 ? 6 : 5;
          for (let dx = x0; dx <= x1; dx++) {
            const isHoodRim = dy === 0 && dx >= 4;
            const col = isHoodRim ? rHi : dx === x0 ? rMid : dx === x1 ? rDeep : rBase;
            put(g, ox + dx, oy + dy, col);
          }
        }
      } else if (shape === 'cyclopsMonolith') {
        // 7. 【高耸方尖碑巨颅 (6×9：dx = 0..5, dy = -4..4)】：纵向高耸的古遗迹黑曜石方尖碑，碑顶铭刻发光火印
        put(g, ox + 2, oy - 4, rHi);
        put(g, ox + 3, oy - 4, rDeep);
        for (let dx = 1; dx <= 4; dx++) put(g, ox + dx, oy - 3, dx === 1 ? rHi : dx === 4 ? rDeep : rMid);
        for (let dy = -2; dy <= 4; dy++) {
          const x0 = dy === 4 ? 1 : 0;
          const x1 = dy === 4 ? 4 : 5;
          for (let dx = x0; dx <= x1; dx++) {
            let col = dx === x0 ? rHi : dx === x1 ? rDeep : rBase;
            if (dy === -1 && (dx === 2 || dx === 3)) col = fLow;
            put(g, ox + dx, oy + dy, col);
          }
        }
      } else if (shape === 'splitMandible') {
        // 8. 【裂颚重甲战颅 (8×7：dx = -1..6, dy = -2..4)】：额顶双棱刺 + 下颌两侧外扩的黑曜石獠牙护颚
        put(g, ox + 0, oy - 2, rHi);
        put(g, ox + 4, oy - 2, rMid);
        for (let dx = 0; dx <= 5; dx++) put(g, ox + dx, oy - 1, dx <= 1 ? rHi : dx === 5 ? rDeep : rMid);
        for (let dy = 0; dy <= 4; dy++) {
          const x0 = dy >= 2 ? -1 : 0;
          const x1 = dy >= 2 ? 6 : 5;
          for (let dx = x0; dx <= x1; dx++) {
            let col = dx === x0 ? rMid : dx === x1 ? rDeep : rBase;
            if (dy >= 3 && (dx === -1 || dx === 6)) col = rHi; // 外扩裂颚獠牙
            if (dy === 4 && (dx === 2 || dx === 3)) col = fLow; // 颚间熔岩隙
            put(g, ox + dx, oy + dy, col);
          }
        }
      } else {
        // 1. 默认 【三尖黑曜碎角颅 (6×6：dx = 0..5, dy = -1..4)】：不规则焦黑火山岩 + 头顶 3 个尖锐黑曜石碎角
        put(g, ox + 0, oy - 1, rDeep);
        put(g, ox + 2, oy - 1, rHi);
        put(g, ox + 4, oy - 1, rDeep);
        const rockRows = [
          [0, 1, 2, 3, 4],       // dy = 0
          [0, 1, 2, 3, 4, 5],    // dy = 1
          [0, 1, 2, 3, 4, 5],    // dy = 2
          [0, 1, 2, 3, 4, 5],    // dy = 3
          [1, 2, 3, 4],          // dy = 4
        ];
        rockRows.forEach((cols, idx) => {
          const dy = idx;
          for (const dx of cols) {
            const isEdge = dx === 0 || (dy === 0 && dx <= 2);
            put(g, ox + dx, oy + dy, isEdge ? rMid : rBase);
          }
        });
      }

      // (B) 黑曜石颈柱与熔岩颈脉 (dy = 5..6)，确保高挑/高个/矮胖等所有体型在抬头与待机时脖子 100% 连贯不断层
      put(g, ox + 1, oy + 5, rMid);
      put(g, ox + 2, oy + 5, fLow);
      put(g, ox + 3, oy + 5, rBase);
      put(g, ox + 1, oy + 6, rMid);
      put(g, ox + 2, oy + 6, fMid);
      put(g, ox + 3, oy + 6, rDeep);

      // (C) 6 种面部火缝图案（与胸口熔炉之心形态联动）
      const slitX = v34 ? 3 : 4;
      if (motif === 'crossForge') {
        // 2. 十字锻纹火瞳
        put(g, ox + slitX, oy + 1, fHi);
        put(g, ox + slitX - 1, oy + 2, fMid);
        put(g, ox + slitX, oy + 2, fCore);
        put(g, ox + slitX + 1, oy + 2, fHi);
        put(g, ox + slitX, oy + 3, fHi);
      } else if (motif === 'triEmber') {
        // 3. 三眼余烬火瞳
        put(g, ox + slitX - 1, oy + 1, fHi);
        put(g, ox + slitX + 1, oy + 1, fHi);
        put(g, ox + slitX, oy + 3, fCore);
      } else if (motif === 'visoredMagma') {
        // 4. 横贯熔岩目镜
        put(g, ox + slitX - 2, oy + 2, fMid);
        put(g, ox + slitX - 1, oy + 2, fHi);
        put(g, ox + slitX, oy + 2, fCore);
        put(g, ox + slitX + 1, oy + 2, fHi);
      } else if (motif === 'weepingLava') {
        // 5. 泣血熔岩双痕
        put(g, ox + slitX - 1, oy + 1, fHi);
        put(g, ox + slitX - 1, oy + 2, fMid);
        put(g, ox + slitX - 1, oy + 3, fLow);
        put(g, ox + slitX + 1, oy + 1, fCore);
        put(g, ox + slitX + 1, oy + 2, fHi);
        put(g, ox + slitX + 1, oy + 3, fLow);
      } else if (motif === 'hollowCore') {
        // 6. 空洞旋涡火眼
        put(g, ox + slitX, oy + 1, fHi);
        put(g, ox + slitX - 1, oy + 2, fHi);
        put(g, ox + slitX, oy + 2, rDeep);
        put(g, ox + slitX + 1, oy + 2, fMid);
        put(g, ox + slitX, oy + 3, fLow);
      } else {
        // 1. 默认竖缝火瞳（2 个高饱和亮金黄像素拼出竖缝）
        put(g, ox + slitX, oy + 2, fHi);
        put(g, ox + slitX, oy + 3, fHi);
      }
    }
  }

  /* 外星种族躯干插槽绘制（全身纯净无任何常驻浮空粒子）：
   * 1. 大幅丰富宇航服/废土风衣/黑岩胸甲的领圈、斜跨背带、胸口仪表阀、绗缝肋条、腰带扣具与护胯甲片纹理；
   * 2. 支持外星种族变种与随机组合的高矮胖瘦体型差异（标准均衡、高挑修长窄腰、深穴长臂、丰满胖肚9px、魁梧宽肩、矮胖幼菇圆腹）。 */
  function drawAlienTorso(g, spec, po, hy, ub, L, v34, suit, opts) {
    const sp = spec.species;
    opts = opts || {};
    const shf = y => v34 ? 0 : Math.round(L * (hy - 3 - y) / 4);
    const mode = po && po.locoMode;
    const frame = (po && po.locoFrame != null) ? po.locoFrame : 0;

    if (sp === 'cathode') {
      // 1. 显像管族躯干插槽：支持 9 种身体变种（高矮胖瘦 + 机械风衣/球形反应炉/宽肩胸铠/工程短袄/镂空外骨骼/双缸重甲/废土斗篷）
      //    背部轮廓完全平整贴合 (x0 >= 13)，彻底消除丰满/矮胖体型在待机与跑动时的背部怪异凸起块
      const cv = resolveCathodeStyle(spec);
      const bType = spec.bodyBuild || cv.bodyBuild || 'standard';

      if (bType === 'exoFrame') {
        // 【身体变种7：镂空液压外骨骼机躯 (exoFrame)】—— 裸露精钢机械脊柱、横向液压肋条与开放式骨盆轴承（无风衣下摆遮挡）
        for (let r = 0; r <= 7; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const x0 = (r === 1 || r === 2 || r === 3 || r === 6) ? 13 : 14;
          const x1 = (r === 1 || r === 2 || r === 3 || r === 6) ? 18 : 17;
          for (let x = x0; x <= x1; x++) {
            // 镂空肋间间隙：r=2,4 两侧留空表现机械骨架感
            if ((r === 2 || r === 4) && (x === x0 + 1 || x === x1 - 1)) continue;
            let col = (x === 15 || x === 16) ? cv.caseMid : (x < 15 ? cv.coatHi : cv.coatSh);
            if (r === 0) col = (x === 15) ? cv.limbJoint : cv.collarHi;
            else if (r === 1 || r === 3) col = (x === x0 || x === x1) ? cv.limbJoint : cv.caseSh;
            else if (r === 5) col = (x === 15 || x === 16) ? cv.beltBuckle : cv.beltCol;
            else if (r >= 6) col = (x === x0 || x === x1) ? cv.caseSh : cv.beltCol;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'pistonHulk') {
        // 【身体变种8：双缸重装液压巨躯 (pistonHulk)】—— 双肩排气管柱 + 胸前双联竖向液压活塞缸 + 重型履带护胯甲
        const sTop = shf(hy - 7 + ub);
        put(g, 13 + sTop, hy - 8 + ub, cv.caseSh);
        put(g, 18 + sTop, hy - 8 + ub, cv.caseDeep);
        for (let r = 0; r <= 8; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const x0 = r <= 4 ? 13 : r <= 6 ? 13 : 14;
          const x1 = r <= 4 ? 19 : r <= 7 ? 18 : 17;
          for (let x = x0; x <= x1; x++) {
            let col = x === x0 ? cv.coatHi : x >= x1 - 1 ? cv.coatSh : cv.coatMid;
            if (r <= 1 && (x === 13 || x === 18)) col = cv.caseHi;
            else if (r >= 1 && r <= 4 && (x === 14 || x === 17)) col = r % 2 === 1 ? cv.caseHi : cv.limbJoint; // 双联竖向液压活塞柱
            else if (r === 5) col = (x === 15 || x === 16 || x === 17) ? cv.beltBuckle : cv.beltCol;
            else if (r >= 6 && (x === 14 || x === 17)) col = cv.strapCol;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'ponchoMech') {
        // 【身体变种9：废土防尘斗篷机兵 (ponchoMech)】—— 上半身斜裁防尘工装护披 + 下摆斜向包边 + 外露机械骨盆座
        for (let r = 0; r <= 7; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const x0 = r <= 4 ? 13 : 14;
          const x1 = r <= 3 ? 18 : r === 4 ? 19 : 17;
          for (let x = x0; x <= x1; x++) {
            let col;
            if (r <= 4) {
              const isTrim = (r === 4) || (r === 3 && x >= 17) || (r === 2 && x === 18);
              col = isTrim ? cv.strapCol : (x === x0 ? cv.coatHi : x === x1 ? cv.coatSh : cv.coatMid);
              if (r === 0 && (x === 14 || x === 16)) col = cv.collarHi;
            } else if (r === 5) {
              col = (x === 16) ? cv.beltBuckle : cv.beltCol;
            } else {
              col = (x === 14 || x === 17) ? cv.caseSh : cv.hemCol;
            }
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'chubby') {
        // 【身体变种4：重装球形反应炉躯干 (chubby)】—— 圆润饱满的铸铁反应炉圆腹 + 腹部横向散热百叶格栅（背部平整无凸起）
        const bounds = [
          [13, 17], // r=0: 高领
          [13, 18], // r=1: 肩领
          [13, 19], // r=2: 圆腹上沿
          [13, 19], // r=3: 圆腹散热窗上段
          [13, 19], // r=4: 圆腹中段
          [13, 19], // r=5: 圆腹散热窗下段
          [13, 19], // r=6: 重工铆钉腰封
          [13, 18], // r=7: 护胯甲上沿
          [14, 18], // r=8: 护胯甲下沿
        ];
        for (let r = 0; r < bounds.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const [x0, x1] = bounds[r];
          for (let x = x0; x <= x1; x++) {
            let col = x === x0 ? cv.coatHi : x === x1 ? cv.coatSh : cv.coatMid;
            if (r === 0 && (x === 14 || x === 16)) col = cv.collarHi;
            else if ((r === 2 || r === 4) && x >= 15 && x <= 17) col = cv.caseMid;
            else if ((r === 3 || r === 5) && x >= 15 && x <= 17) col = cv.beltCol; // 横向散热格栅槽
            else if (r === 6) col = (x === 16 || x === 17) ? cv.beltBuckle : cv.beltCol;
            else if (r >= 7 && x === 16) col = cv.caseSh;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'shortChubby') {
        // 【身体变种6：矮敦工程机甲短袄 (shortChubby)】—— 紧凑利落的短款工程机甲夹克 (仅 r=0..7)，绝不拖地或凸出背后
        const bounds = [
          [13, 17], // r=0: 工程领圈
          [13, 18], // r=1: 敦实肩部
          [13, 19], // r=2: 工程胸甲
          [13, 19], // r=3: 腹部工具挂袋上沿
          [13, 19], // r=4: 腹部工具挂袋下沿
          [13, 18], // r=5: 工程腰带
          [14, 18], // r=6: 短袄下摆
          [14, 17], // r=7: 紧凑护胯底沿
        ];
        for (let r = 0; r < bounds.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const [x0, x1] = bounds[r];
          for (let x = x0; x <= x1; x++) {
            let col = x === x0 ? cv.coatHi : x === x1 ? cv.coatSh : cv.coatMid;
            if (r === 0 && (x === 14 || x === 16)) col = cv.collarHi;
            else if ((r === 3 || r === 4) && (x === 16 || x === 17)) col = cv.strapCol;
            else if (r === 5) col = (x === 16 || x === 17) ? cv.beltBuckle : cv.beltCol;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'broad') {
        // 【身体变种5：魁梧重型肩甲胸铠 (broad)】—— 宽阔双肩铆钉装甲护肩 + 倒三角重工钢板胸甲（背部干净无异物）
        const bounds = [
          [13, 18], // r=0: 重甲高领
          [12, 19], // r=1: 宽幅铆钉双肩甲上沿
          [12, 19], // r=2: 宽幅双肩甲下沿
          [13, 19], // r=3: 倒三角胸甲上段
          [13, 18], // r=4: 倒三角胸甲收腰段
          [13, 18], // r=5: 重型战术腰封
          [13, 18], // r=6: 装甲护裙上段
          [13, 18], // r=7: 装甲护裙中段
          [14, 18], // r=8: 装甲护裙底段
        ];
        for (let r = 0; r < bounds.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const [x0, x1] = bounds[r];
          for (let x = x0; x <= x1; x++) {
            let col = x === x0 ? cv.coatHi : x === x1 ? cv.coatSh : cv.coatMid;
            if ((r === 1 || r === 2) && (x <= 13 || x >= 18)) col = x === x0 ? cv.caseHi : cv.caseMid; // 肩甲金属色块
            else if (r === 3 && (x === 15 || x === 17)) col = cv.strapCol;
            else if (r === 5) col = (x === 16 || x === 17) ? cv.beltBuckle : cv.beltCol;
            else if (r >= 6 && x === 16) col = cv.beltCol;
            put(g, x + s, y, col);
          }
        }
      } else {
        // 【身体变种1/2/3：标准高领废土风衣 (standard) / 修长观测官长大衣 (slender) / 高个外骨骼战术衣 (tall)】
        const isSlender = bType === 'slender';
        const isTall = bType === 'tall';
        const baseBounds = [
          [13, 17], // r=0 (hy-7): 竖起高领上沿
          [13, 17], // r=1 (hy-6): 高领下沿遮住脖颈接缝
          [13, 18], // r=2 (hy-5): 肩胸上段
          [13, 18], // r=3 (hy-4): 胸口中段
          [13, 18], // r=4 (hy-3): 腰腹上段
          [13, 18], // r=5 (hy-2): 风衣腰带段
          [13, 19], // r=6 (hy-1): 风衣下段
          [12, 19], // r=7 (hy+0): 风衣下摆上沿
          [12, 19], // r=8 (hy+1): 风衣下摆中段
          [12, 19], // r=9 (hy+2): 风衣下摆底段
        ];
        for (let r = 0; r < baseBounds.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          let [x0, x1] = baseBounds[r];
          if (isSlender) {
            if (r >= 2 && r <= 6) x0 = 14;
            else if (r >= 7) x0 = 13;
          }
          for (let x = x0; x <= x1; x++) {
            let col = x === x0 ? cv.coatHi : x === x1 ? cv.coatSh : (r <= 1 ? cv.coatHi : cv.coatMid);
            if (r === 0 && (x === 14 || x === 16)) col = cv.collarHi;
            if (isSlender && r >= 2 && r <= 8 && x === 16 && r !== 5) col = r % 2 === 0 ? cv.beltBuckle : cv.strapCol;
            else if (isTall && (r === 2 || r === 3) && (x === 14 || x === 17)) col = cv.strapCol;
            else {
              if (r === 2 && (x === x0 || x === x1)) col = cv.strapCol;
              if (r === 2 && x === 16) col = cv.caseSh;
              if (r === 3 && x === 14) col = cv.coatSh;
              if (r === 4 && (x === 15 || x === 17)) col = x === 17 ? cv.strapCol : cv.coatSh;
            }
            if (r === 5) col = (x === 16 || x === 17) ? cv.beltBuckle : cv.beltCol;
            if (r === 7 && (x === 13 || x === 14)) col = cv.caseSh;
            if (r >= 7 && x === 16) col = cv.coatSh;
            put(g, x + s, y, col);
          }
        }
        const hemY = hy + 3 + ub;
        const hemS = shf(hemY);
        const sway = (mode === 'run' || mode === 'sprint') ? (frame % 2 === 0 ? -1 : 0) : 0;
        const jaggedCols = isSlender ? [13, 15, 17, 19] : isTall ? [12, 14, 17, 19] : [12, 14, 16, 18, 19];
        for (const x of jaggedCols) {
          put(g, x + hemS + sway, hemY, x <= 13 ? cv.coatHi : x >= 18 ? cv.coatSh : cv.hemCol);
        }
      }
      const ledY = hy - 4 + ub;
      const ledX = (v34 ? 15 : 15 + shf(ledY));
      put(g, ledX, ledY, cv.ledCol || '#9ac2d9');
      return;
    }

    if (sp === 'myco') {
      // 2. 孢子傀儡躯干插槽：支持自由组合体型与宇航服配色
      //    修复丰满/矮胖体型背部怪异方块：45°待机时不向左侧凸出背箱，侧面时仅在后背贴合紧凑 2px 宽维生背囊
      const mv = resolveMycoStyle(spec);
      const bType = spec.bodyBuild || mv.bodyBuild || 'standard';
      const isChubby = bType === 'chubby' || bType === 'shortChubby' || bType === 'pistonHulk';
      const isShortChubby = bType === 'shortChubby';
      const isSlender = bType === 'slender' || bType === 'exoFrame';
      const isBroad = bType === 'broad' || bType === 'pistonHulk';

      // (1) 背部紧凑维生背囊：45° 视角下背囊位于身后再无突兀方块；侧面视角下仅贴合后背 (x = 12..13, r = 1..4)
      if (!v34) {
        const packX0 = 12;
        const packX1 = 13;
        for (let r = 1; r <= 4; r++) {
          const y = hy - 6 + ub + r;
          const s = shf(y);
          for (let x = packX0; x <= packX1; x++) {
            const isBorder = r === 1 || r === 4 || x === packX0;
            const pCol = isBorder ? mv.packBorder : (r === 2 ? mv.mycHi : mv.packFill);
            put(g, x + s, y, pCol);
          }
        }
      }

      // (2) 宇航服密封高领圈 (y = hy - 7 + ub)，向上承接菌柄脖颈 (dy = 5..6)
      const colY = hy - 7 + ub;
      const colS = shf(colY);
      const colX0 = isChubby || isBroad ? 13 : 14;
      const colX1 = isChubby ? 18 : 17;
      for (let x = colX0; x <= colX1; x++) {
        const cCol = x === colX0 ? mv.strapCol : x === colX1 ? mv.suitSh : (x === colX0 + 1 ? mv.mycHi : mv.suitHi);
        put(g, x + colS, colY, cCol);
      }

      // (3) 宇航服躯干、高矮胖瘦轮廓与分层护胯下摆 (后背统一收敛于 x0 >= 13，彻底消除待机与跑动时的背后异物感)
      const maxR = isShortChubby ? 8 : 10;
      for (let r = 0; r < maxR; r++) {
        const y = hy - 6 + ub + r;
        const s = shf(y);
        let x0 = r <= 7 ? 14 : 15;
        let x1 = r <= 8 ? 18 : 17;
        if (bType === 'chubby') {
          if (r === 0) { x0 = 13; x1 = 18; }
          else if (r >= 1 && r <= 5) { x0 = 13; x1 = 19; }
          else if (r <= 7) { x0 = 13; x1 = 18; }
          else { x0 = 14; x1 = 18; }
        } else if (isShortChubby) {
          if (r === 0) { x0 = 13; x1 = 18; }
          else if (r >= 1 && r <= 5) { x0 = 13; x1 = 19; }
          else { x0 = 14; x1 = 18; }
        } else if (isBroad) {
          if (r <= 2) { x0 = 13; x1 = 19; }
          else if (r <= 5) { x0 = 13; x1 = 18; }
          else if (r <= 7) { x0 = 14; x1 = 18; }
          else { x0 = 14; x1 = 17; }
        } else if (isSlender) {
          if (r === 0 || r === 1) { x0 = 14; x1 = 18; }
          else if (r >= 2 && r <= 4) { x0 = 14; x1 = 17; }
          else if (r <= 7) { x0 = 14; x1 = 18; }
          else { x0 = 15; x1 = 17; }
        }

        for (let x = x0; x <= x1; x++) {
          let col = x === x0 ? mv.suitHi : x === x1 ? mv.suitSh : mv.suitMid;
          if ((r === 1 || r === 3) && x > x0 && x < x1) {
            col = (x + r) % 2 === 0 ? mv.suitMid : mv.suitSh;
          }
          if ((r === 0 && x === x0 + 1) || (r === 1 && x === x0 + 2) || (r === 2 && x === x0 + 3) || (r === 3 && x === x0 + 4)) {
            col = mv.strapCol || mv.suitHi;
          }
          if (r === 4) {
            const buckleX = isChubby ? 17 : 16;
            col = (x === buckleX || (isChubby && x === buckleX + 1))
              ? (mv.beltBuckle || mv.stipeHi)
              : (x === x0 + 1 ? mv.packBorder : (mv.beltCol || mv.packBorder));
          }
          if (r === 6 && (x === x0 || x === x1 - 1)) col = mv.strapCol || mv.suitHi;
          if (r >= 7 && x === Math.floor((x0 + x1) / 2)) col = mv.packBorder;
          put(g, x + s, y, col);
        }
      }

      // (4) 胸口发光气压阀仪表 (Gauge) 与撑破宇航服向外蔓延的共生菌丝脉络
      const s0 = shf(hy - 5 + ub);
      put(g, (isChubby ? 18 : 17) + s0, hy - 5 + ub, mv.gaugeCol || mv.sporeAir1);
      put(g, 15 + s0, hy - 5 + ub, mv.mycHi);
      put(g, 16 + s0, hy - 4 + ub, mv.mycSh);
      put(g, 17 + s0, hy - 3 + ub, mv.mycHi);
      put(g, 16 + s0, hy - 2 + ub, mv.mycSh);
      if (isChubby) {
        put(g, 14 + s0, hy - 3 + ub, mv.mycHi);
        put(g, 18 + s0, hy - 4 + ub, mv.mycSh);
      }
      return;
    }

    if (sp === 'cinder') {
      // 3. 烬骸族躯干插槽：支持 9 种熔岩胸甲与身形变种 × 6 种“熔炉之心”动态火核 × 7 种火山岩与熔火色温
      //    背部轮廓完全平整收敛 (x0 >= 12)，丰满巨釜与矮敦铁匠体型绝不向背后凸出异物方块
      const iv = resolveCinderStyle(spec);
      const bType = spec.bodyBuild || iv.bodyBuild || 'standard';
      const motif = iv.coreMotif || 'vertSlit';
      const rHi = iv.rockHi || '#38302e';
      const rMid = iv.rockMid || '#2b2523';
      const rBase = iv.rockBase || '#1c1918';
      const rDeep = iv.rockDeep || '#0f0d0d';
      const shHi = iv.shawlHi || '#473a35';
      const shMid = iv.shawlMid || '#332a27';
      const shTrim = iv.shawlTrim || '#6e473b';
      const bCol = iv.beltCol || '#2e2422';
      const bGlow = iv.beltGlow || '#bd3b14';
      const fCore = iv.flameCore || '#ffffff';
      const fHi = iv.flameHi || '#ffd23f';
      const fMid = iv.flameMid || '#ff7b29';
      const fLow = iv.flameLow || '#ff5a1f';

      if (bType === 'exoFrame') {
        // 【身体变种7：镂空黑曜石肋骨外骸 (exoFrame)】—— 裸露黑曜石胸椎与横向熔岩肋骨笼，肋骨间隙透出炽热火脉
        for (let r = 0; r <= 8; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const x0 = (r === 1 || r === 2 || r === 3 || r === 6) ? 13 : 14;
          const x1 = (r === 1 || r === 2 || r === 3 || r === 6) ? 18 : 17;
          for (let x = x0; x <= x1; x++) {
            if ((r === 2 || r === 4) && (x === x0 + 1 || x === x1 - 1)) continue;
            let col = x === x0 ? rHi : x === x1 ? rDeep : rBase;
            if (r === 0) col = x === 15 ? fLow : shHi;
            else if (r === 1 || r === 3) col = (x === x0 || x === x1) ? rMid : fLow;
            else if (r === 5) col = (x === 15 || x === 16) ? bGlow : bCol;
            else if (r >= 6) col = (x === x0 || x === x1) ? rMid : rDeep;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'pistonHulk') {
        // 【身体变种8：双肩火山排烟柱巨躯 (pistonHulk)】—— 双肩高耸黑曜石火山烟囱 + 双联熔岩高炉重甲
        const sTop = shf(hy - 7 + ub);
        put(g, 13 + sTop, hy - 8 + ub, rHi);
        put(g, 14 + sTop, hy - 8 + ub, fLow);
        put(g, 18 + sTop, hy - 8 + ub, rDeep);
        put(g, 17 + sTop, hy - 8 + ub, fMid);
        for (let r = 0; r <= 8; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const x0 = r <= 5 ? 13 : 14;
          const x1 = r <= 4 ? 19 : r <= 7 ? 18 : 17;
          for (let x = x0; x <= x1; x++) {
            let col = x === x0 ? rHi : x >= x1 - 1 ? rDeep : rBase;
            if (r <= 1 && (x === 13 || x === 18)) col = shHi;
            else if (r >= 1 && r <= 4 && (x === 14 || x === 17)) col = r % 2 === 1 ? fHi : bGlow;
            else if (r === 5) col = (x === 15 || x === 16 || x === 17) ? bGlow : bCol;
            else if (r >= 6 && (x === 14 || x === 17)) col = shTrim;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'ponchoMech') {
        // 【身体变种9：焦炭余烬破损大斗篷 (ponchoMech)】—— 斜裁焦黑火山灰斗篷包裹胸膛，下摆镶嵌暗燃余烬边
        for (let r = 0; r <= 8; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const x0 = r <= 5 ? 13 : 14;
          const x1 = r <= 3 ? 18 : r === 4 ? 19 : 17;
          for (let x = x0; x <= x1; x++) {
            let col;
            if (r <= 4) {
              const isEmberTrim = (r === 4) || (r === 3 && x >= 17) || (r === 2 && x === 18);
              col = isEmberTrim ? bGlow : (x === x0 ? shHi : x === x1 ? rDeep : shMid);
              if (r === 0 && (x === 14 || x === 16)) col = shTrim;
            } else if (r === 5) {
              col = (x === 15 || x === 16) ? fMid : bCol;
            } else {
              col = (x === 14 || x === 17) ? rMid : rBase;
            }
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'chubby') {
        // 【身体变种4：重装熔岩巨釜圆腹躯干 (chubby)】—— 饱满浑圆的铸铁黑岩熔炉圆腹 + 横向透火格栅（后背平整 x0 >= 13）
        const bounds = [
          [13, 17], // r=0
          [13, 18], // r=1
          [13, 19], // r=2
          [13, 19], // r=3
          [13, 19], // r=4
          [13, 19], // r=5
          [13, 19], // r=6: 熔岩腰封
          [13, 18], // r=7
          [14, 18], // r=8
        ];
        for (let r = 0; r < bounds.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const [x0, x1] = bounds[r];
          for (let x = x0; x <= x1; x++) {
            let col = r <= 1 ? (x === x0 ? shHi : shMid) : (x === x0 ? rMid : x === x1 ? rDeep : rBase);
            if (r === 1 && (x === 14 || x === 17)) col = shTrim;
            else if ((r === 3 || r === 5) && x >= 15 && x <= 18) col = bGlow; // 圆腹横向透火格栅
            else if (r === 6) col = (x === 16 || x === 17) ? fHi : bCol;
            else if (r >= 7 && x === 16) col = bCol;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'shortChubby') {
        // 【身体变种6：矮敦锻造工匠短岩甲 (shortChubby)】—— 紧凑敦实的短款黑岩锻造围裙甲 (r=0..7)，背部平整无任何凸块
        const bounds = [
          [13, 17], // r=0
          [13, 18], // r=1
          [13, 19], // r=2
          [13, 19], // r=3
          [13, 19], // r=4
          [13, 18], // r=5: 铁匠熔岩腰带
          [14, 18], // r=6
          [14, 17], // r=7
        ];
        for (let r = 0; r < bounds.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const [x0, x1] = bounds[r];
          for (let x = x0; x <= x1; x++) {
            let col = r <= 1 ? (x === x0 ? shHi : shMid) : (x === x0 ? rMid : x === x1 ? rDeep : rBase);
            if ((r === 3 || r === 4) && (x === 16 || x === 17)) col = shTrim;
            else if (r === 5) col = (x === 16 || x === 17) ? bGlow : bCol;
            put(g, x + s, y, col);
          }
        }
      } else if (bType === 'broad') {
        // 【身体变种5：魁梧双肩火山角重铠 (broad)】—— 宽阔外扩的黑曜石尖刺肩甲 + 倒三角重型胸甲
        const bounds = [
          [13, 18], // r=0
          [12, 19], // r=1: 宽肩甲上沿
          [12, 19], // r=2: 宽肩甲下沿
          [13, 19], // r=3
          [13, 18], // r=4
          [13, 18], // r=5: 熔岩腰甲
          [13, 18], // r=6
          [14, 18], // r=7
          [14, 17], // r=8
        ];
        for (let r = 0; r < bounds.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          const [x0, x1] = bounds[r];
          for (let x = x0; x <= x1; x++) {
            let col = x === x0 ? rHi : x === x1 ? rDeep : rBase;
            if ((r === 1 || r === 2) && (x <= 13 || x >= 18)) col = x === x0 ? shHi : shTrim;
            else if (r === 5) col = (x === 15 || x === 16) ? bGlow : bCol;
            else if (r >= 6 && x === 16) col = bCol;
            put(g, x + s, y, col);
          }
        }
      } else {
        // 【身体变种1/2/3：标准倒三角黑岩胸甲+焦炭短披肩 (standard) / 高挑修长黑曜祭司甲 (slender) / 高个熔岩巡林客胸铠 (tall)】
        const isSlender = bType === 'slender';
        const isTall = bType === 'tall';
        const rowSpans = [
          [12, 19], // r=0 (hy-7): 宽肩焦炭短披肩上沿 (宽8)
          [12, 19], // r=1 (hy-6): 短披肩与倒三角胸甲上沿 (宽8)
          [12, 19], // r=2 (hy-5): 倒三角胸甲上段 (宽8)
          [12, 19], // r=3 (hy-4): 倒三角胸甲中段 (宽8)
          [13, 18], // r=4 (hy-3): 倒三角胸甲收束段 (宽6)
          [13, 18], // r=5 (hy-2): 岩石腰甲带 (宽6)
          [14, 17], // r=6 (hy-1): 岩石腰甲下段 (宽4)
          [14, 17], // r=7 (hy+0): 骨盆岩甲 (宽4)
          [14, 17], // r=8 (hy+1): 岩甲下垂护片 (宽4)
          [14, 16], // r=9 (hy+2): 岩甲下摆 (宽3)
          [15, 16], // r=10 (hy+3): 岩甲尖端 (宽2)
        ];
        for (let r = 0; r < rowSpans.length; r++) {
          const y = hy - 7 + ub + r;
          const s = shf(y);
          let [x0, x1] = rowSpans[r];
          if (isSlender) {
            if (r <= 3) { x0 = 13; x1 = 18; }
            else if (r >= 4 && r <= 5) { x0 = 14; x1 = 17; }
          } else if (isTall && r >= 7 && r <= 9) {
            x1 = 18;
          }
          for (let x = x0; x <= x1; x++) {
            const isShawl = r <= 1 || (r <= 3 && x <= x0 + 1);
            let col = isShawl
              ? (r === 0 || x === x0 ? shHi : shMid)
              : (x === x0 ? (rBase === '#1c1918' ? '#262222' : rHi) : (rBase === '#1c1918' ? '#171515' : rBase));
            if (r === 1 && (x === x0 + 1 || x === x1 - 1)) col = shTrim;
            if (r === 5) col = (x === 15 || x === 16) ? bGlow : bCol;
            if (r === 7 && x === 15) col = rBase === '#1c1918' ? '#382824' : shTrim;
            if (isSlender && r >= 6 && r <= 9 && x === 15) col = bGlow;
            put(g, x + s, y, col);
          }
        }
        if (!isSlender) {
          put(g, 11 + shf(hy - 4 + ub), hy - 4 + ub, shMid);
          put(g, 12 + shf(hy - 3 + ub), hy - 3 + ub, shMid);
        }
      }

      // (B) 胸膛中央“熔炉之心” 6 种联动图案 + 待机呼吸时火光像素向上跳动 1 像素
      const sMid = shf(hy - 4 + ub);
      if (motif === 'crossForge') {
        // 2. 十字星芒炉心
        put(g, 15 + sMid, hy - 5 + ub, fHi);
        put(g, 16 + sMid, hy - 5 + ub, fLow);
        put(g, 14 + sMid, hy - 4 + ub, fMid);
        put(g, 15 + sMid, hy - 4 + ub, fHi);
        put(g, 16 + sMid, hy - 4 + ub, fCore);
        put(g, 17 + sMid, hy - 4 + ub, fHi);
        put(g, 15 + sMid, hy - 3 + ub, fLow);
        put(g, 16 + sMid, hy - 3 + ub, fHi);
      } else if (motif === 'triEmber') {
        // 3. 倒三角三核熔炉
        put(g, 14 + sMid, hy - 5 + ub, fHi);
        put(g, 15 + sMid, hy - 5 + ub, fLow);
        put(g, 17 + sMid, hy - 5 + ub, fHi);
        put(g, 15 + sMid, hy - 4 + ub, fHi);
        put(g, 16 + sMid, hy - 4 + ub, fCore);
        put(g, 16 + sMid, hy - 3 + ub, fLow);
      } else if (motif === 'visoredMagma') {
        // 4. 双列竖向高炉火栅
        put(g, 14 + sMid, hy - 5 + ub, fHi);
        put(g, 16 + sMid, hy - 5 + ub, fLow);
        put(g, 14 + sMid, hy - 4 + ub, fLow);
        put(g, 16 + sMid, hy - 4 + ub, fCore);
        put(g, 14 + sMid, hy - 3 + ub, fHi);
        put(g, 16 + sMid, hy - 3 + ub, fMid);
      } else if (motif === 'weepingLava') {
        // 5. 纵向深渊熔岩裂谷
        put(g, 15 + sMid, hy - 5 + ub, fCore);
        put(g, 16 + sMid, hy - 5 + ub, fHi);
        put(g, 15 + sMid, hy - 4 + ub, fHi);
        put(g, 16 + sMid, hy - 4 + ub, fLow);
        put(g, 15 + sMid, hy - 3 + ub, fLow);
        put(g, 16 + sMid, hy - 2 + ub, fMid);
      } else if (motif === 'hollowCore') {
        // 6. 环状日冕熔炉（中心黑曜石日食核，外围炽白金焰环绕）
        put(g, 15 + sMid, hy - 5 + ub, fHi);
        put(g, 16 + sMid, hy - 5 + ub, fCore);
        put(g, 14 + sMid, hy - 4 + ub, fLow);
        put(g, 15 + sMid, hy - 4 + ub, rDeep);
        put(g, 16 + sMid, hy - 4 + ub, fHi);
        put(g, 15 + sMid, hy - 3 + ub, fLow);
        put(g, 16 + sMid, hy - 3 + ub, fMid);
      } else {
        // 1. 默认 2×3 经典熔炉之心（中心 #ffffff，外围 #ffd23f 与 #ff5a1f）
        put(g, 15 + sMid, hy - 5 + ub, fHi);
        put(g, 16 + sMid, hy - 5 + ub, fLow);
        put(g, 15 + sMid, hy - 4 + ub, fHi);
        put(g, 16 + sMid, hy - 4 + ub, fCore);
        put(g, 15 + sMid, hy - 3 + ub, fLow);
        put(g, 16 + sMid, hy - 3 + ub, fHi);
      }

      const flameJump = !!(
        opts.flameJump ||
        (po && po.idleT != null ? Math.floor((po.idleT + 0.01) / 0.4) % 2 === 1 : po && po.bob < 0)
      );
      if (flameJump) {
        put(g, 15 + shf(hy - 6 + ub), hy - 6 + ub, fHi);
        put(g, 16 + shf(hy - 6 + ub), hy - 6 + ub, fMid);
      }
    }
  }

  /* 外星种族可选特效图层 (drawAlienFXLayer -> layers.fx)：
   * 已按用户要求彻底移除所有外星种族旁边常驻的粒子特效！正常待机、行走、跑步、跳跃时周围保持 100% 纯净无任何悬浮粒子。 */
  function drawAlienFXLayer(gFx, spec, po, hy, opts) {
    if (!spec || !spec.species || spec.species === 'human') return;
    opts = opts || {};
    if (!opts.fxPreview && !opts.airPreview && !opts.emberPreview) return;
  }

  /* 头部与全身模块化拆解预览（供 NPC 生成工坊展示：1.基础头骨 → 2.发型 → 3.帽饰(含空格消发) → 4.套装与适配袖长 → 5.鞋靴与背饰(待机) → 6.跑动披风合成） */
  function headLayerBreakdown(spec, v34) {
    const gBase = mkG(), gHair = mkG(), gHat = mkG(), gSuit = mkG(), gShoeBack = mkG(), gFx = mkG();
    const look = spec.look, key = headKey(look, { blink: false }), c = look.cols;
    const P = poser(spec);
    const rawPo = v34 ? P.idle(0, false) : P.idleSide(0, false);
    const po = Object.assign({}, rawPo, { lean: 0, bob: 0, head: [0, 0] });
    const baseHy = P.hyGround(po);
    const hy = baseHy + GOFF, ox = v34 ? 12 : 13, oy = hy - 12;

    if (spec.species && spec.species !== 'human') {
      // 外星种族 6 阶段插槽拆解预览（已彻底去除角色旁边的常驻浮空粒子）：
      // 1. 头部与菌柄脖颈插槽（待机态） 2. 头部动态微特效 A（浮动白环/孢子链物理摆动/金黄竖缝） 3. 头部动态微特效 B（开火准星/滞空伞缘上扬/受击噪点）
      drawAlienHead(gBase, spec, po, ox, oy, v34, {});
      drawAlienHead(gHair, spec, Object.assign({}, po, { bob: -1, locoMode: 'run', locoFrame: 2 }), ox, oy, v34, { screenFloat: true, lagPreview: true });
      drawAlienHead(gHat, spec, Object.assign({}, po, { isAir: true, locoMode: 'air' }), ox, oy, v34, { screenMode: 'crosshair', airPreview: true });

      // 4. 躯干服装纹理与上肢插槽层 (suitLayer)
      drawAlienTorso(gSuit, spec, po, hy, 0, 0, v34, false, { flameJump: true });
      const b = spec.build;
      const bBuild = spec.bodyBuild || (spec.mycoConfig && spec.mycoConfig.bodyBuild) || (spec.cathodeConfig && spec.cathodeConfig.bodyBuild) || (spec.cinderConfig && spec.cinderConfig.bodyBuild) || '';
      const isChubby = (spec.species === 'myco' || spec.species === 'cathode' || spec.species === 'cinder') && (bBuild === 'chubby' || bBuild === 'shortChubby' || bBuild === 'pistonHulk' || spec.mycoVariant === 'amberChanterelle' || spec.cathodeVariant === 'hexDomeHeavy' || spec.cinderVariant === 'calderaGolem');
      const isBroad = (spec.species === 'myco' || spec.species === 'cathode' || spec.species === 'cinder') && (bBuild === 'broad' || bBuild === 'pistonHulk' || spec.mycoVariant === 'violetMorel' || spec.cathodeVariant === 'triangleSentinel' || spec.cinderVariant === 'basaltHornLord');
      const LA = armPts(b, po.na[0], po.na[1]), RA = armPts(b, po.fa[0], po.fa[1]);
      if (v34) {
        drawArm2(gSuit, RA, isChubby || isBroad ? 18 : 17, hy - 6, c.armF, sleeveThick(look, false, true), look.sleeve);
        drawArm2(gSuit, LA, isChubby || isBroad ? 13 : 14, hy - 6, c.armN, sleeveThick(look, true, true), look.sleeve);
      } else {
        drawArm2(gSuit, RA, isChubby || isBroad ? 13 : 14, hy - 6, c.armF, sleeveThick(look, false, false), look.sleeve);
        drawArm2(gSuit, LA, isChubby ? 17 : 16, hy - 6, c.armN, sleeveThick(look, true, false), look.sleeve);
      }

      // 5. 下肢护膝/绑腿/靴头插槽层 (shoeBackLayer —— 纯净腿部无周围粒子)
      if (v34) {
        const LL = legPts(b, po.nl[0], po.nl[1]), RL = legPts(b, po.fl[0], po.fl[1]);
        drawLeg34(gShoeBack, RL, isChubby ? 17 : 16, hy, c.legF, 1, look.shoes);
        drawLeg34(gShoeBack, LL, isChubby ? 13 : 14, hy, c.legN, -1, look.shoes);
      } else {
        const LN = legPts(b, po.nl[0], po.nl[1]), LF = legPts(b, po.fl[0], po.fl[1]);
        drawLeg2(gShoeBack, LF, 14, hy, c.legF, look.shoes);
        drawLeg2(gShoeBack, LN, isChubby ? 16 : 15, hy, c.legN, look.shoes);
      }

      const gFull = charGrid(spec, po, baseHy, 0, {});
      const runPo = P.loco('run', 2);
      const gRunCape = charGrid(spec, runPo, P.hyGround(runPo), 0, {});
      return { baseHead: gBase, hairLayer: gHair, hatLayer: gHat, suitLayer: gSuit, shoeBackLayer: gShoeBack, fxLayer: gFx, fullChar: gFull, runCapePreview: gRunCape, erasedHairPixels: 0, ox, oy };
    }

    const baseMap = v34 ? BASE_HEAD34 : BASE_HEAD;
    const hairMap = (v34 ? HEADS34 : HEADS)[look.hair] || (v34 ? HEADS34.ponytail : HEADS.ponytail);
    const hatKey = look.hat || (look.hair === 'cap' ? 'cap' : 'none');
    const hatMap = (v34 ? HATS34 : HATS)[hatKey] || [];
    let erasedHairPixels = 0;
    for (const m of baseMap) put(gBase, ox + m[0], oy + m[1], key[m[2]]);
    for (const m of hairMap) put(gHair, ox + m[0], oy + m[1], key[m[2]]);
    for (const m of hatMap) {
      if (m[2] === ' ') {
        erasedHairPixels++;
      } else {
        put(gHat, ox + m[0], oy + m[1], key[m[2]]);
      }
    }

    // 单独渲染套装+裤子+适配袖长预览层 (suitLayer)
    const suitOnlySpec = Object.assign({}, spec, {
      look: Object.assign({}, look, { hat: 'none', back: 'none' }),
    });
    drawCharacter(gSuit, suitOnlySpec, po, hy, {});
    // 擦除头部行 (oy - 2 .. oy + 4) 仅保留颈部以下套装、双臂袖长与裤装
    for (let r = 0; r <= oy + 4; r++) for (let col = 0; col < GW; col++) gSuit[r][col] = null;

    // 单独渲染背饰(披风/背包)与鞋靴预览层 (shoeBackLayer)
    if (look.back && look.back !== 'none') {
      if (v34) drawBackSlot34(gShoeBack, spec, po, hy, 0);
      else drawBackSlot(gShoeBack, spec, po, hy, 0, 0, {});
    }
    const b = spec.build;
    if (v34) {
      const LL = legPts(b, po.nl[0], po.nl[1]), RL = legPts(b, po.fl[0], po.fl[1]);
      drawLeg34(gShoeBack, RL, 16, hy, c.legF, 1, look.shoes);
      drawLeg34(gShoeBack, LL, 14, hy, c.legN, -1, look.shoes);
    } else {
      const LN = legPts(b, po.nl[0], po.nl[1]), LF = legPts(b, po.fl[0], po.fl[1]);
      drawLeg2(gShoeBack, LF, 15, hy, c.legF, look.shoes);
      drawLeg2(gShoeBack, LN, 15, hy, c.legN, look.shoes);
    }

    const gFull = charGrid(spec, po, baseHy, 0, {});
    const runPo = P.loco('run', 2);
    const gRunCape = charGrid(spec, runPo, P.hyGround(runPo), 0, {});
    return { baseHead: gBase, hairLayer: gHair, hatLayer: gHat, suitLayer: gSuit, shoeBackLayer: gShoeBack, fullChar: gFull, runCapePreview: gRunCape, erasedHairPixels, ox, oy };
  }
  function drawFlask(g, hx, hy, dx, dy, c) {
    const cx = Math.round(hx + dx * 1.6), cy = Math.round(hy + dy * 1.6 - 0.5);
    put(g, cx, cy - 2, '#7a5a3a'); put(g, cx, cy - 1, c.glass || '#d6e6ee');
    put(g, cx - 1, cy, c.glass || '#d6e6ee'); put(g, cx, cy, c.liquid || '#b5523a'); put(g, cx + 1, cy, c.liquid || '#b5523a');
    put(g, cx - 1, cy + 1, c.liquid || '#b5523a'); put(g, cx, cy + 1, c.liquid2 || '#8e3a28'); put(g, cx + 1, cy + 1, c.liquid2 || '#8e3a28');
  }


  /* ---------- 太空服图层：对任意角色都能穿，所有姿势通用 ---------- */
  const SU = { SW: '#e3e9f1', SS: '#aab8c9', SD: '#6f7f96', AC: '#ef7b3a', BT: '#39455a', GL: '#7fb4e6', HL: '#d6efff', PK: '#9aa6b8', NZ: '#2d3342' };
  const HELM7 = ['..XXX..', '.X...X.', 'X.....X', 'X.....X', 'X.....X', 'X.....X', '.X...X.', '..XXX..'];
  const HELM8 = ['..XXXX..', '.X....X.', 'X......X', 'X......X', 'X......X', 'X......X', '.X....X.', '..XXXX..'];
  const suitCache = new WeakMap();
  function suitSpec(spec) {              // 把角色的衣服/袖子/裤子换成太空服配色，头发与帽子收进头盔（外星种族保留专属物种头身与四肢结构）
    let r = suitCache.get(spec); if (r) return r;
    if (spec.species && spec.species !== 'human') {
      r = Object.assign({}, spec);
      suitCache.set(spec, r);
      return r;
    }
    const lc = spec.look.cols, h = spec.look.hair;
    const tuckedHair = (h === 'cap' || h === 'long' || h === 'spiky' || h === 'bun' || h === 'mohawk') ? 'short' : h;
    r = Object.assign({}, spec, { look: Object.assign({}, spec.look, { outfit: 'tee', prop: 'none', hat: 'none', hair: tuckedHair,
      cols: Object.assign({}, lc, { top: SU.SW, topSh: SU.SS, belt: SU.SD, pelvis: SU.SS, armN: [SU.SW, SU.SW, SU.SD], armF: [SU.SS, SU.SS, SU.SD],
        legN: [SU.SW, SU.SW, SU.BT, SU.SD], legF: [SU.SS, SU.SS, SU.BT, SU.SD] }) }) });
    suitCache.set(spec, r); return r;
  }
  function drawHelmet(g, x0, y0, rows) {
    const w = rows[0].length;
    rows.forEach((row, r) => { for (let c = 0; c < w; c++) {
      if (row[c] !== 'X') continue;
      let col = r <= 1 ? SU.SW : r >= 5 ? SU.SS : (c === 0 ? SU.SS : SU.SW);
      if (r === 7) col = SU.AC; if (c === w - 1 && r >= 2 && r <= 5) col = SU.GL;
      put(g, x0 + c, y0 + r, col);
    } });
    put(g, x0 + 4, y0 + 1, SU.HL); put(g, x0 + w - 1, y0 + 2, SU.HL);
  }
  function drawFlame(g, cols, hy, flame, L) {
    const len = Math.round(2 + 4 * flame), fc = ['#fff2b8', '#ffc24d', '#ff8a33', '#d4502a', '#8a3322'];
    for (let r = 0; r < len; r++) {
      const dx = L > 0 && r >= 3 ? -1 : 0;
      for (const x of cols) {
        if (r >= 3 && x === cols[0] && len >= 5) continue;
        put(g, x + dx, hy - 1 + r, fc[Math.min(4, Math.floor(r * 5 / len))]);
      }
    }
  }
  function drawPack(g, hy, ub, L, flame) {             // 侧面太空喷气背包：躯干后面两列
    const sh = y => Math.round(L * (hy - 3 - y) / 4);
    if (flame > 0) drawFlame(g, [13, 14], hy, flame, L);
    for (let y = hy - 6 + ub; y <= hy - 3; y++) { const s = sh(y); put(g, 13 + s, y, SU.PK); put(g, 14 + s, y, SU.SS); }
    put(g, 13 + sh(hy - 5 + ub), hy - 5 + ub, SU.AC); put(g, 13, hy - 2, SU.NZ); put(g, 14, hy - 2, SU.NZ);
  }

  /* 背部共用栏位 (look.back: 'none' | 'cape' | 'pack')：
   * 披风与背包共用同一个背饰栏位：
   * - 'pack'（勘探战术背包）：紧贴后背绘制带顶盖睡袋卷与侧袋扣具的战术背包；
   * - 'cape'（旅行者披风）：
   *   1) 二段跳（po.inFlip || po.inKick）时直接隐藏披风，避免空翻团身或喷气二段跳时穿模怪异；
   *   2) 走路（walk/cwalk）时保持纵向高度平稳（消除帧间上下跳跃感），仅在下摆末端做柔和 1px 步频微摆；
   *   3) 跳跃（air）从上升帧(airV>0)经顶点(airV=0)到下落帧(airV<0)连续平滑插值过渡；
   *   4) 跑步与冲刺（run/sprint）大幅向后高高飘起并呈正弦波浪翻涌。 */
  function drawBackSlot(g, spec, po, hy, ub, L, opts) {
    const look = spec.look, c = look.cols, backType = look.back;
    if (!backType || backType === 'none') return;
    if (backType === 'cape' && (po.inFlip || po.inKick || (opts && opts.phi))) return;
    const sh = y => Math.round(L * (hy - 3 - y) / 4);
    const colMain = c.back || '#7a2826';
    const colHi = c.backHi || '#a33936';
    const colSh = c.backSh || '#4d1716';

    if (backType === 'pack') {
      // 侧面战术勘探背包：顶卷(hy-6) + 背包主体(hy-5..hy-3) + 底袋(hy-2)
      const sTop = sh(hy - 6 + ub);
      put(g, 13 + sTop, hy - 6 + ub, colHi);
      put(g, 14 + sTop, hy - 6 + ub, colHi);
      for (let y = hy - 5 + ub; y <= hy - 3; y++) {
        const s = sh(y);
        put(g, 12 + s, y, colSh);
        put(g, 13 + s, y, colMain);
        put(g, 14 + s, y, y === hy - 4 + ub ? colHi : colMain);
      }
      put(g, 13, hy - 2, colSh);
      put(g, 14, hy - 2, colSh);
      return;
    }

    if (backType === 'cape') {
      const ax0 = 14 + sh(hy - 6 + ub);
      const ay0 = hy - 6 + ub;
      const mode = po.locoMode || (po.isAir ? 'air' : 'idle');
      const frame = po.locoFrame != null ? po.locoFrame : 0;
      const legSpread = Math.abs((po.nl ? po.nl[0] : 0) - (po.fl ? po.fl[0] : 0));
      const isMeleeSwing = !!(opts && opts.weapon && opts.weapon.action && opts.weapon.action !== 'aim' && opts.weapon.action !== 'idle');

      let reachX = 2.6;
      let dropY = 8.2;
      let waveAmp = 0.0;
      let horizSwayAmp = 0.0;
      let phase = 0.0;

      if (mode === 'sprint') {
        // 冲刺：披风几乎水平向身后高速猎猎扬起
        reachX = 9.2;
        dropY = 1.6;
        waveAmp = 1.25;
        phase = (frame / 8) * Math.PI * 2;
      } else if (mode === 'run' || (mode !== 'walk' && mode !== 'cwalk' && mode !== 'air' && legSpread >= 48)) {
        // 跑步：披风大幅脱离双腿向后上方飘起，随 8 帧步频产生流畅波浪翻涌
        reachX = 8.6;
        dropY = 2.4;
        waveAmp = 1.15;
        phase = (frame / 8) * Math.PI * 2;
      } else if (mode === 'walk' || mode === 'cwalk') {
        // 走路 / 蹲行：彻底消除垂直方向(cy)跳跃感，保持垂落高度恒定，仅在披风下摆做柔和的 1px 水平随步微摆
        reachX = mode === 'cwalk' ? 3.6 : 3.3;
        dropY = mode === 'cwalk' ? 7.2 : 7.8;
        waveAmp = 0.0;
        horizSwayAmp = 0.65;
        phase = (frame / 8) * Math.PI * 2;
      } else if (mode === 'runBack' || mode === 'walkBack' || mode === 'cwalkBack') {
        // 后退走 / 后退跑：迎面气流从背后吹来，披风贴近后背平稳垂落
        reachX = 2.2;
        dropY = 7.8;
        waveAmp = 0.0;
        horizSwayAmp = 0.45;
        phase = -(frame / 8) * Math.PI * 2;
      } else if (mode === 'air') {
        // 跳跃升落连续平滑过渡：从起跳上升(av=+2.5) -> 接近顶点(av=+0.4) -> 顶点过渡帧(av=0.0) -> 下落托起(av=-0.8..-2.6)
        const av = po.airV != null ? po.airV : 0;
        const uAir = clamp((2.5 - av) / 5.1, 0, 1);
        reachX = 3.8 + 3.8 * Math.sin(uAir * Math.PI * 0.5);
        dropY = 8.2 - 9.6 * Math.pow(uAir, 1.05);
        waveAmp = 0.25 + 0.35 * uAir;
        phase = uAir * Math.PI * 1.4;
      } else if (isMeleeSwing) {
        // 挥剑连招：披风随挥砍劲风向身后甩动
        reachX = 5.4;
        dropY = 5.0;
        waveAmp = 0.65;
        phase = ((opts.weapon && opts.weapon.p) || 0) * Math.PI * 2;
      } else {
        // 站立待机：自然垂落于后背至小腿上方，高度平稳
        const t0 = po.tail ? po.tail[0] : 28;
        reachX = 2.6 + clamp((t0 - 26) / 24, 0, 0.5);
        dropY = 8.2;
        waveAmp = 0.0;
      }

      const N = 12;
      for (let k = 0; k <= N; k++) {
        const u = k / N;
        const waveY = waveAmp > 0 ? Math.sin(phase - u * Math.PI * 2.0) * waveAmp * Math.pow(u, 0.8) : 0;
        const swayX = horizSwayAmp > 0 ? Math.sin(phase - u * Math.PI * 1.2) * horizSwayAmp * Math.max(0, (u - 0.45) / 0.55) : 0;
        const cx = Math.round(ax0 - reachX * Math.pow(u, 0.88) - swayX);
        const cy = Math.round(ay0 + dropY * u + waveY);
        if (u < 0.18) {
          put(g, cx, cy, colHi);
          put(g, cx, cy + 1, colMain);
        } else if (u < 0.84) {
          put(g, cx, cy - 1, colHi);
          put(g, cx, cy, colMain);
          put(g, cx, cy + 1, colSh);
          if (u >= 0.25 && u <= 0.75) put(g, cx - 1, cy, colMain);
        } else {
          put(g, cx, cy, colHi);
          if (u < 0.93) put(g, cx, cy + 1, colMain);
        }
      }
    }
  }

  function drawBackSlot34(g, spec, po, hy, ub) {
    const look = spec.look, c = look.cols, backType = look.back;
    if (!backType || backType === 'none') return;
    if (backType === 'cape' && (po.inFlip || po.inKick)) return;
    const colMain = c.back || '#7a2826';
    const colHi = c.backHi || '#a33936';
    const colSh = c.backSh || '#4d1716';

    if (backType === 'pack') {
      // 45° 视角战术背包：在画面左侧后肩处露出背包主体与顶卷
      put(g, 12, hy - 6 + ub, colHi);
      put(g, 13, hy - 6 + ub, colHi);
      for (let y = hy - 5 + ub; y <= hy - 3; y++) {
        put(g, 11, y, colSh);
        put(g, 12, y, colMain);
        put(g, 13, y, y === hy - 4 + ub ? colHi : colMain);
      }
      put(g, 12, hy - 2, colSh);
      put(g, 13, hy - 2, colSh);
      return;
    }

    if (backType === 'cape') {
      // 45° 视角旅行者披风：紧密贴合左后肩向画面左后方垂落至小腿，始终填满至列14，绝不产生空洞或干扰右臂
      put(g, 13, hy - 6 + ub, colHi);
      put(g, 14, hy - 6 + ub, colMain);
      for (let r = 0; r <= 7; r++) {
        const y = hy - 5 + ub + r;
        const xLeft = r < 4 ? 12 : 11;
        for (let x = xLeft; x <= 14; x++) {
          const col = x === xLeft ? colHi : x === 14 ? colSh : colMain;
          put(g, x, y, col);
        }
      }
    }
  }

  /* 画一个完整人物到网格 g（hy 为髋所在行，已含 GOFF）。opts: {suit, flame, noArms} */
  function drawCharacter(g, spec, po, hy, opts) {
    const suit = !!(opts && opts.suit), noArms = !!(opts && opts.noArms); if (suit) spec = suitSpec(spec);
    const b = spec.build, look = spec.look, c = look.cols, o = look.outfit;
    if (po.v34) return drawChar34(g, spec, po, hy, suit, opts);
    const L = po.lean || 0, ub = po.bob || 0, hd = po.head || [0, 0], hx = 15, sy = hy - 6 + ub;
    const LN = legPts(b, po.nl[0], po.nl[1]), LF = legPts(b, po.fl[0], po.fl[1]);
    const shf = y => Math.round(L * (hy - 3 - y) / 4);
    const ox = 13 + L + hd[0], oy = hy - 12 + ub + hd[1];
    const hideCape = !!(po.inFlip || po.inKick || (opts && opts.phi));
    const isAlien = !!(spec.species && spec.species !== 'human');

    if (isAlien) {
      const bBuild = spec.bodyBuild || (spec.mycoConfig && spec.mycoConfig.bodyBuild) || (spec.cathodeConfig && spec.cathodeConfig.bodyBuild) || (spec.cinderConfig && spec.cinderConfig.bodyBuild) || '';
      const isChubby = (spec.species === 'myco' || spec.species === 'cathode' || spec.species === 'cinder') && (bBuild === 'chubby' || bBuild === 'shortChubby' || bBuild === 'pistonHulk' || spec.mycoVariant === 'amberChanterelle' || spec.cathodeVariant === 'hexDomeHeavy' || spec.cinderVariant === 'calderaGolem');
      const isBroad = (spec.species === 'myco' || spec.species === 'cathode' || spec.species === 'cinder') && (bBuild === 'broad' || bBuild === 'pistonHulk' || spec.mycoVariant === 'violetMorel' || spec.cathodeVariant === 'triangleSentinel' || spec.cinderVariant === 'basaltHornLord');
      const AF = armPts(b, po.fa[0], po.fa[1]);
      const AN = armPts(b, po.na[0], po.na[1]);
      const farArmX = 14 + L;
      const nearArmX = 16 + L;
      const farLegX = 14;
      const nearLegX = isChubby ? 16 : 15;

      if (!noArms) drawArm2(g, AF, po.behindBack ? 15 + L : farArmX, sy, c.armF, sleeveThick(look, false, false), look.sleeve);
      if (!noArms && po.behindBack) drawArm2(g, AN, 15 + L, sy, c.armN, sleeveThick(look, true, false), look.sleeve);
      if (!suit && look.back && look.back !== 'none') drawBackSlot(g, spec, po, hy, ub, L, opts);
      drawLeg2(g, LF, farLegX, hy, c.legF, look.shoes);
      if (suit) drawPack(g, hy, ub, L, (opts && opts.flame) || 0);
      drawAlienTorso(g, spec, po, hy, ub, L, false, suit, opts);
      drawAlienHead(g, spec, po, ox, oy, false, opts);
      if (suit) drawHelmet(g, ox - 1, oy - 2, HELM7);
      drawLeg2(g, LN, nearLegX, hy, c.legN, look.shoes);
      // 侧面待机动作（如抱臂 cross、托腮 think、搭棚远眺 lookout、环抱 hug、伸懒腰 stretch）当远端手臂向胸前/面部前探时，在躯干前侧补绘远端前臂与手部细节，让侧面双臂层次清晰可见
      if (!noArms && !po.behindBack && (po.fa[0] > 28 || po.fa[1] > 35 || po.fa[1] < -25)) {
        const fdx = AF.wx - AF.ex, fdy = AF.wy - AF.ey, flen = Math.hypot(fdx, fdy) || 1;
        line(g, farArmX + 1 + AF.ex, sy + AF.ey, farArmX + 1 + AF.wx, sy + AF.wy, c.armF[1] || '#1c1817', 1);
        put(g, farArmX + 1 + AF.ex, sy + AF.ey, c.armF[4] || c.armF[3] || '#9c7d54');
        put(g, farArmX + 1 + AF.wx, sy + AF.wy, c.armF[2] || '#121216');
        put(g, farArmX + 1 + AF.wx + (fdx / flen) * 0.9, sy + AF.wy + (fdy / flen) * 0.9, c.armF[4] || c.armF[3] || '#9c7d54');
      }
      if (!noArms && !po.behindBack) {
        drawArm2(g, AN, nearArmX, sy, c.armN, sleeveThick(look, true, false), look.sleeve);
      }
      // 显像管族左胸指示灯 / 孢子傀儡伞檐发光孢子链 / 烬骸族熔炉之心与跳动火苗在近战与待机手臂摆动时保持发光可见
      if (spec.species === 'cathode') {
        const cv = resolveCathodeStyle(spec);
        const ledY = hy - 4 + ub;
        put(g, 15 + shf(ledY), ledY, cv.ledCol || '#9ac2d9');
      } else if (spec.species === 'myco') {
        const mv = resolveMycoStyle(spec);
        const mode = po && po.locoMode;
        const isMoving = !!((opts && opts.lagPreview) || mode === 'run' || mode === 'sprint' || mode === 'walk' || mode === 'cwalk');
        const frame = (po && po.locoFrame != null) ? po.locoFrame : 0;
        const lag1 = isMoving ? 1 : 0;
        const lag2 = isMoving ? (frame % 2 === 1 ? 2 : 1) : 0;
        const chainX = (mv.capType === 'wavyFunnel' || mv.capType === 'doubleTier') ? 9 : 8;
        put(g, ox + chainX, oy + 3, '#ffffff');
        put(g, ox + chainX - lag1, oy + 4, mv.sporeMid || '#e6fff2');
        put(g, ox + chainX - lag2, oy + 5, mv.sporeTip || '#b8ffd8');
      } else if (spec.species === 'cinder') {
        const iv = resolveCinderStyle(spec);
        const fCore = iv.flameCore || '#ffffff';
        const fHi = iv.flameHi || '#ffd23f';
        const fMid = iv.flameMid || '#ff7b29';
        const fLow = iv.flameLow || '#ff5a1f';
        const sMid = shf(hy - 4 + ub);
        if ((iv.coreMotif || 'vertSlit') === 'vertSlit') {
          put(g, 17 + sMid, hy - 5 + ub, fHi);
          put(g, 18 + sMid, hy - 5 + ub, fLow);
          put(g, 17 + sMid, hy - 4 + ub, fHi);
          put(g, 18 + sMid, hy - 4 + ub, fCore);
          put(g, 17 + sMid, hy - 3 + ub, fLow);
          put(g, 18 + sMid, hy - 3 + ub, fHi);
        }
        const flameJump = !!(
          (opts && opts.flameJump) ||
          (po && po.idleT != null ? Math.floor((po.idleT + 0.01) / 0.4) % 2 === 1 : po && po.bob < 0)
        );
        if (flameJump) {
          put(g, 15 + shf(hy - 6 + ub), hy - 6 + ub, fHi);
          put(g, 16 + shf(hy - 6 + ub), hy - 6 + ub, fMid);
        }
      }
      return;
    }

    const bibCol = c.bib || c.belt || c.pelvis || c.top;
    const hoodCol = c.hood || c.topSh || c.top;
    const coatCol = c.coat || c.top;
    const coatShCol = c.coatSh || c.topSh || coatCol;
    const collarCol = c.collar || c.belt || c.top;
    const trimCol = c.trim || c.belt || collarCol;

    if (!noArms) drawArm2(g, armPts(b, po.fa[0], po.fa[1]), 15 + L, sy, c.armF, sleeveThick(look, false, false), look.sleeve);
    if (!noArms && po.behindBack) drawArm2(g, armPts(b, po.na[0], po.na[1]), 14 + L, sy, c.armN, sleeveThick(look, true, false), look.sleeve);
    if (!suit && look.back && look.back !== 'none') drawBackSlot(g, spec, po, hy, ub, L, opts);
    drawLeg2(g, LF, hx, hy, c.legF, look.shoes);
    if (suit) drawPack(g, hy, ub, L, opts.flame || 0);
    if (o === 'labcoat' || o === 'haori') {           // 白大褂 / 炼金长风衣 / 浪人羽织：身后的下摆随风飘动
      const maxH = o === 'haori' ? 2 : 4;
      const fly = Math.round(clamp(((po.tail ? po.tail[0] : 30) - 10) / 25, 0, 2)) + (po.locoMode === 'run' || po.locoMode === 'sprint' ? 1 : 0);
      for (let y = hy - 2; y <= hy + maxH; y++) {
        const back = y >= hy ? fly : 0;
        for (let x = 13 - back + L; x <= 14 + L; x++) put(g, x, y, y === hy + maxH || x < 14 + L ? coatShCol : coatCol);
      }
    }
    if (look.hair === 'long' || look.hair === 'curls') {
      const t0 = po.tail ? po.tail[0] : 30;
      const maxR = look.hair === 'curls' ? 7 : 8;
      for (let r = 0; r < maxR; r++) {
        const wave = look.hair === 'curls' ? (r % 2 === 0 ? -1 : 0) : 0;
        const dx = Math.round(-Math.sin(rad(clamp(t0, -20, 70))) * r * 0.45) + wave, x0 = ox - 1 + dx;
        put(g, x0, oy + 2 + r, c.hair); put(g, x0 + 1, oy + 2 + r, r % 2 === 1 ? (c.hairHi || c.hair) : c.hair);
      }
    }
    for (let y = hy - 6 + ub; y <= hy - 3; y++) {
      const s = shf(y);
      let bk = c.topSh || c.top, fr = c.top;
      if (o === 'labcoat' || o === 'haori') { bk = coatCol; fr = c.top; }
      else if (o === 'overalls') { bk = c.top; fr = bibCol; }
      else if (o === 'armor') { bk = c.topSh || c.top; fr = y === hy - 5 + ub ? collarCol : c.top; }
      else if (o === 'poncho') { bk = c.topSh || c.top; fr = y === hy - 4 + ub ? trimCol : c.top; }
      if (y === hy - 6 + ub) {
        if (o === 'labcoat') { bk = coatCol; fr = coatCol; }
        else if (o === 'haori' || o === 'vest' || o === 'martial' || o === 'armor' || o === 'poncho') fr = collarCol;
        else if (o === 'hoodie') { fr = hoodCol; bk = hoodCol; }
        else if (o === 'overalls') bk = bibCol;
      }
      if (y === hy - 3 && c.belt) {
        if (o === 'poncho') { bk = trimCol; fr = trimCol; }
        else { bk = c.belt; fr = c.belt; }
      }
      put(g, 15 + s, y, bk); put(g, 16 + s, y, fr);
      if (o === 'poncho' && y <= hy - 4 + ub) put(g, 14 + s, y, y === hy - 4 + ub ? trimCol : (c.topSh || c.top));
    }
    if (!suit && look.back === 'cape' && !hideCape) {
      const sTop = shf(hy - 6 + ub);
      put(g, 15 + sTop, hy - 6 + ub, c.backHi || '#a33936');
    } else if (!suit && look.back === 'pack') {
      const sMid = shf(hy - 5 + ub);
      put(g, 15 + sMid, hy - 5 + ub, c.backSh || '#383d47');
    }
    for (let y = hy - 2; y <= hy - 1; y++) {
      const pCol = (o === 'martial' && y === hy - 2 && c.belt) ? c.belt : (o === 'armor' && y === hy - 2) ? (c.topSh || c.pelvis) : c.pelvis;
      put(g, 15, y, pCol); put(g, 16, y, pCol);
    }
    if (o === 'martial' && c.belt) put(g, 14, hy - 2, c.belt);
    if (o === 'armor') { put(g, 14, hy - 2, c.topSh || c.pelvis); put(g, 16, hy - 1, collarCol); }
    if (hd[1] <= 0) put(g, 16 + L, hy - 7 + ub, c.skinSh || c.skin);
    if (o === 'hoodie') { put(g, ox, oy + 5, hoodCol); put(g, ox + 1, oy + 5, hoodCol); put(g, ox, oy + 6, hoodCol); }
    if (suit) put(g, 16 + shf(hy - 5 + ub), hy - 5 + ub, SU.AC);
    if ((look.hair === 'ponytail' || look.hair === 'twintails' || look.hair === 'braid') && !suit && look.hat !== 'hood') {
      const a1 = rad(po.tail[0]), a2 = rad(po.tail[1]);
      const p0 = [ox + (look.hair === 'twintails' ? 0 : 1), oy + (look.hair === 'braid' ? 3 : 2)];
      const p1 = [p0[0] - 2 * Math.cos(a1), p0[1] + 2 * Math.sin(a1)];
      const p2 = [p1[0] - 2 * Math.cos(a2), p1[1] + 2 * Math.sin(a2)];
      line(g, p0[0], p0[1], p1[0], p1[1], c.hair, 1);
      line(g, p1[0], p1[1], p2[0], p2[1], look.hair === 'braid' ? (c.hairHi || c.hair) : c.hair, 1);
      put(g, p2[0], p2[1], c.hairEnd || c.hair);
    }
    drawHead(g, look, po, ox, oy);
    if (suit) drawHelmet(g, ox - 1, oy - 2, HELM7);
    drawLeg2(g, LN, hx, hy, c.legN, look.shoes);
    if (!noArms && !po.behindBack) {
      const AN = armPts(b, po.na[0], po.na[1]);
      if (look.prop === 'flask') {
        const hxp = 16 + L + AN.wx, hyp = sy + AN.wy, f = rad(po.na[1]);
        drawFlask(g, hxp, hyp, Math.sin(f), Math.cos(f), c);
      }
      drawArm2(g, AN, 16 + L, sy, c.armN, sleeveThick(look, true, false), look.sleeve);
    }
  }

  /* ---------- 45° 视角（待机用）----------
   * 身体微转向观众：肩 4 宽、躯干 2 宽、双臂分在两侧、两条腿并排；头 6 列，脸 2 列宽、露出一侧耳朵。
   * 姿势字段：na/fa = 画面左/右臂 [上臂角,前臂角]；nl/fl = 画面左/右腿；角度在画面平面内，向下为0，向画面右为正。 */
  function drawLeg34(g, L, hx, hy, cols, side, shoeStyle) {
    const ax = Math.round(hx + L.ax), ay = Math.round(hy + L.ay);
    const kx = Math.round(hx + L.kx), ky = Math.round(hy + L.ky);
    const x0 = side < 0 ? ax - 1 : ax;
    if (shoeStyle === 'cathodeMech') {
      line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0] || '#12141a', 1);
      put(g, hx + L.kx * 0.45, hy + L.ky * 0.45, cols[3] || '#2b3240');
      line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1] || '#12141a', 1);
      put(g, kx, ky, cols[4] || '#9aa4b8');
      put(g, x0, ay, cols[2] || '#12141a');
      put(g, x0 + 1, ay, cols[3] || '#2b3240');
      put(g, x0 + (side < 0 ? -1 : 2), ay, cols[4] || '#9aa4b8');
      return;
    }
    if (shoeStyle === 'mycoWrap') {
      line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0] || '#423632', 2);
      put(g, hx + L.kx * 0.5 + (side < 0 ? 0 : 1), hy + L.ky * 0.5, cols[3] || '#4d8f52');
      line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1] || '#121216', 1);
      put(g, kx, ky, cols[4] || '#e6cfa1');
      put(g, ax, ay - 1, cols[3] || '#4d8f52');
      const toeIdx = side < 0 ? 0 : 2;
      for (let i = 0; i < 3; i++) put(g, x0 + i, ay, i === toeIdx ? (cols[4] || '#e6cfa1') : (cols[2] || '#121216'));
      return;
    }
    if (shoeStyle === 'cinderEmber') {
      line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0] || '#141212', 2);
      line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1] || '#141212', 2);
      put(g, kx + 1, ky, cols[3] || '#2b1e1a');
      put(g, x0, ay, cols[2] || '#141212');
      put(g, x0 + 1, ay, cols[4] || '#e05319');
      put(g, x0 + 2, ay, cols[3] || '#2b1e1a');
      return;
    }
    line(g, hx, hy, hx + L.kx, hy + L.ky, cols[0], 2);
    line(g, hx + L.kx, hy + L.ky, hx + L.ax, hy + L.ay, cols[1], 2);
    if (cols[3]) { put(g, ax, ay - 1, cols[3]); put(g, ax + 1, ay - 1, cols[3]); }
    if (shoeStyle === 'combatBoots' && cols[3]) put(g, ax + (side < 0 ? 0 : 1), ay - 2, cols[3]);
    else if (shoeStyle === 'striderWraps' && cols[3]) put(g, ax + (side < 0 ? 1 : 0), ay - 2, cols[3]);
    else if (shoeStyle === 'ironGreaves') put(g, ax + (side < 0 ? 0 : 1), ay - 2, cols[4] || cols[3] || '#b8c2d4');
    const toeIdx = side < 0 ? 0 : 2;
    for (let i = 0; i < 3; i++) put(g, x0 + i, ay, (i === toeIdx && cols[4]) ? cols[4] : cols[2]);
  }
  function drawChar34(g, spec, po, hy, suit, opts) {
    const b = spec.build, look = spec.look, c = look.cols, o = look.outfit, noArms = !!(opts && opts.noArms);
    const ub = po.bob || 0, hd = po.head || [0, 0], ox = 12 + hd[0], oy = hy - 12 + ub + hd[1], sy = hy - 6 + ub;
    const LA = armPts(b, po.na[0], po.na[1]), RA = armPts(b, po.fa[0], po.fa[1]);
    const LL = legPts(b, po.nl[0], po.nl[1]), RL = legPts(b, po.fl[0], po.fl[1]);
    const t0 = po.tail ? po.tail[0] : 30;
    const hideCape = !!(po.inFlip || po.inKick);
    const isAlien = !!(spec.species && spec.species !== 'human');

    if (isAlien) {
      const bBuild = spec.bodyBuild || (spec.mycoConfig && spec.mycoConfig.bodyBuild) || (spec.cathodeConfig && spec.cathodeConfig.bodyBuild) || (spec.cinderConfig && spec.cinderConfig.bodyBuild) || '';
      const isChubby = (spec.species === 'myco' || spec.species === 'cathode' || spec.species === 'cinder') && (bBuild === 'chubby' || bBuild === 'shortChubby' || bBuild === 'pistonHulk' || spec.mycoVariant === 'amberChanterelle' || spec.cathodeVariant === 'hexDomeHeavy' || spec.cinderVariant === 'calderaGolem');
      const isBroad = (spec.species === 'myco' || spec.species === 'cathode' || spec.species === 'cinder') && (bBuild === 'broad' || bBuild === 'pistonHulk' || spec.mycoVariant === 'violetMorel' || spec.cathodeVariant === 'triangleSentinel' || spec.cinderVariant === 'basaltHornLord');
      const armLX = 14;
      const armRX = isChubby || isBroad ? 18 : 17;
      const legLX = 14;
      const legRX = isChubby ? 17 : 16;

      if (!suit && look.back && look.back !== 'none') drawBackSlot34(g, spec, po, hy, ub);
      if (!noArms) drawArm2(g, RA, po.behindBack ? 16 : armRX, sy, c.armF, sleeveThick(look, false, true), look.sleeve);
      if (!noArms && po.behindBack) drawArm2(g, LA, 15, sy, c.armN, sleeveThick(look, true, true), look.sleeve);
      if (suit) {
        if (opts && opts.flame > 0) drawFlame(g, [12, 13], hy, opts.flame);
        for (let y = hy - 6 + ub; y <= hy - 3; y++) { put(g, 12, y, SU.PK); put(g, 13, y, SU.SS); put(g, 14, y, SU.SS); }
        put(g, 12, hy - 5 + ub, SU.AC); put(g, 13, hy - 2, SU.NZ); put(g, 14, hy - 2, SU.NZ);
      }
      drawLeg34(g, RL, legRX, hy, c.legF, 1, look.shoes);
      drawLeg34(g, LL, legLX, hy, c.legN, -1, look.shoes);
      drawAlienTorso(g, spec, po, hy, ub, 0, true, suit, opts);
      drawAlienHead(g, spec, po, ox, oy, true, opts);
      if (suit) drawHelmet(g, ox - 1, oy - 2, HELM8);
      if (!noArms && !po.behindBack && (po.fa[1] < -20 || po.fa[1] > 150)) {
        drawArm2(g, RA, armRX, sy, c.armF, sleeveThick(look, false, true), look.sleeve);
      }
      if (!noArms && !po.behindBack) {
        drawArm2(g, LA, armLX, sy, c.armN, sleeveThick(look, true, true), look.sleeve);
      }
      if (spec.species === 'cathode') {
        const cv = resolveCathodeStyle(spec);
        put(g, 15, hy - 4 + ub, cv.ledCol || '#9ac2d9');
      } else if (spec.species === 'cinder') {
        const iv = resolveCinderStyle(spec);
        if ((iv.coreMotif || 'vertSlit') === 'vertSlit') {
          const fCore = iv.flameCore || '#ffffff';
          const fHi = iv.flameHi || '#ffd23f';
          const fLow = iv.flameLow || '#ff5a1f';
          put(g, 15, hy - 5 + ub, fHi);
          put(g, 16, hy - 5 + ub, fLow);
          put(g, 15, hy - 4 + ub, fHi);
          put(g, 16, hy - 4 + ub, fCore);
          put(g, 15, hy - 3 + ub, fLow);
          put(g, 16, hy - 3 + ub, fHi);
        }
      }
      return;
    }

    const bibCol = c.bib || c.belt || c.pelvis || c.top;
    const hoodCol = c.hood || c.topSh || c.top;
    const coatCol = c.coat || c.top;
    const coatShCol = c.coatSh || c.topSh || coatCol;
    const collarCol = c.collar || c.belt || c.top;
    const trimCol = c.trim || c.belt || collarCol;

    if (!suit && look.back && look.back !== 'none') drawBackSlot34(g, spec, po, hy, ub);
    // 后层：右臂(远)、若背手负立则左臂也置于躯干后方、实验服下摆、长发
    if (!noArms) drawArm2(g, RA, 17, sy, c.armF, sleeveThick(look, false, true), look.sleeve);
    if (!noArms && po.behindBack) drawArm2(g, LA, 14, sy, c.armN, sleeveThick(look, true, true), look.sleeve);
    if (look.hair === 'long' || look.hair === 'curls') {
      const maxR = look.hair === 'curls' ? 7 : 8;
      for (let r = 0; r < maxR; r++) {
        const wave = look.hair === 'curls' ? (r % 2 === 0 ? -1 : 0) : 0;
        const dx = Math.round(-Math.sin(rad(clamp(t0 - 20, -10, 40))) * r * 0.35) + wave, x0 = ox + dx;
        put(g, x0, oy + 2 + r, c.hair); put(g, x0 + 1, oy + 2 + r, r % 2 === 1 ? (c.hairHi || c.hair) : c.hair);
      }
    }
    if (suit) {                                     // 背包在躯干后面，喷口在腰后
      if (opts.flame > 0) drawFlame(g, [12, 13], hy, opts.flame);
      for (let y = hy - 6 + ub; y <= hy - 3; y++) { put(g, 12, y, SU.PK); put(g, 13, y, SU.SS); put(g, 14, y, SU.SS); }
      put(g, 12, hy - 5 + ub, SU.AC); put(g, 13, hy - 2, SU.NZ); put(g, 14, hy - 2, SU.NZ);
    }
    drawLeg34(g, RL, 16, hy, c.legF, 1, look.shoes);
    drawLeg34(g, LL, 14, hy, c.legN, -1, look.shoes);
    // 躯干
    for (let y = hy - 6 + ub; y <= hy - 3; y++) {
      let bk = c.topSh || c.top, fr = c.top;
      if (o === 'overalls') { bk = c.top; fr = bibCol; }
      else if (o === 'armor') { bk = c.topSh || c.top; fr = y === hy - 5 + ub ? collarCol : c.top; }
      else if (o === 'poncho') { bk = c.topSh || c.top; fr = y === hy - 4 + ub ? trimCol : c.top; }
      const top = y === hy - 6 + ub;
      if (o === 'labcoat' || o === 'haori') {
        bk = c.top; fr = c.top; if (y === hy - 3 && c.belt) { bk = c.belt; fr = c.belt; }
        put(g, 14, y, top ? collarCol : coatShCol); put(g, 17, y, coatCol); put(g, 15, y, top ? collarCol : bk); put(g, 16, y, top ? c.top : fr);
        continue;
      }
      if (top) {
        if (o === 'vest' || o === 'martial' || o === 'armor' || o === 'poncho') fr = collarCol;
        else if (o === 'hoodie') { fr = hoodCol; bk = hoodCol; }
        else if (o === 'overalls') bk = bibCol;
      }
      if (y === hy - 3 && c.belt) {
        if (o === 'poncho') { bk = trimCol; fr = trimCol; }
        else { bk = c.belt; fr = c.belt; }
      }
      if (top) { put(g, 14, y, bk); put(g, 15, y, fr); put(g, 16, y, fr); put(g, 17, y, bk); }
      else {
        put(g, 15, y, bk); put(g, 16, y, fr);
        if (o === 'poncho' && y <= hy - 4 + ub) {
          put(g, 14, y, y === hy - 4 + ub ? trimCol : (c.topSh || c.top));
          put(g, 17, y, y === hy - 4 + ub ? trimCol : c.top);
        }
      }
    }
    if (!suit && look.back === 'cape' && !hideCape) {
      put(g, 14, hy - 6 + ub, c.backHi || '#a33936');
    }
    if (o === 'labcoat' || o === 'haori') {          // 白大褂 / 炼金长风衣 / 羽织：两侧垂下衣摆
      const maxH = o === 'haori' ? 2 : 5;
      const sway = Math.round(clamp((t0 - 20) / 30, 0, 1));
      for (let y = hy - 2; y <= hy; y++) { put(g, 14, y, c.pelvis); put(g, 15, y, c.pelvis); put(g, 16, y, c.pelvis); }
      for (let y = hy - 2; y <= hy + maxH; y++) {
        const k = y - (hy - 2), wl = k >= 4 ? 2 : 1;
        put(g, 14, y, coatShCol); if (wl > 1) put(g, 13, y, coatShCol);
        put(g, 17, y, coatCol); if (wl > 1) put(g, 18, y, coatCol);
        if (y === hy + 5) { put(g, 12 - sway, y, coatShCol); put(g, 19 + sway, y, coatCol); }
      }
    } else for (let y = hy - 2; y <= hy; y++) {
      const pCol = (o === 'martial' && y === hy - 2 && c.belt) ? c.belt : (o === 'armor' && y === hy - 2) ? (c.topSh || c.pelvis) : c.pelvis;
      put(g, 14, y, pCol); put(g, 15, y, pCol); put(g, 16, y, pCol);
      if (o === 'armor' && y === hy - 2) { put(g, 14, y, c.topSh || c.pelvis); put(g, 17, y, c.top || c.pelvis); }
    }
    if (hd[1] <= 0) { put(g, 15, hy - 7 + ub, c.skinSh || c.skin); if (o === 'hoodie') { put(g, 14, hy - 7 + ub, hoodCol); put(g, 16, hy - 7 + ub, hoodCol); } }
    if (suit) put(g, 16, hy - 4 + ub, SU.AC);
    if ((look.hair === 'ponytail' || look.hair === 'twintails' || look.hair === 'braid') && !suit && look.hat !== 'hood') {
      const a1 = rad(po.tail[0]), a2 = rad(po.tail[1]);
      const p0 = [ox, oy + (look.hair === 'braid' ? 3 : 2)], p1 = [p0[0] - 2 * Math.cos(a1), p0[1] + 2 * Math.sin(a1)], p2 = [p1[0] - 2 * Math.cos(a2), p1[1] + 2 * Math.sin(a2)];
      line(g, p0[0], p0[1], p1[0], p1[1], c.hair, 1); line(g, p1[0], p1[1], p2[0], p2[1], look.hair === 'braid' ? (c.hairHi || c.hair) : c.hair, 1); put(g, p2[0], p2[1], c.hairEnd || c.hair);
      if (look.hair === 'twintails') {
        const q0 = [ox + 5, oy + 2], q1 = [q0[0] + Math.round(1.6 * Math.cos(a1)), q0[1] + 2 * Math.sin(a1)], q2 = [q1[0] + Math.round(1.6 * Math.cos(a2)), q1[1] + 2 * Math.sin(a2)];
        line(g, q0[0], q0[1], q1[0], q1[1], c.hair, 1); line(g, q1[0], q1[1], q2[0], q2[1], c.hair, 1); put(g, q2[0], q2[1], c.hairEnd || c.hair);
      }
    }
    drawHead34(g, look, po, ox, oy);
    if (suit) drawHelmet(g, ox - 1, oy - 2, HELM8);
    if (o === 'hoodie') { put(g, ox + 1, oy + 5, hoodCol); put(g, ox + 4, oy + 5, hoodCol); }
    // 若角色处于抱臂(cross)、托腮(think)、叉腰(hips)、环抱(hug)、插兜(pockets)、敬礼(salute)、远眺(lookout)等右前臂内折于胸前/下巴/腰际的 45° 待机，补绘右前臂与右手在躯干前方，避免手部被衣服遮吞
    if (!noArms && !po.behindBack && (po.fa[1] < -20 || po.fa[1] > 150)) {
      line(g, 17 + RA.ex, sy + RA.ey, 17 + RA.wx, sy + RA.wy, c.armF[1], 1);
      if (c.armF[3] && (look.sleeve === 'long' || look.sleeve === 'cuffed' || look.sleeve === 'sleeveless')) {
        put(g, 17 + RA.ex + (RA.wx - RA.ex) * 0.62, sy + RA.ey + (RA.wy - RA.ey) * 0.62, c.armF[3]);
      }
      put(g, 17 + RA.wx, sy + RA.wy, c.armF[2]);
    }
    // 前层：左臂(近)，可能拿烧瓶（背手负立时已在后层绘制）
    if (!noArms && !po.behindBack) {
      if (look.prop === 'flask') { const f = rad(po.na[1]); drawFlask(g, 14 + LA.wx, sy + LA.wy, Math.sin(f), Math.cos(f), c); }
      drawArm2(g, LA, 14, sy, c.armN, sleeveThick(look, true, true), look.sleeve);
    }
  }

  /* ---------- 星界边境风格：独立 360° 手臂骨骼、武器攻击模组与全身连招系统 ---------- */
  const WEAPONS = {
    pistol: {
      id: 'pistol',
      name: '脉冲手枪',
      archetype: 'pistol',
      type: 'ranged',
      grip: '2h',
      clip: 6,
      shootDur: 0.18,
      reloadDur: 0.68,
    },
    blade: {
      id: 'blade',
      name: '铁质长剑',
      archetype: 'sword',
      type: 'melee',
      grip: 'hybrid', // 1段单手屈肘横斩，2-3段与剑气技能双手握持发力
      clip: 0,
      comboCount: 3,
      comboDurs: [0.42, 0.44, 0.54],
      skillDur: 0.76,
      comboNames: ['一段·踏步横斩', '二段·斜撩上挑', '三段·举顶下劈'],
      skillName: '秘技·蓄力剑气',
    },
    katana: {
      id: 'katana',
      name: '铁质长刀',
      archetype: 'katana',
      type: 'melee',
      grip: '2h',
      clip: 0,
      comboCount: 4,
      comboDurs: [0.38, 0.24, 0.24, 0.52],
      skillDur: 0.88,
      comboNames: ['一段·拔刀向前横扫(3D扁月牙)', '二段·极速二连·斜上挑', '三段·极速二连·斜下劈', '四段·大上段重下劈'],
      skillName: '秘技·鞘口聚粒星爆·半周三连环斩',
    },
    greatsword: {
      id: 'greatsword',
      name: '铁质大剑',
      archetype: 'greatsword',
      type: 'melee',
      grip: '2h',
      clip: 0,
      comboCount: 2,
      comboDurs: [0.62, 0.72],
      skillDur: 0.86,
      comboNames: ['一段·肩扛卸力·拖地狂风上撩斩', '二段·狮子奋迅·过肩蓄力崩地重砸'],
      skillName: '秘技·霸体沉肩·裂地重击斩',
    },
    // 武器模组元数据（剑、长刀、大剑、枪、戟、盾）
    MODULES: {
      sword: { id: 'sword', name: '剑模组 (单/双手)', comboCount: 3, lmb: '三连击：踏步横斩 → 斜撩上挑 → 举顶下劈', rmb: '蓄力剑气斩' },
      katana: { id: 'katana', name: '长刀模组 (横扫+极速二连+大上段)', comboCount: 4, lmb: '四连击：拔刀向前横扫(3D扁月牙) → 极速斜上挑 → 极速斜下劈 → 大上段重下劈', rmb: '鞘口吸引粒子·星爆·独立图层半周三连环斩' },
      greatsword: { id: 'greatsword', name: '大剑模组 (肩扛巨刃·二段重武)', comboCount: 2, lmb: '二连重击：肩扛拖地狂风上撩 → 狮子奋迅过肩崩地重砸', rmb: '霸体沉肩·裂地重击斩' },
      spear: { id: 'spear', name: '枪模组 (双手长柄)', comboCount: 3, lmb: '中平连刺 → 挑杀', rmb: '龙牙突进' },
      halberd: { id: 'halberd', name: '戟模组 (双手重武)', comboCount: 3, lmb: '横扫千军 → 裂地劈', rmb: '霸王回旋震' },
      shield: { id: 'shield', name: '盾模组 (单手防反)', comboCount: 3, lmb: '盾击连打', rmb: '举盾格挡反击' },
    }
  };

  /* 统一近战上半身专属 8 帧步进库 (SWORD_ACT_KF / KATANA_ACT_KF / GREATSWORD_ACT_KF)：
   * 角度换算说明：内部 gunAng 以垂直向下为 0°、正前方水平为 90°、头顶正上方为 180°；
   * 若以正前方水平为 0°（向下为正、向上/向后为负，即 userAng = 90° - gunAng），则：
   * - 头顶偏后 (-110°) 对应 gunAng = 200°；
   * - 身前下方 (+60°)  对应 gunAng = 30°；
   * - 头顶上方 (-80°)  对应 gunAng = 170°；
   * - 正前方水平 (0°)  对应 gunAng = 90°；
   * - 背后深拉 (-150°) 对应 gunAng = 240°；
   * - 正前方地面 (+85°) 对应 gunAng = 5°；
   * - 头顶正上方 (-90°) 对应 gunAng = 180°。 */
  const SWORD_ACT_KF = {
    // 一段·向前横斩 (0.42s · 基础8帧)：屈肘深拉于背后(-118°) → 爆发 >200° 环腰大弧向前水平横斩(88°→94°) → 沉肘归位
    combo1: [
      { p: 0.00, nl: [-8, -20],  fl: [20, -14],  lean: 0,  bob: 0, head: [0, 0],  tail: [32, 58], na: [-52, -100], fa: [24, 70],   gunAng: -110, bladeScale: 1.0, trailFrom: null, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.14, nl: [-14, -24], fl: [24, -16],  lean: -1, bob: 0, head: [-1, 0], tail: [36, 64], na: [-60, -108], fa: [28, 74],   gunAng: -118, bladeScale: 1.0, trailFrom: null, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.28, nl: [20, -20],  fl: [-18, -22], lean: 1,  bob: 0, head: [1, 0],  tail: [24, 46], na: [34, 82],    fa: [-14, 34],  gunAng: 88,   bladeScale: 1.0, trailFrom: -118, shoulderDx: 1, shoulderDy: 0 },
      { p: 0.42, nl: [36, -22],  fl: [-28, -26], lean: 1,  bob: 0, head: [1, 0],  tail: [18, 34], na: [46, 90],    fa: [-22, 26],  gunAng: 90,   bladeScale: 1.0, trailFrom: -110, shoulderDx: 1, shoulderDy: 0 },
      { p: 0.56, nl: [40, -24],  fl: [-32, -28], lean: 1,  bob: 0, head: [1, 0],  tail: [14, 28], na: [50, 94],    fa: [-26, 22],  gunAng: 94,   bladeScale: 1.0, trailFrom: -92,  shoulderDx: 1, shoulderDy: 0 },
      { p: 0.70, nl: [34, -22],  fl: [-26, -26], lean: 1,  bob: 0, head: [1, 0],  tail: [18, 36], na: [38, 84],    fa: [-18, 26],  gunAng: 88,   bladeScale: 1.0, trailFrom: -54,  shoulderDx: 1, shoulderDy: 0 },
      { p: 0.84, nl: [26, -20],  fl: [-20, -22], lean: 0,  bob: 0, head: [0, 0],  tail: [24, 44], na: [24, 70],    fa: [-12, 30],  gunAng: 80,   bladeScale: 1.0, trailFrom: null, shoulderDx: 0, shoulderDy: 0 },
      { p: 1.00, nl: [18, -18],  fl: [-14, -20], lean: 0,  bob: 0, head: [0, 0],  tail: [28, 50], na: [14, 58],    fa: [-6, 34],   gunAng: 72,   bladeScale: 1.0, trailFrom: null, shoulderDx: 0, shoulderDy: 0 },
    ],
    // 二段·斜撩上挑 (0.44s · 基础8帧)：屈肘深压于身后下方(-76°) → 爆发 >200° 大弧斜撩越过头顶至脑后(204°) → 高位长弧收势
    combo2: [
      { p: 0.00, nl: [28, -30],  fl: [-18, -30], lean: 0,  bob: 0, head: [0, 1],  tail: [28, 52], na: [-26, -74],  fa: [-18, -64], gunAng: -68,  bladeScale: 1.0, trailFrom: null, twoHand: true, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.14, nl: [32, -34],  fl: [-22, -34], lean: 1,  bob: 1, head: [1, 1],  tail: [30, 56], na: [-32, -82],  fa: [-24, -72], gunAng: -76,  bladeScale: 1.0, trailFrom: null, twoHand: true, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.28, nl: [30, -24],  fl: [-24, -26], lean: 1,  bob: 0, head: [1, 0],  tail: [34, 60], na: [44, 100],   fa: [32, 86],   gunAng: 108,  bladeScale: 1.0, trailFrom: -76,  twoHand: true, shoulderDx: 1, shoulderDy: 0 },
      { p: 0.42, nl: [24, -14],  fl: [-28, -20], lean: 0,  bob: 0, head: [0, -1], tail: [40, 68], na: [112, 168],  fa: [98, 154],  gunAng: 186,  bladeScale: 1.0, trailFrom: -38,  twoHand: true, shoulderDx: 1, shoulderDy: -1 },
      { p: 0.56, nl: [20, -10],  fl: [-30, -16], lean: -1, bob: 0, head: [0, -1], tail: [44, 74], na: [134, 190],  fa: [120, 176], gunAng: 204,  bladeScale: 1.0, trailFrom: 12,   twoHand: true, shoulderDx: 0, shoulderDy: -1 },
      { p: 0.70, nl: [22, -12],  fl: [-26, -18], lean: -1, bob: 0, head: [0, -1], tail: [42, 70], na: [124, 180],  fa: [110, 166], gunAng: 194,  bladeScale: 1.0, trailFrom: 68,   twoHand: true, shoulderDx: 0, shoulderDy: -1 },
      { p: 0.84, nl: [24, -16],  fl: [-22, -20], lean: 0,  bob: 0, head: [0, 0],  tail: [36, 62], na: [98, 154],   fa: [84, 140],  gunAng: 164,  bladeScale: 1.0, trailFrom: null, twoHand: true, shoulderDx: 0, shoulderDy: 0 },
      { p: 1.00, nl: [26, -20],  fl: [-18, -22], lean: 0,  bob: 0, head: [0, 0],  tail: [32, 58], na: [78, 134],   fa: [64, 120],  gunAng: 144,  bladeScale: 1.0, trailFrom: null, twoHand: true, shoulderDx: 0, shoulderDy: 0 },
    ],
    // 三段·举顶下劈 (0.54s · 基础8帧)：双手举剑过顶并向后仰 36°(gunAng=216°) → 沿头顶至地面拉出 198° 满月长拖尾重劈(18°) → 震地收势
    combo3: [
      { p: 0.00, nl: [28, -22],  fl: [-20, -24], lean: 0,  bob: 0, head: [0, -1], tail: [36, 62], na: [124, 180],  fa: [112, 168], gunAng: 192,  bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 1, shoulderDx: 0, shoulderDy: -1 },
      { p: 0.14, nl: [32, -28],  fl: [-22, -28], lean: -1, bob: 0, head: [-1, -1],tail: [42, 70], na: [136, 192],  fa: [124, 180], gunAng: 210,  bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 1, shoulderDx: 0, shoulderDy: -1 },
      { p: 0.28, nl: [34, -32],  fl: [-24, -30], lean: -1, bob: 0, head: [-1, -1],tail: [46, 76], na: [144, 200],  fa: [132, 188], gunAng: 216,  bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 2, shoulderDx: 0, shoulderDy: -1 },
      { p: 0.42, nl: [36, -26],  fl: [-28, -26], lean: 1,  bob: 0, head: [1, 0],  tail: [26, 48], na: [42, 98],    fa: [28, 84],   gunAng: 86,   bladeScale: 1.0, trailFrom: 216,  twoHand: true, chargeLv: 2, shoulderDx: 1, shoulderDy: 0 },
      { p: 0.56, nl: [42, -30],  fl: [-34, -30], lean: 1,  bob: 1, head: [1, 1],  tail: [16, 30], na: [2, 48],     fa: [-6, 38],   gunAng: 20,   bladeScale: 1.0, trailFrom: 216,  twoHand: true, chargeLv: 2, shoulderDx: 1, shoulderDy: 0, slamBurst: 0.9 },
      { p: 0.70, nl: [44, -32],  fl: [-36, -32], lean: 1,  bob: 1, head: [1, 1],  tail: [14, 26], na: [0, 46],     fa: [-8, 36],   gunAng: 18,   bladeScale: 1.0, trailFrom: 204,  twoHand: true, chargeLv: 2, shoulderDx: 1, shoulderDy: 0, slamBurst: 1.0 },
      { p: 0.84, nl: [38, -28],  fl: [-30, -28], lean: 1,  bob: 0, head: [1, 0],  tail: [18, 34], na: [6, 52],     fa: [-4, 42],   gunAng: 32,   bladeScale: 1.0, trailFrom: 96,   twoHand: true, chargeLv: 1, shoulderDx: 1, shoulderDy: 0, slamBurst: 0.4 },
      { p: 1.00, nl: [28, -22],  fl: [-20, -24], lean: 0,  bob: 0, head: [0, 0],  tail: [24, 46], na: [14, 62],    fa: [4, 50],    gunAng: 62,   bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 0, shoulderDx: 0, shoulderDy: 0 },
    ],
    // 右键秘技·蓄力剑气 (0.76s · 基础8帧)：屈肘深收于腰后蓄力(-76°) → 爆发 >190° 大幅挥斩释放冷铁剑气波(116°→158°) → 稳姿收剑
    skill: [
      { p: 0.00, nl: [24, -24],  fl: [-18, -20], lean: 0,  bob: 0, head: [1, 0],  tail: [34, 60], na: [-18, -62],  fa: [-10, -52], gunAng: -56,  bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 1, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.14, nl: [28, -28],  fl: [-22, -22], lean: -1, bob: 0, head: [1, 0],  tail: [38, 66], na: [-22, -68],  fa: [-14, -58], gunAng: -64,  bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 1, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.28, nl: [30, -30],  fl: [-24, -24], lean: -1, bob: 1, head: [1, 0],  tail: [42, 70], na: [-26, -74],  fa: [-18, -64], gunAng: -72,  bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 2, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.42, nl: [32, -32],  fl: [-26, -26], lean: -1, bob: 1, head: [1, 0],  tail: [44, 74], na: [-28, -76],  fa: [-20, -66], gunAng: -76,  bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 2, shoulderDx: 0, shoulderDy: 0 },
      { p: 0.56, nl: [38, -24],  fl: [-30, -26], lean: 1,  bob: 0, head: [1, 0],  tail: [20, 38], na: [48, 106],   fa: [34, 92],   gunAng: 116,  bladeScale: 1.0, trailFrom: -76,  twoHand: true, chargeLv: 2, shoulderDx: 1, shoulderDy: 0 },
      { p: 0.70, nl: [42, -26],  fl: [-34, -28], lean: 1,  bob: 0, head: [1, 0],  tail: [14, 28], na: [88, 146],   fa: [74, 132],  gunAng: 158,  bladeScale: 1.0, trailFrom: -44,  twoHand: true, chargeLv: 2, shoulderDx: 1, shoulderDy: -1 },
      { p: 0.84, nl: [34, -22],  fl: [-26, -24], lean: 1,  bob: 0, head: [1, 0],  tail: [20, 38], na: [62, 120],   fa: [48, 106],  gunAng: 132,  bladeScale: 1.0, trailFrom: 48,   twoHand: true, chargeLv: 1, shoulderDx: 1, shoulderDy: 0 },
      { p: 1.00, nl: [24, -20],  fl: [-18, -22], lean: 0,  bob: 0, head: [0, 0],  tail: [26, 48], na: [16, 66],    fa: [4, 52],    gunAng: 72,   bladeScale: 1.0, trailFrom: null, twoHand: true, chargeLv: 0, shoulderDx: 0, shoulderDy: 0 },
    ],
  };
  SWORD_ACT_KF.combo4 = SWORD_ACT_KF.combo3;
  SWORD_ACT_KF.swing = SWORD_ACT_KF.combo1;

  /* 1. 超长铁质太刀 (Katana) —— 严格遵循「前摇武器摆放 → 下一帧直接到劈砍完位置+满刀光拖尾 → 再下一帧武器位置保持不变+刀光收回一半」三拍打击节奏：
   * - 第1段 (combo1 · 0.38s)：拔刀向前横扫斩 —— 从腰间刀鞘口直接拔刀向前水平横扫，彻底消除第一刀突兀出现在头顶的问题；刀光呈 3D 透视下的扁平月牙状 (katanaHoriz3D)，距刀越远越细并带毛边与动态模糊；
   * - 第2段 (combo2 · 0.24s) & 第3段 (combo3 · 0.24s)：极速上下二连斩 —— 加快播放速度 (0.24s/段)，承接横扫收势顺畅打出「反手极速斜上挑 + 正手极速斜下劈」疾风二连斩；
   * - 第4段 (combo4 · 0.52s)：大上段重下劈 —— 双手高举过顶蓄势（大上段 Dai-Jodan），随后瞬间重劈至身前低位，武器定格不动、3D 垂天刀光收回一半后纳刀入鞘；
   * - 右键秘技 (skill · 0.88s)：刀鞘口吸引周围粒子汇聚 → 爆发成璀璨小白星 → 在独立特效图层（不随人物移动）打出序列帧快速环绕半周身的 3 道 3D 弧形刀光后消散！ */
  const KATANA_ACT_KF = {
    // 第1段：拔刀向前横扫斩（直接采用右键三连斩中间那道 3D 椭圆半周横月牙剑气，绝不贴在刀杆上）
    // F0-F1: 前摇武器摆放（腰际握柄拔刀引刃 gunAng=-68°）→ F2-F3: 直接到横扫完斜前上方收刀位置 (gunAng=126°) + 3D 扁月牙满刀光 → F4-F5: 武器位置保持不变 (gunAng=126°, na=[58,108], fa=[-38,-74]) + 刀光收回一半 → F6-F7: 衔接二连斩
    combo1: [
      { p: 0.00, nl: [34, -20],  fl: [-30, -38], lean: 1,  bob: 1, head: [1, 0],  tail: [32, 58], na: [-18, 42],   fa: [-42, 38],   gunAng: -68, edgeDir: 1,  sheathed: true,  trailFrom: null, slashRetract: 0,    slashType: null,            twoHand: false, shoulderDx: 0, shoulderDy: 0, martialStance: true },
      { p: 0.14, nl: [38, -22],  fl: [-34, -42], lean: 1,  bob: 1, head: [1, 0],  tail: [36, 64], na: [-26, 28],   fa: [-42, 38],   gunAng: -68, edgeDir: 1,  sheathed: false, trailFrom: null, slashRetract: 0,    slashType: null,            twoHand: false, shoulderDx: 0, shoulderDy: 0, martialStance: true },
      { p: 0.28, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],  tail: [20, 36], na: [58, 108],   fa: [-38, -74],  gunAng: 126, edgeDir: 1,  sheathed: false, trailFrom: -58,  slashRetract: 0.0,  slashType: 'katanaHoriz3D', twoHand: false, shoulderDx: 1, shoulderDy: 0, martialStance: true },
      { p: 0.42, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],  tail: [18, 34], na: [58, 108],   fa: [-38, -74],  gunAng: 126, edgeDir: 1,  sheathed: false, trailFrom: -58,  slashRetract: 0.08, slashType: 'katanaHoriz3D', twoHand: false, shoulderDx: 1, shoulderDy: 0, martialStance: true },
      { p: 0.56, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],  tail: [18, 34], na: [58, 108],   fa: [-38, -74],  gunAng: 126, edgeDir: 1,  sheathed: false, trailFrom: 34,   slashRetract: 0.50, slashType: 'katanaHoriz3D', twoHand: false, shoulderDx: 1, shoulderDy: 0, martialStance: true },
      { p: 0.70, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],  tail: [20, 36], na: [58, 108],   fa: [-38, -74],  gunAng: 126, edgeDir: 1,  sheathed: false, trailFrom: 80,   slashRetract: 0.78, slashType: 'katanaHoriz3D', twoHand: false, shoulderDx: 1, shoulderDy: 0, martialStance: true },
      { p: 0.84, nl: [40, -22],  fl: [-36, -44], lean: 1,  bob: 1, head: [1, 0],  tail: [24, 44], na: [26, 62],    fa: [-46, -80],  gunAng: 62,  edgeDir: 1,  sheathed: false, trailFrom: null, slashRetract: 0,    slashType: null,            twoHand: false, shoulderDx: 1, shoulderDy: 0, martialStance: true },
      { p: 1.00, nl: [36, -22],  fl: [-32, -40], lean: 1,  bob: 1, head: [1, 1],  tail: [28, 50], na: [12, 42],    fa: [-44, -78],  gunAng: 40,  edgeDir: 1,  sheathed: false, trailFrom: null, slashRetract: 0,    slashType: null,            twoHand: false, shoulderDx: 1, shoulderDy: 1, martialStance: true },
    ],
    // 第2段：极速上下二连斩其一 · 反手极速斜上挑 (0.24s 高速帧)
    // F0-F1: 前摇武器摆放 (身前低位 gunAng=36°) → F2-F3: 直接到挑斩完高空位置 (gunAng=164°) + 满刀光 → F4-F5: 武器位置保持不变 (gunAng=164°, na=[116,156], fa=[-78,-112]) + 刀光收回一半 → F6-F7: 高空衔接下劈
    combo2: [
      { p: 0.00, nl: [36, -22],  fl: [-32, -40], lean: 1,  bob: 1, head: [1, 1],   tail: [28, 50], na: [12, 42],    fa: [-44, -78],  gunAng: 40,  edgeDir: 1,  trailFrom: null, slashRetract: 0,    slashType: null,           twoHand: false, shoulderDx: 1,  shoulderDy: 1,  martialStance: true },
      { p: 0.14, nl: [38, -24],  fl: [-34, -42], lean: 2,  bob: 1, head: [1, 1],   tail: [30, 54], na: [8, 38],     fa: [-44, -78],  gunAng: 36,  edgeDir: 1,  trailFrom: null, slashRetract: 0,    slashType: null,           twoHand: false, shoulderDx: 1,  shoulderDy: 1,  martialStance: true },
      { p: 0.28, nl: [44, -24],  fl: [-42, -50], lean: 1,  bob: 0, head: [1, -1],  tail: [38, 66], na: [116, 156],  fa: [-78, -112], gunAng: 164, edgeDir: 1,  trailFrom: 36,   slashRetract: 0.0,  slashType: 'katanaFastUp', twoHand: false, shoulderDx: 1,  shoulderDy: -1, martialStance: true },
      { p: 0.42, nl: [44, -24],  fl: [-42, -50], lean: 1,  bob: 0, head: [1, -1],  tail: [40, 68], na: [116, 156],  fa: [-78, -112], gunAng: 164, edgeDir: 1,  trailFrom: 36,   slashRetract: 0.08, slashType: 'katanaFastUp', twoHand: false, shoulderDx: 1,  shoulderDy: -1, martialStance: true },
      { p: 0.56, nl: [44, -24],  fl: [-42, -50], lean: 1,  bob: 0, head: [1, -1],  tail: [42, 70], na: [116, 156],  fa: [-78, -112], gunAng: 164, edgeDir: 1,  trailFrom: 100,  slashRetract: 0.50, slashType: 'katanaFastUp', twoHand: false, shoulderDx: 1,  shoulderDy: -1, martialStance: true },
      { p: 0.70, nl: [44, -24],  fl: [-42, -50], lean: 1,  bob: 0, head: [1, -1],  tail: [40, 68], na: [116, 156],  fa: [-78, -112], gunAng: 164, edgeDir: 1,  trailFrom: 132,  slashRetract: 0.78, slashType: 'katanaFastUp', twoHand: false, shoulderDx: 1,  shoulderDy: -1, martialStance: true },
      { p: 0.84, nl: [40, -22],  fl: [-36, -44], lean: 0,  bob: 0, head: [0, -1],  tail: [36, 60], na: [128, 174],  fa: [24, 68],    gunAng: 184, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,           twoHand: true,  shoulderDx: 0,  shoulderDy: -1, martialStance: true },
      { p: 1.00, nl: [38, -20],  fl: [-34, -42], lean: 0,  bob: 0, head: [0, -1],  tail: [34, 58], na: [136, 186],  fa: [118, 168],  gunAng: 200, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,           twoHand: true,  shoulderDx: 0,  shoulderDy: -1, martialStance: true },
    ],
    // 第3段：极速上下二连斩其二 · 正手极速斜下劈 (0.24s 高速帧 · 上弯弧)
    // F0-F1: 前摇武器摆放 (承接上挑高位 gunAng=204°) → F2-F3: 直接到斜劈完位置 (gunAng=66°) + 满刀光 → F4-F5: 武器位置保持不变 (gunAng=66°, na=[32,70], fa=[-46,-82]) + 刀光收回一半 → F6-F7: 提刀蓄势衔接大上段
    combo3: [
      { p: 0.00, nl: [38, -20],  fl: [-34, -42], lean: 0,  bob: 0, head: [0, -1],  tail: [34, 58], na: [136, 186],  fa: [118, 168],  gunAng: 200, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true,  shoulderDx: 0,  shoulderDy: -1, martialStance: true },
      { p: 0.14, nl: [40, -22],  fl: [-36, -44], lean: 1,  bob: 0, head: [0, -1],  tail: [38, 64], na: [140, 190],  fa: [122, 172],  gunAng: 204, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true,  shoulderDx: 0,  shoulderDy: -1, martialStance: true },
      { p: 0.28, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],   tail: [20, 36], na: [32, 70],    fa: [-46, -82],  gunAng: 66,  edgeDir: -1, trailFrom: 204,  slashRetract: 0.0,  slashType: 'katanaFastDown', twoHand: false, shoulderDx: 1,  shoulderDy: 0,  martialStance: true },
      { p: 0.42, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],   tail: [18, 34], na: [32, 70],    fa: [-46, -82],  gunAng: 66,  edgeDir: -1, trailFrom: 204,  slashRetract: 0.08, slashType: 'katanaFastDown', twoHand: false, shoulderDx: 1,  shoulderDy: 0,  martialStance: true },
      { p: 0.56, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],   tail: [18, 34], na: [32, 70],    fa: [-46, -82],  gunAng: 66,  edgeDir: -1, trailFrom: 135,  slashRetract: 0.50, slashType: 'katanaFastDown', twoHand: false, shoulderDx: 1,  shoulderDy: 0,  martialStance: true },
      { p: 0.70, nl: [46, -24],  fl: [-44, -52], lean: 2,  bob: 1, head: [1, 0],   tail: [20, 36], na: [32, 70],    fa: [-46, -82],  gunAng: 66,  edgeDir: -1, trailFrom: 100,  slashRetract: 0.78, slashType: 'katanaFastDown', twoHand: false, shoulderDx: 1,  shoulderDy: 0,  martialStance: true },
      { p: 0.84, nl: [36, -20],  fl: [-32, -40], lean: 0,  bob: 0, head: [0, -1],  tail: [30, 52], na: [118, 168],  fa: [102, 152],  gunAng: 176, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true,  shoulderDx: 0,  shoulderDy: -1, martialStance: true },
      { p: 1.00, nl: [32, -18],  fl: [-28, -36], lean: -1, bob: 0, head: [-1, -1], tail: [36, 62], na: [138, 190],  fa: [122, 174],  gunAng: 216, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true,  shoulderDx: -1, shoulderDy: -1, martialStance: true },
    ],
    // 第4段：终结技 · 大上段重下劈 (0.52s 播放总时长不变，前摇慢出刀蓄势 4 帧，凸显大上段沉稳气势)
    // F0-F3 (p=0.00..0.42): 4帧慢速大上段双手举刀过顶前摇蓄力 (gunAng=214°->222°->228°->232°) → F4 (p=0.56): 直接到深弓步重劈终点位置 (gunAng=50°) + 满刀光 → F5 (p=0.70): 武器位置保持不变 (gunAng=50°, na=[20,52], fa=[8,40]) + 刀光收回一半 → F6 (p=0.84): 余光渐隐 → F7 (p=1.00): 纳刀归鞘
    combo4: [
      { p: 0.00, nl: [32, -18],  fl: [-28, -36], lean: -1, bob: 0, head: [-1, -1], tail: [36, 62], na: [138, 190],  fa: [122, 174],  gunAng: 214, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true, chargeLv: 1, crouchStance: false, shoulderDx: -1, shoulderDy: -1, martialStance: true },
      { p: 0.14, nl: [33, -19],  fl: [-30, -38], lean: -1, bob: 0, head: [-1, -1], tail: [40, 68], na: [144, 196],  fa: [128, 180],  gunAng: 222, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true, chargeLv: 1, crouchStance: false, shoulderDx: -1, shoulderDy: -1, martialStance: true },
      { p: 0.28, nl: [34, -20],  fl: [-32, -40], lean: -1, bob: 0, head: [-1, -1], tail: [44, 72], na: [148, 200],  fa: [132, 184],  gunAng: 228, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true, chargeLv: 2, crouchStance: false, shoulderDx: -1, shoulderDy: -1, martialStance: true },
      { p: 0.42, nl: [35, -20],  fl: [-34, -42], lean: -1, bob: 0, head: [-1, -1], tail: [46, 76], na: [150, 202],  fa: [134, 186],  gunAng: 232, edgeDir: -1, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true, chargeLv: 2, crouchStance: false, shoulderDx: -1, shoulderDy: -1, martialStance: true },
      { p: 0.56, nl: [50, -26],  fl: [-48, -58], lean: 2,  bob: 2, head: [1, 1],   tail: [20, 36], na: [20, 52],    fa: [8, 40],     gunAng: 50,  edgeDir: -1, trailFrom: 232,  slashRetract: 0.0,  slashType: 'katanaDaiJodan', twoHand: true, chargeLv: 2, crouchStance: true,  shoulderDx: 1,  shoulderDy: 1,  martialStance: true },
      { p: 0.70, nl: [50, -26],  fl: [-48, -58], lean: 2,  bob: 2, head: [1, 1],   tail: [16, 30], na: [20, 52],    fa: [8, 40],     gunAng: 50,  edgeDir: -1, trailFrom: 141,  slashRetract: 0.50, slashType: 'katanaDaiJodan', twoHand: true, chargeLv: 2, crouchStance: true,  shoulderDx: 1,  shoulderDy: 1,  martialStance: true },
      { p: 0.84, nl: [50, -26],  fl: [-48, -58], lean: 2,  bob: 2, head: [1, 1],   tail: [18, 34], na: [20, 52],    fa: [8, 40],     gunAng: 50,  edgeDir: -1, trailFrom: 95,   slashRetract: 0.80, slashType: 'katanaDaiJodan', twoHand: true, chargeLv: 1, crouchStance: true,  shoulderDx: 1,  shoulderDy: 1,  martialStance: true },
      { p: 1.00, nl: [24, -20],  fl: [-18, -24], lean: 0,  bob: 0, head: [0, 0],   tail: [28, 50], na: [-18, 42],   fa: [-42, 38],   gunAng: 78,  edgeDir: 1,  trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: false, chargeLv: 0, sheathed: true, crouchStance: false, shoulderDx: 0, shoulderDy: 0, martialStance: false },
    ],
    // 右键秘技·鞘口聚粒星爆 + 独立图层序列帧环绕半周3连刀光 (0.88s · 8帧)：
    // F0-F2 (p=0.00..0.28): 刀在鞘中握把蓄力，刀鞘口吸引周围寒铁粒子向鞘口螺旋汇聚 (sheathSuction = 1..3)；
    // F3 (p=0.42): 聚集的粒子在刀鞘口猛然爆发成一颗璀璨八芒小星 (sheathStar = 3)，同时激发独立特效图层 (detachedFX) 开始第1道环身刀光；
    // F4-F6 (p=0.56..0.84): 独立特效图层不随人物移动，按序列帧快速环绕半周身打出 3 道交错 3D 弧形刀光 (orbitFXPhase = 0.42 -> 0.68 -> 0.90) 并依次收拢消散；
    // F7 (p=1.00): 归位叉腰握柄待机。
    skill: [
      { p: 0.00, nl: [26, -22],  fl: [-22, -28], lean: 1,  bob: 0, head: [1, 0],   tail: [32, 58], na: [-18, 42],   fa: [-8, 46],    gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: true, chargeLv: 1, sheathed: true, sheathSuction: 1, sheathStar: 0, orbitFXPhase: -1,   crouchStance: false, shoulderDx: 0, shoulderDy: 0, martialStance: true },
      { p: 0.14, nl: [30, -26],  fl: [-26, -34], lean: 1,  bob: 1, head: [1, 1],   tail: [36, 64], na: [-20, 40],   fa: [-8, 46],    gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: true, chargeLv: 1, sheathed: true, sheathSuction: 2, sheathStar: 0, orbitFXPhase: -1,   crouchStance: false, shoulderDx: 0, shoulderDy: 1, martialStance: true },
      { p: 0.28, nl: [34, -30],  fl: [-30, -38], lean: 2,  bob: 1, head: [1, 1],   tail: [40, 70], na: [-22, 38],   fa: [-10, 46],   gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: true, chargeLv: 2, sheathed: true, sheathSuction: 3, sheathStar: 1, orbitFXPhase: -1,   crouchStance: true,  shoulderDx: 0, shoulderDy: 1, martialStance: true },
      { p: 0.42, nl: [36, -32],  fl: [-32, -42], lean: 2,  bob: 1, head: [1, 1],   tail: [44, 76], na: [-22, 38],   fa: [-10, 46],   gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: true, chargeLv: 2, sheathed: true, sheathSuction: 0, sheathStar: 3, orbitFXPhase: 0.16, crouchStance: true,  shoulderDx: 0, shoulderDy: 1, martialStance: true },
      { p: 0.56, nl: [38, -32],  fl: [-34, -44], lean: 2,  bob: 1, head: [1, 1],   tail: [48, 80], na: [-22, 38],   fa: [-10, 46],   gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: true, chargeLv: 2, sheathed: true, sheathSuction: 0, sheathStar: 2, orbitFXPhase: 0.44, crouchStance: true,  shoulderDx: 1, shoulderDy: 1, martialStance: true },
      { p: 0.70, nl: [38, -32],  fl: [-34, -44], lean: 2,  bob: 1, head: [1, 1],   tail: [44, 74], na: [-22, 38],   fa: [-10, 46],   gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: true, chargeLv: 2, sheathed: true, sheathSuction: 0, sheathStar: 1, orbitFXPhase: 0.70, crouchStance: true,  shoulderDx: 1, shoulderDy: 1, martialStance: true },
      { p: 0.84, nl: [34, -28],  fl: [-28, -36], lean: 1,  bob: 1, head: [1, 0],   tail: [38, 66], na: [-20, 40],   fa: [-8, 46],    gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: true, chargeLv: 1, sheathed: true, sheathSuction: 0, sheathStar: 0, orbitFXPhase: 0.90, crouchStance: false, shoulderDx: 0, shoulderDy: 1, martialStance: true },
      { p: 1.00, nl: [24, -20],  fl: [-18, -24], lean: 0,  bob: 0, head: [0, 0],   tail: [30, 54], na: [-18, 42],   fa: [-42, 38],   gunAng: 90,  edgeDir: -1, trailFrom: null, slashType: null, twoHand: false, chargeLv: 0, sheathed: true, sheathSuction: 0, sheathStar: 0, orbitFXPhase: -1,   crouchStance: false, shoulderDx: 0, shoulderDy: 0, martialStance: false },
    ],
  };
  KATANA_ACT_KF.swing = KATANA_ACT_KF.combo1;

  /* 2. 超巨型铁质大剑 (Greatsword) —— 2段势大力沉重武连击 + 右键裂地重击斩 (严格遵循「3帧沉重前摇摆放 → 下一帧直接到劈砍完位置+3D满刀光拖尾 → 再下一帧武器位置保持不变+刀光收回一半」)：
   * - 待机与移动状态：无论 45° 待机还是侧面行走/奔跑/跳跃，巨剑始终沉稳扛在角色肩上 (gunAng = -132° / -126°)；
   * - 第1段 (combo1 · 0.62s)：肩扛卸力·拖地狂风上撩巨弧斩 —— 从肩扛姿势沉身卸力将巨剑垂落于身后地面 (-24°)，随后全身发力沿 3D 斜面向上掀出 176° 狂风巨弧上撩 (gunAng = 152°)，刀光遵循距刀越远越细+毛边+动态模糊+内侧锯齿；下一帧巨剑定格在 152° 不动、刀光收回一半；
   * - 第2段 (combo2 · 0.72s)：狮子奋迅·过肩蓄力崩地重砸 —— 承接上撩高位将巨剑深拉至脑后过肩极限 (246°)，蓄满3帧后猛然跃步俯身将 21.5px 超宽巨刃砸入身前地面 (gunAng = 6°)，拉出 240° 垂天厚重 3D 崩地刀光与碎石激波；下一帧巨剑死死嵌在地面不动、刀光收回一半，最后单手提柄重新扛回肩上！
   * - 右键秘技 (skill · 0.86s)：霸体沉肩·裂地重击斩 —— 沉肩霸体聚力3帧后，向前下方轰出 3D 宽幅斜裂重斩 (gunAng = 74°)，刀光定格收半并震碎前方地面！ */
  const GREATSWORD_ACT_KF = {
    // 第1段：肩扛卸力·拖地狂风上撩巨弧斩 (0.62s · 8帧)
    // F0-F2 (p=0.00..0.28): 3帧沉重前摇，从肩扛卸力沉身将巨剑拖至身后地面 (-120° -> -56° -> -24°)
    // F3-F4 (p=0.42..0.56): 直接到狂风上撩终点位置 (gunAng=152°) + 3D 巨型上撩满刀光 (slashRetract=0.0)
    // F5 (p=0.70): 武器与手臂位置保持 100% 不变 (gunAng=152°, na=[104,158], fa=[90,144]) + 刀光收回一半 (slashRetract=0.50)
    // F6-F7 (p=0.84..1.00): 余光消散并顺势架回肩后准备衔接二段或归位肩扛
    combo1: [
      { p: 0.00, nl: [24, -18],  fl: [-18, -22], lean: 0,  bob: 0, head: [0, 0],   tail: [32, 58], na: [-18, 52],   fa: [-10, 42],  gunAng: -116, trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: true, chargeLv: 1, crouchStance: false, martialStance: true, shoulderDx: 0,  shoulderDy: 0 },
      { p: 0.14, nl: [32, -24],  fl: [-24, -30], lean: 1,  bob: 1, head: [1, 1],   tail: [26, 48], na: [-32, -74],  fa: [-20, -60], gunAng: -56,  trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: true, chargeLv: 1, crouchStance: false, martialStance: true, shoulderDx: 0,  shoulderDy: 1 },
      { p: 0.28, nl: [38, -30],  fl: [-30, -38], lean: 2,  bob: 2, head: [1, 1],   tail: [22, 42], na: [-12, -52],  fa: [-4, -42],  gunAng: -24,  trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: true, chargeLv: 2, crouchStance: true,  martialStance: true, shoulderDx: 1,  shoulderDy: 1 },
      { p: 0.42, nl: [42, -20],  fl: [-38, -44], lean: -2, bob: 0, head: [0, -1],  tail: [42, 72], na: [104, 158],  fa: [90, 144],  gunAng: 152,  trailFrom: -24,  slashRetract: 0.0,  slashType: 'gsColossalUp3D',   twoHand: true, chargeLv: 2, crouchStance: false, martialStance: true, shoulderDx: 1,  shoulderDy: -1 },
      { p: 0.56, nl: [42, -20],  fl: [-38, -44], lean: -2, bob: 0, head: [0, -1],  tail: [44, 74], na: [104, 158],  fa: [90, 144],  gunAng: 152,  trailFrom: -24,  slashRetract: 0.08, slashType: 'gsColossalUp3D',   twoHand: true, chargeLv: 2, crouchStance: false, martialStance: true, shoulderDx: 1,  shoulderDy: -1 },
      { p: 0.70, nl: [42, -20],  fl: [-38, -44], lean: -2, bob: 0, head: [0, -1],  tail: [42, 72], na: [104, 158],  fa: [90, 144],  gunAng: 152,  trailFrom: 64,   slashRetract: 0.50, slashType: 'gsColossalUp3D',   twoHand: true, chargeLv: 1, crouchStance: false, martialStance: true, shoulderDx: 1,  shoulderDy: -1 },
      { p: 0.84, nl: [34, -18],  fl: [-28, -34], lean: -1, bob: 0, head: [0, -1],  tail: [38, 66], na: [104, 158],  fa: [90, 144],  gunAng: 152,  trailFrom: 108,  slashRetract: 0.82, slashType: 'gsColossalUp3D',   twoHand: true, chargeLv: 0, crouchStance: false, martialStance: true, shoulderDx: 0,  shoulderDy: -1 },
      { p: 1.00, nl: [22, -16],  fl: [-18, -22], lean: -1, bob: 0, head: [0, 0],   tail: [34, 60], na: [132, 188],  fa: [118, 174], gunAng: 224,  trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: true, chargeLv: 0, crouchStance: false, martialStance: false, shoulderDx: 0, shoulderDy: 0 },
    ],
    // 第2段：狮子奋迅·过肩蓄力崩地重砸 (0.72s · 8帧)
    // F0-F2 (p=0.00..0.28): 3帧过肩满蓄前摇，双手将巨剑拉至脑后极限 (226° -> 238° -> 246°, lean=-2)
    // F3-F4 (p=0.42..0.56): 瞬间跃步沉身将巨剑砸入身前地面 (gunAng=6°) + 240° 3D 崩地满刀光 (slashRetract=0.0)
    // F5 (p=0.70): 巨剑死死嵌在地面保持 100% 不动 (gunAng=6°, na=[54,14], fa=[42,6]) + 刀光收回一半 (slashRetract=0.50)
    // F6-F7 (p=0.84..1.00): 拔剑起身，重新将巨剑扛回肩上 (-132°)
    combo2: [
      { p: 0.00, nl: [-10, -22], fl: [22, -16],  lean: -1, bob: 0, head: [-1, -1], tail: [38, 66], na: [138, 194],  fa: [124, 180], gunAng: 226,  trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: true, chargeLv: 1, crouchStance: false, martialStance: true, shoulderDx: -1, shoulderDy: -1 },
      { p: 0.14, nl: [-14, -24], fl: [26, -18],  lean: -2, bob: 0, head: [-1, -1], tail: [42, 72], na: [148, 204],  fa: [134, 190], gunAng: 238,  trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: true, chargeLv: 2, crouchStance: false, martialStance: true, shoulderDx: -1, shoulderDy: -1 },
      { p: 0.28, nl: [-18, -28], fl: [30, -20],  lean: -2, bob: 0, head: [-1, -1], tail: [46, 78], na: [154, 210],  fa: [140, 196], gunAng: 246,  trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: true, chargeLv: 2, crouchStance: false, martialStance: true, shoulderDx: -1, shoulderDy: -1 },
      { p: 0.42, nl: [48, -28],  fl: [-44, -52], lean: 2,  bob: 2, head: [1, 1],   tail: [16, 28], na: [54, 14],    fa: [42, 6],    gunAng: 6,    trailFrom: 246,  slashRetract: 0.0,  slashType: 'gsEarthShatter3D', twoHand: true, chargeLv: 2, crouchStance: true,  martialStance: true, shoulderDx: 1,  shoulderDy: 1, slamBurst: 1.0 },
      { p: 0.56, nl: [48, -28],  fl: [-44, -52], lean: 2,  bob: 2, head: [1, 1],   tail: [14, 26], na: [54, 14],    fa: [42, 6],    gunAng: 6,    trailFrom: 246,  slashRetract: 0.08, slashType: 'gsEarthShatter3D', twoHand: true, chargeLv: 2, crouchStance: true,  martialStance: true, shoulderDx: 1,  shoulderDy: 1, slamBurst: 0.85 },
      { p: 0.70, nl: [48, -28],  fl: [-44, -52], lean: 2,  bob: 2, head: [1, 1],   tail: [16, 30], na: [54, 14],    fa: [42, 6],    gunAng: 6,    trailFrom: 126,  slashRetract: 0.50, slashType: 'gsEarthShatter3D', twoHand: true, chargeLv: 1, crouchStance: true,  martialStance: true, shoulderDx: 1,  shoulderDy: 1, slamBurst: 0.45 },
      { p: 0.84, nl: [36, -24],  fl: [-28, -34], lean: 1,  bob: 1, head: [1, 0],   tail: [22, 40], na: [54, 14],    fa: [42, 6],    gunAng: 6,    trailFrom: 66,   slashRetract: 0.82, slashType: 'gsEarthShatter3D', twoHand: true, chargeLv: 0, crouchStance: false, martialStance: true, shoulderDx: 1,  shoulderDy: 0, slamBurst: 0.2 },
      { p: 1.00, nl: [20, -16],  fl: [-16, -20], lean: 0,  bob: 0, head: [0, 0],   tail: [28, 50], na: [36, 142],   fa: [-38, 36],  gunAng: -130, trailFrom: null, slashRetract: 0,    slashType: null,               twoHand: false, chargeLv: 0, crouchStance: false, martialStance: false, shoulderDx: 0, shoulderDy: 0, shoulderCarry: true },
    ],
    // 右键秘技：霸体沉肩·裂地重击斩 (0.86s · 8帧)
    // F0-F2 (p=0.00..0.28): 沉肩霸体压步蓄力 (-136° -> -148° -> -158°)
    // F3-F4 (p=0.42..0.56): 向前下方轰出 3D 宽幅斜裂巨弧重斩 (gunAng=74°) + 满刀光 (slashRetract=0.0)
    // F5 (p=0.70): 巨剑位置保持不变 (gunAng=74°, na=[40,86], fa=[26,72]) + 刀光收回一半 (slashRetract=0.50)
    // F6-F7 (p=0.84..1.00): 余光消散并重新扛回肩上 (-132°)
    skill: [
      { p: 0.00, nl: [28, -22],  fl: [-22, -26], lean: -1, bob: 0, head: [0, 0],   tail: [34, 60], na: [-42, -90],  fa: [16, 62],   gunAng: -136, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true, chargeLv: 1, crouchStance: false, martialStance: true, shoulderDx: -1, shoulderDy: 0 },
      { p: 0.14, nl: [32, -26],  fl: [-26, -32], lean: -1, bob: 1, head: [-1, 0],  tail: [38, 66], na: [-54, -102], fa: [20, 68],   gunAng: -148, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true, chargeLv: 2, crouchStance: true,  martialStance: true, shoulderDx: -1, shoulderDy: 1 },
      { p: 0.28, nl: [36, -30],  fl: [-30, -38], lean: -2, bob: 1, head: [-1, 1],  tail: [42, 72], na: [-62, -110], fa: [24, 72],   gunAng: -158, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: true, chargeLv: 2, crouchStance: true,  martialStance: true, shoulderDx: -1, shoulderDy: 1 },
      { p: 0.42, nl: [46, -26],  fl: [-42, -50], lean: 2,  bob: 1, head: [1, 0],   tail: [18, 32], na: [40, 86],    fa: [26, 72],   gunAng: 74,   trailFrom: -158, slashRetract: 0.0,  slashType: 'gsTectonic3D',   twoHand: true, chargeLv: 2, crouchStance: true,  martialStance: true, shoulderDx: 1,  shoulderDy: 0, slamBurst: 0.9 },
      { p: 0.56, nl: [46, -26],  fl: [-42, -50], lean: 2,  bob: 1, head: [1, 0],   tail: [16, 28], na: [40, 86],    fa: [26, 72],   gunAng: 74,   trailFrom: -158, slashRetract: 0.08, slashType: 'gsTectonic3D',   twoHand: true, chargeLv: 2, crouchStance: true,  martialStance: true, shoulderDx: 1,  shoulderDy: 0, slamBurst: 0.6 },
      { p: 0.70, nl: [46, -26],  fl: [-42, -50], lean: 2,  bob: 1, head: [1, 0],   tail: [18, 32], na: [40, 86],    fa: [26, 72],   gunAng: 74,   trailFrom: -42,  slashRetract: 0.50, slashType: 'gsTectonic3D',   twoHand: true, chargeLv: 1, crouchStance: true,  martialStance: true, shoulderDx: 1,  shoulderDy: 0 },
      { p: 0.84, nl: [34, -22],  fl: [-26, -32], lean: 1,  bob: 0, head: [0, 0],   tail: [24, 44], na: [40, 86],    fa: [26, 72],   gunAng: 74,   trailFrom: 16,   slashRetract: 0.82, slashType: 'gsTectonic3D',   twoHand: true, chargeLv: 0, crouchStance: false, martialStance: true, shoulderDx: 0,  shoulderDy: 0 },
      { p: 1.00, nl: [20, -18],  fl: [-16, -20], lean: 0,  bob: 0, head: [0, 0],   tail: [28, 50], na: [36, 142],   fa: [-38, 36],  gunAng: -130, trailFrom: null, slashRetract: 0,    slashType: null,             twoHand: false, chargeLv: 0, crouchStance: false, martialStance: false, shoulderDx: 0, shoulderDy: 0, shoulderCarry: true },
    ],
  };
  GREATSWORD_ACT_KF.combo3 = GREATSWORD_ACT_KF.combo2;
  GREATSWORD_ACT_KF.combo4 = GREATSWORD_ACT_KF.combo2;
  GREATSWORD_ACT_KF.swing = GREATSWORD_ACT_KF.combo1;

  function getMeleeKFTable(wId) {
    if (wId === 'katana') return KATANA_ACT_KF;
    if (wId === 'greatsword') return GREATSWORD_ACT_KF;
    return SWORD_ACT_KF;
  }

  /* 严格按 8 帧离散步进采样（不插值过渡），保证近战挥砍与全身像素步态帧率风格完全统一 */
  function sampleSwordKF(act, p, wId) {
    const tbl = getMeleeKFTable(wId);
    const list = tbl[act] || SWORD_ACT_KF[act];
    if (!list) return null;
    const u = clamp(p || 0, 0, 0.9999);
    const idx = clamp(Math.floor(u * list.length), 0, list.length - 1);
    const k = list[idx];
    return {
      frameIdx: idx,
      nl: [k.nl[0], k.nl[1]],
      fl: [k.fl[0], k.fl[1]],
      lean: k.lean || 0,
      bob: k.bob || 0,
      head: k.head ? [k.head[0], k.head[1]] : [0, 0],
      tail: [k.tail[0], k.tail[1]],
      na: [k.na[0], k.na[1]],
      fa: [k.fa[0], k.fa[1]],
      gunAng: k.gunAng,
      edgeDir: k.edgeDir != null ? k.edgeDir : -1,
      userAng: 90 - k.gunAng,
      bladeScale: 1.0,
      trailFrom: k.trailFrom != null ? k.trailFrom : null,
      slashRetract: k.slashRetract || 0,
      slashType: k.slashType || null,
      twoHand: !!k.twoHand,
      chargeLv: k.chargeLv || 0,
      sheathed: !!k.sheathed,
      sheathSuction: k.sheathSuction || 0,
      sheathStar: k.sheathStar || 0,
      orbitFXPhase: k.orbitFXPhase != null ? k.orbitFXPhase : -1,
      crouchStance: !!k.crouchStance,
      martialStance: !!k.martialStance,
      hopY: 0,
      shoulderDx: k.shoulderDx || 0,
      shoulderDy: k.shoulderDy || 0,
      slamBurst: k.slamBurst || 0,
      spinFlip: false,
      spinRing: 0,
    };
  }

  /* 近战连招与技能骨骼联动：
   * - 普通长剑默认仅驱动上半身骨骼，下肢保留走/跑/跳/站立；
   * - 超长太刀 (katana) 在行走/奔跑/跳跃等非出招状态 (act === 'aim' || act === 'idle') 下，始终保持刀收入腰间长鞘，一只手抓握腰间刀把，绝不拔出乱晃；
   * - 超巨型大剑 (greatsword) 在待机与行走/奔跑/跳跃等非出招状态 (act === 'aim' || act === 'idle') 下，始终保持将巨剑沉稳扛在肩上 (na = [22, 116], gunAng = -132°)；
   * - 太刀与大剑在角色原地出招时，自动联动全身大跨步弓步/压步 (martialStance / crouchStance)；移动/空中出刀则自动保留跑跳下肢，绝不滑步！ */
  function computeMeleeBodyPose(basePo, w) {
    const wid = w && w.id;
    const isMelee = wid === 'blade' || wid === 'sword' || wid === 'katana' || wid === 'greatsword';
    if (!w || !isMelee) return { po: basePo, spinFlip: false, hopY: 0 };
    const act = w.action || 'aim', p = clamp(w.p || 0, 0, 1);
    if (wid === 'katana' && (act === 'aim' || act === 'idle')) {
      if (basePo && basePo.v34) {
        return { po: basePo, spinFlip: false, hopY: 0 };
      }
      // 侧面移动/行走/奔跑/跳跃时：刀收入鞘，近侧手稳握腰前刀把 (na = [-18, 42])，远侧手随步态自然摆臂或叉腰
      const hasLoco = !!(basePo && (basePo.locoMode || basePo.isAir));
      const outSheathed = Object.assign({}, basePo, {
        na: [-18, 42],
        fa: hasLoco && basePo.fa ? basePo.fa : [-42, 38],
      });
      return { po: outSheathed, spinFlip: false, hopY: 0 };
    }
    if (wid === 'greatsword' && (act === 'aim' || act === 'idle')) {
      if (basePo && basePo.v34) {
        return { po: basePo, spinFlip: false, hopY: 0 };
      }
      // 侧面移动/行走/奔跑/跳跃时：巨剑始终沉稳扛在肩上，近侧手屈肘高抬至锁骨肩前稳握巨剑长柄 (na = [36, 142])，远侧手随步态自然摆臂或叉腰
      const hasLoco = !!(basePo && (basePo.locoMode || basePo.isAir));
      const outShoulderCarry = Object.assign({}, basePo, {
        na: [36, 142],
        fa: hasLoco && basePo.fa ? basePo.fa : [-38, 36],
      });
      return { po: outShoulderCarry, spinFlip: false, hopY: 0 };
    }
    const kf = sampleSwordKF(act, p, wid);
    if (!kf) return { po: basePo, spinFlip: false, hopY: 0 };
    const aim = (w && w.aim != null) ? w.aim : 90;
    const aimRot = basePo && basePo.v34 ? 0 : (aim - 90);
    const maxLean = (wid === 'katana' || wid === 'greatsword') ? 2 : 1;
    const isStandingStill = basePo && !basePo.locoMode && basePo.airV == null && !basePo.inFlip && !basePo.inKick;
    const useMartialLegs = !!(isStandingStill && (kf.crouchStance || ((wid === 'katana' || wid === 'greatsword') && kf.martialStance)));
    const out = Object.assign({}, basePo, {
      nl: useMartialLegs ? kf.nl : basePo.nl,
      fl: useMartialLegs ? kf.fl : basePo.fl,
      lean: clamp(kf.lean || 0, -maxLean, maxLean),
      bob: kf.bob || 0,
      head: kf.head,
      na: [kf.na[0] + aimRot, kf.na[1] + aimRot],
      fa: [kf.fa[0] + aimRot, kf.fa[1] + aimRot],
      tail: kf.tail,
      shoulderDx: kf.shoulderDx,
      shoulderDy: kf.shoulderDy,
    });
    return { po: out, spinFlip: false, hopY: 0 };
  }

  function computeWeaponPose(w) {
    const id = (w && w.id) || 'pistol', aim = (w && w.aim != null) ? w.aim : 90, act = (w && w.action) || 'aim', p = clamp((w && w.p) || 0, 0, 1);
    const v34 = !!(w && w.v34);
    const aimRot = v34 ? 0 : (aim - 90);
    let na = [aim - 6, aim], fa = [aim - 14, aim + 8], gunAng = aim;
    let slideBack = 0, flash = 0, casing = -1, magDrop = 0, handMag = false, magLockGlow = false, rackGlint = false;
    let slashArc = -1, slashType = null, slashRetract = 0, bladeScale = 1, twoHand = false, chargeLv = 0, spinPhase = 0, idleGlint = -1, trailFrom = null, spinRing = 0, slamBurst = 0, shoulderDx = 0, shoulderDy = 0, sheathed = false, shoulderCarry = false, sheathSuction = 0, sheathStar = 0, orbitFXPhase = -1, crouchStance = false, martialStance = false, lean = 0, bob = 0, edgeDir = -1;

    const isMeleeId = id === 'blade' || id === 'sword' || id === 'katana' || id === 'greatsword';
    if (isMeleeId || act === 'swing' || act.startsWith('combo') || act === 'skill') {
      const mId = (id === 'katana' || id === 'greatsword') ? id : 'blade';
      const kfTable = getMeleeKFTable(mId);
      if (mId === 'katana' && (act === 'idle' || act === 'aim')) {
        // 长刀在 45° 待机与侧面行走/奔跑/移动 (act === 'aim' || act === 'idle') 时：
        // 始终保持刀收入腰间长刀鞘里 (sheathed = true)，一只手抓着腰前刀把，绝不在走路时拔出刀拿在手上！
        na = v34 ? [-42, 44] : [-18, 42];
        fa = v34 ? [26, -10] : [-42, 38];
        gunAng = 118;
        sheathed = true;
        idleGlint = p;
      } else if (mId === 'greatsword' && (act === 'idle' || act === 'aim')) {
        // 大剑在 45° 待机与侧面行走/奔跑/移动 (act === 'aim' || act === 'idle') 时：
        // 始终保持将超宽巨剑扛在肩上 (shoulderCarry = true, gunAng = -126° / -130°)，手抬至肩前锁骨处握柄，走路时也是稳稳扛在肩上！
        na = v34 ? [32, 146] : [36, 142];
        fa = v34 ? [24, -12] : [-38, 36];
        gunAng = v34 ? -126 : -130;
        shoulderCarry = true;
        idleGlint = p;
      } else if (act === 'idle' || (v34 && act === 'aim')) {
        // 45° 刚体待机姿态：角度与手腕关节完全锁定（不发生逐帧角度形变），整把武器随上身呼吸(po.bob)做整像素刚体平移
        na = [-10, 46];
        fa = [18, 10];
        gunAng = 124;
        idleGlint = p;
      } else if (kfTable[act] || SWORD_ACT_KF[act]) {
        const kf = sampleSwordKF(act, p, mId);
        // 剥离后的双臂与近战武器在肩膀支点处随鼠标瞄准方向 (aimRot = aim - 90°) 整体旋转
        na = [kf.na[0] + aimRot, kf.na[1] + aimRot];
        fa = [kf.fa[0] + aimRot, kf.fa[1] + aimRot];
        gunAng = kf.gunAng + aimRot;
        edgeDir = kf.edgeDir != null ? kf.edgeDir : -1;
        lean = kf.lean || 0;
        bob = kf.bob || 0;
        bladeScale = 1.0;
        twoHand = kf.twoHand;
        chargeLv = kf.chargeLv;
        sheathed = !!kf.sheathed;
        sheathSuction = kf.sheathSuction || 0;
        sheathStar = kf.sheathStar || 0;
        orbitFXPhase = kf.orbitFXPhase != null ? kf.orbitFXPhase : -1;
        slashRetract = kf.slashRetract || 0;
        crouchStance = !!kf.crouchStance;
        martialStance = !!kf.martialStance;
        slamBurst = kf.slamBurst || 0;
        shoulderDx = kf.shoulderDx || 0;
        shoulderDy = kf.shoulderDy || 0;
        if (kf.trailFrom != null) {
          trailFrom = kf.trailFrom + aimRot;
          slashArc = p;
          if (kf.slashType) {
            slashType = kf.slashType;
          } else {
            slashType =
              act === 'combo1' || act === 'swing'
                ? 'horiz'
                : act === 'combo2'
                ? 'diagUp'
                : act === 'combo3' || act === 'combo4'
                ? 'heavySlam'
                : 'skillWave';
          }
        }
      } else {
        // 侧面持武瞄准/移动姿态（长剑）：手臂与武器以肩膀为支点随鼠标 360° 旋转
        na = [-12 + aimRot, 48 + aimRot];
        fa = [18 + aimRot, 68 + aimRot];
        gunAng = 114 + aimRot;
      }
      const userAng = 90 - (gunAng - aimRot);
      return { id: mId, aim, aimRot, act, p, na, fa, gunAng, edgeDir, userAng, lean, bob, slideBack, flash, casing, magDrop, handMag, magLockGlow, rackGlint, slashArc, slashType, slashStyle: slashType, slashRetract, bladeScale, twoHand, chargeLv, spinPhase, idleGlint, trailFrom, spinRing, slamBurst, shoulderDx, shoulderDy, sheathed, shoulderCarry, sheathSuction, sheathStar, orbitFXPhase, crouchStance, martialStance };
    }

    if (act === 'idle' || (v34 && act === 'aim')) {
      // 脉冲手枪 · 45° 刚体待机姿态：枪身角度与双臂关节固定，整把枪随人物上身呼吸(po.bob)做整像素刚体上下平移
      na = [-4, 68];
      fa = [20, -6];
      gunAng = 90;
      idleGlint = p;
    } else if (act === 'shoot') {
      const recoil = p < 0.28 ? (p / 0.28) * 26 : 26 * Math.max(0, 1 - (p - 0.28) / 0.72);
      gunAng = aim + recoil;
      na = [aim - 10 - recoil * 0.35, gunAng];
      fa = [aim - 18 - recoil * 0.2, aim + 6 + recoil * 0.5];
      slideBack = p < 0.45 ? 1 : 0;
      flash = p < 0.22 ? 2 : p < 0.44 ? 1 : 0;
      if (p >= 0.12 && p <= 0.82) casing = (p - 0.12) / 0.7;
    } else if (act === 'reload') {
      if (p < 0.25) {
        const u = p / 0.25;
        gunAng = aim + 30 * u;
        na = [aim - 16 * u, gunAng];
        fa = [aim - 14 - 20 * u, aim + 8 - 24 * u];
        magDrop = 1 + Math.round(u * 4.5);
      } else if (p < 0.52) {
        const u = (p - 0.25) / 0.27;
        gunAng = aim + 30 + 4 * Math.sin(u * Math.PI);
        na = [aim - 18, gunAng];
        fa = u < 0.5 ? [-18, 18] : [-18 + (aim - 2) * ((u - 0.5) * 2), 18 + (aim + 8) * ((u - 0.5) * 2)];
        handMag = true;
      } else if (p < 0.76) {
        const u = (p - 0.52) / 0.24, tap = Math.sin(u * Math.PI) * 8;
        gunAng = aim + 30 + tap;
        na = [aim - 16 + tap * 0.4, gunAng];
        fa = [aim - 12, gunAng - 4];
        magLockGlow = u >= 0.35 && u <= 0.88;
      } else {
        const u = (p - 0.76) / 0.24;
        if (u < 0.55) {
          gunAng = aim + 18;
          na = [aim - 14, gunAng];
          fa = [aim + 6, gunAng + 18];
          slideBack = 1;
          rackGlint = true;
        } else {
          const k = (u - 0.55) / 0.45;
          gunAng = aim + 18 * (1 - k);
          na = [aim - 14 + 8 * k, gunAng];
          fa = [aim - 14, aim + 8];
          slideBack = 0;
        }
      }
    }
    return { id, aim, aimRot, act, p, na, fa, gunAng, edgeDir, userAng: 90 - (gunAng - aimRot), slideBack, flash, casing, magDrop, handMag, magLockGlow, rackGlint, slashArc, slashType, bladeScale, twoHand, chargeLv, spinPhase, idleGlint, trailFrom, spinRing, slamBurst, shoulderDx, shoulderDy, sheathed, sheathStar, crouchStance };
  }

  /* 独立特效图层渲染器 (drawKatanaOrbitFX)：
   * 右键秘技激发后，在独立于人物位置的特效图层 (detachedFX / 世界坐标特效) 上，
   * 正对人物正前方胸腰高度 (cx + 12, cy + 2)，按序列帧 (phase = 0..1) 快速环绕半周身打出 3 道 3D 透视交错月牙刀光，
   * 每道刀光均遵循「距刀头越远越细 + 毛边 + 动态模糊柔化」，环绕半周后依次收缩消散！ */
  function drawKatanaOrbitFX(gFx, cx, cy, phase, aimDeg) {
    if (phase == null || phase < 0 || phase > 1.0) return;
    const pureWhite = '#ffffff', edgeWhite = '#eef1f6', pureSilver = '#dce1eb', midMist = '#b8bfd0', steelLight = '#9aa1b0', shatterMid = '#686e7c', shatterDark = '#4a4f5c';
    const putF = (x, y, col) => {
      const rx = Math.round(x), ry = Math.round(y);
      if (ry < 2 || ry > 75) return;
      put(gFx, rx, ry, col);
    };
    const aimRot = (aimDeg != null ? aimDeg : 90) - 90;
    // 3 道快速环绕人物正前方胸腰高度的 3D 弧形刀光序列（分别在不同 3D 倾角平面上环绕身前 180° 半周，按 1->2->3 序列帧快速环绕展开，再同步收拢消散）
    const orbitArcs = [
      // 第 1 道：下半周斜掠环身弧（从后腰 -42° 环绕身前至右上方 +148°，居中在人物正前方胸腰）
      { tStart: 0.00, tEnd: 0.92, ang0: -42 + aimRot, ang1: 148 + aimRot, rx: 19.5, ry: 8.2, tiltDeg: -14, maxW: 5.2 },
      // 第 2 道：上半周反倾环身弧（从前上方 +162° 环绕身前至右下侧 -18°，与第 1 道在人物正前方立体交叉）
      { tStart: 0.16, tEnd: 0.96, ang0: 162 + aimRot, ang1: -18 + aimRot, rx: 21.5, ry: 8.8, tiltDeg: 14,  maxW: 5.5 },
      // 第 3 道：腰胸 3D 扁平满月半周横环（在水平面 3D 透视下呈扁平大月牙环绕半周身，随后收拢消散）
      { tStart: 0.30, tEnd: 1.00, ang0: -58 + aimRot, ang1: 134 + aimRot, rx: 23.5, ry: 5.6, tiltDeg: -4,  maxW: 5.2 },
    ];

    for (let idx = 0; idx < orbitArcs.length; idx++) {
      const arc = orbitArcs[idx];
      if (phase < arc.tStart || phase > arc.tEnd) continue;
      // 计算当前刀光在序列帧中的头部进度 headU 与尾部收拢进度 tailU（先快速环绕展开，三道齐聚环绕半周身后尾端快速收回消散）
      const localP = (phase - arc.tStart) / (arc.tEnd - arc.tStart);
      const headU = clamp(localP / 0.34, 0, 1);
      const tailU = localP <= 0.56 ? 0 : clamp((localP - 0.56) / 0.44, 0, 0.92);
      if (headU - tailU < 0.06) continue;

      const tiltRad = rad(arc.tiltDeg);
      const ct = Math.cos(tiltRad), st = Math.sin(tiltRad);
      const steps = 64;
      for (let s = 0; s <= steps; s++) {
        const uNorm = s / steps; // 0 = 当前尾端 (tailU, 距刀头最远最细)，1 = 当前刀头前端 (headU, 最宽最亮)
        const arcU = tailU + (headU - tailU) * uNorm;
        const theta = rad(arc.ang0 + (arc.ang1 - arc.ang0) * arcU);
        // 3D 椭圆投影坐标（环绕在人物正前方 cx + 12、胸腰高度 cy + 2，绝不飘到人物头顶上方）
        const ex = Math.sin(theta) * arc.rx;
        const ey = Math.cos(theta) * arc.ry;
        const px0 = cx + 12 + ex * ct - ey * st;
        const py0 = cy + 2 + ex * st + ey * ct;
        // 径向单位法向量（指向环外）与切向向量
        const len = Math.hypot(ex, ey) || 1;
        const nx = (ex * ct - ey * st) / len;
        const ny = (ex * st + ey * ct) / len;
        const tx = -ny, ty = nx;

        // 刀光宽度严格遵循「距刀头越远越细」(uNorm^1.45)，并在尾端收拢阶段整体变细消散
        const fadeScale = localP > 0.72 ? (1 - (localP - 0.72) / 0.28) : 1.0;
        const bandW = Math.max(0.5, arc.maxW * Math.pow(uNorm, 1.42) * fadeScale);

        // 外缘动态模糊柔化与飞散毛边 (Feathered Burrs & Blur Halo)
        if (uNorm > 0.25 && s % 3 === 0) {
          const burrLen = ((s + idx) % 2 === 0 ? 1.4 : 0.8) * fadeScale;
          putF(px0 + nx * 0.8 - tx * burrLen, py0 + ny * 0.8 - ty * burrLen, s % 6 === 0 ? pureSilver : steelLight);
        }

        for (let d = 0; d <= bandW; d += 0.55) {
          const tRad = bandW > 0.1 ? d / bandW : 0;
          const x = px0 - nx * d;
          const y = py0 - ny * d;
          let col;
          if (d <= 0.9) {
            col = uNorm < 0.18 ? pureSilver : uNorm < 0.35 ? edgeWhite : pureWhite;
          } else if (d <= 1.9) {
            col = uNorm < 0.25 ? midMist : edgeWhite;
          } else if (d <= 3.0) {
            col = d <= 2.4 ? pureSilver : midMist;
          } else {
            if ((s + Math.round(d * 2)) % 3 === 0) continue;
            col = tRad <= 0.65 ? steelLight : tRad <= 0.84 ? shatterMid : shatterDark;
          }
          putF(x, y, col);
        }

        // 内缘毛边与模糊尾羽
        if (uNorm >= 0.20 && uNorm <= 0.90 && s % 4 === 1) {
          putF(px0 - nx * (bandW + 0.9) - tx * 0.8, py0 - ny * (bandW + 0.9) - ty * 0.8, s % 8 === 1 ? shatterDark : shatterMid);
        }
      }
    }
  }

  /* 全武器刀光残影绘制系统 (drawSlashTrail)：
   * 核心升级：
   * 1) 3D 透视建模：
   *    - 第1段拔刀向前横扫斩 (katanaHoriz3D) 直接复用右键三连斩中间那道 3D 扁平椭圆横月牙剑气（绝不贴死在刀杆上）；
   *    - 第2/3段极速上下二连斩 (katanaFastUp / katanaFastDown) 与第4段大上段重下劈 (katanaDaiJodan) 采用 3D 倾斜平面椭圆弧投影；
   * 2) 刀光宽度严格「距刀越远越细」：从当前刀头端 (uNorm=1, 最宽) 向起手尾端 (uNorm=0, 最远) 按幂函数 uNorm^1.42 单调收细至 1px 针尖；
   * 3) 毛边与模糊柔化效果 (Feathered Burrs & Motion Blur)：外弧与内缘均带有切向飞散毛边细丝，横截面采用 7 阶柔和模糊渐变 (#ffffff → #eef1f6 → #dce1eb → #b8bfd0 → #9aa1b0 → #686e7c → #4a4f5c)；
   * 4) 配合三拍帧节奏：劈砍到位帧显示满幅刀光 (slashRetract=0)，下一帧武器位置保持不变、刀光收回一半 (slashRetract=0.5)！ */
  function drawSlashTrail(gWep, hx, hyW, wp) {
    if (wp.trailFrom == null || !wp.slashType) return;
    const pureWhite = '#ffffff', edgeWhite = '#eef1f6', pureSilver = '#dce1eb', midMist = '#b8bfd0', steelLight = '#9aa1b0', shatterMid = '#686e7c', shatterDark = '#4a4f5c';
    const rMax = 13.0;
    const a0 = wp.trailFrom, a1 = wp.gunAng;
    const diff = a1 - a0;
    if (Math.abs(diff) < 3) return;
    const retract = clamp(wp.slashRetract || 0, 0, 0.92);
    const putS = (x, y, col) => {
      const rx = Math.round(x), ry = Math.round(y);
      if (ry < 2 || ry > 75) return;
      put(gWep, rx, ry, col);
    };

    // ─── 长刀第1段 (katanaHoriz3D / katanaRef4)：复用右键三连斩中间那道 3D 扁平椭圆横月牙剑气，前端 100% 贴合太刀刀尖与前段刃口，且整道扁月牙围绕握持点随鼠标瞄准角度 (aimRot) 100% 同步旋转！ ───
    if (wp.slashType === 'katanaHoriz3D' || wp.slashType === 'katanaRef4' || wp.slashType === 'katanaX') {
      const aimRotDeg = wp.aimRot || 0;
      const rotRad = rad(aimRotDeg);
      const ca = Math.cos(rotRad), sa = Math.sin(rotRad);
      // 在未旋转局部坐标系 (aim=90°, aimRot=0°) 下计算太刀刀尖与前刃位置，使扁月牙前端 (arcU=1) 严丝合缝贴在刀上
      const baseAngDeg = a1 - aimRotDeg;
      const baseRad = rad(baseAngDeg);
      const uxB = Math.sin(baseRad), uyB = Math.cos(baseRad);
      const nxB = uyB, nyB = -uxB;
      const eDir = wp.edgeDir != null ? wp.edgeDir : 1;
      const bladeLocalPt = (uVal) => {
        const cVal = uVal > 5.0 ? Math.pow(clamp((uVal - 5.0) / 16.5, 0, 1), 1.45) * 2.1 : 0;
        const vVal = -eDir * cVal + eDir * 0.45;
        return [uVal * uxB + vVal * nxB, uVal * uyB + vVal * nyB];
      };
      const tipLocal = bladeLocalPt(21.5);

      const ang0Local = -58;
      const ang1Local = baseAngDeg; // 126°，与局部刀身角度完全对齐
      const rx = 22.5;
      const ry = 5.4;
      const tiltLocalRad = rad(-5);
      const ct = Math.cos(tiltLocalRad), st = Math.sin(tiltLocalRad);

      // 计算椭圆在 arcU=1 (theta=ang1Local) 处的原始局部点，并将椭圆平移锚定到太刀刀尖 tipLocal 上
      const thEnd = rad(ang1Local);
      const exEnd = Math.sin(thEnd) * rx, eyEnd = Math.cos(thEnd) * ry;
      const rawEndX = exEnd * ct - eyEnd * st;
      const rawEndY = exEnd * st + eyEnd * ct;
      const anchorDx = tipLocal[0] - rawEndX;
      const anchorDy = tipLocal[1] - rawEndY;

      const tailU = retract;
      const headU = 1.0;
      const fadeScale = 1 - 0.25 * retract;
      const steps = 68;

      for (let s = 0; s <= steps; s++) {
        const uNorm = s / steps; // 0 = 尾端 (距刀尖最远最细)，1 = 刀头前端 (紧贴太刀刀身，最宽最亮)
        const arcU = tailU + (headU - tailU) * uNorm;
        const theta = rad(ang0Local + (ang1Local - ang0Local) * arcU);
        const ex = Math.sin(theta) * rx;
        const ey = Math.cos(theta) * ry;
        const lx0 = anchorDx + ex * ct - ey * st;
        const ly0 = anchorDy + ex * st + ey * ct;

        const len = Math.hypot(ex, ey) || 1;
        const lnx = (ex * ct - ey * st) / len;
        const lny = (ex * st + ey * ct) / len;
        const ltx = -lny, lty = lnx;

        // 刀光宽度严格遵循「距刀越远越细」(uNorm^1.42)
        const bandW = Math.max(0.5, 5.2 * Math.pow(uNorm, 1.42) * fadeScale);
        // 在靠近刀身前端 (arcU > 0.72) 时，将刀光截面内缘平滑吸附到太刀前段刀刃 (u = 13.5..21.5) 上，确保刀光紧贴刀身不悬空，同时中段保持饱满 3D 扁月牙弧腹
        const bladeAttachW = arcU > 0.72 ? Math.pow((arcU - 0.72) / 0.28, 1.35) : 0;

        // 外缘动态模糊柔化与飞散毛边 (Feathered Burrs & Blur Halo)
        if (uNorm > 0.25 && s % 3 === 0) {
          const burrLen = (s % 2 === 0 ? 1.4 : 0.8) * fadeScale;
          const blx = lx0 + lnx * 0.8 - ltx * burrLen;
          const bly = ly0 + lny * 0.8 - lty * burrLen;
          putS(hx + blx * ca + bly * sa, hyW - blx * sa + bly * ca, s % 6 === 0 ? pureSilver : steelLight);
        }

        for (let d = 0; d <= bandW; d += 0.55) {
          const tRad = bandW > 0.1 ? d / bandW : 0;
          let lx = lx0 - lnx * d;
          let ly = ly0 - lny * d;
          if (bladeAttachW > 0) {
            const bPt = bladeLocalPt(Math.max(4.5, 21.5 - d * 1.45));
            lx = lx * (1 - bladeAttachW) + bPt[0] * bladeAttachW;
            ly = ly * (1 - bladeAttachW) + bPt[1] * bladeAttachW;
          }
          // 围绕手部握持支点 (hx, hyW) 随鼠标 aimRot 整体旋转（匹配 rig.js (sin, cos) 坐标系）
          const rxPt = hx + lx * ca + ly * sa;
          const ryPt = hyW - lx * sa + ly * ca;
          let col;
          if (d <= 0.9) {
            col = uNorm < 0.18 ? pureSilver : uNorm < 0.35 ? edgeWhite : pureWhite;
          } else if (d <= 1.9) {
            col = uNorm < 0.25 ? midMist : edgeWhite;
          } else if (d <= 3.0) {
            col = d <= 2.4 ? pureSilver : midMist;
          } else {
            if ((s + Math.round(d * 2)) % 3 === 0) continue;
            col = tRad <= 0.65 ? steelLight : tRad <= 0.84 ? shatterMid : shatterDark;
          }
          putS(rxPt, ryPt, col);
        }

        // 内缘毛边与模糊尾羽
        if (uNorm >= 0.20 && uNorm <= 0.90 && s % 4 === 1) {
          const ilx = lx0 - lnx * (bandW + 0.9) - ltx * 0.8;
          const ily = ly0 - lny * (bandW + 0.9) - lty * 0.8;
          putS(hx + ilx * ca - ily * sa, hyW + ilx * sa + ily * ca, s % 8 === 1 ? shatterDark : shatterMid);
        }
      }
      return;
    }

    // ─── 超长太刀 3D 斜劈/上挑/大上段刀光扫掠器 (katanaFastUp / katanaFastDown / katanaDaiJodan / katanaRef1..3) ───
    // 具备：1) 3D 倾斜椭圆透视弧度；2) 刀光宽度严格「距刀越远越细」(t^1.45)；3) 内外切向毛边与多层动态模糊柔化；4) 100% 锁死当前刀身并支持刀光收回一半！
    if (
      wp.slashType === 'katanaFastUp' ||
      wp.slashType === 'katanaFastDown' ||
      wp.slashType === 'katanaDaiJodan' ||
      wp.slashType === 'katanaRef1' ||
      wp.slashType === 'katanaDown' ||
      wp.slashType === 'katanaRef2' ||
      wp.slashType === 'katanaUp' ||
      wp.slashType === 'katanaRef3' ||
      wp.slashType === 'katanaShuttle'
    ) {
      const eDir = wp.edgeDir != null ? wp.edgeDir : (diff < 0 ? -1 : 1);
      const isDaiJodan = wp.slashType === 'katanaDaiJodan' || wp.slashType === 'katanaRef3';
      // 刀身处最大径向宽度（在刀光收回一半 retract=0.5 时同步内收）
      const maxBladeBand = (isDaiJodan ? 12.2 : 10.2) * (1 - 0.28 * retract);
      // 3D 倾斜平面透视系数：斜向挥砍在 2D 视角下中段轻微椭圆压缩，而在 t=1 (刀身处) 严格恢复 1.0 以 100% 贴合太刀刀身
      const tilt3D = isDaiJodan ? 0.88 : 0.78;
      const steps = 96;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps; // t=0 为最远端刀光尾尖 (a0)，t=1 为当前太刀刀身所在处 (a1 = wp.gunAng)
        const angDeg = a0 + diff * t;
        const ang = rad(angDeg);
        const ux = Math.sin(ang), uy = Math.cos(ang);
        const nx = uy, ny = -ux;

        // 3D 椭圆透视半径修正：t=1 时 perspScale = 1.0（严丝合缝锁死在 21.5px 太刀刀尖与刀身上），中后段呈现 3D 斜面月牙弧度
        const perspScale = 1.0 - (1.0 - tilt3D) * Math.sin(Math.PI * (1 - t)) * (1 - t * t);
        const uOuter = 21.5 * perspScale;

        // 【核心】：刀光宽度严格遵循「距刀越远越细」(t 从 1 向 0 递减时，bandW 按 t^1.45 单调变细，尾端收至 0.6px 细尖)
        const featherJit = (s % 5 === 0 ? 0.7 : s % 3 === 0 ? -0.4 : 0) * (1 - t * 0.5);
        const bandW = Math.max(0.55, 0.55 + maxBladeBand * Math.pow(t, 1.45) + featherJit);
        const uInner = Math.max(3.0, uOuter - bandW);

        // 1) 外弧毛边与动态模糊光晕 (Outer Feathered Burrs & Blur Halo)：顺着挥砍切线反方向拉出细密毛边与柔化边缘
        if (t >= 0.14 && t <= 0.96 && s % 3 === 0) {
          const uBurr = uOuter + 0.65;
          const curveB = uBurr > 5.0 ? Math.pow(clamp((uBurr - 5.0) / 16.5, 0, 1), 1.45) * 2.1 : 0;
          const vB = -eDir * curveB + eDir * 0.45;
          // 沿切线反方向延伸 1~2px 毛边
          const burrBack = (s % 6 === 0 ? 1.8 : 1.0) * (diff >= 0 ? -1 : 1);
          const bx = hx + uBurr * ux + (vB + burrBack) * nx;
          const by = hyW + uBurr * uy + (vB + burrBack) * ny;
          putS(bx, by, s % 6 === 0 ? pureSilver : midMist);
          if (s % 6 === 0) {
            putS(bx + burrBack * 0.7 * nx, by + burrBack * 0.7 * ny, steelLight);
          }
        }

        // 2) 主刀光横截面：从外缘纯白锋线向内缘做 7 阶动态模糊柔化渐变
        for (let u = uOuter; u >= uInner; u -= 0.55) {
          const dOuter = uOuter - u;
          const tRad = bandW > 0.1 ? dOuter / bandW : 0;
          const uBlade = clamp(u / Math.max(0.6, perspScale), 2.2, 21.5);
          const curve = uBlade > 5.0 ? Math.pow((uBlade - 5.0) / 16.5, 1.45) * 2.1 : 0;
          const vOff = -eDir * curve + eDir * 0.45;
          const px = hx + u * ux + vOff * nx;
          const py = hyW + u * uy + vOff * ny;

          let col;
          if (dOuter <= 1.1) {
            if (t < 0.05 && s % 2 === 1) continue;
            col = t < 0.10 ? pureSilver : t < 0.18 ? edgeWhite : pureWhite;
          } else if (dOuter <= 2.3) {
            if (t < 0.08 && (s + 1) % 2 === 0) continue;
            col = t < 0.18 ? midMist : edgeWhite;
          } else if (dOuter <= 3.7) {
            col = dOuter <= 3.0 ? pureSilver : midMist;
          } else if (dOuter <= 5.4) {
            if (t < 0.88 && (s + Math.round(dOuter * 2)) % 5 === 0) continue;
            col = dOuter <= 4.5 ? midMist : steelLight;
          } else {
            // 内层柔和模糊与毛边雾化过渡 (#9aa1b0 → #686e7c → #4a4f5c)
            const ringIdx = Math.round(dOuter * 1.6);
            if (t < 0.92 && (s + ringIdx * 2) % 3 === 0) continue;
            if (tRad > 0.76 && (s * 2 + ringIdx) % 3 !== 0) continue;
            col = tRad <= 0.62 ? steelLight : tRad <= 0.82 ? shatterMid : shatterDark;
          }
          putS(px, py, col);
        }

        // 3) 内缘切向飞散毛边细丝 (Inner Feathered Burrs)：顺着刀浪内壁向后拉出柔和毛刺与模糊残影
        if (t >= 0.16 && t <= 0.90 && s % 3 === 0) {
          const uShard = Math.max(2.6, uInner - 0.9 - (s % 3) * 0.6);
          const curveS = uShard > 5.0 ? Math.pow(clamp((uShard - 5.0) / 16.5, 0, 1), 1.45) * 2.1 : 0;
          const vS = -eDir * curveS;
          const sx = hx + uShard * ux + vS * nx;
          const sy = hyW + uShard * uy + vS * ny;
          putS(sx, sy, s % 6 === 0 ? steelLight : shatterMid);
          if (s % 6 === 0) {
            putS(sx - ux * 0.85, sy - uy * 0.85, shatterDark);
          }
        }
      }
      return;
    }

    // ─── 超巨型铁质大剑 (Greatsword) 3D 势大力沉刀光系统 (gsColossalUp3D / gsEarthShatter3D / gsTectonic3D / gsHeavyDown / gsHeavyUp / gsHorizWall) ───
    // 严格延用 3D 透视建模 + 距刀越远越细 (t^1.38) + 内外切向毛边与 7 阶动态模糊 + 巨剑专属重型锯齿内缘与裂地碎石激波，100% 贴合 21.5px 超宽巨剑！
    if (
      wp.slashType === 'gsColossalUp3D' ||
      wp.slashType === 'gsEarthShatter3D' ||
      wp.slashType === 'gsTectonic3D' ||
      wp.slashType === 'gsHeavyDown' ||
      wp.slashType === 'gsHeavyUp' ||
      wp.slashType === 'gsHorizWall'
    ) {
      const isEarthSlam = wp.slashType === 'gsEarthShatter3D' || wp.slashType === 'gsHeavyDown';
      const isTectonic = wp.slashType === 'gsTectonic3D' || wp.slashType === 'gsHorizWall';
      // 巨剑刀身处最大径向刀光宽度高达 14.5~16.2px（势大力沉，比普通剑与太刀更宽厚），在 retract=0.5 时同步内收
      const maxBladeBand = (isEarthSlam ? 16.2 : isTectonic ? 15.0 : 14.8) * (1 - 0.28 * retract);
      // 3D 斜面椭圆压缩率：t=1 (当前巨剑所在位置) 严格为 1.0 以 100% 贴合 21.5px 巨剑剑身，中后段呈 3D 透视宽厚椭圆弧
      const tilt3D = isEarthSlam ? 0.86 : isTectonic ? 0.72 : 0.78;
      const steps = 104;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps; // t=0 为最远端尾尖 (a0)，t=1 为当前巨剑剑身处 (a1 = wp.gunAng)
        const angDeg = a0 + diff * t;
        const ang = rad(angDeg);
        const ux = Math.sin(ang), uy = Math.cos(ang);
        const nx = uy, ny = -ux;

        const perspScale = 1.0 - (1.0 - tilt3D) * Math.sin(Math.PI * (1 - t)) * (1 - t * t);
        const uOuter = 21.5 * perspScale;

        // 刀光宽度严格遵循「距刀越远越细」(t^1.38)，叠加巨剑狂暴重型锯齿内缘与毛边抖动
        const toothPhase = s % 6;
        const sawTooth = (toothPhase === 0 ? 2.2 : toothPhase === 1 || toothPhase === 5 ? 1.1 : 0) * (1 - t * 0.45);
        const bandW = Math.max(0.8, 0.8 + maxBladeBand * Math.pow(t, 1.38) - sawTooth);
        const uInner = Math.max(2.6, uOuter - bandW);

        // 1) 巨剑外弧狂风毛边与动态模糊光晕 (Outer Heavy Feathered Burrs)
        if (t >= 0.12 && t <= 0.98 && s % 2 === 0) {
          const uBurr = uOuter + (s % 4 === 0 ? 1.1 : 0.6);
          const burrBack = (s % 4 === 0 ? 2.2 : 1.2) * (diff >= 0 ? -1 : 1);
          const bx = hx + uBurr * ux + burrBack * nx;
          const by = hyW + uBurr * uy + burrBack * ny;
          putS(bx, by, s % 4 === 0 ? pureWhite : pureSilver);
          if (s % 4 === 0) {
            putS(bx + burrBack * 0.75 * nx, by + burrBack * 0.75 * ny, midMist);
          }
        }

        // 2) 主刀光横截面：外缘厚达 2.8px 的炽白重剑锋芒带 + 7 阶动态模糊雾化渐变
        for (let u = uOuter; u >= uInner; u -= 0.55) {
          const dOuter = uOuter - u;
          const tRad = bandW > 0.1 ? dOuter / bandW : 0;
          const px = hx + u * ux;
          const py = hyW + u * uy;

          let col;
          if (dOuter <= 1.8) {
            if (t < 0.04 && s % 2 === 1) continue;
            col = t < 0.09 ? pureSilver : t < 0.16 ? edgeWhite : pureWhite;
          } else if (dOuter <= 3.6) {
            col = t < 0.15 ? pureSilver : edgeWhite;
          } else if (dOuter <= 5.8) {
            col = dOuter <= 4.7 ? pureSilver : midMist;
          } else if (dOuter <= 8.2) {
            if (t < 0.86 && (s + Math.round(dOuter * 2)) % 5 === 0) continue;
            col = dOuter <= 6.8 ? midMist : steelLight;
          } else {
            const ringIdx = Math.round(dOuter * 1.5);
            if (t < 0.90 && (s + ringIdx * 2) % 3 === 0) continue;
            if (tRad > 0.78 && (s * 2 + ringIdx) % 3 !== 0) continue;
            col = tRad <= 0.64 ? steelLight : tRad <= 0.84 ? shatterMid : shatterDark;
          }
          putS(px, py, col);
        }

        // 3) 内缘重型锯齿飞散毛刺与碎铁残影 (Inner Heavy Serrated Burrs)
        if (t >= 0.14 && t <= 0.92 && s % 3 === 0) {
          const uShard = Math.max(2.2, uInner - 1.1 - (s % 3) * 0.75);
          const sx = hx + uShard * ux;
          const sy = hyW + uShard * uy;
          putS(sx, sy, s % 6 === 0 ? steelLight : shatterMid);
          putS(sx - ux * 1.0, sy - uy * 1.0, shatterDark);
        }
      }

      // 底部触地裂地激波：在角色正前方地面 (y = 73..75) 铺设超长触地刀光带与震地崩裂碎石尖刺
      const aimRot = wp.aimRot || 0;
      if (Math.abs(aimRot) <= 25) {
        const groundSpan = Math.round(22 * (1 - 0.35 * retract));
        for (let dx = 1; dx <= groundSpan; dx++) {
          putS(hx + dx, 75, dx <= groundSpan - 3 ? pureWhite : edgeWhite);
          if (dx >= 2 && dx <= groundSpan - 1) {
            putS(hx + dx, 74, dx % 2 === 0 ? pureSilver : steelLight);
          }
          if (isEarthSlam && dx % 4 === 1 && dx <= groundSpan - 2) {
            putS(hx + dx, 73, dx <= 10 ? edgeWhite : shatterMid);
            if (dx <= 14) putS(hx + dx + 1, 72, shatterDark);
          }
        }
      }
      return;
    }

    if (wp.slashType === 'horiz') {
      const ang = rad(wp.gunAng);
      const ux = Math.sin(ang), uy = Math.cos(ang);
      // 垂直于挥砍前向的画面下方法向 (dnX, dnY)：当水平朝右 (gunAng=90°) 时，(ux,uy)=(1,0)，(dnX,dnY)=(0,1)
      const dnX = -uy, dnY = ux;
      const putH = (u, d, col) => {
        const px = hx + u * ux + d * dnX;
        const py = clamp(hyW + u * uy + d * dnY, 34, 75.5);
        put(gWep, px, py, col);
      };
      const isPeak = Math.abs(diff) >= 175;

      // 1) 后背收尖新月尾 + 细碎流线残影（尾端从 1px 锐利尖梢渐宽，内侧带镂空细碎剑气纹）
      if (isPeak) {
        // 刀光尾尖梢 (d = -3..-2)：在肩背上方收束成纤细尖尾
        putH(-9, -3, steelLight);
        putH(-10, -3, pureSilver);
        for (let u = -12; u <= -7; u++) {
          putH(u, -2, u <= -10 ? edgeWhite : (u % 2 === 0 ? pureSilver : steelLight));
        }
        // C 弧中段：外缘纯白，内缘做细碎断续流线纹理与渐变
        for (let d = -1; d <= 2; d++) {
          const uLeft = d === 0 || d === 1 ? -14 : d === -1 ? -13 : -12;
          const uRight = d === -1 ? -7 : -5;
          for (let u = uLeft; u <= uRight; u++) {
            const distFromOuter = u - uLeft;
            // 在内侧刻出细碎空气流线间隙，避免死板色块
            if (distFromOuter >= 3 && (u + d * 2) % 3 === 0) continue;
            const col = distFromOuter <= 1
              ? edgeWhite
              : distFromOuter <= 3
              ? pureSilver
              : distFromOuter <= 5
              ? midMist
              : steelLight;
            putH(u, d, col);
          }
        }
        // 左下方三根细碎流苏残影齿 (u = -12, -10, -8)
        for (const uTooth of [-12, -10, -8]) {
          putH(uTooth, 3, edgeWhite);
          putH(uTooth, 4, uTooth === -12 ? pureSilver : steelLight);
        }
      } else {
        // 收势帧：渐窄尖尾细碎残影
        putH(-11, 1, steelLight);
        for (let u = -10; u <= -3; u++) {
          if (u % 2 === 0) putH(u, 0, steelLight);
          putH(u, 1, u <= -7 ? midMist : pureSilver);
          putH(u, 2, edgeWhite);
        }
      }

      // 2) 前方水平横斩主刃带：偏刀尖与下沿外弧极亮纯白 (#eef1f6)，上沿与内侧呈细碎流线渐变 (#dce1eb → #b8bfd0 → #9aa1b0)
      const uStart = isPeak ? -6 : -2;
      const uBandEnd = isPeak ? 14 : 13;
      for (let u = uStart; u <= uBandEnd; u++) {
        // 上沿内侧细碎速度线 (d = -1)
        if (u >= -2 && u <= 11 && (u % 2 !== 0 || u >= 8)) {
          putH(u, -1, u >= 7 ? pureSilver : steelLight);
        }
        // 中内层流线渐变与细碎间隙 (d = 0)
        if (u >= 5 || (u + 8) % 3 !== 0) {
          putH(u, 0, u >= 8 ? edgeWhite : u >= 2 ? pureSilver : midMist);
        }
        // 核心斩击线与外弧刃口 (d = 1, 2)：越靠近剑尖 (u >= 6) 越纯白饱满
        putH(u, 1, u >= 3 ? edgeWhite : pureSilver);
        putH(u, 2, edgeWhite);
        if (isPeak && u >= -4 && u <= 12) {
          if (u >= 4 || u % 2 === 0) {
            putH(u, 3, u >= 6 ? edgeWhite : pureSilver);
          }
        }
      }

      // 3) 远端修长水平尖刺延伸（刀尖前方最白最锐利，向远端渐收为 1px 剑芒尖峰）
      const uSpikeMax = isPeak ? 20 : 16;
      for (let u = uBandEnd + 1; u <= uSpikeMax; u++) {
        if (u <= uBandEnd + 2) {
          putH(u, 1, edgeWhite);
          putH(u, 2, edgeWhite);
        } else {
          putH(u, 2, edgeWhite);
        }
      }
      if (isPeak) {
        putH(uSpikeMax, 1, edgeWhite);
      }
      return;
    }

    // 二段·斜撩上挑 (diagUp)、三段·举顶下劈 (heavySlam) 与蓄力剑气斩 (skillWave)：
    // 1. 刀光宽度随离剑距离 (1 - u) 增大而单调减小：在剑身处 (u=1) 宽度约 9.8px，到尾端 (u=0) 收窄至 0.6px 锐利尖尾；
    // 2. 偏刀尖外弧 (dOuter <= 1.5) 保持极亮纯白 (#eef1f6)，向内圈依次渐变 (#dce1eb → #b8bfd0 → #9aa1b0)，并刻画同心细碎流线纹理。
    const steps = Math.max(34, Math.min(76, Math.round(Math.abs(diff) * 0.42)));
    for (let s = 0; s <= steps; s++) {
      const u = s / steps; // u=0 为最远端刀光尖尾，u=1 为当前剑身所在处
      const ang = rad(a0 + diff * u);
      const ux = Math.sin(ang), uy = Math.cos(ang);

      // 外弧半径：贴合挥砍手臂外展轨迹，形成饱满大弧
      const armSwingBoost = Math.sin(u * Math.PI) * 2.2 + (1 - u) * 2.4;
      const rOuter = rMax + armSwingBoost;

      // 刀光径向宽度随距离剑身 (1 - u) 增大而显著收窄：u=0 时仅 0.6px（尖尾），u=1 时达 9.8px（宽刃）
      const slashWidth = 0.55 + 9.25 * Math.pow(u, 1.42);
      const rIn = Math.max(2.4, rOuter - slashWidth);

      for (let r = rOuter; r >= rIn; r -= 0.72) {
        const dOuter = rOuter - r; // 距离刀尖外弧的径向深度 (0 = 刀尖外弧，slashWidth = 刀光内缘)
        const tRad = slashWidth > 0.1 ? (dOuter / slashWidth) : 0; // 0 = 外弧刀尖侧，1 = 内弧近柄侧
        const ringIdx = Math.round(dOuter * 1.35);

        // 细碎流线纹理过滤：
        // - 外弧刀尖带 (dOuter <= 1.45) 连续不断裂，保证刀光外沿锐利流畅（仅在极尾端 u < 0.07 做星点破碎）；
        // - 中内圈通过同心弧间隙 (ringIdx % 3 === 2) 与角度交错断续 ((s + ringIdx * 2) % 3) 形成细碎剑风纹理。
        if (dOuter <= 1.45) {
          if (u < 0.06 && s % 2 === 1) continue;
        } else {
          // 同心流线分层：每隔两道细弧留出一道细微呼吸间隙
          if (ringIdx % 3 === 2 && u < 0.88) continue;
          // 随离剑距离增大 (u 减小) 及靠近内缘 (tRad 增大)，纹理逐渐打散成细碎流苏与疾风线
          if (u < 0.35 && (s + ringIdx) % 2 === 1) continue;
          if (u < 0.72 && tRad > 0.42 && (s + ringIdx * 2) % 3 === 0) continue;
          if (tRad > 0.76 && (s + ringIdx) % 2 === 0) continue;
        }

        // 偏刀尖外弧最白、向内圈与向尾端渐变的四阶冷白/银灰渐变：
        let col;
        if (dOuter <= 1.45) {
          // 偏刀尖外弧：主体极亮纯白 (#eef1f6)，仅在最末端尖梢 12% 渐隐为亮银 (#dce1eb / #9aa1b0)
          col = u >= 0.14 ? edgeWhite : u >= 0.05 ? pureSilver : steelLight;
        } else if (tRad <= 0.42) {
          col = u >= 0.52 ? edgeWhite : u >= 0.24 ? pureSilver : midMist;
        } else if (tRad <= 0.74) {
          col = u >= 0.72 ? pureSilver : u >= 0.38 ? midMist : steelLight;
        } else {
          col = u >= 0.65 ? midMist : steelLight;
        }

        const px = hx + ux * r, py = clamp(hyW + uy * r, 34, 75.5);
        put(gWep, px, py, col);
      }
    }

    // 剑尖前缘再向外延伸 2px 锐利纯白剑芒尖峰，强化刀尖弧线高光
    if (Math.abs(diff) >= 120) {
      const ang1 = rad(a1);
      const ux1 = Math.sin(ang1), uy1 = Math.cos(ang1);
      put(gWep, hx + ux1 * 14.0, clamp(hyW + uy1 * 14.0, 34, 75.5), edgeWhite);
      put(gWep, hx + ux1 * 15.0, clamp(hyW + uy1 * 15.0, 34, 75.5), edgeWhite);
    }

    // 三段·举顶下劈落地瞬间：在加长剑尖触地处激发纯白剑气激波与亮银细碎裂地残影
    if (wp.slamBurst > 0) {
      const ang = rad(wp.gunAng);
      const tipX = hx + Math.sin(ang) * 12.2;
      const tipY = Math.min(75.0, hyW + Math.cos(ang) * 12.2);
      const hBurst = Math.round(5 * wp.slamBurst);
      for (let dx = -3; dx <= 3; dx++) {
        put(gWep, tipX + dx, tipY, Math.abs(dx) <= 1 ? edgeWhite : Math.abs(dx) === 2 ? pureSilver : steelLight);
      }
      for (let dy = 1; dy <= hBurst; dy++) {
        put(gWep, tipX, tipY - dy, dy <= 2 ? edgeWhite : dy <= 4 ? pureSilver : steelLight);
        if (dy <= hBurst - 1 && dy % 2 === 1) {
          put(gWep, tipX - 2, tipY - dy, dy === 1 ? pureSilver : steelLight);
          put(gWep, tipX + 2, tipY - dy, dy === 1 ? pureSilver : steelLight);
        }
      }
    }
  }

  function drawWeaponLayers(gBack, gWep, gFront, spec, po, hy, opts) {
    const suit = !!(opts && opts.suit); if (suit) spec = suitSpec(spec);
    const b = spec.build, look = spec.look, c = look.cols, o = look.outfit;
    const wp = computeWeaponPose(Object.assign({}, opts.weapon, { v34: !!po.v34 }));
    const L = po.v34 ? 0 : (po.lean || 0), ub = po.bob || 0;
    const sdx = po.v34 ? 0 : (po.shoulderDx || wp.shoulderDx || 0);
    const sdy = po.v34 ? 0 : (po.shoulderDy || wp.shoulderDy || 0);
    // 肩膀旋转中心 (sxN, sy)：单独剥离的前臂、后臂与武器均以此肩膀关节为支点随鼠标旋转
    const sy = hy - 6 + ub + sdy;
    const sxN = po.v34 ? 14 : 16 + L + sdx;
    const rotRad = rad(po.v34 ? 0 : (wp.aimRot || 0));
    const sxF = po.v34 ? 17 : (sxN - Math.cos(rotRad));
    const syF = po.v34 ? sy : (sy + Math.sin(rotRad));
    const AF = armPts(b, wp.fa[0], wp.fa[1]), AN = armPts(b, wp.na[0], wp.na[1]);

    // 1. 后臂图层 (backArm)：以肩膀支点旋转后的远端肩位 (sxF, syF) 绘制，自动适配套装袖长
    drawArm2(gBack, AF, sxF, syF, c.armF, sleeveThick(look, false, !!po.v34), look.sleeve);
    if (wp.handMag) {
      const fx = Math.round(sxF + AF.wx), fy = Math.round(syF + AF.wy);
      put(gBack, fx, fy - 1, '#3e4556'); put(gBack, fx, fy - 2, '#ef7b3a'); put(gBack, fx + 1, fy - 2, '#6be6ff');
    }

    // 2. 武器精灵图层 (weapon) —— 握持原点取整保证剑身上下双刃关于中轴严格像素对称
    const hx = Math.round(sxN + AN.wx);
    const hyW = Math.round(sy + AN.wy);
    const ux = Math.sin(rad(wp.gunAng)), uy = Math.cos(rad(wp.gunAng));
    const isBlade = wp.id === 'blade' || wp.id === 'sword';
    const isKatana = wp.id === 'katana';
    const isGreatsword = wp.id === 'greatsword';
    const isMelee = isBlade || isKatana || isGreatsword;
    const flipUp = (!isMelee && ux < -0.25) ? -1 : 1;
    const nx = uy * flipUp, ny = -ux * flipUp;
    const pt = (u, v) => [hx + u * ux + v * nx, hyW + u * uy + v * ny];
    const putW = (x, y, col) => {
      const rx = Math.round(x), ry = Math.round(y);
      if (ry < 2 || ry > 75) return;
      put(gWep, rx, ry, col);
    };

    let muzzle = { x: Math.round(hx + 5.5 * ux + 1.2 * nx), y: Math.round(hyW + 5.5 * uy + 1.2 * ny), ux, uy };

    if (isKatana) {
      // 先绘制长刀专属大开大合贴刃圆弧刀光 / 居合三道竖直撕裂月牙刀气
      drawSlashTrail(gWep, hx, hyW, wp);

      // 腰间超长铁黑太刀鞘 (Extra-Long Waist Scabbard / Saya，s = 0..19，对角线全长约 20px，与 21px 超长太刀刀身完美匹配)：
      // 随上身呼吸 ub 同步平移，确保 45° 待机刚体不变形
      const scX = po.v34 ? 15 : (16 + L);
      const scY = hy - 1 + ub;
      for (let s = 0; s <= 19; s++) {
        const sxOff = -Math.round(s * 0.90);
        const syOff = Math.floor(s * 0.36);
        const sCol =
          s === 0
            ? '#7d8494' // 鞘口金属鲤口 (Koiguchi)
            : s === 3 || s === 4
            ? '#6e2b32' // 暗红铁栗形与下绪缠绳 (Kurikata & Sageo)
            : s >= 17
            ? '#8a91a1' // 鞘尾铁铛包金 (Kojiri)
            : '#252932'; // 乌木黑铁漆鞘主干
        putW(scX + sxOff, scY + syOff, sCol);
        if (s >= 1 && s <= 17) {
          putW(scX + sxOff, scY + syOff + 1, s === 3 ? '#4a1c22' : '#15181f');
        }
      }

      if (wp.sheathed) {
        // 纳刀入鞘状态（45°叉腰握柄待机 / 侧面行走奔跑单手握柄 / 右键居合蓄力）：
        // 刀身完全插在腰间 20px 超长刀鞘里，鞘口前方探出圆形铁镡与缠绳长刀把，供手部稳稳抓握
        putW(scX + 1, scY - 1, '#686e7c'); // 圆形铁镡护手（上）
        putW(scX + 1, scY,     '#4a4f5c'); // 圆形铁镡护手（下）
        putW(scX + 2, scY - 1, '#2b2e36'); // 缠绳刀把前段
        putW(scX + 3, scY - 2, '#8a91a1'); // 菱形目贯装饰
        putW(scX + 4, scY - 2, '#2b2e36'); // 缠绳刀把中段
        putW(scX + 5, scY - 3, '#7d8494'); // 缠绳刀把后段
        putW(scX + 6, scY - 3, '#5c6374'); // 铁质柄头 (Kashira)

        // 待机呼吸微光：沿刀镡与柄头流转寒铁光泽
        if (wp.idleGlint >= 0) {
          const gx = scX + 1 + Math.min(4, Math.floor(wp.idleGlint * 5));
          const gy = scY - 1 - Math.floor((gx - (scX + 1)) * 0.5);
          putW(gx, gy, '#dce1eb');
        }

        // 右键蓄力阶段 (sheathSuction > 0)：刀鞘口吸引周围寒铁光粒向鞘口螺旋汇聚！
        if (wp.sheathSuction > 0) {
          const sx0 = scX + 1, sy0 = scY - 1;
          const sucLv = wp.sheathSuction; // 1 -> 2 -> 3 (半径由远及近向鞘口收缩)
          const baseR = sucLv === 1 ? 8.5 : sucLv === 2 ? 5.6 : 3.0;
          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * Math.PI * 2 + sucLv * 0.65;
            const r = baseR + (k % 2 === 0 ? 1.2 : -0.8);
            const px = sx0 + Math.cos(ang) * r;
            const py = sy0 + Math.sin(ang) * r * 0.78;
            // 粒子亮头朝向鞘口 + 尾端模糊拖影
            putW(px, py, k % 2 === 0 ? '#ffffff' : '#eef1f6');
            putW(px + Math.cos(ang) * 1.1, py + Math.sin(ang) * 0.9, k % 3 === 0 ? '#b8bfd0' : '#9aa1b0');
          }
          putW(sx0, sy0, '#dce1eb');
        }

        // 聚集粒子爆发成一颗璀璨小星（sheathStar = 1..3）
        if (wp.sheathStar > 0) {
          const sx0 = scX + 1, sy0 = scY - 1;
          putW(sx0, sy0, '#ffffff');
          putW(sx0, sy0 - 1, '#ffffff');
          putW(sx0, sy0 + 1, '#ffffff');
          putW(sx0 - 1, sy0, '#ffffff');
          putW(sx0 + 1, sy0, '#ffffff');
          if (wp.sheathStar >= 2) {
            putW(sx0, sy0 - 2, '#eef1f6');
            putW(sx0, sy0 + 2, '#eef1f6');
            putW(sx0 - 2, sy0, '#eef1f6');
            putW(sx0 + 2, sy0, '#eef1f6');
            putW(sx0 - 1, sy0 - 1, '#dce1eb');
            putW(sx0 + 1, sy0 - 1, '#dce1eb');
            putW(sx0 - 1, sy0 + 1, '#dce1eb');
            putW(sx0 + 1, sy0 + 1, '#dce1eb');
          }
          if (wp.sheathStar >= 3) {
            // 粒子汇聚瞬间爆发的璀璨八芒星芒与飞散星屑
            putW(sx0, sy0 - 3, '#ffffff');
            putW(sx0, sy0 + 3, '#ffffff');
            putW(sx0 - 3, sy0, '#ffffff');
            putW(sx0 + 3, sy0, '#ffffff');
            putW(sx0 - 2, sy0 - 2, '#b8bfd0');
            putW(sx0 + 2, sy0 - 2, '#b8bfd0');
            putW(sx0 - 2, sy0 + 2, '#b8bfd0');
            putW(sx0 + 2, sy0 + 2, '#b8bfd0');
          }
        }
        muzzle = { x: Math.round(scX + 16), y: Math.round(scY - 4), ux, uy };
      } else {
        // 铁质超长太刀 (Extra-Long Iron Katana)：匹配参考图1红线标示的修长刀身（握持点至切先长 21.5px，含长柄总长约 25px）
        // 严格修正太刀阴阳刃向：
        // - eDir = wp.edgeDir (-1 为下劈/顺时针挥砍，+1 为上挑/逆时针挥砍)；
        // - 刀身中轴线向刀背方向弯曲 (vCenter = -eDir * curve)，从而让朝向挥砍前方 (eDir) 的那一侧永远是向外拱起的「凸面 (Convex Belly)」，并在凸面绘制雪白开刃 (pHa #ffffff)；
        // - 背向挥砍方向的凹面 (Concave Back, vBack = vCenter - eDir * 0.55) 永远绘制暗铁刀背 (#3a3f4d)，彻底杜绝拿反刀或用凹面/刀背砍人！
        const eDir = wp.edgeDir != null ? wp.edgeDir : -1;
        const isSlashFlash = wp.trailFrom != null && Math.abs(wp.gunAng - wp.trailFrom) >= 60;
        // 双手长刀柄 (Tsuka, u = -3.6 .. 1.0)
        for (let u = -3.6; u <= 1.0; u += 0.65) {
          const pH = pt(u, 0);
          const isWrapHi = Math.abs(((u + 4) * 1.6) % 2 - 1) < 0.45;
          putW(pH[0], pH[1], u <= -3.1 ? '#686e7c' : isWrapHi ? '#8a91a1' : '#23262e');
        }
        // 圆形铁镡护手 (Tsuba) + 银铁吞口 (Habaki)
        putW(pt(1.2, -1.2)[0], pt(1.2, -1.2)[1], '#4a4f5c');
        putW(pt(1.2, -0.5)[0], pt(1.2, -0.5)[1], '#686e7c');
        putW(pt(1.2,  0.0)[0], pt(1.2,  0.0)[1], '#4a4f5c');
        putW(pt(1.2,  0.5)[0], pt(1.2,  0.5)[1], '#686e7c');
        putW(pt(1.2,  1.2)[0], pt(1.2,  1.2)[1], '#4a4f5c');
        putW(pt(1.8, -0.2)[0], pt(1.8, -0.2)[1], '#8a91a1');
        putW(pt(1.8,  0.2)[0], pt(1.8,  0.2)[1], '#adb4c4');

        const colSpine = '#3a3f4d'; // 凹面暗铁刀背 (Mune)
        const colMid   = isSlashFlash ? '#b8bfd0' : '#8a91a1'; // 镐筋冷灰 (Shinogi)
        const colEdge  = isSlashFlash ? '#ffffff' : '#eef1f6'; // 凸面雪白刃口 (Ha)
        for (let u = 2.2; u <= 20.6; u += 0.55) {
          const curve = u > 5.0 ? Math.pow((u - 5.0) / 16.5, 1.45) * 2.1 : 0;
          const vCenter = -eDir * curve;
          const pBack = pt(u, vCenter - eDir * 0.55); // 凹侧：暗铁刀背
          const pMid  = pt(u, vCenter);               // 中线：镐筋
          const pHa   = pt(u, vCenter + eDir * 0.55); // 凸侧（迎向挥砍方向）：雪白开刃
          putW(pBack[0], pBack[1], colSpine);
          putW(pMid[0],  pMid[1],  colMid);
          putW(pHa[0],   pHa[1],   u >= 15.5 ? '#ffffff' : colEdge);
        }
        // 锐利切先 (Kissaki, u = 21.0 .. 21.5)，顺着凸刃弧线自然收尖
        const pTip1 = pt(21.0, -eDir * 2.05 + eDir * 0.25);
        const pTip2 = pt(21.5, -eDir * 2.15);
        putW(pTip1[0], pTip1[1], '#f2f4f8');
        putW(pTip2[0], pTip2[1], '#ffffff');

        if (wp.idleGlint >= 0) {
          const gu = 2.6 + wp.idleGlint * 17.5;
          const gCurve = gu > 5.0 ? Math.pow((gu - 5.0) / 16.5, 1.45) * 2.1 : 0;
          const gp = pt(gu, -eDir * gCurve + eDir * 0.55);
          recolor(gWep, gp[0], gp[1], '#ffffff');
        }
        muzzle = { x: Math.round(pTip2[0]), y: Math.round(pTip2[1]), ux, uy };
      }
    } else if (isGreatsword) {
      // 先绘制大剑专属 3D 势大力沉刀光残影（距刀越远越细 + 毛边 + 动态模糊 + 锯齿内缘）
      drawSlashTrail(gWep, hx, hyW, wp);

      // 超巨型铁质大剑 (Colossal Iron Greatsword)：严格对齐参考图红线标示的门板巨剑比例（握持点后方长柄 u = -5.5..1.2，超宽剑刃 u = 2.2..24.5，横向全宽达 6.5~7px！）
      const isSlashFlash = wp.trailFrom != null && Math.abs(wp.gunAng - wp.trailFrom) >= 60;
      const pTip = pt(24.5, 0);

      // 1) 双手超长配重剑柄 (u = -5.5 .. 1.2) + 重型八角铁剑首 (Pommel)
      for (let u = -5.5; u <= 1.0; u += 0.5) {
        if (u <= -4.5) {
          // 宽厚重铁配重球 (Pommel)
          putW(pt(u, -0.8)[0], pt(u, -0.8)[1], '#4a4f5c');
          putW(pt(u,  0.8)[0], pt(u,  0.8)[1], '#686e7c');
          putW(pt(u,  0.0)[0], pt(u,  0.0)[1], '#adb4c4');
        } else {
          const isGripRing = Math.abs(((u + 6) * 1.4) % 2 - 1) < 0.4;
          const gCol = isGripRing ? '#686e7c' : '#23262e';
          putW(pt(u, -0.35)[0], pt(u, -0.35)[1], '#1b1e24');
          putW(pt(u,  0.35)[0], pt(u,  0.35)[1], gCol);
          putW(pt(u,  0.0)[0],  pt(u,  0.0)[1],  gCol);
        }
      }

      // 2) 超宽重铁十字护手 (Crossguard, u = 1.2 .. 2.1, v = -3.8 .. +3.8)
      for (let u = 1.2; u <= 2.1; u += 0.45) {
        for (let v = -3.8; v <= 3.8; v += 0.5) {
          const av = Math.abs(v);
          const gCol = av >= 2.8 ? '#adb4c4' : av >= 1.4 ? '#686e7c' : '#3a3f4d';
          putW(pt(u, v)[0], pt(u, v)[1], gCol);
        }
      }
      putW(pt(1.7, 0)[0], pt(1.7, 0)[1], '#dce1eb');

      const colFullerDark = isSlashFlash ? '#686e7c' : '#2b2e36';
      const colFullerMid  = isSlashFlash ? '#8a91a1' : '#3d414b';
      const colBevelLo    = isSlashFlash ? '#b8bfd0' : '#686e7c';
      const colBevelHi    = isSlashFlash ? '#dce1eb' : '#8a91a1';
      const colEdge       = isSlashFlash ? '#ffffff' : '#dce1eb';
      const colEdgeBright = '#eef1f6';

      // 3) 门板级超宽重铁巨刃 (u = 2.2 .. 24.5，主体宽达 v = -3.10 .. +3.10 即 6.5~7px 宽，前段 u = 19.5 .. 24.5 收束为重型阔菱尖头)
      for (let u = 2.2; u <= 24.5; u += 0.45) {
        const isRicasso = u <= 4.5;
        const taper = u <= 19.5 ? 1.0 : Math.max(0.08, 1.0 - Math.pow((u - 19.5) / 5.0, 1.22));
        const halfW = 3.10 * taper;
        for (let v = -halfW; v <= halfW + 0.01; v += 0.45) {
          const av = Math.abs(v);
          const distEdge = halfW - av;
          let col;
          if (isRicasso) {
            // 护手前方的厚重暗铁剑根护套 (Ricasso Collar) + 中轴铆钉
            col = av <= 0.5 && Math.abs(u - 3.3) < 0.45 ? '#dce1eb' : distEdge <= 0.65 ? '#686e7c' : '#3a3f4d';
          } else if (u >= 22.4) {
            col = distEdge <= 0.65 ? '#ffffff' : colEdgeBright;
          } else if (distEdge <= 0.75) {
            // 外侧双面寒铁宽刃口
            col = v >= 0 ? colEdgeBright : colEdge;
          } else if (av <= 0.65 && u <= 18.8) {
            // 中轴深铁宽血槽 (Central Fuller)
            col = v < 0 ? colFullerDark : colFullerMid;
          } else {
            // 两侧厚铁斜面剑脊 (Heavy Forged Bevel Plates)
            col = v >= 0 ? colBevelHi : colBevelLo;
          }
          const pB = pt(u, v);
          putW(pB[0], pB[1], col);
        }
      }
      putW(pTip[0], pTip[1], '#ffffff');

      // 霸体蓄力聚能寒芒：紧贴巨剑宽刃四周迸发重铁气浪粒子
      if (wp.chargeLv > 0 && wp.slashArc < 0) {
        const stride = wp.chargeLv >= 2 ? 2.2 : 3.4;
        const phase = Math.round(wp.p * 8) % 2;
        for (let u = 3.5; u <= 19.5; u += stride) {
          const side = ((Math.round(u) + phase) % 2 === 0 ? 1 : -1) * 2.8;
          const gp = pt(u, side);
          putW(gp[0], gp[1], wp.chargeLv >= 2 ? '#ffffff' : '#b8bfd0');
        }
      }

      // 当第2段崩地重砸触地停顿时 (gunAng <= 12°)，在地面巨剑周围绘制裂地金属压痕高光
      if (!po.v34 && wp.gunAng >= 0 && wp.gunAng <= 12) {
        for (let dx = 0; dx <= 8; dx++) {
          putW(hx + dx + 1, 75, dx <= 5 ? '#eef1f6' : '#8a91a1');
        }
      }

      if (wp.idleGlint >= 0) {
        const gu = 3.2 + wp.idleGlint * 16.0;
        const gp = pt(gu, 0.8);
        recolor(gWep, gp[0], gp[1], '#ffffff');
      }
      muzzle = { x: Math.round(pTip[0]), y: Math.round(Math.min(75, pTip[1])), ux, uy };
    } else if (isBlade) {
      // 先画紧贴剑身后方的纯白刀光残影扇面，再画对称双刃尖头长剑在最前缘
      drawSlashTrail(gWep, hx, hyW, wp);

      // 对称双刃尖头铁质长剑（全长至菱形尖头 13.0px）：
      // 1) 对称剑首配重球 (Pommel #686e7c) + 深炭剑柄 (Grip #2b2e36) + 上下严格对称的十字宽护手 (Crossguard v=±2.0 #4a4f5c)
      const isSlashFlash = wp.trailFrom != null && Math.abs(wp.gunAng - wp.trailFrom) >= 60;
      const pPom = pt(-2.0, 0), pHilt = pt(1.0, 0), pTip = pt(13.0, 0);
      const pG1 = pt(1.5, 2.0), pG2 = pt(1.5, -2.0);
      line(gWep, pPom[0], pPom[1], pHilt[0], pHilt[1], '#2b2e36', 1);
      put(gWep, pPom[0], pPom[1], '#686e7c');
      line(gWep, pG1[0], pG1[1], pG2[0], pG2[1], '#4a4f5c', 1);
      put(gWep, pt(1.5, 0)[0], pt(1.5, 0)[1], '#7d8494');

      // 2) 上下完全对称开刃的直剑剑身 (v = ±1.0 同色冷白铁刃 #dce1eb) + 中轴暗铁血槽剑脊 (v = 0 #4e5463 / #8a91a1) + 对称收尖剑头 (u=12..13, v=0)
      const colCore = isSlashFlash ? '#dce1eb' : (wp.chargeLv >= 2 ? '#7d8494' : '#4e5463');
      const colBody = isSlashFlash ? '#f2f4f8' : (wp.chargeLv >= 1 ? '#b8bfd0' : '#8a91a1');
      const colEdge = '#dce1eb';
      const colTip = '#f2f4f8';
      // 上下对称双刃 (u = 2.0 .. 11.0, v = ±1.0)
      line(gWep, pt(2.0, -1.0)[0], pt(2.0, -1.0)[1], pt(11.0, -1.0)[0], pt(11.0, -1.0)[1], colEdge, 1);
      line(gWep, pt(2.0,  1.0)[0], pt(2.0,  1.0)[1], pt(11.0,  1.0)[0], pt(11.0,  1.0)[1], colEdge, 1);
      // 中轴血槽与剑脊 (u = 2.0 .. 11.0, v = 0)
      line(gWep, pt(2.0, 0)[0], pt(2.0, 0)[1], pt(8.0, 0)[0], pt(8.0, 0)[1], colCore, 1);
      line(gWep, pt(8.0, 0)[0], pt(8.0, 0)[1], pt(11.0, 0)[0], pt(11.0, 0)[1], colBody, 1);
      // 对称收拢尖头部：从 3px 宽双刃对称收束至中轴 u=12.0 (#dce1eb) 与 u=13.0 (#f2f4f8) 锐利剑尖
      put(gWep, pt(12.0, 0)[0], pt(12.0, 0)[1], colEdge);
      put(gWep, pTip[0], pTip[1], colTip);

      // 45° 持剑待机专属剑脊冷光：剑身像素完全刚体锁定，仅在已有剑身像素上改变一粒冷白高光颜色
      if (wp.idleGlint >= 0) {
        const gu = 2.6 + wp.idleGlint * 9.0;
        const gp = pt(gu, 0);
        recolor(gWep, gp[0], gp[1], '#f2f4f8');
      }

      // 蓄力剑气聚能寒芒：紧贴对称铁剑两侧流动的冷白/铁灰剑芒
      if (wp.chargeLv > 0 && wp.slashArc < 0) {
        const stride = wp.chargeLv >= 2 ? 1.8 : 2.8;
        const phase = Math.round(wp.p * 8) % 2;
        for (let u = 2.6; u <= 12.0; u += stride) {
          const side = ((Math.round(u) + phase) % 2 === 0 ? 1 : -1) * 1.25;
          const gp = pt(u, side);
          put(gWep, gp[0], gp[1], wp.chargeLv >= 2 ? '#eef1f6' : '#9aa1b0');
        }
      }

      muzzle = { x: Math.round(pTip[0]), y: Math.round(pTip[1]), ux, uy };
    } else {
      // 脉冲手枪：握把、枪身下机匣、可动滑套、能量准星、掉落/锁定弹匣、枪口火焰与抛壳
      const g0 = pt(0, 0), g1 = pt(-0.6, -1.3);
      line(gWep, g0[0], g0[1], g1[0], g1[1], '#2b303c', 1);
      const r0 = pt(-0.5, 0.6), r1 = pt(3.8, 0.6);
      line(gWep, r0[0], r0[1], r1[0], r1[1], '#495264', 1);
      const sb = wp.slideBack * 1.1;
      const s0 = pt(-0.8 - sb, 1.3), s1 = pt(4.6 - sb * 0.3, 1.3);
      line(gWep, s0[0], s0[1], s1[0], s1[1], '#9ba8bc', 1);
      const h0 = pt(0 - sb, 1.8), h1 = pt(3.6 - sb * 0.3, 1.8);
      line(gWep, h0[0], h0[1], h1[0], h1[1], '#d5e0ee', 1);
      const core = pt(1.6 - sb * 0.5, 1.3);
      const coreCol = wp.slideBack
        ? '#ff9e44'
        : (wp.idleGlint >= 0.45 && wp.idleGlint <= 0.75)
        ? '#ffffff'
        : '#6be6ff';
      put(gWep, core[0], core[1], coreCol);
      const mz = pt(4.9, 1.2);
      put(gWep, mz[0], mz[1], '#2b303c');
      muzzle = { x: Math.round(mz[0] + ux), y: Math.round(mz[1] + uy), ux, uy };

      if (wp.magDrop > 0) {
        const md = pt(-0.4, -1.2);
        put(gWep, md[0], md[1] + wp.magDrop, '#3a4150');
        put(gWep, md[0], md[1] + wp.magDrop - 1, '#ef7b3a');
      }
      if (wp.magLockGlow) {
        const mg = pt(0, -0.5);
        put(gWep, mg[0], mg[1], '#96ebff');
      }
      if (wp.rackGlint) {
        const rg = pt(0.5, 2.2);
        put(gWep, rg[0], rg[1], '#ffd257');
      }
      if (wp.flash > 0) {
        const f1 = pt(5.8, 1.2), f2 = pt(7.2, 1.2), f3 = pt(8.4, 1.2);
        const fU = pt(6.4, 2.3), fD = pt(6.4, 0.1);
        put(gWep, f1[0], f1[1], '#ffffff');
        put(gWep, f2[0], f2[1], '#fff19e');
        if (wp.flash > 1) {
          put(gWep, f3[0], f3[1], '#ff8e36');
          put(gWep, fU[0], fU[1], '#ffc44d');
          put(gWep, fD[0], fD[1], '#ffc44d');
        }
      }
      if (wp.casing >= 0) {
        const ej = pt(1.0, 2.2);
        const cx = ej[0] - ux * (1 + wp.casing * 4.5), cy = ej[1] - 2.2 * Math.sin(wp.casing * Math.PI) + wp.casing * 2.5;
        put(gWep, cx, cy, '#f2c654');
      }
    }

    // 3. 前臂图层 (frontArm)：画在武器握把外侧，呈现手掌握枪/握剑与套装袖长包裹感
    drawArm2(gFront, AN, sxN, sy, c.armN, sleeveThick(look, true, !!po.v34), look.sleeve);
    return { muzzle, shoulder: { x: sxN, y: sy }, wp };
  }

  function charLayers(spec, po, hy, phi, opts) {
    const backArm = mkG(), body = mkG(), weapon = mkG(), frontArm = mkG(), fx = mkG(), detachedFX = mkG(), composite = mkG();
    const hasWep = !!(opts && opts.weapon && opts.weapon.id && opts.weapon.id !== 'none' && !phi && !(po && po.inFlip));
    const includeFx = !(opts && opts.noFxLayer);
    const includeDetachedFX = !!(opts && opts.includeDetachedFX);
    if (!hasWep) {
      drawCharacter(body, spec, po, hy + GOFF, opts);
      drawAlienFXLayer(fx, spec, po, hy + GOFF, opts);
      let out = body;
      if (phi) {
        const o = mkG(), cc = Math.cos(rad(phi)), ss = Math.sin(rad(phi)), cx = 17.5 + GX, cy = hy + GOFF - 4;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy, sx = Math.floor(cx + dx * cc + dy * ss), sy = Math.floor(cy - dx * ss + dy * cc);
          if (sx >= 0 && sy >= 0 && sx < GW && sy < GH && body[sy][sx]) o[y][x] = body[sy][sx];
        }
        for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
          if (!o[y][x] && ((o[y][x - 1] && o[y][x + 1] && (o[y - 1][x] || o[y + 1][x])) || (o[y - 1][x] && o[y + 1][x] && (o[y][x - 1] || o[y][x + 1])))) {
            o[y][x] = o[y][x - 1] || o[y - 1][x];
          }
        }
        out = o;
      }
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        if (out[y][x]) composite[y][x] = out[y][x];
        else if (includeFx && fx[y][x]) composite[y][x] = fx[y][x];
      }
      return { backArm, body: out, weapon, frontArm, fx, alienFX: fx, detachedFX, composite, muzzle: null, shoulder: { x: 16, y: hy + GOFF - 6 }, decoupled: false };
    }

    const meleeBody = computeMeleeBodyPose(po, opts.weapon);
    const activePo = meleeBody.po;
    const activeHy = gHy(spec.build, norm(activePo)) - meleeBody.hopY;
    drawCharacter(body, spec, activePo, activeHy + GOFF, Object.assign({}, opts, { noArms: true }));
    drawAlienFXLayer(fx, spec, activePo, activeHy + GOFF, opts);

    const meta = drawWeaponLayers(backArm, weapon, frontArm, spec, activePo, activeHy + GOFF, opts);
    // 若长刀右键秘技处于序列帧环绕刀光阶段 (orbitFXPhase >= 0)，将其绘制在独立的 detachedFX 特效图层上（正对人物正前方胸腰高度，不直接贴死在 weapon 图层上，不随人物世界移动！）
    if (meta.wp && meta.wp.orbitFXPhase != null && meta.wp.orbitFXPhase >= 0) {
      drawKatanaOrbitFX(detachedFX, 16, activeHy + GOFF - 4, meta.wp.orbitFXPhase, meta.wp.aim);
    }
    const stack = includeFx
      ? (includeDetachedFX ? [fx, backArm, body, weapon, frontArm, detachedFX] : [fx, backArm, body, weapon, frontArm])
      : (includeDetachedFX ? [backArm, body, weapon, frontArm, detachedFX] : [backArm, body, weapon, frontArm]);
    for (const layer of stack) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (layer[y][x]) composite[y][x] = layer[y][x];
    }
    // 当大剑处于肩扛姿态 (shoulderCarry) 时，巨剑斜搭在角色肩膀后上方，确保角色头部与面部 (y < shoulderY) 不被巨剑剑根遮挡，呈现自然的「扛在肩上、剑身斜探脑后」立体层次！
    if (meta.wp && meta.wp.shoulderCarry) {
      const headCutY = activeHy + GOFF - 6 + (activePo.bob || 0);
      for (let y = 0; y < headCutY; y++) {
        for (let x = 0; x < GW; x++) {
          if (body[y][x]) composite[y][x] = body[y][x];
        }
      }
    }
    if (spec.species === 'cathode') {
      const cv = resolveCathodeStyle(spec);
      const ub = activePo.bob || 0, L = activePo.v34 ? 0 : (activePo.lean || 0);
      const ledY = activeHy + GOFF - 4 + ub;
      const shf = activePo.v34 ? 0 : Math.round(L * (activeHy + GOFF - 3 - ledY) / 4);
      put(composite, 15 + shf, ledY, cv.ledCol || '#6be6ff');
    }
    return { backArm, body, weapon, frontArm, fx, alienFX: fx, detachedFX, composite, muzzle: meta.muzzle, shoulder: meta.shoulder, wp: meta.wp, decoupled: true };
  }

  function charGrid(spec, po, hy, phi, opts) {
    return charLayers(spec, po, hy, phi, opts).composite;
  }

  /* ---------- 姿势库 ---------- */
  const norm = po => Object.assign({ head: [0, 0], lean: 0, bob: 0, tail: [28, 58] }, po);
  const mixArr = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function blend(a, b, t) {
    a = norm(a); b = norm(b);
    const o = {};
    for (const k of ['nl', 'fl', 'na', 'fa', 'tail', 'head']) o[k] = mixArr(a[k], b[k], t);
    o.lean = Math.round(a.lean + (b.lean - a.lean) * t); o.bob = Math.round(a.bob + (b.bob - a.bob) * t);
    if (a.hy != null && b.hy != null) o.hy = Math.round(a.hy + (b.hy - a.hy) * t);
    if (a.inFlip || b.inFlip) o.inFlip = true;
    if (a.inKick || b.inKick) o.inKick = true;
    if (a.behindBack || b.behindBack) o.behindBack = true;
    if (b.locoMode || a.locoMode) o.locoMode = b.locoMode || a.locoMode;
    if (b.locoFrame != null || a.locoFrame != null) o.locoFrame = b.locoFrame != null ? b.locoFrame : a.locoFrame;
    if (b.airV != null || a.airV != null) o.airV = b.airV != null ? b.airV : a.airV;
    o.blink = b.blink; return o;
  }
  function walkBase(i, sw) {
    const p = i / 8 * Math.PI * 2, q = p + Math.PI, nth = 30 * Math.sin(p), fth = 30 * Math.sin(q);
    const nb = 8 + 50 * Math.max(0, Math.cos(p)), fb = 8 + 50 * Math.max(0, Math.cos(q));
    const nu = -30 * Math.sin(p) * sw, fu = -30 * Math.sin(q) * sw;
    return norm({ locoMode: 'walk', locoFrame: i, nl: [nth, nth - nb], fl: [fth, fth - fb], na: [nu, nu + (22 + 14 * Math.max(0, -Math.sin(p))) * sw], fa: [fu, fu + (22 + 14 * Math.max(0, -Math.sin(q))) * sw],
      tail: [28 + 14 * Math.sin(p - 0.5), 58 + 14 * Math.sin(p - 0.5) + 14 * Math.sin(p - 1.5)] });
  }
  /* 持武瞄准前方、人物向后倒退时的专属「后退走 (walkBack)」与「后退跑 (runBack)」8 帧动画：
   * 区别于向前走/跑（前倾 + 后踢小腿 + 从后往前迈步），后退动作保持上身直立或微后仰稳住重心、目光锁定前方，
   * 前脚撑地向后推身体，随后前膝微提将腿向身后撤收，脚尖向臀后探出触地承重，支撑腿随身体后移从后侧滑向前侧。 */
  const WBLEG = [
    [26, -10],   // 0: 前脚撑地向后蹬推身体
    [20, -40],   // 1: 前脚离地、屈膝向后收腿
    [2,  -44],   // 2: 摆动腿掠过髋部下方向身后撤
    [-18, -28],  // 3: 脚尖向身后探出准备触地
    [-24, -18],  // 4: 后脚在臀后稳稳落步承重
    [-10, -14],  // 5: 身体后移越过支撑腿
    [8,  -12],   // 6: 支撑腿相对髋部移至前下方
    [20, -10],   // 7: 准备下一轮前脚向后蹬推
  ];
  function walkBackBase(i, sw) {
    const p = i / 8 * Math.PI * 2, q = p + Math.PI;
    const nu = 22 * Math.sin(p) * sw, fu = 22 * Math.sin(q) * sw;
    return norm({
      locoMode: 'walkBack',
      locoFrame: i,
      nl: WBLEG[i],
      fl: WBLEG[(i + 4) % 8],
      na: [nu, nu + 20 * sw],
      fa: [fu, fu + 20 * sw],
      lean: 0,
      bob: (i === 1 || i === 5) ? 1 : 0,
      head: [1, 0],
      tail: [38 + 8 * Math.sin(p), 66 + 10 * Math.sin(p - 0.6)],
    });
  }
  const RL = [[30, 22], [32, -55], [-5, -12], [-30, -40], [-25, -95], [5, -100], [40, -60], [55, 10]];
  function runBase(i) {
    const sn = Math.sin(2 * Math.PI * (i - 1.5) / 8), sf = Math.sin(2 * Math.PI * (i + 4 - 1.5 - 0.4) / 8);
    const un = 5 + 50 * sn, uf = 5 + 46 * sf, p = i / 8 * Math.PI * 2, fl = (i === 3 || i === 7) ? 6 : 0, a1 = 8 + 10 * Math.sin(p - 0.5) - fl;
    return norm({ locoMode: 'run', locoFrame: i, nl: RL[i], fl: RL[(i + 4) % 8], na: [un, un + 70 + 25 * sn], fa: [uf, uf + 68 + 22 * sf], tail: [a1, a1 + 14 + 10 * Math.sin(p - 1.5)], lean: 1 });
  }
  const RBLEG = [
    [34, -14],   // 0: 前脚全力向后蹬地推离
    [24, -52],   // 1: 前腿折叠屈膝快速向后抽回
    [-4, -50],   // 2: 悬空腿高速向身后摆动
    [-28, -32],  // 3: 脚掌大幅向身后远端探出
    [-26, -24],  // 4: 后脚在身后触地缓冲
    [-10, -22],  // 5: 重心急退越过支撑腿
    [12, -18],   // 6: 支撑腿转入前侧持续后推
    [26, -14],   // 7: 前脚蓄势准备再次向后蹬离
  ];
  function runBackBase(i) {
    const p = i / 8 * Math.PI * 2, sn_ = Math.sin(p), sf_ = Math.sin(p + Math.PI);
    const un = -10 + 36 * sn_, uf = -10 + 34 * sf_;
    return norm({
      locoMode: 'runBack',
      locoFrame: i,
      nl: RBLEG[i],
      fl: RBLEG[(i + 4) % 8],
      na: [un, un + 55],
      fa: [uf, uf + 52],
      lean: -1,
      bob: (i === 0 || i === 4) ? 1 : 0,
      head: [1, 0],
      tail: [46 + 10 * Math.sin(p), 74 + 12 * Math.sin(p - 0.5)],
    });
  }
  const ARM = { cross: [[30, -85], [30, -85]], chin: [[58, 172], [25, -80]], hips: [[30, -70], [30, -70]], hug: [[10, -100], [10, -100]], flask: [[82, 128], null] };
  const P = {
    skid: { nl: [38, 28], fl: [-18, -40], na: [70, 110], fa: [-60, -100], tail: [50, 75], lean: -1 },
    crouch: { nl: [34, -38], fl: [24, -44], na: [-35, -12], fa: [-18, -4], tail: [35, 62], lean: 1, bob: 1 },
    spring: { nl: [16, -22], fl: [10, -24], na: [12, 24], fa: [-12, -4], tail: [40, 65] },
    land: { nl: [38, -42], fl: [28, -46], na: [36, 62], fa: [-24, -8], tail: [50, 75], lean: 1, bob: 1 },
    tuck: { nl: [125, -50], fl: [120, -55], na: [65, 15], fa: [55, 10], tail: [70, 88], lean: 2, bob: 2, head: [1, 2], hy: 35, inFlip: true },
    uncurl: { nl: [28, -34], fl: [6, -24], na: [82, 98], fa: [-80, -94], tail: [22, 44], lean: 1, bob: 1, head: [0, 1], hy: 35, inFlip: true }
  };
  const FLIP_STEPS = [30, 80, 130, 180, 230, 280, 325, 0];
  const SLEG = [[36, 26], [30, -62], [-28, -22], [-45, -80], [-20, -110], [30, -75], [70, -20], [62, 15]];
  function sprintBase(i) {                         // 冲刺：身体更前倾，摆臂和步幅更大
    const sn_ = Math.sin(2 * Math.PI * (i - 1.5) / 8), sf = Math.sin(2 * Math.PI * (i + 4 - 1.5 - 0.4) / 8);
    const un = 65 * sn_, uf = 60 * sf, p = i / 8 * Math.PI * 2, fl = (i === 3 || i === 7) ? 5 : 0, a1 = 3 + 6 * Math.sin(p - 0.5) - fl;
    return norm({ locoMode: 'sprint', locoFrame: i, nl: SLEG[i], fl: SLEG[(i + 4) % 8], na: [un, un + 80 + 20 * sn_], fa: [uf, uf + 78 + 18 * sf], tail: [a1, a1 + 8 + 8 * Math.sin(p - 1.5)], lean: 2 });
  }
  const CWLEG = [[30, -50], [36, -34], [38, -26], [34, -34], [26, -38], [16, -46], [8, -50], [18, -56]];
  function crouchWalkBase(i) {                     // 蹲行：压低重心、膝盖收在胸前下方、小腿向后自然折叠交替猫步
    const p = i / 8 * Math.PI * 2, s_ = Math.sin(p);
    return norm({ locoMode: 'cwalk', locoFrame: i, nl: CWLEG[i], fl: CWLEG[(i + 4) % 8], na: [16 - 12 * s_, 46 - 12 * s_], fa: [12 + 12 * s_, 40 + 10 * s_], tail: [38 + 5 * Math.sin(p - 0.5), 64 + 6 * Math.sin(p - 1)], lean: 1, bob: 1, head: [0, 1] });
  }
  function crouchWalkBackBase(i) {                 // 蹲姿后退：猫步逆序向后撤步，上身稳住目光朝前
    const ri = (8 - (i % 8)) % 8, p = i / 8 * Math.PI * 2, s_ = Math.sin(p);
    return norm({ locoMode: 'cwalkBack', locoFrame: i, nl: CWLEG[ri], fl: CWLEG[(ri + 4) % 8], na: [14 + 10 * s_, 44 + 10 * s_], fa: [10 - 10 * s_, 38 - 10 * s_], tail: [44 + 5 * Math.sin(p), 70 + 6 * Math.sin(p - 0.8)], lean: 0, bob: 1, head: [1, 1] });
  }
  const PX = {
    crouchIdle: { nl: [34, -38], fl: [24, -44], na: [18, 48], fa: [12, 40], tail: [38, 64], lean: 1, bob: 1, head: [0, 1] },
    blinkWind: { nl: [42, -52], fl: [28, -58], na: [-75, -35], fa: [-55, -10], tail: [10, 25], lean: 2, bob: 1 },
    blinkLand: { nl: [38, -28], fl: [-36, -48], na: [-62, -20], fa: [52, 95], tail: [5, 15], lean: 2, bob: 1 }
  };
  const KICK = [   // 太空服二段跳：上升段手臂向下，接近顶点时平滑抬起衔接空中下落
    [0,    { nl: [20, -42], fl: [4, -36],   na: [20, 36],  fa: [-18, -8],   tail: [32, 56], lean: 1, bob: 1, head: [0, 1], inKick: true }],
    [0.09, { nl: [22, -52], fl: [-14, -28], na: [12, 24],  fa: [-22, -12],  tail: [10, 24], lean: 1, bob: 0, head: [0, 0], inKick: true }],
    [0.2,  { nl: [18, -34], fl: [-10, -22], na: [34, 48],  fa: [-32, -22],  tail: [6, 18],  lean: 1, bob: 0, head: [0, 0], inKick: true }],
    [0.3,  { nl: [16, -22], fl: [-6, -18],  na: [94, 108], fa: [-94, -106], tail: [14, 32], lean: 0, bob: 0, head: [0, 0], inKick: true }]];
  function kickPose(t) {
    let po;
    for (let i = 0; i < KICK.length - 1; i++) if (t <= KICK[i + 1][0]) { po = blend(KICK[i][1], KICK[i + 1][1], (t - KICK[i][0]) / (KICK[i + 1][0] - KICK[i][0])); break; }
    if (!po) po = norm(KICK[KICK.length - 1][1]);
    po.inKick = true;
    return po;
  }
  const AK = [     // 跳跃空中：上升时(v>0)双臂向下；下落时(v<=0)双臂偏上，且随下落时间与水平夹角单调增大
    [2.5,  { nl: [-6, -14], fl: [-12, -20], na: [12, 24],   fa: [-12, -4],    tail: [55, 80] }],
    [1.6,  { nl: [8, -20],  fl: [-14, -24], na: [16, 30],   fa: [-16, -8],    tail: [45, 70] }],
    [0.8,  { nl: [14, -22], fl: [-10, -20], na: [24, 40],   fa: [-22, -12],   tail: [30, 55] }],
    [0.4,  { nl: [15, -22], fl: [-8, -19],  na: [34, 48],   fa: [-32, -22],   tail: [22, 44] }],
    [0.0,  { nl: [16, -22], fl: [-6, -18],  na: [94, 108],  fa: [-94, -106],  tail: [14, 32] }],
    [-0.8, { nl: [14, -18], fl: [-6, -16],  na: [106, 122], fa: [-104, -118], tail: [-10, 10] }],
    [-1.6, { nl: [10, -10], fl: [-6, -12],  na: [118, 136], fa: [-116, -132], tail: [-28, -8] }],
    [-2.6, { nl: [8, -4],   fl: [-8, -10],  na: [130, 150], fa: [-128, -146], tail: [-42, -20] }]
  ];
  function airPose(v) {
    let po;
    if (v >= AK[0][0]) po = norm(AK[0][1]);
    else {
      for (let i = 0; i < AK.length - 1; i++) if (v <= AK[i][0] && v > AK[i + 1][0]) { po = blend(AK[i][1], AK[i + 1][1], (AK[i][0] - v) / (AK[i][0] - AK[i + 1][0])); break; }
      if (!po) po = norm(AK[AK.length - 1][1]);
    }
    po.isAir = true;
    po.locoMode = 'air';
    po.airV = v;
    return po;
  }

  /* ---------- 16 种日常自然站立待机姿势（严格参照《游戏角色日常待机（Idle）姿势参考表》设计，8 帧平滑过渡无跳帧）----------
   * 设计原则：
   * 1. 全部采用自然、扎实的日常站立姿势（重心偏移 Weight Shift：单腿稳固承重，另一腿自然微屈放松），绝无猎奇深蹲、高抬鹤立或大跨步跳跃；
   * 2. 8 帧循环 (t = 0.0..2.8, 周期 3.2s) 采用逐帧平滑插值过渡（相邻帧角度变化仅 2°~4°），支撑腿始终锚定不乱跳，彻底消除左右腿瞬移割裂感；
   * 3. 覆盖参考表 16 种经典日常站姿：
   *    [01] 经典自然垂落 (free)       [02] 单手叉腰 (hips)          [03] 双手抱胸 (cross)         [04] 单手插兜 (pockets)
   *    [05] 背手站立 (backhands)      [06] 腹前交握 (salute)        [07] 拇指勾腰带 (beltHook)    [08] 交叉腿斜靠 (crossLeg)
   *    [10] 挽臂托肘 (hug)            [11] 抚摸下巴 (think)         [12] 整理衣领 (collarFix)     [14] 搭肩揉脖子 (stretch)
   *    [15] 搓手摩挲 (rubHands)       [17] 摸后脑勺 (headScratch)   [18] 脚尖点地 (toeTap)        [20] 搭腕看表 (lookout) */
  const ph = (t, c) => ((t % c) + c) % c;
  const sn = Math.sin;
  const n34 = o => Object.assign({ v34: true, head: [0, 0], bob: 0, lean: 0, tail: [72, 86] }, o);

  // 8 帧平滑插值求值器：保证 F1..F8 每一帧平滑衔接，绝无左右腿互跳
  function evalIdle8(t, kf8, talk, is34, extra) {
    const u = (ph(t, 3.2) / 3.2) * 8;
    const i0 = Math.floor(u) % 8;
    const i1 = (i0 + 1) % 8;
    const f = u - Math.floor(u);
    const a = kf8[i0], b = kf8[i1];
    const lp = (x, y) => x + (y - x) * f;
    const lp2 = (p, q) => [lp(p[0], q[0]), lp(p[1], q[1])];
    const talkNod = talk && sn(t * 6.5) > 0.55 ? 1 : 0;
    const headBase = a.head || [0, 0];
    const out = {
      nl: lp2(a.nl, b.nl),
      fl: lp2(a.fl, b.fl),
      na: lp2(a.na, b.na),
      fa: lp2(a.fa, b.fa),
      tail: is34
        ? [72 + 3 * sn(t * 1.6), 86 + 4 * sn(t * 1.9)]
        : [26 + 3 * sn(t * 1.6), 52 + 4 * sn(t * 1.9)],
      bob: a.bob != null ? a.bob : 0,
      lean: a.lean != null ? a.lean : 0,
      head: [headBase[0], headBase[1] || talkNod],
    };
    if (extra && extra.behindBack) out.behindBack = true;
    return is34 ? n34(out) : norm(out);
  }

  // ==================== 侧面待机动作表 (IDLES) ====================
  const SIDE_IDLE_KF = {
    // [01] 经典自然垂落 (free)：右腿站直承重，左腿膝盖微屈放松，双手自然垂于体侧随呼吸轻微起伏
    free: [
      { nl: [8, -4],  fl: [-4, -2], na: [5, 12],  fa: [-4, -2], bob: 0,  head: [0, 0] },
      { nl: [10, -6], fl: [-4, -2], na: [7, 15],  fa: [-5, -3], bob: -1, head: [0, 0] },
      { nl: [12, -8], fl: [-5, -2], na: [9, 17],  fa: [-6, -4], bob: -1, head: [0, 0] },
      { nl: [14, -9], fl: [-5, -3], na: [10, 18], fa: [-6, -4], bob: -1, head: [0, 0] },
      { nl: [12, -8], fl: [-5, -2], na: [8, 16],  fa: [-5, -3], bob: -1, head: [0, 0] },
      { nl: [10, -6], fl: [-4, -2], na: [6, 14],  fa: [-4, -2], bob: 0,  head: [0, 0] },
      { nl: [7, -3],  fl: [-3, -2], na: [4, 11],  fa: [-3, -1], bob: 0,  head: [0, 0] },
      { nl: [7, -4],  fl: [-4, -2], na: [4, 11],  fa: [-3, -2], bob: 0,  head: [0, 0] },
    ],
    // [03] 双手抱胸 (cross)：双脚自然平行略分，膝盖直而不僵，双臂在胸前沉稳交叉抱胸，随呼吸微调重心
    cross: [
      { nl: [10, -4], fl: [-6, -2], na: [30, -80], fa: [26, -84], bob: 0,  head: [0, 0] },
      { nl: [12, -5], fl: [-6, -2], na: [31, -80], fa: [27, -84], bob: 0,  head: [0, 0] },
      { nl: [14, -6], fl: [-7, -3], na: [32, -78], fa: [28, -82], bob: -1, head: [0, 0] },
      { nl: [15, -7], fl: [-7, -3], na: [33, -78], fa: [28, -82], bob: -1, head: [0, 0] },
      { nl: [13, -6], fl: [-7, -3], na: [32, -79], fa: [27, -83], bob: -1, head: [0, 0] },
      { nl: [11, -5], fl: [-6, -2], na: [31, -80], fa: [26, -84], bob: 0,  head: [0, 0] },
      { nl: [9, -3],  fl: [-5, -2], na: [29, -81], fa: [25, -85], bob: 0,  head: [0, 0] },
      { nl: [9, -4],  fl: [-6, -2], na: [30, -80], fa: [26, -84], bob: 0,  head: [0, 0] },
    ],
    // [11] 抚摸下巴 (think)：重心稳落左后腿，前腿微屈虚点地面，一手横胸托肘、另一手轻摩下巴思考
    think: [
      { nl: [14, -10], fl: [-5, -3], na: [56, 168], fa: [16, 86], bob: 0,  head: [0, 1] },
      { nl: [16, -12], fl: [-5, -3], na: [58, 165], fa: [17, 86], bob: 0,  head: [0, 1] },
      { nl: [18, -14], fl: [-6, -4], na: [60, 162], fa: [18, 88], bob: -1, head: [0, 1] },
      { nl: [19, -15], fl: [-6, -4], na: [62, 160], fa: [18, 88], bob: -1, head: [0, 1] },
      { nl: [17, -13], fl: [-6, -4], na: [59, 164], fa: [17, 87], bob: -1, head: [0, 1] },
      { nl: [15, -11], fl: [-5, -3], na: [57, 167], fa: [16, 86], bob: 0,  head: [0, 0] },
      { nl: [13, -9],  fl: [-4, -2], na: [55, 169], fa: [15, 85], bob: 0,  head: [0, 0] },
      { nl: [13, -9],  fl: [-5, -3], na: [55, 168], fa: [16, 86], bob: 0,  head: [0, 1] },
    ],
    // [02] 单手叉腰 (hips)：小幅丁字步，后腿站直承重，前腿自然踩地微松，一手叉在腰胯上、另一手自然垂落
    hips: [
      { nl: [12, -4], fl: [-8, -4], na: [-32, 40], fa: [4, 10],  bob: 0,  head: [0, 0] },
      { nl: [14, -5], fl: [-8, -4], na: [-33, 41], fa: [5, 12],  bob: 0,  head: [0, 0] },
      { nl: [16, -6], fl: [-9, -5], na: [-34, 42], fa: [6, 13],  bob: -1, head: [0, 0] },
      { nl: [17, -7], fl: [-9, -5], na: [-35, 43], fa: [7, 14],  bob: -1, head: [0, 0] },
      { nl: [15, -6], fl: [-9, -5], na: [-34, 42], fa: [6, 13],  bob: -1, head: [0, 0] },
      { nl: [13, -5], fl: [-8, -4], na: [-33, 41], fa: [5, 11],  bob: 0,  head: [0, 0] },
      { nl: [11, -3], fl: [-7, -3], na: [-31, 39], fa: [3, 9],   bob: 0,  head: [0, 0] },
      { nl: [11, -4], fl: [-8, -4], na: [-32, 40], fa: [4, 10],  bob: 0,  head: [0, 0] },
    ],
    // [10] 挽臂托肘 (hug)：双脚靠近，一侧脚踝微向内靠，一臂自然垂落，另一手横过身前轻握其手肘
    hug: [
      { nl: [7, -8],  fl: [-3, -4], na: [14, -96],  fa: [-4, 10], bob: 0,  head: [0, 1] },
      { nl: [9, -10], fl: [-3, -4], na: [15, -98],  fa: [-4, 11], bob: 0,  head: [0, 1] },
      { nl: [11, -11],fl: [-4, -5], na: [16, -100], fa: [-5, 12], bob: -1, head: [0, 1] },
      { nl: [12, -12],fl: [-4, -5], na: [17, -101], fa: [-5, 12], bob: -1, head: [0, 0] },
      { nl: [10, -10],fl: [-4, -5], na: [16, -99],  fa: [-5, 11], bob: 0,  head: [0, 0] },
      { nl: [8, -9],  fl: [-3, -4], na: [15, -97],  fa: [-4, 10], bob: 0,  head: [0, 1] },
      { nl: [6, -7],  fl: [-2, -3], na: [13, -95],  fa: [-3, 9],  bob: 0,  head: [0, 1] },
      { nl: [6, -7],  fl: [-3, -4], na: [14, -96],  fa: [-4, 10], bob: 0,  head: [0, 1] },
    ],
    // [04] 单手插兜 (pockets)：支撑腿站直承重，另一腿向外迈半步膝盖微曲，一手插进裤兜，另一手自然垂放
    pockets: [
      { nl: [13, -6],  fl: [-7, -3], na: [-20, 28], fa: [4, 10],  bob: 0,  head: [0, 0] },
      { nl: [15, -8],  fl: [-7, -3], na: [-21, 29], fa: [6, 12],  bob: 0,  head: [0, 0] },
      { nl: [17, -9],  fl: [-8, -4], na: [-22, 30], fa: [7, 14],  bob: -1, head: [0, 0] },
      { nl: [18, -10], fl: [-8, -4], na: [-22, 30], fa: [8, 15],  bob: -1, head: [0, 0] },
      { nl: [16, -9],  fl: [-8, -4], na: [-21, 29], fa: [7, 13],  bob: -1, head: [0, 0] },
      { nl: [14, -7],  fl: [-7, -3], na: [-20, 28], fa: [5, 11],  bob: 0,  head: [0, 0] },
      { nl: [12, -5],  fl: [-6, -2], na: [-19, 27], fa: [3, 9],   bob: 0,  head: [0, 0] },
      { nl: [12, -6],  fl: [-7, -3], na: [-20, 28], fa: [4, 10],  bob: 0,  head: [0, 0] },
    ],
    // [05] 背手站立 (backhands)：双脚小V字稳立，身姿挺拔，双手背在身后握腕，重心平缓微移
    backhands: [
      { nl: [6, -2],  fl: [-6, -3], na: [-32, -10], fa: [-28, -8],  bob: 0,  head: [0, 0] },
      { nl: [8, -3],  fl: [-6, -3], na: [-33, -11], fa: [-29, -9],  bob: 0,  head: [0, 0] },
      { nl: [10, -4], fl: [-7, -4], na: [-34, -12], fa: [-30, -10], bob: -1, head: [0, 0] },
      { nl: [11, -5], fl: [-7, -4], na: [-35, -12], fa: [-30, -10], bob: -1, head: [0, 0] },
      { nl: [9, -4],  fl: [-7, -4], na: [-34, -11], fa: [-29, -9],  bob: -1, head: [0, 0] },
      { nl: [7, -3],  fl: [-6, -3], na: [-33, -10], fa: [-28, -8],  bob: 0,  head: [0, 0] },
      { nl: [5, -2],  fl: [-5, -2], na: [-31, -9],  fa: [-27, -7],  bob: 0,  head: [0, 0] },
      { nl: [5, -2],  fl: [-6, -3], na: [-32, -10], fa: [-28, -8],  bob: 0,  head: [0, 0] },
    ],
    // [06] 腹前交握 (salute)：双脚并拢或微开，脚跟稳立，双臂自然垂至小腹前、一手轻覆另一手背端庄站立
    salute: [
      { nl: [4, -2], fl: [-3, -2], na: [14, 52], fa: [10, 48], bob: 0,  head: [0, 0] },
      { nl: [5, -3], fl: [-3, -2], na: [15, 54], fa: [11, 50], bob: 0,  head: [0, 0] },
      { nl: [7, -4], fl: [-4, -3], na: [16, 56], fa: [12, 52], bob: -1, head: [0, 0] },
      { nl: [8, -4], fl: [-4, -3], na: [17, 57], fa: [12, 52], bob: -1, head: [0, 0] },
      { nl: [6, -3], fl: [-4, -3], na: [16, 55], fa: [11, 51], bob: -1, head: [0, 0] },
      { nl: [5, -2], fl: [-3, -2], na: [15, 53], fa: [10, 49], bob: 0,  head: [0, 0] },
      { nl: [3, -1], fl: [-2, -1], na: [13, 51], fa: [9, 47],  bob: 0,  head: [0, 0] },
      { nl: [3, -2], fl: [-3, -2], na: [14, 52], fa: [10, 48], bob: 0,  head: [0, 0] },
    ],
    // [14] 搭肩/揉脖子 (stretch)：双脚一前一后自然分开，一手自然下垂，另一手抬起搭在后颈处轻缓放松
    stretch: [
      { nl: [11, -5], fl: [-7, -3], na: [64, 154], fa: [-5, 8],  bob: 0,  head: [0, 0] },
      { nl: [13, -6], fl: [-7, -3], na: [68, 158], fa: [-6, 9],  bob: 0,  head: [0, 0] },
      { nl: [15, -7], fl: [-8, -4], na: [72, 162], fa: [-6, 10], bob: -1, head: [0, 1] },
      { nl: [16, -8], fl: [-8, -4], na: [74, 164], fa: [-7, 10], bob: -1, head: [0, 1] },
      { nl: [14, -7], fl: [-8, -4], na: [70, 160], fa: [-6, 9],  bob: -1, head: [0, 0] },
      { nl: [12, -6], fl: [-7, -3], na: [66, 156], fa: [-5, 8],  bob: 0,  head: [0, 0] },
      { nl: [10, -4], fl: [-6, -2], na: [62, 152], fa: [-4, 7],  bob: 0,  head: [0, 0] },
      { nl: [10, -5], fl: [-7, -3], na: [63, 153], fa: [-5, 8],  bob: 0,  head: [0, 0] },
    ],
    // [20] 搭腕看表 (lookout)：双脚平行稳立，重心偏后腿，前膝微屈半步，一臂曲肘抬至胸前看表，另一手轻搭手腕
    lookout: [
      { nl: [10, -6], fl: [-5, -2], na: [42, 118], fa: [22, 76], bob: 0,  head: [0, 1] },
      { nl: [12, -7], fl: [-5, -2], na: [44, 120], fa: [24, 78], bob: 0,  head: [0, 1] },
      { nl: [14, -8], fl: [-6, -3], na: [46, 122], fa: [25, 80], bob: -1, head: [0, 1] },
      { nl: [15, -9], fl: [-6, -3], na: [48, 124], fa: [26, 82], bob: -1, head: [0, 1] },
      { nl: [13, -8], fl: [-6, -3], na: [45, 121], fa: [24, 79], bob: -1, head: [0, 0] },
      { nl: [11, -7], fl: [-5, -2], na: [43, 119], fa: [23, 77], bob: 0,  head: [0, 0] },
      { nl: [9, -5],  fl: [-4, -2], na: [40, 116], fa: [21, 74], bob: 0,  head: [0, 0] },
      { nl: [9, -5],  fl: [-5, -2], na: [41, 117], fa: [22, 75], bob: 0,  head: [0, 1] },
    ],
    // [07] 拇指勾腰带 (beltHook)：双脚略宽于肩呈自然八字步，膝盖微松，双手拇指勾住腰带两侧休闲站立
    beltHook: [
      { nl: [14, -4], fl: [-10, -4], na: [-24, 34], fa: [-18, 28], bob: 0,  head: [0, 0] },
      { nl: [16, -5], fl: [-10, -4], na: [-25, 35], fa: [-19, 29], bob: 0,  head: [0, 0] },
      { nl: [18, -6], fl: [-11, -5], na: [-26, 36], fa: [-20, 30], bob: -1, head: [0, 0] },
      { nl: [19, -7], fl: [-11, -5], na: [-27, 37], fa: [-20, 30], bob: -1, head: [0, 0] },
      { nl: [17, -6], fl: [-11, -5], na: [-26, 36], fa: [-19, 29], bob: -1, head: [0, 0] },
      { nl: [15, -5], fl: [-10, -4], na: [-25, 35], fa: [-18, 28], bob: 0,  head: [0, 0] },
      { nl: [13, -3], fl: [-9, -3],  na: [-23, 33], fa: [-17, 27], bob: 0,  head: [0, 0] },
      { nl: [13, -4], fl: [-10, -4], na: [-24, 34], fa: [-18, 28], bob: 0,  head: [0, 0] },
    ],
    // [08] 交叉腿斜靠 (crossLeg)：一腿垂直承重，另一腿从前侧小幅交叉、脚尖轻点地面，双手松松环抱
    crossLeg: [
      { nl: [-12, 6],  fl: [6, -2], na: [22, -68], fa: [-14, 24], bob: 0,  head: [0, 0] },
      { nl: [-14, 8],  fl: [6, -2], na: [24, -70], fa: [-15, 25], bob: 0,  head: [0, 0] },
      { nl: [-16, 10], fl: [7, -3], na: [25, -72], fa: [-16, 26], bob: -1, head: [0, 0] },
      { nl: [-17, 11], fl: [7, -3], na: [26, -72], fa: [-16, 26], bob: -1, head: [0, 0] },
      { nl: [-15, 9],  fl: [7, -3], na: [24, -70], fa: [-15, 25], bob: -1, head: [0, 0] },
      { nl: [-13, 7],  fl: [6, -2], na: [23, -69], fa: [-14, 24], bob: 0,  head: [0, 0] },
      { nl: [-11, 5],  fl: [5, -2], na: [21, -67], fa: [-13, 23], bob: 0,  head: [0, 0] },
      { nl: [-11, 6],  fl: [6, -2], na: [22, -68], fa: [-14, 24], bob: 0,  head: [0, 0] },
    ],
    // [12] 整理衣领 (collarFix)：双腿自然并拢微倾，站姿克制端庄，一手轻抬至领口整理衣领，另一手垂放
    collarFix: [
      { nl: [5, -3], fl: [-4, -2], na: [48, 142], fa: [-4, 12], bob: 0,  head: [0, 0] },
      { nl: [7, -4], fl: [-4, -2], na: [52, 146], fa: [-5, 13], bob: 0,  head: [0, 1] },
      { nl: [8, -5], fl: [-5, -3], na: [55, 150], fa: [-5, 14], bob: -1, head: [0, 1] },
      { nl: [9, -6], fl: [-5, -3], na: [56, 152], fa: [-6, 14], bob: -1, head: [0, 1] },
      { nl: [7, -5], fl: [-5, -3], na: [53, 148], fa: [-5, 13], bob: -1, head: [0, 0] },
      { nl: [6, -4], fl: [-4, -2], na: [50, 144], fa: [-4, 12], bob: 0,  head: [0, 0] },
      { nl: [4, -2], fl: [-3, -2], na: [46, 140], fa: [-3, 11], bob: 0,  head: [0, 0] },
      { nl: [4, -3], fl: [-4, -2], na: [47, 141], fa: [-4, 12], bob: 0,  head: [0, 0] },
    ],
    // [15] 搓手/摩挲手指 (rubHands)：双脚与肩同宽稳立，双手抬至胸口下方，双掌轻合缓慢摩挲手指
    rubHands: [
      { nl: [9, -5],  fl: [-5, -3], na: [34, 96],  fa: [28, 88], bob: 0,  head: [0, 0] },
      { nl: [11, -6], fl: [-5, -3], na: [36, 100], fa: [30, 92], bob: 0,  head: [0, 0] },
      { nl: [12, -7], fl: [-6, -4], na: [38, 104], fa: [32, 95], bob: -1, head: [0, 0] },
      { nl: [13, -8], fl: [-6, -4], na: [39, 106], fa: [33, 96], bob: -1, head: [0, 0] },
      { nl: [11, -7], fl: [-6, -4], na: [37, 102], fa: [31, 93], bob: -1, head: [0, 0] },
      { nl: [10, -6], fl: [-5, -3], na: [35, 98],  fa: [29, 90], bob: 0,  head: [0, 0] },
      { nl: [8, -4],  fl: [-4, -2], na: [33, 94],  fa: [27, 86], bob: 0,  head: [0, 0] },
      { nl: [8, -5],  fl: [-5, -3], na: [34, 95],  fa: [28, 87], bob: 0,  head: [0, 0] },
    ],
    // [17] 摸后脑勺/挠头 (headScratch)：双脚一前一后自然站立，前腿微曲，一手自然下垂，另一手抬至脑后轻挠头
    headScratch: [
      { nl: [12, -7],  fl: [-6, -3], na: [78, 166], fa: [-6, 6], bob: 0,  head: [0, 0] },
      { nl: [14, -8],  fl: [-6, -3], na: [82, 170], fa: [-7, 7], bob: 0,  head: [0, 0] },
      { nl: [16, -9],  fl: [-7, -4], na: [85, 173], fa: [-7, 8], bob: -1, head: [0, 0] },
      { nl: [17, -10], fl: [-7, -4], na: [86, 174], fa: [-8, 8], bob: -1, head: [0, 0] },
      { nl: [15, -9],  fl: [-7, -4], na: [83, 171], fa: [-7, 7], bob: -1, head: [0, 0] },
      { nl: [13, -8],  fl: [-6, -3], na: [80, 168], fa: [-6, 6], bob: 0,  head: [0, 0] },
      { nl: [11, -6],  fl: [-5, -2], na: [76, 164], fa: [-5, 5], bob: 0,  head: [0, 0] },
      { nl: [11, -7],  fl: [-6, -3], na: [77, 165], fa: [-6, 6], bob: 0,  head: [0, 0] },
    ],
    // [18] 脚尖点地 (toeTap)：支撑腿站直承重，前腿自然微伸、脚尖轻缓点地，单手插兜另一手自然垂放
    toeTap: [
      { nl: [15, -4], fl: [-5, -2], na: [-18, 26], fa: [5, 12],  bob: 0,  head: [0, 0] },
      { nl: [17, -6], fl: [-5, -2], na: [-19, 27], fa: [6, 13],  bob: 0,  head: [0, 0] },
      { nl: [19, -8], fl: [-6, -3], na: [-20, 28], fa: [7, 14],  bob: -1, head: [0, 0] },
      { nl: [20, -9], fl: [-6, -3], na: [-20, 28], fa: [8, 15],  bob: -1, head: [0, 0] },
      { nl: [18, -7], fl: [-6, -3], na: [-19, 27], fa: [7, 14],  bob: -1, head: [0, 0] },
      { nl: [16, -5], fl: [-5, -2], na: [-18, 26], fa: [6, 13],  bob: 0,  head: [0, 0] },
      { nl: [14, -3], fl: [-4, -2], na: [-17, 25], fa: [4, 11],  bob: 0,  head: [0, 0] },
      { nl: [14, -4], fl: [-5, -2], na: [-18, 26], fa: [5, 12],  bob: 0,  head: [0, 0] },
    ],
  };

  const IDLES = {
    free:        (t, talk) => evalIdle8(t, SIDE_IDLE_KF.free, talk, false),
    cross:       (t, talk) => evalIdle8(t, SIDE_IDLE_KF.cross, talk, false),
    think:       (t, talk) => evalIdle8(t, SIDE_IDLE_KF.think, talk, false),
    hips:        (t, talk) => evalIdle8(t, SIDE_IDLE_KF.hips, talk, false),
    hug:         (t, talk) => evalIdle8(t, SIDE_IDLE_KF.hug, talk, false),
    pockets:     (t, talk) => evalIdle8(t, SIDE_IDLE_KF.pockets, talk, false),
    backhands:   (t, talk) => evalIdle8(t, SIDE_IDLE_KF.backhands, talk, false, { behindBack: true }),
    salute:      (t, talk) => evalIdle8(t, SIDE_IDLE_KF.salute, talk, false),
    stretch:     (t, talk) => evalIdle8(t, SIDE_IDLE_KF.stretch, talk, false),
    lookout:     (t, talk) => evalIdle8(t, SIDE_IDLE_KF.lookout, talk, false),
    beltHook:    (t, talk) => evalIdle8(t, SIDE_IDLE_KF.beltHook, talk, false),
    crossLeg:    (t, talk) => evalIdle8(t, SIDE_IDLE_KF.crossLeg, talk, false),
    collarFix:   (t, talk) => evalIdle8(t, SIDE_IDLE_KF.collarFix, talk, false),
    rubHands:    (t, talk) => evalIdle8(t, SIDE_IDLE_KF.rubHands, talk, false),
    headScratch: (t, talk) => evalIdle8(t, SIDE_IDLE_KF.headScratch, talk, false),
    toeTap:      (t, talk) => evalIdle8(t, SIDE_IDLE_KF.toeTap, talk, false),
    // 健谈（苏专有道具待机）：举着瓶子比划，脚尖弹跳，点头
    talk(t) {
      const s = Math.sin(t * 3.2), bob = Math.sin(t * 6.5) > 0.4 ? -1 : 0;
      return norm({ nl: [3 + (bob ? 0 : 6), bob ? 0 : -8], fl: [-3, -2 - (bob ? 0 : 6)], na: [98 + 18 * s, 142 + 22 * Math.sin(t * 3.2 + 0.8)],
        fa: [45 + 30 * Math.sin(t * 2.4 + 1), 85 + 25 * Math.sin(t * 2.4 + 1.6)], tail: [20 + 10 * Math.sin(t * 3), 45 + 12 * Math.sin(t * 3 + 1)], bob, head: [0, Math.sin(t * 3.2) > 0.7 ? 1 : 0] });
    }
  };

  // ==================== 45° 待机动作表 (IDLES34) ====================
  const V34_IDLE_KF = {
    // [01] 经典自然垂落 (free)：与肩同宽，右腿稳固承重，左腿膝盖微屈放松，双手自然垂于体侧随呼吸轻微起伏
    free: [
      { nl: [-6, -3], fl: [5, 2],  na: [-4, -2], fa: [4, 2],  bob: 0,  head: [0, 0] },
      { nl: [-8, -4], fl: [6, 3],  na: [-5, -2], fa: [5, 3],  bob: -1, head: [0, 0] },
      { nl: [-9, -5], fl: [7, 4],  na: [-6, -3], fa: [6, 3],  bob: -1, head: [0, 0] },
      { nl: [-10,-6], fl: [8, 4],  na: [-6, -3], fa: [6, 4],  bob: -1, head: [0, 0] },
      { nl: [-9, -5], fl: [7, 3],  na: [-5, -2], fa: [5, 3],  bob: -1, head: [0, 0] },
      { nl: [-7, -4], fl: [6, 3],  na: [-4, -2], fa: [4, 2],  bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [4, 2],  na: [-3, -1], fa: [3, 1],  bob: 0,  head: [0, 0] },
      { nl: [-5, -3], fl: [5, 2],  na: [-4, -2], fa: [4, 2],  bob: 0,  head: [0, 0] },
    ],
    // [03] 双手抱胸 (cross)：双脚平行略窄于肩，左腿稳固锚定 (hyGround=34, bob=0)，右腿随呼吸轻微放松，双臂抱胸
    cross: [
      { nl: [-4, -2], fl: [5, 3],  na: [-6, 96], fa: [6, -96], bob: 0, head: [0, 0] },
      { nl: [-4, -2], fl: [7, 4],  na: [-6, 97], fa: [6, -97], bob: 0, head: [0, 0] },
      { nl: [-5, -3], fl: [9, 5],  na: [-7, 98], fa: [7, -98], bob: 0, head: [0, 0] },
      { nl: [-5, -3], fl: [10, 6], na: [-7, 98], fa: [7, -98], bob: 0, head: [0, 0] },
      { nl: [-5, -3], fl: [8, 5],  na: [-6, 97], fa: [6, -97], bob: 0, head: [0, 0] },
      { nl: [-4, -2], fl: [6, 4],  na: [-6, 96], fa: [6, -96], bob: 0, head: [0, 0] },
      { nl: [-3, -2], fl: [4, 2],  na: [-5, 95], fa: [5, -95], bob: 0, head: [0, 0] },
      { nl: [-4, -2], fl: [5, 3],  na: [-6, 96], fa: [6, -96], bob: 0, head: [0, 0] },
    ],
    // [11] 抚摸下巴 (think)：重心在左腿承重，右腿微屈向前半步，左臂横胸托右肘、右手抬起轻摩下巴
    think: [
      { nl: [-5, -3], fl: [10, -8],  na: [-5, 92], fa: [34, 218], bob: 0,  head: [0, 1] },
      { nl: [-6, -3], fl: [12, -10], na: [-5, 92], fa: [35, 220], bob: 0,  head: [0, 1] },
      { nl: [-7, -4], fl: [14, -12], na: [-6, 94], fa: [36, 222], bob: -1, head: [0, 1] },
      { nl: [-7, -4], fl: [15, -13], na: [-6, 94], fa: [37, 224], bob: -1, head: [0, 1] },
      { nl: [-6, -4], fl: [13, -11], na: [-6, 93], fa: [36, 221], bob: -1, head: [0, 1] },
      { nl: [-5, -3], fl: [11, -9],  na: [-5, 92], fa: [35, 219], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [9, -7],   na: [-4, 90], fa: [33, 216], bob: 0,  head: [0, 0] },
      { nl: [-5, -3], fl: [9, -8],   na: [-5, 91], fa: [34, 217], bob: 0,  head: [0, 1] },
    ],
    // [02] 单手叉腰 (hips)：小幅丁字步，左腿承重，右腿自然外展踩地，左手叉在腰胯、右手自然下垂
    hips: [
      { nl: [-6, -3], fl: [11, 5], na: [-36, 40], fa: [5, 3], bob: 0,  head: [0, 0] },
      { nl: [-7, -4], fl: [13, 6], na: [-37, 41], fa: [6, 4], bob: 0,  head: [0, 0] },
      { nl: [-8, -4], fl: [15, 7], na: [-38, 42], fa: [7, 4], bob: -1, head: [0, 0] },
      { nl: [-8, -5], fl: [16, 8], na: [-39, 43], fa: [7, 5], bob: -1, head: [0, 0] },
      { nl: [-7, -4], fl: [14, 7], na: [-38, 42], fa: [6, 4], bob: -1, head: [0, 0] },
      { nl: [-6, -3], fl: [12, 6], na: [-37, 41], fa: [5, 3], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [10, 4], na: [-35, 39], fa: [4, 2], bob: 0,  head: [0, 0] },
      { nl: [-6, -3], fl: [10, 5], na: [-36, 40], fa: [5, 3], bob: 0,  head: [0, 0] },
    ],
    // [10] 挽臂托肘 (hug)：双脚靠近，右脚踝微向内靠，右臂自然垂落，左手横过身前轻握右手肘
    hug: [
      { nl: [-4, -2], fl: [7, -6],  na: [-12, 106], fa: [5, -6], bob: 0,  head: [0, 1] },
      { nl: [-5, -3], fl: [9, -8],  na: [-13, 108], fa: [6, -7], bob: 0,  head: [0, 1] },
      { nl: [-6, -3], fl: [10, -9], na: [-14, 110], fa: [6, -8], bob: -1, head: [0, 1] },
      { nl: [-6, -4], fl: [11,-10], na: [-15, 112], fa: [7, -8], bob: -1, head: [0, 0] },
      { nl: [-5, -3], fl: [9, -8],  na: [-14, 110], fa: [6, -7], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [8, -7],  na: [-13, 108], fa: [5, -6], bob: 0,  head: [0, 1] },
      { nl: [-3, -2], fl: [6, -5],  na: [-11, 105], fa: [4, -5], bob: 0,  head: [0, 1] },
      { nl: [-4, -2], fl: [6, -6],  na: [-12, 106], fa: [5, -6], bob: 0,  head: [0, 1] },
    ],
    // [04] 单手插兜 (pockets)：左腿站直承重，右腿向外迈半步膝盖微曲，左手插进裤兜，右手自然垂放
    pockets: [
      { nl: [-5, -2], fl: [12, -5], na: [-24, 28], fa: [5, 3], bob: 0,  head: [0, 0] },
      { nl: [-6, -3], fl: [14, -6], na: [-25, 29], fa: [6, 4], bob: 0,  head: [0, 0] },
      { nl: [-7, -4], fl: [16, -7], na: [-26, 30], fa: [7, 5], bob: -1, head: [0, 0] },
      { nl: [-7, -4], fl: [17, -8], na: [-26, 30], fa: [8, 5], bob: -1, head: [0, 0] },
      { nl: [-6, -3], fl: [15, -7], na: [-25, 29], fa: [7, 4], bob: -1, head: [0, 0] },
      { nl: [-5, -3], fl: [13, -6], na: [-24, 28], fa: [6, 3], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [11, -4], na: [-23, 27], fa: [4, 2], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [11, -5], na: [-24, 28], fa: [5, 3], bob: 0,  head: [0, 0] },
    ],
    // [05] 背手站立 (backhands)：双脚小V字挺拔站立，双手背在身后握腕，随呼吸平缓微调重心
    backhands: [
      { nl: [-6, -3], fl: [6, 3], na: [24, 16], fa: [-24, -16], bob: 0,  head: [0, 0] },
      { nl: [-7, -3], fl: [7, 4], na: [25, 17], fa: [-25, -17], bob: 0,  head: [0, 0] },
      { nl: [-8, -4], fl: [8, 4], na: [26, 18], fa: [-26, -18], bob: -1, head: [0, 0] },
      { nl: [-9, -4], fl: [9, 5], na: [27, 19], fa: [-27, -19], bob: -1, head: [0, 0] },
      { nl: [-8, -4], fl: [8, 4], na: [26, 18], fa: [-26, -18], bob: -1, head: [0, 0] },
      { nl: [-7, -3], fl: [7, 3], na: [25, 17], fa: [-25, -17], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [5, 2], na: [23, 15], fa: [-23, -15], bob: 0,  head: [0, 0] },
      { nl: [-6, -3], fl: [5, 3], na: [24, 16], fa: [-24, -16], bob: 0,  head: [0, 0] },
    ],
    // [06] 腹前交握 (salute)：双脚并拢端庄站立，双臂自然垂至小腹前、一手轻覆另一手背
    salute: [
      { nl: [-3, -1], fl: [3, 1], na: [-10, 48], fa: [10, -48], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [4, 2], na: [-11, 50], fa: [11, -50], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [5, 2], na: [-12, 52], fa: [12, -52], bob: -1, head: [0, 0] },
      { nl: [-6, -3], fl: [6, 3], na: [-12, 53], fa: [12, -53], bob: -1, head: [0, 0] },
      { nl: [-5, -2], fl: [5, 2], na: [-11, 51], fa: [11, -51], bob: -1, head: [0, 0] },
      { nl: [-4, -2], fl: [4, 2], na: [-10, 49], fa: [10, -49], bob: 0,  head: [0, 0] },
      { nl: [-2, -1], fl: [2, 1], na: [-9, 47],  fa: [9, -47],  bob: 0,  head: [0, 0] },
      { nl: [-3, -1], fl: [3, 1], na: [-10, 48], fa: [10, -48], bob: 0,  head: [0, 0] },
    ],
    // [14] 搭肩/揉脖子 (stretch)：双脚自然分开，一手自然下垂，另一手抬起搭在肩颈处轻揉放松
    stretch: [
      { nl: [-7, -3], fl: [9, 4],  na: [-5, -2], fa: [52, -148], bob: 0,  head: [0, 0] },
      { nl: [-8, -4], fl: [11, 5], na: [-6, -3], fa: [55, -152], bob: 0,  head: [0, 0] },
      { nl: [-9, -4], fl: [12, 6], na: [-6, -3], fa: [58, -156], bob: -1, head: [0, 1] },
      { nl: [-10,-5], fl: [13, 6], na: [-7, -4], fa: [60, -158], bob: -1, head: [0, 1] },
      { nl: [-9, -4], fl: [11, 5], na: [-6, -3], fa: [56, -154], bob: -1, head: [0, 0] },
      { nl: [-8, -4], fl: [10, 4], na: [-5, -2], fa: [53, -150], bob: 0,  head: [0, 0] },
      { nl: [-6, -3], fl: [8, 3],  na: [-4, -2], fa: [50, -146], bob: 0,  head: [0, 0] },
      { nl: [-7, -3], fl: [8, 4],  na: [-5, -2], fa: [51, -147], bob: 0,  head: [0, 0] },
    ],
    // [20] 搭腕看表 (lookout)：双脚平行稳立，重心偏左腿，右膝微屈，左臂曲肘抬至胸前看表，右手轻搭手腕
    lookout: [
      { nl: [-5, -2], fl: [9, -5],  na: [-28, 108], fa: [16, -74], bob: 0,  head: [0, 1] },
      { nl: [-6, -3], fl: [11, -6], na: [-30, 110], fa: [17, -76], bob: 0,  head: [0, 1] },
      { nl: [-7, -3], fl: [13, -7], na: [-32, 112], fa: [18, -78], bob: -1, head: [0, 1] },
      { nl: [-7, -4], fl: [14, -8], na: [-33, 114], fa: [19, -80], bob: -1, head: [0, 1] },
      { nl: [-6, -3], fl: [12, -7], na: [-31, 111], fa: [18, -77], bob: -1, head: [0, 0] },
      { nl: [-5, -2], fl: [10, -6], na: [-29, 109], fa: [17, -75], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [8, -4],  na: [-27, 106], fa: [15, -72], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [8, -5],  na: [-28, 107], fa: [16, -73], bob: 0,  head: [0, 1] },
    ],
    // [07] 拇指勾腰带 (beltHook)：双脚略宽于肩呈八字步，膝盖微松，双手拇指勾住腰带两侧
    beltHook: [
      { nl: [-9, -4],  fl: [12, 5], na: [-28, 34], fa: [28, -34], bob: 0,  head: [0, 0] },
      { nl: [-10, -5], fl: [14, 6], na: [-29, 35], fa: [29, -35], bob: 0,  head: [0, 0] },
      { nl: [-11, -5], fl: [16, 7], na: [-30, 36], fa: [30, -36], bob: -1, head: [0, 0] },
      { nl: [-12, -6], fl: [17, 8], na: [-31, 37], fa: [31, -37], bob: -1, head: [0, 0] },
      { nl: [-11, -5], fl: [15, 7], na: [-30, 36], fa: [30, -36], bob: -1, head: [0, 0] },
      { nl: [-10, -4], fl: [13, 6], na: [-29, 35], fa: [29, -35], bob: 0,  head: [0, 0] },
      { nl: [-8, -3],  fl: [11, 4], na: [-27, 33], fa: [27, -33], bob: 0,  head: [0, 0] },
      { nl: [-9, -4],  fl: [11, 5], na: [-28, 34], fa: [28, -34], bob: 0,  head: [0, 0] },
    ],
    // [08] 交叉腿斜靠 (crossLeg)：左腿垂直稳固承重，右腿从前侧小幅交叉、脚尖轻点地面，双手松松环抱
    crossLeg: [
      { nl: [-4, -2], fl: [-10, -4], na: [-18, 78], fa: [14, -72], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [-12, -5], na: [-19, 80], fa: [15, -74], bob: 0,  head: [0, 0] },
      { nl: [-5, -3], fl: [-14, -6], na: [-20, 82], fa: [16, -76], bob: -1, head: [0, 0] },
      { nl: [-5, -3], fl: [-15, -7], na: [-21, 83], fa: [16, -77], bob: -1, head: [0, 0] },
      { nl: [-5, -3], fl: [-13, -6], na: [-20, 81], fa: [15, -75], bob: -1, head: [0, 0] },
      { nl: [-4, -2], fl: [-11, -5], na: [-19, 79], fa: [14, -73], bob: 0,  head: [0, 0] },
      { nl: [-3, -2], fl: [-9, -3],  na: [-17, 77], fa: [13, -71], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [-9, -4],  na: [-18, 78], fa: [14, -72], bob: 0,  head: [0, 0] },
    ],
    // [12] 整理衣领 (collarFix)：双腿并拢站姿端庄，右手轻抬至领口整理衣领，左手自然垂放
    collarFix: [
      { nl: [-4, -2], fl: [5, -3], na: [-5, 4], fa: [38, -138], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [6, -4], na: [-5, 5], fa: [40, -142], bob: 0,  head: [0, 1] },
      { nl: [-6, -3], fl: [7, -5], na: [-6, 5], fa: [42, -146], bob: -1, head: [0, 1] },
      { nl: [-6, -3], fl: [8, -6], na: [-6, 6], fa: [44, -148], bob: -1, head: [0, 1] },
      { nl: [-5, -3], fl: [7, -5], na: [-6, 5], fa: [41, -144], bob: -1, head: [0, 0] },
      { nl: [-4, -2], fl: [6, -4], na: [-5, 4], fa: [39, -140], bob: 0,  head: [0, 0] },
      { nl: [-3, -1], fl: [4, -2], na: [-4, 3], fa: [36, -136], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [4, -3], na: [-5, 4], fa: [37, -137], bob: 0,  head: [0, 0] },
    ],
    // [15] 搓手/摩挲手指 (rubHands)：双脚与肩同宽稳立，双手抬至胸口下方，双掌轻合缓慢摩挲
    rubHands: [
      { nl: [-6, -3], fl: [7, -4],  na: [-18, 84], fa: [18, -84], bob: 0,  head: [0, 0] },
      { nl: [-7, -3], fl: [8, -5],  na: [-20, 88], fa: [20, -88], bob: 0,  head: [0, 0] },
      { nl: [-8, -4], fl: [9, -6],  na: [-22, 92], fa: [22, -92], bob: -1, head: [0, 0] },
      { nl: [-8, -4], fl: [10, -6], na: [-23, 94], fa: [23, -94], bob: -1, head: [0, 0] },
      { nl: [-7, -4], fl: [9, -5],  na: [-21, 90], fa: [21, -90], bob: -1, head: [0, 0] },
      { nl: [-6, -3], fl: [8, -4],  na: [-19, 86], fa: [19, -86], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [6, -3],  na: [-17, 82], fa: [17, -82], bob: 0,  head: [0, 0] },
      { nl: [-6, -3], fl: [6, -4],  na: [-18, 83], fa: [18, -83], bob: 0,  head: [0, 0] },
    ],
    // [17] 摸后脑勺/挠头 (headScratch)：双脚一前一后自然站立，左手自然下垂，右手绕至脑后轻搭后脑勺
    headScratch: [
      { nl: [-6, -3], fl: [10, -5], na: [-6, -2], fa: [64, -158], bob: 0,  head: [0, 0] },
      { nl: [-7, -3], fl: [12, -6], na: [-7, -3], fa: [67, -162], bob: 0,  head: [0, 0] },
      { nl: [-8, -4], fl: [13, -7], na: [-7, -3], fa: [70, -166], bob: -1, head: [0, 0] },
      { nl: [-8, -4], fl: [14, -8], na: [-8, -4], fa: [72, -168], bob: -1, head: [0, 0] },
      { nl: [-7, -4], fl: [12, -7], na: [-7, -3], fa: [68, -164], bob: -1, head: [0, 0] },
      { nl: [-6, -3], fl: [11, -6], na: [-6, -2], fa: [65, -160], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [9, -4],  na: [-5, -2], fa: [62, -156], bob: 0,  head: [0, 0] },
      { nl: [-6, -3], fl: [9, -5],  na: [-6, -2], fa: [63, -157], bob: 0,  head: [0, 0] },
    ],
    // [18] 脚尖点地 (toeTap)：左腿站直承重，右腿向前微伸、脚尖轻缓点地，左手插兜右手自然下垂
    toeTap: [
      { nl: [-5, -2], fl: [13, 4], na: [-22, 26], fa: [6, 3], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [15, 6], na: [-23, 27], fa: [7, 4], bob: 0,  head: [0, 0] },
      { nl: [-6, -3], fl: [17, 7], na: [-24, 28], fa: [8, 5], bob: -1, head: [0, 0] },
      { nl: [-6, -3], fl: [18, 8], na: [-24, 28], fa: [9, 5], bob: -1, head: [0, 0] },
      { nl: [-6, -3], fl: [16, 7], na: [-23, 27], fa: [8, 4], bob: -1, head: [0, 0] },
      { nl: [-5, -2], fl: [14, 5], na: [-22, 26], fa: [7, 3], bob: 0,  head: [0, 0] },
      { nl: [-4, -2], fl: [12, 3], na: [-21, 25], fa: [5, 2], bob: 0,  head: [0, 0] },
      { nl: [-5, -2], fl: [12, 4], na: [-22, 26], fa: [6, 3], bob: 0,  head: [0, 0] },
    ],
  };

  const IDLES34 = {
    free:        (t, talk) => evalIdle8(t, V34_IDLE_KF.free, talk, true),
    cross:       (t, talk) => evalIdle8(t, V34_IDLE_KF.cross, talk, true),
    think:       (t, talk) => evalIdle8(t, V34_IDLE_KF.think, talk, true),
    hips:        (t, talk) => evalIdle8(t, V34_IDLE_KF.hips, talk, true),
    hug:         (t, talk) => evalIdle8(t, V34_IDLE_KF.hug, talk, true),
    pockets:     (t, talk) => evalIdle8(t, V34_IDLE_KF.pockets, talk, true),
    backhands:   (t, talk) => evalIdle8(t, V34_IDLE_KF.backhands, talk, true, { behindBack: true }),
    salute:      (t, talk) => evalIdle8(t, V34_IDLE_KF.salute, talk, true),
    stretch:     (t, talk) => evalIdle8(t, V34_IDLE_KF.stretch, talk, true),
    lookout:     (t, talk) => evalIdle8(t, V34_IDLE_KF.lookout, talk, true),
    beltHook:    (t, talk) => evalIdle8(t, V34_IDLE_KF.beltHook, talk, true),
    crossLeg:    (t, talk) => evalIdle8(t, V34_IDLE_KF.crossLeg, talk, true),
    collarFix:   (t, talk) => evalIdle8(t, V34_IDLE_KF.collarFix, talk, true),
    rubHands:    (t, talk) => evalIdle8(t, V34_IDLE_KF.rubHands, talk, true),
    headScratch: (t, talk) => evalIdle8(t, V34_IDLE_KF.headScratch, talk, true),
    toeTap:      (t, talk) => evalIdle8(t, V34_IDLE_KF.toeTap, talk, true),
    // 健谈（苏专有道具待机）：举着烧瓶比划，另一只手跟着摆，脚尖弹跳，点头
    talk(t) {
      const s = sn(t * 3.2), up = sn(t * 6.5) > 0.4;                    // 脚尖弹跳只动腿，不抬躯干，避免身体变长、腿显短
      return n34({ nl: [-4 + (up ? 0 : -6), -2 + (up ? 0 : 6)], fl: [4, 3 - (up ? 0 : 4)], na: [-70 + 15 * s, -165 + 20 * sn(t * 3.2 + 0.8)],
        fa: [55 + 22 * sn(t * 2.4 + 1), 100 + 25 * sn(t * 2.4 + 1.6)], tail: [20 + 8 * sn(t * 3), 40 + 10 * sn(t * 3 + 1)], bob: 0, head: [0, sn(t * 3.2) > 0.7 ? 1 : 0] });
    }
  };

  /* ---------- 每把武器专属的 45° 侧身待机动作（应用到所有角色，武器与持武手臂角度完全锁定、随呼吸整像素刚体平移）---------- */
  const WEAPON_IDLES34 = {
    // 铁质长剑（剑模组）45° 待机：沉稳剑士 45° 侧身站姿，双臂角度固定，随上身呼吸(bob)整把剑刚体上下平移
    blade(t, talk) {
      const u = ph(t, 2.4) / 2.4, s = sn(u * Math.PI * 2), c = Math.cos(u * Math.PI * 2);
      const bob = (u >= 0.30 && u < 0.72) ? -1 : 0;
      const shift = u >= 0.55 && u < 0.88;
      const look = u >= 0.68 && u < 0.92;
      return n34({
        nl: shift ? [-9, -5] : [-5, -2],
        fl: shift ? [10, 5] : [7, 4],
        na: [-10, 46],
        fa: [8, 4],
        tail: [70 + 5 * s, 84 + 6 * c],
        bob,
        head: [look ? 1 : 0, talk && sn(t * 7) > 0.5 ? 1 : 0],
      });
    },
    // 铁质长刀（刀模组·4连）45° 待机：武器插在腰间长刀鞘里，左手外展叉腰（na: [-42, 44]），右手握住腰前长刀把（fa: [26, -10]）
    katana(t, talk) {
      const u = ph(t, 2.4) / 2.4, s = sn(u * Math.PI * 2), c = Math.cos(u * Math.PI * 2);
      const bob = (u >= 0.30 && u < 0.72) ? -1 : 0;
      const shift = u >= 0.52 && u < 0.86;
      const look = u >= 0.66 && u < 0.90;
      return n34({
        nl: shift ? [-10, -5] : [-6, -3],
        fl: shift ? [11, 5] : [8, 4],
        na: [-42, 44],
        fa: [26, -10],
        tail: [70 + 5 * s, 84 + 6 * c],
        bob,
        head: [look ? 1 : 0, talk && sn(t * 7) > 0.5 ? 1 : 0],
      });
    },
    // 铁质大剑（大剑模组·2连）45° 待机：将门板级超宽巨剑沉稳扛在肩上（na: [32, 146] 抬手握柄搭肩，fa: [24, -12] 叉腰稳立），随呼吸整像素刚体平移
    greatsword(t, talk) {
      const u = ph(t, 2.4) / 2.4, s = sn(u * Math.PI * 2), c = Math.cos(u * Math.PI * 2);
      const bob = (u >= 0.32 && u < 0.74) ? -1 : 0;
      const shift = u >= 0.56 && u < 0.88;
      const look = u >= 0.68 && u < 0.92;
      return n34({
        nl: shift ? [-11, -5] : [-8, -4],
        fl: shift ? [12, 6] : [9, 4],
        na: [32, 146],
        fa: [24, -12],
        tail: [68 + 5 * s, 82 + 6 * c],
        bob,
        head: [look ? 1 : 0, talk && sn(t * 7) > 0.5 ? 1 : 0],
      });
    },
    // 脉冲手枪（手枪模组）45° 待机：神枪手 45° 战术戒备站姿，双臂与枪身角度固定，随上身呼吸(bob)整把枪刚体上下平移
    pistol(t, talk) {
      const u = ph(t, 2.2) / 2.2, s = sn(u * Math.PI * 2), c = Math.cos(u * Math.PI * 2);
      const bob = (u >= 0.34 && u < 0.74) ? -1 : 0;
      const tap = u >= 0.48 && u < 0.76;
      const scan = u >= 0.64 && u < 0.90;
      return n34({
        nl: tap ? [-8, -2] : [-4, -2],
        fl: tap ? [10, 5] : [6, 3],
        na: [-4, 68],
        fa: [8, -4],
        tail: [72 + 4 * s, 86 + 5 * c],
        bob,
        head: [scan ? 1 : 0, talk && sn(t * 7) > 0.5 ? 1 : 0],
      });
    },
  };
  WEAPON_IDLES34.sword = WEAPON_IDLES34.blade;
  WEAPONS.IDLES34 = WEAPON_IDLES34;

  function poser(spec) {
    const b = spec.build, g = spec.gait || {};
    const sw = g.swing == null ? 1 : g.swing;
    return {
      hyGround: po => gHy(b, norm(po)),
      idle: (t, talk) => {
        const tbl = spec.idleView === 'side' ? IDLES : IDLES34;
        const po = (tbl[spec.idle] || tbl.free)(t, talk);
        po.idleT = t;
        return po;
      },
      idleSide: (t, talk) => {
        const po = (IDLES[spec.idle] || IDLES.free)(t, talk);
        po.idleT = t;
        return po;
      },
      weaponIdle: (wId, t, talk) => {
        const po = (WEAPON_IDLES34[wId] || WEAPON_IDLES34.blade)(t, talk);
        po.idleT = t;
        return po;
      },
      stand: () => norm({ nl: [3, 0], fl: [-3, -2], na: [6, 14], fa: [-6, -4], tail: [26, 52] }),
      loco(mode, i) {
        if (mode === 'sprint') return sprintBase(i);
        if (mode === 'cwalk') return crouchWalkBase(i);
        if (mode === 'cwalkBack') return crouchWalkBackBase(i);
        if (mode === 'run') { const po = runBase(i); po.lean += g.lean ? 1 : 0; return po; }
        if (mode === 'runBack') return runBackBase(i);
        if (mode === 'walkBack') return walkBackBase(i, sw);
        const po = walkBase(i, sw), m = g.walkArms;
        if (m === 'pocket') { po.na = [po.na[0] * 0.5, po.na[0] * 0.5 + 10]; po.fa = [po.fa[0] * 0.5, po.fa[0] * 0.5 + 10]; }
        else if (ARM[m]) { po.na = ARM[m][0]; if (ARM[m][1]) po.fa = ARM[m][1]; }
        po.lean += g.lean || 0;
        if (g.stomp && (i === 0 || i === 4)) po.bob = 1;
        return po;
      },
      runBob: i => i === 3 || i === 7,
      runBackBob: i => i === 2 || i === 6,
      crouchIdle: () => norm(PX.crouchIdle), blinkWind: () => norm(PX.blinkWind), blinkLand: () => norm(PX.blinkLand), kick: t => kickPose(t),
      skid: () => norm(P.skid),
      pre: t => norm(t < 0.07 ? P.crouch : P.spring),
      land: t => norm(t < 0.07 ? P.land : P.crouch),
      air: v => airPose(v),
      flip(ft) {
        const idx = clamp(Math.floor((ft / 0.24) * 8), 0, 7);
        return idx === 7 ? { po: norm(P.uncurl), phi: 0 } : { po: norm(P.tuck), phi: FLIP_STEPS[idx] };
      }
    };
  }

  return { GW, GH, GX, GOFF, FOOT, SHY, SKELETON, WEAPONS, ALIEN_SPECIES, MYCO_VARIANTS, CATHODE_VARIANTS, CINDER_VARIANTS, drawAlienHead, drawAlienTorso, drawAlienFXLayer, drawKatanaOrbitFX, BASE_HEAD, BASE_HEAD34, HEADS, HEADS34, HATS, HATS34, headLayerBreakdown, IDLES, IDLES34, WEAPON_IDLES34, SWORD_ACT_KF, KATANA_ACT_KF, GREATSWORD_ACT_KF, sampleSwordKF, SUIT: SU, drawCharacter, charLayers, charGrid, computeWeaponPose, computeMeleeBodyPose, poser, blend, norm, gHy, rad, clamp };
});
