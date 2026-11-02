// Influence viewer: which words of an idea move which decisions. Reads the dataset made by
// `node dev/influence.mjs` and fits, per decision, a ridge regression of every answer's
// probability on the words present, so co-occurring words are held apart and rare ones shrink.

const DATA_URL = '/.data/influence/data.json';

const GROUPS = [
  ['Direction & style', ['direction.house', 'direction.styleSpecified', 'direction.medium', 'direction.look']],
  ['Mood', ['direction.wear', 'direction.warmth', 'direction.energy', 'direction.density', 'direction.daylight', 'direction.cheer']],
  ['Framing', ['direction.elevation', 'direction.distance', 'direction.turn', 'direction.anchor', 'direction.level']],
  ['Presentation', ['direction.presentation', 'direction.arc', 'direction.blend', 'direction.boil', 'direction.loopCamera', 'direction.accent', 'direction.accentEdge']],
  ['Setting & cast', ['built.scale', 'direction.world', 'built.world', 'built.cast']],
  ['Vector design', ['design.motif', 'design.companion', 'design.palette', 'design.placement', 'design.opacity', 'design.density', 'design.scale', 'design.angle', 'design.blend', 'design.annotation', 'design.traceSheet', 'design.traceStyle', 'design.traceSize', 'design.traceSpot']],
];
const SHORT = {
  'direction.house': 'direction', 'direction.styleSpecified': 'style named?', 'direction.medium': 'medium', 'direction.look': 'look',
  'direction.world': 'setting (asked, top 10)', 'direction.loopCamera': 'loop camera', 'direction.blend': 'portrait blend', 'direction.boil': 'boil',
  'direction.accentEdge': 'accent edge', 'built.scale': 'scale', 'built.world': 'setting (built)', 'built.cast': 'cast',
  'design.motif': 'svg motif', 'design.companion': 'svg companion', 'design.palette': 'svg inks', 'design.placement': 'svg placement',
  'design.opacity': 'svg opacity', 'design.density': 'svg density', 'design.scale': 'svg scale', 'design.angle': 'svg angle',
  'design.blend': 'svg blend', 'design.annotation': 'drafting sheet', 'design.traceSheet': 'trace sheet', 'design.traceStyle': 'trace style',
  'design.traceSize': 'trace size', 'design.traceSpot': 'trace spot',
};
const short = (key) => SHORT[key] ?? key.split('.').pop();
/** What a decision's saved numbers can and cannot say, shown wherever it is read. */
const CAVEATS = {
  'direction.world': 'Only the ten likeliest settings of hundreds are saved, without the rest of the probability; an unlisted setting reads as 0 although it was never rejected. Read "setting (built)" for what was made.',
  'direction.look': 'A medium with a single look (realism has only photographic) gets it at 100% without asking the model, so a jump here is often the medium switching branch: read medium first.',
  'built.cast': 'Several things are cast at once, so these are yes/no per thing, not one distribution; a thing left out may still have been a close near miss.',
};
const caveat = (key, f) => {
  const base = CAVEATS[key] ?? '';
  if (key !== 'direction.world' || !f) return base;
  const kept = f.rows.reduce((sum, u) => sum + Object.values(u.outcomes[key]).reduce((a, b) => a + b, 0), 0) / f.n;
  return `${base} On average ${Math.round(kept * 100)}% of the probability was saved for these ideas.`;
};
const groupOf = (key) => GROUPS.find(([, keys]) => keys.includes(key))?.[0] ?? 'Other';
const FUNCTION_WORDS = new Set('a an the of in on at to for from by with into onto over under through after before about as and or but if is are was were be been it its this that these those there their they them he she his her him i me my we our you your who whom which what when where while one no not only just still all every each some any than then so too very out up down off'.split(' '));
const MEAN = '(mean)';
/** Decisions with more answers than this (looks, settings, cast) are read by their strongest single push. */
const MANY = 12;
const DECOY_SUPPORT = [3, 5, 8, 13, 21, 40];
const DECOYS_EACH = 8;
/** A small deterministic generator, seeded by the decision's key so the floor holds still between renders. */
function seeded(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const tidy = (label) => label.replace(/^(directions|worlds|things|looks)\//, '');
const pct = (p) => `${Math.round(p * 100)}%`;
const signed = (e) => `${e >= 0 ? '+' : '−'}${Math.abs(Math.round(e * 100))}`;
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const state = { family: 'jev', since: '', min: 3, measure: 'ridge', lambda: 3, functions: true, tab: 'map', question: 'direction.house', prompt: null, filter: '' };
let data; let model;

const $ = (id) => document.getElementById(id);
const view = $('view'); const detail = $('detail'); const tip = $('tip');

/** Solves (SPD A, p×p) · X = B (p×k) by Cholesky; A and B are row-major. */
function solve(A, p, B, k) {
  const L = new Float64Array(p * p);
  for (let i = 0; i < p; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i * p + j];
      for (let m = 0; m < j; m++) sum -= L[i * p + m] * L[j * p + m];
      L[i * p + j] = i === j ? Math.sqrt(Math.max(sum, 1e-12)) : sum / L[j * p + j];
    }
  }
  const X = new Float64Array(p * k); const z = new Float64Array(p);
  for (let c = 0; c < k; c++) {
    for (let i = 0; i < p; i++) { let s = B[i * k + c]; for (let m = 0; m < i; m++) s -= L[i * p + m] * z[m]; z[i] = s / L[i * p + i]; }
    for (let i = p - 1; i >= 0; i--) { let s = z[i]; for (let m = i + 1; m < p; m++) s -= L[m * p + i] * X[m * k + c]; X[i * k + c] = s / L[i * p + i]; }
  }
  return X;
}

