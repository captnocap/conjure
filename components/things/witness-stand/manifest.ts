import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Witness stand',
  summary:
    'A railed wooden witness box on a low step with a single chair, a microphone and a book to swear on, perhaps a half-drunk glass of water or a handkerchief left behind. Testimony, nerves, cross-examination, telling the truth or not, being the only one who saw.',
  scales: ['room', 'street', 'tabletop'],
});
