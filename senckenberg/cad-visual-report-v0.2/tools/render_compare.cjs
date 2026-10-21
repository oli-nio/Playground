// Finite reuse of the existing CAD raster tool, not inspection of a blocked HTML report.
const fs=require('fs'),p=require('path'),http=require('http'),crypto=require('crypto');
const {chromium}=require('C:/Users/olive/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=p.resolve(__dirname,'..'),v0=p.join(root,'..','FORMIKAT_SENCKENBERG_MODUL_ZUSCHNITT_PILOT_V0_2026-10-21'),base=p.join(root,'..','FORMIKAT_CAD_VERSION_COMPARE_V4_2026-10-20/runtime');
const read=f=>JSON.parse(fs.readFileSync(p.join(root,f),'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),save=(name,x)=>fs.writeFileSync(p.join(root,name),JSON.stringify(x,null,2));
const comp=read('evidence/GEOMETRY_COMPARISON.json'),cards=read('data/MODULE_CARDS.json').cards.filter(c=>['S02','S03','S04'].includes(c.study));
const native=JSON.parse(fs.readFileSync(p.join(v0,'evidence/NATIVE_INVENTORY.json'),'utf8')),model=p.join(v0,'models/MODULTEST_OR-MZ.3dm');
if(hash(fs.readFileSync(model))!==comp.source_sha256)throw Error('MODEL_CHANGED');
const changed={S02:comp.changed_upper_parts.map(q=>q.source_guid),S03:comp.changed_upper_parts.map(q=>q.target_guid)};
changed.S04=changed.S02.map(g=>comp.pairs[1].matches.find(m=>m.source_guid===g).target_guid);
const colors={common:0x719794,changed:0xe99a35,extra:0x8b477e};
const palette=Object.fromEntries(cards.flatMap(c=>c.guids.map(g=>[g,comp.extra_by_layer_guids[c.study].includes(g)?colors.extra:changed[c.study].includes(g)?colors.changed:colors.common])));
const tmp=p.join(root,'runtime/temporary_browser');fs.mkdirSync(tmp,{recursive:true});process.env.TMP=tmp;process.env.TEMP=tmp;
let server,browser,ctx,records=[],events=[];
(async()=>{
 server=http.createServer((req,res)=>{const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file,allowed;
  if(url==='/scripts/v3_view.js'){file=p.join(root,'runtime/v3_view.js');allowed=p.join(root,'runtime');}
  else if(url.startsWith('/scripts/')){file=p.join(base,url.slice(9));allowed=base;}
  else if(url.startsWith('/candidates/')){file=p.join(base,url);allowed=base;}
  if(!file||!p.resolve(file).startsWith(allowed+p.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.wasm':'application/wasm','.css':'text/css'})[p.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking','--disable-sync','--no-first-run','--disk-cache-dir='+p.join(tmp,'cache')]});
 ctx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});const origin='http://127.0.0.1:'+server.address().port;
 await ctx.route('**/*',r=>{const url=r.request().url();if(url.startsWith(origin+'/')||url.startsWith('blob:')||url.startsWith('data:'))return r.continue();events.push({event:'EXTERNAL_BLOCKED',url:new URL(url).origin});return r.abort();});
 const page=await ctx.newPage();page.on('pageerror',e=>events.push({event:'PAGE_ERROR',error:String(e)}));
 await page.goto(origin+'/candidates/byRhinoView/www/index.html');await page.waitForFunction(async()=>{const {S}=await import('/candidates/byRhinoView/www/state.js');return !!S.rhinoInstance&&!!S.renderer;},{},{timeout:60000});
 await page.locator('#file-upload').setInputFiles(model);await page.waitForFunction(async()=>{const {S}=await import('/candidates/byRhinoView/www/state.js');return !!S.currentModel&&document.getElementById('loading').classList.contains('hidden');},{},{timeout:180000});
 const rows=native.objects.map(r=>({display_guid:r.guid,original_object_guid:r.guid,original_instance_path:[],original_definition_path:[],occurrence_id:'occ:'+hash(Buffer.from(comp.source_sha256+'|ROOT|'+r.guid)),source_type:r.type,source_visible:r.visible,mesh_cache:r.mesh_cache?{...r.mesh_cache,faces_with_source_mesh:r.mesh_cache.native_extrusion_mesh?r.mesh_cache.faces:r.mesh_cache.faces_with_mesh,faces_without_source_mesh:[]}:null}));
 const inv=await page.evaluate(async config=>{window.v3=await import('/scripts/v3_view.js');return v3.init(config);},{source_hash:comp.source_sha256,display_hash:comp.source_sha256,occurrences:rows});
 save('evidence/RENDERER_INVENTORY.json',inv);
 async function render(c,cam,scope,relmin,relmax){
  const d=comp.datums[c.study],fit={min:relmin.map((v,k)=>v+d[k]),max:relmax.map((v,k)=>v+d[k])};
  const req={source_hash:comp.source_sha256,display_hash:comp.source_sha256,target_aliases:c.guids,level:'isolation',highlight:true,camera_id:cam,status_colors:palette,fit_box:fit};
  const r=await page.evaluate(req=>v3.render(req),req);const bytes=Buffer.from(r.image.split(',')[1],'base64');delete r.image;
  const file='images/views/'+c.study+'_'+scope+'_'+cam+'.png';fs.writeFileSync(p.join(root,file),bytes);
  const extras=comp.extra_by_layer_guids[c.study],upper=changed[c.study];
  const rec={id:c.study+'_'+scope+'_'+cam,study:c.study,scope,camera_id:cam,file,sha256:hash(bytes),requested_original_guids:c.guids,relative_fit_box_mm:{min:relmin,max:relmax},changed_guids:upper,extra_guids:extras,...r};
  rec.changed_visible=r.target_occurrences.filter(t=>upper.includes(t.original_guid)&&t.pixels>0).length;
  rec.extra_pixels=r.target_occurrences.filter(t=>extras.includes(t.original_guid)).reduce((n,t)=>n+t.pixels,0);
  if(r.context_aliases.length||new Set(r.target_occurrences.map(x=>x.original_guid)).size!==c.guids.length)throw Error('TARGET_SET');
  records.push(rec);save('evidence/IMAGE_CANDIDATES.json',{records,events});console.log(rec.id,rec.changed_visible,rec.extra_pixels);return rec;
 }
 for(const c of cards)await render(c,'perspective_reverse_y','module',[-20,-20,0],[1351.01,651.01,2000]);
 const cams=['perspective_v2_direction','perspective_reverse_x','perspective_reverse_y','perspective_reverse_xy'];
 for(const c of cards)for(const cam of cams)await render(c,cam,'corner',[-18,-18,1812],[115,115,1889]);
 const scores=cams.map(cam=>({camera_id:cam,score:records.filter(r=>r.scope==='corner'&&r.camera_id===cam).reduce((n,r)=>n+r.changed_visible*100000+Math.min(r.extra_pixels,50000),0)})).sort((a,b)=>b.score-a.score||a.camera_id.localeCompare(b.camera_id));
 const selected=cards.map(c=>({study:c.study,module:records.find(r=>r.study===c.study&&r.scope==='module').id,corner:records.find(r=>r.study===c.study&&r.scope==='corner'&&r.camera_id===scores[0].camera_id).id}));
 const equivalence=[];for(const scope of ['module','corner']){
  const rr=selected.map(s=>records.find(r=>r.id===s[scope])),ref=rr[0].camera;
  const projectionResidual=Math.max(...rr.flatMap(r=>r.camera.projection_matrix.map((v,k)=>Math.abs(v-ref.projection_matrix[k]))));
  const directionResidual=Math.max(...rr.flatMap(r=>r.camera.position.map((v,k)=>Math.abs((v-r.camera.target[k])-(ref.position[k]-ref.target[k])))));
  if(projectionResidual>1e-9||directionResidual>1e-8)throw Error('CAMERA_MISMATCH');equivalence.push({scope,projectionResidual,directionResidual});
 }
 if(events.some(e=>e.event==='PAGE_ERROR'))throw Error('CAD_RENDER_ERROR');
 save('evidence/IMAGE_CANDIDATES.json',{status:'PASS',records,events});
 save('evidence/VIEW_SELECTION.json',{status:'PASS',selected,scores,equivalence,colors,changed_guids:changed,
  selection_rule:'Same main camera and local datum fit for all three. Four bounded corner cameras; select common camera by visible changed-part count then capped extra-layer pixels. Cropped corner intentionally includes all module GUIDs, not a full-module coverage claim.',
  color_meaning:'Teal: no difference in checked representation. Orange: two proven changed upper parts, not confirmed material/function. Purple: extra CAD geometry by layer, not purchasable connector count.',
  report_browser_opened:false,limits:'Only source-bound saved display meshes. Small profile differences are shown separately by native edge projections, not asserted from these raster pixels.'});
})().catch(e=>{save('evidence/RENDER_FAILURE.json',{error:e.stack,completed:records.length});console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(ctx)await ctx.close().catch(()=>{});if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));save('evidence/RENDER_CLOSED.json',{closed:true,images:records.length,finite:true,no_persistent_viewer:true,report_not_opened:true});});