/** One fit per decision over the ideas the controls select. */
function fit() {
  const units = data.units.filter((u) => (state.family === u.family || u.versions.includes(state.family)) && (!state.since || u.days.some((d) => d >= state.since)));
  const ordered = [...GROUPS.flatMap(([, keys]) => keys), ...Object.keys(data.questions).filter((k) => !GROUPS.some(([, keys]) => keys.includes(k)))];
  const fits = new Map();
  const seen = new Map();
  for (const u of units) for (const w of new Set(u.words)) seen.set(w, (seen.get(w) ?? 0) + 1);
  for (const key of ordered) {
    const q = data.questions[key];
    if (!q) continue;
    const rows = units.filter((u) => u.outcomes[key]);
    if (rows.length < 20) continue;
    let labels;
    if (q.kind === 'built') {
      const counts = new Map();
      for (const u of rows) for (const label of Object.keys(u.outcomes[key])) counts.set(label, (counts.get(label) ?? 0) + 1);
      labels = [...counts].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).map(([label]) => label);
    } else {
      labels = q.options.filter((label) => rows.some((u) => (u.outcomes[key][label] ?? 0) > 0));
    }
    if (!labels.length) continue;
    const spread = labels.length; // answers that share the probability; the score mean rides after them
    if (q.kind === 'score') labels = [...labels, MEAN];
    const n = rows.length; const k = labels.length;
    const Y = new Float64Array(n * k);
    rows.forEach((u, i) => labels.forEach((label, o) => { Y[i * k + o] = u.outcomes[key][label] ?? 0; }));
    const counts = new Map();
    for (const u of rows) for (const w of new Set(u.words)) counts.set(w, (counts.get(w) ?? 0) + 1);
    const words = [...counts].filter(([, c]) => c >= state.min).map(([w]) => w).sort();
    const p = words.length;
    const index = new Map(words.map((w, j) => [w, j]));
    // Held apart beside the words, barely penalised: the day an idea was typed (the questions, the
    // catalogue and the directions changed day by day) and whether it is a long brief rather than a phrase.
    const days = new Map();
    for (const u of rows) days.set(u.days[0], (days.get(u.days[0]) ?? 0) + 1);
    const usual = [...days].sort((a, b) => b[1] - a[1])[0][0];
    const covariates = [...days.keys()].filter((d) => d !== usual).map((d) => ({ name: d, has: (u) => u.days[0] === d }));
    covariates.push({ name: 'long brief', has: (u) => u.words.length > 12 });
    // Decoys: meaningless words tagged on random ideas, fitted like the real ones. What they appear
    // to move is the noise floor a real word seen in as many ideas has to clear.
    const random = seeded(key);
    const decoys = DECOY_SUPPORT.filter((m) => m < n / 2).flatMap((m) => Array.from({ length: DECOYS_EACH }, () => {
      const chosen = new Set(); while (chosen.size < m) chosen.add(Math.floor(random() * n)); return { m, chosen };
    }));
    const D = decoys.length;
    const P = p + D + covariates.length;
    const X = new Float64Array(n * P);
    rows.forEach((u, i) => {
      for (const w of new Set(u.words)) { const j = index.get(w); if (j !== undefined) X[i * P + j] = 1; }
      decoys.forEach((d, m) => { if (d.chosen.has(i)) X[i * P + p + m] = 1; });
      covariates.forEach((c, m) => { if (c.has(u)) X[i * P + p + D + m] = 1; });
    });
    const xm = new Float64Array(P); const ym = new Float64Array(k);
    for (let i = 0; i < n; i++) { for (let j = 0; j < P; j++) xm[j] += X[i * P + j] / n; for (let o = 0; o < k; o++) ym[o] += Y[i * k + o] / n; }
    const A = new Float64Array(P * P); const B = new Float64Array(P * k);
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < P; a++) {
        const xa = X[i * P + a] - xm[a];
        if (xa === 0) continue;
        for (let b = 0; b <= a; b++) A[a * P + b] += xa * (X[i * P + b] - xm[b]);
        for (let o = 0; o < k; o++) B[a * k + o] += xa * (Y[i * k + o] - ym[o]);
      }
    }
    for (let a = 0; a < P; a++) { for (let b = 0; b < a; b++) A[b * P + a] = A[a * P + b]; A[a * P + a] += a < p + D ? state.lambda : 0.3; }
    const beta = P ? solve(A, P, B, k) : new Float64Array(0);
    const withM = new Float64Array((p + D) * k); const withoutM = new Float64Array((p + D) * k); const support = new Int32Array(p + D);
    for (let j = 0; j < p + D; j++) {
      let inside = 0;
      for (let i = 0; i < n; i++) {
        const has = X[i * P + j] === 1; if (has) inside++;
        for (let o = 0; o < k; o++) (has ? withM : withoutM)[j * k + o] += Y[i * k + o];
      }
      support[j] = inside;
      for (let o = 0; o < k; o++) { withM[j * k + o] /= inside || 1; withoutM[j * k + o] /= (n - inside) || 1; }
    }
    const fit = { key, q, rows, labels, spread, n, k, p, D, Y, ym, xm, words, index, decoys, covariates, beta, withM, withoutM, support };
    fits.set(key, fit);
  }
  const vocab = [...seen].filter(([, c]) => c >= state.min).map(([w, c]) => ({ word: w, count: c }));
  model = { units, fits, vocab };
}

const effect = (f, j, o) => (state.measure === 'ridge' ? f.beta[j * f.k + o] : f.withM[j * f.k + o] - f.withoutM[j * f.k + o]);
/**
 * How much of the answer's probability the word shifts: half the summed absolute changes over the
 * answers. Setting and cast have hundreds of answers whose small noisy shifts would add up, so there
 * it is the strongest push toward or away from any one component.
 */
