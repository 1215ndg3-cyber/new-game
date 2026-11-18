/* 角色规格：外观、性格参数、待机骨架动作类型、步态、台词。新增角色只需要往 CAST 里加一项。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PixelCast = factory();
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';
  const build = { thigh: 6, shin: 5, upper: 3, fore: 3 };
  const CAST = [
    {
      id: 'lin', name: '林', tag: '冷静', desc: '抱着手臂旁观一切的守望者', idle: 'cross', idleName: '抱臂、慢呼吸、偶尔换重心',
      traits: { soc: 0.2, en: 0.3, cau: 0.5, cur: 0.3, pat: 0.9 },
      gait: { walkArms: 'pocket', swing: 0.6, lean: 0 }, build,
      look: { hair: 'ponytail', outfit: 'tee', prop: 'none', cols: {
        skin: '#f3c9a5', skinSh: '#d9a987', eye: '#2a1f1f', hair: '#141414', hairHi: '#2c2c2c', hairEnd: '#0c0c0c',
        top: '#26282c', topSh: '#1b1d20', belt: '#3a3c42', pelvis: '#3b3b3b',
        armN: ['#f3c9a5', '#f3c9a5', '#f3c9a5'], armF: ['#b98b6c', '#b98b6c', '#b98b6c'],
        legN: ['#3b3b3b', '#ffffff', '#2a2a2a'], legF: ['#232220', '#232220', '#a9a9bd'] } },
      lines: {
        greet: ['……', '嗯。', '有事？'], chat: ['风向变了。', '别靠太近。', '无聊。', '走吧。', '随便。'],
        react: ['别碰我。', '嗯？', '……'], refuse: ['没兴趣。'], flee: ['离远点。']
      }
    },
    {
      id: 'bai', name: '白', tag: '沉思', desc: '总在琢磨什么的白发学者', idle: 'think', idleName: '手托下巴、低头、指尖轻敲',
      traits: { soc: 0.4, en: 0.2, cau: 0.6, cur: 0.8, pat: 0.8 },
      gait: { walkArms: 'chin', swing: 0.5, lean: 1 }, build,
      look: { hair: 'short', outfit: 'vest', prop: 'none', cols: {
        skin: '#f1d3bd', skinSh: '#d2b49c', eye: '#3a2a30', hair: '#ecedf1', hairHi: '#ffffff',
        top: '#4b2f46', topSh: '#3a2437', collar: '#f2f2f4', belt: '#2b1e2c', pelvis: '#33263a',
        armN: ['#f2f2f4', '#f2f2f4', '#f1d3bd'], armF: ['#c9c9d0', '#c9c9d0', '#d2b49c'],
        legN: ['#3e2c42', '#3e2c42', '#16121a'], legF: ['#2c2030', '#2c2030', '#0f0c12'] } },
      lines: {
        greet: ['嗯……', '你来得正好。', '我在想一件事。'], chat: ['这说不通。', '再想想。', '也许可以这样。', '有意思……', '我得记下来。'],
        react: ['嗯？', '等一下，我在想。', '有发现吗？'], refuse: ['抱歉，我走神了。'], flee: ['呃……']
      }
    },
    {
      id: 'su', name: '苏', tag: '健谈', desc: '举着烧瓶说个不停的研究员', idle: 'talk', idleName: '举瓶比划、脚尖弹跳、点头',
      traits: { soc: 0.95, en: 0.85, cau: 0.2, cur: 0.7, pat: 0.3 },
      gait: { walkArms: 'flask', swing: 1.2, lean: 0 }, build,
      look: { hair: 'long', outfit: 'labcoat', prop: 'flask', cols: {
        skin: '#e7b896', skinSh: '#c79a7a', eye: '#2a1a18', hair: '#3a2420', hairHi: '#5a3a30',
        top: '#243a42', coat: '#eef2f4', coatSh: '#c2cbd2', belt: '#222a2e', pelvis: '#1d1f24',
        armN: ['#eef2f4', '#eef2f4', '#e7b896'], armF: ['#c2cbd2', '#c2cbd2', '#c79a7a'],
        legN: ['#1d1f24', '#1d1f24', '#111114'], legF: ['#15171b', '#15171b', '#0c0c0e'],
        glass: '#d6e6ee', liquid: '#c4573a', liquid2: '#8e3a28' } },
      lines: {
        greet: ['嗨！', '快来看这个！', '你们听我说！'], chat: ['我的实验成功了！', '来来来，尝尝？', '太神奇了！', '哎呀，洒了！', '再来一次！'],
        react: ['哇！', '你要看我的瓶子吗？', '正好找你！'], refuse: ['那下次再说！'], flee: ['别跑呀！']
      }
    },
    {
      id: 'tie', name: '铁', tag: '暴躁', desc: '戴黄帽子的脾气硬工匠', idle: 'hips', idleName: '叉腰、跺脚、叹气',
      traits: { soc: 0.3, en: 0.5, cau: 0.4, cur: 0.2, pat: 0.5 },
      gait: { walkArms: 'swing', swing: 1.0, lean: 0, stomp: true }, build,
      look: { hair: 'cap', outfit: 'overalls', prop: 'none', cols: {
        skin: '#c98f66', skinSh: '#a8734f', eye: '#241a14', hair: '#3a2a20', hat: '#e09a2e', hatHi: '#f1b650', hatBrim: '#b87a1f',
        top: '#6a6a4a', bib: '#8a8f58', belt: '#4a3a28', pelvis: '#5a5c3c',
        armN: ['#6a6a4a', '#c98f66', '#c98f66'], armF: ['#505038', '#a8734f', '#a8734f'],
        legN: ['#5c5e3e', '#5c5e3e', '#2a2a2a'], legF: ['#46482f', '#46482f', '#1c1c1c'] } },
      lines: {
        greet: ['哼。', '什么事？', '又是你。'], chat: ['活儿还没干完。', '谁碰了我的扳手？', '别挡路。', '又得加班。', '凑合能用。'],
        react: ['别吵！', '干嘛？', '哼！'], refuse: ['没空。'], flee: ['别挡我的路！']
      }
    },
    {
      id: 'mi', name: '米', tag: '胆小', desc: '裹在连帽衫里的怕生少女', idle: 'hug', idleName: '抱住自己、缩肩、偷看',
      traits: { soc: 0.15, en: 0.45, cau: 0.95, cur: 0.4, pat: 0.6 },
      gait: { walkArms: 'hug', swing: 0.4, lean: 1 }, build: { thigh: 5, shin: 5, upper: 3, fore: 3 },
      look: { hair: 'bob', outfit: 'hoodie', prop: 'none', cols: {
        skin: '#f0cfb4', skinSh: '#d3af93', eye: '#2d2220', hair: '#9a4f34', hairHi: '#b9684a',
        top: '#4d7a82', topSh: '#3d6068', hood: '#3d6068', belt: '#3d6068', pelvis: '#2e3a44',
        armN: ['#4d7a82', '#4d7a82', '#f0cfb4'], armF: ['#3d6068', '#3d6068', '#d3af93'],
        legN: ['#2e3a44', '#2e3a44', '#8a8f99'], legF: ['#222c35', '#222c35', '#6e737d'] } },
      lines: {
        greet: ['呃……', '那、那个……', '对、对不起。'], chat: ['我、我先走了……', '别、别看我。', '好可怕。', '嗯、嗯。', '我不太会说话……'],
        react: ['呀！', '别、别过来！', '对不起！'], refuse: ['我、我还有事……'], flee: ['呜……']
      }
    },
    {
      id: 'xing', name: '星', tag: '探索者', desc: '最初那位主角：冲刺、瞬移、蹲行都会，还能穿太空服', idle: 'free', idleName: '自然站立、上身呼吸、偶尔环顾',
      traits: { soc: 0.55, en: 0.8, cau: 0.35, cur: 0.9, pat: 0.3 },
      abilities: { sprint: true, blink: true, sneak: true },
      gait: { walkArms: 'normal', swing: 1.0, lean: 0 }, build,
      look: { hair: 'ponytail', outfit: 'tee', prop: 'none', cols: {
        skin: '#f5c9a6', skinSh: '#b98b6c', eye: '#1b1b1b', hair: '#1b1b1b', hairHi: '#2c2c2c', hairEnd: '#232220',
        top: '#1b1b1b', topSh: '#1b1b1b', belt: '#1b1b1b', pelvis: '#3b3b3b',
        armN: ['#1b1b1b', '#f5c9a6', '#f5c9a6'], armF: ['#232220', '#b98b6c', '#b98b6c'],
        legN: ['#3b3b3b', '#ffffff', '#2a2a2a'], legF: ['#232220', '#232220', '#a9a9bd'] } },
      lines: {
        greet: ['嗨！', '前面有什么？', '一起去看看？'], chat: ['那边好像有光。', '我想去试试！', '这里没来过。', '跑起来吧！', '要不要瞬移过去？'],
        react: ['嗯？', '等等我！', '怎么了？'], refuse: ['下次吧！'], flee: ['先撤！']
      }
    }
  ];
  const AFFINITY = {
    lin: { bai: 0.3, su: 0.1, tie: 0.0, mi: 0.2, xing: 0.3 }, bai: { lin: 0.3, su: 0.6, tie: 0.1, mi: 0.4, xing: 0.5 },
    su: { lin: 0.4, bai: 0.8, tie: 0.2, mi: 0.5, xing: 0.6 }, tie: { lin: 0.2, bai: 0.1, su: -0.2, mi: -0.3, xing: 0.1 }, mi: { lin: 0.3, bai: 0.5, su: -0.1, tie: -0.6, xing: 0.4 },
    xing: { lin: 0.3, bai: 0.4, su: 0.6, tie: 0.1, mi: 0.3 }
  };

  /* ---------- 程序化 NPC 批量随机生成系统 (Modular Procedural NPC Generator) ----------
   * 遵循「部位拆离 + 随机自由组合」架构：
   * 1. 头部基础像素层 (BASE_HEAD / BASE_HEAD34) 固定提供标准五官、后脑、肤色与耳廓；
   * 2. 发型部件池 (HAIR_STYLES · 9种) 叠加在基础头骨之上；
   * 3. 帽饰部件池 (HAT_STYLES · 8种) 叠加在头发层之上；
   * 4. 头部以下身体部件 (UNIFIED_BODY) 统一采用一套标准短袖战术躯干与四肢比例，确保所有随机生成的 NPC 100% 适配全部 19 种动作与近战/远程武器模组。 */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NPC_PARTS = {
    HAIR_STYLES: [
      { id: 'ponytail',  name: '高马尾',     desc: '脑后物理摆动马尾' },
      { id: 'short',     name: '利落短发',   desc: '干净碎刘海短发' },
      { id: 'long',      name: '披肩长发',   desc: '随步伐飘动长发' },
      { id: 'bob',       name: '齐耳波波',   desc: '圆润包脸短发' },
      { id: 'spiky',     name: '刺猬翘发',   desc: '顶部三簇锋利翘发' },
      { id: 'bun',       name: '武道丸子',   desc: '头顶高挽发髻' },
      { id: 'mohawk',    name: '朋克鸡冠',   desc: '中轴高耸莫霍克' },
      { id: 'parted',    name: '偏分碎发',   desc: '侧分刘海干练发式' },
      { id: 'bald',      name: '光头/寸头',  desc: '仅保留头骨轮廓与鬓角' },
      { id: 'twintails', name: '双马尾辫',   desc: '左右对称高扎双发束随步摆动' },
      { id: 'samurai',   name: '浪人武士髻', desc: '前额束发+头顶折角高髻' },
      { id: 'afro',      name: '蓬松爆炸头', desc: '向外饱满扩张的圆润蓬松卷发' },
      { id: 'curls',     name: '大波浪卷发', desc: '蓬松侧分刘海+垂肩波浪长卷' },
      { id: 'braid',     name: '游侠麻花辫', desc: '脑后垂落交错高光长麻花辫' },
      { id: 'undercut',  name: '铲青大背头', desc: '两侧鬓角铲青+头顶高挑背掠发丝' },
    ],
    HAT_STYLES: [
      { id: 'none',     name: '无帽饰',   desc: '完整展示发型像素' },
      { id: 'cap',      name: '工装鸭舌帽', desc: '向前探出遮阳硬檐' },
      { id: 'strawHat', name: '浪人宽檐笠', desc: '前后展开宽草帽檐' },
      { id: 'bandana',  name: '武者束头巾', desc: '额前束带+脑后飘结' },
      { id: 'hood',     name: '暗影兜帽', desc: '包裹头顶与后颈兜帽' },
      { id: 'beret',    name: '战术贝雷帽', desc: '斜扣软顶贝雷帽' },
      { id: 'crown',    name: '三尖轻冠', desc: '金属三齿王冠头饰' },
      { id: 'visor',    name: '光学护目镜', desc: '横跨眼部的科技镜片' },
    ],
    SKIN_PALETTES: [
      { id: 'warmIvory', name: '暖象牙', skin: '#f5c9a6', skinSh: '#b98b6c', eye: '#1b1b1b' },
      { id: 'fairPeach', name: '浅桃白', skin: '#f1d3bd', skinSh: '#d2b49c', eye: '#2a1f1f' },
      { id: 'wheatTan',  name: '小麦色', skin: '#e7b896', skinSh: '#c79a7a', eye: '#241a14' },
      { id: 'bronzeSun', name: '古铜色', skin: '#c98f66', skinSh: '#a8734f', eye: '#1e1612' },
      { id: 'coolPorc',  name: '冷瓷白', skin: '#f0cfb4', skinSh: '#d3af93', eye: '#2d2220' },
      { id: 'deepUmber', name: '深褐肤', skin: '#a6714d', skinSh: '#845638', eye: '#181210' },
    ],
    HAIR_PALETTES: [
      { id: 'obsidian', name: '曜石黑', hair: '#18191c', hairHi: '#32353d', hairEnd: '#0f1012' },
      { id: 'ashSilver',name: '霜银白', hair: '#dfe3ec', hairHi: '#ffffff', hairEnd: '#b4bccb' },
      { id: 'chestnut', name: '深栗棕', hair: '#4a2e24', hairHi: '#6e4738', hairEnd: '#2e1b14' },
      { id: 'copperRed',name: '赤铜红', hair: '#8f3d2e', hairHi: '#b55645', hairEnd: '#5e241a' },
      { id: 'wheatGold',name: '麦穗金', hair: '#c99b49', hairHi: '#e6be6e', hairEnd: '#966f28' },
      { id: 'slateBlue',name: '钢岩蓝', hair: '#3b495e', hairHi: '#596d8a', hairEnd: '#252f3d' },
      { id: 'mossGreen',name: '苔原绿', hair: '#385244', hairHi: '#547865', hairEnd: '#22332a' },
      { id: 'plumAsh',  name: '暗梅紫', hair: '#52384f', hairHi: '#755371', hairEnd: '#332131' },
    ],
    HAT_PALETTES: [
      { id: 'amberWork', name: '工装琥珀', hat: '#d9912b', hatHi: '#f0b354', hatBrim: '#9e6516' },
      { id: 'ironSlate', name: '冷铁灰',   hat: '#59606e', hatHi: '#7d8699', hatBrim: '#383d47' },
      { id: 'crimson',   name: '暗绯红',   hat: '#9e3b33', hatHi: '#c4554b', hatBrim: '#69231e' },
      { id: 'reedStraw', name: '枯苇草黄', hat: '#bfa36f', hatHi: '#d9c08e', hatBrim: '#8c7347' },
      { id: 'cobalt',    name: '深钴蓝',   hat: '#39557a', hatHi: '#567aab', hatBrim: '#243752' },
      { id: 'hunter',    name: '猎林绿',   hat: '#3e5c47', hatHi: '#5b8267', hatBrim: '#273b2d' },
      { id: 'obsidian',  name: '夜行炭黑', hat: '#282b33', hatHi: '#434854', hatBrim: '#17191f' },
    ],
    // 9 套高辨识度全身服饰套装（衣服+裤子一体替换，每套自带专属袖型 sleeve 与领口/胸挡/下摆/护肩点缀，自动程序化适配全部 19 种动作序列帧与独立手臂层）
    OUTFIT_SUITS: [
      {
        id: 'tacticalTee',
        name: '战术短袖装',
        outfit: 'tee',
        sleeve: 'short',
        sleeveName: '利落短袖 (露前臂)',
        top: '#23262e',
        topSh: '#181a20',
        collar: '#3c414d',
        belt: '#3c414d',
        pelvis: '#323640',
        pantsN: ['#323640', '#414654'],
        pantsF: ['#22252b', '#2c3038'],
        cuff: '#3c414d',
      },
      {
        id: 'workOveralls',
        name: '工装背带裤',
        outfit: 'overalls',
        sleeve: 'rolled',
        sleeveName: '挽肘卷袖 (中袖折边)',
        top: '#9e6b3b',
        topSh: '#6e4823',
        bib: '#465870',
        collar: '#b88454',
        belt: '#354457',
        pelvis: '#3b4b5e',
        pantsN: ['#3b4b5e', '#4c5f75'],
        pantsF: ['#283342', '#354457'],
        cuff: '#c49260',
      },
      {
        id: 'roninCoat',
        name: '浪人羽织袍',
        outfit: 'haori',
        sleeve: 'wide',
        sleeveName: '宽袖长袍 (垂袖摆)',
        top: '#8c352d',
        topSh: '#591f1a',
        coat: '#282d38',
        coatSh: '#1a1e26',
        collar: '#c9564c',
        belt: '#b8463c',
        pelvis: '#222630',
        pantsN: ['#252933', '#323846'],
        pantsF: ['#191c24', '#222630'],
        shirtN: '#282d38',
        shirtF: '#1a1e26',
        cuff: '#c9564c',
      },
      {
        id: 'scholarVest',
        name: '学者马甲衫',
        outfit: 'vest',
        sleeve: 'long',
        sleeveName: '衬衫长袖 (收袖口)',
        top: '#47362b',
        topSh: '#2e221b',
        collar: '#e6dfd5',
        belt: '#b5ada3',
        pelvis: '#2a2623',
        pantsN: ['#2f2b28', '#3d3834'],
        pantsF: ['#211e1c', '#2b2724'],
        shirtN: '#cfc8be',
        shirtF: '#9e978e',
        cuff: '#e6dfd5',
      },
      {
        id: 'stalkerHoodie',
        name: '夜行卫衣套',
        outfit: 'hoodie',
        sleeve: 'long',
        sleeveName: '全长袖+战术手套',
        top: '#2f4034',
        topSh: '#1f2b22',
        hood: '#435949',
        collar: '#435949',
        belt: '#1c2026',
        pelvis: '#22262e',
        pantsN: ['#22262e', '#2c313b'],
        pantsF: ['#171a20', '#1e2229'],
        cuff: '#4e6655',
        gloveN: '#1f232b',
        gloveF: '#14171d',
      },
      {
        id: 'martialSleeveless',
        name: '武道无袖装',
        outfit: 'martial',
        sleeve: 'sleeveless',
        sleeveName: '无袖露肩+金丝护腕',
        top: '#4a252a',
        topSh: '#2e1619',
        trim: '#e09b34',
        collar: '#e09b34',
        belt: '#e09b34',
        pelvis: '#292024',
        pantsN: ['#292024', '#382c31'],
        pantsF: ['#1c1518', '#261d21'],
        cuff: '#e09b34',
      },
      {
        id: 'plateArmor',
        name: '重装胸甲套',
        outfit: 'armor',
        sleeve: 'pauldron',
        sleeveName: '重甲护肩+铁护臂',
        top: '#757e91',
        topSh: '#4a505e',
        collar: '#bcc4d4',
        trim: '#d9a34a',
        belt: '#8c652b',
        pelvis: '#383d47',
        pantsN: ['#3b414d', '#505766'],
        pantsF: ['#262a33', '#363b47'],
        shirtN: '#525969',
        shirtF: '#383d47',
        cuff: '#d9a34a',
        gloveN: '#383d47',
        gloveF: '#252930',
      },
      {
        id: 'alchemistTrench',
        name: '炼金长风衣',
        outfit: 'labcoat',
        sleeve: 'cuffed',
        sleeveName: '翻折宽袖口+皮手套',
        top: '#6b2d29',
        topSh: '#471c19',
        coat: '#c4baaa',
        coatSh: '#8f8678',
        collar: '#dfd7c8',
        belt: '#4d3624',
        pelvis: '#2e2925',
        pantsN: ['#302a26', '#403833'],
        pantsF: ['#211d1a', '#2b2622'],
        shirtN: '#c4baaa',
        shirtF: '#8f8678',
        cuff: '#735138',
        gloveN: '#3b2b20',
        gloveF: '#261b14',
      },
      {
        id: 'desertPoncho',
        name: '荒原游侠披肩',
        outfit: 'poncho',
        sleeve: 'short',
        sleeveName: '游侠披肩+绑带护腕',
        top: '#945632',
        topSh: '#61361d',
        collar: '#deb068',
        trim: '#deb068',
        belt: '#3d2c1e',
        pelvis: '#2c362e',
        pantsN: ['#2c362e', '#3b473e'],
        pantsF: ['#1e2620', '#29332b'],
        shirtN: '#3d473d',
        shirtF: '#283028',
        cuff: '#deb068',
      },
    ],
    // 5 种鞋靴部件（程序化适配全部腿部角度）
    SHOE_STYLES: [
      {
        id: 'sneakers',
        name: '轻便跑鞋',
        shoeN: '#22252c',
        shoeF: '#181a20',
        shaftN: '#323640',
        shaftF: '#22252b',
        accentN: '#e6eaf2',
        accentF: '#9aa1b0',
      },
      {
        id: 'combatBoots',
        name: '高帮战靴',
        shoeN: '#1c1e24',
        shoeF: '#13151a',
        shaftN: '#2b2f38',
        shaftF: '#1e2128',
        accentN: '#59606e',
        accentF: '#3c414d',
      },
      {
        id: 'striderWraps',
        name: '绑腿行者靴',
        shoeN: '#3d3126',
        shoeF: '#292018',
        shaftN: '#6e5a47',
        shaftF: '#4d3e30',
        accentN: '#cfc8be',
        accentF: '#9e978e',
      },
      {
        id: 'ironGreaves',
        name: '铁胫重靴',
        shoeN: '#2b303a',
        shoeF: '#1d2129',
        shaftN: '#59606e',
        shaftF: '#383d47',
        accentN: '#b8bfd0',
        accentF: '#7d8699',
      },
      {
        id: 'bareSandals',
        name: '轻装便鞋',
        shoeN: '#332922',
        shoeF: '#241c17',
        shaftN: '#332922',
        shaftF: '#241c17',
        accentN: '#bfa36f',
        accentF: '#8c7347',
      },
    ],
    // 背饰共用栏位：无 / 旅行者披风（先做 1 种主披风，随跑动动态飘起） / 勘探战术背包
    BACK_STYLES: [
      { id: 'none', name: '无背饰', desc: '轻装上阵' },
      { id: 'cape', name: '旅行者披风', desc: '待机垂落 · 跑动/冲刺迎风高扬飘起 · 挥砍随势摆动' },
      { id: 'pack', name: '勘探战术背包', desc: '与披风共用背部栏位 · 含肩带与顶盖扣具' },
    ],
    BACK_PALETTES: [
      { id: 'crimsonCloak', name: '暗绯披风', back: '#7a2822', backHi: '#9e3b33', backSh: '#4f1814' },
      { id: 'ravenCloak',   name: '夜鸦玄色', back: '#252932', backHi: '#373d4a', backSh: '#171920' },
      { id: 'wolfSlate',    name: '苍狼铁灰', back: '#434957', backHi: '#5e6678', backSh: '#2b2f38' },
      { id: 'mossCloak',    name: '苔原猎绿', back: '#2f4536', backHi: '#46634f', backSh: '#1d2b22' },
      { id: 'cobaltCloak',  name: '深海钴蓝', back: '#2b3f5c', backHi: '#3f5a82', backSh: '#1b283b' },
    ],
    // 兼容旧引用：保留 UNIFIED_BODY 的标准骨骼比例与默认颜色
    UNIFIED_BODY: {
      build: { thigh: 6, shin: 5, upper: 3, fore: 3 },
      outfit: 'tee',
      prop: 'none',
      cols: {
        top: '#23262e',
        topSh: '#181a20',
        belt: '#3c414d',
        pelvis: '#323640',
        legN: ['#323640', '#e6eaf2', '#22252c'],
        legF: ['#22252b', '#22252b', '#9aa1b0'],
      },
    },
    SURNAMES: ['阿', '小', '老', '云', '风', '影', '铁', '霜', '雷', '石', '灰', '星', '墨', '白', '林', '苏'],
    GIVEN_NAMES: ['七', '九', '川', '刃', '岚', '澈', '野', '舟', '尘', '岳', '锋', '禾', '昭', '宁', '骁', '寒'],
    TAGS: ['巡逻卫', '游侠', '铁匠学徒', '旅人', '斥候', '剑客', '信使', '守夜人'],
    IDLES: [
      { id: 'free',        shortName: '[01]自然垂落', name: '[01] 经典自然垂落', handDesc: '双手自然垂于体侧，手指微曲随呼吸轻微起伏', legDesc: '与肩同宽，重心略偏右腿站直承重，左膝微屈放松' },
      { id: 'hips',        shortName: '[02]单手叉腰', name: '[02] 单手叉腰',     handDesc: '重心侧手叉在腰胯上，另一手自然下垂放松',   legDesc: '小幅“丁”字步，重心在后腿承重，前脚自然踩地' },
      { id: 'cross',       shortName: '[03]双手抱胸', name: '[03] 双手抱胸',     handDesc: '双臂在胸前水平交叉抱拢，手掌轻搭上臂',     legDesc: '双脚平行略窄于肩，膝盖直而不僵，重心稳落居中' },
      { id: 'pockets',     shortName: '[04]单手插兜', name: '[04] 单手插兜',     handDesc: '一手插进裤兜或外衣口袋，另一手自然垂放',   legDesc: '支撑腿站直承重，另一腿向外迈出半步、膝盖微曲' },
      { id: 'backhands',   shortName: '[05]背手站立', name: '[05] 背手站立',     handDesc: '双手背在身后，一手握住另一手手腕',         legDesc: '双脚并拢或呈小“V”字，身姿挺拔，随呼吸平缓微移' },
      { id: 'salute',      shortName: '[06]腹前交握', name: '[06] 腹前交握',     handDesc: '双臂自然垂至小腹前，一手轻覆在另一手背上', legDesc: '双脚并拢，脚跟相靠，重心稳稳落在正中端庄站立' },
      { id: 'beltHook',    shortName: '[07]勾腰带',   name: '[07] 拇指勾腰带',   handDesc: '双手或单手拇指勾住腰带/裤腰，其余手指自然垂落', legDesc: '双脚略宽于肩，呈自然外八字步，膝盖微松休闲' },
      { id: 'crossLeg',    shortName: '[08]交叉斜靠', name: '[08] 交叉腿斜靠',   handDesc: '双手松松环抱或一扶一垂，肩部自然放松',     legDesc: '一腿垂直承重，另一腿从前侧小幅交叉、脚尖轻点地面' },
      { id: 'hug',         shortName: '[10]挽臂托肘', name: '[10] 挽臂托肘',     handDesc: '一臂自然下垂，另一手横过身前握住其手肘或小臂', legDesc: '双脚靠近，一侧脚踝微向内靠，重心略偏一侧' },
      { id: 'think',       shortName: '[11]抚摸下巴', name: '[11] 抚摸下巴',     handDesc: '一手横胸托肘，另一手抬起轻触下巴或嘴角思考', legDesc: '重心在支撑腿，另一腿微屈向前半步虚点地面' },
      { id: 'collarFix',   shortName: '[12]整理衣领', name: '[12] 整理衣领',     handDesc: '一手自然垂放，另一手轻抬至颈侧整理衣领',   legDesc: '双腿自然并拢，一侧膝盖微前倾，站姿克制端庄' },
      { id: 'stretch',     shortName: '[14]搭肩揉脖', name: '[14] 搭肩揉脖子',   handDesc: '一手自然下垂，另一手抬起搭在对侧肩颈处轻揉', legDesc: '双脚一前一后自然分开，重心缓慢平缓微移' },
      { id: 'rubHands',    shortName: '[15]摩挲手指', name: '[15] 搓手摩挲手指', handDesc: '双手抬至胸口下方，双掌轻合缓慢摩挲手指',   legDesc: '双脚与肩同宽稳立，重心左右小幅平滑过渡' },
      { id: 'headScratch', shortName: '[17]摸后脑勺', name: '[17] 摸后脑勺挠头', handDesc: '一手自然下垂，另一手绕至脑后轻搭后脑勺',   legDesc: '双脚一前一后自然站立，前腿微曲，重心略靠后' },
      { id: 'toeTap',      shortName: '[18]脚尖点地', name: '[18] 脚尖点地',     handDesc: '单手插兜，另一手自然垂于体侧轻微摆动',     legDesc: '支撑腿站直承重，另一腿微伸、脚尖轻缓点地' },
      { id: 'lookout',     shortName: '[20]搭腕看表', name: '[20] 搭腕看表',     handDesc: '一臂抬至胸前曲肘看表/手背，另一手轻搭手腕', legDesc: '双脚平行站立，重心偏支撑腿，另一腿微屈半步' },
    ],

    // 9. 星球探索类人形种族池（人类 + 3 大外星种族：显像管族 / 孢子傀儡 / 烬骸族，统一适配全 19 动作与 10 待机）
    SPECIES: [
      {
        id: 'human',
        name: '人类探险者',
        subName: 'Terran · 星舰拓荒者',
        tag: '标准人类',
        headSlot: '5×5 / 6×5 标准像素头骨 + 15发型 + 8帽饰',
        torsoSlot: '9款全身套装 + 6种动态袖长',
        limbSlot: '标准人类四肢比例 (thigh:6, shin:5, upper:3, fore:3)',
        fxDesc: '跑动披风波浪翻涌 · 跳跃升落平滑过渡 · 二段跳自动收隐',
      },
      {
        id: 'cathode',
        name: '显像管族',
        subName: 'Cathode-Folk · 信号遗民',
        tag: '信号遗民',
        headSlot: '6种显示器头型（方正CRT / 棱晶菱形 / 警戒正三角 / 楔形倒三角 / 八角球面 / 双联宽屏）× 6种待机动态屏显 + 液压颈柱',
        torsoSlot: '6种高矮胖瘦形态（标准/高挑/高个/丰满/宽肩/矮敦）× 6种同色系高领防寒废土风衣 + 左胸指示灯',
        limbSlot: '纯黑机械骨架四肢 + 肘膝亮色轴承 + 2px 机械钳手 & 三趾液压足',
        fxDesc: '6种待机屏幕动态内容（缺口白环/心电脉冲/电子光瞳/量子沙漏/音频频谱/三角信标）· 开火切换亮青十字准星 · 受击闪现红白雪花噪点帧',
        names: ['波段·零柒', '棱晶·拾玖', '正角·肆号', '倒楔·守望', '八角·巡游', '宽频·陆号', '扫描·玖号', '回波·拾贰'],
        lines: {
          greet: ['[信号锁定] 接收到友方载波……', '滋……显像管预热完毕，你好，旅人。', '[屏显同步] 极地残骸频道向你致意。'],
          chat: ['我们显像管族拥有方正、菱形、正三角、倒三角、八角球面与双联宽屏6种显示器头型！', '待机时显示器内会呈现圆环、心电脉冲、电子光瞳、量子沙漏、频谱或三角信标动态图案。', '一旦开火，任何形状的屏幕都会瞬间切换成亮青色十字准星。', '高挑观测官、魁梧警戒卫士与矮敦工程机兵各有不同身形与待机姿态。'],
          react: ['滋滋——信号受到干扰！', '雪花噪点报警！', '准星已校准！'],
          refuse: ['[频道占线] 正在检索失落星舰波段。'],
          flee: ['[紧急规避] 信号过载，撤离！'],
        },
      },
      {
        id: 'myco',
        name: '孢子傀儡',
        subName: 'Myco-Hosts · 菌伞旅人',
        tag: '菌伞旅人',
        headSlot: '6种立体菌伞头型 × 7种头身统一同色系（伞冠/放射菌褶/菌柄脖颈与宇航服严格同色调）+ 右檐 3px 孢子链',
        torsoSlot: '6种高矮胖瘦体型（标准/高挑修长/深穴长臂/丰满胖肚9px/魁梧宽肩/矮胖幼菇）× 7种同色系宇航服与共生菌丝',
        limbSlot: '同色系绗缝宇航服绑带四肢 + 亮色甲壳护肘护膝 + 荧光腕箍踝环 + 2px 双色手掌 & 3px 亮头勘探靴',
        fxDesc: '跑动时伞檐下发光孢子链产生滞后 1~2px 物理摆动 · 跳跃滞空时菌伞边缘微微上扬（无周围常驻粒子）',
        names: ['赤伞·行者', '霜褶·孤旅', '幽钟·柒号', '琥珀·宿体', '紫渊·伞客', '翡翠·漫游', '黑曜·拾壹', '灵芝·旅人', '幼菇·圆滚', '高拱·巡星'],
        lines: {
          greet: ['……菌伞之下，风沙止息。', '看伞底放射状的发光菌褶，正在随呼吸微闪。', '这具旧宇航服与我的菌伞保持着浑然一体的共生色调。'],
          chat: ['我们菌伞人的菌伞头部与宇航服身体始终保持同一色系，绝不乱搭撞色！', '跑起来的时候，伞边的纯白孢子吊坠会滞后摆动。', '粗壮的菌柄脖颈与宇航服高领严丝合缝，绝不浮空。', '背上的维生发酵罐里全是温润的共生菌群。'],
          react: ['孢子在震颤……', '菌褶微光闪烁！', '菌柄稳固连接！'],
          refuse: ['菌丝正在休眠光合作用中。'],
          flee: ['快速后撤！'],
        },
      },
      {
        id: 'cinder',
        name: '烬骸族',
        subName: 'Cinderborn · 余烬铸造者',
        tag: '余烬铸造者',
        headSlot: '8种火山岩/黑曜石颅骨（三尖碎角/双弯魔角/五棘日冕冠/宽平锻砧/火山口盆/尖锥兜帽/高耸方尖碑/裂颚战颅） + 熔岩颈柱',
        torsoSlot: '9种黑曜熔岩躯干变种（倒三角胸甲/黑曜祭司长甲/熔岩巨釜圆腹/火山角重铠/矮敦铁匠甲/肋骨外骸/双肩火山烟柱/余烬大斗篷）',
        limbSlot: '臂 3×7 粗壮岩石棱角臂（手肘熔岩棘 + 手腕裂隙余烬光 + 熔岩指爪） + 腿 2×5 黑曜石腿（脚底常亮余烬）',
        fxDesc: '6种面部火瞳与胸口“熔炉之心”联动（待机呼吸时火光向上跳动 1px） · 7种头身统一火山岩与熔火色温（无周围常驻粒子）',
        names: ['熔心·锻者', '黑曜·叁号', '余烬·行客', '焦岩·守炉', '金缝·铸魂', '火冠·巡林', '炭披·柒号', '星火·拾肆', '玄武·督军', '硫火·祭司'],
        lines: {
          greet: ['胸膛的熔炉之心为你跳动。', '黑曜石碎角之下，火瞳已看清你的来意。', '余烬不灭，铸造不止。'],
          chat: ['呼吸时我胸口的熔炉火光会向上跃动一格。', '无论是黑曜金焰、玄武暗红还是硫磺幽蓝，我们的岩壳与炉心色温始终浑然一体。', '这副黑岩胸甲与火山烟柱能抵御星球表面的严酷环境。', '侧面看去，我小臂外侧的岩石棱角与熔岩指爪分外分明。'],
          react: ['炉心炽燃！', '黑曜石共鸣！', '熔岩脉动！'],
          refuse: ['炉温正处于临界段，勿扰。'],
          flee: ['疾步后撤！'],
        },
      },
    ],
    // 10A. 菌伞人（Myco-Hosts）模块化随机化子池 —— 1. 伞菌头部形状 (6种立体伞冠)
    MYCO_CAP_SHAPES: [
      {
        id: 'flatUmbrella',
        name: '圆拱毒蝇巨伞 (12×7)',
        shortName: '圆拱巨伞',
        desc: '12×7 饱满圆拱毒蝇巨伞 + 凸起菌斑 + 双层放射菌褶 + 菌环长柄脖颈',
      },
      {
        id: 'archedGill',
        name: '高拱透光宽褶伞 (12×8)',
        shortName: '高拱宽褶伞',
        desc: '12×8 高耸拱顶鬼伞 + 三层大面积外露放射状菌褶拱腔 + 修长菌柄脖颈',
      },
      {
        id: 'domedBell',
        name: '高耸水母荧光钟伞 (11×9)',
        shortName: '水母钟伞',
        desc: '11×9 八行高圆拱水母钟盖 + 双侧垂挂发光孢子触须 + 菌环脖颈',
      },
      {
        id: 'wavyFunnel',
        name: '宽展翻卷漏斗号角伞 (14×8)',
        shortName: '翻卷漏斗伞',
        desc: '14×8 两侧高翘波浪卷翼 + 中央下凹漏斗 + 延生纵向棱褶脖颈',
      },
      {
        id: 'conicalMorel',
        name: '摩天尖塔蜂窝羊肚菌 (12×10)',
        shortName: '尖塔羊肚菌',
        desc: '12×10 九行摩天尖锥塔冠 + 3D 蜂窝网格凹坑棱脊 + 菌环脖颈',
      },
      {
        id: 'doubleTier',
        name: '双层叠冠灵芝星伞 (13×9)',
        shortName: '双层灵芝伞',
        desc: '13×9 顶层宝塔小菌冠 + 中层子实体菌褶环 + 下层宽展云芝大伞盘',
      },
    ],
    // 10B. 菌伞人模块化随机化子池 —— 2. 头身统一同色系伞冠配色 (7种色调，与宇航服 1:1 严格锁定同色调)
    MYCO_CAP_PALETTES: [
      {
        id: 'crimson',
        themeId: 'crimson',
        suitColorId: 'rustBark',
        name: '赤红暖褐同色系（赤红毒蝇冠 × 暖褐赤锈宇航服）',
        shortName: '赤红暖褐系',
        capHi: '#d94136',
        capMid: '#b8322a',
        capSh: '#8a221c',
        capSpot: '#ffeed6',
        gillHi: '#fff3d1',
        gillMid: '#e8cfa0',
        gillSh: '#472433',
        gillShDeep: '#2e1521',
        stipeHi: '#e6cfa1',
        stipeSh: '#9c7d54',
        sporeMid: '#e6fff2',
        sporeTip: '#6eff82',
      },
      {
        id: 'ivory',
        themeId: 'ivory',
        suitColorId: 'frostSlate',
        name: '苍白霜蓝同色系（透光瓷白冠 × 极地霜蓝宇航服）',
        shortName: '苍白霜蓝系',
        capHi: '#f2f7ff',
        capMid: '#cfe0f5',
        capSh: '#95adc9',
        capSpot: '#ffffff',
        gillHi: '#fff9c4',
        gillMid: '#e6dc8a',
        gillSh: '#3d4c63',
        gillShDeep: '#283347',
        stipeHi: '#f0ebd8',
        stipeSh: '#999482',
        sporeMid: '#fff9c4',
        sporeTip: '#6ef2d6',
      },
      {
        id: 'lumina',
        themeId: 'lumina',
        suitColorId: 'abyssTeal',
        name: '幽光水母青同色系（水母荧光青冠 × 深海青宇航服）',
        shortName: '幽光水母青系',
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
      },
      {
        id: 'amber',
        themeId: 'amber',
        suitColorId: 'ochreGold',
        name: '琥珀鸡油金同色系（琥珀亮金冠 × 荒漠赭金宇航服）',
        shortName: '琥珀亮金系',
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
      },
      {
        id: 'violet',
        themeId: 'violet',
        suitColorId: 'duskViolet',
        name: '紫渊星晶同色系（紫渊星晶冠 × 暮紫重甲宇航服）',
        shortName: '紫渊星晶系',
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
      },
      {
        id: 'emerald',
        themeId: 'emerald',
        suitColorId: 'crimsonSpore',
        name: '翡翠荧光绿同色系（翡翠毒伞冠 × 森林苔绿宇航服）',
        shortName: '翡翠荧光系',
        capHi: '#38d976',
        capMid: '#1f9e52',
        capSh: '#115e30',
        capSpot: '#d4ffea',
        gillHi: '#ecffbd',
        gillMid: '#a8e673',
        gillSh: '#184229',
        gillShDeep: '#0d2617',
        stipeHi: '#d4f5c4',
        stipeSh: '#5e9968',
        sporeMid: '#ecffbd',
        sporeTip: '#38d976',
      },
      {
        id: 'obsidian',
        themeId: 'obsidian',
        suitColorId: 'boneAsh',
        name: '黑曜熔金同色系（黑曜暗金冠 × 玄铁熔金宇航服）',
        shortName: '黑曜熔金系',
        capHi: '#595063',
        capMid: '#36303d',
        capSh: '#1f1b24',
        capSpot: '#ffd257',
        gillHi: '#ffe89e',
        gillMid: '#f59e42',
        gillSh: '#3d1e14',
        gillShDeep: '#24100a',
        stipeHi: '#e6c28a',
        stipeSh: '#8c6239',
        sporeMid: '#ffe89e',
        sporeTip: '#ff7b29',
      },
    ],
    // 10C. 模块化体型与身体结构变种池 —— 9种高矮胖瘦与躯干装甲/斗篷变种
    MYCO_BODY_BUILDS: [
      {
        id: 'standard',
        name: '标准高领风衣型 (标准身高·5px躯干)',
        shortName: '标准均衡',
        build: { thigh: 6, shin: 5, upper: 3, fore: 3 },
      },
      {
        id: 'slender',
        name: '高挑修长观测官 (高+2px·窄腰长摆)',
        shortName: '高挑修长(高+2)',
        build: { thigh: 7, shin: 6, upper: 4, fore: 3 },
      },
      {
        id: 'tall',
        name: '高个战术侦察型 (高+1px·修长四肢)',
        shortName: '高个长臂(高+1)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 4 },
      },
      {
        id: 'chubby',
        name: '重装球形反应炉躯干 (圆腹格栅·平整后背)',
        shortName: '重装圆腹(反应炉)',
        build: { thigh: 5, shin: 5, upper: 3, fore: 3 },
      },
      {
        id: 'broad',
        name: '魁梧重型肩甲胸铠 (高+1px·铆钉宽肩甲)',
        shortName: '魁梧宽肩(重肩甲)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 3 },
      },
      {
        id: 'shortChubby',
        name: '矮敦工程机甲短袄 (矮-2px·紧凑背甲)',
        shortName: '矮敦工程(矮-2)',
        build: { thigh: 4, shin: 5, upper: 3, fore: 2 },
      },
      {
        id: 'exoFrame',
        name: '镂空液压外骨骼机躯 (裸露机械脊柱·窄腰)',
        shortName: '镂空外骨骼',
        build: { thigh: 6, shin: 6, upper: 3, fore: 3 },
      },
      {
        id: 'pistonHulk',
        name: '双缸重装液压巨躯 (高+1px·双联活塞胸甲)',
        shortName: '双缸重装(活塞甲)',
        build: { thigh: 6, shin: 5, upper: 4, fore: 3 },
      },
      {
        id: 'ponchoMech',
        name: '废土防尘斗篷机兵 (斜裁工装防尘披肩)',
        shortName: '废土防尘斗篷',
        build: { thigh: 6, shin: 5, upper: 3, fore: 3 },
      },
    ],
    // 10D. 菌伞人模块化随机化子池 —— 4. 与伞冠 1:1 对应同色系的宇航服身体配色 (7种同色调服装)
    MYCO_SUIT_PALETTES: [
      {
        id: 'rustBark',
        themeId: 'crimson',
        capColorId: 'crimson',
        name: '赤红暖褐服 × 暖金翠丝 (配赤红毒蝇冠)',
        shortName: '赤红暖褐系',
        suitHi: '#6e5246',
        suitMid: '#543d32',
        suitSh: '#3b2a22',
        strapCol: '#8c6d53',
        beltCol: '#291d17',
        beltBuckle: '#e6cfa1',
        gaugeCol: '#6eff82',
        packBorder: '#261c18',
        packFill: '#3b2b25',
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
      {
        id: 'frostSlate',
        themeId: 'ivory',
        capColorId: 'ivory',
        name: '极地霜蓝服 × 柠黄冰青丝 (配透光瓷白冠)',
        shortName: '苍白霜蓝系',
        suitHi: '#525e70',
        suitMid: '#3b4454',
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
      {
        id: 'abyssTeal',
        themeId: 'lumina',
        capColorId: 'lumina',
        name: '深海幽青服 × 霓虹水母丝 (配幽光水母青冠)',
        shortName: '幽光水母青系',
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
      {
        id: 'ochreGold',
        themeId: 'amber',
        capColorId: 'amber',
        name: '荒漠赭金服 × 琥珀亮金丝 (配琥珀鸡油金冠)',
        shortName: '琥珀亮金系',
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
      {
        id: 'duskViolet',
        themeId: 'violet',
        capColorId: 'violet',
        name: '暮紫重甲服 × 紫晶霓虹丝 (配紫渊星晶冠)',
        shortName: '紫渊星晶系',
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
      {
        id: 'crimsonSpore',
        themeId: 'emerald',
        capColorId: 'emerald',
        name: '森林苔绿服 × 翡翠荧光丝 (配翡翠毒伞冠)',
        shortName: '翡翠荧光系',
        suitHi: '#3d6348',
        suitMid: '#294532',
        suitSh: '#1a2e20',
        strapCol: '#5e9968',
        beltCol: '#122117',
        beltBuckle: '#ecffbd',
        gaugeCol: '#38d976',
        packBorder: '#101f15',
        packFill: '#1d3625',
        mycHi: '#38d976',
        mycSh: '#1f9e52',
        wrapN: '#34543d',
        wrapF: '#213627',
        foreN: '#1b2e21',
        foreF: '#111f16',
        jointN: '#ecffbd',
        jointF: '#5e9968',
        sporeAir1: '#38d976',
        sporeAir2: '#ecffbd',
      },
      {
        id: 'boneAsh',
        themeId: 'obsidian',
        capColorId: 'obsidian',
        name: '玄铁黑曜服 × 炽橙熔金丝 (配黑曜暗金冠)',
        shortName: '黑曜熔金系',
        suitHi: '#484152',
        suitMid: '#322d3a',
        suitSh: '#201c26',
        strapCol: '#8c6239',
        beltCol: '#17141c',
        beltBuckle: '#ffd257',
        gaugeCol: '#ff7b29',
        packBorder: '#15121a',
        packFill: '#272230',
        mycHi: '#ffd257',
        mycSh: '#f59e42',
        wrapN: '#3d3747',
        wrapF: '#282330',
        foreN: '#211d29',
        foreF: '#15121a',
        jointN: '#ffe89e',
        jointF: '#8c6239',
        sporeAir1: '#ffd257',
        sporeAir2: '#ff7b29',
      },
    ],
    // 10E. 孢子傀儡（菌伞人 Myco-Hosts）5 大经典预设变种池（同时作为自由组合的快捷模板）
    MYCO_VARIANTS: [
      {
        id: 'crimsonUmbrella',
        name: '赤红巨伞·荒漠重装种',
        shortName: '赤红巨伞',
        capType: 'flatUmbrella',
        capColorId: 'crimson',
        suitColorId: 'rustBark',
        bodyBuild: 'standard',
        bodyBuildName: '标准均衡体型 (标准身高·5px躯干)',
        build: { thigh: 6, shin: 5, upper: 3, fore: 3 },
        capDesc: '12×7 圆拱赤红斑点巨伞 (#d94136) + 菌环长柄脖颈',
        gillDesc: '暖金米白放射状菌褶 (#fff3d1) × 深紫褐褶隙 (#2e1521)',
        bodyDesc: '暗褐绗缝宇航服 (#543d32) + 斜跨维生带 + 翠绿共生菌丝 (#6bc46f)',
        defaultIdle: 'lookout',
        suitMid: '#543d32',
        suitSh: '#3b2a22',
        packBorder: '#261c18',
        wrapN: '#59443b',
        wrapF: '#382a24',
        foreN: '#2b2422',
        foreF: '#1c1817',
        jointN: '#e6cfa1',
        jointF: '#9c7d54',
        mycHi: '#6bc46f',
        mycSh: '#4d8f52',
        sporeAir1: '#6eff82',
        sporeAir2: '#b8322a',
      },
      {
        id: 'ivoryGhost',
        name: '苍白鬼伞·修长高挑种',
        shortName: '苍白鬼伞',
        capType: 'archedGill',
        capColorId: 'ivory',
        suitColorId: 'frostSlate',
        bodyBuild: 'slender',
        bodyBuildName: '高挑修长体型 (高+2px·窄腰)',
        build: { thigh: 7, shin: 6, upper: 4, fore: 3 },
        capDesc: '12×8 高拱透光瓷白鬼伞 (#f2f7ff) + 修长菌环脖颈',
        gillDesc: '三层外露柠檬暖黄放射菌褶 (#fff9c4) × 深靛紫褶隙 (#283347)',
        bodyDesc: '高挑收腰霜灰宇航服 (#3b4454) + 气压仪表阀 + 冰青荧光菌丝 (#6ef2d6)',
        defaultIdle: 'cross',
        suitMid: '#39424f',
        suitSh: '#262d38',
        packBorder: '#1a202c',
        wrapN: '#4a5568',
        wrapF: '#2d3542',
        foreN: '#252b36',
        foreF: '#181c24',
        jointN: '#fff9c4',
        jointF: '#8fa4c4',
        mycHi: '#6ef2d6',
        mycSh: '#38b2ac',
        sporeAir1: '#fff9c4',
        sporeAir2: '#6ef2d6',
      },
      {
        id: 'luminaBell',
        name: '幽光钟伞·深穴水母种',
        shortName: '幽光钟伞',
        capType: 'domedBell',
        capColorId: 'lumina',
        suitColorId: 'abyssTeal',
        bodyBuild: 'tall',
        bodyBuildName: '深穴长臂高个型 (高+1px·长臂)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 4 },
        capDesc: '11×9 高耸水母荧光钟伞 (#5ce1e6) + 双侧孢子触须 + 菌柄脖颈',
        gillDesc: '薄荷冰白放射状菌褶 (#e0fff9) × 深海青褶隙 (#163845)',
        bodyDesc: '深渊青灰宇航服 (#283b42) + 液位观察背囊 + 霓虹青菌丝 (#5ce1e6)',
        defaultIdle: 'think',
        suitMid: '#283b42',
        suitSh: '#19272c',
        packBorder: '#101a1e',
        wrapN: '#344f59',
        wrapF: '#1f3036',
        foreN: '#1d2c33',
        foreF: '#121c21',
        jointN: '#c4fff9',
        jointF: '#4a8c8a',
        mycHi: '#5ce1e6',
        mycSh: '#2998a6',
        sporeAir1: '#5ce1e6',
        sporeAir2: '#e0fff9',
      },
      {
        id: 'amberChanterelle',
        name: '琥珀鸡油菌·丰满圆腹种',
        shortName: '琥珀鸡油菌',
        capType: 'wavyFunnel',
        capColorId: 'amber',
        suitColorId: 'ochreGold',
        bodyBuild: 'chubby',
        bodyBuildName: '敦实丰满圆腹型 (平整后背·圆腹)',
        build: { thigh: 5, shin: 5, upper: 3, fore: 3 },
        capDesc: '14×8 宽展翻卷波浪漏斗号角伞 (#f5b041) + 粗壮延生金褶脖颈',
        gillDesc: '象牙亮金延生放射菌褶 (#fff3c4) × 焦糖褐褶隙 (#4a2810)',
        bodyDesc: '丰满圆腹赭石宇航服 (#4a4333) + 紧凑维生背囊 + 琥珀金菌丝',
        defaultIdle: 'backhands',
        suitMid: '#4a4333',
        suitSh: '#332e22',
        packBorder: '#242016',
        wrapN: '#5c523d',
        wrapF: '#383224',
        foreN: '#2e291f',
        foreF: '#1f1b14',
        jointN: '#ffe6a3',
        jointF: '#a67432',
        mycHi: '#f5b041',
        mycSh: '#c97a24',
        sporeAir1: '#ffe6a3',
        sporeAir2: '#d9822b',
      },
      {
        id: 'violetMorel',
        name: '紫渊网盖·尖塔魁梧种',
        shortName: '紫渊网盖',
        capType: 'conicalMorel',
        capColorId: 'violet',
        suitColorId: 'duskViolet',
        bodyBuild: 'broad',
        bodyBuildName: '魁梧宽肩重甲型 (高+1px·宽肩甲)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 3 },
        capDesc: '12×10 摩天尖塔蜂窝羊肚菌 (#b366ff) + 紫晶菌环脖颈',
        gillDesc: '浅薰衣草放射状菌褶 (#f5e0ff) × 暗紫渊褶隙 (#2b123d)',
        bodyDesc: '魁梧宽肩暮紫重装宇航服 (#382c42) + 霓虹紫晶菌丝 (#e066ff)',
        defaultIdle: 'hug',
        suitMid: '#382c42',
        suitSh: '#241b2b',
        packBorder: '#18111d',
        wrapN: '#493859',
        wrapF: '#2b2036',
        foreN: '#241b2e',
        foreF: '#16101c',
        jointN: '#f5e0ff',
        jointF: '#7a5299',
        mycHi: '#e066ff',
        mycSh: '#9b38bd',
        sporeAir1: '#e066ff',
        sporeAir2: '#6eff82',
      },
    ],
    // 11A. 显像管族（Cathode-Folk）模块化子池 —— 1. 显示器头部几何形状 (10种工业机械监视器/传感器头型)
    CATHODE_HEAD_SHAPES: [
      {
        id: 'crtBox',
        name: '方正复古显像管 (7×6)',
        shortName: '方正CRT',
        desc: '7×6 经典方正复古电视机壳 + 5×4 纯黑内屏 + 机械液压颈柱',
      },
      {
        id: 'diamond',
        name: '悬浮棱晶菱形屏 (9×9)',
        shortName: '棱晶菱形屏',
        desc: '9×9 45°旋转八面棱晶菱形显示器 + 菱形黑屏 + 顶部信号晶针',
      },
      {
        id: 'triangle',
        name: '警戒正三角金字塔屏 (11×8)',
        shortName: '正三角屏',
        desc: '11×8 尖顶朝上正三角形重装显示器 + 三角黑屏 + 顶部警戒信标灯',
      },
      {
        id: 'invTriangle',
        name: '楔形倒三角战术雷达屏 (11×8)',
        shortName: '倒三角屏',
        desc: '11×8 上宽下尖倒三角楔形侦察头 + 倒三角黑屏 + 双侧雷达耳翼',
      },
      {
        id: 'hexOctagon',
        name: '八角球面重工监视器 (9×8)',
        shortName: '八角球面屏',
        desc: '9×8 切角八边形重装甲壳 + 宽幅球面黑屏 + 两侧声呐耳仓',
      },
      {
        id: 'wideScope',
        name: '双联宽屏示波终端 (11×6)',
        shortName: '双联宽屏',
        desc: '11×6 超宽全景示波器机壳 + 9×4 全景黑屏 + 顶部三联散热鳍片',
      },
      {
        id: 'cylinderTube',
        name: '竖置真空电子管屏 (7×9)',
        shortName: '真空电子管',
        desc: '7×9 竖高圆拱真空管顶盖 + 5×6 竖长示波黑屏 + 顶部极柱针',
      },
      {
        id: 'visorSlit',
        name: '重装横缝装甲头 (9×7)',
        shortName: '横缝装甲头',
        desc: '9×7 扁平厚重装甲额头与下颌护板 + 7×2 窄横缝潜望黑屏 + 额部铆钉',
      },
      {
        id: 'twinLens',
        name: '双筒光学测距仪头 (10×7)',
        shortName: '双筒测距仪',
        desc: '10×7 左右双独立方圆光学镜筒 + 中央金属鼻梁隔断 + 顶部调焦轮',
      },
      {
        id: 'radarDish',
        name: '斜切抛物面天线头 (9×8)',
        shortName: '抛物面天线',
        desc: '9×8 非对称圆弧雷达罩 + 偏心圆屏 + 顶部斜伸馈源探针',
      },
    ],
    // 11B. 显像管族模块化子池 —— 2. 待机屏幕动态内容图案 (6种动态屏显)
    CATHODE_SCREEN_MOTIFS: [
      {
        id: 'ring',
        name: '缺口极简圆环 (上下浮动1px)',
        shortName: '缺口圆环',
        desc: '夜空同款 5px 缺口极简圆环，随呼吸上下浮动 1 像素',
      },
      {
        id: 'heartbeat',
        name: '心电脉冲波纹 (动态推进跳动)',
        shortName: '心电脉冲',
        desc: '横贯屏幕的心电图折线波峰，待机时左右推进跳动',
      },
      {
        id: 'eyeScan',
        name: '独眼电子光瞳 (左右巡视扫描)',
        shortName: '电子光瞳',
        desc: '水平眼睑扫描线与高亮机械光瞳，待机时左右巡视锁定',
      },
      {
        id: 'hourglass',
        name: '双三角量子沙漏 (上下流转脉动)',
        shortName: '量子沙漏',
        desc: '上下对顶双三角沙漏晶格，待机时中心光子上下流转',
      },
      {
        id: 'equalizer',
        name: '三柱音频频谱 (高低交替跃动)',
        shortName: '频谱跃动',
        desc: '左中右三列声波频谱柱，待机时随载波高低交替跳动',
      },
      {
        id: 'radarTri',
        name: '三角信标准星 (相位闪烁锁定)',
        shortName: '三角信标',
        desc: '三角形空心雷达准星与四角信标点，待机时呼吸闪烁',
      },
    ],
    // 11C. 显像管族模块化子池 —— 3. 纯正工业机械金属涂装 (8种低饱和金属/铁锈/枪铁/军工/电木机械色，绝无花哨亮色)
    CATHODE_COLOR_THEMES: [
      {
        id: 'polarBlue',
        name: '极地冷钢灰蓝机壳 × 深石板灰风衣',
        shortName: '极地冷钢',
        shellHi: '#b4c4d8',
        shellMid: '#8b9bb0',
        shellSh: '#4f5d73',
        shellDark: '#2a3240',
        scrBg: '#0c0f14',
        scrMain: '#eef3fa',
        scrSub: '#7ec8e3',
        ledCol: '#7ec8e3',
        coatHi: '#455063',
        coatMid: '#323946',
        coatSh: '#232832',
        coatHem: '#1b1f27',
        strapCol: '#59667a',
        jointN: '#9aa4b8',
        jointF: '#647082',
      },
      {
        id: 'gunmetal',
        name: '枪铁黑钛装甲机壳 × 碳黑重工风衣',
        shortName: '枪铁黑钛',
        shellHi: '#8c929c',
        shellMid: '#636872',
        shellSh: '#3d414a',
        shellDark: '#202329',
        scrBg: '#0a0b0e',
        scrMain: '#dce3ed',
        scrSub: '#8fa3ba',
        ledCol: '#d98a4e',
        coatHi: '#383b42',
        coatMid: '#26292e',
        coatSh: '#1a1c20',
        coatHem: '#121317',
        strapCol: '#4f545e',
        jointN: '#8c929c',
        jointF: '#555963',
      },
      {
        id: 'brushedAlum',
        name: '拉丝银铝机壳 × 铁灰机务风衣',
        shortName: '拉丝银铝',
        shellHi: '#d0d5dd',
        shellMid: '#a2aab5',
        shellSh: '#67707d',
        shellDark: '#363c45',
        scrBg: '#0d1014',
        scrMain: '#f2f5f8',
        scrSub: '#90b4c8',
        ledCol: '#88c0d0',
        coatHi: '#4e545e',
        coatMid: '#393e46',
        coatSh: '#272b31',
        coatHem: '#1c1f24',
        strapCol: '#69717d',
        jointN: '#bcc3ce',
        jointF: '#78808c',
      },
      {
        id: 'rustIron',
        name: '锈铁铸铜重工机壳 × 煤褐防尘风衣',
        shortName: '锈铁铸铜',
        shellHi: '#a88470',
        shellMid: '#7d5c4a',
        shellSh: '#4f382c',
        shellDark: '#2b1e17',
        scrBg: '#100c0a',
        scrMain: '#ebd9c8',
        scrSub: '#c99366',
        ledCol: '#d98a4e',
        coatHi: '#4a3d36',
        coatMid: '#362c27',
        coatSh: '#241d19',
        coatHem: '#191411',
        strapCol: '#665145',
        jointN: '#9c7c69',
        jointF: '#634d40',
      },
      {
        id: 'oliveDrab',
        name: '军工铸铁灰绿机壳 × 战壕橄榄灰风衣',
        shortName: '军工灰绿',
        shellHi: '#969e8c',
        shellMid: '#6e7665',
        shellSh: '#464d3f',
        shellDark: '#262b22',
        scrBg: '#0a0f0b',
        scrMain: '#dce6d5',
        scrSub: '#8ab095',
        ledCol: '#8ab095',
        coatHi: '#42473d',
        coatMid: '#2f332b',
        coatSh: '#20241d',
        coatHem: '#161914',
        strapCol: '#596152',
        jointN: '#8d9683',
        jointF: '#5a6152',
      },
      {
        id: 'ivoryScope',
        name: '旧化电木米灰机壳 × 油布灰褐工程服',
        shortName: '旧化电木',
        shellHi: '#cec7b8',
        shellMid: '#9e9788',
        shellSh: '#666055',
        shellDark: '#36322b',
        scrBg: '#0c1012',
        scrMain: '#e6ece8',
        scrSub: '#84b0a8',
        ledCol: '#84b0a8',
        coatHi: '#524d44',
        coatMid: '#3b3730',
        coatSh: '#282520',
        coatHem: '#1c1a16',
        strapCol: '#70695c',
        jointN: '#b8b0a0',
        jointF: '#756f63',
      },
      {
        id: 'tungsten',
        name: '钨钢磨砂玄铁机壳 × 深炭黑外骨骼甲',
        shortName: '钨钢玄铁',
        shellHi: '#7c8490',
        shellMid: '#545b66',
        shellSh: '#343942',
        shellDark: '#1b1e24',
        scrBg: '#080a0d',
        scrMain: '#d8e0ea',
        scrSub: '#7896b0',
        ledCol: '#7896b0',
        coatHi: '#32363e',
        coatMid: '#22252b',
        coatSh: '#17191d',
        coatHem: '#0f1114',
        strapCol: '#484f59',
        jointN: '#7c8490',
        jointF: '#4a5059',
      },
      {
        id: 'weatheredBrass',
        name: '旧化黄铜钢壳 × 铁褐重装工程服',
        shortName: '旧化黄铜',
        shellHi: '#b5a37e',
        shellMid: '#8a7958',
        shellSh: '#574b34',
        shellDark: '#2e271a',
        scrBg: '#0e0c09',
        scrMain: '#ebe3d2',
        scrSub: '#bfa06a',
        ledCol: '#cfa65b',
        coatHi: '#4a4337',
        coatMid: '#353027',
        coatSh: '#24201a',
        coatHem: '#191612',
        strapCol: '#695d47',
        jointN: '#a89672',
        jointF: '#695d47',
      },
    ],
    // 11D. 显像管族（Cathode-Folk）8 大工业机械预设变种池（纯正机械配色 + 10种头型 + 9种机械身体变种）
    CATHODE_VARIANTS: [
      {
        id: 'retroCrt',
        name: '极地冷钢·方正显像管标准种',
        shortName: '方正CRT·冷钢',
        headShape: 'crtBox',
        screenMotif: 'ring',
        colorThemeId: 'polarBlue',
        bodyBuild: 'standard',
        bodyBuildName: '标准高领风衣型 (标准身高·5px躯干)',
        build: { thigh: 6, shin: 5, upper: 3, fore: 3 },
        defaultIdle: 'lookout',
        headDesc: '7×6 极地冷钢方正显像管 (#8b9bb0) + 5×4 黑屏缺口白环',
        screenDesc: '缺口极简圆环 (随呼吸上下浮动 1px)',
        bodyDesc: '标准高领防寒废土风衣 (#323946) + 冰青指示灯 (#7ec8e3)',
      },
      {
        id: 'diamondPrism',
        name: '拉丝银铝·棱晶高挑观测官',
        shortName: '菱形屏·银铝',
        headShape: 'diamond',
        screenMotif: 'hourglass',
        colorThemeId: 'brushedAlum',
        bodyBuild: 'slender',
        bodyBuildName: '高挑修长观测官 (高+2px·窄腰长摆)',
        build: { thigh: 7, shin: 6, upper: 4, fore: 3 },
        defaultIdle: 'cross',
        headDesc: '9×9 拉丝银铝八面棱晶屏 (#a2aab5) + 顶部信号晶针',
        screenDesc: '双三角量子沙漏 (中心光子上下流转)',
        bodyDesc: '高挑修长铁灰机务长风衣 (#393e46) + 机械冷青指示灯 (#88c0d0)',
      },
      {
        id: 'triangleSentinel',
        name: '枪铁黑钛·正三角魁梧卫士',
        shortName: '正三角·枪铁',
        headShape: 'triangle',
        screenMotif: 'eyeScan',
        colorThemeId: 'gunmetal',
        bodyBuild: 'broad',
        bodyBuildName: '魁梧重型肩甲胸铠 (高+1px·铆钉宽肩甲)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 3 },
        defaultIdle: 'hips',
        headDesc: '11×8 枪铁黑钛正三角金字塔屏 (#636872) + 顶部信标灯',
        screenDesc: '独眼电子光瞳 (待机左右巡视扫描)',
        bodyDesc: '魁梧宽肩铆钉装甲风衣 (#26292e) + 工业暖橙指示灯 (#d98a4e)',
      },
      {
        id: 'wedgeRadar',
        name: '军工灰绿·倒三角高个侦察兵',
        shortName: '倒三角·军工',
        headShape: 'invTriangle',
        screenMotif: 'heartbeat',
        colorThemeId: 'oliveDrab',
        bodyBuild: 'tall',
        bodyBuildName: '高个战术侦察型 (高+1px·修长四肢)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 4 },
        defaultIdle: 'think',
        headDesc: '11×8 军工铸铁倒三角雷达屏 (#6e7665) + 双侧雷达耳翼',
        screenDesc: '心电脉冲波纹 (折线波峰左右推进)',
        bodyDesc: '高个战壕橄榄灰战术衣 (#2f332b) + 灰绿示波灯 (#8ab095)',
      },
      {
        id: 'hexDomeHeavy',
        name: '锈铁铸铜·八角球重装反应炉种',
        shortName: '八角屏·锈铁',
        headShape: 'hexOctagon',
        screenMotif: 'equalizer',
        colorThemeId: 'rustIron',
        bodyBuild: 'chubby',
        bodyBuildName: '重装球形反应炉躯干 (圆腹格栅·平整后背)',
        build: { thigh: 5, shin: 5, upper: 3, fore: 3 },
        defaultIdle: 'backhands',
        headDesc: '9×8 锈铁铸铜八角球面监视器 (#7d5c4a) + 双侧声呐耳仓',
        screenDesc: '三柱音频频谱 (三列声波高低跳动)',
        bodyDesc: '圆腹散热格栅重工胸甲 (#362c27) + 铸铜指示灯 (#d98a4e)',
      },
      {
        id: 'wideScopeUnit',
        name: '旧化电木·双联宽屏矮敦机兵',
        shortName: '双联屏·电木',
        headShape: 'wideScope',
        screenMotif: 'radarTri',
        colorThemeId: 'ivoryScope',
        bodyBuild: 'shortChubby',
        bodyBuildName: '矮敦工程机甲短袄 (矮-2px·紧凑背甲)',
        build: { thigh: 4, shin: 5, upper: 3, fore: 2 },
        defaultIdle: 'salute',
        headDesc: '11×6 旧化电木双联宽屏终端 (#9e9788) + 顶部散热鳍片',
        screenDesc: '三角信标准星 (空心三角相位闪烁)',
        bodyDesc: '矮敦油布灰褐工程短袄 (#3b3730) + 灰青指示灯 (#84b0a8)',
      },
      {
        id: 'tubeExoUnit',
        name: '钨钢玄铁·真空管镂空外骨骼种',
        shortName: '真空管·外骨骼',
        headShape: 'cylinderTube',
        screenMotif: 'heartbeat',
        colorThemeId: 'tungsten',
        bodyBuild: 'exoFrame',
        bodyBuildName: '镂空液压外骨骼机躯 (裸露机械脊柱·窄腰)',
        build: { thigh: 6, shin: 6, upper: 3, fore: 3 },
        defaultIdle: 'beltHook',
        headDesc: '7×9 钨钢竖置真空电子管屏 (#545b66) + 顶部极柱针',
        screenDesc: '心电脉冲波纹 (折线波峰左右推进)',
        bodyDesc: '镂空液压外骨骼机躯 (#22252b) + 裸露机械脊柱与钢蓝灯 (#7896b0)',
      },
      {
        id: 'visorPistonUnit',
        name: '旧化黄铜·横缝装甲双缸重机兵',
        shortName: '横缝头·双缸甲',
        headShape: 'visorSlit',
        screenMotif: 'eyeScan',
        colorThemeId: 'weatheredBrass',
        bodyBuild: 'pistonHulk',
        bodyBuildName: '双缸重装液压巨躯 (高+1px·双联活塞胸甲)',
        build: { thigh: 6, shin: 5, upper: 4, fore: 3 },
        defaultIdle: 'stretch',
        headDesc: '9×7 旧化黄铜重装横缝装甲头 (#8a7958) + 窄横缝潜望屏',
        screenDesc: '独眼电子光瞳 (待机左右巡视扫描)',
        bodyDesc: '双缸重装液压活塞胸甲 (#353027) + 黄铜指示灯 (#cfa65b)',
      },
    ],
    // 13A. 烬骸族（Cinderborn / 余烬铸造者）模块化子池 —— 1. 火山岩/黑曜石颅骨头型 (8种)
    CINDER_HEAD_SHAPES: [
      {
        id: 'jaggedCrag',
        name: '三尖黑曜碎角颅 (6×6)',
        shortName: '三尖碎角颅',
        desc: '6×6 不规则焦黑火山岩轮廓 + 头顶 3 个尖锐黑曜石碎角 + 熔岩颈柱',
      },
      {
        id: 'twinHorn',
        name: '双弯熔岩魔角颅 (8×8)',
        shortName: '双弯魔角颅',
        desc: '8×8 左右向外斜耸的玄武岩巨角 + 角尖余烬火光 + 额头熔岩裂痕',
      },
      {
        id: 'crownSpire',
        name: '五棘日冕王冠颅 (8×8)',
        shortName: '五棘日冕冠',
        desc: '8×8 头顶环绕 5 根高低错落的黑曜石晶刺王冠 + 中央主刺金焰',
      },
      {
        id: 'anvilFlat',
        name: '宽平锻砧重装颅 (8×6)',
        shortName: '宽平锻砧颅',
        desc: '8×6 厚重铸铁锻砧平顶岩颅 + 两侧凸出耳护岩棱 + 敦实颈甲',
      },
      {
        id: 'calderaCrater',
        name: '火山口凹陷盆颅 (8×7)',
        shortName: '火山口盆颅',
        desc: '8×7 头顶中央内凹活火山盆口 + 内部翻涌炽白与金橘熔岩火光',
      },
      {
        id: 'hoodedObsidian',
        name: '尖锥兜帽岩壳颅 (8×8)',
        shortName: '尖锥兜帽颅',
        desc: '8×8 森林旅人风格的高耸前倾黑曜石尖顶兜帽壳 + 暗影帽檐',
      },
      {
        id: 'cyclopsMonolith',
        name: '高耸方尖碑巨颅 (6×9)',
        shortName: '方尖碑巨颅',
        desc: '6×9 纵向高耸的古遗迹黑曜石方尖碑巨颅 + 额顶发光火印',
      },
      {
        id: 'splitMandible',
        name: '裂颚重甲战颅 (8×7)',
        shortName: '裂颚战颅',
        desc: '8×7 额顶双棱刺 + 下颌两侧外扩的黑曜石獠牙护颚与颚间熔岩隙',
      },
    ],
    // 13B. 烬骸族模块化子池 —— 2. 面部火瞳与胸口“熔炉之心”动态联动形态 (6种)
    CINDER_CORE_MOTIFS: [
      {
        id: 'vertSlit',
        name: '竖缝火瞳 × 经典熔炉之心',
        shortName: '竖缝火瞳',
        desc: '面部 2px 高饱和亮金竖缝 + 胸口 2×3 镂空熔炉之心（呼吸向上跳动 1px）',
      },
      {
        id: 'crossForge',
        name: '十字锻纹 × 十字星芒炉心',
        shortName: '十字锻纹',
        desc: '面部十字锻造火印 + 胸口十字星芒高炉核心（中心纯白炽核）',
      },
      {
        id: 'triEmber',
        name: '三眼余烬 × 倒三角三核熔炉',
        shortName: '三眼余烬',
        desc: '面部品字形三眼余烬火瞳 + 胸口倒三角三核聚变熔炉',
      },
      {
        id: 'visoredMagma',
        name: '横贯熔岩目镜 × 双列高炉火栅',
        shortName: '横贯目镜',
        desc: '面部 4px 横贯式熔岩护目缝 + 胸口双列竖向高炉散热火栅',
      },
      {
        id: 'weepingLava',
        name: '泣血熔岩双痕 × 纵向深渊裂谷',
        shortName: '熔岩双痕',
        desc: '面部双道纵向流淌熔岩泪痕 + 胸口纵向贯通式深渊熔岩裂谷',
      },
      {
        id: 'hollowCore',
        name: '空洞旋涡火眼 × 环状日冕熔炉',
        shortName: '日冕旋涡',
        desc: '面部中空黑曜石火环眼 + 胸口环状日食日冕熔炉（外圈炽焰跳动）',
      },
    ],
    // 13C. 烬骸族模块化子池 —— 3. 头身统一火山矿物岩壳 × 披肩装甲 × 熔炉核心色温涂装 (12种高辨识度预设配色)
    CINDER_COLOR_THEMES: [
      {
        id: 'obsidianGold',
        name: '黑曜金焰（焦黑火山岩 × 焦炭褐披肩 × 亮金橘红熔火 · 经典原色）',
        shortName: '黑曜金焰',
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
      {
        id: 'basaltCrimson',
        name: '赤红血曜（暗绯斑岩壳 × 绯金重披肩 × 猩红地心血焰）',
        shortName: '赤红血曜',
        rockHi: '#5e363c',
        rockMid: '#45252a',
        rockBase: '#2e181c',
        rockDeep: '#1a0d10',
        shawlHi: '#7a2e34',
        shawlMid: '#571e23',
        shawlTrim: '#b84248',
        beltCol: '#3d171b',
        beltGlow: '#e62e35',
        flameCore: '#fff0eb',
        flameHi: '#ff8566',
        flameMid: '#f24438',
        flameLow: '#d92626',
        wristGlow: '#ff5238',
        soleEmber: '#c4271d',
      },
      {
        id: 'blueSulfur',
        name: '硫磺钴蓝（深海钴蓝硫矿岩 × 苍青矿脉披肩 × 电光冰蓝冷焰）',
        shortName: '硫磺钴蓝',
        rockHi: '#3d5878',
        rockMid: '#2b4059',
        rockBase: '#1c2b3d',
        rockDeep: '#101824',
        shawlHi: '#2f5e78',
        shawlMid: '#204257',
        shawlTrim: '#4aa3cc',
        beltCol: '#1b3547',
        beltGlow: '#2998f2',
        flameCore: '#f2fcff',
        flameHi: '#7ef0ff',
        flameMid: '#45b6ff',
        flameLow: '#2989ff',
        wristGlow: '#4cd4ff',
        soleEmber: '#1f7ae0',
      },
      {
        id: 'whiteAsh',
        name: '苍白骨灰（钙化灰白浮石 × 暖赭锻造披肩 × 炽白暖金炉火）',
        shortName: '苍白骨灰',
        rockHi: '#8a8279',
        rockMid: '#6b645c',
        rockBase: '#4f4943',
        rockDeep: '#2e2a27',
        shawlHi: '#8c694f',
        shawlMid: '#664b38',
        shawlTrim: '#b88b66',
        beltCol: '#47362b',
        beltGlow: '#e66c2c',
        flameCore: '#ffffff',
        flameHi: '#fff099',
        flameMid: '#ffab40',
        flameLow: '#ff7b29',
        wristGlow: '#ff9436',
        soleEmber: '#e0671f',
      },
      {
        id: 'copperSlag',
        name: '古铜翠焰（铜绿孔雀石矿岩 × 古铜褐披肩 × 翡翠铜盐毒焰）',
        shortName: '古铜翠焰',
        rockHi: '#3d6352',
        rockMid: '#2b473b',
        rockBase: '#1d3028',
        rockDeep: '#101c17',
        shawlHi: '#6b533b',
        shawlMid: '#4d3b29',
        shawlTrim: '#52996b',
        beltCol: '#2b382f',
        beltGlow: '#26bd68',
        flameCore: '#f2fff5',
        flameHi: '#a3ff8f',
        flameMid: '#52e078',
        flameLow: '#26bd68',
        wristGlow: '#47d973',
        soleEmber: '#1da656',
      },
      {
        id: 'voidViolet',
        name: '紫晶虚空（暗紫水晶岩壳 × 星渊银紫披肩 × 霓虹洋红紫电）',
        shortName: '紫晶虚空',
        rockHi: '#594075',
        rockMid: '#402d57',
        rockBase: '#2b1e3b',
        rockDeep: '#171021',
        shawlHi: '#6c498a',
        shawlMid: '#4d3366',
        shawlTrim: '#9d68c9',
        beltCol: '#342247',
        beltGlow: '#a638f2',
        flameCore: '#fdf2ff',
        flameHi: '#f2a6ff',
        flameMid: '#d56bff',
        flameLow: '#b338ff',
        wristGlow: '#d959ff',
        soleEmber: '#9829e0',
      },
      {
        id: 'ironCinder',
        name: '赤铁赭金（赤铁褐矿岩 × 锻钢灰金披肩 × 琥珀亮金高炉火）',
        shortName: '赤铁赭金',
        rockHi: '#66483e',
        rockMid: '#4d352d',
        rockBase: '#36241f',
        rockDeep: '#1f1411',
        shawlHi: '#59544f',
        shawlMid: '#403c38',
        shawlTrim: '#8c7258',
        beltCol: '#332824',
        beltGlow: '#d95b26',
        flameCore: '#fff7e6',
        flameHi: '#ffbb5c',
        flameMid: '#f07829',
        flameLow: '#d94e1f',
        wristGlow: '#f06424',
        soleEmber: '#c24116',
      },
      {
        id: 'jadeMagma',
        name: '碧玉青莲（墨玉青碧蛇纹岩 × 金丝墨玉披肩 × 碧青地心莲火）',
        shortName: '碧玉青莲',
        rockHi: '#386b68',
        rockMid: '#274d4a',
        rockBase: '#193331',
        rockDeep: '#0e1f1e',
        shawlHi: '#426658',
        shawlMid: '#2d473d',
        shawlTrim: '#8ab87a',
        beltCol: '#1f3630',
        beltGlow: '#20c997',
        flameCore: '#f0fffc',
        flameHi: '#7affd4',
        flameMid: '#26e0b5',
        flameLow: '#14b897',
        wristGlow: '#3df5c8',
        soleEmber: '#129e82',
      },
      {
        id: 'solarQuartz',
        name: '日冕金晶（黄金石英砂岩 × 朱红皇室披肩 × 耀白太阳真火）',
        shortName: '日冕金晶',
        rockHi: '#856a3d',
        rockMid: '#634e2b',
        rockBase: '#45361d',
        rockDeep: '#261d0f',
        shawlHi: '#85382b',
        shawlMid: '#5e251c',
        shawlTrim: '#d99b38',
        beltCol: '#47281a',
        beltGlow: '#ff9d26',
        flameCore: '#ffffff',
        flameHi: '#fff380',
        flameMid: '#ffc426',
        flameLow: '#ff8819',
        wristGlow: '#ffae29',
        soleEmber: '#e67312',
      },
      {
        id: 'frostObsidian',
        name: '极地冰曜（冰川苍蓝晶岩 × 极地霜银披肩 × 极光冰青冷核）',
        shortName: '极地冰曜',
        rockHi: '#5e768c',
        rockMid: '#435669',
        rockBase: '#2d3b4a',
        rockDeep: '#19222b',
        shawlHi: '#788c9e',
        shawlMid: '#566675',
        shawlTrim: '#99c2e0',
        beltCol: '#32414f',
        beltGlow: '#47d1eb',
        flameCore: '#ffffff',
        flameHi: '#b8f7ff',
        flameMid: '#66e3ff',
        flameLow: '#26b8eb',
        wristGlow: '#7af0ff',
        soleEmber: '#2299c7',
      },
      {
        id: 'rustFurnace',
        name: '赭石熔渣（铁锈橙红火山渣 × 炭黑黄铜铆钉披肩 × 白炽柠檬黄高温焰）',
        shortName: '赭石熔渣',
        rockHi: '#80462e',
        rockMid: '#5e3220',
        rockBase: '#402115',
        rockDeep: '#24120b',
        shawlHi: '#47423c',
        shawlMid: '#302d29',
        shawlTrim: '#b8863d',
        beltCol: '#36241c',
        beltGlow: '#eb7a24',
        flameCore: '#ffffff',
        flameHi: '#f7ff7a',
        flameMid: '#ffad29',
        flameLow: '#e65519',
        wristGlow: '#ffcc33',
        soleEmber: '#d94e16',
      },
      {
        id: 'nebulaRose',
        name: '星云绯晶（蔷薇辉石暗粉岩 × 暮色紫金披肩 × 樱粉等离子电弧）',
        shortName: '星云绯晶',
        rockHi: '#75425e',
        rockMid: '#572f45',
        rockBase: '#3b1f2f',
        rockDeep: '#21101a',
        shawlHi: '#543b63',
        shawlMid: '#3b2847',
        shawlTrim: '#c9689e',
        beltCol: '#382033',
        beltGlow: '#f24794',
        flameCore: '#fff5fa',
        flameHi: '#ff99c8',
        flameMid: '#ff529a',
        flameLow: '#d92670',
        wristGlow: '#ff6eb0',
        soleEmber: '#bf1f62',
      },
    ],
    // 14. 烬骸族（Cinderborn / 余烬铸造者）12 大高辨识度预设变种（覆盖 12 种矿物熔岩色温与多样腿部姿势）
    CINDER_VARIANTS: [
      {
        id: 'obsidianForge',
        name: '黑曜金焰·余烬标准铸造者',
        shortName: '三尖颅·黑曜金',
        headShape: 'jaggedCrag',
        coreMotif: 'vertSlit',
        colorThemeId: 'obsidianGold',
        bodyBuild: 'standard',
        bodyBuildName: '倒三角黑岩胸甲+短披肩 (标准体型)',
        build: { thigh: 6, shin: 5, upper: 3, fore: 3 },
        defaultIdle: 'lookout',
        headDesc: '6×6 三尖黑曜碎角颅 (#1c1918) + 2px 亮金竖缝 (#ffd23f)',
        coreDesc: '竖缝火瞳 × 2×3 经典熔炉之心 (呼吸跳动 1px)',
        bodyDesc: '8×11 倒三角黑岩胸甲 + 焦炭短披肩 (#332a27)',
      },
      {
        id: 'basaltHornLord',
        name: '赤红血曜·双角魁梧熔岩督军',
        shortName: '双魔角·赤血曜',
        headShape: 'twinHorn',
        coreMotif: 'crossForge',
        colorThemeId: 'basaltCrimson',
        bodyBuild: 'broad',
        bodyBuildName: '魁梧双肩火山角重铠 (高+1px·宽肩甲)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 3 },
        defaultIdle: 'beltHook',
        headDesc: '8×8 赤红斑岩双弯魔角颅 (#2e181c) + 十字锻纹火瞳',
        coreDesc: '十字锻纹火瞳 × 十字星芒血焰炉心 (#ff8566)',
        bodyDesc: '魁梧绯金火山角重铠 (#571e23) + 猩红熔岩带',
      },
      {
        id: 'sulfurCrownPriest',
        name: '硫磺钴蓝·日冕高挑祭司',
        shortName: '日冕冠·硫钴蓝',
        headShape: 'crownSpire',
        coreMotif: 'triEmber',
        colorThemeId: 'blueSulfur',
        bodyBuild: 'slender',
        bodyBuildName: '高挑修长黑曜祭司甲 (高+2px·窄腰长摆)',
        build: { thigh: 7, shin: 6, upper: 4, fore: 3 },
        defaultIdle: 'collarFix',
        headDesc: '8×8 钴蓝硫矿五棘日冕冠 (#1c2b3d) + 三眼冰蓝火瞳',
        coreDesc: '三眼余烬 × 倒三角三核幽蓝熔炉 (#7ef0ff)',
        bodyDesc: '高挑修长苍青祭司长甲 (#204257) + 电光冰蓝火脉',
      },
      {
        id: 'ashAnvilSmith',
        name: '苍白骨灰·锻砧矮敦铁匠',
        shortName: '锻砧颅·苍白灰',
        headShape: 'anvilFlat',
        coreMotif: 'visoredMagma',
        colorThemeId: 'whiteAsh',
        bodyBuild: 'shortChubby',
        bodyBuildName: '矮敦锻造工匠短岩甲 (矮-2px·平整后背)',
        build: { thigh: 4, shin: 5, upper: 3, fore: 2 },
        defaultIdle: 'hips',
        headDesc: '8×6 钙化灰白宽平锻砧颅 (#4f4943) + 横贯熔岩目镜',
        coreDesc: '横贯熔岩目镜 × 双列高炉暖金火栅 (#fff099)',
        bodyDesc: '矮敦暖赭工匠短岩甲 (#664b38) + 炽白暖金阳炎',
      },
      {
        id: 'calderaGolem',
        name: '赤铁赭金·火山口巨釜重装种',
        shortName: '火山口·赤铁金',
        headShape: 'calderaCrater',
        coreMotif: 'hollowCore',
        colorThemeId: 'ironCinder',
        bodyBuild: 'chubby',
        bodyBuildName: '重装熔岩巨釜圆腹躯干 (圆腹格栅·平整后背)',
        build: { thigh: 5, shin: 5, upper: 3, fore: 3 },
        defaultIdle: 'backhands',
        headDesc: '8×7 赤铁矿岩火山口盆颅 (#36241f) + 顶口翻涌熔岩',
        coreDesc: '空洞旋涡火眼 × 环状日冕高炉 (#ffbb5c)',
        bodyDesc: '重装熔岩巨釜圆腹躯干 (#403c38) + 横向透火格栅',
      },
      {
        id: 'copperSlagHunter',
        name: '古铜翠焰·尖兜帽高个巡林客',
        shortName: '尖兜帽·铜翠焰',
        headShape: 'hoodedObsidian',
        coreMotif: 'weepingLava',
        colorThemeId: 'copperSlag',
        bodyBuild: 'tall',
        bodyBuildName: '高个熔岩巡林客胸铠 (高+1px·修长四肢)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 4 },
        defaultIdle: 'crossLeg',
        headDesc: '8×8 孔雀石绿尖锥兜帽颅 (#1d3028) + 泣血翠绿火痕',
        coreDesc: '泣血熔岩双痕 × 纵向深渊翠焰裂谷 (#a3ff8f)',
        bodyDesc: '高个古铜褐巡林胸铠 (#4d3b29) + 翡翠铜盐毒焰',
      },
      {
        id: 'violetVoidWalker',
        name: '紫晶虚空·方尖碑镂空外骸种',
        shortName: '方尖碑·紫晶焰',
        headShape: 'cyclopsMonolith',
        coreMotif: 'vertSlit',
        colorThemeId: 'voidViolet',
        bodyBuild: 'exoFrame',
        bodyBuildName: '镂空黑曜石肋骨外骸 (肋间透火·窄腰)',
        build: { thigh: 6, shin: 6, upper: 3, fore: 3 },
        defaultIdle: 'rubHands',
        headDesc: '6×9 暗紫水晶高耸方尖碑颅 (#2b1e3b) + 紫晶竖缝火瞳',
        coreDesc: '竖缝火瞳 × 镂空肋骨星陨紫电核心 (#f2a6ff)',
        bodyDesc: '镂空紫晶肋骨外骸 (#4d3366) + 霓虹洋红火脉',
      },
      {
        id: 'ironMandibleHulk',
        name: '赭石熔渣·裂颚双柱重装泰坦',
        shortName: '裂颚颅·赭熔渣',
        headShape: 'splitMandible',
        coreMotif: 'crossForge',
        colorThemeId: 'rustFurnace',
        bodyBuild: 'pistonHulk',
        bodyBuildName: '双肩火山烟柱巨躯 (高+1px·双联熔岩柱)',
        build: { thigh: 6, shin: 5, upper: 4, fore: 3 },
        defaultIdle: 'headScratch',
        headDesc: '8×7 铁锈橙红裂颚重甲战颅 (#402115) + 下颌外扩护颚',
        coreDesc: '十字锻纹火瞳 × 双联火山柠檬黄高温核 (#f7ff7a)',
        bodyDesc: '双肩火山排烟柱巨躯 (#302d29) + 黄铜铆钉披肩',
      },
      {
        id: 'jadeLotusMonk',
        name: '碧玉青莲·日冕盘篷苦修武僧',
        shortName: '日冕冠·碧玉莲',
        headShape: 'crownSpire',
        coreMotif: 'hollowCore',
        colorThemeId: 'jadeMagma',
        bodyBuild: 'ponchoMech',
        bodyBuildName: '斜裁黑曜石重甲披风躯干 (非对称装甲摆)',
        build: { thigh: 6, shin: 5, upper: 3, fore: 3 },
        defaultIdle: 'toeTap',
        headDesc: '8×8 墨玉蛇纹岩五棘冠 (#193331) + 碧青旋涡火眼',
        coreDesc: '空洞旋涡火眼 × 环状碧玉青莲火核 (#7affd4)',
        bodyDesc: '斜裁墨玉金丝重甲披风 (#2d473d) + 碧青地心火脉',
      },
      {
        id: 'solarQuartzKnight',
        name: '日冕金晶·双角耀金圣殿骑士',
        shortName: '双魔角·日冕金',
        headShape: 'twinHorn',
        coreMotif: 'visoredMagma',
        colorThemeId: 'solarQuartz',
        bodyBuild: 'tall',
        bodyBuildName: '高个熔岩巡林客胸铠 (高+1px·修长四肢)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 4 },
        defaultIdle: 'salute',
        headDesc: '8×8 黄金石英砂岩双角颅 (#45361d) + 耀白横贯目镜',
        coreDesc: '横贯熔岩目镜 × 双列太阳真火高炉 (#fff380)',
        bodyDesc: '朱红皇室金边披肩胸铠 (#5e251c) + 耀白金晶火核',
      },
      {
        id: 'frostObsidianSentinel',
        name: '极地冰曜·三尖冰川极光斥候',
        shortName: '三尖颅·极地冰',
        headShape: 'jaggedCrag',
        coreMotif: 'triEmber',
        colorThemeId: 'frostObsidian',
        bodyBuild: 'slender',
        bodyBuildName: '高挑修长黑曜祭司甲 (高+2px·窄腰长摆)',
        build: { thigh: 7, shin: 6, upper: 4, fore: 3 },
        defaultIdle: 'stretch',
        headDesc: '6×6 冰川苍蓝晶岩碎角颅 (#2d3b4a) + 极光三眼冷瞳',
        coreDesc: '三眼余烬 × 倒三角极光冰青冷核 (#b8f7ff)',
        bodyDesc: '极地霜银修长胸甲 (#566675) + 极光冰青能量脉',
      },
      {
        id: 'nebulaRoseReaver',
        name: '星云绯晶·尖兜帽等离子掠夺者',
        shortName: '尖兜帽·星云绯',
        headShape: 'hoodedObsidian',
        coreMotif: 'weepingLava',
        colorThemeId: 'nebulaRose',
        bodyBuild: 'broad',
        bodyBuildName: '魁梧双肩火山角重铠 (高+1px·宽肩甲)',
        build: { thigh: 6, shin: 6, upper: 4, fore: 3 },
        defaultIdle: 'pockets',
        headDesc: '8×8 蔷薇辉石暗粉尖兜帽颅 (#3b1f2f) + 樱粉等离子双痕',
        coreDesc: '泣血熔岩双痕 × 纵向樱粉等离子裂谷 (#ff99c8)',
        bodyDesc: '魁梧暮色紫金重披肩 (#3b2847) + 等离子粉红电弧',
      },
    ],
  };

  function registerAffinityForSpec(spec) {
    if (!AFFINITY[spec.id]) AFFINITY[spec.id] = {};
    for (const otherId of Object.keys(AFFINITY)) {
      if (otherId === spec.id) continue;
      if (AFFINITY[spec.id][otherId] == null) AFFINITY[spec.id][otherId] = 0.25;
      if (!AFFINITY[otherId]) AFFINITY[otherId] = {};
      if (AFFINITY[otherId][spec.id] == null) AFFINITY[otherId][spec.id] = 0.25;
    }
  }

  /* 根据套装、肤色生成适配近/远手臂的 4 段颜色数组 [上臂, 前臂, 手部, 袖口/护腕点缀] */
  function buildArmCols(suitMeta, skinPal) {
    const sl = suitMeta.sleeve || 'short';
    const upperN = suitMeta.shirtN || suitMeta.top;
    const upperF = suitMeta.shirtF || suitMeta.topSh;
    const handN = suitMeta.gloveN || skinPal.skin;
    const handF = suitMeta.gloveF || skinPal.skinSh;
    const cuff = suitMeta.cuff || suitMeta.belt;

    if (sl === 'sleeveless') {
      return {
        armN: [skinPal.skin, skinPal.skin, handN, cuff],
        armF: [skinPal.skinSh, skinPal.skinSh, handF, cuff],
      };
    }
    if (sl === 'short') {
      return {
        armN: [upperN, skinPal.skin, handN, cuff],
        armF: [upperF, skinPal.skinSh, handF, cuff],
      };
    }
    if (sl === 'rolled') {
      return {
        armN: [upperN, skinPal.skin, handN, cuff],
        armF: [upperF, skinPal.skinSh, handF, cuff],
      };
    }
    if (sl === 'pauldron') {
      const pColN = suitMeta.collar || '#bcc4d4';
      const pColF = suitMeta.top || '#757e91';
      return {
        armN: [pColN, upperN, handN, cuff],
        armF: [pColF, upperF, handF, cuff],
      };
    }
    return {
      armN: [upperN, upperN, handN, cuff],
      armF: [upperF, upperF, handF, cuff],
    };
  }

  /* 根据套装裤色与鞋靴部件生成 5 段腿部颜色数组 [大腿, 小腿, 鞋底主体, 靴筒/护胫, 鞋头/绑带高光] */
  function buildLegCols(suitMeta, shoeMeta, skinPal) {
    const isSandals = shoeMeta.id === 'bareSandals';
    const isWraps = shoeMeta.id === 'striderWraps';
    return {
      legN: [
        suitMeta.pantsN[0],
        isWraps ? shoeMeta.shaftN : suitMeta.pantsN[1],
        shoeMeta.shoeN,
        isSandals ? skinPal.skin : shoeMeta.shaftN,
        shoeMeta.accentN,
      ],
      legF: [
        suitMeta.pantsF[0],
        isWraps ? shoeMeta.shaftF : suitMeta.pantsF[1],
        shoeMeta.shoeF,
        isSandals ? skinPal.skinSh : shoeMeta.shaftF,
        shoeMeta.accentF,
      ],
    };
  }

  /* 解析菌伞人（Myco-Hosts）头身统一同色系主题索引（0..6）：
   * 无论传入 capColorId ('crimson'..'obsidian') 还是 suitColorId ('rustBark'..'boneAsh')，始终返回同一色系配对 */
  function resolveUnifiedMycoColorPair(colorKey, fallbackIdx) {
    const capPals = NPC_PARTS.MYCO_CAP_PALETTES;
    const suitPals = NPC_PARTS.MYCO_SUIT_PALETTES;
    if (colorKey && colorKey !== 'random' && colorKey !== 'preset') {
      const cIdx = capPals.findIndex(x => x.id === colorKey || x.themeId === colorKey || x.suitColorId === colorKey);
      if (cIdx >= 0) return { capPal: capPals[cIdx], suitPal: suitPals[cIdx] };
      const sIdx = suitPals.findIndex(x => x.id === colorKey || x.themeId === colorKey || x.capColorId === colorKey);
      if (sIdx >= 0) return { capPal: capPals[sIdx], suitPal: suitPals[sIdx] };
    }
    const k = ((fallbackIdx % capPals.length) + capPals.length) % capPals.length;
    return { capPal: capPals[k], suitPal: suitPals[k] };
  }

  /* 生成三大类人形外星种族角色规格：
   * 1) 显像管族（cathode）支持 6 大预设变种 + 模块化自由组合（6种显示器形状 × 6种待机动态屏显 × 6种高矮胖瘦形态 × 6种同色系涂装 × 10种待机）
   * 2) 孢子傀儡（菌伞人 myco）支持 5 大预设变种 + 模块化自由组合（6种立体菌伞头型 × 7种头身统一同色系 × 6种身高胖瘦体型 × 10种待机） */
  function generateAlienNPC(speciesId, seed, extraOpts) {
    const opts = Object.assign({ species: speciesId, seed: seed != null ? seed : 2026 }, extraOpts || {});
    const spMeta = NPC_PARTS.SPECIES.find(s => s.id === speciesId) || NPC_PARTS.SPECIES[1];
    const idx = opts.index != null ? opts.index : 0;
    const rng = mulberry32((opts.seed || 2026) + idx * 7919);
    const pick = arr => arr[Math.floor(rng() * arr.length)];

    const mycoVars = NPC_PARTS.MYCO_VARIANTS;
    let mycoVarMeta = null;
    let mycoConfig = null;
    let mycoCapShapeMeta = null;
    let mycoCapPalMeta = null;
    let mycoBuildMeta = null;
    let mycoSuitPalMeta = null;
    let isModularMyco = false;

    const cathodeVars = NPC_PARTS.CATHODE_VARIANTS;
    let cathodeVarMeta = null;
    let cathodeConfig = null;
    let cathodeShapeMeta = null;
    let cathodeMotifMeta = null;
    let cathodeBuildMeta = null;
    let cathodeColorMeta = null;
    let isModularCathode = false;

    const cinderVars = NPC_PARTS.CINDER_VARIANTS;
    let cinderVarMeta = null;
    let cinderConfig = null;
    let cinderShapeMeta = null;
    let cinderMotifMeta = null;
    let cinderBuildMeta = null;
    let cinderColorMeta = null;
    let isModularCinder = false;

    if (spMeta.id === 'cathode') {
      const hasModularCathode = !!(
        opts.cathodeRandomize ||
        opts.cathodeVariant === 'random' ||
        (opts.cathodeHeadShape && opts.cathodeHeadShape !== 'preset') ||
        (opts.cathodeScreenMotif && opts.cathodeScreenMotif !== 'preset') ||
        (opts.cathodeBodyBuild && opts.cathodeBodyBuild !== 'preset') ||
        (opts.cathodeColorTheme && opts.cathodeColorTheme !== 'preset')
      );

      if (opts.cathodeVariant && opts.cathodeVariant !== 'random' && !hasModularCathode) {
        cathodeVarMeta = cathodeVars.find(v => v.id === opts.cathodeVariant) || cathodeVars[0];
      } else if (!hasModularCathode && idx === 0 && !opts.cathodeVariant) {
        cathodeVarMeta = cathodeVars[0];
      } else if (!hasModularCathode) {
        cathodeVarMeta = cathodeVars[idx % cathodeVars.length];
      }

      if (hasModularCathode) {
        isModularCathode = true;
        const baseCV = (opts.cathodeVariant && opts.cathodeVariant !== 'random')
          ? (cathodeVars.find(v => v.id === opts.cathodeVariant) || cathodeVars[0])
          : cathodeVars[idx % cathodeVars.length];

        cathodeShapeMeta = (opts.cathodeHeadShape && opts.cathodeHeadShape !== 'random' && opts.cathodeHeadShape !== 'preset')
          ? (NPC_PARTS.CATHODE_HEAD_SHAPES.find(x => x.id === opts.cathodeHeadShape) || NPC_PARTS.CATHODE_HEAD_SHAPES[0])
          : (opts.cathodeHeadShape === 'preset'
              ? (NPC_PARTS.CATHODE_HEAD_SHAPES.find(x => x.id === baseCV.headShape) || NPC_PARTS.CATHODE_HEAD_SHAPES[0])
              : NPC_PARTS.CATHODE_HEAD_SHAPES[(idx + Math.floor(rng() * NPC_PARTS.CATHODE_HEAD_SHAPES.length)) % NPC_PARTS.CATHODE_HEAD_SHAPES.length]);

        cathodeMotifMeta = (opts.cathodeScreenMotif && opts.cathodeScreenMotif !== 'random' && opts.cathodeScreenMotif !== 'preset')
          ? (NPC_PARTS.CATHODE_SCREEN_MOTIFS.find(x => x.id === opts.cathodeScreenMotif) || NPC_PARTS.CATHODE_SCREEN_MOTIFS[0])
          : (opts.cathodeScreenMotif === 'preset'
              ? (NPC_PARTS.CATHODE_SCREEN_MOTIFS.find(x => x.id === baseCV.screenMotif) || NPC_PARTS.CATHODE_SCREEN_MOTIFS[0])
              : NPC_PARTS.CATHODE_SCREEN_MOTIFS[(idx * 2 + Math.floor(rng() * NPC_PARTS.CATHODE_SCREEN_MOTIFS.length)) % NPC_PARTS.CATHODE_SCREEN_MOTIFS.length]);

        cathodeBuildMeta = (opts.cathodeBodyBuild && opts.cathodeBodyBuild !== 'random' && opts.cathodeBodyBuild !== 'preset')
          ? (NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === opts.cathodeBodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0])
          : (opts.cathodeBodyBuild === 'preset'
              ? (NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === baseCV.bodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0])
              : NPC_PARTS.MYCO_BODY_BUILDS[(idx + Math.floor(rng() * NPC_PARTS.MYCO_BODY_BUILDS.length)) % NPC_PARTS.MYCO_BODY_BUILDS.length]);

        cathodeColorMeta = (opts.cathodeColorTheme && opts.cathodeColorTheme !== 'random' && opts.cathodeColorTheme !== 'preset')
          ? (NPC_PARTS.CATHODE_COLOR_THEMES.find(x => x.id === opts.cathodeColorTheme) || NPC_PARTS.CATHODE_COLOR_THEMES[0])
          : (opts.cathodeColorTheme === 'preset'
              ? (NPC_PARTS.CATHODE_COLOR_THEMES.find(x => x.id === baseCV.colorThemeId) || NPC_PARTS.CATHODE_COLOR_THEMES[0])
              : NPC_PARTS.CATHODE_COLOR_THEMES[(idx + Math.floor(rng() * NPC_PARTS.CATHODE_COLOR_THEMES.length)) % NPC_PARTS.CATHODE_COLOR_THEMES.length]);
      } else if (cathodeVarMeta) {
        cathodeShapeMeta = NPC_PARTS.CATHODE_HEAD_SHAPES.find(x => x.id === cathodeVarMeta.headShape) || NPC_PARTS.CATHODE_HEAD_SHAPES[0];
        cathodeMotifMeta = NPC_PARTS.CATHODE_SCREEN_MOTIFS.find(x => x.id === cathodeVarMeta.screenMotif) || NPC_PARTS.CATHODE_SCREEN_MOTIFS[0];
        cathodeBuildMeta = NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === cathodeVarMeta.bodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0];
        cathodeColorMeta = NPC_PARTS.CATHODE_COLOR_THEMES.find(x => x.id === cathodeVarMeta.colorThemeId) || NPC_PARTS.CATHODE_COLOR_THEMES[0];
      }

      cathodeConfig = Object.assign(
        {},
        cathodeColorMeta,
        {
          headShape: cathodeShapeMeta.id,
          headShapeName: cathodeShapeMeta.name,
          screenMotif: cathodeMotifMeta.id,
          screenMotifName: cathodeMotifMeta.name,
          bodyBuild: cathodeBuildMeta.id,
          bodyBuildName: cathodeBuildMeta.name,
          colorThemeId: cathodeColorMeta.id,
          colorThemeName: cathodeColorMeta.name,
        }
      );

      if (isModularCathode) {
        cathodeVarMeta = Object.assign({}, cathodeVarMeta || cathodeVars[0], cathodeConfig, {
          id: `${cathodeShapeMeta.id}_${cathodeMotifMeta.id}_${cathodeBuildMeta.id}_${cathodeColorMeta.id}`,
          name: `${cathodeColorMeta.shortName}${cathodeShapeMeta.shortName}·${cathodeMotifMeta.shortName}`,
          shortName: `${cathodeShapeMeta.shortName}·${cathodeMotifMeta.shortName}`,
          build: Object.assign({}, cathodeBuildMeta.build),
          headDesc: `${cathodeShapeMeta.name} · ${cathodeColorMeta.shortName}`,
          screenDesc: `${cathodeMotifMeta.name}`,
          bodyDesc: `${cathodeBuildMeta.name} · ${cathodeColorMeta.name}`,
        });
      } else if (cathodeVarMeta) {
        cathodeVarMeta = Object.assign({}, cathodeConfig, cathodeVarMeta);
      }
    }

    if (spMeta.id === 'cinder') {
      const hasModularCinder = !!(
        opts.cinderRandomize ||
        opts.cinderVariant === 'random' ||
        (opts.cinderHeadShape && opts.cinderHeadShape !== 'preset') ||
        (opts.cinderCoreMotif && opts.cinderCoreMotif !== 'preset') ||
        (opts.cinderBodyBuild && opts.cinderBodyBuild !== 'preset') ||
        (opts.cinderColorTheme && opts.cinderColorTheme !== 'preset')
      );

      if (opts.cinderVariant && opts.cinderVariant !== 'random' && !hasModularCinder) {
        cinderVarMeta = cinderVars.find(v => v.id === opts.cinderVariant) || cinderVars[0];
      } else if (!hasModularCinder && idx === 0 && !opts.cinderVariant) {
        cinderVarMeta = cinderVars[0];
      } else if (!hasModularCinder) {
        cinderVarMeta = cinderVars[idx % cinderVars.length];
      }

      if (hasModularCinder) {
        isModularCinder = true;
        const baseIV = (opts.cinderVariant && opts.cinderVariant !== 'random')
          ? (cinderVars.find(v => v.id === opts.cinderVariant) || cinderVars[0])
          : cinderVars[idx % cinderVars.length];

        cinderShapeMeta = (opts.cinderHeadShape && opts.cinderHeadShape !== 'random' && opts.cinderHeadShape !== 'preset')
          ? (NPC_PARTS.CINDER_HEAD_SHAPES.find(x => x.id === opts.cinderHeadShape) || NPC_PARTS.CINDER_HEAD_SHAPES[0])
          : (opts.cinderHeadShape === 'preset'
              ? (NPC_PARTS.CINDER_HEAD_SHAPES.find(x => x.id === baseIV.headShape) || NPC_PARTS.CINDER_HEAD_SHAPES[0])
              : NPC_PARTS.CINDER_HEAD_SHAPES[(idx + Math.floor(rng() * NPC_PARTS.CINDER_HEAD_SHAPES.length)) % NPC_PARTS.CINDER_HEAD_SHAPES.length]);

        cinderMotifMeta = (opts.cinderCoreMotif && opts.cinderCoreMotif !== 'random' && opts.cinderCoreMotif !== 'preset')
          ? (NPC_PARTS.CINDER_CORE_MOTIFS.find(x => x.id === opts.cinderCoreMotif) || NPC_PARTS.CINDER_CORE_MOTIFS[0])
          : (opts.cinderCoreMotif === 'preset'
              ? (NPC_PARTS.CINDER_CORE_MOTIFS.find(x => x.id === baseIV.coreMotif) || NPC_PARTS.CINDER_CORE_MOTIFS[0])
              : NPC_PARTS.CINDER_CORE_MOTIFS[(idx * 2 + Math.floor(rng() * NPC_PARTS.CINDER_CORE_MOTIFS.length)) % NPC_PARTS.CINDER_CORE_MOTIFS.length]);

        cinderBuildMeta = (opts.cinderBodyBuild && opts.cinderBodyBuild !== 'random' && opts.cinderBodyBuild !== 'preset')
          ? (NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === opts.cinderBodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0])
          : (opts.cinderBodyBuild === 'preset'
              ? (NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === baseIV.bodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0])
              : NPC_PARTS.MYCO_BODY_BUILDS[(idx + Math.floor(rng() * NPC_PARTS.MYCO_BODY_BUILDS.length)) % NPC_PARTS.MYCO_BODY_BUILDS.length]);

        cinderColorMeta = (opts.cinderColorTheme && opts.cinderColorTheme !== 'random' && opts.cinderColorTheme !== 'preset')
          ? (NPC_PARTS.CINDER_COLOR_THEMES.find(x => x.id === opts.cinderColorTheme) || NPC_PARTS.CINDER_COLOR_THEMES[0])
          : (opts.cinderColorTheme === 'preset'
              ? (NPC_PARTS.CINDER_COLOR_THEMES.find(x => x.id === baseIV.colorThemeId) || NPC_PARTS.CINDER_COLOR_THEMES[0])
              : NPC_PARTS.CINDER_COLOR_THEMES[(idx + Math.floor(rng() * NPC_PARTS.CINDER_COLOR_THEMES.length)) % NPC_PARTS.CINDER_COLOR_THEMES.length]);
      } else if (cinderVarMeta) {
        cinderShapeMeta = NPC_PARTS.CINDER_HEAD_SHAPES.find(x => x.id === cinderVarMeta.headShape) || NPC_PARTS.CINDER_HEAD_SHAPES[0];
        cinderMotifMeta = NPC_PARTS.CINDER_CORE_MOTIFS.find(x => x.id === cinderVarMeta.coreMotif) || NPC_PARTS.CINDER_CORE_MOTIFS[0];
        cinderBuildMeta = NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === cinderVarMeta.bodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0];
        cinderColorMeta = NPC_PARTS.CINDER_COLOR_THEMES.find(x => x.id === cinderVarMeta.colorThemeId) || NPC_PARTS.CINDER_COLOR_THEMES[0];
      }

      cinderConfig = Object.assign(
        {},
        cinderColorMeta,
        {
          headShape: cinderShapeMeta.id,
          headShapeName: cinderShapeMeta.name,
          coreMotif: cinderMotifMeta.id,
          coreMotifName: cinderMotifMeta.name,
          bodyBuild: cinderBuildMeta.id,
          bodyBuildName: cinderBuildMeta.name,
          colorThemeId: cinderColorMeta.id,
          colorThemeName: cinderColorMeta.name,
        }
      );

      if (isModularCinder) {
        cinderVarMeta = Object.assign({}, cinderVarMeta || cinderVars[0], cinderConfig, {
          id: `${cinderShapeMeta.id}_${cinderMotifMeta.id}_${cinderBuildMeta.id}_${cinderColorMeta.id}`,
          name: `${cinderColorMeta.shortName}${cinderShapeMeta.shortName}·${cinderMotifMeta.shortName}`,
          shortName: `${cinderShapeMeta.shortName}·${cinderColorMeta.shortName}`,
          build: Object.assign({}, cinderBuildMeta.build),
          headDesc: `${cinderShapeMeta.name} · ${cinderColorMeta.shortName}`,
          coreDesc: `${cinderMotifMeta.name}`,
          bodyDesc: `${cinderBuildMeta.name} · ${cinderColorMeta.name}`,
        });
      } else if (cinderVarMeta) {
        cinderVarMeta = Object.assign({}, cinderConfig, cinderVarMeta);
      }
    }

    if (spMeta.id === 'myco') {
      const hasModularOpts = !!(
        opts.mycoRandomize ||
        opts.mycoVariant === 'random' ||
        (opts.mycoColorTheme && opts.mycoColorTheme !== 'preset') ||
        (opts.mycoCapShape && opts.mycoCapShape !== 'preset') ||
        (opts.mycoCapColor && opts.mycoCapColor !== 'preset') ||
        (opts.mycoBodyBuild && opts.mycoBodyBuild !== 'preset') ||
        (opts.mycoSuitColor && opts.mycoSuitColor !== 'preset')
      );

      if (opts.mycoVariant && opts.mycoVariant !== 'random' && !hasModularOpts) {
        mycoVarMeta = mycoVars.find(v => v.id === opts.mycoVariant) || mycoVars[0];
      } else if (!hasModularOpts && idx === 0 && !opts.mycoVariant) {
        mycoVarMeta = mycoVars[0];
      } else if (!hasModularOpts) {
        mycoVarMeta = mycoVars[idx % mycoVars.length];
      }

      if (hasModularOpts) {
        isModularMyco = true;
        const baseVar = (opts.mycoVariant && opts.mycoVariant !== 'random')
          ? (mycoVars.find(v => v.id === opts.mycoVariant) || mycoVars[0])
          : mycoVars[idx % mycoVars.length];

        mycoCapShapeMeta = (opts.mycoCapShape && opts.mycoCapShape !== 'random' && opts.mycoCapShape !== 'preset')
          ? (NPC_PARTS.MYCO_CAP_SHAPES.find(x => x.id === opts.mycoCapShape) || NPC_PARTS.MYCO_CAP_SHAPES[0])
          : (opts.mycoCapShape === 'preset'
              ? (NPC_PARTS.MYCO_CAP_SHAPES.find(x => x.id === baseVar.capType) || NPC_PARTS.MYCO_CAP_SHAPES[0])
              : NPC_PARTS.MYCO_CAP_SHAPES[(idx + Math.floor(rng() * NPC_PARTS.MYCO_CAP_SHAPES.length)) % NPC_PARTS.MYCO_CAP_SHAPES.length]);

        // 伞菌人头与身体严格保持同一色调：统一由色系主题解析出配对的 capPal 与 suitPal
        const requestedColorKey = (opts.mycoColorTheme && opts.mycoColorTheme !== 'random' && opts.mycoColorTheme !== 'preset')
          ? opts.mycoColorTheme
          : (opts.mycoCapColor && opts.mycoCapColor !== 'random' && opts.mycoCapColor !== 'preset')
            ? opts.mycoCapColor
            : (opts.mycoSuitColor && opts.mycoSuitColor !== 'random' && opts.mycoSuitColor !== 'preset')
              ? opts.mycoSuitColor
              : (opts.mycoCapColor === 'preset' || opts.mycoSuitColor === 'preset')
                ? baseVar.capColorId
                : null;
        const randThemeIdx = idx + Math.floor(rng() * NPC_PARTS.MYCO_CAP_PALETTES.length);
        const unifiedPair = resolveUnifiedMycoColorPair(requestedColorKey, randThemeIdx);
        mycoCapPalMeta = unifiedPair.capPal;
        mycoSuitPalMeta = unifiedPair.suitPal;

        mycoBuildMeta = (opts.mycoBodyBuild && opts.mycoBodyBuild !== 'random' && opts.mycoBodyBuild !== 'preset')
          ? (NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === opts.mycoBodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0])
          : (opts.mycoBodyBuild === 'preset'
              ? (NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === baseVar.bodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0])
              : NPC_PARTS.MYCO_BODY_BUILDS[(idx + Math.floor(rng() * NPC_PARTS.MYCO_BODY_BUILDS.length)) % NPC_PARTS.MYCO_BODY_BUILDS.length]);

        mycoConfig = Object.assign(
          {},
          mycoCapPalMeta,
          mycoSuitPalMeta,
          {
            capShape: mycoCapShapeMeta.id,
            capType: mycoCapShapeMeta.id,
            capTypeName: mycoCapShapeMeta.name,
            colorThemeId: mycoCapPalMeta.id,
            colorThemeName: mycoCapPalMeta.name,
            capColorId: mycoCapPalMeta.id,
            capColorName: mycoCapPalMeta.name,
            bodyBuild: mycoBuildMeta.id,
            bodyBuildName: mycoBuildMeta.name,
            suitColorId: mycoSuitPalMeta.id,
            suitColorName: mycoSuitPalMeta.name,
          }
        );
        mycoVarMeta = Object.assign({}, baseVar, mycoConfig, {
          id: `${mycoCapShapeMeta.id}_${mycoCapPalMeta.id}_${mycoBuildMeta.id}`,
          name: `${mycoCapPalMeta.shortName}${mycoCapShapeMeta.shortName}·${mycoBuildMeta.shortName}`,
          shortName: `${mycoCapPalMeta.shortName}${mycoCapShapeMeta.shortName}`,
          build: Object.assign({}, mycoBuildMeta.build),
          capDesc: `${mycoCapShapeMeta.name} · ${mycoCapPalMeta.name}`,
          gillDesc: `伞底放射菌褶 (${mycoCapPalMeta.gillHi} × ${mycoCapPalMeta.gillShDeep}) + 菌环脖颈`,
          bodyDesc: `${mycoBuildMeta.name} · ${mycoSuitPalMeta.name}`,
        });
      } else if (mycoVarMeta) {
        mycoCapShapeMeta = NPC_PARTS.MYCO_CAP_SHAPES.find(x => x.id === mycoVarMeta.capType) || NPC_PARTS.MYCO_CAP_SHAPES[0];
        const unifiedPresetPair = resolveUnifiedMycoColorPair(mycoVarMeta.capColorId, 0);
        mycoCapPalMeta = unifiedPresetPair.capPal;
        mycoSuitPalMeta = unifiedPresetPair.suitPal;
        mycoBuildMeta = NPC_PARTS.MYCO_BODY_BUILDS.find(x => x.id === mycoVarMeta.bodyBuild) || NPC_PARTS.MYCO_BODY_BUILDS[0];
      }
    }

    const activeVarDefaultIdle = (!isModularMyco && mycoVarMeta && mycoVarMeta.defaultIdle)
      ? mycoVarMeta.defaultIdle
      : (!isModularCathode && cathodeVarMeta && cathodeVarMeta.defaultIdle)
        ? cathodeVarMeta.defaultIdle
        : (!isModularCinder && cinderVarMeta && cinderVarMeta.defaultIdle)
          ? cinderVarMeta.defaultIdle
          : null;

    const idleMeta = (opts.idle && opts.idle !== 'random')
      ? (NPC_PARTS.IDLES.find(x => x.id === opts.idle) || NPC_PARTS.IDLES[0])
      : (activeVarDefaultIdle && (!opts.idle || opts.idle !== 'random')
          ? (NPC_PARTS.IDLES.find(x => x.id === activeVarDefaultIdle) || pick(NPC_PARTS.IDLES))
          : NPC_PARTS.IDLES[(idx + Math.floor(rng() * NPC_PARTS.IDLES.length)) % NPC_PARTS.IDLES.length]);
    const name = opts.name || (spMeta.names ? spMeta.names[(idx + Math.floor(rng() * 3)) % spMeta.names.length] : spMeta.name);
    const id = opts.id || `alien_${spMeta.id}_${opts.seed}_${idx}`;

    // 不同外星种族的专属四肢骨骼色与样式键（5 段数组：[上臂/大腿, 前臂/小腿, 手掌/鞋底, 腕箍/靴筒, 护肘护膝与指尖靴头高光]）
    let sleeveStyle = 'cathodeMech', shoeStyle = 'cathodeMech';
    let armN = ['#12141a', '#1c222e', '#2b3240', '#9aa4b8', '#b4c4d8'];
    let armF = ['#12141a', '#151922', '#232832', '#68768a', '#9aa4b8'];
    let legN = ['#12141a', '#12141a', '#12141a', '#2b3240', '#9aa4b8'];
    let legF = ['#12141a', '#12141a', '#12141a', '#232832', '#68768a'];
    let topCol = '#323946', topShCol = '#232832', pelvisCol = '#292f3b';
    let traits = { soc: 0.55, en: 0.65, cau: 0.45, cur: 0.85, pat: 0.65 };
    let buildSpec = Object.assign({}, NPC_PARTS.UNIFIED_BODY.build);

    if (spMeta.id === 'cathode' && cathodeVarMeta) {
      const cv = cathodeVarMeta;
      const jn = cv.jointN || '#9aa4b8';
      const jf = cv.jointF || '#68768a';
      armN = ['#12141a', '#1c222e', cv.coatSh || '#2b3240', jn, cv.shellHi || '#b4c4d8'];
      armF = ['#12141a', '#151922', cv.coatHem || '#232832', jf, jn];
      legN = ['#12141a', '#12141a', '#12141a', cv.coatSh || '#2b3240', jn];
      legF = ['#12141a', '#12141a', '#12141a', cv.coatHem || '#232832', jf];
      topCol = cv.coatMid || '#323946';
      topShCol = cv.coatSh || '#232832';
      pelvisCol = cv.coatHem || '#292f3b';
      if (cv.build) buildSpec = Object.assign({}, cv.build);
      traits = {
        soc: +(0.40 + rng() * 0.50).toFixed(2),
        en:  +(0.45 + rng() * 0.45).toFixed(2),
        cau: +(0.35 + rng() * 0.50).toFixed(2),
        cur: +(0.60 + rng() * 0.35).toFixed(2),
        pat: +(0.50 + rng() * 0.45).toFixed(2),
      };
    } else if (spMeta.id === 'myco') {
      const mv = mycoVarMeta || mycoVars[0];
      sleeveStyle = 'mycoWrap';
      shoeStyle = 'mycoWrap';
      armN = [mv.wrapN, mv.foreN || '#2b2422', '#121216', mv.mycHi, mv.jointN || '#e6cfa1'];
      armF = [mv.wrapF, mv.foreF || '#1c1817', '#121216', mv.mycSh, mv.jointF || '#9c7d54'];
      legN = [mv.wrapN, mv.foreN || '#2b2422', '#121216', mv.mycHi, mv.jointN || '#e6cfa1'];
      legF = [mv.wrapF, mv.foreF || '#1c1817', '#121216', mv.mycSh, mv.jointF || '#9c7d54'];
      topCol = mv.suitMid;
      topShCol = mv.suitSh;
      pelvisCol = mv.suitSh;
      if (mv.build) buildSpec = Object.assign({}, mv.build);
      traits = {
        soc: +(0.35 + rng() * 0.55).toFixed(2),
        en:  +(0.40 + rng() * 0.50).toFixed(2),
        cau: +(0.30 + rng() * 0.55).toFixed(2),
        cur: +(0.50 + rng() * 0.45).toFixed(2),
        pat: +(0.45 + rng() * 0.50).toFixed(2),
      };
    } else if (spMeta.id === 'cinder') {
      const iv = cinderVarMeta || cinderVars[0];
      sleeveStyle = 'cinderRock';
      shoeStyle = 'cinderEmber';
      armN = [
        iv.rockBase || '#1c1918',
        iv.rockMid || '#26201e',
        iv.rockDeep || '#141212',
        iv.wristGlow || '#ff6a2b',
        iv.flameHi || '#ffd23f',
      ];
      armF = [
        iv.rockDeep || '#141212',
        iv.rockBase || '#1c1716',
        '#0f0d0d',
        iv.beltGlow || '#bd3b14',
        iv.flameMid || '#ff7b29',
      ];
      legN = [
        iv.rockBase || '#1c1918',
        iv.rockDeep || '#141212',
        iv.rockDeep || '#141212',
        iv.shawlMid || '#382824',
        iv.soleEmber || '#e05319',
      ];
      legF = [
        iv.rockDeep || '#141212',
        '#0f0d0d',
        iv.rockDeep || '#141212',
        iv.beltCol || '#261c18',
        iv.soleEmber || '#e05319',
      ];
      topCol = iv.rockBase || '#171515';
      topShCol = iv.shawlMid || '#332a27';
      pelvisCol = iv.rockDeep || '#171515';
      if (iv.build) buildSpec = Object.assign({}, iv.build);
      traits = {
        soc: +(0.40 + rng() * 0.45).toFixed(2),
        en:  +(0.55 + rng() * 0.40).toFixed(2),
        cau: +(0.25 + rng() * 0.45).toFixed(2),
        cur: +(0.50 + rng() * 0.40).toFixed(2),
        pat: +(0.45 + rng() * 0.45).toFixed(2),
      };
    }

    const activeVariantName = mycoVarMeta
      ? mycoVarMeta.name
      : cathodeVarMeta
        ? cathodeVarMeta.name
        : cinderVarMeta
          ? cinderVarMeta.name
          : spMeta.subName;

    const spec = {
      id,
      isProcedural: true,
      isAlien: true,
      species: spMeta.id,
      speciesName: spMeta.name,
      speciesSubName: activeVariantName,
      mycoVariant: mycoVarMeta ? mycoVarMeta.id : undefined,
      mycoVariantName: mycoVarMeta ? mycoVarMeta.name : undefined,
      mycoConfig: mycoConfig || undefined,
      mycoColorTheme: mycoCapPalMeta ? mycoCapPalMeta.id : undefined,
      mycoCapShape: mycoCapShapeMeta ? mycoCapShapeMeta.id : undefined,
      mycoCapColor: mycoCapPalMeta ? mycoCapPalMeta.id : undefined,
      mycoSuitColor: mycoSuitPalMeta ? mycoSuitPalMeta.id : undefined,
      cathodeVariant: cathodeVarMeta ? cathodeVarMeta.id : undefined,
      cathodeVariantName: cathodeVarMeta ? cathodeVarMeta.name : undefined,
      cathodeConfig: cathodeConfig || undefined,
      cathodeHeadShape: cathodeShapeMeta ? cathodeShapeMeta.id : undefined,
      cathodeScreenMotif: cathodeMotifMeta ? cathodeMotifMeta.id : undefined,
      cathodeColorTheme: cathodeColorMeta ? cathodeColorMeta.id : undefined,
      cinderVariant: cinderVarMeta ? cinderVarMeta.id : undefined,
      cinderVariantName: cinderVarMeta ? cinderVarMeta.name : undefined,
      cinderConfig: cinderConfig || undefined,
      cinderHeadShape: cinderShapeMeta ? cinderShapeMeta.id : undefined,
      cinderCoreMotif: cinderMotifMeta ? cinderMotifMeta.id : undefined,
      cinderColorTheme: cinderColorMeta ? cinderColorMeta.id : undefined,
      bodyBuild: mycoVarMeta ? mycoVarMeta.bodyBuild : cathodeVarMeta ? cathodeVarMeta.bodyBuild : cinderVarMeta ? cinderVarMeta.bodyBuild : 'standard',
      bodyBuildName: mycoVarMeta ? mycoVarMeta.bodyBuildName : cathodeVarMeta ? cathodeVarMeta.bodyBuildName : cinderVarMeta ? cinderVarMeta.bodyBuildName : '标准体型',
      sporeAir1: mycoVarMeta ? mycoVarMeta.sporeAir1 : undefined,
      sporeAir2: mycoVarMeta ? mycoVarMeta.sporeAir2 : undefined,
      seed: (opts.seed || 2026) + idx,
      name,
      tag: mycoVarMeta ? mycoVarMeta.shortName : cathodeVarMeta ? cathodeVarMeta.shortName : cinderVarMeta ? cinderVarMeta.shortName : spMeta.tag,
      desc: mycoVarMeta
        ? `头[${mycoCapShapeMeta ? mycoCapShapeMeta.shortName : mycoVarMeta.shortName}] · 同色系[${mycoCapPalMeta ? mycoCapPalMeta.shortName : ''}] · 体型[${mycoBuildMeta ? mycoBuildMeta.shortName : mycoVarMeta.bodyBuildName}] · 待机[${idleMeta.shortName}]`
        : cathodeVarMeta
          ? `显像器[${cathodeShapeMeta ? cathodeShapeMeta.shortName : cathodeVarMeta.shortName}] · 屏显[${cathodeMotifMeta ? cathodeMotifMeta.shortName : ''}] · 体型[${cathodeBuildMeta ? cathodeBuildMeta.shortName : cathodeVarMeta.bodyBuildName}] · 待机[${idleMeta.shortName}]`
          : cinderVarMeta
            ? `岩颅[${cinderShapeMeta ? cinderShapeMeta.shortName : cinderVarMeta.shortName}] · 炉心[${cinderMotifMeta ? cinderMotifMeta.shortName : ''}] · 体型[${cinderBuildMeta ? cinderBuildMeta.shortName : cinderVarMeta.bodyBuildName}] · 待机[${idleMeta.shortName}]`
            : `种族[${spMeta.name}] · 头[${spMeta.headSlot.split('（')[0]}] · 躯[${spMeta.torsoSlot.split('（')[0]}] · 待机[${idleMeta.shortName}]`,
      idle: idleMeta.id,
      idleShortName: idleMeta.shortName || idleMeta.name,
      idleName: idleMeta.name,
      idleHandDesc: idleMeta.handDesc || '',
      idleLegDesc: idleMeta.legDesc || '',
      partsMeta: {
        speciesId: spMeta.id,
        speciesName: spMeta.name,
        speciesSubName: activeVariantName,
        mycoVariantId: mycoVarMeta ? mycoVarMeta.id : undefined,
        mycoVariantName: mycoVarMeta ? mycoVarMeta.name : undefined,
        mycoCapShapeName: mycoCapShapeMeta ? mycoCapShapeMeta.name : undefined,
        mycoCapColorName: mycoCapPalMeta ? mycoCapPalMeta.name : undefined,
        mycoSuitColorName: mycoSuitPalMeta ? mycoSuitPalMeta.name : undefined,
        cathodeVariantId: cathodeVarMeta ? cathodeVarMeta.id : undefined,
        cathodeVariantName: cathodeVarMeta ? cathodeVarMeta.name : undefined,
        cathodeHeadShapeName: cathodeShapeMeta ? cathodeShapeMeta.name : undefined,
        cathodeScreenMotifName: cathodeMotifMeta ? cathodeMotifMeta.name : undefined,
        cathodeColorThemeName: cathodeColorMeta ? cathodeColorMeta.name : undefined,
        cinderVariantId: cinderVarMeta ? cinderVarMeta.id : undefined,
        cinderVariantName: cinderVarMeta ? cinderVarMeta.name : undefined,
        cinderHeadShapeName: cinderShapeMeta ? cinderShapeMeta.name : undefined,
        cinderCoreMotifName: cinderMotifMeta ? cinderMotifMeta.name : undefined,
        cinderColorThemeName: cinderColorMeta ? cinderColorMeta.name : undefined,
        bodyBuildName: mycoVarMeta
          ? mycoVarMeta.bodyBuildName
          : cathodeVarMeta
            ? cathodeVarMeta.bodyBuildName
            : cinderVarMeta
              ? cinderVarMeta.bodyBuildName
              : '标准均衡体型',
        headBase: mycoVarMeta
          ? `${mycoVarMeta.capDesc} + ${mycoVarMeta.gillDesc}`
          : cathodeVarMeta
            ? `${cathodeVarMeta.headDesc} · ${cathodeVarMeta.screenDesc}`
            : cinderVarMeta
              ? `${cinderVarMeta.headDesc} · ${cinderVarMeta.coreDesc}`
              : spMeta.headSlot,
        hairId: 'short',
        hairName: spMeta.id === 'cathode'
          ? (cathodeMotifMeta ? `${cathodeMotifMeta.name} + 机械颈柱` : '5×4纯黑屏·缺口白环+机械颈柱')
          : spMeta.id === 'myco'
            ? (mycoVarMeta ? mycoVarMeta.gillDesc : '伞底放射状明暗菌褶+菌环长柄脖颈')
            : (cinderMotifMeta ? `${cinderMotifMeta.name} + 熔岩颈柱` : '3黑曜石碎角·2px金黄竖缝+熔岩颈脉'),
        hatId: 'none',
        hatName: spMeta.id === 'cathode'
          ? (cathodeShapeMeta ? `${cathodeShapeMeta.name} (${cathodeColorMeta ? cathodeColorMeta.shortName : ''})` : '极地冷灰蓝显像管壳')
          : spMeta.id === 'myco'
            ? (mycoVarMeta ? mycoVarMeta.capDesc : '12×7圆拱巨型红伞菌盖')
            : (cinderShapeMeta ? `${cinderShapeMeta.name} (${cinderColorMeta ? cinderColorMeta.shortName : ''})` : '6×6焦黑火山岩颅'),
        suitId: spMeta.id,
        suitName: spMeta.id === 'cathode'
          ? (cathodeVarMeta ? cathodeVarMeta.bodyDesc : '9×11高领防寒风衣+肩章腰带扣')
          : spMeta.id === 'myco'
            ? (mycoVarMeta ? mycoVarMeta.bodyDesc : '8×10宇航服+维生带+共生菌丝')
            : (cinderVarMeta ? cinderVarMeta.bodyDesc : '8×11黑岩胸甲+熔岩带+熔炉之心'),
        sleeveId: sleeveStyle,
        sleeveName: spMeta.id === 'cathode' ? '机械细臂+亮色肘轴+2px机械钳手' : spMeta.id === 'myco' ? '同色系宇航绑带+亮色甲壳护肘+荧光腕箍+2px双色手' : '3×7岩石棱角臂+手肘手腕裂隙+熔岩指爪',
        shoeId: shoeStyle,
        shoeName: spMeta.id === 'cathode' ? '液压机械腿+亮色膝轴+三趾机械足' : spMeta.id === 'myco' ? '同色系绗缝绑腿+亮色护膝+荧光踝环+3px亮头靴' : '黑曜石重甲腿+脚底常亮余烬',
        backId: 'none',
        backName: spMeta.id === 'cathode'
          ? `左胸指示灯 (${cathodeColorMeta ? cathodeColorMeta.ledCol : '#6be6ff'})`
          : spMeta.id === 'myco'
            ? (mycoVarMeta && (mycoVarMeta.bodyBuild === 'chubby' || mycoVarMeta.bodyBuild === 'shortChubby') ? '圆桶发酵背罐 (液位窗)' : '4×6液位窗维生背囊')
            : `焦炭披肩 + ${cinderMotifMeta ? cinderMotifMeta.shortName : '熔炉之心'}`,
        backColorName: mycoCapPalMeta
          ? mycoCapPalMeta.shortName
          : cathodeColorMeta
            ? cathodeColorMeta.shortName
            : cinderColorMeta
              ? cinderColorMeta.shortName
              : spMeta.name,
        idleId: idleMeta.id,
        idleShortName: idleMeta.shortName || idleMeta.name,
        idleName: idleMeta.name,
        idleHandDesc: idleMeta.handDesc || '',
        idleLegDesc: idleMeta.legDesc || '',
        skinName: mycoBuildMeta
          ? mycoBuildMeta.shortName
          : cathodeBuildMeta
            ? cathodeBuildMeta.shortName
            : cinderBuildMeta
              ? cinderBuildMeta.shortName
              : spMeta.name,
        hairColorName: mycoCapPalMeta
          ? mycoCapPalMeta.shortName
          : cathodeMotifMeta
            ? cathodeMotifMeta.shortName
            : cinderMotifMeta
              ? cinderMotifMeta.shortName
              : spMeta.subName,
        hatColorName: mycoCapShapeMeta
          ? mycoCapShapeMeta.shortName
          : cathodeShapeMeta
            ? cathodeShapeMeta.shortName
            : cinderShapeMeta
              ? cinderShapeMeta.shortName
              : '种族原生',
        bodyTemplate: mycoVarMeta
          ? mycoVarMeta.bodyDesc
          : cathodeVarMeta
            ? cathodeVarMeta.bodyDesc
            : cinderVarMeta
              ? cinderVarMeta.bodyDesc
              : spMeta.torsoSlot,
        fxSpec: spMeta.fxDesc,
      },
      traits,
      abilities: { sprint: true, blink: true, sneak: true },
      gait: { walkArms: 'normal', swing: 1.0, lean: 0 },
      build: buildSpec,
      look: {
        hair: 'short',
        hat: 'none',
        suitId: spMeta.id,
        mycoVariant: mycoVarMeta ? mycoVarMeta.id : undefined,
        mycoConfig: mycoConfig || undefined,
        cathodeVariant: cathodeVarMeta ? cathodeVarMeta.id : undefined,
        cathodeConfig: cathodeConfig || undefined,
        cinderVariant: cinderVarMeta ? cinderVarMeta.id : undefined,
        cinderConfig: cinderConfig || undefined,
        outfit: 'tee',
        sleeve: sleeveStyle,
        shoes: shoeStyle,
        back: 'none',
        prop: 'none',
        cols: {
          skin: cathodeColorMeta ? cathodeColorMeta.shellMid : cinderColorMeta ? cinderColorMeta.rockMid : '#98a9be',
          skinSh: cathodeColorMeta ? cathodeColorMeta.shellSh : cinderColorMeta ? cinderColorMeta.rockDeep : '#4f5d73',
          eye: cathodeColorMeta ? cathodeColorMeta.scrMain : cinderColorMeta ? cinderColorMeta.flameHi : '#f4f7fc',
          hair: topCol,
          hairHi: cathodeColorMeta ? cathodeColorMeta.ledCol : cinderColorMeta ? cinderColorMeta.flameHi : '#6be6ff',
          hairEnd: cathodeColorMeta ? cathodeColorMeta.ledCol : cinderColorMeta ? cinderColorMeta.flameLow : '#6be6ff',
          hat: cathodeColorMeta ? cathodeColorMeta.shellMid : cinderColorMeta ? cinderColorMeta.rockMid : '#98a9be',
          hatHi: cathodeColorMeta ? cathodeColorMeta.shellHi : cinderColorMeta ? cinderColorMeta.rockHi : '#b4c4d8',
          hatBrim: cathodeColorMeta ? cathodeColorMeta.shellSh : cinderColorMeta ? cinderColorMeta.rockDeep : '#4f5d73',
          top: topCol,
          topSh: topShCol,
          belt: pelvisCol,
          pelvis: pelvisCol,
          back: topShCol,
          backHi: topCol,
          backSh: pelvisCol,
          pack: topShCol,
          armN,
          armF,
          legN,
          legF,
        },
      },
      lines: spMeta.lines,
    };
    registerAffinityForSpec(spec);
    return spec;
  }

  /* 生成单个程序化 NPC：支持传入随机种子或指定部件覆盖项 { species, seed, index, hair, hat, suit, shoes, back, skinIdx, hairColorIdx, hatColorIdx, backColorIdx, name } */
  function generateNPC(opts, extraOpts) {
    if (typeof opts === 'number') opts = Object.assign({ seed: opts }, extraOpts || {});
    else opts = Object.assign({}, opts || {}, extraOpts || {});
    if (opts.species && opts.species !== 'human') {
      return generateAlienNPC(opts.species, opts.seed, opts);
    }
    const seed = opts.seed != null ? opts.seed : 101;
    const idx = opts.index != null ? opts.index : 0;
    const rng = mulberry32(seed + idx * 7919);
    const pick = arr => arr[Math.floor(rng() * arr.length)];

    const hairMeta = opts.hair
      ? (NPC_PARTS.HAIR_STYLES.find(h => h.id === opts.hair) || NPC_PARTS.HAIR_STYLES[0])
      : pick(NPC_PARTS.HAIR_STYLES);
    const hatMeta = opts.hat
      ? (NPC_PARTS.HAT_STYLES.find(h => h.id === opts.hat) || NPC_PARTS.HAT_STYLES[0])
      : pick(NPC_PARTS.HAT_STYLES);
    const suitMeta = opts.suit
      ? (NPC_PARTS.OUTFIT_SUITS.find(s => s.id === opts.suit || s.outfit === opts.suit) || NPC_PARTS.OUTFIT_SUITS[0])
      : pick(NPC_PARTS.OUTFIT_SUITS);
    const shoeMeta = opts.shoes
      ? (NPC_PARTS.SHOE_STYLES.find(sh => sh.id === opts.shoes) || NPC_PARTS.SHOE_STYLES[0])
      : pick(NPC_PARTS.SHOE_STYLES);
    const backMeta = opts.back
      ? (NPC_PARTS.BACK_STYLES.find(b => b.id === opts.back) || NPC_PARTS.BACK_STYLES[0])
      : pick(NPC_PARTS.BACK_STYLES);

    const skinPal = opts.skinIdx != null
      ? NPC_PARTS.SKIN_PALETTES[opts.skinIdx % NPC_PARTS.SKIN_PALETTES.length]
      : pick(NPC_PARTS.SKIN_PALETTES);
    const hairPal = opts.hairColorIdx != null
      ? NPC_PARTS.HAIR_PALETTES[opts.hairColorIdx % NPC_PARTS.HAIR_PALETTES.length]
      : pick(NPC_PARTS.HAIR_PALETTES);
    const hatPal = opts.hatColorIdx != null
      ? NPC_PARTS.HAT_PALETTES[opts.hatColorIdx % NPC_PARTS.HAT_PALETTES.length]
      : pick(NPC_PARTS.HAT_PALETTES);
    const backPal = opts.backColorIdx != null
      ? NPC_PARTS.BACK_PALETTES[opts.backColorIdx % NPC_PARTS.BACK_PALETTES.length]
      : pick(NPC_PARTS.BACK_PALETTES);
    const idleMeta = opts.idle
      ? (NPC_PARTS.IDLES.find(x => x.id === opts.idle) || NPC_PARTS.IDLES[0])
      : pick(NPC_PARTS.IDLES);

    const name = opts.name || (pick(NPC_PARTS.SURNAMES) + pick(NPC_PARTS.GIVEN_NAMES));
    const tag = opts.tag || pick(NPC_PARTS.TAGS);
    const body = NPC_PARTS.UNIFIED_BODY;
    const id = opts.id || `npc_${seed}_${idx}`;

    const armCols = buildArmCols(suitMeta, skinPal);
    const legCols = buildLegCols(suitMeta, shoeMeta, skinPal);

    const spec = {
      id,
      isProcedural: true,
      species: 'human',
      speciesName: '人类探险者',
      seed: seed + idx,
      name,
      tag,
      desc: `发[${hairMeta.name}] + 帽[${hatMeta.name}] + 套[${suitMeta.name}·${suitMeta.sleeveName}] + 鞋[${shoeMeta.name}] + 背[${backMeta.name}] + 待机[${idleMeta.shortName || idleMeta.name}]`,
      idle: idleMeta.id,
      idleShortName: idleMeta.shortName || idleMeta.name,
      idleName: idleMeta.name,
      idleHandDesc: idleMeta.handDesc || '',
      idleLegDesc: idleMeta.legDesc || '',
      partsMeta: {
        speciesId: 'human',
        speciesName: '人类探险者',
        headBase: '标准像素头骨 (5×5 / 6×5)',
        hairId: hairMeta.id,
        hairName: hairMeta.name,
        hatId: hatMeta.id,
        hatName: hatMeta.name,
        suitId: suitMeta.id,
        suitName: suitMeta.name,
        sleeveId: suitMeta.sleeve,
        sleeveName: suitMeta.sleeveName,
        shoeId: shoeMeta.id,
        shoeName: shoeMeta.name,
        backId: backMeta.id,
        backName: backMeta.name,
        backColorName: backMeta.id === 'none' ? '无' : backPal.name,
        idleId: idleMeta.id,
        idleShortName: idleMeta.shortName || idleMeta.name,
        idleName: idleMeta.name,
        idleHandDesc: idleMeta.handDesc || '',
        idleLegDesc: idleMeta.legDesc || '',
        skinName: skinPal.name,
        hairColorName: hairPal.name,
        hatColorName: hatMeta.id === 'none' ? '无' : hatPal.name,
        bodyTemplate: `${suitMeta.name} (${suitMeta.sleeveName})`,
      },
      traits: {
        soc: +(0.25 + rng() * 0.65).toFixed(2),
        en:  +(0.35 + rng() * 0.55).toFixed(2),
        cau: +(0.20 + rng() * 0.60).toFixed(2),
        cur: +(0.35 + rng() * 0.60).toFixed(2),
        pat: +(0.30 + rng() * 0.60).toFixed(2),
      },
      abilities: { sprint: true, blink: true, sneak: true },
      gait: { walkArms: 'normal', swing: 1.0, lean: 0 },
      build: Object.assign({}, body.build),
      look: {
        hair: hairMeta.id,
        hat: hatMeta.id,
        suitId: suitMeta.id,
        outfit: suitMeta.outfit,
        sleeve: suitMeta.sleeve,
        shoes: shoeMeta.id,
        back: backMeta.id,
        prop: backMeta.id === 'pack' ? 'pack' : 'none',
        cols: {
          skin: skinPal.skin,
          skinSh: skinPal.skinSh,
          eye: skinPal.eye,
          hair: hairPal.hair,
          hairHi: hairPal.hairHi,
          hairEnd: hairPal.hairEnd,
          hat: hatPal.hat,
          hatHi: hatPal.hatHi,
          hatBrim: hatPal.hatBrim,
          top: suitMeta.top,
          topSh: suitMeta.topSh,
          bib: suitMeta.bib || suitMeta.belt,
          hood: suitMeta.hood || suitMeta.topSh,
          coat: suitMeta.coat || suitMeta.top,
          coatSh: suitMeta.coatSh || suitMeta.topSh,
          collar: suitMeta.collar || suitMeta.belt,
          trim: suitMeta.trim || suitMeta.belt,
          belt: suitMeta.belt,
          pelvis: suitMeta.pelvis,
          back: backPal.back,
          backHi: backPal.backHi,
          backSh: backPal.backSh,
          pack: backPal.back,
          armN: armCols.armN,
          armF: armCols.armF,
          legN: legCols.legN,
          legF: legCols.legF,
        },
      },
      lines: {
        greet: ['你好。', '这身行头很合身。', '看我跑起来披风飘起！'],
        chat: ['换了新套装连袖子都自动适配了。', '你看这件旅行者披风迎风扬起！', '前面有试剑木桩。', '走，去巡逻看看。'],
        react: ['嗯？', '好身手！', '小心刀光！'],
        refuse: ['我还在执勤。'],
        flee: ['暂避锋芒！'],
      },
    };
    registerAffinityForSpec(spec);
    return spec;
  }

  /* 批量随机生成一组互不重样的 NPC（支持对种族、显像管族变种与模块、菌伞人同色系自由组合模块、人类部件进行筛选或随机组合） */
  function generateNPCBatch(count, seed, filterOpts) {
    const n = Math.max(1, Math.min(24, count || 8));
    const baseSeed = seed != null ? seed : 2026;
    const rng = mulberry32(baseSeed);
    const usedCombos = new Set();
    const usedNames = new Set();
    const list = [];

    const backCycle = ['cape', 'cape', 'pack', 'none', 'cape', 'pack', 'cape', 'none'];
    const alienCycle = ['cathode', 'myco', 'cinder'];
    const mixedCycle = ['cathode', 'myco', 'cinder', 'human', 'cathode', 'myco', 'cinder', 'human'];
    const speciesFilter = filterOpts && filterOpts.species ? filterOpts.species : 'human';

    for (let i = 0; i < n; i++) {
      const idle = filterOpts && filterOpts.idle && filterOpts.idle !== 'random'
        ? filterOpts.idle
        : NPC_PARTS.IDLES[(i * 2 + (baseSeed & 1) + Math.floor(rng() * 2)) % NPC_PARTS.IDLES.length].id;

      let chosenSpecies = 'human';
      if (speciesFilter === 'aliens') {
        chosenSpecies = alienCycle[i % alienCycle.length];
      } else if (speciesFilter === 'mixed') {
        chosenSpecies = mixedCycle[i % mixedCycle.length];
      } else if (speciesFilter === 'cathode' || speciesFilter === 'myco' || speciesFilter === 'cinder') {
        chosenSpecies = speciesFilter;
      }

      if (chosenSpecies !== 'human') {
        const f = filterOpts || {};
        if (chosenSpecies === 'cathode') {
          const hasExplicitCathodePreset = f.cathodeVariant && f.cathodeVariant !== 'random' &&
            (!f.cathodeHeadShape || f.cathodeHeadShape === 'random') &&
            (!f.cathodeScreenMotif || f.cathodeScreenMotif === 'random') &&
            (!f.cathodeBodyBuild || f.cathodeBodyBuild === 'random') &&
            (!f.cathodeColorTheme || f.cathodeColorTheme === 'random');

          if (hasExplicitCathodePreset) {
            const cVarObj = NPC_PARTS.CATHODE_VARIANTS.find(v => v.id === f.cathodeVariant) || NPC_PARTS.CATHODE_VARIANTS[0];
            list.push(generateAlienNPC('cathode', baseSeed, {
              index: i,
              id: `npc_${baseSeed}_${i + 1}`,
              idle: (f.idle && f.idle !== 'random') ? f.idle : idle,
              cathodeVariant: cVarObj.id,
            }));
            continue;
          }

          const cShapes = NPC_PARTS.CATHODE_HEAD_SHAPES;
          const cMotifs = NPC_PARTS.CATHODE_SCREEN_MOTIFS;
          const cBuilds = NPC_PARTS.MYCO_BODY_BUILDS;
          const cColors = NPC_PARTS.CATHODE_COLOR_THEMES;

          const pickedShape = (f.cathodeHeadShape && f.cathodeHeadShape !== 'random')
            ? f.cathodeHeadShape
            : cShapes[(i + Math.floor(rng() * cShapes.length)) % cShapes.length].id;
          const pickedMotif = (f.cathodeScreenMotif && f.cathodeScreenMotif !== 'random')
            ? f.cathodeScreenMotif
            : cMotifs[(i * 2 + Math.floor(rng() * cMotifs.length)) % cMotifs.length].id;
          const pickedBuild = (f.cathodeBodyBuild && f.cathodeBodyBuild !== 'random')
            ? f.cathodeBodyBuild
            : cBuilds[(i + Math.floor(rng() * cBuilds.length)) % cBuilds.length].id;
          const pickedColor = (f.cathodeColorTheme && f.cathodeColorTheme !== 'random')
            ? f.cathodeColorTheme
            : cColors[(i + Math.floor(rng() * cColors.length)) % cColors.length].id;

          list.push(generateAlienNPC('cathode', baseSeed, {
            index: i,
            id: `npc_${baseSeed}_${i + 1}`,
            cathodeRandomize: true,
            cathodeHeadShape: pickedShape,
            cathodeScreenMotif: pickedMotif,
            cathodeBodyBuild: pickedBuild,
            cathodeColorTheme: pickedColor,
            idle,
          }));
          continue;
        }

        if (chosenSpecies === 'myco') {
          const hasExplicitPreset = f.mycoVariant && f.mycoVariant !== 'random' &&
            (!f.mycoCapShape || f.mycoCapShape === 'random') &&
            (!f.mycoColorTheme || f.mycoColorTheme === 'random') &&
            (!f.mycoCapColor || f.mycoCapColor === 'random') &&
            (!f.mycoBodyBuild || f.mycoBodyBuild === 'random') &&
            (!f.mycoSuitColor || f.mycoSuitColor === 'random');

          if (hasExplicitPreset) {
            const mycoVarObj = NPC_PARTS.MYCO_VARIANTS.find(v => v.id === f.mycoVariant) || NPC_PARTS.MYCO_VARIANTS[0];
            list.push(generateAlienNPC('myco', baseSeed, {
              index: i,
              id: `npc_${baseSeed}_${i + 1}`,
              idle: (f.idle && f.idle !== 'random') ? f.idle : idle,
              mycoVariant: mycoVarObj.id,
            }));
            continue;
          }

          // 菌伞人自由模块化组合：6种伞菌头型 × 7种头身统一同色系 × 6种身高胖瘦体型 × 10种待机姿势
          const shapes = NPC_PARTS.MYCO_CAP_SHAPES;
          const capPals = NPC_PARTS.MYCO_CAP_PALETTES;
          const builds = NPC_PARTS.MYCO_BODY_BUILDS;

          const pickedShape = (f.mycoCapShape && f.mycoCapShape !== 'random')
            ? f.mycoCapShape
            : shapes[(i + Math.floor(rng() * shapes.length)) % shapes.length].id;
          const requestedColorKey = (f.mycoColorTheme && f.mycoColorTheme !== 'random')
            ? f.mycoColorTheme
            : (f.mycoCapColor && f.mycoCapColor !== 'random')
              ? f.mycoCapColor
              : (f.mycoSuitColor && f.mycoSuitColor !== 'random')
                ? f.mycoSuitColor
                : null;
          const unifiedPair = resolveUnifiedMycoColorPair(
            requestedColorKey,
            i + Math.floor(rng() * capPals.length)
          );
          const pickedBuild = (f.mycoBodyBuild && f.mycoBodyBuild !== 'random')
            ? f.mycoBodyBuild
            : builds[(i + Math.floor(rng() * builds.length)) % builds.length].id;

          list.push(generateAlienNPC('myco', baseSeed, {
            index: i,
            id: `npc_${baseSeed}_${i + 1}`,
            mycoRandomize: true,
            mycoCapShape: pickedShape,
            mycoColorTheme: unifiedPair.capPal.id,
            mycoCapColor: unifiedPair.capPal.id,
            mycoSuitColor: unifiedPair.suitPal.id,
            mycoBodyBuild: pickedBuild,
            idle,
          }));
          continue;
        }

        if (chosenSpecies === 'cinder') {
          const hasExplicitCinderPreset = f.cinderVariant && f.cinderVariant !== 'random' &&
            (!f.cinderHeadShape || f.cinderHeadShape === 'random') &&
            (!f.cinderCoreMotif || f.cinderCoreMotif === 'random') &&
            (!f.cinderBodyBuild || f.cinderBodyBuild === 'random') &&
            (!f.cinderColorTheme || f.cinderColorTheme === 'random');

          if (hasExplicitCinderPreset) {
            const ivObj = NPC_PARTS.CINDER_VARIANTS.find(v => v.id === f.cinderVariant) || NPC_PARTS.CINDER_VARIANTS[0];
            list.push(generateAlienNPC('cinder', baseSeed, {
              index: i,
              id: `npc_${baseSeed}_${i + 1}`,
              idle: (f.idle && f.idle !== 'random') ? f.idle : idle,
              cinderVariant: ivObj.id,
            }));
            continue;
          }

          const iShapes = NPC_PARTS.CINDER_HEAD_SHAPES;
          const iMotifs = NPC_PARTS.CINDER_CORE_MOTIFS;
          const iBuilds = NPC_PARTS.MYCO_BODY_BUILDS;
          const iColors = NPC_PARTS.CINDER_COLOR_THEMES;

          const pickedShape = (f.cinderHeadShape && f.cinderHeadShape !== 'random')
            ? f.cinderHeadShape
            : iShapes[(i + Math.floor(baseSeed / 11)) % iShapes.length].id;
          const pickedMotif = (f.cinderCoreMotif && f.cinderCoreMotif !== 'random')
            ? f.cinderCoreMotif
            : iMotifs[(i + Math.floor(baseSeed / 7)) % iMotifs.length].id;
          const pickedBuild = (f.cinderBodyBuild && f.cinderBodyBuild !== 'random')
            ? f.cinderBodyBuild
            : iBuilds[(i + Math.floor(baseSeed / 5)) % iBuilds.length].id;
          const pickedColor = (f.cinderColorTheme && f.cinderColorTheme !== 'random')
            ? f.cinderColorTheme
            : iColors[(i + Math.floor(baseSeed / 3)) % iColors.length].id;

          list.push(generateAlienNPC('cinder', baseSeed, {
            index: i,
            id: `npc_${baseSeed}_${i + 1}`,
            cinderRandomize: true,
            cinderHeadShape: pickedShape,
            cinderCoreMotif: pickedMotif,
            cinderBodyBuild: pickedBuild,
            cinderColorTheme: pickedColor,
            idle,
          }));
          continue;
        }

        list.push(generateAlienNPC(chosenSpecies, baseSeed, {
          index: i,
          id: `npc_${baseSeed}_${i + 1}`,
          idle,
        }));
        continue;
      }

      let hair = filterOpts && filterOpts.hair && filterOpts.hair !== 'random' ? filterOpts.hair : null;
      let hat = filterOpts && filterOpts.hat && filterOpts.hat !== 'random' ? filterOpts.hat : null;
      const suit = filterOpts && filterOpts.suit && filterOpts.suit !== 'random'
        ? filterOpts.suit
        : NPC_PARTS.OUTFIT_SUITS[(i + Math.floor(rng() * NPC_PARTS.OUTFIT_SUITS.length)) % NPC_PARTS.OUTFIT_SUITS.length].id;
      const shoes = filterOpts && filterOpts.shoes && filterOpts.shoes !== 'random'
        ? filterOpts.shoes
        : NPC_PARTS.SHOE_STYLES[(i + Math.floor(rng() * NPC_PARTS.SHOE_STYLES.length)) % NPC_PARTS.SHOE_STYLES.length].id;
      const back = filterOpts && filterOpts.back && filterOpts.back !== 'random'
        ? filterOpts.back
        : backCycle[i % backCycle.length];

      if (!hair || !hat) {
        for (let tries = 0; tries < 40; tries++) {
          const candHair = hair || NPC_PARTS.HAIR_STYLES[(i + Math.floor(rng() * NPC_PARTS.HAIR_STYLES.length)) % NPC_PARTS.HAIR_STYLES.length].id;
          const candHat = hat || (tries === 0 && i % 3 === 0
            ? 'none'
            : NPC_PARTS.HAT_STYLES[(i * 3 + Math.floor(rng() * NPC_PARTS.HAT_STYLES.length)) % NPC_PARTS.HAT_STYLES.length].id);
          const key = `${candHair}:${candHat}`;
          if (!usedCombos.has(key) || tries === 39) {
            hair = candHair;
            hat = candHat;
            usedCombos.add(key);
            break;
          }
        }
      }

      let name = null;
      for (let t = 0; t < 20; t++) {
        const cand = NPC_PARTS.SURNAMES[Math.floor(rng() * NPC_PARTS.SURNAMES.length)] +
          NPC_PARTS.GIVEN_NAMES[Math.floor(rng() * NPC_PARTS.GIVEN_NAMES.length)];
        if (!usedNames.has(cand)) {
          usedNames.add(cand);
          name = cand;
          break;
        }
      }

      const npc = generateNPC({
        seed: baseSeed,
        index: i,
        id: `npc_${baseSeed}_${i + 1}`,
        name,
        hair,
        hat,
        suit,
        shoes,
        back,
        idle,
        skinIdx: (i + Math.floor(rng() * NPC_PARTS.SKIN_PALETTES.length)) % NPC_PARTS.SKIN_PALETTES.length,
        hairColorIdx: (i * 2 + Math.floor(rng() * NPC_PARTS.HAIR_PALETTES.length)) % NPC_PARTS.HAIR_PALETTES.length,
        hatColorIdx: (i * 3 + Math.floor(rng() * NPC_PARTS.HAT_PALETTES.length)) % NPC_PARTS.HAT_PALETTES.length,
        backColorIdx: (i + Math.floor(rng() * NPC_PARTS.BACK_PALETTES.length)) % NPC_PARTS.BACK_PALETTES.length,
      });
      list.push(npc);
    }
    return list;
  }

  return { CAST, AFFINITY, NPC_PARTS, generateAlienNPC, generateNPC, generateNPCBatch };
});

