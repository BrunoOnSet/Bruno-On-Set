const STORAGE_KEY = 'bos-cockpit-v9';
const CAMERA_DB_URL = 'https://raw.githubusercontent.com/BrunoOnSet/BOS-CAMERA-DB/main/cameras.json';
const CAMERA_DB_FALLBACK_URL = 'data/cameras.json';
const LIGHT_DB_URL = 'https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json';
const LIGHT_DB_FALLBACK_URL = 'data/lights.json';
const LAST_CAMERA_BY_BRAND_KEY = 'bos-onset-last-camera-by-brand';
const FOCAL_PRESETS = [18,24,28,35,50,85,105,135];

const apertures = ['1.0','1.2','1.4','1.8','2.0','2.8','4','5.6','8','11','16','22'];
const isos = ['100','125','160','200','250','320','400','500','640','800','1000','1250','1600','2000','2500','3200','4000','5000','6400','8000','10000','12800','16000','20000','25600','32000','40000','51200'];
const shutters = ['1/24','1/25','1/30','1/40','1/48','1/50','1/60','1/80','1/100','1/120','1/125','1/160','1/200','1/250','1/320','1/400','1/500','1/640','1/800'];
const nds = ['0','0.3','0.6','0.9','1.2','1.5','1.8','2.1','2.4','2.7','3.0','3.3','3.6'];

const defaultState = {
  theme: 'light',
  cameraId: 'fx6',
  focal: 35,
  aperture: 2.8,
  distanceCm: 250,
  layout: ['expo', 'frame', 'dof', 'light', 'media'],
  visible: { expo: true, frame: true, dof: true, light: true, media: true },
  open: { expo: true, frame: true, dof: true, light: false, media: false },
  media: { bitrate: 250, unit: 'Mb/s', card: 256 },
  light: { fixture: 'cob200xs' },
  expo: {
    values: { iso: '800', shutter: '1/50', nd: '0' },
    isoMin: '800',
    isoMax: '51200',
    apertureAuto: false,
    limitWarning: null
  }
};

const moduleMeta = {
  expo: ['EXPO', 'Compensation liée'],
  frame: ['FRAME', 'Cadrage rapide'],
  dof: ['DOF', 'Profondeur de champ'],
  light: ['LIGHT', 'Lux immédiats'],
  media: ['MEDIA', 'Temps d’enregistrement']
};
const APP_LINKS = { expo: '#', frame: '#', dof: '#', light: '#', media: '#' };

let cameras = [];
let cameraDatabaseSource = 'none';
let lightDatabase = null;
let lightFixtures = [];
let lightDatabaseSource = 'none';
let state = loadState();
normalizeState();

