// Regional collage combines completed, full-frame display-RGB images. Opaque
// backgrounds participate. Weight biases regions, not an exact area fraction;
// blend modes and layer order do not apply. No source images are cached or copied.
import { hasTargets, validateTargets, prepareObjectTargets } from "./object-targets.js";
import { layerTone, prepareReferenceTones, referenceToneAlphas } from "./reference-tones.js";

export const regionalDefaults = Object.freeze({
  temperature: 0.16,
  weightBias: 0.70,
  maxLayers: 8,
  maxSize: 720,
  maxFields: 8,
});

const chunkPixels = 4096;
const cacheStates = new WeakMap();

export function createRegionalCache({ maxFields = 8 } = {}) {
  if (!Number.isInteger(maxFields) || maxFields < 1 || maxFields > 8)
    throw Error("Regional cache must hold one to eight fields");
  const state = {
    fields: new Map(), maxFields, generation: 0,
    hits: 0, misses: 0, builds: 0, evictions: 0,
  };
  const cache = Object.freeze({
    get stats() {
      let fieldBytes = 0;
      for (const field of state.fields.values()) fieldBytes += field.byteLength;
      return {
        cachedFields: state.fields.size, fieldBytes, maxFields,
        fieldHits: state.hits, fieldMisses: state.misses,
        fieldBuilds: state.builds, fieldEvictions: state.evictions,
        // Only exponentials are retained, never images or diagnostic values.
        imageBytes: 0,
      };
    },
    clear() {
      state.fields.clear();
      state.generation++;
    },
  });
  cacheStates.set(cache, state);
  return cache;
}

export const defaultRegionalCache = createRegionalCache();

function abortIf(signal) {
  if (signal?.aborted)
    throw signal.reason || new DOMException("Canceled", "AbortError");
}

function rgba(bytes, length) {
  return (bytes instanceof Uint8ClampedArray || bytes instanceof Uint8Array) &&
    bytes.length === length;
}

