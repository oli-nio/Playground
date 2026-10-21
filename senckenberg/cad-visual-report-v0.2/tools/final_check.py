from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
import json,hashlib,zipfile,collections,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def dump(p,x):Path(p).write_text(json.dumps(x,indent=2,ensure_ascii=False,allow_nan=False),encoding='utf-8')
parts=read(ROOT/'data/PARTS.json')['parts'];by={p['original_guid']:p for p in parts};cards=read(ROOT/'data/MODULE_CARDS.json')['cards']
frozen=read(ROOT/'evidence/FROZEN_BEFORE.json');baseline=[]
for r in frozen['roots']:
 root=Path(r['root']);changed=[]
 for f in r['files']:
  p=root/f['path']
  if not p.is_file() or p.stat().st_size!=f['bytes'] or sha(p)!=f['sha256']:changed.append(f['path'])
 now={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and 'temporary_browser' not in p.parts}
 added=sorted(now-{f['path'] for f in r['files']});assert not changed and not added,(changed,added)
 baseline.append({'root':str(root),'files_checked':len(r['files']),'modified_or_missing':changed,'new_files':added,'status':'UNCHANGED'})
reused=read(ROOT/'evidence/REUSED_INPUTS.json');assert sha(reused['read_only_model'])==reused['source_sha256']
assert sha(ROOT/'runtime/v3_view.js')==reused['renderer_sha256']
for r in reused['files']:assert sha(ROOT/r['file'])==r['sha256']==sha(r['source'])
ann=read(ROOT/'evidence/IMAGE_ANNOTATIONS.json');images=read(ROOT/'evidence/IMAGE_CANDIDATES.json');sel=read(ROOT/'evidence/VIEW_SELECTION.json');geo=read(ROOT/'evidence/GEOMETRY_COMPARISON.json');views={r['id']:r for r in images['records']}
assert images['status']==sel['status']=='PASS' and len(views)==15
counts={c['study']:set(c['guids']) for c in cards}
for r in views.values():
 ids=set(r['requested_original_guids']);assert ids==counts[r['study']]=={t['original_guid'] for t in r['target_occurrences']};assert not r['context_aliases']
 assert sha(ROOT/r['file'])==r['sha256']
for a in ann['annotations']:
 r=views[a['view_id']];ts={t['original_guid']:t for t in r['target_occurrences']};assert set(a['full_image_guids'])==counts[a['study']]
 for m in a['markers']:
  assert m['pixel_anchor']==ts[m['guid']]['pixel_anchor'] and m['pixels']==ts[m['guid']]['pixels'] and m['pixels']>0
  assert m['guid'] in next(g for g in ann['bom_mapping'] if g['group_id']==m['group_id'])['guids']
 if a['scope']=='corner' and a['study']!='S03':assert all(ts[g]['pixels']>0 for g in geo['extra_by_layer_guids'][a['study']])
mapped=[g for r in ann['bom_mapping'] for g in r['guids']];assert len(mapped)==len(set(mapped))==153 and set(mapped)==set(by)
for r in ann['bom_mapping']:
 assert r['count']==len(r['guids'])==len(r['image_files'])
 assert r['image_files']==[by[g]['image_file'] for g in r['guids']]
native=read(ROOT/'evidence/NATIVE_DETAIL_EDGES.json');independent=[]
for row in native['rows']:
 d=next(x for x in geo['changed_upper_parts'] if x['dominant_axis']==row['axis']);bb=d['strongest_witness']['target_bbox_module_mm']
 source=next(q for q in row['objects'] if q['study']=='S02');dest=next(q for q in row['objects'] if q['study']=='S03')
 pts=[pt for edge in source['edges'] for pt in edge['points_module_mm']]
 maxout=max(max(bb['min'][k]-pt[k],pt[k]-bb['max'][k],0) for pt in pts for k in range(3));assert maxout>.1
 independent.append({'axis':row['axis'],'independent_native_edge_evaluation_outside_target_conservative_bbox_mm':maxout,'edge_evaluations':len(pts),'status':'SUPPORTS_PROVEN_FORM_DIFFERENCE'})
 assert abs(source['z_vertex_max']-source['z_vertex_min']-10)<1e-6 and abs(dest['z_vertex_max']-dest['z_vertex_min']-8)<1e-6
