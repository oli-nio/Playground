"""Bounded V0.2 comparison: exactly the 60 previously assigned objects, no rescan."""
from pathlib import Path
import sys,json,hashlib,shutil,math,collections,base64
import rhino3dm as rh
ROOT=Path(__file__).resolve().parents[1]
V01=ROOT.parent/'FORMIKAT_SENCKENBERG_MODULPILOT_V0_1_2026-10-21'
V0=ROOT.parent/'FORMIKAT_SENCKENBERG_MODUL_ZUSCHNITT_PILOT_V0_2026-10-21'
sys.path.insert(0,str(ROOT.parent/'FORMIKAT_CAD_NATIVE_V4_1_2026-10-21/tools'))
import native_lib as nl
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def dump(p,x):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,indent=2,ensure_ascii=False,allow_nan=False),encoding='utf-8')
for sub in ['data','evidence','images/views','exports','runtime','tools']:(ROOT/sub).mkdir(parents=True,exist_ok=True)
if not (ROOT/'evidence/FROZEN_BEFORE.json').exists():
 frozen=[]
 for root in [V0,V01]:
  files=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(root.rglob('*')) if p.is_file() and 'temporary_browser' not in p.parts]
  frozen.append({'root':str(root),'files':files})
 dump(ROOT/'evidence/FROZEN_BEFORE.json',{'roots':frozen,'excluded':'Pre-existing temporary_browser caches only'})
copies=[]
def copy(p,rel):
 out=ROOT/rel;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,out)
 assert sha(p)==sha(out);copies.append({'source':str(p),'file':str(rel).replace('\\','/'),'sha256':sha(out)})
for p in (V01/'data').glob('*.json'):copy(p,Path('data')/p.name)
for p in (V01/'exports').glob('*.csv'):copy(p,Path('exports')/p.name)
parts=read(ROOT/'data/PARTS.json')['parts'];cards=read(ROOT/'data/MODULE_CARDS.json')['cards']
for q in parts:copy(V01/q['image_file'],q['image_file'])
for rel in ['evidence/IMAGE_CANDIDATES.json','evidence/VIEW_SELECTION.json','evidence/IMAGE_ANNOTATIONS.json']:
 copy(V01/rel,rel.replace('evidence/','evidence/V01_'))
shutil.copy2(V01/'runtime/v3_view.js',ROOT/'runtime/v3_view.js')
inv=read(V0/'evidence/NATIVE_INVENTORY.json');native={x['guid']:x for x in inv['objects']}
model=V0/'models/MODULTEST_OR-MZ.3dm';assert sha(model)==inv['source_sha256']
focus=[c for c in cards if c['study'] in ['S02','S03','S04']];by={q['original_guid']:q for q in parts}
datums={};post_anchors={}
for c in focus:
 posts=[q for q in parts if q['study']==c['study'] and q['kind']=='STRAIGHT_ROUND_STOCK' and abs(q['diameter_mm']-40)<.001 and abs(q['length_mm']-2000)<.001]
 assert len(posts)==3
 anchors=[{'guid':q['original_guid'],'base':native[q['original_guid']]['primitive']['cylinder']['base_mm'],'end':native[q['original_guid']]['primitive']['cylinder']['end_mm']} for q in posts]
 datums[c['study']]=[min(a['end'][k] for a in anchors) for k in range(3)];post_anchors[c['study']]=anchors
def centered(guid,study):
 b=native[guid]['bbox'];return [(b['min'][k]+b['max'][k])/2-datums[study][k] for k in range(3)]
def sizes(guid):
 b=native[guid]['bbox'];return [b['max'][k]-b['min'][k] for k in range(3)]
doc=rh.File3dm.Read(str(model));assert doc
wanted={g for c in focus for g in c['guids']};objs={str(o.Attributes.Id):o.Geometry for o in doc.Objects if str(o.Attributes.Id) in wanted};assert len(objs)==60
cache={}
def norm(guid,study):
 if guid in cache:return cache[guid]
 g=objs[guid].Duplicate();g.Transform(rh.Transform.Translation(*[-x for x in datums[study]]))
 rawsha=hashlib.sha256(nl.raw(g)).hexdigest()
 b=g.ToBrep(True) if isinstance(g,rh.Extrusion) else g
 snap=nl.snapshot(b);sample=nl.samples(b)
 cache[guid]=(rawsha,snap,sample);return cache[guid]
