'use strict';
// Prueba MiAula 2.13.0 · Prepa: copia automática en cada cambio, versiones internas, pausa de seguridad,
// versión de un solo archivo HTML (file://) y tema Alegre.
// Uso: APP_URL=http://localhost:8000/index.html [SINGLE=dist/MiAula_Prepa_X.html] node tests/e2e/autocopia.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8775/index.html';
const SINGLE=process.env.SINGLE||'';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-autocopia-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);

// Carpeta simulada (File System Access API) para poder probar sin el selector del sistema.
const FAKE_FS=()=>{
  window.__abFiles={};window.__abWrites=0;
  const fileHandle=name=>({kind:'file',name,async createWritable(){let buf='';return {async write(b){buf+=typeof b==='string'?b:await b.text();},async close(){window.__abFiles[name]=buf;window.__abWrites++;}};},async queryPermission(){return 'granted';},async requestPermission(){return 'granted';}});
  window.showDirectoryPicker=async()=>({kind:'directory',name:'Copias MiAula',async getFileHandle(n){return fileHandle(n);},async queryPermission(){return 'granted';},async requestPermission(){return 'granted';}});
};
const latest=p=>p.evaluate(()=>{const t=window.__abFiles['MiAula_Prepa_ultima_copia.json'];return t?JSON.parse(t):null;});

