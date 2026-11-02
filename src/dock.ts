/**
 * Every picture conjured so far, in a strip along the bottom of the page. It sits small and faint
 * and grows as the pointer comes near or it takes focus; more pictures load as it is scrolled.
 * Choosing one shows it in the picture's own place.
 */
export interface GalleryEntry {
  id: string;
  day: string;
  savedAt: string;
  idea: string;
  hasPrint: boolean;
  hasSeries: boolean;
  hasLoop: boolean;
  /** The scene widened to the browser window it was made in, and where the frame sat in it. */
  hasWindow?: boolean;
  window?: { width: number; height: number; frame: { x: number; y: number; size: number } };
  source?: string;
  model?: string | null;
  scale?: string;
  roll?: number;
  force?: Record<string, string | number | boolean>;
  presentation?: { kind: string; plates?: string[] };
  world?: { id: string } | null;
  look?: { id: string; notes?: string[] } | null;
  direction?: { id: string } | null;
  cast?: { id: string }[];
  design?: { layers?: { motif: string }[] } | null;
}

export const fileOf = (entry: GalleryEntry, kind: 'print' | 'scene' | 'series' | 'loop' | 'window') =>
  `/gallery/files/${entry.day}/${encodeURIComponent(entry.id)}.${kind === 'print' && !entry.hasPrint ? 'scene' : kind}.${kind === 'loop' ? 'webm' : 'jpg'}`;

/** A small copy of the print, made by the server; the full print when it cannot make one. */
const thumbOf = (entry: GalleryEntry) => `/gallery/thumbs/${entry.day}/${encodeURIComponent(entry.id)}.jpg`;

export interface Dock {
  /** Pick up pictures saved since the strip was filled. */
  refresh(): Promise<void>;
  /** Clear the chosen mark, when the page goes back to its own picture. */
  release(): void;
}

const PAGE = 40;
/** The most the gallery API returns at once. */
const MOST = 120;
/** How far above the bottom edge the pointer starts to draw the strip up. */
const REACH = 200;
/** Where the strip was scrolled to, kept across reloads: the thumb at its left edge and how far past it. */
const PLACE_KEY = 'conjure.dock.place';

const recall = (): { key: string; at: number } | null => {
  try {
    const place = JSON.parse(localStorage.getItem(PLACE_KEY) ?? 'null');
    return place && typeof place.key === 'string' && Number.isFinite(place.at) ? place : null;
  } catch { return null; }
};