for r in sel['equivalence']:assert r['projectionResidual']<1e-9 and r['directionResidual']<1e-8
class Parse(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.guids=[];self.scripts=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  for k in ['src','href']:
   if a.get(k):self.links.append(a[k])
  if a.get('data-guid'):self.guids.append(a['data-guid'])
  if tag=='script':assert not a.get('src'),'No external scripts'
parser=Parse();html=(ROOT/'START.html').read_text(encoding='utf-8');parser.feed(html)
assert len(parser.ids)==len(set(parser.ids));assert collections.Counter(parser.guids)==collections.Counter(by.keys())
missing=[]
for link in parser.links:
 if link.startswith('#'):
  if unquote(link[1:]) not in parser.ids:missing.append(link)
 else:
  assert not re.match(r'^[a-zA-Z]+:',link),'Offline file must not reference external URLs'
  if not (ROOT/link).is_file() and link not in ['evidence/FINAL_CHECK.json','FILES_SHA256.json']:missing.append(link)
assert not missing,missing
assert 'UNVERIFIED' in html and '129 Auswertungen' in html
pngs=[]
for p in (ROOT/'images').rglob('*.png'):
 with Image.open(p) as im:
  im.verify()
 with Image.open(p) as im:assert im.convert('RGB').getextrema()!=((255,255),(255,255),(255,255))
 pngs.append(p.relative_to(ROOT).as_posix())
# Store inspected input-asset evidence, not fabricated report/browser screenshots.
dump(ROOT/'evidence/VISUAL_ASSET_REVIEW.json',{'method':'Direct local image inspection, not an HTML browser inspection.','inspected':['images/views/S02_module_perspective_reverse_y.png','images/views/S02_corner_perspective_reverse_xy.png','images/views/S03_corner_perspective_reverse_xy.png','images/views/S04_corner_perspective_reverse_xy.png','images/native_profile_X.png','images/native_profile_Y.png'],'observations':['Corner images show actual purple extra geometry in S02/S04 and open comparable zone in S03.','Native edge end-projections visibly differ in outline/features and corner-height span.','S02/S04 corner geometry appears consistent; separate native comparisons remain the actual check.'],'not_performed':['Live HTML layout/browser interaction check','Timed independent one-minute test','Blind user study','Manufacturing review']})
check={'status':'PASS_TECHNICAL_READABILITY_UNVERIFIED','source_model_sha256':reused['source_sha256'],'baselines':baseline,'byte_identical_reused_files':len(reused['files']),
 'image_guid_bom_mapping':'PASS','all_153_original_parts_once_in_bom':True,'bom_rows':len(ann['bom_mapping']),'focus_full_module_guid_sets':{'S02':21,'S03':18,'S04':21},
 'pixel_bound_markers':sum(len(a['markers']) for a in ann['annotations']),'all_extra_objects_visible_in_selected_corner':True,'matched_cameras':'PASS','html_references_missing':missing,'html_ids_unique':True,'image_files_verified':len(pngs),
 'native_form_changes_proven':len(geo['changed_upper_parts']),'independent_native_edge_controls':independent,
 'one_minute_human_readability':'UNVERIFIED','html_browser_layout':'BLOCKED_BY_FILE_PROTOCOL_POLICY_NOT_CIRCUMVENTED','asset_visual_inspection':'COMPLETED_SEPARATELY',
 'limits':['Full trimmed-face equivalence not certified; ordered native controls/edges/topology and samples are the checked scope.','Original UNKNOWN manufacturing status not promoted.','Three CAD hardware geometries are not asserted to be three installed connectors.'],
 'nas_originals_accessed':False,'original_model_copied':False,'new_scanner_database_scheduler_service':False}
dump(ROOT/'evidence/FINAL_CHECK.json',check)
exclusions={'MATCH_DIAGNOSTIC.json','RENDER_FAILURE.json'}
payload=[]
for p in sorted(ROOT.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(ROOT).as_posix()
 if rel.startswith('runtime/') or p.name in exclusions or p.name in ['FILES_SHA256.json','PACKAGE_VALIDATION.json','DRIVE_UPLOAD_VERIFICATION.json'] or p.suffix.lower()=='.zip':continue
 assert p.suffix.lower() not in ['.3dm','.db','.sqlite','.sqlite3']
 payload.append({'path':rel,'bytes':p.stat().st_size,'sha256':sha(p)})
dump(ROOT/'FILES_SHA256.json',{'version':'V0.2','algorithm':'SHA-256','files':payload,'excludes':['self','ZIP container','publication receipts','temporary runtime/cache','superseded diagnostic/failed CAD launch log'],'source_model_not_packaged':True})
archive=ROOT/'SENCKENBERG_VISUAL_REPORT_V0_2_OFFLINE.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in payload:z.write(ROOT/f['path'],f['path'])
 z.write(ROOT/'FILES_SHA256.json','FILES_SHA256.json')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(payload)+1
 for f in payload:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']
 assert not any(n.lower().endswith('.3dm') or n.startswith('runtime/') for n in z.namelist())
validation={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':sha(archive),'files':len(payload)+1,'all_payload_hashes_valid':True,'zip_integrity':'PASS','no_3dm_or_runtime':True,'check':check['status']}
dump(ROOT/'PACKAGE_VALIDATION.json',validation);print(json.dumps(validation,indent=2))