def compare_values(a,b):
 # Compare ordered native representations, never align/reparameterize or infer missing fields.
 worst=0.;mismatches=[]
 def walk(x,y,path):
  nonlocal worst
  if isinstance(x,bool) or isinstance(y,bool):
   if x!=y:mismatches.append(path)
  elif isinstance(x,(int,float)) and isinstance(y,(int,float)):worst=max(worst,abs(x-y))
  elif isinstance(x,dict) and isinstance(y,dict):
   if x.keys()!=y.keys():mismatches.append(path+'.keys')
   else:
    for k in x:walk(x[k],y[k],path+'.'+k)
  elif isinstance(x,list) and isinstance(y,list):
   if len(x)!=len(y):mismatches.append(path+'.length')
   else:
    for k,(v,w) in enumerate(zip(x,y)):walk(v,w,path+f'[{k}]')
  elif x!=y:mismatches.append(path)
 walk(a,b,'root');return {'max_numeric_residual':worst,'structural_mismatches':mismatches[:30]}
results=[]
for target in ['S03','S04']:
 source=next(c for c in focus if c['study']=='S02');dest=next(c for c in focus if c['study']==target)
 unused=set(dest['guids']);matches=[];missing=[]
 for guid in source['guids']:
  candidates=[]
  for other in unused:
   if by[guid]['kind']!=by[other]['kind'] or type(objs[guid])!=type(objs[other]):continue
   pos=max(abs(a-b) for a,b in zip(centered(guid,'S02'),centered(other,target)))
   size=max(abs(a-b) for a,b in zip(sizes(guid),sizes(other)))
   if max(pos,size)<.001:candidates.append((max(pos,size),other))
  if len(candidates)!=1:
   missing.append({'guid':guid,'part':by[guid]['part_label'],'status':'NO_CORRESPONDENCE' if not candidates else 'AMBIGUOUS','candidate_guids':[x[1] for x in candidates]});continue
  residual,other=candidates[0];unused.remove(other)
  ah,asnap,ap=norm(guid,'S02');bh,bsnap,bp=norm(other,target)
  cats={k:compare_values(asnap[k],bsnap[k]) for k in ['vertices','surfaces','edges','topology','bbox']}
  topo=asnap['topology']==bsnap['topology'];maxres=max(x['max_numeric_residual'] for k,x in cats.items() if k!='topology')
  sc=compare_values(ap,bp);passcheck=topo and maxres<.001 and sc['max_numeric_residual']<.001 and not any(x['structural_mismatches'] for x in cats.values()) and not sc['structural_mismatches']
  matches.append({'source_guid':guid,'source_part':by[guid]['part_label'],'target_guid':other,'target_part':by[other]['part_label'],
   'kind':by[guid]['kind'],'placement_and_box_residual_mm':residual,'normalized_serialization_sha256':[ah,bh],'normalized_serialization_exact':ah==bh,
   'native_checks':cats,'topology_exact':topo,'edge_and_untrimmed_surface_samples':{'source_count':len(ap),'target_count':len(bp),**sc},
   'status':'NO_DIFFERENCE_IN_CHECKED_REPRESENTATION' if passcheck else 'UNKNOWN_DIFFERENCE','max_native_numeric_residual':maxres,
   'trim_limit':'Loop types, trim-edge/vertex indices and reversal flags checked; exact 2D trim curves not exposed by installed rhino3dm. Full trimmed-face equivalence not claimed unless serialization exact.'})
 results.append({'pair':['S02',target],'translation_of_study_datum_mm':[datums[target][k]-datums['S02'][k] for k in range(3)],'matches':matches,'source_only':missing,'target_only':sorted(unused)})
 extras={c['study']:[q['original_guid'] for q in parts if q['study']==c['study'] and q['kind']=='HARDWARE_BY_LAYER'] for c in focus}
