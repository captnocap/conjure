import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P2 = readonly [number, number];
type Leg = { at: readonly number[]; lifted?: boolean };

/** A small engraved or printed plate, painted locally. */
function placard(lines: readonly string[], width: number, height: number, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round((512 * height) / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const row = (canvas.height - 30) / (lines.length + 0.6);
  lines.forEach((line, index) => {
    const size = index === 0 ? row * 0.95 : row * 0.62;
    ctx.font = `${index === 0 ? 'bold ' : ''}${Math.min(size, (680 / Math.max(line.length, 1)) * (index === 0 ? 1 : 1.25))}px serif`;
    ctx.fillText(line, 256, 15 + row * (index + (index === 0 ? 0.62 : 0.85)), 470);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  return mesh;
}

// Angles are degrees from straight down, positive toward the head. Four segments per leg.
const POSES: Record<string, { pitch: number; neck: number; head: number; hind: [Leg, Leg]; fore: [Leg, Leg] }> = {
  standing: { pitch: 0, neck: 52, head: -38, hind: [{ at: [22, -32, 4, 35] }, { at: [16, -26, 2, 35] }], fore: [{ at: [-26, 4, 0, 30] }, { at: [-22, 2, 2, 30] }] },
  walking: { pitch: 0, neck: 42, head: -30, hind: [{ at: [38, -12, 14, 42] }, { at: [-4, -52, -30, 0], lifted: true }], fore: [{ at: [-48, -20, -16, 20] }, { at: [24, -62, -78, -60], lifted: true }] },
  rearing: { pitch: 50, neck: 62, head: -18, hind: [{ at: [44, -48, 2, 38] }, { at: [30, -38, 6, 38] }], fore: [{ at: [68, 22, -70, -100], lifted: true }, { at: [84, 48, -40, -75], lifted: true }] },
  grazing: { pitch: -3, neck: -48, head: -78, hind: [{ at: [22, -32, 4, 35] }, { at: [10, -22, 0, 35] }], fore: [{ at: [-6, 16, 8, 36] }, { at: [-34, -4, -4, 26] }] },
  bowing: { pitch: -15, neck: -12, head: -84, hind: [{ at: [26, -34, 4, 35] }, { at: [18, -28, 2, 35] }], fore: [{ at: [10, 30, 22, 44] }, { at: [-70, 60, -92, -110], lifted: true }] },
};

export default defineThing({
  questions: {
    pose: choice('What pose has the skeleton been wired into?', {
      standing: 'Standing four-square and patient, the sober textbook mount.',
      walking: 'Mid-stride with one foreleg lifted, as if still on its way somewhere.',
      rearing: 'Rearing on its hind legs, forelegs pawing the air, theatrical and heraldic.',
      grazing: 'Head lowered to the ground as if grazing, horn nearly touching the base.',
      bowing: 'Kneeling on one foreleg with the head bowed, courtly or defeated.',
    }),
    complete: score('How complete is the skeleton?', [
      'A skull and a handful of bones wired to a bare armature',
      'Half real bone, half bent-wire outline standing in for the rest',
      'Nearly whole with a few ribs and a leg missing',
      'Suspiciously complete, every last bone present',
    ]),
    horn: choice('How does the horn sit on the skull?', {
      seamless: 'Growing out of the forehead in the same bone, seamless and uncomfortably convincing.',
      bolted: 'A paler horn held on with a brass collar, a strap and visible bolts: suspiciously attached.',
      narwhal: 'An overlong, slender narwhal tusk tied on with cord, plainly from another animal.',
      crooked: 'Slipped sideways on its wire and hanging at a foolish angle.',
      missing: 'Gone: only an empty brass socket on the forehead where a horn once fitted.',
      glowing: 'Pearly and faintly luminous, the one part of the exhibit that seems alive.',
    }),
    length: score('How long is the horn?', ['A short stub', 'As long as a forearm', 'A lance longer than the skull']),
    bone: choice('What do the bones look like?', {
      bleached: 'Clean chalk-white, scrubbed and bleached.',
      ivory: 'Old yellowed ivory, handled for two centuries.',
      bog: 'Dark tea-brown, as if dug out of a peat bog.',
      plaster: 'Flat matte plaster casts with a greenish museum tint.',
      gilded: 'Gilded, a reliquary rather than a specimen.',
    }),
    label: choice('What does the brass label claim?', {
      latin: 'EQUUS MONOCEROS, adult, with a collection date: full scholarly confidence.',
      attributed: 'UNICORN (ATTRIBUTED): a hedge in small capitals.',
      loan: 'ON PERMANENT LOAN, lender unknown.',
      replica: 'REPLICA: the original was never found.',
      horse: 'HORSE, WITH HORN: flatly honest.',
    }),
    state: choice('What state is the display in right now?', {
      tidy: 'Tidy and finished, exactly as the curator left it.',
      tagged: 'Paper inventory tags hang from many of the bones, mid-catalogue.',
      fallen: 'A few bones have dropped off the wires and lie on the base beneath it.',
      sheeted: 'A dust sheet is draped over the hindquarters, half put away or half unveiled.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rad = Math.PI / 180;
    const pose = POSES[a.pose];
    const tint = { bleached: '#e9e3d2', ivory: '#dcc99a', bog: '#6d4f36', plaster: '#d5dccb', gilded: '#c9a03c' }[a.bone];
    const bone = s.material(new THREE.Color(tint).lerp(new THREE.Color('#8a6f42'), mood.wear * 0.3), { roughness: a.bone === 'gilded' ? 0.35 : 0.75, metalness: a.bone === 'gilded' ? 0.8 : 0 });
    const steel = s.material('#3c4044', { metalness: 0.6, roughness: 0.45 });
    const brass = s.material('#b88d3a', { metalness: 0.75, roughness: 0.35 });
    const dark = s.material('#2a2622', { roughness: 0.9 });
    const wood = s.material(mix(0.3, 0.6, mood.warmth) > 0.45 ? '#5a3a24' : '#4a3a30', { roughness: 0.6 });
    const paper = s.material('#efe6c8', { roughness: 0.9, side: THREE.DoubleSide });

    const rig = new THREE.Group();
    const torso = new THREE.Group();
    torso.rotation.z = pose.pitch * rad;
    rig.add(torso);
    s.root.add(rig);
    const keep = mix(0.22, 1.08, a.complete);
    const fallen: number[] = [];
    const tagSpots: THREE.Vector3[] = [];
    // A bone is either real or, when lost, stood in for by a bent wire of the same length.
    const limb = (parent: THREE.Group, from: readonly [number, number, number], to: readonly [number, number, number], radius: number, always = false) => {
      const real = always || random() < keep;
      if (!real) {
        parent.add(s.rod(from, to, 0.007, steel));
        if (a.state === 'fallen') fallen.push(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]));
        return false;
      }
      parent.add(s.rod(from, to, radius * 0.75, bone, radius * 0.6));
      parent.add(s.ball([radius * 1.25, radius * 1.25, radius * 1.25], from, bone, 10));
      parent.add(s.ball([radius * 1.15, radius * 1.15, radius * 1.15], to, bone, 10));
      tagSpots.push(new THREE.Vector3((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2).applyMatrix4(parent.matrix));
      return true;
    };
    torso.updateMatrix();

    // Spine, withers and ribs, in the torso's own frame: hips at the origin, head toward +x.
    const spine = new THREE.CatmullRomCurve3([[-0.14, -0.07], [0, 0], [0.3, -0.03], [0.6, -0.02], [0.85, 0.03], [1.05, 0.07], [1.16, 0.05]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
    const ribFront = 1.1, ribBack = 0.42;
    for (let i = 0; i < 18; i++) {
      const p = spine.getPoint(i / 17);
      torso.add(s.ball([0.038, 0.04, 0.05], [p.x, p.y, 0], bone, 10));
      const withers = Math.exp(-(((p.x - 0.95) / 0.16) ** 2));
      torso.add(s.rod([p.x, p.y, 0], [p.x - 0.03 - withers * 0.05, p.y + 0.07 + withers * 0.14, 0], 0.014, bone, 0.008));
      if (p.x < ribBack || p.x > ribFront) continue;
      const along = (p.x - ribBack) / (ribFront - ribBack);
      const drop = mix(0.36, 0.56, Math.sin(along * Math.PI * 0.75 + 0.5)), bulge = mix(0.17, 0.25, Math.sin(along * Math.PI));
      for (const side of [-1, 1]) {
        if (random() > keep + 0.1) continue;
        const rib = s.tube([[p.x, p.y - 0.02, 0], [p.x - 0.02, p.y - 0.05, side * bulge * 0.7], [p.x - 0.07, p.y - drop * 0.5, side * bulge], [p.x - 0.04, p.y - drop * 0.9, side * bulge * 0.65], [p.x + 0.02, p.y - drop, side * 0.05]], 0.014, bone);
        torso.add(rib);
      }
    }
    torso.add(s.rod([0.6, -0.5, 0], [1.08, -0.47, 0], 0.02, bone, 0.028));
    for (const side of [-1, 1]) {
      const wing = s.ball([0.17, 0.075, 0.06], [0.04, -0.01, side * 0.13], bone, 14);
      wing.rotation.set(0, side * 0.5, -0.5);
      torso.add(wing);
      const blade = s.ball([0.075, 0.2, 0.02], [1.1, -0.1, side * 0.17], bone, 14);
      blade.rotation.z = 0.4;
      torso.add(blade);
    }
    // Tail: a drooping chain that survives only on the better specimens.
    if (a.complete > 0.3) for (let i = 0; i < 9; i++) torso.add(s.ball([0.03 - i * 0.002, 0.024 - i * 0.0015, 0.024 - i * 0.0015], [-0.18 - i * 0.045, -0.09 - i * i * 0.008, 0], bone, 8));

    // Neck and skull.
    const neckAngle = (pose.neck - pose.pitch) * rad, headAngle = (pose.head - pose.pitch) * rad;
    const neckLength = 0.62;
    let neckEnd: P2 = [1.16, 0.05];
    for (let i = 1; i <= 7; i++) {
      const t = i / 7, sag = Math.sin(t * Math.PI) * 0.07;
      neckEnd = [1.16 + Math.cos(neckAngle) * neckLength * t + Math.sin(neckAngle) * sag, 0.05 + Math.sin(neckAngle) * neckLength * t - Math.cos(neckAngle) * sag];
      if (i < 7) torso.add(s.ball([0.055, 0.047, 0.05], [neckEnd[0], neckEnd[1], 0], bone, 12));
    }
    const skull = new THREE.Group();
    skull.position.set(neckEnd[0], neckEnd[1], 0);
    skull.rotation.z = headAngle;
    torso.add(skull);
    skull.add(s.ball([0.115, 0.1, 0.085], [0.07, 0.01, 0], bone, 18));
    const muzzle = s.cylinder(0.042, 0.078, 0.42, [0.33, -0.012, 0], bone, 14);
    muzzle.rotation.z = -Math.PI / 2;
    muzzle.scale.z = 0.8;
    skull.add(muzzle);
    skull.add(s.ball([0.05, 0.04, 0.045], [0.53, -0.015, 0], bone, 12));
    for (const side of [-1, 1]) {
      skull.add(s.ball([0.04, 0.04, 0.02], [0.17, 0.025, side * 0.066], dark, 12));
      skull.add(s.ball([0.022, 0.016, 0.012], [0.5, 0.0, side * 0.034], dark, 8));
      const ramus = s.ball([0.07, 0.1, 0.018], [0.1, -0.09, side * 0.055], bone, 12);
      ramus.rotation.z = 0.3;
      skull.add(ramus);
    }
    const jaw = new THREE.Group();
    jaw.position.set(0.1, -0.1, 0);
    jaw.rotation.z = -mix(0.06, 0.3, random()) - (a.state === 'fallen' ? 0.25 : 0);
    skull.add(jaw);
    const jawBar = s.cylinder(0.022, 0.034, 0.4, [0.22, 0, 0], bone, 10);
    jawBar.rotation.z = -Math.PI / 2;
    jawBar.scale.z = 1.5;
    jaw.add(jawBar);
    for (let i = 0; i < 7; i++) {
      if (random() < mood.wear * 0.5) continue;
      skull.add(s.box([0.022, 0.03, 0.07], [0.24 + i * 0.03, -0.075, 0], bone));
      jaw.add(s.box([0.022, 0.026, 0.06], [0.16 + i * 0.03, 0.03, 0], bone));
    }

    // The horn, and how honestly it is fixed.
    const hornLength = mix(0.22, 0.95, a.length) * (a.horn === 'narwhal' ? 1.45 : 1);
    const horn = new THREE.Group();
    horn.position.set(0.15, 0.085, 0);
    horn.rotation.z = -0.45;
    skull.add(horn);
    if (a.horn !== 'missing') {
      const base = a.horn === 'narwhal' ? 0.022 : 0.034;
      const hornTint = { seamless: bone, bolted: s.material('#f7f3ea', { roughness: 0.3 }), narwhal: s.material('#cfd6d2', { roughness: 0.45 }), crooked: bone, glowing: s.material('#fbf6ff', { roughness: 0.2, emissive: '#c9b8ff', emissiveIntensity: mix(0.45, 1.1, mood.cheer) }) }[a.horn];
      horn.add(s.cylinder(0.004, base, hornLength, [0, hornLength / 2, 0], hornTint, 12));
      const turns = hornLength * 9;
      const helix = Array.from({ length: 40 }, (_unused, i) => {
        const t = i / 39, r = mix(base * 1.04, 0.006, t), angle = t * turns * Math.PI * 2;
        return [Math.cos(angle) * r, t * hornLength * 0.98, Math.sin(angle) * r] as const;
      });
      const twist = s.tube(helix, base * 0.2, hornTint);
      horn.add(twist);
      if (a.horn === 'crooked') {
        horn.rotation.set(0.9 * (random() < 0.5 ? -1 : 1), 0, -1.35);
        horn.position.y = 0.07;
        skull.add(s.rod([0.15, 0.085, 0], [0.13, 0.2, 0], 0.005, steel));
      }
      if (a.horn === 'narwhal') for (const y of [0.02, 0.05]) { const cord = s.ring(0.03, 0.007, [0, y, 0], dark); cord.rotation.x = Math.PI / 2; horn.add(cord); }
    }
    if (a.horn === 'bolted' || a.horn === 'missing') {
      horn.add(s.cylinder(0.044, 0.05, 0.045, [0, 0.015, 0], brass, 14));
      for (let i = 0; i < 4; i++) horn.add(s.ball([0.011, 0.011, 0.011], [Math.cos(i * 1.57 + 0.7) * 0.05, 0.015, Math.sin(i * 1.57 + 0.7) * 0.05], steel, 8));
      const strap = s.ring(0.103, 0.009, [0.12, 0.005, 0], brass);
      strap.rotation.y = Math.PI / 2;
      strap.scale.set(0.85, 1, 1);
      skull.add(strap);
    }

    // Legs, worked out in the rig's frame so that hooves can be brought to one ground line.
    const turn = (x: number, y: number): P2 => [x * Math.cos(pose.pitch * rad) - y * Math.sin(pose.pitch * rad), x * Math.sin(pose.pitch * rad) + y * Math.cos(pose.pitch * rad)];
    const chain = (start: P2, lengths: readonly number[], leg: Leg, stretch = 1) => {
      const points: P2[] = [start];
      lengths.forEach((length, i) => {
        const [x, y] = points[i];
        points.push([x + Math.sin(leg.at[i] * rad) * length * stretch, y - Math.cos(leg.at[i] * rad) * length * stretch]);
      });
      return points;
    };
    const hindLengths = [0.38, 0.42, 0.34, 0.13], foreLengths = [0.27, 0.4, 0.27, 0.11];
    const hip = turn(-0.02, -0.08), shoulder = turn(1.18, -0.27);
    const ground = chain(hip, hindLengths, pose.hind[0]).at(-1)![1];
    const hooves: [number, number, number][] = [];
    const leg = (start: P2, lengths: readonly number[], spec: Leg, z: number, radius: number) => {
      const loose = chain(start, lengths, spec);
      const stretch = spec.lifted ? 1 : (start[1] - ground) / Math.max(start[1] - loose.at(-1)![1], 0.2);
      const points = chain(start, lengths, spec, Math.min(Math.max(stretch, 0.6), 1.5));
      let whole = true;
      for (let i = 0; i < lengths.length; i++)
        whole = limb(rig, [points[i][0], points[i][1], z], [points[i + 1][0], points[i + 1][1], z], radius * (1 - i * 0.14)) && whole;
      const end = points.at(-1)!;
      if (whole) {
        const hoof = s.cylinder(0.034, 0.05, 0.07, [end[0] + 0.01, end[1] + 0.035, z], dark, 12);
        rig.add(hoof);
        if (!spec.lifted) hooves.push([end[0], end[1], z]);
      } else if (!spec.lifted) rig.add(s.cylinder(0.02, 0.02, 0.012, [end[0], end[1] + 0.006, z], steel, 10));
    };
    leg(hip, hindLengths, pose.hind[0], 0.15, 0.036);
    leg(hip, hindLengths, pose.hind[1], -0.15, 0.036);
    leg(shoulder, foreLengths, pose.fore[0], 0.13, 0.032);
    leg(shoulder, foreLengths, pose.fore[1], -0.13, 0.032);

    // Armature: two posts with cradles under the spine, and a prop for the skull.
    const posts = a.pose === 'rearing' ? [0.12, 0.5] : [0.25, 0.9];
    for (const along of posts) {
      const [x, y] = turn(along, -0.05);
      rig.add(s.rod([x, ground, 0], [x, y, 0], 0.016, steel));
      const cradle = s.ring(0.05, 0.008, [x, y + 0.04, 0], steel, Math.PI);
      cradle.rotation.set(0, Math.PI / 2, Math.PI);
      rig.add(cradle);
      rig.add(s.cylinder(0.05, 0.06, 0.02, [x, ground + 0.01, 0], steel, 12));
    }
    const [headX, headY] = turn(neckEnd[0], neckEnd[1]);
    if (headY - ground > 0.5) {
      const footX = Math.min(headX, turn(1.2, 0)[0] + 0.25);
      rig.add(s.rod([footX, ground, 0.0], [headX, headY - 0.07, 0], 0.009, steel));
    }

    // Base, label and number.
    rig.updateMatrixWorld(true);
    const reach = new THREE.Box3().setFromObject(rig);
    const baseHeight = 0.09;
    const minX = Math.min(reach.min.x, -0.45) - 0.12, maxX = Math.max(reach.max.x - 0.1, 1.5) + 0.05;
    const baseWidth = maxX - minX, baseX = (minX + maxX) / 2, baseDepth = 0.78;
    rig.position.y = baseHeight - ground;
    s.box([baseWidth, baseHeight, baseDepth], [baseX, baseHeight / 2, 0], wood);
    s.box([baseWidth + 0.06, 0.03, baseDepth + 0.06], [baseX, 0.015, 0], wood);
    const number = 100 + Math.floor(random() * 880);
    const text = {
      latin: ['EQUUS MONOCEROS', `Adult. Collected ${1690 + Math.floor(random() * 150)}`],
      attributed: ['UNICORN', '(attributed)'],
      loan: ['ON PERMANENT LOAN', 'Lender unknown'],
      replica: ['REPLICA', 'Original never found'],
      horse: ['HORSE', 'with horn'],
    }[a.label];
    const plate = placard(text, 0.62, 0.2, '#2c2110', '#c9a24c');
    plate.position.set(baseX + (random() - 0.5) * 0.3, baseHeight + 0.085, baseDepth / 2 - 0.05);
    plate.rotation.x = -0.5;
    s.root.add(plate);
    s.box([0.64, 0.02, 0.1], [plate.position.x, baseHeight + 0.008, baseDepth / 2 - 0.085], brass);
    const tag = placard([`No. ${number}`], 0.2, 0.09, '#30281c', '#efe6c8');
    tag.position.set(minX + 0.2, baseHeight / 2 + 0.005, baseDepth / 2 + 0.002);
    s.root.add(tag);

    // What has been happening to it.
    const sway: THREE.Object3D[] = [];
    if (a.state === 'tagged') {
      const count = Math.min(tagSpots.length, Math.round(mix(5, 14, mood.density)));
      for (let i = 0; i < count; i++) {
        const spot = tagSpots.splice(Math.floor(random() * tagSpots.length), 1)[0];
        const hang = new THREE.Group();
        hang.position.copy(spot);
        hang.add(s.rod([0, 0, 0], [0, -0.07, 0.01], 0.002, dark));
        const card = s.box([0.07, 0.045, 0.002], [0, -0.09, 0.012], paper);
        card.rotation.z = (random() - 0.5) * 0.6;
        hang.add(card);
        hang.rotation.y = (random() - 0.5) * 1.2;
        rig.add(hang);
        sway.push(hang);
      }
    }
    if (a.state === 'fallen') {
      const drops = fallen.slice(0, 6);
      while (drops.length < 3) drops.push(0.2 + random() * 0.2);
      drops.forEach((length) => {
        const x = mix(minX + 0.3, maxX - 0.3, random()), z = (random() - 0.5) * (baseDepth - 0.25), angle = random() * Math.PI;
        const dx = (Math.cos(angle) * length) / 2, dz = (Math.sin(angle) * length) / 2, y = baseHeight + 0.025;
        s.rod([x - dx, y, z - dz], [x + dx, y, z + dz], 0.02, bone, 0.016);
        s.ball([0.03, 0.026, 0.03], [x - dx, y, z - dz], bone, 10);
        s.ball([0.028, 0.024, 0.028], [x + dx, y, z + dz], bone, 10);
      });
      for (let i = 0; i < 4; i++) s.box([0.022, 0.02, 0.03], [headX + (random() - 0.5) * 0.3, baseHeight + 0.01, (random() - 0.5) * 0.3], bone).rotation.y = random() * 3;
    }
    if (a.state === 'sheeted') {
      const cloth = new THREE.PlaneGeometry(1.0, 1.5, 16, 18);
      const position = cloth.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) + 0.22, across = position.getY(i), over = Math.max(0, Math.abs(across) - 0.27);
        const fold = Math.sin(x * 15 + across * 3) * 0.035 * Math.min(1, over * 4);
        position.setXYZ(i, x, 0.19 + Math.exp(-(((x - 0.75) / 0.2) ** 2)) * 0.1 - over * 0.98 - Math.abs(across) * 0.12 + Math.sin(x * 9) * 0.012, Math.sign(across) * Math.min(Math.abs(across), 0.27 + over * 0.12) + fold);
      }
      cloth.computeVertexNormals();
      torso.add(s.mesh(cloth, s.material(mood.wear > 0.6 ? '#bdb7a4' : '#e6e1d0', { roughness: 0.95, side: THREE.DoubleSide })));
    }

    const energy = mood.energy;
    return s.finish({
      footprint: baseWidth / 2,
      update: (_dt, time) => {
        sway.forEach((hang, index) => { hang.rotation.z = Math.sin(time * (1.2 + index * 0.17) + index) * 0.25 * energy; });
      },
    });
  },
});
