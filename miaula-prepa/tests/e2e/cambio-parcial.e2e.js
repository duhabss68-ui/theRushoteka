'use strict';
// Prueba: al cerrar un parcial, el Cuaderno abre el parcial nuevo (MiAula 2.10.1).
// Uso: APP_URL=http://localhost:8000/index.html node tests/e2e/cambio-parcial.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8775/index.html';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-parcial-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);
(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1400,height:920},serviceWorkers:'block'});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1400);
  const gids=await p.evaluate(async()=>{
    const out=[];
    for(const [name,pct] of [['1A',[50,30,10,10]],['1B',[40,40,10,10]],['1C',[60,20,10,10]]]){
      const gid=await MiAulaDB.add('groups',{name,discipline:'Prueba',school_year:'2026-2027',total_periods:3,active:1,current_period:1,closed_periods:[],course_closed:false,created_at:new Date().toISOString()});
      for(const n of ['Ana','Beto','Caro']){const d={group_id:gid,paternal_last_name:name+n,maternal_last_name:'X',given_names:n,active:1,student_code:name+n,created_at:new Date().toISOString()};d.name=d.paternal_last_name+' X '+n;await MiAulaDB.add('students',d);}
      await MiAulaDB.reorganizeGroup(gid,true);
      await MiAulaDB.put('gradingSchemes',{key:`${gid}:1`,group_id:gid,period:'1',work_pct:pct[0],project_pct:pct[1],values_pct:pct[2],attitudes_pct:pct[3],principal_type:'project',mode_locked:true});
      const aid=await MiAulaDB.add('activities',{group_id:gid,title:`Trabajo P1 ${name}`,activity_type:'Trabajo',activity_date:'2026-10-20',max_score:10,weight:1,period:'1',created_at:new Date().toISOString()});
      const st=await MiAulaDB.groupStudents(gid,{includeInactive:false});for(const s of st)await MiAulaDB.add('grades',{activity_id:aid,student_id:s.id,score:8,status:''});
      out.push(gid);
    }
    // 1C ya tenía porcentajes propios en el Parcial 2 (no se deben tocar)
    await MiAulaDB.put('gradingSchemes',{key:`${out[2]}:2`,group_id:out[2],period:'2',work_pct:70,project_pct:10,values_pct:10,attitudes_pct:10,principal_type:'project',mode_locked:false});
    return out;
  });
  await p.reload();await wait(p,1400);
  const nb=async gid=>{await p.evaluate(async gid=>{await setContextGroup(gid);$('#notebookGroup').value=String(gid);goView('notebook');},gid);await wait(p,900);return p.evaluate(()=>({sel:$('#notebookPeriod').value,label:$('#notebookModeLabel').textContent,acts:[...document.querySelectorAll('.notebook-table thead .activity-head span')].map(x=>x.textContent)}));};
  // Abrir el cuaderno de cada grupo en Parcial 1 (como el docente antes de cerrar)
  for(const gid of gids){const r=await nb(gid);if(r.sel!=='1')check('Antes de cerrar se ve Parcial 1',false,JSON.stringify(r));}
  // Cerrar parcial en los 3 grupos desde la pantalla Parcial
  for(const gid of gids){await p.evaluate(async gid=>{await setContextGroup(gid);$('#gradingGroup').value=String(gid);goView('grading');},gid);await wait(p,700);await p.click('#closePeriodBtn');await wait(p,1100);}
  const cur=await p.evaluate(async ids=>Promise.all(ids.map(async id=>(await MiAulaDB.get('groups',id)).current_period)),gids);
  check('Los 3 grupos quedaron en Parcial 2',cur.every(c=>c===2),JSON.stringify(cur));
  for(const [i,gid] of gids.entries()){
    const r=await nb(gid);
    check(`Grupo ${['1A','1B','1C'][i]}: el Cuaderno abre el Parcial 2 limpio`,r.sel==='2'&&/Parcial 2/.test(r.label)&&r.acts.length===0,JSON.stringify(r));
  }
  await p.screenshot({path:path.join(OUT,'cuaderno-parcial2.png')});
  // Crear actividad desde la barra inferior → aparece en Parcial 2
  await p.evaluate(gid=>setContextGroup(gid),gids[0]);await wait(p,300);
  await p.click('.app-tab.new-activity-tab');await wait(p,700);
  await p.fill('#activityForm input[name="title"]','Primer trabajo P2');await p.click('#activityForm button[type="submit"]');await wait(p,900);
  const r2=await nb(gids[0]);
  check('Actividad nueva se crea en Parcial 2 y aparece en el Cuaderno',r2.sel==='2'&&r2.acts.includes('Primer trabajo P2'),JSON.stringify(r2));
  // Revisar Parcial 1 a mano: se conserva mientras no cambie el grupo
  await p.selectOption('#notebookPeriod','1');await wait(p,900);
  await p.evaluate(()=>goView('dashboard'));await wait(p,300);await p.evaluate(()=>goView('notebook'));await wait(p,900);
  const r3=await p.evaluate(()=>({sel:$('#notebookPeriod').value,acts:[...document.querySelectorAll('.notebook-table thead .activity-head span')].map(x=>x.textContent)}));
  check('Si eliges Parcial 1 para revisarlo, se queda en Parcial 1 con sus trabajos',r3.sel==='1'&&r3.acts.includes('Trabajo P1 1A'),JSON.stringify(r3));
  const r4=await nb(gids[1]);
  check('Al cambiar de grupo vuelve al parcial actual de ese grupo',r4.sel==='2',JSON.stringify(r4));
  // Parcial 1 intacto
  const p1=await p.evaluate(async ids=>Promise.all(ids.map(async id=>{const r=await computeGroupGrading(id,'1');return r.students.map(s=>s.work_avg).join();})),gids);
  check('Las calificaciones del Parcial 1 siguen intactas',p1.every(x=>x==='8,8,8'),JSON.stringify(p1));
  // Porcentajes del Parcial 2
  const sch=await p.evaluate(async ids=>Promise.all(ids.map(async id=>{const s=await getScheme(id,'2');return [s.work_pct,s.project_pct,s.values_pct,s.attitudes_pct,s.attendance_pct,s.mode_locked].join('/');})),gids);
  // 2.11.0: Valores+Actitudes (20%) → Asistencia 10% automática; el 10% restante pasa a Trabajos.
  check('Parcial 2 copia Trabajos/Proyecto del Parcial 1 con Asistencia 10% (y deja Proyecto/Examen por elegir)',sch[0]==='60/30/0/0/10/false'&&sch[1]==='50/40/0/0/10/false',JSON.stringify(sch));
  check('Si el Parcial 2 ya tenía porcentajes propios, se respetan (solo cambia Valores/Actitudes por Asistencia)',sch[2]==='80/10/0/0/10/false',sch[2]);
  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(x=>!x.ok);
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
