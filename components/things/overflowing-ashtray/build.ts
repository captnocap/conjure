import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const TRAYS = {
  crystal: 'Thick clear cut glass with faceted sides, heavy enough to be a weapon.',
  amber: 'Smoky amber pressed glass from a 1970s living room.',
  green: 'Bottle-green glass, a pub ashtray.',
  ceramic: 'A black glazed ceramic bar ashtray with a white rim.',
  tin: 'A cheap stamped tin tray, dented, from a diner or a barracks.',
  brass: 'A hammered brass dish, an old hotel lobby piece.',
} as const;
const TRAY_LOOK: Record<keyof typeof TRAYS, { color: string; opacity: number; metalness: number; roughness: number; facets: number }> = {
  crystal: { color: '#cfe0e4', opacity: 0.62, metalness: 0.1, roughness: 0.08, facets: 10 },
  amber: { color: '#b8742a', opacity: 0.72, metalness: 0.1, roughness: 0.1, facets: 12 },
  green: { color: '#3f7d4f', opacity: 0.72, metalness: 0.1, roughness: 0.1, facets: 8 },
  ceramic: { color: '#1e1d20', opacity: 1, metalness: 0, roughness: 0.25, facets: 40 },
  tin: { color: '#aeb2b2', opacity: 1, metalness: 0.8, roughness: 0.45, facets: 40 },
  brass: { color: '#b8923f', opacity: 1, metalness: 0.9, roughness: 0.4, facets: 16 },
};

