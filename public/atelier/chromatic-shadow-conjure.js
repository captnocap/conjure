import { cameraRays, prepareConjureRayGeometry, unit3 } from './conjure-ray-geometry.js';

const PALETTE = [[238, 236, 224], [210, 83, 153], [60, 186, 192], [40, 39, 58]];
export function renderConjureChromaticShadows(frame, geometry) {
  const size = frame.w, count = size * size;
  if (geometry.size !== size || !Number.isInteger(size) || size < 1 || size > 720) throw new Error('Invalid chromatic shadow capture size');
  for (const name of ['color', 'depth', 'identity']) if (!ArrayBuffer.isView(frame[name]) || frame[name].length !== count * 4) throw new Error(`Invalid chromatic ${name} capture`);
  const directions = (frame.sectionRibLighting?.directional ?? []).slice(0, 2).map(light => unit3(light.direction));
  const camera = cameraRays(geometry), engine = prepareConjureRayGeometry(geometry);
  const pixels = new Uint8ClampedArray(count * 4), states = new Uint8Array(count), counts = [0, 0, 0, 0];
  const scale = geometry.worldScale > 0 ? geometry.worldScale : 1, cutoff = 0.00015 * scale;
  try {
    for (let i = 0; i < count; i++) {
      const at = i * 4;
      let state = 0;
      if (frame.identity[at] && directions.length) {
        const d = frame.depth[at] / 256 + frame.depth[at + 1] / 65536 + frame.depth[at + 2] / 16777216 + frame.depth[at + 3] / (255 * 16777216);
        const origin = camera.receiver(2 * ((i % size) + 0.5) / size - 1, 1 - 2 * (Math.floor(i / size) + 0.5) / size, d);
        for (let light = 0; light < directions.length; light++) if (engine.hitAny(origin, directions[light], cutoff)) state |= 1 << light;
      }
      states[i] = state; counts[state]++;
      const luminance = (0.2126 * frame.color[at] + 0.7152 * frame.color[at + 1] + 0.0722 * frame.color[at + 2]) / 255;
      const factor = 0.18 + 0.82 * luminance;
      for (let k = 0; k < 3; k++) pixels[at + k] = Math.round(PALETTE[state][k] * factor);
      pixels[at + 3] = 255;
    }
    return { pixels, states, counts, directionalLights: directions.length, triangles: engine.triangleCount };
  } finally { engine.dispose(); }
}
