import { SCALES, type Scale } from '@conjure/kit';
import { CATALOGUE, type Entry } from '../engine/catalogue';
import { IDEA_COMBINATIONS, IDEA_DOMAINS, inventIdea, SCENE_IDEAS } from './ideas';

export interface Study { world: string; cast: string[] }
interface Actions { useIdea(idea: string): void; study(idea: string, study: Study): void }
const DEFAULT_WORLDS: Record<Scale, string> = {
  cosmic: 'worlds/deep-space', planetary: 'worlds/orbital-theatre',
  landscape: 'worlds/desert-basin', street: 'worlds/street-corner',
  room: 'worlds/tiled-room', tabletop: 'worlds/worktable', macro: 'worlds/specimen-slide',
};

/** A few appropriate companions show how the architecture holds a cast. */
const WORLD_CAST: Record<string, string[]> = {
  'deep-space': ['galaxy', 'nebula', 'black-hole'],
  'orbital-theatre': ['planet', 'moon', 'satellite'],
  'gas-station-market': ['market-shelf', 'drinks-fridge', 'cash-register'],
  'street-corner': ['bus-shelter', 'street-lamp', 'bicycle'],
  'forest-clearing': ['tree', 'mushroom-cluster', 'fern'],
  'desert-basin': ['mesa', 'pyramid', 'cactus'],
  'tidal-coast': ['lighthouse', 'ice-arch', 'submarine'],
  'reef-floor': ['coral-colony', 'seaweed', 'jellyfish'],
  'greenhouse': ['bonsai', 'fern', 'lotus-pond'],
  'specimen-slide': ['beetle', 'butterfly', 'seashell'],
  'worktable': ['record-player', 'bonsai', 'suitcase'],
  'tiled-room': ['washing-machine', 'refrigerator', 'chair'],
  'plinth': ['chair', 'tree', 'robot'],
  'kelp-forest': ['seaweed', 'jellyfish', 'coral-colony'],
  'arctic-shelf': ['glacier', 'ice-arch', 'lighthouse'],
  'mushroom-grove': ['mushroom-cluster', 'mossy-log', 'fern'],
  'dew-garden': ['dragonfly', 'beetle', 'butterfly'],
  'cloud-garden': ['cloud-bank', 'floating-island', 'airship'],
  'diner-interior': ['diner-booth', 'coffee-machine', 'cash-register'],
  'laundromat': ['washing-machine', 'vending-machine', 'suitcase'],
  'motel-courtyard': ['motel-sign', 'park-bench', 'suitcase'],
  'night-market': ['market-shelf', 'newsstand', 'coffee-machine'],
  'apartment-kitchen': ['kitchen-stove', 'refrigerator', 'coffee-machine'],
  'lunar-outpost': ['lunar-rover', 'rocket', 'radio-telescope'],
  'observatory-ridge': ['observatory', 'radio-telescope', 'mountain-range'],
  'flooded-temple': ['temple-gate', 'lotus-pond', 'ancient-ruin'],
  'archive-hall': ['giant-book', 'server-rack', 'chair'],
  'neon-rooftop': ['hologram-pedestal', 'street-lamp', 'hover-car'],
  'harbour-dock': ['sailboat', 'cargo-crane', 'shipping-container'],
  'rail-platform': ['freight-train', 'suitcase', 'newspaper-box'],
  'fairground': ['ferris-wheel', 'picnic-table', 'vending-machine'],
  'bookshop': ['bookshelf', 'desk-lamp', 'sofa'],
  'music-room': ['piano', 'gramophone', 'grandfather-clock'],
  'flower-shop': ['flower-bucket', 'succulent-garden', 'cash-register'],
  'lily-marsh': ['koi-fish', 'frog', 'lotus-pond'],
  'terrarium-dome': ['terrarium', 'snail', 'fern'],
  'molecular-lab': ['dna-helix', 'pollen-grain', 'ant-colony'],
};

