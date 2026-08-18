const STORAGE_KEY = 'bos-cockpit-v1';
const defaultState = {
  theme:'light', cameraId:'fx6', focal:35,
  layout:['expo','frame','dof','light','media'],
  visible:{expo:true,frame:true,dof:true,light:true,media:true},
  open:{expo:true,frame:true,dof:true,light:false,media:false},
  dof:{aperture:2.8,distance:2.5}, media:{bitrate:250,card:256}, light:{fixture:'Amaran 200x S'},
  expo:{values:{aperture:'2.8',iso:'800',shutter:'1/50',nd:'0'},roles:{aperture:'manual',iso:'lock',shutter:'lock',nd:'auto'},based:false}
};
const moduleMeta={expo:['EXPO','Compensation instantanée'],frame:['FRAME','Cadrage rapide'],dof:['DOF','Profondeur de champ'],light:['LIGHT','Lux immédiats'],media:['MEDIA','Temps d’enregistrement']};
const APP_LINKS={expo:'#',frame:'#',dof:'#',light:'#',media:'#'};
let cameras=[];let state=loadState();

const apertures=['1.0','1.2','1.4','1.8','2.0','2.8','4','5.6','8','11','16','22'];
const isos=['100','125','160','200','250','320','400','500','640','800','1000','1250','1600','2000','2500','3200','4000','5000','6400','8000','10000','12800','16000','20000','25600','32000','40000','51200'];
const shutters=['1/24','1/25','1/30','1/40','1/48','1/50','1/60','1/80','1/100','1/120','1/125','1/160','1/200','1/250','1/320','1/400','1/500','1/640','1/800'];
const nds=['0','0.3','0.6','0.9','1.2','1.5','1.8','2.1','2.4','2.7','3.0','3.3','3.6'];
const demoLights={
  'Amaran 200x S':{lux1:34000,note:'Donnée de démonstration V1'},
  'Aputure 300d II':{lux1:45000,note:'Donnée de démonstration V1'},
  'Nanlite Forza 300B II':{lux1:40000,note:'Donnée de démonstration V1'},
  'Godox LA200Bi':{lux1:36000,note:'Donnée de démonstration V1'}
};
function clone(x){return JSON.parse(JSON.stringify(x))}
function mergeDeep(base, extra){const out=clone(base);for(const k in extra){if(extra[k]&&typeof extra[k]==='object'&&!Array.isArray(extra[k])&&out[k])out[k]=mergeDeep(out[k],extra[k]);else out[k]=extra[k]}return out}
function loadState(){try{return mergeDeep(defaultState,JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'))}catch{return clone(defaultState)}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function currentCamera(){return cameras.find(c=>c.id===state.cameraId)||cameras[0]}
function fmtM(m){if(!isFinite(m))return '∞';if(m<1)return `${Math.round(m*100)} cm`;if(m<10)return `${m.toFixed(2).replace('.',',')} m`;return `${m.toFixed(1).replace('.',',')} m`}
function fmtDuration(sec){if(!isFinite(sec)||sec<0)return '—';const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.floor(sec%60);return h?`${h} h ${String(m).padStart(2,'0')} min`:`${m} min ${String(s).padStart(2,'0')} s`}
function optionList(arr,val,prefix=''){return arr.map(x=>`<option value="${x}" ${String(x)===String(val)?'selected':''}>${prefix}${x}</option>`).join('')}
function appLink(id){const ready=APP_LINKS[id]&&APP_LINKS[id]!=='#';return `<div class="app-link"><button class="${ready?'ready':''}" data-applink="${id}" ${ready?'':'disabled'}>${ready?'Ouvrir l’app complète ↗':'App complète · lien à connecter'}</button></div>`}

async function init(){
  try{const r=await fetch('data/cameras.json',{cache:'no-store'});const j=await r.json();cameras=j.cameras||[]}catch(e){cameras=[{id:'ff',name:'Full Frame 36 mm',sensorWidthMm:36,dof:{label:'Full Frame',cocMm:.029,cropToFF:1}}]}
  setupTheme();renderCameraSelect();document.getElementById('focalInput').value=state.focal;renderModules();bindGlobal();renderCustomize();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
}
function setupTheme(){document.documentElement.dataset.theme=state.theme;document.querySelector('meta[name="theme-color"]').content=state.theme==='dark'?'#090b0f':'#ffffff'}
function renderCameraSelect(){const s=document.getElementById('cameraSelect');const groups={};cameras.forEach(c=>(groups[c.group||'AUTRES']??=[]).push(c));s.innerHTML=Object.entries(groups).map(([g,list])=>`<optgroup label="${esc(g)}">${list.map(c=>`<option value="${esc(c.id)}" ${c.id===state.cameraId?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}
function bindGlobal(){
 document.getElementById('cameraSelect').addEventListener('change',e=>{state.cameraId=e.target.value;save();renderModules()});
 document.getElementById('focalInput').addEventListener('input',e=>{state.focal=Math.max(1,Number(e.target.value)||35);save();updateLive()});
 document.getElementById('themeBtn').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';save();setupTheme()});
 const dlg=document.getElementById('customizeDialog');document.getElementById('customizeBtn').addEventListener('click',()=>{renderCustomize();dlg.showModal()});
 document.getElementById('resetLayout').addEventListener('click',()=>{state.layout=clone(defaultState.layout);state.visible=clone(defaultState.visible);state.open=clone(defaultState.open);save();renderCustomize();renderModules()});
}
function renderModules(){const root=document.getElementById('modules');root.innerHTML=state.layout.filter(id=>state.visible[id]).map(renderModule).join('');bindModules();updateLive()}
function renderModule(id){const [title,sub]=moduleMeta[id];return `<article class="module ${state.open[id]?'open':''}" data-module="${id}"><button class="module-head" data-toggle="${id}"><span class="module-title"><i class="module-dot"></i><span><strong>${title}</strong><small>${sub}</small></span></span><span class="chev">⌄</span></button><div class="module-body">${renderBody(id)}</div></article>`}
function renderBody(id){
 if(id==='dof')return `<div class="grid2"><label><span>Diaph</span><select id="dofAperture">${optionList(apertures,state.dof.aperture,'T')}</select></label><label><span>Distance</span><div class="unit-input"><input id="dofDistance" type="number" inputmode="decimal" min="0.1" step="0.1" value="${state.dof.distance}"><b>m</b></div></label></div><div class="resultbox"><div class="result-main" id="dofMain">—</div><div class="result-sub" id="dofSub">—</div></div>${appLink(id)}`;
 if(id==='media')return `<div class="grid2"><label><span>Débit</span><div class="unit-input"><input id="mediaBitrate" type="number" inputmode="decimal" min="1" step="1" value="${state.media.bitrate}"><b>Mb/s</b></div></label><label><span>Carte</span><select id="mediaCard">${optionList(['64','128','256','512','1000','2000','4000'],state.media.card)}</select></label></div><div class="resultbox"><div class="result-main" id="mediaMain">—</div><div class="result-sub">temps d’enregistrement · réserve 0 %</div></div>${appLink(id)}`;
 if(id==='frame')return `<div class="grid2"><label><span>Caméra</span><input value="${esc(currentCamera()?.name||'—')}" disabled></label><label><span>Focale</span><input value="${state.focal} mm" disabled id="frameFocalRead"></label></div><div class="frame-preview"><div class="frame-safe"></div><div class="subject" id="frameSubject"></div><div class="frame-meta" id="frameMeta"></div></div><div class="warning">Aperçu relatif V1 · la récupération du calibrage réel de FRAME sera branchée ensuite.</div>${appLink(id)}`;
 if(id==='light'){const names=Object.keys(demoLights);return `<label><span>Ma lumière</span><select id="lightFixture">${optionList(names,state.light.fixture)}</select></label><div class="light-status"><span class="pill">100 %</span><span class="pill">5600 K</span><span class="pill">Nu</span></div><div class="luxgrid"><div class="luxbox"><small>à 1 m</small><strong id="lux1">—</strong></div><div class="luxbox"><small>à 3 m</small><strong id="lux3">—</strong></div></div><div class="demo">Valeurs photométriques de démonstration pour tester l’ergonomie. La database officielle de LIGHT devra remplacer ce mini jeu de données.</div>${appLink(id)}`}
 if(id==='expo')return `<div id="expoRows">${['aperture','iso','shutter','nd'].map(renderExpoRow).join('')}</div><div class="basebar"><button id="baseBtn" class="primary">${state.expo.based?'Nouvelle base':'BASE'}</button></div><div class="base-note" id="baseNote">${state.expo.based?'Base active : seul le réglage MANUEL est modifiable. AUTO compense automatiquement.':'Avant BASE, touche les badges pour choisir 2 VERROUILLÉS · 1 MANUEL · 1 AUTO.'}</div>${appLink(id)}`;
}
function expoLabel(k){return {aperture:'Diaph',iso:'ISO',shutter:'Shutter',nd:'ND'}[k]}
function roleLabel(r){return r==='lock'?'VERROU':r==='manual'?'MANUEL':'AUTO'}
function renderExpoRow(k){const vals={aperture:apertures,iso:isos,shutter:shutters,nd:nds}[k];const pref=k==='aperture'?'T':k==='nd'?'ND ':'';const role=state.expo.roles[k];const disabled=state.expo.based&&role!=='manual';return `<div class="expo-row"><button class="role-btn" data-rolekey="${k}" data-role="${role}" ${state.expo.based?'disabled':''}>${roleLabel(role)}</button><label class="expo-control"><span>${expoLabel(k)}</span><select data-expokey="${k}" ${disabled?'disabled':''}>${optionList(vals,state.expo.values[k],pref)}</select></label></div>`}
function bindModules(){
 document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.toggle;state.open[id]=!state.open[id];save();b.closest('.module').classList.toggle('open',state.open[id])}));
 const da=document.getElementById('dofAperture');if(da)da.addEventListener('change',e=>{state.dof.aperture=Number(e.target.value);save();updateDOF()});const dd=document.getElementById('dofDistance');if(dd)dd.addEventListener('input',e=>{state.dof.distance=Math.max(.1,Number(e.target.value)||.1);save();updateDOF()});
 const mb=document.getElementById('mediaBitrate');if(mb)mb.addEventListener('input',e=>{state.media.bitrate=Math.max(1,Number(e.target.value)||1);save();updateMedia()});const mc=document.getElementById('mediaCard');if(mc)mc.addEventListener('change',e=>{state.media.card=Number(e.target.value);save();updateMedia()});
 const lf=document.getElementById('lightFixture');if(lf)lf.addEventListener('change',e=>{state.light.fixture=e.target.value;save();updateLight()});
 document.querySelectorAll('[data-rolekey]').forEach(b=>b.addEventListener('click',()=>cycleRole(b.dataset.rolekey)));
 document.querySelectorAll('[data-expokey]').forEach(s=>s.addEventListener('change',e=>expoChanged(e.target.dataset.expokey,e.target.value)));
 const base=document.getElementById('baseBtn');if(base)base.addEventListener('click',()=>{state.expo.based=!state.expo.based;save();renderModules()});
 document.querySelectorAll('[data-applink]').forEach(b=>b.addEventListener('click',()=>{const u=APP_LINKS[b.dataset.applink];if(u&&u!=='#')location.href=u}));
}
function cycleRole(key){if(state.expo.based)return;const roles=state.expo.roles;const cur=roles[key];if(cur==='lock'){const manualKey=Object.keys(roles).find(k=>roles[k]==='manual');roles[key]='manual';roles[manualKey]='lock'}else if(cur==='manual'){const autoKey=Object.keys(roles).find(k=>roles[k]==='auto');roles[key]='auto';roles[autoKey]='manual'}else{const lockKey=Object.keys(roles).find(k=>roles[k]==='lock');roles[key]='lock';roles[lockKey]='auto'}save();renderModules()}
function exposureStop(k,v){if(k==='aperture')return -2*Math.log2(Number(v));if(k==='iso')return Math.log2(Number(v));if(k==='shutter'){const [a,b]=v.split('/').map(Number);return Math.log2(a/b)}if(k==='nd')return -Number(v)/0.3;return 0}
function nearestValueForStop(k,target){const vals={aperture:apertures,iso:isos,shutter:shutters,nd:nds}[k];let best=vals[0],d=Infinity;for(const v of vals){const q=Math.abs(exposureStop(k,v)-target);if(q<d){d=q;best=v}}return best}
function expoChanged(key,newVal){const old=state.expo.values[key];if(!state.expo.based){state.expo.values[key]=newVal;save();return}if(state.expo.roles[key]!=='manual')return;const delta=exposureStop(key,newVal)-exposureStop(key,old);state.expo.values[key]=newVal;const autoKey=Object.keys(state.expo.roles).find(k=>state.expo.roles[k]==='auto');const curAuto=state.expo.values[autoKey];state.expo.values[autoKey]=nearestValueForStop(autoKey,exposureStop(autoKey,curAuto)-delta);save();renderModules()}
function updateLive(){const fr=document.getElementById('frameFocalRead');if(fr)fr.value=`${state.focal} mm`;updateDOF();updateMedia();updateFrame();updateLight()}
function updateDOF(){const out=document.getElementById('dofMain');if(!out)return;const cam=currentCamera();const f=Number(state.focal),N=Number(state.dof.aperture),c=cam?.dof?.cocMm||.029,s=Number(state.dof.distance)*1000;const H=(f*f)/(N*c)+f;const near=(H*s)/(H+(s-f));const far=(H<=s-f)?Infinity:(H*s)/(H-(s-f));const dof=far===Infinity?Infinity:(far-near)/1000;out.textContent=`PDC ${fmtM(dof)}`;document.getElementById('dofSub').textContent=`${fmtM(near/1000)} — ${fmtM(far/1000)} · ${cam?.dof?.label||''} · ${state.focal} mm`}
function updateMedia(){const el=document.getElementById('mediaMain');if(!el)return;const sec=(Number(state.media.card)*1000*8)/Number(state.media.bitrate);el.textContent=fmtDuration(sec)}
function updateFrame(){const sub=document.getElementById('frameSubject'),meta=document.getElementById('frameMeta');if(!sub||!meta)return;const cam=currentCamera(),crop=36/(cam?.sensorWidthMm||36);const eq=state.focal*crop;const w=Math.max(30,Math.min(220,42+eq*1.35));sub.style.width=`${w}px`;meta.textContent=`${cam?.name||''} · ${state.focal} mm · ≈ ${Math.round(eq)} mm FF`}
function updateLight(){const a=document.getElementById('lux1'),b=document.getElementById('lux3');if(!a||!b)return;const d=demoLights[state.light.fixture]||{lux1:0};a.textContent=`${Math.round(d.lux1).toLocaleString('fr-FR')} lx`;b.textContent=`${Math.round(d.lux1/9).toLocaleString('fr-FR')} lx`}
function renderCustomize(){const root=document.getElementById('customizeList');if(!root)return;root.innerHTML=state.layout.map((id,i)=>`<div class="custom-item"><input type="checkbox" data-vis="${id}" ${state.visible[id]?'checked':''}><span class="custom-name">${moduleMeta[id][0]}</span><button type="button" class="movebtn" data-up="${id}" ${i===0?'disabled':''}>↑</button><button type="button" class="movebtn" data-down="${id}" ${i===state.layout.length-1?'disabled':''}>↓</button></div>`).join('');root.querySelectorAll('[data-vis]').forEach(x=>x.addEventListener('change',()=>{state.visible[x.dataset.vis]=x.checked;save();renderModules()}));root.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.up,-1)));root.querySelectorAll('[data-down]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.down,1)))}
function moveModule(id,dir){const i=state.layout.indexOf(id),j=i+dir;if(j<0||j>=state.layout.length)return;[state.layout[i],state.layout[j]]=[state.layout[j],state.layout[i]];save();renderCustomize();renderModules()}

document.addEventListener('DOMContentLoaded',init);
