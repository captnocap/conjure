import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { MASK_OPTIONS, board, gather, paint, solder } from './pcb';

const COLOURS = {
  red: 'Red: fault, record, stop.',
  green: 'Green: power, ready, all is well.',
  amber: 'Amber: standby, caution, charging.',
  blue: 'Piercing blue, the colour of 2005.',
  white: 'Cold white.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = { red: '#ff2a1e', green: '#2dea4a', amber: '#ffa218', blue: '#2a6bff', white: '#f2f6ff' };
const STATES = {
  off: 'Dark. Nothing is happening, or nothing can.',
  steady: 'Lit and steady.',
  blinking: 'Blinking on and off in an even rhythm.',
  failing: 'Dim and stuttering, a light on its way out.',
} as const;

export default defineThing({
  questions: {
    first: choice('What colour is the left LED?', COLOURS),
    firstState: choice('What is the left LED doing?', STATES),
    second: choice('What colour is the right LED?', COLOURS),
    secondState: choice('What is the right LED doing?', STATES),
    labels: choice('What do the silkscreened labels say?', {
      power: 'PWR and ERR',
      serial: 'TX and RX',
      network: 'LINK and ACT',
      run: 'RUN and FAULT',
      disk: 'HDD and PWR',
      standby: 'ON and STBY',
    }),
    lens: choice('What shape are the lenses?', {
      round: 'Ordinary 5 mm domes of tinted, milky epoxy.',
      small: 'Small 3 mm domes, discreet.',
      flat: 'Rectangular flat-topped bars.',
      clear: 'Water-clear domes with the metal anvil and die visible inside.',
    }),
    legs: choice('How do they stand?', {
      flush: 'Pushed down flush against the board.',
      tall: 'Standing tall on straight legs like street lamps.',
      forward: 'Bent over at a right angle to point forward, as if through a front panel.',
      crooked: 'Tall but knocked crooked, leaning different ways.',
    }),
    resistors: noul('Are their current-limiting resistors visible behind them?'),
    board: choice('What kind of board is it on?', MASK_OPTIONS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const w = 32, d = 24;
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 });
    const names = { power: ['PWR', 'ERR'], serial: ['TX', 'RX'], network: ['LINK', 'ACT'], run: ['RUN', 'FAULT'], disk: ['HDD', 'PWR'], standby: ['ON', 'STBY'] }[a.labels];
    const scale = a.lens === 'small' ? 0.62 : 1;
    const spots = [{ x: -6.5, colour: a.first, state: a.firstState }, { x: 6.5, colour: a.second, state: a.secondState }];
    const z0 = -1;

    board(s, {
      w, d, mask: a.board, random, wear: mood.wear,
      pads: spots.flatMap((spot) => [{ x: spot.x - 1.27, z: z0, r: 1, square: true }, { x: spot.x + 1.27, z: z0, r: 1 }]),
      outlines: spots.map((spot) => ({ x: spot.x, z: z0, w: 6.6 * scale + 0.6, d: 6.6 * scale + 0.6, round: a.lens !== 'flat' })),
      silk: [
        ...spots.map((spot, index) => ({ text: names[index], x: spot.x, z: z0 + 7.6, size: 3.1 })),
        ...spots.map((spot, index) => ({ text: `D${index + 1}`, x: spot.x + 5.2, z: z0 - 3.5, size: 1.7 })),
      ],
    });

    const glowTexture = paint(128, 128, (ctx) => {
      const pool = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      pool.addColorStop(0, 'rgba(255,255,255,1)');
      pool.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      pool.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, 128, 128);
    });

    const lamps: { state: keyof typeof STATES; lens: THREE.MeshStandardMaterial; glows: THREE.Material[]; phase: number; power: number }[] = [];
    for (const spot of spots) {
      const hue = new THREE.Color(HEX[spot.colour]);
      const lit = spot.state !== 'off';
      const clear = a.lens === 'clear';
      const power = spot.state === 'failing' ? 0.55 : 1;
      const lens = new THREE.MeshStandardMaterial({
        color: clear ? new THREE.Color('#e9eef0').lerp(hue, lit ? 0.35 : 0.05) : hue.clone().multiplyScalar(lit ? 0.9 : 0.42).lerp(new THREE.Color('#d8d8d0'), spot.colour === 'white' ? 0.5 : 0.12),
        emissive: hue, emissiveIntensity: lit ? (clear ? 0.5 : 0.62) * power : 0,
        roughness: 0.25, transparent: true, opacity: clear ? 0.62 : 0.93,
      });
      const glows: THREE.Material[] = [];
      const standoff = a.legs === 'flush' ? 0.25 : a.legs === 'forward' ? 4.5 : mix(6, 9, random());
      const lamp = gather(s, () => {
        if (a.lens === 'flat') {
          s.box([5.2, 1, 2.8], [0, 0.5, 0], lens);
          s.box([4.6, 6.2, 2.2], [0, 4.1, 0], lens);
        } else {
          const profile: [number, number][] = [[0, 0], [2.95, 0], [2.95, 1], [2.5, 1], [2.5, 5.4]];
          for (let k = 1; k <= 8; k++) profile.push([Math.cos(k / 8 * Math.PI / 2) * 2.5, 5.4 + Math.sin(k / 8 * Math.PI / 2) * 3.1]);
          s.lathe(profile, lens).scale.setScalar(scale);
        }
        // The lead frame inside: a cup on one leg and a post on the other.
        const frame = s.material('#b9bcba', { metalness: 0.8, roughness: 0.35 });
        if (clear) {
          s.box([1.5 * scale, 3.4 * scale, 0.5], [-0.9 * scale, 2.6 * scale, 0], frame);
          s.box([0.8 * scale, 2.8 * scale, 0.5], [1.1 * scale, 2.2 * scale, 0], frame);
          s.box([0.7 * scale, 0.4 * scale, 0.6], [-0.8 * scale, 4.5 * scale, 0], new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: lit ? 3 : 0 }));
        }
        if (lit) {
          const halo = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.11 * power, depthWrite: false, blending: THREE.AdditiveBlending });
          const aura = s.ball([5.2 * scale, 6.4 * scale, 5.2 * scale], [0, 4.6 * scale, 0], halo, 16);
          aura.castShadow = aura.receiveShadow = false;
          glows.push(halo);
        }
      });
      // Legs: the anode is the longer one, so the two joints never quite match.
      const tilt: [number, number, number] = a.legs === 'crooked' ? [(random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.8] : [(random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.05];
      const stem = gather(s, () => {
        for (const side of [-1, 1]) s.box([0.5, standoff + 1.8, 0.5], [side * 1.27 * Math.min(1, scale + 0.2), (standoff + 1.8) / 2 - 1.6, 0], tin);
      });
      if (a.legs === 'forward') {
        lamp.rotation.x = Math.PI / 2;
        lamp.position.set(spot.x, standoff + 0.2, z0 + 0.4);
        for (const side of [-1, 1]) s.box([0.5, 0.5, 1.2], [spot.x + side * 1.27 * Math.min(1, scale + 0.2), standoff, z0 + 0.3], tin);
        stem.position.set(spot.x, 0, z0);
      } else {
        const holder = new THREE.Group();
        lamp.position.y = standoff;
        holder.add(lamp, stem);
        holder.position.set(spot.x, 0, z0);
        holder.rotation.set(...tilt);
        s.root.add(holder);
      }
      for (const side of [-1, 1]) solder(s, spot.x + side * 1.27, z0, tin, 0.7);
      if (lit) {
        const pool = new THREE.MeshBasicMaterial({ map: glowTexture, color: hue, transparent: true, opacity: 0.4 * power, depthWrite: false, blending: THREE.AdditiveBlending });
        const disc = s.mesh(new THREE.PlaneGeometry(22, 22), pool, [spot.x, 0.06, z0 + (a.legs === 'forward' ? 6 : 0)]);
        disc.rotation.x = -Math.PI / 2;
        disc.castShadow = disc.receiveShadow = false;
        glows.push(pool);
      }
      lamps.push({ state: spot.state, lens, glows, phase: random() * 2, power });
    }

    if (a.resistors) {
      const body = s.material('#d8c69a', { roughness: 0.6 });
      const bands = ['#7a4a22', '#c22f2f', '#e08a1e', '#111111', '#c9a84a'];
      for (const spot of spots) {
        const z = z0 - 7.2;
        const barrel = s.cylinder(1.05, 1.05, 5.4, [spot.x, 1.5, z], body, 14);
        barrel.rotation.z = Math.PI / 2;
        for (const end of [-1, 1]) s.ball([0.9, 1.25, 1.25], [spot.x + end * 2.4, 1.5, z], body, 12);
        for (let k = 0; k < 4; k++) s.cylinder(1.1 + (k === 0 || k === 3 ? 0.18 : 0), 1.1 + (k === 0 || k === 3 ? 0.18 : 0), 0.5, [spot.x - 2.3 + k * (k === 3 ? 1.55 : 1.1), 1.5, z], s.material(bands[k === 3 ? 4 : Math.floor(random() * 4)]), 14).rotation.z = Math.PI / 2;
        s.tube([[spot.x - 5.1, -1.5, z], [spot.x - 5.1, 1.2, z], [spot.x - 4.5, 1.5, z], [spot.x + 4.5, 1.5, z], [spot.x + 5.1, 1.2, z], [spot.x + 5.1, -1.5, z]], 0.25, tin);
        for (const end of [-1, 1]) solder(s, spot.x + end * 5.1, z, tin, 0.6);
      }
    }

    s.root.scale.setScalar(0.001);
    const rate = mix(1.2, 7, mood.energy);
    const base = lamps.map((lamp) => ({ emissive: lamp.lens.emissiveIntensity, glows: lamp.glows.map((glow) => glow.opacity) }));
    const moving = lamps.some((lamp) => lamp.state === 'blinking' || lamp.state === 'failing');
    return s.finish({
      update: moving ? (_dt, time) => {
        lamps.forEach((lamp, index) => {
          let level = 1;
          // Blinkers start lit, so a still frame taken at once shows them on.
          if (lamp.state === 'blinking') level = Math.sin(time * rate + lamp.phase * 0.5) > -0.35 ? 1 : 0.04;
          else if (lamp.state === 'failing') level = 0.45 + 0.4 * Math.sin(time * 23 + lamp.phase) * Math.sin(time * 7.3 + index) + (Math.sin(time * 3.1 + lamp.phase * 4) > 0.8 ? -0.4 : 0);
          else return;
          level = Math.max(0.02, level);
          lamp.lens.emissiveIntensity = base[index].emissive * level;
          lamp.glows.forEach((glow, k) => { glow.opacity = base[index].glows[k] * level; });
        });
      } : undefined,
    });
  },
});
