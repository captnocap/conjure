import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Telephone booth",
  summary: "A small public telephone enclosure with a receiver, keypad and glazed panels, for messages across distance, lost connections and a little room inside the city.",
  scales: ["street", "room"],
});
