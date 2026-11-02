import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

/** A canvas texture of loose straw for hay bales. */
export function strawTexture(random: () => number, base = '#d6b25e', dull = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const tone = new THREE.Color(base).lerp(new THREE.Color('#8f8667'), dull);
  ctx.fillStyle = `#${tone.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const c = tone.clone().offsetHSL((random() - 0.5) * 0.04, (random() - 0.5) * 0.2, (random() - 0.5) * 0.28);
    ctx.strokeStyle = `#${c.getHexString()}`;
    ctx.lineWidth = 1 + random() * 2;
    const x = random() * 256, y = random() * 256, len = 10 + random() * 40, a = (random() - 0.5) * 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A square hay bale with two twine bands, long side along x, standing on y = 0 at `at`. */
export function hayBale(s: Sculpture, at: readonly [number, number, number], random: () => number, options: { size?: readonly [number, number, number]; dull?: number; turn?: number } = {}) {
  const [w, h, d] = options.size ?? [0.9, 0.36, 0.46];
  const map = strawTexture(random, '#d8b45c', options.dull ?? 0);
  const material = s.material('#ffffff', { map, roughness: 0.95 });
  const group = new THREE.Group();
  const bale = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 3, 2, 2), material);
  // Slightly bulging, uneven sides.
  const pos = bale.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (1 + (random() - 0.5) * 0.03), pos.getY(i), pos.getZ(i) * (1 + (random() - 0.5) * 0.06));
  bale.geometry.computeVertexNormals();
  bale.position.y = h / 2;
  bale.castShadow = bale.receiveShadow = true;
  group.add(bale);
  const twine = s.material('#8a6a3a', { roughness: 0.9 });
  for (const x of [-w * 0.27, w * 0.27]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.018, h + 0.012, d + 0.012), twine);
    band.position.set(x, h / 2, 0);
    band.castShadow = true;
    group.add(band);
  }
  group.position.set(...at);
  group.rotation.y = options.turn ?? 0;
  s.root.add(group);
  return group;
}

/** A small ornamental gourd: bottle, warted ball, or striped flat. Base at `at`. */
export function gourd(s: Sculpture, at: readonly [number, number, number], random: () => number, kind = Math.floor(random() * 3)) {
  const colours = ['#e8c23a', '#3f6e2e', '#e9e2c6', '#e07a1c', '#9fb84a'];
  const c1 = colours[Math.floor(random() * colours.length)];
  const c2 = colours[Math.floor(random() * colours.length)];
  const k = 0.8 + random() * 0.5;
  let profile: [number, number][];
  if (kind === 0) profile = [[0.001, 0], [0.05, 0.01], [0.065, 0.05], [0.05, 0.1], [0.025, 0.13], [0.03, 0.17], [0.02, 0.21], [0.001, 0.22]];
  else if (kind === 1) profile = [[0.001, 0], [0.05, 0.01], [0.07, 0.05], [0.065, 0.09], [0.035, 0.12], [0.001, 0.125]];
  else profile = [[0.001, 0], [0.06, 0.005], [0.08, 0.03], [0.07, 0.055], [0.03, 0.07], [0.001, 0.07]];
  const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * k, y * k)), 18);
  // Two-tone stripes by vertex colour.
  const pos = geometry.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Color(c1), b = new THREE.Color(c2), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ang = Math.atan2(pos.getZ(i), pos.getX(i));
    const stripe = kind !== 1 && Math.sin(ang * 8) > 0.3;
    t.copy(stripe ? b : a);
    if (kind === 1) {
      const n = Math.sin(pos.getX(i) * 300) * Math.sin(pos.getY(i) * 260) * Math.sin(pos.getZ(i) * 310);
      if (n > 0.55) { const r = 1 + 0.08; pos.setXYZ(i, pos.getX(i) * r, pos.getY(i), pos.getZ(i) * r); t.multiplyScalar(0.8); }
    }
    colors.set([t.r, t.g, t.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = s.mesh(geometry, s.material('#ffffff', { vertexColors: true, roughness: 0.4 }), at as [number, number, number]);
  mesh.rotation.set((random() - 0.5) * 0.4, random() * 6, (random() - 0.5) * 0.4);
  return mesh;
}

/** Multicoloured flint-corn kernels. */
export function kernelTexture(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3a2418'; ctx.fillRect(0, 0, 128, 256);
  const palette = ['#b22a1f', '#6b1f4a', '#e3b13a', '#efe0b8', '#3a2d6a', '#c8642a', '#7a3a1a', '#2a2a3a'];
  for (let y = 0; y < 22; y++) for (let x = 0; x < 12; x++) {
    ctx.fillStyle = palette[Math.floor(random() * palette.length)];
    ctx.beginPath(); ctx.ellipse(x * 10.7 + 5 + (y % 2) * 4, y * 11.6 + 6, 4.6, 5.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** An ear of flint corn hanging tip-down from `top`, its pale husks pulled back up over the hanging point. */
export function flintEar(s: Sculpture, top: THREE.Vector3, random: () => number, length = 0.2) {
  const group = new THREE.Group();
  const ear = new THREE.Mesh(new THREE.CapsuleGeometry(length * 0.17, length * 0.7, 6, 12), s.material('#ffffff', { map: kernelTexture(random), roughness: 0.5 }));
  ear.position.y = -length * 0.55;
  ear.castShadow = true;
  group.add(ear);
  const husk = s.material('#e3d3a2', { side: THREE.DoubleSide, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.22, length * 0.75), husk);
    const ang = (i / 3) * Math.PI * 2 + random();
    leaf.position.set(Math.cos(ang) * length * 0.08, length * 0.25, Math.sin(ang) * length * 0.08);
    leaf.rotation.set(Math.sin(ang) * 0.5, -ang + Math.PI / 2, -Math.cos(ang) * 0.5);
    leaf.castShadow = true;
    group.add(leaf);
  }
  group.position.copy(top);
  group.rotation.z = (random() - 0.5) * 0.3;
  s.root.add(group);
  return group;
}
