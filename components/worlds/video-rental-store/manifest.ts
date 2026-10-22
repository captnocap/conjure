import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Video rental store',
  summary:
    'A 1990s video rental shop cut open at the corner: carpet, walls of face-out tape boxes under genre signs, an aisle shelf, fluorescent tubes and a counter by the glass door. Friday nights, choosing together, late fees, a chain store or a cluttered independent, a closing-down sale, a ritual that no longer exists.',
  scales: ['room', 'tabletop', 'street'],
});
