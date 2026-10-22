import * as THREE from 'three';
import { type BuildContext, NATURAL_FRAMING, type Placeable, type World } from './contract';
import { Sculpture } from './geometry';
import { disposeTree } from './dispose';
import { visibleBounds } from './measure';

export interface DioramaOptions {
  background?: string;
  floor?: string | null;
  width?: number;
  depth?: number;
  floorY?: number;
  yaw?: number;
  pitch?: number;
  maxHeight?: number;
  radius?: number;
  floating?: boolean;
  /** Where the cast stands: [x, z], or [x, z, height above the floor, size multiplier] for a shelf, a bench or a smaller supporting spot. */
  slots?: readonly (readonly [number, number, number?, number?])[];
  /** Clamp on how far a thing is scaled to fit, as [smallest, largest] multipliers: [0.8, 1.35] keeps people and furniture near true size. */
  scale?: readonly [number, number];
  /**
   * The region the camera frames, as [[x, y, z], [x, y, z]] minimum and maximum, instead of the
   * whole set's bounds. A nave with a 13 m wall can frame its lower 6 m so people stay readable.
   */
  viewBox?: readonly [readonly [number, number, number], readonly [number, number, number]];
}

/** A finite exhibition stage. Components supply all architecture and terrain themselves. */
export function diorama(context: BuildContext, options: DioramaOptions = {}) {
  const art = new Sculpture(context);
  const { root } = art;
  const width = options.width ?? 14, depth = options.depth ?? 11, floorY = options.floorY ?? 0;
  const background = new THREE.Color(options.background ?? '#e6e7df');
  const ground = options.floor === null ? null : art.box([width, 0.24, depth], [0, floorY - 0.12, 0], art.material(options.floor ?? '#c8c3b2'));
  const lowSun = Math.abs(context.mood.daylight - 0.5) * 2;
  root.add(new THREE.HemisphereLight('#f1f2ff', '#777365', 1.45 - lowSun * 0.5));
  const key = new THREE.DirectionalLight(new THREE.Color().setHSL(0.62 - context.mood.warmth * 0.53 - lowSun * 0.05, 0.32 + lowSun * 0.22, 0.88 - lowSun * 0.1), 2.8 + lowSun * 0.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0003;
  root.add(key, key.target);
  const fill = new THREE.DirectionalLight('#d9e6ff', 0.6);
  fill.position.set(8, 5, -6);
  root.add(fill);
  const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 250);
  const slots: readonly (readonly [number, number, number?, number?])[] = options.slots ?? [[0, 1.4], [-3.7, -1.8], [3.7, -1.8], [-3.7, 3], [3.7, 3], [0, -3.2]];
  // The decided framing moves the camera from the world's natural view: height, side, closeness and anchor.
  const framing = context.framing ?? NATURAL_FRAMING;
  const yaw = ((options.yaw ?? 28) + framing.turn * 22) * Math.PI / 180;
  const pitch = Math.min(68, Math.max(12, (options.pitch ?? 32) + (framing.elevation - 0.5) * 44)) * Math.PI / 180;
  const closeness = framing.distance < 0.5 ? 0.62 + (framing.distance * 2) * 0.38 : 1 + (framing.distance - 0.5) * 2 * 0.55;
  const tilt = ((context.seed & 1 ? 1 : -1) * framing.tilt * 7) * Math.PI / 180;

  const world: World = {
    object: root, camera, background, ground, keyLight: key, capacity: slots.length, framed: true,
    place(items: readonly Placeable[]) {
      const boxes: THREE.Box3[] = [];
      const setBounds = visibleBounds(root);
      // Things are already attached by Stage; the fixed footprint also frames an empty world.
      boxes.push(new THREE.Box3(new THREE.Vector3(-width / 2, floorY - 0.3, -depth / 2), new THREE.Vector3(width / 2, floorY + 1, depth / 2)));
      if (!setBounds.isEmpty()) boxes.push(setBounds);
      const fit = (item: Placeable, size: number) => {
        const scale = Math.min((options.maxHeight ?? 3.5) / Math.max(item.height, 0.05), (options.radius ?? 1.45) / Math.max(item.radius, 0.05)) * (item.hero ? 1 : 0.85) * size;
        return options.scale ? Math.min(options.scale[1], Math.max(options.scale[0], scale)) : scale;
      };
      // Things related to the hero gather around it; the rest take the world's slots in order.
      const hero = items.find((item) => item.hero) ?? items[0];
      const heroSlot = slots[0];
      const heroScale = hero ? fit(hero, heroSlot?.[3] ?? 1) : 1;
      const related = items.filter((item) => item !== hero && item.relation && item.relation !== 'apart' && !options.floating);
      let slot = 0;
      const taken: { x: number; z: number; r: number }[] = [];
      const angleOf = { beside: Math.PI / 2, behind: Math.PI, facing: 0, on: 0 } as const;
      items.forEach((item, index) => {
        const relation = item === hero ? undefined : related.includes(item) ? item.relation : undefined;
        let x: number, z: number, lift = 0, size = 1, turn: number | null = null;
        if (relation && hero) {
          const [hx, hz, hlift = 0] = heroSlot;
          size = relation === 'on' ? 0.42 : 0.85;
          const scale = fit(item, size);
          const gap = (Math.max(hero.radius, 0.05) * heroScale + Math.max(item.radius, 0.05) * scale) * 1.12;
          if (relation === 'on') {
            x = hx; z = hz; lift = hlift + hero.height * heroScale;
          } else {
            // Alternate sides, and step round the hero when a spot is already taken.
            const side = taken.filter((spot) => spot.r === gap).length % 2 === 0 ? 1 : -1;
            let angle = angleOf[relation as 'beside' | 'behind' | 'facing'] * side;
            for (let tries = 0; tries < 6; tries++) {
              x = hx + Math.sin(angle) * gap; z = hz + Math.cos(angle) * gap;
              if (!taken.some((spot) => Math.hypot(spot.x - x!, spot.z - z!) < (spot.r + gap) * 0.45)) break;
              angle += Math.PI / 4;
            }
            lift = hlift;
            taken.push({ x: x!, z: z!, r: gap });
            if (relation === 'facing') turn = Math.atan2(hx - x!, hz - z!);
          }
        } else {
          [x, z, lift = 0, size = 1] = slots[slot++ % slots.length];
        }
        const scale = fit(item, size);
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x!, floorY + lift + (options.floating ? 1.2 + (index % 3) * 0.9 : 0), z!);
        item.holder.rotation.y = options.floating ? context.random() * Math.PI : turn ?? yaw * 0.25 + (context.random() - 0.5) * 0.25;
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });
      // Recompute after placement so natural-size geometry cannot widen the frame.
      boxes.splice(1, 1, visibleBounds(root));
      if (options.viewBox) {
        // Frame the author's region plus the placed things, not the full architecture.
        const [min, max] = options.viewBox;
        boxes.splice(0, 2, new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)));
      }
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 80);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const projection = new THREE.Box2();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
              projection.expandByPoint(new THREE.Vector2(p.x, p.y));
            }
      const middle = projection.getCenter(new THREE.Vector2());
      const extent = Math.max(projection.getSize(new THREE.Vector2()).x, projection.getSize(new THREE.Vector2()).y) * 0.56 * closeness;
      // Moving the camera to its right puts the scene on the left of the frame.
      const anchor = framing.anchor === 'left' ? extent * 0.22 : framing.anchor === 'right' ? -extent * 0.22 : 0;
      camera.translateX(middle.x + anchor);
      camera.translateY(middle.y);
      if (tilt) camera.rotateZ(tilt);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const span = bounds.getSize(new THREE.Vector3()).length();
      key.target.position.copy(centre);
      // The sun crosses from one side to the other through the day and sits low at either end.
      const noon = 1 - Math.abs(context.mood.daylight - 0.5) * 2;
      key.position.copy(centre).add(new THREE.Vector3(-10 + context.mood.daylight * 16, 3.5 + noon * 8.5, 8).normalize().multiplyScalar(span * 1.5));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.6;
      shadow.right = shadow.top = span * 0.6;
      shadow.near = 0.1; shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    },
    dispose() { key.shadow.map?.dispose(); disposeTree(root); },
  };
  return { art, world };
}
