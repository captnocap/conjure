import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Mrs Macquarie's Chair",
  summary:
    "Mrs Macquarie's Chair: a stepped bench carved by convicts in 1810 straight into a ledge of honey-coloured Sydney sandstone on a harbour point, its edges worn round, iron streaks in the bedding, an old inscription cut into the rock. Homesickness and exile, a governor's wife watching for ships from home, picnics, gulls and harbour views.",
  scales: ['street', 'landscape', 'room'],
});