(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',acceptDownloads:true});
  await ctx.addInitScript(FAKE_FS);
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1600);

  check('Tema Alegre claro por omisión',await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='light'&&getComputedStyle(document.documentElement).getPropertyValue('--primary').trim().toUpperCase()==='#6A4DF4'));
  check('Chip de copia automática en el encabezado',await p.evaluate(()=>!!$('#autoBackupChip')&&$('#autoBackupChip').classList.contains('off')));
  await p.evaluate(()=>goView('more'));await wait(p,600);
  check('Panel de copia automática dentro de Respaldo',await p.evaluate(()=>$('#autoBackupPanel').textContent.includes('Copia automática')&&!!document.querySelector('#autoBackupPanel [data-ab="folder"]')));

  // ---------- Datos de prueba ----------
  const gid=await p.evaluate(async()=>{const gid=await MiAulaDB.add('groups',{name:'4B',discipline:'Química',total_periods:3,active:1,current_period:1,closed_periods:[],created_at:new Date().toISOString()});
    for(let i=0;i<24;i++){await MiAulaDB.add('students',{group_id:gid,paternal_last_name:'Ap'+String(i).padStart(2,'0'),maternal_last_name:'X',given_names:'Al'+i,name:'Ap'+i+' X Al'+i,active:1,student_code:'C'+i});}
    return gid;});
  await wait(p,3500);
  await p.reload();await wait(p,1500);
  await p.evaluate(gid=>setContextGroup(gid,{propagate:true,refresh:true}),gid);await wait(p,500);
  const vers=await p.evaluate(async()=>(await MiAulaAutoBackup.listVersions()).length);
  check('Sin destino elegido igual se guarda una versión interna al haber cambios',vers>=1,String(vers));

  // ---------- Carpeta ----------
  await p.evaluate(()=>goView('more'));await wait(p,400);
  await p.click('#autoBackupPanel [data-ab="folder"]');await wait(p,1500);
  const files=await p.evaluate(()=>Object.keys(window.__abFiles));
  const day=files.find(f=>/^MiAula_Prepa_copia_\d{4}-\d{2}-\d{2}\.json$/.test(f));
  const f1=await latest(p);
  check('Al elegir carpeta escribe la última copia y la copia del día',files.includes('MiAula_Prepa_ultima_copia.json')&&!!day,files.join(', '));
  check('La copia tiene el formato de respaldo de MiAula con los alumnos',f1?.format==='MiAulaMobileBackup'&&f1.stores.students.length===24,`${f1?.format} · ${f1?.stores?.students?.length}`);
  check('Chip en verde «Copia ✓»',await p.evaluate(()=>$('#autoBackupChip').classList.contains('ok')&&$('#autoBackupChip').textContent.includes('Copia')));
  check('Recordatorio de respaldo actualizado',await p.evaluate(()=>!!localStorage.getItem('miaula:lastBackupAt')));

  // ---------- Cada cambio actualiza la copia ----------
  const w0=await p.evaluate(()=>window.__abWrites);
  await p.evaluate(async gid=>{await MiAulaDB.add('activities',{group_id:gid,title:'Práctica 1',activity_type:'Práctica',activity_date:'2026-10-28',max_score:10,weight:1,period:'1'});},gid);
  await wait(p,600);
  const early=await p.evaluate(()=>window.__abWrites);
  await wait(p,3200);
  const f2=await latest(p);
  check('Espera a que terminen los cambios (no escribe en cada tecla)',early===w0,`${w0} → ${early}`);
  check('Tras un cambio la copia se actualiza sola (actividad nueva incluida)',f2.stores.activities.some(a=>a.title==='Práctica 1'),String(f2.stores.activities.length));
  // Cambio desde la interfaz: pase de lista real
  await p.evaluate(async()=>{goView('attendance');});await wait(p,500);
  await p.click('#loadAttendance');await wait(p,900);
  await p.evaluate(()=>document.querySelector('#attendanceList .status-btn[data-status="P"]')?.click());await wait(p,500);
  await p.evaluate(()=>$('#saveAttendance')?.click());await wait(p,3800);
  const f3=await latest(p);
  check('Pasar lista desde la pantalla también genera copia',f3.stores.attendance.length>0,String(f3.stores.attendance.length));
  const w1=await p.evaluate(()=>window.__abWrites);
  await p.evaluate(()=>MiAulaAutoBackup.run());await wait(p,500);
  check('Si no hubo cambios no vuelve a escribir',await p.evaluate(()=>window.__abWrites)===w1);

  // ---------- Pausa de seguridad ----------
  await p.evaluate(async gid=>{const st=await MiAulaDB.groupStudents(gid,{includeInactive:true});for(const s of st.slice(0,22))await MiAulaDB.remove('students',s.id);},gid);
  await wait(p,3800);
  const paused=await latest(p);
  check('Si desaparece más de la mitad de los datos NO se sobrescribe la copia',paused.stores.students.length===24,String(paused.stores.students.length));
  check('Aviso «Copia en pausa» con opción de guardar de todos modos',await p.evaluate(()=>$('#autoBackupChip').classList.contains('warn')&&!!document.querySelector('#autoBackupPanel [data-ab="force"]')));
  await p.evaluate(()=>goView('more'));await wait(p,400);
  await p.click('#autoBackupPanel [data-ab="force"]');await wait(p,1200);
  check('«Guardar de todos modos» escribe la copia',(await latest(p)).stores.students.length===2);

  // ---------- Versiones internas y restauración ----------
  const vl=await p.evaluate(async()=>(await MiAulaAutoBackup.listVersions()).map(v=>v.counts.students));
  check('Versiones internas guardadas (incluida la de antes del borrado)',vl.includes(24)&&vl.length>=2,JSON.stringify(vl));
  const vid=await p.evaluate(async()=>(await MiAulaAutoBackup.listVersions()).find(v=>v.counts.students===24).id);
  await p.evaluate(id=>MiAulaAutoBackup.restoreVersion(id),vid);await wait(p,2500);
  check('Restaurar una versión interna recupera los alumnos borrados',await p.evaluate(async()=>(await MiAulaDB.all('students')).length)===24);

  // ---------- Descargas automáticas ----------
  const ctx2=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',acceptDownloads:true});
  await ctx2.addInitScript(()=>{delete window.showDirectoryPicker;delete window.showSaveFilePicker;});
  const p2=await ctx2.newPage();p2.on('pageerror',e=>errors.push(e.message));p2.on('dialog',d=>d.accept());
  await p2.goto(APP);await wait(p2,1500);
  await p2.evaluate(()=>goView('more'));await wait(p2,500);
  check('Sin acceso a carpetas ofrece descargas automáticas como opción principal',await p2.evaluate(()=>!document.querySelector('#autoBackupPanel [data-ab="folder"]')&&document.querySelector('#autoBackupPanel [data-ab="download"]').classList.contains('primary')));
  const dl=p2.waitForEvent('download',{timeout:8000}).catch(()=>null);
  await p2.click('#autoBackupPanel [data-ab="download"]');
  const d1=await dl;
  check('Al activar descargas baja una copia .json',!!d1&&/MiAula_Prepa_copia_automatica_.*\.json$/.test(d1.suggestedFilename()),d1?.suggestedFilename());
  let second=false;p2.on('download',()=>{second=true;});
  await p2.evaluate(async()=>{await MiAulaDB.add('groups',{name:'Z',discipline:'Z',total_periods:3,active:1,current_period:1,created_at:new Date().toISOString()});});
  await wait(p2,4000);
  check('Respeta el intervalo: no descarga en cada cambio',!second&&await p2.evaluate(()=>!!MiAulaAutoBackup._state.timer));
  await ctx2.close();

  // ---------- Tema oscuro conserva la preferencia ----------
  await p.evaluate(()=>$('#themeToggle').click());
  check('Botón de tema cambia a «Noche alegre» y lo recuerda',await p.evaluate(()=>!document.documentElement.getAttribute('data-theme')&&localStorage.getItem('miaula:theme')==='dark'));
  await p.screenshot({path:path.join(OUT,'autocopia-noche.png')});

  // ---------- Versión de un solo archivo ----------
  if(SINGLE){
    const ctx3=await browser.newContext({viewport:{width:1340,height:860}});
    const p3=await ctx3.newPage();const errs3=[],reqs=[];p3.on('pageerror',e=>errs3.push(e.message));p3.on('dialog',d=>d.accept());
    p3.on('request',r=>{const u=r.url();if(!u.startsWith('data:')&&!u.startsWith('blob:'))reqs.push(u);});
    const url='file://'+path.resolve(SINGLE);
    await p3.goto(url);await wait(p3,1800);
    const ok=await p3.evaluate(async()=>{const id=await MiAulaDB.add('groups',{name:'HTML',discipline:'Archivo',total_periods:3,active:1,current_period:1,created_at:new Date().toISOString()});return {id,single:window.MIAULA_SINGLE_FILE===true,ab:typeof MiAulaAutoBackup==='object',sw:!!navigator.serviceWorker?.controller};});
    await p3.reload();await wait(p3,1500);
    const kept=await p3.evaluate(async()=>(await MiAulaDB.all('groups')).some(g=>g.name==='HTML'));
    check('Un solo archivo HTML: abre con doble clic (file://) y guarda datos',ok.single&&ok.ab&&kept&&!ok.sw,JSON.stringify(ok));
    check('Un solo archivo HTML: no pide ningún otro archivo',reqs.every(u=>u===url||u.startsWith(url)),reqs.filter(u=>!u.startsWith(url)).join(' | '));
    check('Un solo archivo HTML: sin errores de JavaScript',errs3.length===0,errs3.join(' | '));
    await p3.screenshot({path:path.join(OUT,'un-solo-archivo.png')});
    await ctx3.close();
  }

  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(r=>!r.ok);
  fs.writeFileSync(path.join(OUT,'resultado-autocopia.json'),JSON.stringify(results,null,2));
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
