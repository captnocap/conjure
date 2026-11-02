import { BufferAttribute, BufferGeometry, Vector3, Matrix4 } from 'three';
import { createPerlageChartCache } from './perlage-charts.js';

// Frozen canonical scene policy. Eligibility is independent of current camera,
// render size, contact samples and object identity. It is a supported material
// fallback, not an integral or a physical average of the unresolved finish.
export const SMALL_GEOMETRY_POLICY = Object.freeze({ contacts:32, size:720, worldSpan:8.2, projectionFactor:0.5, minimumPixels:8 });

export function eligibility(sourceGeometry, modelMatrix = new Matrix4()) {
  const p=sourceGeometry.getAttribute('position'),index=sourceGeometry.index;
  const count=index?.count??p?.count;
  if (!p || p.itemSize!==3 || count%3) throw new TypeError('Original complete triangle geometry required');
  if (!modelMatrix.elements.every(Number.isFinite)) throw new TypeError('Finite model matrix required');
  const a=new Vector3(),b=new Vector3(),c=new Vector3(),ab=new Vector3(),ac=new Vector3();
  let worldArea=0;
  for (let j=0;j<count;j+=3) {
    a.fromBufferAttribute(p,index?index.getX(j):j).applyMatrix4(modelMatrix);
    b.fromBufferAttribute(p,index?index.getX(j+1):j+1).applyMatrix4(modelMatrix);
    c.fromBufferAttribute(p,index?index.getX(j+2):j+2).applyMatrix4(modelMatrix);
    if (![a,b,c].every(v=>v.toArray().every(Number.isFinite))) throw new TypeError('Finite source positions required');
    worldArea+=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()*0.5;
  }
  const pcy=SMALL_GEOMETRY_POLICY;
  const estimatedContactPixels=Math.sqrt(worldArea*pcy.projectionFactor/pcy.contacts)/(pcy.worldSpan/pcy.size);
  return {worldArea,estimatedContactPixels,isotropicFallback:estimatedContactPixels<pcy.minimumPixels};
}

export function createSmallGeometryCache() {
  const charts=createPerlageChartCache(),byChart=new WeakMap(),views=new Set();
  return {
    createGeometry(source,render=source,modelMatrix=new Matrix4()) {
      const chart=charts.createGeometry(source,render);
      let entries=byChart.get(chart);if (!entries) {entries=new Map();byChart.set(chart,entries);}
      // Include source position/index versions as well as transform: the chart
      // may be reused after a SOURCE edit when render is a separate baked owner.
      const p=source.getAttribute('position'),ix=source.index;
      const key=JSON.stringify([modelMatrix.elements,p.version,ix?.version??null]);
      const old=entries.get(key);
      if (old&&old.sourcePosition===p&&old.sourceArray===p.array&&old.sourceIndex===ix&&old.indexArray===ix?.array) return old.view;
      const policy=eligibility(source,modelMatrix),view=new BufferGeometry();
      for (const [name,attr] of Object.entries(chart.attributes)) view.setAttribute(name,attr);
      view.setIndex(chart.index);view.groups=chart.groups;view.drawRange=chart.drawRange;
      view.boundingBox=chart.boundingBox;view.boundingSphere=chart.boundingSphere;
      view.morphAttributes=chart.morphAttributes;view.morphTargetsRelative=chart.morphTargetsRelative;
      const data=new Float32Array(chart.getAttribute('position').count).fill(policy.isotropicFallback?0:1);
      view.setAttribute('perlageEnabled',new BufferAttribute(data,1));
      view.userData={...chart.userData,perlageEligibility:{...policy,canonical:{...SMALL_GEOMETRY_POLICY},addedAttributeBytes:data.byteLength}};
      const ownDispose=view.dispose.bind(view);let disposed=false;
      view.dispose=()=>{if(disposed)return;disposed=true;for(const name of Object.keys(chart.attributes))view.deleteAttribute(name);view.setIndex(null);view.morphAttributes={};if(entries.get(key)?.view===view)entries.delete(key);views.delete(view);ownDispose();};
      views.add(view);entries.set(key,{view,sourcePosition:p,sourceArray:p.array,sourceIndex:ix,indexArray:ix?.array});return view;
    },
    invalidateGeometry(render) { charts.invalidateGeometry(render); },
    // Release this wrapper's borrowers before the underlying chart views.
    dispose() { for (const view of [...views])view.dispose();charts.dispose(); },
  };
}
