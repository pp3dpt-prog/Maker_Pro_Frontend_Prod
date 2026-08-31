'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader, FontLoader, TextGeometry, toCreasedNormals } from 'three-stdlib';
import ClipperLib from 'clipper-lib';

type Preview3DProps = {
  params: Record<string, any>;
  stlFilePath?: string | null;
  coresPatamares?: string[];
  pecasCaixaLuz?: string[]; // que peças mostrar em conjunto (corpo/tampa/nome) — só letra-caixa-luz
};

const FONT_MAP: Record<string, string> = {
  'Aladin':              '/fonts/Aladin.json',
  'Amarante':            '/fonts/Amarante.json',
  'Benne':               '/fonts/Benne.json',
  'Baloo 2':             '/fonts/Baloo2.json',
  'Anton':               '/fonts/Anton.json',
  'Chewy':               '/fonts/Chewy.json',
  'Gloria Hallelujah':   '/fonts/Gloria_Hallelujah.json',
  'Lobster':             '/fonts/Lobster.json',
  'Luckiest Guy':        '/fonts/Luckiest_Guy.json',
  'Oswald':              '/fonts/Oswald_Bold.json',
  'Pacifico':            '/fonts/Pacifico.json',
  'Press Start 2P':      '/fonts/Press_Start_2P.json',
  'Racing Sans One':     '/fonts/Racing_Sans_One.json',
  'Sigmar One':          '/fonts/Sigmar_One.json',
};

// Letras Decorativas — fontes "de sistema" do backend (Liberation/Ubuntu/DejaVu/URW
// Chancery) aproximadas com as mais próximas do Google Fonts (preview, não afeta o
// STL final) + as fontes decorativas do FONT_MAP (as mesmas do porta-chaves — essas
// já estão instaladas no backend Docker e usadas tal e qual, sem aproximação).
const LETRA_FONT_MAP: Record<string, string> = {
  ...FONT_MAP,
  'Moderno':      '/fonts/Letra_Moderno.json',
  'Clássico':     '/fonts/Letra_Classico.json',
  'Arredondado':  '/fonts/Letra_Arredondado.json',
};
const NOME_FONT_MAP: Record<string, string> = {
  ...FONT_MAP,
  'Cursiva Elegante':  '/fonts/Nome_CursivaElegante.json',
  'Itálico Clássico':  '/fonts/Nome_ItalicoClassico.json',
  'Itálico Moderno':   '/fonts/Nome_ItalicoModerno.json',
};

// ── Pet Tag: carrega STL em branco e sobrepõe texto em tempo real ──
function PetTagModel({
  stlFilePath,
  params,
  showText,
}: {
  stlFilePath: string;
  params: Record<string, any>;
  showText: boolean;
}) {
  const [bodyMesh,  setBodyMesh]  = useState<THREE.Mesh | null>(null);
  const [frontText, setFrontText] = useState<THREE.Mesh | null>(null);
  const [backText,  setBackText]  = useState<THREE.Mesh | null>(null);
  const [stlHeight, setStlHeight] = useState(3);
  const [stlOffsetY, setStlOffsetY] = useState(0); // offset Y do centro geométrico

  // Carregar STL em branco
  useEffect(() => {
    const loader = new STLLoader();
    loader.load(stlFilePath, (geometry: THREE.BufferGeometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const box = geometry.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Guardar offset Y antes de centrar
      // Este valor é a diferença entre a origem OpenSCAD e o centro geométrico
      setStlOffsetY(center.y);
      setStlHeight(box.max.z - box.min.z);

      // Centrar em X e Y, ancorar em Z=0
      geometry.translate(-center.x, -center.y, -box.min.z);

      setBodyMesh(new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: '#93c5fd',
          metalness: 0.1,
          roughness: 0.4,
        })
      ));
    });
  }, [stlFilePath]);

  // Regenerar texto sempre que params mudam
  useEffect(() => {
    if (!showText) {
      setFrontText(null);
      setBackText(null);
      return;
    }

    // Limpar texto anterior enquanto carrega nova fonte
    setFrontText(null);
    setBackText(null);

    let cancelled = false;

    const nomePet   = String(params.nome_pet  ?? '');
    const telefone  = String(params.telefone  ?? '');
    const fonteName = String(params.fonte     ?? 'Aladin');
    const fontSize  = Number(params.fontSize  ?? 7);
    const fontSizeN = Number(params.fontSizeN ?? 6);
    const xPos      = Number(params.xPos  ?? 0);
    const yPos      = Number(params.yPos  ?? 0);
    const xPosN     = Number(params.xPosN ?? 0);
    const yPosN     = Number(params.yPosN ?? 0);

    const fontPath = FONT_MAP[fonteName] ?? FONT_MAP['Aladin'];
    const fontLoader = new FontLoader();

    fontLoader.load(
      fontPath,
      (font) => {
        if (cancelled) return;

        // Texto frente (nome)
        if (nomePet) {
          const geomFront = new TextGeometry(nomePet, {
            font,
            size: fontSize,
            height: 0.8,
            curveSegments: 8,
          });
          geomFront.computeBoundingBox();
          const fb = geomFront.boundingBox!;
          const fw = fb.max.x - fb.min.x;
          const fh = fb.max.y - fb.min.y;

          // Compensar offset Y do STL para que yPos=0 corresponda
          // ao mesmo ponto que no OpenSCAD
          geomFront.translate(
            -fw / 2 + xPos,
            -fh / 2 + yPos - stlOffsetY,
            0
          );

          setFrontText(new THREE.Mesh(
            geomFront,
            new THREE.MeshStandardMaterial({
              color: '#1e3a5f',
              metalness: 0.2,
              roughness: 0.3,
            })
          ));
        } else {
          setFrontText(null);
        }

        // Texto verso (telefone)
        if (telefone) {
          const geomBack = new TextGeometry(telefone, {
            font,
            size: fontSizeN,
            height: 0.8,
            curveSegments: 8,
          });
          geomBack.computeBoundingBox();
          const bb = geomBack.boundingBox!;
          const bw = bb.max.x - bb.min.x;
          const bh = bb.max.y - bb.min.y;

          geomBack.translate(
            -bw / 2 + xPosN,
            -bh / 2 + yPosN - stlOffsetY,
            0
          );

          setBackText(new THREE.Mesh(
            geomBack,
            new THREE.MeshStandardMaterial({
              color: '#1e3a5f',
              metalness: 0.2,
              roughness: 0.3,
            })
          ));
        } else {
          setBackText(null);
        }
      },
      undefined,
      (err) => {
        console.error('Erro ao carregar fonte:', fontPath, err);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    showText,
    stlOffsetY, // ← importante: regenerar texto quando o offset mudar
    params.nome_pet,
    params.telefone,
    params.fonte,
    params.fontSize,
    params.fontSizeN,
    params.xPos,
    params.yPos,
    params.xPosN,
    params.yPosN,
  ]);

  if (!bodyMesh) return null;

  return (
    <group>
      {/* Corpo em branco */}
      <primitive object={bodyMesh} />

      {/* Texto frente — acima da superfície */}
      {showText && frontText && (
        <primitive object={frontText} position={[0, 0, stlHeight]} />
      )}

      {/* Texto verso — espelhado, abaixo de Z=0 */}
      {showText && backText && (
        <primitive
          object={backText}
          position={[0, 0, -0.8]}
          rotation={[0, Math.PI, 0]}
        />
      )}
    </group>
  );
}

// Aplica twist por vértice — simula linear_extrude(twist=...) do OpenSCAD
function applyTwist(geom: THREE.BufferGeometry, twistDeg: number) {
  if (twistDeg === 0) return;
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const zRange = bb.max.z - bb.min.z;
  if (zRange === 0) return;
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z   = pos.getZ(i);
    const t   = (z - bb.min.z) / zRange;          // 0 na base, 1 no topo
    const ang = THREE.MathUtils.degToRad(twistDeg * t);
    const x   = pos.getX(i);
    const y   = pos.getY(i);
    pos.setX(i, x * Math.cos(ang) - y * Math.sin(ang));
    pos.setY(i, x * Math.sin(ang) + y * Math.cos(ang));
  }
  pos.needsUpdate = true;
}

