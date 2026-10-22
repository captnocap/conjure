import { createSmallGeometryCache } from './perlage-small-geometry.js';

const attrStamp = (a, versioned) => a ? [a, a.array, a.count, a.itemSize, a.normalized, a.data, versioned ? a.version : null, versioned ? a.data?.version : null] : [null];
const same = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function fingerprint(mesh, render, copied) {
  const source=mesh.geometry;
  return [source,render,source.type,...mesh.matrixWorld.elements,
    ...Object.entries(source.attributes).flatMap(([name,a])=>[name,...attrStamp(a,name==='position'||name==='uv')]),
    ...attrStamp(source.index,true),
    render.groups,render.drawRange,render.boundingBox,render.boundingSphere,render.morphAttributes,render.morphTargetsRelative,
    ...attrStamp(render.index,true),
    ...Object.entries(render.attributes).flatMap(([name,a])=>[name,...attrStamp(a,copied||name==='position'||name==='uv')])];
}

// One scoped borrower per immutable scene object. During preparation, replaced
// views stay alive until the scene atomically installs its new geometries.
// releaseUnused retires both wrapper and chart buffers in dependency order.
export function createPerlageGeometryManager() {
  const current=new WeakMap(),records=new Set();let disposed=false;
  function retire(record) {
    record.cache.dispose();records.delete(record);
    if(current.get(record.mesh)===record)current.delete(record.mesh);
  }
  return {
    prepare(mesh,render) {
      if(disposed)throw new Error('Perlage geometry manager is disposed');
      if(!mesh?.isMesh||!render?.isBufferGeometry)throw new TypeError('Original mesh and owned render geometry required');
      const old=current.get(mesh),key=fingerprint(mesh,render,old?.view.userData.perlageChart.split);
      if(old&&same(old.key,key))return old.view;
      const cache=createSmallGeometryCache();
      try {
        const view=cache.createGeometry(mesh.geometry,render,mesh.matrixWorld);
        // All nineteen supported scene objects retain unsplit borrowed AO.
        // A future mixed-validity mesh needs an explicit copied-AO refresh path.
        if(view.userData.perlageChart.split)throw new RangeError('Split perlage charts are outside the fixed-scene material contract');
        const record={mesh,view,cache,key:fingerprint(mesh,render,view.userData.perlageChart.split)};
        records.add(record);current.set(mesh,record);return view;
      } catch(error) {cache.dispose();throw error;}
    },
    releaseUnused(activeGeometries) {
      if(disposed)return;
      const retained=new Set(activeGeometries);
      for(const record of [...records])if(!retained.has(record.view))retire(record);
      // A failed preparation may have installed a newer current pointer while
      // the scene still owns the previous view. Restore that retained record.
      for(const record of records)current.set(record.mesh,record);
    },
    dispose() {if(disposed)return;disposed=true;for(const record of [...records])retire(record);},
  };
}
