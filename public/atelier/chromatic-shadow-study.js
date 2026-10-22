import { renderChromaticShadows, WIDTH } from './chromatic-shadow-core.js';
import { validateMaterials, defaultMaterials } from './material-state.js';

export function prepareChromaticShadowFrame(frame) {
  if (frame.w !== WIDTH) throw new RangeError('Chromatic shadows requires the fixed 720-pixel capture');
  if (typeof frame.prepare !== 'function') throw Error('Chromatic shadows needs the frame preparation cache');
  return frame.prepare('chromatic-shadows', () => {
    const geometry = frame.geometrySnapshot?.();
    if (geometry?.meshes?.length !== 20) throw Error('Chromatic shadows requires the fixed 20-mesh Garden');
    const settings = validateMaterials(frame.materialSettings || defaultMaterials());
    // Every original Garden mesh casts a shadow (scene.add). The reviewed core
    // applies the same explicit Frosted override and eligible shell apertures.
    const materials = geometry.meshes.map((_mesh, index) => ({
      materialId: settings.assignments[index + 1] || 'original',
      originalCastShadow: true,
    }));
    const result = renderChromaticShadows({
      width: frame.w, height: frame.w, geometry, materials,
      color: frame.color, depth: frame.depth, identity: frame.identity,
      worldFromClip: frame.worldFromClip, sectionRibLighting: frame.sectionRibLighting,
    });
    // Retain only the completed image. Both owner fields and the disposed BVH
    // become unreachable; there is no new global cache or worker lifecycle.
    return result.pixels;
  });
}

export function drawChromaticShadows(p, frame) {
  const pixels = prepareChromaticShadowFrame(frame);
  p.loadPixels();
  if (p.pixels.length !== pixels.length) throw Error('Chromatic shadows requires pixel density 1');
  p.pixels.set(pixels);
  p.updatePixels();
}

export const chromaticShadowStudy = {
  id: 'chromatic-shadows', name: 'Chromatic shadows', family: 'Light & waves',
  offThread: true, fixedSourceSize: 720,
  control: 'Fixed mapping', fixedSettings: '2 directions · 4 states',
  formatStrength: () => '2 directions · 4 states',
  title: 'Two directions, four shadow states.',
  medium: 'Geometric visibility / illustrative color', swatch: '#38abb1',
  category: 'FALSE-COLOR SHADOW ATLAS',
  description: 'Cyan and magenta distinguish blocked paths toward the two existing light directions. Their opposed footprints meet in dark regions on the plinth; the captured brightness keeps surface texture and reflections visible.',
  mechanism: 'Independent triangle-traced key/fill visibility · current shell openings and caster policy · fixed four-state palette · source-luminance modulation. False-color illustration, not colored relighting. Material hue is replaced; directions, geometry and mixer masks stay fixed. Binary pixel-center queries omit penumbrae and refracted paths.',
  reference: 'https://olafureliasson.net/artwork/your-uncertain-shadow-colour-2010/',
  referenceLabel: 'Olafur Eliasson / Your uncertain shadow (colour)',
  draw: drawChromaticShadows,
};