dump(ROOT/'evidence/MATCH_DIAGNOSTIC.json',{'datums':datums,'pairs':results})
print(json.dumps([{'pair':r['pair'],'matches':len(r['matches']),'source_only':r['source_only'],'target_only':r['target_only'],'check_statuses':dict(collections.Counter(x['status'] for x in r['matches']))} for r in results],indent=2))
assert len(results[0]['matches'])==16 and len(results[1]['matches'])==21
assert not results[1]['source_only'] and not results[1]['target_only']
checks=[m for r in results for m in r['matches']];assert all(x['status']=='NO_DIFFERENCE_IN_CHECKED_REPRESENTATION' for x in checks)
different=[]
for row in results[0]['source_only']:
 guid=row['guid']
 if guid in extras['S02']:continue
 axis=max(range(3),key=lambda k:sizes(guid)[k])
 candidates=[g for g in results[0]['target_only'] if max(range(3),key=lambda k:sizes(g)[k])==axis and abs(centered(guid,'S02')[2]-centered(g,'S03')[2])<10]
 assert len(candidates)==1
 other=candidates[0];_,aa,_=norm(guid,'S02');_,bb,_=norm(other,'S03')
 vertices=aa['vertices'];target_box=bb['bbox'];witness=[]
 for i,v in enumerate(vertices):
  for k in range(3):
   gap=max(target_box['min'][k]-v[k],v[k]-target_box['max'][k],0)
   if gap>.001:witness.append({'source_vertex_index':i,'source_vertex_module_mm':v,'axis':k,'outside_target_native_bounding_box_mm':gap,'target_bbox_module_mm':target_box})
 assert witness,'Do not infer form change only from face count or loose bounding-box size'
 different.append({'source_guid':guid,'source_part':by[guid]['part_label'],'target_guid':other,'target_part':by[other]['part_label'],
  'pairing_basis':'Unique remaining upper elongated UNKNOWN object of same dominant world axis; comparison correspondence, not historical part identity.',
  'dominant_axis':'XYZ'[axis],'status':'FORM_DIFFERENCE_PROVEN_AT_COMMON_MODULE_DATUM','pure_module_translation_excluded':True,
  'source_native_vertex_extents':{'min':[min(v[k] for v in aa['vertices']) for k in range(3)],'max':[max(v[k] for v in aa['vertices']) for k in range(3)]},
  'target_native_vertex_extents':{'min':[min(v[k] for v in bb['vertices']) for k in range(3)],'max':[max(v[k] for v in bb['vertices']) for k in range(3)]},
  'source_counts':native[guid]['topology'],'target_counts':native[other]['topology'],
  'strongest_witness':max(witness,key=lambda x:x['outside_target_native_bounding_box_mm']),
  'proof':'An actual source Brep vertex lies outside the complete conservative native target bounding box after alignment using unchanged posts. Thus this is not just a different loose box or display mesh.',
  'measurement_status_unchanged':'UNKNOWN_UNSUPPORTED_BREP; no stock/part function or manufacturing length promoted.'})
assert len(different)==2
dump(ROOT/'evidence/GEOMETRY_COMPARISON.json',{'status':'PASS_WITH_EXPLICIT_TRIM_LIMIT','source_model':str(model),'source_sha256':sha(model),'scope':'Only the existing 60 S02/S03/S04 assignments. Model opened once; no analysis of other objects. Existing parts and dimensions unchanged.',
 'units':'mm','matching_tolerance_mm':.001,'geometry_tolerance_mm':.001,'datums':datums,'datum_anchors':post_anchors,'pairs':results,'extra_by_layer_guids':extras,
 'changed_upper_parts':different,'comparison_count':len(checks),'max_native_numeric_residual':max(m['max_native_numeric_residual'] for m in checks),
 'exact_serialization_pair_count':sum(m['normalized_serialization_exact'] for m in checks),
 'confirmed_difference':'Two upper elongated parts have proven form differences between S02/S04 and S03. Additionally three extra CAD geometries on layer KORPUS-VERBINDER occur in selected S02/S04 cores, none in selected S03 core.',
 'not_proven':['Three installed connectors or three purchasable items','Functional interchangeability or assembly/contact correctness','Full trimmed-face equivalence where exact serialization differs','Historical/production intention of alternatives','Absence of this hardware throughout the whole project outside the selected S03 core']})
dump(ROOT/'evidence/REUSED_INPUTS.json',{'files':copies,'source_model_copied':False,'source_sha256':sha(model),'read_only_model':str(model),'renderer_reused_from':str(V01/'runtime/v3_view.js'),'renderer_sha256':sha(ROOT/'runtime/v3_view.js'),'parts_measures_unchanged':True,'no_nas_access':True})
print(json.dumps({'matched_pairs':len(checks),'pair_counts':[len(r['matches']) for r in results],'exact_serialization_pairs':sum(x['normalized_serialization_exact'] for x in checks),'max_native_residual':max(m['max_native_numeric_residual'] for m in checks),'extras':extras,'datums':datums},indent=2))
