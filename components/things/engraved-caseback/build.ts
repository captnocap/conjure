import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { arcText, engraving, gearShape, circleHole, slab } from './bits';

const DEDICATIONS = {
  retirement: 'A retirement presentation: years of loyal service and the year he left.',
  wedding: 'Two initials joined by an ampersand over a wedding date.',
  love: 'Two or three private words from one person to another.',
  son: 'From a parent to a son on coming of age.',
  initials: 'Only three initials and a year, saying nothing else.',
  service: 'A name, rank and number, engraved by a soldier in case he was found.',
  blank: 'Nothing at all. It was never given to anyone.',
  erased: 'A dedication buffed away, leaving a dull oval and the ghost of letters.',
} as const;

export default defineThing({
  questions: {
    dedication: choice('What is engraved on it?', DEDICATIONS),
    side: choice('Which way up is it lying?', {
      inside: 'Dished side up, showing the inside: hallmarks, service scratches, and the words engraved privately where only a watchmaker would see.',
      outside: 'Domed side up, showing the polished back that sat against the wrist, with the dedication on it.',
      propped: 'Stood on its edge and leaned back against a block of boxwood, the engraved outside facing you like a tiny memorial.',
    }),
    metal: choice('What is it made of?', {
      steel: 'Stainless steel, grey and practical.',
      gold: 'Yellow gold, soft and warm.',
      rose: 'Rose gold.',
      silver: 'Silver, tarnishing toward grey-brown.',
      plated: 'Gold plate worn through to brass at the edges.',
    }),
    script: choice('How is the lettering cut?', {
      roman: 'Upright serif capitals, formal, a jeweller\'s machine engraving.',
      italic: 'Flowing italic script, cut by hand with flourishes.',
      block: 'Plain block letters, institutional.',
      scratched: 'Scratched by hand with a point, uneven and personal.',
    }),
    fitting: choice('What kind of back is it?', {
      screw: 'A screw back with six square notches for the case wrench.',
      snap: 'A thin snap back with a small pry lip on one side.',
      fluted: 'A screw back with a finely fluted edge all the way round.',
    }),
    services: score('How many times has a watchmaker scratched a service date inside?', ['Never opened before', 'Two or three', 'A crowded history of dates']),
    gasket: noul('Is the black rubber gasket with it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dull = mix(0.2, 0.55, mood.wear);
    const base = new THREE.Color({ steel: '#c4c9cd', gold: '#e3b84a', rose: '#dfa283', silver: '#cfcabb', plated: '#dfb548' }[a.metal]);
    if (a.metal === 'silver') base.lerp(new THREE.Color('#8f8468'), mood.wear * 0.5);
    const metal = s.material(base, { metalness: 0.6, roughness: dull, side: THREE.DoubleSide });
    const edge = a.metal === 'plated' ? s.material(base.clone().lerp(new THREE.Color('#9b7a3a'), 0.4 + mood.wear * 0.5), { metalness: 0.6, roughness: dull + 0.1, side: THREE.DoubleSide }) : metal;
    const R = 17, floorR = 15.4;
    const year = 1900 + Math.floor(mix(22, 88, random()));
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const letters = 'ABCDEFGHJKLMNPRSTW';
    const initial = () => letters[Math.floor(random() * letters.length)];

    const lines: string[] = {
      retirement: [pick(['25', '30', '40', '45']) + ' YEARS', 'LOYAL SERVICE', String(year)],
      wedding: [`${initial()} & ${initial()}`, `${1 + Math.floor(random() * 28)} · ${1 + Math.floor(random() * 12)} · ${year}`],
      love: pick([['ALWAYS', 'YOURS'], ['COME', 'HOME'], ['UNTIL', 'THEN'], ['ALL MY', 'LOVE'], ['WAIT', 'FOR ME']]),
      son: ['TO MY SON', 'ON HIS 21ST', String(year)],
      initials: [`${initial()}.${initial()}.${initial()}.`, String(year)],
      service: [`${pick(['PTE', 'CPL', 'SGT', 'LT'])} ${initial()}. ${pick(['WARD', 'HALE', 'MOSS', 'REID', 'COLE'])}`, String(100000 + Math.floor(random() * 899999)), String(1939 + Math.floor(random() * 7))],
      blank: [],
      erased: pick([['ALWAYS', 'YOURS'], ['WITH LOVE', String(year)], ['TO MY SON', String(year)]]),
    }[a.dedication];

    const dark = `#${base.clone().multiplyScalar(0.22).getHexString()}`;
    const light = `#${base.clone().lerp(new THREE.Color('#ffffff'), 0.6).getHexString()}`;
    const inside = a.side === 'inside';
    const propped = a.side === 'propped';
    const SIZE = 768, c = SIZE / 2;
    const art = engraving(SIZE, `#${base.getHexString()}`, dark, (ctx) => {
      // Circular graining.
      for (let i = 0; i < 150; i++) {
        ctx.strokeStyle = random() < 0.5 ? `rgba(255,255,255,${0.04 + random() * 0.1})` : `rgba(0,0,0,${0.03 + random() * 0.08})`;
        ctx.lineWidth = 0.6 + random() * 1.6;
        const start = random() * 6.3;
        ctx.beginPath();
        ctx.arc(c, c, random() * c, start, start + 1 + random() * 5);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = dark;
      ctx.strokeStyle = dark;
      const marking = { steel: 'STAINLESS STEEL', gold: '18K  0.750', rose: '18K  0.750', silver: 'STERLING  925', plated: '20 MICRONS  PLAQUE OR' }[a.metal];
      if (inside) {
        // Hallmarks and numbers stamped inside.
        ctx.font = 'bold 28px monospace';
        arcText(ctx, marking, c, c, c - 62, -Math.PI / 2, 0.075);
        arcText(ctx, `No ${100000 + Math.floor(random() * 899999)}`, c, c, c - 62, Math.PI / 2 + 0.1, 0.08);
        ctx.lineWidth = 2.5;
        ctx.font = 'bold 20px monospace';
        for (const side of [-1, 1]) {
          ctx.strokeRect(c + side * 62 - 26, c + 172, 52, 36);
          ctx.fillText(side < 0 ? pick(['KW', 'JB', 'HF']) : pick(['750', '925', 'CH']), c + side * 62, c + 191);
        }
        // Watchmakers' private scratches: a date and a mark each time it was opened.
        const count = Math.round(a.services * 9);
        ctx.fillStyle = a.metal === 'steel' || a.metal === 'silver' ? light : dark;
        for (let i = 0; i < count; i++) {
          const angle = random() * 6.3, radius = 215 + random() * 60;
          ctx.save();
          ctx.translate(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
          ctx.rotate((random() - 0.5) * 1.6);
          ctx.font = `${24 + random() * 12}px cursive`;
          const then = year + 2 + Math.floor(random() * 50);
          ctx.fillText(pick([`${initial()}${initial()} ${1 + Math.floor(random() * 12)}/${then % 100}`, `${initial()} ${then}`, `x${Math.floor(random() * 900)} ${then % 100}`]), 0, 0);
          ctx.restore();
        }
      } else {
        ctx.font = 'bold 24px monospace';
        arcText(ctx, `${marking}  ·  WATER RESISTANT`, c, c, c - 78, -Math.PI / 2, 0.064);
        arcText(ctx, 'SHOCK PROTECTED', c, c, c - 78, Math.PI / 2, 0.066);
        // Desk-diving and wrist wear: hairlines in every direction.
        for (let i = 0; i < 20 + mood.wear * 160; i++) {
          ctx.strokeStyle = `rgba(255,255,255,${0.08 + random() * 0.2})`;
          ctx.lineWidth = 0.5 + random();
          const x = random() * SIZE, y = random() * SIZE, angle = random() * 6.3, length = 10 + random() * 70;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
          ctx.stroke();
        }
      }
      // The dedication.
      const erased = a.dedication === 'erased';
      if (erased) {
        const patch = ctx.createRadialGradient(c, c, 20, c, c, 190);
        patch.addColorStop(0, 'rgba(255,255,255,0.4)');
        patch.addColorStop(0.75, 'rgba(255,255,255,0.28)');
        patch.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = patch;
        ctx.save();
        ctx.translate(c, c);
        ctx.scale(1, 0.62);
        ctx.beginPath();
        ctx.arc(0, 0, 190, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const widest = Math.max(1, ...lines.map((line) => line.length));
      const px = Math.min(74, (inside ? 400 : 560) / widest / 0.62);
      const family = { roman: 'serif', italic: 'cursive', block: 'sans-serif', scratched: 'cursive' }[a.script];
      const style = a.script === 'italic' ? 'italic ' : a.script === 'scratched' ? '' : 'bold ';
      lines.forEach((line, index) => {
        const y = c + (index - (lines.length - 1) / 2) * px * 1.12;
        const size = index === 0 || lines.length < 3 ? px : px * 0.82;
        ctx.font = `${style}${size}px ${family}`;
        ctx.save();
        ctx.translate(c, y);
        if (a.script === 'scratched') ctx.rotate((random() - 0.5) * 0.12);
        ctx.globalAlpha = erased ? 0.13 : 1;
        // A bright lower edge makes the cut look engraved rather than printed.
        ctx.fillStyle = light;
        ctx.fillText(line, 1.5, 2.5);
        ctx.fillStyle = dark;
        ctx.fillText(line, 0, 0);
        if (a.script === 'scratched') {
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = dark;
          ctx.strokeText(line, random() * 2, random() * 2);
        }
        ctx.restore();
      });
      if (a.script === 'italic' && lines.length && !erased) {
        // A hand engraver's flourish under the last line.
        const y = c + ((lines.length - 1) / 2) * px * 1.12 + px * 0.72;
        ctx.lineWidth = 3;
        ctx.strokeStyle = dark;
        ctx.beginPath();
        ctx.moveTo(c - 150, y);
        ctx.bezierCurveTo(c - 60, y + 26, c + 60, y - 26, c + 150, y + 4);
        ctx.stroke();
      }
    });

    // The face that carries the lettering: a shallow dish or dome with the art projected straight down.
    const face = (profile: readonly (readonly [number, number])[]) => {
      const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48);
      const position = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / (R * 2) + 0.5, -position.getZ(i) / (R * 2) + 0.5);
      return s.mesh(geometry, new THREE.MeshStandardMaterial({ map: art, metalness: 0.5, roughness: dull, side: THREE.DoubleSide }));
    };

    const thin = a.fitting === 'snap';
    const H = thin ? 2.1 : 3.1;
    const body = new THREE.Group();
    s.root.add(body);
    const put = <T extends THREE.Object3D>(part: T) => { body.attach(part); return part; };
    if (inside) {
      // Outside dome underneath, rim wall, then the dished floor.
      put(s.lathe([[0, 0], [9, 0.18], [14, 0.7], [R, 1.5], [R + 0.3, 1.6], [R + 0.3, H - 0.4], [R - 0.5, H], [R - 0.9, H], [R - 0.9, 1.75], [floorR, 1.6]], edge));
      put(face([[0.01, 1.05], [5, 1.1], [10, 1.25], [floorR, 1.6]]));
      if (!thin) for (let i = 0; i < 3; i++) put(s.mesh(new THREE.TorusGeometry(R - 0.1, 0.12, 5, 64), edge, [0, H - 0.5 - i * 0.4, 0])).rotation.x = Math.PI / 2;
    } else {
      put(s.lathe([[R - 0.9, 0], [R - 0.1, 0], [R - 0.1, H - 1.7], [R + 0.3, H - 1.6], [R + 0.3, H - 1.1], [floorR + 0.6, H - 0.45], [floorR, H - 0.4]], edge));
      put(face([[0.01, H], [6, H - 0.06], [11, H - 0.2], [floorR, H - 0.4]]));
      if (a.fitting === 'screw') {
        const notch = s.material('#1a1c1f', { roughness: 0.8 });
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + 0.3;
          const cut = put(s.box([2.2, 0.24, 1.4], [Math.cos(angle) * (floorR + 0.25), H - 0.6, Math.sin(angle) * (floorR + 0.3)], notch));
          cut.rotation.y = -angle + Math.PI / 2;
        }
      }
    }
    if (a.fitting === 'fluted') {
      const ring = gearShape(R + 0.75, R + 0.3, 60, 0, 0.25);
      ring.holes.push(circleHole(R + 0.1));
      put(slab(s, ring, 1.0, edge, inside ? 1.5 : H - 2.4, 0.05));
    } else if (thin) {
      const angle = random() * 6.3;
      const lip = put(s.box([3.4, 0.4, 1.3], [Math.cos(angle) * (R + 0.6), inside ? H - 0.3 : 0.3, Math.sin(angle) * (R + 0.6)], edge));
      lip.rotation.y = -angle + Math.PI / 2;
    }

    // A dish never lies quite level on its dome.
    if (inside) body.rotation.set((random() - 0.5) * 0.09, random() * 0.5 - 0.25, (random() - 0.5) * 0.09);
    else if (propped) {
      const lean = mix(1.05, 1.25, random());
      body.rotation.x = lean;
      body.position.y = R * Math.sin(lean) + 1;
      const wood = s.material('#c9a877', { roughness: 0.85 });
      const block = s.box([13 + random() * 4, 24, 8], [(random() < 0.5 ? -1 : 1) * R * 0.62, 12, -R * Math.cos(lean) * 0.45 - H - 5.2], wood);
      block.rotation.y = (random() - 0.5) * 0.3;
    } else body.rotation.y = random() * 0.5 - 0.25;

    if (a.gasket) {
      const rubber = s.material('#17181a', { roughness: 0.85 });
      if (inside && random() < 0.5) put(s.mesh(new THREE.TorusGeometry(floorR - 0.15, 0.42, 8, 64), rubber, [0, 1.95, 0])).rotation.x = Math.PI / 2;
      else {
        // Pulled out and dropped half under the edge, already out of round.
        const angle = random() * 6.3;
        const ring = s.mesh(new THREE.TorusGeometry(floorR - 0.2, 0.42, 8, 64), rubber, propped ? [(random() - 0.5) * 8, 0.42, R * 0.9] : [Math.cos(angle) * (R * 1.25), 0.42, Math.sin(angle) * (R * 0.9)]);
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(1, mix(0.7, 0.9, random()), 1);
        ring.rotation.z = random() * 3;
      }
    }

    s.root.scale.setScalar(0.02);
    return s.finish();
  },
});
