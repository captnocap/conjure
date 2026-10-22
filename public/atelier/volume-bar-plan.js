import { validateVolumeBarField } from './volume-bar.js';
// One immutable capture owns one field, independent of seed and contrast.
// Plans are cloned into workers; never detach a plan retained on the main thread.
const captures=new WeakMap();let nextSource=0;
const keys=['version','model','source','size','field'];
export function validateVolumeBarPlan(plan,{source,size}) {
  if(!plan||typeof plan!=='object'||Object.keys(plan).length!==keys.length||!keys.every(k=>Object.hasOwn(plan,k))||
      plan.version!==1||plan.model!=='volume-bar-plan-v1'||plan.source!==source||plan.size!==size||
      typeof source!=='string'||!source.length||source.length>80||!Number.isInteger(size)||size<1||size>720||plan.field?.size!==size)
    throw Error('Invalid volume-bar plan association');
  validateVolumeBarField(plan.field);return plan;
}
export function volumeBarPreparation(raw) {
  if(!raw||typeof raw!=='object'||!Number.isInteger(raw.size)||raw.size<1||raw.size>720)throw Error('Invalid volume-bar source');
  let capture=captures.get(raw);
  if(!capture){capture={source:`volume-bar-${++nextSource}`,plan:undefined};captures.set(raw,capture);}
  return {source:capture.source,size:raw.size,plan:capture.plan};
}
export function compactVolumeBarPlan(full,association) {
  validateVolumeBarField(full);
  const field={version:full.version,model:full.model,size:full.size,samples:full.samples.slice(),groups:full.groups.slice(),colors:full.colors.slice()};
  return validateVolumeBarPlan({version:1,model:'volume-bar-plan-v1',source:association.source,size:association.size,field},association);
}
export function rememberVolumeBarPlan(raw,plan) {
  validateVolumeBarPlan(plan,volumeBarPreparation(raw));captures.get(raw).plan=plan;
}

// This fixed study emits exactly one complete opaque pixel patch. Validate it
// before replay or cache admission; the general protocol permits other studies'
// partial patches and command sequences.
export function validateVolumeBarDrawing(packet,size) {
  const owned=(array,Type,length)=>array instanceof Type && array.length===length &&
    array.buffer instanceof ArrayBuffer && array.byteOffset===0 && array.byteLength===array.buffer.byteLength;
  if(!Number.isInteger(size)||size<1||size>720||!packet||typeof packet!=='object'||
      Object.keys(packet).length!==3||!['commands','strings','pixels'].every(key=>Object.hasOwn(packet,key))||
      !owned(packet.commands,Float64Array,3)||packet.commands[0]!==18||packet.commands[1]!==1||packet.commands[2]!==0||
      !Array.isArray(packet.strings)||packet.strings.length!==0||!Array.isArray(packet.pixels)||packet.pixels.length!==1)
    throw Error('Invalid Interior lattice drawing packet');
  const patch=packet.pixels[0];
  if(!patch||typeof patch!=='object'||Object.keys(patch).length!==2||
      !Object.hasOwn(patch,'data')||!Object.hasOwn(patch,'mask')||patch.mask!==null||
      !owned(patch.data,Uint8ClampedArray,size*size*4)||patch.data.buffer===packet.commands.buffer)
    throw Error('Invalid Interior lattice pixel patch');
  for(let i=3;i<patch.data.length;i+=4)
    if(patch.data[i]!==255)throw Error('Interior lattice requires opaque pixels');
  return packet;
}
