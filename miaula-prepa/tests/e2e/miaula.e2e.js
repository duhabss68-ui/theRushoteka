'use strict';
// Prueba de navegador de MiAula 2.8.0 (rúbricas de un clic y calificar por equipos).
// Requiere Playwright (solo para desarrollo; la app no lo necesita).
// Uso:  APP_URL=http://localhost:8000/index.html [LEGACY_URL=http://localhost:8001/index.html] [OUT=carpeta] node tests/e2e/miaula.e2e.js
// LEGACY_URL (opcional) apunta a la versión anterior para comprobar que sus datos se abren igual.
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8769/index.html';
const LEGACY=process.env.LEGACY_URL||'';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-e2e-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}

// Datos ficticios
async function seed(p){
  return p.evaluate(async()=>{
    const gid=await MiAulaDB.add('groups',{name:'3A',discipline:'Programación (prueba)',school_year:'2026-2027',total_periods:3,active:1,current_period:1,closed_periods:[],course_closed:false,created_at:new Date().toISOString()});
    const ap=['Aguilar','Bautista','Castillo','Domínguez','Escobar','Flores','García','Hernández','Ibarra','Juárez','López','Martínez'];
    const nm=['Ana','Luis','María','José','Valeria','Diego','Camila','Emiliano','Ximena','Santiago','Regina','Mateo'];
    for(let i=0;i<ap.length;i++){const d={group_id:gid,paternal_last_name:ap[i],maternal_last_name:'Prueba',given_names:nm[i],active:1,student_code:'T'+i,created_at:new Date().toISOString()};d.name=`${d.paternal_last_name} ${d.maternal_last_name} ${d.given_names}`;await MiAulaDB.add('students',d);}
    await MiAulaDB.reorganizeGroup(gid,true);
    const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number);
    const a1=await MiAulaDB.add('activities',{group_id:gid,title:'Cuestionario',activity_type:'Trabajo',activity_date:'2026-10-20',max_score:10,weight:1,period:'1',created_at:new Date().toISOString()});
    for(let i=0;i<st.length;i++)await MiAulaDB.add('grades',{activity_id:a1,student_id:st[i].id,score:6+(i%5),status:'',notes:''});
    return gid;
  });
}

