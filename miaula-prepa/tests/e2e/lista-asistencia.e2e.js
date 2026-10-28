'use strict';
// Prueba de la lista de asistencia tradicional (MiAula 2.10.0).
// Uso: APP_URL=http://localhost:8000/index.html [OUT=carpeta] node tests/e2e/lista-asistencia.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8774/index.html';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-lista-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);
(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',acceptDownloads:true});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1400);
  const seed=await p.evaluate(async()=>{
    const gid=await MiAulaDB.add('groups',{name:'2B',discipline:'Lista (prueba)',school_year:'2026-2027',total_periods:3,active:1,current_period:2,closed_periods:[1],course_closed:false,last_period_closed_at:'2026-10-26T23:00:00.000Z',created_at:new Date().toISOString()}); // 2.11.0: Parcial 1 ya cerrado con Valores/Actitudes (caso real)
    for(const [a,n] of [['Aguayo','Edwin'],['Arredondo','Natalia'],['Ávila','Melanie'],['Bobadilla','Eleuterio']]){const d={group_id:gid,paternal_last_name:a,maternal_last_name:'Prueba',given_names:n,active:1,student_code:'L'+a,created_at:new Date().toISOString()};d.name=`${a} Prueba ${n}`;await MiAulaDB.add('students',d);}
    await MiAulaDB.reorganizeGroup(gid,true);
    const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number);
    // 25-sep (viernes, 2 h), 30-sep (miércoles, 1 h), 1-oct (jueves, 1 h)
    const marks={'2026-09-25':['P','F','J','P'],'2026-09-30':['F','R','P','S'],'2026-10-01':['P','P','F','S']},hrs={'2026-09-25':2,'2026-09-30':1,'2026-10-01':1};
    for(const [d,arr] of Object.entries(marks))for(let i=0;i<4;i++)await MiAulaDB.add('attendance',{group_id:gid,student_id:st[i].id,attendance_date:d,status:arr[i],class_hours:hrs[d],notes:''});
    const s4=await MiAulaDB.get('students',st[3].id);s4.secretary_pending=1;await MiAulaDB.put('students',s4);
    await MiAulaDB.put('gradingSchemes',{key:`${gid}:1`,group_id:gid,period:'1',work_pct:40,project_pct:40,values_pct:10,attitudes_pct:10,principal_type:'project',mode_locked:true});
    const a1=await MiAulaDB.add('activities',{group_id:gid,title:'Tarea',activity_type:'Trabajo',activity_date:'2026-09-25',max_score:10,weight:1,period:'1',created_at:new Date().toISOString()});
    await MiAulaDB.add('grades',{activity_id:a1,student_id:st[0].id,score:9,status:''});
    for(const s of st.slice(0,2)){await MiAulaDB.put('studentComponents',{key:`${gid}:1:${s.id}`,group_id:gid,period:'1',student_id:s.id,values_score:10,attitudes_score:10});await MiAulaDB.add('evaluations',{group_id:gid,instrument_id:null,title:'Proyecto',student_id:s.id,grade:10,raw_score:10,details:{},period:'1',evaluation_date:'2026-10-01'});}
    // un alumno dado de baja con asistencia previa (no debe aparecer)
    const d={group_id:gid,paternal_last_name:'Zeta',maternal_last_name:'Baja',given_names:'Uno',active:1,student_code:'LZ',created_at:new Date().toISOString()};d.name='Zeta Baja Uno';const zid=await MiAulaDB.add('students',d);
    await MiAulaDB.add('attendance',{group_id:gid,student_id:zid,attendance_date:'2026-09-25',status:'P',class_hours:2});await MiAulaDB.deactivateStudent(zid);
    return {gid};
  });
  await p.reload();await wait(p,1400);
  const snapshot=async()=>p.evaluate(async()=>JSON.stringify(await Promise.all(['students','grades','attendance','studentComponents','evaluations'].map(s=>MiAulaDB.all(s)))));
  const before=await snapshot();
  const build=o=>p.evaluate(async a=>{const {workbook,stats}=await buildAttendanceListWorkbook(a.gid,a.o);return {rows:workbook.sheets[0].rows.map(r=>r.map(c=>c&&typeof c==='object'?c:{v:c})),format:workbook.sheets[0].format,stats};},{gid:seed.gid,o});
  const H=await build({unit:'hours'});
  const v=r=>H.rows[r].map(c=>c.v);
  check('Encabezado: letra del día y fecha completa vertical',v(3).slice(2,5).join()==='V,M,J'&&v(4)[2]==='25 de septiembre de 2026'&&H.rows[4][2].s==='v');
  check('Nombres en mayúsculas por número de lista; sin alumnos dados de baja',v(5)[1]==='AGUAYO PRUEBA EDWIN'&&H.rows.filter(r=>String(r[1]?.v||'').includes('ZETA')).length===0&&H.stats.students===4);
  check('Marcas: «.» asistencia, «/» falta (en rojo), «J» justificada, «R» retardo, «S» Secretaría',v(5).slice(2,5).join('')==='./.'&&H.rows[5][3].s==='f'&&v(6).slice(2,5).join('')==='/R.'&&v(7)[2]==='J'&&v(8).slice(3,5).join('')==='SS');
  const T=c=>v(5).slice(5,11).concat([]);
  const tot=i=>v(i).slice(5,11);
  check('Totales en horas: Aguayo 3 asistencias, 1 falta (25-sep cuenta 2 h)',JSON.stringify(tot(5))===JSON.stringify([3,0,0,1,75,25]),JSON.stringify(tot(5)));
  check('% faltas en rojo al llegar al 20%',H.rows[5][10].s==='pf');
  check('Pendiente Secretaría no cuenta: Bobadilla 2 h de asistencia, 0 faltas',JSON.stringify(tot(8))===JSON.stringify([2,0,0,0,100,0]),JSON.stringify(tot(8)));
  const S=await build({unit:'sessions'});
  check('Totales por sesiones: Aguayo 2 asistencias y 1 falta',JSON.stringify(S.rows[5].slice(5,9).map(c=>c.v))===JSON.stringify([2,0,0,1]));
  check('Calificación al final: Parcial 1 de Aguayo y «Pend.» donde falta',v(5)[11]===Math.round((9*.4+10*.4+1+1)*100)/100&&v(7)[11]==='Pend.'&&v(5)[14]==='Pend.',`${v(5)[11]} | ${v(7)[11]} | prom ${v(5)[14]}`);
  const C=await build({unit:'hours',closing:true});
  check('Con «cierre»: Arredondo sin tarea → 0 en trabajos → final 6',C.rows[6][11].v===6,String(C.rows[6][11].v));
  const R=await build({unit:'hours',from:'2026-09-30',to:'2026-10-01'});
  check('Solo un periodo de fechas',R.stats.dates===2&&R.rows[4][2].v==='30 de septiembre de 2026');
  check('Formato: columnas fijas (No. y nombre), fila de fechas alta, hoja horizontal',H.format.freeze.row===5&&H.format.freeze.col===2&&H.format.heights[4]>=100&&H.format.landscape===true);
  // Pantalla
  await p.evaluate(async gid=>{await setContextGroup(gid);goView('attendanceHistory');},seed.gid);await wait(p,900);
  await p.click('#exportAttendanceList');await wait(p,500);
  await p.screenshot({path:path.join(OUT,'lista-dialogo.png')});
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#alGenerate')]);
  const fp=path.join(OUT,'lista.xlsx');await dl.saveAs(fp);
  check('Desde Historial se descarga la lista en Excel',/ListaAsistencia_2B_/.test(dl.suggestedFilename())&&fs.readFileSync(fp).slice(0,2).toString()==='PK',dl.suggestedFilename());
  await p.evaluate(()=>goView('more'));await wait(p,600);
  check('También está en Administración → Exportar',await p.evaluate(()=>!!document.querySelector('#exportAttendanceListAdmin')));
  check('No se modificó ningún dato',(await snapshot())===before);
  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(x=>!x.ok);
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · archivo en ${fp}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