// Recalcula normais respeitando cantos vivos (>creaseAngleDeg), evita picos/sombras
// artificiais nos limites entre face frontal e laterais das letras extrudidas.
// Devolve uma NOVA geometria — o chamador deve usar o valor retornado.
function withCreasedNormals(
  geom: THREE.BufferGeometry,
  creaseAngleDeg = 30
): THREE.BufferGeometry {
  const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
  const creased = toCreasedNormals(
    nonIndexed,
    THREE.MathUtils.degToRad(creaseAngleDeg)
  ) as THREE.BufferGeometry;
  creased.computeBoundingBox();
  creased.computeBoundingSphere();
  return creased;
}

// ── NameKey: portachaves com letras individuais em 3D ──
function NameKeyPreview({ params }: { params: Record<string, any> }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);

  const fontPath = FONT_MAP[String(params.Font_name || '')] ?? FONT_MAP['Aladin'];

  const depsKey = JSON.stringify({
    t: params.Text, fn: params.Font_name, c: params.center, tw: params.twist,
    lx: params.Loop_x_position, ly: params.Loop_y_position, lc: params.Loop_character,
    ...Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [
        [`letter_${i+1}_space`, params[`letter_${i+1}_space`]],
        [`letter_${i+1}_height`, params[`letter_${i+1}_height`]],
      ]).flat()
    )
  });

  useEffect(() => {
    let cancelled = false;
    const text     = String(params.Text || 'KEY').slice(0, 13);
    const center   = Number(params.center  ?? 30);
    const twist    = Number(params.twist   ?? -5);
    const loopX    = Number(params.Loop_x_position ?? 10);
    const loopY    = Number(params.Loop_y_position  ?? 0);
    const loopChar = String(params.Loop_character || 'o');

    const defSpaces = [0, 10, 8, 9, 9, 8.6, 14, 9.5, 9.7, 9.6, 9.6, 9.4, 9.5, 20];
    const getSpace  = (i: number) => Number(params[`letter_${i}_space`]  ?? defSpaces[i] ?? 9);
    const getHeight = (i: number) => Number(params[`letter_${i}_height`] ?? 3);

    new FontLoader().load(fontPath, (font) => {
      if (cancelled) return;
      const grp = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: '#93c5fd', metalness: 0.1, roughness: 0.4 });

      // Argola
      const loopGeom = new TextGeometry(loopChar, { font, size: 20, height: 3, curveSegments: 32 });
      loopGeom.rotateZ(-Math.PI / 2);
      const loopMesh = new THREE.Mesh(loopGeom, new THREE.MeshStandardMaterial({ color: '#60a5fa', metalness: 0.2, roughness: 0.3 }));
      loopMesh.position.set(-center - loopX, loopY, 0);
      grp.add(loopMesh);

      // Letras com twist
      for (let i = 0; i < text.length; i++) {
        const h    = getHeight(i + 1);
        const xPos = getSpace(i) * i - center;
        const geom = new TextGeometry(text[i], { font, size: 25, height: h, curveSegments: 32 });
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        geom.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
        applyTwist(geom, twist);
        const finalGeom = withCreasedNormals(geom, 30);
        const mesh = new THREE.Mesh(finalGeom, mat);
        mesh.position.set(xPos, 0, 0);
        grp.add(mesh);
      }

      setGroup(grp);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, fontPath]);

  if (!group) return null;
  return <primitive object={group} />;
}