function pull(f, j) {
  let sum = 0; let most = 0;
  for (let o = 0; o < f.spread; o++) { const e = Math.abs(effect(f, j, o)); sum += e; most = Math.max(most, e); }
  return f.spread > MANY ? most : sum / 2;
}
/** What a decoy seen in as many ideas appears to move: the mean decoy pull, interpolated over support. */
function floor(f, m) {
  const levels = [...new Set(f.decoys.map((d) => d.m))];
  if (!levels.length) return 0;
  f.floors ??= new Map();
  const at = (level) => {
    if (!f.floors.has(level)) { const js = f.decoys.map((d, i) => (d.m === level ? f.p + i : -1)).filter((j) => j >= 0); f.floors.set(level, js.reduce((s, j) => s + pull(f, j), 0) / js.length); }
    return f.floors.get(level);
  };
  if (m <= levels[0]) return at(levels[0]);
  if (m >= levels.at(-1)) return at(levels.at(-1));
  const hi = levels.findIndex((l) => l >= m); const a = levels[hi - 1]; const b = levels[hi];
  const t = (Math.log(m) - Math.log(a)) / (Math.log(b) - Math.log(a));
  return at(a) * (1 - t) + at(b) * t;
}
/** The pull beyond the noise floor: what the word moves that a meaningless word would not. */
const excess = (f, j) => Math.max(0, pull(f, j) - floor(f, f.support[j]));
const seqColor = (t) => `color-mix(in oklab, var(--seq) ${Math.round(Math.min(1, t) * 100)}%, var(--mid))`;
const divColor = (e, max) => `color-mix(in oklab, ${e >= 0 ? 'var(--pos)' : 'var(--neg)'} ${Math.round(Math.min(1, Math.abs(e) / max) * 100)}%, var(--mid))`;
const quantile = (values, q) => { const s = values.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
const visibleWords = () => model.vocab.filter((v) => state.functions || !FUNCTION_WORDS.has(v.word));

/** The word's biggest pushes across every decision, signed toward an answer. */
function pushes(word) {
  const out = [];
  for (const f of model.fits.values()) {
    const j = f.index.get(word);
    if (j === undefined) continue;
    for (let o = 0; o < f.k; o++) out.push({ f, o, label: f.labels[o], e: effect(f, j, o), j });
  }
  return out.sort((a, b) => Math.abs(b.e) - Math.abs(a.e));
}

function showTip(event, html) { tip.innerHTML = html; tip.style.display = 'block'; const x = Math.min(event.clientX + 14, innerWidth - tip.offsetWidth - 8); const y = Math.min(event.clientY + 14, innerHeight - tip.offsetHeight - 8); tip.style.left = `${x}px`; tip.style.top = `${y}px`; }
const hideTip = () => { tip.style.display = 'none'; };
const towardAway = (f, j) => {
  const order = [...Array(f.spread).keys()].map((o) => [o, effect(f, j, o)]).sort((a, b) => b[1] - a[1]);
  const up = order[0]; const down = order[order.length - 1];
  return `toward <b>${escape(tidy(f.labels[up[0]]))}</b> ${signed(up[1])}${down && down[1] < 0 ? `, away from <b>${escape(tidy(f.labels[down[0]]))}</b> ${signed(down[1])}` : ''}`;
};

// ── Words × decisions ─────────────────────────────────────────────────────────
function renderMap() {
  const fits = [...model.fits.values()];
  const words = visibleWords();
  const pulls = new Map(words.map(({ word }) => [word, fits.map((f) => { const j = f.index.get(word); return j === undefined ? NaN : excess(f, j); })]));
  const total = (word) => pulls.get(word).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  words.sort((a, b) => total(b.word) - total(a.word));
  const max = Math.max(0.05, quantile([...pulls.values()].flat(), 0.98));
  const groups = [];
  for (const f of fits) { const g = groupOf(f.key); if (groups.at(-1)?.[0] !== g) groups.push([g, 0]); groups.at(-1)[1]++; }
  let html = `<p class="note">Each cell: how much of a decision's probability the word moves (half the summed shifts over its answers; for look, setting and cast, the strongest push on any one of them), less what a meaningless decoy word tagged on as many random ideas appears to move. Pale means indistinguishable from noise. Rows are sorted by total pull. Hatched: the word never met that decision often enough. Click a column name for one decision's answers, a word for its profile.</p>
    <div class="legend"><span>0</span><span class="ramp" style="background:linear-gradient(90deg, ${seqColor(0)}, ${seqColor(1)})"></span><span>${pct(max)} of the probability or more</span></div>
    <table class="heat"><thead><tr><th></th>${groups.map(([g, n]) => `<th class="group" colspan="${n}">${escape(g)}</th>`).join('')}</tr>
    <tr><th></th>${fits.map((f) => `<th><span data-question="${f.key}" title="${escape(f.q.ask)}">${escape(short(f.key))}</span></th>`).join('')}</tr></thead><tbody>`;
  for (const { word, count } of words) {
    html += `<tr><th data-word="${escape(word)}" class="${FUNCTION_WORDS.has(word) ? 'function' : ''}">${escape(word)}<small>${count}</small></th>`;
    pulls.get(word).forEach((v, c) => {
      html += Number.isFinite(v) ? `<td data-word="${escape(word)}" data-key="${fits[c].key}" style="background:${seqColor(v / max)}"></td>` : '<td class="none"></td>';
    });
    html += '</tr>';
  }
  view.innerHTML = `${html}</tbody></table>`;
  view.querySelectorAll('td[data-key]').forEach((td) => {
    td.addEventListener('mousemove', (event) => {
      const f = model.fits.get(td.dataset.key); const j = f.index.get(td.dataset.word);
      showTip(event, `<b>${escape(td.dataset.word)}</b> → ${escape(short(f.key))}: moves ${pct(pull(f, j))}, a random word in as many ideas ${pct(floor(f, f.support[j]))}<br>${towardAway(f, j)}<br>${f.support[j]} of ${f.n} ideas`);
    });
    td.addEventListener('mouseleave', hideTip);
    td.addEventListener('click', () => { view.querySelectorAll('td.on').forEach((x) => x.classList.remove('on')); td.classList.add('on'); showCell(td.dataset.word, td.dataset.key); });
  });
  view.querySelectorAll('[data-question]').forEach((el) => el.addEventListener('click', () => { state.question = el.dataset.question; setTab('question'); }));
  view.querySelectorAll('th[data-word]').forEach((el) => el.addEventListener('click', () => showWord(el.dataset.word)));
}

// ── One decision ──────────────────────────────────────────────────────────────
function renderQuestion() {
  if (!model.fits.has(state.question)) state.question = model.fits.keys().next().value;
  const f = model.fits.get(state.question);
  const options = [...model.fits.values()].map((x) => `<option value="${x.key}" ${x.key === f.key ? 'selected' : ''}>${escape(groupOf(x.key))} · ${escape(short(x.key))}</option>`).join('');
  const columns = f.q.kind === 'built' ? [...Array(Math.min(f.spread, 40)).keys()] : [...Array(f.k).keys()];
  const words = f.words.filter((w) => state.functions || !FUNCTION_WORDS.has(w)).map((w) => f.index.get(w)).sort((a, b) => excess(f, b) - excess(f, a));
  const max = Math.max(0.05, quantile(words.flatMap((j) => columns.map((o) => Math.abs(effect(f, j, o)))), 0.98));
  let html = `<div class="prompt-pick"><select id="question-pick">${options}</select><span class="hint">${f.n} ideas · ${escape(f.q.ask)}</span></div>${caveat(f.key, f) ? `<p class="note">${escape(caveat(f.key, f))}</p>` : ''}
    <div class="legend"><span>away ${signed(-max)}</span><span class="ramp" style="background:linear-gradient(90deg, ${divColor(-1, 1)}, var(--mid), ${divColor(1, 1)})"></span><span>toward ${signed(max)} points of probability</span></div>
    <table class="heat"><thead><tr><th></th>${columns.map((o) => `<th><span title="${escape(f.labels[o])}">${escape(tidy(f.labels[o]).slice(0, 34))} · ${f.labels[o] === MEAN ? 'avg' : pct(f.ym[o])}</span></th>`).join('')}</tr></thead><tbody>`;
  for (const j of words) {
    const word = f.words[j];
    html += `<tr><th data-word="${escape(word)}" class="${FUNCTION_WORDS.has(word) ? 'function' : ''}">${escape(word)}<small>${f.support[j]}</small></th>`;
    for (const o of columns) { const e = effect(f, j, o); html += `<td data-j="${j}" data-o="${o}" style="background:${divColor(e, max)}"></td>`; }
    html += '</tr>';
  }
  view.innerHTML = `${html}</tbody></table>`;
  $('question-pick').addEventListener('change', (event) => { state.question = event.target.value; renderQuestion(); });
  view.querySelectorAll('td[data-j]').forEach((td) => {
    const j = Number(td.dataset.j); const o = Number(td.dataset.o);
    td.addEventListener('mousemove', (event) => showTip(event, `<b>${escape(f.words[j])}</b> → ${escape(tidy(f.labels[o]))}: ${signed(effect(f, j, o))}<br>with the word ${pct(f.withM[j * f.k + o])}, without ${pct(f.withoutM[j * f.k + o])} · ${f.support[j]} ideas`));
    td.addEventListener('mouseleave', hideTip);
    td.addEventListener('click', () => showCell(f.words[j], f.key));
  });
  view.querySelectorAll('th[data-word]').forEach((el) => el.addEventListener('click', () => showWord(el.dataset.word)));
}

// ── One prompt ────────────────────────────────────────────────────────────────
function renderPrompt() {
  const units = model.units.filter((u) => u.idea.toLowerCase().includes(state.filter.toLowerCase()));
  const unit = model.units.find((u) => u.idea === state.prompt) ?? units[0];
  let html = `<div class="prompt-pick"><input type="search" id="prompt-filter" placeholder="Find an idea" value="${escape(state.filter)}" /><span class="hint">${units.length} ideas</span></div>
    <div class="prompt-list">${units.map((u) => `<div data-idea="${escape(u.idea)}" class="${u === unit ? 'on' : ''}">${escape(u.idea)}<small>${u.days[0]} · ${u.records} saved</small></div>`).join('')}</div>`;
  if (unit) {
    const fits = [...model.fits.values()].filter((f) => unit.outcomes[f.key]);
    const words = unit.words;
    const weight = words.map((w) => fits.reduce((s, f) => { const j = f.index.get(w); return s + (j === undefined ? 0 : excess(f, j)); }, 0));
    const wmax = Math.max(...weight, 0.01);
    html += `<p class="note">The idea's words shaded by their total pull over every decision, beyond the decoy noise floor. Below, each decision: the answer it got, and each word's push toward (red) or away from (blue) that answer. "Words predict" is the typical probability plus the words' pushes; where it falls short of what was got, something the words here don't carry (a rare word, the combination, the model's own leaning) did the work.</p>
      <div class="sentence">${words.map((w, i) => weight[i] ? `<span style="background:${seqColor(weight[i] / wmax)}" title="total pull ${weight[i].toFixed(2)}">${escape(w)}</span>` : `<span class="rare" title="seen in fewer than ${state.min} ideas">${escape(w)}</span>`).join('')}</div>`;
    const rows = fits.map((f) => {
      const values = f.labels.slice(0, f.spread).map((label) => unit.outcomes[f.key][label] ?? 0);
      const o = values.indexOf(Math.max(...values));
      const effects = words.map((w) => { const j = f.index.get(w); return j === undefined ? null : effect(f, j, o); });
      // The fitted line at this idea: the average plus each estimated word's push, present or absent.
      const present = new Set(words);
      let predicted = f.ym[o];
      for (const [w, j] of f.index) predicted += f.beta[j * f.k + o] * ((present.has(w) ? 1 : 0) - f.xm[j]);
      const at = f.rows.indexOf(unit);
      f.decoys.forEach((d, m) => { predicted += f.beta[(f.p + m) * f.k + o] * ((d.chosen.has(at) ? 1 : 0) - f.xm[f.p + m]); });
      f.covariates.forEach((c, m) => { predicted += f.beta[(f.p + f.D + m) * f.k + o] * ((c.has(unit) ? 1 : 0) - f.xm[f.p + f.D + m]); });
      return { f, o, got: values[o], effects, predicted };
    });
    const max = Math.max(0.05, quantile(rows.flatMap((r) => r.effects.filter((e) => e !== null).map(Math.abs)), 0.95));
    html += `<table class="heat"><thead><tr><th></th><th><span>answer got</span></th>${words.map((w) => `<th><span>${escape(w)}</span></th>`).join('')}<td class="gap"></td><th><span>got</span></th><th><span>typical</span></th>${state.measure === 'ridge' ? '<th><span>words predict</span></th>' : ''}</tr></thead><tbody>`;
    for (const r of rows) {
      html += `<tr><th data-question="${r.f.key}">${escape(short(r.f.key))}</th><td class="text">${escape(tidy(r.f.labels[r.o]).slice(0, 36))}</td>`;
      r.effects.forEach((e, i) => { html += e === null ? '<td class="none"></td>' : `<td data-word="${escape(words[i])}" data-key="${r.f.key}" data-o="${r.o}" style="background:${divColor(e, max)}"></td>`; });
      html += `<td class="gap"></td><td class="text">${pct(r.got)}</td><td class="text">${pct(r.f.ym[r.o])}</td>${state.measure === 'ridge' ? `<td class="text">${pct(Math.max(0, Math.min(1, r.predicted)))}</td>` : ''}</tr>`;
    }
    html += '</tbody></table>';
  }
  view.innerHTML = html;
  const input = $('prompt-filter');
  input.addEventListener('input', () => { state.filter = input.value; renderPrompt(); const again = $('prompt-filter'); again.focus(); again.setSelectionRange(again.value.length, again.value.length); });
  view.querySelectorAll('[data-idea]').forEach((el) => el.addEventListener('click', () => { state.prompt = el.dataset.idea; renderPrompt(); }));
  view.querySelectorAll('th[data-question]').forEach((el) => el.addEventListener('click', () => { state.question = el.dataset.question; setTab('question'); }));
  view.querySelectorAll('td[data-key]').forEach((td) => {
    const f = model.fits.get(td.dataset.key); const j = f.index.get(td.dataset.word); const o = Number(td.dataset.o);
    td.addEventListener('mousemove', (event) => showTip(event, `<b>${escape(td.dataset.word)}</b> → ${escape(tidy(f.labels[o]))}: ${signed(effect(f, j, o))}<br>with the word ${pct(f.withM[j * f.k + o])}, without ${pct(f.withoutM[j * f.k + o])} · ${f.support[j]} ideas`));
    td.addEventListener('mouseleave', hideTip);
    td.addEventListener('click', () => showCell(td.dataset.word, f.key));
  });
}

// ── Too heavily weighted ──────────────────────────────────────────────────────
function renderFlags() {
  const fits = [...model.fits.values()];
  const words = visibleWords().map((v) => v.word);
  // Heavy words: one word that moves many decisions at once.
  const heavy = words.map((word) => {
    const per = fits.map((f) => { const j = f.index.get(word); return j === undefined ? 0 : excess(f, j); });
    return { word, total: per.reduce((a, b) => a + b, 0), broad: per.filter((v) => v >= 0.1).length, top: pushes(word).filter((x) => x.label !== MEAN).slice(0, 3), count: model.vocab.find((v) => v.word === word).count };
  }).sort((a, b) => b.total - a.total).slice(0, 20);
  // Locks: with the word the answer is near-certain, without it rare, and it holds idea after idea.
  const locks = [];
  for (const f of fits) {
    for (let j = 0; j < f.p; j++) {
      if (!state.functions && FUNCTION_WORDS.has(f.words[j])) continue;
      for (let o = 0; o < f.spread; o++) {
        const w = f.withM[j * f.k + o]; const wo = f.withoutM[j * f.k + o];
        if (w < 0.5 || w - wo < 0.3) continue;
        let hits = 0;
        f.rows.forEach((u, i) => { if (u.words.includes(f.words[j]) && f.Y[i * f.k + o] >= 0.5) hits++; });
        if (hits / f.support[j] < 0.75) continue;
        locks.push({ f, j, o, w, wo, hits });
      }
    }
  }
  locks.sort((a, b) => (b.w - b.wo) - (a.w - a.wo));
  // Deaf decisions: the answer barely changes from idea to idea.
  const deaf = fits.filter((f) => f.q.kind !== 'built' && f.spread <= MANY).map((f) => {
    let move = 0; const wins = new Array(f.spread).fill(0);
    for (let i = 0; i < f.n; i++) {
      let s = 0; let best = 0;
      for (let o = 0; o < f.spread; o++) { s += Math.abs(f.Y[i * f.k + o] - f.ym[o]); if (f.Y[i * f.k + o] > f.Y[i * f.k + best]) best = o; }
      move += s / 2 / f.n; wins[best]++;
    }
    const top = wins.indexOf(Math.max(...wins));
    return { f, move, top, share: wins[top] / f.n };
  }).sort((a, b) => a.move - b.move);
  const functionPull = [...FUNCTION_WORDS].filter((w) => model.vocab.some((v) => v.word === w)).map((word) => {
    const best = pushes(word).filter((x) => x.label !== MEAN)[0];
    return { word, best, count: model.vocab.find((v) => v.word === word).count };
  }).filter((x) => x.best).sort((a, b) => Math.abs(b.best.e) - Math.abs(a.best.e)).slice(0, 12);
  const meter = (v, max = 1) => `<span class="meter" style="width:${Math.round(Math.min(1, v / max) * 80)}px"></span>`;
  view.innerHTML = `<div class="flags">
    <section><h2>Heaviest words</h2><p>Words that move the most decision probability in total beyond what a decoy word seen in as many ideas moves, and how many decisions each shifts by 10 points or more past that floor. A word that reaches into mood, framing, finish and the vector layer at once is carrying more than its meaning.</p>
      <table class="list"><thead><tr><th>word</th><th>ideas</th><th>pull beyond noise</th><th>decisions ≥10</th><th>biggest pushes</th></tr></thead><tbody>
      ${heavy.map((h) => `<tr class="pick" data-word="${escape(h.word)}"><td>${escape(h.word)}</td><td>${h.count}</td><td>${meter(h.total, heavy[0].total)}${h.total.toFixed(2)}</td><td>${h.broad}</td><td>${h.top.map((x) => `${escape(short(x.f.key))}: ${escape(tidy(x.label))} ${signed(x.e)}`).join(' · ')}</td></tr>`).join('')}
      </tbody></table></section>
    <section><h2>Words that lock a decision</h2><p>Raw associations in either estimate mode (no words held apart): with the word, the answer averages 50% or more and reaches 50% in at least three of four ideas that contain it; without it, the answer is at least 30 points rarer. Literal nouns locking a setting or cast are expected; a word locking a finish (direction, look, medium, inks, motif) is the kind of weighting to question.</p>
      <table class="list"><thead><tr><th>word</th><th>decision</th><th>answer</th><th>with</th><th>without</th><th>holds in</th></tr></thead><tbody>
      ${locks.slice(0, 80).map((l) => `<tr class="pick" data-word="${escape(l.f.words[l.j])}" data-key="${l.f.key}"><td>${escape(l.f.words[l.j])}</td><td>${escape(groupOf(l.f.key))} · ${escape(short(l.f.key))}</td><td>${escape(tidy(l.f.labels[l.o]))}</td><td>${pct(l.w)}</td><td>${pct(l.wo)}</td><td>${l.hits} of ${l.f.support[l.j]}</td></tr>`).join('') || '<tr><td colspan="6" class="hint">None at these settings.</td></tr>'}
      </tbody></table></section>
    <section><h2>Decisions the prompt barely moves</h2><p>How far, on average, one idea's answer sits from the all-ideas average (0 = every idea gets the same distribution). Low movement with one answer winning almost everywhere means the model's prior is doing the deciding, not the words.</p>
      <table class="list"><thead><tr><th>decision</th><th>ideas</th><th>movement</th><th>usual winner</th><th>wins in</th></tr></thead><tbody>
      ${deaf.map((d) => `<tr class="pick" data-question="${d.f.key}"><td>${escape(groupOf(d.f.key))} · ${escape(short(d.f.key))}</td><td>${d.f.n}</td><td>${meter(d.move, 0.5)}${d.move.toFixed(2)}</td><td>${escape(tidy(d.f.labels[d.top]))}</td><td>${pct(d.share)}</td></tr>`).join('')}
      </tbody></table></section>
    <section><h2>Function words that still move things</h2><p>Words with no subject matter of their own. A large push here is usually a phrasing pattern ("the last …", "a … at night") standing in for something, or a sign the decision is brittle to wording.</p>
      <table class="list"><thead><tr><th>word</th><th>ideas</th><th>biggest push</th></tr></thead><tbody>
      ${functionPull.map((x) => `<tr class="pick" data-word="${escape(x.word)}" data-key="${x.best.f.key}"><td>${escape(x.word)}</td><td>${x.count}</td><td>${escape(short(x.best.f.key))}: ${escape(tidy(x.best.label))} ${signed(x.best.e)}</td></tr>`).join('')}
      </tbody></table></section>
  </div>`;
  view.querySelectorAll('tr[data-question]').forEach((tr) => tr.addEventListener('click', () => { state.question = tr.dataset.question; setTab('question'); }));
  view.querySelectorAll('tr[data-word]').forEach((tr) => tr.addEventListener('click', () => (tr.dataset.key ? showCell(tr.dataset.word, tr.dataset.key) : showWord(tr.dataset.word))));
}

// ── Wording probe ─────────────────────────────────────────────────────────────
// Written by `node dev/wording.mjs`: the ideas behind each lock conjured again, reworded.
const KINDS = ['original', 'synonym', 'paraphrase', 'antonym', 'other sense'];
const KIND_NOTE = {
  original: 'the idea as first typed, run again now',
  synonym: 'the word swapped for one meaning the same',
  paraphrase: 'the meaning kept, the word and its synonyms gone',
  antonym: 'the word swapped for its opposite',
  'other sense': 'the same word meaning something else',
};
let wording; let wordingRuns; const wordingCache = new Map();
state.compareKind = 'synonym';
async function loadRun(run) {
  if (!wordingCache.has(run)) {
    const response = await fetch(`/${run.replace(/^\/+/, '')}/wording.json`).catch(() => null);
    wordingCache.set(run, response?.ok ? await response.json() : null);
  }
  return wordingCache.get(run);
}
async function renderWording() {
  if (wordingRuns === undefined) {
    const response = await fetch('/.data/wording/index.json').catch(() => null);
    wordingRuns = response?.ok ? await response.json() : [];
  }
  if (wording === undefined) {
    if (wordingRuns.length) { state.wordingRun ??= wordingRuns[0].run; wording = await loadRun(state.wordingRun); }
    else { const response = await fetch('/.data/wording/latest.json').catch(() => null); wording = response?.ok ? await response.json() : null; }
  }
  if (state.tab !== 'wording') return;
  if (!wording) { view.innerHTML = '<p class="note">No wording probe yet. Run <code>node dev/wording.mjs .data/wording/probe.json</code> (it conjures every prompt with the real model), then reload.</p>'; return; }
  const runs = await Promise.all(wordingRuns.map(async (r) => ({ ...r, data: await loadRun(r.run) })));
  if (state.tab !== 'wording') return;
  const holds = (prompts) => { const read = prompts.filter((p) => !p.readings[0].failed && !p.readings[0].missing); return { won: read.filter((p) => p.readings[0].built).length, of: read.length }; };
  const grid = wording.groups.map((g) => `<tr><th>${escape(g.word)} → ${escape(tidy(g.targets[0].answer))} <span class="hint">(${escape(short(g.targets[0].decision))})</span></th>${KINDS.map((kind) => {
    const { won, of } = holds(g.prompts.filter((p) => p.kind === kind));
    if (!of) return '<td class="empty">—</td>';
    const share = won / of;
    return `<td class="${share > 0.55 ? 'ink-light' : ''}" style="background:${seqColor(share)}">${won} of ${of}</td>`;
  }).join('')}</tr>`).join('');
  const reading = (r, target) => {
    if (r.failed) return '<span class="lost">failed</span>';
    if (r.missing) return '<span class="lost">not asked</span>';
    const bar = r.p === null ? '' : `<span class="bar"><i style="width:${Math.round(r.p * 100)}%"></i></span>`;
    const p = r.p === null ? '' : pct(r.p);
    const tie = typeof r.margin === 'number' && r.margin < 0.05 ? ' (tie)' : '';
    return `${bar}<span class="${r.built ? 'won' : 'lost'}">${r.built ? `${p} ${target.decision.startsWith('built.') ? (target.decision === 'built.cast' ? 'cast' : 'built') : 'settled'}${tie}` : r.nearMiss ? `${p} near miss, not cast` : `${p} → ${escape(tidy(r.winner))}${tie}`}</span>`;
  };
  // Every model's run side by side: for one kind of rewording, how often the locked answer still wins.
  const complete = runs.filter((r) => r.data);
  const compare = complete.length > 1 ? `<h2 style="font-size:14px;margin:4px 0 6px">Across models</h2>
    <div class="prompt-pick"><label>Rewording <select id="compare-kind">${KINDS.map((k) => `<option ${k === state.compareKind ? 'selected' : ''}>${k}</option>`).join('')}</select></label><span class="hint">${escape(KIND_NOTE[state.compareKind])}: share of those prompts where the locked answer still wins</span></div>
    <table class="grid"><thead><tr><th></th>${complete.map((r) => `<th title="${escape(r.model)}">${escape(r.model.replace(/^nanogpt:/, '').split('/').pop().replace(/-20\d{6}$/, ''))}</th>`).join('')}</tr></thead><tbody>
    ${wording.groups.map((g, gi) => `<tr><th>${escape(g.word)} → ${escape(tidy(g.targets[0].answer))}</th>${complete.map((r) => {
      const group = r.data.groups[gi];
      const { won, of } = group ? holds(group.prompts.filter((p) => p.kind === state.compareKind)) : { won: 0, of: 0 };
      if (!of) return '<td class="empty">—</td>';
      const share = won / of;
      return `<td class="${share > 0.55 ? 'ink-light' : ''}" style="background:${seqColor(share)}">${won} of ${of}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table>` : '';
  view.innerHTML = `<p class="note">Each word that locked a decision across the gallery, tried again with its ideas reworded, at first choices, answered by ${escape((wording.model ?? 'the studio\'s configured model').replace(/^nanogpt:/, ''))}. If the model follows meaning, synonyms and paraphrases hold and antonyms let go. If synonyms let go but other senses of the same word hold, it is following the token. If antonyms hold too, the subject around the word is doing the work. Run ${escape(wording.run ?? '')}, ${escape(wording.made.slice(0, 16).replace('T', ' '))} UTC.</p>
    ${compare}
    <div class="prompt-pick"><label>Model <select id="wording-run">${wordingRuns.map((r) => `<option value="${escape(r.run)}" ${r.run === state.wordingRun ? 'selected' : ''}>${escape(r.model.replace(/^nanogpt:/, ''))} · ${r.prompts} prompts${r.failed ? `, ${r.failed} failed` : ''} · $${(r.spentUsd ?? 0).toFixed(2)}</option>`).join('')}</select></label></div>
    <table class="grid"><thead><tr><th></th>${KINDS.map((k) => `<th title="${escape(KIND_NOTE[k])}">${k}</th>`).join('')}</tr></thead><tbody>${grid}</tbody></table>
    ${wording.groups.map((g) => `<div class="probe-group" style="--targets:${g.targets.length}"><h2>${escape(g.word)} <small>${g.targets.map((t) => `${escape(short(t.decision))} = ${escape(tidy(t.answer))}`).join(' · ')}</small></h2>
      ${KINDS.flatMap((kind) => g.prompts.filter((p) => p.kind === kind)).map((p) => `<div class="probe-row"><span class="kind ${p.kind === 'original' ? 'original' : ''}" title="${escape(KIND_NOTE[p.kind] ?? '')}">${escape(p.kind)}</span><span>${escape(p.text)}</span>${p.readings.map((r, i) => `<span class="reading">${reading(r, g.targets[i])}</span>`).join('')}</div>`).join('')}
    </div>`).join('')}`;
  $('wording-run')?.addEventListener('change', async (event) => { state.wordingRun = event.target.value; wording = await loadRun(state.wordingRun); renderWording(); });
  $('compare-kind')?.addEventListener('change', (event) => { state.compareKind = event.target.value; renderWording(); });
}

// ── Detail panel ──────────────────────────────────────────────────────────────
/** The ideas containing the word, each with its probability for answer o of fit f when given. */
function ideaList(word, f, o) {
  const rows = f ? f.rows : model.units;
  const items = rows.map((u, i) => ({ u, i })).filter(({ u }) => u.words.includes(word));
  return `<ul class="ideas">${items.map(({ u, i }) => `<li class="pick" data-idea="${escape(u.idea)}"><span>${escape(u.idea)}</span><span>${f ? pct(f.Y[i * f.k + o]) : u.days[0]}</span></li>`).join('')}</ul>`;
}
function wireIdeas() {
  detail.querySelectorAll('[data-idea]').forEach((el) => el.addEventListener('click', () => { state.prompt = el.dataset.idea; state.filter = ''; setTab('prompt'); }));
}

function showCell(word, key) {
  const f = model.fits.get(key); const j = f.index.get(word);
  if (j === undefined) return;
  const order = [...Array(f.k).keys()].sort((a, b) => Math.abs(effect(f, j, b)) - Math.abs(effect(f, j, a))).slice(0, 14);
  const top = order.find((o) => f.labels[o] !== MEAN) ?? 0;
  detail.innerHTML = `<h2>“${escape(word)}” → ${escape(short(key))}</h2><p class="ask">${escape(f.q.ask)}</p>
    ${caveat(key, f) ? `<p class="ask">${escape(caveat(key, f))}</p>` : ''}
    <p>Moves ${pct(pull(f, j))} of this decision's ${f.spread > MANY ? 'probability toward or away from one answer' : 'probability'}; a meaningless word tagged on as many ideas appears to move ${pct(floor(f, f.support[j]))}. Seen in ${f.support[j]} of ${f.n} ideas.</p>
    <h3>Answers, without the word and with it</h3>
    <div class="key"><span><i style="background:var(--ink-3)"></i>ideas without</span><span><i style="background:var(--seq)"></i>ideas with</span><span>number: ${state.measure === 'ridge' ? 'push with other words held apart' : 'raw difference'}</span></div>
    <div class="bars">${order.map((o) => { const e = effect(f, j, o); return `<span class="label" title="${escape(f.labels[o])}">${escape(tidy(f.labels[o]))}</span><span class="track"><i class="base" style="width:${f.withoutM[j * f.k + o] * 100}%"></i><i class="with" style="width:${f.withM[j * f.k + o] * 100}%"></i></span><span class="num ${e > 0.02 ? 'up' : e < -0.02 ? 'down' : ''}">${signed(e)}</span>`; }).join('')}</div>
    <h3>Ideas with “${escape(word)}” · ${escape(tidy(f.labels[top]))}</h3>${ideaList(word, f, top)}`;
  wireIdeas();
}

function showWord(word) {
  const list = pushes(word).slice(0, 18);
  detail.innerHTML = `<h2>“${escape(word)}”</h2><p class="ask">${model.vocab.find((v) => v.word === word)?.count ?? 0} ideas${FUNCTION_WORDS.has(word) ? ' · function word' : ''}</p>
    <h3>Biggest pushes</h3>
    <ul class="ideas">${list.map((x) => `<li class="pick" data-key="${x.f.key}"><span>${escape(short(x.f.key))} · ${escape(tidy(x.label))}</span><span class="${x.e > 0 ? 'up' : 'down'}">${signed(x.e)}</span></li>`).join('')}</ul>
    <h3>Ideas</h3>${ideaList(word)}`;
  detail.querySelectorAll('[data-key]').forEach((el) => el.addEventListener('click', () => showCell(word, el.dataset.key)));
  wireIdeas();
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function render() {
  hideTip();
  $('count').textContent = `${model.units.length} ideas · ${model.vocab.length} words · ${model.fits.size} decisions`;
  if (!model.fits.size && state.tab !== 'prompt' && state.tab !== 'wording') {
    view.innerHTML = `<p class="note">Too few ideas from this model to estimate anything: a decision needs at least 20 ideas that were asked it, and a word ${state.min} ideas that contain it. Conjure more with this model, or widen the dates.</p>`;
    return;
  }
  ({ map: renderMap, question: renderQuestion, prompt: renderPrompt, flags: renderFlags, wording: renderWording })[state.tab]();
}
function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  render();
}

async function start() {
  const response = await fetch(DATA_URL);
  if (!response.ok) { view.innerHTML = '<p>No dataset yet. Run <code>node dev/influence.mjs</code> in the conjure folder, then reload.</p>'; return; }
  data = await response.json();
  const families = new Map();
  for (const u of data.units) { families.set(u.family, (families.get(u.family) ?? 0) + 1); }
  const versionsOf = (family) => [...new Set(data.units.filter((u) => u.family === family).flatMap((u) => u.versions))].sort();
  $('family').innerHTML = [...families].sort((a, b) => b[1] - a[1]).map(([family, n]) => {
    const versions = versionsOf(family);
    const each = versions.length > 1 ? versions.map((v) => `<option value="${escape(v)}">&nbsp;&nbsp;${escape(v)} (${data.units.filter((u) => u.versions.includes(v)).length})</option>`).join('') : '';
    return `<option value="${escape(family)}">${escape(family)} (${n})</option>${each}`;
  }).join('');
  const days = [...new Set(data.units.flatMap((u) => u.days))].sort();
  $('since').innerHTML = `<option value="">all (${days[0]} on)</option>${days.slice(1).map((d) => `<option>${d}</option>`).join('')}`;
  const bind = (id, key, parse = (v) => v) => $(id).addEventListener('change', (event) => { state[key] = parse(event.target.type === 'checkbox' ? event.target.checked : event.target.value); fit(); render(); });
  bind('family', 'family'); bind('since', 'since'); bind('min', 'min', Number); bind('measure', 'measure'); bind('lambda', 'lambda', Number); bind('functions', 'functions');
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  fit(); render();
}
start();
