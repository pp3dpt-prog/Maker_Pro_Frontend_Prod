// Pré-visualização em tempo real da "Caixa PCB" (caixa-pcb-universal / -rpi4 / -rpi-zero).
//
// Replica a geometria de Maker_Pro_Docker_Prod/templates/caixa_pcb.scad (os nomes das
// funções são os mesmos): corpo com postes, ranhuras, recortes, orelhas e nós da dobradiça,
// e tampa com rebordo — em orientação de impressão, lado a lado, como o STL gerado no
// backend. Origem no canto inferior esquerdo do corpo. O STL final continua a vir do OpenSCAD.

import * as THREE from 'three';
import { ConvexGeometry } from 'three-stdlib';

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean) => (v === undefined || v === null ? d : v === true || v === 1 || v === 'true');
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

/** Detecção pelo schema: pcb_w/pcb_l/pcb_h numéricos + hinge_type (só as caixas PCB). */
export function isCaixaPcb(p: Record<string, any> | null | undefined): boolean {
  return !!p && typeof p.pcb_w === 'number' && typeof p.pcb_l === 'number'
    && typeof p.pcb_h === 'number' && typeof p.hinge_type === 'string';
}

// Constantes derivadas — mesmas definições (e limites) que as funções do .scad.
function medidas(p: Record<string, any>) {
  const PW = Math.max(num(p.pcb_w, 50), 10);
  const PL = Math.max(num(p.pcb_l, 70), 10);
  const PH = Math.max(num(p.pcb_h, 12), 3);
  const WALL = Math.max(num(p.wall, 2.5), 1.2);
  const BOT = Math.max(num(p.bottom, 2), 1.2);
  const GAP = Math.max(num(p.lid_gap, 0.25), 0.1);
  const EW = PW + 2 * WALL, EL = PL + 2 * WALL, HB = BOT + PH;
  const LIDT = Math.max(WALL, 1.6);
  const LIPH = Math.min(2.5, PH - 1), LIPT = 1.2;

  const POSTS = bool(p.screw_posts, true);
  const POSTD = Math.max(num(p.post_d, 4.5), 3.2);
  const POSTH = Math.min(Math.max(num(p.post_h, 6), 2), PH - 1);
  const ZP = BOT + (POSTS ? POSTH : 0);

  const VENTS = bool(p.vent_slots, false);
  const VENTW = Math.max(num(p.vent_w, 1.5), 0.8);
  const GPIO = bool(p.gpio_cutout, false);
  const GPIOW = Math.min(Math.max(num(p.gpio_w, 15), 1), PW - 2);
  const GPIOH = Math.max(Math.min(num(p.gpio_h, 8), HB - ZP - 1), 1);
  const USB = bool(p.usb_cutout, false);
  const t = str(p.usb_type, 'c');
  const USBDIM: [number, number] = t === 'micro' ? [7.5, 2.8] : t === 'mini' ? [8.0, 3.5] : t === 'usb_a' ? [12.5, 5.5] : [9.0, 3.2];
  const USBH = Math.max(Math.min(USBDIM[1] + 1, HB - ZP - 1), 1);
  const EARS = bool(p.mount_ears, false);
  const EARD = Math.max(num(p.ear_hole_d, 4.2), 3);

  const LIVING = str(p.hinge_type, 'pin') === 'living';
  const HN = Math.round(Math.min(Math.max(num(p.hinge_count, 2), 2), 4));
  const PIND = Math.max(num(p.hinge_pin_d, 1.6), 1.2);
  const KR = PIND / 2 + 1.4, KDY = KR + 0.2, HGAP = 0.3;
  const ZA = HB + HGAP + LIDT - KR;
  const PITCH = EW / HN;
  const LK = Math.min(8, (PITCH - 3) / 2);
  const STRAP_T = 0.6, STRAP_L = HB + LIDT + 2;
  return { PW, PL, PH, WALL, BOT, GAP, EW, EL, HB, LIDT, LIPH, LIPT, POSTS, POSTD, POSTH, ZP, VENTS, VENTW,
    GPIO, GPIOW, GPIOH, USB, USBDIM, USBH, EARS, EARD, LIVING, HN, PIND, KR, KDY, ZA, PITCH, LK, STRAP_T, STRAP_L };
}

type M = ReturnType<typeof medidas>;

const rectPath = (x: number, y: number, w: number, h: number, Cls: typeof THREE.Path = THREE.Path) => {
  const p = new Cls();
  p.moveTo(x, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h); p.lineTo(x, y + h); p.lineTo(x, y);
  return p;
};
const circPath = (cx: number, cy: number, r: number) => {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
};
const rectShape = (x: number, y: number, w: number, h: number) => rectPath(x, y, w, h, THREE.Shape as any) as THREE.Shape;

