import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BuildContext, Capture, LookResult, Placeable, Thing, World } from '@conjure/kit';
import { hashText, seeded, visibleBounds } from '@conjure/kit';
import { loadBuilder, type Entry } from './catalogue';
import { CaptureRig } from './capture';
import { accentMask, composeAccent } from './accent';
import { applyOtherworld } from './otherworld';
import { applyVacui } from './vacui';
import type { CameraOffset } from './motion';
import type { CastMember, Plan } from './director';

/** Looks are calibrated at this size; the canvas is scaled by CSS for display. */
export const FRAME_SIZE = 720;
const GROUND_ID = 1;
const SET_ID = 2;
const FIRST_THING_ID = 3;

export interface BuildReport {
  id: string;
  milliseconds: number;
  /** Set when the component threw; the scene is built without it. */
  error: string | null;
}

interface Mounted {
  plan: Plan;
  world: World;
  things: { thing: Thing; holder: THREE.Group }[];
}

/**
 * The safe part of the decided framing for a world that framed itself without reading it:
 * closeness through the camera's zoom, the hero's anchor through a view offset, and the tilt.
 * Height and side are left to the world, since orbiting an unknown camera can leave its backdrop.
 */
function frameCamera(camera: THREE.Camera, framing: Plan['framing'] | undefined, seed: number) {
  if (!framing) return;
  const lens = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
  if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera && !(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
  const closeness = framing.distance < 0.5 ? 0.62 + framing.distance * 2 * 0.38 : 1 + (framing.distance - 0.5) * 2 * 0.55;
  lens.zoom = (lens.zoom || 1) / closeness;
  const shift = framing.anchor === 'left' ? 0.18 : framing.anchor === 'right' ? -0.18 : 0;
  if (shift) lens.setViewOffset(FRAME_SIZE, FRAME_SIZE, shift * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE);
  if (framing.tilt) lens.rotateZ((seed & 1 ? 1 : -1) * framing.tilt * 7 * Math.PI / 180);
  lens.updateProjectionMatrix();
  lens.updateMatrixWorld(true);
}

/** Aim and zoom a camera so an object fills most of the frame, keeping the camera's own direction. */
function frameTight(camera: THREE.Camera, object: THREE.Object3D, fill = 0.82) {
  const lens = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
  object.updateMatrixWorld(true);
  const bounds = visibleBounds(object);
  if (bounds.isEmpty()) return;
  const centre = bounds.getCenter(new THREE.Vector3());
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const distance = camera.position.distanceTo(centre);
  camera.position.copy(centre).addScaledVector(forward, -distance);
  camera.lookAt(centre);
  camera.updateMatrixWorld(true);
  const corners: THREE.Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const ortho = camera as THREE.OrthographicCamera;
    const half = Math.max(...corners.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))) / fill;
    ortho.left = ortho.bottom = -half;
    ortho.right = ortho.top = half;
    ortho.zoom = 1;
    ortho.clearViewOffset();
  } else if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const perspective = camera as THREE.PerspectiveCamera;
    const tan = Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2);
    // Corners relative to the centre in the camera's axes; the camera then sits at +D on its own z.
    // A corner fits when its offset is within tan × fill × (D − z), so D is the largest such need.
    const need = Math.max(...corners.map((p) => {
      const z = p.z + distance;
      return Math.max(Math.abs(p.x), Math.abs(p.y)) / (tan * fill) + z;
    }));
    camera.position.copy(centre).addScaledVector(forward, -Math.max(need, perspective.near * 2));
    perspective.zoom = 1;
    perspective.clearViewOffset();
    perspective.far = Math.max(perspective.far, camera.position.distanceTo(centre) * 4);
  }
  lens.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

/** Scene time, in seconds, at which every still is taken, reached in fixed pre-roll steps. */
export const STILL_TIME = 0.5;
const PREROLL_STEPS = 12;

