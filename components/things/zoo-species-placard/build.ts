import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const oval = (c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2); c.fill(); };

const SPECIES = {
  chimpanzee: 'A chimpanzee: dark face, big ears, pale muzzle.',
  gorilla: 'A western gorilla: black domed head with a crest and heavy brow.',
  orangutan: 'A Bornean orangutan: rust-orange hair and wide dark cheek pads.',
  mandrill: 'A mandrill: scarlet nose stripe between ridged blue cheeks, yellow beard.',
  baboon: 'A hamadryas baboon: long dark muzzle inside a silver-grey mane.',
  gibbon: 'A white-handed gibbon: small black face in a ring of white fur.',
} as const;
type Species = keyof typeof SPECIES;
const FACTS: Record<Species, { name: string; latin: string; asia: boolean; range: [number, number, number, number][]; line: string }> = {
  chimpanzee: { name: 'CHIMPANZEE', latin: 'Pan troglodytes', asia: false, range: [[0.32, 0.47, 0.13, 0.05], [0.5, 0.52, 0.12, 0.06]], line: 'Uses tools. Shares 98% of your DNA.' },
  gorilla: { name: 'WESTERN GORILLA', latin: 'Gorilla gorilla', asia: false, range: [[0.47, 0.52, 0.07, 0.06]], line: 'A silverback leads the family troop.' },
  orangutan: { name: 'ORANGUTAN', latin: 'Pongo pygmaeus', asia: true, range: [[0.62, 0.52, 0.13, 0.13], [0.24, 0.5, 0.05, 0.1]], line: 'Person of the forest. Lives alone.' },
  mandrill: { name: 'MANDRILL', latin: 'Mandrillus sphinx', asia: false, range: [[0.44, 0.53, 0.045, 0.05]], line: 'Brightest face of any mammal.' },
  baboon: { name: 'HAMADRYAS BABOON', latin: 'Papio hamadryas', asia: false, range: [[0.75, 0.37, 0.07, 0.06]], line: 'Sacred to the ancient Egyptians.' },
  gibbon: { name: 'LAR GIBBON', latin: 'Hylobates lar', asia: true, range: [[0.3, 0.26, 0.09, 0.16]], line: 'Sings duets at dawn. Mates for life.' },
};

