// Owner-aware Wholetoning: the original segmentation, objective and connected-block
// proposals are retained. Complex Conjure scenes use an explicit bounded search
// horizon rather than rejecting a conservative maximum-degree work estimate.
export const WIDTH = 720;
export const HEIGHT = 720;
export const REGION_CAP = 16384;
export const SEARCH_SEED = 2401;
// Count actual adjacency work. A budget-limited search ends between complete
// improving blocks and returns its best labels, with explicit completion metadata.
export const MAX_ADJACENCY_VISITS = 2 ** 28;
export const MAX_INITIAL_REGIONS = 65536;
export const MAX_COORDINATED_WITNESSES = 64;
const PIXELS = WIDTH * HEIGHT;
const PARTS = ['Ccol', 'Calike', 'Copp', 'Cgroup', 'Cperimeter'];
const require = (condition, message) => { if (!condition) throw new Error(message); };
const blankParts = () => ({ Ccol: 0, Calike: 0, Copp: 0, Cgroup: 0, Cperimeter: 0 });
const addParts = (a, b) => { for (const key of PARTS) a[key] += b[key]; };
const distance = (a, b) => {
  let sum = 0;
  for (let c = 0; c < 3; c++) sum += (a[c] - b[c]) * (a[c] - b[c]);
  return Math.sqrt(sum / 3);
};
const groupCost = (ones, count) => 1 - Math.abs(2 * ones - count) / count;
const sorted = values => [...values].sort((a, b) => a - b);
const increment = (map, key, count = 1) => map.set(key, (map.get(key) || 0) + count);

function checkOwnerComponentBound(identity) {
  // Every final region is inside one four-connected owner component: the
  // frozen merge rule cannot cross an owner boundary. This lower bound rejects
  // impossible inputs before allocating per-region maps; it changes no output.
  const visited = new Uint8Array(PIXELS), queue = new Int32Array(PIXELS);
  let components = 0;
  for (let seed = 0; seed < PIXELS; seed++) if (!visited[seed]) {
    components++; visited[seed] = 1; queue[0] = seed;
    const owner = identity[seed * 4]; let tail = 1;
    for (let q = 0; q < tail; q++) {
      const i = queue[q], x = i % WIDTH, y = Math.floor(i / WIDTH);
      for (const j of [x ? i - 1 : -1, x < WIDTH - 1 ? i + 1 : -1, y ? i - WIDTH : -1, y < HEIGHT - 1 ? i + WIDTH : -1])
        if (j >= 0 && !visited[j] && identity[4 * j] === owner) { visited[j] = 1; queue[tail++] = j; }
    }
  }
  require(components <= REGION_CAP,
    `Wholetoning cannot process this capture: region cap exceeded (at least ${components} owner components > ${REGION_CAP}); frozen segmentation is unchanged. Choose another study or simplify the material assignments.`);
}

export function validateWholetoningSource(color, identity, size = WIDTH) {
  if (size !== WIDTH) throw new RangeError('Wholetoning requires the fixed 720-pixel capture');
  for (const [name, bytes] of [['color', color], ['identity', identity]]) {
    if (!(bytes instanceof Uint8Array || bytes instanceof Uint8ClampedArray))
      throw new TypeError(`Wholetoning ${name} must be a byte RGBA array`);
    if (bytes.length !== PIXELS * 4)
      throw new RangeError(`Wholetoning ${name} must contain exactly 720 × 720 RGBA pixels`);
  }
}

// Smallest area first, then original region ID. Stale heap entries are skipped.
class SmallHeap {
  values = [];
  less(a, b) { return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]); }
  push(value) {
    const a = this.values;
    let i = a.length;
    a.push(value);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(value, a[parent])) break;
      a[i] = a[parent]; i = parent;
    }
    a[i] = value;
  }
  pop() {
    const a = this.values, first = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let next = i * 2 + 1;
        if (next + 1 < a.length && this.less(a[next + 1], a[next])) next++;
        if (!this.less(a[next], last)) break;
        a[i] = a[next]; i = next;
      }
      a[i] = last;
    }
    return first;
  }
}

