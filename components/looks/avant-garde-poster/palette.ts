import { type Mood, type Palette, type PaletteRole, rekey, rekeyOne } from '@conjure/kit';
import { type RGB, hex, luma, mixRGB } from './common';

/** Every tradition draws from the same roles, so one palette question serves all four. */
export interface Roles {
  red: RGB;
  yellow: RGB;
  blue: RGB;
  key: RGB;
  light: RGB;
  grey: RGB;
  green: RGB;
  pink: RGB;
}

export type Tradition = 'bauhaus' | 'constructivism' | 'haring' | 'kusama';
export type PaletteKey = 'canon' | 'faded' | 'hot' | 'spot' | 'cool' | 'pastel';
export type PaperKey = 'offwhite' | 'newsprint' | 'white' | 'kraft' | 'black';
export type Lettering = 'none' | 'headline' | 'column' | 'notice';
export type Occasion = 'exhibition' | 'rally' | 'party' | 'manifesto' | 'memorial';

const roles = (r: Record<keyof Roles, string>): Roles => ({
  red: hex(r.red),
  yellow: hex(r.yellow),
  blue: hex(r.blue),
  key: hex(r.key),
  light: hex(r.light),
  grey: hex(r.grey),
  green: hex(r.green),
  pink: hex(r.pink),
});

const CANON: Record<Tradition, Roles> = {
  bauhaus: roles({ red: '#d3262b', yellow: '#efc12f', blue: '#2a58b4', key: '#161514', light: '#f4eee0', grey: '#c6c3bb', green: '#3e8a5a', pink: '#e58fa0' }),
  constructivism: roles({ red: '#c8231c', yellow: '#e3b03e', blue: '#2b4a7c', key: '#151311', light: '#f7f1e1', grey: '#b8ae98', green: '#56704a', pink: '#d97a6c' }),
  haring: roles({ red: '#e8262a', yellow: '#ffd51c', blue: '#1f5fbf', key: '#121212', light: '#fbf8f0', grey: '#b9b4ad', green: '#16a54a', pink: '#f06aa6' }),
  kusama: roles({ red: '#d8201f', yellow: '#f6cf12', blue: '#1d4fa8', key: '#141414', light: '#fbf8f2', grey: '#c8c4bd', green: '#1f9d5a', pink: '#ef6fa3' }),
};

const SHARED: Record<Exclude<PaletteKey, 'canon' | 'spot'>, Roles> = {
  faded: roles({ red: '#a8432e', yellow: '#c99a3b', blue: '#3f5b78', key: '#2b2622', light: '#efe6d2', grey: '#b7ad98', green: '#6b7d4e', pink: '#c98b80' }),
  hot: roles({ red: '#ff4a3d', yellow: '#ffe02e', blue: '#1fb3d1', key: '#1a1420', light: '#fff7f2', grey: '#d8c8e8', green: '#3dd17c', pink: '#ff5fae' }),
  cool: roles({ red: '#e0662a', yellow: '#e6d5a2', blue: '#1f4e8c', key: '#14212b', light: '#f0f2ee', grey: '#9fb0b3', green: '#2f8f83', pink: '#8fb8c9' }),
  pastel: roles({ red: '#ef8f8a', yellow: '#f6dc7d', blue: '#86aee0', key: '#3b3346', light: '#fdf8f0', grey: '#cfc6d6', green: '#9fd6b0', pink: '#f4b6cc' }),
};

/** One ink and black: the ink follows the mood, red when warm, blue when cold. */
function spot(mood: Mood): Roles {
  const cold = hex('#1f4fa0'), warm = hex('#d0281e');
  const ink = mood.warmth > 0.5 ? mixRGB(hex('#c43d6a'), warm, Math.min(1, (mood.warmth - 0.5) * 3)) : mixRGB(cold, hex('#2f7d78'), Math.max(0, mood.warmth - 0.3) * 2);
  const tint = mixRGB(ink, hex('#f4ede0'), 0.55);
  const key = hex('#171615');
  const shade = mixRGB(ink, key, 0.5);
  return { red: ink, yellow: tint, blue: shade, key, light: hex('#f6f0e3'), grey: mixRGB(key, hex('#f4ede0'), 0.62), green: tint, pink: tint };
}

/**
 * Under the idea's palette every set but the movement's own canon is re-keyed: the lead ink (red, with
 * pink keeping its offset) turns onto the palette's ink, the others (yellow, blue, green) onto its
 * second colour as a set, the light ink toward its ground; black and grey stay. A spot run is one ink and
 * its tints, so all of them follow the ink.
 */
const ROLES: Partial<Record<keyof Roles, PaletteRole>> = { red: 'ink', pink: 'ink', yellow: 'second', blue: 'second', green: 'second', light: 'ground' };
const SPOT_ROLES: Partial<Record<keyof Roles, PaletteRole>> = { red: 'ink', pink: 'ink', yellow: 'ink', blue: 'ink', green: 'ink', light: 'ground' };

/** A paper stock's tone under the idea's palette: tinted toward its ground. */
export const paperTone = (tone: RGB, inks: Palette | undefined): RGB => rekeyOne(tone, inks, 'ground');

export function rolesFor(palette: PaletteKey, tradition: Tradition, mood: Mood, darkPaper = false, inks?: Palette): Roles {
  const made = palette === 'canon' ? CANON[tradition] : palette === 'spot' ? spot(mood) : SHARED[palette];
  const base: Roles = palette === 'canon' ? made : rekey(made as unknown as Record<keyof Roles, RGB>, inks, palette === 'spot' ? SPOT_ROLES : ROLES);
  // Grim moods sink the inks a little toward the key; joyful ones lift them.
  const sink = Math.max(0, 0.45 - mood.cheer) * 0.25;
  const out = { ...base };
  for (const role of ['red', 'yellow', 'blue', 'green', 'pink'] as const) {
    out[role] = mixRGB(base[role], base.key, sink);
    // On black stock a dark ink would vanish: lift it toward the light.
    if (darkPaper && luma(out[role]) < 0.3) out[role] = mixRGB(out[role], base.light, 0.45);
  }
  return out;
}

export const PAPER_STOCK: Record<PaperKey, { tone: RGB; tooth: number; dark: boolean; name: string }> = {
  offwhite: { tone: hex('#ebe3cf'), tooth: 0.5, dark: false, name: 'off-white poster stock' },
  newsprint: { tone: hex('#dfd2ae'), tooth: 1, dark: false, name: 'cheap yellowing newsprint' },
  white: { tone: hex('#f5f3ec'), tooth: 0.2, dark: false, name: 'bright gallery stock' },
  kraft: { tone: hex('#c4a477'), tooth: 0.9, dark: false, name: 'brown kraft paper' },
  black: { tone: hex('#1f1e21'), tooth: 0.6, dark: true, name: 'black matte stock' },
};

export interface Ctx {
  N: number;
  unit: number;
  tradition: Tradition;
  inks: Roles;
  /** The drawing ink: black on light stock, the light ink on black stock. */
  key: RGB;
  paper: RGB;
  dark: boolean;
  abstraction: number;
  mark: number;
  weight: number;
  lettering: Lettering;
  occasion: Occasion;
  mood: Mood;
  random: () => number;
  seed: number;
  signal: AbortSignal;
  /** Whether a paper margin surrounds the picture. */
  margin: boolean;
}
