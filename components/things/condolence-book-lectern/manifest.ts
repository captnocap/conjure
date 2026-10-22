import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Condolence book lectern',
  summary:
    'A slim lectern or draped side table holding an open guest book, a pen on a cord and a small reading lamp. Funerals and wakes, weddings, visitor centres, chapels, hotel lobbies, embassies after a death: the queue to write something, the blank line, not knowing what to put, reading what the last person wrote.',
  scales: ['room', 'street', 'tabletop'],
});