export function partitionWholetoning(color, identity, size = WIDTH) {
  validateWholetoningSource(color, identity, size);
  checkOwnerComponentBound(identity);
  let blurred = new Float64Array(PIXELS * 3), next = new Float64Array(PIXELS * 3);
  for (let i = 0; i < PIXELS; i++) for (let c = 0; c < 3; c++)
    blurred[3 * i + c] = color[4 * i + c] / 255;
  const weights = [1, 2, 1];
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      let red = 0, green = 0, blue = 0, denominator = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (xx < 0 || yy < 0 || xx >= WIDTH || yy >= HEIGHT) continue;
        const j = yy * WIDTH + xx;
        if (identity[4 * j] !== identity[4 * i]) continue;
        const weight = weights[dy + 1] * weights[dx + 1];
        denominator += weight;
        red += weight * blurred[3 * j];
        green += weight * blurred[3 * j + 1];
        blue += weight * blurred[3 * j + 2];
      }
      next[3 * i] = red / denominator;
      next[3 * i + 1] = green / denominator;
      next[3 * i + 2] = blue / denominator;
    }
    [blurred, next] = [next, blurred];
  }
  const bins = new Uint8Array(PIXELS);
  for (let i = 0; i < PIXELS; i++) bins[i] = Math.max(0, Math.min(7, Math.floor(8 *
    (0.2126 * blurred[3 * i] + 0.7152 * blurred[3 * i + 1] + 0.0722 * blurred[3 * i + 2]))));
  blurred = next = null;
  const membership = new Int32Array(PIXELS).fill(-1), queue = new Int32Array(PIXELS), regions = [];
  for (let seed = 0; seed < PIXELS; seed++) if (membership[seed] < 0) {
    require(regions.length < MAX_INITIAL_REGIONS,
      `Wholetoning cannot process this capture within its fixed partition budget (more than ${MAX_INITIAL_REGIONS} initial regions). Choose another study or simplify the material assignments.`);
    const n = regions.length, region = { owner: identity[4 * seed], original: n, area: 0,
      rawByteSums: [0, 0, 0], meanRGB: [0, 0, 0], contact: new Map() };
    let tail = 1;
    queue[0] = seed; membership[seed] = n;
    for (let q = 0; q < tail; q++) {
      const i = queue[q], x = i % WIDTH, y = Math.floor(i / WIDTH);
      region.area++;
      for (let c = 0; c < 3; c++) region.rawByteSums[c] += color[4 * i + c];
      for (const j of [x ? i - 1 : -1, x < WIDTH - 1 ? i + 1 : -1, y ? i - WIDTH : -1, y < HEIGHT - 1 ? i + WIDTH : -1])
        if (j >= 0 && membership[j] < 0 && identity[4 * j] === region.owner && bins[j] === bins[seed]) {
          membership[j] = n; queue[tail++] = j;
        }
    }
    regions.push(region);
  }
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x, a = membership[i];
    for (const j of [x < WIDTH - 1 ? i + 1 : -1, y < HEIGHT - 1 ? i + WIDTH : -1])
      if (j >= 0 && a !== membership[j]) {
        increment(regions[a].contact, membership[j]); increment(regions[membership[j]].contact, a);
      }
  }
  const initialRegions = regions.length, parent = Int32Array.from({ length: initialRegions }, (_, i) => i),
    alive = new Uint8Array(initialRegions).fill(1), heap = new SmallHeap();
  for (let i = 0; i < initialRegions; i++) if (regions[i].area < 32) heap.push([regions[i].area, i]);
  let merges = 0;
  while (heap.values.length) {
    const [area, a] = heap.pop(), ra = regions[a];
    if (!alive[a] || ra.area !== area || area >= 32) continue;
    let best = -1, boundary = -1, bestDistance = Infinity;
    for (const [b, length] of ra.contact) if (alive[b] && regions[b].owner === ra.owner) {
      let d = 0;
      for (let c = 0; c < 3; c++) {
        const value = ra.rawByteSums[c] / ra.area - regions[b].rawByteSums[c] / regions[b].area;
        d += value * value;
      }
      if (d < bestDistance || (d === bestDistance && (length > boundary || (length === boundary && b < best)))) {
        best = b; boundary = length; bestDistance = d;
      }
    }
    if (best < 0) continue;
    const rb = regions[best];
    for (const [neighbor, length] of ra.contact) {
      regions[neighbor].contact.delete(a);
      if (neighbor !== best) { increment(regions[neighbor].contact, best, length); increment(rb.contact, neighbor, length); }
    }
    rb.contact.delete(a); rb.area += ra.area;
    for (let c = 0; c < 3; c++) rb.rawByteSums[c] += ra.rawByteSums[c];
    ra.contact.clear(); alive[a] = 0; parent[a] = best; merges++;
    if (rb.area < 32) heap.push([rb.area, best]);
  }
  const compact = new Int32Array(initialRegions).fill(-1), nodes = [];
  let isolatedSmallRegions = 0;
  for (let i = 0; i < initialRegions; i++) if (alive[i]) {
    compact[i] = nodes.length;
    const r = regions[i];
    const node = { id: nodes.length, owner: r.owner, original: r.original, area: r.area,
      rawByteSums: [...r.rawByteSums], meanRGB: r.rawByteSums.map(sum => sum / (255 * r.area)) };
    if (r.area < 32) isolatedSmallRegions++;
    nodes.push(node);
  }
  const n = nodes.length;
  require(n <= REGION_CAP, `Wholetoning cannot process this capture: region cap exceeded (${n} > ${REGION_CAP}); frozen segmentation is unchanged. Choose another study or simplify the material assignments.`);
  const pixels = new Int32Array(PIXELS);
  for (let i = 0; i < PIXELS; i++) {
    let a = membership[i], root = a;
    while (parent[root] !== root) root = parent[root];
    while (parent[a] !== a) { const before = parent[a]; parent[a] = root; a = before; }
    pixels[i] = compact[root];
  }
  const measured = new Int32Array(n), sums = Array.from({ length: n }, () => [0, 0, 0]),
    seen = new Uint8Array(PIXELS), exactContacts = new Map();
  for (let i = 0; i < PIXELS; i++) {
    const a = pixels[i], x = i % WIDTH, y = Math.floor(i / WIDTH);
    require(a >= 0 && a < n, 'Invalid membership');
    require(nodes[a].owner === identity[4 * i], 'Cross-owner merge');
    measured[a]++;
    for (let c = 0; c < 3; c++) sums[a][c] += color[4 * i + c];
    for (const j of [x < WIDTH - 1 ? i + 1 : -1, y < HEIGHT - 1 ? i + WIDTH : -1])
      if (j >= 0 && a !== pixels[j]) increment(exactContacts, Math.min(a, pixels[j]) * n + Math.max(a, pixels[j]));
  }
  let components = 0;
  for (let seed = 0; seed < PIXELS; seed++) if (!seen[seed]) {
    components++; const a = pixels[seed]; seen[seed] = 1; queue[0] = seed;
    let tail = 1;
    for (let q = 0; q < tail; q++) {
      const i = queue[q], x = i % WIDTH, y = Math.floor(i / WIDTH);
      for (const j of [x ? i - 1 : -1, x < WIDTH - 1 ? i + 1 : -1, y ? i - WIDTH : -1, y < HEIGHT - 1 ? i + WIDTH : -1])
        if (j >= 0 && !seen[j] && pixels[j] === a) { seen[j] = 1; queue[tail++] = j; }
    }
  }
  require(components === n, 'Disconnected region');
  const counts = new Int32Array(256), edges = [], adjacency = Array.from({ length: n }, () => []);
  for (let a = 0; a < n; a++) {
    const r = nodes[a];
    require(r.area === measured[a] && r.rawByteSums.every((sum, c) => sum === sums[a][c]), 'Stats mismatch');
    counts[r.owner]++;
    for (const [neighbor, length] of regions[r.original].contact) {
      const b = compact[neighbor];
      require(b >= 0, 'Dead neighbor survived');
      require(exactContacts.get(Math.min(a, b) * n + Math.max(a, b)) === length, 'Merge contact mismatch');
    }
  }
  let plainEdgeLength = 0, featureWeightedEdgeLength = 0;
  for (const key of sorted(exactContacts.keys())) {
    const a = Math.floor(key / n), b = key % n, length = exactContacts.get(key),
      contrast = Math.pow(distance(nodes[a].meanRGB, nodes[b].meanRGB), 0.2),
      multiplier = nodes[a].owner !== nodes[b].owner ? 3 : 1;
    adjacency[a].push(edges.length); adjacency[b].push(edges.length);
    edges.push({ a, b, length, contrast, multiplier });
    plainEdgeLength += length; featureWeightedEdgeLength += length * multiplier;
  }
  for (let a = 0; a < n; a++) {
    nodes[a].degree = adjacency[a].length;
    if (nodes[a].area < 32) for (const index of adjacency[a]) {
      const e = edges[index], b = e.a === a ? e.b : e.a;
      require(nodes[a].owner !== nodes[b].owner, 'Mergeable small region survived');
    }
  }
  const graph = { nodes, edges, adjacency, counts, groups: counts.reduce((sum, count) => sum + (count > 0), 0),
    plainEdgeLength, featureWeightedEdgeLength, totalArea: PIXELS };
  return { graph, pixels, initialRegions, merges, isolatedSmallRegions };
}

