// Fixed-budget grains sampled from conserved concentration. No field threshold
// or extra lines. Budget uses immutable initial mass (unit density by default),
// never a rounded floating sum of the solved density. Hidden grains are clipped only after the complete-domain solve.
export function renderSand(
  frame,
  graph,
  density,
  {
    seed = 2401,
    grainsPerPixel = 0.04,
    radius = 0.8,
    initialMasses = null,
  } = {},
) {
  const w = frame.size,
    pixels = new Uint8ClampedArray(frame.color),
    counts = [],
    stats = { budget: 0, visible: 0, clipped: 0 };
  const rand = (a, b) => {
    let q = Math.imul(a + 31 * seed, 374761393) ^ Math.imul(b + 971, 668265263);
    q = Math.imul(q ^ (q >>> 13), 1274126177);
    return ((q ^ (q >>> 16)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < w * w; i++)
    if (frame.owner[i] > 1)
      for (let k = 0; k < 3; k++)
        pixels[i * 4 + k] = frame.color[i * 4 + k] * 0.3;
  for (let c = 0; c < graph.components.length; c++) {
    const members = graph.components[c],
      id = graph.ids[members[0]],
      cell = w / graph.resolution[members[0]],
      mass = members.reduce((s, i) => s + density[i], 0),
      budgetMass = initialMasses?.[c] ?? members.length,
      budget =
        mass > 0 ? Math.round(budgetMass * cell * cell * grainsPerPixel) : 0,
      cdf = new Float64Array(members.length);
    if (!Number.isFinite(budgetMass) || budgetMass < 0)
      throw Error("Invalid initial component mass");
    let total = 0;
    for (let j = 0; j < members.length; j++)
      cdf[j] = total += density[members[j]];
    counts.push({ id, component: c, mass, budgetMass, budget });
    stats.budget += budget;
    for (let grain = 0; grain < budget; grain++) {
      const q =
        ((grain + rand(grain, id * 917 + graph.componentKeys[c])) / budget) *
        mass;
      let lo = 0,
        hi = cdf.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (q < cdf[mid]) hi = mid;
        else lo = mid + 1;
      }
      const node = members[lo],
        key = grain + (graph.x[node] + graph.y[node] * 257) * 1297 + id * 991,
        x = (graph.x[node] + rand(key, 17)) * cell,
        y = (graph.y[node] + rand(key, 37)) * cell,
        rr = radius;
      let seen = false;
      for (
        let yy = Math.max(0, Math.floor(y - rr - 1));
        yy <= Math.min(w - 1, Math.ceil(y + rr + 1));
        yy++
      )
        for (
          let xx = Math.max(0, Math.floor(x - rr - 1));
          xx <= Math.min(w - 1, Math.ceil(x + rr + 1));
          xx++
        ) {
          const i = yy * w + xx;
          if (frame.owner[i] !== id) continue;
          const g = graph.grids.get(id),
            target =
              g.index[
                Math.floor((yy + 0.5) / cell) * g.resolution +
                  Math.floor((xx + 0.5) / cell)
              ];
          if (target < 0 || graph.labels[target] !== c) continue;
          const alpha = Math.max(
            0,
            Math.min(1, rr + 0.5 - Math.hypot(xx + 0.5 - x, yy + 0.5 - y)),
          );
          if (!alpha) continue;
          seen = true;
          const value = 215 + 35 * rand(key, 83);
          for (let k = 0; k < 3; k++) {
            const sand = value * 0.88 + frame.color[i * 4 + k] * 0.12;
            pixels[i * 4 + k] += alpha * (sand - pixels[i * 4 + k]);
          }
        }
      if (seen) stats.visible++;
      else stats.clipped++;
    }
  }
  return { pixels, stats, counts };
}
