(function(root){'use strict';
const G=typeof module!=='undefined'&&module.exports?require('./geometry.js'):root.CutplanGeometry;
const K={VERSION:'2.1.0',ENGINE:'CUTPLAN-V2.1-2026-10-24'},clone=v=>JSON.parse(JSON.stringify(v));
K.clone=clone;
K.stable=v=>v===null?'null':typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(K.stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+K.stable(v[k])).join(',')+'}';
K.signature=p=>{const s=K.scenario(p);return K.stable({engine:K.ENGINE,sources:p.sources.map(s=>s.sha256),modules:p.modules.map(m=>[m.id,m.occurrence_ids]),library:p.library,processing:p.processing,
 scenario:{id:s.id,status:s.status,selection:s.selection,part_overrides:s.part_overrides,material_overrides:s.material_overrides,locked_placements:s.locked_placements,allow_multiple_variants:s.allow_multiple_variants},assignments:p.assignments});};
K.scenario=p=>p.scenarios.find(s=>s.id===p.active_scenario);
K.materials=p=>{const overrides=K.scenario(p).material_overrides||{};return [...p.library.materials.map(m=>overrides[m.id]||m),...Object.values(overrides).filter(m=>!p.library.materials.some(b=>b.id===m.id))];};
K.validateMaterial=m=>{
 if(!m||typeof m.id!=='string'||!m.id||!['linear','sheet','glass','textile','purchase'].includes(m.kind)||!m.price||!Array.isArray(m.formats)||!Array.isArray(m.allowed_rotations))throw Error('Unvollständiger Materialartikel');
 if(!['EUR/m','EUR/m2','EUR/bar','EUR/sheet','EUR/piece','EUR/pack'].includes(m.price.unit)||!['NET','GROSS'].includes(m.price.basis)||!m.price.currency)throw Error('Ungültige Preisbezugsgröße');
 if(m.price.value!==null&&(!Number.isFinite(Number(m.price.value))||Number(m.price.value)<0)||!Number.isInteger(m.pack_size)||m.pack_size<1)throw Error('Preis / Verpackung ungültig');
 const ids=new Set();for(const f of m.formats){if(!f.id||ids.has(f.id)||!Number.isInteger(f.availability)||f.availability<0||!['purchase','stock','simulation'].includes(f.origin)||f.on_demand&&f.origin!=='purchase')throw Error('Rohformat-ID / endlicher Bestand ungültig');ids.add(f.id);
  const ds=m.kind==='linear'?[f.length]:[f.width,f.height??f.length];if(ds.some(n=>!Number.isFinite(n)||n<=0))throw Error('Rohformatmaße ungültig');
  if(f.price_override&&(!['EUR/m','EUR/m2','EUR/bar','EUR/sheet','EUR/piece','EUR/pack'].includes(f.price_override.unit)||!f.price_override.currency||!['NET','GROSS'].includes(f.price_override.basis)||f.price_override.value!==null&&(!Number.isFinite(f.price_override.value)||f.price_override.value<0)))throw Error('Rohformatpreis ungültig');}
 if(m.section_mm&&(!Array.isArray(m.section_mm)||m.section_mm.length!==2||m.section_mm.some(n=>!Number.isFinite(n)||n<=0)))throw Error('Querschnitt ungültig');
 if(m.thickness_mm!==null&&m.thickness_mm!==undefined&&(!Number.isFinite(m.thickness_mm)||m.thickness_mm<=0))throw Error('Materialstärke ungültig');
 if(!m.allowed_rotations.length||m.allowed_rotations.some(n=>!Number.isFinite(n)))throw Error('Rotationen fehlen');return true;
};
K.validateProject=p=>{
 if(![1,2].includes(p.schema_version))throw Error('Unbekannte Projektversion; Datei nicht geladen.');
 const ids=new Set(p.occurrences.map(o=>o.id));if(ids.size!==p.occurrences.length)throw Error('Doppelte CAD-Identitäten.');
 const owners=new Map();for(const m of p.modules)for(const id of m.occurrence_ids){if(!ids.has(id)||owners.has(id))throw Error('Fehlender oder doppelter Mengeneigentümer.');owners.set(id,m.id);}
 if(owners.size!==ids.size)throw Error('CAD-Vorkommen ohne Eigentümer.');
 for(const s of p.sources)if(p.occurrences.filter(o=>o.source_id===s.id).length!==s.cad_occurrences)throw Error('Quellbilanz stimmt nicht.');
 if(!K.scenario(p))throw Error('Aktives Szenario fehlt.');
 const matIds=p.library.materials.map(m=>m.id);if(new Set(matIds).size!==matIds.length)throw Error('Doppelte Material-ID.');
 for(const m of K.materials(p))K.validateMaterial(m);
 const pr=p.processing;for(const key of ['kerf_mm','margin_mm','trim_start_mm','trim_end_mm','allowance_mm'])if(!Number.isFinite(pr[key])||pr[key]<0)throw Error('Ungültiger Bearbeitungsparameter: '+key);
 for(const profile of Object.values(pr.profiles||{}))for(const value of Object.values(profile))if(!Number.isFinite(value)||value<0)throw Error('Ungültiges Bearbeitungsprofil');
 for(const s of p.scenarios)for(const a of Object.values(s.part_overrides||{})){
  if(a.allowance_mm!==null&&a.allowance_mm!==undefined&&(!Number.isFinite(a.allowance_mm)||a.allowance_mm<0))throw Error('Ungültige Bauteilzugabe');
  if(a.finish_override&&Object.values(a.finish_override).some(v=>v!==null&&v!==''&&(!Number.isFinite(Number(v))||Number(v)<=0)))throw Error('Ungültige Fertigmaßüberschreibung');
 }
 return {occurrences:ids.size,owners:owners.size};
};
K.demand=p=>{
 K.validateProject(p);const s=K.scenario(p),materials=new Map(K.materials(p).map(m=>[m.id,m])),occ=new Map(p.occurrences.map(o=>[o.id,o]));
 const rows=[],excluded=[],issues=[],variantFamilies=new Map(),selection=s.selection;
 for(const m of p.modules){const sel=selection[m.id];if(!sel?.selected){excluded.push(...m.occurrence_ids.map(id=>({id,module_id:m.id,reason:'MODUL_NICHT_GEWAEHLT'})));continue;}
  if(m.variant_family&&!s.allow_multiple_variants){if(variantFamilies.has(m.variant_family)){issues.push('Mehrere Alternativen gewählt: '+m.variant_family);continue;}variantFamilies.set(m.variant_family,m.id);}
  const qty=Number(sel.quantity);if(!Number.isInteger(qty)||qty<1){issues.push('Ungültige Modulanzahl: '+m.label);continue;}
  const mode=sel.count_mode||m.count_mode;if(mode==='scene'&&qty!==1){issues.push('Platzierter Gesamtbestand darf keinen Multiplikator erhalten: '+m.label);continue;}
  const multiplier=mode==='template'?qty:1;
  if(sel.purchase_assembly_material_id){
   const mat=materials.get(sel.purchase_assembly_material_id),problems=mat?.kind==='purchase'&&mat.article_number?[]:['Kaufbaugruppen-Artikelidentität offen'];rows.push({id:'assembly:'+m.id,occurrence_ids:m.occurrence_ids.slice(),module_id:m.id,module_label:m.label,quantity:multiplier,label:m.label+' (Kaufbaugruppe)',
    material_id:mat?.id||null,kind:'purchase',raw:null,net_area_mm2:null,net_length_mm:null,status:problems.length?'UNRESOLVED':'SCENARIO',issues:problems,shape_key:'ASSEMBLY:'+m.id,origins:m.occurrence_ids.map(id=>{const o=occ.get(id);return {id:o.id,source_id:o.source_id,source_hash:o.source_hash,guid:o.guid,instance_path:o.instance_path};})});continue;
  }
  for(const id of m.occurrence_ids){const o=occ.get(id),a={...p.assignments[id],...(s.part_overrides[id]||{})};const mat=materials.get(a.material_id),role=a.role&&a.role!=='unresolved'?a.role:sel.role;
   if(role!=='production'){excluded.push({id,module_id:m.id,reason:role==='context'?'KONTEXT':role==='reference'?'REFERENZDARSTELLUNG':role==='alternative'?'ALTERNATIVE':'ROLLE_OFFEN'});continue;}
   const problems=[];let kind=o.kind,raw=null,netArea=null,netLength=null,finish=null;
   const allowance=Number(a.allowance_mm??p.processing.allowance_mm);if(!Number.isFinite(allowance)||allowance<0)problems.push('Ungültige Zugabe');
   if(!mat)problems.push('Material-ID offen');
   const override=a.finish_override;const contourStale=override&&Object.values(override).some(v=>v!==null&&v!=='');
   if(kind==='linear'&&o.linear){const length=Number(override?.length_mm??o.linear.length_mm);finish={length_mm:length,section_mm:o.linear.section_mm};netLength=length;raw={length:length+2*allowance,allowance_mm:allowance};
    if(mat&&(!mat.section_mm||!['round','rectangular'].includes(mat.section_type)))problems.push('Querschnitt / Profilform des Rohartikels noch offen');
    if(!o.profile){raw=null;problems.push('Gerader konstanter Rohstab nicht durch natives Profil belegt; Maße allein bestätigen keine Ablängbarkeit');}
    if(mat?.section_mm&&Math.max(...mat.section_mm.map((v,j)=>Math.abs(v-o.linear.section_mm[j])))>.11)problems.push('Geometrischer Querschnitt widerspricht Materialartikel');
    if(o.profile?.profile_kind==='CIRCLE'&&mat?.section_type==='rectangular'||o.profile?.profile_kind==='RECTANGLE'&&mat?.section_type==='round')problems.push('Rund-/Rechteckquerschnitt widerspricht Rohartikel; Herstellwechsel nicht festgelegt');
   }else if(['sheet','glass','textile'].includes(kind)){
    const prof=o.profile||o.surface_profile;const dims=o.baseline_dimension.values_mm;
    if(prof){const b=G.bounds(prof.loops[0]);let w=Number(override?.width_mm??(b.maxX-b.minX)),h=Number(override?.height_mm??(b.maxY-b.minY));
     finish={width_mm:w,height_mm:h,thickness_mm:prof.depth_mm??null};netArea=G.netArea(prof.loops);
     const automaticRectangle=p.schema_version===2&&prof.profile_kind==='RECTANGLE'&&prof.loops.length===1&&!contourStale;
     const rectangle=automaticRectangle||(a.raw_strategy||p.processing.raw_strategy)==='rectangle';
     if(contourStale&&!rectangle)problems.push('Maßüberschreibung: CAD-Kontur veraltet; neuen Nachweis oder Rechteck-Rohling als Szenario wählen');
     else {const e=rectangle&&!contourStale?prof.error_mm:0;if(contourStale&&rectangle)netArea=w*h;const loops=rectangle?[G.rect(w+2*e,h+2*e).map(v=>[v[0]-e,v[1]-e])]:prof.loops;const rawLoops=rectangle?[G.rect(w+2*(e+allowance),h+2*(e+allowance)).map(v=>[v[0]-e-allowance,v[1]-e-allowance])]:G.offset(loops,allowance);const rb=G.bounds(rawLoops[0]);raw={loops:rawLoops,width:rb.maxX-rb.minX,height:rb.maxY-rb.minY,
       thickness_mm:finish.thickness_mm,allowance_mm:allowance,measurement_guard_mm:e,error_mm:rectangle?0:prof.error_mm,strategy:automaticRectangle?'saw_envelope':rectangle?'rectangle':'native_contour',net_area_mm2:netArea,area_mm2:G.netArea(rawLoops)};}
     if(mat?.thickness_mm&&finish.thickness_mm&&Math.abs(mat.thickness_mm-finish.thickness_mm)>.1)problems.push('Geometrische Stärke widerspricht Materialartikel');
    }else if(dims&&dims.length===3){const ds=dims.slice().sort((a,b)=>a-b);finish={width_mm:ds[2],height_mm:ds[1],thickness_mm:ds[0]};netArea=ds[2]*ds[1];
     if((a.raw_strategy||p.processing.raw_strategy)==='rectangle')raw={loops:[G.rect(ds[2]+2*allowance,ds[1]+2*allowance)],width:ds[2]+2*allowance,height:ds[1]+2*allowance,area_mm2:(ds[2]+2*allowance)*(ds[1]+2*allowance),error_mm:0,strategy:'rectangle',allowance_mm:allowance};
     else problems.push('Keine bestätigte Fertigungskontur; Rechteck-Rohling nur als ausdrückliches Szenario');
    }else problems.push(kind==='textile'?'Textil-/Konfektionsformat offen; keine künstliche Materialstärke erforderlich':'Vollständige Maße/Kontur nicht belegt');
   }else if(kind==='purchase'){if(!mat?.article_number)problems.push('Kaufartikelidentität offen');}
   else problems.push('Herstellweise / nutzbare Geometrie offen');
   if(mat&&mat.kind!==kind&&!(kind==='glass'&&mat.kind==='sheet'))problems.push('Materialart passt nicht zur Bauteil-Geometrie');
   if(kind==='textile'&&mat?.textile_procurement_mode!=='ROLL_SCENARIO')problems.push('Konfektionsverfahren / Fertigformat und Zugaben offen');
   if(raw?.length<=0||raw?.width<=0||raw?.height<=0)problems.push('Nichtpositive Rohabmessung');
   rows.push({id,occurrence_ids:[id],module_id:m.id,module_label:m.label,label:o.label,quantity:multiplier,kind,material_id:mat?.id||null,
    finish,finish_origin:contourStale?'USER_OVERRIDE':'CAD_GEOMETRY',raw,net_area_mm2:netArea,net_length_mm:netLength,status:problems.length?'UNRESOLVED':a.status==='CONFIRMED'&&mat?.status==='CONFIRMED'?'CONFIRMED':'SCENARIO',
    issues:problems,shape_key:o.shape_key,origins:[{id:o.id,source_id:o.source_id,source_hash:o.source_hash,guid:o.guid,instance_path:o.instance_path,visible:o.visible}],
    manufacturing_release:false,processing_id:p.processing.id,process_hint:kind==='linear'&&o.profile?'linear':raw&&o.profile?.profile_kind==='RECTANGLE'&&raw.loops?.length===1&&!contourStale?'saw':raw?.loops&&o.profile?'cnc':null});
  }
 }
 const quantize=v=>typeof v==='number'?Math.round(v*1000)/1000:v&&typeof v==='object'?Array.isArray(v)?v.map(quantize):Object.fromEntries(Object.entries(v).map(([k,v])=>[k,quantize(v)])):v;
 const groups=new Map();for(const row of rows){const mat=materials.get(row.material_id);const rawKey=row.raw?{...row.raw,loops:undefined}:null;const key=K.stable(quantize([row.material_id,row.kind,row.shape_key,rawKey,row.finish,mat?.finish,mat?.quality,mat?.grain,mat?.article_number,row.processing_id,row.status]));
  if(!groups.has(key))groups.set(key,{id:'G'+String(groups.size+1).padStart(4,'0'),key,material_id:row.material_id,kind:row.kind,label:row.label,quantity:0,rows:[],raw:row.raw,finish:row.finish,status:row.status,issues:row.issues});const g=groups.get(key);g.quantity+=row.quantity;g.rows.push(row);
 }
 const materialGroups=[];for(const [id,mat]of materials){const rr=rows.filter(r=>r.material_id===id);if(!rr.length)continue;materialGroups.push({material:mat,rows:rr,groups:[...groups.values()].filter(g=>g.material_id===id),
  quantity:rr.reduce((n,r)=>n+r.quantity,0),resolved_quantity:rr.filter(r=>!r.issues.length).reduce((n,r)=>n+r.quantity,0),
  length_mm:rr.reduce((n,r)=>n+(r.net_length_mm??0)*r.quantity,0),area_mm2:rr.reduce((n,r)=>n+(r.net_area_mm2??0)*r.quantity,0),
  raw_length_mm:rr.reduce((n,r)=>n+(r.raw?.length??0)*r.quantity,0),raw_area_mm2:rr.reduce((n,r)=>n+(r.raw?.area_mm2??0)*r.quantity,0),
  usable_raw_length_mm:rr.filter(r=>!r.issues.length).reduce((n,r)=>n+(r.raw?.length??0)*r.quantity,0),usable_raw_area_mm2:rr.filter(r=>!r.issues.length).reduce((n,r)=>n+(r.raw?.area_mm2??0)*r.quantity,0),
  contributors:[...new Set(rr.map(r=>r.module_id))]});}
 return {revision:p.revision,signature:K.signature(p),scenario_id:s.id,status:s.status,rows,groups:[...groups.values()],materials:materialGroups,
  excluded,issues,unresolved:rows.filter(r=>r.issues.length),technical_occurrences:p.occurrences.length,
  selected_occurrences:new Set(rows.flatMap(r=>r.occurrence_ids)).size,planned_quantity:rows.reduce((n,r)=>n+r.quantity,0),
  missing_material:rows.filter(r=>!r.material_id),all_cad_accounted_once:new Set([...rows.flatMap(r=>r.occurrence_ids),...excluded.map(r=>r.id)]).size===p.occurrences.length};
};
K.expand=(demand,materialId)=>demand.rows.filter(r=>r.material_id===materialId&&!r.issues.length&&r.raw).flatMap(r=>Array.from({length:r.quantity},(_,i)=>({id:r.id+'#'+i,row_id:r.id,module_id:r.module_id,source_ids:r.occurrence_ids,
 kind:r.kind,raw:clone(r.raw),finish:clone(r.finish),shape_key:r.shape_key,material_id:materialId,label:r.label,status:r.status,process_hint:r.process_hint})));
K.formatPrice=(mat,f)=>{
 const p=f.price_override||mat.price;if(p.currency!==mat.price.currency||p.basis!==mat.price.basis||p.value===null||p.value===undefined||p.value===''||!Number.isFinite(Number(p.value))||Number(p.value)<0)return null;
 if(p.unit==='EUR/pack'&&mat.kind!=='purchase'&&mat.pack_size>1)return null;
 const price=Number(p.value);let result;switch(p.unit){case'EUR/m':result=price*(mat.kind==='textile'?(f.height??f.length):f.length)/1000;break;case'EUR/m2':result=price*f.width*f.height/1e6;break;case'EUR/bar':case'EUR/sheet':case'EUR/piece':case'EUR/pack':result=price;break;default:return null;}return Number.isFinite(result)?result:null;
};
K.costs=(p,demand,solutions)=>{
 const lines=[],moduleShares=new Map(),open=[];let known=0,replacement=0;const currencies=new Set(),bases=new Set(),totals=new Map();
 if(demand.unresolved.length)open.push({reason:'Gewählte Bauteile mit offenen Grundlagen',quantity:demand.unresolved.length});
 if(demand.issues.length)open.push({reason:demand.issues.join('; ')});
 for(const mg of demand.materials){const mat=mg.material;currencies.add(mat.price.currency);bases.add(mat.price.basis);const sol=solutions?.[mat.id];let formats=[];
  if(['linear','sheet','textile'].includes(mat.kind)&&sol?.validated){formats=sol.stocks.map(b=>({...b.format,origin:b.format.origin||'purchase',quantity:1}));if(sol.unplaced?.length)open.push({material_id:mat.id,quantity:sol.unplaced.length,reason:'Noch nicht platzierte Rohzuschnitte'});}
  else if(mat.kind==='purchase'){
   const rr=mg.rows.filter(r=>!r.issues.length);if(rr.length){const q=rr.reduce((n,r)=>n+r.quantity,0),pack=Math.max(1,Number(mat.pack_size)||1);formats=[{id:'ARTICLE',quantity:Math.max(Number(mat.minimum_order_units)||0,mat.price.unit==='EUR/pack'?Math.ceil(q/pack):q),origin:'purchase',pieces:q,pack_size:pack}];}
  }else if(mat.kind==='glass'){
   for(const r of mg.rows.filter(r=>r.finish&&!r.issues.length))formats.push({id:r.id,width:r.finish.width_mm,height:r.finish.height_mm,quantity:r.quantity,origin:'purchase'});
  }
  if(!formats.length){open.push({material_id:mat.id,quantity:mg.quantity,reason:mg.rows.some(r=>r.issues.length)?'Offene Teile / Materialzuordnung':'Kein aktueller validierter Zuschnittplan'});continue;}
  let cash=0,value=0,unknown=0;for(const f of formats){const c=K.formatPrice(mat,f);if(c===null){unknown++;continue;}value+=c*f.quantity;if(f.origin!=='stock')cash+=c*f.quantity;}
  cash=Math.round(cash*100)/100;value=Math.round(value*100)/100;known+=cash;replacement+=value;
  const tkey=mat.price.currency+' '+mat.price.basis;if(!totals.has(tkey))totals.set(tkey,{currency:mat.price.currency,basis:mat.price.basis,known_subtotal:0,replacement_value:0});totals.get(tkey).known_subtotal+=cash;totals.get(tkey).replacement_value+=value;
  const line={material_id:mat.id,label:mat.label,formats,known_cash:cash,replacement_value:value,unpriced_formats:unknown,status:unknown?'PRICE_UNKNOWN':mat.price.status==='CONFIRMED'?'CONFIRMED':'SCENARIO',currency:mat.price.currency,basis:mat.price.basis};lines.push(line);
  if(unknown)open.push({material_id:mat.id,quantity:unknown,reason:'Preis / Bezugsgröße offen'});
  if(mat.kind!=='purchase'&&mat.minimum_order_units>0)open.push({material_id:mat.id,reason:'Übernommene Mindestbestellung noch nicht eindeutig auf Rohformate verteilt; bekannter Einkauf ohne Ergänzungsbestellung'});
  // Allocation is not an independent purchasing cost per module.
  const weights=new Map();for(const r of mg.rows.filter(r=>!r.issues.length)){const w=(r.raw?.length??r.raw?.area_mm2??1)*r.quantity;weights.set(r.module_id,(weights.get(r.module_id)||0)+w);}
  const total=[...weights.values()].reduce((a,b)=>a+b,0);let assigned=0;const list=[...weights];list.forEach(([mid,w],i)=>{const share=i===list.length-1?cash-assigned:Math.round(cash*w/total*100)/100;assigned+=share;moduleShares.set(mid,(moduleShares.get(mid)||0)+share);});
 }
 if(currencies.size>1||bases.size>1)open.push({reason:'Unterschiedliche Währungen / Netto-Bruttobasen: keine gemeinsame Summe zulässig'});
 const mixed=currencies.size>1||bases.size>1;
 return {lines,known_subtotal:mixed?null:Math.round(known*100)/100,replacement_value:mixed?null:Math.round(replacement*100)/100,separate_totals:[...totals.values()].map(t=>({...t,known_subtotal:Math.round(t.known_subtotal*100)/100,replacement_value:Math.round(t.replacement_value*100)/100})),open,
  grand_total:open.length||currencies.size>1||bases.size>1?null:Math.round(known*100)/100,currency:[...currencies][0]||'EUR',basis:[...bases][0]||'NET',
  module_shares:mixed?[]:[...moduleShares].map(([module_id,cost])=>({module_id,cost:Math.round(cost*100)/100})),scope:'Nur Materialbeschaffung; keine Gestaltung, Montage, Transport oder Fertigungsfreigabe.'};
};
// Small application policy layer; the CAD records and their identities are never edited.
K.legacyIssues=p=>{
 const s=K.scenario(p),out=[];
 for(const id of new Set([...Object.keys(p.assignments),...Object.keys(s.part_overrides)])){const a={...p.assignments[id],...s.part_overrides[id]};
  if(a.finish_override&&Object.values(a.finish_override).some(v=>v!==null&&v!==''))out.push({kind:'measure',id});
  if(a.raw_strategy==='rectangle')out.push({kind:'blank',id});
 }
 if(p.processing.raw_strategy==='rectangle')out.push({kind:'global_blank'});
 const locks=Object.values(s.locked_placements||{}).flat(),embedded=Object.values(s.result?.solutions||{}).flatMap(sol=>(sol.stocks||[]).flatMap(b=>b.placements.filter(q=>q.locked))).map(q=>q.piece_id),lockIds=new Set([...locks.map(q=>q.piece_id),...embedded]);if(lockIds.size)out.push({kind:'locks',count:lockIds.size});
 if(p.processing.part_in_part||p.processing.common_line||s.legacy_processing_pending)out.push({kind:'special_cut'});
 const families=new Map();for(const m of p.modules)if(m.variant_family&&s.selection[m.id]?.selected)families.set(m.variant_family,(families.get(m.variant_family)||0)+1);
 if([...families.values()].some(n=>n>1)&&!s.v2_variants_reviewed)out.push({kind:'variants'});
 return out;
};
K.prepare=p=>{const q=clone(p);K.validateProject(q);q.schema_version=2;q.application_version='CUTPLAN V2.1';q.price_defaults=q.price_defaults||{currency:'EUR',basis:'NET'};q.processing.profiles=q.processing.profiles||Object.fromEntries(['linear','saw','cnc'].map(mode=>[mode,{kerf_mm:q.processing.kerf_mm,margin_mm:q.processing.margin_mm,trim_start_mm:q.processing.trim_start_mm,trim_end_mm:q.processing.trim_end_mm}]));return q;};
K.adoptLegacy=p=>{
 const s=K.scenario(p);s.legacy_archive=s.legacy_archive||[];
 s.legacy_archive.push({created_utc:new Date().toISOString(),part_overrides:clone(s.part_overrides),assignments:clone(p.assignments),locked_placements:clone(s.locked_placements),processing:clone(p.processing),result:s.result?clone(s.result):null,decision:'Explicit adoption: CAD dimensions, automatic procedure, no manual placement. Original file unchanged.'});
 if(p.processing.raw_strategy==='rectangle')for(const other of p.scenarios.filter(o=>o!==s))for(const id of Object.keys(p.assignments))other.part_overrides[id]={raw_strategy:'rectangle',...other.part_overrides[id]};
 if(p.processing.part_in_part||p.processing.common_line)for(const other of p.scenarios.filter(o=>o!==s))other.legacy_processing_pending=clone(p.processing);
 // Global geometry adjustments must be kept for other scenarios, not silently removed.
 for(const [id,a]of Object.entries(p.assignments))if(a.finish_override||a.raw_strategy==='rectangle'){
  for(const other of p.scenarios)if(other!==s)other.part_overrides[id]={...a,...other.part_overrides[id]};
  delete a.finish_override;if(a.raw_strategy==='rectangle')delete a.raw_strategy;
 }
 for(const a of Object.values(s.part_overrides)){delete a.finish_override;if(a.raw_strategy==='rectangle')delete a.raw_strategy;}
 s.locked_placements={};s.v2_variants_reviewed=true;s.result=null;delete s.legacy_processing_pending;
 p.processing.raw_strategy='contour';p.processing.part_in_part=false;p.processing.common_line=false;p.processing.hold_verified=false;
};
K.process=(p,mode)=>({...p.processing,...p.processing.profiles?.[mode],mode:mode==='linear'?'cnc':mode,part_in_part:false,common_line:false,hold_verified:false});
K.procurementMaterial=(mat,n)=>({...clone(mat),formats:mat.formats.map(f=>({...clone(f),availability:f.on_demand&&f.origin==='purchase'?Math.max(1,n):f.availability}))});
K.priceObjective=mat=>{
 if(mat.kind!=='purchase'&&mat.minimum_order_units>0)return 'waste';
 const ff=mat.formats.filter(f=>f.origin!=='simulation'&&(f.on_demand||f.availability>0));
 return ff.length&&ff.every(f=>f.origin==='stock'||K.formatPrice(mat,f)!==null)?'cost':'waste';
};
K.procedure=piece=>piece.kind==='linear'?'linear':piece.process_hint==='saw'&&piece.raw.loops?.length===1?'saw':piece.raw.loops&&piece.process_hint==='cnc'?'cnc':null;
K.describeMaterial=m=>m.kind==='linear'?(m.section_type==='round'?'Ø '+m.section_mm?.[0]+' mm':m.section_mm?.join(' × ')+' mm'):m.thickness_mm?m.thickness_mm+' mm stark':'';
root.CutplanCore=K;if(typeof module!=='undefined'&&module.exports)module.exports=K;
})(typeof globalThis!=='undefined'?globalThis:this);
