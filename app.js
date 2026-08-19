const STORAGE_KEY = 'bos-cockpit-v21';
const LEGACY_STORAGE_KEYS = ['bos-cockpit-v14','bos-cockpit-v13','bos-cockpit-v12','bos-cockpit-v11','bos-cockpit-v10'];
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
  cameraShutter: '1/50',
  cameraIso: '800',
  distanceCm: 250,
  layout: ['expo', 'frame', 'dof', 'light', 'media'],
  visible: { expo: true, frame: true, dof: true, light: true, media: true },
  open: { expo: true, frame: true, dof: true, light: false, media: false },
  media: { bitrate: 250, unit: 'Mb/s', card: 256 },
  light: { fixture: 'cob200xs' },
  cameraLimits: { isoMin: '800', isoMax: '51200', apertureMin: '1.0', apertureMax: '22' },
  expo: {
    values: { aperture: '2.8', iso: '800', shutter: '1/50', nd: '0' },
    locks: { aperture: false, iso: false, shutter: false, nd: false },
    limitWarning: null
  }
};

const moduleMeta = {
  expo: ['EXPO', 'Compensation liée'],
  frame: ['FRAME', "Director's Viewfinder"],
  dof: ['DOF', 'Profondeur de champ'],
  light: ['LIGHT', 'Projecteurs et Lux'],
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
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      for(const key of LEGACY_STORAGE_KEYS){
        raw = localStorage.getItem(key);
        if(raw) break;
      }
    }
    return mergeDeep(defaultState, JSON.parse(raw || '{}'));
  }
  catch { return clone(defaultState); }
}
function normalizeState(){
  state.focal = Math.max(1, Number(state.focal) || 35);
  state.aperture = Number(state.aperture) || 2.8;
  if(!state.cameraShutter) state.cameraShutter = '1/50';
  if(!state.cameraIso) state.cameraIso = '800';
  if(typeof state.cameraOpen !== 'boolean') state.cameraOpen = true;
  state.distanceCm = Math.max(10, Number(state.distanceCm) || 250);
  if(!state.media.unit) state.media.unit = 'Mb/s';
  if(!state.expo) state.expo = clone(defaultState.expo);
  if(!state.expo.values) state.expo.values = clone(defaultState.expo.values);
  if(!state.expo.values.aperture) state.expo.values.aperture = String(state.aperture);
  if(!state.expo.values.iso) state.expo.values.iso = '800';
  if(!state.expo.values.shutter) state.expo.values.shutter = '1/50';
  if(state.expo.values.nd === undefined) state.expo.values.nd = '0';
  if(!state.cameraLimits) state.cameraLimits = clone(defaultState.cameraLimits);
  if(!state.cameraLimits.isoMin) state.cameraLimits.isoMin = '800';
  if(!state.cameraLimits.isoMax) state.cameraLimits.isoMax = '51200';
  if(!state.cameraLimits.apertureMin) state.cameraLimits.apertureMin = '1.0';
  if(!state.cameraLimits.apertureMax) state.cameraLimits.apertureMax = '22';
  if(!state.expo.locks) state.expo.locks = clone(defaultState.expo.locks);
  for(const k of ['aperture','iso','shutter','nd']) state.expo.locks[k] = !!state.expo.locks[k];
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
  const lo = Number(state.cameraLimits.isoMin), hi = Number(state.cameraLimits.isoMax);
  return isos.filter(v => Number(v) >= lo && Number(v) <= hi);
}
function clampIsoToRange(){
  const vals = isoRangeValues();
  if(!vals.length){ state.expo.values.iso = state.cameraLimits.isoMin; return; }
  const cur = Number(state.expo.values.iso);
  const best = vals.reduce((a,b) => Math.abs(Number(b)-cur) < Math.abs(Number(a)-cur) ? b : a, vals[0]);
  state.expo.values.iso = String(best);
}
function resetIsoRangeForCamera(){
  state.cameraLimits.isoMin = defaultIsoMinForCamera();
  state.cameraLimits.isoMax = '51200';
  if(Number(state.cameraLimits.isoMin) > Number(state.cameraLimits.isoMax)) state.cameraLimits.isoMax = state.cameraLimits.isoMin;
  if(!state.expo.locks.iso) clampIsoToRange();
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
  if(Number(state.cameraLimits.isoMin) > Number(state.cameraLimits.isoMax)) state.cameraLimits.isoMax=state.cameraLimits.isoMin;
  if(Number(state.cameraLimits.apertureMin) > Number(state.cameraLimits.apertureMax)) state.cameraLimits.apertureMax=state.cameraLimits.apertureMin;
  const baseApertureVals=apertureRangeValues();
  if(baseApertureVals.length && !baseApertureVals.includes(String(state.aperture))) state.aperture=Number(baseApertureVals[0]);
  clampApertureToRange(false);
  clampIsoToRange();
  clampCameraIsoToRange();
  setupTheme(); renderCameraSelect(); renderTopFocal(); renderGlobalCameraControls(); renderModules(); bindGlobal(); renderCustomize();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
function setupTheme(){ document.documentElement.dataset.theme=state.theme; document.querySelector('meta[name="theme-color"]').content=state.theme==='dark'?'#0B0C0E':'#F3F1EC'; const btn=document.getElementById('themeBtn'); if(btn) btn.textContent=state.theme==='dark'?'LIGHT':'DARK'; }
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
function apertureRangeValues(){
  const lo=Number(state.cameraLimits.apertureMin),hi=Number(state.cameraLimits.apertureMax);
  return apertures.filter(v=>Number(v)>=lo && Number(v)<=hi);
}
function isoRangeValues(){
  const lo=Number(state.cameraLimits.isoMin),hi=Number(state.cameraLimits.isoMax);
  return isos.filter(v=>Number(v)>=lo && Number(v)<=hi);
}
function clampCameraIsoToRange(){
  const vals=isoRangeValues();
  if(!vals.length) return;
  const cur=Number(state.cameraIso);
  const best=vals.reduce((a,b)=>Math.abs(Number(b)-cur)<Math.abs(Number(a)-cur)?b:a,vals[0]);
  state.cameraIso=String(best);
}
function renderCameraSummary(){
  const el=document.getElementById('cameraSummary'); if(!el) return;
  const cam=currentCamera();
  el.textContent=`${cam?.name||'—'} · ${state.focal} mm · f/${state.aperture} · ISO ${state.cameraIso} · ${state.cameraShutter} · ${state.distanceCm} cm`;
}
function clampApertureToRange(compensate=true){
  const vals=apertureRangeValues();
  if(!vals.length) return;
  const cur=Number(state.expo.values.aperture);
  const best=vals.reduce((a,b)=>Math.abs(Number(b)-cur)<Math.abs(Number(a)-cur)?b:a,vals[0]);
  if(String(state.expo.values.aperture)===String(best)) return;
  if(compensate){
    const before=expoTotal();
    state.expo.values.aperture=String(best);
    applyLinkedCompensation(before,'aperture');
  }else state.expo.values.aperture=String(best);
}
function renderGlobalCameraControls(){
  const card=document.getElementById('cameraCard'); if(card) card.classList.toggle('open',!!state.cameraOpen);
  const f=document.getElementById('focalInput'); if(f) f.value=state.focal;
  const a=document.getElementById('globalAperture'); if(a){ a.innerHTML=optionList(apertureRangeValues(),state.aperture,'f/'); a.value=String(state.aperture); }
  const gi=document.getElementById('globalIso'); if(gi){ gi.innerHTML=optionList(isoRangeValues(),state.cameraIso,'ISO '); gi.value=String(state.cameraIso); }
  const sh=document.getElementById('globalShutter'); if(sh){ sh.innerHTML=optionList(shutters,state.cameraShutter); sh.value=String(state.cameraShutter); }
  const d=document.getElementById('globalDistance'); if(d) d.value=state.distanceCm;
  const imin=document.getElementById('globalIsoMin'); if(imin){imin.innerHTML=optionList(isos,state.cameraLimits.isoMin,'ISO ');imin.value=state.cameraLimits.isoMin;}
  const imax=document.getElementById('globalIsoMax'); if(imax){imax.innerHTML=optionList(isos,state.cameraLimits.isoMax,'ISO ');imax.value=state.cameraLimits.isoMax;}
  const amin=document.getElementById('globalApertureMin'); if(amin){amin.innerHTML=optionList(apertures,state.cameraLimits.apertureMin,'f/');amin.value=state.cameraLimits.apertureMin;}
  const amax=document.getElementById('globalApertureMax'); if(amax){amax.innerHTML=optionList(apertures,state.cameraLimits.apertureMax,'f/');amax.value=state.cameraLimits.apertureMax;}
  renderCameraSummary();
  syncGlobalLimitState();
}
function syncGlobalLimitState(){
  /* Les alertes de limite appartiennent uniquement au module EXPO. */
}
function bindGlobal(){
  document.getElementById('cameraToggle').addEventListener('click',()=>{state.cameraOpen=!state.cameraOpen; save(); renderGlobalCameraControls();});
  document.getElementById('cameraBrandMode').addEventListener('click',e=>{const btn=e.target.closest('[data-camerabrand]'); if(!btn)return; const brand=btn.dataset.camerabrand,remembered=getLastCameraForBrand(brand),first=camerasForBrand(brand)[0]; if(remembered)applyCameraSelection(remembered); else if(first)applyCameraSelection(first.id);});
  document.getElementById('cameraSelect').addEventListener('change',e=>applyCameraSelection(e.target.value));
  document.getElementById('focalInput').addEventListener('input',e=>{state.focal=Math.max(1,Number(e.target.value)||35); save(); renderTopFocal(); renderCameraSummary(); updateLive();});
  document.getElementById('focalPresets').addEventListener('click',e=>{const btn=e.target.closest('[data-focalpreset]'); if(!btn)return; state.focal=Number(btn.dataset.focalpreset); document.getElementById('focalInput').value=state.focal; save(); renderTopFocal(); renderCameraSummary(); updateLive();});
  document.getElementById('globalAperture').addEventListener('change',e=>globalApertureChanged(e.target.value));
  document.getElementById('globalIso').addEventListener('change',e=>globalIsoChanged(e.target.value));
  document.getElementById('globalShutter').addEventListener('change',e=>globalShutterChanged(e.target.value));
  document.getElementById('globalDistance').addEventListener('input',e=>{state.distanceCm=Math.max(10,Number(e.target.value)||10); save(); renderCameraSummary(); updateDOF();});
  document.getElementById('globalIsoMin').addEventListener('change',e=>changeIsoBound('min',e.target.value));
  document.getElementById('globalIsoMax').addEventListener('change',e=>changeIsoBound('max',e.target.value));
  document.getElementById('globalApertureMin').addEventListener('change',e=>changeApertureBound('min',e.target.value));
  document.getElementById('globalApertureMax').addEventListener('change',e=>changeApertureBound('max',e.target.value));
  document.getElementById('themeBtn').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark'; save(); setupTheme();});
  const dlg=document.getElementById('customizeDialog'); document.getElementById('customizeBtn').addEventListener('click',()=>{renderCustomize();dlg.showModal();});
  document.getElementById('resetLayout').addEventListener('click',()=>{state.layout=clone(defaultState.layout);state.visible=clone(defaultState.visible);state.open=clone(defaultState.open);save();renderCustomize();renderModules();});
}
function renderModules(){ const root=document.getElementById('modules'); root.innerHTML=state.layout.filter(id=>state.visible[id]).map(renderModule).join(''); bindModules(); updateLive(); syncGlobalLimitState(); }
function renderModule(id){ const [title,sub]=moduleMeta[id]; return `<article class="module ${state.open[id]?'open':''}" data-module="${id}"><button class="module-head" data-toggle="${id}"><span class="module-title"><i class="module-dot"></i><span><strong>${title}</strong><small>${sub}</small></span></span><span class="chev">⌄</span></button><div class="module-body">${renderBody(id)}</div></article>`; }

function renderBody(id){
  if(id==='dof') return `<div class="resultbox dof-only"><div class="result-main" id="dofMain">—</div><div class="result-sub" id="dofSub">—</div></div>${appLink(id)}`;

  if(id==='media') return `<div class="grid2 media-grid"><label><span>Débit</span><div class="unit-input"><input id="mediaBitrate" type="number" inputmode="decimal" min="1" step="1" value="${state.media.bitrate}"><b id="mediaBitrateUnit">${state.media.unit}</b></div><div class="segmented compact"><button type="button" class="seg ${state.media.unit==='Mb/s'?'active':''}" data-mediaunit="Mb/s">Mb/s</button><button type="button" class="seg ${state.media.unit==='MB/s'?'active':''}" data-mediaunit="MB/s">MB/s</button></div></label><label><span>Carte</span><select id="mediaCard">${['64','128','256','512','1000','2000','4000'].map(v=>`<option value="${v}" ${String(state.media.card)===String(v)?'selected':''}>${v} Go</option>`).join('')}</select></label></div><div class="resultbox"><div class="result-main" id="mediaMain">—</div><div class="result-sub" id="mediaSub">temps d’enregistrement · réserve 0 %</div></div>${appLink(id)}`;

  if(id==='frame') return `<div class="frame-preview"><div class="frame-safe"></div><div class="subject" id="frameSubject"></div><div class="frame-meta" id="frameMeta"></div></div><div class="warning">Aperçu relatif V15 · la récupération du calibrage réel de FRAME sera branchée ensuite.</div>${appLink(id)}`;

  if(id==='light') return `<label><span>Ma lumière</span><select id="lightFixture" ${lightFixtures.length?'':'disabled'}>${lightOptionsHtml()}</select></label><div class="light-status"><span class="pill">100 %</span><span class="pill">5600 K</span><span class="pill">Nu</span></div><div class="luxgrid"><div class="luxbox"><small>à 1 m</small><strong id="lux1">—</strong><div class="iso-mini" id="iso1">ISO min —</div></div><div class="luxbox"><small>à 3 m</small><strong id="lux3">—</strong><div class="iso-mini" id="iso3">ISO min —</div></div></div><div class="demo" id="lightSourceNote">BOS-PROJECTEURS-DB · 100 % · 5600 K · Nu</div>${appLink(id)}`;

  if(id==='expo'){
    const warn=state.expo.limitWarning;
    const warnText=warn?(warn.reason==='locked'
      ?`Correction impossible · les autres réglages disponibles sont verrouillés · ${Math.abs(warn.remaining).toFixed(1).replace('.',',')} stop non compensé.`
      :`Correction impossible · ${expoLabel(warn.key)} limité à ${formatExpoValue(warn.key,currentExpoValue(warn.key))} · ${Math.abs(warn.remaining).toFixed(1).replace('.',',')} stop non compensé.`):'';
    return `<div class="expo-calc-block">
      <div class="expo-calc-head">
        <div>
          <div class="expo-calc-kicker">CALCUL</div>
          <div class="expo-calc-note">Réglage actif : modifie un paramètre, les autres compensent automatiquement.</div>
        </div>
        <button type="button" id="expoResetBtn" class="expo-ref-btn">= RÉF.</button>
      </div>
      <div class="expo-calc-grid">${['aperture','iso','shutter','nd'].map(renderExpoCalcItem).join('')}</div>
    </div>
    <div class="expo-priority-note">Assombrir : Diaph ↑ → ISO ↓ → ND ↑ → Shutter · Éclaircir : Diaph ↓ → ND ↓ → ISO ↑ → Shutter.</div>
    ${warn?`<div class="expo-warning">${warnText}</div>`:`<div class="expo-calc-summary ${expoCalcResidualClass()}">${expoCalcSummary()}</div>`}
    ${appLink(id)}`;
  }
  return '';
}
function expoLabel(k){ return {aperture:'Diaph',iso:'ISO',shutter:'Shutter',nd:'ND'}[k]; }
function currentExpoValue(k){ return String(state.expo.values[k]); }
function formatThousandsFr(v){ return Number(v).toLocaleString('fr-FR').replace(/\u202f/g,' '); }
function ndCalcDisplay(v){
  const density=Number(v)||0,stops=density/0.3,factor=Math.pow(2,stops);
  const stopText=`${Number(stops.toFixed(1)).toLocaleString('fr-FR')} ${Math.abs(stops-1)<1e-9?'stop':'stops'}`;
  return `${stopText} · ND${Math.round(factor)} · ${density.toFixed(1).replace('.',',')}`;
}
function formatExpoValue(k,v){
  if(k==='aperture') return `f/${String(v).replace('.',',')}`;
  if(k==='iso') return `ISO ${formatThousandsFr(v)}`;
  if(k==='shutter') return String(v);
  if(k==='nd') return ndCalcDisplay(v);
  return String(v);
}
function expoReferenceValues(){ return {aperture:String(state.aperture),iso:String(state.cameraIso),shutter:String(state.cameraShutter),nd:'0'}; }
function exposureTotalFor(values){ return exposureStop('aperture',values.aperture)+exposureStop('iso',values.iso)+exposureStop('shutter',values.shutter)+exposureStop('nd',values.nd); }
function expoCalcResidual(){ return exposureTotalFor(expoReferenceValues())-expoTotal(); }
function expoCalcResidualClass(){ return Math.abs(expoCalcResidual())<=0.20?'is-ok':'is-warning'; }
function expoCalcSummary(){
  const ref=expoReferenceValues();
  const parts=['aperture','iso','shutter','nd'].flatMap(k=>String(ref[k])===String(state.expo.values[k])?[]:[`${formatExpoValue(k,ref[k])} → ${formatExpoValue(k,state.expo.values[k])}`]);
  const residual=expoCalcResidual();
  if(!parts.length) return 'CALCUL aligné sur la référence Caméra.';
  if(Math.abs(residual)<=0.20) return `${parts.join(' · ')} · EXPOSITION CONSERVÉE`;
  return `${parts.join(' · ')} · ${Math.abs(residual).toFixed(1).replace('.',',')} stop restant`;
}
function valuesForKey(k){
  if(k==='aperture'){
    const vals=apertureRangeValues();
    const cur=String(state.expo.values.aperture);
    return state.expo.locks.aperture && !vals.includes(cur) ? [...vals,cur].sort((a,b)=>Number(a)-Number(b)) : vals;
  }
  if(k==='iso'){
    const vals=isoRangeValues();
    const cur=String(state.expo.values.iso);
    return state.expo.locks.iso && !vals.includes(cur) ? [...vals,cur].sort((a,b)=>Number(a)-Number(b)) : vals;
  }
  if(k==='shutter')return shutters;
  return nds;
}
function expoOptionsHtml(k){
  return valuesForKey(k).map(v=>`<option value="${v}" ${String(v)===currentExpoValue(k)?'selected':''}>${formatExpoValue(k,v)}</option>`).join('');
}
function lockSvg(locked=false){
  return locked
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7a4 4 0 0 1 8 0v3"/><rect x="5" y="10" width="14" height="10" rx="2"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 9.2-2.7"/><rect x="5" y="10" width="14" height="10" rx="2"/></svg>`;
}
function renderExpoCalcItem(k){
  const limitError=state.expo.limitWarning?.key===k,locked=!!state.expo.locks[k];
  return `<div class="expo-calc-item ${limitError?'limit-error':''} ${locked?'locked':''}">
    <button type="button" class="expo-calc-lock ${locked?'active':''}" data-expolock="${k}" aria-pressed="${locked?'true':'false'}" title="${locked?'Déverrouiller':'Verrouiller'} ${expoLabel(k)}">${lockSvg(locked)}</button>
    <label class="expo-calc-value ${limitError?'limit-error-value':''}">
      <span>${expoLabel(k)}</span>
      <select data-expokey="${k}" ${locked?'disabled':''}>${expoOptionsHtml(k)}</select>
    </label>
  </div>`;
}

function bindModules(){
  document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.toggle;state.open[id]=!state.open[id];save();b.closest('.module').classList.toggle('open',state.open[id]);}));
  const mb=document.getElementById('mediaBitrate'); if(mb)mb.addEventListener('input',e=>{state.media.bitrate=Math.max(1,Number(e.target.value)||1);save();updateMedia();});
  const mc=document.getElementById('mediaCard'); if(mc)mc.addEventListener('change',e=>{state.media.card=Number(e.target.value);save();updateMedia();});
  document.querySelectorAll('[data-mediaunit]').forEach(btn=>btn.addEventListener('click',()=>switchMediaUnit(btn.dataset.mediaunit)));
  const lf=document.getElementById('lightFixture'); if(lf)lf.addEventListener('change',e=>{state.light.fixture=e.target.value;save();updateLight();});
  const expoResetBtn=document.getElementById('expoResetBtn'); if(expoResetBtn) expoResetBtn.addEventListener('click',resetExpoToCameraBase);
  document.querySelectorAll('[data-expolock]').forEach(b=>b.addEventListener('click',()=>toggleExpoLock(b.dataset.expolock)));
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
function expoTotal(){ return exposureStop('aperture',state.expo.values.aperture)+exposureStop('iso',state.expo.values.iso)+exposureStop('shutter',state.expo.values.shutter)+exposureStop('nd',state.expo.values.nd); }
function setExpoValue(k,v){ state.expo.values[k]=String(v); }
function priorityForRemaining(remaining,changedKey){
  const order=remaining<0?['aperture','iso','nd','shutter']:['aperture','nd','iso','shutter'];
  return order.filter(k=>k!==changedKey && !state.expo.locks[k]);
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
  const available=priorityForRemaining(remaining,changedKey);
  for(const key of available){
    if(Math.abs(remaining)<=0.20) break;
    lastKey=key;
    const step=bestDirectionalValue(key,remaining);
    if(step.delta!==0){ setExpoValue(key,step.value); remaining-=step.delta; }
    if(step.saturated || step.delta===0) lastSaturated=key;
    if(Math.abs(remaining)<=0.20) break;
  }
  if(Math.abs(remaining)>0.20){
    if(!available.length){
      state.expo.limitWarning={key:null,reason:'locked',remaining,direction:remaining<0?'darken':'brighten'};
    }else{
      const key=lastSaturated||lastKey;
      state.expo.limitWarning={key,reason:'limit',remaining,direction:remaining<0?'darken':'brighten'};
    }
  }
  return remaining;
}
function toggleExpoLock(key){
  const wasLocked=!!state.expo.locks[key];
  const before=expoTotal();
  state.expo.locks[key]=!wasLocked;
  state.expo.limitWarning=null;
  if(wasLocked && !state.expo.locks[key]){
    if(key==='iso'){
      const old=state.expo.values.iso;
      clampIsoToRange();
      if(state.expo.values.iso!==old) applyLinkedCompensation(before,'iso');
    }else if(key==='aperture'){
      const old=String(state.expo.values.aperture);
      clampApertureToRange(false);
      if(String(state.expo.values.aperture)!==old) applyLinkedCompensation(before,'aperture');
    }
  }
  save();
  renderGlobalCameraControls();
  renderModules();
}
function alignExpoToCameraReference(){
  state.expo.values.aperture=String(state.aperture);
  state.expo.values.iso=String(state.cameraIso);
  state.expo.values.shutter=String(state.cameraShutter);
  state.expo.values.nd='0';
  state.expo.limitWarning=null;
}
function globalApertureChanged(newVal){
  state.aperture=Number(newVal);
  alignExpoToCameraReference();
  save(); renderGlobalCameraControls(); renderModules();
}
function globalIsoChanged(newVal){
  state.cameraIso=String(newVal);
  alignExpoToCameraReference();
  save(); renderGlobalCameraControls(); renderModules();
}
function globalShutterChanged(newVal){
  state.cameraShutter=String(newVal);
  alignExpoToCameraReference();
  save(); renderGlobalCameraControls(); renderModules();
}
function resetExpoToCameraBase(){
  alignExpoToCameraReference();
  save(); renderModules();
}
function expoChanged(key,newVal){
  if(state.expo.locks[key]) return;
  const before=expoTotal();
  setExpoValue(key,newVal);
  state.expo.limitWarning=null;
  applyLinkedCompensation(before,key);
  save(); renderGlobalCameraControls(); renderModules();
}
function changeIsoBound(which,newVal){
  const before=expoTotal();
  if(which==='min'){
    state.cameraLimits.isoMin=String(newVal);
    if(Number(state.cameraLimits.isoMin)>Number(state.cameraLimits.isoMax)) state.cameraLimits.isoMax=state.cameraLimits.isoMin;
  }else{
    state.cameraLimits.isoMax=String(newVal);
    if(Number(state.cameraLimits.isoMax)<Number(state.cameraLimits.isoMin)) state.cameraLimits.isoMin=state.cameraLimits.isoMax;
  }
  const oldIso=state.expo.values.iso;
  clampIsoToRange();
  clampCameraIsoToRange();
  state.expo.limitWarning=null;
  if(state.expo.values.iso!==oldIso) applyLinkedCompensation(before,'iso');
  save(); renderGlobalCameraControls(); renderModules();
}
function changeApertureBound(which,newVal){
  const before=expoTotal();
  if(which==='min'){
    state.cameraLimits.apertureMin=String(newVal);
    if(Number(state.cameraLimits.apertureMin)>Number(state.cameraLimits.apertureMax)) state.cameraLimits.apertureMax=state.cameraLimits.apertureMin;
  }else{
    state.cameraLimits.apertureMax=String(newVal);
    if(Number(state.cameraLimits.apertureMax)<Number(state.cameraLimits.apertureMin)) state.cameraLimits.apertureMin=state.cameraLimits.apertureMax;
  }
  const vals=apertureRangeValues();
  if(vals.length && !vals.includes(String(state.aperture))){
    const cur=Number(state.aperture);
    state.aperture=Number(vals.reduce((a,b)=>Math.abs(Number(b)-cur)<Math.abs(Number(a)-cur)?b:a,vals[0]));
  }
  const oldExpo=String(state.expo.values.aperture);
  clampApertureToRange(false);
  state.expo.limitWarning=null;
  if(String(state.expo.values.aperture)!==oldExpo) applyLinkedCompensation(before,'aperture');
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
function idealIsoFromLux(lux,aperture,shutterFraction){
  if(!lux||lux<=0)return null;
  const [a,b]=String(shutterFraction||'1/50').split('/').map(Number),t=a/b,N=Number(aperture);
  if(!t||!N)return null;
  return (250*N*N)/(lux*t);
}
function nearestIsoValue(target,minIso,maxIso){
  const allowed=isos.map(Number).filter(v=>v>=minIso&&v<=maxIso);
  if(!allowed.length)return Math.max(minIso,Math.min(maxIso,Math.round(target||minIso)));
  let best=allowed[0],diff=Math.abs(best-target);
  for(const v of allowed){const d=Math.abs(v-target);if(d<diff){diff=d;best=v;}}
  return best;
}
function nearestNdForStops(stops){
  const target=Math.max(0,Number(stops)||0);
  const values=nds.map(Number);
  let best=values[0],diff=Math.abs(best/0.3-target);
  for(const v of values){const d=Math.abs(v/0.3-target);if(d<diff){diff=d;best=v;}}
  return best;
}
function lightExposureAdvice(lux){
  const shutter=state.cameraShutter||'1/50',aperture=state.aperture;
  const minIso=Number(state.cameraLimits.isoMin)||100,maxIso=Number(state.cameraLimits.isoMax)||51200;
  const ideal=idealIsoFromLux(lux,aperture,shutter);
  if(!ideal)return {text:'Réglage —',status:'normal'};
  if(ideal<minIso){
    const excessStops=Math.log2(minIso/ideal);
    const nd=nearestNdForStops(excessStops);
    return {text:`ISO ${minIso.toLocaleString('fr-FR')} (min) · ND ${nd.toFixed(1)} · f/${aperture} · ${shutter}`,status:'bright'};
  }
  if(ideal>maxIso){
    const missingStops=Math.log2(ideal/maxIso);
    return {text:`ISO ${maxIso.toLocaleString('fr-FR')} (max) · manque ${missingStops.toFixed(1).replace('.',',')} stop · f/${aperture} · ${shutter}`,status:'dark'};
  }
  const iso=nearestIsoValue(ideal,minIso,maxIso);
  return {text:`ISO ${iso.toLocaleString('fr-FR')} · f/${aperture} · ${shutter}`,status:'normal'};
}
function updateLight(){
  const a=document.getElementById('lux1'),b=document.getElementById('lux3'),i1=document.getElementById('iso1'),i3=document.getElementById('iso3'),note=document.getElementById('lightSourceNote'); if(!a||!b||!i1||!i3)return;
  const fixture=currentLight();
  if(!fixture){a.textContent='—';b.textContent='—';i1.textContent='Réglage —';i3.textContent='Réglage —';if(note)note.textContent=`${lightDatabaseSource==='remote'?'BOS-PROJECTEURS-DB · en ligne':(lightDatabaseSource==='fallback'?'BOS-PROJECTEURS-DB · secours local':'Base projecteurs indisponible')} · aucune photométrie Nu / 5600 K disponible.`;return;}
  const at1=luxAtDistance(fixture,1),at3=luxAtDistance(fixture,3),renderLux=r=>r?`${r.exact?'':'≈ '}${Math.round(r.lux).toLocaleString('fr-FR')} lx`:'—';
  a.textContent=renderLux(at1);b.textContent=renderLux(at3);
  const advice1=at1?lightExposureAdvice(at1.lux):null,advice3=at3?lightExposureAdvice(at3.lux):null;
  i1.textContent=advice1?advice1.text:'Réglage —';
  i3.textContent=advice3?advice3.text:'Réglage —';
  i1.dataset.status=advice1?.status||'normal';
  i3.dataset.status=advice3?.status||'normal';
  const calculated=[at1,at3].some(r=>r&&!r.exact),bare=fixture?.calculator?.accessories?.bare,quality=bare?.quality==='measured'?'mesure constructeur':(bare?.quality==='single'?'mesure de référence':(bare?.quality||'donnée DB'));
  if(note){const src=lightDatabaseSource==='remote'?'en ligne':(lightDatabaseSource==='fallback'?'secours local':'indisponible');note.textContent=`BOS-PROJECTEURS-DB ${lightDatabase?.databaseVersion||''} · ${src} · ${quality}${calculated?' · ≈ = calcul de distance depuis une mesure DB':''}`;}
}
function renderCustomize(){ const root=document.getElementById('customizeList'); if(!root)return; root.innerHTML=state.layout.map((id,i)=>`<div class="custom-item"><input type="checkbox" data-vis="${id}" ${state.visible[id]?'checked':''}><span class="custom-name">${moduleMeta[id][0]}</span><button type="button" class="movebtn" data-up="${id}" ${i===0?'disabled':''}>↑</button><button type="button" class="movebtn" data-down="${id}" ${i===state.layout.length-1?'disabled':''}>↓</button></div>`).join(''); root.querySelectorAll('[data-vis]').forEach(x=>x.addEventListener('change',()=>{state.visible[x.dataset.vis]=x.checked;save();renderModules();})); root.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.up,-1))); root.querySelectorAll('[data-down]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.down,1))); }
function moveModule(id,dir){ const i=state.layout.indexOf(id),j=i+dir;if(j<0||j>=state.layout.length)return;[state.layout[i],state.layout[j]]=[state.layout[j],state.layout[i]];save();renderCustomize();renderModules(); }

document.addEventListener('DOMContentLoaded',init);
