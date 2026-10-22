import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type FigurePose, type FigureStyle, score } from '@conjure/kit';

const OUTFITS = {
  coat: { top: '#2c2f38', bottom: '#23252c', shoes: '#1d1d1f', sleeves: 'long' as const },
  bright: { top: '#e4573a', bottom: '#4d6a9c', shoes: '#f0ede4', sleeves: 'long' as const },
  work: { top: '#e6d62a', bottom: '#5a5146', shoes: '#4a3a2c', sleeves: 'long' as const },
  formal: { top: '#e9e4d6', bottom: '#1f2024', shoes: '#15151a', sleeves: 'long' as const },
  summer: { top: '#9fc7c0', bottom: '#d8cfb6', shoes: '#8d6b4f', sleeves: 'short' as const },
};

export default defineThing({
  questions: {
    stance: choice('How do they stand?', {
      square: 'Standing square, weight even, patient.',
      leaning: 'Leaning back against something unseen, one leg out.',
      crossed: 'Arms crossed, impatient.',
      hips: 'Hands on hips, fed up with waiting.',
      crouch: 'Crouched down on their heels, tired of standing.',
    }),
    style: choice('What kind of figure is it?', {
      mannequin: 'A jointed wooden artist mannequin, faceless and warm-toned.',
      person: 'A simplified clothed person with two dot eyes.',
      silhouette: 'A flat dark silhouette, like a cut-out against the light.',
      toy: 'A blocky toy figure with square limbs and bright paint.',
    }),
    head: choice('What is on their head?', {
      short: 'Short hair.',
      long: 'Long hair falling down the back.',
      bun: 'Hair tied up in a bun.',
      cap: 'A peaked cap.',
      hat: 'A brimmed hat.',
      hood: 'A hood up against the weather.',
    }),
    outfit: choice('What are they wearing?', {
      coat: 'A long dark coat over dark trousers.',
      bright: 'A bright orange jacket, blue jeans and white trainers.',
      work: 'A yellow hi-vis vest and work boots.',
      formal: 'A pale shirt, black trousers and polished shoes.',
      summer: 'A short-sleeved shirt, light trousers and sandals.',
    }),
    carrying: choice('What is with them?', {
      nothing: 'Nothing: hands empty.',
      bag: 'A holdall set down at their feet.',
      phone: 'A phone in one hand, screen lit.',
      coffee: 'A paper cup of coffee.',
      umbrella: 'A closed umbrella held like a cane.',
    }),
    gaze: choice('Where are they looking?', {
      road: 'Down the road, into the distance.',
      down: 'Down at their feet.',
      up: 'Up at a sign or the sky.',
      shoulder: 'Over their shoulder, as if someone called their name.',
    }),
    height: score('How tall are they?', ['A small child', 'A short adult', 'Average height', 'Tall', 'Towering']),
    build: choice('What is their build?', { slight: 'Slight and narrow.', average: 'Average.', heavy: 'Broad and heavy.' }),
  },
  build(a, context) {
    const s = new Sculpture(context);
    const pose: FigurePose = ({ square: 'standing', leaning: 'leaning', crossed: 'arms-crossed', hips: 'hands-on-hips', crouch: 'crouching' } as const)[a.stance];
    const style: FigureStyle = ({ mannequin: 'mannequin', person: 'doll', silhouette: 'silhouette', toy: 'blocky' } as const)[a.style];
    const outfit = OUTFITS[a.outfit];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'][Math.floor(context.random() * 5)];
    const hairColor = ['#3b2a22', '#171412', '#8b5a2b', '#c9b48a', '#5a5a5a'][Math.floor(context.random() * 5)];
    const person = figure(s, {
      height: 0.95 + a.height * 1.05,
      build: a.build,
      pose,
      style,
      hair: a.head,
      hairColor: a.head === 'cap' ? '#2d4a7a' : a.head === 'hat' ? '#3a3127' : hairColor,
      gaze: ({ road: 'ahead', down: 'down', up: 'up', shoulder: 'over-shoulder' } as const)[a.gaze],
      skin,
      mirror: context.random() < 0.5,
      ...outfit,
    });
    s.root.add(person.root);
    person.root.updateMatrixWorld(true);
    const H = person.height;
    const feet = person.root.position.clone();
    if (a.carrying === 'bag') {
      const bag = s.box([0.22 * H, 0.16 * H, 0.14 * H], [feet.x + 0.2 * H, 0.08 * H, feet.z + 0.1 * H], s.material('#4b3f2f'));
      bag.rotation.y = context.random() * 0.6;
      s.rod([bag.position.x - 0.06 * H, 0.16 * H, bag.position.z], [bag.position.x + 0.06 * H, 0.16 * H, bag.position.z], 0.012 * H, s.material('#2a241c'));
    }
    const hand = person.hands[context.random() < 0.5 ? 'left' : 'right'];
    if (a.carrying === 'phone') {
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.04 * H, 0.08 * H, 0.006 * H), new THREE.MeshStandardMaterial({ color: '#dfe9ff', emissive: '#b7d2ff', emissiveIntensity: 0.9, roughness: 0.4 }));
      phone.position.set(0, -0.01 * H, 0.03 * H);
      phone.castShadow = true;
      hand.add(phone);
    }
    if (a.carrying === 'coffee') {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * H, 0.018 * H, 0.06 * H, 14), s.material('#efe6d6'));
      cup.position.set(0, 0, 0.03 * H);
      cup.castShadow = true;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.024 * H, 0.024 * H, 0.008 * H, 14), s.material('#4a3f36'));
      lid.position.set(0, 0.034 * H, 0.03 * H);
      hand.add(cup, lid);
    }
    if (a.carrying === 'umbrella') {
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * H, 0.03 * H, 0.52 * H, 10), s.material('#1f2a3a'));
      cane.position.set(0, -0.24 * H, 0.03 * H);
      cane.castShadow = true;
      hand.add(cane);
    }
    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
