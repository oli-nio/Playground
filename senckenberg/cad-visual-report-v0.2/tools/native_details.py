"""Six existing upper-part Breps -> orthographic sampled native edge projections."""
from pathlib import Path
import json,sys,hashlib
import rhino3dm as rh
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def dump(p,x):Path(p).write_text(json.dumps(x,indent=2,ensure_ascii=False,allow_nan=False),encoding='utf-8')
g=read(ROOT/'evidence/GEOMETRY_COMPARISON.json');model=Path(g['source_model']);assert hashlib.sha256(model.read_bytes()).hexdigest()==g['source_sha256']
doc=rh.File3dm.Read(str(model));needed={q[k] for q in g['changed_upper_parts'] for k in ['source_guid','target_guid']}
needed.update(m['target_guid'] for m in g['pairs'][1]['matches'] if m['source_guid'] in needed)
objects={str(o.Attributes.Id):o.Geometry for o in doc.Objects if str(o.Attributes.Id) in needed};assert len(objects)==6
rows=[]
for pair in g['changed_upper_parts']:
 axis=0 if pair['dominant_axis']=='X' else 1;cross=1-axis
 ids={'S02':pair['source_guid'],'S03':pair['target_guid'],'S04':next(m['target_guid'] for m in g['pairs'][1]['matches'] if m['source_guid']==pair['source_guid'])}
 rr=[]
 for study,guid in ids.items():
  b=objects[guid];d=g['datums'][study];edges=[]
  for i,edge in enumerate(b.Edges):
   dom=edge.Domain;pts=[]
   for j in range(129):
    p=edge.PointAt(dom.T0+(dom.T1-dom.T0)*j/128);pts.append([p.X-d[0],p.Y-d[1],p.Z-d[2]])
   edges.append({'edge_index':i,'points_module_mm':pts})
  vertices=[[v.Location.X-d[0],v.Location.Y-d[1],v.Location.Z-d[2]] for v in b.Vertices]
  rr.append({'study':study,'guid':guid,'edges':edges,'vertices_module_mm':vertices,'z_vertex_min':min(v[2] for v in vertices),'z_vertex_max':max(v[2] for v in vertices)})
 rows.append({'axis':pair['dominant_axis'],'projection_matrix_2x4':[[0 if k!=cross else 1 for k in range(3)]+[0],[0,0,1,0]],'transverse_axis_index':cross,'objects':rr})
dump(ROOT/'evidence/NATIVE_DETAIL_EDGES.json',{'source_sha256':g['source_sha256'],'method':'129 evaluations per native BrepEdge domain. Orthographic projection along longitudinal axis; all edges, no hidden-line removal. No invented surfaces or new dimensions in PARTS.json.','scope_guids':sorted(needed),'rows':rows})
for row in rows:
 cross=row['transverse_axis_index'];allpts=[p for q in row['objects'] for e in q['edges'] for p in e['points_module_mm']]
 xmin=min(p[cross] for p in allpts);xmax=max(p[cross] for p in allpts);zmin=min(p[2] for p in allpts);zmax=max(p[2] for p in allpts)
 scale=min(310/(xmax-xmin),155/(zmax-zmin));basez=250
 svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="370" viewBox="0 0 1280 370"><rect width="1280" height="370" fill="#fff"/><style>text{font-family:Segoe UI,Arial;fill:#233c43}.head{font-size:26px;font-weight:650}.note{font-size:17px}.small{font-size:14px}</style>']
 for i,q in enumerate(row['objects']):
  cx=215+425*i;ox=cx-(xmax-xmin)*scale/2;col='#008575' if q['study']=='S03' else '#b96b0c'
  svg.append(f'<text class="head" x="{cx}" y="42" text-anchor="middle">{q["study"]} · oberes Teil {row["axis"]}</text>')
  for edge in q['edges']:
   points=' '.join(f'{ox+(pt[cross]-xmin)*scale:.3f},{basez-(pt[2]-zmin)*scale:.3f}' for pt in edge['points_module_mm'])
   svg.append(f'<polyline points="{points}" fill="none" stroke="{col}" stroke-width="1.5" opacity=".75"/>')
  lo=q['z_vertex_min'];hi=q['z_vertex_max'];x=ox-20;y1=basez-(lo-zmin)*scale;y2=basez-(hi-zmin)*scale
  svg.append(f'<path d="M{x} {y1}V{y2}M{x-6} {y1}H{x+6}M{x-6} {y2}H{x+6}" fill="none" stroke="#233c43" stroke-width="2"/>')
  svg.append(f'<text class="note" x="{cx}" y="300" text-anchor="middle">Eckpunkt-Z-Spanne {(hi-lo):.1f} mm</text><text class="small" x="{cx}" y="327" text-anchor="middle">{len(q["edges"])} native Kanten · {len(q["vertices_module_mm"])} Eckpunkte</text>')
 svg.append('<text class="small" x="640" y="358" text-anchor="middle">Gleicher Projektionsmaßstab · alle Kanten überlagert · keine bestätigte Profildicke oder Zuschnittlänge</text></svg>')
 (ROOT/f'images/native_profile_{row["axis"]}.svg').write_text(''.join(svg),encoding='utf-8')
print(json.dumps({'scope':len(needed),'rows':len(rows),'edge_samples':sum(len(e['points_module_mm']) for r in rows for q in r['objects'] for e in q['edges'])}))
