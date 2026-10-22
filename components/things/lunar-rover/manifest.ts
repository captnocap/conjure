import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: "Lunar rover",
  summary: "A six-wheeled lunar exploration rover with articulated suspension, scientific mast, sample bins and solar instruments, bringing curiosity and vulnerable engineering to an empty frontier.",
  scales: ["street", "room", "planetary"],
});