function extrudir(shape: THREE.Shape | THREE.Shape[], depth: number): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
}
const caixa = (x: number, y: number, z: number, w: number, d: number, h: number) => {
  const g = new THREE.BoxGeometry(w, d, h);
  g.translate(x + w / 2, y + d / 2, z + h / 2);
  return g;
};

// Parede no plano XZ (frente/trás) ou YZ (lados): o shape está em (u, v) = (x|y, z) e é
// extrudido na espessura. A base (u,v,w) → mundo é uma rotação (det +1).
function parede(shape: THREE.Shape, t: number, plano: 'xz' | 'yz', pos: number): THREE.BufferGeometry {
  const g = extrudir(shape, t);
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  if (plano === 'xz') {
    g.applyMatrix4(new THREE.Matrix4().makeBasis(X, Z, Y.clone().negate())); // w → -y
    g.translate(0, pos + t, 0);                                              // ocupa y ∈ [pos, pos + t]
  } else {
    g.applyMatrix4(new THREE.Matrix4().makeBasis(Y, Z, X));                   // w → +x
    g.translate(pos, 0, 0);
  }
  return g;
}

function ranhurasLado(m: M): { u: number; w: number; v0: number; v1: number }[] {
  const h = m.HB - m.BOT - 4, pitch = m.VENTW * 2.5, n = Math.floor((m.PL - 8) / pitch);
  const out: { u: number; w: number; v0: number; v1: number }[] = [];
  if (h >= 2 && n >= 1) {
    for (let i = 0; i < n; i++) {
      out.push({ u: m.WALL + m.PL / 2 + (i - (n - 1) / 2) * pitch - m.VENTW / 2, w: m.VENTW, v0: m.BOT + 2, v1: m.BOT + 2 + h });
    }
  }
  return out;
}

// Casco convexo de um cilindro (eixo X) e de um rectângulo — como o hull() do .scad.
function no(m: M, x0: number, yc: number, zc: number, rect: [number, number, number, number, number, number]): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const N = 24;
  for (const x of [x0, x0 + m.LK])
    for (let i = 0; i < N; i++) {
      const a = (2 * Math.PI * i) / N;
      pts.push(new THREE.Vector3(x, yc + m.KR * Math.cos(a), zc + m.KR * Math.sin(a)));
    }
  const [rx, ry, rz, rw, rd, rh] = rect;
  for (const x of [rx, rx + rw]) for (const y of [ry, ry + rd]) for (const z of [rz, rz + rh]) pts.push(new THREE.Vector3(x, y, z));
  return new ConvexGeometry(pts);
}

function construirCorpo(m: M, mat: THREE.Material): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const add = (g: THREE.BufferGeometry) => meshes.push(new THREE.Mesh(g, mat));
  const { EW, EL, HB, BOT, WALL, ZP } = m;

  add(caixa(0, 0, 0, EW, EL, BOT)); // fundo

  // frente (recorte GPIO) e trás
  const frente = rectShape(0, 0, EW, HB);
  if (m.GPIO) frente.holes.push(rectPath(EW / 2 - m.GPIOW / 2, ZP, m.GPIOW, m.GPIOH));
  add(parede(frente, WALL, 'xz', 0));
  add(parede(rectShape(0, 0, EW, HB), WALL, 'xz', EL - WALL));

  // lados (u = y entre as paredes de frente e de trás)
  const lado = (esq: boolean) => {
    const s = rectShape(WALL, 0, EL - 2 * WALL, HB);
    let usb: [number, number, number, number] | null = null;
    if (esq && m.USB) {
      const w = Math.min(m.USBDIM[0], m.PL - 2);
      usb = [EL / 2 - w / 2, ZP, w, m.USBH];
      s.holes.push(rectPath(usb[0], usb[1], usb[2], usb[3]));
    }
    if (m.VENTS) {
      for (const r of ranhurasLado(m)) {
        // o OpenSCAD une os cortes; aqui evita-se a sobreposição de buracos
        if (usb && r.u < usb[0] + usb[2] && r.u + r.w > usb[0] && r.v0 < usb[1] + usb[3] && r.v1 > usb[1]) continue;
        s.holes.push(rectPath(r.u, r.v0, r.w, r.v1 - r.v0));
      }
    }
    add(parede(s, WALL, 'yz', esq ? 0 : EW - WALL));
  };
  lado(true); lado(false);

  // postes com furo-piloto
  if (m.POSTS) {
    for (const x of [WALL + 3.5, WALL + m.PW - 3.5]) for (const y of [WALL + 3.5, WALL + m.PL - 3.5]) {
      const s = new THREE.Shape(); s.absarc(x, y, m.POSTD / 2, 0, Math.PI * 2, false);
      s.holes.push(circPath(x, y, 1.25));
      const g = extrudir(s, m.POSTH); g.translate(0, 0, BOT);
      add(g);
    }
  }

  // orelhas (nos dois lados compridos)
  if (m.EARS) {
    const ET = Math.max(BOT, 2);
    const ys = EL >= 50 ? [EL * 0.25, EL * 0.75] : [EL / 2];
    for (const lado of [-1, 1]) for (const y of ys) {
      const cx = lado < 0 ? -5 : EW + 5, x0 = lado < 0 ? 0 : EW;
      const s = new THREE.Shape();
      s.moveTo(x0, y - 5); s.lineTo(cx, y - 5);
      if (lado < 0) s.absarc(cx, y, 5, -Math.PI / 2, -1.5 * Math.PI, true);
      else s.absarc(cx, y, 5, -Math.PI / 2, Math.PI / 2, false);
      s.lineTo(x0, y + 5); s.lineTo(x0, y - 5);
      s.holes.push(circPath(cx, y, m.EARD / 2));
      add(extrudir(s, ET));
    }
  }

  // dobradiça
  if (m.LIVING) {
    add(caixa(2, EL - 1, 0, EW - 4, m.STRAP_L + 1, m.STRAP_T));
  } else {
    for (let i = 0; i < m.HN; i++) {
      const x0 = m.PITCH * (i + 0.5) - m.LK - 0.2;
      add(no(m, x0, EL + m.KDY, m.ZA, [x0, EL - WALL, HB - 0.01, m.LK, WALL, 0.01]));
    }
  }
  return meshes;
}

