'use strict';
// Prueba del Banco de rúbricas en Proyecto (MiAula 2.9.0).
// Uso: APP_URL=http://localhost:8000/index.html [OUT=carpeta] node tests/e2e/proyecto.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8771/index.html';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-proy-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=require('../../rubricas.js');
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);

(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block',acceptDownloads:true});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1400);
  // Datos ficticios con un instrumento y una evaluación del formato anterior
  const seed=await p.evaluate(async()=>{
    const gid=await MiAulaDB.add('groups',{name:'4C',discipline:'Módulo profesional (prueba)',school_year:'2026-2027',total_periods:3,active:1,current_period:1,closed_periods:[],course_closed:false,created_at:new Date().toISOString()});
    for(const [a,n] of [['Arce','Ana'],['Bello','Beto'],['Cruz','Caro'],['Díaz','Dani']]){const d={group_id:gid,paternal_last_name:a,maternal_last_name:'Prueba',given_names:n,active:1,student_code:'P'+a,created_at:new Date().toISOString()};d.name=`${a} Prueba ${n}`;await MiAulaDB.add('students',d);}
    await MiAulaDB.reorganizeGroup(gid,true);
    const st=(await MiAulaDB.groupStudents(gid,{includeInactive:false})).sort((a,b)=>a.list_number-b.list_number);
    const iid=await MiAulaDB.add('instruments',{name:'Rúbrica antigua',instrument_type:'rubric',criteria:[{id:'c1',name:'Investigación',max:4},{id:'c2',name:'Producto',max:4}],convert_to_grade:true,created_at:new Date().toISOString()});
    await MiAulaDB.add('evaluations',{group_id:gid,instrument_id:iid,title:'Proyecto antiguo',student_id:st[0].id,team_name:'',raw_score:7,grade:8.75,details:{c1:4,c2:3},notes:'',evaluation_date:'2026-10-10',period:'1',created_at:new Date().toISOString()});
    await saveTeamsRecord(gid,[{name:'Equipo A',member_ids:[st[0].id,st[1].id]},{name:'Equipo B',member_ids:[st[2].id,st[3].id]}]);
    return {gid,iid,ids:st.map(s=>s.id)};
  });
  await p.reload();await wait(p,1400);
  await p.evaluate(gid=>setContextGroup(gid),seed.gid);await wait(p,300);
  const before=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.principal_avg),seed.gid);
  check('Formato anterior: la evaluación de proyecto se sigue contando igual',before[0]===8.75,String(before[0]));

  await p.evaluate(()=>goView('evaluation'));await wait(p,900);
  const ui=await p.evaluate(()=>({btns:['#bankPick','#bankModify','#bankCreate','#bankUpload'].every(id=>!!document.querySelector(id)),legacyKept:!!document.querySelector('details.legacy-instruments #instrumentForm')&&!!document.querySelector('#instrumentCards .instrument-card'),hist:document.querySelector('#evalHistory').textContent.includes('Rúbrica antigua')}));
  check('Se ven los 4 botones: Elegir, Modificar, Crear y Subir',ui.btns);
  check('Los instrumentos anteriores siguen disponibles (sección «Formato anterior»)',ui.legacyKept);
  check('El historial muestra el proyecto antiguo con su instrumento',ui.hist);
  await p.screenshot({path:path.join(OUT,'p1-proyecto-banco.png')});

  // 1. Elegir una ya hecha
  await p.click('#bankPick');await wait(p,500);
  await p.screenshot({path:path.join(OUT,'p2-elegir.png')});
  await p.click('#modalBody .picker-row:has-text("Proyecto en equipo") button:has-text("Usar esta")');await wait(p,700);
  const selRef=await p.evaluate(()=>$('#evalInstrument').value);
  check('Elegir una ya hecha: queda seleccionada y aparece la tabla para evaluar',selRef==='bank:bank-proyecto-equipo'&&await p.evaluate(()=>document.querySelectorAll('#evalCriteria .rb-level').length===16));
  // evaluar por equipo guardado
  await p.fill('#evalTitle','Prototipo final');
  await p.selectOption('#evalSavedTeam','0');await wait(p,500);
  const checked=await p.evaluate(()=>$$('#evalStudents input:checked').map(x=>+x.value));
  check('Equipo guardado marca a sus integrantes (como antes)',checked.length===2&&checked.includes(seed.ids[0])&&checked.includes(seed.ids[1]));
  // incompleta no se guarda
  await p.click('#saveEvaluation');await wait(p,400);
  check('Si faltan criterios no se guarda (no se inventa un cero)',await p.evaluate(async()=>(await MiAulaDB.all('evaluations')).length)===1);
  const crit=await p.evaluate(()=>[...new Set($$('#evalCriteria .rb-level').map(b=>b.dataset.peCrit))]);
  const pick=[0,1,0,2];
  for(let i=0;i<4;i++){await p.click(`#evalCriteria .rb-level[data-pe-crit="${crit[i]}"][data-pe-level="${pick[i]}"]`);await wait(p,80);}
  const live=await p.evaluate(()=>document.querySelector('#evalCriteria .pe-score b').textContent);
  await p.screenshot({path:path.join(OUT,'p3-evaluar-proyecto.png')});
  await p.click('#saveEvaluation');await wait(p,900);
  const ev=await p.evaluate(async()=>(await MiAulaDB.all('evaluations')).filter(e=>e.title==='Prototipo final'));
  const expected=Math.round((20*10+30*8+30*10+20*6)/(100*10)*10*100)/100;
  check('Nota en vivo y guardada con la fórmula ponderada',Number(live)===expected&&ev.length===2&&ev.every(e=>e.grade===expected&&e.rubric?.criteria?.length===4),`${live} / ${expected}`);
  const after=await p.evaluate(async gid=>(await computeGroupGrading(gid,'1')).students.map(s=>s.principal_avg),seed.gid);
  check('El componente Proyecto promedia la evaluación antigua y la nueva',Math.abs(after[0]-(8.75+expected)/2)<0.011&&after[1]===expected,JSON.stringify(after));
  check('El historial muestra el nombre de la rúbrica nueva',await p.evaluate(()=>document.querySelector('#evalHistory').textContent.includes('Proyecto en equipo')));

  // 2. Modificar una (copia del banco)
  await p.click('#bankModify');await wait(p,500);
  await p.click('#modalBody .picker-row:has-text("Proyecto en equipo") button:has-text("Hacer una copia y modificar")');await wait(p,800);
  check('Modificar una del banco abre el editor con una copia',await p.evaluate(()=>!$('#rubricEditor').classList.contains('hidden')&&$('#rbeName').value.includes('mi copia')));
  await p.fill('#rbeName','Proyecto Arduino 4C');await p.fill('#rubricEditor [data-c-w="0"]','40');
  await p.click('#rubricEditor [data-rbe="save"]');await wait(p,900);
  const modRef=await p.evaluate(()=>$('#evalInstrument').value);
  const mod=await p.evaluate(async ref=>{const t=await MiAulaDB.get('instruments',+ref.slice(5));return {name:t?.name,w:t?.criteria?.[0]?.w};},modRef);
  check('Al guardar, la rúbrica modificada queda elegida para evaluar',modRef.startsWith('mine:')&&mod.name==='Proyecto Arduino 4C'&&mod.w===40,modRef);
  const unchanged=await p.evaluate(async()=>(await MiAulaDB.all('evaluations')).filter(e=>e.title==='Prototipo final').every(e=>e.rubric.criteria[0].w===20&&e.grade===8.6));
  check('Modificar la rúbrica no cambia los proyectos ya evaluados',unchanged);

  // 3. Crear una nueva (lista de cotejo)
  await p.click('#bankCreate');await wait(p,400);
  await p.click('#modalBody .bank-action:has-text("Lista de cotejo")');await wait(p,600);
  await p.fill('#rbeName','Entrega de prototipo');
  await p.fill('#rubricEditor [data-c-name="0"]','Funciona');
  await p.click('#rubricEditor [data-rbe="add-criterion"]');await wait(p,200);
  await p.fill('#rubricEditor [data-c-name="1"]','Incluye manual');
  await p.click('#rubricEditor [data-rbe="save"]');await wait(p,900);
  const created=await p.evaluate(async()=>{const ref=$('#evalInstrument').value;const t=await MiAulaDB.get('instruments',+ref.slice(5));return {ref,kind:t?.kind,n:t?.criteria?.length};});
  check('Crear una nueva lista de cotejo y queda elegida',created.kind==='cotejo'&&created.n===2,JSON.stringify(created));

  // 4. Subir un archivo
  const file=R.buildShareFile([{name:'Rúbrica compartida',kind:'rubrica',levels:[{n:'Bien',p:10},{n:'Regular',p:6}],criteria:[{n:'Contenido',w:1,d:['Completo','Incompleto']}]}]);
  const fp=path.join(OUT,'compartida.json');fs.writeFileSync(fp,JSON.stringify(file));
  await p.click('#bankUpload');await wait(p,400);await p.setInputFiles('#rubricImportFile',fp);await wait(p,500);
  await p.click('#rubricImportApply');await wait(p,900);
  check('Subir un archivo: aparece en «Mis rúbricas» del Proyecto',await p.evaluate(()=>$('#projectMyRubrics').textContent.includes('Rúbrica compartida')&&[...$('#evalInstrument').options].some(o=>o.textContent.includes('Rúbrica compartida'))));
  await p.screenshot({path:path.join(OUT,'p4-mis-rubricas.png')});

  // 5. Formato anterior sigue evaluando
  await p.selectOption('#evalInstrument',`legacy:${seed.iid}`);await wait(p,400);
  await p.fill('#evalTitle','Proyecto con instrumento antiguo');
  await p.check(`#evalStudents input[value="${seed.ids[2]}"]`);
  await p.click('#evalCriteria .criterion-eval:nth-child(1) button[data-value="4"]');await p.click('#evalCriteria .criterion-eval:nth-child(2) button[data-value="2"]');
  await p.click('#saveEvaluation');await wait(p,900);
  const leg=await p.evaluate(async()=>(await MiAulaDB.all('evaluations')).find(e=>e.title==='Proyecto con instrumento antiguo'));
  check('Evaluar con un instrumento del formato anterior funciona igual que antes',leg&&leg.grade===7.5&&leg.instrument_id===seed.iid,String(leg?.grade));

  // Excel
  const xl=await p.evaluate(async gid=>JSON.stringify(await buildWorkbook(gid)),seed.gid);
  check('Excel (hoja de evaluaciones) incluye proyectos nuevos y antiguos',xl.includes('Proyecto en equipo')&&xl.includes('Rúbrica antigua'));
  // Respaldo → restaurar
  const same=await p.evaluate(async gid=>{const b=await MiAulaDB.exportBackup();const a1=JSON.stringify((await computeGroupGrading(gid,'1')).students.map(s=>s.principal_avg));await MiAulaDB.restoreBackup(JSON.parse(JSON.stringify(b)));return a1===JSON.stringify((await computeGroupGrading(gid,'1')).students.map(s=>s.principal_avg));},seed.gid);
  check('Respaldo y restauración conservan los proyectos',same);
  // Modo claro
  await p.evaluate(()=>{document.documentElement.setAttribute('data-theme','light');goView('evaluation');});await wait(p,700);
  await p.evaluate(()=>{$('#evalInstrument').value='bank:bank-prototipo';$('#evalInstrument').onchange();});await wait(p,500);
  await p.screenshot({path:path.join(OUT,'p5-proyecto-claro.png')});
  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(r=>!r.ok);
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