// ── Letras Decorativas: letra inicial + nome encaixado, cores ao vivo ──
function LetraNomePreview({ params }: { params: Record<string, any> }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const meshRefs = useRef<{ letra?: THREE.Mesh; nome?: THREE.Mesh }>({});

  const letra            = String(params.letra || 'H').slice(0, 1) || ' ';
  const nome              = String(params.nome || '');
  const fonteInicialName  = String(params.fonte_inicial || 'Moderno');
  const fonteNomeName     = String(params.fonte_nome || 'Cursiva Elegante');
  const altura            = Number(params.altura ?? 150);
  // tamanho_nome é um parâmetro independente (antes vinha fixo em altura*0.38) —
  // o fallback preserva o preview enquanto a migração da BD não corre.
  const tamanhoNome       = Number(params.tamanho_nome ?? altura * 0.38);
  const espessuraInicial  = Number(params.espessura_inicial ?? 15);
  const espessuraNome     = Number(params.espessura_nome ?? 8);
  const sobreposicao      = Number(params.sobreposicao ?? 3);
  const posicaoNome       = Number(params.posicao_nome ?? 0);
  const corLetra          = String(params.cor_letra || '#16d8aa');
  const corNome           = String(params.cor_nome || '#f3f3f0');

  const fontInicialPath = LETRA_FONT_MAP[fonteInicialName] ?? LETRA_FONT_MAP['Moderno'];
  const fontNomePath    = NOME_FONT_MAP[fonteNomeName] ?? NOME_FONT_MAP['Cursiva Elegante'];

  // Chave de dependências geométricas — NÃO inclui cor (a cor é aplicada à parte, sem recarregar fontes)
  const geometryKey = JSON.stringify({
    letra, nome, fonteInicialName, fonteNomeName,
    altura, tamanhoNome, espessuraInicial, espessuraNome, sobreposicao, posicaoNome,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      new Promise<any>((resolve, reject) => new FontLoader().load(fontInicialPath, resolve, undefined, reject)),
      new Promise<any>((resolve, reject) => new FontLoader().load(fontNomePath, resolve, undefined, reject)),
    ])
      .then(([fontInicial, fontNome]) => {
        if (cancelled) return;
        const grp = new THREE.Group();

        // Letra inicial (corpo_caixa)
        const geomLetra = new TextGeometry(letra, {
          font: fontInicial, size: altura, height: espessuraInicial, curveSegments: 16,
        });
        geomLetra.computeBoundingBox();
        const bb = geomLetra.boundingBox!;
        geomLetra.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
        const matLetra = new THREE.MeshStandardMaterial({ color: corLetra, metalness: 0.15, roughness: 0.4 });
        const meshLetra = new THREE.Mesh(withCreasedNormals(geomLetra, 30), matLetra);
        meshRefs.current.letra = meshLetra;
        grp.add(meshLetra);

        // Nome decorativo (tampa_caixa) — encaixado perto da face frontal da letra
        if (nome) {
          const geomNome = new TextGeometry(nome, {
            font: fontNome, size: tamanhoNome, height: espessuraNome, curveSegments: 12,
          });
          geomNome.computeBoundingBox();
          const nb = geomNome.boundingBox!;
          geomNome.translate(-(nb.max.x + nb.min.x) / 2, -(nb.max.y + nb.min.y) / 2 + posicaoNome, 0);
          const matNome = new THREE.MeshStandardMaterial({ color: corNome, metalness: 0.1, roughness: 0.35 });
          const meshNome = new THREE.Mesh(withCreasedNormals(geomNome, 30), matNome);
          meshNome.position.z = espessuraInicial - sobreposicao;
          meshRefs.current.nome = meshNome;
          grp.add(meshNome);
        } else {
          meshRefs.current.nome = undefined;
        }

        setGroup(grp);
      })
      .catch((err) => console.error('Erro ao carregar fontes (Letra com Nome):', err));

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryKey, fontInicialPath, fontNomePath]);

  // Cor ao vivo: só actualiza o material, sem recarregar fontes/geometria
  useEffect(() => {
    if (meshRefs.current.letra) {
      (meshRefs.current.letra.material as THREE.MeshStandardMaterial).color.set(corLetra);
    }
    if (meshRefs.current.nome) {
      (meshRefs.current.nome.material as THREE.MeshStandardMaterial).color.set(corNome);
    }
  }, [corLetra, corNome, group]);

  if (!group) return null;
  return <primitive object={group} />;
}

