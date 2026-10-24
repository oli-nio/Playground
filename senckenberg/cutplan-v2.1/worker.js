'use strict';
importScripts('vendor/clipper.js','vendor/highs.js','src/geometry.js','src/core.js','src/validator.js','src/optimizer.js');
// Byte-identical local WASM, mechanically split for publication transport limits.
importScripts("vendor/wasm-000.js","vendor/wasm-001.js","vendor/wasm-002.js","vendor/wasm-003.js","vendor/wasm-004.js","vendor/wasm-005.js","vendor/wasm-006.js","vendor/wasm-007.js","vendor/wasm-008.js","vendor/wasm-009.js","vendor/wasm-010.js","vendor/wasm-011.js","vendor/wasm-012.js","vendor/wasm-013.js","vendor/wasm-014.js","vendor/wasm-015.js","vendor/wasm-016.js","vendor/wasm-017.js","vendor/wasm-018.js","vendor/wasm-019.js");
self.CUTPLAN_WASM_BINARY=Uint8Array.from(atob(self.CUTPLAN_WASM_CHUNKS.join('')),c=>c.charCodeAt(0));
delete self.CUTPLAN_WASM_CHUNKS;

self.onmessage=async event=>{const {project,job_id}=event.data;try{
 self.postMessage({type:'started',job_id});
 const result=await CutplanOptimizer.run(project,{onProgress:progress=>self.postMessage({type:'progress',job_id,...progress})});
 self.postMessage({type:'done',job_id,result});
}catch(e){self.postMessage({type:'error',job_id,error:String(e)});}};
