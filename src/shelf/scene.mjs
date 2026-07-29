// The room.
//
// Twelve gold sculptures on plinths in a void, lit as a gallery is lit: one
// key from above and in front, a cold fill, and a small pool of light on
// whichever piece the row is currently offering. Nothing renders unless
// something moved — see `needsRender` in main.mjs.
//
// Each figure is a shallow cast: its silhouette, traced from the artwork by
// scripts/build-figure-assets.mjs, extruded along z. The photograph faces the
// viewer, the registry's hallmark is struck into the back, and the cut edge
// between them is the colour of the metal.

import * as THREE from 'three';

import {
  GALLERY, VITRINE, figurePose, fitScale, floorY, isVisible,
  lerpContent, lerpRect, rowContent, stageContent, vitrineFrame,
} from './layout.mjs';
import { paintPlinth, paintReverse, loadSculpture } from './textures.mjs';
import geometryData from './figures.geometry.json';

const { quant: QUANT, rowSize: ROW_TIER, heroSize: HERO_TIER } = geometryData;

function textureFrom(canvas, renderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function mapFrom(image, renderer) {
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** A soft elliptical smudge — the shadow each plinth casts on the floor. */
function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,0.76)');
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.34)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

/** The floor: a pool of light rather than a plane you can see the edge of. */
function surfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, 'rgba(10,12,17,0)');
  gradient.addColorStop(0.42, 'rgba(23,28,40,0.5)');
  gradient.addColorStop(0.62, 'rgba(15,18,27,0.38)');
  gradient.addColorStop(1, 'rgba(6,7,9,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 128);
  const fade = ctx.createLinearGradient(0, 0, 512, 0);
  fade.addColorStop(0, 'rgba(6,7,9,1)');
  fade.addColorStop(0.22, 'rgba(6,7,9,0)');
  fade.addColorStop(0.78, 'rgba(6,7,9,0)');
  fade.addColorStop(1, 'rgba(6,7,9,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 512, 128);
  return canvas;
}

/** One traced ring — integers on the quantisation grid — as a THREE path. */
function pathFrom(flat, Path) {
  const path = new Path();
  path.moveTo(flat[0] / QUANT, flat[1] / QUANT);
  for (let i = 2; i < flat.length; i += 2) path.lineTo(flat[i] / QUANT, flat[i + 1] / QUANT);
  path.closePath();
  return path;
}

/**
 * The cast. Both faces take the same texture coordinates — the artwork's box
 * within its plate — so the reverse is painted pre-mirrored to compensate.
 */
function castGeometry(figure) {
  const { u0, u1, v0, v1 } = figure.textureBox;
  const halfWidth = figure.aspect / 2;
  const uvFor = (x, y) => new THREE.Vector2(
    u0 + (((x + halfWidth) / figure.aspect) * (u1 - u0)),
    v0 + (y * (v1 - v0)),
  );

  const uvGenerator = {
    generateTopUV(_geometry, vertices, indexA, indexB, indexC) {
      return [indexA, indexB, indexC].map((index) => uvFor(
        vertices[index * 3],
        vertices[(index * 3) + 1],
      ));
    },
    // The cut edge is a flat colour; its coordinates only have to be valid.
    generateSideWallUV(_geometry, vertices, indexA, indexB, indexC, indexD) {
      return [indexA, indexB, indexC, indexD].map((index) => new THREE.Vector2(
        vertices[index * 3] + halfWidth,
        vertices[(index * 3) + 1],
      ));
    },
  };

  const shapes = figure.shapes.map(({ outer, holes }) => {
    const shape = pathFrom(outer, THREE.Shape);
    shape.holes = holes.map((hole) => pathFrom(hole, THREE.Path));
    return shape;
  });

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: GALLERY.depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
    UVGenerator: uvGenerator,
  });
  geometry.computeVertexNormals();
  return splitCastGroups(geometry);
}

/**
 * Three materials out of one extrusion: the face that carries the photograph,
 * the back that carries the hallmark, and the cut edge between them. Triangles
 * are sorted by where they sit in z, so the split holds whatever order the
 * extruder happens to emit them in.
 */
function splitCastGroups(geometry) {
  const position = geometry.getAttribute('position');
  const triangles = position.count / 3;
  const epsilon = GALLERY.depth * 0.01;

  const materialFor = (triangle) => {
    let front = true;
    let back = true;
    for (let corner = 0; corner < 3; corner += 1) {
      const z = position.getZ((triangle * 3) + corner);
      if (Math.abs(z - GALLERY.depth) > epsilon) front = false;
      if (Math.abs(z) > epsilon) back = false;
    }
    if (front) return 0;
    if (back) return 1;
    return 2;
  };

  geometry.clearGroups();
  let start = 0;
  let current = materialFor(0);
  for (let triangle = 1; triangle <= triangles; triangle += 1) {
    const next = triangle < triangles ? materialFor(triangle) : -1;
    if (next === current) continue;
    geometry.addGroup(start * 3, (triangle - start) * 3, current);
    start = triangle;
    current = next;
  }
  return geometry;
}

