import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** Seamless value noise on the sphere, so the painted map has no seam and no pinched poles. */
function noiseOf(seed: number) {
  const lattice = (x: number, y: number, z: number) => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const edge = (dy: number, dz: number) => lattice(xi, yi + dy, zi + dz) * (1 - u) + lattice(xi + 1, yi + dy, zi + dz) * u;
    return (edge(0, 0) * (1 - v) + edge(1, 0) * v) * (1 - w) + (edge(0, 1) * (1 - v) + edge(1, 1) * v) * w;
  };
  return (x: number, y: number, z: number, octaves = 4) => {
    let total = 0, weight = 0.5, scale = 1;
    for (let i = 0; i < octaves; i++) {
      total += noise(x * scale + i * 7.3, y * scale, z * scale) * weight;
      weight *= 0.5; scale *= 2.03;
    }
    return total / (1 - 0.5 ** octaves);
  };
}

type RGB = [number, number, number];
const rgb = (hex: string): RGB => { const c = new THREE.Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };
const blend = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const FORMER = {
  ocean: 'An ocean world: pale salt basins ringed with bathtub lines where the seas used to reach.',
  city: 'A city world: every continent covered in a dead grey grid of streets.',
  garden: 'A garden world: forests burnt to black stubble and rivers dried to pale scars.',
  ice: 'A frozen world thawed too far: wet grey rock and the last fogged pools of meltwater.',
} as const;
const GROUND: Record<keyof typeof FORMER, { land: string; basin: string; deep: string; mark: string; tail: string }> = {
  ocean: { land: '#8d6a48', basin: '#d6c8a8', deep: '#f1eada', mark: '#5c4634', tail: '#5aa6cf' },
  city: { land: '#8a857c', basin: '#b3a78e', deep: '#c9bea6', mark: '#3a3838', tail: '#8a8791' },
  garden: { land: '#6b5a34', basin: '#bba07a', deep: '#d2bd98', mark: '#221b15', tail: '#a8875c' },
  ice: { land: '#a8a39a', basin: '#9db7c4', deep: '#cfe0e6', mark: '#6c7378', tail: '#7cc4d8' },
};

