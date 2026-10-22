import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pull-chain bulb',
  summary:
    'A bare incandescent bulb on a cloth cord, hanging from a short timber bracket with a bead pull chain, glowing, dead or flickering as it sways. The single light of attics, cellars and sheds: interrogation, revelation, the click before you see what is down there.',
  scales: ['room', 'tabletop', 'street'],
});