function portrait(c: Ctx, kind: Species, x: number, y: number, r: number, wash: number) {
  const fill = (colour: string) => { c.fillStyle = colour; };
  const eyes = (dy: number, dx: number, size: number, iris = '#b8752a') => {
    for (const side of [-1, 1]) { fill(iris); oval(c, x + side * dx * r, y + dy * r, size * r, size * r * 0.8); fill('#0b0807'); oval(c, x + side * dx * r, y + dy * r, size * r * 0.5, size * r * 0.5); }
  };
  if (kind === 'chimpanzee') {
    fill('#1b1614'); oval(c, x, y - 0.05 * r, 0.62 * r, 0.7 * r);
    fill('#7c5a48'); oval(c, x - 0.68 * r, y - 0.08 * r, 0.2 * r, 0.3 * r); oval(c, x + 0.68 * r, y - 0.08 * r, 0.2 * r, 0.3 * r);
    fill('#3a2c26'); oval(c, x, y - 0.02 * r, 0.47 * r, 0.52 * r);
    fill('#8a6a55'); oval(c, x, y + 0.34 * r, 0.4 * r, 0.33 * r);
    fill('#1b1614'); oval(c, x, y - 0.3 * r, 0.44 * r, 0.09 * r);
    eyes(-0.15, 0.2, 0.085);
    fill('#1b1614'); oval(c, x - 0.06 * r, y + 0.16 * r, 0.035 * r, 0.03 * r); oval(c, x + 0.06 * r, y + 0.16 * r, 0.035 * r, 0.03 * r);
    c.strokeStyle = '#2a1c18'; c.lineWidth = r * 0.04; c.beginPath(); c.arc(x, y + 0.2 * r, 0.32 * r, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
  } else if (kind === 'gorilla') {
    fill('#15141a'); oval(c, x, y + 0.05 * r, 0.72 * r, 0.7 * r); oval(c, x, y - 0.5 * r, 0.4 * r, 0.45 * r);
    fill('#2b2a30'); oval(c, x, y + 0.08 * r, 0.5 * r, 0.52 * r);
    fill('#0d0c10'); oval(c, x, y - 0.2 * r, 0.52 * r, 0.11 * r);
    eyes(-0.08, 0.2, 0.07, '#7a4a22');
    fill('#0d0c10'); oval(c, x, y + 0.18 * r, 0.22 * r, 0.14 * r);
    fill('#3a383e'); oval(c, x - 0.09 * r, y + 0.19 * r, 0.06 * r, 0.05 * r); oval(c, x + 0.09 * r, y + 0.19 * r, 0.06 * r, 0.05 * r);
    c.strokeStyle = '#0d0c10'; c.lineWidth = r * 0.05; c.beginPath(); c.moveTo(x - 0.28 * r, y + 0.46 * r); c.lineTo(x + 0.28 * r, y + 0.46 * r); c.stroke();
  } else if (kind === 'orangutan') {
    fill('#b4521c'); oval(c, x, y - 0.1 * r, 0.7 * r, 0.8 * r);
    c.strokeStyle = '#d06a22'; c.lineWidth = r * 0.05;
    for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(x + (i - 5.5) * 0.11 * r, y - 0.85 * r); c.lineTo(x + (i - 5.5) * 0.14 * r, y + 0.5 * r); c.stroke(); }
    fill('#3e3230'); oval(c, x - 0.48 * r, y + 0.05 * r, 0.3 * r, 0.48 * r); oval(c, x + 0.48 * r, y + 0.05 * r, 0.3 * r, 0.48 * r);
    fill('#4d3d38'); oval(c, x, y, 0.36 * r, 0.5 * r);
    fill('#a8806a'); oval(c, x, y + 0.3 * r, 0.3 * r, 0.26 * r);
    eyes(-0.16, 0.14, 0.06, '#6b3d1a');
    fill('#e07a2a'); oval(c, x, y + 0.66 * r, 0.26 * r, 0.16 * r);
    c.strokeStyle = '#33241f'; c.lineWidth = r * 0.035; c.beginPath(); c.moveTo(x - 0.18 * r, y + 0.36 * r); c.lineTo(x + 0.18 * r, y + 0.36 * r); c.stroke();
  } else if (kind === 'mandrill') {
    fill('#6b5a3a'); oval(c, x, y - 0.1 * r, 0.66 * r, 0.76 * r);
    fill('#e9c53a'); c.beginPath(); c.moveTo(x - 0.45 * r, y + 0.3 * r); c.lineTo(x, y + 0.98 * r); c.lineTo(x + 0.45 * r, y + 0.3 * r); c.fill();
    fill('#2e62c8'); oval(c, x - 0.2 * r, y + 0.12 * r, 0.17 * r, 0.42 * r); oval(c, x + 0.2 * r, y + 0.12 * r, 0.17 * r, 0.42 * r);
    c.strokeStyle = '#9cc0f4'; c.lineWidth = r * 0.03;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + side * (0.12 + i * 0.07) * r, y - 0.2 * r); c.lineTo(x + side * (0.14 + i * 0.08) * r, y + 0.44 * r); c.stroke(); }
    fill('#d8202a'); oval(c, x, y + 0.12 * r, 0.075 * r, 0.44 * r); oval(c, x, y + 0.5 * r, 0.17 * r, 0.11 * r);
    eyes(-0.38, 0.17, 0.07, '#d98a1c');
    fill('#3b2f1e'); oval(c, x, y - 0.5 * r, 0.42 * r, 0.09 * r);
  } else if (kind === 'baboon') {
    fill('#b9bdbb'); oval(c, x, y, 0.82 * r, 0.82 * r);
    c.strokeStyle = '#8e9391'; c.lineWidth = r * 0.04;
    for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(t) * 0.4 * r, y + Math.sin(t) * 0.4 * r); c.lineTo(x + Math.cos(t) * 0.8 * r, y + Math.sin(t) * 0.8 * r); c.stroke(); }
    fill('#c98f84'); oval(c, x, y - 0.05 * r, 0.34 * r, 0.4 * r);
    fill('#8c5f58'); oval(c, x, y + 0.26 * r, 0.2 * r, 0.42 * r);
    fill('#4a3531'); oval(c, x, y + 0.62 * r, 0.16 * r, 0.08 * r);
    eyes(-0.2, 0.14, 0.055, '#8a5a22');
    fill('#6e4d47'); oval(c, x, y - 0.33 * r, 0.3 * r, 0.06 * r);
  } else {
    fill('#e9e2cf'); oval(c, x, y, 0.62 * r, 0.66 * r);
    fill('#191715'); oval(c, x, y + 0.02 * r, 0.42 * r, 0.44 * r);
    fill('#2d2925'); oval(c, x, y + 0.2 * r, 0.22 * r, 0.18 * r);
    eyes(-0.08, 0.17, 0.085, '#7a5a2a');
    fill('#e9e2cf'); oval(c, x - 0.75 * r, y + 0.7 * r, 0.14 * r, 0.1 * r); oval(c, x + 0.75 * r, y + 0.7 * r, 0.14 * r, 0.1 * r);
  }
  if (wash > 0) { c.fillStyle = `rgba(190,200,190,${wash})`; c.fillRect(x - r * 1.05, y - r * 1.05, r * 2.1, r * 2.1); }
}

