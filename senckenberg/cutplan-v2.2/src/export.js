(function(root){'use strict';const node=typeof module!=='undefined'&&module.exports,K=node?require('./core.js'):root.CutplanCore,G=node?require('./geometry.js'):root.CutplanGeometry;
const E={},esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));E.escape=esc;
E.camera=[[-.7071067812,.7071067812,0],[-.3481553119,-.3481553119,.8703882798]];
E.displayMeshFor=(project,o)=>{
 if(root.CutplanDisplay)return root.CutplanDisplay.getMesh(project,o);
 const m=o.display_mesh||project.display_meshes?.[o.id];if(!m?.vertices?.length||!m?.triangles?.length)return null;
 if(m.vertices.some(v=>v.length!==3||v.some(x=>!Number.isFinite(x)))||m.triangles.some(t=>t.length!==3||t.some(i=>!Number.isInteger(i)||i<0||i>=m.vertices.length)))return null;
 return (!m.source_hash||m.source_hash===o.source_hash)&&(!m.guid||m.guid===o.guid)?m:null;
};
E.nativeProjection=(module,project,w=700,h=350)=>{
 const ids=new Set(module.occurrence_ids),objects=project.occurrences.filter(o=>ids.has(o.id)),all=objects.flatMap(o=>E.displayMeshFor(project,o)?.vertices||(o.wire||[]).flat());
 if(!all.length)return {objects:[],points:[],scale:1,project:()=>[0,0]};
 const q=point=>E.camera.map(r=>r.reduce((n,v,i)=>n+v*point[i],0)),lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];for(const point of all){const v=q(point);for(let j=0;j<2;j++){lo[j]=Math.min(lo[j],v[j]);hi[j]=Math.max(hi[j],v[j]);}}
 const scale=Math.min((w-46)/Math.max(1,hi[0]-lo[0]),(h-32)/Math.max(1,hi[1]-lo[1]));
 return {objects,scale,project:point=>{const v=q(point);return [w/2+(v[0]-(lo[0]+hi[0])/2)*scale,h/2-(v[1]-(lo[1]+hi[1])/2)*scale];}};
};
E.nativeSVG=(module,p,selected=[],w=700,h=350,labels=true)=>{
 const view=E.nativeProjection(module,p,w,h),chosen=new Set(selected),faces=[],fallback=[];
 const svgFaces=view.objects.reduce((n,o)=>n+(E.displayMeshFor(p,o)?.triangles.length||0),0)<=60000;
 const path=rings=>rings.map(r=>'M'+r.map(q=>view.project(q).map(v=>v.toFixed(2)).join(',')).join('L')+'Z').join(''),depth=q=>q[0]*.6154574549+q[1]*.6154574549+q[2]*.4923659639;
 for(const o of view.objects){const mesh=E.displayMeshFor(p,o);
  if(mesh&&svgFaces){for(const t of mesh.triangles){const points=t.map(i=>mesh.vertices[i]),u=points[1].map((v,i)=>v-points[0][i]),v=points[2].map((v,i)=>v-points[0][i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);if(length<1e-12)continue;const shade=.68+.27*Math.abs((n[0]*.2-n[1]*.45+n[2]*.87)/length);faces.push({o,points,z:points.reduce((sum,q)=>sum+depth(q),0)/3,shade});}}
  else fallback.push(o);
 }
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(module.label)} – ${faces.length?'native Mesh-Flächen; SVG-Ersatzansicht':'native CAD-Kanten; Flächendarstellung noch nicht geladen'}"><rect width="100%" height="100%" fill="white"/>`;
 for(const f of faces.sort((a,b)=>a.z-b.z)){const color=(chosen.has(f.o.id)?[218,154,97]:[190,208,194]).map(v=>Math.round(v*f.shade));s+=`<path data-occurrence="${esc(f.o.id)}" class="native-mesh-face" style="fill:rgb(${color});stroke:none" d="${path([f.points])}"/>`;}
 for(const o of fallback)for(const line of o.wire||[])s+=`<path data-occurrence="${esc(o.id)}" class="part-path ${chosen.has(o.id)?'selected':''}" style="fill:none" d="M${line.map(q=>view.project(q).map(v=>v.toFixed(2)).join(',')).join('L')}"><title>${esc(o.position+' · '+o.label)}</title></path>`;
 for(const o of view.objects){const mesh=E.displayMeshFor(p,o);if(!mesh?.edges?.length)continue;const d=mesh.edges.map(pair=>'M'+pair.map(i=>view.project(mesh.vertices[i]).map(v=>v.toFixed(2)).join(',')).join('L')).join('');s+=`<path data-occurrence="${esc(o.id)}" class="native-feature-edges" style="fill:none;stroke:${chosen.has(o.id)?'#874c25':'#587263'};stroke-width:${chosen.has(o.id)?1.1:.45};vector-effect:non-scaling-stroke" d="${d}"/>`;}
 const occupied=[],candidates=view.objects.filter(o=>E.displayMeshFor(p,o)||o.wire?.length).sort((a,b)=>Number(chosen.has(b.id))-Number(chosen.has(a.id)));
 if(labels)for(const [j,o]of candidates.entries()){
  if(!chosen.has(o.id)&&j>=12)continue;const xy=(E.displayMeshFor(p,o)?.vertices||(o.wire||[]).flat()).map(view.project);if(!xy.length)continue;const cx=xy.reduce((n,q)=>n+q[0],0)/xy.length,cy=xy.reduce((n,q)=>n+q[1],0)/xy.length,tw=Math.max(39,String(o.position).length*8),th=18;
  let box=null;for(const r of [22,46,72,104,138])for(const [dx,dy]of [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[-1,1]]){const x=Math.max(3,Math.min(w-tw-3,cx+dx*r-tw/2)),y=Math.max(3,Math.min(h-th-3,cy+dy*r-th/2));if(!occupied.some(b=>x<b.x+b.w+5&&x+tw+5>b.x&&y<b.y+b.h+4&&y+th+4>b.y)){box={x,y,w:tw,h:th};break;}if(box)break;}
  if(!box)continue;occupied.push(box);s+=`<g data-occurrence="${esc(o.id)}" class="annotation ${chosen.has(o.id)?'selected':''}"><path class="leader" d="M${cx},${cy}L${box.x+tw/2},${box.y+th/2}"/><rect class="label-bg" x="${box.x}" y="${box.y}" width="${tw}" height="${th}" rx="3"/><text class="position-label" x="${box.x+4}" y="${box.y+13}">${esc(o.position)}</text></g>`;
 }
 return s+'</svg>';
};
E.sheetSVG=(stock,pieces,p,selected=null,mm=false)=>{
 const by=new Map(pieces.map(x=>[x.id,x])),linear=stock.format.length!==undefined,w=linear?stock.format.length:stock.format.width,h=linear?Math.max(100,w*.08):stock.format.height;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" ${mm?`width="${w}mm" height="${h}mm"`:''} viewBox="${mm?'0 0 '+w+' '+h:'-15 -15 '+(w+30)+' '+(h+30)}" data-stock="${esc(stock.id)}"><title>${esc(stock.id)} | mm | ${esc(p.processing.id)}${linear?' | 1D length plan; height schematic, not machining geometry':''}</title><rect class="stock-outline" x="0" y="0" width="${w}" height="${h}"/>`;
 s+='<style>.stock-outline{fill:#faf7ec;stroke:#887e61;stroke-width:1}.clear-rest{fill:#e2edf3;stroke:#46697a;stroke-width:1;stroke-dasharray:7 4;vector-effect:non-scaling-stroke}.cut-part{fill:#cbdccd;stroke:#47685c;stroke-width:1;vector-effect:non-scaling-stroke}.cut-part.active{fill:#ebac76;stroke:#71340c;stroke-width:2}</style>';
 const rr=stock.balance?.clear_rectangle;if(!linear&&rr)s+=`<rect class="clear-rest" x="${rr.x}" y="${rr.y}" width="${rr.width}" height="${rr.height}"><title>Geometrisch freies Restrechteck ${rr.width.toFixed(1)} × ${rr.height.toFixed(1)} mm; kein bestätigter Bestand oder Schnittplan.</title></rect>`;
 for(const q of stock.placements){const piece=by.get(q.piece_id);if(!piece)continue;const cls=`cut-part ${selected===q.piece_id?'active':''} ${q.locked?'locked':''}`;
  const rings=linear?[G.rect(q.length,h*.55).map(v=>[v[0]+q.x,v[1]+h*.2])]:G.transform(piece.raw.loops,q.x,q.y,q.angle);
  const bb=G.bounds(rings[0]),label=piece.source_ids.map(id=>p.occurrences.find(o=>o.id===id)?.position||'?').join('/');
  s+=`<path data-piece="${esc(q.piece_id)}" class="${cls}" fill-rule="evenodd" d="${rings.map(r=>'M'+r.map(v=>v.join(',')).join('L')+'Z').join('')}"/><text x="${linear?q.x+5:(bb.minX+bb.maxX)/2}" y="${linear?h*.16:(bb.minY+bb.maxY)/2}" font-size="${Math.max(13,w/85)}" text-anchor="middle" fill="#173c3c" stroke="white" stroke-width="3" paint-order="stroke">${esc(label)}</text>`;
 }return s+'</svg>';
};
E.sha256=async text=>{if(node)return require('crypto').createHash('sha256').update(text).digest('hex');if(!root.crypto?.subtle)throw Error('WebCrypto fehlt. CUTPLAN über den dokumentierten localhost-Start öffnen.');const bytes=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');};
E.projectFile=async p=>{K.validateProject(p);const payload=K.clone(p);return JSON.stringify({format:'FORMIKAT_CUTPLAN',schema:p.schema_version===2?2:1,sha256:await E.sha256(K.stable(payload)),payload});};
E.readProject=async text=>{let env;try{env=JSON.parse(text);}catch{throw Error('Beschädigte Projektdatei: kein gültiges JSON.');}
 if(env.format!=='FORMIKAT_CUTPLAN'||![1,2].includes(env.schema)||!env.payload)throw Error('Inkompatible Projektdatei; nichts wurde geladen.');
 if(await E.sha256(K.stable(env.payload))!==env.sha256)throw Error('Inhaltsprüfung fehlgeschlagen; Projekt nicht geladen.');K.validateProject(env.payload);return env.payload;};
E.csv=p=>{const d=K.demand(p),rows=[['Szenario','Projektrevision','Material-ID','Modul-ID','Teile-ID','Bauteil','Menge','Fertigmaß Länge mm','Fertigmaß Breite mm','Fertigmaß Höhe mm','Rohmaß Länge mm','Rohmaß Breite mm','Rohmaß Höhe mm','Status','Quelle SHA256','Original GUID','Instanzpfad','Offene Fragen']];
 for(const r of d.rows)for(const origin of r.origins)rows.push([d.scenario_id,p.revision,r.material_id,r.module_id,r.id,r.label,r.quantity,r.finish?.length_mm,r.finish?.width_mm,r.finish?.height_mm,r.raw?.length,r.raw?.width,r.raw?.height,r.status,origin.source_hash,origin.guid,JSON.stringify(origin.instance_path),r.issues.join('; ')]);
 for(const r of d.excluded){const o=p.occurrences.find(o=>o.id===r.id);rows.push([d.scenario_id,p.revision,'',r.module_id,r.id,o?.label,0,'','','','','','',r.reason,o?.source_hash,o?.guid,JSON.stringify(o?.instance_path||[]),'Nicht im aktuellen Produktionsumfang']);}
 const cell=v=>{let x=String(v??'');if(/^[=+@]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"';};return '\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n');
};
E.dxf=(stock,pieces)=>{
 const by=new Map(pieces.map(p=>[p.id,p])),s=['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES'];
 function poly(ring,layer){s.push('0','LWPOLYLINE','8',layer.replace(/[^A-Za-z0-9_]/g,'_'),'90',String(ring.length),'70','1');for(const [x,y]of ring)s.push('10',String(x),'20',String(y));}
 if(stock.format.width)poly(G.rect(stock.format.width,stock.format.height),'RAW_MM');
 for(const q of stock.placements){const p=by.get(q.piece_id);if(p?.raw.loops)G.transform(p.raw.loops,q.x,q.y,q.angle).forEach((r,i)=>poly(r,q.piece_id+'_'+i));}
 s.push('0','ENDSEC','0','EOF');return s.join('\n');
};
E.linearPatterns=(solution,pieces,p)=>{
 const by=new Map(pieces.map(x=>[x.id,x])),groups=new Map(),positions=piece=>piece.source_ids.map(id=>p.occurrences.find(o=>o.id===id)?.position||id).join('/');
 const rounded=v=>Math.round(v*1000)/1000;
 for(const b of solution.stocks){const sorted=b.placements.slice().sort((a,b)=>a.x-b.x),key=K.stable([b.format.id,sorted.map(q=>[rounded(q.length),rounded(q.x)]),rounded(b.balance.remainder_mm)]);
  if(!groups.has(key))groups.set(key,{format:b.format,count:0,remainder:b.balance.remainder_mm,loss:b.balance.cut_and_trim_loss_mm,placements:[],stock_ids:[],sequence:''});const g=groups.get(key);g.count++;g.stock_ids.push(b.id);g.placements.push(...sorted.map(q=>({stock_id:b.id,...q})));
  g.sequence=sorted.map(q=>positions(by.get(q.piece_id))+' · '+Number(q.length.toFixed(2))).join(' | ');
 }
 // Show every position contributing to repeated patterns, not only the last bar.
 for(const g of groups.values()){const count=g.placements.length/g.count;g.sequence=Array.from({length:count},(_,i)=>{const qq=g.placements.filter((q,j)=>j%count===i),pp=[...new Set(qq.flatMap(q=>by.get(q.piece_id).source_ids.map(id=>p.occurrences.find(o=>o.id===id)?.position||id)))];return Number(qq[0].length.toFixed(2))+' mm ['+pp.join(', ')+']';}).join(' > ');}
 return [...groups.values()];
};
E.pdfLegacy=(p)=>{
 const jsPDF=node?require('../../vendor_source/jspdf/dist/jspdf.umd.min.js').jsPDF:root.jspdf.jsPDF;
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true}),d=K.demand(p),scenario=K.scenario(p),res=scenario.result,current=res?.signature===d.signature;
 const costs=K.costs(p,d,current?res.solutions:{});let pages=0,y=0;
 const text=(t,x,yy,size=9,width=270)=>{doc.setFontSize(size);const lines=doc.splitTextToSize(String(t??'').replaceAll('≠','!=').replaceAll('→','->').replaceAll('×','x'),width);doc.text(lines,x,yy);return yy+lines.length*size*.39;};
 function page(title){if(pages)doc.addPage();pages++;doc.setTextColor(23,60,60);doc.setDrawColor(215,223,216);doc.setFont('helvetica','bold');text('FORMIKAT CUTPLAN',12,12,9);text(title,12,24,17);doc.line(12,29,285,29);doc.setFont('helvetica','normal');text('Testszenario / Kalkulationsgrundlage – keine Fertigungs- oder Bestellfreigabe',12,201,7);text(String(pages),280,201,7);y=37;}
 function table(headers,rows,widths){const row=(cells,head=false)=>{const wrapped=cells.map((c,i)=>doc.splitTextToSize(String(c??''),widths[i]-4)),height=Math.max(...wrapped.map(x=>x.length))*3.5+5;if(y+height>192){page('Fortsetzung');row(headers,true);}let x=12;doc.setFillColor(...(head?[230,236,229]:[248,248,244]));doc.rect(x,y-4,widths.reduce((a,b)=>a+b,0),height,'F');doc.setFontSize(8);wrapped.forEach((lines,i)=>{doc.text(lines,x+2,y);x+=widths[i];});y+=height;};row(headers,true);for(const r of rows)row(r);}
 page(p.name);y=text(scenario.label+' | Revision '+p.revision+' | '+scenario.status,12,y,11);y+=5;
 y=text('CAD-Bilanz '+d.technical_occurrences+' | ausgewählt '+d.selected_occurrences+' Vorkommen | geplante Menge '+d.planned_quantity+' | offene Zeilen '+d.unresolved.length,12,y,10);y+=5;
 y=text(current?'Aktueller, unabhängig validierter Rechenstand.':'Kein aktueller vollständiger Rechenstand. Zuschnitt/Kosten sind offen oder veraltet.',12,y,10);y+=7;
 for(const source of p.sources){y=text(source.name,12,y,10);y=text('SHA-256 '+source.sha256+' | '+source.cad_occurrences+' CAD-Vorkommen',12,y+2,7);y+=7;}
 y=text('Alle Rohformate, Preise und Produktionsentscheidungen dieses gelieferten Testprojekts sind sichtbare Szenarioeingaben, soweit nicht vom Nutzer bewusst bestätigt. Unbekannte Preise sind nicht null.',12,y,10);y+=8;
 y=text('Bekannte Material-Einkaufsteilsumme: '+(costs.known_subtotal===null?'NICHT ADDIERBAR':costs.known_subtotal.toFixed(2))+' '+costs.currency+' '+costs.basis+' | offene Kostenpositionen: '+costs.open.length,12,y,12);
 const selected=p.modules.filter(m=>scenario.selection[m.id]?.selected);
 for(let start=0;start<selected.length;start+=3){page('Module und gewählte Ausführungen');for(let j=0;j<3;j++){const m=selected[start+j];if(!m)break;const x=12+j*92;const view=E.nativeProjection(m,p,86,112);doc.setDrawColor(71,116,106);doc.setLineWidth(.15);
  for(const o of view.objects)for(const line of o.wire){const pts=line.map(view.project);for(let k=1;k<pts.length;k++)doc.line(x+pts[k-1][0],45+pts[k-1][1],x+pts[k][0],45+pts[k][1]);}
  text(m.label,x,38,10,86);text(scenario.selection[m.id].count_mode+' | Anzahl '+scenario.selection[m.id].quantity+' | '+m.occurrence_ids.length+' CAD-Vorkommen',x,167,8,86);
  text('Native CAD-Kanten, keine verdeckungsfreie Fertigungszeichnung. Produktionsumfang im Testszenario.',x,181,7,86);}}
 page('Bauteile und Gesamtbedarf');table(['Material / Pos.','Modul / Bauteil','Geometrie / Rohzuschnitt (mm)','Menge','Status / offene Frage'],d.groups.map(g=>[g.material_id||'OFFEN',g.rows.map(r=>r.module_label).filter((v,i,a)=>a.indexOf(v)===i).join(', ')+' / '+g.label,
  g.raw?.length?'L '+g.finish.length_mm.toFixed(3)+' -> '+g.raw.length.toFixed(3):g.raw?.width?g.raw.width.toFixed(2)+' x '+g.raw.height.toFixed(2)+' / '+g.raw.strategy:'UNKNOWN',g.quantity,g.status+(g.issues.length?' / '+g.issues.join('; '):'')]),[44,68,66,18,77]);
 page('Gemeinsamer Materialbedarf');table(['Materialartikel','Teile / offen','Geometrischer Bedarf','Rohzuschnittbedarf','Beitragende Module'],d.materials.map(m=>[m.material.label,m.quantity+' / '+(m.quantity-m.resolved_quantity),(m.length_mm/1000).toFixed(3)+' m | '+(m.area_mm2/1e6).toFixed(3)+' m2',(m.raw_length_mm/1000).toFixed(3)+' m | '+(m.raw_area_mm2/1e6).toFixed(3)+' m2',m.contributors.join(', ')]),[65,28,57,57,66]);
 if(current)for(const [mid,solution]of Object.entries(res.solutions)){const pieces=K.expand(d,mid),by=new Map(pieces.map(x=>[x.id,x])),linear=solution.stocks[0]?.format.length!==undefined,per=linear?10:4;
  for(let start=0;start<solution.stocks.length;start+=per){page('Zuschnitt | '+mid+' | '+(start+1)+'–'+Math.min(start+per,solution.stocks.length));text(solution.method+' | global optimal: '+(solution.global_optimal?'ja, nur angegebenes Modell':'nicht bewiesen')+' | nicht platziert '+solution.unplaced.length,12,35,7);
   for(let j=0;j<per;j++){const stock=solution.stocks[start+j];if(!stock)break;const w=stock.format.length||stock.format.width,h=linear?60:stock.format.height,sc=Math.min((linear?265:127)/w,(linear?4:53)/h),ox=linear?12:12+(j%2)*138,oy=linear?45+j*14.5:48+Math.floor(j/2)*73;
    text(stock.id+' · '+stock.format.id+' · '+(linear?w+' mm':w+' x '+h+' mm')+' · '+stock.placements.length+' Teile',ox,oy-3,7,linear?270:130);doc.setDrawColor(100,100,80);doc.rect(ox,oy,w*sc,h*sc);doc.setDrawColor(40,106,90);
    for(const q of stock.placements){const piece=by.get(q.piece_id);if(!piece)continue;if(linear)doc.rect(ox+q.x*sc,oy,q.length*sc,h*sc);else for(const ring of G.transform(piece.raw.loops,q.x,q.y,q.angle))for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];doc.line(ox+a[0]*sc,oy+a[1]*sc,ox+b[0]*sc,oy+b[1]*sc);}}
    const b=stock.balance;text(linear?'Teile '+b.part_length_mm.toFixed(1)+' + Schnitt/Beschnitt '+b.cut_and_trim_loss_mm.toFixed(1)+' + Rest '+b.remainder_mm.toFixed(1)+' mm | '+b.actual_cut_count+' Schnitte':'Teile '+(b.parts_area_mm2/1e6).toFixed(3)+' m2 | Restfläche nicht als Bestand bestätigt',ox,oy+h*sc+3,6,linear?270:130);
   }
  }
 }
 const formatSummary=ff=>{const groups=new Map();for(const f of ff){const k=f.id+' ('+f.origin+')';groups.set(k,(groups.get(k)||0)+f.quantity);}return [...groups].map(([k,n])=>k+' x '+n).join('; ');};
 page('Materialbeschaffung und Kosten');table(['Material','Beschaffte Formate / Einheiten','Bekannte Einkaufskosten','Preisstatus'],costs.lines.map(l=>[l.label,formatSummary(l.formats),l.known_cash.toFixed(2)+' '+l.currency+' '+l.basis,l.status+(l.unpriced_formats?' / '+l.unpriced_formats+' Formate ohne Preis':'')]),[70,100,52,51]);
 y+=5;y=text('Bekannte Teilsumme: '+(costs.known_subtotal===null?'NICHT ADDIERBAR':costs.known_subtotal.toFixed(2))+' '+costs.currency+' | Gesamtsumme: '+(costs.grand_total===null?'OFFEN':costs.grand_total.toFixed(2)),12,y,12);y+=7;
 for(const open of costs.open){if(y>184)page('Offene Kostenpositionen');y=text((open.material_id||'Projekt')+': '+open.reason,12,y,8);y+=3;}
 page('Umfang, Herkunft und Grenzen');y=text('Vollständige Herkunft je CAD-Vorkommen: Quellhash, Original-GUID und Instanzpfad in der portablen Projektdatei und im CSV. Gleichgeometrie ersetzt keine Material- oder Artikelidentität. Ausgeblendete Teile bleiben gemäß gewählter Rolle sichtbar in der Bilanz.',12,y,10);y+=8;
 y=text('Offene Teile bleiben enthalten und werden nicht als definitive Summe oder Preis null versteckt. Materialeinkauf ist nicht die gesamte Projektkalkulation. Nicht belegte Fläche ist nicht automatisch Abfall. Simulationsreste sind kein vorhandener Bestand.',12,y,10);y+=8;
 y=text('Konturen: echte native Profile, maximal '+p.contour_error_mm+' mm dokumentierter Sehnenfehler, zusätzlich bei Werkzeugabständen berücksichtigt. SVG/DXF in mm. CAD-Vergleichstoleranz 0,1 mm ist keine Fertigungstoleranz. Sägen-/CNC-Pläne benötigen eine externe Prozess- und Maschinenfreigabe.',12,y,10);y+=8;
 y=text('Teilbilanz: '+d.selected_occurrences+' gewählt; '+d.excluded.length+' nicht im Produktionsumfang; '+d.unresolved.length+' offene gewählte Zeilen. '+d.issues.join(' / '),12,y,10);
 return doc;
};
E.pdf=p=>{
 const jsPDF=node?require('../../vendor_source/jspdf/dist/jspdf.umd.min.js').jsPDF:root.jspdf.jsPDF,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true}),d=K.demand(p),s=K.scenario(p),r=s.result,valid=r?.signature===d.signature,costs=K.costs(p,d,valid?r.solutions:{}),materials=new Map(K.materials(p).map(m=>[m.id,m]));let pages=0,y=0;
 const clean=t=>String(t??'').replaceAll('→',' > ').replaceAll('×','x').replaceAll('≤','<=').replaceAll('²','2').replaceAll('–','-'),num=(v,dd=2)=>v===null||v===undefined?'offen':Number(v).toLocaleString('de-DE',{maximumFractionDigits:dd}),price=(v,c,b)=>num(v)+' '+c+' '+(b==='NET'?'netto':'brutto'),position=id=>p.occurrences.find(o=>o.id===id)?.position||'?';
 function text(t,x,yy,sz=9,w=270){doc.setFontSize(sz);const lines=doc.splitTextToSize(clean(t),w);doc.text(lines,x,yy);return yy+lines.length*sz*.39;}
 function page(title){if(pages)doc.addPage();pages++;doc.setTextColor(23,60,60);doc.setFont('helvetica','bold');text('FORMIKAT CUTPLAN V2.1',12,12,9);text(title,12,24,17);doc.setDrawColor(205,215,205);doc.line(12,29,285,29);doc.setFont('helvetica','normal');text('Testszenario - keine Fertigungs-, Maschinen- oder Bestellfreigabe',12,201,7);text(String(pages),280,201,7);y=37;}
 function table(headers,rows,widths,title){function row(cells,head=false){doc.setFontSize(8);const lines=cells.map((c,i)=>doc.splitTextToSize(clean(c),widths[i]-4)),height=Math.max(...lines.map(x=>x.length))*3.5+4;if(y+height>191){page(title+' - Fortsetzung');row(headers,true);}let x=12;doc.setFillColor(...(head?[231,238,230]:[250,249,245]));doc.rect(12,y-3,widths.reduce((a,b)=>a+b),height,'F');doc.setFont('helvetica',head?'bold':'normal');lines.forEach((ll,i)=>{doc.text(ll,x+2,y);x+=widths[i];});y+=height;}row(headers,true);for(const rr of rows)row(rr);}
 page(p.name+' - Material & Zuschnitt');y=text(s.label,12,y,12);y+=5;y=text(d.selected_occurrences+' CAD-Vorkommen gewählt | '+d.planned_quantity+' geplante Teile | '+d.unresolved.length+' Positionen mit offenen Grundlagen',12,y,10);y+=4;y=text(valid?'Aktueller, getrennt validierter Zuschnittstand.':'Kein aktueller Plan. Alte Belegungen und deren Kosten werden nicht als aktuell ausgegeben.',12,y,10);y+=5;y=text('Bekannter Materialeinkauf: '+price(costs.known_subtotal,costs.currency,costs.basis)+' | Gesamtsumme: '+(costs.grand_total===null?'OFFEN':price(costs.grand_total,costs.currency,costs.basis)),12,y,12);y+=6;
 table(['Gewählte Module / Bauumfang','Anzahl','Mengenbezug'],p.modules.filter(m=>s.selection[m.id]?.selected).map(m=>[m.label,s.selection[m.id].quantity,s.selection[m.id].count_mode==='scene'?'platzierter Gesamtbestand':'Modulvorlage']),[200,22,51],'Bauumfang');
 page('Materialbedarf und Beschaffung');table(['Material / Stärke / Querschnitt','Teile / offen','Gezeichneter Bedarf','Beschaffung / bekannter Einkauf'],d.materials.map(mg=>{const m=mg.material,line=costs.lines.find(x=>x.material_id===m.id),ff=new Map();for(const f of line?.formats||[]){const k=f.length?num(f.length)+' mm':f.width?num(f.width)+' x '+num(f.height)+' mm':'Stück/Packung';ff.set(k,(ff.get(k)||0)+f.quantity);}return [m.label+'\n'+K.describeMaterial(m),mg.quantity+' / '+(mg.quantity-mg.resolved_quantity),m.kind==='linear'?num(mg.length_mm/1000,3)+' m':m.kind==='sheet'||m.kind==='glass'?num(mg.area_mm2/1e6,3)+' m2':'nicht als Länge/Fläche bewertet',line?[...ff].map(([k,n])=>n+' x '+k).join('; ')+'\n'+price(line.known_cash,line.currency,line.basis)+(line.unpriced_formats?' (Preis unvollständig)':''):'noch offen'];}),[76,25,54,118],'Materialbedarf');
 const good=d.groups.filter(g=>g.rows.every(r=>!r.issues.length)),bad=new Map();for(const g of d.groups.filter(g=>g.issues.length)){const key=K.stable([g.material_id,g.issues]);if(!bad.has(key))bad.set(key,{label:materials.get(g.material_id)?.label||'Material offen',issues:g.issues,qty:0});bad.get(key).qty+=g.quantity;}
 page('Bauteile - geometrisch nutzbarer Bedarf');table(['Positionen','Bauteil / Material','Geometrisch belegt (mm)','Menge'],good.map(g=>{const f=g.finish,rr=f?.length_mm!==undefined?'L '+num(f.length_mm,3):f?num(f.width_mm,3)+' x '+num(f.height_mm,3)+(f.thickness_mm?' / '+num(f.thickness_mm)+' stark':''):'offen';return [[...new Set(g.rows.flatMap(r=>r.occurrence_ids).map(position))].join(', '),g.label+'\n'+(materials.get(g.material_id)?.label||'offen'),rr,g.quantity];}),[59,94,96,24],'Bauteile');
 if(bad.size){if(y>145)page('Offene Grundlagen');else y+=7;table(['Material','Menge','Konkret zu klären'],[...bad.values()].map(b=>[b.label,b.qty,b.issues.join('; ')]),[80,22,171],'Offene Grundlagen');}
 if(y>145)page('Offene Punkte und Planungsgrenzen');else y+=8;
 const open=[...new Set(costs.open.map(o=>(materials.get(o.material_id)?.label||'Projekt')+': '+o.reason))];for(const t of open){if(y>183)page('Offene Punkte');y=text(t,12,y,8);y+=3;}
 if(y>161)page('Planungsgrenzen');y=text('Alle gelieferten Preise und Materialfestlegungen sind Testszenarien. CAD-Konturfehler und Werkzeugabstände bleiben berücksichtigt. Keine Fertigungstoleranz oder automatische Fertigungsfreigabe. Unbekannte Preise sind nicht null. Restfläche ist kein bestätigter Bestand.',12,y+3,8);text('Vollständige Herkunft, GUIDs, Instanzpfade, Hashes, Konturen und Schnittbäume in Projektdatei und technischem Export. Dieser Ausdruck enthält keine Verwaltungsformulare.',12,y+7,8);
 let linearPage=false;
 if(valid)for(const [id,sol]of Object.entries(r.solutions)){
  const pieces=K.expand(d,id),by=new Map(pieces.map(x=>[x.id,x])),m=materials.get(id);if(!pieces.length)continue;
  if(m.kind==='linear'){if(!linearPage||y>132)page('Ablängmuster - Stäbe und Latten');else y+=12;y=text(m.label,12,y,11);y+=3;linearPage=true;table(['Rohformat (mm)','Schnittfolge / Positionen / Länge (mm)','Anzahl Muster','Rest je Stange'],E.linearPatterns(sol,pieces,p).map(x=>[num(x.format.length),x.sequence,x.count,num(x.remainder,2)+' mm']),[30,186,25,32],'Ablängmuster');y+=3;if(y<180)text('Schnittfuge und Endbeschnitt sind enthalten. Wiederholte Muster einmal dargestellt. Konkrete Teil- und Stangenzuordnung vollständig im technischen Export.',12,y,8);continue;}
  linearPage=false;for(let start=0;start<sol.stocks.length;start+=2){page('Belegung - '+m.label);for(let j=0;j<2;j++){const b=sol.stocks[start+j];if(!b)break;const ox=12+j*139,oy=50,sc=Math.min(130/b.format.width,113/b.format.height);text('Platte '+(start+j+1)+' | '+num(b.format.width)+' x '+num(b.format.height)+' mm | '+b.placements.length+' Teile',ox,38,9,130);doc.setDrawColor(110,119,100);doc.setFillColor(249,247,235);doc.rect(ox,oy,b.format.width*sc,b.format.height*sc,'FD');doc.setDrawColor(45,104,86);doc.setLineWidth(.18);
    for(const q of b.placements){const piece=by.get(q.piece_id);for(const ring of G.transform(piece.raw.loops,q.x,q.y,q.angle))for(let k=0;k<ring.length;k++){const a=ring[k],z=ring[(k+1)%ring.length];doc.line(ox+a[0]*sc,oy+a[1]*sc,ox+z[0]*sc,oy+z[1]*sc);}const bb=G.bounds(G.transform(piece.raw.loops,q.x,q.y,q.angle)[0]);text(piece.source_ids.map(position).join('/'),ox+(bb.minX+bb.maxX)/2*sc,oy+(bb.minY+bb.maxY)/2*sc,7,27);}
    const area=b.format.width*b.format.height,rr=b.balance.clear_rectangle;let yy=oy+b.format.height*sc+7;yy=text('Teilefläche '+num(b.balance.parts_area_mm2/1e6,3)+' / Rohfläche '+num(area/1e6,3)+' m2 | '+num(100*b.balance.parts_area_mm2/area,1)+' %',ox,yy,8,130);
    if(rr){doc.setDrawColor(70,105,122);doc.setLineDashPattern([1.5,1],0);doc.rect(ox+rr.x*sc,oy+rr.y*sc,rr.width*sc,rr.height*sc);doc.setLineDashPattern([],0);yy=text('Freies Restrechteck: '+num(rr.width,1)+' x '+num(rr.height,1)+' mm (geometrisch geprüft, kein Bestand).',ox,yy+3,8,130);}
    text(b.process_mode==='saw'?'Sägeplan mit separat geprüftem Schnittbaum.':'Konturplan. Keine Teile in Löchern, keine gemeinsamen Schnittlinien.',ox,yy+4,8,130);
   }y=185;}
 }
 return doc;
};
root.CutplanExport=E;if(node)module.exports=E;
})(typeof globalThis!=='undefined'?globalThis:this);