export function wholetoningEnergy(parts) {
  return (parts.Ccol + 3 * parts.Calike + 2 * parts.Copp + parts.Cgroup) / 7;
}
function unary(graph, i, label) {
  const r = graph.nodes[i];
  return r.area * distance(r.meanRGB, [label, label, label]) / graph.totalArea;
}
export function initialWholetoningLabels(graph) {
  return Uint8Array.from(graph.nodes, (_, i) => +(unary(graph, i, 1) < unary(graph, i, 0)));
}
export function evaluateWholetoning(graph, labels) {
  require(labels?.length === graph.nodes.length, 'Invalid region label count');
  const parts = blankParts(), ones = new Int32Array(256);
  for (let i = 0; i < graph.nodes.length; i++) {
    require(labels[i] === 0 || labels[i] === 1, 'Region labels must be binary');
    parts.Ccol += unary(graph, i, labels[i]); ones[graph.nodes[i].owner] += labels[i];
  }
  for (const e of graph.edges) {
    const same = labels[e.a] === labels[e.b];
    if (graph.featureWeightedEdgeLength > 0 && same)
      parts.Calike += e.length * e.contrast * e.multiplier / graph.featureWeightedEdgeLength;
    if (graph.plainEdgeLength > 0 && !same) {
      parts.Copp += e.length * (1 - e.contrast) / graph.plainEdgeLength;
      parts.Cperimeter += e.length / graph.plainEdgeLength;
    }
  }
  if (graph.groups) for (let owner = 0; owner < 256; owner++) if (graph.counts[owner])
    parts.Cgroup += groupCost(ones[owner], graph.counts[owner]) / graph.groups;
  return parts;
}
class State {
  constructor(graph, labels) {
    this.graph = graph; this.labels = labels; this.ones = new Int32Array(256);
    this.adjacencyVisits = graph.edges.length;
    for (let i = 0; i < graph.nodes.length; i++) this.ones[graph.nodes[i].owner] += labels[i];
    this.parts = evaluateWholetoning(graph, labels);
  }
  delta(i) {
    const g = this.graph, d = blankParts(), old = this.labels[i], now = 1 - old;
    d.Ccol = unary(g, i, now) - unary(g, i, old);
    this.adjacencyVisits += g.adjacency[i].length;
    for (const edgeIndex of g.adjacency[i]) {
      const e = g.edges[edgeIndex], j = e.a === i ? e.b : e.a, sign = this.labels[j] === old ? -1 : 1;
      if (g.featureWeightedEdgeLength > 0) d.Calike += sign * e.length * e.contrast * e.multiplier / g.featureWeightedEdgeLength;
      if (g.plainEdgeLength > 0) {
        d.Copp -= sign * e.length * (1 - e.contrast) / g.plainEdgeLength;
        d.Cperimeter -= sign * e.length / g.plainEdgeLength;
      }
    }
    const owner = g.nodes[i].owner;
    if (g.groups) d.Cgroup = (groupCost(this.ones[owner] + now - old, g.counts[owner]) -
      groupCost(this.ones[owner], g.counts[owner])) / g.groups;
    return d;
  }
  flip(i) {
    addParts(this.parts, this.delta(i));
    this.ones[this.graph.nodes[i].owner] += 1 - 2 * this.labels[i]; this.labels[i] = 1 - this.labels[i];
  }
}
const discrepancy = (a, b) => Math.max(...PARTS.map(key => Math.abs(a[key] - b[key])));
function lexless(a, b, k) {
  for (let i = 0; i < k; i++) if (((a >> i) & 1) !== ((b >> i) & 1)) return ((a >> i) & 1) < ((b >> i) & 1);
  return false;
}

