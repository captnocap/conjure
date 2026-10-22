import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Profile = readonly (readonly [number, number])[];

const GLASSES = {
  martini: 'A sharp V-shaped martini glass on a tall stem.',
  coupe: 'A shallow rounded coupe, a champagne saucer.',
  nicknora: 'A small deep tulip-bowled Nick and Nora glass.',
  margarita: 'A wide stepped margarita glass with a salted rim.',
} as const;
/** Bowl profiles start where the stem ends. */
const BOWLS: Record<keyof typeof GLASSES, Profile> = {
  martini: [[0.004, 0.085], [0.058, 0.165]],
  coupe: [[0.004, 0.085], [0.028, 0.092], [0.045, 0.108], [0.051, 0.125], [0.05, 0.138]],
  nicknora: [[0.004, 0.08], [0.022, 0.088], [0.034, 0.108], [0.037, 0.13], [0.034, 0.155]],
  margarita: [[0.004, 0.075], [0.02, 0.082], [0.025, 0.1], [0.03, 0.108], [0.05, 0.118], [0.062, 0.148]],
};
const DRINKS = {
  gin: 'A clear, faintly green dry martini.',
  cosmo: 'A pink cosmopolitan.',
  espresso: 'A dark espresso martini with a tan foam cap.',
  blue: 'An electric blue curaçao cocktail.',
  manhattan: 'A deep red-amber manhattan.',
  apple: 'A sour apple green cocktail.',
} as const;
const DRINK_TINT: Record<keyof typeof DRINKS, string> = { gin: '#dfe9c9', cosmo: '#e8527a', espresso: '#2a1710', blue: '#1f9be0', manhattan: '#a3331c', apple: '#9ad53a' };
const LIPS = {
  red: 'Classic pillar-box red.',
  plum: 'Deep plum, nearly black cherry.',
  coral: 'Soft coral pink.',
  black: 'Black, a goth kiss.',
  none: 'No lipstick mark at all: the rim is clean.',
} as const;
const LIP_TINT: Record<Exclude<keyof typeof LIPS, 'none'>, string> = { red: '#c8102e', plum: '#5e1639', coral: '#f0707a', black: '#18141a' };

const radiusAt = (profile: Profile, y: number) => {
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1], [r1, y1] = profile[i];
    if (y <= y1) return mix(r0, r1, Math.max(0, (y - y0) / (y1 - y0)));
  }
  return profile[profile.length - 1][0];
};

