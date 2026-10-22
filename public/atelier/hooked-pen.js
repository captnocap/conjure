import { cleanFields, sameDrawSurface } from "./clean-studies.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, fallback) => (Number.isFinite(v) ? v : fallback);
export const HOOKED_PEN_VERSION = 1;

export function hookedPenParameters(f) {
  const strength = clamp(finite(f.intensity, 0.6));
  const scale = clamp(f.w / 720, 0.3, 1.5);
  return Object.freeze({
    strength,
    scale,
    width: (0.9 + 0.24 * strength) * scale,
    gap: (0.62 - 0.3 * strength) * scale,
    // Fewer, larger hooks at low strength; fine infill tightens the dark areas.
    radius: (6.2 - 2.65 * strength) * scale,
    step: 0.68 * scale,
    maxMarks: Math.ceil(11000 * scale * scale),
    maxSegments: Math.ceil(320000 * scale * scale),
    maxAttempts: Math.ceil(65000 * scale * scale),
  });
}

export function segmentDistanceSquared(a, b, c, d) {
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    vx = d[0] - c[0],
    vy = d[1] - c[1],
    wx = a[0] - c[0],
    wy = a[1] - c[1];
  const den = ux * vy - uy * vx;
  if (Math.abs(den) > 1e-12) {
    const s = (vx * wy - vy * wx) / den,
      t = (ux * wy - uy * wx) / den;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return 0;
  }
  const point = (px, py, x, y, dx, dy) => {
    const t = clamp(((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy || 1));
    return (px - x - t * dx) ** 2 + (py - y - t * dy) ** 2;
  };
  return Math.min(
    point(a[0], a[1], c[0], c[1], vx, vy),
    point(b[0], b[1], c[0], c[1], vx, vy),
    point(c[0], c[1], a[0], a[1], ux, uy),
    point(d[0], d[1], a[0], a[1], ux, uy),
  );
}

/** Visible-owner membership is checked along the ink-width footprint.
 * Adjacent coplanar, same-material depth ties may share a hook; the original
 * anchor plane is used for the equivalence check, never a global owner union.
 */
export function hookedPenOwnerSafe(
  field,
  w,
  x,
  y,
  owner,
  radius,
  frame = null,
  origin = null,
) {
  if (
    x < radius + 1 ||
    y < radius + 1 ||
    x >= w - radius - 1 ||
    y >= w - radius - 1
  )
    return false;
  const at = (xx, yy) => {
    const visibleOwner = field.ids[Math.round(yy) * w + Math.round(xx)];
    return (
      visibleOwner === owner ||
      (visibleOwner > 1 &&
        frame &&
        origin &&
        sameDrawSurface(frame, origin[0], origin[1], xx, yy))
    );
  };
  if (!at(x, y)) return false;
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 4;
    if (!at(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius))
      return false;
  }
  return true;
}

function randomSource(seed) {
  let state = (finite(seed, 2401) | 0) ^ 0x26df6e37;
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sparse hash stores segments, not filled glyph masks or a thresholded maze. */
function segmentHash(cellSize) {
  const buckets = new Map(),
    segments = [];
  let stamp = 0;
  const eachCell = (a, b, margin, visit) => {
    const x0 = Math.floor((Math.min(a[0], b[0]) - margin) / cellSize),
      x1 = Math.floor((Math.max(a[0], b[0]) + margin) / cellSize),
      y0 = Math.floor((Math.min(a[1], b[1]) - margin) / cellSize),
      y1 = Math.floor((Math.max(a[1], b[1]) + margin) / cellSize);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) visit(x + "," + y);
  };
  return {
    segments,
    insert(a, b, width, gap, mark) {
      const entry = { a, b, width, gap, mark, stamp: 0 };
      segments.push(entry);
      eachCell(a, b, 0, (key) => {
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(entry);
      });
    },
    collides(a, b, width, gap, maximumWidth, maximumGap, stats) {
      let hit = false;
      stamp++;
      eachCell(a, b, (width + maximumWidth) * 0.5 + maximumGap, (key) => {
        if (hit) return;
        const bucket = buckets.get(key);
        if (!bucket) return;
        for (const segment of bucket) {
          if (segment.stamp === stamp) continue;
          segment.stamp = stamp;
          stats.collisionChecks++;
          const limit =
            (width + segment.width) * 0.5 + Math.max(gap, segment.gap);
          if (
            segmentDistanceSquared(a, b, segment.a, segment.b) <
            limit * limit
          ) {
            hit = true;
            return;
          }
        }
      });
      return hit;
    },
  };
}

