// The room.
//
// Twelve volumes on a curved shelf in a void, lit as an archive is lit: one
// key from above and in front, a cold fill, and a small pool of light on
// whichever volume the shelf is currently offering. Nothing renders unless
// something moved — see `needsRender` in main.mjs.

import * as THREE from 'three';

import { SHELF, volumePose, isVisible } from './layout.mjs';
import { paintSpine, paintEdge, paintCover, loadDisc } from './textures.mjs';

const PAPER = 0xd8d4c8;

function shadeOf(hex, amount) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return c;
}

function textureFrom(canvas, renderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

/** A soft elliptical smudge — the contact shadow each volume casts. */
function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,0.72)');
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.34)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

/** The shelf surface: a pool of light rather than a plank. */
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

export function createScene(canvas, volumes) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  // Slightly above the shelf and aimed a little over it, so the volumes sit
  // in the lower half of the frame with their feet and shadows showing and
  // the title above them keeps its air.
  camera.position.set(0, 1.2, 6.2);
  camera.lookAt(0, 0.42, 0);

  scene.add(new THREE.HemisphereLight(0x39435a, 0x05060a, 0.62));

  const key = new THREE.DirectionalLight(0xe6ecf8, 1.25);
  key.position.set(2.6, 4.2, 5.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8ea6cf, 0.38);
  fill.position.set(-4.4, 1.4, 2.6);
  scene.add(fill);

  // Follows the focused volume: the shelf offers one at a time.
  const offer = new THREE.PointLight(0xdfe8fa, 9, 7.5, 2);
  offer.position.set(0, 1.15, 2.3);
  scene.add(offer);

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 6.5),
    new THREE.MeshBasicMaterial({
      map: textureFrom(surfaceTexture(), renderer),
      transparent: true,
      depthWrite: false,
    }),
  );
  const floorY = SHELF.baseY - SHELF.height / 2;
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, floorY - 0.002, -0.6);
  scene.add(surface);

  const shadowMap = textureFrom(shadowTexture(), renderer);
  const bookGeometry = new THREE.BoxGeometry(SHELF.thickness, SHELF.height, SHELF.depth);
  const shadowGeometry = new THREE.PlaneGeometry(0.98, 0.98);

  const disposables = [
    bookGeometry, shadowGeometry, shadowMap,
    surface.geometry, surface.material, surface.material.map,
  ];

  const books = volumes.map((volume) => {
    const spine = textureFrom(paintSpine(volume), renderer);
    const edge = textureFrom(paintEdge(volume), renderer);
    const board = shadeOf(volume.hue, 0.78);

    const coverMaterial = new THREE.MeshStandardMaterial({
      color: board, roughness: 0.86, metalness: 0, transparent: true,
    });
    const backMaterial = new THREE.MeshStandardMaterial({
      color: board, roughness: 0.9, metalness: 0, transparent: true,
    });
    const paperMaterial = new THREE.MeshStandardMaterial({
      color: PAPER, roughness: 0.95, metalness: 0, transparent: true,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      map: edge, roughness: 0.95, metalness: 0, transparent: true,
    });
    const spineMaterial = new THREE.MeshStandardMaterial({
      map: spine, roughness: 0.8, metalness: 0, transparent: true,
    });

    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z.
    const materials = [
      coverMaterial, backMaterial, paperMaterial,
      paperMaterial, spineMaterial, edgeMaterial,
    ];
    const mesh = new THREE.Mesh(bookGeometry, materials);
    mesh.userData.volume = volume;
    scene.add(mesh);

    const shadow = new THREE.Mesh(
      shadowGeometry,
      new THREE.MeshBasicMaterial({
        map: shadowMap, transparent: true, depthWrite: false, opacity: 0.85,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    disposables.push(spine, edge, shadow.material, ...new Set(materials));

    return { volume, mesh, shadow, materials, coverMaterial, spineMaterial, cover: null };
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let aspect = 1;

  /**
   * Where an opened volume stands. Narrow viewports give the card the floor,
   * so the volume is both lifted and stood down to clear the sheet.
   */
  function stagePose(zoom) {
    const wide = aspect >= 1.05;
    return wide
      ? { x: -1.3, y: 0.58, z: 1.75 + zoom * 1.15, scale: 1 }
      : { x: 0, y: 1.42, z: 1.5 + zoom * 0.9, scale: 0.64 + zoom * 0.24 };
  }

  /**
   * Place everything for a given shelf state. `open` runs 0 → 1 as a volume
   * leaves the shelf, so the two poses simply cross-fade.
   */
  function layout(state) {
    const { focus, openIndex, open, yaw, pitch, zoom } = state;
    const stage = stagePose(zoom);
    const dimmed = 1 - open * 0.86;

    for (let i = 0; i < books.length; i += 1) {
      const book = books[i];
      const pose = volumePose(i, focus, SHELF);
      const visible = isVisible(i, focus) || (open > 0 && i === openIndex);
      book.mesh.visible = visible;
      book.shadow.visible = visible;
      if (!visible) continue;

      const opening = i === openIndex ? open : 0;
      const recede = i === openIndex ? 0 : open * 0.55;

      book.mesh.position.set(
        THREE.MathUtils.lerp(pose.x, stage.x, opening),
        THREE.MathUtils.lerp(pose.y, stage.y, opening),
        THREE.MathUtils.lerp(pose.z - recede, stage.z, opening),
      );
      book.mesh.rotation.set(
        pitch * opening,
        THREE.MathUtils.lerp(pose.rotationY, -Math.PI / 2 + yaw, opening),
        0,
      );
      book.mesh.scale.setScalar(THREE.MathUtils.lerp(1, stage.scale, opening));

      const opacity = i === openIndex ? 1 : dimmed;
      for (const material of book.materials) material.opacity = opacity;

      book.shadow.position.set(pose.x, floorY + 0.004, pose.z + 0.08);
      book.shadow.rotation.z = pose.rotationY;
      book.shadow.material.opacity = 0.85 * (1 - opening) * (i === openIndex ? 1 : dimmed);
      book.shadow.scale.setScalar(1 + pose.prominence * 0.12);
    }

    // The pool of light follows whatever the shelf is offering, and travels
    // with a volume when it is taken out.
    const front = volumePose(Math.round(focus), focus, SHELF);
    offer.position.set(
      THREE.MathUtils.lerp(front.x * 0.5, stage.x, open),
      THREE.MathUtils.lerp(SHELF.baseY + 0.95, stage.y + 0.85, open),
      THREE.MathUtils.lerp(front.z + 2.3, stage.z + 1.5, open),
    );
    offer.intensity = 9 + open * 3.5;
  }

  /** Paint the full cover for a volume the reader opened, once. */
  async function dressCover(index) {
    const book = books[index];
    if (!book || book.cover) return false;
    book.cover = textureFrom(paintCover(book.volume, await loadDisc(book.volume.slug)), renderer);
    book.coverMaterial.map = book.cover;
    book.coverMaterial.color.set(0xffffff);
    book.coverMaterial.needsUpdate = true;
    disposables.push(book.cover);
    return true;
  }

  function resize(width, height, dpr) {
    aspect = width / height;
    renderer.setPixelRatio(Math.min(2, dpr));
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    // Hold the shelf in frame on tall, narrow viewports.
    camera.fov = aspect < 0.9 ? 46 : 38;
    camera.updateProjectionMatrix();
  }

  /** Index of the volume under the pointer, or -1. */
  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = books.filter((b) => b.mesh.visible).map((b) => b.mesh);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return -1;
    return books.findIndex((b) => b.mesh === hit.object);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    for (const item of new Set(disposables)) item?.dispose?.();
    renderer.dispose();
  }

  return { layout, render, resize, pick, dressCover, dispose, renderer, isWide: () => aspect >= 1.05 };
}
