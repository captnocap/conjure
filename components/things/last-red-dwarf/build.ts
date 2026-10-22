import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const DEPTHS = {
  ember: ['#ff8a4a', '#d8401f', '#7a1608'],
  crimson: ['#f25a3c', '#b01c1c', '#4d0808'],
  wine: ['#c2504a', '#7a1a26', '#2e060e'],
  rose: ['#ffa48e', '#d9566a', '#7a1f3a'],
} as const;

export default defineThing({
  questions: {
    brightness: choice('How is the star burning?', {
      steady: 'A steady, even glow, calm as a pilot light that will last another trillion years.',
      guttering: 'Guttering: patchy and dim, dark crust closing over it, a candle in its last inch of wax.',
      flare: 'One last flare: a bright looping prominence and a jet thrown off one side.',
    }),
    colour: choice('How deep is its red?', {
      ember: 'Orange-red ember, the warmest it gets.',
      crimson: 'Plain deep crimson, a brake light in fog.',
      wine: 'Dark wine, almost brown, barely a colour at all.',
      rose: 'Faded dusty rose, tender and tired.',
    }),
    spots: choice('What pattern do its dark starspots make?', {
      few: 'Two or three small scattered spots.',
      belt: 'A belt of spots strung around the equator.',
      cap: 'A dark cap over one pole, like a cold shoulder.',
      great: 'One enormous spot, an eye that has nearly closed.',
      mottled: 'Mottled all over like a bruised fruit.',
    }),
    company: choice('Does anything still orbit and huddle close?', {
      nothing: 'Nothing. It burns alone.',
      world: 'One frozen world pulled in tight, like someone warming their hands.',
      family: 'Three or four cinder worlds on close, tidy orbits.',
      rubble: 'A thin ring of rubble, what is left of its planets.',
      habitats: 'A cluster of tiny habitats with lit windows, gathered on one side as if round a campfire.',
    }),
    halo: choice('What is the glow around it like?', {
      skin: 'A tight skin of light, hardly any halo.',
      haze: 'A soft, wide, even haze.',
      streaks: 'Long thin streamers reaching outward.',
    }),
    crust: score('How far has it crusted over?', ['Clean glowing surface', 'A few dark slag plates', 'Half covered in dark plates with glowing seams']),
    tilt: noul('Is it tipped over on its side, spinning at a tired angle?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [hot, mid, deep] = DEPTHS[a.colour];
    const R = 1.2;
    const dim = a.brightness === 'guttering' ? 0.55 : a.brightness === 'flare' ? 1.15 : 0.9;

    // Paint the photosphere: granulation, limb seams, spots and slag plates.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = mid;
    ctx.fillRect(0, 0, 1024, 512);
    const blot = (x: number, y: number, rx: number, ry: number, colour: string, alpha: number) => {
      for (const dx of [-1024, 0, 1024]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rx);
        g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, y); ctx.scale(1, ry / rx); ctx.translate(0, -y);
        ctx.fillStyle = g; ctx.fillRect(x + dx - rx, y - rx, rx * 2, rx * 2); ctx.restore();
      }
    };
    for (let i = 0; i < 520; i++) blot(random() * 1024, random() * 512, 10 + random() * 34, 8 + random() * 22, random() < 0.55 ? hot : deep, 0.2 + random() * 0.25);
    if (a.brightness === 'guttering') for (let i = 0; i < 40; i++) blot(random() * 1024, random() * 512, 60 + random() * 90, 40 + random() * 60, deep, 0.5);
    const spot = (x: number, y: number, r: number) => {
      blot(x, y, r * 1.9, r * 1.5, deep, 0.9);
      blot(x, y, r * 1.15, r * 0.9, '#140305', 1);
      blot(x, y, r * 0.8, r * 0.62, '#0a0102', 1);
    };
    if (a.spots === 'few') for (let i = 0; i < 2 + Math.floor(random() * 2); i++) spot(360 + random() * 460, 150 + random() * 210, 20 + random() * 16);
    if (a.spots === 'belt') for (let i = 0; i < 11; i++) spot(i * 93 + random() * 40, 250 + (random() - 0.5) * 50, 14 + random() * 18);
    if (a.spots === 'cap') { ctx.fillStyle = '#12030400'; for (let i = 0; i < 26; i++) spot(random() * 1024, 20 + random() * 80, 40 + random() * 30); }
    if (a.spots === 'great') { spot(640, 250, 95); for (let i = 0; i < 4; i++) spot(520 + random() * 260, 150 + random() * 220, 10 + random() * 8); }
    if (a.spots === 'mottled') for (let i = 0; i < 46; i++) spot(random() * 1024, 60 + random() * 390, 8 + random() * 22);
    // Slag plates: dark polygons with bright seams between them.
    const plates = Math.round(a.crust * 130 + mood.wear * 10);
    for (let i = 0; i < plates; i++) {
      const x = random() * 1024, y = 40 + random() * 430, r = 10 + random() * 22, n = 5 + Math.floor(random() * 3);
      for (const dx of [-1024, 0, 1024]) {
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const t = (k / n) * Math.PI * 2 + i, rr = r * (0.7 + ((k * 7 + i) % 5) * 0.08);
          ctx[k ? 'lineTo' : 'moveTo'](x + dx + Math.cos(t) * rr * 1.3, y + Math.sin(t) * rr * 0.8);
        }
        ctx.closePath();
        ctx.fillStyle = '#1c0a0a'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = hot; ctx.stroke();
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;

    const star = new THREE.Group();
    const surface = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: dim, roughness: 1, color: '#30100c' });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 36), surface);
    globe.castShadow = true;
    star.add(globe);

    // Halo shells: see-through, so they never count as solid.
    const haloMats: THREE.MeshBasicMaterial[] = [];
    const shells = { skin: [1.05], haze: [1.06, 1.16, 1.3, 1.48], streaks: [1.05, 1.14] }[a.halo];
    shells.forEach((k, i) => {
      const m = new THREE.MeshBasicMaterial({ color: i === 0 ? hot : mid, transparent: true, opacity: (a.halo === 'haze' ? 0.16 : 0.2) * dim / (1 + i * 0.5), depthWrite: false, side: THREE.BackSide });
      haloMats.push(m);
      star.add(new THREE.Mesh(new THREE.SphereGeometry(R * k, 40, 24), m));
    });
    const glowLine = new THREE.MeshBasicMaterial({ color: hot, transparent: true, opacity: 0.55 * dim, depthWrite: false });
    if (a.halo === 'streaks') {
      for (let i = 0; i < 26; i++) {
        const dir = new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.9, random() - 0.5).normalize();
        const len = R * (0.5 + random() * 1.0);
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.02 + random() * 0.015, len, 6), glowLine);
        ray.position.copy(dir).multiplyScalar(R * 1.0 + len / 2);
        ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        star.add(ray);
      }
    }

    // Prominences: small loops always, one great one for the last flare.
    const flareMat = new THREE.MeshStandardMaterial({ color: hot, emissive: mid, emissiveIntensity: 0.9, roughness: 1 });
    const loop = (dir: THREE.Vector3, size: number, thick: number) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(size, thick, 8, 28, Math.PI * 1.15), flareMat);
      arc.position.copy(dir).multiplyScalar(R * 0.97);
      arc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      arc.rotateY(random() * Math.PI);
      arc.rotateZ(-Math.PI * 0.075);
      arc.castShadow = true;
      star.add(arc);
      return arc;
    };
    const small = a.brightness === 'guttering' ? 1 : 2 + Math.floor(random() * 2);
    for (let i = 0; i < small; i++) loop(new THREE.Vector3(random() - 0.5, (random() - 0.5) * 1.2, random() * 0.8 + 0.1).normalize(), 0.09 + random() * 0.07, 0.018);
    let bigFlare: THREE.Object3D | null = null;
    if (a.brightness === 'flare') {
      const dir = new THREE.Vector3(0.72, 0.5, 0.48).normalize();
      bigFlare = new THREE.Group();
      star.add(bigFlare);
      const big = loop(dir, 0.42, 0.045);
      loop(dir.clone().add(new THREE.Vector3(0.1, -0.12, 0.08)).normalize(), 0.26, 0.03);
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.13, 1.1, 10), flareMat);
      jet.position.copy(dir).multiplyScalar(R + 0.5);
      jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      jet.castShadow = true;
      star.add(jet);
      for (let i = 0; i < 9; i++) {
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + random() * 0.05, 1), flareMat);
        blob.position.copy(dir).multiplyScalar(R + 0.9 + random() * 0.9).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.45));
        star.add(blob);
      }
      void big;
    }
    if (a.tilt) star.rotation.z = 0.55 + random() * 0.3;
    star.rotation.y = random() * 0.6 - 0.3;
    s.root.add(star);

    // Company.
    const orbiters: { node: THREE.Object3D; radius: number; phase: number; speed: number; tiltX: number }[] = [];
    const ringMat = new THREE.MeshBasicMaterial({ color: '#5b3a40', transparent: true, opacity: 0.5, depthWrite: false });
    const world = (radius: number, size: number, phase: number, tiltX: number, colour: string) => {
      const pivot = new THREE.Group();
      pivot.rotation.x = tiltX;
      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 3), s.material(colour, { roughness: 0.9, flatShading: false }));
      body.castShadow = true;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(size * 1.01, 16, 8, 0, Math.PI * 2, 0, 0.6), s.material('#e8eef2', { roughness: 0.6 }));
      body.add(cap);
      body.position.set(Math.cos(phase) * radius, 0, Math.sin(phase) * radius);
      pivot.add(body);
      const track = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 4, 96), ringMat);
      track.rotation.x = Math.PI / 2;
      pivot.add(track);
      s.root.add(pivot);
      orbiters.push({ node: body, radius, phase, speed: 0.5 / radius ** 1.5, tiltX });
    };
    if (a.company === 'world') world(R * 1.42, 0.2, 0.9 + random() * 0.5, 0.18, '#59616e');
    if (a.company === 'family') {
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) world(R * (1.35 + i * 0.3), 0.09 + random() * 0.1, random() * Math.PI * 2, 0.12 + (random() - 0.5) * 0.08, ['#5a5560', '#6d5a50', '#4c5a66', '#74685e'][i % 4]);
    }
    let belt: THREE.Object3D | null = null;
    if (a.company === 'rubble') {
      const bits = Array.from({ length: 150 + Math.round(mood.density * 160) }, () => {
        const t = random() * Math.PI * 2, r = R * (1.5 + random() * 0.4 + (random() < 0.1 ? random() * 0.4 : 0));
        return { at: [Math.cos(t) * r, (random() - 0.5) * 0.06, Math.sin(t) * r] as [number, number, number], size: 0.012 + random() ** 3 * 0.06, color: random() < 0.5 ? '#6a5a58' : '#3d3a40' };
      });
      const group = new Sculpture(context);
      group.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.95, flatShading: true }), bits);
      group.root.rotation.x = 0.2; group.root.rotation.z = 0.08;
      s.root.add(group.root);
      belt = group.root;
    }
    if (a.company === 'habitats') {
      const hull = s.material('#6f6a70', { roughness: 0.7, metalness: 0.3 });
      const lit = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffcf70', emissiveIntensity: mix(0.6, 1.6, mood.cheer) });
      const n = 7 + Math.round(mood.density * 7);
      for (let i = 0; i < n; i++) {
        const t = 0.35 + (i / n) * 1.3 + random() * 0.1, r = R * (1.3 + random() * 0.35), y = (random() - 0.5) * 0.9;
        const hab = new THREE.Group();
        const len = 0.09 + random() * 0.08;
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, len, 10), hull);
        can.rotation.z = Math.PI / 2; can.castShadow = true;
        hab.add(can);
        for (let w = 0; w < 3; w++) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.06), lit); win.position.x = (w - 1) * len * 0.3; hab.add(win); }
        const vane = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.13, 0.045), s.material('#2d3140', { metalness: 0.4 }));
        vane.position.x = len / 2 + 0.01; hab.add(vane);
        hab.position.set(Math.cos(t) * r, y, Math.sin(t) * r);
        hab.lookAt(0, 0, 0);
        hab.rotateZ(random() * 0.6 - 0.3);
        s.root.add(hab);
      }
    }

    const spin = mix(0.02, 0.14, mood.energy);
    const flick = a.brightness === 'guttering' ? 0.35 : 0.06;
    const baseOpacity = haloMats.map((m) => m.opacity);
    return s.finish({
      footprint: R * 1.1,
      update(dt, time) {
        globe.rotation.y += dt * spin;
        const f = 1 + flick * (Math.sin(time * 7.3) * 0.5 + Math.sin(time * 2.1 + 1) * 0.5) * mix(0.5, 1.3, mood.energy);
        surface.emissiveIntensity = dim * f;
        haloMats.forEach((m, i) => { m.opacity = baseOpacity[i] * f; });
        flareMat.emissiveIntensity = 0.9 * (a.brightness === 'flare' ? 1 + Math.sin(time * 3) * 0.25 : 1);
        for (const o of orbiters) { o.phase += dt * o.speed * mix(0.3, 1.5, mood.energy); o.node.position.set(Math.cos(o.phase) * o.radius, 0, Math.sin(o.phase) * o.radius); }
        if (belt) belt.rotation.y += dt * 0.04;
        void bigFlare;
      },
    });
  },
});
