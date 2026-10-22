import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { grazer } from './grazer';

const HIDES = {
  slate: 'Blue-grey slate hide, like wet stone.',
  rust: 'Rust red-brown, the colour of an old tractor.',
  bone: 'Bone-pale cream, almost white.',
  dun: 'Dusty tan dun with a darker muzzle.',
  moss: 'Dull olive-green, hard to see in the grass.',
} as const;
const HIDE_COLOUR: Record<keyof typeof HIDES, [string, string]> = {
  slate: ['#5f6b78', '#9aa0a3'],
  rust: ['#8c4a2e', '#c4a37a'],
  bone: ['#e3dccb', '#b8ad97'],
  dun: ['#b08e62', '#8a7355'],
  moss: ['#6b7046', '#a39f78'],
};

export default defineThing({
  questions: {
    hide: choice('What colour is its hide?', HIDES),
    horns: choice('What does it carry on its head?', {
      none: 'Nothing: a smooth domed head.',
      stubs: 'Two short blunt horn stubs.',
      curved: 'A pair of long horns curving up and forward.',
      crest: 'A single bony crest running down the skull.',
    }),
    doing: choice('What is it doing?', {
      grazing: 'Head down in the grass, trunk rooting, chewing slowly.',
      alert: 'Head raised, trunk hanging, staring at something you cannot see.',
      lying: 'Lying down with its legs folded under it, chewing the cud.',
      walking: 'Walking slowly, one leg of each pair swung forward.',
    }),
    markings: choice('How is it marked?', {
      plain: 'One even colour all over.',
      dappled: 'Darker dapples scattered over the flanks.',
      banded: 'Three dark bands around the barrel of its body.',
      'pale-belly': 'A pale cream belly under a darker back.',
    }),
    owned: choice('What shows it belongs to someone?', {
      none: 'Nothing: it could be wild.',
      'ear-tag': 'A yellow plastic tag clipped to one ear.',
      brand: 'A number branded on its flank.',
      paint: 'A stripe of bright orange marking paint on its rump.',
    }),
    calf: noul('Is there a calf alongside it?'),
    size: score('How big is it?', ['A yearling, pony-sized', 'Cow-sized', 'A heavy old bull']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const [hide, plate] = HIDE_COLOUR[a.hide];
    const size = mix(0.6, 1.08, a.size);
    const pose = { grazing: 'graze', alert: 'alert', lying: 'lying', walking: 'walk' } as const;
    const adult = grazer(s, { size, hide, plate, markings: a.markings, horns: a.horns, pose: pose[a.doing], tag: a.owned });
    adult.group.rotation.y = (context.random() - 0.5) * 0.2;
    const herd = [adult];
    if (a.calf) {
      const side = context.random() < 0.5 ? -1 : 1;
      const calf = grazer(s, {
        size: size * mix(0.42, 0.5, context.random()), hide, plate, markings: a.markings, horns: 'none',
        pose: a.doing === 'lying' ? (context.random() < 0.5 ? 'lying' : 'alert') : context.random() < 0.6 ? 'graze' : 'alert',
        tag: a.owned === 'ear-tag' ? 'ear-tag' : 'none',
      });
      calf.group.position.set(side * 1.15 * size, 0, mix(-0.5, 0.3, context.random()) * size);
      calf.group.rotation.y = side * mix(0.2, 0.9, context.random());
      herd.push(calf);
    }
    return s.finish({ update: (dt, time) => { for (const beast of herd) beast.update(dt, time); } });
  },
});
