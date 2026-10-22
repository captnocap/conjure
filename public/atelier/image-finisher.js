import { WIDTH, HEIGHT, BYTES, PROTOCOL, INK_PROTOCOL, FLUTED_PROTOCOL, assertOpaqueRGBA, finishWeight,
  sameBytes, abortError } from './finish-contract.js';

const defaultSchedule = task => {
  const timer = setTimeout(task, 0);
  return () => clearTimeout(timer);
};

/**
 * A single-image, latest-request finish adapter. Never paints or touches p5.
 * Each accepted finish() snapshots bytes before returning. Its promise resolves
 * with fresh caller-owned pixels and a revision for a final isCurrent() guard.
 */
export function createImageFinisher({
  createWorker = operator => new Worker(new URL(operator === 'fluted-glass'
    ? './fluted-glass-worker.js' : operator === 'ink-completed-mix'
    ? './paint-boundary-ink-worker.js' : './finite-finish-worker.js', import.meta.url), { type: 'module' }),
  schedule = defaultSchedule,
  now = () => performance.now(),
  budgetMs = 8,
  timeoutMs = 30_000,
} = {}) {
  if (typeof createWorker !== 'function' || typeof schedule !== 'function' ||
      typeof now !== 'function' || !Number.isFinite(budgetMs) || budgetMs < 0 ||
      !Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new TypeError('Invalid finish scheduling options');
  let revision = 0, nextJobId = 0, current = null, cold = null, cache = null;
  let composition = null, disposed = false, workersStarted = 0;
  const retirements = new Set();

  function stopComposition() {
    if (!composition) return;
    composition.cancelTurn?.();
    composition = null;
  }
  function settle(request, error, result) {
    if (current !== request) return;
    stopComposition();
    current = null;
    request.signal?.removeEventListener('abort', request.onAbort);
    request.source = null;
    error ? request.reject(error) : request.resolve(result);
  }
  function stopCold(job = cold) {
    if (!job) return;
    if (cold === job) cold = null;
    clearTimeout(job.timer);
    if (job.worker) {
      job.worker.onmessage = job.worker.onerror = job.worker.onmessageerror = null;
      try {
        const termination = job.worker.terminate();
        if (termination?.then) {
          const drained = Promise.resolve(termination).catch(() => {});
          retirements.add(drained);
          drained.then(() => retirements.delete(drained));
        }
      } catch { /* Already gone; references still released. */ }
    }
    job.worker = null;
    job.source = null;
  }
  function failJob(job, error) {
    if (cold !== job) return; // Retired workers cannot affect a newer request.
    stopCold(job);
    cache = null;
    if (current) settle(current, error);
  }
  function scheduleComposition(request, optical) {
    const job = { request, source: request.source, optical,
      output: new Uint8ClampedArray(BYTES), offset: 0, cancelTurn: null };
    composition = job;
    const step = () => {
      if (composition !== job || current !== request) return;
      job.cancelTurn = null;
      try {
        const started = now();
        do {
          const end = Math.min(BYTES, job.offset + 32768);
          if (!optical || request.weight === 0) {
            job.output.set(job.source.subarray(job.offset, end), job.offset);
          } else if (request.weight === 100) {
            job.output.set(optical.subarray(job.offset, end), job.offset);
          } else {
            // Same operation order and Uint8ClampedArray tie-to-even conversion
            // as one opaque Normal layer in the existing compositor.
            const alpha = ((request.weight / 100) * 255) / 255;
            for (let i = job.offset; i < end; i += 4) {
              for (let c = 0; c < 3; c++) {
                let value = job.source[i + c];
                value += (optical[i + c] - value) * alpha;
                job.output[i + c] = value;
              }
              job.output[i + 3] = 255;
            }
          }
          job.offset = end;
        } while (job.offset < BYTES && now() - started < budgetMs);
        if (job.offset === BYTES) {
          settle(request, null, { revision: request.revision, pixels: job.output });
        } else job.cancelTurn = schedule(step);
      } catch (error) { settle(request, error); }
    };
    try { job.cancelTurn = schedule(step); }
    catch (error) { settle(request, error); }
  }
  function startCold(request) {
    const job = { id: ++nextJobId, operator: request.operator,
      protocol: request.operator === 'fluted-glass' ? FLUTED_PROTOCOL : request.operator === 'ink-completed-mix' ? INK_PROTOCOL : PROTOCOL,
      source: request.source, worker: null, timer: null };
    cold = job;
    const launch = () => {
    if (cold !== job) return;
    try {
      const worker = createWorker(job.operator);
      if (!worker || typeof worker !== 'object' || typeof worker.postMessage !== 'function' ||
          typeof worker.terminate !== 'function') throw new TypeError('Invalid finish worker');
      job.worker = worker;
      workersStarted++;
      job.worker.onmessage = ({ data }) => {
        if (cold !== job) return;
        try {
          if (!data || data.protocol !== job.protocol || data.jobId !== job.id)
            throw new Error('Wrong or malformed finish worker reply');
          if (data.type === 'error')
            throw new Error(typeof data.message === 'string' ? data.message :
              job.operator === 'fluted-glass' ? 'Fluted glass finish failed' : job.operator === 'ink-completed-mix' ? 'Ink finish failed' : 'Finite finish failed');
          if (data.type !== 'result' || data.width !== WIDTH || data.height !== HEIGHT)
            throw new Error('Invalid finish worker result shape');
          assertOpaqueRGBA(data.pixels);
          cache = { operator: job.operator, source: job.source, optical: new Uint8ClampedArray(data.pixels) };
          stopCold(job);
          if (current) scheduleComposition(current, cache.optical);
        } catch (error) { failJob(job, error); }
      };
      job.worker.onerror = event => {
        event?.preventDefault?.();
        failJob(job, new Error(event?.message ||
          (job.operator === 'fluted-glass' ? 'Fluted glass finish worker failed' : job.operator === 'ink-completed-mix' ? 'Ink finish worker failed' : 'Finite finish worker failed')));
      };
      job.worker.onmessageerror = () => failJob(job, new Error('Unreadable finish worker message'));
      job.timer = setTimeout(() => failJob(job, new Error(job.operator === 'fluted-glass'
        ? 'Fluted glass finish worker timed out' : job.operator === 'ink-completed-mix'
        ? 'Ink finish worker timed out' : 'Finite finish worker timed out')), timeoutMs);
      // The only transferred bytes are an adapter-owned throwaway copy.
      const transfer = new Uint8ClampedArray(job.source);
      job.worker.postMessage({ protocol: job.protocol, type: 'render', jobId: job.id,
        width: WIDTH, height: HEIGHT, pixels: transfer }, [transfer.buffer]);
    } catch (error) { failJob(job, error); }
    };
    // Node termination is asynchronous. Drain an old worker before creating a
    // replacement; rapid revisions can supersede this queued job at no cost.
    if (retirements.size) Promise.all([...retirements]).then(launch);
    else launch();
  }

  function finish(pixels, finish = null, { signal } = {}) {
    let weight, source, operator;
    try {
      if (disposed) throw new Error('Image finisher is disposed');
      assertOpaqueRGBA(pixels);
      weight = finishWeight(finish);
      operator = finish?.id ?? null;
      if (signal && (typeof signal.addEventListener !== 'function' ||
          typeof signal.removeEventListener !== 'function')) throw new TypeError('Invalid abort signal');
      if (signal?.aborted) throw signal.reason || abortError();
      // A solve depends on both operator identity and exact completed-image bytes.
      // Bypasses may retain a warm pair, preserving the existing None/zero behavior.
      source = (!weight || cold?.operator === operator) && sameBytes(pixels, cold?.source) ? cold.source :
        (!weight || cache?.operator === operator) && sameBytes(pixels, cache?.source) ? cache.source : new Uint8ClampedArray(pixels);
    } catch (error) { return Promise.reject(error); }
    const requestRevision = ++revision;
    if (current) settle(current, abortError('Finish superseded by a newer revision'));
    if (cold && (weight === 0 || cold.operator !== operator || cold.source !== source)) stopCold();
    if (cache && (cache.source !== source || (weight > 0 && cache.operator !== operator))) cache = null;
    return new Promise((resolve, reject) => {
      const request = { source, operator, weight, revision: requestRevision, signal, resolve, reject, onAbort: null };
      current = request;
      request.onAbort = () => {
        if (current !== request) return;
        ++revision;
        stopCold();
        cache = null;
        settle(request, signal.reason || abortError());
      };
      signal?.addEventListener('abort', request.onAbort, { once: true });
      if (signal?.aborted) { request.onAbort(); return; }
      if (weight === 0) scheduleComposition(request, null);
      else if (cache) scheduleComposition(request, cache.optical);
      else if (!cold) startCold(request);
      // Otherwise this request exclusively takes over the same in-flight solve.
    });
  }
  function cancel(reason = abortError()) {
    ++revision;
    stopCold();
    cache = null;
    if (current) settle(current, reason);
    return Promise.all([...retirements]).then(() => undefined);
  }
  return {
    finish,
    isCurrent(candidate) { return !disposed && candidate === revision; },
    cancel,
    dispose() {
      if (!disposed) { disposed = true; return cancel(abortError('Image finisher disposed')); }
      return Promise.all([...retirements]).then(() => undefined);
    },
    inspect() { return Object.freeze({ revision, disposed, pending: !!current,
      workersStarted, activeWorkers: cold?.worker ? 1 : 0, retiringWorkers: retirements.size,
      cachePairs: cache ? 1 : 0, cacheBytes: cache ? BYTES * 2 : 0,
      coldInputBytes: cold ? BYTES : 0, compositionBytes: composition ? BYTES : 0,
      scheduledTurns: composition?.cancelTurn ? 1 : 0,
      abortListeners: current?.signal ? 1 : 0 }); },
  };
}
