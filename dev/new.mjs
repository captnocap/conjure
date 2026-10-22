// Starts a new component from a working template.
//   npm run new thing lamp-post
//   npm run new world gas-station-aisle
//   npm run new look pencil-rubbing
//   npm run new direction midnight-radio
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const [kind, name] = process.argv.slice(2);
if (!['thing', 'world', 'look', 'direction'].includes(kind) || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name ?? '')) {
  console.error('Usage: npm run new <thing|world|look|direction> <name-in-lowercase-with-hyphens>');
  process.exit(1);
}
const folder = `components/${kind}s/${name}`;
if (existsSync(folder)) {
  console.error(`${folder} already exists. Pick another name, or improve that component instead.`);
  process.exit(1);
}
const title = name.replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

const manifest = `import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: '${kind}',${kind === 'look' ? "\n  // realism, painting, game, print, optical, craft or mixed: the family the model chooses before the look.\n  medium: 'mixed'," : ''}
  title: '${title}',
  // One plain sentence. The model reads only this to decide whether the ${kind} fits an idea,
  // so say what it is and what it evokes.
  summary: 'TODO',
  scales: [${kind === 'thing' || kind === 'world' ? "'room'" : ''}],
});
`;

const thing = `import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';

export default defineThing({
  // This component's own inventory. Every option needs a description the model can judge.
  questions: {
    shape: choice('What shape is it?', {
      block: 'A plain block.',
      column: 'A tall column.',
    }),
    size: score('How big is it?', ['Small', 'Medium', 'Large']),
  },

  build(answers, { mood, random }) {
    const height = mix(0.4, 1.6, answers.size) * (answers.shape === 'column' ? 2 : 1);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, height, 0.6),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(random(), 0.4, mix(0.6, 0.3, mood.wear)) }),
    );
    // Stand on y = 0, centred on the origin, facing +z, in metres.
    mesh.position.y = height / 2;
    mesh.castShadow = mesh.receiveShadow = true;
    const object = new THREE.Group().add(mesh);
    return { object, dispose: () => disposeTree(object) };
  },
});
`;

const world = `import * as THREE from 'three';
import { type Placeable, defineWorld, disposeTree, visibleBounds } from '@conjure/kit';

export default defineWorld({
  questions: {},

  build(_answers, { mood }) {
    const root = new THREE.Group();
    root.add(new THREE.HemisphereLight('#ffffff', '#708075', 0.9));
    const key = new THREE.DirectionalLight('#fff5df', 2.6);
    key.position.set(-4, 8, 5);
    key.castShadow = true;
    root.add(key, key.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#e5e7de' }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 200);

    return {
      object: root,
      camera,
      background: new THREE.Color('#e5e7de'),
      capacity: Math.round(1 + mood.density * 5),
      ground,
      keyLight: key,
      // Position, turn and scale each item's holder, then frame the camera around them.
      place(items: readonly Placeable[]) {
        const bounds = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
        items.forEach((item, index) => {
          item.holder.position.set(index * (item.radius * 2 + 0.5), 0, 0);
          bounds.union(visibleBounds(item.holder));
        });
        const centre = bounds.getCenter(new THREE.Vector3());
        const extent = bounds.getSize(new THREE.Vector3()).length() * 0.6;
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.position.copy(centre).add(new THREE.Vector3(30, 26, 38));
        camera.lookAt(centre);
        camera.updateProjectionMatrix();
      },
      dispose: () => disposeTree(root),
    };
  },
});
`;

const look = `import { choice, defineLook, score } from '@conjure/kit';

/** A look receives one captured frame (colour, normals, depth, identity, plain light) and returns pixels. */
export default defineLook({
  questions: {
    paper: choice('What does it print on?', {
      cream: 'Warm cream paper, soft and slightly yellowed.',
      white: 'Bright white, clinical.',
    }),
    weight: score('How heavy are the marks?', ['Faint', 'Even', 'Heavy']),
  },

  async apply(capture, answers, context, signal) {
    const { size, color, identity } = capture;
    const pixels = new Uint8ClampedArray(color);
    const paper = answers.paper === 'cream' ? [238, 230, 214] : [248, 248, 246];
    const ink = 0.35 + answers.weight * 0.6;
    for (let i = 0; i < size * size; i++) {
      if ((i & 0xffff) === 0) signal.throwIfAborted();
      // Backdrop (identity 0) becomes paper; everything else is darkened by its own tone, like a wash.
      const bare = identity[i * 4] === 0;
      const luma = (0.2126 * color[i * 4] + 0.7152 * color[i * 4 + 1] + 0.0722 * color[i * 4 + 2]) / 255;
      for (let c = 0; c < 3; c++) pixels[i * 4 + c] = bare ? paper[c] : paper[c] * (1 - ink * (1 - luma));
      pixels[i * 4 + 3] = 255;
    }
    return { pixels, notes: [\`\${answers.paper} paper, \${['faint', 'even', 'heavy'][Math.round(answers.weight * 2)]} wash\`] };
  },
});
`;

const direction = `import { defineDirection } from '@conjure/kit';

/**
 * A direction is read, not built: its brief goes to scene routing, the choice of medium and look, the
 * look's own questions and the vector composition; its note goes with each cast thing's questions.
 * finishes names the engine's finishing passes it brings to every print: 'otherworld', 'vacui', or none.
 */
export default defineDirection({
  brief: 'Direction: ${title.toLowerCase()}. TODO: in two or three sentences, say how every decision should lean, what to prefer and what to avoid, and that the subject stays readable. At most 480 characters.',
  note: 'Direction: ${title.toLowerCase()}. TODO: the same in one line, at most 200 characters.',
  finishes: [],
});
`;

mkdirSync(folder, { recursive: true });
writeFileSync(`${folder}/manifest.ts`, manifest);
writeFileSync(`${folder}/build.ts`, { thing, world, look, direction }[kind]);
console.log(kind === 'direction'
  ? `Created ${folder}/. Next:
  1. Write the summary in manifest.ts: the model chooses the direction for an idea from it.
  2. Write the brief and note in build.ts, and name any finishes it brings.
  3. npm test                          (length and shape rules; no browser needed)
  4. Conjure a few ideas with it pinned: ?force={"direction::house":"directions/${name}"}`
  : `Created ${folder}/. Next:
  1. Write the summary in manifest.ts${kind === 'look' ? ' and choose its medium' : ' and choose its scales'}.
  2. Build it in build.ts.
  3. npm run check ${kind}s/${name}     (needs npm run dev running)
  4. Open .data/check/${kind}s--${name}.png and look at it.`);