function prepare(reference, images, layers, { size, seed, cache = defaultRegionalCache, identity }) {
  if (!Number.isInteger(size) || size < 1 || size > regionalDefaults.maxSize ||
      !rgba(reference, size * size * 4))
    throw Error("Regional mix requires square RGBA8 reference size 1 to 720");
  if (!Number.isSafeInteger(seed)) throw Error("Regional mix requires a stable integer seed");
  const state = cacheStates.get(cache);
  if (!state) throw Error("Use createRegionalCache for a regional field cache");
  if (!(images instanceof Map) || !Array.isArray(layers) ||
      layers.length > regionalDefaults.maxLayers)
    throw Error("Regional mix requires images and up to eight unique layers");
  const seen = new Set(), active = [];
  for (const layer of layers) {
    if (!layer || typeof layer.id !== "string" || !layer.id || seen.has(layer.id) ||
        typeof layer.enabled !== "boolean" || !Number.isInteger(layer.weight) ||
        layer.weight < 0 || layer.weight > 100)
      throw Error("Invalid regional layer");
    seen.add(layer.id);
    const targets = hasTargets(layer) ? validateTargets(layer.targets) : null,
      tone = layerTone(layer);
    // Snapshot controls before the first yield. Source bytes remain caller-owned.
    if (layer.enabled && layer.weight > 0 && (!targets || targets.length > 0))
      active.push({ id: layer.id, weight: layer.weight, ...(targets ? { targets } : {}),
        ...(tone !== "all" ? { tone } : {}),
      });
  }
  active.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const sources = active.map(({ id }) => {
    const source = images.get(id);
    if (!rgba(source, reference.length)) throw Error(`Missing regional mixer image: ${id}`);
    return source;
  });
  const maxWeight = Math.max(0, ...active.map(layer => layer.weight));
  const coefficients = active.map(layer =>
    Math.pow(layer.weight / maxWeight, regionalDefaults.weightBias / regionalDefaults.temperature));
  const coverage = prepareObjectTargets(active, identity, reference.length),
    targetCoefficients = coverage?.byOwner.map(indices => {
      const max = Math.max(0, ...indices.map(j => active[j].weight));
      return indices.map(j => Math.pow(active[j].weight / max,
        regionalDefaults.weightBias / regionalDefaults.temperature));
    });
  return { size, seed, state, active, sources, coefficients, coverage, targetCoefficients,
    tones: prepareReferenceTones(active),
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function startField(id, seed, size) {
  // Preserve the proof's seed namespace, RNG draw order and field constants.
  const random = rng(hashString(`atelier-spatial-v1:${seed}:${id}`)), waves = [];
  for (let j = 0; j < 4; j++) {
    const angle = random() * Math.PI * 2, frequency = 0.65 + random() * 1.10;
    waves.push({
      x: Math.cos(angle) * frequency * Math.PI * 2,
      y: Math.sin(angle) * frequency * Math.PI * 2,
      phase: random() * Math.PI * 2,
      amplitude: [1, .62, .38, .22][j],
    });
  }
  return { field: new Float32Array(size * size), waves, size, sum: 0, square: 0 };
}

function sampleField(work, start, end) {
  const { field, waves, size } = work;
  let { sum, square } = work;
  for (let i = start; i < end; i++) {
    const u = (i % size + .5) / size, v = (Math.floor(i / size) + .5) / size;
    let value = 0;
    for (const wave of waves)
      value += wave.amplitude * Math.sin(wave.x * u + wave.y * v + wave.phase);
    field[i] = value;
    sum += field[i]; square += field[i] * field[i];
  }
  work.sum = sum; work.square = square;
}

function normalizeField(work, start, end, mean, deviation) {
  const { field } = work;
  for (let i = start; i < end; i++) {
    // Both Float32 roundings match the proof. Reuse storage once diagnostics
    // are no longer needed; only the final exponentials enter the cache.
    field[i] = Math.max(-2.5, Math.min(2.5, (field[i] - mean) / deviation));
    field[i] = Math.exp(field[i] / regionalDefaults.temperature);
  }
}

function normalization(work) {
  const n = work.field.length, mean = work.sum / n;
  return [mean, Math.max(1e-6, Math.sqrt(work.square / n - mean * mean))];
}

function findField(state, key) {
  const field = state.fields.get(key);
  if (field) {
    state.hits++;
    state.fields.delete(key); state.fields.set(key, field);
  } else state.misses++;
  return field;
}

function rememberField(state, key, field, generation) {
  state.builds++;
  // clear() also invalidates pending insertions, without owning/aborting jobs.
  if (state.generation !== generation) return;
  state.fields.delete(key); state.fields.set(key, field);
  while (state.fields.size > state.maxFields) {
    state.fields.delete(state.fields.keys().next().value);
    state.evictions++;
  }
}

function contextKey(size, seed, id) { return JSON.stringify([size, seed, id]); }

function fieldSync({ state, size, seed }, id) {
  const key = contextKey(size, seed, id), cached = findField(state, key);
  if (cached) return cached;
  const generation = state.generation, work = startField(id, seed, size);
  sampleField(work, 0, work.field.length);
  normalizeField(work, 0, work.field.length, ...normalization(work));
  rememberField(state, key, work.field, generation);
  return work.field;
}

async function fieldAsync({ state, size, seed }, id, checkpoint, signal) {
  abortIf(signal);
  const key = contextKey(size, seed, id), cached = findField(state, key);
  if (cached) return cached;
  const generation = state.generation, work = startField(id, seed, size), n = work.field.length;
  for (let start = 0; start < n; start += chunkPixels) {
    sampleField(work, start, Math.min(n, start + chunkPixels));
    await checkpoint();
  }
  const [mean, deviation] = normalization(work);
  for (let start = 0; start < n; start += chunkPixels) {
    normalizeField(work, start, Math.min(n, start + chunkPixels), mean, deviation);
    await checkpoint();
  }
  abortIf(signal);
  rememberField(state, key, work.field, generation);
  return work.field;
}

function composeRange(reference, output, job, fields, scores, start, end) {
  if (job.tones)
    return composeToneRange(reference, output, job, fields, scores, start, end);
  if (job.coverage)
    return composeTargetRange(reference, output, job, fields, scores, start, end);
  const { sources, coefficients } = job, count = sources.length;
  if (!count) {
    output.set(reference.subarray(start * 4, end * 4), start * 4);
    return;
  }
  for (let pixel = start, at = start * 4; pixel < end; pixel++, at += 4) {
    if (count === 1) {
      const source = sources[0], alpha = source[at + 3];
      for (let c = 0; c < 3; c++)
        output[at + c] = (source[at + c] * alpha + reference[at + c] * (255 - alpha)) / 255;
    } else {
      let sum = 0;
      for (let j = 0; j < count; j++) {
        const value = fields[j][pixel] * coefficients[j];
        scores[j] = value; sum += value;
      }
      for (let c = 0; c < 3; c++) {
        let value = 0;
        for (let j = 0; j < count; j++) {
          const source = sources[j], alpha = source[at + 3];
          // Opaque sources preserve the original proof's exact arithmetic.
          const color = alpha === 255 ? source[at + c] :
            (source[at + c] * alpha + reference[at + c] * (255 - alpha)) / 255;
          value += scores[j] * color;
        }
        output[at + c] = value / sum;
      }
    }
    output[at + 3] = 255;
  }
}

function composeToneRange(reference, output, job, fields, scores, start, end) {
  const { sources, coefficients, coverage, targetCoefficients, tones } = job,
    all = sources.map((_, index) => index);
  for (let pixel = start, at = start * 4; pixel < end; pixel++, at += 4) {
    const owner = coverage ? coverage.ownerAt(pixel) : 0,
      indices = coverage ? coverage.byOwner[owner] : all;
    if (!indices.length) {
      for (let c = 0; c < 4; c++) output[at + c] = reference[at + c];
      continue;
    }
    const alphas = referenceToneAlphas(reference, at, sources, tones);
    if (indices.length === 1) {
      const j = indices[0], source = sources[j], alpha = alphas[j];
      for (let c = 0; c < 3; c++)
        output[at + c] = (source[at + c] * alpha + reference[at + c] * (255 - alpha)) / 255;
    } else {
      let sum = 0;
      for (let k = 0; k < indices.length; k++) {
        const j = indices[k], value = fields[j][pixel] *
          (coverage ? targetCoefficients[owner][k] : coefficients[j]);
        // Neither regional scores nor their normalization depend on tone masks.
        scores[k] = value; sum += value;
      }
      for (let c = 0; c < 3; c++) {
        let value = 0;
        for (let k = 0; k < indices.length; k++) {
          const j = indices[k], source = sources[j], alpha = alphas[j],
            color = alpha === 255 ? source[at + c] :
              (source[at + c] * alpha + reference[at + c] * (255 - alpha)) / 255;
          value += scores[k] * color;
        }
        output[at + c] = value / sum;
      }
    }
    output[at + 3] = 255;
  }
}

function composeTargetRange(reference, output, job, fields, scores, start, end) {
  const { sources, coverage, targetCoefficients } = job;
  for (let pixel = start, at = start * 4; pixel < end; pixel++, at += 4) {
    const owner = coverage.ownerAt(pixel), indices = coverage.byOwner[owner];
    if (!indices.length) {
      for (let c = 0; c < 4; c++) output[at + c] = reference[at + c];
      continue;
    }
    if (indices.length === 1) {
      const source = sources[indices[0]], alpha = source[at + 3];
      for (let c = 0; c < 3; c++)
        output[at + c] = (source[at + c] * alpha + reference[at + c] * (255 - alpha)) / 255;
    } else {
      let sum = 0;
      for (let k = 0; k < indices.length; k++) {
        const value = fields[indices[k]][pixel] * targetCoefficients[owner][k];
        scores[k] = value; sum += value;
      }
      for (let c = 0; c < 3; c++) {
        let value = 0;
        for (let k = 0; k < indices.length; k++) {
          const source = sources[indices[k]], alpha = source[at + 3],
            color = alpha === 255 ? source[at + c] :
              (source[at + c] * alpha + reference[at + c] * (255 - alpha)) / 255;
          value += scores[k] * color;
        }
        output[at + c] = value / sum;
      }
    }
    output[at + 3] = 255;
  }
}

export function compositeRegional(reference, images, layers, options = {}) {
  const job = prepare(reference, images, layers, options);
  const fields = job.active.length > 1 ? job.active.map(layer => fieldSync(job, layer.id)) : [];
  const output = new Uint8ClampedArray(reference.length), scores = new Float64Array(job.active.length);
  composeRange(reference, output, job, fields, scores, 0, job.size * job.size);
  return output;
}

export async function compositeRegionalAsync(reference, images, layers, options = {}) {
  const {
    signal,
    yieldFrame = () => new Promise(requestAnimationFrame),
    now = () => performance.now(),
    budgetMs = 8,
  } = options;
  abortIf(signal);
  if (typeof yieldFrame !== "function" || typeof now !== "function" ||
      !Number.isFinite(budgetMs) || budgetMs < 0)
    throw Error("Invalid regional scheduling options");
  const job = prepare(reference, images, layers, options), fields = [];
  let started = now();
  const checkpoint = async () => {
    abortIf(signal);
    if (now() - started >= budgetMs) {
      await yieldFrame();
      abortIf(signal);
      started = now();
    }
  };
  if (job.active.length > 1) for (const layer of job.active)
    fields.push(await fieldAsync(job, layer.id, checkpoint, signal));
  abortIf(signal);
  const output = new Uint8ClampedArray(reference.length), scores = new Float64Array(job.active.length);
  for (let start = 0, n = job.size * job.size; start < n; start += chunkPixels) {
    composeRange(reference, output, job, fields, scores, start, Math.min(n, start + chunkPixels));
    await checkpoint();
  }
  abortIf(signal);
  return output;
}
