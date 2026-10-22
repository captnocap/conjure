import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { cherub, chorister, dove, flame, glowTexture, seraph, wedge } from './shapes';

const LIGHTS = {
  gold: { core: '#fff3c4', glow: '#ffc94a', cloud: '#fff1d0' },
  white: { core: '#ffffff', glow: '#fff4dc', cloud: '#fbf8f0' },
  rose: { core: '#fff0e8', glow: '#ff9f8a', cloud: '#ffe6e0' },
  sapphire: { core: '#f2f8ff', glow: '#7fb0ff', cloud: '#e6efff' },
} as const;

export default defineThing({
  questions: {
    form: choice('What shape does the heavenly light take?', {
      rings: 'Concentric rings of cloud standing round the light like a great target, the circles of heaven.',
      rose: 'A vast white rose: tiers of cloud rising outward like an amphitheatre round the light below.',
      funnel: 'A funnel of rings narrowing away into the distance toward the light, as in Dore\'s Paradiso.',
      mandorla: 'A tall pointed almond of cloud rings and rays, like the glory round a saint in an altarpiece.',
    }),
    rings: choice('How many rings of cloud?', {
      three: 'Three broad soft rings.',
      seven: 'Seven rings, the seven heavens.',
      nine: 'Nine thin whirling rings, the nine choirs of angels.',
    }),
    centre: choice('What is at the heart of the light?', {
      sun: 'A blinding white-gold sun.',
      point: 'A single tiny point of unbearable light.',
      eye: 'An eye inside a gilt triangle.',
      dove: 'A white dove with spread wings.',
    }),
    host: choice('Who is in the glow?', {
      seraphim: 'Tiny red seraphim, each a head wrapped in six wings.',
      choir: 'Rows of little robed angels with haloes, singing.',
      cherubs: 'Winged cherub heads peeping out of the clouds.',
      none: 'No one: only cloud and light.',
    }),
    rays: choice('What kind of rays burst from it?', {
      gilt: 'Hard gilt rays, long and short by turns, like a baroque altar.',
      flame: 'Straight gilt rays alternating with wavy flame-shaped ones.',
      soft: 'Broad soft beams of pale light.',
      none: 'No rays, only the glow.',
    }),
    colour: choice('What colour is the light?', {
      gold: 'Warm gold.',
      white: 'Pure white.',
      rose: 'Rose and dawn pink.',
      sapphire: 'Sapphire blue, cold and holy.',
    }),
    state: choice('What is the light doing?', {
      full: 'Shining in full, every ring complete.',
      parting: 'Opening: the clouds are parting and the rings break apart to let the light through.',
      beam: 'A single beam has shot down from the heart of it to the ground below.',
      dimming: 'Fading: thin broken rings and a dimmed light, the vision ending.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = LIGHTS[a.colour];
    const dim = a.state === 'dimming';
    const shine = mix(0.6, 1.4, mood.cheer) * (dim ? 0.45 : 1);
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    const gilt = s.material('#d9a93e', { metalness: 0.85, roughness: mix(0.25, 0.5, mood.wear), emissive: '#7a4a10', emissiveIntensity: 0.25 * shine });
    const cloud = s.material(L.cloud, { roughness: 0.95, emissive: L.glow, emissiveIntensity: 0.12 * shine });
    const ringCount = { three: 3, seven: 7, nine: 9 }[a.rings];
    const vertical = a.form === 'rings' || a.form === 'mandorla';
    const R = 1.5;
    const aspect = a.form === 'mandorla' ? 0.62 : 1;

    // ---- Where the light sits, and the group everything turns in.
    const centreY = a.form === 'rose' ? 0.45 : R + 0.34;
    const glory = new THREE.Group();
    glory.position.y = centreY;
    if (vertical) glory.rotation.x = -0.16;
    if (a.form === 'funnel') glory.rotation.x = -0.5;
    s.root.add(glory);

    // ---- The rings: a glowing cloud band with puffs on it and the host sitting among them, each ring whirling on its own.
    const spinners: { group: THREE.Group; speed: number }[] = [];
    const hostAt: { at: THREE.Vector3; turn: number; size: number; group: THREE.Object3D }[] = [];
    const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
    const spacing = (R - 0.45) / Math.max(1, ringCount - 1);
    const puffR = Math.min(0.15, spacing * 0.34);
    const keep = dim ? 0.5 : 1;
    const gapAt = random() * Math.PI * 2;
    const band = s.material(L.cloud, { roughness: 0.9, emissive: L.glow, emissiveIntensity: 0.3 * shine });
    for (let k = 0; k < ringCount; k++) {
      const f = ringCount === 1 ? 1 : k / (ringCount - 1);
      const r = a.form === 'funnel' ? R - (R - 0.32) * f : 0.45 + (R - 0.45) * f;
      const group = new THREE.Group();
      if (a.form === 'rose') { group.rotation.x = -Math.PI / 2; group.position.y = f * 1.25 - 0.1; }
      if (a.form === 'funnel') group.position.z = -f * 1.9;
      glory.add(group);
      // Parting: each ring opens a gap that widens toward the outside.
      const gap = a.state === 'parting' ? (a.form === 'funnel' ? 1 - f : f) * 0.7 + 0.3 : dim ? 0.15 + random() * 0.6 : 0;
      const oval = new THREE.Group();
      oval.scale.x = aspect;
      group.add(oval);
      const bandMesh = into(oval, s.mesh(new THREE.TorusGeometry(r, puffR * (dim ? 0.3 : 0.48), 8, 120, Math.PI * 2 - gap * 2), band));
      bandMesh.rotation.z = gapAt + gap;
      const count = Math.round((2 * Math.PI * r) / (puffR * (ringCount === 3 ? 1.5 : 2.6)));
      const puffs: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2 + random() * 0.05;
        if (random() > keep) continue;
        const d = Math.abs(((t - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d < gap) continue;
        const wobble = 1 + (random() - 0.5) * 0.05;
        puffs.push({ at: [Math.cos(t) * r * aspect * wobble, Math.sin(t) * r * wobble, (random() - 0.5) * puffR * 0.6], size: puffR * (0.7 + random() * 0.5) });
      }
      if (puffs.length) group.add(s.scatter(puffGeometry, cloud, puffs));
      const hosts = a.host === 'none' ? 0 : Math.max(3, Math.round((2 * Math.PI * r) / (a.host === 'choir' ? 0.36 : 0.46)) - (dim ? 3 : 0));
      for (let i = 0; i < hosts; i++) {
        const t = ((i + 0.5) / hosts) * Math.PI * 2 + k * 0.4;
        const d = Math.abs(((t - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d < gap) continue;
        const size = Math.min(0.2, 0.1 + spacing * 0.3) + f * 0.03;
        if (a.form === 'rose') hostAt.push({ at: new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, puffR * 0.6), turn: t, size, group });
        else hostAt.push({ at: new THREE.Vector3(Math.cos(t) * r * aspect, Math.sin(t) * r - size * 0.45, puffR * 0.9), turn: 0, size, group });
      }
      spinners.push({ group, speed: (k % 2 ? -1 : 1) * (a.form === 'funnel' ? 0.4 + f : 1.4 - f) });
    }
    // The light sits at the far end of the funnel.
    const heartZ = a.form === 'funnel' ? -2.05 : 0;

    // ---- The host: one instanced silhouette per angel.
    if (hostAt.length) {
      const geometry = a.host === 'seraphim' ? seraph() : a.host === 'choir' ? chorister() : cherub();
      const paint = a.host === 'seraphim'
        ? s.material('#c4352a', { emissive: '#ff5a2a', emissiveIntensity: 0.25 * shine, roughness: 0.5 })
        : a.host === 'choir' ? s.material('#3a4f8f', { roughness: 0.6, emissive: '#1a2a5a', emissiveIntensity: 0.2 })
        : s.material('#e9b48c', { roughness: 0.55 });
      const byGroup = new Map<THREE.Object3D, typeof hostAt>();
      for (const host of hostAt) byGroup.set(host.group, [...(byGroup.get(host.group) ?? []), host]);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const stand = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      for (const [group, hosts] of byGroup) {
        const mesh = new THREE.InstancedMesh(geometry, paint, hosts.length);
        hosts.forEach((host, i) => {
          // In the rose the angels sit on the tiers facing the light; elsewhere they face the viewer.
          if (a.form === 'rose') q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), host.turn - Math.PI / 2).multiply(stand);
          else q.setFromEuler(e.set(0, 0, 0));
          m.compose(host.at, q, new THREE.Vector3(host.size, host.size, host.size));
          mesh.setMatrixAt(i, m);
        });
        mesh.castShadow = true;
        group.add(mesh);
      }
    }

    // ---- The heart of the light.
    const core = s.material(L.core, { emissive: L.core, emissiveIntensity: 1.6 * shine, roughness: 0.3 });
    const glowMaterial = new THREE.MeshStandardMaterial({ map: glowTexture(L.glow), emissive: '#ffffff', emissiveMap: glowTexture(L.glow), emissiveIntensity: 0.9 * shine, transparent: true, depthWrite: false, opacity: dim ? 0.55 : 0.95, side: THREE.DoubleSide });
    const heart = new THREE.Group();
    heart.position.z = heartZ;
    glory.add(heart);
    const halo = into(heart, new THREE.Mesh(new THREE.CircleGeometry(a.form === 'rose' ? 1.2 : 1.05, 48), glowMaterial));
    halo.position.z = -0.12;
    if (a.form === 'rose') { halo.rotation.x = -Math.PI / 2 + 0.6; halo.position.set(0, 0.3, -0.2); }
    if (a.centre === 'sun') into(heart, s.ball([0.24, 0.24, 0.24], [0, 0, 0], core, 24));
    else if (a.centre === 'point') {
      into(heart, s.ball([0.07, 0.07, 0.07], [0, 0, 0], core, 16));
      const sparkle = new THREE.InstancedMesh(new THREE.ConeGeometry(0.018, 0.34, 4), core, 4);
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Matrix4().makeRotationZ((i * Math.PI) / 2);
        m.multiply(new THREE.Matrix4().makeTranslation(0, 0.17, 0));
        sparkle.setMatrixAt(i, m);
      }
      heart.add(sparkle);
    } else if (a.centre === 'eye') {
      const tri = new THREE.Shape();
      for (let k = 0; k < 3; k++) { const t = Math.PI / 2 + (k * Math.PI * 2) / 3; if (k) tri.lineTo(Math.cos(t) * 0.36, Math.sin(t) * 0.36); else tri.moveTo(Math.cos(t) * 0.36, Math.sin(t) * 0.36); }
      const hole = new THREE.Path();
      for (let k = 0; k < 3; k++) { const t = Math.PI / 2 + (k * Math.PI * 2) / 3; if (k) hole.lineTo(Math.cos(t) * 0.27, Math.sin(t) * 0.27); else hole.moveTo(Math.cos(t) * 0.27, Math.sin(t) * 0.27); }
      tri.holes.push(hole);
      into(heart, s.mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.05, bevelEnabled: false }), gilt, [0, 0, -0.02]));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = L.core; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(10, 64); ctx.quadraticCurveTo(64, 20, 118, 64); ctx.quadraticCurveTo(64, 108, 10, 64); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a6a9a'; ctx.beginPath(); ctx.arc(64, 64, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#121010'; ctx.beginPath(); ctx.arc(64, 64, 8, 0, Math.PI * 2); ctx.fill();
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      into(heart, s.mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.5 }), [0, -0.04, 0.035]));
    } else {
      const bird = into(heart, s.mesh(dove(), s.material('#ffffff', { emissive: L.core, emissiveIntensity: 0.6 * shine, roughness: 0.5 })));
      bird.scale.setScalar(0.55);
      bird.position.y = -0.03;
      if (a.form === 'rose') bird.rotation.x = -0.6;
    }

    // ---- The rays.
    const rayGroup = new THREE.Group();
    heart.add(rayGroup);
    if (a.form === 'rose') { rayGroup.position.set(0, 0.25, -0.25); rayGroup.rotation.x = -0.35; }
    const rayCount = 30;
    const reach = (R + 0.35) * (dim ? 0.7 : 1) * (a.form === 'funnel' ? 1.15 : 1);
    if (a.rays === 'gilt' || a.rays === 'flame') {
      const straight = new THREE.InstancedMesh(wedge(), gilt, a.rays === 'flame' ? rayCount / 2 : rayCount);
      const wavy = a.rays === 'flame' ? new THREE.InstancedMesh(flame(), gilt, rayCount / 2) : null;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      let si = 0, wi = 0;
      for (let i = 0; i < rayCount; i++) {
        const t = (i / rayCount) * Math.PI * 2;
        const long = i % 2 === 0;
        const length = reach * (long ? 1 : 0.68) * (0.92 + random() * 0.16);
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), t);
        const start = 0.2;
        const scaleX = length * (a.form === 'mandorla' ? Math.hypot(Math.cos(t) * aspect, Math.sin(t)) : 1);
        m.compose(new THREE.Vector3(Math.cos(t) * start, Math.sin(t) * start, -0.18), q, new THREE.Vector3(scaleX, long ? 0.1 : 0.07, 0.05));
        if (wavy && !long) { m.compose(new THREE.Vector3(Math.cos(t) * start, Math.sin(t) * start, -0.18), q, new THREE.Vector3(scaleX, 0.16, 0.05)); wavy.setMatrixAt(wi++, m); }
        else straight.setMatrixAt(si++, m);
      }
      straight.castShadow = true;
      rayGroup.add(straight);
      if (wavy) { wavy.castShadow = true; rayGroup.add(wavy); }
    } else if (a.rays === 'soft') {
      const beam = new THREE.MeshStandardMaterial({ color: L.glow, emissive: L.glow, emissiveIntensity: 0.6 * shine, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2 + random() * 0.15, length = reach * (0.8 + random() * 0.35);
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.04); shape.lineTo(length, -0.16); shape.lineTo(length, 0.16); shape.lineTo(0, 0.04);
        const ray = new THREE.Mesh(new THREE.ShapeGeometry(shape), beam);
        ray.rotation.z = t;
        ray.position.z = -0.15;
        rayGroup.add(ray);
      }
    }

    // ---- The beam to the ground.
    if (a.state === 'beam') {
      const foot = new THREE.Vector3(0.35, 0, 0.9);
      const top = new THREE.Vector3(0, centreY, 0);
      const length = foot.distanceTo(top);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.3, length, 20, 1, true), new THREE.MeshStandardMaterial({ color: L.glow, emissive: L.glow, emissiveIntensity: 0.8 * shine, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
      shaft.position.copy(top).add(foot).multiplyScalar(0.5);
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), foot.clone().sub(top).normalize());
      s.root.add(shaft);
      s.rod(top.toArray() as [number, number, number], foot.toArray() as [number, number, number], 0.014, gilt, 0.02);
      const pool = s.mesh(new THREE.CircleGeometry(0.32, 32), new THREE.MeshStandardMaterial({ color: L.core, emissive: L.glow, emissiveIntensity: 0.8 * shine, roughness: 0.4 }), [foot.x, 0.005, foot.z]);
      pool.rotation.x = -Math.PI / 2;
    }

    // ---- A bank of cloud the whole vision rises from.
    const bank: { at: readonly [number, number, number]; size: number }[] = [];
    const bankCount = Math.round(mix(14, 26, mood.density));
    for (let i = 0; i < bankCount; i++) {
      const x = (random() - 0.5) * (a.form === 'mandorla' ? 1.6 : 2.6), size = 0.18 + random() * 0.2;
      bank.push({ at: [x, size * 0.85 + random() * 0.12, (random() - 0.5) * (a.form === 'rose' ? 2.2 : a.form === 'funnel' ? 1.6 : 0.6)], size });
    }
    s.scatter(puffGeometry, cloud, bank);

    // ---- Motion: the rings whirl, inner ones faster, and the rays breathe.
    const spin = mix(0.03, 0.45, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const ring of spinners) ring.group.rotation.z += dt * spin * ring.speed;
        const pulse = 1 + Math.sin(time * mix(0.5, 2.5, mood.energy)) * 0.03;
        rayGroup.scale.set(pulse, pulse, 1);
      },
    });
  },
});
