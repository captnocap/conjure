import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const GLASS = {
  open: ['#ffc85a'],
  ruby: ['#ff4a3a'],
  emerald: ['#3fe08a'],
  sapphire: ['#4aa8ff'],
  jewel: ['#ff4a3a', '#3fe08a', '#4aa8ff', '#ffc85a', '#d86aff'],
} as const;

type Ctx = CanvasRenderingContext2D;
function star(ctx: Ctx, x: number, y: number, r: number, points: number, turn = 0) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = turn + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2, d = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(angle) * d, y + Math.sin(angle) * d);
  }
  ctx.closePath();
  ctx.fill();
}

export default defineThing({
  questions: {
    shape: choice('What shape is the lantern?', {
      onion: 'A swelling onion bulb rising to a pointed finial, the classic bazaar lamp.',
      drum: 'An eight-sided drum with a domed cap and little feet.',
      globe: 'A round pierced ball.',
      spiked: 'A many-pointed star of brass cones.',
    }),
    piercing: choice('What pattern is punched through the brass?', {
      stars: 'Eight-pointed stars.',
      crescents: 'Crescent moons, each with a single dot.',
      lattice: 'A fine diamond lattice, more hole than metal.',
      rosettes: 'Rings of round holes like flowers.',
    }),
    glass: choice('What colours the light?', {
      open: 'Nothing: bare flame, warm gold through open holes.',
      ruby: 'Ruby red glass behind the piercing.',
      emerald: 'Green glass.',
      sapphire: 'Blue glass, cool and strange.',
      jewel: 'Every hole a different jewel colour.',
    }),
    flame: choice('How is it burning?', {
      blazing: 'Turned up bright: stars of light thrown wide across the ground.',
      low: 'Trimmed low for the small hours, a dim steady glow.',
      out: 'Gone out: cold metal, a sooty cap, nobody came.',
    }),
    mount: choice('How is it hung or set?', {
      pole: 'On a chain from the crook of a tall wooden pole planted in a stone.',
      wall: 'From an iron bracket on a pier of mud-brick wall.',
      table: 'Set down on a low eight-sided table, its chain coiled beside it.',
      ground: 'Set down on the ground by its carrying ring, as a traveller leaves it.',
    }),
    company: choice('What keeps it company?', {
      nothing: 'Nothing.',
      moths: 'Moths circling it.',
      second: 'A second, smaller lantern.',
      oil: 'An oil flask and a spare taper, left ready for whoever comes next.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = { blazing: 1, low: 0.4, out: 0 }[a.flame];
    const tints = GLASS[a.glass];
    const brassHex = `#${new THREE.Color('#c99a34').lerp(new THREE.Color('#5f7f6c'), mood.wear * 0.4).getHexString()}`;
    const brass = s.material(brassHex, { metalness: 0.5, roughness: 0.4, emissive: '#3d2a08', emissiveIntensity: 0.35 });
    const iron = s.material('#2e2a27', { metalness: 0.4, roughness: 0.6 });

    // One painted skin for every pierced surface: brass with holes, and the same holes as glow.
    const skin = (() => {
      const colour = document.createElement('canvas'), glow = document.createElement('canvas');
      colour.width = glow.width = 512; colour.height = glow.height = 256;
      const c = colour.getContext('2d')!, g = glow.getContext('2d')!;
      c.fillStyle = brassHex; c.fillRect(0, 0, 512, 256);
      g.fillStyle = '#000'; g.fillRect(0, 0, 512, 256);
      c.fillStyle = 'rgba(60,35,5,0.45)';
      for (const y of [6, 22, 228, 246]) c.fillRect(0, y, 512, 4);
      const hole = (draw: (ctx: Ctx) => void) => {
        const tint = tints[Math.floor(random() * tints.length)];
        c.fillStyle = lit ? `#${new THREE.Color(tint).lerp(new THREE.Color('#fff6d8'), 0.45).getHexString()}` : '#1c1611';
        draw(c);
        g.fillStyle = lit ? tint : '#000';
        draw(g);
      };
      const cols = a.piercing === 'lattice' ? 16 : 8, rows = a.piercing === 'lattice' ? 7 : 3;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * (512 / cols), y = 40 + (j + 0.5) * (176 / rows);
        for (const wrap of [0, -512]) {
          const cx = x + wrap;
          if (a.piercing === 'stars') hole((ctx) => star(ctx, cx, y, 23, 8));
          else if (a.piercing === 'crescents') hole((ctx) => { ctx.beginPath(); ctx.arc(cx, y, 20, 0.6, Math.PI * 2 - 0.6); ctx.arc(cx + 9, y, 15, Math.PI * 2 - 0.9, 0.9, true); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 13, y, 5, 0, 7); ctx.fill(); });
          else if (a.piercing === 'lattice') hole((ctx) => { ctx.beginPath(); ctx.moveTo(cx, y - 11); ctx.lineTo(cx + 12, y); ctx.lineTo(cx, y + 11); ctx.lineTo(cx - 12, y); ctx.fill(); });
          else hole((ctx) => { for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(cx + Math.cos(k * 1.047) * 16, y + Math.sin(k * 1.047) * 16, 6, 0, 7); ctx.fill(); } ctx.beginPath(); ctx.arc(cx, y, 7, 0, 7); ctx.fill(); });
        }
      }
      if (a.flame === 'out') { const soot = c.createLinearGradient(0, 0, 0, 256); soot.addColorStop(0, 'rgba(15,12,10,0)'); soot.addColorStop(1, 'rgba(15,12,10,0.7)'); c.fillStyle = soot; c.fillRect(0, 0, 512, 256); }
      const map = new THREE.CanvasTexture(colour), emissiveMap = new THREE.CanvasTexture(glow);
      map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = emissiveMap.wrapS = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: lit * 1.6, metalness: 0.35, roughness: 0.45, side: THREE.DoubleSide });
    })();

    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lathe = (points: [number, number][], seg = 24) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);

    /** A lantern with its base at the origin; returns the group and the height of its hanging ring. */
    const lantern = (k: number) => {
      const g = new THREE.Group();
      let top = 0;
      if (a.shape === 'onion') {
        put(g, lathe([[0.05, 0], [0.085, 0.012], [0.085, 0.03], [0.06, 0.05]]), brass);
        put(g, lathe([[0.06, 0.05], [0.12, 0.1], [0.165, 0.19], [0.165, 0.26], [0.13, 0.34], [0.075, 0.41], [0.04, 0.46]]), skin);
        put(g, lathe([[0.045, 0.455], [0.05, 0.47], [0.02, 0.5], [0.03, 0.53], [0.008, 0.57], [0, 0.59]]), brass);
        top = 0.59;
      } else if (a.shape === 'drum') {
        for (let i = 0; i < 4; i++) put(g, new THREE.SphereGeometry(0.018, 8, 6), brass, Math.cos(i * 1.57 + 0.4) * 0.11, 0.016, Math.sin(i * 1.57 + 0.4) * 0.11);
        put(g, new THREE.CylinderGeometry(0.15, 0.15, 0.025, 8), brass, 0, 0.042, 0);
        put(g, new THREE.CylinderGeometry(0.135, 0.135, 0.3, 8, 1, true), skin, 0, 0.205, 0);
        put(g, new THREE.CylinderGeometry(0.155, 0.155, 0.022, 8), brass, 0, 0.365, 0);
        put(g, lathe([[0.14, 0.375], [0.12, 0.44], [0.07, 0.49], [0.025, 0.51]], 8), skin);
        put(g, lathe([[0.03, 0.505], [0.034, 0.53], [0.012, 0.55], [0, 0.57]], 8), brass);
        top = 0.57;
      } else if (a.shape === 'globe') {
        put(g, lathe([[0.05, 0], [0.07, 0.01], [0.03, 0.04]]), brass);
        put(g, new THREE.SphereGeometry(0.175, 24, 16), skin, 0, 0.2, 0);
        const band = put(g, new THREE.TorusGeometry(0.177, 0.008, 6, 28), brass, 0, 0.2, 0);
        band.rotation.x = Math.PI / 2;
        put(g, lathe([[0.05, 0.36], [0.03, 0.39], [0.01, 0.42], [0, 0.44]]), brass);
        top = 0.44;
      } else {
        const core = new THREE.IcosahedronGeometry(0.1, 0);
        put(g, core, skin, 0, 0.27, 0);
        const position = core.getAttribute('position'), seen = new Set<string>(), up = new THREE.Vector3(0, 1, 0);
        for (let i = 0; i < position.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(position, i), key = v.toArray().map((n) => n.toFixed(2)).join();
          if (seen.has(key)) continue;
          seen.add(key);
          const spike = put(g, new THREE.ConeGeometry(0.058, 0.2, 5, 1, true), skin);
          spike.position.copy(v.clone().normalize().multiplyScalar(0.17)).add(new THREE.Vector3(0, 0.27, 0));
          spike.quaternion.setFromUnitVectors(up, v.clone().normalize());
        }
        top = 0.55;
      }
      const ring = put(g, new THREE.TorusGeometry(0.028, 0.006, 6, 14), brass, 0, top + 0.022, 0);
      ring.rotation.y = random() * 3;
      g.scale.setScalar(k);
      return { g, top: (top + 0.05) * k };
    };

    const chain = (parent: THREE.Object3D, length: number) => {
      const links = Math.max(2, Math.round(length / 0.045));
      for (let i = 0; i < links; i++) {
        const link = put(parent, new THREE.TorusGeometry(0.016, 0.0045, 5, 10), iron, 0, -(i + 0.5) * (length / links), 0);
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
        link.scale.y = 1.5;
      }
    };
    /** Hang a lantern from a point: the returned pivot sways. */
    const hang = (x: number, y: number, z: number, chainLength: number, k = 1.3) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      chain(pivot, chainLength);
      const { g, top } = lantern(k);
      g.position.y = -chainLength - top;
      pivot.add(g);
      s.root.add(pivot);
      return { pivot, centre: y - chainLength - top / 2 };
    };

    const pivots: THREE.Group[] = [];
    let lightRadius = 0.62, poolY = 0;
    const glowAt = new THREE.Vector3(0, 0.3, 0);
    const second = a.company === 'second';
    if (a.mount === 'pole') {
      const wood = s.material('#6e4f33'), h = 2.35;
      s.cylinder(0.2, 0.24, 0.16, [0, 0.08, 0], s.material('#b0a48e'), 8);
      s.rod([0, 0.1, 0], [0.02, h, 0], 0.035, wood, 0.026);
      for (const side of second ? [1, -1] : [1]) {
        const reach = side * 0.42, drop = side === 1 ? 0 : 0.28;
        s.tube([[0.02, h - 0.25 - drop, 0], [side * 0.08, h + 0.08 - drop, 0], [reach * 0.7, h + 0.16 - drop, 0], [reach, h + 0.06 - drop, 0], [reach, h - 0.02 - drop, 0]], 0.012, iron);
        const hung = hang(reach, h - 0.02 - drop, 0, side === 1 ? 0.2 : 0.3, side === 1 ? 1.3 : 0.8);
        pivots.push(hung.pivot);
        if (side === 1) glowAt.set(reach, hung.centre, 0);
      }
      for (let i = 0; i < 3; i++) s.ring(0.036, 0.006, [0.005 + i * 0.004, 0.6 + i * 0.55, 0], iron).rotation.x = Math.PI / 2;
      lightRadius = 0.9;
    } else if (a.mount === 'wall') {
      const mud = s.material('#c49a6a', { roughness: 1 }), h = 2.2;
      s.box([0.76, h, 0.36], [0, h / 2, -0.3], mud);
      s.box([0.86, 0.1, 0.44], [0, h + 0.05, -0.3], s.material('#b58a5c'));
      const tint = new THREE.Color('#a87f52');
      const bricks: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < 16 + mood.wear * 20; i++) bricks.push({ at: [(random() - 0.5) * 0.56, 0.1 + random() * (h - 0.2), -0.118], size: 1, color: tint.clone().multiplyScalar(mix(0.85, 1.1, random())) });
      s.scatter(new THREE.BoxGeometry(0.2, 0.065, 0.012), new THREE.MeshStandardMaterial({ roughness: 1 }), bricks);
      s.rod([0, 1.9, -0.13], [0, 1.9, 0.42], 0.014, iron);
      s.rod([0, 1.55, -0.13], [0, 1.9, 0.3], 0.01, iron);
      s.tube([[0, 1.9, 0.42], [0, 1.93, 0.47], [0, 1.88, 0.5], [0, 1.85, 0.46]], 0.01, iron);
      const hung = hang(0, 1.86, 0.46, 0.2);
      pivots.push(hung.pivot);
      glowAt.set(0, hung.centre, 0.46);
      if (second) { const { g } = lantern(0.62); g.position.set(0.42, 0, 0.2); s.root.add(g); }
      lightRadius = 0.85;
    } else {
      let y = 0;
      if (a.mount === 'table') {
        const wood = s.material('#5a3a26');
        y = 0.42;
        s.cylinder(0.36, 0.36, 0.035, [0, y - 0.0175, 0], wood, 8);
        s.cylinder(0.3, 0.3, 0.008, [0, y + 0.002, 0], brass, 8);
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
          s.box([0.26, 0.38, 0.02], [Math.cos(angle) * 0.31, 0.2, Math.sin(angle) * 0.31], wood).rotation.y = -angle + Math.PI / 2;
          s.box([0.1, 0.16, 0.024], [Math.cos(angle) * 0.31, 0.1, Math.sin(angle) * 0.31], s.material('#2a1a12')).rotation.y = -angle + Math.PI / 2;
        }
        for (let i = 0; i < 3; i++) s.ring(0.05 - i * 0.008, 0.006, [0.2, y + 0.012 + i * 0.008, 0.08], iron).rotation.x = Math.PI / 2;
      }
      const { g, top } = lantern(1);
      g.position.set(0, y + 0.006, 0);
      s.root.add(g);
      glowAt.set(0, y + top / 2, 0);
      if (second) { const small = lantern(0.6); small.g.position.set(a.mount === 'table' ? -0.19 : -0.34, y + 0.006, 0.1); s.root.add(small.g); }
      lightRadius = a.mount === 'table' ? 0.29 : 0.62;
      poolY = y;
    }

    if (a.company === 'oil') {
      const y = a.mount === 'table' ? 0.426 : 0, x = a.mount === 'table' ? 0.2 : 0.32, z = a.mount === 'table' ? -0.08 : 0.16;
      s.lathe([[0, 0], [0.035, 0], [0.06, 0.04], [0.05, 0.09], [0.015, 0.12], [0.012, 0.17], [0.022, 0.18]], s.material('#7a8a5a', { roughness: 0.3 }), [x, y, z]);
      s.rod([x - 0.1, y + 0.006, z + 0.12], [x + 0.08, y + 0.006, z + 0.16], 0.004, s.material('#e8dfc4'));
    }

    // Stars of light thrown on the ground: drawn, not lit, so every print shows them.
    let pool: THREE.Mesh | null = null;
    if (lit) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const halo = ctx.createRadialGradient(256, 256, 0, 256, 256, 250);
      const warm = tints.length === 1 ? tints[0] : '#ffc85a';
      halo.addColorStop(0, `${warm}66`); halo.addColorStop(1, `${warm}00`);
      ctx.fillStyle = halo; ctx.fillRect(0, 0, 512, 512);
      for (let ringIndex = 1; ringIndex <= 4; ringIndex++) {
        const count = 5 + ringIndex * 3, d = 38 + ringIndex * 50, offset = random() * 6;
        for (let i = 0; i < count; i++) {
          const angle = offset + (i / count) * Math.PI * 2;
          ctx.globalAlpha = mix(0.95, 0.3, ringIndex / 4);
          ctx.fillStyle = tints[Math.floor(random() * tints.length)];
          const x = 256 + Math.cos(angle) * d, y = 256 + Math.sin(angle) * d, r = 9 + ringIndex * 5;
          if (a.piercing === 'crescents') { ctx.beginPath(); ctx.arc(x, y, r, angle + 0.6, angle + Math.PI * 2 - 0.6); ctx.arc(x + Math.cos(angle) * r * 0.45, y + Math.sin(angle) * r * 0.45, r * 0.75, angle - 0.9, angle + 0.9, true); ctx.fill(); }
          else if (a.piercing === 'lattice') { ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, r * 0.6); ctx.lineTo(r, 0); ctx.lineTo(0, -r * 0.6); ctx.fill(); ctx.restore(); }
          else if (a.piercing === 'rosettes') { for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.047) * r * 0.7, y + Math.sin(k * 1.047) * r * 0.7, r * 0.28, 0, 7); ctx.fill(); } }
          else star(ctx, x, y, r, 8, angle);
        }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const size = lightRadius * (a.mount === 'table' ? 1 : mix(0.7, 1, lit));
      pool = new THREE.Mesh(new THREE.CircleGeometry(size, 40), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: mix(0.45, 0.95, lit) }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(glowAt.x, poolY + 0.008, glowAt.z);
      s.root.add(pool);
    }

    // Moths: small pale wings on tilted orbits round the light.
    const moths: { mesh: THREE.Mesh; radius: number; speed: number; phase: number; tilt: number }[] = [];
    if (a.company === 'moths') {
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.07, 0.04, 0.045, 0.07, 0.04, -0.045, 0, 0, 0, -0.07, 0.04, -0.045, -0.07, 0.04, 0.045], 3));
      wing.computeVertexNormals();
      const pale = new THREE.MeshStandardMaterial({ color: '#e9e2cf', side: THREE.DoubleSide, roughness: 0.9 });
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) {
        const mesh = put(s.root, wing, pale);
        moths.push({ mesh, radius: 0.3 + random() * 0.2, speed: (random() < 0.5 ? -1 : 1) * mix(0.6, 2.4, random()), phase: random() * 6, tilt: (random() - 0.5) * 0.9 });
      }
    }
    const fly = (time: number) => {
      for (const moth of moths) {
        const angle = moth.phase + time * moth.speed * mix(0.3, 1.6, mood.energy);
        moth.mesh.position.set(glowAt.x + Math.cos(angle) * moth.radius, glowAt.y + Math.sin(angle * 1.7 + moth.phase) * 0.12 + Math.sin(angle) * moth.tilt * 0.2, glowAt.z + Math.sin(angle) * moth.radius);
        moth.mesh.rotation.set(Math.sin(time * 30 + moth.phase) * 0.5, -angle, 0);
      }
    };
    fly(0);

    const sway = mix(0.006, 0.09, mood.energy), phase = random() * 6;
    pivots.forEach((pivot, index) => { pivot.rotation.z = Math.sin(phase + index) * sway; });
    return s.finish({
      footprint: a.mount === 'table' ? 0.4 : lightRadius * (lit ? 0.9 : 0.6),
      update: (_dt, time) => {
        pivots.forEach((pivot, index) => { pivot.rotation.z = Math.sin(time * 1.6 + phase + index) * sway; pivot.rotation.x = Math.cos(time * 1.1 + phase) * sway * 0.5; });
        if (lit) {
          const flicker = 1 + (Math.sin(time * 11 + phase) * 0.5 + Math.sin(time * 23.7) * 0.5) * mix(0.03, 0.2, mood.energy) * (a.flame === 'low' ? 1.6 : 1);
          skin.emissiveIntensity = lit * 1.6 * flicker;
          if (pool) (pool.material as THREE.MeshBasicMaterial).opacity = mix(0.45, 0.95, lit) * flicker;
        }
        fly(time);
      },
    });
  },
});
