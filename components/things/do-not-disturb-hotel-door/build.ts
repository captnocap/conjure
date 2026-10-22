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

const NUMBERS = { n237: '237', n1408: '1408', n713: '713', n1021: '1021', n4: '4' } as const;

export default defineThing({
  questions: {
    tag: choice('What hangs on the handle?', {
      dnd: 'A red DO NOT DISTURB tag.',
      makeup: 'A green PLEASE MAKE UP ROOM tag.',
      privacy: 'A blue PRIVACY PLEASE tag.',
      none: 'Nothing on the handle.',
    }),
    door: choice('What is the door doing?', {
      closed: 'Closed.',
      crack: 'Open a crack, a line of warm light down the edge and across the carpet.',
      wide: 'Standing wide open on the lit room beyond.',
    }),
    outside: choice('What waits on the corridor carpet?', {
      tray: 'A room-service tray with a cloche and an empty glass.',
      shoes: 'A pair of polished shoes set out for cleaning.',
      both: 'A tray and a pair of shoes.',
      luggage: 'A small wheeled suitcase, handle up.',
      nothing: 'Nothing.',
    }),
    newspaper: noul('Does a folded newspaper lie on the carpet, unread?'),
    number: choice('What is the room number?', {
      n237: 'Room 237.',
      n1408: 'Room 1408.',
      n713: 'Room 713.',
      n1021: 'Room 1021.',
      n4: 'Room 4, a small hotel.',
    }),
    finish: choice('What is the door like?', {
      walnut: 'Dark walnut veneer, a business hotel.',
      white: 'White painted panel door with a brass kick plate.',
      grey: 'Flat grey laminate, a budget chain.',
      oak: 'Pale oak with a chrome lever.',
    }),
    corridor: choice('What is the corridor like?', {
      striped: 'Striped wallpaper in cream and gold over a patterned red carpet.',
      plain: 'Plain taupe walls, grey carpet, a brushed-steel sign.',
      dark: 'Dark panelled walls and a deep blue carpet, a wall lamp beside the door.',
      floral: 'Faded floral wallpaper and a worn green carpet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const multi = (geometry: THREE.BufferGeometry, materials: THREE.Material[], at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const WW = 1.5, WH = 2.5, WT = 0.14, DW = 0.9, DH = 2.1;
    const chrome = s.material('#d4d8db', { metalness: 0.9, roughness: 0.25 });
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 });
    const metal = a.finish === 'oak' || a.finish === 'grey' ? chrome : brass;

    // ---- corridor wall and carpet -------------------------------------------------------
    const wallMap = paint(512, 512, (g, w, h) => {
      const base = { striped: '#e9dfc6', plain: '#c9bfae', dark: '#4a3a30', floral: '#e4d9c2' }[a.corridor];
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      if (a.corridor === 'striped') { g.fillStyle = 'rgba(190,150,70,0.45)'; for (let x = 0; x < w; x += 48) g.fillRect(x, 0, 16, h); }
      if (a.corridor === 'dark') { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 6, h); g.fillStyle = 'rgba(255,220,160,0.08)'; for (let x = 10; x < w; x += 128) g.fillRect(x, 0, 90, h); }
      if (a.corridor === 'floral') for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${random() < 0.5 ? '180,120,120' : '120,150,110'},0.45)`; const x = random() * w, y = random() * h; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.256) * 9, y + Math.sin(p * 1.256) * 9, 7, 0, 7); g.fill(); } }
      for (let i = 0; i < Math.round(mood.wear * 10); i++) { g.fillStyle = 'rgba(60,40,20,0.12)'; g.fillRect(random() * w, random() * h, 20 + random() * 60, 4 + random() * 30); }
    });
    wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping; wallMap.repeat.set(1.6, 2.4);
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.95 });
    const wallSeg = (x0: number, x1: number, y0: number, y1: number) => s.box([x1 - x0, y1 - y0, WT], [(x0 + x1) / 2, (y0 + y1) / 2, -WT / 2], wall);
    wallSeg(-WW / 2, -DW / 2 - 0.05, 0, WH); wallSeg(DW / 2 + 0.05, WW / 2, 0, WH); wallSeg(-DW / 2 - 0.05, DW / 2 + 0.05, DH + 0.05, WH);
    const skirting = s.material(a.corridor === 'dark' ? '#2e221c' : '#efe9dc');
    for (const [x0, x1] of [[-WW / 2, -DW / 2 - 0.05], [DW / 2 + 0.05, WW / 2]]) s.box([x1 - x0, 0.12, 0.02], [(x0 + x1) / 2, 0.06, 0.01], skirting);
    const carpetMap = paint(256, 256, (g, w, h) => {
      const [base, ink] = { striped: ['#7a2a2e', 'rgba(230,190,120,0.55)'], plain: ['#8a8c88', 'rgba(60,60,60,0.25)'], dark: ['#223360', 'rgba(200,170,90,0.4)'], floral: ['#5f7a4e', 'rgba(220,200,120,0.4)'] }[a.corridor];
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.strokeStyle = ink; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = i * 64 + 32, y = j * 64 + 32;
        if (a.corridor === 'plain') { g.strokeRect(x - 28, y - 28, 56, 56); continue; }
        g.beginPath(); g.moveTo(x, y - 24); g.lineTo(x + 24, y); g.lineTo(x, y + 24); g.lineTo(x - 24, y); g.closePath(); g.stroke();
        g.beginPath(); g.arc(x, y, 8, 0, 7); g.stroke();
      }
    });
    carpetMap.wrapS = carpetMap.wrapT = THREE.RepeatWrapping; carpetMap.repeat.set(3.4, 2);
    s.box([WW, 0.014, 0.95], [0, 0.007, 0.475], new THREE.MeshStandardMaterial({ map: carpetMap, roughness: 1 }));
    // Architrave.
    const trim = s.material(a.finish === 'white' ? '#f1ede4' : a.finish === 'walnut' ? '#3e2a1e' : a.finish === 'grey' ? '#55585c' : '#c9a977', { roughness: 0.5 });
    for (const x of [-DW / 2 - 0.045, DW / 2 + 0.045]) s.box([0.09, DH + 0.09, 0.03], [x, (DH + 0.09) / 2, 0.015], trim);
    s.box([DW + 0.18, 0.09, 0.03], [0, DH + 0.045, 0.015], trim);
    if (a.corridor === 'plain') {
      s.box([0.2, 0.08, 0.01], [-DW / 2 - 0.25, 1.7, 0.005], s.material('#9fa4a8', { metalness: 0.6, roughness: 0.35 }));
    }
    if (a.corridor === 'dark') {
      s.box([0.08, 0.14, 0.06], [DW / 2 + 0.3, 1.7, 0.03], brass);
      s.mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.16, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#f2e2b8', emissive: '#ffcf80', emissiveIntensity: 1.0, roughness: 0.9, side: THREE.DoubleSide }), [DW / 2 + 0.3, 1.86, 0.08]);
    }

    // ---- the lit room beyond, seen through the opening ----------------------------------
    const swing = { closed: 0, crack: 0.26, wide: 1.45 }[a.door];
    const glow = new THREE.Color('#ffc27a').lerp(new THREE.Color('#ff9a45'), mood.warmth);
    if (a.door !== 'closed') {
      const roomMap = paint(256, 512, (g, w, h) => {
        g.fillStyle = '#8c7a66'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#5a3f3a'; g.fillRect(0, h * 0.8, w, h * 0.2);
        const sky = g.createLinearGradient(0, h * 0.2, 0, h * 0.7);
        sky.addColorStop(0, '#2b2f4a'); sky.addColorStop(1, '#c9772e');
        g.fillStyle = sky; g.fillRect(w * 0.45, h * 0.18, w * 0.5, h * 0.55);
        g.fillStyle = '#f4f1ea'; g.fillRect(w * 0.05, h * 0.62, w * 0.55, h * 0.2);
        g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(w * 0.22, h * 0.5, 18, 0, 7); g.fill();
        g.fillStyle = '#3a2e2a'; g.fillRect(w * 0.16, h * 0.54, 12, h * 0.1);
      });
      const roomMat = new THREE.MeshStandardMaterial({ map: roomMap, emissiveMap: roomMap, emissive: '#ffffff', emissiveIntensity: 0.75, roughness: 0.8 });
      s.mesh(new THREE.PlaneGeometry(DW, DH), roomMat, [0, DH / 2, -WT - 0.02]);
      // Light spilling onto the corridor carpet.
      const spread = a.door === 'wide' ? 0.9 : 0.26;
      const shape = new THREE.Shape();
      shape.moveTo(DW / 2 - 0.02 - spread, 0); shape.lineTo(DW / 2 - 0.02, 0); shape.lineTo(DW / 2 + spread * 0.6, 0.95); shape.lineTo(DW / 2 - spread * 1.6, 0.95); shape.closePath();
      const geo = new THREE.ShapeGeometry(shape); geo.rotateX(Math.PI / 2);
      const pool = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }));
      pool.position.set(0, 0.016, 0); s.root.add(pool);
    }

    // ---- the door --------------------------------------------------------------------
    const doorTone = { walnut: '#5a3b26', white: '#f2eee6', grey: '#7d8186', oak: '#c9a977' }[a.finish];
    const doorMap = paint(256, 512, (g, w, h) => {
      g.fillStyle = doorTone; g.fillRect(0, 0, w, h);
      if (a.finish === 'walnut' || a.finish === 'oak') for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(${a.finish === 'walnut' ? '20,10,5' : '120,90,50'},${0.08 + random() * 0.12})`; g.lineWidth = 1 + random() * 2; const x = random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + random() * 16 - 8, h * 0.3, x + random() * 16 - 8, h * 0.7, x + random() * 10 - 5, h); g.stroke(); }
      if (a.finish === 'white') { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 6; g.strokeRect(30, 40, w - 60, 150); g.strokeRect(30, 230, w - 60, 230); }
      if (a.finish === 'grey') { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, w, 6); }
    });
    const doorMat = new THREE.MeshStandardMaterial({ map: doorMap, roughness: a.finish === 'white' ? 0.5 : 0.4 });
    const door = new THREE.Group();
    door.position.set(-DW / 2, 0, -0.03);
    door.rotation.y = -swing;
    s.root.add(door);
    const inDoor = (mesh: THREE.Mesh) => { door.add(mesh); return mesh; };
    inDoor(s.mesh(new THREE.BoxGeometry(DW - 0.01, DH - 0.02, 0.045), doorMat, [DW / 2, DH / 2, 0]));
    if (a.finish === 'white') inDoor(s.box([DW - 0.1, 0.2, 0.004], [DW / 2, 0.14, 0.025], brass));
    // Number plate, peephole, card reader, lever.
    const plateMap = paint(256, 128, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#d9b45a'); grad.addColorStop(0.5, '#f0d78a'); grad.addColorStop(1, '#b8902e');
      g.fillStyle = a.finish === 'oak' || a.finish === 'grey' ? '#cfd3d6' : grad; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2a2320'; g.font = 'bold 82px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(NUMBERS[a.number], w / 2, h / 2 + 4, w - 30);
    });
    inDoor(multi(new THREE.BoxGeometry(0.2, 0.1, 0.008), [metal, metal, metal, metal, new THREE.MeshStandardMaterial({ map: plateMap, metalness: 0.5, roughness: 0.35 }), metal], [DW / 2, 1.72, 0.026]));
    const peep = inDoor(s.cylinder(0.018, 0.018, 0.012, [DW / 2, 1.52, 0.028], metal, 14)); peep.rotation.x = Math.PI / 2;
    inDoor(s.cylinder(0.007, 0.007, 0.004, [DW / 2, 1.52, 0.035], s.material('#101418', { roughness: 0.1 }), 10)).rotation.x = Math.PI / 2;
    const reader = inDoor(s.box([0.07, 0.17, 0.02], [DW - 0.11, 1.12, 0.03], s.material(a.finish === 'white' ? '#2b2d31' : '#1f2124', { roughness: 0.4 })));
    void reader;
    inDoor(s.box([0.05, 0.004, 0.012], [DW - 0.11, 1.17, 0.042], s.material('#0d0f12')));
    inDoor(s.box([0.012, 0.012, 0.004], [DW - 0.11, 1.07, 0.042], new THREE.MeshStandardMaterial({ color: '#2a2a2a', emissive: a.door === 'closed' ? '#ff2a2a' : '#2aff6a', emissiveIntensity: 1.5 })));
    const leverY = 1.0;
    inDoor(s.cylinder(0.03, 0.03, 0.02, [DW - 0.11, leverY, 0.03], metal, 16)).rotation.x = Math.PI / 2;
    inDoor(s.cylinder(0.012, 0.012, 0.05, [DW - 0.11, leverY, 0.06], metal, 10)).rotation.x = Math.PI / 2;
    inDoor(s.box([0.13, 0.02, 0.024], [DW - 0.11 - 0.055, leverY, 0.085], metal));
    if (a.tag !== 'none') {
      const [tagBg, tagText] = { dnd: ['#c8242a', 'DO NOT\nDISTURB'], makeup: ['#2f8f4e', 'PLEASE\nMAKE UP\nROOM'], privacy: ['#2a4fa8', 'PRIVACY\nPLEASE'] }[a.tag];
      const tagMap = paint(192, 448, (g, w, h) => {
        g.fillStyle = tagBg; g.fillRect(0, 0, w, h);
        g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2, 52, 30, 0, 7); g.fill();
        g.fillStyle = '#ffffff'; g.font = 'bold 42px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        tagText.split('\n').forEach((line, i, all) => g.fillText(line, w / 2, h * 0.58 + (i - (all.length - 1) / 2) * 52, w - 20));
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 5; g.strokeRect(16, 100, w - 32, h - 120);
      });
      const tag = s.mesh(new THREE.PlaneGeometry(0.095, 0.22), new THREE.MeshStandardMaterial({ map: tagMap, roughness: 0.8, side: THREE.DoubleSide }), [DW - 0.11 - 0.09, leverY - 0.085, 0.102]);
      tag.rotation.z = (random() - 0.5) * 0.12;
      inDoor(tag);
    }
    if (a.door === 'crack') s.box([0.03, DH - 0.04, 0.012], [DW / 2 - 0.03, DH / 2, -0.07], new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 2.4 }));

    // ---- what waits on the carpet ------------------------------------------------------
    const cloth = s.material('#f3f1ea', { roughness: 0.95 });
    if (a.outside === 'tray' || a.outside === 'both') {
      const tx = 0.52, tz = 0.5;
      s.cylinder(0.22, 0.22, 0.02, [tx, 0.024, tz], s.material('#3a2e26', { roughness: 0.5 }), 24);
      s.cylinder(0.11, 0.11, 0.008, [tx - 0.05, 0.038, tz + 0.02], s.material('#f6f4ee', { roughness: 0.4 }), 24);
      s.mesh(new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), chrome, [tx - 0.05, 0.042, tz + 0.02]);
      s.ball([0.012, 0.012, 0.012], [tx - 0.05, 0.145, tz + 0.02], chrome, 8);
      s.cylinder(0.03, 0.022, 0.09, [tx + 0.12, 0.079, tz - 0.05], new THREE.MeshStandardMaterial({ color: '#e8f0f2', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }), 14);
      s.box([0.07, 0.03, 0.07], [tx + 0.1, 0.049, tz + 0.1], cloth);
    }
    if (a.outside === 'shoes' || a.outside === 'both') {
      const leather = s.material('#1a1a1c', { roughness: 0.25, metalness: 0.1 });
      const sx = a.outside === 'both' ? -0.45 : 0.35;
      for (const dx of [-0.06, 0.06]) {
        s.box([0.09, 0.045, 0.2], [sx + dx, 0.0365, 0.3], leather);
        s.ball([0.045, 0.03, 0.065], [sx + dx, 0.044, 0.2], leather, 12);
        s.box([0.08, 0.012, 0.26], [sx + dx, 0.02, 0.28], s.material('#2a2320'));
      }
    }
    if (a.outside === 'luggage') {
      const shell = s.material(random() < 0.5 ? '#2a2f3a' : '#6b1f24', { roughness: 0.5 });
      s.box([0.36, 0.5, 0.22], [0.6, 0.29, 0.45], shell);
      for (const x of [-0.12, 0.12]) s.cylinder(0.025, 0.025, 0.02, [0.6 + x, 0.03, 0.52], s.material('#111'), 12).rotation.x = Math.PI / 2;
      for (const x of [-0.08, 0.08]) s.rod([0.6 + x, 0.54, 0.4], [0.6 + x, 0.92, 0.4], 0.006, chrome);
      s.box([0.2, 0.025, 0.03], [0.6, 0.93, 0.4], s.material('#111'));
    }
    if (a.newspaper) {
      const newsMap = paint(256, 160, (g, w, h) => {
        g.fillStyle = '#e8e4d8'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#1a1a1e'; g.font = 'bold 34px serif'; g.textAlign = 'center'; g.fillText('THE HERALD', w / 2, 40);
        g.fillRect(16, 52, w - 32, 3);
        for (let i = 0; i < 6; i++) g.fillRect(16 + (i % 2) * 120, 66 + Math.floor(i / 2) * 26, 100, 8);
        g.fillStyle = '#777'; g.fillRect(16, 140, w - 32, 6);
      });
      const paper = multi(new THREE.BoxGeometry(0.3, 0.02, 0.2), [cloth, cloth, new THREE.MeshStandardMaterial({ map: newsMap, roughness: 0.95 }), cloth, cloth, cloth], [-0.35, 0.024, 0.42]);
      paper.rotation.y = mix(-0.4, 0.4, random());
    }

    return s.finish();
  },
});
