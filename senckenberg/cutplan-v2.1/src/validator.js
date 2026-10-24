/* Independent acceptance functions: no Clipper intersection or nesting calls. */
(function(root){'use strict';const V={},EPS=1e-5;
const bounds=r=>({x0:Math.min(...r.map(p=>p[0])),x1:Math.max(...r.map(p=>p[0])),y0:Math.min(...r.map(p=>p[1])),y1:Math.max(...r.map(p=>p[1]))});
const area=r=>Math.abs(r.reduce((n,p,i)=>{const q=r[(i+1)%r.length];return n+p[0]*q[1]-p[1]*q[0]},0)/2);
const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
function pointSeg(p,a,b){const v=[b[0]-a[0],b[1]-a[1]],w=[p[0]-a[0],p[1]-a[1]],t=Math.max(0,Math.min(1,dot(w,v)/(dot(v,v)||1)));return Math.hypot(p[0]-a[0]-t*v[0],p[1]-a[1]-t*v[1]);}
function segDistance(a,b,c,d){if(orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0)return 0;return Math.min(pointSeg(a,c,d),pointSeg(b,c,d),pointSeg(c,a,b),pointSeg(d,a,b));}
function inside(p,r){let value=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])value=!value;}return value;}
function inShape(p,loops){return inside(p,loops[0])&&!loops.slice(1).some(r=>inside(p,r));}
V.polygonRelation=(aa,bb,gap=0)=>{
 const a=bounds(aa[0]),b=bounds(bb[0]);if(a.x1+gap<b.x0||b.x1+gap<a.x0||a.y1+gap<b.y0||b.y1+gap<a.y0)return {overlap:false,distance:Infinity};
 let distance=Infinity;for(const ar of aa)for(const br of bb)for(let i=0;i<ar.length;i++)for(let j=0;j<br.length;j++){
  const d=segDistance(ar[i],ar[(i+1)%ar.length],br[j],br[(j+1)%br.length]);distance=Math.min(distance,d);
  if(d<EPS&&orient(ar[i],ar[(i+1)%ar.length],br[j])*orient(ar[i],ar[(i+1)%ar.length],br[(j+1)%br.length])<0)return {overlap:true,distance:0};
 }
 const overlap=aa[0].some(p=>inShape(p,bb)&&bb.every(r=>r.every((q,i)=>pointSeg(p,q,r[(i+1)%r.length])>EPS)))||bb[0].some(p=>inShape(p,aa)&&aa.every(r=>r.every((q,i)=>pointSeg(p,q,r[(i+1)%r.length])>EPS)));
 if(!overlap&&distance<EPS){for(const ar of aa)for(let i=0;i<ar.length;i++){const a=ar[i],b=ar[(i+1)%ar.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<EPS)continue;for(const side of [-1,1]){const point=[(a[0]+b[0])/2+side*(b[1]-a[1])/L*.0001,(a[1]+b[1])/2-side*(b[0]-a[0])/L*.0001];if(inShape(point,aa)&&inShape(point,bb))return {overlap:true,distance};}}}
 return {overlap,distance};
};
V.transform=(loops,p)=>{const c=Math.cos(p.angle*Math.PI/180),s=Math.sin(p.angle*Math.PI/180);return loops.map(r=>r.map(v=>[v[0]*c-v[1]*s+p.x,v[0]*s+v[1]*c+p.y]));};
V.linearBalance=(stock,processing)=>{
 const pieces=stock.placements.slice().sort((a,b)=>a.x-b.x),k=processing.kerf_mm,errors=[];const L=stock.format.length;
 const left=processing.trim_start_mm,right=processing.trim_end_mm,edgeCuts=(left>0?1:0)+(right>0?1:0),edgeKerf=k*edgeCuts;
 const start=left+(left>0?k:0),end=L-right-(right>0?k:0);let pieceLength=0,internalKerf=0,lastEnd=start,extraCuts=0;const restChunks=[];
 for(let i=0;i<pieces.length;i++){
  const p=pieces[i];pieceLength+=p.length;if(p.x<start-EPS||p.x+p.length>end+EPS)errors.push('Rohstabgrenze verletzt');
  if(i&&p.x<lastEnd+k-EPS)errors.push('Sägefuge oder Stabüberlappung');
  const gap=p.x-lastEnd;if(gap>EPS){const cuts=i?(gap>k+EPS?2:1):1;internalKerf+=Math.min(gap,k*cuts);extraCuts+=cuts;restChunks.push(Math.max(0,gap-k*cuts));}lastEnd=p.x+p.length;
 }
 let residual=end-lastEnd;if(residual<-EPS)errors.push('Rohstab überfüllt');const lastKerf=pieces.length&&residual>EPS?Math.min(k,Math.max(0,residual)):0;
 restChunks.push(Math.max(0,residual-lastKerf));const rest=restChunks.reduce((a,b)=>a+b,0);const cutLoss=left+right+edgeKerf+internalKerf+lastKerf;
 const difference=L-pieceLength-cutLoss-rest;if(Math.abs(difference)>.001)errors.push('Längenbilanz nicht geschlossen');
 return {errors,raw_length_mm:L,part_length_mm:pieceLength,cut_and_trim_loss_mm:cutLoss,remainder_mm:rest,actual_cut_count:edgeCuts+extraCuts+(lastKerf>0?1:0),
  reusable_remainder_mm:restChunks.filter(r=>r>=processing.min_remnant_mm).reduce((a,b)=>a+b,0),unusable_remainder_mm:restChunks.filter(r=>r<processing.min_remnant_mm).reduce((a,b)=>a+b,0),remainder_chunks_mm:restChunks,balance_difference_mm:difference,
  raw_end_trim_mm:left+right,saw_kerf_loss_mm:edgeKerf+internalKerf+lastKerf,simulation_remainder_not_inventory:true};
};
V.solution=(solution,pieces,material,processing,locks=[])=>{
 if(solution.process_groups){
  const errors=[],seen=new Set(),stockIds=new Set(),uses=new Map(),covered=new Set();
  for(const group of solution.process_groups){
   if(!['linear','saw','cnc'].includes(group.mode)){errors.push('Unbekanntes Verfahren');continue;}
   const ids=new Set(group.piece_ids);for(const id of ids){if(covered.has(id))errors.push('Teil in mehreren Verfahren');covered.add(id);}
   const sub=pieces.filter(p=>ids.has(p.id));if(sub.length!==ids.size)errors.push('Fremde Verfahrenszuordnung');
   const check=V.solution({...group,process_groups:undefined},sub,material,{...processing,...processing.profiles?.[group.mode],mode:group.mode==='linear'?'cnc':group.mode,part_in_part:false,hold_verified:false});errors.push(...check.errors);
  }
  for(const b of solution.stocks){if(stockIds.has(b.id))errors.push('Doppeltes Rohformat');stockIds.add(b.id);const f=material.formats.find(f=>f.id===b.format.id),n=(uses.get(b.format.id)||0)+1;uses.set(b.format.id,n);if(!f||!(f.on_demand&&f.origin==='purchase')&&n>f.availability)errors.push('Gemeinsamer endlicher Bestand überschritten');for(const q of b.placements){if(seen.has(q.piece_id)||!pieces.some(p=>p.id===q.piece_id))errors.push('Doppelte / fremde Platzierung');seen.add(q.piece_id);}}
  for(const id of solution.unplaced){if(seen.has(id)||!pieces.some(p=>p.id===id))errors.push('Doppelte / fremde Nichtplatzierung');seen.add(id);}
  const expected=solution.process_groups.flatMap(g=>g.stocks.flatMap(b=>b.placements.map(q=>q.piece_id))).sort();const actual=solution.stocks.flatMap(b=>b.placements.map(q=>q.piece_id)).sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))errors.push('Verfahrens- und Gesamtplan weichen ab');
  // Compare complete coordinates/tree as well, not just IDs (tamper protection).
  for(const g of solution.process_groups)for(const b of g.stocks){const flat=solution.stocks.find(s=>s.id===g.mode+'_'+b.id);if(!flat||flat.process_mode!==g.mode||JSON.stringify(flat.format)!==JSON.stringify(b.format)||JSON.stringify(flat.placements)!==JSON.stringify(b.placements)||JSON.stringify(flat.cut_tree)!==JSON.stringify(b.cut_tree)||JSON.stringify(flat.balance)!==JSON.stringify(b.balance))errors.push('Abweichende Verfahrensgeometrie');}
  if(seen.size!==pieces.length)errors.push('Mengenbilanz unvollständig');
  return {valid:!errors.length,errors:[...new Set(errors)],placed:pieces.length-solution.unplaced.length,unplaced:solution.unplaced.length,quantity_balanced:seen.size===pieces.length,method:'Independent per-process geometry/cut-tree validation plus shared-stock and complete identity ledger'};
 }
 const errors=[],warnings=[],byId=new Map(pieces.map(p=>[p.id,p])),seen=new Set(),formatUse=new Map(),stockIds=new Set();
 for(const stock of solution.stocks){if(stockIds.has(stock.id))errors.push('Doppelte Rohmaterial-ID');stockIds.add(stock.id);
  const f=material.formats.find(f=>f.id===stock.format.id);if(!f)errors.push('Unzulässiges Rohformat');
  if(f&&['length','width','height'].some(k=>f[k]!==undefined&&Math.abs(f[k]-stock.format[k])>EPS))errors.push('Rohformatabmessungen wurden geändert');
  const used=(formatUse.get(stock.format.id)||0)+1;formatUse.set(stock.format.id,used);
  if(f&&!(f.on_demand&&f.origin==='purchase')&&(!Number.isInteger(f.availability)||f.availability<used))errors.push('Rohbestand überschritten / unbekannt');
  if(f&&stock.format.origin!==f.origin)errors.push('Bestandsherkunft verändert');
  if(stock.format.origin==='simulation')errors.push('Simulationsrest als realer Bestand verwendet');
  for(const place of stock.placements){const piece=byId.get(place.piece_id);if(!piece||seen.has(place.piece_id)){errors.push('Doppeltes oder fremdes Teil');continue;}seen.add(place.piece_id);
   if(!Number.isFinite(place.x)||!Number.isFinite(place.angle)||material.kind!=='linear'&&!Number.isFinite(place.y)){errors.push('Nicht endliche Platzierung');continue;}
   if(piece.material_id!==material.id)errors.push('Material nicht kompatibel');
   if(material.kind==='linear'){if(Math.abs(place.length-piece.raw.length)>EPS)errors.push('Stablänge verändert');continue;}
   const allowed=material.grain==='none'?material.allowed_rotations:material.allowed_rotations.filter(a=>a%180===0);
   if(!allowed.some(a=>Math.abs((a-place.angle+360)%360)<EPS))errors.push('Rotation/Faserrichtung unzulässig');
   if(place.mirrored&&!material.mirror)errors.push('Spiegelung nicht erlaubt');
   const shape=V.transform(piece.raw.loops,place),b=bounds(shape[0]),m=processing.margin_mm+piece.raw.error_mm;
   if(b.x0<m-EPS||b.y0<m-EPS||b.x1>stock.format.width-m+EPS||b.y1>stock.format.height-m+EPS)errors.push('Plattenrand verletzt');
  }
  if(material.kind==='linear'){const b=V.linearBalance(stock,processing);errors.push(...b.errors);stock.balance=b;}
  else{
   const all=stock.placements.filter(x=>byId.has(x.piece_id));for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
    const a=byId.get(all[i].piece_id),b=byId.get(all[j].piece_id);const shapes=[a,b].map((q,k)=>{const pp=V.transform(q.raw.loops,k?all[j]:all[i]);return processing.part_in_part&&processing.hold_verified?pp:[pp[0]];});
    const required=processing.kerf_mm+a.raw.error_mm+b.raw.error_mm+(processing.mode==='saw'?0:.002);const relation=V.polygonRelation(...shapes,required);
    if(relation.overlap||relation.distance<required-EPS)errors.push('Konturüberlappung / Werkzeugabstand');
   }
   if(processing.mode==='saw'){
    const leaves=[],same=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<.001;
    const walk=(n,depth=0)=>{if(!n||depth>500||![n.x,n.y,n.w,n.h].every(Number.isFinite)||n.w<0||n.h<0){errors.push('Ungültiger Schnittbaum');return;}
     if(n.children){if(n.children.length!==2||!['X','Y'].includes(n.axis)||n.kerf<0||n.kerf>processing.kerf_mm+.001){errors.push('Ungültiger Guillotine-Schnitt');return;}
      const [a,b]=n.children,k=n.kerf;const ok=n.axis==='X'?same(a.x,n.x)&&same(a.y,n.y)&&same(a.h,n.h)&&same(b.y,n.y)&&same(b.h,n.h)&&same(b.x,a.x+a.w+k)&&same(a.w+b.w+k,n.w)&&same(n.cut_at,a.x+a.w):same(a.x,n.x)&&same(a.y,n.y)&&same(a.w,n.w)&&same(b.x,n.x)&&same(b.w,n.w)&&same(b.y,a.y+a.h+k)&&same(a.h+b.h+k,n.h)&&same(n.cut_at,a.y+a.h);
      if(!ok)errors.push('Schnittfolge / Kerfbilanz verletzt');walk(a,depth+1);walk(b,depth+1);
     }else if(n.piece_id){const q=stock.placements.find(q=>q.piece_id===n.piece_id),piece=byId.get(n.piece_id);leaves.push(n.piece_id);if(!q||!piece){errors.push('Schnittbaum mit fremdem Teil');return;}const bb=bounds(V.transform(piece.raw.loops,q)[0]);
      if(!same(bb.x0,n.x)||!same(bb.y0,n.y)||!same(bb.x1-bb.x0,n.w)||!same(bb.y1-bb.y0,n.h))errors.push('Schnittblatt passt nicht zum Rohzuschnitt');}
    };
    const n=stock.cut_tree,m=processing.margin_mm;if(!n)errors.push('Ausführbare Guillotine-Schnittfolge fehlt');else{if(!same(n.x,m)||!same(n.y,m)||!same(n.w,stock.format.width-2*m)||!same(n.h,stock.format.height-2*m))errors.push('Schnittbaum-Rohformat falsch');walk(n);
     if(new Set(leaves).size!==stock.placements.length||leaves.length!==stock.placements.length)errors.push('Schnittbaum-Mengenbilanz verletzt');}
   }
   if(processing.part_in_part&&!processing.hold_verified)errors.push('Part-in-Part ohne Halte-/Schnittfolgenfestlegung');
   const partArea=all.reduce((n,q)=>{const a=byId.get(q.piece_id).raw.loops;return n+area(a[0])-a.slice(1).reduce((a,r)=>a+area(r),0)},0);
   if(stock.balance&&Math.abs(stock.balance.raw_area_mm2-stock.balance.parts_area_mm2-stock.balance.margin_area_mm2-stock.balance.tool_loss_mm2-stock.balance.unallocated_remainder_mm2)>.2)errors.push('Flächenbilanz nicht geschlossen');
   if(stock.balance&&Math.abs(stock.balance.parts_area_mm2-partArea)>.2)errors.push('Teilefläche stimmt nicht mit unabhängiger Polygonrechnung');
   const rr=stock.balance?.clear_rectangle;if(rr){
    if(![rr.x,rr.y,rr.width,rr.height,rr.area_mm2].every(Number.isFinite)||rr.width<=0||rr.height<=0||Math.abs(rr.width*rr.height-rr.area_mm2)>.01||rr.x<processing.margin_mm-EPS||rr.y<processing.margin_mm-EPS||rr.x+rr.width>stock.format.width-processing.margin_mm+EPS||rr.y+rr.height>stock.format.height-processing.margin_mm+EPS)errors.push('Ungültiges Restrechteck');
    else{const rectangle=[[[rr.x,rr.y],[rr.x+rr.width,rr.y],[rr.x+rr.width,rr.y+rr.height],[rr.x,rr.y+rr.height]]];
     for(const q of all){const a=byId.get(q.piece_id),required=processing.kerf_mm/2+(a.raw.error_mm||0)+.01,rel=V.polygonRelation(rectangle,[V.transform(a.raw.loops,q)[0]],required);if(rel.overlap||rel.distance<required-EPS)errors.push('Restrechteck nicht geometrisch frei');}
    }
   }
  }
 }
 for(const id of solution.unplaced||[]){if(!byId.has(id)||seen.has(id))errors.push('Doppelte oder fremde Nichtplatzierung');seen.add(id);}
 if(seen.size!==pieces.length||pieces.some(p=>!seen.has(p.id)))errors.push('Nicht alle Rohzuschnitte bilanziert');
 for(const lock of locks){const stock=solution.stocks.find(b=>b.id===lock.stock_id),p=stock?.placements.find(p=>p.piece_id===lock.piece_id);if(!p||Math.abs(p.x-lock.x)>EPS||Math.abs((p.y||0)-(lock.y||0))>EPS||Math.abs((p.angle||0)-(lock.angle||0))>EPS)errors.push('Manuelle Sperre nicht eingehalten');}
 return {valid:errors.length===0,errors:[...new Set(errors)],warnings,placed:pieces.length-(solution.unplaced||[]).length,unplaced:(solution.unplaced||[]).length,
  quantity_balanced:seen.size===pieces.length,method:'Independent segment/winding/distance, count, stock and arithmetic validator; no nesting boolean operation reused.'};
};
root.CutplanValidator=V;if(typeof module!=='undefined'&&module.exports)module.exports=V;
})(typeof globalThis!=='undefined'?globalThis:this);
