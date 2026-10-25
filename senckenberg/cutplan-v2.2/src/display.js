(function(root){'use strict';
// Display-only native cache. Manufacturing data and project signatures never change.
const D={},cache=new Map(),pending=new Map(),checked=new WeakSet(),node=typeof module!=='undefined'&&module.exports;
const scriptURL=!node&&document.currentScript?.src,threeURL=scriptURL?new URL('../vendor/three169/three.module.js',scriptURL).href:'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let threePromise;
D.camera={right:[-Math.SQRT1_2,Math.SQRT1_2,0],up:[-.3481553119,-.3481553119,.8703882798],direction:[.6154574549,.6154574549,.4923659639]};
D.validateMesh=mesh=>{
 if(!mesh||typeof mesh!=='object')return false;if(checked.has(mesh))return true;
 const vv=mesh.vertices,tt=mesh.triangles;if(!Array.isArray(vv)||!vv.length||!Array.isArray(tt)||!tt.length)return false;
 if(vv.some(v=>!Array.isArray(v)||v.length!==3||v.some(x=>!Number.isFinite(x))))return false;
 if(tt.some(t=>!Array.isArray(t)||t.length!==3||t.some(i=>!Number.isInteger(i)||i<0||i>=vv.length)))return false;
 if(mesh.edges&&(!Array.isArray(mesh.edges)||mesh.edges.some(t=>!Array.isArray(t)||t.length!==2||t.some(i=>!Number.isInteger(i)||i<0||i>=vv.length))))return false;
 checked.add(mesh);return true;
};
D.getMesh=(project,o)=>{
 const mesh=o.display_mesh||project.display_meshes?.[o.id]||cache.get(o.source_hash+'|'+o.id);
 return D.validateMesh(mesh)&&(!mesh.source_hash||mesh.source_hash===o.source_hash)&&(!mesh.guid||mesh.guid===o.guid)?mesh:null;
};
D.objects=(project,module)=>{const ids=new Set(module.occurrence_ids);return project.occurrences.filter(o=>ids.has(o.id));};
D.bounds=meshes=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const m of meshes)for(const v of m.vertices)for(let j=0;j<3;j++){min[j]=Math.min(min[j],v[j]);max[j]=Math.max(max[j],v[j]);}return {min,max};};
D.projection=(points,w,h,pad=22)=>{
 const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];
 for(const v of points){const q=[dot(v,D.camera.right),dot(v,D.camera.up)];for(let j=0;j<2;j++){lo[j]=Math.min(lo[j],q[j]);hi[j]=Math.max(hi[j],q[j]);}}
 if(!points.length)return {scale:1,project:()=>[w/2,h/2],depth:()=>0};
 const scale=Math.min((w-pad*2)/Math.max(1,hi[0]-lo[0]),(h-pad*2)/Math.max(1,hi[1]-lo[1]));
 return {scale,project:v=>[w/2+(dot(v,D.camera.right)-(lo[0]+hi[0])/2)*scale,h/2-(dot(v,D.camera.up)-(lo[1]+hi[1])/2)*scale],depth:v=>dot(v,D.camera.direction)};
};
const seedEntry=(project,module)=>{const entry=root.CUTPLAN_MESH_INDEX?.[module.id],objects=D.objects(project,module),expected=entry?.occurrence_ids?new Set(entry.occurrence_ids):null;return entry&&objects.length===module.occurrence_ids.length&&(!expected||(expected.size===objects.length&&objects.every(o=>expected.has(o.id))))&&objects.every(o=>o.source_hash===entry.source_hash)?entry:null;};
D.thumbnailHTML=(project,module)=>{
 const entry=seedEntry(project,module);if(!entry?.thumbnail_url)return null;
 return `<img class="native-thumbnail" src="${esc(entry.thumbnail_url)}" alt="${esc(module.label)} – native CAD-Flächen" width="330" height="190" loading="lazy" style="display:block;width:100%;height:100%;object-fit:contain">`;
};
D.readPayload=async entry=>{
 const localText=async name=>{const url=new URL(name,document.baseURI);if(url.origin!==location.origin)throw Error('Darstellungsdaten müssen lokal bleiben.');const response=await fetch(url.href,{credentials:'same-origin'});if(!response.ok)throw Error('Native Darstellungsdaten fehlen.');return response.text();};
 if(!entry.compressed_parts)return localText(entry.url);
 if(entry.compression!=='gzip'||typeof root.DecompressionStream!=='function')throw Error('Dieser Browser kann die kompakten CAD-Anzeigedaten nicht entpacken. Echte Kanten bleiben als Ersatzansicht erhalten.');
 const text=(await Promise.all(entry.compressed_parts.map(localText))).join(''),bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));
 return new Response(new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'))).text();
};
D.loadModule=async(project,module)=>{
 const objects=D.objects(project,module);if(objects.every(o=>D.getMesh(project,o)))return objects;
 const entry=seedEntry(project,module);if(!entry)return objects;
 const key=entry.url+'|'+entry.sha256;
 if(!pending.has(key))pending.set(key,(async()=>{
  const text=await D.readPayload(entry);if(entry.sha256&&await root.CutplanExport.sha256(text)!==entry.sha256)throw Error('Darstellungsdaten: Inhaltsprüfung fehlgeschlagen.');
  const chunk=JSON.parse(text);if(chunk.format!=='CUTPLAN_NATIVE_DISPLAY_MESH_V1'||chunk.module_id!==module.id||chunk.source_hash!==entry.source_hash)throw Error('Unpassende native Darstellungsdaten.');
  for(const o of objects){const mesh=chunk.meshes?.[o.id];if(!D.validateMesh(mesh)||mesh.source_hash!==o.source_hash||mesh.guid!==o.guid)throw Error('Unvollständige native Darstellungsdaten.');}
  for(const o of objects)cache.set(o.source_hash+'|'+o.id,chunk.meshes[o.id]);
 })().catch(error=>{pending.delete(key);throw error;}));
 await pending.get(key);return objects;
};
D.mount=async(container,project,module,selectedIDs=[],onSelect=()=>{})=>{
 let disposed=false,renderer,scene,camera,observer;const resources=[],objects=[],chosen=new Set(selectedIDs),token={};container._cutplanDisplayToken=token;
 const current=()=>!disposed&&container.isConnected&&container._cutplanDisplayToken===token;
 const fallback=error=>{if(current()){container.innerHTML=root.CutplanExport.nativeSVG(module,project,[...chosen],Math.max(310,container.clientWidth||700),Math.max(280,container.clientHeight||390));container.dataset.renderer='native-svg-fallback';container.dataset.displayReason=error?.message||'Keine vollständigen nativen Meshes.';if(error){const warning=document.createElement('p');warning.className='help';warning.setAttribute('role','status');warning.textContent=error.message;container.style.position='relative';warning.style.cssText='position:absolute;left:8px;right:8px;bottom:8px;margin:0;padding:10px;background:#fff0ce;color:#173c3c;max-height:45%;overflow:auto;z-index:2';container.append(warning);}}};
 function cleanup(){disposed=true;observer?.disconnect();container.removeEventListener('click',click);renderer?.dispose();resources.forEach(x=>x.dispose());if(container._cutplanDisplayToken===token)delete container._cutplanDisplayToken;}
 cleanup.updateSelection=ids=>{chosen.clear();ids.forEach(x=>chosen.add(x));for(const item of objects){const selected=chosen.has(item.userData.occurrenceID);item.material.color.set(selected?'#d69459':'#b9cbbd');item.userData.edges.material.color.set(selected?'#874c25':'#587263');}if(renderer)renderer.render(scene,camera);else fallback();};
 function click(event){
  if(!current())return;
  if(!renderer){const el=event.target.closest('[data-occurrence]');if(el)onSelect(el.dataset.occurrence,event);return;}
  const rect=renderer.domElement.getBoundingClientRect(),ray=new cleanup.THREE.Raycaster();ray.setFromCamera(new cleanup.THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
  const hit=ray.intersectObjects(objects,false)[0];if(hit)onSelect(hit.object.userData.occurrenceID,event);
 }
 container.addEventListener('click',click);
 try{
  const occurrences=await D.loadModule(project,module);if(!current())return cleanup;
  const missing=occurrences.filter(o=>!D.getMesh(project,o));if(missing.length){fallback();return cleanup;}
  const THREE=await(threePromise||(threePromise=import(threeURL)));cleanup.THREE=THREE;if(!current())return cleanup;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,2));renderer.setClearColor('#ffffff',1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();const meshes=occurrences.map(o=>D.getMesh(project,o)),bounds=D.bounds(meshes),center=bounds.min.map((v,j)=>(v+bounds.max[j])/2),extent=Math.max(...bounds.min.map((v,j)=>bounds.max[j]-v),1);
  scene.add(new THREE.AmbientLight(0xffffff,1.7));const light=new THREE.DirectionalLight(0xffffff,2.1);light.position.set(.2,-.5,1);scene.add(light);
  camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,extent*12);camera.up.set(0,0,1);camera.position.set(...D.camera.direction.map(v=>v*extent*4));camera.lookAt(0,0,0);
  for(let n=0;n<occurrences.length;n++){
   const o=occurrences[n],mesh=meshes[n],geometry=new THREE.BufferGeometry(),positions=new Float32Array(mesh.vertices.length*3);
   mesh.vertices.forEach((v,i)=>v.forEach((x,j)=>positions[i*3+j]=x-center[j]));geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(mesh.triangles.flat());geometry.computeVertexNormals();
   const material=new THREE.MeshStandardMaterial({color:chosen.has(o.id)?'#d69459':'#b9cbbd',roughness:1,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
   const part=new THREE.Mesh(geometry,material);part.userData.occurrenceID=o.id;part.name=o.position+' · '+o.label;
   let edgeGeometry;if(mesh.edges){edgeGeometry=new THREE.BufferGeometry();const edgePositions=new Float32Array(mesh.edges.length*6);mesh.edges.forEach((pair,i)=>pair.forEach((vi,k)=>mesh.vertices[vi].forEach((x,j)=>edgePositions[i*6+k*3+j]=x-center[j])));edgeGeometry.setAttribute('position',new THREE.BufferAttribute(edgePositions,3));}else edgeGeometry=new THREE.EdgesGeometry(geometry,28);
   const lineMaterial=new THREE.LineBasicMaterial({color:chosen.has(o.id)?'#874c25':'#587263',transparent:true,opacity:.7}),edges=new THREE.LineSegments(edgeGeometry,lineMaterial);part.userData.edges=edges;scene.add(part,edges);objects.push(part);resources.push(geometry,material,edgeGeometry,lineMaterial);
  }
  const canvas=renderer.domElement;canvas.style.cssText='display:block;width:100%;height:100%;';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',module.label+' – native CAD-Flächen, feste räumliche Ansicht. Teile im Bild oder in der Tabelle wählen.');container.replaceChildren(canvas);container.dataset.renderer='native-webgl';delete container.dataset.displayReason;
  function resize(){if(!current())return;const w=Math.max(200,container.clientWidth),h=Math.max(200,container.clientHeight||390),q=D.projection(meshes.flatMap(m=>m.vertices),w,h,28),halfW=w/(2*q.scale),halfH=h/(2*q.scale);
   // Fit to projected native coordinates and center their projected extent, not
   // an arbitrary wire/profile envelope. Camera target follows the view bounds.
   let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];for(const mesh of meshes)for(const v of mesh.vertices){const vv=v.map((x,j)=>x-center[j]);const xy=[vv.reduce((a,x,j)=>a+x*D.camera.right[j],0),vv.reduce((a,x,j)=>a+x*D.camera.up[j],0)];for(let j=0;j<2;j++){lo[j]=Math.min(lo[j],xy[j]);hi[j]=Math.max(hi[j],xy[j]);}}
   const cx=(lo[0]+hi[0])/2,cy=(lo[1]+hi[1])/2;camera.left=cx-halfW;camera.right=cx+halfW;camera.top=cy+halfH;camera.bottom=cy-halfH;camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.render(scene,camera);
  }
  cleanup.renderer=renderer;cleanup.objects=objects;cleanup.camera=camera;cleanup.bounds=bounds;resize();observer=new ResizeObserver(resize);observer.observe(container);
 }catch(error){renderer?.dispose();renderer=null;fallback(error);}
 return cleanup;
};
root.CutplanDisplay=D;if(node)module.exports=D;
})(typeof globalThis!=='undefined'?globalThis:this);