/** Actual sequential packing: each growing hook sees accepted ink and itself. */
export function buildHookedPen(f, field, params = hookedPenParameters(f)) {
  const w = f.w,
    random = randomSource(f.seed),
    paths = [],
    hash = segmentHash(4 * params.scale),
    stats = {
      attempted: 0,
      rejected: 0,
      steered: 0,
      boundaryStops: 0,
      collisionStops: 0,
      collisionChecks: 0,
      segments: 0,
      length: 0,
      curlRadians: 0,
      tiers: [0, 0, 0, 0],
    },
    maximumWidth = params.width * 1.28,
    maximumGap = params.gap * 1.5;
  const tile = 9 * params.scale,
    cols = Math.ceil(w / tile),
    tileCount = cols * cols,
    quota = new Map();
  const quotaKey = (x, y, owner) =>
    owner * tileCount + Math.floor(y / tile) * cols + Math.floor(x / tile);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        owner = field.ids[i];
      if (owner <= 1) continue;
      const key = quotaKey(x, y, owner);
      if (!quota.has(key)) quota.set(key, { area: 0, ink: 0, target: 0 });
      const bucket = quota.get(key);
      bucket.area++;
      bucket.target +=
        (0.055 + 0.48 * (1 - field.light[i]) ** 1.25) *
        (0.52 + 0.8 * params.strength);
    }
  // Candidates are stratified only for coverage; each cell is randomly offset,
  // visited in seed-shuffled order, and never imposes a screen on the ink.
  for (let pass = 0; pass < 9; pass++) {
    const tier = pass < 2 ? pass : pass < 5 ? 2 : 3;
    const radiusBase = params.radius * [1.5, 1, 0.62, 0.4][tier],
      pitch = radiusBase * [1.55, 1.15, 1.15, 1.25][tier],
      columns = Math.ceil(w / pitch),
      cells = new Uint32Array(columns * columns);
    for (let i = 0; i < cells.length; i++) cells[i] = i;
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)),
        hold = cells[i];
      cells[i] = cells[j];
      cells[j] = hold;
    }
    for (const cell of cells) {
      if (
        stats.attempted >= params.maxAttempts ||
        paths.length >= params.maxMarks ||
        stats.segments >= params.maxSegments
      )
        break;
      const x = ((cell % columns) + random()) * pitch,
        y = (Math.floor(cell / columns) + random()) * pitch;
      if (x >= w || y >= w) continue;
      const i = Math.round(y) * w + Math.round(x),
        owner = field.ids[i];
      if (!(owner > 1)) continue;
      const darkness = clamp(1 - field.light[i]),
        probability = clamp(
          0.15 +
            0.55 * params.strength +
            darkness * (0.43 + 0.54 * params.strength) -
            tier * 0.07,
          0.08,
          0.98,
        );
      if (random() > probability) continue;
      const cellBudget = quota.get(quotaKey(x, y, owner));
      if (!cellBudget || cellBudget.ink >= cellBudget.target) continue;
      stats.attempted++;
      const radius =
          radiusBase * (0.77 + 0.42 * random()) * (1.17 - 0.27 * darkness),
        width =
          params.width * (0.78 + 0.5 * darkness) * (tier === 3 ? 0.78 : 1),
        gap = params.gap * (1.5 - 0.7 * darkness),
        clearance = width * 0.5 + 0.44,
        step = params.step * (tier === 3 ? 0.7 : 1),
        spin = random() < 0.5 ? -1 : 1,
        phase = random() * TAU,
        // A local curl (roughly 1–2 turns) or a hooked S, never a long hatch.
        isDoubleHook = random() < 0.9,
        reversalPoint = 0.36 + 0.24 * random(),
        targetLength = radius * (3.3 + random() * 3.6),
        maxSteps = Math.min(
          145,
          Math.ceil(targetLength / step),
          params.maxSegments - stats.segments,
        ),
        points = [[x, y]];
      let angle = random() * TAU,
        traveled = 0,
        curl = 0,
        turnDebt = 0;
      if (
        !hookedPenOwnerSafe(field, w, x, y, owner, clearance, f, points[0]) ||
        hash.collides(
          points[0],
          points[0],
          width,
          gap,
          maximumWidth,
          maximumGap,
          stats,
        )
      ) {
        stats.rejected++;
        continue;
      }
      for (let k = 0; k < maxSteps; k++) {
        const progress = k / maxSteps,
          // Radius contracts gently to form an enclosure, then opens into a hook.
          localRadius = Math.max(radius * 0.36, radius * (1 - 0.5 * progress)),
          reversal = isDoubleHook && progress > reversalPoint ? -1 : 1,
          desiredTurn =
            ((spin * reversal * step) / localRadius) *
            (0.32 + 1.65 * Math.sin(phase + progress * 8.4) ** 4),
          from = points.at(-1);
        let accepted = null,
          usedTurn = 0,
          hadBoundary = false;
        // Collision feedback bends the live pen outward before abandoning it.
        for (const steer of [0, -0.18, 0.18, -0.42, 0.42, -0.68, 0.68]) {
          const turn = clamp(desiredTurn + spin * steer, -0.7, 0.7),
            heading = angle + turn,
            to = [
              from[0] + Math.cos(heading) * step,
              from[1] + Math.sin(heading) * step,
            ];
          if (
            !hookedPenOwnerSafe(
              field,
              w,
              to[0],
              to[1],
              owner,
              clearance,
              f,
              points[0],
            )
          ) {
            hadBoundary = true;
            continue;
          }
          if (
            hash.collides(from, to, width, gap, maximumWidth, maximumGap, stats)
          )
            continue;
          let collision = false;
          // Recent adjacent segments are connected; older segments conserve gaps.
          const skip = Math.ceil((width + gap) / step) + 2;
          for (let j = 1; j < points.length - skip; j++) {
            stats.collisionChecks++;
            if (
              segmentDistanceSquared(from, to, points[j - 1], points[j]) <
              (width + gap) ** 2
            ) {
              collision = true;
              break;
            }
          }
          if (collision) continue;
          accepted = to;
          usedTurn = turn;
          if (steer) stats.steered++;
          break;
        }
        if (!accepted) {
          if (hadBoundary) stats.boundaryStops++;
          else stats.collisionStops++;
          break;
        }
        angle += usedTurn;
        traveled += step;
        curl += Math.abs(usedTurn);
        turnDebt += usedTurn;
        points.push(accepted);
      }
      // Reject scraps. The marks must remain visibly bent, hooked pen gestures.
      if (traveled < radius * 2.15 || points.length < 8 || curl < 1.5) {
        stats.rejected++;
        continue;
      }
      const mark = paths.length;
      paths.push({
        owner,
        tier,
        width,
        gap,
        radius,
        points,
        length: traveled,
        curl,
        turn: turnDebt,
      });
      for (let j = 1; j < points.length; j++) {
        hash.insert(points[j - 1], points[j], width, gap, mark);
        const visibleOwner =
          field.ids[Math.round(points[j][1]) * w + Math.round(points[j][0])];
        const bucket = quota.get(
          quotaKey(points[j][0], points[j][1], visibleOwner),
        );
        if (bucket) bucket.ink += width * step;
      }
      stats.segments += points.length - 1;
      stats.length += traveled;
      stats.curlRadians += curl;
      stats.tiers[tier]++;
    }
  }
  return {
    w,
    seed: f.seed,
    strength: params.strength,
    params,
    paths,
    stats,
    // Contours are geometric visibility support, never the source of interior tone.
    contours: field.contours,
    creases: field.creases,
  };
}

