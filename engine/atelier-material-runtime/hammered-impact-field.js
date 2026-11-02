// A repeatable scalar impact field. Units are mean strike pitch, not pixels.
// Each strike is a negative bowl with a smooth return to the stock. The cubic
// compact envelope makes height, slope and curvature zero at its boundary.
export const FIELD_SIZE = 512;
export const FIELD_PERIOD = 16;

export function impactProfile(s) {
  if (s >= 1) return [0, 0];
  const t = 1 - s;
  return [-(t ** 3), 3 * t ** 2];
}

export function createImpactField({ size = FIELD_SIZE, period = FIELD_PERIOD } = {}) {
  if (!Number.isInteger(size) || size < 16 || (size & (size - 1)))
    throw new RangeError('Impact texture size must be a power of two >= 16');
  let state = 0x71d6c293;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const strikes = [];
  for (let y = 0; y < period; y++) for (let x = 0; x < period; x++) {
    const angle = random() * Math.PI * 2;
    strikes.push({ x: x + .5 + (random() - .5) * .78,
      y: y + .5 + (random() - .5) * .78,
      radius: .71 + random() * .19, aspect: .83 + random() * .34,
      depth: .72 + random() * .4, c: Math.cos(angle), s: Math.sin(angle) });
  }
  const data = new Float32Array(size * size * 4), density = size / period;
  // Rasterize each compact strike locally. Wrapped writes preserve a seamless
  // period; no per-fragment searches and no process-global texture cache.
  for (const strike of strikes) {
    const extent = strike.radius * Math.max(strike.aspect, 1 / strike.aspect);
    for (let iy = Math.floor((strike.y - extent) * density); iy <= Math.ceil((strike.y + extent) * density); iy++)
      for (let ix = Math.floor((strike.x - extent) * density); ix <= Math.ceil((strike.x + extent) * density); ix++) {
        const x = (ix + .5) / density - strike.x, y = (iy + .5) / density - strike.y;
        const u = (strike.c * x + strike.s * y) / (strike.radius * strike.aspect);
        const v = (-strike.s * x + strike.c * y) * strike.aspect / strike.radius;
        const [height, derivative] = impactProfile(u * u + v * v);
        const offset = (((iy % size + size) % size) * size + (ix % size + size) % size) * 4;
        data[offset] += strike.depth * height;
        data[offset + 1] += strike.depth * derivative * 2 *
          (u * strike.c / (strike.radius * strike.aspect) - v * strike.s * strike.aspect / strike.radius);
        data[offset + 2] += strike.depth * derivative * 2 *
          (u * strike.s / (strike.radius * strike.aspect) + v * strike.c * strike.aspect / strike.radius);
      }
  }
  for (let i = 0; i < data.length; i += 4) data[i + 3] = data[i + 1] ** 2 + data[i + 2] ** 2;
  const levels = [{ data, width: size, height: size }];
  while (levels.at(-1).width > 1) {
    const source = levels.at(-1), width = source.width / 2;
    const next = new Float32Array(width * width * 4);
    for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++)
        sum += source.data[((2 * y + j) * source.width + 2 * x + i) * 4 + c];
      next[(y * width + x) * 4 + c] = sum * .25;
    }
    levels.push({ data: next, width, height: width });
  }
  return { levels, period, strikes };
}
