import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';
import { paint } from './pose';

export type WallFinish = 'red-brick' | 'painted-brick' | 'plaster' | 'breeze-block' | 'fence';

export interface WallOptions {
  width: number;
  height: number;
  thickness?: number;
  finish: WallFinish;
  /** 0 clean … 1 grimy and scuffed. */
  wear: number;
  random: () => number;
  /** Extra marks painted onto the face after the surface: chalk, scuffs, a line. */
  marks?: (c: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Centre of the wall's base. The face points +z. */
  at?: [number, number, number];
}

/** A short run of wall, the face painted on a canvas: Victorian red brick, painted brick, plaster, block or fence. */
export function wall(art: Sculpture, options: WallOptions) {
  const { width, height, finish, wear, random } = options;
  const thickness = options.thickness ?? 0.22;
  const [ax, ay, az] = options.at ?? [0, 0, 0];
  const W = 512, Hpx = Math.max(128, Math.round(512 * height / width));
  const face = paint(W, Hpx, (c) => {
    const px = W / width; // pixels per metre
    if (finish === 'red-brick' || finish === 'painted-brick') {
      const painted = finish === 'painted-brick';
      c.fillStyle = painted ? '#c9c2b2' : '#b8a99a';
      c.fillRect(0, 0, W, Hpx);
      const bh = 0.075 * px, bw = 0.225 * px, gap = 0.012 * px;
      const palette = painted ? ['#e9e2d2', '#e2dbc9', '#ded6c4', '#ece6d6'] : ['#a4432f', '#9a3b2a', '#b04d36', '#8e3a2c', '#7c3327', '#b65a3d'];
      for (let row = 0; row * bh < Hpx; row++) {
        const offset = row % 2 ? bw / 2 : 0;
        for (let col = -1; col * bw < W + bw; col++) {
          const x = col * bw + offset + gap / 2, y = Hpx - (row + 1) * bh + gap / 2;
          c.fillStyle = palette[Math.floor(random() * palette.length)];
          c.fillRect(x, y, bw - gap, bh - gap);
          if (!painted && random() < 0.08) { c.fillStyle = 'rgba(40,20,15,0.35)'; c.fillRect(x, y, bw - gap, bh - gap); }
        }
      }
      if (painted) {
        // Chips where the paint has come off down to the brick.
        for (let i = 0; i < 2 + wear * 10; i++) { c.fillStyle = 'rgba(164,67,47,0.7)'; c.fillRect(random() * W, Hpx * 0.5 + random() * Hpx * 0.5, 3 + random() * 8, 2 + random() * 4); }
      }
    } else if (finish === 'plaster') {
      c.fillStyle = '#e7dfc8';
      c.fillRect(0, 0, W, Hpx);
      for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(120,100,80,${0.03 + random() * 0.05})`; c.fillRect(random() * W, random() * Hpx, 2 + random() * 6, 2 + random() * 6); }
      // Skirting board and a dado line.
      c.fillStyle = '#6b5a44'; c.fillRect(0, Hpx - 0.15 * px, W, 0.15 * px);
      c.fillStyle = '#9a8a6a'; c.fillRect(0, Hpx - 0.9 * px, W, 0.03 * px);
    } else if (finish === 'breeze-block') {
      c.fillStyle = '#9b9a92';
      c.fillRect(0, 0, W, Hpx);
      const bh = 0.215 * px, bw = 0.44 * px, gap = 0.012 * px;
      for (let row = 0; row * bh < Hpx; row++) {
        const offset = row % 2 ? bw / 2 : 0;
        for (let col = -1; col * bw < W + bw; col++) {
          c.fillStyle = ['#aeada4', '#a6a59c', '#b4b2a8', '#a09f96'][Math.floor(random() * 4)];
          c.fillRect(col * bw + offset + gap / 2, Hpx - (row + 1) * bh + gap / 2, bw - gap, bh - gap);
        }
      }
    } else {
      // Close-boarded timber fence.
      c.fillStyle = '#7a5a3a';
      c.fillRect(0, 0, W, Hpx);
      const board = 0.1 * px;
      for (let col = 0; col * board < W; col++) {
        c.fillStyle = ['#8a6a44', '#946f48', '#7f613d', '#9a7550'][Math.floor(random() * 4)];
        c.fillRect(col * board + 1, 0, board - 2, Hpx);
        for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(60,40,20,0.25)'; c.fillRect(col * board + 2 + random() * (board - 6), random() * Hpx, 1, 10 + random() * 40); }
      }
      c.fillStyle = '#6a4a2a'; c.fillRect(0, Hpx * 0.25, W, 0.08 * px); c.fillRect(0, Hpx * 0.7, W, 0.08 * px);
    }
    // Grime rising from the ground and scuffs, by wear.
    const grime = c.createLinearGradient(0, Hpx, 0, Hpx - 0.5 * px);
    grime.addColorStop(0, `rgba(30,25,20,${0.15 + wear * 0.4})`);
    grime.addColorStop(1, 'rgba(30,25,20,0)');
    c.fillStyle = grime;
    c.fillRect(0, Hpx - 0.5 * px, W, 0.5 * px);
    for (let i = 0; i < wear * 40; i++) { c.fillStyle = `rgba(20,15,10,${0.1 + random() * 0.2})`; c.fillRect(random() * W, Hpx - random() * Hpx * 0.6, 3 + random() * 20, 1 + random() * 3); }
    options.marks?.(c, W, Hpx);
  });
  const side = art.material(finish === 'red-brick' ? '#a4432f' : finish === 'painted-brick' ? '#e2dbc9' : finish === 'plaster' ? '#e7dfc8' : finish === 'breeze-block' ? '#a6a59c' : '#8a6a44', { roughness: 0.95 });
  const skin = new THREE.MeshStandardMaterial({ map: face, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), [side, side, side, side, skin, side]);
  body.position.set(ax, ay + height / 2, az - thickness / 2);
  body.castShadow = body.receiveShadow = true;
  art.root.add(body);
  if (finish === 'red-brick' || finish === 'painted-brick') {
    // A coping course on top.
    art.box([width + 0.04, 0.06, thickness + 0.06], [ax, ay + height + 0.03, az - thickness / 2], art.material(finish === 'red-brick' ? '#6e5a50' : '#cfc6b4', { roughness: 0.9 }));
  }
  if (finish === 'fence') {
    for (const x of [-width / 2 + 0.08, width / 2 - 0.08]) art.box([0.08, height + 0.1, 0.08], [ax + x, ay + (height + 0.1) / 2, az - thickness - 0.04], art.material('#5a3f28', { roughness: 0.9 }));
  }
  return body;
}