/** Owns the renderer and the live scene. Components never see it. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  #rig: CaptureRig;
  #mounted: Mounted | null = null;
  #clock = new THREE.Clock();
  /** Scene time handed to updates. It only advances once `play()` lets the scene move. */
  #time = 0;
  #held = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(FRAME_SIZE, FRAME_SIZE, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    // Metals and lacquers from every atelier assume something to reflect.
    this.scene.environment = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.#rig = new CaptureRig(this.renderer, FRAME_SIZE);
    this.renderer.setAnimationLoop(() => this.#frame());
  }

  #context(plan: Plan, entry: Entry): BuildContext {
    const seed = (plan.seed ^ hashText(entry.id)) >>> 0;
    return { idea: plan.idea, mood: plan.mood, scale: plan.scale, framing: plan.framing, seed, random: seeded(seed) };
  }

  /** Build a plan's world and cast and swap them in. One failing component never takes the scene down. */
  async mount(plan: Plan): Promise<BuildReport[]> {
    const reports: BuildReport[] = [];
    const timed = async <T>(member: CastMember, build: () => Promise<T>): Promise<T | null> => {
      const started = performance.now();
      try {
        const built = await build();
        reports.push({ id: member.entry.id, milliseconds: Math.round(performance.now() - started), error: null });
        return built;
      } catch (error) {
        console.error(`${member.entry.id} failed to build`, error);
        reports.push({
          id: member.entry.id,
          milliseconds: Math.round(performance.now() - started),
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };

    const world = await timed(plan.world, async () =>
      (await loadBuilder(plan.world.entry as Entry & { kind: 'world' })).build(plan.world.answers as never, this.#context(plan, plan.world.entry)),
    );
    if (!world) throw new Error(`The setting ${plan.world.entry.title} could not be built: ${reports.at(-1)!.error}`);

    const members = plan.cast.slice(0, world.capacity);
    const built = await Promise.all(
      members.map((member) =>
        timed(member, async () =>
          (await loadBuilder(member.entry as Entry & { kind: 'thing' })).build(member.answers as never, this.#context(plan, member.entry)),
        ),
      ),
    );
    const things = built
      .map((thing, at) => ({ thing, belongs: members[at].belongs, relation: members[at].relation }))
      .filter((item): item is { thing: Thing; belongs: number; relation: CastMember['relation'] } => item.thing !== null)
      .map(({ thing, belongs, relation }, index) => {
        const holder = new THREE.Group();
        holder.add(thing.object);
        holder.userData.captureId = FIRST_THING_ID + index;
        holder.userData.belongs = belongs;
        return { thing, holder, relation };
      });

    this.unmount();
    this.scene.add(world.object);
    this.scene.background = world.background;
    const placeables: Placeable[] = things.map(({ thing, holder, relation }, index) => {
      const bounds = visibleBounds(holder);
      return {
        holder,
        radius: thing.footprint ?? Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z), 0.05),
        height: Math.max(bounds.max.y, 0.05),
        hero: index === 0,
        ...(index > 0 && relation ? { relation } : {}),
      };
    });
    for (const { holder } of things) world.object.add(holder);
    world.place(placeables);
    if (!world.framed) frameCamera(world.camera, plan.framing, plan.seed);
    world.camera.layers.enableAll();
    this.#mounted = { plan, world, things };
    this.#preroll();
    return reports;
  }

  /**
   * A still must come out the same every time the same plan is printed, whatever the machine's
   * speed. So a freshly mounted scene runs a short pre-roll in fixed steps of scene time (drifting
   * particles spread, machines turn a little), then holds at STILL_TIME: updates keep arriving, so
   * painted faces finish drawing, but with no time passing. `play()` lets it move again.
   */
  #preroll() {
    const mounted = this.#mounted;
    if (!mounted) return;
    this.#held = true;
    const step = STILL_TIME / PREROLL_STEPS;
    const failed = new Set<unknown>();
    for (let index = 1; index <= PREROLL_STEPS; index++) {
      this.#time = index * step;
      for (const part of [mounted.world, ...mounted.things.map(({ thing }) => thing)]) {
        if (failed.has(part)) continue;
        try {
          part.update?.(step, this.#time);
        } catch (error) {
          failed.add(part);
          console.error('an update failed during the pre-roll', error);
        }
      }
    }
    this.#time = STILL_TIME;
    this.#clock.getDelta();
  }

  /** Let the scene move in real time, after its still has been captured: the live preview, a loop. */
  play() {
    this.#held = false;
    this.#clock.getDelta();
  }

  /**
   * A portrait of the hero: the same plan built with only its first thing, the setting hidden but its
   * lights kept, and the camera reframed tight on the hero. The look then redraws the hero filling
   * the frame. The live stage is left holding the portrait; mount the plan again to restore the scene.
   */
  async portrait(plan: Plan, signal: AbortSignal): Promise<{ result: (LookResult & { accent?: Uint8Array }) | null; capture: Capture } | null> {
    if (!plan.cast.length) return null;
    await this.mount({ ...plan, cast: plan.cast.slice(0, 1) });
    const mounted = this.#mounted;
    const hero = mounted?.things[0];
    if (!mounted || !hero) return null;
    const insideHero = (node: THREE.Object3D) => { for (let at: THREE.Object3D | null = node; at; at = at.parent) if (at === hero.holder) return true; return false; };
    mounted.world.object.traverse((node) => {
      const visible = node as THREE.Mesh;
      if ((visible.isMesh || (node as THREE.Line).isLine || (node as THREE.Points).isPoints) && !insideHero(node)) node.visible = false;
    });
    frameTight(mounted.world.camera, hero.holder);
    // Painted faces draw over the first few frames, as in an ordinary print.
    await new Promise((resolve) => setTimeout(resolve, 500));
    signal.throwIfAborted();
    const capture = this.capture();
    const result = await this.develop(signal, capture);
    return { result, capture };
  }

  /** How many mounted things and worlds animate every frame; a loop of a still scene is no loop. */
  animated(): number {
    const mounted = this.#mounted;
    if (!mounted) return 0;
    return (mounted.world.update ? 1 : 0) + mounted.things.filter(({ thing }) => typeof thing.update === 'function').length;
  }

  unmount() {
    const mounted = this.#mounted;
    if (!mounted) return;
    this.#mounted = null;
    for (const { thing, holder } of mounted.things) {
      holder.removeFromParent();
      thing.dispose();
    }
    this.scene.remove(mounted.world.object);
    mounted.world.dispose();
  }

  #frame() {
    const mounted = this.#mounted;
    if (!mounted) return;
    const elapsed = Math.min(this.#clock.getDelta(), 0.1);
    const dt = this.#held ? 0 : elapsed;
    this.#time += dt;
    mounted.world.update?.(dt, this.#time);
    for (const { thing } of mounted.things) thing.update?.(dt, this.#time);
    this.renderer.render(this.scene, mounted.world.camera);
  }

  /**
   * Capture the frame, optionally with the camera turned about the hero and zoomed for one frame of
   * a loop. The camera is put back exactly as it was afterwards.
   */
  capture(offset?: CameraOffset): Capture {
    const mounted = this.#mounted;
    if (!mounted) throw new Error('Nothing is on stage to capture.');
    if (offset && (offset.yaw || offset.pitch || offset.push)) {
      const camera = mounted.world.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
      const position = camera.position.clone(), quaternion = camera.quaternion.clone(), zoom = camera.zoom;
      const hero = mounted.things[0]?.holder ?? mounted.world.object;
      const pivot = visibleBounds(hero).getCenter(new THREE.Vector3());
      if (!Number.isFinite(pivot.x)) pivot.set(0, 0, 0);
      const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), offset.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      turn.multiply(new THREE.Quaternion().setFromAxisAngle(right, offset.pitch));
      camera.position.sub(pivot).applyQuaternion(turn).add(pivot);
      camera.quaternion.premultiply(turn);
      camera.zoom = zoom * (1 + offset.push);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      try {
        return this.capture();
      } finally {
        camera.position.copy(position);
        camera.quaternion.copy(quaternion);
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
      }
    }
    const ground = mounted.world.ground;
    const capture = this.#rig.capture(
      this.scene,
      mounted.world.camera,
      (mesh) => {
        for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
          if (node === ground) return GROUND_ID;
          if (typeof node.userData.captureId === 'number') return node.userData.captureId;
        }
        return SET_ID;
      },
      mounted.world.keyLight,
    );
    // The model's belonging per placed thing travels with the frame, so a look can draw doubt.
    const confidence = capture.baseColors.map(() => 1);
    for (const { holder } of mounted.things) {
      const id = holder.userData.captureId as number;
      const belongs = holder.userData.belongs;
      if (id < confidence.length && typeof belongs === 'number') confidence[id] = Math.min(1, Math.max(0, belongs));
    }
    capture.confidence = confidence;
    return capture;
  }

  /**
   * Run the plan's look over a supplied capture, or capture the current frame. A `boil` number
   * reseeds the look, so hand-drawn marks redraw between frames of a moving print.
   */
  async develop(signal: AbortSignal, capture?: Capture, boil?: number, phase = 0): Promise<(LookResult & { accent?: Uint8Array }) | null> {
    const mounted = this.#mounted;
    if (!mounted?.plan.look) return null;
    const { look, accent } = mounted.plan;
    const frame = capture ?? this.capture();
    const boiled = (entry: Entry) => {
      const context = this.#context(mounted.plan, entry);
      if (!boil) return context;
      const seed = (context.seed ^ hashText(`boil:${boil}`)) >>> 0;
      return { ...context, seed, random: seeded(seed) };
    };
    const builder = await loadBuilder(look.entry as Entry & { kind: 'look' });
    const printed = await builder.apply(frame, look.answers as never, boiled(look.entry), signal);
    // Last, the dead space fills and the print crosses into another dimension, both from the same
    // capture so they register with it, and both moving with the phase of a loop.
    const otherworld = (result: LookResult & { accent?: Uint8Array }) => {
      let { pixels } = result;
      const notes = [...result.notes];
      if (mounted.plan.vacui) {
        const filled = applyVacui(pixels, frame, mounted.plan.vacui, mounted.plan.seed, phase);
        pixels = filled.pixels;
        notes.push(filled.note);
      }
      if (mounted.plan.otherworld) {
        const crossed = applyOtherworld(pixels, frame, mounted.plan.otherworld, mounted.plan.seed, phase);
        pixels = crossed.pixels;
        notes.push(crossed.note);
      }
      return { ...result, pixels, notes };
    };
    if (!accent) return otherworld(printed);
    // A second look over part of the picture, drawn from the very same capture so it registers exactly.
    const mask = accentMask(frame, accent.region);
    if (!mask.some(Boolean)) return otherworld(printed);
    const second = await (await loadBuilder(accent.look.entry as Entry & { kind: 'look' })).apply(frame, accent.look.answers as never, boiled(accent.look.entry), signal);
    signal.throwIfAborted();
    return otherworld({
      pixels: composeAccent(printed.pixels, second.pixels, mask, frame.size, accent.edge, mounted.plan.seed),
      notes: [...printed.notes, `${accent.look.entry.title} laid over the ${accent.region === 'detail' ? 'hero\u2019s most striking detail' : 'hero'}, ${accent.edge} edge`],
      accent: mask,
    });
  }
}
