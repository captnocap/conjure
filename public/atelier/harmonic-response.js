// Restored from the independently tested prototype after the executor restart.
// Solve the exact discrete harmonic equation used by membraneResponse:
// (c2 * L - 4 sin(omega/2)^2 + i * damping * sin(omega)) z = forcing.
// COCG uses bilinear (not conjugated) inner products because this matrix is
// complex symmetric. Callers must check converged; finite precision can break
// the recurrence. The returned true residual is recomputed from A*z-b.
export function harmonicResponse(
  graph,
  period,
  {
    damping = 0.003,
    c2 = 0.2025,
    forceScale = 0.025,
    forcing = graph.forcing,
    tolerance = 1e-7,
    maxIter = 4000,
  } = {},
) {
  if (
    !Number.isInteger(period) ||
    period < 3 ||
    !Number.isFinite(damping) ||
    damping <= 0 ||
    !Number.isFinite(c2) ||
    c2 <= 0 ||
    c2 >= 0.5 ||
    !Number.isFinite(forceScale) ||
    !Number.isFinite(tolerance) ||
    tolerance <= 0 ||
    !Number.isInteger(maxIter) ||
    maxIter < 1 ||
    forcing.length !== graph.count ||
    forcing.some((v) => !Number.isFinite(v))
  ) {
    throw Error("Invalid harmonic settings");
  }

  const n = graph.count,
    F = Float64Array;
  const B = Float64Array.from(forcing, (f) => forceScale * f);
  const xr = new F(n),
    xi = new F(n),
    rr = F.from(B),
    ri = new F(n);
  const pr = F.from(B),
    pi = new F(n),
    vr = new F(n),
    vi = new F(n);
  const om = (2 * Math.PI) / period;
  const diag = 4 * c2 - 4 * Math.sin(om / 2) ** 2;
  const loss = damping * Math.sin(om);
  const bn = Math.sqrt(B.reduce((s, b) => s + b * b, 0));

  function A(ar, ai, br, bi) {
    for (let i = 0; i < n; i++) {
      let r = diag * ar[i] - loss * ai[i];
      let im = diag * ai[i] + loss * ar[i];
      for (let k = 0; k < 4; k++) {
        const j = graph.adj[i * 4 + k];
        if (j >= 0) {
          r -= c2 * ar[j];
          im -= c2 * ai[j];
        }
      }
      br[i] = r;
      bi[i] = im;
    }
  }

  function div(ar, ai, br, bi) {
    const d = br * br + bi * bi;
    return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
  }

  if (bn === 0) {
    return {
      energy: new F(n),
      real: xr,
      imaginary: xi,
      period,
      steps: 0,
      iterations: 0,
      residual: 0,
      c2,
      damping,
      converged: true,
    };
  }

  let rhor = bn * bn,
    rhoi = 0,
    iterations = 0,
    residual = 1;
  for (let it = 0; it < maxIter; it++) {
    A(pr, pi, vr, vi);
    let dr = 0,
      di = 0;
    for (let i = 0; i < n; i++) {
      dr += pr[i] * vr[i] - pi[i] * vi[i];
      di += pr[i] * vi[i] + pi[i] * vr[i];
    }
    if (!Number.isFinite(dr + di) || (dr === 0 && di === 0)) break;
    const [ar, ai] = div(rhor, rhoi, dr, di);
    if (!Number.isFinite(ar + ai)) break;
    let nr = 0,
      ni = 0,
      rn = 0;
    for (let i = 0; i < n; i++) {
      xr[i] += ar * pr[i] - ai * pi[i];
      xi[i] += ar * pi[i] + ai * pr[i];
      rr[i] -= ar * vr[i] - ai * vi[i];
      ri[i] -= ar * vi[i] + ai * vr[i];
      nr += rr[i] * rr[i] - ri[i] * ri[i];
      ni += 2 * rr[i] * ri[i];
      rn += rr[i] * rr[i] + ri[i] * ri[i];
    }
    residual = Math.sqrt(rn) / bn;
    iterations = it + 1;
    if (!Number.isFinite(residual) || residual < tolerance) break;
    if (rhor === 0 && rhoi === 0) break;
    const [br, bi] = div(nr, ni, rhor, rhoi);
    if (!Number.isFinite(br + bi)) break;
    for (let i = 0; i < n; i++) {
      const old = pr[i];
      pr[i] = rr[i] + br * old - bi * pi[i];
      pi[i] = ri[i] + br * pi[i] + bi * old;
    }
    rhor = nr;
    rhoi = ni;
  }

  A(xr, xi, vr, vi);
  let err = 0;
  for (let i = 0; i < n; i++) err += (vr[i] - B[i]) ** 2 + vi[i] ** 2;
  residual = Math.sqrt(err) / bn;
  const energy = new F(n);
  for (let i = 0; i < n; i++) {
    energy[i] = 0.5 * (xr[i] * xr[i] + xi[i] * xi[i]);
    xi[i] = -xi[i];
  }
  return {
    energy,
    real: xr,
    imaginary: xi,
    period,
    steps: iterations,
    iterations,
    residual,
    c2,
    damping,
    converged: Number.isFinite(residual) && residual <= tolerance,
  };
}

// Independent block solves avoid making every component iterate until the
// hardest block converges. No coupling or cross-component normalization occurs.
export function harmonicResponseByComponent(graph, period, options = {}) {
  const n = graph.count;
  const real = new Float64Array(n),
    imaginary = new Float64Array(n),
    energy = new Float64Array(n);
  const mapping = new Int32Array(n),
    forcing = options.forcing || graph.forcing;
  const componentReports = [];
  let error = 0,
    source = 0,
    iterations = 0,
    maxResidual = 0,
    converged = true;
  for (const members of graph.components) {
    const count = members.length;
    const adj = new Int32Array(count * 4).fill(-1),
      localForcing = new Float64Array(count);
    for (let k = 0; k < count; k++) mapping[members[k]] = k;
    for (let k = 0; k < count; k++) {
      const i = members[k];
      localForcing[k] = forcing[i];
      for (let e = 0; e < 4; e++) {
        const j = graph.adj[i * 4 + e];
        if (j >= 0) adj[k * 4 + e] = mapping[j];
      }
    }
    const result = harmonicResponse(
      { count, adj, forcing: localForcing },
      period,
      { ...options, forcing: localForcing },
    );
    let localSource = 0;
    for (let k = 0; k < count; k++) {
      const i = members[k];
      real[i] = result.real[k];
      imaginary[i] = result.imaginary[k];
      energy[i] = result.energy[k];
      localSource += ((options.forceScale ?? 0.025) * localForcing[k]) ** 2;
    }
    error += result.residual ** 2 * localSource;
    source += localSource;
    iterations += result.iterations;
    maxResidual = Math.max(maxResidual, result.residual);
    converged &&= result.converged;
    componentReports.push({
      count,
      iterations: result.iterations,
      residual: result.residual,
      converged: result.converged,
    });
  }
  return {
    energy,
    real,
    imaginary,
    period,
    steps: iterations,
    iterations,
    residual: source ? Math.sqrt(error / source) : Math.sqrt(error),
    maxResidual,
    c2: options.c2 ?? 0.2025,
    damping: options.damping ?? 0.003,
    converged,
    componentReports,
  };
}
