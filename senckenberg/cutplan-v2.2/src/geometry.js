/* Robust polygon operations delegated to bundled Clipper 6.4.2 (Boost license). */
(function(root){'use strict';
const C=typeof module!=='undefined'&&module.exports?require('../../vendor_source/clipper-lib/clipper.js'):root.ClipperLib;
const SCALE=1000, G={SCALE};
G.area=ring=>Math.abs(ring.reduce((a,p,i)=>{const q=ring[(i+1)%ring.length];return a+p[0]*q[1]-p[1]*q[0]},0)/2);
G.netArea=loops=>loops.length?G.area(loops[0])-loops.slice(1).reduce((a,r)=>a+G.area(r),0):0;
G.bounds=ring=>({minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),minY:Math.min(...ring.map(p=>p[1])),maxY:Math.max(...ring.map(p=>p[1]))});
G.rect=(w,h)=>[[0,0],[w,0],[w,h],[0,h]];
G.transform=(rings,x,y,angle=0)=>{const c=Math.cos(angle*Math.PI/180),s=Math.sin(angle*Math.PI/180);return rings.map(r=>r.map(p=>[p[0]*c-p[1]*s+x,p[0]*s+p[1]*c+y]));};
G.normalize=rings=>{const b=G.bounds(rings[0]);return rings.map(r=>r.map(p=>[p[0]-b.minX,p[1]-b.minY]));};
G.paths=rings=>rings.map((r,i)=>{let p=r.map(v=>({X:Math.round(v[0]*SCALE),Y:Math.round(v[1]*SCALE)}));if(C.Clipper.Orientation(p)!==(i===0))p.reverse();return p;});
G.rings=paths=>paths.map(p=>p.map(v=>[v.X/SCALE,v.Y/SCALE]));
G.offset=(rings,distance)=>{if(Math.abs(distance)<1e-10)return rings.map(r=>r.map(p=>p.slice()));const o=new C.ClipperOffset(2,.01*SCALE),out=[];o.AddPaths(G.paths(rings),C.JoinType.jtRound,C.EndType.etClosedPolygon);o.Execute(out,distance*SCALE);out.sort((a,b)=>Math.abs(C.Clipper.Area(b))-Math.abs(C.Clipper.Area(a)));return G.rings(out);};
G.boolean=(a,b,operation)=>{const c=new C.Clipper(),out=[];c.AddPaths(G.paths(a),C.PolyType.ptSubject,true);if(b.length)c.AddPaths(G.paths(b),C.PolyType.ptClip,true);c.Execute(operation,out,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);return G.rings(out);};
G.intersectionArea=(a,b)=>G.boolean(a,b,C.ClipType.ctIntersection).reduce((n,r)=>n+G.area(r),0);
G.unionArea=rings=>{const c=new C.Clipper(),out=[];for(const shape of rings)c.AddPaths(G.paths(shape),C.PolyType.ptSubject,true);c.Execute(C.ClipType.ctUnion,out,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);return Math.abs(out.reduce((n,p)=>n+C.Clipper.Area(p)/(SCALE*SCALE),0));};
G.nfp=(stationary,moving)=>{const a=G.paths([stationary])[0],b=G.paths([moving.map(p=>[-p[0],-p[1]])])[0];const out=C.Clipper.MinkowskiSum(b,a,true);return G.rings(out);};
G.candidateOutline=(ring,max=96)=>{if(ring.length<=max)return ring;return ring.filter((_,i)=>i%Math.ceil(ring.length/max)===0);};
// Search aid only: retain significant corners rather than skipping every nth
// vertex. The unmodified contour remains authoritative for collisions.
G.cleanCandidate=ring=>{const candidate=G.rings([C.Clipper.CleanPolygon(G.paths([ring])[0],.1*SCALE)])[0];return candidate.length>=3&&G.area(candidate)>1e-8?candidate:ring;};
G.candidateBuffer=(ring,gap)=>{const o=new C.ClipperOffset(2,.1*SCALE),out=[];o.AddPath(G.paths([ring])[0],C.JoinType.jtMiter,C.EndType.etClosedPolygon);o.Execute(out,gap*SCALE);out.sort((a,b)=>Math.abs(C.Clipper.Area(b))-Math.abs(C.Clipper.Area(a)));return G.rings(out)[0];};
G.clearRectangle=(stock,pieces,p)=>{
 const by=new Map(pieces.map(x=>[x.id,x])),w=stock.format.width,h=stock.format.height,m=p.margin_mm;
 if(w<=2*m||h<=2*m)return null;
 const obstacles=stock.placements.map(q=>{const piece=by.get(q.piece_id),b=G.bounds(G.transform([piece.raw.loops[0]],q.x,q.y,q.angle)[0]),d=p.kerf_mm/2+(piece.raw.error_mm||0)+.02;return {x0:Math.max(m,b.minX-d),x1:Math.min(w-m,b.maxX+d),y0:Math.max(m,b.minY-d),y1:Math.min(h-m,b.maxY+d)};});
 const xs=[...new Set([m,w-m,...obstacles.flatMap(b=>[b.x0,b.x1])])].sort((a,b)=>a-b);let best=null;
 const consider=(x0,x1,y0,y1)=>{const area=(x1-x0)*(y1-y0);if(x1-x0>0&&y1-y0>0&&(!best||area>best.area_mm2+.001))best={x:x0,y:y0,width:x1-x0,height:y1-y0,area_mm2:area};};
 for(let i=0;i<xs.length-1;i++)for(let j=i+1;j<xs.length;j++){
  const blocks=obstacles.filter(b=>b.x0<xs[j]-1e-7&&b.x1>xs[i]+1e-7).sort((a,b)=>a.y0-b.y0);let y=m;
  for(const b of blocks){if(b.y0>y)consider(xs[i],xs[j],y,b.y0);y=Math.max(y,b.y1);}if(y<h-m)consider(xs[i],xs[j],y,h-m);
 }
 return best?{...best,method:'Largest axis-aligned rectangle outside conservatively expanded occurrence bounding boxes; not a global contour-space optimum',status:'GEOMETRIC_POTENTIAL_ONLY_NOT_INVENTORY',clearance:'Half tool spacing plus contour error plus 0.02 mm; stock margins excluded'}:null;
};
G.sheetBalance=(stock,pieces,p)=>{const by=new Map(pieces.map(x=>[x.id,x])),w=stock.format.width,h=stock.format.height,m=p.margin_mm,inner=[[m,m],[w-m,m],[w-m,h-m],[m,h-m]];
 const raw=stock.placements.map(q=>G.transform(by.get(q.piece_id).raw.loops,q.x,q.y,q.angle));const parts=raw.reduce((n,r)=>n+G.netArea(r),0);
 const buffers=raw.map((r,i)=>G.boolean(G.offset(r,p.kerf_mm/2+(by.get(stock.placements[i].piece_id).raw.error_mm||0)+.001),[inner],C.ClipType.ctIntersection));
 const union=G.unionArea(buffers),margin=w*h-Math.max(0,w-2*m)*Math.max(0,h-2*m),tool=Math.max(0,union-parts),rest=w*h-margin-parts-tool;
 const clear_rectangle=G.clearRectangle(stock,pieces,p);
 return {raw_area_mm2:w*h,parts_area_mm2:parts,margin_area_mm2:margin,tool_loss_mm2:tool,unallocated_remainder_mm2:rest,reusable_remainder_area_mm2:null,clear_rectangle,
  remainder_status:'SIMULATION_GEOMETRY_NOT_CONFIRMED_STOCK; unallocated area is not automatically waste or usable stock',balance_difference_mm2:w*h-parts-margin-tool-rest};};
root.CutplanGeometry=G;if(typeof module!=='undefined'&&module.exports)module.exports=G;
})(typeof globalThis!=='undefined'?globalThis:this);
