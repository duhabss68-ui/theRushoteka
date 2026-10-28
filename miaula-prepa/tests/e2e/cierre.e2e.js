'use strict';
// Prueba de la exportación «cierre de evaluación» (MiAula 2.9.2).
// Uso: APP_URL=http://localhost:8000/index.html [OUT=carpeta] node tests/e2e/cierre.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8773/index.html';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-cierre-'));
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
    const gid=await MiAulaDB.add('groups',{name:'6A',discipline:'Cierre (prueba)',school_year:'2026-2027',total_periods:3,active:1,current_period:2,closed_periods:[1],course_closed:false,last_period_closed_at:'2026-10-26T23:00:00.000Z',created_at:new Date().toISOString()}); // 2.11.0: Parcial 1 ya cerrado con Valores/Actitudes (caso real)
    for(const [a,n] of [['Alba','Ana'],['Bravo','Beto'],['Cano','Caro'],['Duarte','Dani']]){const d={group_id:gid,paternal_last_name:a,maternal_last_name:'Prueba',given_names:n,active:1,student_code:'C'+a,created_at:new Date().toISOString()};d.name=`${a} Prueba ${n}`;await MiAulaDB.add('students',d);}
    await MiAulaDB.reorganizeGroup(gid,true);
    const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number);
    const s4=await MiAulaDB.get('students',st[3].id);s4.secretary_pending=1;await MiAulaDB.put('students',s4);
    await MiAulaDB.put('gradingSchemes',{key:`${gid}:1`,group_id:gid,period:'1',work_pct:40,project_pct:40,values_pct:10,attitudes_pct:10,principal_type:'project',mode_locked:true});
    const a1=await MiAulaDB.add('activities',{group_id:gid,title:'Tarea 1',activity_type:'Trabajo',activity_date:'2026-10-20',max_score:10,weight:1,period:'1',created_at:new Date().toISOString()});
    const snap=await rubricSnapshotFromRef('bank:bank-cotejo-tarea');
    const a2=await MiAulaDB.add('activities',{group_id:gid,title:'Entrega',activity_type:'Trabajo',activity_date:'2026-10-21',max_score:10,weight:1,period:'1',grading_mode:'rubric',rubric:snap,created_at:new Date().toISOString()});
    const c=snap.criteria.map(x=>x.id);
    await MiAulaDB.add('grades',{activity_id:a1,student_id:st[0].id,score:8,status:''});
    await MiAulaDB.add('grades',{activity_id:a1,student_id:st[2].id,score:null,status:'NP'});
    const full={[c[0]]:0,[c[1]]:0,[c[2]]:0,[c[3]]:0,[c[4]]:1};
    await MiAulaDB.add('grades',{activity_id:a2,student_id:st[0].id,score:8,status:'',rubric_levels:full});
    await MiAulaDB.add('grades',{activity_id:a2,student_id:st[1].id,score:null,status:'',rubric_levels:{[c[0]]:0,[c[1]]:0}});
    for(const s of st){
      await MiAulaDB.put('studentComponents',{key:`${gid}:1:${s.id}`,group_id:gid,period:'1',student_id:s.id,values_score:10,attitudes_score:10});
      await MiAulaDB.add('evaluations',{group_id:gid,instrument_id:null,title:'Proyecto',student_id:s.id,grade:10,raw_score:10,details:{},period:'1',evaluation_date:'2026-10-22'});
    }
    return {gid,ids:st.map(s=>s.id)};
  });
  await p.reload();await wait(p,1400);
  // Calificaciones, componentes, evaluaciones, alumnos y puntos (getScheme puede crear porcentajes por omisión de otros parciales, como siempre).
  const count=async()=>p.evaluate(async()=>JSON.stringify(await Promise.all(['students','grades','studentComponents','evaluations','extraPoints','activities','attendance'].map(async s=>(await MiAulaDB.all(s)).map(r=>{const o={...r};delete o.updated_at;if(!o.notes)delete o.notes;return o;})))));
  const before=await count();
  const normal=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>[s.work_avg,s.final_grade]),seed.gid);

  const nb=await p.evaluate(async gid=>{const stats={zeros:0};const b=await buildNotebookWorkbook(gid,'1',{emptyAsZero:true,stats});return {sheets:b.sheets.map(x=>x.name),rows:b.sheets.find(x=>x.name==='Libreta P1').rows,zeros:stats.zeros};},seed.gid);
  const H=nb.rows[0],iA1=H.findIndex(h=>String(h).startsWith('Tarea 1')),iA2=H.findIndex(h=>String(h).startsWith('Entrega')),iW=H.indexOf('Prom. trabajos'),iF=H.indexOf('Final');
  const r=nb.rows.slice(1);
  check('Alumno con calificaciones completas no cambia (8, 8 → 8)',r[0][iA1]===8&&r[0][iA2]===8&&r[0][iW]===8);
  check('Vacío → 0 y la rúbrica a medias se queda como «2 de 5 criterios»',r[1][iA1]===0&&r[1][iA2]==='2 de 5 criterios',`${r[1][iA1]} | ${r[1][iA2]}`);
  check('El 0 cuenta en el promedio y la final (40% trabajos en 0 → final 6)',r[1][iW]===0&&r[1][iF]===6,`trabajos ${r[1][iW]}, final ${r[1][iF]}`);
  check('NP se exporta como «NP» y no cuenta; la rúbrica vacía sale 0',r[2][iA1]==='NP'&&r[2][iA2]===0&&r[2][iW]===0,`${r[2][iA1]} | ${r[2][iA2]} | prom ${r[2][iW]}`);
  check('Pendiente Secretaría: sus vacíos no se vuelven 0',r[3][iA1]===''&&r[3][iA2]==='');
  check('Hoja «Cierre» explica la regla y cuenta los ceros (2: Bravo/Tarea 1 y Cano/Entrega)',nb.sheets[0]==='Cierre'&&nb.zeros===2,`ceros ${nb.zeros}`);
  const normalAfter=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>[s.work_avg,s.final_grade]),seed.gid);
  check('En MiAula no cambia nada: el cálculo normal sigue con vacíos pendientes',JSON.stringify(normal)===JSON.stringify(normalAfter)&&normal[1][0]===null&&normal[1][1]===null,JSON.stringify(normal));
  const plain=await p.evaluate(async gid=>(await buildNotebookWorkbook(gid,'1')).sheets.find(x=>x.name==='Libreta P1').rows,seed.gid);
  check('Exportación «Como está» sigue igual (vacío en blanco)',plain[2][iA1]===''&&!(await p.evaluate(async gid=>(await buildNotebookWorkbook(gid,'1')).sheets.some(x=>x.name==='Cierre'),seed.gid)));
  const all=await p.evaluate(async gid=>{const stats={zeros:0};const b=await buildWorkbook(gid,{emptyAsZero:true,stats});const conc=b.sheets.find(x=>x.name==='Concentrado').rows;return {first:b.sheets[0].name,conc,zeros:stats.zeros};},seed.gid);
  const ch=all.conc[0],cA1=ch.findIndex(h=>String(h).includes('Tarea 1'));
  check('«Exportar todo» de cierre: Concentrado con 0 y hoja «Cierre»',all.first==='Cierre'&&cA1>=0&&all.conc[2][cA1]===0&&all.zeros===2,`ceros ${all.zeros}`);

  // Pantalla: elegir cómo exportar
  await p.evaluate(async gid=>{await setContextGroup(gid);goView('notebook');},seed.gid);await wait(p,900);
  await p.click('#notebookExcel');await wait(p,400);
  await p.screenshot({path:path.join(OUT,'elegir-exportacion.png')});
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:10000}),p.click('#exportClosing')]);
  check('Al elegir «Para cierre» se descarga el archivo con «_CIERRE» en el nombre',/_CIERRE_/.test(dl.suggestedFilename())&&fs.readFileSync(await dl.path()).slice(0,2).toString()==='PK',dl.suggestedFilename());
  await wait(p,800);
  await p.click('#notebookExcel');await wait(p,400);
  let got=null;p.once('download',d=>got=d);
  await p.click('#modalClose');await wait(p,1200);
  check('Si cierras la ventana, no se exporta nada',got===null);
  const afterCount=await count();check('No se modificó ninguna calificación, alumno ni evaluación al exportar',afterCount===before);
  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(x=>!x.ok);
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
