import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SHELLS = {
  pearl: 'Creamy pearl white with pale ribs.',
  pink: 'Blushing coral pink.',
  blue: 'Slate blue-grey, a mussel-dark shell.',
  striped: 'Tan with bold brown rib stripes.',
} as const;
const SHELL_TONES: Record<keyof typeof SHELLS, [string, string, string]> = {
  pearl: ['#f3ebdc', '#d9cdb6', '#f8e8ee'],
  pink: ['#f2a6a0', '#d47a76', '#fde6e8'],
  blue: ['#7f8ea0', '#56616f', '#dfe6ec'],
  striped: ['#d9b98a', '#7a4e2a', '#f6ead6'],
};

/** Radial ribs: vertical stripes on the canvas wrap round the dome as ridges from the hinge. */
function ribs(light: string, dark: string, count: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 512, 128);
  const w = 512 / count;
  for (let i = 0; i < count; i++) {
    const g = ctx.createLinearGradient(i * w, 0, (i + 1) * w, 0);
    g.addColorStop(0, dark);
    g.addColorStop(0.45, light);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(i * w, 0, w, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    shell: choice('What colour is the clam shell?', SHELLS),
    open: choice('Is the shell open?', {
      closed: 'Clamped shut.',
      ajar: 'Lifted a crack, enough for a letter.',
      wide: 'Gaping wide open, the pearly inside showing.',
    }),
    flag: noul('Is the red flag up?'),
    letters: noul('Are letters sticking out of it?'),
    number: choice('What house number is painted on it?', {
      n1: 'Number 1, the first house on the lane.',
      n7: 'Lucky number 7.',
      n24: 'A plain, ordinary 24.',
      n124: 'Number 124, a long way down the street.',
      n1000: 'Number 1000, absurdly far down the lane.',
    }),
    post: choice('What is the post made of?', {
      driftwood: 'A grey driftwood post, slightly leaning.',
      coral: 'A knobbly branch of orange coral.',
      pipe: 'A rusty iron pipe with a flange.',
    }),
    hitchhiker: choice('What has settled on the shell?', {
      nothing: 'Nothing, it is kept clean.',
      starfish: 'A starfish stuck on the lid.',
      barnacles: 'A crust of barnacles along the hinge.',
      weed: 'A tuft of seaweed hanging off it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [light, dark, inside] = SHELL_TONES[a.shell];
    const texture = ribs(light, dark, 16);
    const shellPaint = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, color: new THREE.Color('#ffffff').lerp(new THREE.Color('#8b8275'), mood.wear * 0.25) });
    const pearl = s.material(inside, { roughness: 0.25, metalness: 0.25, emissive: inside, emissiveIntensity: 0.08 });

    // The post.
    const height = 1.05;
    const lean = a.post === 'driftwood' ? (random() - 0.5) * 0.12 : 0;
    const postTop: [number, number, number] = [Math.sin(lean) * height, Math.cos(lean) * height, 0];
    if (a.post === 'driftwood') {
      const wood = s.material('#9a948a', { roughness: 0.95 });
      const post = s.cylinder(0.05, 0.065, height, [postTop[0] / 2, postTop[1] / 2, 0], wood, 7);
      post.rotation.z = -lean;
      s.box([0.06, 0.03, 0.4], [postTop[0], postTop[1], 0], wood);
    }
    if (a.post === 'coral') {
      const coral = s.material('#ef8a4a', { roughness: 0.85 });
      const profile: [number, number][] = [[0, 0]];
      for (let i = 0; i <= 10; i++) profile.push([0.05 + 0.025 * Math.sin(i * 1.9) + (i === 0 ? 0.08 : 0), i / 10 * height]);
      profile.push([0, height]);
      s.lathe(profile, coral);
      s.rod([0, 0.5, 0], [0.2, 0.75, 0.08], 0.03, coral, 0.015);
      for (let i = 0; i < 5; i++) s.ball([0.03, 0.025, 0.03], [Math.sin(i * 2.1) * 0.06, 0.2 + i * 0.17, Math.cos(i * 2.1) * 0.06], coral, 7);
    }
    if (a.post === 'pipe') {
      const rust = s.material(mood.wear > 0.5 ? '#6f4426' : '#8b6448', { metalness: 0.5, roughness: 0.6 });
      s.cylinder(0.14, 0.15, 0.05, [0, 0.025, 0], rust, 12);
      s.cylinder(0.045, 0.045, height, [0, height / 2, 0], rust, 12);
      s.ring(0.05, 0.02, [0, height - 0.06, 0], rust).rotation.x = Math.PI / 2;
      s.box([0.2, 0.03, 0.3], [0, height, 0], rust);
    }

    // The clam: a bottom valve bulging down, a lid bulging up, hinged at the back.
    const W = 0.34, D = 0.3, T = 0.13;
    const dome = new THREE.SphereGeometry(1, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const base = new THREE.Group();
    base.position.set(postTop[0], postTop[1] + 0.02, 0.02);
    s.root.add(base);
    const lower = new THREE.Mesh(dome, shellPaint);
    lower.scale.set(W, T * 0.8, D);
    lower.rotation.x = Math.PI;
    lower.position.y = T * 0.8;
    lower.castShadow = lower.receiveShadow = true;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 32), pearl);
    floor.scale.set(W * 0.98, D * 0.98, 1);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = T * 0.8 + 0.002;
    base.add(lower, floor);
    const lidAngle = { closed: 0.02, ajar: 0.32, wide: 1.1 }[a.open];
    const hinge = new THREE.Group();
    hinge.position.set(0, T * 0.8 + 0.005, -D * 0.9);
    hinge.rotation.x = lidAngle;
    const lid = new THREE.Mesh(dome, shellPaint);
    lid.scale.set(W, T, D);
    lid.position.z = D * 0.9;
    lid.castShadow = lid.receiveShadow = true;
    const ceiling = new THREE.Mesh(new THREE.CircleGeometry(1, 32), pearl);
    ceiling.scale.set(W * 0.98, D * 0.98, 1);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, -0.002, D * 0.9);
    hinge.add(lid, ceiling);
    base.add(hinge);
    const umbo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), shellPaint);
    umbo.position.set(0, T * 0.8, -D * 0.92);
    umbo.castShadow = true;
    base.add(umbo);

    // Letters in the mouth.
    if (a.letters) {
      const paper = s.material('#f6f1e4', { roughness: 0.8 });
      const stamp = s.material('#d93a3a');
      const n = 2 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const env = new THREE.Group();
        env.position.set((random() - 0.5) * 0.12, T * 0.8 + 0.01 + i * 0.012, D * 0.55 + random() * 0.12);
        env.rotation.set(-0.15 - random() * 0.2, (random() - 0.5) * 0.9, 0);
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.13), paper);
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.03), stamp);
        mark.position.set(0.07, 0.001, -0.04);
        sheet.castShadow = true;
        env.add(sheet, mark);
        base.add(env);
      }
    }

    // Flag on a pivot at the side.
    const red = s.material('#e03a2c', { roughness: 0.5 });
    const pivot = new THREE.Group();
    pivot.position.set(W + 0.03, T * 0.7, -D * 0.3);
    pivot.rotation.z = a.flag ? 0 : -Math.PI / 2 + 0.2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), red);
    stem.position.y = 0.15;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.14), red);
    flag.position.set(0, 0.26, 0.07);
    stem.castShadow = flag.castShadow = true;
    pivot.add(stem, flag);
    base.add(pivot);
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), s.material('#3b3b3b'));
    bolt.position.copy(pivot.position);
    base.add(bolt);

    // House number plate on the front of the lower valve.
    const number = { n1: '1', n7: '7', n24: '24', n124: '124', n1000: '1000' }[a.number];
    const plate = s.label(number, 0.14, 0.08, [postTop[0], postTop[1] - 0.08, D * 0.62 + 0.02], '#f4f1e8', '#1f2a44');
    plate.rotation.x = 0.35;
    s.box([0.15, 0.09, 0.012], [postTop[0], postTop[1] - 0.081, D * 0.62 + 0.012], s.material('#1f2a44')).rotation.x = 0.35;

    // Hitchhikers.
    if (a.hitchhiker === 'starfish') {
      const star = new THREE.Group();
      const starPaint = s.material(['#ff7a3a', '#ff4f8b', '#b05cff'][Math.floor(random() * 3)], { roughness: 0.8 });
      for (let i = 0; i < 5; i++) {
        const arm = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), starPaint);
        arm.geometry.translate(0, 0.06, 0);
        arm.rotation.z = -Math.PI / 2;
        arm.castShadow = true;
        const holder = new THREE.Group();
        holder.rotation.y = i / 5 * Math.PI * 2;
        holder.add(arm);
        star.add(holder);
      }
      star.scale.y = 0.5;
      star.position.set(W * 0.25, T * 0.95, D * 0.1);
      star.rotation.z = -0.25;
      hinge.add(star);
    }
    if (a.hitchhiker === 'barnacles') {
      const grey = s.material('#c9c3b5', { roughness: 0.9 });
      s.scatter(new THREE.ConeGeometry(1, 1, 7), grey, Array.from({ length: 9 }, () => {
        const x = (random() - 0.5) * W * 1.4;
        return { at: [postTop[0] + x, postTop[1] + 0.02 + T * 0.8 + 0.02, 0.02 - D * (0.7 + random() * 0.25)] as [number, number, number], size: 0.02 + random() * 0.02 };
      }));
    }
    if (a.hitchhiker === 'weed') {
      const weed = s.material('#4f8a3c', { roughness: 0.7, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const strand = s.ball([0.03, 0.2, 0.008], [postTop[0] - W * 0.7 + random() * 0.08, postTop[1] - 0.08, 0.1 - random() * 0.2], weed, 8);
        strand.rotation.z = 0.3 + random() * 0.3;
      }
    }

    const speed = mix(0.3, 1.5, mood.energy);
    return s.finish({
      footprint: 0.3,
      update: (_dt, time) => {
        if (a.open !== 'closed') hinge.rotation.x = lidAngle + Math.sin(time * 1.1 * speed) * 0.03 * speed;
      },
    });
  },
});
