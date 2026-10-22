// Worker-side computation, followed by replay through the real p5.Graphics API.
// Pixel blocks are write-only channel patches; untouched channels retain prior drawing.
export const operations = [
  "background",
  "noStroke",
  "fill",
  "circle",
  "blendMode",
  "stroke",
  "noFill",
  "strokeWeight",
  "line",
  "rect",
  "beginShape",
  "vertex",
  "endShape",
  "ctx.beginPath",
  "ctx.moveTo",
  "ctx.lineTo",
  "ctx.closePath",
  "ctx.fill",
  "$pixels",
];
export function abortIf(signal) {
  if (signal?.aborted)
    throw signal.reason || new DOMException("Canceled", "AbortError");
}
export function recordDrawing(draw, frame, constants) {
  const values = [],
    strings = [],
    stringIds = new Map(),
    pixels = [];
  let pending = null;
  const emit = (code, args) => {
    const numeric = args.every((v) => typeof v === "number");
    values.push(code, numeric ? args.length : -args.length - 1);
    for (const value of args) {
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw Error("Non-finite drawing argument");
        if (!numeric) values.push(0);
        values.push(value);
      } else if (typeof value === "string") {
        if (!stringIds.has(value)) {
          stringIds.set(value, strings.length);
          strings.push(value);
        }
        values.push(1, stringIds.get(value));
      } else throw Error("Unsupported drawing argument");
    }
  };
  const p = { ...constants, drawingContext: {} };
  operations.forEach((name, code) => {
    if (name === "$pixels") return;
    const target = name.startsWith("ctx.") ? p.drawingContext : p,
      key = name.replace("ctx.", "");
    target[key] = (...args) => emit(code, args);
  });
  Object.defineProperty(p, "pixels", {
    get() {
      if (!pending) throw Error("Pixel edits require loadPixels");
      return pending;
    },
  });
  p.loadPixels = () => {
    if (pending) throw Error("Uncommitted pixel edit");
    pending = new Float64Array(frame.w * frame.w * 4).fill(NaN);
  };
  p.updatePixels = () => {
    if (!pending) throw Error("Pixel update without loadPixels");
    const data = new Uint8ClampedArray(pending.length),
      mask = new Uint8Array(pending.length / 4);
    let complete = true;
    for (let i = 0; i < pending.length; i++) {
      const value = pending[i];
      if (Number.isNaN(value)) {
        complete = false;
        continue;
      }
      if (!Number.isFinite(value)) throw Error("Non-finite pixel value");
      data[i] = value;
      mask[i >>> 2] |= 1 << i % 4;
    }
    pixels.push({ data, mask: complete ? null : mask });
    pending = null;
    emit(operations.indexOf("$pixels"), [pixels.length - 1]);
  };
  draw(p, frame);
  if (pending) throw Error("Pixel edit was not committed");
  return { commands: new Float64Array(values), strings, pixels };
}
export async function replayDrawing(
  graphics,
  packet,
  { signal, yieldFrame, budgetMs = 8, now = () => performance.now() } = {},
) {
  const { commands, strings, pixels } = packet,
    args = [];
  let offset = 0,
    started = now(),
    ticks = 0,
    shapeOpen = false;
  const cooperate = async () => {
    abortIf(signal);
    if (now() - started >= budgetMs) {
      await yieldFrame();
      abortIf(signal);
      started = now();
    }
  };
  abortIf(signal);
  while (offset < commands.length) {
    const code = commands[offset++],
      encoded = commands[offset++],
      name = operations[code],
      count = encoded < 0 ? -encoded - 1 : encoded;
    if (!name || !Number.isInteger(count) || count < 0 || count > 16)
      throw Error("Invalid drawing packet");
    args.length = count;
    for (let i = 0; i < count; i++)
      args[i] =
        encoded >= 0
          ? commands[offset++]
          : commands[offset++] === 1
            ? strings[commands[offset++]]
            : commands[offset++];
    if (name === "$pixels") {
      const patch = pixels[args[0]];
      if (!patch || patch.data.length !== graphics.width * graphics.height * 4)
        throw Error("Invalid pixel patch");
      graphics.loadPixels();
      if (graphics.pixels.length !== patch.data.length)
        throw Error("Contact sheet requires pixel density 1");
      if (!patch.mask) graphics.pixels.set(patch.data);
      else
        for (let i = 0; i < patch.data.length; i++) {
          if (patch.mask[i >>> 2] & (1 << i % 4))
            graphics.pixels[i] = patch.data[i];
          if (i % 16384 === 0) await cooperate();
        }
      abortIf(signal);
      graphics.updatePixels();
    } else {
      const target = name.startsWith("ctx.")
          ? graphics.drawingContext
          : graphics,
        key = name.replace("ctx.", "");
      if (typeof target[key] !== "function")
        throw Error(`Drawing method unavailable: ${name}`);
      if (name === "beginShape") {
        if (shapeOpen) throw Error("Nested shape in drawing packet");
        shapeOpen = true;
      }
      target[key](...args);
      if (name === "endShape") shapeOpen = false;
    }
    if (!shapeOpen && (++ticks % 32 === 0 || name === "endShape"))
      await cooperate();
  }
  if (shapeOpen) throw Error("Unclosed shape in drawing packet");
  abortIf(signal);
}
