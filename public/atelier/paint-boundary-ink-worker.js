import { applyPaintBoundaryInk, WIDTH, HEIGHT } from './paint-boundary-ink.js';
import { PROTOCOL, assertRequest, validJobId } from './paint-boundary-ink-protocol.js';

// A single request consumes this worker, including invalid requests.
self.addEventListener('message', ({ data }) => {
  let checked = false;
  try {
    assertRequest(data);
    checked = true;
    const pixels = applyPaintBoundaryInk({ width: data.width, height: data.height, rgba: data.pixels });
    self.postMessage({ protocol: PROTOCOL, type: 'result', jobId: data.jobId, width: WIDTH, height: HEIGHT, pixels }, [pixels.buffer]);
  } catch (error) {
    self.postMessage({
      protocol: PROTOCOL,
      type: 'error',
      jobId: validJobId(data?.jobId) ? data.jobId : null,
      code: checked ? 'RENDER_FAILED' : 'INVALID_REQUEST',
      message: error instanceof Error ? error.message : 'Paint-boundary ink failed.',
    });
  } finally {
    self.close();
  }
}, { once: true });
