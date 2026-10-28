'use strict';
// Prueba MiAula 2.11.0: asistencia por parcial, Asistencia 10% automática, modo consulta de parciales pasados
// y barra inferior sin «Respaldo». Simula el caso real: Parcial 1 ya cerrado (con Valores/Actitudes)
// y asistencia guardada con versiones anteriores (sin campo `period`).
// Uso: APP_URL=http://localhost:8000/index.html node tests/e2e/asistencia-parcial.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8775/index.html';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-asistencia-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT,{recursive:true});
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);
(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',timezoneId:'America/Mexico_City'});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1400);
  // Cierre del Parcial 1: 26-oct-2026 a las 13:00 (hora de México) = 19:00 UTC
  const CLOSED='2026-10-26T19:00:00.000Z';
  const seed=await p.evaluate(async CLOSED=>{
    const gid=await MiAulaDB.add('groups',{name:'5A',discipline:'Asistencia (prueba)',school_year:'2026-2027',total_periods:3,active:1,current_period:2,closed_periods:[1],course_closed:false,last_period_closed_at:CLOSED,created_at:new Date().toISOString()});
    for(const [a,n] of [['Arce','Ana'],['Baez','Beto'],['Cruz','Caro'],['Diaz','Dani']]){const d={group_id:gid,paternal_last_name:a,maternal_last_name:'Prueba',given_names:n,active:1,student_code:'A'+a,created_at:new Date().toISOString()};d.name=`${a} Prueba ${n}`;await MiAulaDB.add('students',d);}
    await MiAulaDB.reorganizeGroup(gid,true);
    const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number),ids=st.map(s=>s.id);
    // Parcial 1 (cerrado) con Valores y Actitudes
    await MiAulaDB.put('gradingSchemes',{key:`${gid}:1`,group_id:gid,period:'1',work_pct:40,project_pct:40,values_pct:10,attitudes_pct:10,principal_type:'project',mode_locked:true});
    const a1=await MiAulaDB.add('activities',{group_id:gid,title:'Trabajo P1',activity_type:'Trabajo',activity_date:'2026-10-20',max_score:10,weight:1,period:'1',created_at:new Date().toISOString()});
    for(const s of st){
      await MiAulaDB.add('grades',{activity_id:a1,student_id:s.id,score:8,status:''});
      await MiAulaDB.put('studentComponents',{key:`${gid}:1:${s.id}`,group_id:gid,period:'1',student_id:s.id,values_score:9,attitudes_score:10});
      await MiAulaDB.add('evaluations',{group_id:gid,instrument_id:null,title:'Proyecto P1',student_id:s.id,grade:10,raw_score:10,details:{},period:'1',evaluation_date:'2026-10-22'});
    }
    // Parcial 2 en curso, ya con porcentajes guardados en 2.10.1 (40/40/10/10)
    await MiAulaDB.put('gradingSchemes',{key:`${gid}:2`,group_id:gid,period:'2',work_pct:40,project_pct:40,values_pct:10,attitudes_pct:10,principal_type:'project',mode_locked:false});
    const a2=await MiAulaDB.add('activities',{group_id:gid,title:'Trabajo P2',activity_type:'Trabajo',activity_date:'2026-10-27',max_score:10,weight:1,period:'2',created_at:new Date().toISOString()});
    for(const s of st)await MiAulaDB.add('grades',{activity_id:a2,student_id:s.id,score:8,status:''});
    for(const s of st)await MiAulaDB.add('evaluations',{group_id:gid,instrument_id:null,title:'Proyecto P2',student_id:s.id,grade:9,raw_score:9,details:{},period:'2',evaluation_date:'2026-10-27'});
    // Asistencia guardada con la versión anterior (sin `period`)
    const add=async(date,sid,status,updated,hours=1)=>MiAulaDB.add('attendance',{group_id:gid,student_id:sid,attendance_date:date,status,class_hours:hours,notes:'',updated_at:updated});
    for(const d of ['2026-10-20','2026-10-21','2026-10-22'])for(const [i,sid] of ids.entries())await add(d,sid,i===1&&d!=='2026-10-20'?'F':'P',`${d}T15:00:00.000Z`,2);
    // 26-oct: pase de lista ANTES del cierre (P1) — Ana falta
    for(const [i,sid] of ids.entries())await add('2026-10-26',sid,i===0?'F':'P','2026-10-26T16:00:00.000Z',2);
    // 27-oct: ya en Parcial 2 — Beto falta, Caro retardo
    for(const [i,sid] of ids.entries())await add('2026-10-27',sid,i===1?'F':i===2?'R':'P','2026-10-27T15:00:00.000Z',1);
    return {gid,ids};
  },CLOSED);
  const {gid,ids}=seed;
  const p1Expected=await p.evaluate(async gid=>{const r=await computeGroupGrading(gid,'1');return r.students.map(s=>s.final_grade);},gid);
  await p.reload();await wait(p,1600);

  // ---------- Asistencia por parcial ----------
  const stamped=await p.evaluate(async gid=>(await MiAulaDB.byIndex('attendance','group_id',gid)).map(r=>`${r.attendance_date}:${r.period}`).filter((v,i,a)=>a.indexOf(v)===i).sort(),gid);
  check('Registros anteriores quedan ubicados en su parcial (antes del cierre → P1, después → P2)',JSON.stringify(stamped)===JSON.stringify(['2026-10-20:1','2026-10-21:1','2026-10-22:1','2026-10-26:1','2026-10-27:2']),stamped.join(' '));
  const sameData=await p.evaluate(async gid=>(await MiAulaDB.byIndex('attendance','group_id',gid)).every(r=>r.status&&r.class_hours&&r.updated_at),gid);
  check('No se pierde ningún dato de asistencia (estado, horas y fecha intactos)',sameData&&await p.evaluate(async gid=>(await MiAulaDB.byIndex('attendance','group_id',gid)).length===20,gid));

  // ---------- Esquemas ----------
  const sch=await p.evaluate(async gid=>{const a=await getScheme(gid,'1'),b=await getScheme(gid,'2');return {p1:[a.work_pct,a.project_pct,a.values_pct,a.attitudes_pct,+a.attendance_pct||0].join('/'),p2:[b.work_pct,b.project_pct,b.values_pct,b.attitudes_pct,b.attendance_pct].join('/')};},gid);
  check('Parcial 1 (cerrado) conserva Valores y Actitudes tal como se calificó',sch.p1==='40/40/10/10/0',sch.p1);
  check('Parcial 2: Valores/Actitudes → Asistencia 10% fija (el 10% libre pasa a Trabajos)',sch.p2==='50/40/0/0/10',sch.p2);
  const p1Now=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.final_grade),gid);
  check('Las finales del Parcial 1 no cambian',JSON.stringify(p1Now)===JSON.stringify(p1Expected)&&p1Now[0]===9.1,JSON.stringify(p1Now));

  // ---------- Asistencia automática (P2) ----------
  const g2=await p.evaluate(async gid=>(await computeGroupGrading(gid,'2')).students.map(s=>[s.attendance_score,s.attendance_attended,s.attendance_classes,s.final_grade]),gid);
  check('Asistencia P2 cuenta solo clases del Parcial 2 (Ana 1/1 aunque faltó en P1)',g2[0][0]===10&&g2[0][2]===1,JSON.stringify(g2[0]));
  check('Falta en P2 baja la asistencia (Beto 0/1 → 0)',g2[1][0]===0&&g2[1][2]===1,JSON.stringify(g2[1]));
  check('Retardo cuenta como asistencia (Caro R → 10)',g2[2][0]===10,JSON.stringify(g2[2]));
  check('Final P2 = Trabajos 50% + Proyecto 40% + Asistencia 10% (Ana 8·.5+9·.4+10·.1 = 8.6)',g2[0][3]===8.6&&g2[1][3]===7.6,`${g2[0][3]} / ${g2[1][3]}`);

  // Pase de lista nuevo (UI) en P2: va al Parcial 2 y actualiza la asistencia
  await p.evaluate(async gid=>{await setContextGroup(gid);$('#attendanceGroup').value=String(gid);goView('attendance');},gid);await wait(p,600);
  await p.fill('#attendanceDate','2026-10-28');await p.click('#loadAttendance');await wait(p,700);
  const note2=await p.evaluate(()=>$('#attendancePeriodNote')?.textContent||'');
  check('Pase de lista indica a qué parcial cuenta (Parcial 2)',note2.includes('Parcial 2')&&!note2.includes('cerrado'),note2);
  for(const i of [1,3,4])await p.click(`#attendanceList .student-row:nth-child(${i}) .status-btn[data-status="P"]`);
  await p.click('#saveAttendance');await wait(p,900);
  const newRec=await p.evaluate(async gid=>(await MiAulaDB.byIndex('attendance','group_date',[gid,'2026-10-28'])).map(r=>r.period+r.status).sort().join(','),gid);
  check('Registro nuevo se guarda en el Parcial 2',newRec==='2F,2P,2P,2P',newRec);
  const beto=await p.evaluate(async a=>(await computeGroupGrading(a.gid,'2')).students.find(s=>s.id===a.sid),{gid,sid:ids[1]});
  check('Beto: 0 de 2 clases → 0; Ana 2/2 → 10 (se recalcula con cada pase de lista)',beto.attendance_score===0&&beto.attendance_classes===2);
  // Corregir una fecha del Parcial 1 (R → P con justificante) desde el pase de lista
  await p.fill('#attendanceDate','2026-10-21');await p.click('#loadAttendance');await wait(p,700);
  const note1=await p.evaluate(()=>$('#attendancePeriodNote')?.textContent||'');
  check('Fecha de un parcial cerrado: aviso «Parcial 1 · cerrado»',note1.includes('Parcial 1')&&note1.includes('cerrado'),note1);
  await p.click('#attendanceList .student-row:nth-child(2) .status-btn[data-status="P"]');await p.click('#saveAttendance');await wait(p,900);
  const fixed=await p.evaluate(async a=>(await MiAulaDB.firstByIndex('attendance','unique_key',[a.gid,a.sid,'2026-10-21'])),{gid,sid:ids[1]});
  check('La corrección queda en el Parcial 1 y no toca el Parcial 2',fixed.period==='1'&&fixed.status==='P'&&(await p.evaluate(async a=>(await computeGroupGrading(a.gid,'2')).students.find(s=>s.id===a.sid).attendance_classes,{gid,sid:ids[1]}))===2);

  // ---------- Historial por parcial ----------
  await p.evaluate(async gid=>{$('#attendanceHistoryGroup').value=String(gid);goView('attendanceHistory');},gid);await wait(p,900);
  const h2=await p.evaluate(()=>({sel:$('#attendanceHistoryPeriod').value,opts:[...$('#attendanceHistoryPeriod').options].map(o=>o.textContent),title:$('#attendanceMonitorTitle').textContent,ana:document.querySelector('#attendanceMonitorTable tbody tr td:nth-child(3)')?.textContent}));
  check('Historial abre en el parcial actual y empieza de 0 (Ana: 2 h del P2, no las 8 del P1)',h2.sel==='2'&&h2.ana==='2'&&h2.title.includes('Parcial 2'),JSON.stringify(h2));
  check('Historial ofrece Parcial 1 (consulta) y Todo el semestre',h2.opts.some(o=>o.includes('Parcial 1')&&o.includes('cerrado'))&&h2.opts.includes('Todo el semestre'));
  await p.selectOption('#attendanceHistoryPeriod','1');await wait(p,800);
  const h1=await p.evaluate(()=>({note:!!document.querySelector('.attendance-consult-note'),ana:document.querySelector('#attendanceMonitorTable tbody tr td:nth-child(3)')?.textContent}));
  check('Parcial 1 en consulta: muestra sus 8 h y el aviso de modo consulta',h1.note&&h1.ana==='8',JSON.stringify(h1));
  await p.screenshot({path:path.join(OUT,'historial-p1.png')});
  await p.selectOption('#attendanceHistoryPeriod','all');await wait(p,700);
  check('Todo el semestre suma ambos parciales (Ana 8 + 2 = 10 h)',await p.evaluate(()=>document.querySelector('#attendanceMonitorTable tbody tr td:nth-child(3)')?.textContent)==='10');
  await p.evaluate(()=>goView('dashboard'));await wait(p,500);
  await p.evaluate(()=>goView('attendanceHistory'));await wait(p,700);
  check('Al volver al historial regresa al parcial actual (no se queda en consulta)',await p.evaluate(()=>$('#attendanceHistoryPeriod').value)==='2');

  // ---------- Cuaderno: P2 con Asistencia, P1 en modo consulta ----------
  await p.evaluate(async gid=>{$('#notebookGroup').value=String(gid);goView('notebook');await loadNotebook({resetPeriod:true});},gid);await wait(p,900);
  const nb2=await p.evaluate(()=>({sel:$('#notebookPeriod').value,head:[...document.querySelectorAll('.notebook-table thead th')].map(t=>t.textContent).join('|'),banner:!!document.querySelector('.consult-banner')}));
  check('Cuaderno P2: columna Asistencia (10% auto), sin Valores/Actitudes ni aviso de consulta',nb2.sel==='2'&&nb2.head.includes('Asistencia')&&!nb2.head.includes('Valores')&&!nb2.banner,nb2.head);
  await p.screenshot({path:path.join(OUT,'cuaderno-p2.png')});
  await p.selectOption('#notebookPeriod','1');await wait(p,900);
  const nb1=await p.evaluate(()=>({banner:document.querySelector('.consult-banner')?.textContent||'',ro:[...document.querySelectorAll('.notebook-period-block .notebook-score-input')].every(i=>i.readOnly),head:[...document.querySelectorAll('.notebook-table thead th')].map(t=>t.textContent).join('|')}));
  check('Cuaderno P1: modo consulta con aviso y todas las celdas en solo lectura',nb1.banner.includes('Modo consulta')&&nb1.ro,nb1.banner.slice(0,60));
  check('P1 conserva columnas Valores y Actitudes',nb1.head.includes('Valores')&&nb1.head.includes('Actitudes'));
  const cellSel=`.notebook-score-input[data-kind="grade"][data-student="${ids[0]}"]`;
  await p.click(cellSel,{force:true}).catch(()=>{});await p.keyboard.type('3');await wait(p,300);
  const kp=await p.evaluate(()=>!$('#gradeKeypad').classList.contains('hidden'));
  check('En consulta no se puede escribir ni se abre el teclado',await p.$eval(cellSel,el=>el.value)==='8'&&!kp);
  await p.click(`.notebook-period-block .extra-cell-button`,{force:true}).catch(()=>{});await wait(p,300);
  check('En consulta los puntos extra tampoco se abren',await p.evaluate(()=>$('#modal').classList.contains('hidden')));
  await p.screenshot({path:path.join(OUT,'cuaderno-p1-consulta.png')});
  // Vista alumno en consulta
  await p.click('.notebook-period-block .student-name-button');await wait(p,600);
  check('Vista alumno del P1: solo lectura',await p.evaluate(()=>!!document.querySelector('.drawer-consult-note')&&[...document.querySelectorAll('#studentDrawerBody input')].every(i=>i.disabled)));
  await p.evaluate(()=>closeStudentDrawer());await wait(p,300);
  // Desbloquear para corregir
  await p.evaluate(()=>unlockNotebookPeriod('1'));await wait(p,900);
  const ul=await p.evaluate(()=>({banner:document.querySelector('.consult-banner')?.className||'',ro:document.querySelector('.notebook-period-block .notebook-score-input')?.readOnly}));
  check('«Desbloquear para corregir» permite editar el P1',ul.banner.includes('unlocked')&&ul.ro===false,JSON.stringify(ul));
  await p.evaluate(()=>lockNotebookPeriod('1'));await wait(p,900);
  check('«Volver a bloquear» regresa a solo lectura',await p.evaluate(()=>document.querySelector('.notebook-period-block .notebook-score-input')?.readOnly===true));
  const unchanged=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.final_grade),gid);
  check('Consultar el P1 no modificó sus calificaciones',JSON.stringify(unchanged)===JSON.stringify(p1Expected));

  // ---------- Consultar parciales pasados ----------
  await p.evaluate(async gid=>{$('#gradingGroup').value=String(gid);goView('grading');await loadGrading();},gid);await wait(p,800);
  await p.click('#consultPastPeriodsBtn');await wait(p,900);
  const modal=await p.evaluate(()=>({cards:document.querySelectorAll('.past-period-card').length,text:$('#modalBody').textContent}));
  check('«Consultar parciales pasados» muestra el Parcial 1 con promedio, actividades y clases',modal.cards===1&&modal.text.includes('Parcial 1')&&modal.text.includes('9.1'),modal.text.slice(0,120));
  await p.screenshot({path:path.join(OUT,'parciales-pasados.png')});
  await p.click('.past-period-card .btn.primary');await wait(p,1100);
  check('«Abrir cuaderno (consulta)» abre el P1 en solo lectura',await p.evaluate(()=>currentView==='notebook'&&$('#notebookPeriod').value==='1'&&!!document.querySelector('.notebook-period-block[data-readonly="1"]')));
  await p.click('.consult-banner .btn.primary');await wait(p,900);
  check('«Ir al Parcial 2 (actual)» regresa al parcial en curso',await p.evaluate(()=>$('#notebookPeriod').value==='2'));

  // ---------- Pantalla Parcial ----------
  await p.evaluate(async gid=>{$('#gradingGroup').value=String(gid);goView('grading');await loadGrading();},gid);await wait(p,800);
  const pv=await p.evaluate(()=>({att:!$('#attendanceSchemeItem').classList.contains('hidden'),vals:$('#valuesSchemeItem').classList.contains('hidden'),total:$('#schemeTotal').textContent,title:$('#componentsPanelTitle').textContent}));
  check('Pantalla Parcial: Asistencia 10% fija, sin Valores/Actitudes, total 100%',pv.att&&pv.vals&&pv.total==='100%'&&pv.title.includes('Asistencia'),JSON.stringify(pv));
  await p.screenshot({path:path.join(OUT,'parcial.png')});

  // ---------- Excel ----------
  const xl=await p.evaluate(async gid=>{const b=await buildWorkbook(gid);const pp=b.sheets.find(s=>s.name==='Asistencia por parcial');const nb=await buildNotebookWorkbook(gid,'2');const nb1=await buildNotebookWorkbook(gid,'1');
    const l1=await buildAttendanceListWorkbook(gid,{period:'1'});const l2=await buildAttendanceListWorkbook(gid,{period:'2'});
    return {pp:pp?.rows.slice(0,2),nbH:nb.sheets[0].rows[0],nb1H:nb1.sheets[0].rows[0],d1:l1.stats.dates,d2:l2.stats.dates};},gid);
  check('Excel completo: hoja «Asistencia por parcial» (Ana P1 3/4, P2 2/2)',!!xl.pp&&JSON.stringify(xl.pp[1].slice(2,10))==='[4,3,1,7.5,2,2,0,10]',JSON.stringify(xl.pp?.[1]));
  check('Libreta P2 exporta Asistencia (0-10); libreta P1 sigue con Valores/Actitudes',xl.nbH.includes('Asistencia (0-10)')&&!xl.nbH.includes('Valores')&&xl.nb1H.includes('Valores'));
  check('Lista de asistencia por parcial: P1 4 fechas, P2 2 fechas',xl.d1===4&&xl.d2===2,`${xl.d1}/${xl.d2}`);

  // ---------- Inicio y barra inferior ----------
  await p.evaluate(()=>goView('dashboard'));await wait(p,700);
  const nav=await p.evaluate(()=>({backup:!!$('#bottomBackupBtn'),cols:getComputedStyle($('#bottomAppNav')).gridTemplateColumns.split(' ').length,tabs:[...document.querySelectorAll('#bottomAppNav .app-tab')].map(t=>t.textContent.trim()),admin:!!$('#adminBackupBtn')&&!!$('#backupBtn')}));
  check('Barra inferior sin «Respaldo» (7 accesos) y el respaldo sigue en Más',!nav.backup&&nav.cols===7&&!nav.tabs.includes('Respaldo')&&nav.admin,nav.tabs.join(','));
  const kpi=await p.evaluate(()=>[...document.querySelectorAll('#kpis .kpi')].map(k=>k.textContent).join(' | '));
  check('Inicio muestra la asistencia del parcial actual',kpi.includes('Asistencia (parcial actual)'),kpi);
  await p.screenshot({path:path.join(OUT,'inicio.png')});

  // ---------- Cerrar Parcial 2: asistencia del P3 empieza de 0 ----------
  await p.evaluate(async gid=>{$('#gradingGroup').value=String(gid);goView('grading');await loadGrading();},gid);await wait(p,700);
  await p.click('#closePeriodBtn');await wait(p,1300);
  const after=await p.evaluate(async gid=>{const g=await MiAulaDB.get('groups',gid);const s2=await getScheme(gid,'2'),s3=await getScheme(gid,'3');const all=await MiAulaDB.byIndex('attendance','group_id',gid);
    return {cur:g.current_period,cl:Object.keys(g.period_closures||{}).sort().join(','),p2:all.filter(r=>r.period==='2').length,s2:s2.attendance_pct,s3:s3.attendance_pct,s3w:s3.work_pct,g3:(await computeGroupGrading(gid,'3')).students[0].attendance_score};},gid);
  check('Al cerrar P2: queda guardada su asistencia (8 registros) y el P3 inicia sin clases',after.cur===3&&after.cl==='1,2'&&after.p2===8&&after.g3===null,JSON.stringify(after));
  check('P2 cerrado conserva su Asistencia 10%; P3 nace con Asistencia 10%',after.s2===10&&after.s3===10&&after.s3w===50);
  await p.evaluate(async gid=>{$('#attendanceHistoryGroup').value=String(gid);goView('attendanceHistory');},gid);await wait(p,900);
  check('Historial tras el cierre: Parcial 3 en 0 clases',await p.evaluate(()=>$('#attendanceHistoryPeriod').value==='3'&&document.querySelector('#attendanceMonitorSummary .attendance-monitor-kpi strong')?.textContent==='0'));

  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(x=>!x.ok);
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
