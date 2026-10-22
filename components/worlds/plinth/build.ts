import * as THREE from 'three';
import { type Placeable, choice, defineWorld, mix, visibleBounds } from '@conjure/kit';

const PAPERS = {
  bone: 'Warm off-white paper, the neutral default.',
  chalk: 'Cold bright white, clinical and exposed.',
  blush: 'Faint pink, tender or nostalgic.',
  sage: 'Pale grey-green, calm and botanical.',
  fog: 'Pale blue-grey, distant and quiet.',
  butter: 'Pale yellow, sunny and domestic.',
} as const;
const PAPER_COLOURS: Record<keyof typeof PAPERS, string> = {
  bone: '#e5e7de',
  chalk: '#eef0f0',
  blush: '#efe2de',
  sage: '#dfe6da',
  fog: '#dde4e8',
  butter: '#efe9cf',
};
const PLINTHS = {
  limestone: 'A pale limestone slab, classical and calm.',
  concrete: 'A raw grey concrete slab, blunt and municipal.',
  timber: 'A dark oiled timber deck, warm and domestic.',
  slate: 'A near-black slate slab, severe and formal.',
  terracotta: 'A fired red clay tile base, earthy and sunlit.',
  none: 'No plinth at all: the objects stand straight on the endless floor.',
} as const;
const PLINTH_MATERIALS: Record<Exclude<keyof typeof PLINTHS, 'none'>, { color: string; roughness: number }> = {
  limestone: { color: '#d9cabb', roughness: 0.85 },
  concrete: { color: '#a8a89d', roughness: 0.94 },
  timber: { color: '#6b4a33', roughness: 0.6 },
  slate: { color: '#3d4247', roughness: 0.7 },
  terracotta: { color: '#b26148', roughness: 0.8 },
};
const VIEWS = {
  survey: 'A calm three-quarter view from above, like an architectural model.',
  eye: 'A lower view near eye level: the objects loom and overlap.',
  plan: 'A steep view from high above, cool and diagrammatic.',
} as const;
const VIEW_PITCH: Record<keyof typeof VIEWS, number> = { survey: 32, eye: 18, plan: 52 };

/** Collected objects keep their character but not their true size: big things shrink far more than small ones. */
const displaySize = (metres: number) => 1.2 * metres ** 0.35;

export default defineWorld({
  questions: {
    paper: choice('What colour is the studio backdrop and floor?', PAPERS),
    plinth: choice('What do the objects stand on?', PLINTHS),
    view: choice('Where is the camera?', VIEWS),
  },

  build(answers, context) {
    const { mood } = context;
    const root = new THREE.Group();
    const paper = new THREE.Color(PAPER_COLOURS[answers.paper]);
    const warm = new THREE.Color().setHSL(mix(0.58, 0.09, mood.warmth), 0.5, 0.92);

    root.add(new THREE.HemisphereLight('#ffffff', '#708075', 0.9));
    const key = new THREE.DirectionalLight(warm, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0002;
    key.shadow.radius = 5;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#d0e4ef', 0.35);
    root.add(fill);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: paper, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    const slab =
      answers.plinth === 'none'
        ? null
        : new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial(PLINTH_MATERIALS[answers.plinth]));
    if (slab) {
      slab.castShadow = slab.receiveShadow = true;
      root.add(slab);
    }
    const slabHeight = slab ? 0.22 : 0;

    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 200);
    const yaw = THREE.MathUtils.degToRad(39);
    const pitch = THREE.MathUtils.degToRad(VIEW_PITCH[answers.view]);
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    const place = (items: readonly Placeable[]) => {
      // Tall supports go behind the hero, small ones in front, so nothing hides the subject.
      const angles = [128, -128, 75, -75, 30, -30, 180, 0].map((degrees) => yaw + THREE.MathUtils.degToRad(degrees));
      const placed: { item: Placeable; radius: number; x: number; z: number }[] = [];
      const [hero, ...supports] = items;
      const sized = (item: Placeable) => {
        const natural = Math.max(item.height, item.radius * 2);
        // The hero is given a little more presence than strict proportion allows.
        const scale = (displaySize(natural) / natural) * (item.hero ? 1.25 : 1);
        item.holder.scale.setScalar(scale);
        return item.radius * scale;
      };
      if (hero) placed.push({ item: hero, radius: sized(hero), x: 0, z: 0 });
      supports
        .slice()
        .sort((a, b) => b.height - a.height)
        .forEach((item, index) => {
          const radius = sized(item);
          const angle = angles[index % angles.length] + (context.random() - 0.5) * 0.3;
          let distance = placed[0].radius + radius + 0.25;
          const collides = () =>
            placed.some((other) => Math.hypot(Math.sin(angle) * distance - other.x, Math.cos(angle) * distance - other.z) < other.radius + radius + 0.2);
          while (collides()) distance += 0.2;
          placed.push({ item, radius, x: Math.sin(angle) * distance, z: Math.cos(angle) * distance });
        });

      const bounds = new THREE.Box3();
      const boxes: THREE.Box3[] = [];
      for (const { item, x, z } of placed) {
        item.holder.position.set(x, slabHeight, z);
        // Everything turns roughly toward the camera, never square to it.
        item.holder.rotation.y = yaw + (context.random() - 0.5) * 0.9;
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        // Whatever runs below ground (roots, footings) is buried and should not widen the frame.
        box.min.y = Math.max(box.min.y, 0);
        boxes.push(box);
        bounds.union(box);
      }
      if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));

      if (slab) {
        const footing = new THREE.Box2();
        for (const { radius, x, z } of placed) {
          const stand = Math.min(radius, 1.6);
          footing.expandByPoint(new THREE.Vector2(x - stand, z - stand)).expandByPoint(new THREE.Vector2(x + stand, z + stand));
        }
        const size = footing.getSize(new THREE.Vector2()).addScalar(0.6);
        const middle = footing.getCenter(new THREE.Vector2());
        slab.scale.set(size.x, slabHeight, size.y);
        slab.position.set(middle.x, slabHeight / 2, middle.y);
        slab.updateMatrixWorld(true);
        boxes.push(new THREE.Box3().setFromObject(slab));
        bounds.union(boxes.at(-1)!);
      }

      // Fit the orthographic frame to each object as the camera sees it, then centre on that.
      const centre = bounds.getCenter(new THREE.Vector3());
      camera.position.copy(centre).addScaledVector(toCamera, 60);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2();
      const corner = new THREE.Vector3();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
              seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
            }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(...seen.getSize(new THREE.Vector2()).toArray()) * 0.56;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();

      const theta = (mix(0.08, 0.92, mood.daylight) - 0.25) * Math.PI;
      const span = bounds.getSize(new THREE.Vector3()).length();
      key.target.position.copy(centre);
      key.position.copy(centre).add(new THREE.Vector3(-4 * Math.cos(theta) + 5 * Math.sin(theta), 8, 5 * Math.cos(theta) + 4 * Math.sin(theta)).normalize().multiplyScalar(span * 2));
      fill.position.copy(centre).add(new THREE.Vector3(4, 3, -4));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.75;
      shadow.right = shadow.top = span * 0.75;
      shadow.near = 0.1;
      shadow.far = span * 5;
      shadow.updateProjectionMatrix();
    };

    return {
      object: root,
      camera,
      background: paper,
      capacity: 7,
      ground: floor,
      keyLight: key,
      place,
      dispose() {
        floor.geometry.dispose();
        floor.material.dispose();
        slab?.geometry.dispose();
        slab?.material.dispose();
        key.shadow.map?.dispose();
        root.removeFromParent();
      },
    };
  },
});