export function installDock(host: HTMLElement, choose: (entry: GalleryEntry) => void): Dock {
  const strip = host.querySelector<HTMLElement>('.dock-strip')!;
  const count = host.querySelector<HTMLElement>('#dock-count')!;
  const sentinel = document.createElement('span');
  sentinel.className = 'dock-end';
  strip.append(sentinel);
  const shown = new Set<string>();
  let offset = 0;
  let total = Infinity;
  let pending: Promise<void> | null = null;

  // The strip's place is kept in thumbs, not pixels: the thumbs shrink to a quarter as the pointer
  // leaves, and a pixel offset would be clamped back toward the start and stay there when they grow.
  let at = 0;
  let pitchSeen = 0;
  let placed = 0;
  let saving = 0;
  const thumbs = () => strip.getElementsByClassName('thumb') as HTMLCollectionOf<HTMLButtonElement>;
  const pitch = () => {
    const first = thumbs()[0];
    return first ? first.getBoundingClientRect().width + (parseFloat(getComputedStyle(strip).columnGap) || 0) : 0;
  };
  const place = () => {
    const step = pitch();
    if (!step) return;
    pitchSeen = step;
    strip.scrollLeft = at * step;
    placed = strip.scrollLeft;
  };
  const remember = () => {
    clearTimeout(saving);
    saving = window.setTimeout(() => {
      const index = Math.min(Math.floor(at), thumbs().length - 1);
      const key = thumbs()[index]?.dataset.id;
      try {
        if (key) localStorage.setItem(PLACE_KEY, JSON.stringify({ key, at: at - index }));
      } catch { /* the place is only a convenience */ }
    }, 250);
  };
  strip.addEventListener('scroll', () => {
    const step = pitch();
    if (!step) return;
    // The thumbs changed size under the scroll: put the same thumb back at the edge.
    if (Math.abs(step - pitchSeen) > 0.5) return place();
    if (Math.abs(strip.scrollLeft - placed) < 1) return;
    at = strip.scrollLeft / step;
    placed = strip.scrollLeft;
    remember();
  }, { passive: true });
  const resized = new ResizeObserver(() => {
    if (Math.abs(pitch() - pitchSeen) > 0.5) place();
  });

  const thumb = (entry: GalleryEntry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = entry.idea;
    button.dataset.id = `${entry.day}/${entry.id}`;
    button.setAttribute('aria-pressed', 'false');
    const image = new Image();
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = entry.idea;
    image.src = thumbOf(entry);
    button.append(image);
    resized.observe(button);
    if (entry.hasLoop || entry.hasSeries) button.dataset.extra = entry.hasLoop ? 'loop' : 'series';
    button.addEventListener('click', () => {
      for (const other of strip.querySelectorAll('.thumb[aria-pressed="true"]')) other.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      choose(entry);
    });
    return button;
  };

  const load = async (size: number) => {
    try {
      const page = (await (await fetch(`/api/gallery?limit=${size}&offset=${offset}`)).json()) as { total: number; entries: GalleryEntry[] };
      total = page.total;
      offset += page.entries.length;
      if (!page.entries.length) total = offset;
      count.textContent = total.toLocaleString();
      for (const entry of page.entries) {
        const key = `${entry.day}/${entry.id}`;
        if (shown.has(key)) continue;
        shown.add(key);
        sentinel.before(thumb(entry));
      }
      host.classList.toggle('empty', shown.size === 0);
    } catch {
      total = offset;
    }
  };
  const more = (size = PAGE): Promise<void> => {
    if (pending || offset >= total) return pending ?? Promise.resolve();
    return pending = load(size).finally(() => {
      pending = null;
      // A wide screen may show the whole first page; keep going while the end is in view.
      if (sentinel.getBoundingClientRect().left < strip.getBoundingClientRect().right + 400 && offset < total) void more();
    });
  };
  new IntersectionObserver((seen) => { if (seen.some((item) => item.isIntersecting)) void more(); }, { root: strip, rootMargin: '0px 600px 0px 0px' }).observe(sentinel);

  // Nearness: the strip rises as the pointer comes down toward it.
  let frame = 0;
  document.addEventListener('pointermove', (event) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const near = Math.max(0, Math.min(1, 1 - (window.innerHeight - event.clientY) / REACH));
      host.style.setProperty('--near', near.toFixed(3));
    });
  });
  document.addEventListener('pointerleave', () => host.style.setProperty('--near', '0'));
  // A wheel scrolls the strip sideways.
  strip.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    strip.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
  strip.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const thumbs = [...strip.querySelectorAll<HTMLButtonElement>('.thumb')];
    const at = thumbs.indexOf(document.activeElement as HTMLButtonElement);
    const next = thumbs[Math.max(0, Math.min(thumbs.length - 1, at + (event.key === 'ArrowRight' ? 1 : -1)))];
    next?.focus();
    next?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    event.preventDefault();
  });

  // Back to where the strip was left: load until that thumb is in, then scroll to it.
  void (async () => {
    const saved = recall();
    await more();
    if (!saved) return;
    for (let pages = 0; !shown.has(saved.key) && offset < total && pages < 25; pages++) await more(MOST);
    const index = [...thumbs()].findIndex((button) => button.dataset.id === saved.key);
    if (index < 0) return;
    at = index + saved.at;
    place();
  })();

  return {
    async refresh() {
      try {
        const page = (await (await fetch('/api/gallery?limit=6&offset=0')).json()) as { total: number; entries: GalleryEntry[] };
        const fresh = page.entries.filter((entry) => !shown.has(`${entry.day}/${entry.id}`));
        for (const entry of fresh.reverse()) {
          shown.add(`${entry.day}/${entry.id}`);
          strip.prepend(thumb(entry));
        }
        offset += fresh.length;
        total = page.total;
        // New pictures arrive at the start; stay on the same one unless the strip sat at the start.
        if (fresh.length && at >= 0.5) {
          at += fresh.length;
          place();
        }
        count.textContent = total.toLocaleString();
        host.classList.toggle('empty', shown.size === 0);
      } catch { /* the strip catches up on the next print */ }
    },
    release() {
      for (const other of strip.querySelectorAll('.thumb[aria-pressed="true"]')) other.setAttribute('aria-pressed', 'false');
    },
  };
}