export default defineThing({
  questions: {
    full: score('How full is the ashtray?', ['Two lonely butts', 'An evening\'s worth', 'Heaped to the rim', 'A mountain spilling onto the table']),
    burning: choice('What is still burning in it?', {
      cigarette: 'One cigarette resting on the rim with a long ash, smoke rising.',
      cigar: 'A fat cigar with a paper band, glowing at the end.',
      two: 'Two cigarettes burning on opposite sides: two people were just here.',
      forgotten: 'A cigarette burned down to one long unbroken column of ash, forgotten.',
      cold: 'Nothing. Everything is cold and dead, no smoke at all.',
    }),
    tray: choice('What kind of ashtray is it?', TRAYS),
    butts: choice('What was being smoked?', {
      cork: 'Cork-tipped filter cigarettes, the tan-ended kind.',
      white: 'White-filtered slims.',
      rollups: 'Thin hand-rolled cigarettes with no filter, twisted ends.',
      mixed: 'A mix of brands from several different people.',
    }),
    nerves: score('How were they stubbed out?', ['Smoked calmly down to the filter', 'Ordinary', 'Crushed out half smoked, one after another, in a state of nerves']),
    lipstick: noul('Is there lipstick on some of the filters?'),
    beside: choice('What lies beside the ashtray?', {
      nothing: 'Nothing.',
      matchbook: 'A matchbook from some bar, cover bent open.',
      lighter: 'A steel flip-top lighter standing on end.',
      pack: 'A crumpled soft pack of cigarettes.',
      matches: 'A scatter of burnt wooden matches.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const look = TRAY_LOOK[a.tray];
    const glassy = look.opacity < 1;

    // The tray: a thick-walled dish.
    const RIM = 0.078, BOWL = 0.058, TOP = a.tray === 'tin' ? 0.022 : 0.036, FLOOR = a.tray === 'tin' ? 0.003 : 0.012;
    const profile = [[0, 0], [RIM * 0.9, 0], [RIM * 0.96, 0.004], [RIM, TOP - 0.003], [RIM - 0.003, TOP], [BOWL + 0.006, TOP], [BOWL, TOP - 0.004], [BOWL - 0.008, FLOOR], [0, FLOOR]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const trayMaterial = new THREE.MeshPhysicalMaterial({
      color: look.color, transparent: glassy, opacity: look.opacity, metalness: look.metalness, roughness: look.roughness + mood.wear * 0.25,
      flatShading: look.facets < 20, clearcoat: glassy ? 1 : 0, emissive: look.color, emissiveIntensity: glassy ? 0.12 : 0,
    });
    const tray = s.mesh(new THREE.LatheGeometry(profile, look.facets), trayMaterial);
    tray.rotation.y = random() * Math.PI;
    if (a.tray === 'ceramic') s.ring(RIM - 0.0015, 0.0022, [0, TOP, 0], s.material('#eee8d8', { roughness: 0.3 })).rotation.x = Math.PI / 2;
    // Cigarette rests notched into the rim.
    const notch = s.material(glassy ? '#' + new THREE.Color(look.color).multiplyScalar(0.55).getHexString() : '#111112', { roughness: 0.3 });
    const rests = a.tray === 'tin' ? 3 : 4;
    for (let i = 0; i < rests; i++) {
      const angle = (i / rests) * Math.PI * 2 + 0.4;
      const groove = s.cylinder(0.0052, 0.0052, RIM - BOWL + 0.004, [Math.cos(angle) * (RIM + BOWL) / 2, TOP - 0.0022, Math.sin(angle) * (RIM + BOWL) / 2], notch, 10);
      groove.rotation.set(0, -angle, Math.PI / 2);
      groove.scale.set(1, 1, 1);
    }

    // Ash bed.
    const ashGrey = s.material('#8c8a86', { roughness: 1 });
    const heap = mix(0.004, 0.03, a.full);
    s.ball([BOWL * 0.95, heap, BOWL * 0.95], [0, FLOOR, 0], ashGrey, 18);

    // Butts: filter, paper and burnt tip share a transform.
    const count = Math.max(2, Math.round(mix(2, 44, a.full * a.full * 0.6 + a.full * 0.4) * mix(0.8, 1.25, mood.density)));
    const unit = new THREE.CylinderGeometry(0.004, 0.004, 1, 9);
    unit.rotateZ(Math.PI / 2);
    type Part = { matrix: THREE.Matrix4; color: THREE.Color };
    const parts: Part[] = [];
    const segment = (base: THREE.Matrix4, from: number, to: number, color: string, thick = 1) => {
      const local = new THREE.Matrix4().makeScale(to - from, thick, thick).setPosition((from + to) / 2, 0, 0);
      parts.push({ matrix: base.clone().multiply(local), color: new THREE.Color(color) });
    };
    const paperWhite = '#' + new THREE.Color('#f1ede2').lerp(new THREE.Color('#c9bd9c'), mood.wear * 0.5).getHexString();
    const butt = (x: number, y: number, z: number, yaw: number, pitch: number) => {
      const kind = a.butts === 'mixed' ? (['cork', 'white', 'rollups'] as const)[Math.floor(random() * 3)] : a.butts;
      const base = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, pitch, 'YZX')), new THREE.Vector3(1, 1, 1));
      const filter = kind === 'rollups' ? 0 : 0.021;
      const stub = mix(0.004, 0.034, a.nerves) * mix(0.5, 1.2, random()) + (kind === 'rollups' ? 0.012 : 0);
      const thick = kind === 'rollups' ? 0.7 : 1;
      if (filter) {
        segment(base, 0, filter, kind === 'cork' ? '#c98f4c' : '#efe9dc');
        if (a.lipstick && random() < 0.55) segment(base, 0, 0.007, '#b3162f', 1.04);
        if (kind === 'white') segment(base, filter - 0.002, filter, '#c9a23c', 1.03);
      }
      segment(base, filter, filter + stub, paperWhite, thick);
      segment(base, filter + stub, filter + stub + 0.004, '#2b2826', thick * mix(1.05, 1.5, a.nerves));
    };
    for (let i = 0; i < count; i++) {
      const spill = a.full > 0.72 && i > count * 0.72 && random() < 0.75;
      const angle = random() * Math.PI * 2;
      if (spill) {
        const d = RIM + 0.014 + random() * 0.05;
        butt(Math.cos(angle) * d, 0.004, Math.sin(angle) * d, random() * 6.28, 0);
      } else {
        const d = Math.sqrt(random()) * (BOWL - 0.02) * (count < 6 ? 0.8 : 1);
        const top = FLOOR + heap * (1 - (d / BOWL) ** 2) * 0.85 + 0.004;
        const lift = (i / count) * mix(0.002, 0.024, a.full);
        butt(Math.cos(angle) * d, top + lift, Math.sin(angle) * d, random() * 6.28, mix(-0.1, 0.75, random() * mix(0.4, 1, a.nerves)));
      }
    }
    const butts = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ roughness: 0.9 }), parts.length);
    parts.forEach((part, index) => { butts.setMatrixAt(index, part.matrix); butts.setColorAt(index, part.color); });
    butts.castShadow = butts.receiveShadow = true;
    s.root.add(butts);

    // Ash flecks on the table.
    const flecks = Math.round(mix(0, 60, Math.max(mood.wear, a.full - 0.4)));
    if (flecks > 0) s.scatter(new THREE.SphereGeometry(1, 5, 4), ashGrey, Array.from({ length: flecks }, () => {
      const angle = random() * Math.PI * 2, d = RIM + 0.004 + random() * random() * 0.07;
      return { at: [Math.cos(angle) * d, 0.0008, Math.sin(angle) * d] as const, size: mix(0.0012, 0.004, random()) };
    }));

    // What is still burning, and its smoke.
    const smokes: THREE.Mesh[] = [];
    const smokeMaterial = new THREE.MeshBasicMaterial({ color: '#7f8894', transparent: true, opacity: 0.5, depthWrite: false });
    const ember = new THREE.MeshStandardMaterial({ color: '#ff6a1c', emissive: '#ff4a10', emissiveIntensity: mix(1.2, 3, mood.energy) });
    const smoker = (angle: number, type: 'cigarette' | 'cigar' | 'forgotten') => {
      const holder = new THREE.Group();
      holder.rotation.y = -angle;
      s.root.add(holder);
      const lean = new THREE.Group();
      const cigar = type === 'cigar';
      const radius = cigar ? 0.0085 : 0.004;
      lean.position.set((RIM + BOWL) / 2, TOP + radius * 0.8, 0);
      lean.rotation.z = cigar ? 0.1 : 0.16;
      holder.add(lean);
      const piece = (from: number, to: number, material: THREE.Material, r = radius, r2 = r) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, to - from, 12), material);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.x = -(from + to) / 2;
        mesh.castShadow = true;
        lean.add(mesh);
      };
      // x runs from the mouth end (outside the tray, positive) to the lit end (over the bowl, negative).
      let tip: number;
      if (cigar) {
        piece(-0.05, 0.035, s.material('#5f3d24', { roughness: 0.85 }));
        piece(-0.058, -0.05, s.material('#5f3d24', { roughness: 0.85 }), 0.005, radius);
        piece(-0.03, -0.018, s.material('#b3262b', { roughness: 0.5 }), radius * 1.04);
        piece(-0.026, -0.022, s.material('#d9b23f', { metalness: 0.6, roughness: 0.4 }), radius * 1.06);
        piece(0.035, 0.038, ember, radius * 0.98);
        piece(0.038, 0.052, ashGrey, radius * 0.95, radius * 0.75);
        tip = 0.04;
      } else if (type === 'forgotten') {
        piece(-0.03, -0.009, s.material(a.butts === 'white' ? '#efe9dc' : '#c98f4c'));
        piece(-0.009, -0.003, s.material(paperWhite));
        piece(-0.003, -0.001, ember, radius * 1.02);
        piece(-0.001, 0.05, ashGrey, radius * 0.95, radius * 0.8);
        tip = 0;
      } else {
        piece(-0.04, -0.019, s.material(a.butts === 'white' ? '#efe9dc' : a.butts === 'rollups' ? paperWhite : '#c98f4c'));
        piece(-0.019, 0.025, s.material(paperWhite));
        piece(0.025, 0.028, ember, radius * 1.03);
        piece(0.028, 0.044, ashGrey, radius * 0.95, radius * 0.75);
        tip = 0.03;
      }
      // Smoke: a wandering thread that widens as it rises.
      const start = new THREE.Vector3(-tip, radius, 0);
      const points: THREE.Vector3[] = [];
      const rise = mix(0.2, 0.34, random()), phase = random() * 6.28, sway = mix(0.012, 0.045, mood.energy);
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        points.push(new THREE.Vector3(start.x + Math.sin(t * 7 + phase) * sway * t * t * 1.6 + t * t * 0.03, start.y + t * rise, Math.cos(t * 5.3 + phase) * sway * t * t * 1.4));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      for (const [r, opacity] of [[0.0018, 0.6], [0.0045, 0.22]] as const) {
        const material = smokeMaterial.clone();
        material.opacity = opacity;
        const thread = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, r, 6), material);
        thread.position.copy(start);
        thread.geometry.translate(-start.x, -start.y, -start.z);
        lean.add(thread);
        smokes.push(thread);
      }
    };
    const first = 0.4 + Math.floor(random() * rests) * (Math.PI * 2 / rests);
    if (a.burning === 'cigarette') smoker(first, 'cigarette');
    else if (a.burning === 'cigar') smoker(first, 'cigar');
    else if (a.burning === 'forgotten') smoker(first, 'forgotten');
    else if (a.burning === 'two') { smoker(first, 'cigarette'); smoker(first + (rests === 3 ? Math.PI * 2 / 3 : Math.PI), 'cigarette'); }
    smokeMaterial.dispose();

    // Beside it.
    const side = RIM + 0.055, sideAngle = first + 2.2;
    const bx = Math.cos(sideAngle) * side, bz = Math.abs(Math.sin(sideAngle)) * side * 0.6 + 0.05;
    if (a.beside === 'matchbook') {
      const cover = s.material(mood.cheer > 0.5 ? '#c23b2e' : '#1f2f4a', { roughness: 0.7 });
      const book = new THREE.Group();
      book.position.set(bx, 0, bz); book.rotation.y = random() * 6.28;
      s.root.add(book);
      book.add(s.box([0.048, 0.003, 0.04], [0, 0.0015, 0], cover));
      const matches = s.box([0.044, 0.004, 0.03], [0, 0.005, 0.003], s.material('#e8dcc0'));
      const heads = s.box([0.044, 0.0045, 0.004], [0, 0.005, -0.013], s.material('#7d2019'));
      const flap = s.box([0.048, 0.0012, 0.04], [0, 0.021, 0.034], cover);
      flap.rotation.x = -1.0;
      const strip = s.box([0.048, 0.0032, 0.007], [0, 0.0018, 0.0175], s.material('#3a2c26'));
      book.add(matches, heads, flap, strip);
    } else if (a.beside === 'lighter') {
      const steel = s.material('#cdd1d4', { metalness: 0.92, roughness: 0.22 });
      const lighter = new THREE.Group();
      lighter.position.set(bx, 0, bz); lighter.rotation.y = random() * 6.28;
      s.root.add(lighter);
      const body = s.box([0.037, 0.036, 0.012], [0, 0.018, 0], steel);
      const lid = s.box([0.037, 0.02, 0.012], [-0.03, 0.043, 0], steel);
      lid.rotation.z = 1.9;
      const chimney = s.box([0.02, 0.013, 0.009], [0.004, 0.0425, 0], s.material('#8d9092', { metalness: 0.8, roughness: 0.4 }));
      const wheel = s.cylinder(0.004, 0.004, 0.006, [-0.01, 0.041, 0], s.material('#3b3b3d', { metalness: 0.6 }), 10);
      wheel.rotation.x = Math.PI / 2;
      lighter.add(body, lid, chimney, wheel);
    } else if (a.beside === 'pack') {
      const pack = new THREE.Group();
      pack.position.set(bx, 0, bz); pack.rotation.y = random() * 6.28;
      s.root.add(pack);
      const paper = s.box([0.055, 0.02, 0.084], [0, 0.01, 0], s.material('#eee7d6', { roughness: 0.9 }));
      const band = s.box([0.0555, 0.0205, 0.03], [0, 0.01, 0.006], s.material('#b3262b', { roughness: 0.8 }));
      const disc = s.cylinder(0.011, 0.011, 0.0008, [0, 0.0208, 0.006], s.material('#eee7d6'), 20);
      const foil = s.box([0.05, 0.016, 0.01], [0.003, 0.012, -0.045], s.material('#c9cdd0', { metalness: 0.7, roughness: 0.4 }));
      foil.rotation.y = 0.3; foil.rotation.z = 0.2;
      paper.rotation.z = 0.05; paper.scale.set(1, mix(1, 0.7, mood.wear), 1);
      pack.add(paper, band, disc, foil);
      const poke = s.cylinder(0.004, 0.004, 0.03, [-0.012, 0.011, -0.05], s.material('#c98f4c'), 9);
      poke.rotation.x = Math.PI / 2;
      pack.add(poke);
    } else if (a.beside === 'matches') {
      const wood = s.material('#d9c391'), char = s.material('#1f1b19');
      for (let i = 0; i < 7; i++) {
        const angle = sideAngle + (random() - 0.5) * 1.6, d = RIM + 0.02 + random() * 0.06, turn = random() * Math.PI;
        const x = Math.cos(angle) * d, z = Math.sin(angle) * d, dx = Math.cos(turn) * 0.021, dz = Math.sin(turn) * 0.021;
        s.rod([x - dx, 0.0012, z - dz], [x + dx * 0.4, 0.0012, z + dz * 0.4], 0.0011, wood);
        s.rod([x + dx * 0.4, 0.0012, z + dz * 0.4], [x + dx, 0.002, z + dz], 0.0011, char, 0.0006);
      }
    }

    const speed = mix(0.25, 1.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        smokes.forEach((thread, index) => {
          thread.rotation.y = Math.sin(time * speed + index) * 0.5;
          thread.scale.x = 1 + Math.sin(time * speed * 0.7 + index * 2) * 0.25;
        });
      },
    });
  },
});
