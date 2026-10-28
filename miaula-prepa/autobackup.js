'use strict';
// 2.13.0 · Copia automática. Después de cada cambio en los datos (MiAulaDB.put/add/remove…) espera unos segundos
// y guarda un respaldo .json completo, con el mismo formato que «Crear respaldo».
// Destinos: carpeta elegida (Chrome/Edge en PC), archivo elegido, o descarga automática (cualquier navegador).
// Además guarda «versiones internas» en una base aparte (MiAulaPrepaAutoCopias) para poder volver atrás.
// No modifica db.js ni la base principal: solo envuelve los métodos que escriben.
const MiAulaAutoBackup=(()=>{
  const AB_DB='MiAulaPrepaAutoCopias',AB_VER=1;
  const LATEST='MiAula_Prepa_ultima_copia.json';
  const DEBOUNCE_MS=2500,MAX_VERSIONS=20,VERSION_EVERY_MS=10*60*1000;
  const WRITE_METHODS=['put','add','remove','clear','cascadeDeleteStudent','deleteActivity','archiveGroup','restoreBackup',
    'reorganizeGroup','deactivateStudent','reactivateStudent','normalizeRecords','resetAll'];
  const st={settings:{mode:'off',downloadEveryMin:15,targetName:''},handle:null,needsPermission:false,timer:null,busy:false,again:false,
    lastHash:'',lastCounts:null,lastAt:null,lastError:'',paused:null,lastDownloadAt:0,lastVersionAt:0,ready:false};

  const supportsFolder=()=>typeof window.showDirectoryPicker==='function';
  const supportsFile=()=>typeof window.showSaveFilePicker==='function';

  // ---------- Base auxiliar (no se mezcla con los datos académicos) ----------
  let _db=null;
  function req(r){return new Promise((ok,ko)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error);});}
  function openDB(){
    if(_db)return Promise.resolve(_db);
    return new Promise((ok,ko)=>{
      const r=indexedDB.open(AB_DB,AB_VER);
      r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv');if(!db.objectStoreNames.contains('versions'))db.createObjectStore('versions',{keyPath:'id',autoIncrement:true});};
      r.onsuccess=()=>{_db=r.result;ok(_db);};r.onerror=()=>ko(r.error);
    });
  }
  async function tx(store,mode,fn){const db=await openDB();const t=db.transaction(store,mode);const out=await fn(t.objectStore(store));await new Promise((ok,ko)=>{t.oncomplete=ok;t.onerror=()=>ko(t.error);t.onabort=()=>ko(t.error);});return out;}
  const kvGet=k=>tx('kv','readonly',s=>req(s.get(k)));
  const kvSet=(k,v)=>tx('kv','readwrite',s=>req(s.put(v,k)));
  const kvDel=k=>tx('kv','readwrite',s=>req(s.delete(k)));

  // ---------- Utilidades ----------
  function hash(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16)+':'+str.length;}
  const pad=n=>String(n).padStart(2,'0');
  function stamp(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;}
  function dayName(d=new Date()){return `MiAula_Prepa_copia_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.json`;}
  function say(msg,err){try{if(typeof toast==='function')toast(msg,!!err);}catch{}}
  function markBackupDone(){try{localStorage.setItem('miaula:lastBackupAt',new Date().toISOString());}catch{}try{if(typeof renderBackupReminder==='function')renderBackupReminder();}catch{}}
  function counts(data){const c={};for(const [k,v] of Object.entries(data.stores||{}))c[k]=Array.isArray(v)?v.length:0;return c;}
  const WATCH={students:'alumnos',attendance:'registros de asistencia',grades:'calificaciones',activities:'actividades',groups:'grupos'};
  // Devuelve el primer tipo de dato que perdió más de la mitad de sus registros (con al menos 10 antes).
  function bigLoss(before,after){
    if(!before)return null;
    for(const [k,label] of Object.entries(WATCH)){const b=before[k]||0,a=after[k]||0;if(b>=10&&a<b*0.5)return {label,before:b,after:a};}
    return null;
  }

  async function snapshot(){
    const data=await MiAulaDB.exportBackup();
    data.appVersion='2.13.0-Prepa';data.autoBackup=true;
    const body=JSON.stringify(data.stores);
    return {data,json:JSON.stringify(data,null,1),hash:hash(body),counts:counts(data)};
  }

  // ---------- Destinos ----------
  async function permissionOk(handle,ask){
    if(!handle?.queryPermission)return true;
    const opts={mode:'readwrite'};
    if(await handle.queryPermission(opts)==='granted')return true;
    if(!ask)return false;
    return (await handle.requestPermission(opts))==='granted';
  }
  async function writeFile(fileHandle,text){const w=await fileHandle.createWritable();await w.write(new Blob([text],{type:'application/json'}));await w.close();}
  async function writeTarget(json){
    const h=st.handle;
    if(st.settings.mode==='folder'){
      await writeFile(await h.getFileHandle(LATEST,{create:true}),json);
      await writeFile(await h.getFileHandle(dayName(),{create:true}),json);
    }else if(st.settings.mode==='file'){
      await writeFile(h,json);
    }
  }
  function download(json){
    const blob=new Blob([json],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`MiAula_Prepa_copia_automatica_${stamp()}.json`;
    document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
  }
  async function saveVersion(snap,force){
    const now=Date.now();
    if(!force&&now-st.lastVersionAt<VERSION_EVERY_MS)return;
    st.lastVersionAt=now;
    await tx('versions','readwrite',async s=>{
      await req(s.add({at:new Date().toISOString(),hash:snap.hash,counts:snap.counts,size:snap.json.length,json:snap.json}));
      const keys=await req(s.getAllKeys());
      for(const k of keys.slice(0,Math.max(0,keys.length-MAX_VERSIONS)))await req(s.delete(k));
    });
  }

  // ---------- Ciclo de copia ----------
  function schedule(){
    if(!st.ready)return;
    clearTimeout(st.timer);
    st.timer=setTimeout(()=>run(),DEBOUNCE_MS);
    render();
  }
  async function run(opts={}){
    if(st.busy){st.again=true;return;}
    st.busy=true;clearTimeout(st.timer);st.timer=null;
    try{
      const snap=await snapshot();
      const changed=snap.hash!==st.lastHash;
      if(!changed&&!opts.force){return;}
      // Seguridad: si de pronto desaparece más de la mitad de los datos, no se pisa la copia sin preguntar.
      const loss=opts.force||st.settings.mode==='off'?null:bigLoss(st.lastCounts,snap.counts);
      if(loss){st.paused=loss;await saveVersion(snap,true);render();return;}
      st.paused=null;
      await saveVersion(snap,opts.force||!st.lastHash);
      const mode=st.settings.mode;
      if((mode==='folder'||mode==='file')&&st.handle){
        if(!(await permissionOk(st.handle,!!opts.gesture))){st.needsPermission=true;render();return;}
        st.needsPermission=false;
        await writeTarget(snap.json);
        st.lastAt=new Date();markBackupDone();
      }else if(mode==='download'){
        const every=Math.max(1,+st.settings.downloadEveryMin||15)*60000,wait=st.lastDownloadAt+every-Date.now();
        if(wait>0&&!opts.force){clearTimeout(st.timer);st.timer=setTimeout(()=>run(),wait+500);render();return;}
        download(snap.json);st.lastDownloadAt=Date.now();await kvSet('lastDownloadAt',st.lastDownloadAt);
        st.lastAt=new Date();markBackupDone();
      }
      st.lastHash=snap.hash;st.lastCounts=snap.counts;st.lastError='';
      await kvSet('last',{hash:snap.hash,counts:snap.counts,at:(st.lastAt||new Date()).toISOString()});
    }catch(e){console.error(e);st.lastError=e?.message||String(e);}
    finally{st.busy=false;render();if(st.again){st.again=false;schedule();}}
  }

  // ---------- Vigilar cambios ----------
  function wrap(){
    if(typeof MiAulaDB==='undefined'||MiAulaDB.__autoWrapped)return; // MiAulaDB es `const` global: no vive en window
    for(const m of WRITE_METHODS){
      const orig=MiAulaDB[m];if(typeof orig!=='function')continue;
      MiAulaDB[m]=function(...args){const r=orig.apply(this,args);Promise.resolve(r).then(schedule,()=>{});return r;};
    }
    Object.defineProperty(MiAulaDB,'__autoWrapped',{value:true});
  }

  // ---------- Acciones del panel ----------
  async function chooseFolder(){
    try{
      const h=await window.showDirectoryPicker({id:'miaula-copias',mode:'readwrite'});
      await useHandle('folder',h,h.name||'carpeta');
    }catch(e){if(e?.name!=='AbortError')say('No se pudo usar esa carpeta: '+e.message,true);}
  }
  async function chooseFile(){
    try{
      const h=await window.showSaveFilePicker({suggestedName:LATEST,types:[{description:'Respaldo MiAula',accept:{'application/json':['.json']}}]});
      await useHandle('file',h,h.name||LATEST);
    }catch(e){if(e?.name!=='AbortError')say('No se pudo usar ese archivo: '+e.message,true);}
  }
  async function useHandle(mode,h,name){
    st.handle=h;st.settings={...st.settings,mode,targetName:name};st.needsPermission=false;
    try{await kvSet('handle',h);}catch(e){console.warn('No se pudo recordar el destino',e);}
    await kvSet('settings',st.settings);
    await run({force:true,gesture:true});
    if(!st.lastError)say(`Copia automática activada en «${name}»`);
  }
  async function useDownloads(){
    st.handle=null;st.settings={...st.settings,mode:'download',targetName:''};
    await kvDel('handle');await kvSet('settings',st.settings);
    await run({force:true});say('Copia automática por descargas activada');
  }
  async function turnOff(){
    if(!confirm('¿Desactivar la copia automática a archivo?\n\nLas versiones internas se seguirán guardando en este navegador.'))return;
    st.handle=null;st.settings={...st.settings,mode:'off',targetName:''};st.needsPermission=false;
    await kvDel('handle');await kvSet('settings',st.settings);render();say('Copia automática a archivo desactivada');
  }
  async function reauthorize(){await run({force:true,gesture:true});if(!st.needsPermission&&!st.lastError)say('Copia automática reactivada');}
  async function forceNow(){st.paused=null;await run({force:true,gesture:true});if(!st.lastError)say('Copia guardada');}
  async function setEvery(min){st.settings={...st.settings,downloadEveryMin:Math.max(1,+min||15)};await kvSet('settings',st.settings);render();}

  async function listVersions(){return tx('versions','readonly',s=>req(s.getAll())).then(r=>r.reverse());}
  async function downloadVersion(id){
    const v=await tx('versions','readonly',s=>req(s.get(+id)));if(!v)return;
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([v.json],{type:'application/json'}));
    a.download=`MiAula_Prepa_version_${stamp(new Date(v.at))}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
  }
  async function restoreVersion(id){
    const v=await tx('versions','readonly',s=>req(s.get(+id)));if(!v)return;
    const when=new Date(v.at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
    if(!confirm(`¿Volver a la versión del ${when}?\n\nSe reemplazarán los datos actuales. Antes se guarda una versión de cómo están ahora, por si te arrepientes.`))return;
    const now=await snapshot();await saveVersion(now,true);
    await MiAulaDB.restoreBackup(JSON.parse(v.json));
    say('Versión restaurada');setTimeout(()=>location.reload(),600);
  }

  // ---------- Interfaz ----------
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const timeTxt=d=>d?d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}):'';
  function status(){
    const m=st.settings.mode;
    if(st.paused)return {cls:'warn',chip:'Copia en pausa',text:`Se borraron muchos ${st.paused.label} de golpe (${st.paused.before} → ${st.paused.after}). Por seguridad la copia del archivo no se sobrescribió. Si fue a propósito, toca «Guardar de todos modos».`};
    if(st.lastError)return {cls:'bad',chip:'Copia con error',text:`No se pudo guardar la copia: ${st.lastError}`};
    if(st.needsPermission)return {cls:'warn',chip:'Toca para reactivar copia',text:'El navegador pide confirmar otra vez el permiso para escribir la copia.'};
    if(m==='folder'||m==='file'){
      if(st.timer||st.busy)return {cls:'busy',chip:'Copiando…',text:`Guardando en «${st.settings.targetName}»…`};
      return {cls:'ok',chip:st.lastAt?`Copia ✓ ${timeTxt(st.lastAt)}`:'Copia activa',text:`Cada cambio se guarda en ${m==='folder'?'la carpeta':'el archivo'} «${st.settings.targetName}»${st.lastAt?` · última copia ${timeTxt(st.lastAt)}`:''}.`};
    }
    if(m==='download')return {cls:'ok',chip:st.lastAt?`Descarga ✓ ${timeTxt(st.lastAt)}`:'Descargas activas',text:`Se descarga una copia cuando hay cambios, como máximo cada ${st.settings.downloadEveryMin} min${st.lastAt?` · última ${timeTxt(st.lastAt)}`:''}.`};
    return {cls:'off',chip:'Copia automática: activar',text:'Desactivada. Solo se guardan versiones internas en este navegador.'};
  }
  function renderChip(){
    const chip=document.getElementById('autoBackupChip');if(!chip)return;
    const s=status();chip.className=`auto-backup-chip ${s.cls}`;chip.querySelector('span').textContent=s.chip;chip.title=s.text;
  }
  async function renderPanel(){
    const box=document.getElementById('autoBackupPanel');if(!box)return;
    const s=status(),m=st.settings.mode;
    const choices=[
      supportsFolder()?`<button type="button" class="btn ${m==='folder'?'subtle':'primary'}" data-ab="folder">${m==='folder'?'Cambiar carpeta':'Elegir carpeta de copias'}</button>`:'',
      !supportsFolder()&&supportsFile()?`<button type="button" class="btn ${m==='file'?'subtle':'primary'}" data-ab="file">${m==='file'?'Cambiar archivo':'Elegir archivo de copia'}</button>`:'',
      `<button type="button" class="btn ${m==='download'?'subtle':supportsFolder()||supportsFile()?'subtle':'primary'}" data-ab="download">${m==='download'?'Descargas activas':'Usar descargas automáticas'}</button>`,
      m!=='off'?'<button type="button" class="btn subtle" data-ab="off">Desactivar</button>':''
    ].join('');
    const extra=[
      st.needsPermission?'<button type="button" class="btn primary" data-ab="reauth">Reactivar copia</button>':'',
      st.paused?'<button type="button" class="btn danger" data-ab="force">Guardar de todos modos</button>':'',
      m!=='off'&&!st.paused&&!st.needsPermission?'<button type="button" class="btn subtle" data-ab="force">Copiar ahora</button>':''
    ].join('');
    let versions=[];try{versions=await listVersions();}catch{}
    const vlist=versions.length?versions.map(v=>`<li><div><strong>${esc(new Date(v.at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}))}</strong><small>${v.counts?.students??0} alumnos · ${v.counts?.grades??0} calificaciones · ${Math.max(1,Math.round(v.size/1024))} KB</small></div><div class="action-row"><button type="button" class="btn small subtle" data-ab-dl="${v.id}">Descargar</button><button type="button" class="btn small subtle" data-ab-restore="${v.id}">Restaurar</button></div></li>`).join(''):'<li class="ab-empty">Aún no hay versiones. Se crean solas al hacer cambios (máximo una cada 10 minutos, se guardan las últimas 20).</li>';
    box.innerHTML=`<div class="ab-status ${s.cls}"><span class="ab-dot"></span><div><strong>Copia automática</strong><p>${esc(s.text)}</p></div></div>
      <div class="ab-actions">${choices}${extra}</div>
      ${m==='download'?`<label class="ab-every">Descargar como máximo cada<select data-ab-every>${[5,10,15,30,60].map(n=>`<option value="${n}"${+st.settings.downloadEveryMin===n?' selected':''}>${n} minutos</option>`).join('')}</select></label>`:''}
      <p class="ab-help">${supportsFolder()?'Recomendado: elige una carpeta (por ejemplo en Documentos, OneDrive o una USB). MiAula guarda <b>MiAula_Prepa_ultima_copia.json</b> en cada cambio y una copia por día con la fecha.':'Este navegador no permite escribir en una carpeta; usa las descargas automáticas o abre MiAula en Chrome o Edge de computadora para elegir una carpeta.'} Para recuperar, usa «Restaurar» con el archivo .json.</p>
      <details class="ab-versions"><summary>Versiones internas (${versions.length})</summary><ul>${vlist}</ul></details>`;
    box.querySelectorAll('[data-ab]').forEach(b=>b.onclick=()=>({folder:chooseFolder,file:chooseFile,download:useDownloads,off:turnOff,reauth:reauthorize,force:forceNow})[b.dataset.ab]?.());
    box.querySelector('[data-ab-every]')?.addEventListener('change',e=>setEvery(e.target.value));
    box.querySelectorAll('[data-ab-dl]').forEach(b=>b.onclick=()=>downloadVersion(b.dataset.abDl));
    box.querySelectorAll('[data-ab-restore]').forEach(b=>b.onclick=()=>restoreVersion(b.dataset.abRestore));
  }
  let renderQueued=false;
  function render(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;renderChip();renderPanel();});}
  function openPanel(){
    if(st.needsPermission){reauthorize();return;}
    try{if(typeof goView==='function')goView('more');}catch{}
    setTimeout(()=>document.getElementById('autoBackupPanel')?.scrollIntoView({behavior:'smooth',block:'center'}),250);
  }

  // ---------- Arranque ----------
  async function init(){
    wrap();
    try{
      st.settings={...st.settings,...(await kvGet('settings')||{})};
      const last=await kvGet('last');if(last){st.lastHash=last.hash||'';st.lastCounts=last.counts||null;st.lastAt=last.at?new Date(last.at):null;}
      st.lastDownloadAt=+(await kvGet('lastDownloadAt'))||0;
      const vs=await listVersions();st.lastVersionAt=vs[0]?new Date(vs[0].at).getTime():0;
      if(st.settings.mode==='folder'||st.settings.mode==='file'){
        st.handle=await kvGet('handle')||null;
        if(!st.handle){st.settings.mode='off';}
        else if(!(await permissionOk(st.handle,false)))st.needsPermission=true;
      }
    }catch(e){console.error(e);st.lastError=e?.message||String(e);}
    st.ready=true;
    document.getElementById('autoBackupChip')?.addEventListener('click',openPanel);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&st.timer&&st.settings.mode!=='download')run();});
    render();
    schedule(); // revisa al abrir: si los datos cambiaron desde la última copia, se guarda.
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();

  return {run,schedule,status,render,chooseFolder,chooseFile,useDownloads,turnOff,listVersions,restoreVersion,_state:st,_useHandle:useHandle};
})();