// Constrói a "ponte" (hull de dois círculos iguais = cápsula) entre a argola
// e o início do texto, com um furo circular no centro da argola — replica
// ponte_base_2d()/o furo do template OpenSCAD (Docker:
// templates/portachaves_nome_multicor.scad).
function buildBridgeShape(radius: number, holeR: number, textoX: number, furoY: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, furoY + radius);
  shape.lineTo(textoX, furoY + radius);
  shape.absarc(textoX, furoY, radius, Math.PI / 2, -Math.PI / 2, true);
  shape.lineTo(0, furoY - radius);
  shape.absarc(0, furoY, radius, -Math.PI / 2, Math.PI / 2, true);

  const hole = new THREE.Path();
  hole.absarc(0, furoY, holeR, 0, Math.PI * 2, false);
  shape.holes.push(hole);
  return shape;
}

// Offset (buffer) real via Clipper — a mesma classe de algoritmo (Vatti
// clipping) usada por ferramentas de CNC/corte a laser para "engordar" um
// contorno com segurança. As três tentativas anteriores (bevel do
// ExtrudeGeometry, escala a partir de um centro, offset por vértice caseiro)
// falhavam de formas diferentes em cantos/traços que se aproximam demasiado
// uns dos outros — um offset "ingénuo" (vértice a vértice) pode ficar
// auto-intersectado quando `offsetMm` é maior do que a folga local (ex:
// traços finos ou cantos apertados de uma fonte bold/geométrica como a
// Anton), o que dava origem aos "picos" mesmo depois de limitar o desvio por
// vértice. O Clipper resolve esses auto-cruzamentos correctamente (é
// literalmente para isso que existe), incluindo o encolhimento/desaparecimento
// dos "olhos" das letras (a, e, o, ...) à medida que o contorno engrossa —
// tal como o minkowski real do OpenSCAD.
const CLIPPER_SCALE = 1000; // ~3 casas decimais de precisão em mm

function toClipperPath(pts: THREE.Vector2[]): ClipperLib.IntPoint[] {
  return pts.map(p => ({ X: Math.round(p.x * CLIPPER_SCALE), Y: Math.round(p.y * CLIPPER_SCALE) }));
}
function fromClipperPath(path: ClipperLib.IntPoint[]): THREE.Vector2[] {
  return path.map(p => new THREE.Vector2(p.X / CLIPPER_SCALE, p.Y / CLIPPER_SCALE));
}

// ── Reconstrói o "contorno" (minkowski com um círculo) do OpenSCAD via
// offset geométrico real (Clipper) de todas as letras em conjunto — feito
// de uma vez só para a palavra toda, para o Clipper também soldar
// naturalmente letras adjacentes que se toquem/sobreponham, tal como o
// minkowski real (que opera sobre a região 2D da palavra inteira).
// Contornos (limpos + com offset) do texto, em Paths do Clipper — usado
// sozinho (mid/topo) ou combinado com outra forma antes de extrudir (base,
// que precisa de se soldar com a ponte/argola — ver buildBaseLayerGeometry).
function getOffsetTextClipperPaths(font: any, text: string, size: number, offsetMm: number): ClipperLib.Paths {
  const shapes: THREE.Shape[] = font.generateShapes(text, size);
  const cleanAll: ClipperLib.Paths = [];
  for (const shape of shapes) {
    const { shape: outerPts, holes: holePtsArr } = shape.extractPoints(12);
    const rawPaths = [toClipperPath(outerPts), ...holePtsArr.map(toClipperPath)];
    // Alguns floreados de fontes cursivas (ex: maiúsculas da Pacifico) têm o
    // próprio contorno auto-intersectado — o ClipperOffset espera um
    // polígono simples à entrada, por isso limpamos primeiro com
    // SimplifyPolygons (regra non-zero), que resolve esses cruzamentos e as
    // relações buraco/sólido correctamente antes do offset em si.
    cleanAll.push(...ClipperLib.Clipper.SimplifyPolygons(rawPaths, ClipperLib.PolyFillType.pftNonZero));
  }
  if (offsetMm <= 0.05) return cleanAll;
  const co = new ClipperLib.ClipperOffset(2, 0.1 * CLIPPER_SCALE);
  co.AddPaths(cleanAll, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const tree = new ClipperLib.PolyTree();
  co.Execute(tree, offsetMm * CLIPPER_SCALE);
  return ClipperLib.Clipper.PolyTreeToPaths(tree);
}

function translateClipperPaths(paths: ClipperLib.Paths, dxMm: number): ClipperLib.Paths {
  const dx = Math.round(dxMm * CLIPPER_SCALE);
  return paths.map(path => path.map(p => ({ X: p.X + dx, Y: p.Y })));
}

function boundsYOfClipperPaths(paths: ClipperLib.Paths): { minY: number; maxY: number } {
  let minY = Infinity, maxY = -Infinity;
  for (const path of paths) for (const p of path) { if (p.Y < minY) minY = p.Y; if (p.Y > maxY) maxY = p.Y; }
  return { minY: minY / CLIPPER_SCALE, maxY: maxY / CLIPPER_SCALE };
}

function extrudeFromExPolyTree(tree: ClipperLib.PolyTree, depth: number): THREE.BufferGeometry {
  const exPolys = ClipperLib.JS.PolyTreeToExPolygons(tree);
  const shapes = exPolys.map(ep => {
    const s = new THREE.Shape(fromClipperPath(ep.outer));
    for (const h of ep.holes) s.holes.push(new THREE.Path(fromClipperPath(h)));
    return s;
  });
  return new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 24 });
}

