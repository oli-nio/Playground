/* CUTPLAN hybrid solvers. HiGHS MIP for 1D; Clipper NFP multistart for 2D.
 * Validity is decided by validator.js, not by these placement procedures.
 */
(function(root){'use strict';
const node=typeof module!=='undefined'&&module.exports,G=node?require('./geometry.js'):root.CutplanGeometry,K=node?require('./core.js'):root.CutplanCore,V=node?require('./validator.js'):root.CutplanValidator;
const O={VERSION:'CUTPLAN-V2.1-2.1.0'},clone=K.clone;let highsPromise;
O.getHighs=()=>highsPromise||(highsPromise=node?require('../../vendor_source/highs/build/highs.js')({print:()=>{},printErr:()=>{}}):root.Module({...(root.CUTPLAN_WASM_BINARY?{wasmBinary:root.CUTPLAN_WASM_BINARY}:{}),locateFile:n=>root.CUTPLAN_WASM_BINARY?n:new URL('vendor/'+n,root.location.href).href,print:()=>{},printErr:()=>{}}));
const usable=(f,p)=>f.length-p.trim_start_mm-p.trim_end_mm-p.kerf_mm*((p.trim_start_mm>0?1:0)+(p.trim_end_mm>0?1:0));
const allowedFormats=mat=>mat.formats.filter(f=>Number.isInteger(Number(f.availability))&&f.availability>0&&f.origin!=='simulation');
const unitCost=(mat,f,objective)=>objective==='cost'?(f.origin==='stock'?0:K.formatPrice(mat,f)):mat.kind==='linear'?f.length:f.width*f.height;
function makeLinearStock(format,index){return {id:'BAR'+index,format:clone(format),placements:[]};}
function layoutBar(stock,pieces,p){let x=p.trim_start_mm+(p.trim_start_mm>0?p.kerf_mm:0);stock.placements=pieces.map((piece,i)=>{const q={piece_id:piece.id,x,length:piece.raw.length,angle:0,locked:false};x+=piece.raw.length+p.kerf_mm;return q;});stock.balance=V.linearBalance(stock,p);return stock;}
O.linearBaseline=(pieces,mat,p)=>{
 const formats=allowedFormats(mat),stocks=[],counts=new Map(),unplaced=[];
 for(const piece of pieces.slice().sort((a,b)=>b.raw.length-a.raw.length)){
  let best=null;
  for(const b of stocks){const used=b._pieces.reduce((n,x)=>n+x.raw.length,0)+p.kerf_mm*Math.max(0,b._pieces.length-1);const extra=piece.raw.length+(b._pieces.length?p.kerf_mm:0);
   const rest=usable(b.format,p)-used-extra;if(rest>=-1e-6&&(!best||rest<best.rest))best={stock:b,rest};}
  if(best)best.stock._pieces.push(piece);
  else {const feasible=formats.filter(f=>(counts.get(f.id)||0)<f.availability&&usable(f,p)>=piece.raw.length-1e-6);
   feasible.sort((a,b)=>unitCost(mat,a,p.objective)-unitCost(mat,b,p.objective)||a.length-b.length);const f=feasible[0];
   if(!f){unplaced.push(piece.id);continue;}const b=makeLinearStock(f,stocks.length+1);b._pieces=[piece];stocks.push(b);counts.set(f.id,(counts.get(f.id)||0)+1);}
 }
 for(const b of stocks){layoutBar(b,b._pieces,p);delete b._pieces;}
 return {stocks,unplaced,method:'Best-fit valid starting plan','global_optimal':false,lower_bound_mm:pieces.reduce((n,x)=>n+x.raw.length,0)};
};
function objective(sol,mat,p){return sol.stocks.reduce((n,b)=>n+(unitCost(mat,b.format,p.objective)??Infinity),0);}
function rank(sol,mat,p){const free=sol.stocks.map(b=>b.balance?.clear_rectangle?.area_mm2||0);return [sol.unplaced.length,objective(sol,mat,p),sol.stocks.reduce((n,b)=>n+(mat.kind==='linear'?b.format.length:b.format.width*b.format.height),0),-Math.max(0,...free),-free.reduce((a,b)=>a+b,0),sol.stocks.reduce((n,b)=>{if(mat.kind==='linear')return n;const pp=b.placements.map(q=>q._extent).filter(Boolean);return n+(pp.length?Math.max(0,...pp.map(v=>v[0]))*Math.max(0,...pp.map(v=>v[1])):b.format.width*b.format.height);},0)];}
function better(a,b,mat,p){if(!b)return true;const aa=rank(a,mat,p),bb=rank(b,mat,p);for(let i=0;i<aa.length;i++){if(aa[i]<bb[i]-1e-5)return true;if(aa[i]>bb[i]+1e-5)return false;}return false;}
function canonical(sol,mat){const value=clone(sol),by=new Map(mat.formats.map(f=>[f.id,f]));for(const b of value.stocks)b.format=clone(by.get(b.format.id)||b.format);return value;}
function context(){return {_nfpCache:new Map(),_collisionCache:new Map(),_shapeKeys:new WeakMap(),_alignedMeta:new WeakMap()};}
// Bounded geometric count vectors, not a new solver or a feasibility proof.
// The geometry midpoint only orders attempts; no measured CAD dimension changes.
O.formatCandidates=(pieces,mat,p,incumbent)=>{
 const started=Date.now(),deadline=Math.min(p._deadline||Infinity,started+Math.min(250,Math.max(5,p.search_seconds*1000*.05))),maxVisits=4096,ff=allowedFormats(mat),m=p.margin_mm,angles=rotations(mat);
 const outer=pieces.reduce((n,x)=>n+(p.part_in_part&&p.hold_verified?G.netArea(x.raw.loops):G.area(x.raw.loops[0])),0),bounds=pieces.map(x=>G.bounds(x.raw.loops[0])),boxes=bounds.reduce((n,b)=>n+(b.maxX-b.minX)*(b.maxY-b.minY),0),target=(outer+boxes)/2,rows=[],seen=new Set(),limit=incumbent&&!incumbent.unplaced.length?objective(incumbent,mat,p):Infinity;
 let visits=0,stopped=false;const fits=[];
 // Transform each piece/angle only once, not for every integer count vector.
 for(const x of pieces){if(Date.now()>=deadline){stopped=true;break;}const sizes=angles.map(a=>{const b=G.bounds(G.transform(x.raw.loops,0,0,a)[0]),e=x.raw.error_mm||0;return [b.maxX-b.minX+2*e,b.maxY-b.minY+2*e];});fits.push(ff.map(f=>sizes.some(([w,h])=>w<=f.width-2*m&&h<=f.height-2*m)));}
 const add=(i,a,j=-1,b=0)=>{if(++visits>maxVisits||Date.now()>=deadline){stopped=true;return false;}const counts={[ff[i].id]:a};if(j>=0)counts[ff[j].id]=b;const used=j>=0?[i,j]:[i],usableArea=used.reduce((n,k)=>n+counts[ff[k].id]*Math.max(0,ff[k].width-2*m)*Math.max(0,ff[k].height-2*m),0);if(usableArea<outer-1e-5||fits.some(row=>!used.some(k=>row[k])))return true;
  const cost=used.reduce((n,k)=>n+counts[ff[k].id]*unitCost(mat,ff[k],p.objective),0);if(cost>limit+1e-5)return true;const key=K.stable(counts);if(seen.has(key))return true;seen.add(key);rows.push({caps:counts,objective:cost,usable_area_mm2:usableArea,target_area_mm2:target,raw_area_mm2:used.reduce((n,k)=>n+counts[ff[k].id]*ff[k].width*ff[k].height,0)});return true;
 };
 const cap=f=>Math.min(f.availability,pieces.length,Math.max(1,Math.ceil(boxes/Math.max(1,(f.width-2*m)*(f.height-2*m)))+1));
 // Bounded singles/pairs, never exhaustive global procurement. The unrestricted
 // valid baseline still supports every original available format.
 if(!stopped)search:for(let i=0;i<ff.length;i++){for(let a=1;a<=cap(ff[i]);a++)if(!add(i,a))break search;for(let j=i+1;j<ff.length;j++)for(let a=1;a<=cap(ff[i]);a++)for(let b=1;b<=cap(ff[j]);b++)if(!add(i,a,j,b))break search;}
 rows.sort((a,b)=>a.objective-b.objective||a.raw_area_mm2-b.raw_area_mm2||K.stable(a.caps).localeCompare(K.stable(b.caps)));
 const relaxed=rows.filter(r=>r.usable_area_mm2>=target),first=relaxed[0]||rows[rows.length-1];
 const result=first?[first,...rows.filter(r=>r!==first&&r.objective<=first.objective).reverse(),...rows.filter(r=>r.objective>first.objective)].slice(0,32):[];
 result.enumeration={visited:Math.min(visits,maxVisits),limit:maxVisits,stopped,ms:Date.now()-started,scope:'Bounded single/pair count-vector search; not an exhaustive or optimality proof'};return result;
};
O.contourBaseline=(pieces,mat,p)=>{
 const boxes=pieces.map(x=>{const b=G.bounds(x.raw.loops[0]),e=(x.raw.error_mm||0)+.003,w=b.maxX-b.minX+2*e,h=b.maxY-b.minY+2*e;return {...x,process_hint:'saw',raw:{...x.raw,error_mm:0,strategy:'rectangle',width:w,height:h,area_mm2:w*h,loops:[G.rect(w,h).map(v=>[v[0]+b.minX-e,v[1]+b.minY-e])]}};});
 const packed=O.guillotine(boxes,mat,{...p,mode:'saw',search_seconds:.04},{maxVariants:8});
 for(const b of packed.stocks){delete b.cut_tree;b.balance=contourBalance(b,pieces,p);}packed.method='Fast conservative envelope placement; actual contours unchanged; not a saw plan';packed.global_optimal=false;
 const check=V.solution(packed,pieces,mat,{...p,mode:'cnc'});if(!check.valid)throw Error('Sicherer Startplan ungültig: '+check.errors.join('; '));return canonical(packed,mat);
};
O.linear=async(pieces,mat,p,options={})=>{
 if(p.objective==='cost'&&allowedFormats(mat).some(f=>f.origin!=='stock'&&K.formatPrice(mat,f)===null))throw Error('Kostenoptimierung benötigt bekannte Szenariopreise aller zugelassenen Beschaffungsformate.');
 const baseline=O.linearBaseline(pieces,mat,p);let best=baseline;options.onBest?.(clone(best));
 if(options.locks?.length)return O.linearWithLocks(pieces,mat,p,options,baseline);
 const formats=allowedFormats(mat),eligible=pieces.filter(x=>formats.some(f=>usable(f,p)>=x.raw.length-1e-6)),fixedUnplaced=pieces.filter(x=>!eligible.includes(x)).map(x=>x.id);if(!eligible.length)return best;
 const groups=[];for(const piece of eligible){let g=groups.find(g=>Math.abs(g.length-piece.raw.length)<1e-6);if(!g){g={length:piece.raw.length,items:[]};groups.push(g);}g.items.push(piece);}
 const B=Math.min(eligible.length,formats.reduce((n,f)=>n+f.availability,0));const terms=[],constraints=[],generals=[],binaries=[];
 const ys=(j,t)=>'y_'+j+'_'+t,xs=(i,j)=>'x_'+i+'_'+j;
 for(let j=0;j<B;j++)for(let t=0;t<formats.length;t++){const f=formats[t],cost=unitCost(mat,f,p.objective);terms.push((cost+f.length*1e-8)+' '+ys(j,t));binaries.push(ys(j,t));}
 groups.forEach((g,i)=>{constraints.push('d_'+i+': '+Array.from({length:B},(_,j)=>xs(i,j)).join(' + ')+' = '+g.items.length);for(let j=0;j<B;j++)generals.push(xs(i,j));});
 for(let j=0;j<B;j++){
  constraints.push('c_'+j+': '+groups.map((g,i)=>(g.length+p.kerf_mm)+' '+xs(i,j)).join(' + ')+' - '+formats.map((f,t)=>(usable(f,p)+p.kerf_mm)+' '+ys(j,t)).join(' - ')+' <= 0');
  constraints.push('one_'+j+': '+formats.map((_,t)=>ys(j,t)).join(' + ')+' <= 1');
  if(j<B-1)constraints.push('sym_'+j+': '+formats.map((_,t)=>ys(j,t)).join(' + ')+' - '+formats.map((_,t)=>ys(j+1,t)).join(' - ')+' >= 0');
 }
 formats.forEach((f,t)=>constraints.push('stock_'+t+': '+Array.from({length:B},(_,j)=>ys(j,t)).join(' + ')+' <= '+f.availability));
 const lp='Minimize\n obj: '+terms.join(' + ')+'\nSubject To\n'+constraints.join('\n')+'\nBounds\n'+generals.map(n=>' 0 <= '+n).join('\n')+'\nGenerals\n '+generals.join(' ')+'\nBinaries\n '+binaries.join(' ')+'\nEnd';
 let result;try{const highs=await O.getHighs();result=highs.solve(lp,{time_limit:p.search_seconds,random_seed:p.seed,presolve:'on',mip_rel_gap:0,log_to_console:false});}
 catch(e){return {...best,solver_error:String(e),method:'Valid baseline; HiGHS failed',model_variables:generals.length+binaries.length};}
 if(result.Columns){const queues=groups.map(g=>g.items.slice()),stocks=[];let valid=true;
  for(let j=0;j<B;j++){const t=formats.findIndex((_,t)=>(result.Columns[ys(j,t)]?.Primal||0)>.5);if(t<0)continue;const row=[];
   groups.forEach((g,i)=>{const value=result.Columns[xs(i,j)]?.Primal||0,n=Math.round(value);if(Math.abs(value-n)>1e-5)valid=false;for(let q=0;q<n;q++){const piece=queues[i].shift();if(piece)row.push(piece);else valid=false;}});
   if(row.length)stocks.push(layoutBar(makeLinearStock(formats[t],stocks.length+1),row,p));}
  if(queues.some(q=>q.length))valid=false;
  const candidate={stocks,unplaced:fixedUnplaced,method:'HiGHS 1.15.2 WASM aggregated integer assignment',solver_status:result.Status,
   global_optimal:result.Status==='Optimal'&&!fixedUnplaced.length,model_objective:result.ObjectiveValue,model_variables:generals.length+binaries.length,
   optimality_scope:'Linear stock model with declared end trims, actual cuts, finite formats and selected objective; not a fabrication release.'};
  const check=V.solution(candidate,pieces,mat,p);if(valid&&check.valid&&(candidate.unplaced.length<best.unplaced.length||candidate.unplaced.length===best.unplaced.length&&objective(candidate,mat,p)<=objective(best,mat,p)+1e-5)){best=candidate;options.onBest?.(clone(best));}
 }
 return {...best,baseline_objective:objective(baseline,mat,p),best_objective:objective(best,mat,p),solver_status:result.Status,
  lower_bound_mm:eligible.reduce((n,x)=>n+x.raw.length,0),seed:p.seed};
};
O.linearWithLocks=(pieces,mat,p,options,baseline)=>{
 const locks=options.locks,byid=new Map(pieces.map(x=>[x.id,x])),stocks=clone(options.previous?.stocks||[]).filter(b=>locks.some(l=>l.stock_id===b.id));
 for(const b of stocks)b.placements=b.placements.filter(x=>locks.some(l=>l.piece_id===x.piece_id)).map(x=>({...x,locked:true}));
 const remaining=pieces.filter(x=>!locks.some(l=>l.piece_id===x.id)),unplaced=[],used=new Map();for(const b of stocks)used.set(b.format.id,(used.get(b.format.id)||0)+1);
 for(const piece of remaining.slice().sort((a,b)=>b.raw.length-a.raw.length)){
  let done=false;for(const b of stocks){const sorted=b.placements.slice().sort((a,b)=>a.x-b.x);const start=p.trim_start_mm+(p.trim_start_mm?p.kerf_mm:0),end=b.format.length-p.trim_end_mm-(p.trim_end_mm?p.kerf_mm:0);
   const gaps=[];let last=start;for(const q of sorted){gaps.push([last,q.x-p.kerf_mm]);last=q.x+q.length+p.kerf_mm;}gaps.push([last,end]);
   const gap=gaps.find(g=>g[1]-g[0]>=piece.raw.length-1e-6);if(gap){b.placements.push({piece_id:piece.id,x:gap[0],length:piece.raw.length,angle:0,locked:false});done=true;break;}}
  if(!done){const f=allowedFormats(mat).filter(f=>(used.get(f.id)||0)<f.availability&&usable(f,p)>=piece.raw.length).sort((a,b)=>unitCost(mat,a,p.objective)-unitCost(mat,b,p.objective))[0];
   if(f){const b=layoutBar(makeLinearStock(f,'R'+stocks.length),[piece],p);stocks.push(b);used.set(f.id,(used.get(f.id)||0)+1);}else unplaced.push(piece.id);}
 }
 for(const b of stocks)b.balance=V.linearBalance(b,p);return {stocks,unplaced,method:'Gap packing respecting fixed manual cuts + finite stock',global_optimal:false,locks_preserved:true};
};
function contourBalance(stock,pieces,p){const ids=new Map(pieces.map(x=>[x.id,x])),w=stock.format.width,h=stock.format.height,m=p.margin_mm;
 return G.sheetBalance(stock,pieces,p);
 const raw=stock.placements.map(q=>G.transform(ids.get(q.piece_id).raw.loops,q.x,q.y,q.angle));const parts=raw.reduce((n,r)=>n+G.netArea(r),0);
 const outerBuffer=raw.map((r,i)=>G.offset(r,p.kerf_mm/2+(ids.get(stock.placements[i].piece_id).raw.error_mm||0)+.001));
 const inner=[[m,m],[w-m,m],[w-m,h-m],[m,h-m]],clipped=outerBuffer.map(r=>G.boolean(r,[inner],root.ClipperLib?.ClipType.ctIntersection??0));
 const union=G.unionArea(clipped),margin=w*h-Math.max(0,w-2*m)*Math.max(0,h-2*m);const tool=Math.max(0,union-parts),rest=w*h-margin-parts-tool;
 return {raw_area_mm2:w*h,parts_area_mm2:parts,margin_area_mm2:margin,tool_loss_mm2:tool,unallocated_remainder_mm2:rest,
  reusable_remainder_area_mm2:null,remainder_status:'SIMULATION_GEOMETRY_NOT_CONFIRMED_STOCK; unallocated area is not automatically waste or a useful remainder',balance_difference_mm2:w*h-parts-margin-tool-rest};
}
const rotations=mat=>(mat.allowed_rotations||[0,90,180,270]).filter(a=>mat.grain==='none'||a%180===0);
function shapeAt(piece,place,holes){const r=G.transform(piece.raw.loops,place.x,place.y,place.angle);return holes?r:[r[0]];}
function prepared(piece,angle,p,gap=0){const cache=p._collisionCache||(p._collisionCache=new Map()),keys=p._shapeKeys||(p._shapeKeys=new WeakMap());let key=keys.get(piece);if(!key){key=K.stable(piece.raw.loops);keys.set(piece,key);}key+='|'+angle+'|'+gap+'|'+!!(p.part_in_part&&p.hold_verified);let value=cache.get(key);if(!value){let r=G.transform(piece.raw.loops,0,0,angle);if(!(p.part_in_part&&p.hold_verified))r=[r[0]];value=gap?G.offset(r,gap/2):r;cache.set(key,value);}return value;}
const translated=(rings,x,y)=>rings.map(r=>r.map(v=>[v[0]+x,v[1]+y]));
function canPlace(piece,place,stock,p,placedMap,mat){const full=translated(prepared(piece,place.angle,p),place.x,place.y),b=G.bounds(full[0]),m=p.margin_mm+(piece.raw.error_mm||0)+.001;
 if(b.minX<m||b.minY<m||b.maxX>stock.format.width-m||b.maxY>stock.format.height-m)return false;
 for(const q of stock.placements){const other=placedMap.get(q.piece_id);if(!other)continue;const gap=p.kerf_mm+(piece.raw.error_mm||0)+(other.raw.error_mm||0)+.004;
  const r=shapeAt(other,q,p.part_in_part&&p.hold_verified),rb=G.bounds(r[0]);if(b.maxX+gap<rb.minX||rb.maxX+gap<b.minX||b.maxY+gap<rb.minY||rb.maxY+gap<b.minY)continue;
  const expanded=translated(prepared(piece,place.angle,p,gap),place.x,place.y),otherExpanded=translated(prepared(other,q.angle,p,gap),q.x,q.y);
  if(G.intersectionArea(expanded,otherExpanded)>.0001)return false;}
 return true;
}
function placeContour(piece,stock,p,byid,mat){let best=null;const margin=p.margin_mm+(piece.raw.error_mm||0)+.004;const cache=p._nfpCache||new Map();
 for(const angle of rotations(mat)){
  const rotated=G.transform(piece.raw.loops,0,0,angle),b=G.bounds(rotated[0]),candidates=[[margin-b.minX,margin-b.minY],[stock.format.width-margin-b.maxX,margin-b.minY]];
  for(const q of stock.placements){const other=byid.get(q.piece_id),poly=shapeAt(other,q,false)[0],gap=p.kerf_mm+(piece.raw.error_mm||0)+(other.raw.error_mm||0)+.008;
   if(p._nfpLevel&&Date.now()<(p._deadline||Infinity)){
    const key=JSON.stringify([other.shape_key,piece.shape_key,q.angle,angle,p._nfpLevel,gap,other.raw.allowance_mm,piece.raw.allowance_mm]);let nfp=cache.get(key);
    if(!nfp){const local=G.transform(other.raw.loops,0,0,q.angle)[0];const outlineA=G.candidateOutline(local,p._nfpLevel),outlineB=G.candidateOutline(rotated[0],p._nfpLevel);
     // Candidate polygons are a search aid only; full original contours decide validity.
     nfp=G.nfp(G.candidateBuffer(outlineA,gap+.15),outlineB);if(cache.size>1500)cache.delete(cache.keys().next().value);cache.set(key,nfp);}
    for(const ring of nfp)for(const point of ring)candidates.push([point[0]+q.x,point[1]+q.y]);
   }
   const bb=G.bounds(poly);candidates.push([bb.maxX+gap-b.minX,margin-b.minY],[margin-b.minX,bb.maxY+gap-b.minY]);
  }
  const seen=new Set();candidates.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);let count=0;
  for(const [x,y]of candidates){const key=Math.round(x*1000)+':'+Math.round(y*1000);if(seen.has(key))continue;seen.add(key);if(++count>(p._candidateLimit||1400))break;if(p._deadline&&Date.now()>p._deadline)return best?.place||null;if(best&&y+b.maxY>best.score[0]+1e-6)continue;
   const place={piece_id:piece.id,x,y,angle,locked:false,_extent:[x+b.maxX,y+b.maxY]};if(canPlace(piece,place,stock,p,byid,mat)){const score=[y+b.maxY,x+b.maxX];if(!best||score[0]<best.score[0]-.0001||Math.abs(score[0]-best.score[0])<.0001&&score[1]<best.score[1])best={place,score};}}
 }
 return best?.place||null;
}
// Coherent same-axis placement: NFP intersections with alignment lines recover
// tight translated stacks missed by a vertex-only bottom-left search. No part
// is mirrored or rotated outside the material's declared allowed angles.
function placeAligned(piece,stock,p,byid,mat){let best=null;const margin=p.margin_mm+(piece.raw.error_mm||0)+.005,angles=p._alignedAngles;
 const metadata=p._alignedMeta||(p._alignedMeta=new WeakMap());
 const get=(a,angle)=>{const r=prepared(a,angle,p);let v=metadata.get(r);if(!v){const simple=G.cleanCandidate(r[0]);v={r,b:G.bounds(r[0]),simple,key:K.stable(simple.map(q=>q.map(x=>Math.round(x*20)/20)))};metadata.set(r,v);}return v;};
 for(const angle of angles){if(Date.now()>p._deadline)break;const {r,b}=get(piece,angle),lo=margin-b.minX,hi=stock.format.width-margin-b.maxX;if(hi<lo)continue;const xs=[lo,hi],nfps=[],safeY=[margin-b.minY];
  for(const q of stock.placements){const other=byid.get(q.piece_id),bb=get(other,q.angle).b,gap=p.kerf_mm+(piece.raw.error_mm||0)+(other.raw.error_mm||0)+.01;
   xs.push(q.x+bb.minX-b.minX,q.x+bb.maxX-b.maxX,q.x+bb.maxX+gap+.05-b.minX,q.x+bb.minX-gap-.05-b.maxX);safeY.push(q.y+bb.maxY+gap+.01-b.minY);
   const metaA=get(other,q.angle),metaB=get(piece,angle),key='ALIGNED|'+metaA.key+'|'+metaB.key+'|'+gap;let nfp=p._nfpCache.get(key);
   // Quantized keys share candidate relationships only. Original geometry is
   // never quantized; canPlace and the independent validator remain exact.
   if(!nfp){nfp=G.nfp(G.candidateBuffer(metaA.simple,gap+.5),metaB.simple);if(p._nfpCache.size>1800)p._nfpCache.delete(p._nfpCache.keys().next().value);p._nfpCache.set(key,nfp);}nfps.push(...translated(nfp,q.x,q.y));
  }
  const xset=[...new Set(xs.filter(x=>x>=lo-.0001&&x<=hi+.0001).map(x=>Math.round(x*1000)/1000))];
  for(const x0 of xset){const x=Math.max(lo,Math.min(hi,x0)),ys=safeY.slice();
   for(const ring of nfps)for(let i=0;i<ring.length;i++){const c=ring[i],d=ring[(i+1)%ring.length];if(Math.min(c[0],d[0])<=x&&Math.max(c[0],d[0])>=x&&Math.abs(c[0]-d[0])>.00001)ys.push(c[1]+(d[1]-c[1])*(x-c[0])/(d[0]-c[0])+.004);}
   ys.sort((a,b)=>a-b);for(const y of ys){if(Date.now()>p._deadline)return best;if(y+b.minY<margin||y+b.maxY>stock.format.height-margin)continue;if(best&&y+b.maxY>best._extent[1]+.0001)break;
    const q={piece_id:piece.id,x,y,angle,locked:false,_extent:[x+b.maxX,y+b.maxY]};if(canPlace(piece,q,stock,p,byid,mat)){if(!best||q._extent[1]<best._extent[1]-.0001||Math.abs(q._extent[1]-best._extent[1])<.0001&&q._extent[0]<best._extent[0])best=q;break;}
   }
  }
 }return best;
}
O.contourPass=(pieces,mat,p,options={},order=pieces)=>{
 const byid=new Map(pieces.map(x=>[x.id,x])),locks=options.locks||[],stocks=clone(options.previous?.stocks||[]).filter(b=>locks.some(l=>l.stock_id===b.id)),counts=new Map(),unplaced=[];
 for(const b of stocks){b.placements=b.placements.filter(q=>locks.some(l=>l.piece_id===q.piece_id)).map(q=>({...q,locked:true}));counts.set(b.format.id,(counts.get(b.format.id)||0)+1);}
 for(const piece of order){if(locks.some(l=>l.piece_id===piece.id))continue;if(p._deadline&&Date.now()>p._deadline){unplaced.push(...order.filter(x=>!stocks.some(b=>b.placements.some(q=>q.piece_id===x.id))&&!unplaced.includes(x.id)).map(x=>x.id));break;}let done=false;
  for(const stock of stocks){const q=p._alignedAngles?placeAligned(piece,stock,p,byid,mat):placeContour(piece,stock,p,byid,mat);if(q){stock.placements.push(q);done=true;break;}}
  if(done)continue;const possible=allowedFormats(mat).filter(f=>(counts.get(f.id)||0)<f.availability).sort((a,b)=>(a.id===p._preferredFormat?-1:0)-(b.id===p._preferredFormat?-1:0)||unitCost(mat,a,p.objective)-unitCost(mat,b,p.objective));
  for(const f of possible){const stock={id:'SHEET'+(stocks.length+1),format:clone(f),placements:[]};const q=p._alignedAngles?placeAligned(piece,stock,p,byid,mat):placeContour(piece,stock,p,byid,mat);if(q){stock.placements.push(q);stocks.push(stock);counts.set(f.id,(counts.get(f.id)||0)+1);done=true;break;}}
  if(!done)unplaced.push(piece.id);
 }
 for(const b of stocks)b.balance=contourBalance(b,pieces,p);return {stocks,unplaced,method:'Clipper 6.4.2 Minkowski NFP / validated multi-start bottom-left',global_optimal:false,
  candidate_generation:'Decimated outlines for candidate positions only; full bounded-error contours used for every collision check',seed:p.seed};
};
O.contour=async(pieces,mat,p,options={})=>{
 if(p.objective==='cost'&&allowedFormats(mat).some(f=>f.origin!=='stock'&&K.formatPrice(mat,f)===null))throw Error('Kostenoptimierung: Preis eines Beschaffungsformats offen');
 if(p.mode==='saw')return O.guillotine(pieces,mat,p,options);
 const start=Date.now(),deadline=options.deadline||p._deadline||start+p.search_seconds*1000,shared=options.context||context(),trials=[];let best=null,iterations=0,seed=p.seed|0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
 const publish=sol=>{const candidate=canonical(sol,mat),check=V.solution(candidate,pieces,mat,p);if(check.valid&&better(candidate,best,mat,p)){best=candidate;options.onBest?.(clone(best));}return check.valid;};
 if(options.previous){const previous=canonical(options.previous,mat);if(V.solution(previous,pieces,mat,p).valid)publish(previous);}
 publish(O.contourBaseline(pieces,mat,p));
 const finish=()=>({...best,iterations,search_ms:Date.now()-start,best_objective:objective(best,mat,p),complete:best.unplaced.length===0,global_optimal:false,format_search:trials,deadline_kind:'Shared cooperative wall-clock deadline; wall time includes non-preemptive geometry and validation',lower_bound_area_mm2:pieces.reduce((n,x)=>n+x.raw.area_mm2,0)});
 if(p._fastOnly||options.cancelled?.()||Date.now()>=deadline||pieces.length<3)return finish();
 const base=pieces.slice().sort((a,b)=>b.raw.area_mm2-a.raw.area_mm2),angles=rotations(mat).slice().sort((a,b)=>a-b),axes=[];
 for(const angle of angles){const key=((angle%180)+180)%180;if(!axes.some(x=>Math.abs(x.key-key)<.001))axes.push({key,angles:angles.filter(a=>Math.abs((((a-angle)%180)+180)%180)<.001)});}
 const run=(material,order,extra={})=>{
  const then=Date.now(),sol=O.contourPass(pieces,material,{...p,...shared,_deadline:deadline,...extra},{},order),valid=publish(sol);
  trials.push({caps:extra._caps||null,axis:extra._alignedAngles||null,ms:Date.now()-then,placed:pieces.length-sol.unplaced.length,complete:!sol.unplaced.length,valid});
  iterations++;return sol;
 };
 const vectors=O.formatCandidates(pieces,mat,{...p,_deadline:deadline},best);
 for(let i=0;i<vectors.length&&Date.now()<deadline&&!options.cancelled?.();i++){
  const vector=vectors[i];if(!best.unplaced.length&&vector.objective>objective(best,mat,p)+1e-5)continue;
  const restricted={...mat,formats:mat.formats.map(f=>({...f,availability:Math.min(f.availability,vector.caps[f.id]||0)}))};
  run(restricted,base,{_alignedAngles:axes[0]?.angles||angles,_caps:vector.caps});
  await new Promise(r=>setTimeout(r,0));
 }
 // No candidate restriction can remove the unrestricted fallback or its best
 // valid successor. Remaining time may refine the incumbent in-place.
 if(Date.now()<deadline&&!options.cancelled?.()&&!best.unplaced.length&&best.stocks.length>1){
  for(const remove of best.stocks.slice().sort((a,b)=>a.placements.length-b.placements.length)){
   if(Date.now()>=deadline||options.cancelled?.())break;const keep=clone(best.stocks.filter(b=>b.id!==remove.id));keep.forEach((b,i)=>b.id='ANCHOR'+i);
   const locks=keep.flatMap(b=>b.placements.map(q=>({...q,stock_id:b.id}))),moving=pieces.filter(x=>remove.placements.some(q=>q.piece_id===x.id));
   const sol=O.contourPass(pieces,mat,{...p,...shared,_nfpLevel:48,_deadline:deadline},{previous:{stocks:keep},locks},moving.slice().sort((a,b)=>b.raw.area_mm2-a.raw.area_mm2));for(const b of sol.stocks)for(const q of b.placements)q.locked=false;publish(sol);iterations++;
  }
 }
 let turn=0;
 while(Date.now()<deadline&&!options.cancelled?.()){
  const order=base.slice();if(turn%3===1)order.sort((a,b)=>Math.max(b.raw.width,b.raw.height)-Math.max(a.raw.width,a.raw.height));if(turn>2)for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  run(mat,order,turn<axes.length?{_alignedAngles:axes[turn].angles}:{_nfpLevel:48});turn++;await new Promise(r=>setTimeout(r,0));
 }
 return finish();
};
O.guillotine=(pieces,mat,p,options={})=>{
 if(options.locks?.length)throw Error('Gesperrte CNC-Belegungen können nicht still in einen Sägeschnittbaum umgewandelt werden.');
 const nonrect=pieces.filter(x=>x.raw.loops.length!==1||!['rectangle','saw_envelope'].includes(x.raw.strategy)&&x.process_hint!=='saw');if(nonrect.length)throw Error('Plattensäge benötigt nachgewiesene Rechteckteile ohne Innenkonturen.');
 let overall=null;const started=Date.now();
 const ff=allowedFormats(mat),deadline=options.deadline||p._deadline||started+p.search_seconds*1000;for(let variant=0;variant<Math.min(options.maxVariants||Infinity,8*(ff.length+1));variant++){
 const stocks=[],unplaced=[],counts=new Map(),k=p.kerf_mm,m=p.margin_mm;
 function fit(node,piece){if(node.children){return fit(node.children[0],piece)||fit(node.children[1],piece);}if(node.piece_id)return null;
  for(const a of rotations(mat)){const b=G.bounds(G.transform(piece.raw.loops,0,0,a)[0]),w=b.maxX-b.minX,h=b.maxY-b.minY;if(w>node.w+1e-6||h>node.h+1e-6)continue;
   const kx=Math.min(k,Math.max(0,node.w-w)),ky=Math.min(k,Math.max(0,node.h-h));
   let target;
   if(variant%2){const horizontal={x:node.x,y:node.y,w:node.w,h},bottom={x:node.x,y:node.y+h+ky,w:node.w,h:Math.max(0,node.h-h-ky)};node.axis='Y';node.cut_at=node.y+h;node.kerf=ky;node.children=[horizontal,bottom];target={x:node.x,y:node.y,w,h};horizontal.axis='X';horizontal.cut_at=node.x+w;horizontal.kerf=kx;horizontal.children=[target,{x:node.x+w+kx,y:node.y,w:Math.max(0,node.w-w-kx),h}];}
   else {const vertical={x:node.x,y:node.y,w,h:node.h},right={x:node.x+w+kx,y:node.y,w:Math.max(0,node.w-w-kx),h:node.h};node.axis='X';node.cut_at=node.x+w;node.kerf=kx;node.children=[vertical,right];target={x:vertical.x,y:vertical.y,w,h};vertical.axis='Y';vertical.cut_at=vertical.y+h;vertical.kerf=ky;vertical.children=[target,{x:vertical.x,y:vertical.y+h+ky,w,h:Math.max(0,vertical.h-h-ky)}];}target.piece_id=piece.id;
   return {piece_id:piece.id,x:node.x-b.minX,y:node.y-b.minY,angle:a,locked:false};}
  return null;}
 const localVariant=variant%8,order=pieces.slice().sort((a,b)=>localVariant<2?b.raw.area_mm2-a.raw.area_mm2:localVariant<4?Math.max(b.raw.width,b.raw.height)-Math.max(a.raw.width,a.raw.height):localVariant<6?b.raw.width-a.raw.width:b.raw.height-a.raw.height);
 for(const piece of order){
  let done=false;for(const b of stocks){const q=fit(b.cut_tree,piece);if(q){b.placements.push(q);done=true;break;}}
  const pref=variant<8||stocks.length?null:ff[Math.floor(variant/8)-1]?.id;
  if(done)continue;for(const f of ff.filter(f=>(counts.get(f.id)||0)<f.availability).sort((a,b)=>(a.id===pref?-1:0)-(b.id===pref?-1:0)||unitCost(mat,a,p.objective)-unitCost(mat,b,p.objective))){
   const b={id:'SAW'+(stocks.length+1),format:clone(f),placements:[],cut_tree:{x:m,y:m,w:f.width-2*m,h:f.height-2*m}};const q=fit(b.cut_tree,piece);if(q){b.placements.push(q);stocks.push(b);counts.set(f.id,(counts.get(f.id)||0)+1);done=true;break;}}
  if(!done)unplaced.push(piece.id);
 }
 for(const b of stocks)b.balance=contourBalance(b,pieces,p);const sol={stocks,unplaced,method:'Validated guillotine multistart: four orderings, both split axes; finite mixed formats',global_optimal:false};
 const check=V.solution(sol,pieces,mat,p);if(check.valid&&better(sol,overall,mat,p)){overall=sol;options.onBest?.(clone(sol));}if(options.cancelled?.()||Date.now()>=deadline)break;
 }
 if(!overall)throw Error('Kein unabhängig gültiger Sägeschnittbaum');return overall;
};
O.run=async(project,options={})=>{
 if(K.legacyIssues(project).length)throw Error('Altprojekt enthält Maßüberschreibungen, Sperren oder Sonderstrategien. Erst Übernahmeentscheidung treffen; historische Daten bleiben erhalten.');
 return O.runAutomatic(project,options);
};
// A small material-level procurement layer. Process geometry remains separate;
// only finite-stock allocation and total actual procurement are compared.
O.planMaterial=async(pieces,mat,processing,options={})=>{
 const objective=K.priceObjective(mat),groups=['cnc','saw','linear'].map(mode=>({mode,items:pieces.filter(x=>K.procedure(x)===mode)})).filter(g=>g.items.length),deadline=options.deadline||Date.now()+processing.search_seconds*1000,pp=mode=>({...processing,...processing.profiles?.[mode],mode:mode==='linear'?'cnc':mode,objective,part_in_part:false,common_line:false,hold_verified:false});
 const assemble=(done,order)=>{
  const process_groups=done.map(g=>({...canonical(g,mat),mode:g.mode,piece_ids:g.piece_ids})).sort((a,b)=>['cnc','saw','linear'].indexOf(a.mode)-['cnc','saw','linear'].indexOf(b.mode));
  const covered=new Set(process_groups.flatMap(g=>g.piece_ids)),stocks=process_groups.flatMap(g=>g.stocks.map(b=>({...b,id:g.mode+'_'+b.id,process_mode:g.mode}))),unplaced=[...process_groups.flatMap(g=>g.unplaced),...pieces.filter(x=>!covered.has(x.id)).map(x=>x.id)];
  return {stocks,unplaced,process_groups,objective,price_complete:objective==='cost',complete:!unplaced.length,global_optimal:groups.length===1&&process_groups.length===1&&!!process_groups[0].global_optimal,process_order:order,method:'Automatic procurement-aware separated process planning',process_separation:groups.length>1?'Separate raw formats per process, two process-order stock allocations compared; no shared-sheet machining claim':null};
 };
 let best=null;
 const publish=sol=>{const validation=V.solution(sol,pieces,mat,processing);if(validation.valid&&better(sol,best,mat,{objective})){best={...sol,validated:true,validation};options.onBest?.(clone(best));}};
 if(options.previous){const old=clone(options.previous);if(V.solution(old,pieces,mat,processing).valid)publish(old);}
 const orders=[groups];if(groups.length>1)orders.push(groups.slice().reverse());
 for(const order of orders){const done=[];for(const group of order){
  const uses=new Map();done.flatMap(g=>g.stocks).forEach(b=>uses.set(b.format.id,(uses.get(b.format.id)||0)+1));const available={...mat,formats:mat.formats.map(f=>({...f,availability:Math.max(0,f.availability-(uses.get(f.id)||0))}))},params=pp(group.mode);
  let sol=group.mode==='linear'?O.linearBaseline(group.items,available,params):group.mode==='saw'?O.guillotine(group.items,available,{...params,search_seconds:.04},{maxVariants:24}):O.contourBaseline(group.items,available,params);
  const validation=V.solution(sol,group.items,available,params);if(!validation.valid)throw Error(validation.errors.join('; '));done.push({...sol,mode:group.mode,piece_ids:group.items.map(x=>x.id)});
 }publish(assemble(done,order.map(g=>g.mode)));if(options.cancelled?.())break;}
 if(!best)throw Error('Kein gültiger Material-Startplan');
 if(options.fastOnly||Date.now()>=deadline||options.cancelled?.())return best;
 // Improve while holding the other process groups' finite stock reservations.
 // Reverse bootstraps above prevent a cheap first group consuming scarce stock
 // that is much more valuable to a later group.
 for(const mode of best.process_order||groups.map(g=>g.mode)){
  if(Date.now()>=deadline||options.cancelled?.())break;const group=groups.find(g=>g.mode===mode),other=best.process_groups.filter(g=>g.mode!==mode),uses=new Map();other.flatMap(g=>g.stocks).forEach(b=>uses.set(b.format.id,(uses.get(b.format.id)||0)+1));
  const available={...mat,formats:mat.formats.map(f=>({...f,availability:Math.max(0,f.availability-(uses.get(f.id)||0))}))},params={...pp(mode),search_seconds:Math.max(.001,(deadline-Date.now())/1000)},old=best.process_groups.find(g=>g.mode===mode);
  const candidate=sol=>publish(assemble([...other,{...sol,mode,piece_ids:group.items.map(x=>x.id)}],best.process_order));
  const sol=mode==='linear'?await O.linear(group.items,available,{...params,search_seconds:Math.min(.4,params.search_seconds)},{onBest:candidate,cancelled:options.cancelled}):mode==='saw'?O.guillotine(group.items,available,params,{onBest:candidate,deadline,cancelled:options.cancelled}):await O.contour(group.items,available,params,{onBest:candidate,deadline,previous:old,cancelled:options.cancelled});candidate(sol);
 }
 return best;
};
O.runAutomatic=async(project,options={})=>{
 const started=Date.now(),deadline=started+project.processing.search_seconds*1000,demand=K.demand(project),prior=K.scenario(project).result,solutions=prior?.signature===K.signature(project)?clone(prior.solutions):{},errors=[],work=[];
 const progress=()=>options.onProgress?.({signature:demand.signature,solutions:clone(solutions),costs:K.costs(project,demand,solutions),errors:clone(errors),intermediate:true});
 // Bootstrap the WHOLE eligible order before any expensive contour refinement.
 for(const mg of demand.materials){if(!['linear','sheet','textile'].includes(mg.material.kind))continue;const pieces=K.expand(demand,mg.material.id);if(!pieces.length)continue;const mat=K.procurementMaterial(mg.material,pieces.length);work.push({mat,pieces});
  try{solutions[mat.id]=await O.planMaterial(pieces,mat,project.processing,{fastOnly:true,previous:solutions[mat.id],cancelled:options.cancelled});}catch(e){errors.push({material_id:mat.id,error:String(e)});}progress();
 }
 work.sort((a,b)=>(a.mat.kind==='linear'?0:a.pieces.length<7?1:2)-(b.mat.kind==='linear'?0:b.pieces.length<7?1:2)||a.pieces.length-b.pieces.length);
 for(const {mat,pieces}of work){if(Date.now()>=deadline||options.cancelled?.())break;
  try{solutions[mat.id]=await O.planMaterial(pieces,mat,project.processing,{deadline,previous:solutions[mat.id],cancelled:options.cancelled,onBest:sol=>{solutions[mat.id]=sol;progress();}});}catch(e){errors.push({material_id:mat.id,error:String(e)});}progress();
 }
 const incomplete=work.some(({mat,pieces})=>!solutions[mat.id]||solutions[mat.id].unplaced.length||solutions[mat.id].validation?.placed!==pieces.length);
 return {signature:demand.signature,revision:project.revision,scenario_id:demand.scenario_id,solutions,costs:K.costs(project,demand,solutions),errors,created_utc:new Date().toISOString(),status:errors.length||incomplete?'PARTIAL_VALIDATED':'VALIDATED',eligible_complete:!incomplete,open_occurrences:demand.unresolved.length,engine:O.VERSION,timing:{budget_seconds:project.processing.search_seconds,wall_seconds:(Date.now()-started)/1000,scope:'One shared whole-order search deadline; bootstrap/atomic geometry/validation are non-preemptive. Browser watchdog enforces a bounded user-facing stop.'},scope:'Locally validated eligible scenario parts; unresolved source data stay open. No machine or purchasing release.'};
};
O.runLegacy=async(project,options={})=>{
 const demand=K.demand(project),solutions={},errors=[];for(const mg of demand.materials){if(!['linear','sheet','textile'].includes(mg.material.kind))continue;
  const pieces=K.expand(demand,mg.material.id);if(!pieces.length)continue;
  const locked=K.scenario(project).locked_placements[mg.material.id]||[],previous=K.scenario(project).result?.solutions?.[mg.material.id];
  const opt={locks:locked,previous,cancelled:options.cancelled,onBest:sol=>{const validation=V.solution(sol,pieces,mg.material,project.processing,locked);if(validation.valid){solutions[mg.material.id]={...sol,validated:true,validation};options.onProgress?.({signature:demand.signature,solutions:clone(solutions),costs:K.costs(project,demand,solutions),intermediate:true});}}};
  try{const solution=mg.material.kind==='linear'?await O.linear(pieces,mg.material,project.processing,opt):await O.contour(pieces,mg.material,project.processing,opt);const validation=V.solution(solution,pieces,mg.material,project.processing,locked);
   if(validation.valid)solutions[mg.material.id]={...solution,validated:true,validation};else errors.push({material_id:mg.material.id,errors:validation.errors});
  }catch(e){errors.push({material_id:mg.material.id,error:String(e)});}
  options.onProgress?.({signature:demand.signature,solutions:clone(solutions),costs:K.costs(project,demand,solutions),errors:clone(errors),intermediate:true});if(options.cancelled?.())break;
 }
 return {signature:demand.signature,revision:project.revision,scenario_id:demand.scenario_id,solutions,costs:K.costs(project,demand,solutions),errors,created_utc:new Date().toISOString(),
  status:errors.length?'PARTIAL_VALIDATED':'VALIDATED',scope:'Geometry-valid scenario plans; no manufacturing or ordering release.'};
};
root.CutplanOptimizer=O;if(node)module.exports=O;
})(typeof globalThis!=='undefined'?globalThis:this);