export function estimateWholetoningWork(graph) {
  const maximumDegree = graph.adjacency.reduce((maximum, edges) => Math.max(maximum, edges.length), 0);
  // Per block: 15 Gray flips, one restore (last reflected Gray mask has one
  // set bit), up to four isolated deltas and four accepted flips = 24 scans.
  // Three frontier growth rounds visit at most 1 + 2 + 3 = 6 node lists.
  // Initial objective plus 64 full sweep checks scan every edge 65 times.
  return { maximumDegree, adjacencyVisits: 64 * graph.nodes.length * 30 * maximumDegree + 65 * graph.edges.length };
}

export function searchWholetoning(graph, { maxAdjacencyVisits = MAX_ADJACENCY_VISITS } = {}) {
  require(graph.nodes.length > 0 && graph.nodes.length <= REGION_CAP, 'Invalid bounded region graph');
  const work = estimateWholetoningWork(graph);
  require(Number.isSafeInteger(maxAdjacencyVisits) && maxAdjacencyVisits >= 2 * graph.edges.length,
    'Wholetoning work budget must allow the initial and final objective checks');
  const state = new State(graph, initialWholetoningLabels(graph)), order = [], witnesses = [], sweepEnergy = [];
  let rng = SEARCH_SEED, assignments = 0, accepted = 0, multiLabelAccepted = 0, maxComponentDeltaError = 0;
  let completedSweeps = 0, completedBlocks = 0, coordinatedMoves = 0, budgetExhausted = false;
  const choice = n => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return Math.floor(rng / 4294967296 * n); };
  for (let sweep = 0; sweep < 64; sweep++) {
    for (let i = 0; i < graph.nodes.length; i++) order[i] = i;
    for (let i = order.length - 1; i > 0; i--) { const j = choice(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    blocks: for (const root of order) {
      const block = [root];
      while (block.length < 4) {
        const frontier = new Set();
        const frontierVisits = block.reduce((sum, a) => sum + graph.adjacency[a].length, 0);
        if (state.adjacencyVisits + frontierVisits + graph.edges.length > maxAdjacencyVisits) {
          budgetExhausted = true; break blocks;
        }
        state.adjacencyVisits += frontierVisits;
        for (const a of block) for (const edgeIndex of graph.adjacency[a]) {
          const e = graph.edges[edgeIndex], b = e.a === a ? e.b : e.a;
          if (!block.includes(b)) frontier.add(b);
        }
        if (!frontier.size) break;
        block.push(sorted(frontier)[choice(frontier.size)]);
      }
      block.sort((a, b) => a - b);
      const k = block.length;
      // Gray-code traversal flips bit j 2^(k-j-1) times; restoration flips
      // only its highest bit. Reserve one isolated delta and accepted flip per
      // node, plus the mandatory exact objective check at the end of the sweep.
      const blockVisits = block.reduce((sum, a, j) => sum + graph.adjacency[a].length *
        (2 ** (k - j - 1) + (j === k - 1 ? 1 : 0) + 2), 0);
      if (state.adjacencyVisits + blockVisits + graph.edges.length > maxAdjacencyVisits) {
        budgetExhausted = true; break;
      }
      let start = 0;
      for (let j = 0; j < k; j++) start |= state.labels[block[j]] << j;
      const preParts = { ...state.parts }, pre = wholetoningEnergy(preParts);
      let bestEnergy = pre, best = start, current = start;
      assignments++;
      for (let step = 1; step < (1 << k); step++) {
        const mask = start ^ (step ^ (step >> 1)), bit = 31 - Math.clz32(mask ^ current);
        state.flip(block[bit]); current = mask; assignments++;
        const energy = wholetoningEnergy(state.parts);
        if (energy < bestEnergy || (energy === bestEnergy && best !== start && (mask === start || lexless(mask, best, k)))) {
          bestEnergy = energy; best = mask;
        }
      }
      for (let j = 0; j < k; j++) if (((current ^ start) >> j) & 1) state.flip(block[j]);
      state.parts = preParts;
      if (pre - bestEnergy > 1e-12) {
        const changed = [], isolatedEnergyDeltas = [];
        for (let j = 0; j < k; j++) if (((best ^ start) >> j) & 1) {
          changed.push(block[j]); isolatedEnergyDeltas.push(wholetoningEnergy(state.delta(block[j])));
        }
        const before = changed.map(a => state.labels[a]), coordinated = changed.length > 1 && isolatedEnergyDeltas.every(x => x >= 0),
          fullPreMoveLabels = coordinated && witnesses.length < MAX_COORDINATED_WITNESSES ? [...state.labels] : null, witnessPreParts = { ...state.parts };
        for (const a of changed) state.flip(a);
        const post = wholetoningEnergy(state.parts);
        require(pre - post > 1e-12, 'Accepted nonimproving block'); accepted++; multiLabelAccepted += changed.length > 1;
        if (coordinated) coordinatedMoves++;
        if (coordinated && fullPreMoveLabels) witnesses.push({ sweep, root, block, changed, before, after: changed.map(a => state.labels[a]),
          fullPreMoveLabels, isolatedEnergyDeltas, pre, post, jointDelta: post - pre,
          preComponents: { ...witnessPreParts, energy: pre }, postComponents: { ...state.parts, energy: post } });
      }
      completedBlocks++;
    }
    state.adjacencyVisits += graph.edges.length;
    const exact = evaluateWholetoning(graph, state.labels), error = discrepancy(state.parts, exact);
    maxComponentDeltaError = Math.max(maxComponentDeltaError, error);
    require(error <= 1e-9, 'HOLD: incremental/full discrepancy'); state.parts = exact;
    require(Number.isFinite(wholetoningEnergy(exact)), 'Nonfinite energy'); sweepEnergy.push(wholetoningEnergy(exact));
    if (budgetExhausted) break;
    completedSweeps++;
  }
  require(assignments <= 64 * graph.nodes.length * 16, 'Assignment bound exceeded');
  return { labels: state.labels, components: { ...state.parts, energy: wholetoningEnergy(state.parts) },
    assignments, accepted, multiLabelAccepted, maxComponentDeltaError, sweepEnergy, coordinatedWitnesses: witnesses,
    completedSweeps, completedBlocks, coordinatedMoves, budgetExhausted, adjacencyVisits: state.adjacencyVisits,
    maxAdjacencyVisits, estimatedAdjacencyVisits: work.adjacencyVisits };
}

export function renderWholetoning(color, identity, size = WIDTH) {
  const partition = partitionWholetoning(color, identity, size), search = searchWholetoning(partition.graph),
    rgba = new Uint8ClampedArray(PIXELS * 4);
  for (let i = 0; i < PIXELS; i++) {
    const value = search.labels[partition.pixels[i]] * 255;
    rgba[4 * i] = rgba[4 * i + 1] = rgba[4 * i + 2] = value; rgba[4 * i + 3] = 255;
  }
  return { ...partition, search, labels: search.labels, rgba };
}
