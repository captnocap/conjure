import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Projection booth',
  summary:
    'A squat block hut with a small port window throwing a cone of dusty light, film cans stacked by the door and a projectionist\'s stool. Drive-ins and old picture houses, the unseen person who runs the show, carbon arcs and changeover cues, moths in the beam, the last reel of the last night.',
  scales: ['street', 'room'],
});
