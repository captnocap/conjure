import { assertRequest, runFlutedGlassJob, failureReply } from './fluted-glass-protocol.js';

// Exactly one request consumes this worker, including malformed requests.
// Terminating it interrupts a synchronous cold solve without retaining input.
self.addEventListener('message', ({ data }) => {
  let checked = false;
  try {
    assertRequest(data);
    checked = true;
    const result = runFlutedGlassJob(data);
    self.postMessage(result, [result.pixels.buffer]);
  } catch (error) {
    self.postMessage(failureReply(data, error, checked));
  } finally {
    self.close();
  }
}, { once: true });