function buildOffsetTextGeometry(font: any, text: string, size: number, depth: number, offsetMm: number): THREE.BufferGeometry {
  const shapes: THREE.Shape[] = font.generateShapes(text, size);
  if (offsetMm <= 0.05) {
    return new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 24 });
  }
  const co = new ClipperLib.ClipperOffset(2, 0.1 * CLIPPER_SCALE);
  for (const shape of shapes) {
    const { shape: outerPts, holes: holePtsArr } = shape.extractPoints(12);
    const rawPaths = [toClipperPath(outerPts), ...holePtsArr.map(toClipperPath)];
    const cleanPaths = ClipperLib.Clipper.SimplifyPolygons(rawPaths, ClipperLib.PolyFillType.pftNonZero);
    co.AddPaths(cleanPaths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  }
  const tree = new ClipperLib.PolyTree();
  co.Execute(tree, offsetMm * CLIPPER_SCALE);
  return extrudeFromExPolyTree(tree, depth);
}

// Camada base: solda o texto (já com offset) com a ponte/argola numa ÚNICA
// geometria via união booleana do Clipper, em vez de duas malhas
// independentes sobrepostas — duas malhas distintas com faces coincidentes
// na fronteira entre letras e ponte dão z-fighting visto quase a direito
// por cima (confirmado ao vivo: o ruído desaparecia em ângulos oblíquos —
// assinatura de faces quase coplanares de malhas diferentes, não um
// defeito na silhueta em si).
function buildBaseLayerGeometry(
  font: any, text: string, size: number, altura: number, offsetMm: number,
  bridgeRadius: number, furoR: number, textoX: number
): THREE.BufferGeometry {
  const textPaths = translateClipperPaths(getOffsetTextClipperPaths(font, text, size, offsetMm), textoX);
  const { minY, maxY } = boundsYOfClipperPaths(textPaths);
  const furoY = (minY + maxY) / 2;

  const bridgeShape = buildBridgeShape(bridgeRadius, furoR, textoX, furoY);
  const { shape: bridgeOuterPts, holes: bridgeHolePtsArr } = bridgeShape.extractPoints(24);
  const bridgePaths = [toClipperPath(bridgeOuterPts), ...bridgeHolePtsArr.map(toClipperPath)];

  const c = new ClipperLib.Clipper();
  c.AddPaths(textPaths, ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(bridgePaths, ClipperLib.PolyType.ptSubject, true);
  const tree = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

  return extrudeFromExPolyTree(tree, altura);
}

// ── Porta-chaves de texto com patamares: nome empilhado em até 3 níveis,
// cada nível um pouco mais "gordo" que o de cima (para trocar de filamento
// por camada) — replica templates/portachaves_nome_multicor.scad ──
const PATAMARES_DEFAULT_COLORS = ['#93c5fd', '#60a5fa', '#1e3a5f'];

function PatamaresKeyPreview({ params, colors }: { params: Record<string, any>; colors?: string[] }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const matRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  const fontPath = FONT_MAP[String(params.fonte || '')] ?? FONT_MAP['Aladin'];

  const depsKey = JSON.stringify({
    nome: params.nome, fonte: params.fonte, tamanho: params.tamanho,
    numCores: params.num_cores, altura: params.altura,
    offset1: params.offset_cor1, offset2: params.offset_cor2,
  });

  useEffect(() => {
    let cancelled = false;

    const nome     = String(params.nome ?? 'Nome');
    const tamanho  = Number(params.tamanho ?? 20);
    const numCores = Math.max(1, Math.min(3, Number(params.num_cores ?? 3)));
    const altura   = Number(params.altura ?? 2);
    const offset1  = Number(params.offset_cor1 ?? 4);
    const offset2  = Number(params.offset_cor2 ?? 2);

    // Argola: furo de 5mm de diâmetro, parede de 2mm à volta
    const furoR  = 2.5;
    const parede = 2.0;
    const lobeR  = furoR + parede;
    const textoX = lobeR + 1.0;

    new FontLoader().load(fontPath, (font) => {
      if (cancelled) return;
      const grp = new THREE.Group();

      // Camada base (cor 1): texto com offset (só se houver mais níveis), já
      // soldado com a ponte/argola numa única geometria (ver buildBaseLayerGeometry)
      const rBase = numCores >= 2 ? offset1 : 0;
      const baseGeom = buildBaseLayerGeometry(font, nome, tamanho, altura, rBase, lobeR + rBase, furoR, textoX);

      const initialColors = colors ?? PATAMARES_DEFAULT_COLORS;
      const newMats: THREE.MeshStandardMaterial[] = [];

      const baseMat = new THREE.MeshStandardMaterial({ color: initialColors[0] ?? PATAMARES_DEFAULT_COLORS[0], metalness: 0.1, roughness: 0.4 });
      newMats.push(baseMat);
      grp.add(new THREE.Mesh(withCreasedNormals(baseGeom, 30), baseMat));

      // Camada intermédia (cor 2) — só com 3 níveis
      if (numCores === 3) {
        const midGeom = buildOffsetTextGeometry(font, nome, tamanho, altura, offset2);
        midGeom.translate(textoX, 0, altura);
        const midMat = new THREE.MeshStandardMaterial({ color: initialColors[1] ?? PATAMARES_DEFAULT_COLORS[1], metalness: 0.1, roughness: 0.4 });
        newMats.push(midMat);
        grp.add(new THREE.Mesh(withCreasedNormals(midGeom, 30), midMat));
      }

      // Camada de topo (letras puras, sem offset) — a partir de 2 níveis
      if (numCores >= 2) {
        const topGeom = new TextGeometry(nome, { font, size: tamanho, height: altura, curveSegments: 24 });
        topGeom.translate(textoX, 0, altura * (numCores === 3 ? 2 : 1));
        const topMat = new THREE.MeshStandardMaterial({ color: initialColors[numCores === 3 ? 2 : 1] ?? PATAMARES_DEFAULT_COLORS[2], metalness: 0.2, roughness: 0.3 });
        newMats.push(topMat);
        grp.add(new THREE.Mesh(withCreasedNormals(topGeom, 30), topMat));
      }

      // Centrar o conjunto em X/Y
      const box = new THREE.Box3().setFromObject(grp);
      const center = new THREE.Vector3();
      box.getCenter(center);
      grp.position.set(-center.x, -center.y, 0);

      matRefs.current = newMats;
      setGroup(grp);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, fontPath]);

  // Cor ao vivo: só actualiza os materiais, sem recarregar fontes/geometria.
  // matRefs[i] corresponde sempre à cor do Nível i+1 (base=0, intermédio=1,
  // topo=2 ou 1 se só houver 2 níveis) — a ordem de criação acima já garante isto.
  useEffect(() => {
    const c = colors ?? PATAMARES_DEFAULT_COLORS;
    matRefs.current.forEach((mat, i) => {
      mat.color.set(c[i] ?? PATAMARES_DEFAULT_COLORS[i] ?? '#ffffff');
    });
  }, [colors, group]);

  if (!group) return null;
  return <primitive object={group} />;
}

// Aplica um offset Clipper a um conjunto de paths já limpos — qualquer sinal
// (positivo alarga, negativo encolhe) — ao contrário de getOffsetTextClipperPaths,
// que só trata offsets positivos correctamente (usada para a moldura da caixa
// de luz, que precisa de encolher para abrir a cavidade da parede).
function offsetClipperPaths(paths: ClipperLib.Paths, offsetMm: number): ClipperLib.Paths {
  if (offsetMm === 0) return paths;
  const co = new ClipperLib.ClipperOffset(2, 0.1 * CLIPPER_SCALE);
  co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const tree = new ClipperLib.PolyTree();
  co.Execute(tree, offsetMm * CLIPPER_SCALE);
  return ClipperLib.Clipper.PolyTreeToPaths(tree);
}

function centerGroupXY(grp: THREE.Group) {
  const box = new THREE.Box3().setFromObject(grp);
  const center = new THREE.Vector3();
  box.getCenter(center);
  grp.position.set(-center.x, -center.y, 0);
}

// ── Letra Inicial Caixa de Luz (estilo "moldura") — replica o scad_template
// do backend (Maker_Pro_docker_Prod/scripts/update_letras_caixa_luz_template_v2.sql):
// moldura = letra alargada por borda_moldura; casca oca (paredes + frente
// difusora); nome encaixado (sobreposicao mm para dentro) na frente; tampa
// traseira com lábio de encaixe. Cada peça é um STL separado (ver descrição
// do produto). `pecas` controla quais são mostradas em conjunto no preview —
// por omissão só a peça do "modo" selecionado (peça única).
//
// Nomenclatura do "modo" (vem do backend, não mudei): "corpo" = casca,
// "tampa" = a peça do NOME (não a tampa traseira!), "traseira" = tampa
// traseira. Mantive os nomes internos wantNome/wantTraseira só no preview
// para não confundir, mas os valores brutos em `pecas`/`modo` são sempre
// 'corpo'/'tampa'/'traseira'.

// Moldura da letra: PolyTree Clipper num offset arbitrário (qualquer sinal).
function molduraPolyTree(font: any, char: string, size: number, offsetMm: number): ClipperLib.PolyTree {
  const rawPaths = getOffsetTextClipperPaths(font, char, size, 0); // contorno limpo, sem offset
  const co = new ClipperLib.ClipperOffset(2, 0.1 * CLIPPER_SCALE);
  co.AddPaths(rawPaths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const tree = new ClipperLib.PolyTree();
  co.Execute(tree, offsetMm * CLIPPER_SCALE);
  return tree;
}

// Moldura sólida extrudida a um offset e profundidade dados (frente difusora,
// placa da tampa traseira, etc.).
function buildMolduraGeometry(font: any, char: string, size: number, offsetMm: number, depth: number): THREE.BufferGeometry {
  return extrudeFromExPolyTree(molduraPolyTree(font, char, size, offsetMm), depth);
}

// Anel entre dois offsets da moldura (diferença booleana Clipper) — dá a
// "casca" oca das paredes, incluindo os buracos próprios da letra (ex.: os
// olhos do "B"/"O"), que o Clipper resolve correctamente.
function buildMolduraRingGeometry(font: any, char: string, size: number, outerOffsetMm: number, innerOffsetMm: number, depth: number): THREE.BufferGeometry {
  const outerPaths = ClipperLib.Clipper.PolyTreeToPaths(molduraPolyTree(font, char, size, outerOffsetMm));
  const innerPaths = ClipperLib.Clipper.PolyTreeToPaths(molduraPolyTree(font, char, size, innerOffsetMm));
  const c = new ClipperLib.Clipper();
  c.AddPaths(outerPaths, ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(innerPaths, ClipperLib.PolyType.ptClip, true);
  const tree = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctDifference, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return extrudeFromExPolyTree(tree, depth);
}

function CaixaLuzPreview({ params, pecas }: { params: Record<string, any>; pecas?: string[] }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);

  const modo             = String(params.modo || 'corpo');
  const letra             = String(params.letra || 'A').slice(0, 1) || ' ';
  const fonteInicialName  = String(params.fonte_inicial || 'Moderno');
  const altura            = Number(params.altura ?? 150);
  const nome              = String(params.nome || 'Athreya');
  const fonteNomeName     = String(params.fonte_nome || 'Lobster');
  const tamanhoNome       = Number(params.tamanho_nome ?? 60);
  const bordaMoldura      = Number(params.borda_moldura ?? 8);
  const espessuraInicial  = Number(params.espessura_inicial ?? 14);
  const espessuraFrenteIn = Number(params.espessura_frente ?? 2);
  const paredeLuz         = Number(params.parede_luz ?? 2.4);
  const espessuraTraseira = Number(params.espessura_traseira ?? 2);
  const encaixeTraseira   = Number(params.encaixe_traseira ?? 4);
  const sobreposicao      = Number(params.sobreposicao ?? 2.5);
  const espessuraNome     = Number(params.espessura_nome ?? 10);
  const posicaoNome       = Number(params.posicao_nome ?? 0);
  const posicaoNomeX      = Number(params.posicao_nome_x ?? 0);

  // Derivados — mesmas fórmulas do scad_template.
  const frente = Math.min(espessuraFrenteIn, espessuraInicial - 0.6);
  const folga  = 0.35;

  const pecasAtivas  = pecas && pecas.length > 0 ? pecas : [modo];
  const wantCorpo    = pecasAtivas.includes('corpo');
  const wantNome     = pecasAtivas.includes('tampa');    // 'tampa' no schema = nome
  const wantTraseira = pecasAtivas.includes('traseira');
  const montagem     = wantCorpo && (wantNome || wantTraseira); // corpo é a peça-âncora

  const fontInicialPath = LETRA_FONT_MAP[fonteInicialName] ?? LETRA_FONT_MAP['Moderno'];
  const fontNomePath    = FONT_MAP[fonteNomeName] ?? FONT_MAP['Lobster'];

  const depsKey = JSON.stringify({
    wantCorpo, wantNome, wantTraseira, letra, fonteInicialName, altura, nome, fonteNomeName,
    tamanhoNome, bordaMoldura, espessuraInicial, espessuraFrenteIn, paredeLuz,
    espessuraTraseira, encaixeTraseira, sobreposicao, espessuraNome, posicaoNome, posicaoNomeX,
  });

  useEffect(() => {
    let cancelled = false;
    const needFontLetra = wantCorpo || wantTraseira;
    const needFontNome  = wantNome;

    Promise.all([
      needFontLetra ? new Promise<any>((resolve, reject) => new FontLoader().load(fontInicialPath, resolve, undefined, reject)) : Promise.resolve(null),
      needFontNome  ? new Promise<any>((resolve, reject) => new FontLoader().load(fontNomePath, resolve, undefined, reject))    : Promise.resolve(null),
    ]).then(([fontLetra, fontNome]) => {
      if (cancelled) return;
      const grp = new THREE.Group();

      if (wantCorpo) {
        // Paredes ocas: moldura(borda_moldura) menos moldura(borda_moldura-parede_luz),
        // altura espessura_inicial-frente, abertas atrás (z=0) para a fita LED.
        const wallGeom = buildMolduraRingGeometry(
          fontLetra, letra, altura,
          bordaMoldura, bordaMoldura - paredeLuz,
          espessuraInicial - frente
        );
        const wallMat = new THREE.MeshStandardMaterial({ color: '#93c5fd', metalness: 0.1, roughness: 0.4 });
        grp.add(new THREE.Mesh(withCreasedNormals(wallGeom, 30), wallMat));

        // Frente difusora sólida, no topo da parede.
        const frontGeom = buildMolduraGeometry(fontLetra, letra, altura, bordaMoldura, frente);
        frontGeom.translate(0, 0, espessuraInicial - frente);
        const frontMat = new THREE.MeshStandardMaterial({
          color: '#e0f2fe', metalness: 0.05, roughness: 0.2, transparent: true, opacity: 0.85,
        });
        grp.add(new THREE.Mesh(withCreasedNormals(frontGeom, 30), frontMat));
      }

      if (wantTraseira) {
        // Placa (offset borda_moldura) + lábio de encaixe (offset encolhido
        // parede_luz+folga) empilhado por cima — o lábio entra na cavidade do
        // corpo. Em montagem, fica atrás do corpo (z<=0, lábio encostado a z=0).
        const baseGeom = buildMolduraGeometry(fontLetra, letra, altura, bordaMoldura, espessuraTraseira);
        const lipGeom  = buildMolduraGeometry(fontLetra, letra, altura, bordaMoldura - (paredeLuz + folga), encaixeTraseira);
        lipGeom.translate(0, 0, espessuraTraseira);
        const trasGrp = new THREE.Group();
        const trasMat = new THREE.MeshStandardMaterial({ color: '#60a5fa', metalness: 0.1, roughness: 0.4 });
        trasGrp.add(new THREE.Mesh(withCreasedNormals(baseGeom, 30), trasMat));
        trasGrp.add(new THREE.Mesh(withCreasedNormals(lipGeom, 30), trasMat));
        if (montagem) trasGrp.position.z = -(espessuraTraseira + encaixeTraseira);
        grp.add(trasGrp);
      }

      if (wantNome) {
        const nomeGeom = buildOffsetTextGeometry(fontNome, nome || 'Nome', tamanhoNome, espessuraNome, 0);
        // Fora de montagem (peça isolada, para o próprio STL) o nome fica na
        // posição natural da fonte — só em montagem é que se aplica a
        // posição/encaixe (tal como o scad_template só faz translate() no
        // ramo combinado, não dentro de tampa_caixa()).
        if (montagem) {
          nomeGeom.translate(posicaoNomeX, posicaoNome, espessuraInicial - sobreposicao);
        }
        const nomeMat = new THREE.MeshStandardMaterial({ color: '#f3f3f0', metalness: 0.1, roughness: 0.35 });
        grp.add(new THREE.Mesh(withCreasedNormals(nomeGeom, 30), nomeMat));
      }

      centerGroupXY(grp);
      setGroup(grp);
    }).catch((err) => console.error('Erro ao carregar fontes (Caixa de Luz):', err));

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, fontInicialPath, fontNomePath]);

  if (!group) return null;
  return <primitive object={group} />;
}

// ── Caixa paramétrica simples ──
function CaixaPreview({ params }: { params: Record<string, any> }) {
  const largura     = typeof params.largura     === 'number' ? params.largura     : 100;
  const comprimento = typeof params.comprimento === 'number' ? params.comprimento : 120;
  const altura      = typeof params.altura      === 'number' ? params.altura      : 60;

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[largura, altura, comprimento]} />
      <meshStandardMaterial color="#2563eb" metalness={0.25} roughness={0.45} />
    </mesh>
  );
}

// ── Componente principal ──
export default function Preview3D({ params, stlFilePath, coresPatamares, pecasCaixaLuz }: Preview3DProps) {
  const isPetTag    = !!stlFilePath;
  const isNameKey   = !isPetTag && typeof params.Text === 'string' && typeof params.Font_name === 'string';
  // Tem de vir ANTES de isLetraNome: o schema da caixa de luz partilha quase
  // todos os nomes de parâmetros com "Letras Decorativas" (letra, nome,
  // fonte_inicial, fonte_nome, altura, tamanho_nome, espessura_inicial,
  // espessura_nome, sobreposicao, posicao_nome) — só borda_moldura/parede_luz
  // são exclusivos da caixa de luz, por isso são o critério de deteção.
  const isCaixaLuz = !isPetTag && !isNameKey
    && typeof params.letra === 'string'
    && params.borda_moldura !== undefined && params.espessura_inicial !== undefined;
  const isLetraNome = !isPetTag && !isNameKey && !isCaixaLuz
    && typeof params.letra === 'string' && typeof params.nome === 'string'
    && typeof params.fonte_inicial === 'string';
  const isPatamares = !isPetTag && !isNameKey && !isLetraNome && !isCaixaLuz
    && typeof params.nome === 'string' && typeof params.fonte === 'string'
    && params.offset_cor1 !== undefined;
  // A peça do nome sozinha ("tampa" no schema — ver nota em CaixaLuzPreview) é
  // bem mais pequena do que o corpo/traseira da letra (até 250mm) — precisa de
  // câmara/zoom próprios. Só se aplica quando é a ÚNICA peça mostrada (numa
  // montagem, o corpo domina a escala).
  const caixaLuzPecas = pecasCaixaLuz && pecasCaixaLuz.length > 0 ? pecasCaixaLuz : [String(params.modo || 'corpo')];
  const isCaixaLuzNome = isCaixaLuz && caixaLuzPecas.length === 1 && caixaLuzPecas[0] === 'tampa';
  const showText  = params.mostrar_texto !== false;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: isPetTag ? [0, -60, 50] : (isNameKey || isPatamares) ? [0, -60, 120] : isLetraNome ? [0, -220, 160] : isCaixaLuzNome ? [0, -60, 60] : isCaixaLuz ? [0, -280, 240] : [120, 90, 120],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#050505']} />
          <Environment preset="warehouse" />

          <ambientLight intensity={0.5} />
          <directionalLight position={[50, 50, 80]}   intensity={1.2} castShadow />
          <directionalLight position={[-50, -30, 40]} intensity={0.5} />

          <Grid
            args={[500, 500]}
            cellSize={isPetTag ? 5 : 20}
            cellThickness={0.6}
            sectionSize={isPetTag ? 25 : 100}
            sectionThickness={1}
            fadeDistance={isPetTag ? 200 : 600}
            fadeStrength={1}
            sectionColor="#1f2937"
            cellColor="#0b0f14"
          />

          {isPetTag ? (
            <PetTagModel
              stlFilePath={stlFilePath!}
              params={params}
              showText={showText}
            />
          ) : isNameKey ? (
            <NameKeyPreview params={params} />
          ) : isLetraNome ? (
            <LetraNomePreview params={params} />
          ) : isPatamares ? (
            <PatamaresKeyPreview params={params} colors={coresPatamares} />
          ) : isCaixaLuz ? (
            <CaixaLuzPreview params={params} pecas={pecasCaixaLuz} />
          ) : (
            <CaixaPreview params={params} />
          )}

          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={isPetTag ? 20 : isLetraNome ? 100 : isCaixaLuzNome ? 30 : isCaixaLuz ? 160 : 80}
            maxDistance={isPetTag ? 200 : isLetraNome ? 500 : isCaixaLuzNome ? 300 : isCaixaLuz ? 850 : 400}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