const AFRICA: [number, number][] = [[0.2, 0.12], [0.42, 0.06], [0.62, 0.1], [0.74, 0.2], [0.82, 0.34], [0.96, 0.36], [0.82, 0.52], [0.74, 0.7], [0.62, 0.92], [0.52, 0.94], [0.46, 0.72], [0.42, 0.52], [0.28, 0.48], [0.12, 0.44], [0.06, 0.3]];

export default defineThing({
  questions: {
    species: choice('Which animal is pictured on the sign?', SPECIES),
    era: choice('What era is the sign from?', {
      enamel: 'Hand-lettered cream enamel on a cast-iron post, green border, 1950s municipal pride.',
      seventies: 'A 1970s photo panel: brown and orange bands, a sun-faded photograph, timber posts.',
      backlit: 'A modern backlit panel: charcoal glass glowing softly on a slim steel leg, with a square code to scan.',
    }),
    status: choice('What conservation status does the bar show?', {
      common: 'Least concern: the green end of the bar, plenty left.',
      vulnerable: 'Vulnerable: the yellow middle, numbers falling.',
      endangered: 'Endangered: orange, in real trouble.',
      critical: 'Critically endangered: red, a few thousand at most.',
      'extinct-wild': 'Extinct in the wild: the dark end, alive only behind glass like this.',
    }),
    note: choice('What has been added to the sign?', {
      none: 'Nothing; just the printed facts.',
      born: 'A proud strip: BORN HERE, with a date and a pet name in quotes.',
      loan: 'A strip saying the animal is ON LOAN from another zoo.',
      empty: 'A paper notice taped across it: ENCLOSURE EMPTY.',
      memory: 'A black band with gold letters: IN MEMORY OF, a name and two years.',
    }),
    left: choice('What have visitors left on it?', {
      nothing: 'Nothing.',
      gum: 'Chewed gum pressed onto the portrait and the edge.',
      flowers: 'A small bunch of flowers laid against the post, one stem tucked into the frame.',
      stickers: 'A child\'s stickers: gold stars and a smiley, placed with care.',
      scratched: 'Initials and a moustache scratched into the face with a key.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fact = FACTS[a.species];
    const CW = 800, CH = 580;
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const c = canvas.getContext('2d')!;
    const era = a.era;
    const theme = {
      enamel: { paper: '#f1e7c8', ink: '#1f3a2c', accent: '#1f5a3c', sea: '#cfe0d8', land: '#e2d3a0', font: 'serif', jungle: '#3c7a52' },
      seventies: { paper: '#e9d9b0', ink: '#3d2a1c', accent: '#c9622a', sea: '#d8c9a0', land: '#8a6a3c', font: 'sans-serif', jungle: '#6a7a3a' },
      backlit: { paper: '#1c2226', ink: '#eef6f2', accent: '#37d0a0', sea: '#252e34', land: '#52656a', font: 'sans-serif', jungle: '#12423a' },
    }[era];
    c.fillStyle = theme.paper; c.fillRect(0, 0, CW, CH);
    if (era === 'seventies') { c.fillStyle = '#7a4a26'; c.fillRect(0, 0, CW, 96); c.fillStyle = theme.accent; c.fillRect(0, 96, CW, 16); c.fillStyle = '#e0a23a'; c.fillRect(0, 112, CW, 10); }
    if (era === 'enamel') { c.strokeStyle = theme.accent; c.lineWidth = 14; c.strokeRect(16, 16, CW - 32, CH - 32); c.lineWidth = 3; c.strokeRect(34, 34, CW - 68, CH - 68); }
    if (era === 'backlit') { c.fillStyle = theme.accent; c.fillRect(0, 0, CW, 10); }

    // Portrait.
    const px = 190, py = 300, pr = 128;
    c.save();
    c.beginPath();
    if (era === 'enamel') c.ellipse(px, py, pr * 1.1, pr * 1.22, 0, 0, Math.PI * 2); else c.rect(px - pr * 1.12, py - pr * 1.22, pr * 2.24, pr * 2.44);
    c.clip();
    c.fillStyle = theme.jungle; c.fillRect(0, 0, CW, CH);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 9; i++) oval(c, px + (random() - 0.5) * pr * 2.4, py + (random() - 0.5) * pr * 2.6, 30 + random() * 40, 12 + random() * 10, random() * 3);
    portrait(c, a.species, px, py, pr, era === 'seventies' ? mix(0.18, 0.5, mood.wear) : 0);
    c.restore();
    c.strokeStyle = era === 'backlit' ? theme.accent : era === 'seventies' ? '#fbf6e6' : theme.ink;
    c.lineWidth = era === 'seventies' ? 12 : 5;
    c.beginPath();
    if (era === 'enamel') c.ellipse(px, py, pr * 1.1, pr * 1.22, 0, 0, Math.PI * 2); else c.rect(px - pr * 1.12, py - pr * 1.22, pr * 2.24, pr * 2.44);
    c.stroke();

    // Lettering.
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = era === 'seventies' ? '#fbf1d2' : theme.ink;
    c.font = `${era === 'enamel' ? 'italic ' : ''}bold ${era === 'seventies' ? 58 : 54}px ${theme.font}`;
    c.fillText(era === 'seventies' ? fact.name.toLowerCase() : fact.name, era === 'seventies' ? 40 : 370, era === 'seventies' ? 52 : 86, era === 'seventies' ? 720 : 395);
    c.fillStyle = theme.ink;
    c.font = `italic 30px ${theme.font}`;
    c.fillText(fact.latin, 370, 140, 390);
    c.font = `22px ${theme.font}`;
    c.fillText(fact.line, 370, 178, 395);

    // Range map.
    const mx = 372, my = 204, mw = 210, mh = 232;
    c.fillStyle = theme.sea; c.fillRect(mx, my, mw, mh);
    c.fillStyle = theme.land;
    if (!fact.asia) {
      c.beginPath();
      AFRICA.forEach(([u, v], i) => (i === 0 ? c.moveTo(mx + u * mw, my + v * mh) : c.lineTo(mx + u * mw, my + v * mh)));
      c.closePath(); c.fill();
      oval(c, mx + 0.9 * mw, my + 0.76 * mh, 0.035 * mw, 0.09 * mh, 0.3);
    } else {
      oval(c, mx + 0.3 * mw, my + 0.2 * mh, 0.2 * mw, 0.2 * mh);
      oval(c, mx + 0.3 * mw, my + 0.42 * mh, 0.05 * mw, 0.14 * mh, 0.2);
      oval(c, mx + 0.24 * mw, my + 0.6 * mh, 0.06 * mw, 0.2 * mh, -0.7);
      oval(c, mx + 0.62 * mw, my + 0.54 * mh, 0.17 * mw, 0.16 * mh);
      oval(c, mx + 0.5 * mw, my + 0.84 * mh, 0.2 * mw, 0.035 * mh);
      oval(c, mx + 0.86 * mw, my + 0.3 * mh, 0.05 * mw, 0.12 * mh);
    }
    c.fillStyle = 'rgba(222,40,40,0.88)';
    for (const [u, v, ru, rv] of fact.range) oval(c, mx + u * mw, my + v * mh, ru * mw, rv * mh);
    c.strokeStyle = theme.ink; c.lineWidth = 3; c.strokeRect(mx, my, mw, mh);
    c.fillStyle = theme.ink; c.font = `bold 18px ${theme.font}`;
    c.fillText(fact.asia ? 'SOUTH-EAST ASIA' : 'AFRICA', mx + 6, my + mh - 14);

    // Conservation status bar, worst at the left.
    const levels = [['EX', '#111111'], ['EW', '#4a2a5a'], ['CR', '#d3202a'], ['EN', '#f07a1e'], ['VU', '#f2c81e'], ['NT', '#a8cc3a'], ['LC', '#3aa04a']] as const;
    const chosen = { 'extinct-wild': 1, critical: 2, endangered: 3, vulnerable: 4, common: 6 }[a.status];
    const bx = 612, by = 222;
    c.textAlign = 'center';
    levels.forEach(([code, colour], i) => {
      const y = by + i * 30, on = i === chosen;
      c.fillStyle = colour; c.globalAlpha = on ? 1 : era === 'backlit' ? 0.45 : 0.4;
      oval(c, bx + 22, y, on ? 20 : 12, on ? 20 : 12);
      c.globalAlpha = 1;
      if (on) {
        c.strokeStyle = theme.ink; c.lineWidth = 4; c.beginPath(); c.arc(bx + 22, y, 24, 0, Math.PI * 2); c.stroke();
        c.fillStyle = i === 4 ? '#1b1b1b' : '#ffffff'; c.font = 'bold 17px sans-serif'; c.fillText(code, bx + 22, y + 1);
        c.fillStyle = theme.ink; c.textAlign = 'left'; c.font = `bold 19px ${theme.font}`;
        const words = ['EXTINCT', 'EXTINCT IN WILD', 'CRITICAL', 'ENDANGERED', 'VULNERABLE', 'NEAR THREAT', 'LEAST CONCERN'][i];
        c.fillText(words, bx + 52, y + 1, 128);
        c.textAlign = 'center';
      }
    });
    if (era === 'backlit') {
      const qx = 690, qy = 106;
      c.fillStyle = '#eef6f2'; c.fillRect(qx, qy - 60, 84, 84);
      c.fillStyle = '#1c2226';
      for (let i = 0; i < 7; i++) for (let k = 0; k < 7; k++) if (random() < 0.5 || (i < 2 && k < 2) || (i > 4 && k < 2) || (i < 2 && k > 4)) c.fillRect(qx + 7 + i * 10, qy - 53 + k * 10, 10, 10);
    }

    // Added note.
    c.textAlign = 'center';
    const pet = ['JOJO', 'BONGO', 'ROSIE', 'MAX', 'TILLY', 'PEPE', 'SAMSON', 'DOLLY'][Math.floor(random() * 8)];
    const year = 1958 + Math.floor(random() * 40);
    if (a.note === 'born' || a.note === 'loan' || a.note === 'memory') {
      const dark = a.note === 'memory';
      c.fillStyle = dark ? '#121212' : a.note === 'born' ? '#f4d23a' : '#dfe9f2';
      c.fillRect(40, 462, CW - 80, 78);
      c.strokeStyle = dark ? '#c9a24a' : '#1b1b1b'; c.lineWidth = 4; c.strokeRect(46, 468, CW - 92, 66);
      c.fillStyle = dark ? '#d9b65a' : '#1b1b1b';
      c.font = `bold 38px ${dark ? 'serif' : theme.font}`;
      const text = a.note === 'born' ? `BORN HERE ${year} · "${pet}"` : a.note === 'loan' ? 'ON LOAN FROM ANOTHER ZOO' : `IN MEMORY OF ${pet}  ${year} – ${year + 18 + Math.floor(random() * 25)}`;
      c.fillText(text, CW / 2, 502, CW - 120);
    }

    // Weather and time on the face.
    if (mood.wear > 0.15) {
      c.fillStyle = `rgba(232,226,208,${mood.wear * (era === 'backlit' ? 0.12 : 0.3)})`; c.fillRect(0, 0, CW, CH);
      c.fillStyle = era === 'enamel' ? '#5a2d16' : 'rgba(60,50,40,0.5)';
      for (let i = 0; i < Math.round(mood.wear * 16); i++) {
        const edge = random() < 0.7, x = edge ? (random() < 0.5 ? random() * 40 : CW - random() * 40) : random() * CW, y = random() * CH;
        oval(c, x, y, 5 + random() * 16, 4 + random() * 12, random() * 3);
        if (era === 'enamel') { c.globalAlpha = 0.35; c.fillRect(x - 2, y, 4, 30 + random() * 70); c.globalAlpha = 1; }
      }
    }
    if (a.left === 'scratched') {
      c.strokeStyle = era === 'backlit' ? '#dfe8e4' : '#f8f4e8'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(px - 60, py + 40); c.quadraticCurveTo(px, py + 5, px + 60, py + 40); c.stroke();
      c.beginPath(); c.moveTo(px - 60, py + 40); c.quadraticCurveTo(px - 90, py + 60, px - 80, py + 20); c.moveTo(px + 60, py + 40); c.quadraticCurveTo(px + 90, py + 60, px + 80, py + 20); c.stroke();
      c.font = 'bold 54px sans-serif'; c.strokeText(['J+K', 'DAZ', 'M ♥ T', 'KEV'][Math.floor(random() * 4)], 560, 400);
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(380 + random() * 300, 60 + random() * 100); c.lineTo(380 + random() * 300, 60 + random() * 100); c.stroke(); }
    }
    if (a.left === 'stickers') {
      const star = (x: number, y: number, r: number, rot: number) => {
        c.beginPath();
        for (let i = 0; i < 10; i++) { const t = rot + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.sin(t) * rr, y - Math.cos(t) * rr); }
        c.closePath(); c.fill();
      };
      c.fillStyle = '#f4c21e';
      for (let i = 0; i < 4; i++) star(px - 110 + i * 75 + random() * 20, py - 150 + random() * 30, 26, random());
      star(700, 420, 30, 0.2);
      c.fillStyle = '#ff5fa2'; oval(c, 320, 440, 34, 34);
      c.fillStyle = '#1b1b1b'; oval(c, 308, 432, 5, 6); oval(c, 332, 432, 5, 6);
      c.strokeStyle = '#1b1b1b'; c.lineWidth = 4; c.beginPath(); c.arc(320, 440, 18, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    // The lectern: board, frame and post(s).
    const BW = 0.72, BH = 0.52, tilt = 0.72, top = 1.05;
    const board = new THREE.Group();
    board.position.set(0, top, 0);
    board.rotation.x = -tilt;
    s.root.add(board);
    const metal = era === 'enamel' ? s.material('#22332b', { roughness: 0.5, metalness: 0.3 }) : era === 'seventies' ? s.material('#6b4a2c', { roughness: 0.85 }) : s.material('#aeb5b6', { roughness: 0.3, metalness: 0.85 });
    const back = s.box([BW + 0.05, BH + 0.05, era === 'backlit' ? 0.06 : 0.035], [0, 0, -0.02], metal);
    board.add(back);
    const glow = era === 'backlit' ? mix(0.35, 0.95, 1 - Math.abs(mood.daylight - 0.5) * 0.4) * (mood.wear > 0.8 ? 0.3 : 1) : 0;
    const face = s.mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: texture, roughness: era === 'seventies' ? 0.25 : 0.45, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: glow }), [0, 0, 0.012]);
    board.add(face);
    if (era === 'enamel') for (const x of [-1, 1]) for (const y of [-1, 1]) board.add(s.cylinder(0.012, 0.012, 0.012, [x * (BW / 2 - 0.02), y * (BH / 2 - 0.02), 0.014], s.material('#8d8a7a', { metalness: 0.7 }), 8).rotateX(Math.PI / 2));
    if (era === 'enamel') {
      s.cylinder(0.03, 0.04, top - 0.05, [0, (top - 0.05) / 2, -0.06], metal, 14);
      s.lathe([[0.16, 0], [0.15, 0.03], [0.07, 0.06], [0.05, 0.14], [0.065, 0.16], [0.04, 0.2]], metal, [0, 0, -0.06]);
      s.ball([0.05, 0.03, 0.05], [0, top - 0.12, -0.06], metal, 12);
      s.rod([0, top - 0.1, -0.06], [0, top - 0.02, -0.03], 0.03, metal);
    } else if (era === 'seventies') {
      for (const side of [-1, 1]) {
        s.box([0.09, top + 0.06, 0.09], [side * (BW / 2 - 0.08), (top + 0.06) / 2 - 0.1, -0.12], metal).rotation.x = -0.08;
        s.box([0.1, 0.03, 0.34], [side * (BW / 2 - 0.08), top - 0.07, -0.06], metal).rotation.x = -tilt + Math.PI / 2;
      }
      s.box([BW - 0.1, 0.06, 0.03], [0, 0.42, -0.1], metal);
    } else {
      s.box([0.1, top - 0.06, 0.025], [0, (top - 0.06) / 2, -0.07], metal);
      s.box([0.42, 0.016, 0.3], [0, 0.008, -0.04], metal);
      s.rod([0, top - 0.12, -0.07], [0, top - 0.02, -0.03], 0.03, metal);
    }

    const onBoard = (u: number, v: number, lift = 0.02) => board.localToWorld(new THREE.Vector3((u - 0.5) * BW, (0.5 - v) * BH, lift));
    s.root.updateMatrixWorld(true);
    if (a.note === 'empty') {
      const pc = document.createElement('canvas');
      pc.width = 512; pc.height = 256;
      const p = pc.getContext('2d')!;
      p.fillStyle = '#fbfaf2'; p.fillRect(0, 0, 512, 256);
      p.fillStyle = '#1b1b1b'; p.textAlign = 'center'; p.textBaseline = 'middle';
      p.font = 'bold 74px sans-serif'; p.fillText('ENCLOSURE', 256, 86, 470); p.fillText('EMPTY', 256, 172, 470);
      const pt = new THREE.CanvasTexture(pc);
      pt.colorSpace = THREE.SRGBColorSpace;
      const paper = s.mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.9, side: THREE.DoubleSide }), [0.04, -0.03, 0.022]);
      paper.rotation.z = 0.14 + (random() - 0.5) * 0.15;
      board.add(paper);
      for (const side of [-1, 1]) { const tape = s.box([0.1, 0.035, 0.002], [0.04 + side * 0.22, -0.03 + side * 0.035, 0.025], s.material('#d9c98f', { roughness: 0.4 })); tape.rotation.z = paper.rotation.z + Math.PI / 2 + 0.3; board.add(tape); }
    }
    if (a.left === 'gum') {
      const colours = ['#f29ac0', '#e9f0e2', '#8fd0c0', '#f2a0b8'];
      for (let i = 0; i < 4 + Math.round(mood.wear * 5); i++) {
        const onFace = i < 3;
        const p = onFace ? onBoard(0.1 + random() * 0.28, 0.3 + random() * 0.4, 0.018) : onBoard(random(), 1.02, 0.0);
        const r = 0.014 + random() * 0.01;
        s.ball([r, r * 0.55, r * 0.9], [p.x, p.y, p.z], s.material(colours[Math.floor(random() * colours.length)], { roughness: 0.5 }), 10).rotation.x = -tilt + Math.PI / 2;
      }
    }
    if (a.left === 'flowers') {
      const stem = s.material('#3f7a3a'), wrap = s.material('#f3efe4', { roughness: 0.9 });
      const bx0 = 0.2 * (random() < 0.5 ? -1 : 1);
      const cone = s.mesh(new THREE.ConeGeometry(0.09, 0.3, 12, 1, true), wrap, [bx0, 0.14, 0.16]);
      cone.rotation.set(Math.PI - 0.5, 0, bx0 > 0 ? 0.3 : -0.3);
      const petals = ['#f4d23a', '#f7f3ea', '#e85a8a', '#f08a2a', '#c9342f'];
      for (let i = 0; i < 9; i++) {
        const fx = bx0 + (random() - 0.5) * 0.16, fy = 0.26 + random() * 0.08, fz = 0.09 + random() * 0.1;
        s.rod([bx0, 0.1, 0.18], [fx, fy, fz], 0.004, stem);
        const colour = petals[Math.floor(random() * petals.length)];
        s.ball([0.03, 0.014, 0.03], [fx, fy, fz], s.material(colour, { roughness: 0.6 }), 10).rotation.x = 0.6;
        s.ball([0.012, 0.012, 0.012], [fx, fy + 0.008, fz + 0.006], s.material('#6b4a1c'), 8);
      }
      const tuck = onBoard(0.86, 0.92, 0.03), tip = onBoard(0.8, 0.5, 0.05);
      s.rod([tuck.x, tuck.y, tuck.z], [tip.x, tip.y, tip.z], 0.005, stem);
      s.ball([0.04, 0.02, 0.04], [tip.x, tip.y, tip.z], s.material('#f7f3ea', { roughness: 0.6 }), 10).rotation.x = -tilt + Math.PI / 2;
      s.ball([0.015, 0.014, 0.015], [tip.x, tip.y + 0.008, tip.z + 0.008], s.material('#f4c21e'), 8);
    }
    return s.finish({ footprint: 0.45 });
  },
});
