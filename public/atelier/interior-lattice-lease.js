// Only cold render batches that actually need Interior lattice use this lease.
// A granted caller owns the slot until it terminates its worker and releases it.
// Aborting a queued request removes it immediately; aborting a granted request
// does not release the slot or cancel the current owner on its behalf.
export function createInteriorLatticeLease() {
  let held=false;
  const waiting=[];
  const reason=signal=>signal?.reason || new DOMException('Canceled','AbortError');
  const grantNext=()=>{
    if(held)return;
    const entry=waiting.shift();if(!entry)return;
    entry.signal?.removeEventListener('abort',entry.abort);
    if(entry.signal?.aborted){entry.reject(reason(entry.signal));grantNext();return;}
    held=true;let released=false;
    entry.resolve(()=>{
      if(released)return;
      released=true;held=false;grantNext();
    });
  };
  return function acquire(signal) {
    if(signal?.aborted)return Promise.reject(reason(signal));
    return new Promise((resolve,reject)=>{
      const entry={signal,resolve,reject,abort:null};
      entry.abort=()=>{
        const index=waiting.indexOf(entry);
        if(index<0)return;
        waiting.splice(index,1);signal.removeEventListener('abort',entry.abort);
        reject(reason(signal));
      };
      waiting.push(entry);signal?.addEventListener('abort',entry.abort,{once:true});
      grantNext();
    });
  };
}

// Import this singleton from all relevant renderer instances in the same realm.
export const acquireInteriorLatticeLease=createInteriorLatticeLease();