(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  // ---------- 8. Datos de la versión anterior ----------
  let legacy=null;
  if(LEGACY){
    const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block'});const p=await ctx.newPage();
    await p.goto(LEGACY);await p.waitForTimeout(1200);
    const gid=await seed(p);
    legacy=await p.evaluate(async gid=>{
      await MiAulaDB.add('instruments',{name:'Rúbrica Proyecto anterior',instrument_type:'rubric',criteria:[{id:'c1',name:'Investigación',max:4},{id:'c2',name:'Producto',max:4}],convert_to_grade:true,created_at:new Date().toISOString()});
      const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false}));
      await MiAulaDB.add('evaluations',{group_id:gid,instrument_id:1,title:'Proyecto 1',student_id:st[0].id,team_name:'',raw_score:7,grade:8.75,details:{c1:4,c2:3},notes:'',evaluation_date:'2026-10-20',period:'1',created_at:new Date().toISOString()});
      const grading=[];for(const p of ['1','2','3'])grading.push(await computeGroupGrading(gid,p));
      return {backup:await MiAulaDB.exportBackup(),grading:JSON.stringify(grading),gid};
    },gid);
    await ctx.close();
  }

  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',acceptDownloads:true});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await p.waitForTimeout(1200);
  let gid;
  if(legacy){
    const same=await p.evaluate(async lg=>{await MiAulaDB.restoreBackup(lg.backup);const grading=[];for(const p of ['1','2','3'])grading.push(await computeGroupGrading(lg.gid,p));return JSON.stringify(grading)===lg.grading;},legacy);
    check('8a. Los datos de la versión anterior se abren igual (mismos promedios en los 3 parciales)',same);
    await p.reload();await p.waitForTimeout(1500);
    gid=legacy.gid;
    const proj=await p.evaluate(async()=>{await loadInstruments();return {opts:[...document.querySelectorAll('#evalInstrument option')].map(o=>o.textContent),evals:(await MiAulaDB.all('evaluations')).length};});
    check('8b. Proyecto sigue mostrando su instrumento anterior y su evaluación',proj.opts.some(o=>o.startsWith('Rúbrica Proyecto anterior'))&&proj.evals===1);
  }else{gid=await seed(p);await p.reload();await p.waitForTimeout(1500);}
  const baseline=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.work_avg),gid);

  // ---------- Crear actividad con rúbrica desde la pantalla ----------
  await p.evaluate(()=>goView('activities'));await p.waitForTimeout(700);
  await p.click('#activitiesTabs [data-tab="rubrics"]');await p.waitForTimeout(600);
  await p.screenshot({path:path.join(OUT,'01-biblioteca.png')});
  await p.click('#activitiesTabs [data-tab="activities"]');
  await p.check('#activityForm input[name="grading_mode"][value="rubric"]');
  check('Al elegir rúbrica se oculta el puntaje máximo y aparece el selector',await p.evaluate(()=>$('#activityMaxLabel').classList.contains('hidden')&&!$('#activityRubricLabel').classList.contains('hidden')));
  await p.selectOption('#activityRubricSelect','bank:bank-exposicion');
  await p.fill('#activityForm input[name="title"]','Exposición tema 1');
  await p.click('#activityForm button[type="submit"]');await p.waitForTimeout(800);
  const act=await p.evaluate(async()=>(await MiAulaDB.all('activities')).find(a=>a.title==='Exposición tema 1'));
  check('Se crea la actividad con una copia de la rúbrica y puntaje 10',act&&act.grading_mode==='rubric'&&act.max_score===10&&act.rubric?.criteria?.length===5);

  // ---------- 1. Evaluar: 8.05 ----------
  await p.evaluate(()=>goView('notebook'));await p.waitForTimeout(900);
  await p.screenshot({path:path.join(OUT,'02-cuaderno-columna-rubrica.png')});
  await p.click('.rubric-cell-btn >> nth=0');await p.waitForTimeout(600);
  const crit=act.rubric.criteria.map(c=>c.id),pick=[0,1,2,3,0];
  for(let i=0;i<5;i++){await p.click(`#rubricEval .rb-level[data-crit="${crit[i]}"][data-level="${pick[i]}"]`);await p.waitForTimeout(60);}
  await p.waitForTimeout(500);
  const shown=await p.evaluate(()=>document.querySelector('#rubricEval .rb-score b').textContent);
  const focusNext=await p.evaluate(()=>document.activeElement?.id==='rbNext');
  await p.screenshot({path:path.join(OUT,'03-evaluar-con-rubrica.png')});
  const st1=await p.evaluate(async aid=>{const s=(await MiAulaDB.groupStudents(+(await MiAulaDB.get('activities',aid)).group_id,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number)[0];return (await MiAulaDB.firstByIndex('grades','unique_key',[aid,s.id]))?.score;},act.id);
  check('1a. Ejemplo de la rúbrica: la nota es 8.05 (en pantalla y guardada)',shown==='8.05'&&st1===8.05,`pantalla ${shown}, guardada ${st1}`);
  check('Al completar el último criterio el foco pasa a «Siguiente alumno»',focusNext);
  // tocar el mismo nivel lo quita y otro lo cambia
  await p.click(`#rubricEval .rb-level[data-crit="${crit[4]}"][data-level="0"]`);await p.waitForTimeout(150);
  const afterUntap=await p.evaluate(()=>document.querySelector('#rubricEval .rb-score small').textContent);
  await p.click(`#rubricEval .rb-level[data-crit="${crit[4]}"][data-level="0"]`);await p.waitForTimeout(150);
  check('Tocar el mismo nivel lo quita (queda «Faltan»)',/Faltan/i.test(afterUntap));
  // ---------- 2. Incompleta = pendiente ----------
  await p.click('#rbNext');await p.waitForTimeout(300);
  await p.click(`#rubricEval .rb-level[data-crit="${crit[0]}"][data-level="0"]`);await p.click(`#rubricEval .rb-level[data-crit="${crit[1]}"][data-level="0"]`);await p.waitForTimeout(400);
  await p.click('#rubricEval [data-rb="close"]');await p.waitForTimeout(1200);
  const cell2=await p.evaluate(()=>document.querySelectorAll('.rubric-cell-btn')[1]?.textContent);
  const avg=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.work_avg),gid);
  check('2. Rúbrica incompleta: la casilla dice «2/5» y no cuenta en el promedio (no es cero)',cell2==='2/5'&&avg[1]===baseline[1],`casilla ${cell2}, promedio ${baseline[1]} → ${avg[1]}`);
  check('La nota completa sí entra al promedio con la ponderación existente',avg[0]!==baseline[0]&&Math.abs(avg[0]-(baseline[0]+8.05)/2)<0.011,`${baseline[0]} → ${avg[0]}`);
  await p.screenshot({path:path.join(OUT,'04-cuaderno-con-notas.png')});

  // ---------- 8c. Excel ----------
  const xl=await p.evaluate(async gid=>{const nb=await buildNotebookWorkbook(gid,'1');const all=await buildWorkbook(gid);const flat=JSON.stringify(nb)+JSON.stringify(all);return {has805:flat.includes('8.05'),hasText:flat.includes('2 de 5 criterios')};},gid);
  check('8c. Excel muestra la nota de rúbrica (8.05) y la incompleta como «2 de 5 criterios»',xl.has805&&xl.hasText);

  // ---------- 1b. Lista de cotejo = 8 ----------
  const cotejoId=await p.evaluate(async gid=>{const snap=await rubricSnapshotFromRef('bank:bank-cotejo-tarea');return MiAulaDB.add('activities',{group_id:gid,title:'Entrega tarea',activity_type:'Trabajo',activity_date:'2026-10-21',max_score:10,weight:1,period:'1',grading_mode:'rubric',rubric:snap,created_at:new Date().toISOString()});},gid);
  await p.evaluate(aid=>openRubricEvaluator(aid),cotejoId);await p.waitForTimeout(600);
  const cc=await p.evaluate(()=>[...new Set([...document.querySelectorAll('#rubricEval .rb-level')].map(b=>b.dataset.crit))]);
  for(let i=0;i<5;i++)await p.click(`#rubricEval .rb-level[data-crit="${cc[i]}"][data-level="${i===4?1:0}"]`);
  await p.waitForTimeout(400);
  const cot=await p.evaluate(()=>({score:document.querySelector('#rubricEval .rb-score b').textContent,noRed:!!document.querySelector('#rubricEval .rb-level.is-no.on')}));
  await p.screenshot({path:path.join(OUT,'05-lista-de-cotejo.png')});
  check('1b. Lista de cotejo: 4 «Sí» de 5 = 8, y el «No» elegido se ve en rojo',cot.score==='8'&&cot.noRed,`nota ${cot.score}`);
  await p.click('#rubricEval [data-rb="close"]');await p.waitForTimeout(800);

  // ---------- 3. Plantilla vs. copia; editar peso recalcula ----------
  const r3=await p.evaluate(async gid=>{
    await copyBankRubric('bank-investigacion');await new Promise(r=>setTimeout(r,300));closeRubricEditor();
    const tpl=(await loadRubricTemplates())[0];
    const snap=await rubricSnapshotFromRef('mine:'+tpl.id);
    const aid=await MiAulaDB.add('activities',{group_id:gid,title:'Investigación',activity_type:'Trabajo',activity_date:'2026-10-21',max_score:10,weight:1,period:'1',grading_mode:'rubric',rubric:snap,created_at:new Date().toISOString()});
    const s=(await MiAulaDB.groupStudents(gid,{includeInactive:false}))[0];
    const sel=Object.fromEntries(snap.criteria.map((c,i)=>[c.id,i%4]));
    const sc=MiAulaRubricas.rubricScore(snap,sel,10).score;
    await MiAulaDB.add('grades',{activity_id:aid,student_id:s.id,score:sc,status:'',notes:'',rubric_levels:sel});
    tpl.criteria[0].w=1;tpl.levels[0].p=1;await MiAulaDB.put('instruments',tpl);
    const a=await MiAulaDB.get('activities',aid);
    const g=await MiAulaDB.firstByIndex('grades','unique_key',[aid,s.id]);
    return {aid,sid:s.id,before:sc,copyUnchanged:a.rubric.criteria[0].w===25&&a.rubric.levels[0].p===10,stored:g.score,recomputed:rubricGradeScore(a,g)};
  },gid);
  check('3a. Editar la plantilla no cambia la rúbrica ni la nota de la actividad',r3.copyUnchanged&&r3.recomputed===r3.before,`nota ${r3.before}`);
  await p.evaluate(aid=>openActivityRubricEditor(aid),r3.aid);await p.waitForTimeout(500);
  const lockedUI=await p.evaluate(()=>({notice:!!document.querySelector('#rubricEditor .rb-notice'),add:!!document.querySelector('#rubricEditor [data-rbe="add-criterion"]'),del:!!document.querySelector('#rubricEditor [data-c-del]'),addLevel:!!document.querySelector('#rubricEditor [data-rbe="add-level"]')}));
  check('4a. Con alumnos evaluados no aparecen «+ Agregar criterio», quitar criterio ni «+ Nivel»',lockedUI.notice&&!lockedUI.add&&!lockedUI.del&&!lockedUI.addLevel);
  await p.screenshot({path:path.join(OUT,'06-editor-rubrica-actividad.png')});
  await p.fill('#rubricEditor [data-c-w="0"]','5');await p.waitForTimeout(100);
  const pctShown=await p.evaluate(()=>document.querySelector('#rubricEditor [data-c-pct="0"]').textContent);
  await p.click('#rubricEditor [data-rbe="save"]');await p.waitForTimeout(800);
  const r3b=await p.evaluate(async r=>{const a=await MiAulaDB.get('activities',r.aid);const g=await MiAulaDB.firstByIndex('grades','unique_key',[r.aid,r.sid]);return {w:a.rubric.criteria[0].w,stored:g.score,expected:MiAulaRubricas.rubricScore(a.rubric,g.rubric_levels,10).score};},r3);
  check('3b. Cambiar un peso en la actividad recalcula la nota guardada',r3b.w===5&&r3b.stored===r3b.expected&&r3b.stored!==r3.before,`${r3.before} → ${r3b.stored}; % en pantalla ${pctShown}`);
  const r4=await p.evaluate(async r=>{const a=await MiAulaDB.get('activities',r.aid);const more=MiAulaRubricas.clone(a.rubric);more.criteria.push({id:'x',n:'Nuevo',w:5,d:['','','','']});return MiAulaRubricas.canApplyActivityEdit(activityRubric(a),more,true).ok;},r3);
  check('4b. La regla rechaza agregar criterios con alumnos evaluados',r4===false);

  // ---------- Rúbrica dañada ----------
  const dmg=await p.evaluate(async gid=>{const aid=await MiAulaDB.add('activities',{group_id:gid,title:'Dañada',activity_type:'Trabajo',activity_date:'2026-10-21',max_score:10,weight:1,period:'1',grading_mode:'rubric',rubric:{kind:'rubrica',levels:'roto'},created_at:new Date().toISOString()});
    const s=(await MiAulaDB.groupStudents(gid,{includeInactive:false}))[0];await MiAulaDB.add('grades',{activity_id:aid,student_id:s.id,score:10,status:'',rubric_levels:{a:0}});
    const res=await computeGroupGrading(gid,'1');goView('notebook');await new Promise(r=>setTimeout(r,800));
    return {rows:res.students.length,broken:document.querySelectorAll('.rubric-cell-btn.broken').length};},gid);
  check('Rúbrica dañada: esa actividad queda sin notas y lo demás carga normal',dmg.rows>0&&dmg.broken>0);
  await p.evaluate(async()=>{const a=(await MiAulaDB.all('activities')).find(x=>x.title==='Dañada');await MiAulaDB.deleteActivity(a.id);});

  // ---------- 5. Archivo de rúbricas ----------
  await p.evaluate(()=>{goView('activities');setActivitiesTab('rubrics');});await p.waitForTimeout(600);
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>exportMyRubrics())]);
  const fileTxt=fs.readFileSync(await dl.path(),'utf8');
  const names=await p.evaluate(async()=>(await MiAulaDB.all('students')).flatMap(s=>[s.paternal_last_name,s.given_names]));
  check('5a. El archivo no contiene nombres de alumnos ni calificaciones',!names.some(n=>fileTxt.includes(n))&&!/rubric_levels|student/.test(fileTxt));
  const filePath=path.join(OUT,'rubricas.json');fs.writeFileSync(filePath,fileTxt);
  const countBefore=await p.evaluate(async()=>(await loadRubricTemplates()).length);
  await p.evaluate(()=>openRubricImport());await p.setInputFiles('#rubricImportFile',filePath);await p.waitForTimeout(500);
  await p.screenshot({path:path.join(OUT,'07-traer-rubricas.png')});
  await p.click('#rubricImportApply');await p.waitForTimeout(700);
  const namesAfter=await p.evaluate(async()=>(await loadRubricTemplates()).map(t=>t.name));
  check('5c. Al importar, los nombres repetidos no se pisan («(2)»)',namesAfter.length===countBefore+1&&namesAfter.some(n=>/\(2\)$/.test(n)),namesAfter.join(' | '));
  const tampered=JSON.parse(fileTxt);tampered.rubrics[0].name='Cambiado a mano';const tp=path.join(OUT,'modificado.json');fs.writeFileSync(tp,JSON.stringify(tampered));
  await p.evaluate(()=>openRubricImport());await p.setInputFiles('#rubricImportFile',tp);await p.waitForTimeout(400);
  const tMsg=await p.evaluate(()=>document.querySelector('#rubricImportResult').textContent);
  const countT=await p.evaluate(async()=>(await loadRubricTemplates()).length);
  check('5b. Un archivo modificado se rechaza y no agrega nada',/modificado/.test(tMsg)&&countT===namesAfter.length);
  const bk=path.join(OUT,'respaldo.json');fs.writeFileSync(bk,JSON.stringify(await p.evaluate(()=>MiAulaDB.exportBackup())));
  await p.setInputFiles('#rubricImportFile',bk);await p.waitForTimeout(400);
  check('5d. Si se sube una copia de seguridad, el aviso lo dice claramente',/COPIA DE SEGURIDAD/.test(await p.evaluate(()=>document.querySelector('#rubricImportResult').textContent)));
  await p.evaluate(()=>closeModal());

  // ---------- 6. Calificar por equipos ----------
  const teamSetup=await p.evaluate(async gid=>{
    const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number);
    await saveTeamsRecord(gid,[{name:'Equipo 1',member_ids:[st[0].id,st[1].id,st[2].id]},{name:'Equipo 2',member_ids:[st[3].id,st[4].id]},{name:'Equipo 3',member_ids:[st[5].id]}]);
    await MiAulaDB.deactivateStudent(st[2].id);
    const aid=await MiAulaDB.add('activities',{group_id:gid,title:'Práctica en equipo',activity_type:'Práctica',activity_date:'2026-10-22',max_score:10,weight:1,period:'1',created_at:new Date().toISOString()});
    await MiAulaDB.add('grades',{activity_id:aid,student_id:st[1].id,score:7,status:'',notes:''});
    return {aid,ids:st.slice(0,6).map(s=>s.id)};
  },gid);
  await p.evaluate(()=>goView('notebook'));await p.waitForTimeout(800);
  await p.evaluate(aid=>openTeamGrading(aid),teamSetup.aid);await p.waitForTimeout(500);
  await p.click('#tgApply');await p.waitForTimeout(200);
  const emptyMsg=await p.evaluate(()=>$('#tgErrors').textContent);
  await p.fill('#modalBody input[data-tg="0"]','9');await p.fill('#modalBody input[data-tg="1"]','11');
  await p.click('#tgApply');await p.waitForTimeout(200);
  const rangeMsg=await p.evaluate(()=>$('#tgErrors').textContent);
  await p.fill('#modalBody input[data-tg="1"]','8');
  await p.screenshot({path:path.join(OUT,'08-calificar-por-equipos.png')});
  await p.click('#tgApply');await p.waitForTimeout(900);
  const g6=async()=>p.evaluate(async t=>{const out={};for(const id of t.ids){const g=await MiAulaDB.firstByIndex('grades','unique_key',[t.aid,id]);out[id]=g?.score??null;}return out;},teamSetup);
  const after=await g6();const [s0,s1,s2,s3,s4,s5]=teamSetup.ids;
  check('6a. Sin «Reemplazar» solo se llena a quien no tenía nota',after[s0]===9&&after[s1]===7&&after[s3]===8&&after[s4]===8,JSON.stringify(after));
  check('6b. Alumno dado de baja no se califica aunque siga en el equipo',after[s2]===null);
  check('6c. Validación: ningún equipo lleno y fuera de rango',/ningún equipo/.test(emptyMsg)&&/no es válida/.test(rangeMsg));
  const undoMsg=await p.evaluate(()=>$('#actionUndoMessage').textContent);
  await p.click('#actionUndoBtn');await p.waitForTimeout(900);
  const undone=await g6();
  check('6d. Deshacer regresa todo como estaba en un solo paso',undone[s0]===null&&undone[s1]===7&&undone[s3]===null,undoMsg);
  await p.evaluate(aid=>openTeamGrading(aid),teamSetup.aid);await p.waitForTimeout(400);
  await p.fill('#modalBody input[data-tg="0"]','9');await p.check('#tgReplace');await p.click('#tgApply');await p.waitForTimeout(900);
  const rep=await g6();
  check('6e. Con «Reemplazar» también cambia la nota que ya existía',rep[s1]===9&&rep[s0]===9);

  // ---------- 7. Modo equipo en rúbrica ----------
  await p.evaluate(aid=>openRubricEvaluator(aid,{mode:'team'}),act.id);await p.waitForTimeout(600);
  const tState=async()=>p.evaluate(async t=>{const out={};for(const id of t.ids.slice(0,2)){const g=await MiAulaDB.firstByIndex('grades','unique_key',[t.aid,id]);out[id]=g?.rubric_levels?.[t.c]??null;}return out;},{aid:act.id,ids:teamSetup.ids,c:crit[2]});
  // Equipo 1 tiene a los alumnos 1 y 2 (el 3 está de baja). El alumno 1 ya tenía evaluación completa.
  check('Aviso cuando los integrantes tienen evaluaciones distintas',await p.evaluate(()=>!!document.querySelector('#rubricEval .rb-warning')));
  await p.screenshot({path:path.join(OUT,'09-evaluar-por-equipos.png')});
  await p.click(`#rubricEval .rb-level[data-crit="${crit[2]}"][data-level="1"]`);await p.waitForTimeout(400);
  const t1=await tState();
  await p.click(`#rubricEval .rb-level[data-crit="${crit[2]}"][data-level="1"]`);await p.waitForTimeout(400);
  const t2=await tState();
  check('7a. Un toque llega a todos los integrantes',Object.values(t1).every(v=>v===1),JSON.stringify(t1));
  check('7b. Quitar el nivel lo quita a todos',Object.values(t2).every(v=>v===null),JSON.stringify(t2));
  const bajaGrade=await p.evaluate(async t=>(await MiAulaDB.firstByIndex('grades','unique_key',[t.aid,t.id]))?.rubric_levels,{aid:act.id,id:teamSetup.ids[2]});
  check('7c. El integrante dado de baja no recibe la evaluación del equipo',bajaGrade==null);
  await p.click(`#rubricEval .rb-level[data-crit="${crit[2]}"][data-level="0"]`);await p.waitForTimeout(300);
  await p.click('#rubricEval [data-rb="mode-student"]');await p.waitForTimeout(300);
  await p.click('#rubricEval [data-rb="next"]');await p.waitForTimeout(300);
  await p.click(`#rubricEval .rb-level[data-crit="${crit[2]}"][data-level="3"]`);await p.waitForTimeout(500);
  const t3=await tState();
  check('7d. El ajuste individual solo cambia a un alumno',t3[teamSetup.ids[0]]===0&&t3[teamSetup.ids[1]]===3,JSON.stringify(t3));
  await p.click('#rubricEval [data-rb="all-best"]');await p.waitForTimeout(400);
  await p.click('#actionUndoBtn');await p.waitForTimeout(600);
  const t4=await tState();
  check('«Todo en Destacado» tiene Deshacer',t4[teamSetup.ids[1]]===3,JSON.stringify(t4));
  await p.click('#rubricEval [data-rb="close"]');await p.waitForTimeout(800);

  // ---------- Accesibilidad básica ----------
  await p.evaluate(aid=>openRubricEvaluator(aid),act.id);await p.waitForTimeout(500);
  const a11y=await p.evaluate(()=>{const b=[...document.querySelectorAll('#rubricEval .rb-level')];return b.length>0&&b.every(x=>x.getAttribute('aria-label')&&x.hasAttribute('aria-pressed')&&x.tagName==='BUTTON');});
  await p.keyboard.press('Tab');await p.keyboard.press('Enter');await p.waitForTimeout(300);
  check('Botones de nivel con etiqueta para lector de pantalla y operables con teclado',a11y);
  await p.keyboard.press('Escape');await p.waitForTimeout(600);
  check('Escape cierra la pantalla de evaluación',await p.evaluate(()=>$('#rubricEval').classList.contains('hidden')));

  // ---------- Escape de textos ----------
  const xss=await p.evaluate(async()=>{
    const r={name:'<img src=x onerror="window.__xss=1">',kind:'rubrica',levels:[{n:'<b>A</b>',p:10},{n:'B',p:5}],criteria:[{n:'<script>window.__xss=2</script>',w:1,d:['<i>x</i>','y']}]};
    await MiAulaDB.add('instruments',{...MiAulaRubricas.normalizeRubric(r).rubric,format:MiAulaRubricas.FORMAT});
    await renderRubricLibrary();await new Promise(r=>setTimeout(r,200));return {flag:window.__xss||0,img:document.querySelectorAll('#rubricLibrary img').length};
  });
  check('Los textos de las rúbricas se muestran escapados',xss.flag===0&&xss.img===0);

  // ---------- Modo claro ----------
  await p.evaluate(()=>{localStorage.setItem('miaula:theme','light');document.documentElement.setAttribute('data-theme','light');});
  await p.evaluate(aid=>openRubricEvaluator(aid),act.id);await p.waitForTimeout(500);
  await p.screenshot({path:path.join(OUT,'10-evaluar-modo-claro.png')});
  await p.evaluate(()=>{closeRubricEvaluator();localStorage.setItem('miaula:theme','dark');document.documentElement.removeAttribute('data-theme');});

  check('Sin errores de JavaScript durante la prueba',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(r=>!r.ok);
  fs.writeFileSync(path.join(OUT,'resultado.json'),JSON.stringify(results,null,2));
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
