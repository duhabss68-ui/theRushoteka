'use strict';
// Prueba MiAula 2.12.0 · Prepa: rubros adicionales al calificar (captura directa y promedio de actividades).
// Uso: APP_URL=http://localhost:8000/index.html [OUT=carpeta] node tests/e2e/rubros.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8774/index.html';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-rubros-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);

(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',acceptDownloads:true});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1400);

  check('Base de datos propia de Prepa (no se mezcla con MiAula CETIS)',await p.evaluate(async()=>(await indexedDB.databases()).some(d=>d.name==='MiAulaPrepaDB')));

  const seed=await p.evaluate(async()=>{
    const gid=await MiAulaDB.add('groups',{name:'5A',discipline:'Matemáticas V',school_year:'2026-2027',total_periods:3,active:1,current_period:1,closed_periods:[],course_closed:false,created_at:new Date().toISOString()});
    for(const [a,n] of [['Alba','Ana'],['Bravo','Beto'],['Cano','Caro']]){const d={group_id:gid,paternal_last_name:a,maternal_last_name:'Prueba',given_names:n,active:1,student_code:'R'+a,created_at:new Date().toISOString()};d.name=`${a} Prueba ${n}`;await MiAulaDB.add('students',d);}
    await MiAulaDB.reorganizeGroup(gid,true);
    const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number);
    const t1=await MiAulaDB.add('activities',{group_id:gid,title:'Trabajo 1',activity_type:'Trabajo',activity_date:'2026-10-20',max_score:10,weight:1,period:'1',created_at:new Date().toISOString()});
    for(const [i,v] of [[0,8],[1,6],[2,10]])await MiAulaDB.add('grades',{activity_id:t1,student_id:st[i].id,score:v,status:''});
    for(const s of st)await MiAulaDB.add('evaluations',{group_id:gid,instrument_id:null,title:'Proyecto',student_id:s.id,grade:9,raw_score:9,details:{},period:'1',evaluation_date:'2026-10-22'});
    for(const s of st)await MiAulaDB.add('attendance',{group_id:gid,student_id:s.id,attendance_date:'2026-10-20',status:'P',class_hours:1,period:'1',updated_at:new Date().toISOString()});
    return {gid,ids:st.map(s=>s.id)};
  });
  const {gid,ids}=seed;
  await p.reload();await wait(p,1400);
  await p.evaluate(gid=>setContextGroup(gid,{propagate:true,refresh:true}),gid);await wait(p,600);

  // ---------- Esquema: crear rubros ----------
  await p.evaluate(()=>goView('grading'));await wait(p,800);
  check('Pantalla Parcial: botón «Agregar rubro» y lista vacía',await p.evaluate(()=>!!$('#addCustomRubro')&&$('#customRubrosList').textContent.includes('Sin rubros')));
  // 50/40/10 por omisión → 30 Trabajos, 40 Proyecto, 10 Asistencia, 10 Participación (captura), 10 Tareas (actividades)
  await p.click('#addCustomRubro');await wait(p,200);
  await p.fill('#customRubrosList .custom-rubro-row:nth-child(1) .cr-pct','10');
  await p.fill('#workPct','40');
  await p.click('#schemeForm button[type="submit"]');await wait(p,500);
  check('No guarda un rubro sin nombre',await p.evaluate(async gid=>customComponents(await MiAulaDB.get('gradingSchemes',`${gid}:1`)).length===0,gid));
  await p.fill('#customRubrosList .custom-rubro-row:nth-child(1) .cr-name','Participación');
  await p.click('#addCustomRubro');await wait(p,200);
  await p.fill('#customRubrosList .custom-rubro-row:nth-child(2) .cr-name','Tareas');
  await p.selectOption('#customRubrosList .custom-rubro-row:nth-child(2) .cr-source','activities');
  await p.fill('#customRubrosList .custom-rubro-row:nth-child(2) .cr-pct','10');
  const tot1=await p.evaluate(()=>$('#schemeTotal').textContent);
  await p.click('#schemeForm button[type="submit"]');await wait(p,500);
  check('Rechaza si con los rubros no suma 100% (total en vivo 110%)',tot1==='110%'&&await p.evaluate(async gid=>customComponents(await MiAulaDB.get('gradingSchemes',`${gid}:1`)).length===0,gid),tot1);
  await p.fill('#workPct','30');
  check('Total en vivo incluye los rubros (100%)',await p.evaluate(()=>$('#schemeTotal').textContent)==='100%');
  await p.click('#schemeForm button[type="submit"]');await wait(p,800);
  const sch=await p.evaluate(async gid=>await MiAulaDB.get('gradingSchemes',`${gid}:1`),gid);
  const cc=sch.custom_components||[];
  check('Guarda 30/40/10 + Participación 10% (captura) + Tareas 10% (actividades)',sch.work_pct===30&&sch.project_pct===40&&sch.attendance_pct===10&&cc.length===2&&cc[0].name==='Participación'&&cc[0].source==='manual'&&cc[1].name==='Tareas'&&cc[1].source==='activities'&&(sch.work_pct+sch.project_pct+sch.attendance_pct+cc.reduce((n,c)=>n+c.pct,0))===100,JSON.stringify(cc));
  const [rPart,rTar]=cc.map(c=>c.id);

  // ---------- Final pendiente hasta capturar los rubros ----------
  let g=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>[s.custom_scores,s.final_grade]),gid);
  check('Sin captura de los rubros la final queda Pendiente (nunca 0)',g.every(r=>r[1]===null&&r[0][rPart]===null&&r[0][rTar]===null),JSON.stringify(g));

  // ---------- Captura directa en la tabla del parcial ----------
  const head=await p.evaluate(()=>[...document.querySelectorAll('#gradingTable thead th')].map(t=>t.textContent).join('|'));
  check('Tabla del parcial muestra Participación y Tareas',head.includes('Participación')&&head.includes('Tareas'),head);
  await p.click(`#gradingTable .rubro-fill[data-rubro="${rPart}"]`);await wait(p,300);
  await p.fill(`#gradingTable input[data-rubro="${rPart}"][data-index="1"]`,'7');
  check('«Guardar rubros» visible',await p.evaluate(()=>!$('#saveComponents').classList.contains('hidden')&&$('#saveComponents').textContent.includes('rubros')));
  await p.click('#saveComponents');await wait(p,800);
  const comps=await p.evaluate(async a=>Promise.all(a.ids.map(async id=>(await MiAulaDB.get('studentComponents',`${a.gid}:1:${id}`))?.custom_scores?.[a.r])),{gid,ids,r:rPart});
  check('Participación guardada en studentComponents.custom_scores (10, 7, 10)',JSON.stringify(comps)==='[10,7,10]',JSON.stringify(comps));
  g=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.final_grade),gid);
  check('Con Tareas sin actividades, la final sigue Pendiente',g.every(v=>v===null));

  // ---------- Actividad que cuenta en el rubro «Tareas» ----------
  await p.evaluate(()=>goView('activities'));await wait(p,700);
  const sel=await p.evaluate(()=>({hidden:$('#activityRubroLabel').classList.contains('hidden'),opts:[...document.querySelectorAll('#activityRubro option')].map(o=>o.textContent)}));
  check('Nueva actividad: lista «Rubro» con Trabajos y Tareas (no ofrece rubros de captura)',!sel.hidden&&sel.opts.length===2&&sel.opts[0]==='Trabajos'&&sel.opts[1].startsWith('Tareas'),JSON.stringify(sel));
  await p.fill('#activityForm [name="title"]','Tarea 1');
  await p.selectOption('#activityRubro',rTar);
  await p.click('#activityForm button[type="submit"]');await wait(p,800);
  const act=await p.evaluate(async gid=>(await MiAulaDB.byIndex('activities','group_id',gid)).find(a=>a.title==='Tarea 1'),gid);
  check('La actividad guarda component_id del rubro',act?.component_id===rTar,JSON.stringify(act?.component_id));
  check('La tarjeta de la actividad indica «Rubro: Tareas»',await p.evaluate(()=>$('#activityCards').textContent.includes('Rubro: Tareas')));
  await p.evaluate(async a=>{for(const [i,v] of [[0,10],[1,5]])await MiAulaDB.add('grades',{activity_id:a.aid,student_id:a.ids[i],score:v,status:''});},{aid:act.id,ids});
  g=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>[s.work_avg,s.custom_scores,s.attendance_score,s.final_grade]),gid);
  // Ana: 8·.3 + 9·.4 + 10·.1 + 10·.1 + 10·.1 = 9.0 ; Beto: 6·.3 + 9·.4 + 10·.1 + 7·.1 + 5·.1 = 7.6 ; Caro: Tareas vacía → Pendiente
  check('La tarea promedia en Tareas y no en Trabajos (Trabajos Ana = 8)',g[0][0]===8&&g[0][1][rTar]===10&&g[1][1][rTar]===5,JSON.stringify(g[0]));
  check('Final = Σ componentes con rubros (Ana 9, Beto 7.6, Caro Pendiente)',g[0][3]===9&&g[1][3]===7.6&&g[2][3]===null,JSON.stringify(g.map(r=>r[3])));

  // ---------- Cuaderno ----------
  await p.evaluate(gid=>openNotebook(gid),gid);await wait(p,1200);
  const nbh=await p.evaluate(()=>[...document.querySelectorAll('.notebook-table thead th')].map(t=>t.textContent).join('|'));
  check('Cuaderno: columnas Participación y Tareas antes de Final; la tarea indica su rubro',nbh.includes('Participación')&&nbh.includes('Tareas')&&nbh.indexOf('Tareas')<nbh.lastIndexOf('Final')&&/Tarea 1.*Tareas/.test(nbh),nbh);
  // Caro: captura la Tarea 1 en el cuaderno → la final aparece en vivo
  const cell=`.notebook-score-input[data-kind="grade"][data-activity="${act.id}"][data-student="${ids[2]}"]`;
  await p.fill(cell,'8');await wait(p,200);
  const live=await p.evaluate(a=>({t:document.querySelector(`[data-rubro-cell="1:${a.s}:${a.r}"]`)?.textContent,f:document.querySelector(`[data-final-cell="1:${a.s}"]`)?.textContent}),{s:ids[2],r:rTar});
  // Caro: 10·.3 + 9·.4 + 10·.1 + 10·.1 + 8·.1 = 9.4
  check('Recalcula en vivo el rubro y la final (Caro: Tareas 8, Final 9.4)',live.t.startsWith('8')&&live.f.includes('9.4'),JSON.stringify(live));
  // Captura directa de Participación desde el cuaderno
  const pc=`.notebook-score-input[data-kind="component"][data-field="rubro:${rPart}"][data-student="${ids[1]}"]`;
  check('Participación se puede escribir en el cuaderno',await p.evaluate(sel=>!!document.querySelector(sel),pc));
  await p.fill(pc,'9');await wait(p,1600);
  const saved=await p.evaluate(async a=>({c:(await MiAulaDB.get('studentComponents',`${a.gid}:1:${a.s}`))?.custom_scores,t:(await MiAulaDB.firstByIndex('grades','unique_key',[a.aid,a.s2]))?.score}),{gid,s:ids[1],s2:ids[2],aid:act.id});
  check('Autoguardado del cuaderno: Participación 9 sin perder otras claves y la tarea de Caro 8',saved.c?.[rPart]===9&&saved.t===8,JSON.stringify(saved));

  // ---------- Vista alumno ----------
  await p.evaluate(sid=>openStudentView('1',sid),ids[1]);await wait(p,600);
  const dr=await p.evaluate(r=>({txt:$('#studentDrawerBody').textContent,inp:document.querySelector(`#studentDrawer .drawer-score-input[data-field="rubro:${r}"]`)?.value}),rPart);
  check('Vista alumno: tarjeta Participación editable (9) y Tareas calculada',dr.txt.includes('Participación')&&dr.txt.includes('Tareas')&&dr.inp==='9',JSON.stringify({inp:dr.inp}));
  await p.evaluate(()=>closeStudentDrawer());

  // ---------- Excel ----------
  const xl=await p.evaluate(async gid=>{const nb=await buildNotebookWorkbook(gid,'1');const all=await buildWorkbook(gid,{});return {nbH:nb.sheets.find(s=>s.name==='Libreta P1').rows[0],nbR:nb.sheets.find(s=>s.name==='Libreta P1').rows[2],esq:all.sheets.find(s=>s.name==='Esquemas').rows,cal:all.sheets.find(s=>/Calificaci/.test(s.name)).rows};},gid);
  const iP=xl.nbH.indexOf('Participación (10%)'),iT=xl.nbH.indexOf('Tareas (10%)');
  check('Libreta Excel: columnas de rubros con su valor (Beto: Participación 9, Tareas 5)',iP>0&&iT>0&&xl.nbR[iP]===9&&xl.nbR[iT]===5,JSON.stringify([iP,iT,xl.nbR[iP],xl.nbR[iT]]));
  check('Excel completo: «Rubros adicionales» en Esquemas y en Calificación parcial',xl.esq[0].includes('Rubros adicionales')&&String(xl.esq[1].at(-1)).includes('Participación 10%')&&xl.cal[0].includes('Rubros adicionales')&&String(xl.cal[1].at(-1)).includes('Tareas'),String(xl.esq[1].at(-1)));
  const close=await p.evaluate(async gid=>{const a=(await MiAulaDB.byIndex('activities','group_id',gid)).find(x=>x.title==='Tarea 1');const s=(await MiAulaDB.groupStudents(gid,{includeInactive:false}));const t=await MiAulaDB.firstByIndex('grades','unique_key',[a.id,s.find(x=>x.given_names==='Caro').id]);await MiAulaDB.remove('grades',t.id);const r=await computeGroupGrading(gid,'1',{emptyAsZero:true});const n=await computeGroupGrading(gid,'1');await MiAulaDB.add('grades',{activity_id:t.activity_id,student_id:t.student_id,score:8,status:''});return {z:r.students[2].custom_scores,f:r.students[2].final_grade,n:n.students[2].final_grade};},gid);
  check('Exportación «para cierre»: tarea vacía del rubro cuenta 0 solo en el archivo',close.z[rTar]===0&&close.f!=null&&close.n===null,JSON.stringify(close));

  // ---------- Quitar un rubro no borra nada ----------
  await p.evaluate(()=>goView('grading'));await wait(p,800);
  await p.click('#customRubrosList .custom-rubro-row:nth-child(2) .cr-remove');await wait(p,200);
  await p.fill('#workPct','40');await p.click('#schemeForm button[type="submit"]');await wait(p,800);
  const rm=await p.evaluate(async a=>{const s=await MiAulaDB.get('gradingSchemes',`${a.gid}:1`);const r=await computeGroupGrading(a.gid,'1');const act=(await MiAulaDB.byIndex('activities','group_id',a.gid)).find(x=>x.title==='Tarea 1');return {n:customComponents(s).length,work:r.students[0].work_avg,cid:act.component_id};},{gid});
  check('Quitar «Tareas»: la actividad conserva su dato y vuelve a contar en Trabajos (Ana (8+10)/2 = 9)',rm.n===1&&rm.work===9&&rm.cid===rTar,JSON.stringify(rm));
  // 2.14.0: la lista «Rubro» siempre está (reemplaza a «Tipo»); sin rubros de actividades solo ofrece Trabajos y muestra ayuda.
  const sel2=await p.evaluate(async()=>{goView('activities');await loadActivities();return {vis:!$('#activityRubroLabel').classList.contains('hidden'),opts:[...document.querySelectorAll('#activityRubro option')].map(o=>o.textContent),help:!$('#activityRubroHelp').classList.contains('hidden')};});
  check('Sin rubros de actividades, «Rubro» solo ofrece Trabajos y muestra cómo crear más',sel2.vis&&sel2.opts.join()==='Trabajos'&&sel2.help,JSON.stringify(sel2));

  // ---------- Asistencia editable ----------
  await p.evaluate(()=>goView('grading'));await wait(p,800);
  await p.fill('#attendancePct','0');await p.fill('#workPct','50');
  await p.click('#schemeForm button[type="submit"]');await wait(p,800);
  const at=await p.evaluate(async gid=>{const s=await getScheme(gid,'1');return {pct:s.attendance_pct,mode:isAttendanceScheme(s),vals:s.values_pct,head:[...document.querySelectorAll('#gradingTable thead th')].map(t=>t.textContent).join('|')};},gid);
  check('Asistencia 0% se guarda y no regresa a Valores/Actitudes',at.pct===0&&at.mode===true&&at.vals===0&&!at.head.includes('Valores'),JSON.stringify(at));

  // ---------- El parcial siguiente copia los rubros ----------
  await p.click('#closePeriodBtn');await wait(p,1200);
  const p2=await p.evaluate(async gid=>{const s=await getScheme(gid,'2');const s1=await getScheme(gid,'1');return {c:customComponents(s).map(c=>c.name+':'+c.pct+':'+c.source),total:schemeTotalPct(s),same:customComponents(s)[0]?.id===customComponents(s1)[0]?.id};},gid);
  check('Parcial 2 copia los rubros del Parcial 1 (Participación 10%)',p2.c.join()==='Participación:10:manual'&&p2.total===100&&p2.same,JSON.stringify(p2));
  const p1Final=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.final_grade),gid);
  check('Parcial 1 cerrado conserva su cálculo con Participación',p1Final[1]!=null,JSON.stringify(p1Final));

  // ---------- Respaldo y restauración conservan los rubros ----------
  const bk=await p.evaluate(async()=>{const d=await MiAulaDB.exportBackup();const D=d.stores;return {s:D.gradingSchemes?.some(x=>Array.isArray(x.custom_components)&&x.custom_components.length),c:D.studentComponents?.some(x=>x.custom_scores)};}).catch(e=>({err:String(e)}));
  check('El respaldo incluye rubros y capturas',bk.s&&bk.c,JSON.stringify(bk));

  await p.screenshot({path:path.join(OUT,'rubros-parcial.png'),fullPage:false});
  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(r=>!r.ok);
  fs.writeFileSync(path.join(OUT,'resultado-rubros.json'),JSON.stringify(results,null,2));
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
