import { runFiniteLensJob, failureReply } from './finish-worker-job.js';

// One cold solve per worker. Termination interrupts the synchronous frozen core.
self.onmessage = ({ data }) => {
  try {
    const result = runFiniteLensJob(data);
    self.postMessage(result, [result.pixels.buffer]);
  } catch (error) {
    self.postMessage(failureReply(data, error));
  } finally {
    self.onmessage = null;
    self.close();
  }
};
