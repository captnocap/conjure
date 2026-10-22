/** The parts of imagetracerjs (public domain) that the trace library uses. */
declare module 'imagetracerjs' {
  interface Colour { r: number; g: number; b: number; a: number }
  interface TracePath { isholepath: boolean; holechildren: number[]; segments: unknown[] }
  interface TraceData { layers: TracePath[][]; palette: Colour[]; width: number; height: number }
  interface PixelData { width: number; height: number; data: Uint8ClampedArray }
  interface Tracer {
    imagedataToTracedata(image: PixelData, options?: Record<string, unknown>): TraceData;
    svgpathstring(data: TraceData, layer: number, path: number, options?: Record<string, unknown>): string;
    checkoptions(options?: Record<string, unknown>): Record<string, unknown>;
  }
  const tracer: Tracer;
  export default tracer;
}
