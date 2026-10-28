'use strict';
// Prueba de regresión: funciones que ya existían antes de 2.8.0 siguen funcionando.
// Uso: APP_URL=http://localhost:8000/index.html [OUT=carpeta] node tests/e2e/regresion.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8769/index.html';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-reg-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);

(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',acceptDownloads:true});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1500);

  // ---------- Grupos y alumnos ----------
  await p.evaluate(()=>goView('groups'));await wait(p,500);
  const gf='#groupForm';
  await p.fill(`${gf} [name="grade"]`,'3er semestre').catch(()=>{});
  await p.fill(`${gf} [name="name"]`,'3B');await p.fill(`${gf} [name="discipline"]`,'Cultura Digital');
  await p.click(`${gf} button[type="submit"]`);await wait(p,800);
  const gid=await p.evaluate(async()=>(await MiAulaDB.all('groups')).find(g=>g.name==='3B')?.id);
  check('Crear grupo desde el formulario',!!gid);
  await p.evaluate(async gid=>{for(const [a,b,c] of [['Zavala','Ruiz','Ana'],['Bravo','Soto','Luis'],['Mena','Cruz','Eva'],['Ortiz','Lara','Iván'],['Cano','Vega','Rosa'],['Luna','Paz','Omar']]){const d={group_id:gid,paternal_last_name:a,maternal_last_name:b,given_names:c,active:1,student_code:await MiAulaDB.nextStudentCode(),created_at:new Date().toISOString()};d.name=`${a} ${b} ${c}`;await MiAulaDB.add('students',d);}await MiAulaDB.reorganizeGroup(gid,true);},gid);
  await p.evaluate(gid=>viewStudents(gid),gid);await wait(p,600);
  const mf='#manualStudentForm';
  const hasForm=await p.$(mf);
  if(hasForm){await p.fill(`${mf} [name="paternal_last_name"]`,'Aguirre');await p.fill(`${mf} [name="maternal_last_name"]`,'Nava');await p.fill(`${mf} [name="given_names"]`,'Beto');await p.click(`${mf} button`);await wait(p,800);}
  const order=await p.evaluate(async gid=>(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number).map(s=>s.paternal_last_name),gid);
  check('Agregar alumno y orden por apellido paterno A–Z',hasForm&&order[0]==='Aguirre'&&order.join()===[...order].sort((a,b)=>a.localeCompare(b,'es')).join(),order.join(', '));
  await p.evaluate(()=>closeModal());
  await p.evaluate(()=>{refreshGroups();});await wait(p,500);
  await p.evaluate(async gid=>{await setContextGroup(gid);},gid);await wait(p,500);
  const ids=await p.evaluate(async gid=>(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number).map(s=>s.id),gid);

  // ---------- Asistencia por horas ----------
  await p.evaluate(()=>goView('attendance'));await wait(p,500);
  await p.fill('#attendanceDate','2026-10-19');await p.selectOption('#attendanceHours','3');await p.click('#loadAttendance');await wait(p,700);
  const allF=await p.evaluate(()=>[...document.querySelectorAll('#attendanceList .status-btn.active')].every(b=>b.dataset.status==='F'));
  check('Pase de lista: todos inician en Falta',allF);
  await p.click('#attendanceList .student-row:nth-child(1) .status-btn[data-status="P"]');
  await p.click('#attendanceList .student-row:nth-child(2) .status-btn[data-status="R"]');
  await p.click('#attendanceList .student-row:nth-child(3) .status-btn[data-status="J"]');
  await p.click('#saveAttendance');await wait(p,900);
  const att=await p.evaluate(async gid=>(await MiAulaDB.byIndex('attendance','group_date',[gid,'2026-10-19'])).map(a=>a.status+a.class_hours).sort().join(','),gid);
  check('Guardar asistencia con 3 horas (P, R, J y faltas)',att.includes('P3')&&att.includes('R3')&&att.includes('J3')&&(att.match(/F3/g)||[]).length===4,att);
  // corregir desde historial: el registro se edita, no se duplica
  const before=await p.evaluate(async()=> (await MiAulaDB.all('attendance')).length);
  await p.evaluate(sid=>openAttendanceHistory(sid),ids[3]);await wait(p,500);
  await p.selectOption('.attendance-history-status >> nth=0','J');await p.click('#saveAttendanceHistory');await wait(p,800);
  const corr=await p.evaluate(async sid=>({n:(await MiAulaDB.all('attendance')).length,st:(await MiAulaDB.byIndex('attendance','student_id',sid))[0].status}),ids[3]);
  check('Corregir asistencia anterior edita el registro (sin duplicar ni borrar el día)',corr.n===before&&corr.st==='J');
  // % faltas
  const pct=await p.evaluate(async sid=>attendanceTotals(await MiAulaDB.byIndex('attendance','student_id',sid)).absencePct,ids[4]);
  check('Porcentaje de faltas = horas falta / horas computables',pct===100,`${pct}%`);

  // ---------- Pendiente Secretaría ----------
  await p.click('#loadAttendance');await wait(p,600);
  await p.evaluate(()=>markSecretaryPending(5));await wait(p,700);
  const sec=await p.evaluate(async sid=>{const s=await MiAulaDB.get('students',sid);const t=attendanceTotals(await MiAulaDB.byIndex('attendance','student_id',sid));return {pend:s.secretary_pending,S:t.S,total:t.total};},ids[5]);
  check('Pendiente Secretaría: no cuenta como falta ni asistencia',sec.pend===1&&sec.S===3&&sec.total===0,JSON.stringify(sec));
  await p.evaluate(sid=>resolveSecretaryPending(sid),ids[5]);await wait(p,400);await p.click('#secretaryKeepsStudent');await wait(p,700);
  check('Secretaría: «Sí continúa en el grupo» lo regresa a normal',await p.evaluate(async sid=>(await MiAulaDB.get('students',sid)).secretary_pending===0,ids[5]));

  // ---------- Esquema de evaluación ----------
  await p.evaluate(()=>goView('grading'));await wait(p,700);
  // 2.11.0: el parcial abierto usa Trabajos + Principal + Asistencia (10% fija) → 50/40/10 por defecto.
  await p.fill('#workPct','60');await p.click('#schemeForm button[type="submit"]');await wait(p,500);
  const badSaved=await p.evaluate(async gid=>(await MiAulaDB.get('gradingSchemes',`${gid}:1`))?.work_pct,gid);
  await p.fill('#workPct','50');await p.click('#schemeForm button[type="submit"]');await wait(p,700);
  const sch=await p.evaluate(async gid=>await MiAulaDB.get('gradingSchemes',`${gid}:1`),gid);
  check('Porcentajes: rechaza si no suman 100 y guarda 50/40 + Asistencia 10',badSaved!==60&&sch.work_pct===50&&sch.project_pct===40&&sch.attendance_pct===10&&sch.values_pct===0&&sch.attitudes_pct===0&&sch.mode_locked===true,JSON.stringify([sch.work_pct,sch.project_pct,sch.values_pct,sch.attitudes_pct,sch.attendance_pct]));
  check('Parcial: Valores y Actitudes ocultos, Asistencia visible y editable (Prepa 2.12.0)',await p.evaluate(()=>$('#valuesSchemeItem').classList.contains('hidden')&&$('#attitudesSchemeItem').classList.contains('hidden')&&!$('#attendanceSchemeItem').classList.contains('hidden')&&!$('#attendancePct').readOnly&&$('#schemeTotal').textContent==='100%'));

  // ---------- Actividad con número, cuaderno, Máx., editar fecha ----------
  await p.evaluate(()=>goView('activities'));await wait(p,600);
  await p.fill('#activityForm input[name="title"]','Mapa conceptual');await p.fill('#activityDate','2026-10-16');
  await p.click('#activityForm button[type="submit"]');await wait(p,800);
  const aid=await p.evaluate(async()=>(await MiAulaDB.all('activities')).find(a=>a.title==='Mapa conceptual')?.id);
  check('Crear actividad con número (como antes)',!!aid&&await p.evaluate(async aid=>!(await MiAulaDB.get('activities',aid)).grading_mode,aid));
  await p.evaluate(()=>{localStorage.setItem('miaula:notebookKeypad','off');goView('notebook');});await wait(p,900);
  const inp=p.locator(`.notebook-score-input[data-activity="${aid}"]`);
  await inp.nth(0).fill('7');await inp.nth(1).fill('NP');await inp.nth(2).fill('9.5');await wait(p,1500);
  const nb=await p.evaluate(async a=>{const o=[];for(const sid of a.ids.slice(0,3)){const g=await MiAulaDB.firstByIndex('grades','unique_key',[a.aid,sid]);o.push(g?.score??g?.status);}return o;},{aid,ids});
  check('Cuaderno: escribir 7, NP y 9.5 se guarda solo',JSON.stringify(nb)==='[7,"NP",9.5]',JSON.stringify(nb));
  check('Indicador Máx. visible en la actividad',await p.evaluate(()=>!!document.querySelector('.activity-head .activity-daily-max')));
  await p.evaluate(aid=>{goView('activities');setTimeout(()=>editActivityDate(aid),400);},aid);await wait(p,1000);
  await p.fill('#modalBody input[type="date"]','2026-10-21');await p.click('#modalBody button[type="submit"], #modalBody .btn.primary');await wait(p,800);
  const ed=await p.evaluate(async a=>({date:(await MiAulaDB.get('activities',a.aid)).activity_date,g:(await MiAulaDB.firstByIndex('grades','unique_key',[a.aid,a.ids[0]]))?.score}),{aid,ids});
  check('Editar fecha de actividad: mismo ID y conserva calificaciones',ed.date==='2026-10-21'&&ed.g===7,JSON.stringify(ed));

  // ---------- Vista alumno ----------
  await p.evaluate(()=>goView('notebook'));await wait(p,900);
  await p.evaluate(sid=>openStudentView('1',sid),ids[3]);await wait(p,600);
  await p.click(`#studentDrawer .student-quick-row button:has-text("8")`);await p.click('#studentSaveNext');await wait(p,900);
  const dv=await p.evaluate(async a=>(await MiAulaDB.firstByIndex('grades','unique_key',[a.aid,a.ids[3]]))?.score,{aid,ids});
  check('Vista alumno: botón rápido 8 y «Guardar y siguiente»',dv===8,String(dv));
  await p.evaluate(()=>closeStudentDrawer());

  // ---------- Puntos extra ----------
  await p.evaluate(sid=>openExtraModal('1',sid),ids[0]);await wait(p,500);
  await p.evaluate(sid=>addManualExtra('good','1',sid,3),ids[0]);await wait(p,800);
  await p.evaluate(sid=>addManualExtra('bad','1',sid,1),ids[0]);await wait(p,800);
  await p.selectOption('#extraTargetActivity',String(aid));await p.fill('#extraUsePoints','2');
  await p.evaluate(sid=>applyExtraToActivity('1',sid),ids[0]);await wait(p,900);
  const ex=await p.evaluate(async a=>({g:(await MiAulaDB.firstByIndex('grades','unique_key',[a.aid,a.ids[0]])).score,s:await getStudentExtraSummary(+(await MiAulaDB.get('activities',a.aid)).group_id,a.ids[0],'1')}),{aid,ids});
  check('Puntos extra: +3, −1 y usar 2 en la actividad (7 → 9, saldo +1)',ex.g===9&&ex.s.goodAvailable===1&&ex.s.bad===1,JSON.stringify(ex));
  await p.fill('#extraUsePoints','2');await p.evaluate(sid=>applyExtraToActivity('1',sid),ids[0]);await wait(p,600);
  check('No permite gastar más de lo disponible',await p.evaluate(async a=>(await MiAulaDB.firstByIndex('grades','unique_key',[a.aid,a.ids[0]])).score,{aid,ids})===9);
  await p.evaluate(sid=>clearStudentExtras('1',sid),ids[0]);await wait(p,800);
  const cl=await p.evaluate(async a=>({g:(await MiAulaDB.firstByIndex('grades','unique_key',[a.aid,a.ids[0]])).score,n:(await getStudentExtraRows(+(await MiAulaDB.get('activities',a.aid)).group_id,a.ids[0],'1')).length}),{aid,ids});
  check('Limpiar puntos deja saldo 0 sin revertir la calificación',cl.g===9&&cl.n===0);
  await p.evaluate(()=>closeModal());
  // rúbrica: no ofrece usar puntos
  const rid=await p.evaluate(async gid=>{const snap=await rubricSnapshotFromRef('bank:bank-cotejo-tarea');return MiAulaDB.add('activities',{group_id:gid,title:'Tarea cotejo',activity_type:'Trabajo',activity_date:'2026-10-21',max_score:10,weight:1,period:'1',grading_mode:'rubric',rubric:snap,created_at:new Date().toISOString()});},gid);
  await p.evaluate(()=>loadNotebook());await wait(p,700);
  await p.evaluate(sid=>openExtraModal('1',sid),ids[1]);await wait(p,500);
  check('Puntos extra no se ofrecen para actividades con rúbrica (evita perder puntos)',await p.evaluate(rid=>![...document.querySelectorAll('#extraTargetActivity option')].some(o=>o.value===String(rid)),rid));
  await p.evaluate(()=>closeModal());

  // ---------- Asistencia automática y final ----------
  await p.evaluate(()=>goView('grading'));await wait(p,800);
  const gt=await p.evaluate(()=>({head:[...document.querySelectorAll('#gradingTable thead th')].map(t=>t.textContent).join('|'),cell:document.querySelector('#gradingTable tbody tr td:nth-child(5)')?.textContent,btn:$('#fillValues10').classList.contains('hidden')&&$('#saveComponents').classList.contains('hidden')}));
  check('Tabla del parcial: columna Asistencia automática (P → 10, 1/1 clases) sin Valores/Actitudes',gt.head.includes('Asistencia')&&!gt.head.includes('Valores')&&gt.cell.startsWith('10')&&gt.cell.includes('1/1')&&gt.btn,JSON.stringify(gt));

  // ---------- Proyecto con el instrumento anterior ----------
  await p.evaluate(()=>goView('evaluation'));await wait(p,800);
  await p.click('details.legacy-instruments summary').catch(()=>{});await wait(p,200);
  await p.fill('#instrumentName','Rúbrica clásica');
  await p.evaluate(()=>{const rows=document.querySelectorAll('#criteriaRows .crit-name');rows[0].value='Contenido';});
  await p.click('#instrumentForm button[type="submit"]');await wait(p,700);
  const iid=await p.evaluate(async()=>(await MiAulaDB.all('instruments')).find(i=>i.name==='Rúbrica clásica')?.id);
  await p.selectOption('#evalInstrument','legacy:'+iid);await wait(p,300);
  await p.click('#evalCriteria .level-buttons button[data-value="4"]');
  await p.fill('#evalTitle','Proyecto final');
  await p.check(`#evalStudents input[value="${ids[0]}"]`);
  await p.click('#saveEvaluation');await wait(p,900);
  const pr=await p.evaluate(async a=>{const r=await computeGroupGrading(a.gid,'1');return {ev:(await MiAulaDB.all('evaluations')).length,pa:r.students.find(s=>s.id===a.sid)?.principal_avg,fin:r.students.find(s=>s.id===a.sid)?.final_grade};},{gid,sid:ids[0]});
  check('Proyecto con rúbrica clásica: guarda la evaluación y calcula el componente',pr.ev===1&&pr.pa===10&&pr.fin!=null,JSON.stringify(pr));

  // ---------- Equipos ----------
  await p.evaluate(()=>openDynamicsMode('teams'));await wait(p,600);
  await p.click('#generateTeams');await wait(p,900);
  const t=await p.evaluate(async gid=>(await readSavedTeams(gid)).teams.map(x=>x.member_ids.length),gid);
  check('Equipos: crear automáticamente (usa todos, sin depender de asistencia)',t.reduce((a,b)=>a+b,0)===ids.length,JSON.stringify(t));
  const gradesBefore=await p.evaluate(async()=>(await MiAulaDB.all('grades')).length);
  await p.click('#clearTeams');await wait(p,800);
  check('Limpiar equipos borra solo los equipos, no calificaciones',await p.evaluate(async a=>(await readSavedTeams(a.gid)).teams.length===0&&(await MiAulaDB.all('grades')).length===a.n,{gid,n:gradesBefore}));

  // ---------- Ruleta + puntos ----------
  await p.evaluate(()=>{document.querySelector('#dynamicsPresentOnly').checked=false;openDynamicsMode('roulette');});await wait(p,700);
  await p.click('#spinWheel');await wait(p,4900);
  const winner=await p.evaluate(()=>document.querySelector('#rouletteName').textContent);
  await p.click('#rouletteGood');await wait(p,500);
  check('Ruleta: gira, muestra nombre y registra Extra +',winner&&winner!=='Gira la ruleta'&&await p.evaluate(async()=>(await MiAulaDB.all('extraPoints')).some(r=>r.source==='roulette')));
  check('Ruleta: un punto por giro (el botón se bloquea después)',await p.evaluate(()=>$('#rouletteGood').disabled));
  // Límite +2 por día al mismo alumno
  const lim=await p.evaluate(async()=>{const s=dynamics.lastWinner;dynamics.winnerRated=false;await recordRouletteExtra('good');dynamics.winnerRated=false;await recordRouletteExtra('good');return (await MiAulaDB.all('extraPoints')).filter(r=>r.source==='roulette'&&r.student_id===s.id&&r.kind==='good').length;});
  check('Ruleta: máximo +2 por día para el mismo alumno',lim===2,`${lim} puntos`);

  // ---------- Excel ----------
  await p.evaluate(gid=>{goView('more');if($('#exportGroup'))$('#exportGroup').value=String(gid);},gid);await wait(p,600);
  const exportBtn=await p.$('#exportExcel, #exportAllExcel, #exportBtn, [onclick*="exportExcel"]');
  let xlsxOk=false;
  if(exportBtn){const [dl]=await Promise.all([p.waitForEvent('download',{timeout:10000}).catch(()=>null),exportBtn.click().then(()=>p.click('#exportAsIs'))]);if(dl){const f=await dl.path();xlsxOk=fs.readFileSync(f).slice(0,2).toString()==='PK';}}
  check('Exportar todo a Excel descarga un .xlsx válido',xlsxOk);
  await p.evaluate(()=>goView('notebook'));await wait(p,700);
  const [dl2]=await Promise.all([p.waitForEvent('download',{timeout:10000}).catch(()=>null),p.click('#notebookExcel').then(()=>p.click('#exportAsIs'))]);
  let nbx=false;if(dl2){nbx=fs.readFileSync(await dl2.path()).slice(0,2).toString()==='PK';}
  check('Generar Excel del Cuaderno descarga un .xlsx válido',nbx);

  // ---------- Cerrar parcial ----------
  await p.evaluate(()=>goView('grading'));await wait(p,700);
  await p.click('#closePeriodBtn');await wait(p,1200);
  const cp=await p.evaluate(async gid=>{const g=await MiAulaDB.get('groups',gid);const acts=(await MiAulaDB.byIndex('activities','group_id',gid)).length;const inst=(await MiAulaDB.all('instruments')).length;return {cur:g.current_period,closed:g.closed_periods,acts,inst};},gid);
  check('Cerrar parcial: pasa al Parcial 2, no borra actividades ni instrumentos',cp.cur===2&&cp.acts>=2&&cp.inst>=1,JSON.stringify(cp));
  await p.evaluate(()=>goView('activities'));await wait(p,700);
  check('El Parcial 2 inicia limpio en Calificaciones',await p.evaluate(()=>/Parcial 2 limpio/.test($('#activityCards').textContent)));

  // ---------- Dar de baja y reactivar ----------
  await p.evaluate(a=>deactivateStudent(a.sid,a.gid),{sid:ids[4],gid});await wait(p,700);
  const baja=await p.evaluate(async sid=>({a:(await MiAulaDB.get('students',sid)).active,att:(await MiAulaDB.byIndex('attendance','student_id',sid)).length}),ids[4]);
  await p.evaluate(a=>reactivateStudent(a.sid,a.gid),{sid:ids[4],gid});await wait(p,700);
  const re=await p.evaluate(async sid=>(await MiAulaDB.get('students',sid)).active,ids[4]);
  check('Dar de baja conserva historial y se puede reactivar',baja.a===0&&baja.att>0&&re===1);

  // ---------- Presentación, teclado, tema ----------
  await p.evaluate(()=>goView('notebook'));await wait(p,700);
  await p.click('#notebookPresentation');await wait(p,500);
  const pres=await p.evaluate(()=>document.body.classList.contains('notebook-focus'));
  await p.click('#notebookPresentation');await wait(p,300);
  check('Modo Presentación del cuaderno entra y sale',pres&&!(await p.evaluate(()=>document.body.classList.contains('notebook-focus'))));
  await p.click('#themeToggle');const th=await p.evaluate(()=>document.documentElement.dataset.theme);await p.click('#themeToggle');
  check('Botón de modo claro/oscuro',th==='light');

  // ---------- Respaldo y restauración ----------
  await p.evaluate(()=>goView('more'));await wait(p,500);
  const [bk]=await Promise.all([p.waitForEvent('download'),p.click('#backupBtn')]);
  const bkPath=path.join(OUT,'respaldo.json');fs.copyFileSync(await bk.path(),bkPath);
  const counts=await p.evaluate(async()=>{const o={};for(const s of MiAulaDB.stores)o[s]=(await MiAulaDB.all(s)).length;return o;});
  const ctx2=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block'});const p2=await ctx2.newPage();p2.on('dialog',d=>d.accept());p2.on('pageerror',e=>errors.push('restaurar: '+e.message));
  await p2.goto(APP);await wait(p2,1500);await p2.evaluate(()=>goView('more'));await wait(p2,400);
  await p2.setInputFiles('#restoreFile',bkPath);await wait(p2,2000);
  const counts2=await p2.evaluate(async()=>{const o={};for(const s of MiAulaDB.stores)o[s]=(await MiAulaDB.all(s)).length;return o;});
  check('Respaldo descargado y restaurado en otra «tablet»: mismos registros en los 11 almacenes',JSON.stringify(counts)===JSON.stringify(counts2),JSON.stringify(counts2));
  const same=await p2.evaluate(async gid=>JSON.stringify((await computeGroupGrading(gid,'1')).students.map(s=>[s.work_avg,s.final_grade])),gid);
  const orig=await p.evaluate(async gid=>JSON.stringify((await computeGroupGrading(gid,'1')).students.map(s=>[s.work_avg,s.final_grade])),gid);
  check('Después de restaurar, los promedios son idénticos',same===orig);
  await ctx2.close();

  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(r=>!r.ok);
  fs.writeFileSync(path.join(OUT,'resultado-regresion.json'),JSON.stringify(results,null,2));
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
