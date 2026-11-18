import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  FastForward,
  Users,
  Rocket,
  Zap,
  Gamepad2,
  Download,
  FileCode,
  Sparkles,
  Volume2,
  VolumeX,
  Eye,
  Check,
  Copy,
} from 'lucide-react';
// @ts-ignore
import * as RigModule from './pixelcast/rig.js';
// @ts-ignore
import * as CastModule from './pixelcast/cast.js';
// @ts-ignore
import * as AIModule from './pixelcast/ai.js';

const Rig: any = (RigModule as any).default?.GW ? (RigModule as any).default : (globalThis as any).PixelRig || RigModule;
const Cast: any = (CastModule as any).default?.CAST ? (CastModule as any).default : (globalThis as any).PixelCast || CastModule;
const AI: any = (AIModule as any).default?.createWorld ? (AIModule as any).default : (globalThis as any).PixelAI || AIModule;

(globalThis as any).PixelRig = Rig;
(globalThis as any).PixelCast = Cast;
(globalThis as any).PixelAI = AI;

const VW = 320;
const VH = 180;
const WW = AI.WW;

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x: number, y: number) => (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

const colorCache: Record<string, number> = {};
function C(hex: string): number {
  let v = colorCache[hex];
  if (v !== undefined) return v;
  const n = parseInt(hex.slice(1), 16);
  v = ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
  colorCache[hex] = v;
  return v;
}

function mix(c1: number, c2: number, t: number): number {
  const r = (c1 & 255) + ((c2 & 255) - (c1 & 255)) * t;
  const g = ((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t;
  const b = ((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

const PAL = {
  sky0: C('#d5d7dd'),
  sky1: C('#bfc2ca'),
  sky2: C('#a9adb7'),
  far: C('#a3a7b2'),
  mid: C('#8a8f9c'),
  near: C('#5f636f'),
  nearHi: C('#757a87'),
  fog: C('#cfd1d7'),
  gTop: C('#8e929d'),
  gHi: C('#757a86'),
  gBase: C('#52565f'),
  gDark: C('#43464e'),
  ink: C('#2f3138'),
  glow: C('#ece8d6'),
};

const rngS = AI.mulberry32(7);
function skyline(len: number, minH: number, maxH: number, wMin: number, wMax: number) {
  const a = new Array(len).fill(0);
  let x = 0;
  while (x < len) {
    const w = wMin + Math.floor(rngS() * (wMax - wMin));
    const h = minH + Math.floor(rngS() * (maxH - minH));
    const broken = rngS() < 0.5;
    const slope = rngS() < 0.3;
    for (let i = 0; i < w && x + i < len; i++) {
      let hh = h;
      if (broken && i > w * 0.6) hh = h - Math.floor((i - w * 0.6) * 1.2);
      if (slope) hh = h - Math.floor(i * 0.5);
      a[x + i] = Math.max(2, hh);
    }
    x += w + (rngS() < 0.3 ? Math.floor(rngS() * 14) : 0);
  }
  return a;
}

const FAR = skyline(1200, 30, 80, 14, 34);
const MID = skyline(1600, 24, 70, 10, 26);
const PIL: Array<{ x: number; w: number; h: number; cut: number }> = [];
for (let x = 60; x < 2400; x += 220 + Math.floor(rngS() * 160)) {
  PIL.push({
    x,
    w: 14 + Math.floor(rngS() * 8),
    h: 90 + Math.floor(rngS() * 50),
    cut: Math.floor(rngS() * 16),
  });
}

const PF = [
  [
    [-1, 0],
    [1, 0],
  ],
  [
    [-2, 0],
    [2, 0],
    [-1, -1],
    [1, -1],
  ],
  [
    [-3, -1],
    [3, -1],
    [-2, -2],
    [2, -2],
  ],
  [
    [-3, -2],
    [3, -2],
  ],
];

const BARS: Array<[string, string]> = [
  ['soc', '社交'],
  ['en', '精力'],
  ['cau', '谨慎'],
  ['cur', '好奇'],
  ['pat', '耐心'],
];

const ACTION_MODES = [
  { id: 'katanaCombo', label: '长刀·四段连段 (16帧长序列 · 前摇→劈完带刀光→武器不动刀光收半)' },
  { id: 'katanaIai', label: '长刀右键·鞘口吸粒爆星+独立层环绕3连刀光 (Detached Orbit FX)' },
  { id: 'greatswordCombo', label: '巨型大剑·二段重连击 (肩扛待机走路 · 拖地上撩+狮子奋迅崩地砸)' },
  { id: 'greatswordCleave', label: '大剑二段分解·狮子奋迅崩地重砸 (Earth-Shatter Slam · 8帧)' },
  { id: 'armedIdle45', label: '持武 45° 待机 (Weapon Idle 45°)' },
  { id: 'walkBack', label: '持武后退走 (Walk Back)' },
  { id: 'runBack', label: '持武后退跑 (Run Back)' },
  { id: 'swordCombo', label: '剑模组·三连击 (Sword 3-Combo · 8帧)' },
  { id: 'horizSlash', label: '一段分解·向前横斩 (Horizontal Slash · 8帧)' },
  { id: 'swordSkill', label: '剑模组·蓄力剑气 (Sword Skill · 8帧)' },
  { id: 'bladeSwing', label: '三段分解·举顶后仰下劈 (Overhead Cleave · 8帧)' },
  { id: 'pistolAim', label: '手臂 360° 瞄准 (Aim 360°)' },
  { id: 'pistolShoot', label: '手枪开火后座 (Shoot)' },
  { id: 'pistolReload', label: '手枪战术换弹 (Reload)' },
  { id: 'armedLoco', label: '持武跑跳分离 (Armed Run/Jump)' },
  { id: 'idle', label: '45° 待机 (Idle)' },
  { id: 'walk', label: '侧面走路 (Walk)' },
  { id: 'run', label: '侧面跑步 (Run)' },
  { id: 'sprint', label: '冲刺残影 (Sprint)' },
  { id: 'cwalk', label: '下蹲潜行 (Sneak)' },
  { id: 'air', label: '跳跃升落 (Jump)' },
  { id: 'flip', label: '二段跳 / 太空喷气 (Jump2)' },
  { id: 'blink', label: '瞬移蓄力与落地 (Blink)' },
];

const FILES_LIST = [
  {
    name: 'pixelcast_all.zip',
    path: '/pixelcast/pixelcast_all.zip',
    desc: '完整打包压缩包（含单文件网页演示、核心代码、JSON 与说明）',
    primary: true,
  },
  {
    name: 'pixelcast_demo.html',
    path: '/pixelcast/pixelcast_demo.html',
    desc: '单文件独立网页演示（双击即玩，内联全部代码与特效）',
    primary: true,
  },
  {
    name: 'rig.js',
    path: '/pixelcast/rig.js',
    desc: '15 根骨骼定义、侧面与 45° 绘制、太空服图层与全套动作姿势库',
  },
  {
    name: 'cast.js',
    path: '/pixelcast/cast.js',
    desc: '6 位角色数据（林、白、苏、铁、米、星）、性格参数、能力与好感度表',
  },
  {
    name: 'ai.js',
    path: '/pixelcast/ai.js',
    desc: '自主 AI 意图层、地形跳跃/瞬移操控层、物理与状态机',
  },
  {
    name: 'skeleton.json',
    path: '/pixelcast/skeleton.json',
    desc: '骨骼结构、姿势字段说明与全部角色配置，方便直接导入 Godot',
  },
  {
    name: 'README.md',
    path: '/pixelcast/README.md',
    desc: '骨架比例、45° 视角、太空服与新角色扩展说明文档',
  },
];

// Gentle Web Audio procedural sound synthesizer
class SoundEngine {
  ctx: AudioContext | null = null;
  muted = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  play(type: 'jump' | 'double' | 'jet' | 'blink' | 'suit' | 'select' | 'shoot' | 'reload' | 'swing' | 'charge' | 'wave' | 'hit') {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'double') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'jet') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.18);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'blink') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.11);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.11);
        osc.start(now);
        osc.stop(now + 0.11);
      } else if (type === 'suit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(480, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'reload') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(380, now + 0.07);
        osc.frequency.setValueAtTime(520, now + 0.14);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.19);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (type === 'swing') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.09);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(185, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.11);
        osc.start(now);
        osc.stop(now + 0.11);
      } else if (type === 'charge') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.22);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'wave') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.16);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'select') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch {
      // Ignore audio errors
    }
  }
}

const sfx = new SoundEngine();