function texture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    glass: choice('What kind of glass is it?', GLASSES),
    drink: choice('What was the drink?', DRINKS),
    left: score('How much of the drink is left?', ['Drained to a film in the bottom', 'A last mouthful', 'Half', 'Barely sipped, still nearly full']),
    garnish: choice('What garnish is in it?', {
      olive: 'Green olives speared on a cocktail pick resting across the glass.',
      twist: 'A curl of lemon peel hooked over the rim.',
      cherry: 'A dark cherry on its stalk sunk in the bottom.',
      beans: 'Three coffee beans floating on top.',
      none: 'Nothing, or it has been eaten.',
    }),
    lipstick: choice('What colour is the lipstick print on the rim?', LIPS),
    companion: choice('Is there another glass with it?', {
      none: 'No: one glass, drunk alone.',
      untouched: 'A second identical drink, full and untouched: someone never came, or never drank.',
      toppled: 'A second glass knocked over on its side in a puddle.',
      rounds: 'Two more drained glasses pushed together: it has been a long night.',
    }),
    behind: choice('What has been left beside it?', {
      nothing: 'Nothing.',
      napkin: 'A cocktail napkin with a phone number written on it.',
      earring: 'A single gold hoop earring.',
      cash: 'A few folded notes tucked under the foot of the glass.',
      key: 'A hotel room key on a diamond-shaped fob.',
      lipstick: 'The lipstick itself, uncapped.',
    }),
    under: choice('What does it stand on?', {
      bare: 'Straight on the bar.',
      coaster: 'A round paper coaster with a wet ring.',
      napkin: 'A square white cocktail napkin.',
      tray: 'A small oval silver tray.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#dcecf0', transparent: true, opacity: 0.34, roughness: 0.04, side: THREE.DoubleSide });
    const rimMat = new THREE.MeshStandardMaterial({ color: '#f2fbfd', roughness: 0.05, transparent: true, opacity: 0.75 });
    const tint = new THREE.Color(DRINK_TINT[a.drink]);
    const drinkMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.08, emissive: tint, emissiveIntensity: a.drink === 'espresso' ? 0 : mix(0.12, 0.32, mood.cheer) });
    const bowl = BOWLS[a.glass];
    const bottom = bowl[0][1], top = bowl[bowl.length - 1][1];
    const lathe = (profile: Profile, material: THREE.Material, segments = 40) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
      mesh.castShadow = true;
      return mesh;
    };

    const makeGlass = (fill: number, lips: boolean, garnish: typeof a.garnish) => {
      const g = new THREE.Group();
      g.add(lathe([[0, 0], [0.036, 0], [0.036, 0.003], [0.008, 0.007], [0.004, 0.014], ...bowl], glassMat));
      // A solid stem and a bright rim so the glass holds its outline against pale paper.
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, bottom - 0.01, 8), rimMat);
      stem.position.y = bottom / 2 + 0.004;
      const rimR = bowl[bowl.length - 1][0];
      const rim = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.0013, 6, 48), a.glass === 'margarita' ? new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }) : rimMat);
      if (a.glass === 'margarita') rim.scale.z = 2.4;
      rim.rotation.x = Math.PI / 2; rim.position.y = top;
      const foot = new THREE.Mesh(new THREE.TorusGeometry(0.0355, 0.0012, 6, 40), rimMat);
      foot.rotation.x = Math.PI / 2; foot.position.y = 0.002;
      g.add(stem, rim, foot);

      const level = bottom + (top - bottom) * mix(0.1, 0.9, fill);
      const steps = 10;
      const liquid: [number, number][] = [[0, bottom + 0.002]];
      for (let i = 0; i <= steps; i++) { const y = mix(bottom + 0.002, level, i / steps); liquid.push([Math.max(0.001, radiusAt(bowl, y) - 0.0014), y]); }
      liquid.push([0, level]);
      g.add(lathe(liquid, drinkMat, 32));
      const surface = radiusAt(bowl, level) - 0.0016;
      if (a.drink === 'espresso') {
        const crema = new THREE.Mesh(new THREE.CylinderGeometry(surface, Math.max(0.001, radiusAt(bowl, level - 0.004) - 0.0016), 0.004, 28), new THREE.MeshStandardMaterial({ color: '#c9a377', roughness: 0.8 }));
        crema.position.y = level; g.add(crema);
      }

      if (garnish === 'olive') {
        const pick = new THREE.Group();
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.12, 6), new THREE.MeshStandardMaterial({ color: '#c9a86a' }));
        stick.castShadow = true;
        pick.add(stick);
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d83a4a' : '#2f2f35' }));
        knot.position.y = 0.06; pick.add(knot);
        const olives = fill > 0.7 ? 3 : fill > 0.3 ? 2 : 1;
        for (let i = 0; i < olives; i++) {
          const olive = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 14, 10), new THREE.MeshStandardMaterial({ color: '#7d8f2e', roughness: 0.3 }));
          olive.scale.y = 1.25; olive.position.y = -0.045 + i * 0.021; olive.castShadow = true;
          const pimento = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshStandardMaterial({ color: '#d1342a' }));
          pimento.position.y = -0.0075; olive.add(pimento);
          pick.add(olive);
        }
        // Lean it from the bottom of the bowl out over the rim.
        const lean = Math.atan2(rimR * 0.95, top - bottom) * 0.92;
        const turn = 1.9 + random() * 1.2;
        pick.rotation.set(0, turn, -lean, 'YXZ');
        const mid = mix(bottom, top, 0.62);
        pick.position.set(Math.cos(turn) * Math.sin(lean) * 0.035 * 1, mid, -Math.sin(turn) * Math.sin(lean) * 0.035);
        g.add(pick);
      } else if (garnish === 'twist') {
        const turn = 2 + random() * 1.5;
        const points = Array.from({ length: 16 }, (_u, k) => {
          const t = k / 15, spin = t * Math.PI * 3.2;
          return new THREE.Vector3(rimR + Math.cos(spin) * 0.008 - 0.004, top + 0.006 - t * 0.05 + Math.sin(t * Math.PI) * 0.012, Math.sin(spin) * 0.008);
        });
        const peel = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.0035, 5), new THREE.MeshStandardMaterial({ color: '#f2cf35', roughness: 0.55 }));
        peel.scale.z = 1; peel.rotation.y = turn; peel.castShadow = true;
        g.add(peel);
      } else if (garnish === 'cherry') {
        const y = Math.max(bottom + 0.018, Math.min(level - 0.004, bottom + 0.03));
        const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.009, 14, 10), new THREE.MeshStandardMaterial({ color: '#7a0f1f', roughness: 0.15 }));
        cherry.position.set(0.003, y, 0.002); g.add(cherry);
        const stalk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.003, y + 0.008, 0.002), new THREE.Vector3(0.012, y + 0.03, 0.006), new THREE.Vector3(0.028, y + 0.045, 0.004)]), 12, 0.0008, 5), new THREE.MeshStandardMaterial({ color: '#6a4a2a' }));
        g.add(stalk);
      } else if (garnish === 'beans') {
        for (let i = 0; i < 3; i++) {
          const bean = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#3a2114', roughness: 0.4 }));
          const t = i * 2.1 + 0.4;
          bean.scale.set(0.0052, 0.003, 0.0036); bean.rotation.y = -t;
          bean.position.set(Math.cos(t) * Math.min(0.008, surface * 0.4), level + 0.003, Math.sin(t) * Math.min(0.008, surface * 0.4));
          g.add(bean);
        }
      }

      if (lips && a.lipstick !== 'none') {
        const colour = LIP_TINT[a.lipstick];
        const smear = mood.wear;
        const map = texture(128, 96, (c) => {
          c.clearRect(0, 0, 128, 96);
          c.fillStyle = colour;
          // An upper and a lower lip, broken by creases.
          c.beginPath(); c.moveTo(8, 44); c.quadraticCurveTo(40, 2, 64, 22); c.quadraticCurveTo(88, 2, 120, 44); c.quadraticCurveTo(64, 34, 8, 44); c.fill();
          c.beginPath(); c.moveTo(12, 52); c.quadraticCurveTo(64, 44, 116, 52); c.quadraticCurveTo(64, 110, 12, 52); c.fill();
          if (smear > 0.5) { c.globalAlpha = 0.55; c.fillRect(70, 30, 58 * smear, 30); c.globalAlpha = 1; }
          c.globalCompositeOperation = 'destination-out';
          c.lineWidth = 2.2;
          for (let i = 0; i < 13; i++) { const x = 14 + i * 8.2 + random() * 3; c.beginPath(); c.moveTo(x, 6); c.lineTo(x + (random() - 0.5) * 8, 92); c.stroke(); }
        });
        const height = Math.min(0.026, (top - bottom) * 0.4);
        const rTop = radiusAt(bowl, top) + 0.0009, rLow = radiusAt(bowl, top - height) + 0.0009;
        const arc = 0.042 / rTop;
        const angle = (random() < 0.5 ? -1 : 1) * mix(0.55, 0.95, random());
        const print = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rLow, height, 14, 1, true, angle - arc / 2, arc), new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }));
        print.position.y = top - height / 2 + 0.001;
        g.add(print);
      }
      return g;
    };

    // What it stands on.
    let baseY = 0;
    if (a.under === 'coaster') {
      baseY = 0.003;
      s.cylinder(0.052, 0.052, 0.003, [0, 0.0015, 0], s.material('#efe8d6', { roughness: 0.95 }), 36);
      s.ring(0.047, 0.0012, [0, 0.0031, 0], s.material(mood.cheer > 0.5 ? '#c8463c' : '#2f4a6b')).rotation.x = Math.PI / 2;
      s.ring(0.037, 0.0022, [0.004, 0.0031, 0.003], new THREE.MeshStandardMaterial({ color: '#b9ad8f', roughness: 0.3 })).rotation.x = Math.PI / 2;
    } else if (a.under === 'napkin') {
      baseY = 0.002;
      const paper = s.material('#f6f3ea', { roughness: 1 });
      const napkin = s.box([0.125, 0.002, 0.125], [0, 0.001, 0], paper);
      napkin.rotation.y = 0.3 + random() * 0.6;
    } else if (a.under === 'tray') {
      baseY = 0.005;
      const tray = s.lathe([[0, 0], [0.1, 0], [0.108, 0.01], [0.111, 0.01], [0.102, 0.004], [0, 0.004]], new THREE.MeshStandardMaterial({ color: '#cfd4d6', metalness: 0.9, roughness: 0.22 + mood.wear * 0.3, side: THREE.DoubleSide }));
      tray.scale.x = a.companion === 'none' ? 1.25 : 1.9;
      tray.position.x = a.companion === 'none' ? 0 : 0.06;
    }

    const hero = makeGlass(a.left, true, a.garnish);
    hero.position.y = baseY;
    hero.rotation.y = 0;
    s.root.add(hero);

    if (a.companion === 'untouched') {
      const other = makeGlass(1, false, a.garnish === 'none' ? 'olive' : a.garnish);
      other.position.set(0.135, a.under === 'tray' ? baseY : 0, -0.03);
      s.root.add(other);
    } else if (a.companion === 'toppled') {
      const other = makeGlass(0, false, 'none');
      other.rotation.set(0, 0.5 + random() * 0.8, Math.PI / 2 - 0.12, 'YXZ');
      other.position.set(0.14, 0, 0.02);
      s.root.add(other);
      other.updateMatrixWorld(true);
      other.position.y = (a.under === 'tray' ? baseY : 0) - new THREE.Box3().setFromObject(other).min.y;
      const pool = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.05, transparent: true, opacity: 0.75 });
      for (let i = 0; i < 4; i++) {
        const blot = s.cylinder(1, 1, 0.0012, [0.17 + random() * 0.06, (a.under === 'tray' ? baseY : 0) + 0.0008 + i * 0.0001, 0.05 + random() * 0.05], pool, 20);
        blot.scale.set(0.02 + random() * 0.03, 1, 0.015 + random() * 0.025);
        blot.castShadow = false;
      }
    } else if (a.companion === 'rounds') {
      for (let i = 0; i < 2; i++) {
        const other = makeGlass(i ? 0.02 : 0.12, i === 0 && mood.density > 0.5, 'none');
        other.position.set(0.12 + i * 0.075, a.under === 'tray' ? baseY : 0, -0.05 + i * 0.07);
        other.rotation.y = random() * 6;
        s.root.add(other);
      }
    }

    // What was left behind, in front and to the left.
    const at: [number, number, number] = [-0.1, 0, 0.055];
    if (a.behind === 'napkin') {
      const digits = Array.from({ length: 7 }, () => Math.floor(random() * 10)).join('');
      const map = texture(256, 256, (c) => {
        c.fillStyle = '#f7f4ea'; c.fillRect(0, 0, 256, 256);
        c.strokeStyle = '#e4dfd0'; c.lineWidth = 3; c.strokeRect(14, 14, 228, 228);
        c.fillStyle = a.lipstick === 'none' ? '#1d2a5a' : LIP_TINT[a.lipstick];
        c.font = 'italic bold 46px cursive'; c.textAlign = 'center';
        c.save(); c.translate(128, 128); c.rotate(-0.12);
        c.fillText('call me', 0, -30, 220); c.fillText(`${digits.slice(0, 3)}-${digits.slice(3)}`, 0, 30, 220);
        c.restore();
      });
      const note = s.mesh(new THREE.PlaneGeometry(0.115, 0.115), new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide }), [at[0] - 0.01, 0.0026, at[2] + 0.01]);
      note.rotation.set(-Math.PI / 2, 0, -0.35 + random() * 0.3);
      s.box([0.115, 0.002, 0.115], [at[0] - 0.01, 0.001, at[2] + 0.01], s.material('#f1eee4', { roughness: 1 })).rotation.y = note.rotation.z;
    } else if (a.behind === 'earring') {
      const gold = new THREE.MeshStandardMaterial({ color: '#e0b63c', metalness: 0.9, roughness: 0.2 });
      const hoop = s.ring(0.019, 0.0016, [at[0] + 0.02, 0.0018, at[2]], gold, Math.PI * 1.85);
      hoop.rotation.set(Math.PI / 2, 0, random() * 6);
      s.ball([0.004, 0.004, 0.004], [at[0] + 0.038, 0.004, at[2] + 0.004], new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.15 }), 10);
    } else if (a.behind === 'cash') {
      const note = s.material(mood.warmth > 0.6 ? '#b9a064' : '#7fa27a', { roughness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const bill = s.box([0.13, 0.0012, 0.058], [-0.045 + i * 0.006, baseY + 0.0045 + i * 0.0013 - 0.004, 0.022 + i * 0.004], note);
        bill.rotation.y = 0.5 + i * 0.12 + random() * 0.1;
        s.box([0.03, 0.0014, 0.03], [-0.045 + i * 0.006 - 0.03, baseY + 0.0048 + i * 0.0013 - 0.004, 0.04 + i * 0.004], s.material('#e6e2c8')).rotation.y = bill.rotation.y;
      }
    } else if (a.behind === 'key') {
      const brass = new THREE.MeshStandardMaterial({ color: '#c9a03a', metalness: 0.85, roughness: 0.3 });
      const fob = s.box([0.05, 0.005, 0.05], [at[0], 0.0025, at[2]], s.material(mood.cheer > 0.5 ? '#a3262a' : '#1f3d33', { roughness: 0.4 }));
      fob.rotation.y = Math.PI / 4 + (random() - 0.5) * 0.3;
      const number = s.label(String(100 + Math.floor(random() * 800)), 0.03, 0.016, [at[0], 0.0052, at[2]], '#f0dc9a', mood.cheer > 0.5 ? '#a3262a' : '#1f3d33');
      number.rotation.set(-Math.PI / 2, 0, 0.2);
      s.ring(0.009, 0.0012, [at[0] + 0.036, 0.002, at[2] + 0.012], brass).rotation.x = Math.PI / 2;
      s.rod([at[0] + 0.045, 0.002, at[2] + 0.015], [at[0] + 0.095, 0.002, at[2] + 0.035], 0.0022, brass);
      s.cylinder(0.009, 0.009, 0.003, [at[0] + 0.05, 0.002, at[2] + 0.017], brass, 12);
      for (let i = 0; i < 3; i++) s.box([0.004, 0.003, 0.006 + (i % 2) * 0.003], [at[0] + 0.078 + i * 0.006, 0.002, at[2] + 0.034 + i * 0.0025], brass).rotation.y = -0.38;
    } else if (a.behind === 'lipstick') {
      const colour = a.lipstick === 'none' ? '#c8102e' : LIP_TINT[a.lipstick];
      const gold = new THREE.MeshStandardMaterial({ color: '#d9b548', metalness: 0.9, roughness: 0.22 });
      s.cylinder(0.0095, 0.0095, 0.04, [at[0], 0.02, at[2]], new THREE.MeshStandardMaterial({ color: '#17171b', roughness: 0.25 }), 16);
      s.cylinder(0.0085, 0.0085, 0.016, [at[0], 0.048, at[2]], gold, 16);
      const bullet = s.cylinder(0.004, 0.0068, 0.02, [at[0], 0.065, at[2]], new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35 }), 14);
      bullet.rotation.z = 0.12;
      const cap = s.cylinder(0.0105, 0.0105, 0.042, [at[0] + 0.04, 0.0105, at[2] + 0.03], new THREE.MeshStandardMaterial({ color: '#17171b', roughness: 0.25 }), 16);
      cap.rotation.set(Math.PI / 2, 0, 0.6 + random());
    }

    return s.finish();
  },
});
