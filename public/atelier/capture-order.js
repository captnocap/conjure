// Coplanar opaque surfaces must not choose a winner from material creation
// history. This comparator changes only the renderer's opaque list; Three keeps
// its normal back-to-front ordering for transmission and transparency.
export function createStableOpaqueSort(solids) {
  const order = new Map(solids.map((object, index) => [object, index]));
  return (a, b) => {
    const authoredOrder = a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder;
    if (authoredOrder) return authoredOrder;
    const ai = order.get(a.object), bi = order.get(b.object);
    if (ai !== undefined && bi !== undefined) return ai - bi || a.id - b.id;
    // Keep one total order if a helper is ever mixed with the fixed solids.
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    // PMREM and other renderer-owned scenes contain no fixed solids. Preserve
    // r180's ordinary opaque comparator for those independent scenes.
    return a.material.id - b.material.id || a.z - b.z || a.id - b.id;
  };
}
