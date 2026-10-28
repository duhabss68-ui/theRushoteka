'use strict';
// Pruebas de la lógica de rúbricas y equipos. Ejecutar: node --test tests/
const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../rubricas.js');

const L4=[{n:'Destacado',p:10},{n:'Satisfactorio',p:8},{n:'Suficiente',p:6},{n:'Requiere apoyo',p:5}];
const sample=()=>({name:'Exposición de prueba',kind:'rubrica',levels:JSON.parse(JSON.stringify(L4)),criteria:[
  {id:'a',n:'Dominio',w:30,d:['','','','']},{id:'b',n:'Organización',w:20,d:['','','','']},
  {id:'c',n:'Voz',w:20,d:['','','','']},{id:'d',n:'Material',w:15,d:['','','','']},{id:'e',n:'Tiempo',w:15,d:['','','','']}]});

test('1a. Ejemplo de verificación: 8.05 sobre 10',()=>{
  const r=R.rubricScore(sample(),{a:0,b:1,c:2,d:3,e:0},10);
  assert.equal(r.complete,true);assert.equal(r.score,8.05);
});
test('1b. Lista de cotejo: 4 «Sí» de 5 = 8',()=>{
  const c={name:'Cotejo',kind:'cotejo',criteria:['1','2','3','4','5'].map((n,i)=>({id:'k'+i,n}))};
  const r=R.rubricScore(c,{k0:0,k1:0,k2:0,k3:0,k4:1},10);
  assert.equal(r.score,8);
});
test('1c. La nota escala al puntaje máximo de la actividad',()=>{
  assert.equal(R.rubricScore(sample(),{a:0,b:0,c:0,d:0,e:0},20).score,20);
});
test('2. Rúbrica incompleta = pendiente (score null, no cero) y muestra avance',()=>{
  const r=R.rubricScore(sample(),{a:0,b:1},10);
  assert.equal(r.complete,false);assert.equal(r.score,null);assert.equal(r.done,2);assert.equal(r.total,5);
});
test('2b. Rúbrica dañada: sin nota, sin lanzar error',()=>{
  const r=R.rubricScore({kind:'rubrica',levels:'roto',criteria:null},{a:0},10);
  assert.equal(r.valid,false);assert.equal(r.score,null);
  assert.equal(R.normalizeRubric(null).ok,false);
});
test('3a. La copia de la actividad no cambia al editar la plantilla',()=>{
  const plantilla=sample();
  const copia=R.snapshotForActivity(plantilla,'mine:1');
  plantilla.criteria[0].w=99;plantilla.levels[0].p=1;plantilla.criteria.push({id:'z',n:'Nuevo',w:5,d:['','','','']});
  assert.equal(copia.criteria[0].w,30);assert.equal(copia.levels[0].p,10);assert.equal(copia.criteria.length,5);
  assert.equal(R.rubricScore(copia,{a:0,b:1,c:2,d:3,e:0},10).score,8.05);
});
test('3b. Cambiar un peso en la rúbrica de la actividad recalcula la nota',()=>{
  const copia=R.snapshotForActivity(sample());const sel={a:0,b:1,c:2,d:3,e:0};
  const antes=R.rubricScore(copia,sel,10).score;
  const editada=R.clone(copia);editada.criteria[0].w=10;
  assert.equal(R.canApplyActivityEdit(copia,editada,true).ok,true);
  const despues=R.rubricScore(editada,sel,10).score;
  assert.notEqual(antes,despues);
  assert.equal(despues,Math.round((10*10+20*8+20*6+15*5+15*10)/(80*10)*10*100)/100);
});
test('4. No se pueden agregar/quitar criterios o niveles con alumnos evaluados',()=>{
  const copia=R.snapshotForActivity(sample());
  const mas=R.clone(copia);mas.criteria.push({id:'nuevo',n:'Extra',w:10,d:['','','','']});
  assert.equal(R.canApplyActivityEdit(copia,mas,true).ok,false);
  const menos=R.clone(copia);menos.criteria.pop();
  assert.equal(R.canApplyActivityEdit(copia,menos,true).ok,false);
  const nivel=R.clone(copia);nivel.levels.push({n:'Otro',p:1});nivel.criteria.forEach(c=>c.d.push(''));
  assert.equal(R.canApplyActivityEdit(copia,nivel,true).ok,false);
  assert.equal(R.canApplyActivityEdit(copia,mas,false).ok,true,'sin evaluados sí se permite');
  assert.equal(R.canChangeGradingMode(true).ok,false);assert.equal(R.canChangeGradingMode(false).ok,true);
});
test('5a. El archivo de rúbricas no contiene datos de alumnos',()=>{
  const r=sample();r.criteria[0].selected_by='GARCIA PEREZ JUAN';r.students=[{name:'GARCIA PEREZ JUAN'}];r.rubric_levels={'1|2':{a:0}};
  const file=R.buildShareFile([r]);const txt=JSON.stringify(file);
  assert.ok(!txt.includes('GARCIA'));assert.ok(!txt.includes('rubric_levels'));assert.ok(!txt.includes('students'));
  assert.equal(file.rubrics.length,1);
});
test('5b. Un archivo modificado se rechaza y no agrega nada',()=>{
  const file=R.buildShareFile([sample()]);
  assert.equal(R.parseShareFile(JSON.stringify(file)).ok,true);
  const mod=JSON.parse(JSON.stringify(file));mod.rubrics[0].criteria[0].w=100;
  const res=R.parseShareFile(JSON.stringify(mod));
  assert.equal(res.ok,false);assert.equal(res.tampered,true);assert.equal(res.items,undefined);
});
test('5c. Nombres repetidos no se pisan e ids nuevos',()=>{
  const parsed=R.parseShareFile(JSON.stringify(R.buildShareFile([sample(),sample()])));
  const prepared=R.prepareImport(parsed.items.map(i=>i.rubric),['Exposición de prueba']);
  assert.deepEqual(prepared.map(p=>p.name),['Exposición de prueba (2)','Exposición de prueba (3)']);
  assert.ok(prepared[0].criteria.every(c=>!['a','b','c','d','e'].includes(c.id)));
});
test('5d. Una copia de seguridad se detecta con aviso claro',()=>{
  const res=R.parseShareFile(JSON.stringify({format:'MiAulaMobileBackup',stores:{}}));
  assert.equal(res.ok,false);assert.equal(res.backup,true);assert.match(res.error,/COPIA DE SEGURIDAD/);
});
const parse=raw=>{const t=String(raw).trim().toUpperCase();if(t==='NP')return {score:null,status:'NP'};const n=Number(t);return Number.isFinite(n)&&n>=0&&n<=10?{score:n,status:''}:{invalid:true};};
test('6. Calificar por equipos: respeta notas, reemplazo, rango y bajas',()=>{
  const teams=[{name:'Equipo 1',member_ids:[1,2,3]},{name:'Equipo 2',member_ids:[4,5]},{name:'Equipo 3',member_ids:[6]}];
  const students=new Map([[1,{active:1}],[2,{active:1}],[3,{active:0}],[4,{active:1}],[5,{active:1,secretary_pending:true}],[6,{active:1}]]);
  const existing=new Map([[2,{score:7,status:''}]]);
  let plan=R.planTeamGrades({teams,students,existing,values:{0:'9',1:'8'},replace:false,parse});
  assert.deepEqual(plan.changes.map(c=>c.student_id),[1,4]);assert.equal(plan.kept,1);assert.equal(plan.skippedInactive,2);
  plan=R.planTeamGrades({teams,students,existing,values:{0:'9'},replace:true,parse});
  assert.deepEqual(plan.changes.map(c=>c.student_id),[1,2]);assert.equal(plan.changes[1].old.score,7,'guarda la nota anterior para Deshacer');
  plan=R.planTeamGrades({teams,students,existing,values:{0:'11',2:'abc'},replace:false,parse});
  assert.equal(plan.changes.length,0);assert.equal(plan.errors.length,2);
  plan=R.planTeamGrades({teams,students,existing,values:{},replace:false,parse});
  assert.equal(plan.filledTeams,0);
});
test('7. Modo equipo: un toque llega a todos, repetirlo quita a todos, ajuste individual',()=>{
  let sels=[{},{},{}];
  sels=R.applyTeamTap(sels,'a',1);assert.ok(sels.every(s=>s.a===1));
  sels=R.applyTeamTap(sels,'a',1);assert.ok(sels.every(s=>s.a===undefined));
  sels=R.applyTeamTap(sels,'a',0);sels[2]={...sels[2],a:3};
  assert.equal(R.teamCriterionState(sels,'a'),'mixed');assert.equal(R.selectionsDiffer(sels),true);
  assert.equal(sels[0].a,0);assert.equal(sels[1].a,0);assert.equal(sels[2].a,3,'el ajuste individual solo cambió a un alumno');
  sels=R.applyTeamTap(sels,'a',0);assert.ok(sels.every(s=>s.a===0),'desde estado mixto, el toque iguala a todos');
});
test('Banco inicial: todas las plantillas son válidas',()=>{
  for(const b of R.BANK){const n=R.normalizeRubric(b);assert.ok(n.ok,b.name+': '+n.error);assert.equal(R.validateRubric(b).length,0,b.name);}
  assert.equal(R.BANK.filter(b=>b.kind==='rubrica').length,7);assert.equal(R.BANK.filter(b=>b.kind==='cotejo').length,4);
});
test('Validación del editor',()=>{
  const e=R.validateRubric({name:'',kind:'rubrica',levels:[{n:'A',p:0},{n:'B',p:0}],criteria:[{n:'',w:0}]});
  assert.ok(e.some(x=>/nombre/.test(x)));assert.ok(e.some(x=>/mayores a cero/.test(x)));assert.ok(e.some(x=>/no tiene texto/.test(x)));assert.ok(e.some(x=>/0.1 y 100/.test(x)));
});
test('SHA-256 correcto',()=>{
  assert.equal(R.sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(R.sha256('México'),require('node:crypto').createHash('sha256').update('México').digest('hex'));
});
