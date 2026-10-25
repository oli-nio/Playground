/* Local, staged CAD import. It never mutates the current project itself. */
(function(root){'use strict';
const I={},E=root.CutplanExport,K=root.CutplanCore,esc=E.escape;
let active=null;
I.isBusy=()=>!!active;
function localOrigin(){return location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname);}
async function jsonRequest(path,options={}){const r=await fetch(path,{cache:'no-store',credentials:'same-origin',...options});let j;try{j=await r.json();}catch{throw Error('Die lokale Import-Schnittstelle hat keine gültige Antwort geliefert.');}if(!r.ok||j.status==='error')throw Error(j.error||'Lokale CAD-Prüfung fehlgeschlagen.');return j;}
function fmt(x){return Number.isFinite(Number(x))?Number(x).toLocaleString('de-DE'):'offen';}
I.open=async function(file,{onAdopt,onSaveCurrent}={}){
 if(active)throw Error('Es ist bereits eine Importprüfung geöffnet.');
 if(!localOrigin())throw Error('Die 3DM-Prüfung benötigt den lokalen CUTPLAN-Start auf diesem Rechner. Auf der öffentlichen Website wird keine CAD-Datei hochgeladen.');
 if(!file||!file.name.toLowerCase().endsWith('.3dm'))throw Error('Bitte genau eine Rhino-Datei mit Endung .3dm wählen.');
 const dialog=document.createElement('dialog');dialog.id='cad-stage';dialog.className='cad-stage';
 dialog.innerHTML=`<div class="drawer-head"><h2>3DM lokal prüfen</h2><button id="cad-close" aria-label="Importprüfung schließen">×</button></div><p class="help">Getrennte Prüfvorstufe. Das aktuelle Projekt bleibt unverändert, bis du ausdrücklich ein neues Projekt übernimmst. Keine Cloud und keine Produktionsfreigabe.</p><p><b>${esc(file.name)}</b> · ${file.size<1048576?fmt(file.size)+' Byte':fmt(file.size/1048576)+' MiB'}</p><div id="cad-status" role="status" aria-live="polite">Lokale Schnittstelle wird geprüft …</div><div id="cad-stage-result"></div><div class="controls cad-stage-actions"><button id="cad-cancel">Abbrechen</button><button id="cad-save-current">Bisheriges Projekt sichern</button><button id="cad-adopt" class="primary" disabled>Als neues Projekt übernehmen</button></div>`;
 document.body.append(dialog);dialog.showModal();
 const $=s=>dialog.querySelector(s),a={dialog,cancelled:false,job:null,token:null,stage:null,preview:null,previewGeneration:0};active=a;
 const status=(text,error=false)=>{if(!dialog.isConnected)return;$('#cad-status').textContent=text;$('#cad-status').className=error?'callout':'stale';};
 const disposePreview=()=>{a.previewGeneration++;a.preview?.();a.preview=null;};
 function finish(){disposePreview();if(dialog.open)dialog.close();dialog.remove();if(active===a)active=null;}
 async function cancelJob(){if(a.job&&a.token){try{await jsonRequest('/api/cad-jobs/'+a.job+'/cancel',{method:'POST',headers:{'X-Cutplan-Token':a.token}});}catch{/* Current project is still untouched even if cleanup fails. */}}}
 async function cancel(){a.cancelled=true;status('Abbruch angefordert. Das bisherige Projekt bleibt unverändert.');$('#cad-adopt').disabled=true;await cancelJob();finish();}
 $('#cad-close').onclick=cancel;$('#cad-cancel').onclick=cancel;dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
 $('#cad-save-current').onclick=()=>onSaveCurrent?.();
 $('#cad-adopt').onclick=async()=>{if(!a.stage||a.cancelled)return;$('#cad-adopt').disabled=true;try{K.validateProject(a.stage.project);if(a.stage.project.scenarios.some(s=>Object.values(s.selection).some(x=>x.selected)))throw Error('Import enthält unerwartet vorgewählte Produktionsmengen; Übernahme gesperrt.');status('Bisheriges Projekt wird gesichert; neuer Stand wird geprüft …');await onAdopt(a.stage.project,a.stage);finish();}catch(e){status(e.message,true);$('#cad-adopt').disabled=false;}};
 async function preview(moduleId){disposePreview();const generation=a.previewGeneration,project=a.stage.project,m=project.modules.find(x=>x.id===moduleId),el=$('#cad-preview');if(!m||!el)return;el.innerHTML='<p class="help">Native Anzeigeflächen werden geladen …</p>';if(!root.CutplanDisplay){el.innerHTML=E.nativeSVG(m,project,[],640,330,false);return;}const handle=await root.CutplanDisplay.mount(el,project,m,[],id=>{const o=project.occurrences.find(x=>x.id===id);$('#cad-preview-selection').textContent=o?o.position+' · '+o.label:'';handle?.updateSelection?.([id]);});if(a.cancelled||generation!==a.previewGeneration||!dialog.isConnected)handle?.();else a.preview=handle;}
 function ready(stage){
  a.stage=stage;const s=stage.summary||{},source=stage.source||{},warnings=stage.warnings||[],p=stage.project;
  const complete=s.mesh_coverage?.complete_occurrences??0;
  $('#cad-stage-result').innerHTML=`<div class="cad-import-metrics"><div><strong>${fmt(p.occurrences.length)}</strong><small>physische CAD-Vorkommen</small></div><div><strong>${fmt(s.hidden_occurrences)}</strong><small>in der Quelle ausgeblendet</small></div><div><strong>${fmt(s.native_profiles)}</strong><small>bestätigte konstante Profile</small></div><div><strong>${fmt(s.unresolved_geometry)}</strong><small>Geometrie / Herstellweise offen</small></div></div><p class="help">Quelle: ${esc(source.original_units||source.units||s.units||'Einheit offen')} → mm · ${fmt(p.modules.length)} Prüfbereiche · ${fmt(complete)} vollständig mit gespeicherten Anzeigeflächen. Keine Preise oder Produktionsmengen automatisch übernommen.</p><div class="callout">Eine sichtbare Fläche ist kein Fertigmaß. Materialhinweise aus Layern bleiben Quellangaben. Alle Bereiche starten ungewählt; Varianten und Beschaffung müssen anschließend geprüft werden.</div><label>Vorschau <select id="cad-preview-module">${p.modules.map(m=>`<option value="${esc(m.id)}">${esc(m.label)} · ${m.occurrence_ids.length} Vorkommen</option>`).join('')}</select></label><div class="cad-view cad-import-preview" id="cad-preview"></div><p class="help" id="cad-preview-selection"></p><div class="parts-wrap cad-stage-table"><table><thead><tr><th>Prüfbereich</th><th>Vorkommen</th><th>Bestätigte Profile</th><th>Offene Geometrie</th></tr></thead><tbody>${p.modules.map(m=>{const q=p.occurrences.filter(o=>o.module_id===m.id);return `<tr><td>${esc(m.label)}</td><td>${q.length}</td><td>${q.filter(o=>!!o.profile).length}</td><td>${q.filter(o=>!o.profile).length}</td></tr>`;}).join('')}</tbody></table></div><details><summary>Hinweise und Prüfgrenzen (${warnings.length})</summary>${warnings.map(w=>`<p class="help">${esc(typeof w==='string'?w:JSON.stringify(w))}</p>`).join('')||'<p>Keine zusätzlichen Warnungen.</p>'}<p class="help">Nur die implementierten lokalen Geometrieprüfungen dieses Import-Prototyps, nicht der gesamte CAD-Intelligence-Generator. Fehlende Nachweise bleiben offen. Keine Fertigungsfreigabe.</p></details><details><summary>Details / Herkunft</summary><p class="source-trace">SHA-256 ${esc(source.sha256)}<br>Import ${esc(stage.job_id)}<br>${esc(source.name||file.name)}</p></details>`;
  $('#cad-preview-module').onchange=e=>preview(e.target.value).catch(e=>status(e.message,true));
  preview(p.modules[0]?.id).catch(e=>status(e.message,true));
  $('#cad-adopt').disabled=false;$('#cad-cancel').textContent='Nicht übernehmen';status('Prüfung abgeschlossen. Noch nichts in das aktuelle Projekt übernommen.'+(s.invalid_occurrences?' '+fmt(s.invalid_occurrences)+' ungültige Geometrien bleiben ohne neue Maßfreigabe.':'')+(s.mesh_coverage?.incomplete_occurrences?' '+fmt(s.mesh_coverage.incomplete_occurrences)+' Anzeigecaches sind nur teilweise verwendbar.':''));
 }
 try{
  const info=await jsonRequest('/api/info');a.token=info.csrf_token;
  if(!info.cad_import||!a.token)throw Error('Die vorhandene lokale CAD-Laufzeit ist nicht verfügbar. Keine Installation und kein Cloud-Ausweichen.');
  if(a.cancelled)return;
  if(file.size>info.max_file_bytes)throw Error('Datei überschreitet die Importgrenze von '+Math.round(info.max_file_bytes/1048576)+' MiB. Das bisherige Projekt bleibt unverändert.');
  status('Datei wird lokal gelesen und mit SHA-256 gebunden …');
  const bytes=await file.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(a.cancelled)return;
  status('Unveränderte Datei wird an die lokale Prüfung auf diesem Rechner übergeben …');
  const started=await jsonRequest('/api/cad-jobs',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Cutplan-Token':a.token,'X-File-Name':encodeURIComponent(file.name)},body:bytes});a.job=started.job_id;
  if(a.cancelled){await cancelJob();return;}
  const deadline=Date.now()+((info.job_timeout_seconds||300)+20)*1000;
  while(!a.cancelled){
   const stage=await jsonRequest('/api/cad-jobs/'+a.job);
   if(a.cancelled){await cancelJob();return;}
   if(stage.status==='ready'){
    if(stage.source?.sha256!==hash)throw Error('Quellenhash stimmt nicht mit der ausgewählten Datei überein. Übernahme gesperrt.');
    K.validateProject(stage.project);ready(stage);return;
   }
   if(stage.status==='cancelled')throw Error('CAD-Prüfung abgebrochen. Das bisherige Projekt bleibt unverändert.');
   if(Date.now()>deadline){await cancelJob();throw Error('Zeitgrenze der lokalen Importprüfung erreicht; kein Projekt übernommen.');}
   status((stage.progress?.occurrences?'Geometrieprüfung: bereits '+fmt(stage.progress.occurrences)+' CAD-Vorkommen erfasst. ':'Native Geometrie wird geprüft. ')+'Du kannst abbrechen; dein bisheriges Projekt bleibt erhalten.');
   await new Promise(resolve=>setTimeout(resolve,700));
  }
 }catch(e){if(!a.cancelled){status(e.message,true);$('#cad-adopt').disabled=true;$('#cad-cancel').textContent='Schließen';await cancelJob();}}
};
root.CutplanImport=I;
})(window);