export function studyFor(entry: Entry): Study {
  if (entry.kind === 'thing') return { world: DEFAULT_WORLDS[entry.scales[0]], cast: [entry.id] };
  const suggested = WORLD_CAST[entry.id.split('/')[1]] ?? [];
  return {
    world: entry.id,
    cast: suggested.map((name) => `things/${name}`).filter((id) =>
      CATALOGUE.some((thing) => thing.id === id && thing.scales.some((scale) => entry.scales.includes(scale))),
    ),
  };
}

export function installLibrary(actions: Actions) {
  const dialog = document.querySelector<HTMLDialogElement>('#library')!;
  const search = document.querySelector<HTMLInputElement>('#library-search')!;
  const scaleFilter = document.querySelector<HTMLSelectElement>('#library-scale')!;
  const results = document.querySelector<HTMLElement>('#library-results')!;
  const count = document.querySelector<HTMLElement>('#library-count')!;
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-library-tab]')];
  const counts = (kind: string) => CATALOGUE.filter((entry) => entry.kind === kind).length;
  document.querySelector('#catalogue-count')!.textContent = `${counts('world')} worlds · ${counts('thing')} things · ${counts('look')} looks · ${counts('direction')} directions`;
  let tab = 'ideas';

  for (const domain of IDEA_DOMAINS) scaleFilter.append(new Option(domain.title, domain.scale));
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const use = (idea: string) => { dialog.close(); actions.useIdea(idea); };
  const selectedScale = () => SCALES.find((scale) => scale === scaleFilter.value);

  function render() {
    results.replaceChildren();
    const phrase = search.value.toLowerCase().trim();
    const scale = selectedScale();
    const matches = (text: string, scales: readonly Scale[]) =>
      (!scale || scales.includes(scale)) && (!phrase || text.toLowerCase().includes(phrase));
    const ideas = SCENE_IDEAS.filter((idea) => matches(idea.title, [idea.scale]));
    const entries = CATALOGUE.filter((entry) => entry.kind === tab && matches(`${entry.title} ${entry.summary} ${entry.id}`, entry.scales));
    count.textContent = tab === 'ideas'
      ? `${ideas.length} scene seeds · ${IDEA_COMBINATIONS.toLocaleString()} combinations with Invent an idea`
      : `${entries.length} ${tab === 'world' ? 'worlds' : 'things'} · Study builds a free, randomly varied example`;
    for (const item of tab === 'ideas' ? ideas : entries) {
      const card = node('article', undefined, 'library-card');
      const idea = 'prompt' in item ? item : null;
      const entry = 'kind' in item ? item : null;
      card.append(
        node('p', (idea ? [idea.scale] : entry!.scales).join(' / '), 'eyebrow'),
        node('h3', item.title),
      );
      if (entry) card.append(node('p', entry.summary, 'card-summary'));
      const button = node('button', idea ? 'Use this idea' : 'Study this component');
      button.type = 'button';
      button.addEventListener('click', () => {
        if (idea) use(idea.prompt);
        else {
          dialog.close();
          actions.study(`A character study of ${entry!.title.toLowerCase()}`, studyFor(entry!));
        }
      });
      card.append(button);
      results.append(card);
    }
    if (!results.childElementCount) results.append(node('p', 'No matches. Try another scale or a shorter search.', 'empty-library'));
  }

  document.querySelector('#browse')!.addEventListener('click', () => { render(); dialog.showModal(); });
  document.querySelector('#library-close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  search.addEventListener('input', render);
  scaleFilter.addEventListener('change', render);
  for (const button of tabs) button.addEventListener('click', () => {
    tab = button.dataset.libraryTab!;
    for (const candidate of tabs) candidate.setAttribute('aria-pressed', String(candidate === button));
    render();
  });
  // getRandomValues also works on the LAN's plain HTTP origin.
  const freshSeed = () => crypto.getRandomValues(new Uint32Array(4)).join('-');
  const invented = () => inventIdea(freshSeed(), selectedScale());
  document.querySelector('#library-invent')!.addEventListener('click', () => use(invented().prompt));
  document.querySelector('#invent')!.addEventListener('click', () => actions.useIdea(inventIdea(freshSeed()).prompt));
}
