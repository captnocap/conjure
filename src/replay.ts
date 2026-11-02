/**
 * Build a saved picture again: every recorded answer pinned, the same world and the very same cast,
 * the same idea and roll and so the same seed. Used to widen a gallery picture to this window.
 */
export interface SavedRuling { owner: string; name: string; picked: string; confidence: number; kind: 'choice' | 'score' | 'noul' }
export interface SavedRecord {
  idea: string;
  roll?: number;
  temperature?: number;
  world: { id: string };
  cast?: { id: string }[];
  rulings?: SavedRuling[];
}
export interface Replay { idea: string; roll: number; temperature: number; world: string; cast: string[]; force: Record<string, string | number | boolean> }

export function replayOf(record: SavedRecord): Replay {
  const force: Replay['force'] = {};
  for (const ruling of record.rulings ?? []) {
    // A score's settled value is kept as its confidence; a yes-or-no as its word.
    force[`${ruling.owner}::${ruling.name}`] = ruling.kind === 'score' ? ruling.confidence : ruling.kind === 'noul' ? ruling.picked === 'yes' : ruling.picked;
  }
  // Pictures made before colour was asked kept every component as made; a replay must too.
  if (!(record.rulings ?? []).some((ruling) => ruling.name.startsWith('paint'))) {
    for (const name of ['paintBody', 'paintTrim', 'paintLight', 'paintSky']) force[`${record.world.id}::${name}`] = 'as-made';
    for (const member of record.cast ?? []) for (const name of ['paintBody', 'paintTrim']) force[`${member.id}::${name}`] = 'as-made';
  }
  // Pictures made before palettes existed printed every look in its own inks.
  if (!(record.rulings ?? []).some((ruling) => ruling.name === 'paletteInk')) force['direction::palette'] = 'none';
  // Pictures made before materials were asked kept every surface as built, and printed it flat.
  if (!(record.rulings ?? []).some((ruling) => ruling.name === 'materialBody' || ruling.name === 'materialSky')) {
    for (const name of ['materialBody', 'materialSky']) force[`${record.world.id}::${name}`] = 'as-made';
    for (const member of record.cast ?? []) force[`${member.id}::materialBody`] = 'as-made';
  }
  if (!(record.rulings ?? []).some((ruling) => ruling.name === 'materialize')) force['direction::materialize'] = 'none';
  return {
    idea: record.idea,
    roll: record.roll ?? 0,
    temperature: record.temperature ?? 0,
    world: record.world.id,
    cast: (record.cast ?? []).map((member) => member.id),
    force,
  };
}
