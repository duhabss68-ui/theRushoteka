'use strict';
// Edición Palencia · «Cambiar logo». El maestro puede poner su propia imagen (PNG, JPG, WEBP o SVG)
// en lugar del escudo incluido. Es una preferencia de interfaz: se guarda solo en este navegador.
(()=>{
  const KEY='miaula-palencia:logo',MAX_SVG=300*1024,SIZE=320;
  const targets=()=>document.querySelectorAll('.brand-icon,.edition-emblem img,.splash-inner img');
  const defaults=new WeakMap();
  function current(){try{return localStorage.getItem(KEY)||'';}catch{return '';}}
  function apply(){
    const logo=current();
    targets().forEach(img=>{if(!defaults.has(img))defaults.set(img,img.getAttribute('src'));img.src=logo||defaults.get(img);});
    const icon=document.querySelector('link[rel="icon"]');
    if(icon){if(!icon.dataset.defaultHref)icon.dataset.defaultHref=icon.href;icon.href=logo||icon.dataset.defaultHref;}
    const status=document.getElementById('editionLogoStatus');
    if(status)status.textContent=logo?'Usando el logo que elegiste.':'Usando el escudo de la edición.';
    document.getElementById('editionLogoRemove')?.classList.toggle('hidden',!logo);
  }
  function save(dataUrl){
    try{localStorage.setItem(KEY,dataUrl);}catch(e){window.toast?.('La imagen es muy grande para guardarla. Prueba con una más pequeña.',true);return;}
    apply();window.toast?.('Logo actualizado');
  }
  function readAs(file,how){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(r.error);r[how](file);});}
  async function choose(){
    const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/svg+xml';
    input.onchange=async()=>{
      const f=input.files?.[0];if(!f)return;
      try{
        if(f.type==='image/svg+xml'){
          if(f.size>MAX_SVG){window.toast?.('El SVG pesa más de 300 KB.',true);return;}
          save(await readAs(f,'readAsDataURL'));return;
        }
        // Las imágenes se reducen a 320 px para que el archivo no crezca y la app siga rápida.
        const img=new Image();img.src=URL.createObjectURL(f);await img.decode();
        const k=Math.min(1,SIZE/Math.max(img.naturalWidth,img.naturalHeight));
        const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);
        save(c.toDataURL('image/png'));
      }catch(e){console.error(e);window.toast?.('No se pudo leer esa imagen.',true);}
    };
    input.click();
  }
  function remove(){
    if(!confirm('¿Quitar tu logo y regresar al escudo de la edición?'))return;
    try{localStorage.removeItem(KEY);}catch{}apply();window.toast?.('Se regresó al escudo de la edición');
  }
  function mountPanel(){
    const host=document.getElementById('backupPanel');if(!host||document.getElementById('editionLogoBox'))return;
    const box=document.createElement('div');box.id='editionLogoBox';box.className='edition-logo-box';
    box.innerHTML='<div><strong>Logo de la portada</strong><small id="editionLogoStatus"></small></div><div class="action-row"><button type="button" class="btn subtle" id="editionLogoPick">Cambiar logo</button><button type="button" class="btn subtle hidden" id="editionLogoRemove">Quitar logo</button></div>';
    const head=host.querySelector('.panel-head');if(head)head.after(box);else host.prepend(box);
    document.getElementById('editionLogoPick').onclick=choose;
    document.getElementById('editionLogoRemove').onclick=remove;
  }
  function init(){
    mountPanel();
    const hero=document.querySelector('.edition-emblem');
    if(hero){hero.setAttribute('role','button');hero.tabIndex=0;hero.title='Toca para cambiar el logo';hero.onclick=choose;hero.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};}
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.MiAulaEditionLogo={apply,choose,remove,KEY};
})();
