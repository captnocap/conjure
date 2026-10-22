import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type G = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function roundedRect(w: number, h: number, r: number) {
  const path = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  return path;
}
/** A slab with a rounded hole through it, standing in the x-y plane, `depth` thick toward -z. */
function pierced(w: number, h: number, r: number, hole: [number, number, number], depth: number, holeY = 0) {
  const shape = roundedRect(w, h, r);
  const inner = roundedRect(hole[0], hole[1], hole[2]);
  shape.holes.push(new THREE.Path(inner.getPoints(12).map((point) => point.clone().setY(point.y + holeY))));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  geometry.translate(0, 0, -depth);
  return geometry;
}

export default defineThing({
  questions: {
    outside: choice('What is outside the glass?', {
      earth: 'The blue limb of the Earth in daylight: oceans, white cloud swirls, a thin bright line of atmosphere, stars above.',
      night: "The Earth's night side: city lights in threads and clusters, green aurora curling along the limb.",
      moon: 'The grey cratered limb of the Moon, very close, no air at all.',
      mars: 'The rust-red limb of Mars under a thin pale haze.',
      nebula: 'A pink and teal nebula and a dense field of stars, far from any planet.',
      sun: 'The Sun at the edge of the frame, glare blowing everything out white.',
      black: 'Nothing: black and a few stars.',
    }),
    shutter: choice('Where is the sliding shutter?', {
      open: 'Slid fully open: the whole pane is clear.',
      half: 'Half closed, its ribbed metal face covering the lower half of the pane.',
      slit: "Nearly closed, open only a hand's width at the top.",
      closed: 'Closed: only the ribbed metal shutter shows behind the glass.',
    }),
    shape: choice('What shape is the pane?', {
      wide: 'A wide rectangle with rounded corners.',
      square: 'A near-square pane.',
      oval: 'A rectangle with corners so rounded it is almost an oval.',
      tall: 'A tall narrow slot.',
    }),
    wall: choice('What is the wall around it?', {
      white: 'White quilted fabric panels, like the ISS.',
      grey: 'Bare grey aluminium with rivets and a cable run.',
      beige: 'Beige padded panels, an older station.',
      dark: 'Dark charcoal composite with an orange trim stripe, a newer ship.',
    }),
    kept: choice('What has somebody left at the viewport?', {
      none: 'Nothing: just the frame and the view.',
      photo: 'A family photo taped to the frame beside the glass.',
      tally: 'Tally marks scratched into the frame, counting days.',
      plant: 'A small green plant in a velcro pouch on the sill.',
      camera: 'A camera velcroed to the wall, lens to the glass.',
      note: 'A handwritten note stuck to the glass.',
    }),
    frost: noul('Is frost creeping in at the corners of the glass?'),
    handrail: noul('Is there a handrail across the wall under the viewport?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.7, H = 2.05, T = 0.16;
    const [pw, ph, pr] = { wide: [1.1, 0.62, 0.1], square: [0.78, 0.74, 0.1], oval: [1.0, 0.56, 0.26], tall: [0.46, 1.1, 0.12] }[a.shape];
    const cy = a.shape === 'tall' ? 1.2 : 1.3;

    // ---- the wall slab with the opening, and its finish ----
    const wallTone = { white: '#e9ebe6', grey: '#9ea4a8', beige: '#d9c8a8', dark: '#3a3d44' }[a.wall];
    const quilt = a.wall === 'white' || a.wall === 'beige';
    const wallMap = paint(256, 256, (g, w, h) => {
      g.fillStyle = wallTone; g.fillRect(0, 0, w, h);
      if (quilt) {
        g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 3;
        for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(i * 85, 0); g.lineTo(i * 85, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 85); g.lineTo(w, i * 85); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.ellipse(i * 85 + 42, j * 85 + 42, 30, 30, 0, 0, 7); g.stroke(); }
      } else if (a.wall === 'grey') {
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
        g.strokeRect(2, 2, w - 4, h - 4);
        g.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 1600; i++) g.fillRect(random() * w, random() * h, 1, 1);
      } else {
        g.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 24; i++) g.fillRect(0, i * 11, w, 2);
      }
      for (let i = 0; i < mood.wear * 22; i++) { g.fillStyle = 'rgba(60,50,40,0.1)'; g.beginPath(); g.ellipse(random() * w, random() * h, 4 + random() * 10, 3 + random() * 6, random() * 3, 0, 7); g.fill(); }
    });
    wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
    wallMap.repeat.set(quilt ? 2.6 : 1.4, quilt ? 2.6 : 1.4);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: quilt ? 0.95 : 0.55, metalness: a.wall === 'grey' ? 0.4 : 0 });
    const frameHole: [number, number, number] = [pw + 0.16, ph + 0.16, pr + 0.06];
    s.mesh(pierced(W, H, 0.04, frameHole, T, cy - H / 2), wallMat, [0, H / 2, 0]);
    if (a.wall === 'dark') s.box([W, 0.05, 0.004], [0, 0.42, 0.002], s.material('#e8742a', { roughness: 0.5 }));
    if (a.wall === 'grey') for (const y of [0.3, 0.36]) s.cylinder(0.012, 0.012, W - 0.1, [0, y, 0.015], s.material('#2a2d33'), 8).rotation.z = Math.PI / 2;

    // ---- the riveted frame: a thick bevelled ring standing proud of the wall ----
    const steel = s.material('#b9bec4', { metalness: 0.7, roughness: 0.35 });
    const darkSteel = s.material('#5a5f66', { metalness: 0.6, roughness: 0.45 });
    const frame = s.mesh(pierced(pw + 0.3, ph + 0.3, pr + 0.12, [pw, ph, pr], 0.06), steel, [0, cy, 0.06]);
    void frame;
    s.mesh(pierced(pw + 0.01, ph + 0.01, pr, [pw - 0.1, ph - 0.1, Math.max(0.02, pr - 0.05)], 0.07), darkSteel, [0, cy, 0.0]);
    const rivetGeom = new THREE.CylinderGeometry(0.012, 0.014, 0.012, 10);
    rivetGeom.rotateX(Math.PI / 2);
    const rivets: { at: [number, number, number]; size: number }[] = [];
    const rw = pw + 0.3, rh = ph + 0.3, inset = 0.05;
    const along = (count: number, from: [number, number], to: [number, number]) => { for (let i = 0; i <= count; i++) rivets.push({ at: [mix(from[0], to[0], i / count), cy + mix(from[1], to[1], i / count), 0.066], size: 1 }); };
    const nx = Math.max(3, Math.round(rw / 0.14)), ny = Math.max(2, Math.round(rh / 0.14));
    along(nx, [-rw / 2 + inset, rh / 2 - inset], [rw / 2 - inset, rh / 2 - inset]);
    along(nx, [-rw / 2 + inset, -rh / 2 + inset], [rw / 2 - inset, -rh / 2 + inset]);
    along(ny, [-rw / 2 + inset, rh / 2 - inset], [-rw / 2 + inset, -rh / 2 + inset]);
    along(ny, [rw / 2 - inset, rh / 2 - inset], [rw / 2 - inset, -rh / 2 + inset]);
    s.scatter(rivetGeom, darkSteel, rivets);

    // ---- outside: painted space behind the pane ----
    const space = paint(1024, 1024, (g, w, h) => {
      g.fillStyle = '#05070f'; g.fillRect(0, 0, w, h);
      const stars = a.outside === 'nebula' ? 1400 : a.outside === 'sun' ? 60 : 500;
      for (let i = 0; i < stars; i++) { const b = 0.4 + random() * 0.6; g.fillStyle = `rgba(255,255,255,${b})`; const r = random() < 0.08 ? 2.2 : 1 + random(); g.beginPath(); g.arc(random() * w, random() * h, r, 0, 7); g.fill(); }
      const limb = (tone: string, edge: string, haze: number) => {
        const cx = w * 0.5, cyy = h * 1.75, R = h * 1.38;
        if (haze > 0) { const glow = g.createRadialGradient(cx, cyy, R, cx, cyy, R + haze); glow.addColorStop(0, edge); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h); }
        const fill = g.createRadialGradient(cx, cyy, R * 0.6, cx, cyy, R); fill.addColorStop(0, tone); fill.addColorStop(0.85, tone); fill.addColorStop(1, edge);
        g.fillStyle = fill; g.beginPath(); g.arc(cx, cyy, R, 0, 7); g.fill();
        return { cx, cyy, R };
      };
      if (a.outside === 'earth') {
        const { cx, cyy, R } = limb('#2f7fd8', '#b8e4ff', 70);
        g.save(); g.beginPath(); g.arc(cx, cyy, R - 2, 0, 7); g.clip();
        for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(70,140,70,0.75)'; g.beginPath(); g.ellipse(random() * w, cyy - R + 40 + random() * 300, 60 + random() * 120, 30 + random() * 70, random() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(255,255,255,${0.45 + random() * 0.55})`; g.beginPath(); g.ellipse(random() * w, cyy - R + random() * 380, 30 + random() * 120, 8 + random() * 26, random() * 0.6 - 0.3, 0, 7); g.fill(); }
        g.restore();
        g.strokeStyle = 'rgba(200,240,255,0.9)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cyy, R + 3, 0, 7); g.stroke();
      } else if (a.outside === 'night') {
        const { cx, cyy, R } = limb('#0b1326', '#2fd88a', 90);
        g.save(); g.beginPath(); g.arc(cx, cyy, R - 2, 0, 7); g.clip();
        for (let c = 0; c < 14; c++) { const x = random() * w, y = cyy - R + 60 + random() * 330; for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,${190 + Math.round(random() * 50)},120,${0.4 + random() * 0.6})`; g.fillRect(x + (random() - 0.5) * 120 * random(), y + (random() - 0.5) * 50 * random(), 2, 2); } }
        g.strokeStyle = 'rgba(255,210,130,0.5)'; g.lineWidth = 1.5;
        for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(random() * w, cyy - R + 80 + random() * 300); g.lineTo(random() * w, cyy - R + 80 + random() * 300); g.stroke(); }
        g.restore();
        g.strokeStyle = 'rgba(80,255,160,0.85)'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cyy, R + 4, 0, 7); g.stroke();
      } else if (a.outside === 'moon') {
        const { cx, cyy, R } = limb('#8d8c88', '#b8b7b2', 0);
        g.save(); g.beginPath(); g.arc(cx, cyy, R - 1, 0, 7); g.clip();
        for (let i = 0; i < 60; i++) { const x = random() * w, y = cyy - R + random() * 380, r = 8 + random() * 40; g.fillStyle = 'rgba(60,60,58,0.7)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(220,220,215,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9); g.stroke(); }
        g.restore();
      } else if (a.outside === 'mars') {
        const { cx, cyy, R } = limb('#b7552b', '#f0c8a0', 30);
        g.save(); g.beginPath(); g.arc(cx, cyy, R - 1, 0, 7); g.clip();
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,35,20,${0.2 + random() * 0.35})`; g.beginPath(); g.ellipse(random() * w, cyy - R + random() * 380, 40 + random() * 120, 15 + random() * 50, random() * 3, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(240,240,250,0.8)'; g.beginPath(); g.ellipse(w * 0.75, cyy - R + 30, 90, 22, 0, 0, 7); g.fill();
        g.restore();
      } else if (a.outside === 'nebula') {
        for (let i = 0; i < 26; i++) {
          const x = random() * w, y = random() * h, r = 120 + random() * 260;
          const cloud = g.createRadialGradient(x, y, 0, x, y, r);
          const tone = random() < 0.5 ? '255,110,170' : '80,220,210';
          cloud.addColorStop(0, `rgba(${tone},0.28)`); cloud.addColorStop(1, `rgba(${tone},0)`);
          g.fillStyle = cloud; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(random() * w, random() * h, 2, 2); }
      } else if (a.outside === 'sun') {
        const sx = w * 0.82, sy = h * 0.22;
        const flare = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.95); flare.addColorStop(0, 'rgba(255,255,255,1)'); flare.addColorStop(0.18, 'rgba(255,250,230,0.98)'); flare.addColorStop(0.5, 'rgba(255,230,180,0.55)'); flare.addColorStop(1, 'rgba(255,220,160,0.08)');
        g.fillStyle = flare; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 10;
        for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(sx, sy); const ang = random() * 7; g.lineTo(sx + Math.cos(ang) * w, sy + Math.sin(ang) * w); g.stroke(); }
        for (let i = 1; i < 5; i++) { g.strokeStyle = `rgba(${i % 2 ? '255,170,120' : '140,200,255'},0.35)`; g.lineWidth = 6; g.beginPath(); g.arc(sx - i * 150, sy + i * 110, 20 + i * 18, 0, 7); g.stroke(); }
      }
    });
    const outsideGlow = a.outside === 'sun' ? 1.6 : a.outside === 'black' ? 0.6 : mix(1.1, 1.6, mood.cheer);
    // The painting sits just behind the shutter, inside the wall's thickness, so the view survives a steep camera.
    const outside = s.mesh(new THREE.PlaneGeometry(pw * 1.5, ph * 1.5), new THREE.MeshStandardMaterial({ map: space, emissiveMap: space, emissive: '#ffffff', emissiveIntensity: outsideGlow, roughness: 1 }), [0, cy, -0.075]);
    outside.castShadow = outside.receiveShadow = false;
    // A backing panel so the slab reads as solid from behind.
    s.box([W, H, 0.03], [0, H / 2, -T - 0.015], s.material('#2a2d33', { roughness: 0.8 }));

    // ---- the shutter: a ribbed slab sliding up behind the glass ----
    const cover = { open: 0, half: 0.5, slit: 0.85, closed: 1 }[a.shutter];
    if (cover > 0) {
      const ribbed = paint(128, 256, (g, w, h) => { g.fillStyle = '#9a9ea4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.18)'; g.fillRect(0, i * 16, w, 8); } });
      ribbed.wrapS = ribbed.wrapT = THREE.RepeatWrapping; ribbed.repeat.set(1, Math.max(1, ph * cover * 4));
      const shutterH = ph * cover + 0.02;
      s.mesh(new THREE.BoxGeometry(pw + 0.1, shutterH, 0.02), new THREE.MeshStandardMaterial({ map: ribbed, metalness: 0.6, roughness: 0.4 }), [0, cy - ph / 2 + shutterH / 2 - 0.01, -0.045]);
      s.box([pw + 0.1, 0.03, 0.03], [0, cy - ph / 2 + shutterH, -0.045], s.material('#e8c23a', { roughness: 0.5 }));
    }

    // ---- the glass, and frost if the cold is getting in ----
    const glass = s.mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshPhysicalMaterial({ color: '#cfe6f5', transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0.1, depthWrite: false }), [0, cy, 0.02]);
    glass.castShadow = glass.receiveShadow = false;
    if (a.frost) {
      const frostMap = paint(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]] as const) {
          const r = w * mix(0.2, 0.34, random());
          const ice = g.createRadialGradient(x, y, 0, x, y, r); ice.addColorStop(0, 'rgba(235,245,255,0.95)'); ice.addColorStop(0.5, 'rgba(225,240,255,0.5)'); ice.addColorStop(1, 'rgba(225,240,255,0)');
          g.fillStyle = ice; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
          for (let i = 0; i < 14; i++) { const ang = Math.atan2(h / 2 - y, w / 2 - x) + (random() - 0.5) * 1.6; const len = r * (0.4 + random() * 0.7); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke(); }
        }
      });
      const frost = s.mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: frostMap, transparent: true, depthWrite: false, roughness: 0.9 }), [0, cy, 0.025]);
      frost.castShadow = frost.receiveShadow = false;
    }

    // ---- handrail under the window ----
    const rail = s.material('#4a6a9a', { metalness: 0.3, roughness: 0.5 });
    if (a.handrail) {
      const y = cy - ph / 2 - 0.3;
      s.cylinder(0.018, 0.018, pw + 0.5, [0, y, 0.09], rail, 12).rotation.z = Math.PI / 2;
      for (const x of [-(pw + 0.5) / 2 + 0.04, (pw + 0.5) / 2 - 0.04]) { s.box([0.05, 0.05, 0.09], [x, y, 0.045], darkSteel); }
    }

    // ---- what somebody left here ----
    const sillY = cy - ph / 2 - 0.08 - 0.02, edgeX = pw / 2 + 0.15;
    if (a.kept === 'photo') {
      const photo = paint(96, 128, (g, w, h) => {
        g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
        const sky = g.createLinearGradient(0, 8, 0, h - 20); sky.addColorStop(0, '#88c0ec'); sky.addColorStop(1, '#dfeaf0'); g.fillStyle = sky; g.fillRect(8, 8, w - 16, h - 28);
        g.fillStyle = '#5a8a3a'; g.fillRect(8, h * 0.62, w - 16, h * 0.22);
        const heads = 2 + Math.floor(random() * 3);
        for (let i = 0; i < heads; i++) { const x = 20 + i * (w - 40) / Math.max(1, heads - 1), r = 7 + random() * 3; g.fillStyle = ['#e8c7a8', '#c48c62', '#8a5a3a'][Math.floor(random() * 3)]; g.beginPath(); g.arc(x, h * 0.5 - random() * 14, r, 0, 7); g.fill(); g.fillStyle = ['#d8343a', '#2c6fd0', '#e8c63a', '#f4f4f0'][Math.floor(random() * 4)]; g.fillRect(x - r * 1.2, h * 0.5 + 2, r * 2.4, h * 0.2); }
      });
      const card = s.mesh(new THREE.PlaneGeometry(0.09, 0.12), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.9 }), [edgeX + 0.12, cy + 0.05, 0.004]);
      card.rotation.z = (random() - 0.5) * 0.2;
      s.box([0.03, 0.012, 0.002], [edgeX + 0.12, cy + 0.11, 0.006], s.material('#d9d2b4', { roughness: 0.9 })).rotation.z = 0.4;
    } else if (a.kept === 'tally') {
      const marks = 18 + Math.floor(random() * 30);
      const scratch = s.material('#2a2d33', { roughness: 0.8 });
      for (let i = 0; i < marks; i++) {
        const group = Math.floor(i / 5), inGroup = i % 5;
        const x = -rw / 2 + 0.08 + group * 0.075 + (inGroup === 4 ? 0.028 : inGroup * 0.014);
        if (x > rw / 2 - 0.06) break;
        const mark = s.box([0.003, inGroup === 4 ? 0.06 : 0.04, 0.003], [x, cy + rh / 2 - 0.075, 0.062], scratch);
        if (inGroup === 4) mark.rotation.z = 1.0;
      }
    } else if (a.kept === 'plant') {
      const pouch = s.box([0.12, 0.1, 0.09], [edgeX + 0.1, sillY - 0.08, 0.055], s.material('#5a6b7a', { roughness: 0.9 }));
      void pouch;
      s.box([0.12, 0.02, 0.002], [edgeX + 0.1, sillY - 0.06, 0.101], s.material('#1d1d1f'));
      const leaf = s.material('#4f9a3c', { roughness: 0.8 });
      for (let i = 0; i < 7; i++) { const l = s.ball([0.025, 0.045, 0.012], [edgeX + 0.1 + (random() - 0.5) * 0.08, sillY - 0.02 + random() * 0.06, 0.055 + (random() - 0.5) * 0.05], leaf, 8); l.rotation.set((random() - 0.5), random() * 3, (random() - 0.5) * 1.2); }
    } else if (a.kept === 'camera') {
      const body = s.box([0.13, 0.085, 0.07], [edgeX + 0.14, cy - 0.1, 0.045], s.material('#1d1d1f', { roughness: 0.5 }));
      void body;
      s.cylinder(0.035, 0.035, 0.08, [edgeX + 0.14, cy - 0.1, 0.11], s.material('#2a2d33', { roughness: 0.4 }), 14).rotation.x = Math.PI / 2;
      s.box([0.04, 0.015, 0.03], [edgeX + 0.1, cy - 0.05, 0.045], s.material('#9a9ea4', { metalness: 0.6 }));
    } else if (a.kept === 'note') {
      const note = paint(128, 96, (g, w, h) => {
        g.fillStyle = '#fff6a8'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#2a3a8a'; g.lineWidth = 3;
        const lines = 3 + Math.floor(random() * 2);
        for (let i = 0; i < lines; i++) { g.beginPath(); const y = 22 + i * 18; g.moveTo(14, y); for (let x = 14; x < w - 14 - random() * 40; x += 6) g.lineTo(x, y + (random() - 0.5) * 6); g.stroke(); }
        g.fillStyle = '#d83a3a'; g.beginPath(); g.moveTo(w - 26, h - 24); g.bezierCurveTo(w - 26, h - 32, w - 14, h - 32, w - 14, h - 24); g.bezierCurveTo(w - 14, h - 32, w - 2, h - 32, w - 2, h - 24); g.bezierCurveTo(w - 2, h - 16, w - 14, h - 8, w - 14, h - 8); g.bezierCurveTo(w - 14, h - 8, w - 26, h - 16, w - 26, h - 24); g.fill();
      });
      const sticky = s.mesh(new THREE.PlaneGeometry(0.1, 0.075), new THREE.MeshStandardMaterial({ map: note, roughness: 0.95 }), [pw / 2 - 0.1, cy + ph / 2 - 0.08, 0.03]);
      sticky.rotation.z = (random() - 0.5) * 0.25;
    }
    // A label plate under the frame.
    s.label(['VIEWPORT 2', 'KEEP SHUTTER CLOSED WHEN UNATTENDED', 'NO FOOD NEAR GLASS', 'CUPOLA ACCESS', 'WINDOW 4'][Math.floor(random() * 5)], 0.32, 0.045, [0, cy - rh / 2 - 0.05, 0.004], '#e8ebef', '#2a2d33');

    const twinkle = a.outside !== 'sun' ? mix(0.02, 0.1, mood.energy) : 0;
    const material = outside.material as THREE.MeshStandardMaterial;
    return s.finish({
      update(_dt, time) {
        material.emissiveIntensity = outsideGlow + Math.sin(time * 1.7) * twinkle;
      },
    });
  },
});