export default function App() {
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cardCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const inspectorCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const layerCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const headBreakdownCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const npcBatchCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const npcBatchSlashCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const worldRef = useRef<any>(null);
  const camXRef = useRef<number>(0);
  const attackHoldRef = useRef<boolean>(false);
  const lastHudSyncRef = useRef<string>('');
  const pointerWorldRef = useRef<{ x: number; y: number; rx: number; ry: number; active: boolean }>({
    x: 160,
    y: 132,
    rx: 0.65,
    ry: 0.72,
    active: false,
  });

  const [stageSpecs, setStageSpecs] = useState<any[]>(() => Cast.CAST.slice());
  const [selectedIdx, setSelectedIdx] = useState<number>(5); // Default select #6 星 (Xing)
  const [paused, setPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [lineup, setLineup] = useState<boolean>(false);
  const [takeOn, setTakeOn] = useState<boolean>(false);
  const [suitStates, setSuitStates] = useState<boolean[]>([false, false, false, false, false, false]);
  const [weaponStates, setWeaponStates] = useState<Array<string | null>>([null, null, null, null, null, 'blade']);
  const [ammoDisplay, setAmmoDisplay] = useState<{ ammo: number; max: number; action: string; comboStep: number; dummyHits?: number }>({
    ammo: 6,
    max: 6,
    action: 'aim',
    comboStep: 0,
    dummyHits: 0,
  });
  const [allSuitsOn, setAllSuitsOn] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  // Action Inspector state
  const [inspectCharIdx, setInspectCharIdx] = useState<number>(5);
  const [inspectCustomSpec, setInspectCustomSpec] = useState<any | null>(null);
  const [inspectMode, setInspectMode] = useState<string>('katanaCombo');
  const [inspectSuit, setInspectSuit] = useState<boolean>(false);
  const [inspectWeapon, setInspectWeapon] = useState<string>('katana');
  const [inspectIdleOverride, setInspectIdleOverride] = useState<string>('default');
  const [inspectIdleSideView, setInspectIdleSideView] = useState<boolean>(false);
  const [inspectFrameLabels, setInspectFrameLabels] = useState<string[]>([
    'Frame 1', 'Frame 2', 'Frame 3', 'Frame 4', 'Frame 5', 'Frame 6', 'Frame 7', 'Frame 8',
  ]);

  // Procedural NPC Batch Generator & Alien Races state
  const [npcSeed, setNpcSeed] = useState<number>(2026);
  const [npcSpeciesFilter, setNpcSpeciesFilter] = useState<string>('cathode');
  const [npcCathodeVariantFilter, setNpcCathodeVariantFilter] = useState<string>('random');
  const [cathodeHeadShapeFilter, setCathodeHeadShapeFilter] = useState<string>('random');
  const [cathodeScreenMotifFilter, setCathodeScreenMotifFilter] = useState<string>('random');
  const [cathodeBodyBuildFilter, setCathodeBodyBuildFilter] = useState<string>('random');
  const [cathodeColorThemeFilter, setCathodeColorThemeFilter] = useState<string>('random');
  const [npcMycoVariantFilter, setNpcMycoVariantFilter] = useState<string>('random');
  const [mycoCapShapeFilter, setMycoCapShapeFilter] = useState<string>('random');
  const [mycoCapColorFilter, setMycoCapColorFilter] = useState<string>('random');
  const [mycoBodyBuildFilter, setMycoBodyBuildFilter] = useState<string>('random');
  const [mycoSuitColorFilter, setMycoSuitColorFilter] = useState<string>('random');
  const [npcCinderVariantFilter, setNpcCinderVariantFilter] = useState<string>('random');
  const [cinderHeadShapeFilter, setCinderHeadShapeFilter] = useState<string>('random');
  const [cinderCoreMotifFilter, setCinderCoreMotifFilter] = useState<string>('random');
  const [cinderBodyBuildFilter, setCinderBodyBuildFilter] = useState<string>('random');
  const [cinderColorThemeFilter, setCinderColorThemeFilter] = useState<string>('random');
  const [alienScreenMode, setAlienScreenMode] = useState<'auto' | 'ring' | 'crosshair' | 'static'>('auto');
  const [npcHairFilter, setNpcHairFilter] = useState<string>('random');
  const [npcHatFilter, setNpcHatFilter] = useState<string>('random');
  const [npcSuitFilter, setNpcSuitFilter] = useState<string>('random');
  const [npcShoeFilter, setNpcShoeFilter] = useState<string>('random');
  const [npcBackFilter, setNpcBackFilter] = useState<string>('random');
  const [npcIdleFilter, setNpcIdleFilter] = useState<string>('random');
  const [npcView34, setNpcView34] = useState<boolean>(true);
  const [selectedNpcIdx, setSelectedNpcIdx] = useState<number>(0);
  const [npcBatch, setNpcBatch] = useState<any[]>(() =>
    Cast.generateNPCBatch ? Cast.generateNPCBatch(8, 2026, { species: 'cinder' }) : []
  );
  const alienShowcaseRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const alienActionShowcaseRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  // Code preview modal / tab
  const [activeFileTab, setActiveFileTab] = useState<string>('README.md');
  const [fileContent, setFileContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Keep mutable refs for 60Hz loop
  const stateRef = useRef({
    selectedIdx: 5,
    paused: false,
    speed: 1,
    lineup: false,
    takeOn: false,
  });

  useEffect(() => {
    stateRef.current = { selectedIdx, paused, speed, lineup, takeOn };
  }, [selectedIdx, paused, speed, lineup, takeOn]);

  // Load file preview content
  useEffect(() => {
    const item = FILES_LIST.find((f) => f.name === activeFileTab);
    if (!item || item.name.endsWith('.zip')) return;
    fetch(item.path)
      .then((r) => r.text())
      .then((txt) => setFileContent(txt))
      .catch(() => setFileContent('// Failed to load preview'));
  }, [activeFileTab]);

  const inspectFrameCount = inspectMode === 'katanaCombo' ? 16 : 8;

  // Regenerate procedural NPC batch when seed or part filters change
  useEffect(() => {
    if (!Cast.generateNPCBatch) return;
    const batch = Cast.generateNPCBatch(8, npcSeed, {
      species: npcSpeciesFilter,
      cathodeVariant: npcCathodeVariantFilter,
      cathodeHeadShape: cathodeHeadShapeFilter,
      cathodeScreenMotif: cathodeScreenMotifFilter,
      cathodeBodyBuild: cathodeBodyBuildFilter,
      cathodeColorTheme: cathodeColorThemeFilter,
      mycoVariant: npcMycoVariantFilter,
      mycoCapShape: mycoCapShapeFilter,
      mycoColorTheme: mycoCapColorFilter,
      mycoCapColor: mycoCapColorFilter,
      mycoBodyBuild: mycoBodyBuildFilter,
      mycoSuitColor: mycoSuitColorFilter,
      cinderVariant: npcCinderVariantFilter,
      cinderHeadShape: cinderHeadShapeFilter,
      cinderCoreMotif: cinderCoreMotifFilter,
      cinderBodyBuild: cinderBodyBuildFilter,
      cinderColorTheme: cinderColorThemeFilter,
      hair: npcHairFilter,
      hat: npcHatFilter,
      suit: npcSuitFilter,
      shoes: npcShoeFilter,
      back: npcBackFilter,
      idle: npcIdleFilter,
    });
    setNpcBatch(batch);
  }, [
    npcSeed,
    npcSpeciesFilter,
    npcCathodeVariantFilter,
    cathodeHeadShapeFilter,
    cathodeScreenMotifFilter,
    cathodeBodyBuildFilter,
    cathodeColorThemeFilter,
    npcMycoVariantFilter,
    mycoCapShapeFilter,
    mycoCapColorFilter,
    mycoBodyBuildFilter,
    mycoSuitColorFilter,
    npcCinderVariantFilter,
    cinderHeadShapeFilter,
    cinderCoreMotifFilter,
    cinderBodyBuildFilter,
    cinderColorThemeFilter,
    npcHairFilter,
    npcHatFilter,
    npcSuitFilter,
    npcShoeFilter,
    npcBackFilter,
    npcIdleFilter,
  ]);

  // Render 3 Alien Species dedicated showcase cards (45° Idle + Dynamic Micro-FX Action)
  useEffect(() => {
    if (!Cast.generateAlienNPC) return;
    const alienIds = ['cathode', 'myco', 'cinder'];
    alienIds.forEach((spId, idx) => {
      const spec = Cast.generateAlienNPC(
        spId,
        2026 + idx,
        spId === 'cathode'
          ? {
              cathodeVariant: npcCathodeVariantFilter !== 'random' ? npcCathodeVariantFilter : undefined,
              cathodeHeadShape: cathodeHeadShapeFilter !== 'random' ? cathodeHeadShapeFilter : undefined,
              cathodeScreenMotif: cathodeScreenMotifFilter !== 'random' ? cathodeScreenMotifFilter : undefined,
              cathodeBodyBuild: cathodeBodyBuildFilter !== 'random' ? cathodeBodyBuildFilter : undefined,
              cathodeColorTheme: cathodeColorThemeFilter !== 'random' ? cathodeColorThemeFilter : undefined,
            }
          : spId === 'myco'
          ? {
              mycoVariant: npcMycoVariantFilter !== 'random' ? npcMycoVariantFilter : undefined,
              mycoCapShape: mycoCapShapeFilter !== 'random' ? mycoCapShapeFilter : undefined,
              mycoColorTheme: mycoCapColorFilter !== 'random' ? mycoCapColorFilter : undefined,
              mycoCapColor: mycoCapColorFilter !== 'random' ? mycoCapColorFilter : undefined,
              mycoBodyBuild: mycoBodyBuildFilter !== 'random' ? mycoBodyBuildFilter : undefined,
              mycoSuitColor: mycoSuitColorFilter !== 'random' ? mycoSuitColorFilter : undefined,
            }
          : {
              cinderVariant: npcCinderVariantFilter !== 'random' ? npcCinderVariantFilter : undefined,
              cinderHeadShape: cinderHeadShapeFilter !== 'random' ? cinderHeadShapeFilter : undefined,
              cinderCoreMotif: cinderCoreMotifFilter !== 'random' ? cinderCoreMotifFilter : undefined,
              cinderBodyBuild: cinderBodyBuildFilter !== 'random' ? cinderBodyBuildFilter : undefined,
              cinderColorTheme: cinderColorThemeFilter !== 'random' ? cinderColorThemeFilter : undefined,
            }
      );
      const P = Rig.poser(spec);
      const cvIdle = alienShowcaseRefs.current[idx];
      if (cvIdle) {
        const ctx = cvIdle.getContext('2d');
        if (ctx) {
          const po = npcView34 ? P.idle(0.8, false) : P.idleSide(0.8, false);
          const g = Rig.charGrid(spec, po, P.hyGround(po), 0, {
            suit: false,
            hurt: alienScreenMode === 'static',
            screenMode: alienScreenMode === 'auto' ? undefined : alienScreenMode,
          });
          ctx.fillStyle = '#8b909c';
          ctx.fillRect(0, 0, 48, 46);
          ctx.fillStyle = '#5c606b';
          ctx.fillRect(0, 41, 48, 5);
          const gxShift = (Rig.GX || 4) - 4;
          for (let r = 0; r < 46; r++) {
            for (let c = 0; c < 48; c++) {
              const col = g[r + 33]?.[c + gxShift];
              if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(c, r, 1, 1);
              }
            }
          }
        }
      }
      const cvAct = alienActionShowcaseRefs.current[idx];
      if (cvAct) {
        const ctx = cvAct.getContext('2d');
        if (ctx) {
          let po: any;
          let wep: any = null;
          let up = 0;
          if (spId === 'cathode') {
            po = P.idleSide(0.2, false);
            wep = { id: 'pistol', aim: 92, action: 'shoot', p: 0.14 };
          } else if (spId === 'myco') {
            po = P.air(1.2);
            up = 3;
            wep = { id: 'blade', aim: 90, action: 'combo1', p: 0.42 };
          } else {
            po = P.loco('run', 2);
            up = 1;
            wep = { id: 'blade', aim: 90, action: 'combo3', p: 0.56 };
          }
          const g = Rig.charGrid(spec, po, P.hyGround(po), 0, {
            suit: false,
            weapon: wep,
            hurt: alienScreenMode === 'static',
            screenMode: alienScreenMode === 'auto' ? undefined : alienScreenMode,
          });
          ctx.fillStyle = '#7e838f';
          ctx.fillRect(0, 0, 48, 46);
          ctx.fillStyle = '#545863';
          ctx.fillRect(0, 41, 48, 5);
          const gxShift = (Rig.GX || 4) - 4;
          for (let r = 0; r < 46; r++) {
            for (let c = 0; c < 48; c++) {
              const gr = r + 33 + up;
              const col = g[gr]?.[c + gxShift];
              if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(c, r, 1, 1);
              }
            }
          }
        }
      }
    });
  }, [
    npcView34,
    alienScreenMode,
    npcCathodeVariantFilter,
    cathodeHeadShapeFilter,
    cathodeScreenMotifFilter,
    cathodeBodyBuildFilter,
    cathodeColorThemeFilter,
    npcMycoVariantFilter,
    mycoCapShapeFilter,
    mycoCapColorFilter,
    mycoBodyBuildFilter,
    mycoSuitColorFilter,
    npcCinderVariantFilter,
    cinderHeadShapeFilter,
    cinderCoreMotifFilter,
    cinderBodyBuildFilter,
    cinderColorThemeFilter,
  ]);

  // Render 6-panel Modular Part Breakdown & 8-card NPC Batch previews
  useEffect(() => {
    const activeNpc = npcBatch[selectedNpcIdx] || npcBatch[0];
    if (activeNpc && Rig.headLayerBreakdown) {
      const bd = Rig.headLayerBreakdown(activeNpc, npcView34);
      const grids = [
        bd.baseHead,
        bd.hairLayer,
        bd.hatLayer,
        bd.suitLayer || bd.fullChar,
        bd.shoeBackLayer || bd.fullChar,
        bd.runCapePreview || bd.fullChar,
      ];
      const hatId = activeNpc.look?.hat || 'none';
      const hatMap = ((npcView34 ? Rig.HATS34 : Rig.HATS)?.[hatId] || []) as Array<[number, number, string]>;
      grids.forEach((grid: any, idx: number) => {
        const cv = headBreakdownCanvasRefs.current[idx];
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#8b909c';
        ctx.fillRect(0, 0, 48, 46);
        ctx.fillStyle = '#5c606b';
        ctx.fillRect(0, 41, 48, 5);
        const gxShift = (Rig.GX || 4) - 4;
        for (let r = 0; r < 46; r++) {
          for (let c = 0; c < 48; c++) {
            const gr = r + 33;
            const col = grid[gr]?.[c + gxShift];
            if (col) {
              ctx.fillStyle = col;
              ctx.fillRect(c, r, 1, 1);
            }
          }
        }
        // On Stage 3 (Hat Overlay), faintly tint the ' ' space hair-erasing cells above the hat so users can see the mask region
        if (idx === 2 && bd.ox != null && bd.oy != null) {
          ctx.fillStyle = 'rgba(238, 241, 246, 0.28)';
          for (const [dx, dy, k] of hatMap) {
            if (k === ' ') {
              const cx = bd.ox + dx + 4;
              const cy = bd.oy + dy - 33;
              if (cx >= 0 && cx < 48 && cy >= 0 && cy < 46) {
                ctx.fillRect(cx, cy, 1, 1);
              }
            }
          }
        }
      });
    }

    npcBatch.forEach((npc: any, idx: number) => {
      const P = Rig.poser(npc);
      const gxShift = (Rig.GX || 4) - 4;
      // 1) 45° / Side Unarmed Personality Idle preview canvas (showcases each NPC's distinct hand placement & leg movement at active phase t=0.9s)
      const cvIdle = npcBatchCanvasRefs.current[idx];
      if (cvIdle) {
        const ctx = cvIdle.getContext('2d');
        if (ctx) {
          const po = npcView34 ? P.idle(0.9, false) : P.idleSide(0.9, false);
          const g = Rig.charGrid(npc, po, P.hyGround(po), 0, {
            suit: false,
            weapon: null,
          });
          ctx.fillStyle = '#8b909c';
          ctx.fillRect(0, 0, 48, 46);
          ctx.fillStyle = '#5c606b';
          ctx.fillRect(0, 41, 48, 5);
          for (let r = 0; r < 46; r++) {
            for (let c = 0; c < 48; c++) {
              const col = g[r + 33]?.[c + gxShift];
              if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(c, r, 1, 1);
              }
            }
          }
        }
      }
      // 2) Active Melee Slash action preview canvas (cycles Katana 4-combo, Greatsword 3-combo, and Sword 3-combo across cards to prove full animation compatibility)
      const cvSlash = npcBatchSlashCanvasRefs.current[idx];
      if (cvSlash) {
        const ctx = cvSlash.getContext('2d');
        if (ctx) {
          const sampleActs = [
            { id: 'katana', act: 'combo1', p: 0.42 },
            { id: 'katana', act: 'combo2', p: 0.42 },
            { id: 'katana', act: 'combo3', p: 0.42 },
            { id: 'katana', act: 'combo4', p: 0.56 },
            { id: 'greatsword', act: 'combo1', p: 0.42 },
            { id: 'greatsword', act: 'combo2', p: 0.42 },
            { id: 'greatsword', act: 'skill', p: 0.42 },
            { id: 'blade', act: 'combo3', p: 0.56 },
          ];
          const pickAct = sampleActs[idx % sampleActs.length];
          const po = pickAct.act === 'combo4' ? P.idleSide(0.2, false) : P.loco('run', (idx * 2) % 8);
          const g = Rig.charGrid(npc, po, P.hyGround(po), 0, {
            suit: false,
            weapon: { id: pickAct.id, aim: 90, action: pickAct.act, p: pickAct.p, v34: false },
          });
          ctx.fillStyle = '#7e838f';
          ctx.fillRect(0, 0, 48, 46);
          ctx.fillStyle = '#545863';
          ctx.fillRect(0, 41, 48, 5);
          for (let r = 0; r < 46; r++) {
            for (let c = 0; c < 48; c++) {
              const col = g[r + 33]?.[c + gxShift];
              if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(c, r, 1, 1);
              }
            }
          }
        }
      }
    });
  }, [npcBatch, selectedNpcIdx, npcView34]);

  // Render 8-frame Action Inspector strip + 5-panel Layer Breakdown whenever inspector state changes
  useEffect(() => {
    const baseSpec = inspectCustomSpec || stageSpecs[inspectCharIdx] || Cast.CAST[inspectCharIdx];
    const spec =
      inspectIdleOverride && inspectIdleOverride !== 'default'
        ? Object.assign({}, baseSpec, { idle: inspectIdleOverride })
        : baseSpec;
    const P = Rig.poser(spec);
    const labels: string[] = [];

    for (let i = 0; i < inspectFrameCount; i++) {
      const cv = inspectorCanvasRefs.current[i];
      if (!cv) continue;
      const ctx = cv.getContext('2d');
      if (!ctx) continue;

      let po: any;
      let phi = 0;
      let flame = 0;
      let up = 0;
      let weaponOpt: any =
        inspectWeapon !== 'none' ? { id: inspectWeapon, aim: 90, action: 'aim', p: 0 } : null;

      if (inspectMode === 'armedIdle45') {
        const wid = inspectWeapon === 'none' ? 'blade' : inspectWeapon;
        const cyc = wid === 'pistol' ? 2.2 : 2.4;
        const p = i / 8;
        po = P.weaponIdle(wid, p * cyc, false);
        weaponOpt = { id: wid, aim: 90, action: 'idle', p, v34: true };
        const swordIdleLabels = [
          '45°携剑·自然站立',
          '45°携剑·吸气整体升',
          '45°携剑·胸腔微提',
          '45°携剑·寒铁流光',
          '45°携剑·稳固蓄势',
          '45°携剑·环视前方',
          '45°携剑·呼气整体降',
          '45°携剑·稳姿归位',
        ];
        const katanaIdleLabels = [
          '45°纳刀·叉腰握柄',
          '45°纳刀·吸气整体升',
          '45°纳刀·刀镡寒芒',
          '45°纳刀·柄绳流光',
          '45°纳刀·按鞘蓄势',
          '45°纳刀·环视前方',
          '45°纳刀·呼气整体降',
          '45°纳刀·沉息归位',
        ];
        const gsIdleLabels = [
          '45°肩扛大剑·稳步站立',
          '45°肩扛大剑·吸气整体升',
          '45°肩扛大剑·血槽寒芒',
          '45°肩扛大剑·巨刃流光',
          '45°肩扛大剑·沉肩蓄势',
          '45°肩扛大剑·环视前方',
          '45°肩扛大剑·呼气整体降',
          '45°肩扛大剑·重装归位',
        ];
        const pistolIdleLabels = [
          '45°持枪·战术戒备',
          '45°持枪·吸气整体升',
          '45°持枪·核心脉冲',
          '45°持枪·准星检视',
          '45°持枪·稳固戒备',
          '45°持枪·环视扫描',
          '45°持枪·呼气整体降',
          '45°持枪·低姿待发',
        ];
        labels.push(
          wid === 'pistol'
            ? pistolIdleLabels[i]
            : wid === 'katana'
            ? katanaIdleLabels[i]
            : wid === 'greatsword'
            ? gsIdleLabels[i]
            : swordIdleLabels[i]
        );
      } else if (inspectMode === 'walkBack') {
        const wid = inspectWeapon === 'none' ? 'blade' : inspectWeapon;
        const wbNames = [
          '前脚后蹬',
          '屈膝收腿',
          '向后撤步',
          '脚尖后探',
          '后脚落步',
          '重心后移',
          '支撑滑前',
          '准备后蹬',
        ];
        po = P.loco('walkBack', i);
        weaponOpt = { id: wid, aim: 90, action: 'aim', p: 0, v34: false };
        labels.push(wbNames[i]);
      } else if (inspectMode === 'runBack') {
        const wid = inspectWeapon === 'none' ? 'blade' : inspectWeapon;
        const rbNames = [
          '全力后蹬',
          '快速抽腿',
          '悬空后摆',
          '远端探地',
          '后脚缓冲',
          '重心急退',
          '支撑后推',
          '蓄势再蹬',
        ];
        po = P.loco('runBack', i);
        if (P.runBackBob ? P.runBackBob(i) : P.runBob(i)) up = 1;
        weaponOpt = { id: wid, aim: 90, action: 'aim', p: 0, v34: false };
        labels.push(rbNames[i]);
      } else if (inspectMode === 'katanaCombo') {
        const katanaComboFrames = [
          // 第1段：拔刀向前横扫斩（3D视角极扁月牙刀光）
          { act: 'combo1', p: 0.14, name: '1-1 前摇·按鞘拔刀蓄势' },
          { act: 'combo1', p: 0.28, name: '1-2 劈完·向前横扫满刀光(3D扁月牙)' },
          { act: 'combo1', p: 0.56, name: '1-3 刀不动·扁月牙刀光收回一半' },
          { act: 'combo1', p: 0.72, name: '1-4 收势·余光消散衔接二段' },
          // 第2段：极速反手斜上挑（加快帧速 0.24s）
          { act: 'combo2', p: 0.14, name: '2-1 前摇·低身反手引刀' },
          { act: 'combo2', p: 0.28, name: '2-2 劈完·极速斜上挑满刀光' },
          { act: 'combo2', p: 0.56, name: '2-3 刀不动·上挑刀光收回一半' },
          { act: 'combo2', p: 0.72, name: '2-4 收势·高举衔接三段下劈' },
          // 第3段：极速正手斜下劈（加快帧速 0.24s，与二段构成快速上下二连斩）
          { act: 'combo3', p: 0.14, name: '3-1 前摇·高举正手引刀' },
          { act: 'combo3', p: 0.28, name: '3-2 劈完·极速斜下劈满刀光' },
          { act: 'combo3', p: 0.56, name: '3-3 刀不动·下劈刀光收回一半' },
          { act: 'combo3', p: 0.72, name: '3-4 收势·压刃蓄势大上段' },
          // 第4段：大上段重下劈（播放速度不变 0.52s，慢出刀蓄势 4 帧后巨弧劈落）
          { act: 'combo4', p: 0.14, name: '4-1 前摇·双手大上段高举' },
          { act: 'combo4', p: 0.36, name: '4-2 前摇·大上段满蓄慢出刀' },
          { act: 'combo4', p: 0.56, name: '4-3 劈完·大上段重下劈满刀光' },
          { act: 'combo4', p: 0.70, name: '4-4 刀不动·大上段刀光收回一半' },
        ];
        const kf = katanaComboFrames[i] || katanaComboFrames[0];
        po = P.idleSide(i * 0.12, false);
        weaponOpt = { id: 'katana', aim: 90, action: kf.act, p: kf.p };
        labels.push(kf.name);
      } else if (inspectMode === 'katanaIai') {
        const iaiNames = [
          '1·鞘口吸引粒子(初)',
          '2·粒子向鞘口聚拢',
          '3·聚气压缩蓄满',
          '4·聚集粒子爆发小星',
          '5·独立层第1道环绕斩',
          '6·独立层第2道环绕斩',
          '7·独立层3道半周环绕',
          '8·环绕刀光收回消散',
        ];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = { id: 'katana', aim: 90, action: 'skill', p: (i + 0.5) / 8 };
        labels.push(iaiNames[i]);
      } else if (inspectMode === 'greatswordCombo') {
        const gsComboFrames = [
          // 一段：肩扛卸力·拖地狂风上撩斩（前摇 -> 劈完满刀光 -> 剑不动刀光收回一半 -> 过肩蓄势）
          { act: 'combo1', p: 0.14, name: '1-1 前摇·肩扛卸力拖地蓄势' },
          { act: 'combo1', p: 0.42, name: '1-2 劈完·拖地狂风上撩满刀光' },
          { act: 'combo1', p: 0.70, name: '1-3 剑不动·上撩刀光收回一半' },
          { act: 'combo1', p: 0.84, name: '1-4 收势·巨刃高举衔接二段' },
          // 二段：狮子奋迅·过肩蓄力崩地重砸（前摇 -> 崩地满刀光 -> 嵌地不动刀光收回一半 -> 重新扛回肩上）
          { act: 'combo2', p: 0.14, name: '2-1 前摇·狮子奋迅过肩深拉' },
          { act: 'combo2', p: 0.42, name: '2-2 劈完·240°崩地重砸满刀光' },
          { act: 'combo2', p: 0.70, name: '2-3 剑嵌地不动·刀光收回一半' },
          { act: 'combo2', p: 1.00, name: '2-4 收势·提柄重新扛回肩上' },
        ];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = { id: 'greatsword', aim: 90, action: gsComboFrames[i].act, p: gsComboFrames[i].p };
        labels.push(gsComboFrames[i].name);
      } else if (inspectMode === 'greatswordCleave') {
        const gsCleaveNames = [
          '1·前摇·双手过肩深拉(226°)',
          '2·前摇·后仰沉腰蓄力(238°)',
          '3·前摇·满蓄将发(246°)',
          '4·劈完·崩地重砸满刀光(6°)',
          '5·劈完·碎石震地满弧余威',
          '6·剑嵌地不动·刀光收回一半',
          '7·收势·双手拔剑上提',
          '8·收势·重新扛回肩上(-132°)',
        ];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = { id: 'greatsword', aim: 90, action: 'combo2', p: (i + 0.5) / 8 };
        labels.push(gsCleaveNames[i]);
      } else if (inspectMode === 'swordCombo') {
        const comboFrames = [
          { act: 'combo1', p: 0.14, name: '一段1·背后深引' },
          { act: 'combo1', p: 0.42, name: '一段2·环腰横斩' },
          { act: 'combo1', p: 0.68, name: '一段3·横斩余势' },
          { act: 'combo2', p: 0.14, name: '二段1·低垂引刃' },
          { act: 'combo2', p: 0.56, name: '二段2·过顶大上挑' },
          { act: 'combo3', p: 0.28, name: '三段1·举顶后仰36°' },
          { act: 'combo3', p: 0.56, name: '三段2·满弧大下劈' },
          { act: 'combo3', p: 0.70, name: '三段3·重劈震地' },
        ];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = { id: 'blade', aim: 90, action: comboFrames[i].act, p: comboFrames[i].p };
        labels.push(comboFrames[i].name);
      } else if (inspectMode === 'horizSlash') {
        const hzNames = [
          '1·背手引剑',
          '2·深拉蓄力(-118°)',
          '3·环腰爆发(88°)',
          '4·横斩极点(90°)',
          '5·剑芒前刺(94°)',
          '6·横斩余韵',
          '7·曲肘收锋',
          '8·沉肘归位',
        ];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = { id: 'blade', aim: 90, action: 'combo1', p: (i + 0.5) / 8 };
        labels.push(hzNames[i]);
      } else if (inspectMode === 'swordSkill') {
        const wid = inspectWeapon === 'katana' || inspectWeapon === 'greatsword' ? inspectWeapon : 'blade';
        const skillNames =
          wid === 'katana'
            ? [
                '1·鞘口吸引粒子(初)',
                '2·粒子向鞘口聚拢',
                '3·聚气压缩蓄满',
                '4·聚集粒子爆发小星',
                '5·独立层第1道环绕斩',
                '6·独立层第2道环绕斩',
                '7·独立层3道半周环绕',
                '8·环绕刀光收回消散',
              ]
            : [
                '1·撤腕引剑',
                '2·屈肘归腰',
                '3·凝神聚气',
                '4·寒芒灌刃',
                '5·挥臂拔剑',
                '6·剑气离刃',
                '7·刀光远掠',
                '8·曲肘收剑',
              ];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = { id: wid, aim: 90, action: 'skill', p: (i + 0.5) / 8 };
        labels.push(skillNames[i]);
      } else if (inspectMode === 'bladeSwing') {
        const swNames = [
          '1·承势提剑',
          '2·高举过顶',
          '3·后仰36°蓄势',
          '4·凌空挥落',
          '5·满弧下劈',
          '6·碎石迸发',
          '7·余势压刃',
          '8·沉肘归位',
        ];
        po = P.idleSide(i * 0.2, false);
        weaponOpt = { id: 'blade', aim: 90, action: 'combo3', p: (i + 0.5) / 8 };
        labels.push(swNames[i]);
      } else if (inspectMode === 'pistolAim') {
        const aims = [0, 45, 90, 135, 180, -135, -90, -45];
        const aimNames = ['0° 朝下', '45° 右下', '90° 正前', '135° 右上', '180° 正上', '-135° 背上', '-90° 背后', '-45° 背下'];
        po = P.idleSide(i * 0.2, false);
        const wid = inspectWeapon === 'none' ? 'pistol' : inspectWeapon;
        const isMelee = wid === 'blade' || wid === 'katana' || wid === 'greatsword';
        weaponOpt = {
          id: wid,
          aim: aims[i],
          action: isMelee ? 'combo1' : 'aim',
          p: isMelee ? 0.42 : 0,
        };
        labels.push(aimNames[i]);
      } else if (inspectMode === 'pistolShoot') {
        const ps = [0, 0.1, 0.22, 0.35, 0.5, 0.68, 0.85, 1.0];
        const shootNames = ['瞄准待发', '击发爆焰', '后座上扬', '滑套抛壳', '弹壳飞出', '枪口回落', '复进归位', '恢复瞄准'];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = {
          id: 'pistol',
          aim: 92,
          action: i === 0 || i === 7 ? 'aim' : 'shoot',
          p: ps[i],
        };
        labels.push(shootNames[i]);
      } else if (inspectMode === 'pistolReload') {
        const ps = [0.08, 0.22, 0.34, 0.46, 0.6, 0.72, 0.84, 0.98];
        const reloadNames = ['抬枪解锁', '弹匣掉落', '摸腰取弹', '亮出新匣', '推入握把', '咔哒锁定', '拉套上膛', '瞄准就绪'];
        po = P.idleSide(i * 0.15, false);
        weaponOpt = { id: 'pistol', aim: 90, action: 'reload', p: ps[i] };
        labels.push(reloadNames[i]);
      } else if (inspectMode === 'armedLoco') {
        const locoNames = ['持武跑 1', '持武跑 2', '持武跑 3', '持武跑 4', '持武升 1', '持武升 2', '持武落 1', '持武落 2'];
        const aims = [90, 95, 100, 92, 115, 125, 80, 70];
        if (i < 4) {
          po = P.loco('run', i * 2);
          if (P.runBob(i * 2)) up = 1;
        } else {
          const vs = [2.2, 0.8, -0.8, -2.2];
          po = P.air(vs[i - 4]);
          up = [2, 4, 3, 1][i - 4];
        }
        const wid = inspectWeapon === 'none' ? 'pistol' : inspectWeapon;
        const isMelee = wid === 'blade' || wid === 'katana' || wid === 'greatsword';
        weaponOpt = { id: wid, aim: aims[i], action: i === 2 || i === 5 ? (isMelee ? 'combo1' : 'shoot') : 'aim', p: isMelee ? 0.42 : 0.18 };
        labels.push(locoNames[i]);
      } else if (inspectMode === 'idle') {
        weaponOpt = null;
        po = inspectIdleSideView ? P.idleSide(i * 0.4, false) : P.idle(i * 0.4, false);
        const idleMeta = (Cast.NPC_PARTS?.IDLES || []).find((x: any) => x.id === spec.idle);
        labels.push(`${inspectIdleSideView ? '侧面·' : '45°·'}${idleMeta?.shortName || spec.idle} F${i + 1}`);
      } else if (inspectMode === 'walk') {
        po = P.loco('walk', i);
        labels.push(`Frame ${i + 1}`);
      } else if (inspectMode === 'run') {
        po = P.loco('run', i);
        if (P.runBob(i)) up = 1;
        labels.push(`Frame ${i + 1}`);
      } else if (inspectMode === 'sprint') {
        po = P.loco('sprint', i);
        if (P.runBob(i)) up = 1;
        labels.push(`Frame ${i + 1}`);
      } else if (inspectMode === 'cwalk') {
        po = P.loco('cwalk', i);
        labels.push(`Frame ${i + 1}`);
      } else if (inspectMode === 'air') {
        const airVs = [2.5, 1.6, 0.8, 0.4, 0.0, -0.8, -1.6, -2.6];
        po = P.air(airVs[i]);
        up = [1, 2, 3, 4, 4, 3, 2, 1][i];
        labels.push(i < 4 ? `上升 F${i + 1}` : `下落 F${i + 1}`);
      } else if (inspectMode === 'flip') {
        if (inspectSuit) {
          const kt = (i / 7) * 0.3;
          po = P.kick(kt);
          flame = Math.max(0, Math.min(1, 1 - kt / 0.3));
          up = i === 0 ? 0 : i <= 5 ? 2 : 1;
          labels.push(`喷气 F${i + 1}`);
        } else {
          const ft = (i / 8) * 0.24 + 0.001;
          const f = P.flip(Math.min(0.239, ft));
          po = f.po;
          phi = f.phi;
          up = 2;
          labels.push(i < 7 ? `团身 ${f.phi}°` : '展开衔接');
        }
      } else if (inspectMode === 'blink') {
        po = i < 3 ? P.blinkWind() : i < 6 ? P.blinkLand() : P.crouchIdle();
        labels.push(`Frame ${i + 1}`);
      } else {
        po = P.idle(i * 0.2, false);
        labels.push(`Frame ${i + 1}`);
      }

      const hy = P.hyGround(po);
      const g = Rig.charGrid(spec, po, hy, phi, {
        suit: inspectSuit,
        flame,
        weapon: weaponOpt,
        includeDetachedFX: true,
        hurt: alienScreenMode === 'static',
        screenMode: alienScreenMode === 'auto' ? undefined : alienScreenMode,
      });

      ctx.fillStyle = '#8b909c';
      ctx.fillRect(0, 0, 72, 56);
      ctx.fillStyle = '#5c606b';
      ctx.fillRect(0, 51, 72, 5);

      const inspColOff = (Rig.GX || 4) - 16; // Centers hip (16 + GX) at c = 32 inside 72px wide canvas
      for (let r = 0; r < 56; r++) {
        for (let c = 0; c < 72; c++) {
          const gr = r + 23 + up;
          const gc = c + inspColOff;
          if (gr >= 0 && gr < Rig.GH && gc >= 0 && gc < Rig.GW) {
            const col = g[gr]?.[gc];
            if (col) {
              ctx.fillStyle = col;
              ctx.fillRect(c, r, 1, 1);
            }
          }
        }
      }
      // In swordSkill frames 5..6 (except katana which uses stationary triple vertical crescents), draw the flying pure-white crescent sword wave in the 72x56 preview tile
      if (inspectMode === 'swordSkill' && weaponOpt?.id !== 'katana' && (i === 5 || i === 6)) {
        const wx = i === 5 ? 46 : 53;
        for (let dy = -6; dy <= 6; dy++) {
          const curve = Math.round((1 - (dy * dy) / 36) * 3);
          ctx.fillStyle = '#eef1f6';
          ctx.fillRect(wx + curve, 37 + dy, 1, 1);
          ctx.fillStyle = Math.abs(dy) <= 3 ? '#eef1f6' : '#dce1eb';
          ctx.fillRect(wx + curve - 1, 37 + dy, 1, 1);
        }
      }
    }
    setInspectFrameLabels(labels);

    // Render 5-panel Starbound Layer Split Preview (backArm, body, weapon, frontArm, composite)
    const sampleWid =
      inspectMode === 'katanaCombo' || inspectMode === 'katanaIai'
        ? 'katana'
        : inspectMode === 'greatswordCombo' || inspectMode === 'greatswordCleave'
        ? 'greatsword'
        : inspectMode === 'swordCombo' || inspectMode === 'horizSlash' || inspectMode === 'bladeSwing'
        ? 'blade'
        : inspectWeapon === 'none'
        ? inspectMode === 'pistolReload' || inspectMode === 'pistolShoot' || inspectMode === 'pistolAim'
          ? 'pistol'
          : 'blade'
        : inspectWeapon;
    const isIdle45Sample = inspectMode === 'armedIdle45' || inspectMode === 'idle';
    const samplePo = isIdle45Sample
      ? P.weaponIdle(sampleWid, 0.9, false)
      : inspectMode === 'walkBack'
      ? P.loco('walkBack', 2)
      : inspectMode === 'runBack'
      ? P.loco('runBack', 2)
      : P.idleSide(0.2, false);
    const sampleHy = P.hyGround(samplePo);
    const sampleAct = isIdle45Sample
      ? 'idle'
      : inspectMode === 'walkBack' || inspectMode === 'runBack' || inspectMode === 'pistolAim'
      ? 'aim'
      : inspectMode === 'pistolReload'
      ? 'reload'
      : inspectMode === 'swordSkill' || inspectMode === 'katanaIai'
      ? 'skill'
      : inspectMode === 'bladeSwing'
      ? 'combo3'
      : inspectMode === 'greatswordCleave'
      ? 'combo2'
      : inspectMode === 'katanaCombo' ||
        inspectMode === 'greatswordCombo' ||
        inspectMode === 'swordCombo' ||
        inspectMode === 'horizSlash' ||
        sampleWid === 'blade' ||
        sampleWid === 'katana' ||
        sampleWid === 'greatsword'
      ? 'combo1'
      : 'shoot';
     const sampleP = isIdle45Sample
      ? 0.38
      : sampleAct === 'reload'
      ? 0.36
      : sampleAct === 'skill'
      ? 0.62
      : sampleAct === 'combo3'
      ? 0.56
      : sampleWid === 'greatsword' && (sampleAct === 'combo1' || sampleAct === 'combo2')
      ? 0.42
      : sampleAct === 'combo1'
      ? 0.28
      : 0.16;
    const sampleWep = {
      id: sampleWid,
      aim: 90,
      action: sampleAct,
      p: sampleP,
      v34: isIdle45Sample,
    };
    const layers = Rig.charLayers(spec, samplePo, sampleHy, 0, {
      suit: inspectSuit,
      weapon: sampleWep,
      includeDetachedFX: true,
      hurt: alienScreenMode === 'static',
      screenMode: alienScreenMode === 'auto' ? undefined : alienScreenMode,
    });
    const grids = [
      layers.backArm,
      layers.body,
      layers.weapon,
      layers.frontArm,
      layers.detachedFX || layers.weapon,
      layers.composite,
    ];
    const inspColOff = (Rig.GX || 4) - 16;
    grids.forEach((grid: any, idx: number) => {
      const lcv = layerCanvasRefs.current[idx];
      if (!lcv) return;
      const lctx = lcv.getContext('2d');
      if (!lctx) return;
      lctx.fillStyle = '#8b909c';
      lctx.fillRect(0, 0, 72, 56);
      lctx.fillStyle = '#5c606b';
      lctx.fillRect(0, 51, 72, 5);
      for (let r = 0; r < 56; r++) {
        for (let c = 0; c < 72; c++) {
          const gr = r + 23;
          const gc = c + inspColOff;
          if (gr >= 0 && gr < Rig.GH && gc >= 0 && gc < Rig.GW && grid[gr]?.[gc]) {
            lctx.fillStyle = grid[gr][gc];
            lctx.fillRect(c, r, 1, 1);
          }
        }
      }
    });
  }, [
    inspectCharIdx,
    inspectCustomSpec,
    stageSpecs,
    inspectMode,
    inspectSuit,
    inspectWeapon,
    inspectIdleOverride,
    inspectIdleSideView,
    inspectFrameCount,
    alienScreenMode,
  ]);

  // Main 60Hz world simulation & canvas loop
  useEffect(() => {
    document.body.dataset.state = 'playing';
    const world = AI.createWorld(11);
    // Equip #6 Xing with Sword ('blade') by default so 4-combo & sword wave skill work immediately
    world.setWeapon(world.agents[5], 'blade');
    worldRef.current = world;
    (window as any).__world = world;

    const cv = mainCanvasRef.current;
    const ov = overlayRef.current;
    if (!cv || !ov) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    cv.width = VW;
    cv.height = VH;
    const img = ctx.createImageData(VW, VH);
    const buf = new Uint32Array(img.data.buffer);

    function px(x: number, y: number, c: number) {
      x |= 0;
      y |= 0;
      if (x >= 0 && y >= 0 && x < VW && y < VH) buf[y * VW + x] = c;
    }
    function pxA(x: number, y: number, c: number, a: number) {
      x |= 0;
      y |= 0;
      if (x >= 0 && y >= 0 && x < VW && y < VH) {
        buf[y * VW + x] = a >= 0.99 ? c : mix(buf[y * VW + x], c, a);
      }
    }
    function rect(x: number, y: number, w: number, h: number, c: number) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
    }

    // Create DOM bubble & tag overlays
    ov.innerHTML = '';
    const bubEls: HTMLDivElement[] = world.agents.map(() => {
      const d = document.createElement('div');
      d.className =
        'absolute -translate-x-1/2 -translate-y-full bg-[#f4f5f7] text-[#1c1e22] px-2 py-0.5 rounded text-xs leading-tight whitespace-nowrap pointer-events-none border border-[#2a2d34] shadow-sm font-medium z-10';
      d.style.display = 'none';
      ov.appendChild(d);
      return d;
    });
    const tagEls: HTMLDivElement[] = world.agents.map((a: any) => {
      const d = document.createElement('div');
      d.className =
        'absolute -translate-x-1/2 -translate-y-full text-[#eceff4] text-[11px] pointer-events-none whitespace-nowrap font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]';
      d.textContent = `${a.spec.name} · ${a.spec.tag}`;
      ov.appendChild(d);
      return d;
    });

    const dummyTagEls: HTMLDivElement[] = (world.dummies || []).map((dm: any) => {
      const d = document.createElement('div');
      d.className =
        'absolute -translate-x-1/2 -translate-y-full text-[#d8dce6] text-[10px] pointer-events-none whitespace-nowrap font-mono bg-[#181b20]/80 px-1.5 py-0.5 rounded border border-[#383d48] shadow-sm';
      d.textContent = dm.label || '练功木桩';
      ov.appendChild(d);
      return d;
    });

    const AI_H = world.H;
    const puffs: any[] = [];
    const streaks: any[] = [];
    const rings: any[] = [];
    const sparks: any[] = [];
    const woodChips: any[] = [];
    const dmgPopups: Array<{
      el: HTMLDivElement;
      x: number;
      y: number;
      vy: number;
      age: number;
      maxAge: number;
    }> = [];
    const bghosts: any[] = [];
    const bullets: any[] = [];
    const swordWaves: any[] = [];
    const katanaTears: Array<{ x: number; y: number; face: number; aim: number; age: number; maxAge: number }> = [];
    const casings: any[] = [];
    const alienParticles: Array<{ x: number; y: number; vx: number; vy: number; col: number; age: number; maxAge: number }> = [];
    const trails: Record<string, { t: number; list: any[] }> = {};

    function spawnDmgPopup(x: number, y: number, dmg: number, heavy: boolean, combo: number) {
      const el = document.createElement('div');
      el.className = `absolute -translate-x-1/2 -translate-y-full pointer-events-none whitespace-nowrap font-mono font-bold z-20 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${
        heavy ? 'text-[#f2f4f8] text-xs' : 'text-[#cfd5e2] text-[11px]'
      }`;
      el.textContent = `-${dmg}${heavy ? ' 重劈!' : ''}${combo > 1 ? ` · ${combo}连击` : ''}`;
      ov!.appendChild(el);
      dmgPopups.push({
        el,
        x,
        y,
        vy: heavy ? -24 : -18,
        age: 0,
        maxAge: heavy ? 0.75 : 0.6,
      });
    }

    function drawLayer(
      arr: number[],
      par: number,
      camX: number,
      base: number,
      col: number,
      win: boolean
    ) {
      const L = arr.length;
      for (let sx = 0; sx < VW; sx++) {
        const wx = Math.floor(sx + camX * par) % L;
        const h = arr[(wx + L) % L];
        const top = base - h;
        for (let y = top; y < base + 40 && y < VH; y++) {
          let c = col;
          if (win && wx % 7 === 3 && (y - top) % 9 === 4 && y - top > 5 && y - top < h - 6) {
            c = mix(col, PAL.nearHi, 0.35);
          }
          px(sx, y, c);
        }
      }
    }

    function drawBackground(camX: number, _t: number) {
      const bands = [PAL.sky0, PAL.sky1, PAL.sky2];
      for (let y = 0; y < VH; y++) {
        const k = (y / VH) * 2;
        const i = Math.min(1, Math.floor(k));
        const f = k - i;
        for (let x = 0; x < VW; x++) {
          buf[y * VW + x] = bay(x, y) < f ? bands[i + 1] : bands[i];
        }
      }
      drawLayer(FAR, 0.12, camX, 126, PAL.far, false);
      drawLayer(MID, 0.3, camX, 140, PAL.mid, true);
      const px0 = camX * 0.65;
      for (const p of PIL) {
        const sx = Math.floor(p.x - px0);
        if (sx < -40 || sx > VW + 10) continue;
        for (let i = 0; i < p.w; i++) {
          const top = 150 - p.h + (i < p.cut / 2 ? p.cut - i : 0);
          for (let y = top; y < 152; y++) {
            let c = i < 3 ? PAL.nearHi : PAL.near;
            if ((y + i) % 17 === 0) c = mix(c, PAL.ink, 0.3);
            px(sx + i, y, c);
          }
        }
      }
    }

    function drawGround(camX: number, H: number[]) {
      const cx = Math.floor(camX);
      for (let sx = 0; sx < VW; sx++) {
        const wx = Math.max(0, Math.min(WW - 1, cx + sx));
        const top = H[wx];
        for (let y = top; y < VH; y++) {
          const d = y - top;
          let c = PAL.gBase;
          if (d === 0) c = PAL.gTop;
          else if (d < 3) c = PAL.gHi;
          else if (d % 14 === 0 || (wx + Math.floor(d / 14) * 9) % 26 === 0) c = PAL.gDark;
          else if (bay(wx, y) < 0.12) c = PAL.gDark;
          if (d > 14) c = mix(c, PAL.gDark, Math.min(0.5, (d - 14) / 40));
          px(sx, y, c);
        }
      }
    }

    function drawPOI(p: any, camX: number, t: number) {
      const sx = Math.floor(p.x - camX);
      const y = AI_H[Math.max(0, Math.min(WW - 1, p.x))];
      if (sx < -30 || sx > VW + 30) return;
      if (p.type === 'lamp') {
        rect(sx, y - 40, 2, 40, PAL.ink);
        rect(sx - 3, y - 2, 8, 2, PAL.ink);
        rect(sx - 4, y - 44, 10, 5, PAL.ink);
        rect(sx - 3, y - 43, 8, 3, mix(PAL.glow, C('#ffffff'), 0.4 + 0.1 * Math.sin(t * 3 + p.x)));
        for (let j = -14; j <= 14; j++) {
          for (let i = -16; i <= 16; i++) {
            const d = Math.hypot(i, j * 1.2) / 16;
            if (d < 1 && bay(sx + i, y - 41 + j) < (1 - d) * 0.5) {
              const q = (sx + i) | 0;
              const r = (y - 41 + j) | 0;
              if (q >= 0 && q < VW && r >= 0 && r < VH) {
                buf[r * VW + q] = mix(buf[r * VW + q], PAL.glow, 0.5);
              }
            }
          }
        }
      } else if (p.type === 'crate') {
        rect(sx - 7, y - 13, 14, 13, C('#5e5a55'));
        rect(sx - 7, y - 13, 14, 2, C('#7d7870'));
        rect(sx - 7, y - 1, 14, 1, C('#403d3a'));
        for (let i = 0; i < 12; i++) {
          px(sx - 6 + i, y - 12 + i, C('#403d3a'));
          px(sx + 5 - i, y - 12 + i, C('#403d3a'));
        }
      } else if (p.type === 'bench') {
        rect(sx - 11, y - 8, 22, 2, C('#4b4e57'));
        rect(sx - 11, y - 14, 22, 2, C('#4b4e57'));
        rect(sx - 10, y - 8, 2, 8, C('#33363d'));
        rect(sx + 8, y - 8, 2, 8, C('#33363d'));
        rect(sx - 10, y - 14, 2, 6, C('#33363d'));
        rect(sx + 8, y - 14, 2, 6, C('#33363d'));
      } else if (p.type === 'ruin') {
        for (let i = 0; i < 12; i++) {
          const top = y - 46 + (i > 7 ? (i - 7) * 4 : 0);
          for (let j = top; j < y; j++) {
            px(sx - 6 + i, j, i < 3 ? PAL.nearHi : (j + i) % 13 === 0 ? PAL.gDark : PAL.near);
          }
        }
      }
    }

    function drawDummy(d: any, camX: number) {
      const sx = Math.round(d.x - camX);
      const y = Math.round(d.y);
      if (sx < -24 || sx > VW + 24) return { sx, top: y - 28 };

      const flash = d.flashT > 0;
      const woodDark = flash ? C('#e5eaf2') : C('#2d2926');
      const woodMid = flash ? C('#f2f4f8') : C('#49423c');
      const woodHi = flash ? C('#ffffff') : C('#685e55');
      const strawDark = flash ? C('#dce1eb') : C('#5c5346');
      const strawMid = flash ? C('#eef1f6') : C('#786c5b');
      const strawHi = flash ? C('#ffffff') : C('#968874');
      const ironBand = flash ? C('#ffffff') : C('#3a3e47');

      // Ground shadow
      for (let i = -6; i <= 6; i++) {
        if (bay(sx + i, y) < 0.7 - Math.abs(i) / 12) px(sx + i, y, PAL.gDark);
      }

      // Base pedestal (does not tilt)
      rect(sx - 5, y - 2, 11, 2, woodDark);
      rect(sx - 4, y - 3, 9, 1, ironBand);

      const tiltPx = Math.round(d.tilt || 0);
      // Draw vertical post & target body with recoil tilt
      for (let h = 3; h <= 24; h++) {
        const off = Math.round((tiltPx * (h - 2)) / 20);
        const cx = sx + off;
        const cy = y - h;
        // Central wooden post
        px(cx - 1, cy, woodDark);
        px(cx, cy, woodMid);
        px(cx + 1, cy, woodHi);

        // Straw-bound torso target (h = 8..19)
        if (h >= 8 && h <= 19) {
          const w = h === 8 || h === 19 ? 2 : 3;
          for (let dx = -w; dx <= w; dx++) {
            const col =
              h === 10 || h === 16
                ? ironBand
                : dx < 0
                ? strawDark
                : dx === 0
                ? strawMid
                : strawHi;
            px(cx + dx, cy, col);
          }
        }

        // Cross-bar wooden arms (h = 15..16)
        if (h === 15 || h === 16) {
          for (let dx = -6; dx <= 6; dx++) {
            if (Math.abs(dx) > 3) {
              px(cx + dx, cy, h === 16 ? woodHi : woodDark);
            }
          }
        }

        // Wooden head block (h = 21..24)
        if (h >= 21 && h <= 24) {
          for (let dx = -2; dx <= 2; dx++) {
            const col = dx < 0 ? woodDark : dx === 0 ? woodMid : woodHi;
            px(cx + dx, cy, col);
          }
          if (h === 22) {
            px(cx - 2, cy, ironBand);
            px(cx + 2, cy, ironBand);
          }
        }
      }

      // Pixel HP bar above dummy when recently hit
      if (d.hp < d.maxHp || d.shakeT > 0) {
        const topX = sx + Math.round(tiltPx * 1.1);
        const barY = y - 28;
        rect(topX - 7, barY, 15, 3, C('#1c1e24'));
        const fillW = Math.max(1, Math.round((d.hp / d.maxHp) * 13));
        rect(topX - 6, barY + 1, fillW, 1, flash ? C('#ffffff') : C('#c5ccd9'));
      }

      return { sx: sx + Math.round(tiltPx), top: y - 29 };
    }

    function stepFX(dt: number) {
      while (world.fx.length) {
        const e = world.fx.shift();
        if (e.type === 'puff') {
          puffs.push({ x: e.x, y: e.y, age: 0 });
        } else if (e.type === 'shot') {
          sfx.play('shoot');
          bullets.push({
            x: e.x,
            y: e.y,
            vx: e.ux * 320,
            vy: e.uy * 320,
            age: 0,
          });
          casings.push({
            x: e.x - e.ux * 5,
            y: e.y - e.uy * 5,
            vx: -e.ux * 28 + (Math.random() * 14 - 7),
            vy: -55 - Math.random() * 25,
            age: 0,
          });
          for (let i = 0; i < 5; i++) {
            sparks.push({
              x: e.x + e.ux * 2 + (Math.random() * 3 - 1.5),
              y: e.y + e.uy * 2 + (Math.random() * 3 - 1.5),
              vy: -8 - Math.random() * 14,
              age: 0.12,
              steel: true,
            });
          }
        } else if (e.type === 'reload') {
          sfx.play('reload');
          casings.push({
            x: e.x + (e.face || 1) * 3,
            y: e.y,
            vx: (e.face || 1) * 10,
            vy: 15,
            age: 0,
            isMag: true,
          });
        } else if (e.type === 'swing') {
          sfx.play('swing');
          const count = e.step === 3 ? 10 : 6;
          for (let i = 0; i < count; i++) {
            sparks.push({
              x: e.x + (Math.random() * 12 - 6),
              y: e.y + (Math.random() * 10 - 5),
              vy: -12 - Math.random() * 16,
              age: 0.08,
              steel: true,
            });
          }
          if (e.step === 3) {
            rings.push({ x: e.x - (e.face || 1) * 4, y: e.y + 2, age: 0.05, steel: true });
          }
        } else if (e.type === 'dummyHit') {
          sfx.play('hit');
          spawnDmgPopup(e.x, e.y - 14, e.dmg || 18, !!e.heavy, e.combo || 1);
          const chipCount = e.heavy ? 12 : 7;
          for (let i = 0; i < chipCount; i++) {
            woodChips.push({
              x: e.x + (Math.random() * 6 - 3),
              y: e.y + (Math.random() * 8 - 4),
              vx: (e.dir || 1) * (18 + Math.random() * 36) + (Math.random() * 20 - 10),
              vy: -35 - Math.random() * 45,
              age: 0,
              light: Math.random() < 0.45,
            });
          }
          for (let i = 0; i < (e.heavy ? 10 : 6); i++) {
            sparks.push({
              x: e.x + (Math.random() * 8 - 4),
              y: e.y + (Math.random() * 8 - 4),
              vy: -16 - Math.random() * 22,
              age: 0.04,
              steel: true,
            });
          }
          if (e.heavy) {
            rings.push({ x: e.x, y: e.y, age: 0.02, steel: true });
          }
        } else if (e.type === 'skillCharge') {
          sfx.play('charge');
          for (let i = 0; i < 8; i++) {
            sparks.push({
              x: e.x + (Math.random() * 14 - 7),
              y: e.y + (Math.random() * 10 - 5),
              vy: -16 - Math.random() * 14,
              age: 0.04,
              steel: true,
            });
          }
        } else if (e.type === 'katanaTear') {
          // 长刀右键「爆星+独立图层环绕3连刀光」：在释放瞬间的固定世界坐标生成独立刀光序列帧对象，绝不随人物移动
          sfx.play('wave');
          const f = e.face || 1;
          katanaTears.push({
            x: e.x,
            y: e.y,
            face: f,
            aim: e.aim || 90,
            age: 0,
            maxAge: 0.48,
          });
          rings.push({ x: e.x - f * 2, y: e.y - 15, age: 0.04, steel: true });
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            sparks.push({
              x: e.x - f * 2 + Math.cos(ang) * 4,
              y: e.y - 15 + Math.sin(ang) * 4,
              vy: -14 - Math.random() * 18,
              age: 0.04,
              steel: true,
            });
          }
        } else if (e.type === 'swordWave') {
          sfx.play('wave');
          swordWaves.push({
            x: e.x,
            y: e.y,
            vx: e.ux * 240,
            vy: e.uy * 240,
            face: e.face || 1,
            age: 0,
          });
          rings.push({ x: e.x, y: e.y, age: 0.04, steel: true });
          for (let i = 0; i < 10; i++) {
            sparks.push({
              x: e.x + (Math.random() * 8 - 4),
              y: e.y + (Math.random() * 10 - 5),
              vy: -14 - Math.random() * 18,
              age: 0.05,
              steel: true,
            });
          }
        } else if (e.type === 'blink') {
          sfx.play('blink');
          const ag = world.agents.find((x: any) => x.id === e.id);
          const spec = ag ? ag.spec : Cast.CAST[5];
          const suit = ag ? ag.suit : false;
          const P = Rig.poser(spec);
          const po = P.blinkWind();
          const hy = P.hyGround(po);
          streaks.push({ x0: e.x0, x1: e.x1, y: e.y - 12, age: 0 });
          rings.push({ x: e.x1, y: e.y - 12, age: 0 });
          rings.push({ x: e.x0, y: e.y - 12, age: 0.08 });
          [0, 0.35, 0.7].forEach((f) =>
            bghosts.push({
              x: e.x0 + (e.x1 - e.x0) * f,
              y: e.y,
              spec,
              po,
              hy,
              suit,
              flip: e.face < 0,
              age: 0,
            })
          );
          for (let i = 0; i < 12; i++) {
            sparks.push({
              x: e.x0 + (e.x1 - e.x0) * Math.random(),
              y: e.y - 12 + (Math.random() * 10 - 5),
              vy: -10 - Math.random() * 18,
              age: 0,
            });
          }
        } else if (e.type === 'mycoSpore') {
          alienParticles.push({
            x: e.x,
            y: e.y,
            vx: (Math.random() - 0.5) * 8,
            vy: 6 + Math.random() * 8,
            col: e.green ? C('#6eff82') : C('#b8322a'),
            age: 0,
            maxAge: 0.65,
          });
        } else if (e.type === 'cinderEmber') {
          alienParticles.push({
            x: e.x,
            y: e.y,
            vx: (Math.random() - 0.5) * 10,
            vy: -14 - Math.random() * 14,
            col: Math.random() < 0.6 ? C('#ffd23f') : C('#ff7b29'),
            age: 0,
            maxAge: 0.52,
          });
        }
      }
      const keep = (arr: any[], max: number) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          arr[i].age += dt;
          if (arr[i].age >= max) arr.splice(i, 1);
        }
      };
      keep(puffs, 0.28);
      keep(streaks, 0.26);
      keep(rings, 0.26);
      keep(bghosts, 0.28);
      for (let i = katanaTears.length - 1; i >= 0; i--) {
        katanaTears[i].age += dt;
        if (katanaTears[i].age >= katanaTears[i].maxAge) katanaTears.splice(i, 1);
      }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.age += dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        let hitDummy = false;
        if (world.dummies) {
          for (const d of world.dummies) {
            if (Math.abs(b.x - d.x) <= 6 && b.y >= d.y - 23 && b.y <= d.y - 3) {
              world.hitDummy(d, b.vx >= 0 ? 1 : -1, 14, false, null);
              hitDummy = true;
              break;
            }
          }
        }
        const gy = AI_H[Math.max(0, Math.min(WW - 1, Math.round(b.x)))];
        if (hitDummy || b.age >= 0.55 || b.x < 10 || b.x > WW - 10 || b.y >= gy || b.y < 0) {
          for (let k = 0; k < 4; k++) {
            sparks.push({
              x: b.x + (Math.random() * 4 - 2),
              y: b.y + (Math.random() * 4 - 2),
              vy: -14 - Math.random() * 20,
              age: 0.1,
              steel: true,
            });
          }
          bullets.splice(i, 1);
        }
      }
      for (let i = swordWaves.length - 1; i >= 0; i--) {
        const sw = swordWaves[i];
        sw.age += dt;
        sw.x += sw.vx * dt;
        sw.y += sw.vy * dt;
        if (world.dummies) {
          for (const d of world.dummies) {
            if (sw.lastHitId !== d.id && Math.abs(sw.x - d.x) <= 9 && Math.abs(sw.y - (d.y - 13)) <= 14) {
              sw.lastHitId = d.id;
              world.hitDummy(d, sw.face || 1, 34, true, null);
            }
          }
        }
        if (Math.random() < 0.65) {
          sparks.push({
            x: sw.x - sw.face * 2,
            y: sw.y + (Math.random() * 10 - 5),
            vy: -6 - Math.random() * 10,
            age: 0.16,
            steel: true,
          });
        }
        const gy = AI_H[Math.max(0, Math.min(WW - 1, Math.round(sw.x)))];
        if (sw.age >= 0.72 || sw.x < 10 || sw.x > WW - 10 || sw.y >= gy + 2 || sw.y < 0) {
          for (let k = 0; k < 7; k++) {
            sparks.push({
              x: sw.x + (Math.random() * 6 - 3),
              y: sw.y + (Math.random() * 10 - 5),
              vy: -16 - Math.random() * 20,
              age: 0.08,
              steel: true,
            });
          }
          swordWaves.splice(i, 1);
        }
      }
      for (let i = casings.length - 1; i >= 0; i--) {
        const c = casings[i];
        c.age += dt;
        c.vy += 260 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        const gy = AI_H[Math.max(0, Math.min(WW - 1, Math.round(c.x)))];
        if (c.y >= gy - 1) {
          c.y = gy - 1;
          c.vx *= 0.4;
          c.vy = -Math.abs(c.vy) * 0.3;
        }
        if (c.age >= 0.65) casings.splice(i, 1);
      }
      for (let i = woodChips.length - 1; i >= 0; i--) {
        const wc = woodChips[i];
        wc.age += dt;
        wc.vy += 220 * dt;
        wc.x += wc.vx * dt;
        wc.y += wc.vy * dt;
        const gy = AI_H[Math.max(0, Math.min(WW - 1, Math.round(wc.x)))];
        if (wc.y >= gy - 1) {
          wc.y = gy - 1;
          wc.vx *= 0.45;
          wc.vy = -Math.abs(wc.vy) * 0.25;
        }
        if (wc.age >= 0.55) woodChips.splice(i, 1);
      }
      for (let i = dmgPopups.length - 1; i >= 0; i--) {
        const dp = dmgPopups[i];
        dp.age += dt;
        dp.y += dp.vy * dt;
        dp.vy *= 0.92;
        if (dp.age >= dp.maxAge) {
          dp.el.remove();
          dmgPopups.splice(i, 1);
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].age += dt;
        sparks[i].y += sparks[i].vy * dt;
        if (sparks[i].age >= 0.34) sparks.splice(i, 1);
      }
      for (let i = alienParticles.length - 1; i >= 0; i--) {
        const ap = alienParticles[i];
        ap.age += dt;
        ap.x += ap.vx * dt;
        ap.y += ap.vy * dt;
        if (ap.age >= ap.maxAge) alienParticles.splice(i, 1);
      }
      world.agents.forEach((a: any) => {
        // 长刀右键蓄力期间（p < 0.40）：刀鞘口持续向内吸引寒芒粒子
        if (a.weapon === 'katana' && a.wAction === 'skill' && a.wDur > 0 && a.wT < a.wDur * 0.40) {
          if (Math.random() < 0.75) {
            const f = a.face || 1;
            const targetX = a.x - f * 2;
            const targetY = a.y - 15;
            const ang = Math.random() * Math.PI * 2;
            const rad = 7 + Math.random() * 6;
            const sx = targetX + Math.cos(ang) * rad;
            const sy = targetY + Math.sin(ang) * rad;
            alienParticles.push({
              x: sx,
              y: sy,
              vx: (targetX - sx) * 6.5,
              vy: (targetY - sy) * 6.5,
              col: Math.random() < 0.55 ? C('#ffffff') : C('#dce1eb'),
              age: 0,
              maxAge: 0.14,
            });
          }
        }
        const tr = trails[a.id] || (trails[a.id] = { t: 0, list: [] });
        tr.t += dt;
        if (a.loc === 'sprint' && tr.t >= 0.035) {
          tr.t = 0;
          const fp = AI.framePose(a);
          tr.list.unshift({
            x: a.x,
            y: a.y,
            up: fp.up,
            spec: a.spec,
            po: fp.po,
            hy: fp.hy,
            phi: fp.phi,
            suit: fp.suit,
            weapon: fp.weapon,
            flip: a.face < 0,
            age: 0,
          });
          if (tr.list.length > 3) tr.list.pop();
        }
        for (let i = tr.list.length - 1; i >= 0; i--) {
          tr.list[i].age += dt;
          if (tr.list[i].age > 0.16 || a.loc !== 'sprint') tr.list.splice(i, 1);
        }
      });
    }

    function drawGrid(
      g: any,
      xHip: number,
      y0: number,
      flip: boolean,
      alpha: number,
      tint: number,
      smearDir: number,
      smearLen: number
    ) {
      const cyan = C('#96ebff');
      const hipCol = 16 + (Rig.GX || 4);
      for (let r = 0; r < Rig.GH; r++) {
        for (let c = 0; c < Rig.GW; c++) {
          const col = g[r][c];
          if (!col) continue;
          const sx = xHip + (flip ? hipCol - c : c - hipCol);
          const sy = y0 + r;
          if (smearLen) {
            for (let k = 1; k <= smearLen; k++) {
              pxA(sx - smearDir * k, sy, cyan, 0.45 * (1 - k / (smearLen + 1)));
            }
          }
          pxA(sx, sy, tint || C(col), alpha);
        }
      }
    }

    function drawFXBack(camX: number) {
      const cx = Math.floor(camX);
      const cyan = C('#96ebff');
      const white = C('#ebfcff');
      bghosts.forEach((b) => {
        const g = Rig.charGrid(b.spec, b.po, b.hy, 0, { suit: b.suit });
        drawGrid(g, Math.round(b.x) - cx, Math.round(b.y) - 76, b.flip, 0.55 * (1 - b.age / 0.28), cyan, 0, 0);
      });
      streaks.forEach((s) => {
        const ht = s.age < 0.06 ? 2 : s.age < 0.14 ? 1 : 0;
        const a = 1 - s.age / 0.26;
        const xa = Math.round(Math.min(s.x0, s.x1)) - cx;
        const xb = Math.round(Math.max(s.x0, s.x1)) - cx;
        const sy = Math.round(s.y);
        for (let x = xa; x <= xb; x++) {
          for (let r = -ht; r <= ht; r++) {
            if (s.age > 0.1 && (x + r) & 1) continue;
            pxA(x, sy + r, r === 0 ? white : cyan, a);
          }
        }
      });
    }

    function drawFXFront(camX: number) {
      const cx = Math.floor(camX);
      const dust = C('#cfd3dc');
      const cyan = C('#bef5ff');
      const white = C('#eef1f6');
      const steelLight = C('#9aa1b0');
      const steelMid = C('#646a78');
      const steelDark = C('#3d414b');
      const woodLightCol = C('#968874');
      const woodDarkCol = C('#5c5346');
      puffs.forEach((p) => {
        const fr = PF[Math.min(3, Math.floor(p.age / 0.07))];
        const sx = Math.round(p.x) - cx;
        const sy = Math.round(p.y);
        fr.forEach((d) => pxA(sx + d[0], sy + d[1], dust, 0.85));
      });
      rings.forEach((r) => {
        const rr = 2 + r.age * 30;
        const a = 1 - r.age / 0.26;
        const sx = Math.round(r.x) - cx;
        const sy = Math.round(r.y);
        const col = r.steel ? steelLight : cyan;
        for (let k = 0; k < 20; k++) {
          const an = (k / 20) * Math.PI * 2;
          pxA(Math.round(sx + rr * Math.cos(an)), Math.round(sy + rr * Math.sin(an) * 0.85), col, a);
        }
      });
      sparks.forEach((s) => {
        const col = s.steel
          ? Math.random() < 0.55
            ? white
            : steelLight
          : Math.random() < 0.5
          ? white
          : cyan;
        pxA(Math.round(s.x) - cx, Math.round(s.y), col, 1 - s.age / 0.34);
      });
      woodChips.forEach((wc) => {
        pxA(
          Math.round(wc.x) - cx,
          Math.round(wc.y),
          wc.light ? woodLightCol : woodDarkCol,
          Math.max(0.2, 1 - wc.age / 0.55)
        );
      });
      alienParticles.forEach((ap) => {
        pxA(
          Math.round(ap.x) - cx,
          Math.round(ap.y),
          ap.col,
          Math.max(0.15, 1 - ap.age / ap.maxAge)
        );
      });
      const gold = C('#ffd257');
      const orange = C('#ef7b3a');
      const magCol = C('#3a4150');
      bullets.forEach((b) => {
        const sx = Math.round(b.x) - cx;
        const sy = Math.round(b.y);
        const dx = b.vx / 320;
        const dy = b.vy / 320;
        pxA(sx, sy, white, 1);
        pxA(Math.round(sx - dx * 1.5), Math.round(sy - dy * 1.5), steelLight, 0.9);
        pxA(Math.round(sx - dx * 3), Math.round(sy - dy * 3), gold, 0.65);
      });
      swordWaves.forEach((sw) => {
        const sx = Math.round(sw.x) - cx;
        const sy = Math.round(sw.y);
        const f = sw.face || 1;
        const al = Math.max(0.25, 1 - sw.age / 0.72);
        const pureSilver = C('#dce1eb');
        // 绘制纯白高对比半月剑气波 (13px 高)
        for (let dy = -6; dy <= 6; dy++) {
          const curve = Math.round((1 - (dy * dy) / 38) * 4) * f;
          pxA(sx + curve, sy + dy, white, al);
          pxA(sx + curve - f, sy + dy, white, al * 0.96);
          if (Math.abs(dy) <= 4) {
            pxA(sx + curve - 2 * f, sy + dy, pureSilver, al * 0.85);
          }
          if (Math.abs(dy) <= 2) {
            pxA(sx + curve - 3 * f, sy + dy, steelLight, al * 0.65);
          }
        }
      });
      // 绘制长刀右键独立特效图层（世界坐标固定在人物正前方胸腰高度 cy=64，不随人物位置移动的半周身环绕 3 道序列帧刀光）
      if (katanaTears.length && Rig.drawKatanaOrbitFX) {
        katanaTears.forEach((kt) => {
          const phase = Math.max(0, Math.min(1, kt.age / kt.maxAge));
          const gFx = Array.from({ length: Rig.GH }, () => new Array(Rig.GW).fill(null));
          Rig.drawKatanaOrbitFX(gFx, 16, 64, phase, kt.aim || 90);
          drawGrid(gFx, Math.round(kt.x) - cx, Math.round(kt.y) - 76, kt.face < 0, 1, 0, 0, 0);
        });
      }
      casings.forEach((c) => {
        const sx = Math.round(c.x) - cx;
        const sy = Math.round(c.y);
        if (c.isMag) {
          pxA(sx, sy, magCol, 0.95);
          pxA(sx, sy - 1, orange, 0.95);
        } else {
          pxA(sx, sy, gold, 1 - c.age / 0.65);
        }
      });
      // Draw mouse aim reticle when selected character has a weapon
      const selAg = world.agents[stateRef.current.selectedIdx];
      if (selAg && selAg.weapon && pointerWorldRef.current.active) {
        const rx = Math.round(pointerWorldRef.current.x) - cx;
        const ry = Math.round(pointerWorldRef.current.y);
        const retCol = selAg.wAction === 'reload' ? orange : steelLight;
        pxA(rx - 2, ry, retCol, 0.85);
        pxA(rx + 2, ry, retCol, 0.85);
        pxA(rx, ry - 2, retCol, 0.85);
        pxA(rx, ry + 2, retCol, 0.85);
        pxA(rx, ry, white, 0.95);
      }
    }

    function drawChar(a: any, camX: number) {
      const fp = AI.framePose(a);
      const g = Rig.charGrid(a.spec, fp.po, fp.hy, fp.phi, {
        suit: fp.suit,
        flame: fp.flame,
        weapon: fp.weapon,
        hurt: fp.hurt,
      });
      const cx = Math.floor(camX);
      const xHip = Math.round(a.x) - cx;
      const y0 = Math.round(a.y) - 76 - fp.up;

      const tr = trails[a.id];
      if (tr && tr.list.length) {
        const al = [0.38, 0.22, 0.11];
        for (let k = tr.list.length - 1; k >= 0; k--) {
          const s = tr.list[k];
          const sg = Rig.charGrid(s.spec, s.po, s.hy, s.phi, { suit: s.suit, weapon: s.weapon });
          drawGrid(sg, Math.round(s.x) - cx, Math.round(s.y) - 76 - s.up, s.flip, al[k] || 0.1, 0, 0, 0);
        }
      }

      const sy = Math.round(a.y);
      for (let i = -6; i <= 6; i++) {
        const q = Math.round(a.x) + i - cx;
        if (q >= 0 && q < VW && sy < VH) {
          const gy = AI_H[Math.max(0, Math.min(WW - 1, Math.round(a.x) + i))];
          if (Math.abs(gy - sy) < 6 && bay(q, gy) < 0.65 - Math.abs(i) / 14) {
            px(q, gy, PAL.gDark);
          }
        }
      }
      const flip = a.face < 0;
      const smear = a.loc === 'blinkPost' && a.blT < 0.14 ? Math.round(8 * (1 - a.blT / 0.14)) : 0;
      drawGrid(g, xHip, y0, flip, 1, fp.flash ? C('#e8fbff') : 0, a.blDir || a.face, smear);
      return { sx: xHip, top: y0 + 52 };
    }

    function drawFog(_camX: number, _t: number) {
      // 已按用户要求彻底移除白色雾气遮罩层，保持画面与角色像素清晰锐利
    }

    function drawMarker(sx: number, top: number, t: number) {
      const y = top - 8 + Math.round(Math.sin(t * 5));
      for (let i = 0; i < 4; i++) rect(sx - 3 + i, y + i, 7 - i * 2, 1, C('#f4f5f7'));
    }

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      const k = e.key.toLowerCase();
      if (e.repeat && (k === ' ' || k === 'w' || k === 'arrowup' || k === 'j' || k === 'k')) {
        e.preventDefault();
        return;
      }
      if (k >= '1' && k <= '6') {
        const idx = +k - 1;
        sfx.play('select');
        setSelectedIdx(idx);
        return;
      }
      if (k === 't') {
        setTakeOn((prev) => {
          const next = !prev;
          applyTakeover(next, stateRef.current.selectedIdx);
          return next;
        });
        return;
      }
      if (k === 'u') {
        const idx = stateRef.current.selectedIdx;
        const a = world.agents[idx];
        world.toggleSuit(a);
        sfx.play('suit');
        setSuitStates(world.agents.map((ag: any) => !!ag.suit));
        return;
      }
      if (k === 'm') {
        e.preventDefault();
        const idx = stateRef.current.selectedIdx;
        const a = world.agents[idx];
        world.summonDummyNear(a);
        sfx.play('select');
        return;
      }
      if (k === 'h') {
        e.preventDefault();
        const idx = stateRef.current.selectedIdx;
        const a = world.agents[idx];
        world.hurtAgent?.(a, 0.65);
        sfx.play('hit');
        return;
      }
      if (k === 'q') {
        e.preventDefault();
        const idx = stateRef.current.selectedIdx;
        const a = world.agents[idx];
        world.cycleWeapon(a);
        sfx.play('select');
        setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
        setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
        return;
      }
      if (k === 'f') {
        e.preventDefault();
        if (!stateRef.current.takeOn && !stateRef.current.lineup) {
          setTakeOn(true);
          applyTakeover(true, stateRef.current.selectedIdx);
        }
        keys['f'] = true;
        if (!e.repeat) {
          const idx = stateRef.current.selectedIdx;
          const a = world.agents[idx];
          world.shoot(a);
          setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
          setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
        }
        return;
      }
      if (k === 'g') {
        e.preventDefault();
        const idx = stateRef.current.selectedIdx;
        const a = world.agents[idx];
        world.skill(a);
        setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
        setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
        return;
      }
      if (k === 'r') {
        e.preventDefault();
        const idx = stateRef.current.selectedIdx;
        const a = world.agents[idx];
        world.reload(a);
        setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
        return;
      }
      const move = ['a', 'd', 'arrowleft', 'arrowright', ' ', 'w', 'arrowup', 's', 'arrowdown', 'shift', 'y', 'j', 'k'].includes(k);
      if (!move) return;
      e.preventDefault();
      if (!stateRef.current.takeOn && !stateRef.current.lineup) {
        setTakeOn(true);
        applyTakeover(true, stateRef.current.selectedIdx);
      }
      keys[k] = true;
      if (k === ' ' || k === 'w' || k === 'arrowup') {
        const a = world.agents[stateRef.current.selectedIdx];
        if (a.grounded) sfx.play('jump');
        else sfx.play(a.suit ? 'jet' : 'double');
        world.input.jumpEdge = true;
      }
      if (k === 'y') world.input.interactEdge = true;
      if (k === 'j' || k === 'k') world.input.blinkEdge = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    const onPointerUpGlobal = () => {
      attackHoldRef.current = false;
    };
    const onBlur = () => {
      for (const k in keys) keys[k] = false;
      attackHoldRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerup', onPointerUpGlobal);
    window.addEventListener('blur', onBlur);

    let camX = 0;
    let last = performance.now();
    let acc = 0;
    let T = 0;
    let rafId = 0;

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;

      const sel = world.agents[st.selectedIdx] || world.agents[0];
      const target = st.lineup ? 255 : sel.x;
      camX += (Math.max(0, Math.min(WW - VW, target - VW / 2)) - camX) * Math.min(1, dt * 5);
      camXRef.current = camX;

      if (pointerWorldRef.current.active && sel.weapon) {
        const wx = pointerWorldRef.current.rx * VW + camX;
        const wy = pointerWorldRef.current.ry * VH;
        pointerWorldRef.current.x = wx;
        pointerWorldRef.current.y = wy;
        world.aimAt(sel, wx, wy);
      }

      if (!st.paused) {
        acc += dt * st.speed;
        const h = 1 / 60;
        while (acc >= h) {
          const inp = world.input;
          inp.dir = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
          inp.run = !!keys['shift'];
          inp.crouch = !!(keys['s'] || keys['arrowdown']);
          inp.attackHold = attackHoldRef.current || !!keys['f'];
          world.step(h);
          stepFX(h);
          acc -= h;
          T += h;
        }
      }

      if (sel) {
        const hudKey = `${sel.ammo}|${sel.maxAmmo}|${sel.wAction || 'aim'}|${sel.comboStep || 0}`;
        if (hudKey !== lastHudSyncRef.current) {
          lastHudSyncRef.current = hudKey;
          setAmmoDisplay({
            ammo: sel.ammo,
            max: sel.maxAmmo,
            action: sel.wAction || 'aim',
            comboStep: sel.comboStep || 0,
          });
        }
      }

      drawBackground(camX, T);
      drawGround(camX, AI_H);
      world.pois.forEach((p: any) => drawPOI(p, camX, T));
      const dummyTops: Array<{ sx: number; top: number }> = (world.dummies || []).map((d: any) =>
        drawDummy(d, camX)
      );
      drawFXBack(camX);

      const order = world.agents
        .map((_: any, i: number) => i)
        .sort((p: number, q: number) => (p === st.selectedIdx ? 1 : 0) - (q === st.selectedIdx ? 1 : 0));
      const tops: Array<{ sx: number; top: number }> = [];
      order.forEach((i: number) => {
        tops[i] = drawChar(world.agents[i], camX);
      });

      drawFXFront(camX);
      drawFog(camX, T);
      if (tops[st.selectedIdx]) {
        drawMarker(tops[st.selectedIdx].sx, tops[st.selectedIdx].top - 8, T);
      }
      ctx!.putImageData(img, 0, 0);

      // Update overlay positions using live bounding rect
      const rectBounds = cv!.getBoundingClientRect();
      const scX = rectBounds.width / VW;
      const scY = rectBounds.height / VH;
      world.agents.forEach((a: any, i: number) => {
        const t = tops[i];
        if (!t) return;
        const b = bubEls[i];
        const tg = tagEls[i];
        const X = t.sx * scX;
        const Y = t.top * scY;
        const wantTag =
          !st.lineup && a.spec.tag && a.spec.tag.length <= 4
            ? `${a.spec.name} · ${a.spec.tag}`
            : `${a.spec.name}`;
        if (tg.textContent !== wantTag) tg.textContent = wantTag;
        tg.style.left = `${X}px`;
        tg.style.top = `${Y - 9}px`;
        tg.style.display = a.say || t.sx < -20 || t.sx > VW + 20 ? 'none' : '';
        if (a.say && t.sx > -20 && t.sx < VW + 20) {
          if (b.textContent !== a.say.text) b.textContent = a.say.text;
          b.style.display = '';
          b.style.left = `${Math.max(44, Math.min(rectBounds.width - 44, X))}px`;
          b.style.top = `${Y - 4}px`;
        } else {
          b.style.display = 'none';
        }
      });

      // Update dummy label & floating damage positions
      (world.dummies || []).forEach((d: any, i: number) => {
        const dt = dummyTops[i];
        const el = dummyTagEls[i];
        if (!dt || !el) return;
        if (dt.sx < -16 || dt.sx > VW + 16) {
          el.style.display = 'none';
        } else {
          el.style.display = '';
          el.style.left = `${dt.sx * scX}px`;
          el.style.top = `${(dt.top - 2) * scY}px`;
          el.textContent =
            d.comboHits > 0 ? `木桩 · ${d.comboHits}连击 (${d.lastDmg})` : `${d.label || '练功木桩'}`;
        }
      });

      dmgPopups.forEach((dp) => {
        const sx = dp.x - camX;
        dp.el.style.left = `${sx * scX}px`;
        dp.el.style.top = `${dp.y * scY}px`;
        dp.el.style.opacity = `${Math.max(0, 1 - dp.age / dp.maxAge)}`;
      });

      // Update 6 character card idle previews (45-degree unarmed or 45-degree weapon idle if holding a weapon)
      world.agents.forEach((a: any, i: number) => {
        const ccv = cardCanvasRefs.current[i];
        if (!ccv) return;
        const cctx = ccv.getContext('2d');
        if (!cctx) return;
        const P = a.poser;
        const hasW = !!a.weapon;
        const cyc = a.weapon === 'pistol' ? 2.2 : 2.4;
        const po = hasW ? P.weaponIdle(a.weapon, T, false) : P.idle(T, false);
        const cardWep = hasW
          ? { id: a.weapon, aim: 90, action: 'idle', p: ((T % cyc) + cyc) % cyc / cyc, v34: true }
          : null;
        const g = Rig.charGrid(a.spec, po, P.hyGround(po), 0, { suit: a.suit, weapon: cardWep });
        cctx.fillStyle = '#9a9ea9';
        cctx.fillRect(0, 0, 32, 30);
        cctx.fillStyle = '#6a6e7a';
        cctx.fillRect(0, 28, 32, 2);
        const gxOff = Rig.GX || 4;
        for (let r = 0; r < 30; r++) {
          for (let c = 0; c < 32; c++) {
            const col = g[r + 48]?.[c + gxOff];
            if (col) {
              cctx.fillStyle = col;
              cctx.fillRect(c, r, 1, 1);
            }
          }
        }
      });

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerup', onPointerUpGlobal);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  function applyTakeover(on: boolean, idx: number) {
    const world = worldRef.current;
    if (!world) return;
    world.agents.forEach((o: any) => {
      if (o.manual) {
        o.manual = false;
        if (o.goal.type !== 'chat') o.goal = { type: 'idle', t: 0.5 };
      }
    });
    if (on && !stateRef.current.lineup) {
      const a = world.agents[idx];
      if (a) {
        a.manual = true;
        if (a.goal.type !== 'chat') a.goal = { type: 'manual' };
      }
    }
  }

  function handleSelectChar(idx: number) {
    sfx.play('select');
    setSelectedIdx(idx);
    const world = worldRef.current;
    if (world && !world.agents[idx].manual && takeOn) {
      setTakeOn(false);
      applyTakeover(false, idx);
    }
  }

  function handleToggleSuit(idx: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const world = worldRef.current;
    if (!world) return;
    const a = world.agents[idx];
    world.toggleSuit(a);
    sfx.play('suit');
    setSuitStates(world.agents.map((ag: any) => !!ag.suit));
  }

  function handleToggleAllSuits() {
    const world = worldRef.current;
    if (!world) return;
    const next = !allSuitsOn;
    setAllSuitsOn(next);
    world.agents.forEach((a: any) => world.toggleSuit(a, next));
    sfx.play('suit');
    setSuitStates(world.agents.map((ag: any) => !!ag.suit));
  }

  function handleTriggerBlink() {
    const world = worldRef.current;
    if (!world) return;
    // Select Xing (index 5) if current agent cannot blink
    let targetIdx = selectedIdx;
    if (!world.agents[targetIdx]?.ab?.blink) {
      targetIdx = 5;
      setSelectedIdx(5);
    }
    if (!takeOn && !lineup) {
      setTakeOn(true);
      applyTakeover(true, targetIdx);
    } else if (takeOn) {
      applyTakeover(true, targetIdx);
    }
    world.input.blinkEdge = true;
  }

  function handleTriggerJump() {
    const world = worldRef.current;
    if (!world) return;
    if (!takeOn && !lineup) {
      setTakeOn(true);
      applyTakeover(true, selectedIdx);
    }
    const a = world.agents[selectedIdx];
    if (a?.grounded) sfx.play('jump');
    else sfx.play(a?.suit ? 'jet' : 'double');
    world.input.jumpEdge = true;
  }

  function handleCycleWeapon(idx: number = selectedIdx) {
    const world = worldRef.current;
    if (!world) return;
    const a = world.agents[idx];
    world.cycleWeapon(a);
    sfx.play('select');
    setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
    setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
  }

  function handleSetWeapon(wId: string | null, idx: number = selectedIdx) {
    const world = worldRef.current;
    if (!world) return;
    const a = world.agents[idx];
    if (!a) return;
    world.setWeapon(a, wId);
    sfx.play('select');
    setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
    setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
  }

  function handleTriggerShoot() {
    const world = worldRef.current;
    if (!world) return;
    const a = world.agents[selectedIdx];
    if (!a) return;
    if (!takeOn && !lineup) {
      setTakeOn(true);
      applyTakeover(true, selectedIdx);
    }
    world.shoot(a);
    setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
    setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
  }

  function handleTriggerSkill() {
    const world = worldRef.current;
    if (!world) return;
    const a = world.agents[selectedIdx];
    if (!a) return;
    if (!takeOn && !lineup) {
      setTakeOn(true);
      applyTakeover(true, selectedIdx);
    }
    if (!a.weapon || a.weapon === 'pistol') world.setWeapon(a, 'blade');
    world.skill(a);
    setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
    setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
  }

  function handleTriggerReload() {
    const world = worldRef.current;
    if (!world) return;
    const a = world.agents[selectedIdx];
    if (!a) return;
    if (!a.weapon || a.weapon !== 'pistol') world.setWeapon(a, 'pistol');
    world.reload(a);
    setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
    setAmmoDisplay({ ammo: a.ammo, max: a.maxAmmo, action: a.wAction || 'aim', comboStep: a.comboStep || 0 });
  }

  function handleSummonDummy() {
    const world = worldRef.current;
    if (!world) return;
    const a = world.agents[selectedIdx];
    if (!a) return;
    world.summonDummyNear(a);
    sfx.play('select');
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const world = worldRef.current;
    const cv = mainCanvasRef.current;
    if (!world || !cv) return;
    const r = cv.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    const ry = (e.clientY - r.top) / r.height;
    const wx = rx * VW + camXRef.current;
    const wy = ry * VH;
    pointerWorldRef.current = { x: wx, y: wy, rx, ry, active: true };
    const sel = world.agents[selectedIdx];
    if (sel && sel.weapon) {
      world.aimAt(sel, wx, wy);
    }
  }

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const world = worldRef.current;
    const cv = mainCanvasRef.current;
    if (!world || !cv) return;
    const r = cv.getBoundingClientRect();
    const sel = world.agents[selectedIdx] || world.agents[0];
    const rx = (e.clientX - r.left) / r.width;
    const ry = (e.clientY - r.top) / r.height;
    const wx = rx * VW + camXRef.current;
    const wy = ry * VH;
    pointerWorldRef.current = { x: wx, y: wy, rx, ry, active: true };

    if (e.button === 2) {
      e.preventDefault();
      if (sel) {
        if (!takeOn && !lineup) {
          setTakeOn(true);
          applyTakeover(true, selectedIdx);
        }
        world.aimAt(sel, wx, wy);
        world.skill(sel);
        setWeaponStates(world.agents.map((ag: any) => ag.weapon || null));
        setAmmoDisplay({ ammo: sel.ammo, max: sel.maxAmmo, action: sel.wAction || 'aim', comboStep: sel.comboStep || 0 });
      }
      return;
    }

    let bi = -1;
    let bd = 18;
    world.agents.forEach((a: any, i: number) => {
      const d = Math.hypot(a.x - wx, a.y - 16 - wy);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    if (bi >= 0 && bi !== selectedIdx) {
      if (takeOn) {
        setTakeOn(false);
        applyTakeover(false, bi);
      }
      handleSelectChar(bi);
      return;
    }
    if (sel && sel.weapon) {
      if (!takeOn && !lineup) {
        setTakeOn(true);
        applyTakeover(true, selectedIdx);
      }
      attackHoldRef.current = true;
      world.aimAt(sel, wx, wy);
      world.shoot(sel);
      setAmmoDisplay({ ammo: sel.ammo, max: sel.maxAmmo, action: sel.wAction || 'aim', comboStep: sel.comboStep || 0 });
    } else if (bi >= 0) {
      handleSelectChar(bi);
    }
  }

  function handleDeploySingleNpcToStage(npc: any) {
    const world = worldRef.current;
    if (!world || !npc) return;
    world.applyAgentSpec(selectedIdx, npc);
    world.setWeapon(world.agents[selectedIdx], 'blade');
    setStageSpecs(world.agents.map((a: any) => a.spec));
    setWeaponStates(world.agents.map((a: any) => a.weapon || null));
    setInspectCustomSpec(npc);
    sfx.play('suit');
  }

  function handleDeployNpcBatchToStage() {
    const world = worldRef.current;
    if (!world || !npcBatch.length) return;
    world.applyBatchSpecs(npcBatch.slice(0, 6));
    world.setWeapon(world.agents[selectedIdx], 'blade');
    setStageSpecs(world.agents.map((a: any) => a.spec));
    setWeaponStates(world.agents.map((a: any) => a.weapon || null));
    sfx.play('suit');
  }

  function handleRestoreOriginalCast() {
    const world = worldRef.current;
    if (!world) return;
    world.applyBatchSpecs(Cast.CAST);
    world.setWeapon(world.agents[5], 'blade');
    setStageSpecs(world.agents.map((a: any) => a.spec));
    setWeaponStates(world.agents.map((a: any) => a.weapon || null));
    setInspectCustomSpec(null);
    sfx.play('select');
  }

  function handleDeployAlienTrioToStage() {
    const world = worldRef.current;
    if (!world || !Cast.generateAlienNPC) return;
    const trio = [
      Cast.generateAlienNPC('cathode', 2026),
      Cast.generateAlienNPC('myco', 2027, { mycoVariant: 'crimsonUmbrella', idle: 'lookout' }),
      Cast.generateAlienNPC('cinder', 2028),
      Cast.generateAlienNPC('myco', 2029, { mycoVariant: 'ivoryGhost', idle: 'cross' }),
      Cast.generateAlienNPC('myco', 2030, { mycoVariant: 'luminaBell', idle: 'think' }),
      Cast.generateAlienNPC('myco', 2031, { mycoVariant: 'amberChanterelle', idle: 'backhands' }),
    ];
    world.applyBatchSpecs(trio);
    world.setWeapon(world.agents[0], 'pistol');
    world.setWeapon(world.agents[1], 'blade');
    world.setWeapon(world.agents[2], 'blade');
    world.setWeapon(world.agents[5], 'blade');
    setStageSpecs(world.agents.map((a: any) => a.spec));
    setWeaponStates(world.agents.map((a: any) => a.weapon || null));
    setInspectCustomSpec(trio[1]);
    sfx.play('suit');
  }

  function handleDeployCathodeVariantsToStage() {
    const world = worldRef.current;
    if (!world || !Cast.generateAlienNPC) return;
    const cathodeSquad = [
      Cast.generateAlienNPC('cathode', npcSeed + 10, {
        index: 0,
        name: '极地·显像',
        cathodeVariant: 'retroCrt',
        idle: 'lookout',
      }),
      Cast.generateAlienNPC('cathode', npcSeed + 20, {
        index: 1,
        name: '拉丝·棱晶',
        cathodeVariant: 'diamondPrism',
        idle: 'collarFix',
      }),
      Cast.generateAlienNPC('cathode', npcSeed + 30, {
        index: 2,
        name: '枪铁·正角',
        cathodeVariant: 'triangleSentinel',
        idle: 'beltHook',
      }),
      Cast.generateAlienNPC('cathode', npcSeed + 40, {
        index: 3,
        name: '军工·倒楔',
        cathodeVariant: 'wedgeRadar',
        idle: 'rubHands',
      }),
      Cast.generateAlienNPC('cathode', npcSeed + 50, {
        index: 4,
        name: '锈铁·八角',
        cathodeVariant: 'hexDomeHeavy',
        idle: 'crossLeg',
      }),
      Cast.generateAlienNPC('cathode', npcSeed + 60, {
        index: 5,
        name: '电木·宽频',
        cathodeVariant: 'wideScopeUnit',
        idle: 'toeTap',
      }),
    ];
    world.applyBatchSpecs(cathodeSquad);
    world.setWeapon(world.agents[0], 'pistol');
    world.setWeapon(world.agents[2], 'blade');
    world.setWeapon(world.agents[5], 'blade');
    setStageSpecs(world.agents.map((a: any) => a.spec));
    setWeaponStates(world.agents.map((a: any) => a.weapon || null));
    setNpcSpeciesFilter('cathode');
    setInspectCustomSpec(cathodeSquad[1]);
    sfx.play('suit');
  }

  function handleDeployMycoVariantsToStage() {
    const world = worldRef.current;
    if (!world || !Cast.generateAlienNPC) return;
    const mycoSquad = [
      Cast.generateAlienNPC('myco', npcSeed + 11, {
        index: 0,
        name: '赤伞·行者',
        mycoCapShape: 'flatUmbrella',
        mycoColorTheme: 'crimson',
        mycoCapColor: 'crimson',
        mycoBodyBuild: 'standard',
        mycoSuitColor: 'rustBark',
        idle: 'lookout',
      }),
      Cast.generateAlienNPC('myco', npcSeed + 22, {
        index: 1,
        name: '霜褶·孤旅',
        mycoCapShape: 'archedGill',
        mycoColorTheme: 'ivory',
        mycoCapColor: 'ivory',
        mycoBodyBuild: 'slender',
        mycoSuitColor: 'frostSlate',
        idle: 'collarFix',
      }),
      Cast.generateAlienNPC('myco', npcSeed + 33, {
        index: 2,
        name: '幽钟·柒号',
        mycoCapShape: 'domedBell',
        mycoColorTheme: 'lumina',
        mycoCapColor: 'lumina',
        mycoBodyBuild: 'tall',
        mycoSuitColor: 'abyssTeal',
        idle: 'crossLeg',
      }),
      Cast.generateAlienNPC('myco', npcSeed + 44, {
        index: 3,
        name: '琥珀·圆肚',
        mycoCapShape: 'wavyFunnel',
        mycoColorTheme: 'amber',
        mycoCapColor: 'amber',
        mycoBodyBuild: 'chubby',
        mycoSuitColor: 'ochreGold',
        idle: 'beltHook',
      }),
      Cast.generateAlienNPC('myco', npcSeed + 55, {
        index: 4,
        name: '紫渊·重装',
        mycoCapShape: 'conicalMorel',
        mycoColorTheme: 'violet',
        mycoCapColor: 'violet',
        mycoBodyBuild: 'broad',
        mycoSuitColor: 'duskViolet',
        idle: 'hug',
      }),
      Cast.generateAlienNPC('myco', npcSeed + 66, {
        index: 5,
        name: '翡翠·幼菇',
        mycoCapShape: 'doubleTier',
        mycoColorTheme: 'emerald',
        mycoCapColor: 'emerald',
        mycoBodyBuild: 'shortChubby',
        mycoSuitColor: 'crimsonSpore',
        idle: 'headScratch',
      }),
    ];
    world.applyBatchSpecs(mycoSquad);
    world.setWeapon(world.agents[1], 'blade');
    world.setWeapon(world.agents[5], 'blade');
    setStageSpecs(world.agents.map((a: any) => a.spec));
    setWeaponStates(world.agents.map((a: any) => a.weapon || null));
    setNpcSpeciesFilter('myco');
    setInspectCustomSpec(mycoSquad[3]);
    sfx.play('suit');
  }

  function handleDeployCinderVariantsToStage() {
    const world = worldRef.current;
    if (!world || !Cast.generateAlienNPC) return;
    const cinderSquad = [
      Cast.generateAlienNPC('cinder', npcSeed + 15, {
        index: 0,
        name: '黑曜·铸者',
        cinderVariant: 'obsidianForge',
        idle: 'lookout',
      }),
      Cast.generateAlienNPC('cinder', npcSeed + 25, {
        index: 1,
        name: '赤曜·督军',
        cinderVariant: 'basaltHornLord',
        idle: 'beltHook',
      }),
      Cast.generateAlienNPC('cinder', npcSeed + 35, {
        index: 2,
        name: '硫蓝·祭司',
        cinderVariant: 'sulfurCrownPriest',
        idle: 'collarFix',
      }),
      Cast.generateAlienNPC('cinder', npcSeed + 45, {
        index: 3,
        name: '翠焰·巡林',
        cinderVariant: 'copperSlagHunter',
        idle: 'crossLeg',
      }),
      Cast.generateAlienNPC('cinder', npcSeed + 55, {
        index: 4,
        name: '紫晶·外骸',
        cinderVariant: 'violetVoidWalker',
        idle: 'rubHands',
      }),
      Cast.generateAlienNPC('cinder', npcSeed + 65, {
        index: 5,
        name: '日冕·圣骑',
        cinderVariant: 'solarQuartzKnight',
        idle: 'toeTap',
      }),
    ];
    world.applyBatchSpecs(cinderSquad);
    world.setWeapon(world.agents[0], 'blade');
    world.setWeapon(world.agents[1], 'blade');
    world.setWeapon(world.agents[5], 'blade');
    setStageSpecs(world.agents.map((a: any) => a.spec));
    setWeaponStates(world.agents.map((a: any) => a.weapon || null));
    setNpcSpeciesFilter('cinder');
    setInspectCustomSpec(cinderSquad[1]);
    sfx.play('suit');
  }

  const selectedSpec = stageSpecs[selectedIdx] || Cast.CAST[selectedIdx] || Cast.CAST[0];
  const activeInspectSpec = inspectCustomSpec || stageSpecs[inspectCharIdx] || Cast.CAST[inspectCharIdx] || Cast.CAST[0];
  const selectedSuit = suitStates[selectedIdx] || false;
  const selectedWeapon = weaponStates[selectedIdx] || null;
  const weaponLabel =
    selectedWeapon === 'pistol'
      ? '脉冲手枪'
      : selectedWeapon === 'katana'
      ? '铁质长刀 (刀模组·4连)'
      : selectedWeapon === 'greatsword'
      ? '铁质大剑 (肩扛巨剑·2连)'
      : selectedWeapon === 'blade'
      ? '铁质长剑 (剑模组·3连)'
      : '无 (空手)';
  const comboStepLabels =
    selectedWeapon === 'katana'
      ? ['一段·拔刀向前横扫(3D扁月牙)', '二段·极速反手斜上挑', '三段·极速正手斜下劈', '四段·大上段重下劈']
      : selectedWeapon === 'greatsword'
      ? ['一段·拖地狂风上撩斩', '二段·狮子奋迅崩地重砸']
      : ['一段·向前横斩', '二段·过顶上挑', '三段·举顶后仰下劈'];
  const comboModulo = comboStepLabels.length;
  const currentComboLabel =
    comboStepLabels[
      ammoDisplay.comboStep ? (ammoDisplay.comboStep + comboModulo - 1) % comboModulo : 0
    ] || comboStepLabels[0];

  return (
    <div className="min-h-screen bg-[#14161a] text-[#e6e8ed] flex flex-col">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 Nav Links | Zone 3 Primary Action */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-[#262a32] bg-[#181b20]">
        <a
          href="#stage-section"
          className="text-base font-bold tracking-tight text-[#f0f2f6] whitespace-nowrap shrink-0"
        >
          PixelCast · 像素骨骼与模块化 NPC 生成引擎
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9aa1ae]">
          <a href="#stage-section" className="hover:text-[#f0f2f6] transition-colors whitespace-nowrap shrink-0">
            灰雾剧场
          </a>
          <a href="#npc-generator-section" className="hover:text-[#f0f2f6] transition-colors whitespace-nowrap shrink-0">
            NPC 批量生成工坊
          </a>
          <a href="#inspector-section" className="hover:text-[#f0f2f6] transition-colors whitespace-nowrap shrink-0">
            纯白刀光与全动作检视
          </a>
          <a href="#downloads-section" className="hover:text-[#f0f2f6] transition-colors whitespace-nowrap shrink-0">
            文件导出与代码
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/pixelcast/pixelcast_all.zip"
            download="pixelcast_all.zip"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#14161a] bg-[#e3e9f1] rounded-lg hover:bg-white transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            下载全部文件 (ZIP)
          </a>
        </div>
      </header>

      <main className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        {/* Section 1: Interactive Stage & Controls */}
        <section id="stage-section" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  paused
                    ? 'bg-[#2e3543] border-[#606a7c] text-white'
                    : 'bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160]'
                }`}
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {paused ? '继续' : '暂停'}
              </button>

              <button
                type="button"
                onClick={() => setSpeed((s) => (s === 1 ? 3 : 1))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  speed > 1
                    ? 'bg-[#2e3543] border-[#606a7c] text-white'
                    : 'bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160]'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                快进 ×3
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !lineup;
                  setLineup(next);
                  if (next && takeOn) setTakeOn(false);
                  worldRef.current?.setLineup(next);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  lineup
                    ? 'bg-[#2e3543] border-[#606a7c] text-white'
                    : 'bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {lineup ? '恢复自由行动' : '集合对比待机'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !takeOn;
                  setTakeOn(next);
                  applyTakeover(next, selectedIdx);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  takeOn
                    ? 'bg-[#ef7b3a] border-[#ff9b61] text-[#14161a] font-semibold'
                    : 'bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160]'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                {takeOn ? `已接管：${selectedSpec.name} (放开交还 AI)` : `接管所选角色 (${selectedSpec.name})`}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#181b20] p-1 rounded-md border border-[#343841]">
                {[
                  { id: 'blade', label: '铁质长剑(3连)' },
                  { id: 'katana', label: '铁质长刀(4连)' },
                  { id: 'greatsword', label: '铁质大剑(2连·肩扛)' },
                  { id: 'pistol', label: '脉冲手枪' },
                  { id: null, label: '空手' },
                ].map((wItem) => (
                  <button
                    key={wItem.id || 'none'}
                    type="button"
                    data-testid={`stage-weapon-${wItem.id || 'none'}`}
                    onClick={() => handleSetWeapon(wItem.id, selectedIdx)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      selectedWeapon === wItem.id
                        ? 'bg-[#2e3543] text-[#eef1f6] border border-[#9aa1b0]'
                        : 'text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {wItem.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleCycleWeapon(selectedIdx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  selectedWeapon
                    ? 'bg-[#2e333d] border-[#9aa1b0] text-[#eef1f6]'
                    : 'bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                切换武器：{weaponLabel} (Q)
              </button>

              <button
                type="button"
                data-testid="stage-attack-btn"
                onClick={handleTriggerShoot}
                onPointerDown={() => {
                  attackHoldRef.current = true;
                }}
                onPointerUp={() => {
                  attackHoldRef.current = false;
                }}
                onPointerLeave={() => {
                  attackHoldRef.current = false;
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border bg-[#ef7b3a] border-[#ff9b61] text-[#14161a] hover:bg-[#ff8f52] transition-colors whitespace-nowrap shrink-0"
              >
                {selectedWeapon === 'katana'
                  ? `长刀四连击：${currentComboLabel} (F / 左键)`
                  : selectedWeapon === 'greatsword'
                  ? `大剑二连重击：${currentComboLabel} (F / 左键)`
                  : selectedWeapon === 'blade'
                  ? `长剑三连击：${currentComboLabel} (F / 左键)`
                  : `开枪射击 (${ammoDisplay.ammo}/${ammoDisplay.max}) (F / 左键)`}
              </button>

              <button
                type="button"
                onClick={handleTriggerSkill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border bg-[#2b303a] border-[#9aa1b0] text-[#eef1f6] hover:bg-[#373d4a] transition-colors whitespace-nowrap shrink-0"
              >
                蓄力剑气 (G / 右键)
              </button>

              <button
                type="button"
                onClick={handleSummonDummy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-[#262320] border-[#685e55] text-[#d8cfc4] hover:border-[#968874] transition-colors whitespace-nowrap shrink-0"
              >
                召唤/重置木桩 (M)
              </button>

              <button
                type="button"
                onClick={handleTriggerReload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-[#21242b] border-[#343841] text-[#ffd257] hover:border-[#ffd257] transition-colors whitespace-nowrap shrink-0"
              >
                战术换弹 (R)
              </button>

              <button
                type="button"
                onClick={() => handleToggleSuit(selectedIdx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  selectedSuit
                    ? 'bg-[#39455a] border-[#7fb4e6] text-[#d6efff]'
                    : 'bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160]'
                }`}
              >
                <Rocket className="w-3.5 h-3.5" />
                {selectedSpec.name}太空服：{selectedSuit ? '开 (U)' : '关 (U)'}
              </button>

              <button
                type="button"
                onClick={handleTriggerBlink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-[#21242b] border-[#343841] text-[#96ebff] hover:border-[#7fb4e6] transition-colors whitespace-nowrap shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                瞬移 (J)
              </button>

              <button
                type="button"
                onClick={handleTriggerJump}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160] transition-colors whitespace-nowrap shrink-0"
              >
                起跳 / 二段跳 (Space)
              </button>

              <button
                type="button"
                aria-label={muted ? '取消静音' : '静音'}
                onClick={() => {
                  const next = !muted;
                  sfx.muted = next;
                  setMuted(next);
                }}
                className="inline-flex items-center justify-center p-1.5 text-xs rounded-md border bg-[#21242b] border-[#343841] text-[#9aa1ae] hover:text-white transition-colors"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Viewport Stage */}
          <div
            id="stage"
            className="relative w-full aspect-[16/9] max-h-[540px] bg-[#23262d] border-2 border-[#30343d] rounded-lg overflow-hidden shadow-2xl mx-auto"
          >
            <canvas
              ref={mainCanvasRef}
              onPointerMove={handleCanvasPointerMove}
              onPointerDown={handleCanvasPointerDown}
              onPointerUp={() => {
                attackHoldRef.current = false;
              }}
              onPointerLeave={() => {
                attackHoldRef.current = false;
              }}
              onContextMenu={(e) => e.preventDefault()}
              data-testid="pixelcast-stage-canvas"
              className="w-full h-full block pixelated cursor-crosshair"
            />
            <div ref={overlayRef} className="absolute inset-0 pointer-events-none overflow-hidden" />
          </div>

          {/* Control Hints */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9aa1ae] px-1">
            <div>
              <kbd className="bg-[#232730] border border-[#3a3f4b] rounded px-1.5 py-0.5 text-[#d8dce6]">按住左键 / F</kbd>{' '}
              铁剑三段八帧连招（一段向前横斩 → 二段过顶上挑 → 三段举顶后仰30°下劈，未衔接自动归第一段） ·{' '}
              <kbd className="bg-[#232730] border border-[#3a3f4b] rounded px-1.5 py-0.5 text-[#d8dce6]">右键 / G</kbd>{' '}
              蓄力冷铁剑气 ·{' '}
              <kbd className="bg-[#232730] border border-[#3a3f4b] rounded px-1.5 py-0.5 text-[#d8dce6]">M</kbd>{' '}
              召唤练功木桩测试打击感
            </div>
            <div className="text-[#c5ccd9]">
              武器与双臂肩膀支点随鼠标 360° 旋转 · 未连击必从第一段起手 · 跑打不滑步 · 手枪连射无闪烁
            </div>
          </div>
        </section>

        {/* Section 2: 6 Character Cards (45° Idle Preview & Personality Traits) */}
        <section id="cast-section" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-[#f0f2f6]">
              01. 六位角色与 45° 专属待机动作
            </h2>
            <span className="text-xs text-[#9aa1ae]">
              点击卡片切换跟随镜头 · 点击卡片右上角图标可单独穿脱太空服
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stageSpecs.map((spec: any, i: number) => {
              const isSelected = i === selectedIdx;
              const hasSuit = suitStates[i];
              return (
                <div
                  key={spec.id}
                  onClick={() => handleSelectChar(i)}
                  role="button"
                  tabIndex={0}
                  aria-label={`选择角色 ${spec.name} ${spec.tag}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectChar(i);
                    }
                  }}
                  className={`bg-[#21242b] border-2 rounded-lg p-2.5 cursor-pointer flex flex-col gap-1.5 transition-colors ${
                    isSelected ? 'border-[#e3e9f1] bg-[#262a33]' : 'border-[#30343d] hover:border-[#454b58]'
                  }`}
                >
                  <div className="relative w-full aspect-[32/30] bg-[#9a9ea9] rounded overflow-hidden">
                    <canvas
                      ref={(el) => {
                        cardCanvasRefs.current[i] = el;
                      }}
                      width={32}
                      height={30}
                      className="w-full h-full block pixelated"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleToggleSuit(i, e)}
                      aria-label={`切换 ${spec.name} 的太空服`}
                      title="穿/脱太空服"
                      className={`absolute top-1.5 right-1.5 p-1 rounded transition-colors ${
                        hasSuit
                          ? 'bg-[#ef7b3a] text-[#14161a]'
                          : 'bg-[#181b20]/75 text-[#cfd3dc] hover:bg-[#181b20]'
                      }`}
                    >
                      <Rocket className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1.5 text-[10px] font-mono text-[#23262d] font-semibold">
                      #{i + 1}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-0.5">
                    <h3 className="text-sm font-semibold text-[#f0f2f6]">
                      {spec.name}
                      <span className="text-xs font-normal text-[#9aa1ae] ml-1.5">· {spec.tag}</span>
                    </h3>
                    {spec.id === 'xing' && (
                      <span className="text-[11px] text-[#96ebff] font-medium">新角色</span>
                    )}
                  </div>

                  <div className="text-xs text-[#9aa1ae] leading-snug line-clamp-2">{spec.desc}</div>
                  <div className="text-[11px] text-[#b8c4d9] leading-snug">待机：{spec.idleName}</div>

                  <div className="grid grid-cols-[30px_1fr] gap-x-1.5 gap-y-1 text-[11px] text-[#9aa1ae] items-center mt-auto pt-1.5">
                    {BARS.map(([k, label]) => (
                      <React.Fragment key={k}>
                        <span>{label}</span>
                        <div className="h-1 bg-[#3a3e47] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#aab0bd] rounded-full"
                            style={{ width: `${Math.round(spec.traits[k] * 100)}%` }}
                          />
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2.5: Procedural Modular NPC & 3 Alien Races Batch Generator */}
        <section
          id="npc-generator-section"
          data-testid="npc-generator-section"
          className="bg-[#1c1f26] border border-[#2d313b] rounded-lg p-5 flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
              <h2 className="text-lg font-semibold text-[#f0f2f6]">
                02. 星际探索三大外星种族与程序化 NPC 工坊（全种族16种日常自然站立姿势 ＋ 烬骸族12大矿物熔岩预设与配色）
              </h2>
              <p className="text-xs text-[#9aa1ae] mt-0.5">
                【16种日常自然站立姿势·8帧平滑过渡】按《日常待机姿势参考表》实现勾腰带/交叉斜靠/整理衣领/搓手摩挲/摸后脑勺/脚尖点地等16种接地气日常站姿，单腿承重锚定、放松腿2°~4°逐帧平滑过渡无跳跃·【烬骸族】扩展至12种火山矿物岩壳×披肩×熔炉色温搭配
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="btn-deploy-cinder-variants"
                onClick={handleDeployCinderVariantsToStage}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md border bg-[#ff8a3d] border-[#ffb27a] text-[#14161a] hover:bg-[#ffa05c] transition-colors whitespace-nowrap shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                一键派遣烬骸族熔岩小队登场
              </button>

              <button
                type="button"
                data-testid="btn-deploy-cathode-variants"
                onClick={handleDeployCathodeVariantsToStage}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md border bg-[#6be6ff] border-[#96f0ff] text-[#12141a] hover:bg-[#8ef0ff] transition-colors whitespace-nowrap shrink-0"
              >
                <Rocket className="w-3.5 h-3.5" />
                一键派遣显像管族机械小队登场
              </button>

              <button
                type="button"
                data-testid="btn-deploy-myco-variants"
                onClick={handleDeployMycoVariantsToStage}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md border bg-[#6ef2d6] border-[#a3ffec] text-[#12141a] hover:bg-[#8ef9e3] transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                一键派遣6大同色系菌伞人登场
              </button>

              <button
                type="button"
                data-testid="btn-deploy-alien-trio"
                onClick={handleDeployAlienTrioToStage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-[#2e3543] border-[#606a7c] text-[#eef1f6] hover:bg-[#394254] transition-colors whitespace-nowrap shrink-0"
              >
                三大外星种族混编登场
              </button>

              <button
                type="button"
                data-testid="btn-randomize-npcs"
                onClick={() => {
                  sfx.play('select');
                  setNpcSeed((s) => s + 137);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md border bg-[#ef7b3a] border-[#ff9b61] text-[#14161a] hover:bg-[#ff8f52] transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                随机生成一批新 NPC (Seed #{npcSeed})
              </button>

              <button
                type="button"
                data-testid="btn-deploy-single-npc"
                onClick={() => handleDeploySingleNpcToStage(npcBatch[selectedNpcIdx] || npcBatch[0])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-[#2e3543] border-[#606a7c] text-[#eef1f6] hover:bg-[#394254] transition-colors whitespace-nowrap shrink-0"
              >
                派遣选中 NPC 登场试招 (替换 #{selectedIdx + 1})
              </button>

              <button
                type="button"
                data-testid="btn-deploy-batch-npcs"
                onClick={handleDeployNpcBatchToStage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-[#21242b] border-[#343841] text-[#d5d9e2] hover:border-[#4b5160] transition-colors whitespace-nowrap shrink-0"
              >
                批量替换剧场 6 人
              </button>

              <button
                type="button"
                onClick={handleRestoreOriginalCast}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border bg-[#181b20] border-[#2e323b] text-[#9aa1ae] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                恢复初始六主角
              </button>
            </div>
          </div>

          {/* 3 Humanoid Alien Species Interactive Codex & Micro-FX Panel */}
          <div
            data-testid="alien-species-codex"
            className="bg-[#14161a] border border-[#2d3442] rounded-lg p-3.5 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#6be6ff]">
                  三大星球探索类人形外星种族图鉴（人体比例 · 适配全套19动作与360°旋转手臂）
                </span>
                <span className="text-[11px] text-[#9aa1ae]">
                  点击任意外星种族卡片即可在下方「全身插槽拆离流水线」与「19动作检视器」中查看其全部序列帧
                </span>
              </div>

              {/* Cathode Screen & Alien Micro-FX Mode Switcher */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#cfd3dc]">显像管微特效状态：</span>
                {[
                  { id: 'auto', label: '自动随动作切换' },
                  { id: 'ring', label: '待机·动态屏显图案' },
                  { id: 'crosshair', label: '开火·冰青十字准星' },
                  { id: 'static', label: '受击·红白雪花噪点' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`alien-screen-mode-${m.id}`}
                    onClick={() => {
                      setAlienScreenMode(m.id as any);
                      if (m.id === 'static' && worldRef.current) {
                        worldRef.current.agents.forEach((ag: any) => worldRef.current.hurtAgent?.(ag, 0.9));
                        sfx.play('hit');
                      } else {
                        sfx.play('select');
                      }
                    }}
                    className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                      alienScreenMode === m.id
                        ? 'bg-[#6be6ff] text-[#12141a] border-[#96f0ff] font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] border-[#2e3340] hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Cast.NPC_PARTS?.SPECIES || [])
                .filter((sp: any) => sp.id !== 'human')
                .map((sp: any, idx: number) => {
                  const isActiveAlien = inspectCustomSpec?.species === sp.id;
                  return (
                    <div
                      key={sp.id}
                      data-testid={`alien-species-card-${sp.id}`}
                      onClick={() => {
                        const alienNpc = Cast.generateAlienNPC(sp.id, 2026 + idx);
                        setNpcSpeciesFilter(sp.id);
                        setSelectedNpcIdx(0);
                        setInspectCustomSpec(alienNpc);
                        sfx.play('select');
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const alienNpc = Cast.generateAlienNPC(sp.id, 2026 + idx);
                          setNpcSpeciesFilter(sp.id);
                          setSelectedNpcIdx(0);
                          setInspectCustomSpec(alienNpc);
                        }
                      }}
                      className={`bg-[#1e222b] border-2 rounded-lg p-3 cursor-pointer flex flex-col gap-2 transition-colors ${
                        isActiveAlien
                          ? 'border-[#6be6ff] bg-[#232936]'
                          : 'border-[#303644] hover:border-[#4c566d]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#f0f2f6]">{sp.name}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#14161a] text-[#6be6ff] border border-[#2c3a4f]">
                              {sp.subName}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#9aa1ae] mt-0.5">{sp.desc}</p>
                        </div>
                        <button
                          type="button"
                          data-testid={`btn-deploy-alien-${sp.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const alienNpc = Cast.generateAlienNPC(sp.id, 2026 + idx);
                            handleDeploySingleNpcToStage(alienNpc);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-[#2e3543] text-[#eef1f6] hover:bg-[#3b4456] whitespace-nowrap shrink-0"
                        >
                          派遣登场
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#8b909c] rounded overflow-hidden aspect-[24/23] relative">
                          <canvas
                            ref={(el) => {
                              alienShowcaseRefs.current[idx] = el;
                            }}
                            width={48}
                            height={46}
                            className="w-full h-full block pixelated"
                          />
                          <span className="absolute bottom-1 left-1.5 text-[10px] font-mono bg-[#14161a]/80 text-[#eef1f6] px-1 rounded">
                            {npcView34 ? '45° 待机' : '侧面待机'}
                          </span>
                        </div>
                        <div className="bg-[#7e838f] rounded overflow-hidden aspect-[24/23] relative">
                          <canvas
                            ref={(el) => {
                              alienActionShowcaseRefs.current[idx] = el;
                            }}
                            width={48}
                            height={46}
                            className="w-full h-full block pixelated"
                          />
                          <span className="absolute bottom-1 left-1.5 text-[10px] font-mono bg-[#14161a]/80 text-[#6be6ff] px-1 rounded">
                            {sp.id === 'cathode'
                              ? '开火准星微特效'
                              : sp.id === 'myco'
                              ? '滞空伞扬+孢子链摆动'
                              : '疾跑刀光+熔炉之心'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1 text-[11px] text-[#c5ccd9] bg-[#15181f] p-2 rounded border border-[#262b36]">
                        <div>
                          <strong className="text-[#e3e9f1]">头部：</strong>
                          {sp.headSlot}
                        </div>
                        <div>
                          <strong className="text-[#e3e9f1]">躯干：</strong>
                          {sp.torsoSlot}
                        </div>
                        <div>
                          <strong className="text-[#e3e9f1]">四肢：</strong>
                          {sp.limbSlot}
                        </div>
                        <div className="text-[#96ebff]">
                          <strong className="text-[#6be6ff]">动态微特效：</strong>
                          {sp.fxDesc}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Part Pool Filter Controls */}
          <div className="flex flex-col gap-2.5 bg-[#14161a] p-3 rounded-lg border border-[#2a2e37]">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#22262e]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#6be6ff] whitespace-nowrap">种族筛选池：</span>
                {[
                  { id: 'aliens', label: '三大外星种族轮转' },
                  { id: 'cathode', label: '1. 显像管族 (信号遗民)' },
                  { id: 'myco', label: '2. 孢子傀儡 (菌伞旅人)' },
                  { id: 'cinder', label: '3. 烬骸族 (余烬铸造者)' },
                  { id: 'mixed', label: '人类＋外星混编' },
                  { id: 'human', label: '人类探险者' },
                ].map((spOpt) => (
                  <button
                    key={spOpt.id}
                    type="button"
                    data-testid={`filter-species-${spOpt.id}`}
                    onClick={() => setNpcSpeciesFilter(spOpt.id)}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      npcSpeciesFilter === spOpt.id
                        ? 'bg-[#6be6ff] text-[#12141a] font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {spOpt.label}
                  </button>
                ))}
              </div>

              {/* 1. Cathode-Folk (显像管族) 8 Industrial Variants & Modular Customization Panel */}
              <div className="flex flex-col gap-2 w-full pt-2 border-t border-[#1e222b]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#6be6ff] whitespace-nowrap">
                      显像管族 (信号遗民) 8大工业机械变种与模块化池（显示器头型10种 × 待机屏显6种 × 身体变种9种 × 工业金属涂装8种）：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cathode-variant-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cathode');
                        setNpcCathodeVariantFilter('random');
                        setCathodeHeadShapeFilter('random');
                        setCathodeScreenMotifFilter('random');
                        setCathodeBodyBuildFilter('random');
                        setCathodeColorThemeFilter('random');
                        setNpcSeed((s) => s + 137);
                        sfx.play('select');
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                        npcSpeciesFilter === 'cathode' &&
                        npcCathodeVariantFilter === 'random' &&
                        cathodeHeadShapeFilter === 'random' &&
                        cathodeScreenMotifFilter === 'random' &&
                        cathodeBodyBuildFilter === 'random' &&
                        cathodeColorThemeFilter === 'random'
                          ? 'bg-[#6be6ff] text-[#12141a] font-semibold'
                          : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      全随机自由组合显像管族
                    </button>
                    {(Cast.NPC_PARTS?.CATHODE_VARIANTS || []).map((cv: any, cIdx: number) => (
                      <button
                        key={cv.id}
                        type="button"
                        data-testid={`filter-cathode-variant-${cv.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cathode');
                          setNpcCathodeVariantFilter(cv.id);
                          setCathodeHeadShapeFilter('random');
                          setCathodeScreenMotifFilter('random');
                          setCathodeBodyBuildFilter('random');
                          setCathodeColorThemeFilter('random');
                          setSelectedNpcIdx(0);
                          const cSpec = Cast.generateAlienNPC('cathode', 2026 + cIdx, {
                            index: cIdx,
                            cathodeVariant: cv.id,
                            idle: cv.defaultIdle,
                          });
                          setInspectCustomSpec(cSpec);
                          sfx.play('select');
                        }}
                        className={`px-2 py-1 text-[11px] rounded transition-colors ${
                          npcSpeciesFilter === 'cathode' && npcCathodeVariantFilter === cv.id
                            ? 'bg-[#6be6ff] text-[#12141a] font-semibold'
                            : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        变种{cIdx + 1}: {cv.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modular Free-Combination Rows for Cathode-Folk */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 bg-[#161a22] p-2.5 rounded border border-[#283142]">
                  {/* 1. Monitor Head Shape (10 geometric/industrial monitor shapes) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#6be6ff] whitespace-nowrap">
                      1. 机械显示器头型 (10种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cathode-shape-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cathode');
                        setNpcCathodeVariantFilter('random');
                        setCathodeHeadShapeFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cathodeHeadShapeFilter === 'random'
                          ? 'bg-[#2e3543] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机显示器
                    </button>
                    {(Cast.NPC_PARTS?.CATHODE_HEAD_SHAPES || []).map((sh: any) => (
                      <button
                        key={sh.id}
                        type="button"
                        data-testid={`filter-cathode-shape-${sh.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cathode');
                          setNpcCathodeVariantFilter('random');
                          setCathodeHeadShapeFilter(sh.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cathodeHeadShapeFilter === sh.id
                            ? 'bg-[#6be6ff] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {sh.name}
                      </button>
                    ))}
                  </div>

                  {/* 2. Idle Screen Motif (6 animated screen contents) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#6be6ff] whitespace-nowrap">
                      2. 待机显示器动态内容 (6种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cathode-motif-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cathode');
                        setNpcCathodeVariantFilter('random');
                        setCathodeScreenMotifFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cathodeScreenMotifFilter === 'random'
                          ? 'bg-[#2e3543] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机屏显
                    </button>
                    {(Cast.NPC_PARTS?.CATHODE_SCREEN_MOTIFS || []).map((mf: any) => (
                      <button
                        key={mf.id}
                        type="button"
                        data-testid={`filter-cathode-motif-${mf.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cathode');
                          setNpcCathodeVariantFilter('random');
                          setCathodeScreenMotifFilter(mf.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cathodeScreenMotifFilter === mf.id
                            ? 'bg-[#6be6ff] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {mf.name}
                      </button>
                    ))}
                  </div>

                  {/* 3. Cathode Body Build (9 mechanical torso & body builds) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#ffd257] whitespace-nowrap">
                      3. 机械躯干与身形变种 (9种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cathode-build-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cathode');
                        setNpcCathodeVariantFilter('random');
                        setCathodeBodyBuildFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cathodeBodyBuildFilter === 'random'
                          ? 'bg-[#2e3543] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机身形
                    </button>
                    {(Cast.NPC_PARTS?.MYCO_BODY_BUILDS || []).map((bb: any) => (
                      <button
                        key={bb.id}
                        type="button"
                        data-testid={`filter-cathode-build-${bb.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cathode');
                          setNpcCathodeVariantFilter('random');
                          setCathodeBodyBuildFilter(bb.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cathodeBodyBuildFilter === bb.id
                            ? 'bg-[#ffd257] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {bb.shortName}
                      </button>
                    ))}
                  </div>

                  {/* 4. Cathode Industrial Mechanical Color Theme (8 themes) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#ffd257] whitespace-nowrap">
                      4. 工业机械金属涂装 (8种低饱和金属色)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cathode-color-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cathode');
                        setNpcCathodeVariantFilter('random');
                        setCathodeColorThemeFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cathodeColorThemeFilter === 'random'
                          ? 'bg-[#2e3543] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机机械涂装
                    </button>
                    {(Cast.NPC_PARTS?.CATHODE_COLOR_THEMES || []).map((ct: any) => (
                      <button
                        key={ct.id}
                        type="button"
                        data-testid={`filter-cathode-color-${ct.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cathode');
                          setNpcCathodeVariantFilter('random');
                          setCathodeColorThemeFilter(ct.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cathodeColorThemeFilter === ct.id
                            ? 'bg-[#ffd257] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {ct.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Myco-Hosts (菌伞人) Unified Head+Body Color Tone & Modular Customization Panel */}
              <div className="flex flex-col gap-2 w-full pt-2 border-t border-[#1e222b]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#6ef2d6] whitespace-nowrap">
                      菌伞人 (孢子傀儡) 同色系组合与预设池（头型6种 × 头身统一同色系7种 × 身体变种9种 × 待机10种）：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-myco-variant-random"
                      onClick={() => {
                        setNpcSpeciesFilter('myco');
                        setNpcMycoVariantFilter('random');
                        setMycoCapShapeFilter('random');
                        setMycoCapColorFilter('random');
                        setMycoBodyBuildFilter('random');
                        setMycoSuitColorFilter('random');
                        setNpcSeed((s) => s + 137);
                        sfx.play('select');
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                        npcSpeciesFilter === 'myco' &&
                        npcMycoVariantFilter === 'random' &&
                        mycoCapShapeFilter === 'random' &&
                        mycoCapColorFilter === 'random' &&
                        mycoBodyBuildFilter === 'random' &&
                        mycoSuitColorFilter === 'random'
                          ? 'bg-[#6ef2d6] text-[#12141a] font-semibold'
                          : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      全随机同色系菌伞人
                    </button>
                    {(Cast.NPC_PARTS?.MYCO_VARIANTS || []).map((mv: any, vIdx: number) => (
                      <button
                        key={mv.id}
                        type="button"
                        data-testid={`filter-myco-variant-${mv.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('myco');
                          setNpcMycoVariantFilter(mv.id);
                          setMycoCapShapeFilter('random');
                          setMycoCapColorFilter('random');
                          setMycoBodyBuildFilter('random');
                          setMycoSuitColorFilter('random');
                          setSelectedNpcIdx(0);
                          const vSpec = Cast.generateAlienNPC('myco', 2026 + vIdx, {
                            index: vIdx,
                            mycoVariant: mv.id,
                            idle: mv.defaultIdle,
                          });
                          setInspectCustomSpec(vSpec);
                          sfx.play('select');
                        }}
                        className={`px-2 py-1 text-[11px] rounded transition-colors ${
                          npcSpeciesFilter === 'myco' && npcMycoVariantFilter === mv.id
                            ? 'bg-[#6ef2d6] text-[#12141a] font-semibold'
                            : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        预设{vIdx + 1}: {mv.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modular Free-Combination Rows for Myco-Hosts (Head & Body Locked to Unified Color Tone) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 bg-[#181c24] p-2.5 rounded border border-[#262c38]">
                  {/* 1. Cap Shape (6 shapes) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#96ebff] whitespace-nowrap">
                      1. 伞菌头部形状 (6种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-myco-shape-random"
                      onClick={() => {
                        setNpcSpeciesFilter('myco');
                        setNpcMycoVariantFilter('random');
                        setMycoCapShapeFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        mycoCapShapeFilter === 'random'
                          ? 'bg-[#2e3543] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机伞型
                    </button>
                    {(Cast.NPC_PARTS?.MYCO_CAP_SHAPES || []).map((sh: any) => (
                      <button
                        key={sh.id}
                        type="button"
                        data-testid={`filter-myco-shape-${sh.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('myco');
                          setNpcMycoVariantFilter('random');
                          setMycoCapShapeFilter(sh.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          mycoCapShapeFilter === sh.id
                            ? 'bg-[#6ef2d6] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {sh.shortName}
                      </button>
                    ))}
                  </div>

                  {/* 2. Unified Head & Body Color Tone (7 unified color themes) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#96ebff] whitespace-nowrap">
                      2. 头身统一同色系 (7种同色调)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-myco-capcolor-random"
                      onClick={() => {
                        setNpcSpeciesFilter('myco');
                        setNpcMycoVariantFilter('random');
                        setMycoCapColorFilter('random');
                        setMycoSuitColorFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        mycoCapColorFilter === 'random'
                          ? 'bg-[#2e3543] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机同色系
                    </button>
                    {(Cast.NPC_PARTS?.MYCO_CAP_PALETTES || []).map((cp: any) => (
                      <button
                        key={cp.id}
                        type="button"
                        data-testid={`filter-myco-capcolor-${cp.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('myco');
                          setNpcMycoVariantFilter('random');
                          setMycoCapColorFilter(cp.id);
                          setMycoSuitColorFilter(cp.suitColorId || cp.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          mycoCapColorFilter === cp.id
                            ? 'bg-[#6ef2d6] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {cp.shortName}
                      </button>
                    ))}
                  </div>

                  {/* 3. Height & Obesity Body Build (6 builds) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#ffd257] whitespace-nowrap">
                      3. 身高与胖瘦体型 (6种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-myco-build-random"
                      onClick={() => {
                        setNpcSpeciesFilter('myco');
                        setNpcMycoVariantFilter('random');
                        setMycoBodyBuildFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        mycoBodyBuildFilter === 'random'
                          ? 'bg-[#2e3543] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机高矮胖瘦
                    </button>
                    {(Cast.NPC_PARTS?.MYCO_BODY_BUILDS || []).map((bb: any) => (
                      <button
                        key={bb.id}
                        type="button"
                        data-testid={`filter-myco-build-${bb.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('myco');
                          setNpcMycoVariantFilter('random');
                          setMycoBodyBuildFilter(bb.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          mycoBodyBuildFilter === bb.id
                            ? 'bg-[#ffd257] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {bb.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Cinderborn (烬骸族) 12 Volcanic Variants & Modular Customization Panel */}
              <div className="flex flex-col gap-2 w-full pt-2 border-t border-[#1e222b]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#ff944d] whitespace-nowrap">
                      烬骸族 (余烬铸造者) 12大矿物熔岩预设与模块化池（火山岩颅8种 × 火瞳与熔炉之心6种 × 熔岩躯干9种 × 火山矿物熔火配色12种）：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cinder-variant-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cinder');
                        setNpcCinderVariantFilter('random');
                        setCinderHeadShapeFilter('random');
                        setCinderCoreMotifFilter('random');
                        setCinderBodyBuildFilter('random');
                        setCinderColorThemeFilter('random');
                        setNpcSeed((s) => s + 137);
                        sfx.play('select');
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                        npcSpeciesFilter === 'cinder' &&
                        npcCinderVariantFilter === 'random' &&
                        cinderHeadShapeFilter === 'random' &&
                        cinderCoreMotifFilter === 'random' &&
                        cinderBodyBuildFilter === 'random' &&
                        cinderColorThemeFilter === 'random'
                          ? 'bg-[#ff8a3d] text-[#12141a] font-semibold'
                          : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      全随机自由组合烬骸族
                    </button>
                    {(Cast.NPC_PARTS?.CINDER_VARIANTS || []).map((iv: any, iIdx: number) => (
                      <button
                        key={iv.id}
                        type="button"
                        data-testid={`filter-cinder-variant-${iv.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cinder');
                          setNpcCinderVariantFilter(iv.id);
                          setCinderHeadShapeFilter('random');
                          setCinderCoreMotifFilter('random');
                          setCinderBodyBuildFilter('random');
                          setCinderColorThemeFilter('random');
                          setSelectedNpcIdx(0);
                          const iSpec = Cast.generateAlienNPC('cinder', 2026 + iIdx, {
                            index: iIdx,
                            cinderVariant: iv.id,
                            idle: iv.defaultIdle,
                          });
                          setInspectCustomSpec(iSpec);
                          sfx.play('select');
                        }}
                        className={`px-2 py-1 text-[11px] rounded transition-colors ${
                          npcSpeciesFilter === 'cinder' && npcCinderVariantFilter === iv.id
                            ? 'bg-[#ff8a3d] text-[#12141a] font-semibold'
                            : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        变种{iIdx + 1}: {iv.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modular Free-Combination Rows for Cinderborn */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 bg-[#1c1716] p-2.5 rounded border border-[#3d2922]">
                  {/* 1. Volcanic/Obsidian Head Shape (8 shapes) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#ff944d] whitespace-nowrap">
                      1. 火山岩/黑曜石颅骨头型 (8种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cinder-shape-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cinder');
                        setNpcCinderVariantFilter('random');
                        setCinderHeadShapeFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cinderHeadShapeFilter === 'random'
                          ? 'bg-[#3d2922] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机岩颅
                    </button>
                    {(Cast.NPC_PARTS?.CINDER_HEAD_SHAPES || []).map((sh: any) => (
                      <button
                        key={sh.id}
                        type="button"
                        data-testid={`filter-cinder-shape-${sh.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cinder');
                          setNpcCinderVariantFilter('random');
                          setCinderHeadShapeFilter(sh.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cinderHeadShapeFilter === sh.id
                            ? 'bg-[#ff8a3d] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {sh.name}
                      </button>
                    ))}
                  </div>

                  {/* 2. Facial Slit & Furnace Heart Core Motif (6 motifs) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#ff944d] whitespace-nowrap">
                      2. 面部火瞳与熔炉之心形态 (6种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cinder-motif-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cinder');
                        setNpcCinderVariantFilter('random');
                        setCinderCoreMotifFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cinderCoreMotifFilter === 'random'
                          ? 'bg-[#3d2922] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机炉心
                    </button>
                    {(Cast.NPC_PARTS?.CINDER_CORE_MOTIFS || []).map((mf: any) => (
                      <button
                        key={mf.id}
                        type="button"
                        data-testid={`filter-cinder-motif-${mf.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cinder');
                          setNpcCinderVariantFilter('random');
                          setCinderCoreMotifFilter(mf.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cinderCoreMotifFilter === mf.id
                            ? 'bg-[#ff8a3d] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {mf.name}
                      </button>
                    ))}
                  </div>

                  {/* 3. Cinderborn Lava Armor Body Build (9 builds) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#ffd257] whitespace-nowrap">
                      3. 熔岩胸甲与身形变种 (9种)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cinder-build-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cinder');
                        setNpcCinderVariantFilter('random');
                        setCinderBodyBuildFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cinderBodyBuildFilter === 'random'
                          ? 'bg-[#3d2922] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机熔岩身形
                    </button>
                    {(Cast.NPC_PARTS?.MYCO_BODY_BUILDS || []).map((bb: any) => (
                      <button
                        key={bb.id}
                        type="button"
                        data-testid={`filter-cinder-build-${bb.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cinder');
                          setNpcCinderVariantFilter('random');
                          setCinderBodyBuildFilter(bb.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cinderBodyBuildFilter === bb.id
                            ? 'bg-[#ffd257] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {bb.shortName}
                      </button>
                    ))}
                  </div>

                  {/* 4. Cinderborn Unified Volcanic & Flame Color Theme (12 themes) */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#ffd257] whitespace-nowrap">
                      4. 火山矿物岩壳×披肩×熔炉配色 (12种预设搭配)：
                    </span>
                    <button
                      type="button"
                      data-testid="filter-cinder-color-random"
                      onClick={() => {
                        setNpcSpeciesFilter('cinder');
                        setNpcCinderVariantFilter('random');
                        setCinderColorThemeFilter('random');
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        cinderColorThemeFilter === 'random'
                          ? 'bg-[#3d2922] text-white font-semibold'
                          : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                      }`}
                    >
                      随机熔火色温
                    </button>
                    {(Cast.NPC_PARTS?.CINDER_COLOR_THEMES || []).map((ct: any) => (
                      <button
                        key={ct.id}
                        type="button"
                        data-testid={`filter-cinder-color-${ct.id}`}
                        onClick={() => {
                          setNpcSpeciesFilter('cinder');
                          setNpcCinderVariantFilter('random');
                          setCinderColorThemeFilter(ct.id);
                          sfx.play('select');
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          cinderColorThemeFilter === ct.id
                            ? 'bg-[#ffd257] text-[#12141a] font-semibold'
                            : 'bg-[#14161a] text-[#9aa1ae] hover:text-white'
                        }`}
                      >
                        {ct.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#cfd3dc] whitespace-nowrap">发型池 (15种)：</span>
                <button
                  type="button"
                  onClick={() => setNpcHairFilter('random')}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    npcHairFilter === 'random'
                      ? 'bg-[#2e3543] text-white font-semibold'
                      : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                  }`}
                >
                  随机发型
                </button>
                {(Cast.NPC_PARTS?.HAIR_STYLES || []).map((h: any) => (
                  <button
                    key={h.id}
                    type="button"
                    data-testid={`filter-hair-${h.id}`}
                    onClick={() => setNpcHairFilter(h.id)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      npcHairFilter === h.id
                        ? 'bg-[#2e3543] text-white font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {h.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#cfd3dc] whitespace-nowrap">帽饰池 (8种)：</span>
                <button
                  type="button"
                  onClick={() => setNpcHatFilter('random')}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    npcHatFilter === 'random'
                      ? 'bg-[#2e3543] text-white font-semibold'
                      : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                  }`}
                >
                  随机
                </button>
                {(Cast.NPC_PARTS?.HAT_STYLES || []).map((ht: any) => (
                  <button
                    key={ht.id}
                    type="button"
                    onClick={() => setNpcHatFilter(ht.id)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      npcHatFilter === ht.id
                        ? 'bg-[#2e3543] text-white font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {ht.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#22262e]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#cfd3dc] whitespace-nowrap">套装池 (9种·含袖长)：</span>
                <button
                  type="button"
                  onClick={() => setNpcSuitFilter('random')}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    npcSuitFilter === 'random'
                      ? 'bg-[#2e3543] text-white font-semibold'
                      : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                  }`}
                >
                  随机套装
                </button>
                {(Cast.NPC_PARTS?.OUTFIT_SUITS || []).map((st: any) => (
                  <button
                    key={st.id}
                    type="button"
                    data-testid={`filter-suit-${st.id}`}
                    onClick={() => setNpcSuitFilter(st.id)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      npcSuitFilter === st.id
                        ? 'bg-[#2e3543] text-white font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#cfd3dc] whitespace-nowrap">鞋靴池 (5种)：</span>
                <button
                  type="button"
                  onClick={() => setNpcShoeFilter('random')}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    npcShoeFilter === 'random'
                      ? 'bg-[#2e3543] text-white font-semibold'
                      : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                  }`}
                >
                  随机鞋靴
                </button>
                {(Cast.NPC_PARTS?.SHOE_STYLES || []).map((sh: any) => (
                  <button
                    key={sh.id}
                    type="button"
                    data-testid={`filter-shoe-${sh.id}`}
                    onClick={() => setNpcShoeFilter(sh.id)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      npcShoeFilter === sh.id
                        ? 'bg-[#2e3543] text-white font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {sh.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#cfd3dc] whitespace-nowrap">背饰共用栏 (披风/背包)：</span>
                <button
                  type="button"
                  onClick={() => setNpcBackFilter('random')}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    npcBackFilter === 'random'
                      ? 'bg-[#2e3543] text-white font-semibold'
                      : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                  }`}
                >
                  随机轮转
                </button>
                {(Cast.NPC_PARTS?.BACK_STYLES || []).map((bk: any) => (
                  <button
                    key={bk.id}
                    type="button"
                    data-testid={`filter-back-${bk.id}`}
                    onClick={() => setNpcBackFilter(bk.id)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      npcBackFilter === bk.id
                        ? 'bg-[#ef7b3a] text-[#14161a] font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {bk.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#22262e]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#cfd3dc] whitespace-nowrap">
                  日常待机动作池 (16种自然站立姿势·单腿锚定+8帧平滑重心过渡)：
                </span>
                <button
                  type="button"
                  onClick={() => setNpcIdleFilter('random')}
                  className={`px-2 py-1 text-[11px] rounded transition-colors ${
                    npcIdleFilter === 'random'
                      ? 'bg-[#2e3543] text-white font-semibold'
                      : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                  }`}
                >
                  随机轮转16种
                </button>
                {(Cast.NPC_PARTS?.IDLES || []).map((idItem: any) => (
                  <button
                    key={idItem.id}
                    type="button"
                    data-testid={`filter-idle-${idItem.id}`}
                    onClick={() => {
                      setNpcIdleFilter(idItem.id);
                      setInspectIdleOverride(idItem.id);
                      setInspectMode('idle');
                    }}
                    title={`${idItem.name}｜手：${idItem.handDesc}｜腿：${idItem.legDesc}`}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      npcIdleFilter === idItem.id
                        ? 'bg-[#ef7b3a] text-[#14161a] font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {idItem.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6-Stage Modular Head, Suit/Sleeve, Shoes & Dynamic Cape Breakdown */}
          {npcBatch[selectedNpcIdx] && (
            <div className="bg-[#14161a] border border-[#2a2e37] rounded-lg p-3.5 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#e3e9f1]">
                    当前选中 NPC 全身模块化拆离与跑动披风合成流水线：{npcBatch[selectedNpcIdx].name} · {npcBatch[selectedNpcIdx].tag}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#232730] border border-[#363b47] text-[#c5ccd9]">
                    {npcBatch[selectedNpcIdx].desc}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNpcView34((v) => !v)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded bg-[#232730] border border-[#363b47] text-[#d5d9e2] hover:border-[#565e70]"
                  >
                    视角切换：{npcView34 ? '45° 待机视角 (6×5 头骨)' : '侧面战斗视角 (5×5 头骨)'}
                  </button>
                  <button
                    type="button"
                    data-testid="btn-send-npc-to-inspector"
                    onClick={() => {
                      setInspectCustomSpec(npcBatch[selectedNpcIdx]);
                      sfx.play('select');
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#2e3543] text-[#eef1f6] hover:bg-[#3a4354]"
                  >
                    送入下方 19 动作检视器测试
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {(npcBatch[selectedNpcIdx].isAlien
                  ? [
                      {
                        title: '1. 外星头颅插槽 (Alien Head)',
                        sub: `${npcBatch[selectedNpcIdx].speciesName} · ${npcBatch[selectedNpcIdx].partsMeta?.hatName}`,
                      },
                      {
                        title: '2. 发光核心/伞盖 (+ Core)',
                        sub: `${npcBatch[selectedNpcIdx].partsMeta?.hairName}`,
                      },
                      {
                        title: '3. 头部微特效激活 (+ Head FX)',
                        sub:
                          npcBatch[selectedNpcIdx].species === 'cathode'
                            ? '开火切换亮青色十字准星 (#6be6ff)'
                            : npcBatch[selectedNpcIdx].species === 'myco'
                            ? '滞空菌伞边缘上扬 + 孢子链摆动'
                            : '火山黑曜石碎角 + 亮金竖缝 (#ffd23f)',
                      },
                      {
                        title: '4. 躯干与胸口细节 (+ Torso)',
                        sub: `${npcBatch[selectedNpcIdx].partsMeta?.suitName} · ${npcBatch[selectedNpcIdx].partsMeta?.sleeveName}`,
                      },
                      {
                        title: '5. 异星四肢与节点 (+ Limbs)',
                        sub: `${npcBatch[selectedNpcIdx].partsMeta?.shoeName} · ${npcBatch[selectedNpcIdx].partsMeta?.backName}`,
                      },
                      {
                        title: '6. 疾跑全身动态合成 (Run Composite)',
                        sub:
                          npcBatch[selectedNpcIdx].species === 'cathode'
                            ? '受击红白雪花噪点帧 + 疾跑机械骨架'
                            : npcBatch[selectedNpcIdx].species === 'myco'
                            ? '菌柄脖子连贯衔接 + 跑动孢子吊坠摆动'
                            : '疾跑岩石胸甲 + 熔炉之心暖光跃动',
                      },
                    ]
                  : [
                      {
                        title: '1. 基础头骨 (Base Head)',
                        sub: `标准五官耳廓 · 肤色[${npcBatch[selectedNpcIdx].partsMeta?.skinName}]`,
                      },
                      {
                        title: '2. 发型叠加 (+ Hair)',
                        sub: `发型[${npcBatch[selectedNpcIdx].partsMeta?.hairName}] · 发色[${npcBatch[selectedNpcIdx].partsMeta?.hairColorName}]`,
                      },
                      {
                        title: '3. 帽饰叠加 (+ Hat)',
                        sub: ['beret', 'cap', 'strawHat', 'hood'].includes(npcBatch[selectedNpcIdx].look?.hat)
                          ? `帽饰[${npcBatch[selectedNpcIdx].partsMeta?.hatName}] · 含空格消发掩码`
                          : `帽饰[${npcBatch[selectedNpcIdx].partsMeta?.hatName}] · 半开放保留顶发`,
                      },
                      {
                        title: '4. 套装与袖长 (+ Suit & Sleeve)',
                        sub: `${npcBatch[selectedNpcIdx].partsMeta?.suitName} · ${npcBatch[selectedNpcIdx].partsMeta?.sleeveName}`,
                      },
                      {
                        title: '5. 鞋靴与背饰 (+ Shoes & Back)',
                        sub: `鞋[${npcBatch[selectedNpcIdx].partsMeta?.shoeName}] · 背饰栏[${npcBatch[selectedNpcIdx].partsMeta?.backName}]`,
                      },
                      {
                        title: '6. 跑动披风高扬合成 (Run Billow)',
                        sub: '侧面疾跑帧 · 旅行者披风迎风飘起 + 套装袖长同步摆臂',
                      },
                    ]
                ).map((stage, idx) => (
                  <div
                    key={stage.title}
                    className="bg-[#20242c] border border-[#323744] rounded-md p-2.5 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-24 h-[92px] bg-[#8b909c] rounded overflow-hidden">
                      <canvas
                        ref={(el) => {
                          headBreakdownCanvasRefs.current[idx] = el;
                        }}
                        width={48}
                        height={46}
                        className="w-full h-full block pixelated"
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#e3e9f1] text-center">{stage.title}</span>
                    <span className="text-[11px] text-[#9aa1ae] text-center leading-tight">{stage.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8-Card Batch Generated NPC Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {npcBatch.map((npc: any, idx: number) => {
              const isSel = idx === selectedNpcIdx;
              const isInspecting = inspectCustomSpec?.id === npc.id;
              return (
                <div
                  key={npc.id}
                  data-testid={`npc-batch-card-${idx}`}
                  onClick={() => {
                    setSelectedNpcIdx(idx);
                    setInspectCustomSpec(npc);
                    sfx.play('select');
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNpcIdx(idx);
                      setInspectCustomSpec(npc);
                    }
                  }}
                  className={`bg-[#21242b] border-2 rounded-lg p-2 cursor-pointer flex flex-col gap-1.5 transition-colors ${
                    isSel
                      ? 'border-[#ef7b3a] bg-[#262a33]'
                      : isInspecting
                      ? 'border-[#e3e9f1]'
                      : 'border-[#30343d] hover:border-[#4b5160]'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-1">
                    <div className="aspect-[24/23] bg-[#8b909c] rounded overflow-hidden" title={`45° 专属待机：${npc.idleName}`}>
                      <canvas
                        ref={(el) => {
                          npcBatchCanvasRefs.current[idx] = el;
                        }}
                        width={48}
                        height={46}
                        className="w-full h-full block pixelated"
                      />
                    </div>
                    <div className="aspect-[24/23] bg-[#7e838f] rounded overflow-hidden" title="跑动披风飘起 + 纯白刀光挥砍适配">
                      <canvas
                        ref={(el) => {
                          npcBatchSlashCanvasRefs.current[idx] = el;
                        }}
                        width={48}
                        height={46}
                        className="w-full h-full block pixelated"
                      />
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xs font-semibold text-[#f0f2f6]">{npc.name}</span>
                    <span className="text-[10px] text-[#9aa1ae]">{npc.tag}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {npc.species && npc.species !== 'human' ? (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-[#14222e] text-[#6be6ff] border border-[#274b69] font-semibold">
                          种族:{npc.speciesName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#181b20] text-[#cfd3dc] border border-[#2d323c]">
                          {npc.partsMeta?.suitName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1f2937] text-[#96ebff] border border-[#374b66]">
                          待机:{npc.idleShortName || npc.idleName}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-[#181b20] text-[#f5d0a9] border border-[#3a3228]">
                          发:{npc.partsMeta?.hairName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#181b20] text-[#cfd3dc] border border-[#2d323c]">
                          套:{npc.partsMeta?.suitName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1f2937] text-[#96ebff] border border-[#374b66]">
                          待机:{npc.idleShortName || npc.idleName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            npc.look?.back === 'cape'
                              ? 'bg-[#362020] text-[#f2c4c0] border-[#7a2822]'
                              : npc.look?.back === 'pack'
                              ? 'bg-[#222c38] text-[#c5dcf2] border-[#3f5a82]'
                              : 'bg-[#181b20] text-[#9aa1ae] border-[#2d323c]'
                          }`}
                        >
                          背:{npc.partsMeta?.backName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: 8-Frame Stepped Action, Bent-Elbow Sword & Weapon Layer Inspector */}
        <section
          id="inspector-section"
          className="bg-[#1c1f26] border border-[#2d313b] rounded-lg p-5 flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#f0f2f6]">
                03. 铁质长刀(4连)/铁质巨剑(2连·肩扛)/铁质长剑(3连) 纯白刀光与全动作检视（当前角色：{activeInspectSpec?.name}）
              </h2>
              <p className="text-xs text-[#9aa1ae] mt-0.5">
                手臂与武器围绕肩膀支点独立解耦并与躯干联动；所有随机生成的人类/异星 NPC 均可直接拿起铁质长刀、肩扛铁质大剑或铁质长剑打出完整连段
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Character Picker */}
              <div className="flex items-center gap-1 bg-[#14161a] p-1 rounded-lg border border-[#2a2e37]">
                {stageSpecs.map((c: any, idx: number) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setInspectCustomSpec(null);
                      setInspectCharIdx(idx);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      !inspectCustomSpec && inspectCharIdx === idx
                        ? 'bg-[#2e3543] text-white'
                        : 'text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                {inspectCustomSpec && (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#ef7b3a] text-[#14161a] whitespace-nowrap shrink-0">
                    随机NPC：{inspectCustomSpec.name}
                  </span>
                )}
              </div>

              {/* Weapon Picker in Inspector */}
              <div className="flex items-center gap-1 bg-[#14161a] p-1 rounded-lg border border-[#2a2e37]">
                {[
                  { id: 'none', label: '空手' },
                  { id: 'katana', label: '铁质长刀 (刀模组·4连)' },
                  { id: 'greatsword', label: '铁质大剑 (肩扛巨剑·2连)' },
                  { id: 'blade', label: '铁质长剑 (剑模组·3连)' },
                  { id: 'pistol', label: '脉冲手枪' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    data-testid={`inspector-weapon-${w.id}`}
                    onClick={() => {
                      setInspectWeapon(w.id);
                      if (w.id === 'katana' && ['swordCombo', 'greatswordCombo', 'greatswordCleave'].includes(inspectMode)) {
                        setInspectMode('katanaCombo');
                      } else if (w.id === 'greatsword' && ['swordCombo', 'katanaCombo', 'katanaIai'].includes(inspectMode)) {
                        setInspectMode('greatswordCombo');
                      } else if (w.id === 'blade' && ['katanaCombo', 'katanaIai', 'greatswordCombo', 'greatswordCleave'].includes(inspectMode)) {
                        setInspectMode('swordCombo');
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      inspectWeapon === w.id
                        ? 'bg-[#2e333d] text-[#eef1f6]'
                        : 'text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {/* Suit Toggle in Inspector */}
              <button
                type="button"
                onClick={() => setInspectSuit((s) => !s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  inspectSuit
                    ? 'bg-[#39455a] border-[#7fb4e6] text-[#d6efff]'
                    : 'bg-[#14161a] border-[#2a2e37] text-[#9aa1ae] hover:text-white'
                }`}
              >
                <Rocket className="w-3.5 h-3.5" />
                检视太空服图层：{inspectSuit ? '开启' : '关闭'}
              </button>
            </div>
          </div>

          {/* Action Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#14161a] p-1.5 rounded-lg border border-[#2a2e37]">
            {ACTION_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`action-${m.id}`}
                onClick={() => {
                  setInspectMode(m.id);
                  if (m.id === 'katanaCombo' || m.id === 'katanaIai') setInspectWeapon('katana');
                  else if (m.id === 'greatswordCombo' || m.id === 'greatswordCleave') setInspectWeapon('greatsword');
                  else if (m.id === 'swordCombo' || m.id === 'horizSlash' || m.id === 'swordSkill' || m.id === 'bladeSwing') setInspectWeapon('blade');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  inspectMode === m.id
                    ? 'bg-[#2e3543] text-white shadow-sm'
                    : 'text-[#9aa1ae] hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 10-Idle Quick Switcher when inspecting 45° / Side Idle */}
          {inspectMode === 'idle' && (
            <div className="flex flex-col gap-2 bg-[#14161a] p-3 rounded-lg border border-[#2a2e37]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#eef1f6] whitespace-nowrap">
                    切换检视 16 种日常自然站立姿势（8帧平滑过渡·无跳跃）：
                  </span>
                  <button
                    type="button"
                    data-testid="toggle-inspect-idle-side"
                    onClick={() => setInspectIdleSideView((v) => !v)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#232730] border border-[#3d4454] text-[#6be6ff] hover:border-[#6be6ff]"
                  >
                    待机视角：{inspectIdleSideView ? '侧面待机 (Side Profile · 高对比肢体细节)' : '45° 待机 (3/4 View)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectIdleOverride('default')}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      inspectIdleOverride === 'default'
                        ? 'bg-[#2e3543] text-white font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    角色默认 ({activeInspectSpec?.idleShortName || activeInspectSpec?.idle})
                  </button>
                {(Cast.NPC_PARTS?.IDLES || []).map((idItem: any) => (
                  <button
                    key={idItem.id}
                    type="button"
                    data-testid={`inspect-idle-${idItem.id}`}
                    onClick={() => setInspectIdleOverride(idItem.id)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      inspectIdleOverride === idItem.id
                        ? 'bg-[#ef7b3a] text-[#14161a] font-semibold'
                        : 'bg-[#1c1f26] text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    {idItem.name}
                  </button>
                  ))}
                </div>
              </div>
              {(() => {
                const curIdleId =
                  inspectIdleOverride && inspectIdleOverride !== 'default'
                    ? inspectIdleOverride
                    : activeInspectSpec?.idle;
                const curIdleMeta = (Cast.NPC_PARTS?.IDLES || []).find((x: any) => x.id === curIdleId);
                return curIdleMeta ? (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#c5ccd9]">
                    <span>
                      <strong className="text-[#f0f2f6]">当前待机：</strong>
                      {curIdleMeta.name}
                    </span>
                    <span>
                      <strong className="text-[#96ebff]">手部动作：</strong>
                      {curIdleMeta.handDesc}
                    </span>
                    <span>
                      <strong className="text-[#ffd257]">腿部动作：</strong>
                      {curIdleMeta.legDesc}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* 8-Frame Strip */}
          <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: inspectFrameCount }).map((_, i) => (
              <div
                key={i}
                className="bg-[#232730] border border-[#343946] rounded-md p-2 flex flex-col items-center gap-1.5"
              >
                <div className="w-full aspect-[9/7] bg-[#8b909c] rounded overflow-hidden">
                  <canvas
                    ref={(el) => {
                      inspectorCanvasRefs.current[i] = el;
                    }}
                    width={72}
                    height={56}
                    className="w-full h-full block pixelated"
                  />
                </div>
                <span className="text-[11px] font-mono text-[#c5ccd9] tabular-nums text-center">
                  {inspectFrameLabels[i] || `Frame ${i + 1}`}
                </span>
              </div>
            ))}
          </div>

          {/* 6-Panel Decoupled Layer Breakdown (including Detached Orbit FX Layer) */}
          <div className="bg-[#14161a] border border-[#2a2e37] rounded-lg p-3.5 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#e3e9f1]">
                独立手臂、铁质武器与脱离角色独立刀气层六层剥离预览（72×56 超宽画布 · 当前角色：{activeInspectSpec?.name} · 武器：{inspectWeapon === 'katana' ? '铁质长刀(4连)' : inspectWeapon === 'greatsword' ? '铁质大剑(2连·肩扛)' : inspectWeapon === 'blade' ? '铁质长剑(3连)' : inspectWeapon === 'pistol' ? '脉冲手枪' : '空手'}）
              </span>
              <span className="text-[11px] text-[#9aa1ae]">
                绘制顺序：1. 后臂层 (backArm) → 2. 躯干腿部层 (body) → 3. 武器与3D刀光层 (weapon) → 4. 前臂层 (frontArm) → 5. 独立世界刀气层 (detachedFX·不随人动) ＝ 6. 最终合成
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                '1. 后臂层 (backArm)',
                '2. 躯干与腿部联动 (body)',
                '3. 铁质武器与3D刀光 (weapon)',
                '4. 前臂握持层 (frontArm)',
                '5. 独立刀气特效层 (detachedFX)',
                '6. 完整合成 (composite)',
              ].map((title, idx) => (
                <div
                  key={title}
                  className="bg-[#20242c] border border-[#323744] rounded-md p-2 flex flex-col items-center gap-1.5"
                >
                  <div className="w-36 h-[112px] bg-[#8b909c] rounded overflow-hidden">
                    <canvas
                      ref={(el) => {
                        layerCanvasRefs.current[idx] = el;
                      }}
                      width={72}
                      height={56}
                      className="w-full h-full block pixelated"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#b8c4d9] text-center">{title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Exported Files Download & Source Code Viewer */}
        <section
          id="downloads-section"
          className="bg-[#1c1f26] border border-[#2d313b] rounded-lg p-5 flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#f0f2f6]">
                03. 成品文件下载与源码预览
              </h2>
              <p className="text-xs text-[#9aa1ae] mt-0.5">
                所有文件已同步更新苏的待机修复、第 6 角色「星」及太空服/瞬移/冲刺系统，可直接下载单文件版或完整压缩包
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/pixelcast/pixelcast_demo.html"
                download="pixelcast_demo.html"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#2e3543] text-white hover:bg-[#3a4354] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                下载 pixelcast_demo.html
              </a>
              <a
                href="/pixelcast/pixelcast_all.zip"
                download="pixelcast_all.zip"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#ef7b3a] text-[#14161a] hover:bg-[#ff8f52] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                下载 pixelcast_all.zip
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {FILES_LIST.map((f) => (
              <div
                key={f.name}
                className="bg-[#14161a] border border-[#2a2e37] rounded-lg p-3 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-[#e3e9f1]">{f.name}</span>
                    <a
                      href={f.path}
                      download={f.name}
                      className="text-xs text-[#96ebff] hover:underline whitespace-nowrap shrink-0"
                    >
                      下载
                    </a>
                  </div>
                  <p className="text-[11px] text-[#9aa1ae] mt-1 leading-snug">{f.desc}</p>
                </div>
                {!f.name.endsWith('.zip') && (
                  <button
                    type="button"
                    onClick={() => setActiveFileTab(f.name)}
                    className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                      activeFileTab === f.name ? 'text-[#ef7b3a]' : 'text-[#9aa1ae] hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    {activeFileTab === f.name ? '正在预览源码' : '预览文件内容'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="bg-[#121418] border border-[#262a32] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#181b20] border-b border-[#262a32]">
              <div className="flex items-center gap-2 text-xs font-mono text-[#cfd3dc]">
                <FileCode className="w-3.5 h-3.5 text-[#96ebff]" />
                <span>{activeFileTab}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(fileContent);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-[#232730] text-[#d5d9e2] hover:bg-[#2e3440] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制代码'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-[#cfd3dc] overflow-x-auto max-h-[340px] leading-relaxed">
              <code>{fileContent}</code>
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