function clone(x){ return JSON.parse(JSON.stringify(x)); }
function mergeDeep(base, extra){
  const out = clone(base);
  for(const k in extra){
    if(extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && out[k]) out[k] = mergeDeep(out[k], extra[k]);
    else out[k] = extra[k];
  }
  return out;
}
function loadState(){
  try { return mergeDeep(defaultState, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { return clone(defaultState); }
}
function normalizeState(){
  state.focal = Math.max(1, Number(state.focal) || 35);
  state.aperture = Number(state.aperture) || 2.8;
  state.distanceCm = Math.max(10, Number(state.distanceCm) || 250);
  if(!state.media.unit) state.media.unit = 'Mb/s';
  if(!state.expo) state.expo = clone(defaultState.expo);
  if(!state.expo.values) state.expo.values = clone(defaultState.expo.values);
  if(!state.expo.values.iso) state.expo.values.iso = '800';
  if(!state.expo.values.shutter) state.expo.values.shutter = '1/50';
  if(state.expo.values.nd === undefined) state.expo.values.nd = '0';
  if(!state.expo.isoMin) state.expo.isoMin = '800';
  if(!state.expo.isoMax) state.expo.isoMax = '51200';
  if(typeof state.expo.apertureAuto !== 'boolean') state.expo.apertureAuto = false;
  if(state.expo.limitWarning === undefined) state.expo.limitWarning = null;
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function esc(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function currentCamera(){ return cameras.find(c => c.id === state.cameraId) || cameras[0]; }
function fmtM(m){ if(!isFinite(m)) return '∞'; if(m < 1) return `${Math.round(m*100)} cm`; if(m < 10) return `${m.toFixed(2).replace('.',',')} m`; return `${m.toFixed(1).replace('.',',')} m`; }
function fmtDuration(sec){ if(!isFinite(sec) || sec < 0) return '—'; const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=Math.floor(sec%60); return h ? `${h} h ${String(m).padStart(2,'0')} min` : `${m} min ${String(s).padStart(2,'0')} s`; }
function optionList(arr,val,prefix=''){ return arr.map(x => `<option value="${x}" ${String(x)===String(val)?'selected':''}>${prefix}${x}</option>`).join(''); }
function appLink(id){ const ready = APP_LINKS[id] && APP_LINKS[id] !== '#'; return `<div class="app-link"><button class="${ready?'ready':''}" data-applink="${id}" ${ready?'':'disabled'}>${ready?'Ouvrir l’app complète ↗':'App complète · lien à connecter'}</button></div>`; }
function bitrateToMbPerSec(){ return state.media.unit === 'Mb/s' ? Number(state.media.bitrate) : Number(state.media.bitrate) * 8; }

function bare5600Data(fixture){
  const bare = fixture?.calculator?.accessories?.bare;
  const data = bare?.data?.['5600'] || bare?.data?.[5600];
  return Array.isArray(data) && data.length ? data : null;
}
function isCockpitLightUsable(fixture){ return !!(fixture?.capabilities?.lightCalculator && fixture?.calculator && bare5600Data(fixture)); }
function currentLight(){ return lightFixtures.find(f => f.id === state.light.fixture) || lightFixtures[0] || null; }
function lightOptionsHtml(){
  if(!lightFixtures.length) return '<option value="">Aucune donnée disponible</option>';
  const groups = new Map();
  for(const f of lightFixtures){
    const brand = f.brand || 'Autres';
    if(!groups.has(brand)) groups.set(brand, []);
    groups.get(brand).push(f);
  }
  return [...groups.entries()].map(([brand, items]) => `<optgroup label="${esc(brand)}">${items.map(f => `<option value="${esc(f.id)}" ${f.id===state.light.fixture?'selected':''}>${esc(f.name)}</option>`).join('')}</optgroup>`).join('');
}
function prepareLightState(){
  const legacy = {'Amaran 200x S':'cob200xs','Aputure 300d II':'ls300d2','Nanlite Forza 300B II':'nanForza300b2','Godox LA200Bi':'godoxLa200bi'};
  if(legacy[state.light.fixture]) state.light.fixture = legacy[state.light.fixture];
  if(!lightFixtures.some(f => f.id === state.light.fixture)) state.light.fixture = lightFixtures.some(f => f.id === 'cob200xs') ? 'cob200xs' : (lightFixtures[0]?.id || '');
}
function luxAtDistance(fixture, targetM){
  const data = bare5600Data(fixture);
  if(!data) return null;
  const points = data.map(([distance,lux]) => ({distance:Number(distance),lux:Number(lux)})).filter(p => p.distance > 0 && p.lux > 0);
  if(!points.length) return null;
  const exact = points.find(p => Math.abs(p.distance-targetM) < 1e-9);
  if(exact) return {lux:exact.lux, exact:true, sourceDistance:exact.distance};
  const nearest = points.reduce((a,b) => Math.abs(Math.log(b.distance/targetM)) < Math.abs(Math.log(a.distance/targetM)) ? b : a);
  return {lux:nearest.lux*Math.pow(nearest.distance/targetM,2), exact:false, sourceDistance:nearest.distance};
}

function currentExposureInfo(){
  const exp = currentCamera()?.exposure;
  if(!exp) return {kind:'none',label:'ISO natif',display:'—',floor:100,values:[]};
  const values = Array.isArray(exp.baseValues) ? exp.baseValues.filter(v => Number.isFinite(Number(v))).map(Number) : [];
  const displayValues = values.length ? values : (Number.isFinite(Number(exp.defaultValue)) ? [Number(exp.defaultValue)] : []);
  let kind = 'native';
  if(exp.unit === 'EI') kind = 'ei';
  if(exp.type === 'red_metadata_iso') kind = 'reference';
  const label = kind === 'ei' ? 'EI de base' : (kind === 'reference' ? 'ISO de réf.' : 'ISO natif');
  const floor = values.length ? Math.min(...values) : (Number.isFinite(Number(exp.defaultValue)) ? Number(exp.defaultValue) : 100);
  return {kind,label,display:displayValues.length?displayValues.join(' / '):'—',floor,values:displayValues};
}
function defaultIsoMinForCamera(){
  const floor = currentExposureInfo().floor || 100;
  return String(isos.find(v => Number(v) >= floor) || isos[0]);
}
function isoRangeValues(){
  const lo = Number(state.expo.isoMin), hi = Number(state.expo.isoMax);
  return isos.filter(v => Number(v) >= lo && Number(v) <= hi);
}
function clampIsoToRange(){
  const vals = isoRangeValues();
  if(!vals.length){ state.expo.values.iso = state.expo.isoMin; return; }
  const cur = Number(state.expo.values.iso);
  const best = vals.reduce((a,b) => Math.abs(Number(b)-cur) < Math.abs(Number(a)-cur) ? b : a, vals[0]);
  state.expo.values.iso = String(best);
}
function resetIsoRangeForCamera(){
  state.expo.isoMin = defaultIsoMinForCamera();
  state.expo.isoMax = '51200';
  if(Number(state.expo.isoMin) > Number(state.expo.isoMax)) state.expo.isoMax = state.expo.isoMin;
  clampIsoToRange();
  state.expo.limitWarning = null;
}

async function loadSharedCameraDatabase(){
  try{
    const remote = await fetch(CAMERA_DB_URL,{cache:'no-store'});
    if(!remote.ok) throw new Error(`BOS-CAMERA-DB HTTP ${remote.status}`);
    const data = await remote.json();
    if(!data || !Array.isArray(data.cameras)) throw new Error('BOS-CAMERA-DB invalide');
    cameraDatabaseSource='remote'; return data;
  }catch(remoteError){
    console.warn('BOS-CAMERA-DB distante indisponible, utilisation du fallback local.',remoteError);
    try{
      const fallback = await fetch(CAMERA_DB_FALLBACK_URL,{cache:'no-store'});
      if(!fallback.ok) throw new Error(`Fallback CAMERA HTTP ${fallback.status}`);
      const data = await fallback.json();
      if(!data || !Array.isArray(data.cameras)) throw new Error('Fallback CAMERA invalide');
      cameraDatabaseSource='fallback'; return data;
    }catch(fallbackError){ console.error('Aucune base caméra disponible.',fallbackError); cameraDatabaseSource='none'; return null; }
  }
}
async function loadSharedLightDatabase(){
  try{
    const remote = await fetch(LIGHT_DB_URL,{cache:'no-store'});
    if(!remote.ok) throw new Error(`BOS-PROJECTEURS-DB HTTP ${remote.status}`);
    const data = await remote.json();
    if(!data || !Array.isArray(data.fixtures)) throw new Error('BOS-PROJECTEURS-DB invalide');
    lightDatabaseSource='remote'; return data;
  }catch(remoteError){
    console.warn('BOS-PROJECTEURS-DB distant indisponible, utilisation du fallback local.',remoteError);
    try{
      const fallback = await fetch(LIGHT_DB_FALLBACK_URL,{cache:'no-store'});
      if(!fallback.ok) throw new Error(`Fallback LIGHT HTTP ${fallback.status}`);
      const data = await fallback.json();
      if(!data || !Array.isArray(data.fixtures)) throw new Error('Fallback LIGHT invalide');
      lightDatabaseSource='fallback'; return data;
    }catch(fallbackError){ console.error('Aucune base projecteurs disponible.',fallbackError); lightDatabaseSource='none'; return null; }
  }
}

async function init(){
  const [cameraResult,lightResult] = await Promise.allSettled([loadSharedCameraDatabase(),loadSharedLightDatabase()]);
  if(cameraResult.status==='fulfilled' && cameraResult.value) cameras = cameraResult.value.cameras || [];
  else { cameras=[{id:'ff',name:'Full Frame 36 mm',sensorWidthMm:36,dof:{label:'Full Frame',cocMm:.029,cropToFF:1}}]; cameraDatabaseSource='none'; }
  if(lightResult.status==='fulfilled' && lightResult.value){ lightDatabase=lightResult.value; lightFixtures=(lightDatabase.fixtures||[]).filter(isCockpitLightUsable); }
  else { lightDatabase=null; lightFixtures=[]; lightDatabaseSource='none'; }
  prepareLightState();
  if(!cameras.some(c=>c.id===state.cameraId)) state.cameraId=cameras[0]?.id || 'ff';
  if(Number(state.expo.isoMin) > Number(state.expo.isoMax)) state.expo.isoMax=state.expo.isoMin;
  clampIsoToRange();
  setupTheme(); renderCameraSelect(); renderTopFocal(); renderGlobalCameraControls(); renderModules(); bindGlobal(); renderCustomize();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
function setupTheme(){ document.documentElement.dataset.theme=state.theme; document.querySelector('meta[name="theme-color"]').content=state.theme==='dark'?'#090b0f':'#ffffff'; }
function cameraBrand(c){ return String(c?.brand || c?.group || 'Autre').trim() || 'Autre'; }
function cameraShortLabel(c){ const name=String(c?.name||c?.id||''),brand=String(c?.brand||'').trim(); return brand && name.toLowerCase().startsWith((brand+' ').toLowerCase()) ? name.slice(brand.length+1) : name; }
function cameraBrands(){ const seen=new Set(),brands=[]; cameras.forEach(c=>{const brand=cameraBrand(c); if(!seen.has(brand)){seen.add(brand);brands.push(brand);}}); return brands; }
function camerasForBrand(brand){ return cameras.filter(c=>cameraBrand(c)===brand); }
function getLastCameraForBrand(brand){ try{const saved=JSON.parse(localStorage.getItem(LAST_CAMERA_BY_BRAND_KEY)||'{}'); const id=saved?.[brand]; return camerasForBrand(brand).some(c=>c.id===id)?id:null;}catch(_){return null;} }
function rememberCameraForBrand(camera){ if(!camera)return; try{const saved=JSON.parse(localStorage.getItem(LAST_CAMERA_BY_BRAND_KEY)||'{}'); saved[cameraBrand(camera)]=camera.id; localStorage.setItem(LAST_CAMERA_BY_BRAND_KEY,JSON.stringify(saved));}catch(_){} }
function renderCameraBrandButtons(){ const host=document.getElementById('cameraBrandMode'); if(!host)return; const activeBrand=cameraBrand(currentCamera()); host.innerHTML=cameraBrands().map(brand=>`<button type="button" data-camerabrand="${esc(brand)}" class="${brand===activeBrand?'active':''}">${esc(brand)}</button>`).join(''); }
function renderCameraSelect(){
  const s=document.getElementById('cameraSelect'); if(!s)return;
  const activeBrand=cameraBrand(currentCamera()),list=camerasForBrand(activeBrand);
  s.innerHTML=list.map(c=>`<option value="${esc(c.id)}" ${c.id===state.cameraId?'selected':''}>${esc(cameraShortLabel(c))}</option>`).join('');
  s.value=state.cameraId; s.title=s.options[s.selectedIndex]?.textContent||''; renderCameraBrandButtons();
}
function applyCameraSelection(nextCameraId){
  const next=cameras.find(c=>c.id===nextCameraId); if(!next)return;
  const changed=next.id!==state.cameraId;
  state.cameraId=next.id; rememberCameraForBrand(next);
  if(changed) resetIsoRangeForCamera();
  save(); renderCameraSelect(); renderGlobalCameraControls(); renderModules();
}
function renderTopFocal(){ const root=document.getElementById('focalPresets'); if(!root)return; root.innerHTML=FOCAL_PRESETS.map(v=>`<button type="button" class="preset-btn ${Number(state.focal)===v?'active':''}" data-focalpreset="${v}">${v}</button>`).join(''); }
function renderGlobalCameraControls(){
  const f=document.getElementById('focalInput'); if(f) f.value=state.focal;
  const a=document.getElementById('globalAperture'); if(a){ a.innerHTML=optionList(apertures,state.aperture,'f/'); a.value=String(state.aperture); }
  const d=document.getElementById('globalDistance'); if(d) d.value=state.distanceCm;
  syncGlobalLimitState();
}
function syncGlobalLimitState(){
  const a=document.getElementById('globalAperture');
  const isError=state.expo.limitWarning?.key==='aperture';
  if(a) a.classList.toggle('limit-error-value',!!isError);
}
function bindGlobal(){
  document.getElementById('cameraBrandMode').addEventListener('click',e=>{const btn=e.target.closest('[data-camerabrand]'); if(!btn)return; const brand=btn.dataset.camerabrand,remembered=getLastCameraForBrand(brand),first=camerasForBrand(brand)[0]; if(remembered)applyCameraSelection(remembered); else if(first)applyCameraSelection(first.id);});
  document.getElementById('cameraSelect').addEventListener('change',e=>applyCameraSelection(e.target.value));
  document.getElementById('focalInput').addEventListener('input',e=>{state.focal=Math.max(1,Number(e.target.value)||35); save(); renderTopFocal(); updateLive();});
  document.getElementById('focalPresets').addEventListener('click',e=>{const btn=e.target.closest('[data-focalpreset]'); if(!btn)return; state.focal=Number(btn.dataset.focalpreset); document.getElementById('focalInput').value=state.focal; save(); renderTopFocal(); updateLive();});
  document.getElementById('globalAperture').addEventListener('change',e=>globalApertureChanged(e.target.value));
  document.getElementById('globalDistance').addEventListener('input',e=>{state.distanceCm=Math.max(10,Number(e.target.value)||10); save(); updateDOF();});
  document.getElementById('themeBtn').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark'; save(); setupTheme();});
  const dlg=document.getElementById('customizeDialog'); document.getElementById('customizeBtn').addEventListener('click',()=>{renderCustomize();dlg.showModal();});
  document.getElementById('resetLayout').addEventListener('click',()=>{state.layout=clone(defaultState.layout);state.visible=clone(defaultState.visible);state.open=clone(defaultState.open);save();renderCustomize();renderModules();});
}
function renderModules(){ const root=document.getElementById('modules'); root.innerHTML=state.layout.filter(id=>state.visible[id]).map(renderModule).join(''); bindModules(); updateLive(); syncGlobalLimitState(); }
function renderModule(id){ const [title,sub]=moduleMeta[id]; return `<article class="module ${state.open[id]?'open':''}" data-module="${id}"><button class="module-head" data-toggle="${id}"><span class="module-title"><i class="module-dot"></i><span><strong>${title}</strong><small>${sub}</small></span></span><span class="chev">⌄</span></button><div class="module-body">${renderBody(id)}</div></article>`; }

function renderBody(id){
  if(id==='dof') return `<div class="resultbox dof-only"><div class="result-main" id="dofMain">—</div><div class="result-sub" id="dofSub">—</div></div>${appLink(id)}`;

  if(id==='media') return `<div class="grid2 media-grid"><label><span>Débit</span><div class="unit-input"><input id="mediaBitrate" type="number" inputmode="decimal" min="1" step="1" value="${state.media.bitrate}"><b id="mediaBitrateUnit">${state.media.unit}</b></div><div class="segmented compact"><button type="button" class="seg ${state.media.unit==='Mb/s'?'active':''}" data-mediaunit="Mb/s">Mb/s</button><button type="button" class="seg ${state.media.unit==='MB/s'?'active':''}" data-mediaunit="MB/s">MB/s</button></div></label><label><span>Carte</span><select id="mediaCard">${['64','128','256','512','1000','2000','4000'].map(v=>`<option value="${v}" ${String(state.media.card)===String(v)?'selected':''}>${v} Go</option>`).join('')}</select></label></div><div class="resultbox"><div class="result-main" id="mediaMain">—</div><div class="result-sub" id="mediaSub">temps d’enregistrement · réserve 0 %</div></div>${appLink(id)}`;

  if(id==='frame') return `<div class="frame-preview"><div class="frame-safe"></div><div class="subject" id="frameSubject"></div><div class="frame-meta" id="frameMeta"></div></div><div class="warning">Aperçu relatif V9 · la récupération du calibrage réel de FRAME sera branchée ensuite.</div>${appLink(id)}`;

  if(id==='light') return `<label><span>Ma lumière</span><select id="lightFixture" ${lightFixtures.length?'':'disabled'}>${lightOptionsHtml()}</select></label><div class="light-status"><span class="pill">100 %</span><span class="pill">5600 K</span><span class="pill">Nu</span></div><div class="luxgrid"><div class="luxbox"><small>à 1 m</small><strong id="lux1">—</strong><div class="iso-mini" id="iso1">ISO min —</div></div><div class="luxbox"><small>à 3 m</small><strong id="lux3">—</strong><div class="iso-mini" id="iso3">ISO min —</div></div></div><div class="demo" id="lightSourceNote">BOS-PROJECTEURS-DB · 100 % · 5600 K · Nu</div>${appLink(id)}`;

  if(id==='expo'){
    const info=currentExposureInfo();
    const warn=state.expo.limitWarning;
    const warnText=warn?`Correction impossible · ${expoLabel(warn.key)} limité à ${formatExpoValue(warn.key,currentExpoValue(warn.key))} · ${Math.abs(warn.remaining).toFixed(1).replace('.',',')} stop non compensé.`:'';
    return `<div class="expo-info"><div><strong>${info.label}</strong><span>${esc(info.display)}</span></div><small>${esc(currentCamera()?.exposure?.mode||'')}</small></div>
      <div class="expo-aperture-mode"><div><strong>Diaph</strong><small>Peut participer à la compensation</small></div><div class="segmented"><button type="button" class="seg ${!state.expo.apertureAuto?'active':''}" data-apertureauto="manual">Manuel</button><button type="button" class="seg ${state.expo.apertureAuto?'active':''}" data-apertureauto="auto">Auto</button></div></div>
      <div class="grid2 iso-bounds"><label><span>ISO MIN</span><select id="expoIsoMin">${optionList(isos,state.expo.isoMin,'ISO ')}</select></label><label><span>ISO MAX</span><select id="expoIsoMax">${optionList(isos,state.expo.isoMax,'ISO ')}</select></label></div>
      <div class="expo-simple-rows">${['iso','shutter','nd'].map(renderExpoRow).join('')}</div>
      ${warn?`<div class="expo-warning">${warnText}</div>`:`<div class="base-note">Assombrir : ISO ↓ → ND ↑ → Shutter${state.expo.apertureAuto?' → Diaph':''}.<br>Éclaircir : ND ↓ → ISO ↑ → Shutter${state.expo.apertureAuto?' → Diaph':''}.</div>`}
      ${appLink(id)}`;
  }
  return '';
}
function expoLabel(k){ return {aperture:'Diaph',iso:'ISO',shutter:'Shutter',nd:'ND'}[k]; }
function currentExpoValue(k){ return k==='aperture'?String(state.aperture):String(state.expo.values[k]); }
function formatExpoValue(k,v){ return k==='aperture'?`f/${v}`:(k==='nd'?`ND ${v}`:String(v)); }
function valuesForKey(k){ if(k==='aperture')return apertures; if(k==='iso')return isoRangeValues(); if(k==='shutter')return shutters; return nds; }
function renderExpoRow(k){
  const vals=valuesForKey(k),pref=k==='nd'?'ND ':'';
  const limitError=state.expo.limitWarning?.key===k;
  return `<label class="expo-simple-row ${limitError?'limit-error':''}"><span>${expoLabel(k)}</span><select class="${limitError?'limit-error-value':''}" data-expokey="${k}">${optionList(vals,state.expo.values[k],pref)}</select></label>`;
}

function bindModules(){
  document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.toggle;state.open[id]=!state.open[id];save();b.closest('.module').classList.toggle('open',state.open[id]);}));
  const mb=document.getElementById('mediaBitrate'); if(mb)mb.addEventListener('input',e=>{state.media.bitrate=Math.max(1,Number(e.target.value)||1);save();updateMedia();});
  const mc=document.getElementById('mediaCard'); if(mc)mc.addEventListener('change',e=>{state.media.card=Number(e.target.value);save();updateMedia();});
  document.querySelectorAll('[data-mediaunit]').forEach(btn=>btn.addEventListener('click',()=>switchMediaUnit(btn.dataset.mediaunit)));
  const lf=document.getElementById('lightFixture'); if(lf)lf.addEventListener('change',e=>{state.light.fixture=e.target.value;save();updateLight();});
  document.querySelectorAll('[data-apertureauto]').forEach(btn=>btn.addEventListener('click',()=>{state.expo.apertureAuto=btn.dataset.apertureauto==='auto';state.expo.limitWarning=null;save();renderModules();}));
  const minSel=document.getElementById('expoIsoMin'); if(minSel)minSel.addEventListener('change',e=>changeIsoBound('min',e.target.value));
  const maxSel=document.getElementById('expoIsoMax'); if(maxSel)maxSel.addEventListener('change',e=>changeIsoBound('max',e.target.value));
  document.querySelectorAll('[data-expokey]').forEach(s=>s.addEventListener('change',e=>expoChanged(e.target.dataset.expokey,e.target.value)));
  document.querySelectorAll('[data-applink]').forEach(b=>b.addEventListener('click',()=>{const u=APP_LINKS[b.dataset.applink];if(u&&u!=='#')location.href=u;}));
}
function switchMediaUnit(nextUnit){ if(nextUnit===state.media.unit)return; const oldMb=bitrateToMbPerSec(); state.media.unit=nextUnit; state.media.bitrate=nextUnit==='Mb/s'?Math.round(oldMb):Math.round((oldMb/8)*100)/100; save(); renderModules(); }

function exposureStop(k,v){
  if(k==='aperture') return -2*Math.log2(Number(v));
  if(k==='iso') return Math.log2(Number(v));
  if(k==='shutter'){ const [a,b]=String(v).split('/').map(Number); return Math.log2(a/b); }
  if(k==='nd') return -Number(v)/0.3;
  return 0;
}
function expoTotal(){ return exposureStop('aperture',state.aperture)+exposureStop('iso',state.expo.values.iso)+exposureStop('shutter',state.expo.values.shutter)+exposureStop('nd',state.expo.values.nd); }
function setExpoValue(k,v){ if(k==='aperture') state.aperture=Number(v); else state.expo.values[k]=String(v); }
function priorityForRemaining(remaining,changedKey){
  const order=remaining<0?['iso','nd','shutter']:['nd','iso','shutter'];
  if(state.expo.apertureAuto) order.push('aperture');
  return order.filter(k=>k!==changedKey);
}
function directionalCandidates(key,remaining){
  const vals=valuesForKey(key);
  const cur=currentExpoValue(key),curStop=exposureStop(key,cur);
  const wantUp=remaining>0;
  return vals.filter(v=>{
    const d=exposureStop(key,v)-curStop;
    return wantUp ? d>1e-9 : d< -1e-9;
  });
}
function bestDirectionalValue(key,remaining){
  const cur=currentExpoValue(key),curStop=exposureStop(key,cur);
  const candidates=directionalCandidates(key,remaining);
  if(!candidates.length) return {value:cur,delta:0,saturated:true};
  let best=candidates[0],bestDelta=exposureStop(key,best)-curStop,bestErr=Math.abs(remaining-bestDelta);
  for(const v of candidates.slice(1)){
    const delta=exposureStop(key,v)-curStop,err=Math.abs(remaining-delta);
    if(err<bestErr){best=v;bestDelta=delta;bestErr=err;}
  }
  const stops=candidates.map(v=>exposureStop(key,v));
  const extremeStop=remaining>0?Math.max(...stops):Math.min(...stops);
  const chosenStop=exposureStop(key,best);
  const saturated=Math.abs(chosenStop-extremeStop)<1e-9 && Math.abs(remaining-bestDelta)>0.20;
  return {value:String(best),delta:bestDelta,saturated};
}
function applyLinkedCompensation(targetTotal,changedKey){
  let remaining=targetTotal-expoTotal();
  state.expo.limitWarning=null;
  let lastKey=null,lastSaturated=null;
  for(const key of priorityForRemaining(remaining,changedKey)){
    if(Math.abs(remaining)<=0.20) break;
    lastKey=key;
    const step=bestDirectionalValue(key,remaining);
    if(step.delta!==0){ setExpoValue(key,step.value); remaining-=step.delta; }
    if(step.saturated || step.delta===0) lastSaturated=key;
    if(Math.abs(remaining)<=0.20) break;
  }
  if(Math.abs(remaining)>0.20){
    const key=lastSaturated||lastKey||changedKey;
    state.expo.limitWarning={key,remaining,direction:remaining<0?'darken':'brighten'};
  }
  return remaining;
}
function globalApertureChanged(newVal){
  const before=expoTotal();
  state.aperture=Number(newVal);
  state.expo.limitWarning=null;
  applyLinkedCompensation(before,'aperture');
  save(); renderGlobalCameraControls(); renderModules();
}
function expoChanged(key,newVal){
  const before=expoTotal();
  state.expo.values[key]=String(newVal);
  state.expo.limitWarning=null;
  applyLinkedCompensation(before,key);
  save(); renderGlobalCameraControls(); renderModules();
}
function changeIsoBound(which,newVal){
  const before=expoTotal();
  if(which==='min'){
    state.expo.isoMin=String(newVal);
    if(Number(state.expo.isoMin)>Number(state.expo.isoMax)) state.expo.isoMax=state.expo.isoMin;
  }else{
    state.expo.isoMax=String(newVal);
    if(Number(state.expo.isoMax)<Number(state.expo.isoMin)) state.expo.isoMin=state.expo.isoMax;
  }
  const oldIso=state.expo.values.iso;
  clampIsoToRange();
  state.expo.limitWarning=null;
  if(state.expo.values.iso!==oldIso) applyLinkedCompensation(before,'iso');
  save(); renderGlobalCameraControls(); renderModules();
}

function updateLive(){ updateDOF();updateMedia();updateFrame();updateLight(); }
function updateDOF(){
  const out=document.getElementById('dofMain'); if(!out)return;
  const cam=currentCamera(),f=Number(state.focal),N=Number(state.aperture),c=cam?.dof?.cocMm||.029,s=Number(state.distanceCm)*10;
  const H=(f*f)/(N*c)+f,near=(H*s)/(H+(s-f)),far=(H<=s-f)?Infinity:(H*s)/(H-(s-f)),dof=far===Infinity?Infinity:(far-near)/1000;
  out.textContent=`PDC ${fmtM(dof)}`;
  document.getElementById('dofSub').textContent=`${fmtM(near/1000)} — ${fmtM(far/1000)} · ${state.focal} mm · f/${state.aperture} · ${state.distanceCm} cm`;
}
function updateMedia(){ const el=document.getElementById('mediaMain'),sub=document.getElementById('mediaSub'); if(!el)return; const bitrateMb=bitrateToMbPerSec(),sec=(Number(state.media.card)*1000*8)/bitrateMb; el.textContent=fmtDuration(sec); if(sub)sub.textContent=`temps d’enregistrement · ${bitrateMb.toLocaleString('fr-FR')} Mb/s · réserve 0 %`; }
function updateFrame(){ const sub=document.getElementById('frameSubject'),meta=document.getElementById('frameMeta'); if(!sub||!meta)return; const cam=currentCamera(),crop=36/(cam?.sensorWidthMm||36),eq=state.focal*crop,w=Math.max(30,Math.min(220,42+eq*1.35)); sub.style.width=`${w}px`; meta.textContent=`${cam?.name||''} · ≈ ${Math.round(eq)} mm FF`; }
function estimateIsoFromLux(lux,aperture,shutterFraction='1/50'){
  if(!lux||lux<=0)return Number(isos[0]); const [a,b]=shutterFraction.split('/').map(Number),t=a/b,N=Number(aperture),iso=(250*N*N)/(lux*t); let best=Number(isos[0]),diff=Infinity; for(const v of isos){const nv=Number(v),d=Math.abs(nv-iso);if(d<diff){diff=d;best=nv;}} return Math.max(100,best);
}
function updateLight(){
  const a=document.getElementById('lux1'),b=document.getElementById('lux3'),i1=document.getElementById('iso1'),i3=document.getElementById('iso3'),note=document.getElementById('lightSourceNote'); if(!a||!b||!i1||!i3)return;
  const fixture=currentLight();
  if(!fixture){a.textContent='—';b.textContent='—';i1.textContent='ISO min —';i3.textContent='ISO min —';if(note)note.textContent=`${lightDatabaseSource==='remote'?'BOS-PROJECTEURS-DB · en ligne':(lightDatabaseSource==='fallback'?'BOS-PROJECTEURS-DB · secours local':'Base projecteurs indisponible')} · aucune photométrie Nu / 5600 K disponible.`;return;}
  const at1=luxAtDistance(fixture,1),at3=luxAtDistance(fixture,3),renderLux=r=>r?`${r.exact?'':'≈ '}${Math.round(r.lux).toLocaleString('fr-FR')} lx`:'—';
  a.textContent=renderLux(at1);b.textContent=renderLux(at3);
  i1.textContent=at1?`ISO min ${estimateIsoFromLux(at1.lux,state.aperture)} · f/${state.aperture} · 1/50`:'ISO min —';
  i3.textContent=at3?`ISO min ${estimateIsoFromLux(at3.lux,state.aperture)} · f/${state.aperture} · 1/50`:'ISO min —';
  const calculated=[at1,at3].some(r=>r&&!r.exact),bare=fixture?.calculator?.accessories?.bare,quality=bare?.quality==='measured'?'mesure constructeur':(bare?.quality==='single'?'mesure de référence':(bare?.quality||'donnée DB'));
  if(note){const src=lightDatabaseSource==='remote'?'en ligne':(lightDatabaseSource==='fallback'?'secours local':'indisponible');note.textContent=`BOS-PROJECTEURS-DB ${lightDatabase?.databaseVersion||''} · ${src} · ${quality}${calculated?' · ≈ = calcul de distance depuis une mesure DB':''}`;}
}
function renderCustomize(){ const root=document.getElementById('customizeList'); if(!root)return; root.innerHTML=state.layout.map((id,i)=>`<div class="custom-item"><input type="checkbox" data-vis="${id}" ${state.visible[id]?'checked':''}><span class="custom-name">${moduleMeta[id][0]}</span><button type="button" class="movebtn" data-up="${id}" ${i===0?'disabled':''}>↑</button><button type="button" class="movebtn" data-down="${id}" ${i===state.layout.length-1?'disabled':''}>↓</button></div>`).join(''); root.querySelectorAll('[data-vis]').forEach(x=>x.addEventListener('change',()=>{state.visible[x.dataset.vis]=x.checked;save();renderModules();})); root.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.up,-1))); root.querySelectorAll('[data-down]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.down,1))); }
function moveModule(id,dir){ const i=state.layout.indexOf(id),j=i+dir;if(j<0||j>=state.layout.length)return;[state.layout[i],state.layout[j]]=[state.layout[j],state.layout[i]];save();renderCustomize();renderModules(); }

document.addEventListener('DOMContentLoaded',init);
