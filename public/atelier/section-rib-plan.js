import { validateSectionRibField } from './section-rib.js';
// One immutable capture owns one field, independent of seed and contrast.
// Plans are cloned into workers; never detach a plan retained on the main thread.
const captures=new WeakMap();let nextSource=0;
const keys=['version','model','source','size','field'];
export function validateSectionRibPlan(plan,{source,size}) {
  if(!plan||typeof plan!=='object'||Object.keys(plan).length!==keys.length||!keys.every(k=>Object.hasOwn(plan,k))||
      plan.version!==1||plan.model!=='section-rib-plan-v1'||plan.source!==source||plan.size!==size||
      typeof source!=='string'||!source.length||source.length>80||!Number.isInteger(size)||size<1||size>720||plan.field?.size!==size)
    throw Error('Invalid section-rib plan association');
  validateSectionRibField(plan.field);return plan;
}
export function sectionRibPreparation(raw) {
  if(!raw||typeof raw!=='object'||!Number.isInteger(raw.size)||raw.size<1||raw.size>720)throw Error('Invalid section-rib source');
  let capture=captures.get(raw);
  if(!capture){capture={source:`section-rib-${++nextSource}`,plan:undefined};captures.set(raw,capture);}
  return {source:capture.source,size:raw.size,plan:capture.plan};
}
export function compactSectionRibPlan(full,association) {
  validateSectionRibField(full);
  const field={version:full.version,model:full.model,size:full.size,samples:full.samples.slice(),groups:full.groups.slice(),colors:full.colors.slice()};
  return validateSectionRibPlan({version:1,model:'section-rib-plan-v1',source:association.source,size:association.size,field},association);
}
export function rememberSectionRibPlan(raw,plan) {
  validateSectionRibPlan(plan,sectionRibPreparation(raw));captures.get(raw).plan=plan;
}
