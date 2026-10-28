'use strict';
// Prueba de la edición especial «Silver & Black · Para Palencia» (HTML de un solo archivo).
// Uso: PALENCIA=dist/MiAula_Palencia_SilverBlack_X.html PREPA=dist/MiAula_Prepa_X.html node tests/e2e/edicion-palencia.e2e.js
const fs=require('fs'),path=require('path'),os=require('os');
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright'));}
const VAL=path.resolve(process.env.PALENCIA||'dist/MiAula_Palencia_SilverBlack_2.14.0.html');
const PRE=path.resolve(process.env.PREPA||'dist/MiAula_Prepa_2.14.0.html');
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'miaula-palencia-'));
const EXE=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);}
const wait=(p,ms)=>p.waitForTimeout(ms);

(async()=>{
  const browser=await chromium.launch({executablePath:fs.existsSync(EXE)?EXE:undefined});
  const ctx=await browser.newContext({viewport:{width:1340,height:860},acceptDownloads:true});
  await ctx.addInitScript(()=>{window.__abFiles={};const fh=n=>({name:n,async createWritable(){let b='';return {async write(x){b+=typeof x==='string'?x:await x.text();},async close(){window.__abFiles[n]=b;}};}});window.showDirectoryPicker=async()=>({name:'Copias',async getFileHandle(n){return fh(n);}});});
  const p=await ctx.newPage();const errors=[],reqs=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  p.on('request',r=>{const u=r.url();if(!/^(data|blob):/.test(u))reqs.push(u);});
  await p.goto('file://'+VAL);await wait(p,1800);

  const id=await p.evaluate(()=>({title:document.title,hero:document.querySelector('#view-dashboard .hero h2')?.textContent,author:document.querySelector('.hero-author')?.textContent,
    badge:document.querySelector('.version-badge')?.textContent,emblem:!!document.querySelector('.edition-emblem img'),ed:window.MIAULA_EDITION?.id,
    theme:document.documentElement.getAttribute('data-theme'),primary:getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    font:document.fonts.check('700 20px "Oswald V"'),h2font:getComputedStyle(document.querySelector('#view-dashboard .hero h2')).fontFamily}));
  check('Dice «Para Palencia» (pestaña y emblema) y la portada «Mtro. Erick»',id.title.startsWith('Para Palencia')&&id.hero==='Mtro. Erick'&&id.emblem&&id.ed==='palencia',JSON.stringify([id.title,id.hero]));
  check('Conserva la firma del autor',id.author.includes('Niccolás C.M.'),id.author);
  check('Negro y plata por omisión',id.theme===null&&id.primary.toUpperCase()==='#A5ACAF',`${id.theme} ${id.primary}`);
  check('Tipografía Oswald incrustada y aplicada a los títulos',id.font&&id.h2font.includes('Oswald V'),id.h2font);
  check('No pide ningún archivo externo',reqs.every(u=>u.startsWith('file://'+VAL)),reqs.join(' | '));

  check('Base de datos propia (MiAulaPalenciaDB)',await p.evaluate(async()=>{const d=(await indexedDB.databases()).map(x=>x.name);return d.includes('MiAulaPalenciaDB')&&!d.includes('MiAulaPrepaDB');}));
  await p.evaluate(()=>$('#themeToggle').click());
  check('Tema «Día plata» y preferencia propia',await p.evaluate(()=>document.documentElement.getAttribute('data-theme')==='light'&&localStorage.getItem('miaula-palencia:theme')==='light'&&localStorage.getItem('miaula:theme')===null));
  await p.screenshot({path:path.join(OUT,'palencia-dia-plata.png')});
  await p.evaluate(()=>$('#themeToggle').click());

  // Datos + copia automática con nombres de Palencia
  const gid=await p.evaluate(async()=>{const gid=await MiAulaDB.add('groups',{name:'6B',discipline:'Historia',total_periods:3,active:1,current_period:1,created_at:new Date().toISOString()});for(const n of ['Ana','Beto','Caro','Dani'])await MiAulaDB.add('students',{group_id:gid,paternal_last_name:n,maternal_last_name:'V',given_names:n,name:n+' V',active:1,student_code:'V'+n});return gid;});
  await p.evaluate(()=>MiAulaAutoBackup.chooseFolder());await wait(p,1500);
  const files=await p.evaluate(()=>Object.keys(window.__abFiles));
  check('Copias automáticas con nombre de Palencia',files.includes('MiAula_Palencia_ultima_copia.json')&&files.some(f=>/^MiAula_Palencia_copia_\d{4}-\d{2}-\d{2}\.json$/.test(f)),files.join(', '));
  const cp=await p.evaluate(()=>JSON.parse(window.__abFiles['MiAula_Palencia_ultima_copia.json']));
  check('La copia es un respaldo normal de MiAula (se restaura en cualquier edición)',cp.format==='MiAulaMobileBackup'&&/^[\d.]+-Palencia$/.test(cp.appVersion)&&cp.stores.students.length===4);
  const dl=p.waitForEvent('download',{timeout:6000}).catch(()=>null);
  await p.evaluate(()=>downloadMiAulaBackup());const d=await dl;
  check('Respaldo manual con nombre de Palencia',!!d&&/^MiAula_Palencia_[\d.]+_Respaldo_/.test(d.suggestedFilename()),d?.suggestedFilename());

  // Logo propio del maestro («Cambiar logo»)
  await p.reload();await wait(p,1600);
  const def=await p.evaluate(()=>document.querySelector('.edition-emblem img').getAttribute('src'));
  check('Escudo incluido con la «P» de Palencia',def.startsWith('data:image/svg+xml')&&Buffer.from(def.split(',')[1],'base64').toString('utf8').includes('P de Palencia'));
  await p.evaluate(()=>goView('more'));await wait(p,500);
  check('Panel «Logo de la portada» dentro de Respaldo',await p.evaluate(()=>!!document.querySelector('#backupPanel #editionLogoBox #editionLogoPick')&&$('#editionLogoRemove').classList.contains('hidden')));
  const fcP=p.waitForEvent('filechooser');
  await p.click('#editionLogoPick');
  await (await fcP).setFiles(path.resolve(__dirname,'../../assets/icon-books-512.png'));await wait(p,900);
  const lg=await p.evaluate(()=>({hero:document.querySelector('.edition-emblem img').src,side:document.querySelector('.brand-icon').src,icon:document.querySelector('link[rel="icon"]').href,stored:(localStorage.getItem('miaula-palencia:logo')||'').length}));
  check('Al elegir una imagen se usa como logo en portada, barra e ícono',lg.hero.startsWith('data:image/png')&&lg.side===lg.hero&&lg.icon===lg.hero,`${lg.stored} chars`);
  check('La imagen se reduce (no infla el almacenamiento)',lg.stored>0&&lg.stored<200000,String(lg.stored));
  await p.reload();await wait(p,1600);
  check('El logo elegido se conserva al reabrir',await p.evaluate(()=>document.querySelector('.edition-emblem img').src.startsWith('data:image/png')));
  check('Tocar el escudo de la portada también permite cambiarlo',await p.evaluate(()=>document.querySelector('.edition-emblem').getAttribute('role')==='button'));
  await p.evaluate(()=>goView('more'));await wait(p,400);
  await p.click('#editionLogoRemove');await wait(p,400);
  check('«Quitar logo» regresa al escudo de la edición',await p.evaluate(d=>document.querySelector('.edition-emblem img').getAttribute('src')===d&&!localStorage.getItem('miaula-palencia:logo'),def));

  // Ruleta y confeti con paleta plata/negro
  await p.reload();await wait(p,1600);
  const wheel=await p.evaluate(()=>({first:wheelStyle(0,false).fill,second:wheelStyle(1,false).fill,used:wheelStyle(0,true).fill}));
  check('Ruleta en negro y plata',wheel.first==='#0A0A0B'&&wheel.second==='#A5ACAF'&&wheel.used==='#3A3D40',JSON.stringify(wheel));
  await p.evaluate(()=>openDynamicsMode('roulette'));await wait(p,800);
  await p.screenshot({path:path.join(OUT,'palencia-ruleta.png')});

  // Funciones generales siguen vivas: rubros + cálculo
  const fin=await p.evaluate(async gid=>{const s=await getScheme(gid,'1');s.work_pct=40;s.custom_components=[{id:'rx',name:'Participación',pct:10,source:'manual'}];await MiAulaDB.put('gradingSchemes',s);return customComponents(await getScheme(gid,'1')).length;},gid);
  check('Rubros adicionales funcionan en la edición',fin===1);

  // No se mezcla con MiAula Prepa en el mismo navegador
  const p2=await ctx.newPage();p2.on('pageerror',e=>errors.push('Prepa: '+e.message));
  await p2.goto('file://'+PRE);await wait(p2,1600);
  const prepaGroups=await p2.evaluate(async()=>(await MiAulaDB.all('groups')).length);
  check('Abrir MiAula Prepa en el mismo navegador no muestra los grupos de Palencia',prepaGroups===0,String(prepaGroups));
  await p2.close();

  check('Sin errores de JavaScript',errors.length===0,errors.join(' | '));
  await browser.close();
  const failed=results.filter(r=>!r.ok);
  fs.writeFileSync(path.join(OUT,'resultado-palencia.json'),JSON.stringify(results,null,2));
  console.log(`\n${results.length-failed.length}/${results.length} comprobaciones correctas · capturas en ${OUT}`);
  process.exit(failed.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
