'use strict';
// Prueba MiAula 2.14.0 · Prepa: paletas (Alegre, Guinda, Personalizada), modo claro/oscuro y lista única «Rubro».
// Uso: APP_URL=http://localhost:8000/index.html [PALENCIA=dist/MiAula_Palencia_SilverBlack_X.html] node tests/e2e/apariencia.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const APP=process.env.APP_URL||'http://localhost:8776/index.html';
const PAL=process.env.PALENCIA||'';
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-apariencia-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);
const tok=(p,name)=>p.evaluate(n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim(),name);

(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1340,height:860},serviceWorkers:'block'});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(APP);await wait(p,1500);

  check('Por omisión: Alegre en modo claro',await p.evaluate(()=>!document.documentElement.hasAttribute('data-palette')&&document.documentElement.getAttribute('data-theme')==='light')&&(await tok(p,'--primary')).toUpperCase()==='#6A4DF4');
  await p.evaluate(()=>goView('more'));await wait(p,500);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#appearancePanel [data-palette-pick]')].map(b=>b.dataset.palettePick+(b.classList.contains('active')?'*':'')));
  check('Más → Apariencia con Alegre, Guinda y Personalizado',cards.join()==='alegre*,guinda,custom',cards.join());

  // ---------- Guinda ----------
  await p.click('#appearancePanel [data-palette-pick="guinda"]');await wait(p,300);
  check('Guinda claro: vino #8E2449',(await tok(p,'--primary')).toUpperCase()==='#8E2449'&&await p.evaluate(()=>document.documentElement.getAttribute('data-palette')==='guinda'));
  const btn=await p.evaluate(()=>getComputedStyle(document.querySelector('#backupBtn')).backgroundImage);
  check('Los botones dejan el degradado morado/rosa',btn.includes('155, 44, 82')||btn.includes('110, 26, 54'),btn.slice(0,90));
  await p.click('#appearancePanel [data-mode-pick="dark"]');await wait(p,300);
  check('Guinda oscuro y el modo se recuerda',(await tok(p,'--primary')).toUpperCase()==='#C9557A'&&await p.evaluate(()=>localStorage.getItem('miaula:theme')==='dark'&&!document.documentElement.hasAttribute('data-theme')));
  await p.screenshot({path:path.join(OUT,'guinda-oscuro.png')});
  await p.reload();await wait(p,1400);
  check('Al reabrir conserva Guinda oscuro',await p.evaluate(()=>document.documentElement.getAttribute('data-palette')==='guinda'&&!document.documentElement.hasAttribute('data-theme')));
  check('La barra del navegador toma el color del fondo',await p.evaluate(()=>document.querySelector('meta[name="theme-color"]').content.trim().toUpperCase()==='#170C11'));

  // ---------- Personalizado ----------
  await p.evaluate(()=>goView('more'));await wait(p,400);
  await p.click('#appearancePanel [data-palette-pick="custom"]');await wait(p,300);
  check('Personalizado muestra el selector de color y colores rápidos',await p.evaluate(()=>!!document.querySelector('#customColorInput')&&document.querySelectorAll('[data-quick-color]').length===8));
  await p.click('#appearancePanel [data-quick-color="#0F766E"]');await wait(p,300);
  const cust=await p.evaluate(()=>({pal:document.documentElement.getAttribute('data-palette'),css:!!document.getElementById('miaulaCustomPalette'),col:localStorage.getItem('miaula:customColor'),prim:getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()}));
  check('Elegir un color genera la paleta (verde azulado)',cust.pal==='custom'&&cust.css&&cust.col==='#0F766E'&&/hsl\(17\d/.test(cust.prim),JSON.stringify(cust));
  await p.click('#appearancePanel [data-mode-pick="light"]');await wait(p,300);
  const lp=await tok(p,'--primary');
  check('Personalizado también en claro (tono más oscuro para que el texto blanco se lea)',/hsl\(17\d \d+% 38%\)/.test(lp),lp);
  await p.screenshot({path:path.join(OUT,'personalizado-claro.png')});
  await p.evaluate(()=>{const i=document.querySelector('#customColorInput');i.value='#dc2626';i.dispatchEvent(new Event('input'));i.dispatchEvent(new Event('change'));});await wait(p,300);
  check('El selector de color libre funciona',await p.evaluate(()=>localStorage.getItem('miaula:customColor')==='#dc2626'&&/hsl\(0 /.test(getComputedStyle(document.documentElement).getPropertyValue('--primary'))));
  await p.reload();await wait(p,1400);
  check('Al reabrir conserva el color personalizado sin parpadeo (se aplica en <head>)',await p.evaluate(()=>document.documentElement.getAttribute('data-palette')==='custom'&&!!document.head.querySelector('#miaulaCustomPalette')));
  await p.evaluate(()=>goView('more'));await wait(p,400);
  await p.click('#appearancePanel [data-palette-pick="alegre"]');await wait(p,300);
  check('Regresar a Alegre quita la paleta personalizada',await p.evaluate(()=>!document.documentElement.hasAttribute('data-palette')&&!document.getElementById('miaulaCustomPalette'))&&(await tok(p,'--primary')).toUpperCase()==='#6A4DF4');
  check('El botón sol/luna sigue funcionando',await p.evaluate(()=>{const a=document.documentElement.getAttribute('data-theme');$('#themeToggle').click();const b=document.documentElement.getAttribute('data-theme');$('#themeToggle').click();return a!==b;}));

  // ---------- Lista única «Rubro» ----------
  const gid=await p.evaluate(async()=>{const gid=await MiAulaDB.add('groups',{name:'2C',discipline:'Física',total_periods:3,active:1,current_period:1,created_at:new Date().toISOString()});
    await MiAulaDB.put('gradingSchemes',{key:`${gid}:1`,group_id:gid,period:'1',work_pct:30,project_pct:40,values_pct:0,attitudes_pct:0,attendance_pct:10,attendance_mode:true,principal_type:'project',mode_locked:true,custom_components:[{id:'rA',name:'Laboratorio',pct:10,source:'activities'},{id:'rB',name:'Participación',pct:10,source:'manual'}]});return gid;});
  await p.reload();await wait(p,1400);
  await p.evaluate(gid=>setContextGroup(gid,{propagate:true,refresh:true}),gid);await wait(p,400);
  await p.evaluate(async()=>{goView('activities');await loadActivities();});await wait(p,600);
  const form=await p.evaluate(()=>({tipo:!!document.querySelector('#activityForm select[name="activity_type"]'),label:document.querySelector('#activityRubroLabel').firstChild.textContent.trim(),opts:[...document.querySelectorAll('#activityRubro option')].map(o=>o.textContent)}));
  check('Ya no hay lista «Tipo»; queda una sola lista «Rubro»',!form.tipo&&form.label==='Rubro',JSON.stringify(form));
  check('«Rubro» ofrece Trabajos y los rubros «Con actividades» (no los de captura)',form.opts.join('|')==='Trabajos|Laboratorio (10%)',form.opts.join('|'));
  await p.fill('#activityForm [name="title"]','Práctica de péndulo');await p.selectOption('#activityRubro','rA');
  await p.click('#activityForm button[type="submit"]');await wait(p,700);
  const act=await p.evaluate(async gid=>(await MiAulaDB.byIndex('activities','group_id',gid)).find(a=>a.title==='Práctica de péndulo'),gid);
  check('La actividad guarda el rubro y un tipo compatible',act?.component_id==='rA'&&act?.activity_type==='Trabajo',JSON.stringify({c:act?.component_id,t:act?.activity_type}));
  check('La tarjeta muestra el rubro',await p.evaluate(()=>$('#activityCards').textContent.includes('Rubro: Laboratorio')));
  await p.fill('#activityForm [name="title"]','Tarea 1');await p.selectOption('#activityRubro','');
  await p.click('#activityForm button[type="submit"]');await wait(p,700);
  check('Sin rubro cuenta en «Trabajos»',await p.evaluate(async gid=>{const a=(await MiAulaDB.byIndex('activities','group_id',gid)).find(x=>x.title==='Tarea 1');return !a.component_id&&$('#activityCards').textContent.includes('Trabajos · Parcial');},gid));
  check('El editor de rubros explica qué aparece en la lista',await p.evaluate(()=>{goView('grading');return document.querySelector('#customRubrosBox').textContent.includes('aparece en la lista «Rubro»');}));
  await wait(p,600);
  check('Opciones del rubro: «Captura 0–10» y «Con actividades»',await p.evaluate(()=>[...document.querySelectorAll('#customRubrosList .cr-source option')].slice(0,2).map(o=>o.textContent).join('|')==='Captura 0–10|Con actividades'));

  // ---------- Edición Palencia no cambia ----------
  if(PAL){
    const p2=await ctx.newPage();p2.on('pageerror',e=>errors.push('Palencia: '+e.message));
    await p2.goto('file://'+path.resolve(PAL));await wait(p2,1500);
    const e=await p2.evaluate(()=>({panel:!!document.getElementById('appearancePanel'),pal:document.documentElement.getAttribute('data-palette'),theme:document.documentElement.getAttribute('data-theme'),prim:getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()}));
    check('Edición Palencia: sin panel de paletas, negro y plata por omisión',!e.panel&&!e.pal&&e.theme===null&&e.prim.toUpperCase()==='#A5ACAF',JSON.stringify(e));
    await p2.close();
  }

  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(r=>!r.ok);
  fs.writeFileSync(path.join(OUT,'resultado-apariencia.json'),JSON.stringify(results,null,2));
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