export function createScene(canvas, records) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  // A longish lens, held constant across every viewport: the fit is done by
  // moving the camera, not by widening it, so a phone and a desktop see the
  // same sculpture rather than the same slice of room.
  const camera = new THREE.PerspectiveCamera(
    THREE.MathUtils.radToDeg(VITRINE.fov), 1, 0.1, 200,
  );

  // The photographs already carry their own light. The rig here is even enough
  // not to fight that, with just enough direction that turning a piece reads.
  scene.add(new THREE.HemisphereLight(0x3d4761, 0x06070b, 1.05));

  const key = new THREE.DirectionalLight(0xf2f0e4, 0.9);
  key.position.set(2.2, 4.4, 5.6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8ea6cf, 0.32);
  fill.position.set(-4.6, 1.2, 2.8);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xbcd0f0, 0.28);
  rim.position.set(-1.4, 2.2, -5.2);
  scene.add(rim);

  // Follows the focused figure: the gallery offers one at a time.
  const offer = new THREE.PointLight(0xf3ead6, 7, 9, 2);
  scene.add(offer);

  const floor = floorY();
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 8),
    new THREE.MeshBasicMaterial({
      map: textureFrom(surfaceTexture(), renderer),
      transparent: true,
      depthWrite: false,
    }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, floor - 0.002, -0.5);
  scene.add(surface);

  const shadowMap = textureFrom(shadowTexture(), renderer);
  const plinthGeometry = new THREE.CylinderGeometry(
    GALLERY.plinthRadius, GALLERY.plinthRadius * 1.06, GALLERY.plinthHeight, 40, 1, false,
  );
  const shadowGeometry = new THREE.PlaneGeometry(2.3, 2.3);
  const plinthCap = new THREE.MeshStandardMaterial({
    color: 0x141824, roughness: 0.82, metalness: 0, transparent: true,
  });

  const disposables = [
    plinthGeometry, shadowGeometry, shadowMap, plinthCap,
    surface.geometry, surface.material, surface.material.map,
  ];

  const figures = records.map((record) => {
    const traced = geometryData.figures[record.slug];
    const scale = fitScale(traced.aspect);
    const cast = new THREE.Color(traced.edgeColor);

    // Until the plate arrives the piece stands in its own metal, then the
    // photograph is laid onto the face.
    const face = new THREE.MeshStandardMaterial({
      color: cast, roughness: 0.62, metalness: 0.18, transparent: true, alphaTest: 0.3,
    });
    const reverseMap = textureFrom(paintReverse(record, traced.edgeColor), renderer);
    const reverse = new THREE.MeshStandardMaterial({
      map: reverseMap,
      bumpMap: reverseMap,
      bumpScale: 0.28,
      roughness: 0.7,
      metalness: 0.14,
      transparent: true,
    });
    // The cut edge is the one surface with no photograph on it. Keep it dark
    // and matt: a bright edge makes a shallow cast read as a thick slab. The
    // scalar is small because colours multiply in linear space — a third here
    // is well over half once it is written back out.
    const edge = new THREE.MeshStandardMaterial({
      color: cast.clone().multiplyScalar(0.045),
      roughness: 0.94,
      metalness: 0,
      transparent: true,
    });

    const mesh = new THREE.Mesh(castGeometry(traced), [face, reverse, edge]);
    mesh.scale.setScalar(scale);
    scene.add(mesh);

    const plinth = new THREE.Mesh(plinthGeometry, [
      new THREE.MeshStandardMaterial({
        map: textureFrom(paintPlinth(record), renderer),
        roughness: 0.88,
        metalness: 0,
        transparent: true,
      }),
      plinthCap,
      plinthCap,
    ]);
    scene.add(plinth);

    const shadow = new THREE.Mesh(
      shadowGeometry,
      new THREE.MeshBasicMaterial({
        map: shadowMap, transparent: true, depthWrite: false, opacity: 0.8,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    // Raycasting a silhouette as sparse as Libra's chains is hopeless, so
    // picking runs against a box instead. It is never added to the scene —
    // nothing to draw, its matrix is kept by hand.
    const proxyGeometry = new THREE.BoxGeometry(traced.aspect, 1, GALLERY.depth);
    proxyGeometry.translate(0, 0.5, GALLERY.depth / 2);
    const proxy = new THREE.Mesh(proxyGeometry, plinthCap);
    proxy.scale.setScalar(scale);

    disposables.push(
      mesh.geometry, face, reverse, reverse.map, edge,
      plinth.material[0], plinth.material[0].map, shadow.material, proxyGeometry,
    );

    return {
      record, mesh, plinth, shadow, proxy, scale, face,
      aspect: traced.aspect,
      materials: [face, reverse, edge],
      tier: 0,
      // How far this figure has risen toward its hovered pose, eased in
      // layout() so the lift breathes instead of popping.
      hover: 0,
    };
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // ---- the camera --------------------------------------------------------
  //
  // The rig is one fixed downward tilt; everything else about where it stands
  // comes from the band of canvas the page has measured out for the
  // sculptures. Pan is a translation across the view axis, so shifting a
  // figure into a band beside a card moves the image without skewing it.

  const FORWARD = new THREE.Vector3(0, -Math.sin(VITRINE.tilt), -Math.cos(VITRINE.tilt));
  const RIGHT = new THREE.Vector3(1, 0, 0);
  const UP = new THREE.Vector3(0, Math.cos(VITRINE.tilt), -Math.sin(VITRINE.tilt));
  const aim = new THREE.Vector3();

  let canvasSize = { width: 1, height: 1 };
  let bands = { row: null, stage: null };

  /** Until the page has measured itself, the whole canvas is the band. */
  const bandFor = (which) => bands[which]
    ?? { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };

  /**
   * The two rectangles the sculptures may occupy: the band left between the
   * header and the controls, and the smaller one left beside — or above — the
   * card once a figure is drawn out. Both in CSS pixels from the canvas's
   * top-left corner.
   */
  function setBands(row, stage) {
    bands = { row, stage };
  }

  function placeCamera(open, opened, zoom) {
    const content = lerpContent(
      rowContent(),
      stageContent(opened.scale, opened.aspect),
      open,
    );
    const rect = lerpRect(bandFor('row'), bandFor('stage'), open);
    // A figure under examination gets more air than the row does, and pinching
    // in takes some of it back.
    const margin = THREE.MathUtils.lerp(VITRINE.rowMargin, VITRINE.stageMargin, open)
      - (zoom * VITRINE.zoomGain * open);

    const frame = vitrineFrame({
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      rect,
      content,
      margin,
    });

    aim.set(0, content.centerY, content.centerZ)
      .addScaledVector(RIGHT, frame.panX)
      .addScaledVector(UP, frame.panY);
    camera.position.copy(aim).addScaledVector(FORWARD, -frame.distance);
    camera.lookAt(aim);
  }

  /**
   * Place everything for a given state. `open` runs 0 → 1 as a figure is drawn
   * out of the row, so the two poses simply cross-fade.
   *
   * A piece on display stands on the camera's own axis. Standing it off to one
   * side instead — and letting the camera stay put — shows the cut edge of
   * every contour down its length, and a shallow cast seen at an angle reads
   * as a flight of steps.
   */
  function layout(state) {
    const { focus, openIndex, open, yaw, pitch, zoom } = state;
    const opened = figures[openIndex]
      ?? figures[Math.min(figures.length - 1, Math.max(0, Math.round(focus)))];
    const stage = { x: 0, y: -opened.scale / 2, z: VITRINE.stageZ };
    // One piece in a pool of light; the rest of the room goes quiet.
    const dimmed = 1 - (open * 0.94);
    // Hover eases in and out rather than popping; while any figure is still
    // rising or settling, the caller keeps the frame loop alive.
    let hoverSettling = false;

    for (let i = 0; i < figures.length; i += 1) {
      const figure = figures[i];
      const pose = figurePose(i, focus, GALLERY);
      const visible = isVisible(i, focus) || (open > 0 && i === openIndex);
      figure.mesh.visible = visible;
      figure.plinth.visible = visible;
      figure.shadow.visible = visible;
      if (!visible) continue;

      const drawn = i === openIndex ? open : 0;
      const recede = i === openIndex ? 0 : open * 0.6;

      // The lift that says a sculpture opens: hovered pieces rise a little
      // and step forward, the bookshelf gesture.
      const hoverTarget = i === state.hover && drawn === 0 ? 1 : 0;
      const eased = figure.hover + ((hoverTarget - figure.hover) * 0.22);
      figure.hover = Math.abs(eased - hoverTarget) < 0.004 ? hoverTarget : eased;
      if (figure.hover !== hoverTarget) hoverSettling = true;
      const lift = figure.hover * (1 - open);
      const scale = figure.scale * (1 + (lift * 0.05));

      figure.mesh.position.set(
        THREE.MathUtils.lerp(pose.x, stage.x, drawn),
        THREE.MathUtils.lerp(pose.y + (lift * 0.07), stage.y, drawn),
        THREE.MathUtils.lerp(pose.z - recede + (lift * 0.16), stage.z, drawn),
      );
      figure.mesh.rotation.set(
        pitch * drawn,
        THREE.MathUtils.lerp(pose.rotationY, yaw, drawn),
        0,
      );
      figure.mesh.scale.setScalar(scale);

      figure.proxy.position.copy(figure.mesh.position);
      figure.proxy.rotation.copy(figure.mesh.rotation);
      figure.proxy.scale.setScalar(scale);
      figure.proxy.updateMatrixWorld(true);

      const opacity = i === openIndex ? 1 : dimmed;
      for (const material of figure.materials) material.opacity = opacity;

      // The plinth stays in the row; only the figure is lifted off it.
      figure.plinth.position.set(pose.x, pose.y - (GALLERY.plinthHeight / 2), pose.z);
      figure.plinth.rotation.y = pose.rotationY;
      figure.plinth.material[0].opacity = opacity * (1 - (drawn * 0.75));
      plinthCap.opacity = dimmed;

      figure.shadow.position.set(pose.x, floor + 0.004, pose.z + 0.05);
      figure.shadow.rotation.z = pose.rotationY;
      figure.shadow.material.opacity = 0.8 * (1 - (drawn * 0.7))
        * (i === openIndex ? 1 : dimmed);
      figure.shadow.scale.setScalar(1 + (pose.prominence * 0.1));
    }

    // The pool of light follows whatever the row is offering, and travels with
    // a figure when it is drawn out.
    const front = figurePose(Math.round(focus), focus, GALLERY);
    offer.position.set(
      THREE.MathUtils.lerp(front.x * 0.5, stage.x, open),
      THREE.MathUtils.lerp(GALLERY.baseY + 1.5, stage.y + (opened.scale * 0.9), open),
      THREE.MathUtils.lerp(front.z + 2.6, stage.z + 1.8, open),
    );
    offer.intensity = 7 - (open * 2.6);

    placeCamera(open, opened, zoom);
    return hoverSettling;
  }

  /** Lay the photograph onto a figure's face, at the tier asked for. */
  async function dress(index, tier) {
    const figure = figures[index];
    if (!figure || figure.tier >= tier) return false;
    const image = await loadSculpture(figure.record.slug, tier);
    if (!image || figure.tier >= tier) return false;
    const map = mapFrom(image, renderer);
    const previous = figure.face.map;
    figure.face.map = map;
    // The artwork doubles as its own relief: bumping the lit highlights
    // makes the cast read as a struck medallion rather than a flat plate,
    // and the modelling shifts as the piece turns.
    figure.face.bumpMap = map;
    figure.face.bumpScale = 0.55;
    figure.face.color.set(0xffffff);
    figure.face.needsUpdate = true;
    figure.tier = tier;
    previous?.dispose();
    disposables.push(map);
    return true;
  }

  /** The row tier, nearest the focus first so what is on screen resolves first. */
  async function dressRow(focus, onReady) {
    const order = figures
      .map((_, index) => index)
      .sort((a, b) => Math.abs(a - focus) - Math.abs(b - focus));
    for (const index of order) {
      if (await dress(index, ROW_TIER)) onReady?.();
    }
  }

  /** The full plate, for a figure being examined. */
  const refine = (index) => dress(index, HERO_TIER);

  function resize(width, height, dpr) {
    canvasSize = { width, height };
    renderer.setPixelRatio(Math.min(2, dpr));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  /** CSS x of a figure's centre on the canvas, for the hover label. */
  const projected = new THREE.Vector3();
  function screenX(index) {
    const figure = figures[index];
    if (!figure) return NaN;
    projected.set(
      figure.mesh.position.x,
      figure.mesh.position.y + (figure.scale * 0.5),
      figure.mesh.position.z,
    ).project(camera);
    return ((projected.x + 1) / 2) * canvasSize.width;
  }

  /** Index of the figure under the pointer, or -1. */
  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = (((clientX - rect.left) / rect.width) * 2) - 1;
    pointer.y = (-((clientY - rect.top) / rect.height) * 2) + 1;
    raycaster.setFromCamera(pointer, camera);
    const proxies = figures.filter((figure) => figure.mesh.visible).map((figure) => figure.proxy);
    const hit = raycaster.intersectObjects(proxies, false)[0];
    if (!hit) return -1;
    return figures.findIndex((figure) => figure.proxy === hit.object);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    for (const item of new Set(disposables)) item?.dispose?.();
    renderer.dispose();
  }

  return {
    layout, render, resize, setBands, pick, screenX, dressRow, refine, dispose, renderer,
  };
}
