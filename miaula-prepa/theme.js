'use strict';
// 2.14.0 · Apariencia: paleta (Alegre, Guinda o Personalizada) + modo claro/oscuro.
// Se carga en <head> para aplicar la paleta antes de pintar (sin parpadeo).
// Solo son preferencias de interfaz: viven en localStorage, nunca en la base de datos.
const MiAulaTheme=(()=>{
  const ed=window.MIAULA_EDITION||null;
  const MODE_KEY=ed?.themeKey||'miaula:theme',PALETTE_KEY='miaula:palette',COLOR_KEY='miaula:customColor';
  const DEFAULT_COLOR='#2563EB';
  const PALETTES=[
    {id:'alegre',name:'Alegre',desc:'Morado y rosa con acentos de colores.',sw:['#6A4DF4','#FF5FA2','#FF8A65','#34D6A8']},
    {id:'guinda',name:'Guinda / Vino',desc:'Vino con dorado, elegante e institucional.',sw:['#8E2449','#C9557A','#D4A752','#FAF5F1']},
    {id:'custom',name:'Personalizado',desc:'Elige tu color principal; MiAula ajusta los tonos.',sw:[]}
  ];
  const QUICK=['#2563EB','#0F766E','#15803D','#B45309','#DC2626','#7C3AED','#DB2777','#334155'];
  const get=(k,d)=>{try{return localStorage.getItem(k)??d;}catch{return d;}};
  const set=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
  const validHex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''));
  const palette=()=>{const p=get(PALETTE_KEY,'alegre');return PALETTES.some(x=>x.id===p)?p:'alegre';};
  const customColor=()=>{const c=get(COLOR_KEY,DEFAULT_COLOR);return validHex(c)?c:DEFAULT_COLOR;};

  // ---------- Color personalizado → tokens para claro y oscuro ----------
  function hexToHsl(hex){
    const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;
    if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;}
    return [Math.round(h),Math.round(s*100),Math.round(l*100)];
  }
  function customCss(hex){
    const [h,s0]=hexToHsl(hex),s=Math.min(85,s0),sl=Math.min(s,60),H=d=>((h+d)%360+360)%360;
    const c=(dh,ss,l,a)=>a==null?`hsl(${H(dh)} ${ss}% ${l}%)`:`hsl(${H(dh)} ${ss}% ${l}% / ${a})`;
    const fam=[0,28,-28,52,150,190];
    const dark=`html[data-palette="custom"]{
  --grad-main:linear-gradient(135deg,${c(8,s,55)} 0%,${c(-8,s,42)} 100%);--grad-fresh:var(--grad-main);
  --grad-warm:linear-gradient(135deg,${c(28,s,58)} 0%,${c(0,s,45)} 100%);--grad-sun:var(--grad-warm);
  --void:${c(0,Math.min(s,25),8)};--surface-0:${c(0,Math.min(s,22),10)};--surface-1:${c(0,Math.min(s,20),13)};--surface-2:${c(0,Math.min(s,20),16)};--surface-3:${c(0,Math.min(s,18),20)};--surface-4:${c(0,Math.min(s,16),25)};--surface-hover:${c(0,Math.min(s,18),21)};
  --card:${c(0,Math.min(s,20),13)};--glass:${c(0,Math.min(s,20),13,.84)};--glass-strong:${c(0,Math.min(s,20),13,.96)};
  --border:${c(0,40,85,.14)};--border-strong:${c(0,40,85,.26)};
  --text:${c(0,30,95)};--text-strong:#FFFFFF;--text-2:${c(0,15,80)};--text-3:${c(0,10,62)};
  --primary:${c(0,s,62)};--primary-hover:${c(0,s,70)};--primary-soft:${c(0,s,62,.2)};--accent-text:${c(0,s,80)};--on-primary:#FFFFFF;
  --row-alt:${c(0,Math.min(s,20),15)};--row-hover:${c(0,Math.min(s,20),19)};--topbar-bg:${c(0,Math.min(s,25),8,.86)};--scroll-thumb:${c(0,20,35)};
  ${fam.map((d,i)=>`--tint-${['violet','pink','coral','sun','mint','sky'][i]}:${c(d,sl,60,.16)};--ic-${['violet','pink','coral','sun','mint','sky'][i]}:${c(d,sl+15,78)};`).join('')}
  --mark-a:${c(28,s,62)};--mark-b:${c(0,s,45)};
  --blob-1:${c(28,70,60,.12)};--blob-2:${c(0,70,55,.2)};--blob-3:${c(-28,70,55,.1)};
  --line-grad:linear-gradient(90deg,${c(-20,s,50)},${c(0,s,58)},${c(20,s,62)});
  --primary-shadow:0 10px 22px ${c(0,s,30,.45)};--tab-shadow:0 8px 20px ${c(0,s,30,.5)};--fab-shadow:0 6px 14px ${c(28,s,35,.4)};
  --eyebrow:${c(0,s,72)};--badge-text:#FFFFFF;--btn-text:#FFFFFF;
}`;
    const light=`html[data-palette="custom"][data-theme="light"]{
  --grad-main:linear-gradient(135deg,${c(8,s,44)} 0%,${c(-8,s,32)} 100%);--grad-fresh:var(--grad-main);
  --grad-warm:linear-gradient(135deg,${c(28,s,46)} 0%,${c(0,s,36)} 100%);--grad-sun:var(--grad-warm);
  --void:${c(0,Math.min(s,30),97)};--surface-0:${c(0,Math.min(s,22),93)};--surface-1:#FFFFFF;--surface-2:${c(0,Math.min(s,30),97.5)};--surface-3:${c(0,Math.min(s,20),92)};--surface-4:${c(0,Math.min(s,16),86)};--surface-hover:${c(0,Math.min(s,25),95)};
  --card:#FFFFFF;--glass:rgba(255,255,255,.84);--glass-strong:rgba(255,255,255,.96);
  --border:${c(0,40,25,.13)};--border-strong:${c(0,40,25,.24)};
  --text:${c(0,20,15)};--text-strong:${c(0,25,10)};--text-2:${c(0,10,33)};--text-3:${c(0,8,45)};
  --primary:${c(0,s,38)};--primary-hover:${c(0,s,31)};--primary-soft:${c(0,s,38,.1)};--accent-text:${c(0,s,30)};--on-primary:#FFFFFF;
  --row-alt:${c(0,Math.min(s,30),98.5)};--row-hover:${c(0,Math.min(s,40),96)};--topbar-bg:${c(0,Math.min(s,30),97,.88)};--scroll-thumb:${c(0,20,78)};
  ${fam.map((d,i)=>`--tint-${['violet','pink','coral','sun','mint','sky'][i]}:${c(d,sl+10,95)};--ic-${['violet','pink','coral','sun','mint','sky'][i]}:${c(d,sl,36)};`).join('')}
  --mark-a:${c(28,s,50)};--mark-b:${c(0,s,35)};
  --blob-1:${c(28,70,60,.12)};--blob-2:${c(0,70,55,.1)};--blob-3:${c(-28,70,55,.08)};
  --primary-shadow:0 10px 22px ${c(0,s,30,.25)};--tab-shadow:0 8px 20px ${c(0,s,30,.28)};
  --eyebrow:${c(0,s,35)};
}`;
    return dark+'\n'+light;
  }

  // ---------- Aplicar ----------
  function syncMeta(){
    const meta=document.querySelector('meta[name="theme-color"]');if(!meta)return;
    const v=getComputedStyle(document.documentElement).getPropertyValue('--void').trim();if(v)meta.setAttribute('content',v);
  }
  function applyPalette(){
    if(ed)return;
    const root=document.documentElement,p=palette();
    if(p==='alegre')root.removeAttribute('data-palette');else root.setAttribute('data-palette',p);
    let st=document.getElementById('miaulaCustomPalette');
    if(p==='custom'){if(!st){st=document.createElement('style');st.id='miaulaCustomPalette';document.head.appendChild(st);}st.textContent=customCss(customColor());}
    else st?.remove();
    syncMeta();
  }
  function applyMode(){
    const mode=get(MODE_KEY,null);
    const light=ed?.defaultMode==='dark'?mode==='light':mode!=='dark';
    if(light)document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');
  }
  applyMode();applyPalette();

  // ---------- Panel Más → Apariencia ----------
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function currentMode(){return document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';}
  function setMode(mode){
    if(typeof window.applyTheme==='function')window.applyTheme(mode);
    else{if(mode==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');}
    set(MODE_KEY,mode);syncMeta();render();
  }
  function setPalette(p){set(PALETTE_KEY,p);applyPalette();render();try{if(typeof drawWheel==='function')drawWheel();}catch{}}
  function setColor(hex){if(!validHex(hex))return;set(COLOR_KEY,hex);if(palette()!=='custom')set(PALETTE_KEY,'custom');applyPalette();render();}
  function render(){
    const box=document.getElementById('appearancePanelBody');if(!box)return;
    const p=palette(),col=customColor(),mode=currentMode();
    box.innerHTML=`<div class="appearance-grid">${PALETTES.map(x=>`<button type="button" class="palette-card${x.id===p?' active':''}" data-palette-pick="${x.id}" aria-pressed="${x.id===p}">
        <span class="palette-swatches">${(x.id==='custom'?[col]:x.sw).map(c=>`<i style="background:${esc(c)}"></i>`).join('')}</span>
        <span><strong>${esc(x.name)}</strong><small>${esc(x.desc)}</small></span></button>`).join('')}</div>
      ${p==='custom'?`<div class="custom-color-row" style="margin-top:14px"><label class="custom-color-row">Color principal <input type="color" id="customColorInput" value="${esc(col)}" aria-label="Color principal"></label>
        <div class="quick-colors">${QUICK.map(c=>`<button type="button" data-quick-color="${c}" style="background:${c}" aria-label="Usar ${c}" title="${c}"></button>`).join('')}</div></div>`:''}
      <div class="appearance-mode"><span>Modo</span><div class="segmented"><button type="button" data-mode-pick="light" class="${mode==='light'?'active':''}">Claro</button><button type="button" data-mode-pick="dark" class="${mode==='dark'?'active':''}">Oscuro</button></div></div>`;
    box.querySelectorAll('[data-palette-pick]').forEach(b=>b.onclick=()=>setPalette(b.dataset.palettePick));
    box.querySelectorAll('[data-quick-color]').forEach(b=>b.onclick=()=>setColor(b.dataset.quickColor));
    box.querySelectorAll('[data-mode-pick]').forEach(b=>b.onclick=()=>setMode(b.dataset.modePick));
    const inp=box.querySelector('#customColorInput');
    if(inp){inp.oninput=()=>{set(COLOR_KEY,inp.value);applyPalette();};inp.onchange=()=>setColor(inp.value);}
  }
  function init(){
    if(ed){document.getElementById('appearancePanel')?.remove();return;}
    render();
    document.getElementById('themeToggle')?.addEventListener('click',()=>setTimeout(()=>{syncMeta();render();},0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  return {palette,customColor,setPalette,setColor,setMode,syncMeta,customCss,PALETTES};
})();
