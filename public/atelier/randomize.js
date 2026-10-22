import { mixLimit, mixModes } from "./mixer.js";
import {
  materialIds,
  materialObjects,
  supportsMaterial,
  validateMaterials,
} from "./material-state.js";
// Background-aware defaults keep light paper from blanketing a stack and dark
// fields from crushing it. These are blend suggestions, not exclusions.
const darkFields = new Set([
  "luminous",
  "scanner",
  "volume",
  "photogram",
  "mezzotint",
  "cyanotype",
  "game-obra",
  "game-inside",
  "game-windwaker",
  "resonant-sand",
  "cut-print",
  "electric-contour",
  "thickness-exposure",
]);
export function randomMix(styles, mode, random = Math.random) {
  if (!mixModes.includes(mode) || !styles.length)
    throw Error("Choose a valid mixer method and study collection");
  const draw = () => {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1)
        throw Error("Random source must produce values in [0,1)");
      return value;
    },
    integer = (lo, hi) => lo + Math.floor(draw() * (hi - lo + 1)),
    pool = [...new Set(styles.map((style) => style.id))],
    count = Math.min(pool.length, mixLimit, integer(3, 5));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = integer(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    mode,
    layers: pool.slice(0, count).map((id, index) => {
      if (mode === "average")
        return { id, enabled: true, weight: integer(25, 100), blend: "normal" };
      if (index === 0)
        return { id, enabled: true, weight: integer(85, 100), blend: "normal" };
      const blend =
        draw() < 0.22 ? "normal" : darkFields.has(id) ? "screen" : "multiply";
      return {
        id,
        enabled: true,
        weight: blend === "normal" ? integer(12, 35) : integer(18, 55),
        blend,
      };
    }),
  };
}

export function randomMaterials(random = Math.random) {
  const draw = () => {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1)
        throw Error("Random source must produce values in [0,1)");
      return value;
    },
    integer = (length) => Math.floor(draw() * length),
    pool = [...materialIds];
  // Shuffle the full palette and assign one entry per object. A larger catalog
  // yields a distinct subset; a smaller catalog is filled before shuffling.
  while (pool.length < materialObjects.length)
    pool.push(materialIds[integer(materialIds.length)]);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = integer(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Select a feasible subset in the already-shuffled order. Two Vase-only
  // materials cannot both occupy this scene. Matching before selection lets
  // the later conflicting choice give way to the next available material,
  // without extra random draws or changes to an already-feasible prefix.
  const selectionSlots = new Map(), selectedTokens = [];
  const select = (token, visited) => {
    for (let slot = 0; slot < materialObjects.length; slot++) {
      if (visited.has(slot) || !supportsMaterial(pool[token], materialObjects[slot].id)) continue;
      visited.add(slot);
      if (!selectionSlots.has(slot) || select(selectionSlots.get(slot), visited)) {
        selectionSlots.set(slot, token);
        return true;
      }
    }
    return false;
  };
  for (let token = 0; token < pool.length && selectedTokens.length < materialObjects.length; token++)
    if (select(token, new Set())) selectedTokens.push(token);
  if (selectedTokens.length < materialObjects.length)
    throw Error("The material catalog cannot fit the supported scene objects");
  if (selectedTokens.some((token, index) => token !== index)) {
    const selected = new Set(selectedTokens);
    const order = [...selectedTokens, ...pool.map((_material, token) => token).filter(token => !selected.has(token))];
    const reordered = order.map(token => pool[token]);
    pool.splice(0, pool.length, ...reordered);
  }
  // Keep the chosen palette, then match every scoped choice to a supported
  // object. A single swap is insufficient when two choices share the vase.
  // Already valid palettes need no repair or additional random draws.
  if (materialObjects.some(({ id }, index) => !supportsMaterial(pool[index], id))) {
    const scoped = materialObjects.map((_object, token) => ({
      token,
      eligible: materialObjects.flatMap(({ id }, index) =>
        supportsMaterial(pool[token], id) ? [index] : []),
    })).filter(item => item.eligible.length < materialObjects.length);
    scoped.sort((a, b) => a.eligible.length - b.eligible.length || a.token - b.token);
    for (const item of scoped) {
      if (!item.eligible.length) throw Error("A selected material has no supported scene object");
      if (item.eligible.includes(item.token))
        item.order = [item.token, ...item.eligible.filter(index => index !== item.token)];
      else {
        const start = integer(item.eligible.length);
        item.order = [...item.eligible.slice(start), ...item.eligible.slice(0, start)];
      }
    }
    const byToken = new Map(scoped.map(item => [item.token, item])), slots = new Map();
    const place = (token, visited) => {
      for (const slot of byToken.get(token).order) {
        if (visited.has(slot)) continue;
        visited.add(slot);
        if (!slots.has(slot) || place(slots.get(slot), visited)) {
          slots.set(slot, token);
          return true;
        }
      }
      return false;
    };
    for (const { token } of scoped)
      if (!place(token, new Set())) throw Error("Selected materials cannot fit the supported scene objects");
    const targets = new Map([...slots].map(([slot, token]) => [token, slot]));
    const tokenAtSlot = materialObjects.map((_object, index) => index);
    for (const { token } of scoped) {
      const from = tokenAtSlot.indexOf(token), to = targets.get(token);
      [tokenAtSlot[from], tokenAtSlot[to]] = [tokenAtSlot[to], tokenAtSlot[from]];
    }
    const selected = pool.slice(0, materialObjects.length);
    tokenAtSlot.forEach((token, slot) => { pool[slot] = selected[token]; });
  }
  const assignments = Object.fromEntries(
    materialObjects.map(({ id }, index) => [id, pool[index]]),
  );
  return validateMaterials({ preset: "custom", assignments });
}
