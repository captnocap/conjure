import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cubicle desk pod',
  summary:
    'One L-shaped office cubicle: fabric partition walls, a laminate desk, a beige CRT computer, an overhead bin, photos and memos pinned up. Monday dread, overtime, quiet ambition, a desk decorated for a birthday or stripped bare after a layoff, a whole working life in six square metres.',
  scales: ['room', 'street'],
});
