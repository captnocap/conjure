import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    surface: choice('What sculpture covers the pollen wall?', { spines: 'A globe covered with conical spines.', mesh: 'Rounded pits with raised reticulated rims.', ribs: 'Long ribs and three deep longitudinal furrows.', smooth: 'A nearly smooth shell with visible pores.' }),
    shape: choice('What shape is the enlarged grain?', { sphere: 'An almost perfect sphere.', oval: 'A long ovoid grain.', triangular: 'A softly triangular grain with three lobes.' }),
    size: score('How large is this enlarged specimen?', ['A small magnified study', 'A hand-sized botanical model', 'A larger display specimen']),
    pigment: choice('What natural tone colours the shell?', { gold: 'Golden yellow.', cream: 'Ivory cream.', ochre: 'Warm ochre.', green: 'Pale olive green.' }),
    relief: score('How strongly does the surface relief stand out?', ['Fine subtle relief', 'Clearly raised details', 'Bold structural shell sculpture']),
    pores: noul('Are three germination pores clearly outlined?'),
    tube: noul('Has a slender pollen tube begun to emerge from a pore?'),
    pedestal: noul('Does the enlarged specimen rest on a small botanical display base?'),
  },
  build(a, context) {
    const s = new Sculpture(context), r = 0.012 + a.size * 0.11, shell = s.material({ gold: '#c7b36e', cream: '#dcd2ae', ochre: '#b99b65', green: '#b7bd89' }[a.pigment]), dark = s.material('#9b8d63'), pale = s.material('#e0d2a7'), sy = a.shape === 'oval' ? 1.32 : 1, y = r * sy + (a.pedestal ? r * 0.13 : 0);
    const body = s.ball([r, r * sy, r], [0, y, 0], shell, 28);
    if (a.shape === 'triangular') { const pos = body.geometry.getAttribute('position'); for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), t = Math.atan2(z, x), f = 1 + Math.cos(t * 3) * 0.11; pos.setXYZ(i, x * f, pos.getY(i), z * f); } pos.needsUpdate = true; body.geometry.computeVertexNormals(); }
    if (a.surface === 'spines' || a.surface === 'mesh') for (let i = 0; i < 90; i++) {
      const yy = 1 - (i + 0.5) / 90 * 2, rr = Math.sqrt(1 - yy * yy), t = i * 2.4, direction = new THREE.Vector3(Math.cos(t) * rr, yy, Math.sin(t) * rr), p: [number, number, number] = [direction.x * r, y + direction.y * r * sy, direction.z * r];
      if (a.surface === 'spines') { const height = r * (0.06 + a.relief * 0.22), spike = s.cylinder(0, r * 0.045, height, [p[0] + direction.x * height * 0.45, p[1] + direction.y * height * 0.45, p[2] + direction.z * height * 0.45], shell, 5); spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction); }
      else { const rim = s.ring(r * 0.084, r * (0.008 + a.relief * 0.012), p, pale); rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction); }
    }
    if (a.surface === 'ribs') for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6, pts: [number, number, number][] = []; for (let j = 0; j < 17; j++) { const v = j / 16 * Math.PI; pts.push([Math.cos(t) * Math.sin(v) * r * 1.012, y + Math.cos(v) * r * sy, Math.sin(t) * Math.sin(v) * r * 1.012]); } s.tube(pts, r * (0.012 + a.relief * 0.018), i % 4 === 0 ? dark : pale); }
    if (a.pores) for (let i = 0; i < 3; i++) { const t = i * Math.PI * 2 / 3, direction = new THREE.Vector3(Math.cos(t), 0.1, Math.sin(t)).normalize(), p: [number, number, number] = [direction.x * r * 1.02, y + direction.y * r, direction.z * r * 1.02], pore = s.ball([r * 0.095, r * 0.095, r * 0.012], p, dark, 12); pore.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction); const rim = s.ring(r * 0.11, r * 0.021, p, pale); rim.quaternion.copy(pore.quaternion); }
    if (a.tube) s.tube([[r, y + r * 0.1, 0], [r * 1.5, y + r * 0.13, 0], [r * 1.7, y + r * 0.5, r * 0.1], [r * 1.9, y + r * 0.9, r * 0.06]], r * 0.035, pale);
    if (a.pedestal) s.cylinder(r * 1.25, r * 1.35, r * 0.13, [0, r * 0.065, 0], s.material('#b5b9a7'), 24);
    return s.finish();
  },
});