export default defineThing({
  questions: {
    former: choice('What did this world used to be?', FORMER),
    gone: score('How far gone is it?', ['Seas just boiled off, still recognisable', 'A scorched bullseye on the day side', 'Half the globe molten', 'A glowing cinder with a crust of slag']),
    tail: score('How long is its tail of boiled-off atmosphere?', ['A thin haze clinging to it', 'A short plume', 'A long comet tail', 'A vast streamer many times its width']),
    remains: choice('What is still left on the night side?', {
      nothing: 'Nothing. It is all dead ground.',
      sea: 'One last dark-blue sea, shrinking.',
      green: 'A final strip of green that has not burned yet.',
      lights: 'City lights, still on, as if someone were home.',
      ice: 'A white polar cap, the last cold place.',
    }),
    company: choice('Is anything still orbiting it?', {
      none: 'No, it is alone.',
      moon: 'A small grey dead moon, still faithfully circling.',
      debris: 'A thin ring of wreckage and rubble.',
      station: 'One abandoned space station.',
      exodus: 'A line of tiny ships leaving, their engines lit.',
    }),
    facing: choice('Which side of it do we see?', {
      day: 'Mostly the glowing day side, with the tail streaming away behind.',
      terminator: 'Side-on: fire on one half, dark on the other, tail trailing sideways.',
      night: 'Mostly the dark night side, with a rim of fire and the tail coming toward us.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.5;
    const fbm = noiseOf(context.seed ^ Math.floor(random() * 1e9));
    const ground = GROUND[a.former];
    const land = rgb(ground.land), basin = rgb(ground.basin), deep = rgb(ground.deep), mark = rgb(ground.mark);
    const char = rgb('#3a261c'), crust = rgb('#3d1712');
    const hotLow = rgb(mood.warmth > 0.5 ? '#ff5a14' : '#d8281c'), hotHigh = rgb(mood.warmth > 0.5 ? '#ffe27a' : '#ffa23c');
    const gone = Math.min(1, a.gone * 0.9 + mood.wear * 0.15);
    const meltLine = mix(0.78, -0.3, gone);

    const width = 768, height = 384;
    const colour = document.createElement('canvas'), light = document.createElement('canvas');
    colour.width = light.width = width; colour.height = light.height = height;
    const cctx = colour.getContext('2d')!, lctx = light.getContext('2d')!;
    const cdata = cctx.createImageData(width, height), ldata = lctx.createImageData(width, height);
    for (let py = 0; py < height; py++) {
      const theta = ((py + 0.5) / height) * Math.PI;
      const dy = Math.cos(theta), ring = Math.sin(theta);
      for (let px = 0; px < width; px++) {
        const phi = ((px + 0.5) / width) * Math.PI * 2;
        const dx = -Math.cos(phi) * ring, dz = Math.sin(phi) * ring;
        const relief = fbm(dx * 1.7 + 11, dy * 1.7, dz * 1.7, 5);
        const fine = fbm(dx * 7, dy * 7 + 5, dz * 7, 3);
        const isLand = relief > 0.5;
        let c: RGB = isLand ? blend(land, mark, smooth(0.5, 0.75, fine) * 0.35) : blend(basin, deep, smooth(0.5, 0.3, relief));
        // Bathtub rings: old shorelines stepping down into the basins.
        if (!isLand) for (const level of [0.492, 0.462, 0.43, 0.39]) if (Math.abs(relief - level) < 0.0045) c = blend(c, mark, 0.75);
        if (a.former === 'city' && isLand) {
          const lon = phi * 28, lat = theta * 28;
          const street = Math.min(Math.abs(lon - Math.round(lon)), Math.abs(lat - Math.round(lat)));
          const avenue = Math.min(Math.abs(lon / 4 - Math.round(lon / 4)), Math.abs(lat / 4 - Math.round(lat / 4)));
          if (street < 0.11 || avenue < 0.05) c = blend(c, mark, 0.85);
        }
        if (a.former === 'garden' && isLand && fine > 0.52) c = blend(c, mark, 0.9);
        if (a.former === 'ice' && isLand && fine < 0.4) c = blend(c, rgb('#70797d'), 0.6);
        let glowR = 0, glowG = 0, glowB = 0;
        const night = -dx;
        const refuge = smooth(0.35, 0.6, night + (fine - 0.5) * 0.5);
        if (refuge > 0) {
          if (a.remains === 'sea' && !isLand && relief < 0.47) c = blend(c, rgb('#1f5f96'), refuge);
          if (a.remains === 'green' && isLand) c = blend(c, rgb('#4c8f43'), refuge * smooth(0.35, 0.5, fine));
          if (a.remains === 'ice' && Math.abs(dy) > 0.62 + (fine - 0.5) * 0.3) c = blend(c, rgb('#f4f8fa'), refuge);
          if (a.remains === 'lights' && isLand) {
            const lon = phi * 28, lat = theta * 28;
            const node = Math.hypot(lon - Math.round(lon), lat - Math.round(lat));
            const lit = fbm(Math.round(lon) * 0.9, Math.round(lat) * 0.9, 3.3, 1) > 0.45;
            if (node < 0.3 && lit) { glowR = 255 * refuge; glowG = 205 * refuge; glowB = 120 * refuge; c = blend(c, rgb('#ffd58a'), refuge * 0.8); }
          }
        }
        // Bake a little of the star's light, so day and night read under any world's lamps.
        const lit = mix(0.68, 1.08, smooth(-0.45, 0.4, dx));
        c = [c[0] * lit, c[1] * lit, c[2] * lit];
        const ragged = dx + (fine - 0.5) * 0.4 + (relief - 0.5) * 0.5;
        const scorch = smooth(meltLine - 0.5, meltLine - 0.05, ragged);
        c = blend(c, char, scorch * 0.8);
        const melt = smooth(meltLine - 0.06, meltLine + 0.12, ragged);
        if (melt > 0) {
          const plates = fbm(dx * 11 + 3, dy * 11, dz * 11, 3);
          const level = mix(0.4, 0.68, melt * smooth(meltLine - 0.1, meltLine + 0.9, dx + 0.2));
          const open = smooth(level + 0.05, level - 0.05, plates) * melt;
          const heat = blend(hotLow, hotHigh, smooth(0.2, 0.9, open * smooth(meltLine, 1, dx + 0.25)));
          c = blend(blend(c, crust, melt), heat, open);
          glowR = Math.max(glowR, heat[0] * open); glowG = Math.max(glowG, heat[1] * open); glowB = Math.max(glowB, heat[2] * open);
        }
        const at = (py * width + px) * 4;
        cdata.data[at] = c[0]; cdata.data[at + 1] = c[1]; cdata.data[at + 2] = c[2]; cdata.data[at + 3] = 255;
        ldata.data[at] = glowR; ldata.data[at + 1] = glowG; ldata.data[at + 2] = glowB; ldata.data[at + 3] = 255;
      }
    }
    cctx.putImageData(cdata, 0, 0);
    lctx.putImageData(ldata, 0, 0);
    const map = new THREE.CanvasTexture(colour), emissiveMap = new THREE.CanvasTexture(light);
    map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;

    // The star is off-stage; the map's day side is +x, so turn the globe until +x faces it.
    const bearing = { day: 0.5, terminator: 1.5, night: 2.45 }[a.facing] + (random() - 0.5) * 0.25;
    const toStar = new THREE.Vector3(-Math.sin(bearing), 0.12, Math.cos(bearing)).normalize();
    const system = new THREE.Group();
    s.root.add(system);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 44), new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: mix(0.9, 1.3, mood.cheer), roughness: 0.92 }));
    globe.castShadow = true;
    const facing = new THREE.Group();
    facing.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), toStar);
    globe.rotation.x = (random() - 0.5) * 0.5;
    facing.add(globe);
    system.add(facing);

    // The tail: a streaked, see-through sock of gas blown straight away from the star.
    const streaks = document.createElement('canvas');
    streaks.width = streaks.height = 256;
    const sctx = streaks.getContext('2d')!;
    sctx.fillStyle = 'rgba(255,255,255,0.5)';
    sctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      sctx.fillStyle = random() < 0.5 ? `rgba(255,255,255,${0.2 + random() * 0.5})` : `rgba(0,0,0,${0.15 + random() * 0.3})`;
      if (random() < 0.4) sctx.globalCompositeOperation = 'destination-out';
      sctx.fillRect(random() * 256, 0, 1 + random() * 7, 256);
      sctx.globalCompositeOperation = 'source-over';
    }
    const streakMap = new THREE.CanvasTexture(streaks);
    streakMap.wrapS = streakMap.wrapT = THREE.RepeatWrapping;
    streakMap.repeat.set(2, 1);
    const length = R * mix(1.3, 5.5, a.tail);
    const tailColour = new THREE.Color(ground.tail).lerp(new THREE.Color('#e0672a'), gone * 0.45);
    const bend = (random() < 0.5 ? -1 : 1) * mix(0.1, 0.3, random());
    const flows: THREE.Texture[] = [streakMap];
    const sock = (girth: number, reach: number, opacity: number) => {
      const profile = Array.from({ length: 33 }, (_unused, i) => {
        const t = i / 32;
        return new THREE.Vector2(R * girth * (1 - t) ** 0.65 * (1 + 0.1 * Math.sin(t * 11 + girth * 9)) + 0.001, length * reach * t);
      });
      const geometry = new THREE.LatheGeometry(profile, 36);
      const at = geometry.attributes.position, shade: number[] = [];
      for (let i = 0; i < at.count; i++) {
        const t = at.getY(i) / (length * reach);
        at.setZ(i, at.getZ(i) + bend * t * t * length * reach * 0.5);
        shade.push(1, 1, 1, opacity * smooth(0, 0.08, t) * (1 - t) ** 0.8);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(shade, 4));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: streakMap, color: tailColour, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      mesh.rotation.z = Math.PI / 2;
      return mesh;
    };
    const tail = new THREE.Group();
    tail.add(sock(1.07, 1, 0.75), sock(0.7, 0.72, 0.6));
    // Solid droplets of what boiled away, so the tail is framed and measured as part of the thing.
    const drops = Array.from({ length: 34 }, (_unused, i) => {
      const t = 0.12 + (i / 34) * 0.85, spread = R * 0.8 * (1 - t) ** 0.65;
      return { at: [-t * length, (random() - 0.5) * spread, bend * t * t * length * 0.5 + (random() - 0.5) * spread] as [number, number, number], size: mix(0.085, 0.025, t) * (0.6 + random() * 0.8) };
    });
    tail.add(s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: tailColour.clone().lerp(new THREE.Color('#ffffff'), 0.35), roughness: 0.8 }), drops));
    tail.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), toStar);
    system.add(tail);
    const coma = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 36, 20), new THREE.MeshBasicMaterial({ color: tailColour, transparent: true, opacity: 0.16 + a.tail * 0.12, depthWrite: false }));
    system.add(coma);

    // Whatever still keeps it company.
    const orbit = new THREE.Group();
    orbit.rotation.set(0.25 + random() * 0.2, 0, (random() - 0.5) * 0.4);
    system.add(orbit);
    const grey = s.material('#8f8a84', { roughness: 0.95 });
    if (a.company === 'moon') {
      const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.17, 2), grey);
      moon.position.set(R * 1.65, 0, 0);
      moon.castShadow = true;
      for (let i = 0; i < 5; i++) {
        const pit = new THREE.Mesh(new THREE.SphereGeometry(R * (0.025 + random() * 0.02), 8, 6), s.material('#5f5b57'));
        pit.position.setFromSphericalCoords(R * 0.153, random() * Math.PI, random() * Math.PI * 2);
        moon.add(pit);
      }
      orbit.add(moon);
    }
    if (a.company === 'debris') {
      const bits = Array.from({ length: Math.round(mix(50, 150, mood.density)) }, () => {
        const angle = random() * Math.PI * 2, r = R * (1.45 + random() * 0.3);
        return { at: [Math.cos(angle) * r, (random() - 0.5) * 0.06, Math.sin(angle) * r] as [number, number, number], size: 0.015 + random() ** 3 * 0.06, color: random() < 0.3 ? '#c9b89a' : '#6f6a66' };
      });
      const rubble = s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.9, flatShading: true }), bits);
      orbit.add(rubble);
    }
    if (a.company === 'station') {
      const station = new THREE.Group();
      const hull = s.material('#d8d6cf', { metalness: 0.4, roughness: 0.5 });
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 28), hull);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), hull);
      hub.rotation.x = Math.PI / 2;
      station.add(wheel, hub);
      for (let i = 0; i < 2; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.015, 0.015), hull);
        spoke.rotation.z = (i * Math.PI) / 2;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.008), s.material('#2a3f66', { metalness: 0.5 }));
        panel.position.set((i ? 1 : -1) * 0.36, 0, 0);
        station.add(spoke, panel);
      }
      station.position.set(R * 1.5, 0, 0);
      station.rotation.y = 0.8;
      station.traverse((node) => { node.castShadow = true; });
      orbit.add(station);
    }
    if (a.company === 'exodus') {
      const ships = 5 + Math.floor(random() * 5 + mood.density * 6);
      const hull = s.material('#e6e3da', { metalness: 0.3, roughness: 0.5 });
      const flame = new THREE.MeshBasicMaterial({ color: '#8fe0ff' });
      const away = toStar.clone().negate().add(new THREE.Vector3(0, 0.75, 0)).normalize();
      const pointing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), away);
      for (let i = 0; i < ships; i++) {
        const ship = new THREE.Group();
        const size = 0.1 + random() * 0.06;
        const body = new THREE.Mesh(new THREE.ConeGeometry(size * 0.45, size * 2.6, 6), hull);
        const burn = new THREE.Mesh(new THREE.SphereGeometry(size * 0.4, 8, 6), flame);
        burn.position.y = -size * 1.4;
        body.castShadow = true;
        ship.add(body, burn);
        ship.quaternion.copy(pointing);
        ship.position.copy(away).multiplyScalar(R * (1.2 + i * 0.3)).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.22)).addScaledVector(toStar, -R * 0.25);
        system.add(ship);
      }
    }

    const flow = mix(0.04, 0.3, mood.energy);
    const thing = s.finish({
      footprint: R,
      update: (dt, time) => {
        for (const texture of flows) texture.offset.y -= dt * flow;
        orbit.rotation.y += dt * mix(0.05, 0.4, mood.energy);
        coma.scale.setScalar(1 + Math.sin(time * 0.8) * 0.012);
      },
    });
    s.root.position.y += R * 0.07;
    return thing;
  },
});