function construirTampa(m: M, mat: THREE.Material): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const add = (g: THREE.BufferGeometry) => meshes.push(new THREE.Mesh(g, mat));
  const { EW, EL, WALL, LIDT } = m;

  // placa; no modo "pin" tem folgas para os nós do corpo (intervalos intercalados)
  const placa = new THREE.Shape();
  placa.moveTo(0, 0); placa.lineTo(EW, 0); placa.lineTo(EW, EL);
  if (!m.LIVING) {
    for (let i = m.HN - 1; i >= 0; i--) {
      const a = m.PITCH * (i + 0.5) + 0.2 - 0.3, b = a + m.LK + 0.6;
      placa.lineTo(b, EL); placa.lineTo(b, EL - WALL); placa.lineTo(a, EL - WALL); placa.lineTo(a, EL);
    }
  }
  placa.lineTo(0, EL); placa.lineTo(0, 0);
  add(extrudir(placa, LIDT));

  // rebordo que encaixa na cavidade com a folga lid_gap
  const ox = WALL + m.GAP, oy = WALL + m.GAP, ow = m.PW - 2 * m.GAP, oh = m.PL - 2 * m.GAP;
  const anel = rectShape(ox, oy, ow, oh);
  anel.holes.push(rectPath(ox + m.LIPT, oy + m.LIPT, ow - 2 * m.LIPT, oh - 2 * m.LIPT));
  const g = extrudir(anel, m.LIPH); g.translate(0, 0, LIDT);
  add(g);

  if (m.LIVING) {
    add(caixa(2, -m.STRAP_L - 1, 0, EW - 4, m.STRAP_L + 1.01, m.STRAP_T));
  } else {
    for (let i = 0; i < m.HN; i++) {
      const x0 = m.PITCH * (i + 0.5) - m.LK - 0.2;
      add(no(m, x0, EL + m.KDY, m.KR, [x0, EL - 0.01, 0, m.LK, 0.01, LIDT]));
    }
  }
  return meshes;
}

/** Constrói corpo + tampa lado a lado (a tampa à direita; no modo "living", atrás). */
export function construirCaixaPcb(
  params: Record<string, any>, cores = { corpo: '#60a5fa', tampa: '#93c5fd' },
): THREE.Group {
  const m = medidas(params);
  const matCorpo = new THREE.MeshStandardMaterial({ color: cores.corpo, metalness: 0.1, roughness: 0.55 });
  const matTampa = new THREE.MeshStandardMaterial({ color: cores.tampa, metalness: 0.1, roughness: 0.55 });
  const grupo = new THREE.Group();
  for (const me of construirCorpo(m, matCorpo)) grupo.add(me);
  const tampa = new THREE.Group();
  for (const me of construirTampa(m, matTampa)) tampa.add(me);
  tampa.position.set(m.LIVING ? 0 : m.EW + 25, m.LIVING ? m.EL + m.STRAP_L + 1 : 0, 0);
  grupo.add(tampa);
  return grupo;
}

export function libertarCaixaPcb(grupo: THREE.Group) {
  const mats = new Set<THREE.Material>();
  grupo.traverse((o) => {
    const me = o as THREE.Mesh;
    if (me.geometry) me.geometry.dispose();
    if (me.material) mats.add(me.material as THREE.Material);
  });
  mats.forEach((x) => x.dispose());
}