export function prepareHookedPen(f) {
  const params = hookedPenParameters(f),
    // makeFrame.prepare already includes seed; intensity must be explicit here.
    key = `hooked-pen-v${HOOKED_PEN_VERSION}:${f.w}:${params.strength}`;
  return f.prepare(key, () => {
    const field = f.prepare("clean-fields", () => cleanFields(f));
    return buildHookedPen(f, field, params);
  });
}

export function drawHookedPen(p, f) {
  const plan = prepareHookedPen(f);
  p.background(252, 251, 246);
  p.noFill();
  p.stroke(24, 24, 22);
  for (const path of plan.paths) {
    p.strokeWeight(path.width);
    p.beginShape();
    for (const point of path.points) p.vertex(point[0], point[1]);
    p.endShape();
  }
  p.stroke(24, 24, 22, 175);
  p.strokeWeight(0.49 * plan.params.scale);
  for (let i = 0; i < plan.contours.length; i += 5)
    p.line(
      plan.contours[i],
      plan.contours[i + 1],
      plan.contours[i + 2],
      plan.contours[i + 3],
    );
  p.stroke(24, 24, 22, 120);
  p.strokeWeight(0.4 * plan.params.scale);
  for (let i = 0; i < plan.creases.length; i += 4)
    p.line(
      plan.creases[i],
      plan.creases[i + 1],
      plan.creases[i + 2],
      plan.creases[i + 3],
    );
}
