const APP_VERSION = 'V57';
const APP_BUILD = 57;
const STORAGE_KEY = 'bos-cockpit-v57';
const LEGACY_STORAGE_KEYS = ['bos-cockpit-v45','bos-cockpit-v44','bos-cockpit-v43','bos-cockpit-v42','bos-cockpit-v41','bos-cockpit-v40','bos-cockpit-v39','bos-cockpit-v38','bos-cockpit-v37','bos-cockpit-v36','bos-cockpit-v35','bos-cockpit-v34','bos-cockpit-v33','bos-cockpit-v32','bos-cockpit-v31','bos-cockpit-v30','bos-cockpit-v29','bos-cockpit-v27','bos-cockpit-v26','bos-cockpit-v25','bos-cockpit-v24','bos-cockpit-v23','bos-cockpit-v22','bos-cockpit-v21','bos-cockpit-v20','bos-cockpit-v19','bos-cockpit-v18','bos-cockpit-v17','bos-cockpit-v16','bos-cockpit-v15','bos-cockpit-v14','bos-cockpit-v13','bos-cockpit-v12','bos-cockpit-v11','bos-cockpit-v10'];
const CAMERA_DB_URL = 'https://raw.githubusercontent.com/BrunoOnSet/BOS-CAMERA-DB/main/cameras.json';
const CAMERA_DB_FALLBACK_URL = 'data/cameras.json';
const LIGHT_DB_URL = 'https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json';
const LIGHT_DB_FALLBACK_URL = 'data/lights.json';
const LAST_CAMERA_BY_BRAND_KEY = 'bos-onset-last-camera-by-brand';
const FOCAL_PRESETS = [18,24,28,35,50,85,105,135];
const RATIOS = [
  {label:'2.39:1',value:2.39},{label:'2.00:1',value:2.0},
  {label:'1.85:1',value:1.85},{label:'16:9',value:16/9},
  {label:'4:3',value:4/3},{label:'1:1',value:1},
  {label:'4:5',value:4/5},{label:'9:16',value:9/16}
];
const FRAME_SUBJECT_HEIGHT_M = 1.80;
const FRAME_FIGURE = {viewWidth:310,viewHeight:1300,headTopY:2.08,eyeY:79.56,chestY:297.96,waistY:461.24,kneeY:875.68,footY:1289.6};
FRAME_FIGURE.headTopRatio=FRAME_FIGURE.headTopY/FRAME_FIGURE.viewHeight;
FRAME_FIGURE.eyeRatio=FRAME_FIGURE.eyeY/FRAME_FIGURE.viewHeight;
FRAME_FIGURE.footRatio=FRAME_FIGURE.footY/FRAME_FIGURE.viewHeight;
FRAME_FIGURE.bodyRatio=FRAME_FIGURE.footRatio-FRAME_FIGURE.headTopRatio;
const PLAN_LIBRARY_KEY = 'bos-plan-feu-library-v06';
const PLAN_CURRENT_KEY = 'bos-plan-feu-v06-current';
const ONSET_PLAN_IMPORT_KEY = 'bos-onset-plan-imports-v01';

const apertures = ['1.0','1.2','1.4','1.8','2.0','2.8','4','5.6','8','11','16','22'];
const isos = ['100','125','160','200','250','320','400','500','640','800','1000','1250','1600','2000','2500','3200','4000','5000','6400','8000','10000','12800','16000','20000','25600','32000','40000','51200'];
const shutters = ['1/24','1/25','1/30','1/40','1/48','1/50','1/60','1/80','1/100','1/120','1/125','1/160','1/200','1/250','1/320','1/400','1/500','1/640','1/800'];
const nds = ['0','0.3','0.6','0.9','1.2','1.5','1.8','2.1','2.4','2.7','3.0','3.3','3.6'];

const defaultState = {
  theme: 'light',
  cameraId: 'fx6',
  focal: 35,
  cameraGamma: 'slog3',
  aperture: 2.8,
  ratio: 16/9,
  frameCameraHeightM: 1.55,
  cameraShutter: '1/50',
  cameraIso: '800',
  distanceCm: 250,
  cameraOpen: false,
  layout: ['frame', 'dof', 'expo', 'light', 'plan', 'media'],
  visible: { frame: true, dof: true, light: true, media: true, plan: true, expo: true },
  open: { frame: false, dof: false, expo: false, light: false, plan: false, media: false },
  media: { bitrate: 250, unit: 'Mb/s', card: 256 },
  light: { fixture: 'cob200xs' },
  plan: { selectedId: null },
  cameraLimits: { isoMin: '800', isoMax: '51200', apertureMin: '1.0', apertureMax: '22' },
  expo: {
    values: { aperture: '2.8', iso: '800', shutter: '1/50', nd: '0' },
    locks: { aperture: false, iso: false, shutter: false, nd: false },
    limitWarning: null,
    read: 41
  }
};

const moduleMeta = {
  frame: ['FRAME', "Director's Viewfinder"],
  dof: ['DOF', 'Profondeur de champ'],
  light: ['LIGHT', 'Projecteurs et Lux'],
  media: ['MEDIA', 'Temps d’enregistrement'],
  plan: ['PLAN', 'Plans de feu'],
  expo: ['EXPO', "Dynamique de l'image"]
};
const APP_LINKS = { frame: '#', dof: '#', light: '#', media: '#', plan: '#', expo: '#' };

let cameras = [];
let cameraDatabaseSource = 'none';
let lightDatabase = null;
let lightFixtures = [];
let lightDatabaseSource = 'none';
let lightPickerBrand = '';
let lightPickerFamily = '';
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
  state.focal = Math.max(9, Math.min(200, Math.round(Number(state.focal) || 35)));
  if(!state.cameraGamma) state.cameraGamma = 'slog3';
  state.aperture = Number(state.aperture) || 2.8;
  state.ratio = Number(state.ratio) || 16/9;
  state.frameCameraHeightM = Math.max(0.50, Math.min(2.50, Number(state.frameCameraHeightM) || 1.55));
  if(!state.cameraShutter) state.cameraShutter = '1/50';
  if(!state.cameraIso) state.cameraIso = '800';
  if(typeof state.cameraOpen !== 'boolean') state.cameraOpen = false;
  state.distanceCm = Math.max(30, Number(state.distanceCm) || 250);
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
  state.expo.read = Math.max(0, Math.min(100, Number(state.expo.read ?? 41) || 0));
  if(!state.plan || typeof state.plan !== 'object') state.plan = clone(defaultState.plan);
  if(state.plan.selectedId === undefined) state.plan.selectedId = null;
  const validModules = defaultState.layout;
  if(!Array.isArray(state.layout)) state.layout = clone(validModules);
  state.layout = state.layout.filter(id => validModules.includes(id));
  for(const id of validModules) if(!state.layout.includes(id)) state.layout.push(id);
  if(!state.visible || typeof state.visible !== 'object') state.visible = clone(defaultState.visible);
  if(!state.open || typeof state.open !== 'object') state.open = clone(defaultState.open);
  for(const id of validModules){
    if(state.visible[id] === undefined) state.visible[id] = defaultState.visible[id];
    if(state.open[id] === undefined) state.open[id] = defaultState.open[id];
  }
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

function lightPickerBrandKey(f){
  return String(f?.calculator?.brandKey || f?.brand || 'autres').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');
}
function lightPickerBrandLabel(key){
  return lightDatabase?.calculatorUi?.brandLabels?.[key] || lightFixtures.find(x=>lightPickerBrandKey(x)===key)?.brand || key;
}
function lightPickerFamilyKey(f){
  return String(f?.calculator?.group || f?.family || 'autres').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');
}
function lightPickerFamilyLabel(key){
  return lightDatabase?.calculatorUi?.groups?.[key]?.label || lightFixtures.find(x=>lightPickerFamilyKey(x)===key)?.calculator?.groupLabel || key;
}
function lightPickerModelLabel(f){
  return f?.calculator?.powerLabel || String(f?.name || f?.id || '').replace(new RegExp('^'+String(f?.brand||'')+'\\s*','i'),'');
}
function lightPickerBrandKeys(){
  const available=new Set(lightFixtures.map(lightPickerBrandKey));
  const ordered=(lightDatabase?.calculatorUi?.brandOrder || []).filter(k=>available.has(k));
  for(const f of lightFixtures){const k=lightPickerBrandKey(f); if(!ordered.includes(k)) ordered.push(k);}
  return ordered;
}
function lightPickerFamilies(brandKey){
  const available=new Set(lightFixtures.filter(f=>lightPickerBrandKey(f)===brandKey).map(lightPickerFamilyKey));
  const cfg=lightDatabase?.calculatorUi?.groups || {};
  const ordered=Object.entries(cfg)
    .filter(([k,v])=>v?.brandKey===brandKey && available.has(k))
    .sort((a,b)=>(Number(a[1]?.order)||0)-(Number(b[1]?.order)||0))
    .map(([k])=>k);
  for(const f of lightFixtures){if(lightPickerBrandKey(f)!==brandKey)continue; const k=lightPickerFamilyKey(f); if(!ordered.includes(k)) ordered.push(k);}
  return ordered;
}
function lightPickerModels(brandKey,familyKey){
  return lightFixtures.filter(f=>lightPickerBrandKey(f)===brandKey && lightPickerFamilyKey(f)===familyKey);
}
function renderProjectorPicker(){
  const brands=lightPickerBrandKeys();
  if(!brands.includes(lightPickerBrand)) lightPickerBrand=brands[0]||'';
  const families=lightPickerFamilies(lightPickerBrand);
  if(!families.includes(lightPickerFamily)) lightPickerFamily=families[0]||'';
  const currentId=currentLight()?.id || '';
  const brandHost=document.getElementById('pickerBrandChoices');
  const familyHost=document.getElementById('pickerFamilyChoices');
  const modelHost=document.getElementById('pickerModelChoices');
  const count=document.getElementById('pickerCatalogCount');
  if(brandHost) brandHost.innerHTML=brands.map(k=>`<button class="choice-btn ${k===lightPickerBrand?'active':''}" data-picker-brand="${esc(k)}" type="button">${esc(lightPickerBrandLabel(k))}</button>`).join('');
  if(familyHost) familyHost.innerHTML=families.map(k=>`<button class="choice-btn ${k===lightPickerFamily?'active':''}" data-picker-family="${esc(k)}" type="button">${esc(lightPickerFamilyLabel(k))}</button>`).join('');
  const models=lightPickerModels(lightPickerBrand,lightPickerFamily);
  if(modelHost) modelHost.innerHTML=models.map(f=>`<button class="choice-btn ${f.id===currentId?'active':''}" data-picker-fixture="${esc(f.id)}" type="button">${esc(lightPickerModelLabel(f))}</button>`).join('');
  if(count) count.textContent=`${lightFixtures.length} modèles utilisables dans LIGHT · ${lightDatabase?.fixtures?.length || lightFixtures.length} projecteurs dans BOS-PROJECTEURS-DB`;
}
function openProjectorPicker(){
  const current=currentLight();
  lightPickerBrand=current?lightPickerBrandKey(current):(lightPickerBrandKeys()[0]||'');
  lightPickerFamily=current?lightPickerFamilyKey(current):(lightPickerFamilies(lightPickerBrand)[0]||'');
  renderProjectorPicker();
  const dlg=document.getElementById('projectorDialog');
  if(typeof dlg?.showModal==='function') dlg.showModal(); else dlg?.setAttribute('open','');
}
function closeProjectorPicker(){
  const dlg=document.getElementById('projectorDialog');
  if(dlg?.open && typeof dlg.close==='function') dlg.close(); else dlg?.removeAttribute('open');
}
function selectProjectorFromPicker(id){
  if(!lightFixtures.some(f=>f.id===id)) return;
  state.light.fixture=id; save(); closeProjectorPicker(); renderModules();
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


function readImportedPlans(){
  try{
    const raw=JSON.parse(localStorage.getItem(ONSET_PLAN_IMPORT_KEY)||'[]');
    return Array.isArray(raw)?raw:[];
  }catch(_){ return []; }
}
function writeImportedPlans(plans){
  try{ localStorage.setItem(ONSET_PLAN_IMPORT_KEY,JSON.stringify(plans)); }catch(e){ console.warn('BOS PLAN imports',e); }
}
function readPlanRecords(){
  const out=[];
  try{
    const lib=JSON.parse(localStorage.getItem(PLAN_LIBRARY_KEY)||'null');
    if(lib&&Array.isArray(lib.plans)){
      lib.plans.forEach((rec,i)=>{
        if(rec?.state&&Array.isArray(rec.state.objects)) out.push({
          key:`plan:${rec.id||i}`,id:rec.id||`plan_${i}`,name:rec.name||rec.state.planName||`Plan ${i+1}`,
          folderId:rec.folderId||'',updatedAt:Number(rec.updatedAt)||0,state:rec.state,source:'PLAN'
        });
      });
    }
  }catch(e){ console.warn('Bibliothèque PLAN illisible',e); }
  if(!out.length){
    try{
      const cur=JSON.parse(localStorage.getItem(PLAN_CURRENT_KEY)||'null');
      if(cur&&Array.isArray(cur.objects)) out.push({key:`current:${cur.planId||'current'}`,id:cur.planId||'current',name:cur.planName||'Plan actuel',folderId:cur.folderId||'',updatedAt:0,state:cur,source:'PLAN · actuel'});
    }catch(_){ }
  }
  readImportedPlans().forEach((rec,i)=>{
    if(rec?.state&&Array.isArray(rec.state.objects)) out.push({
      key:`import:${rec.id||i}`,id:rec.id||`import_${i}`,name:rec.name||rec.state.planName||`Plan importé ${i+1}`,
      folderId:rec.folderId||'',updatedAt:Number(rec.updatedAt)||0,state:rec.state,source:'Import'
    });
  });
  const seen=new Set();
  return out.filter(rec=>{const sig=`${rec.source}:${rec.id}`;if(seen.has(sig))return false;seen.add(sig);return true;})
    .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)||String(a.name).localeCompare(String(b.name),'fr'));
}
function selectedPlanRecord(records=readPlanRecords()){
  if(!records.length) return null;
  let rec=records.find(r=>r.key===state.plan.selectedId);
  if(!rec){ rec=records[0]; state.plan.selectedId=rec.key; save(); }
  return rec;
}
function planModuleSubtitle(){
  const rec=selectedPlanRecord();
  return rec?rec.name:'Plans de feu';
}
function n(v,fallback=0){ const x=Number(v); return Number.isFinite(x)?x:fallback; }
function planPreviewSvg(rec){
  const ps=rec?.state||{}, objects=Array.isArray(ps.objects)?ps.objects:[];
  const w=Math.max(400,Math.round(Math.max(4,Math.min(30,n(ps.planLength,10)))*100)), h=Math.round(w*.62);
  const parts=[`<svg class="plan-mini-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Aperçu du plan ${esc(rec?.name||'')}">`,
    `<defs><pattern id="planGrid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" class="plan-grid-small" fill="none"/></pattern><pattern id="planGridBig" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#planGrid)"/><path d="M 100 0 L 0 0 0 100" class="plan-grid-big" fill="none"/></pattern></defs>`,
    `<rect width="${w}" height="${h}" class="plan-stage-bg"/><rect width="${w}" height="${h}" fill="url(#planGridBig)"/>`];
  const beams=ps.beamsVisible!==false;
  for(const o of objects){
    const x=n(o.x,w/2),y=n(o.y,h/2),rot=n(o.rot,0);
    if(o.kind==='camera'){
      const focal=Math.max(12,n(o.focal,50)),angle=Math.max(12,Math.min(95,2*Math.atan(36/(2*focal))*180/Math.PI)),len=Math.min(h*.65,300),half=Math.tan(angle*Math.PI/360)*len;
      parts.push(`<polygon points="0,0 ${len},${-half} ${len},${half}" class="plan-camera-fov" transform="translate(${x} ${y}) rotate(${rot})"/>`);
    }
    if(o.kind==='light'&&beams&&o.beamVisible!==false){
      const angle=Math.max(8,Math.min(120,n(o.beam,55))),len=Math.min(h*.62,290),half=Math.tan(angle*Math.PI/360)*len;
      parts.push(`<polygon points="0,0 ${len},${-half} ${len},${half}" class="plan-light-beam" transform="translate(${x} ${y}) rotate(${rot})"/>`);
    }
  }
  for(const o of objects){
    const x=n(o.x,w/2),y=n(o.y,h/2),rot=n(o.rot,0),name=esc(o.name||o.short||'');
    if(o.kind==='subject'){
      parts.push(`<g transform="translate(${x} ${y}) rotate(${rot})" class="plan-object plan-subject"><circle r="14"/><path d="M-18,8 Q0,-2 18,8 L15,29 L-15,29 Z"/></g>`);
    }else if(o.kind==='camera'){
      parts.push(`<g transform="translate(${x} ${y}) rotate(${rot})" class="plan-object plan-camera"><rect x="-16" y="-11" width="27" height="22" rx="5"/><polygon points="11,-7 25,0 11,7"/></g>`);
    }else if(o.kind==='light'){
      parts.push(`<g transform="translate(${x} ${y}) rotate(${rot})" class="plan-object plan-light"><circle r="13"/><line x1="13" y1="0" x2="24" y2="0"/></g>`);
    }else if(o.kind==='decor'){
      const ww=Math.max(10,n(o.width,1)*100),hh=Math.max(8,n(o.height,.15)*100);
      const cls=o.type==='wall'?'plan-wall':(o.type==='window'?'plan-window':(o.type==='door'?'plan-door':'plan-decor'));
      parts.push(`<rect x="${-ww/2}" y="${-hh/2}" width="${ww}" height="${hh}" rx="${o.type==='table'?8:2}" class="plan-object ${cls}" transform="translate(${x} ${y}) rotate(${rot})"/>`);
    }else if(o.kind==='accessory'){
      const ww=Math.max(12,n(o.width,1)*70),hh=Math.max(8,n(o.height,1)*30);
      parts.push(`<rect x="${-ww/2}" y="${-hh/2}" width="${ww}" height="${hh}" rx="3" class="plan-object plan-accessory" transform="translate(${x} ${y}) rotate(${rot})"/>`);
    }
    if(name && o.kind!=='decor') parts.push(`<text x="${x}" y="${y+43}" class="plan-mini-label" text-anchor="middle">${name}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}
function planStats(rec){
  const objs=Array.isArray(rec?.state?.objects)?rec.state.objects:[];
  const count=k=>objs.filter(o=>o.kind===k).length;
  const bits=[];
  if(count('camera')) bits.push(`${count('camera')} caméra${count('camera')>1?'s':''}`);
  if(count('subject')) bits.push(`${count('subject')} sujet${count('subject')>1?'s':''}`);
  if(count('light')) bits.push(`${count('light')} projecteur${count('light')>1?'s':''}`);
  return bits.join(' · ')||`${objs.length} élément${objs.length>1?'s':''}`;
}
function renderPlanBody(){
  const records=readPlanRecords(),rec=selectedPlanRecord(records);
  if(!rec) return `<div class="plan-empty"><strong>Aucun plan disponible</strong><span>Sauvegarde un plan dans PLAN, puis reviens ici et touche ACTUALISER.</span></div>
    <div class="plan-actions"><button type="button" class="secondary plan-action-btn" id="planRefreshBtn">ACTUALISER</button><button type="button" class="secondary plan-action-btn" id="planImportBtn">IMPORTER</button><input id="planImportInput" type="file" accept=".json,.bosplan.json,application/json" multiple hidden></div>
    <div class="demo">Lecture automatique de la bibliothèque PLAN quand les deux apps partagent le même stockage. IMPORTER reste disponible comme solution de secours.</div>`;
  const idx=records.findIndex(r=>r.key===rec.key);
  return `<div class="plan-nav-row"><button type="button" class="plan-nav-btn" id="planPrevBtn" aria-label="Plan précédent">‹</button>
    <label class="plan-select-label"><span>Plan</span><select id="planSelect">${records.map(r=>`<option value="${esc(r.key)}" ${r.key===rec.key?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>
    <button type="button" class="plan-nav-btn" id="planNextBtn" aria-label="Plan suivant">›</button></div>
    <div class="plan-meta"><span>${idx+1} / ${records.length}</span><span>${esc(rec.source)}</span></div>
    <div class="plan-preview-wrap">${planPreviewSvg(rec)}</div>
    <div class="plan-caption"><strong>${esc(rec.name)}</strong><span>${esc(planStats(rec))}</span></div>
    <div class="plan-actions"><button type="button" class="secondary plan-action-btn" id="planRefreshBtn">ACTUALISER</button><button type="button" class="secondary plan-action-btn" id="planImportBtn">IMPORTER</button><input id="planImportInput" type="file" accept=".json,.bosplan.json,application/json" multiple hidden></div>
    <div class="demo">Tu peux passer d’un plan à l’autre directement ici. Les plans enregistrés dans PLAN sont relus à chaque actualisation.</div>`;
}
function stepPlan(delta){
  const records=readPlanRecords(); if(!records.length)return;
  const rec=selectedPlanRecord(records),idx=Math.max(0,records.findIndex(r=>r.key===rec?.key)),next=(idx+delta+records.length)%records.length;
  state.plan.selectedId=records[next].key; save(); renderModules();
}
async function importPlanFiles(files){
  const imported=readImportedPlans(); let lastId=null;
  for(const file of Array.from(files||[])){
    try{
      const raw=JSON.parse(await file.text()),ps=raw?.format==='BOS_PLAN_FEU'?raw.plan:raw;
      if(!ps||!Array.isArray(ps.objects)) throw new Error('Format invalide');
      const id=`imp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const name=ps.planName||String(file.name||'Plan importé').replace(/\.bosplan\.json$|\.json$/i,'');
      imported.push({id,name,folderId:ps.folderId||'',updatedAt:Date.now(),state:ps}); lastId=id;
    }catch(e){ console.warn('Import PLAN impossible',file?.name,e); }
  }
  writeImportedPlans(imported);
  if(lastId) state.plan.selectedId=`import:${lastId}`;
  save(); renderModules();
}
function bindPlanModule(){
  const select=document.getElementById('planSelect'); if(select)select.addEventListener('change',e=>{state.plan.selectedId=e.target.value;save();renderModules();});
  const prev=document.getElementById('planPrevBtn'); if(prev)prev.addEventListener('click',()=>stepPlan(-1));
  const next=document.getElementById('planNextBtn'); if(next)next.addEventListener('click',()=>stepPlan(1));
  const refresh=document.getElementById('planRefreshBtn'); if(refresh)refresh.addEventListener('click',()=>renderModules());
  const input=document.getElementById('planImportInput'),importBtn=document.getElementById('planImportBtn');
  if(importBtn&&input)importBtn.addEventListener('click',()=>input.click());
  if(input)input.addEventListener('change',async()=>{const files=input.files;input.value='';await importPlanFiles(files);});
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


let bosUpdateReloading = false;
let bosUpdateCheckTimer = null;
let bosLastUpdateCheck = (()=>{try{return Number(localStorage.getItem('bos-last-update-check')||0)||0;}catch{return 0;}})();
let bosPendingUpdateVersion = null;

function bosVersionedUrl(version){
  const url = new URL(window.location.href);
  url.searchParams.set('_bosv', String(version || APP_VERSION).replace(/^V/i,''));
  return url.toString();
}

function bosBuildNumber(value){
  if(Number.isFinite(Number(value))) return Number(value);
  const m=String(value||'').match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

async function forceBosReload(version){
  if(bosUpdateReloading) return;
  bosUpdateReloading = true;
  try{
    sessionStorage.setItem('bos-update-target', String(version||''));
  }catch{}
  window.location.replace(bosVersionedUrl(version));
}

async function checkForBosUpdate(force=false){
  const now=Date.now();
  if(!force && now-bosLastUpdateCheck < 60 * 60 * 1000) return;
  bosLastUpdateCheck=now;
  try{localStorage.setItem('bos-last-update-check',String(now));}catch{}
  try{
    const r = await fetch(`version.json?_=${now}`, {cache:'no-store'});
    if(!r.ok) return;
    const latest = await r.json();
    const latestBuild = bosBuildNumber(latest?.build || latest?.version);
    if(!latestBuild || latestBuild <= APP_BUILD){
      try{ sessionStorage.removeItem('bos-update-target'); }catch{}
      return;
    }

    // Anti-boucle : si cette même cible vient déjà de provoquer un reload dans cet onglet,
    // on ne recharge pas encore et encore si le déploiement réseau n'est pas totalement propagé.
    try{
      if(sessionStorage.getItem('bos-update-target') === String(latest.version||latestBuild)) return;
    }catch{}

    bosPendingUpdateVersion = latest.version || `V${latestBuild}`;
    const reg = await navigator.serviceWorker?.getRegistration?.();
    try{ await reg?.update?.(); }catch{}
    if(reg?.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});

    // Le controllerchange déclenche normalement le reload. Ce fallback ne s'exécute
    // qu'une seule fois si Android tarde à basculer le nouveau service worker.
    window.setTimeout(()=>{
      if(!bosUpdateReloading && bosPendingUpdateVersion) forceBosReload(bosPendingUpdateVersion);
    }, 2500);
  }catch{}
}

async function setupAppUpdateSystem(){
  if(!('serviceWorker' in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register('sw.js?v=46', {updateViaCache:'none'});

    if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});

    reg.addEventListener('updatefound', ()=>{
      const worker = reg.installing;
      if(!worker) return;
      worker.addEventListener('statechange', ()=>{
        if(worker.state === 'installed' && navigator.serviceWorker.controller && bosPendingUpdateVersion){
          worker.postMessage({type:'SKIP_WAITING'});
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if(!bosPendingUpdateVersion || bosUpdateReloading) return;
      forceBosReload(bosPendingUpdateVersion);
    });

    // Vérification au démarrage puis au maximum une fois par heure, même après retour dans l’app.
    await checkForBosUpdate(false);
    window.addEventListener('focus', ()=>checkForBosUpdate(false), {passive:true});
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) checkForBosUpdate(false); });
    bosUpdateCheckTimer = window.setInterval(()=>checkForBosUpdate(false), 60 * 60 * 1000);
  }catch(err){
    console.warn('Mise à jour BOS indisponible.', err);
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
  ensureCameraGammaValid();
  if(Number(state.cameraLimits.isoMin) > Number(state.cameraLimits.isoMax)) state.cameraLimits.isoMax=state.cameraLimits.isoMin;
  if(Number(state.cameraLimits.apertureMin) > Number(state.cameraLimits.apertureMax)) state.cameraLimits.apertureMax=state.cameraLimits.apertureMin;
  const baseApertureVals=apertureRangeValues();
  if(baseApertureVals.length && !baseApertureVals.includes(String(state.aperture))) state.aperture=Number(baseApertureVals[0]);
  clampApertureToRange(false);
  clampIsoToRange();
  clampCameraIsoToRange();
  setupTheme(); renderCameraSelect(); renderTopFocal(); renderGlobalCameraControls(); renderModules(); bindGlobal(); renderCustomize();
  setupAppUpdateSystem();
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
  ensureCameraGammaValid();
  save(); renderCameraSelect(); renderGlobalCameraControls(); renderModules();
}
function renderTopFocal(){
  const slider=document.getElementById('focalSlider'),readout=document.getElementById('focalReadout');
  if(slider) slider.value=String(Math.max(9,Math.min(200,Math.round(Number(state.focal)||35))));
  if(readout) readout.textContent=`${Math.round(Number(state.focal)||35)} mm`;
}
function apertureRangeValues(){
  const lo=Number(state.cameraLimits?.apertureMin ?? 1.0),hi=Number(state.cameraLimits?.apertureMax ?? 22);
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
function gammaProfilesForCamera(cam=currentCamera()){
  const profs=cam?.expo?.profiles || cam?.exposure?.profiles;
  if(profs && typeof profs==='object' && Object.keys(profs).length) return profs;
  const sonyFallback={
    fx30:{slog3:{label:'S-Log3 / Flexible ISO',baseValues:[800,2500],defaultValue:800},scinetone:{label:'S-Cinetone',baseValues:[125,400],defaultValue:125}},
    fx3:{slog3:{label:'S-Log3 / Flexible ISO',baseValues:[800,12800],defaultValue:800},scinetone:{label:'S-Cinetone',baseValues:[100,2000],defaultValue:100}},
    fx5:{slog3:{label:'S-Log3 / Flexible ISO',baseValues:[800,4000,12800],defaultValue:800},scinetone:{label:'S-Cinetone',baseValues:[320,1600,5000],defaultValue:320}},
    fx6:{slog3:{label:'S-Log3 / Flexible ISO',baseValues:[800,12800],defaultValue:800},scinetone:{label:'S-Cinetone',baseValues:[320,5000],defaultValue:320}}
  };
  if(cam?.id && sonyFallback[cam.id]) return sonyFallback[cam.id];
  const base=cam?.exposure?.baseValues || [];
  const mode=cam?.exposure?.mode || cam?.expo?.label || 'Profil constructeur';
  return { default:{label:mode, baseValues:base, defaultValue:cam?.exposure?.defaultValue || base[0] || null} };
}
function gammaProfileEntries(cam=currentCamera()){
  return Object.entries(gammaProfilesForCamera(cam));
}
function gammaProfileForCamera(cam=currentCamera()){
  const profiles=gammaProfilesForCamera(cam);
  return profiles[state.cameraGamma] || Object.values(profiles)[0] || null;
}
function ensureCameraGammaValid(){
  const entries=gammaProfileEntries(currentCamera());
  if(!entries.length){ state.cameraGamma='default'; return; }
  if(!entries.some(([k])=>k===state.cameraGamma)) state.cameraGamma=entries[0][0];
}
function gammaShortLabel(cam=currentCamera()){
  const p=gammaProfileForCamera(cam);
  return p?.label || 'Gamma';
}
function gammaInfoText(cam=currentCamera()){
  const p=gammaProfileForCamera(cam);
  if(!p) return 'Courbe gamma non renseignée pour cette caméra.';
  const values=(p.baseValues||[]).map(v=>Number(v).toLocaleString('fr-FR').replace(/ /g,' '));
  const unit=(cam?.exposure?.unit || cam?.expo?.unit || 'ISO');
  const title=unit==='EI' ? 'Base EI' : 'ISO natifs / Lo-Hi';
  const valueText=values.length ? values.join(' / ') : (p.defaultValue ? Number(p.defaultValue).toLocaleString('fr-FR').replace(/ /g,' ') : '—');
  return `${title} · ${cam?.name || 'Caméra'} · ${p.label || 'Gamma'} : ${valueText}`;
}
function renderGammaButtons(){
  const host=document.getElementById('gammaMode'); if(!host) return;
  const entries=gammaProfileEntries(currentCamera());
  host.innerHTML=entries.map(([key,p])=>`<button type="button" class="gamma-chip ${state.cameraGamma===key?'active':''}" data-gamma="${esc(key)}">${esc(p.label || key)}</button>`).join('');
  const info=document.getElementById('gammaInfo'); if(info) info.textContent=gammaInfoText(currentCamera());
}
function ratioLabel(v){
  const n=Number(v);
  return RATIOS.find(r=>Math.abs(r.value-n)<0.001)?.label || `${n.toFixed(2)}:1`;
}
function renderRatioDialog(){
  const root=document.getElementById('ratioList'); if(!root) return;
  root.innerHTML=RATIOS.map(r=>`<button type="button" class="ratio-choice ${Math.abs(state.ratio-r.value)<0.001?'active':''}" data-ratio="${r.value}">${r.label}</button>`).join('');
  root.querySelectorAll('[data-ratio]').forEach(btn=>btn.addEventListener('click',()=>{
    state.ratio=Number(btn.dataset.ratio); save(); renderGlobalCameraControls(); updateFrame(); renderRatioDialog();
    document.getElementById('ratioDialog')?.close();
  }));
}
function frameCropSensorDimensions(){
  const cam=currentCamera();
  const sensorLong=Number(cam?.sensorWidthMm)||36;
  const baseLandscapeRatio=16/9;
  const targetRatio=Math.max(.2,Number(state.ratio)||baseLandscapeRatio);

  // Modèle BOS : on part toujours du cadre natif 16:9 de la caméra.
  // - ratios paysage / carré : caméra horizontale, puis masque dans le 16:9 ;
  // - ratios portrait (< 1:1) : caméra tournée à 90°, donc base 9:16, puis masque éventuel.
  const portrait=targetRatio<1;
  let baseW,baseH;
  if(portrait){
    baseW=sensorLong/baseLandscapeRatio; // petite dimension du 16:9, devenue largeur
    baseH=sensorLong;                    // grande dimension, devenue hauteur
  }else{
    baseW=sensorLong;
    baseH=sensorLong/baseLandscapeRatio;
  }
  const baseRatio=baseW/baseH;
  let cropW=baseW,cropH=baseH;
  if(targetRatio<baseRatio){
    // format plus étroit : masque sur les côtés
    cropW=baseH*targetRatio;
  }else if(targetRatio>baseRatio){
    // format plus large : masque en haut / bas
    cropH=baseW/targetRatio;
  }
  return {baseW,baseH,cropW,cropH,targetRatio,portrait};
}
function frameHfovDeg(){
  const f=Math.max(1,Number(state.focal)||35);
  const {cropW}=frameCropSensorDimensions();
  return 2*Math.atan(cropW/(2*f))*180/Math.PI;
}
function frameVerticalFovDeg(){
  const f=Math.max(1,Number(state.focal)||35);
  const {cropH}=frameCropSensorDimensions();
  return 2*Math.atan(cropH/(2*f))*180/Math.PI;
}
function frameMetricsAtDistance(distanceM=state.distanceCm/100){
  const d=Math.max(.01,Number(distanceM)||.01);
  const hfov=frameHfovDeg(),vfov=frameVerticalFovDeg();
  const frameWidth=2*d*Math.tan((hfov*Math.PI/180)/2);
  const frameHeight=2*d*Math.tan((vfov*Math.PI/180)/2);
  return {hfov,vfov,frameWidth,frameHeight};
}
function previewTargetScales(){
  const refs=[
    {id:'extreme',label:'TRÈS GROS PLAN',cropY:145},
    {id:'close',label:'GROS PLAN',cropY:220},
    {id:'chest',label:'POITRINE',cropY:FRAME_FIGURE.chestY},
    {id:'waist',label:'TAILLE',cropY:FRAME_FIGURE.waistY},
    {id:'american',label:'AMÉRICAIN',cropY:(FRAME_FIGURE.waistY+FRAME_FIGURE.kneeY)/2},
    {id:'full',label:'PIED',cropY:FRAME_FIGURE.footY}
  ];
  const figureBody=FRAME_FIGURE.footY-FRAME_FIGURE.headTopY;
  return refs.map(r=>({...r,scale:(2/3)*figureBody/Math.max(1,r.cropY-FRAME_FIGURE.eyeY)}));
}
function closestPreviewPlan(scale){
  const refs=previewTargetScales().sort((a,b)=>b.scale-a.scale);
  if(scale>=refs[0].scale) return `PLAN ${refs[0].label}`;
  for(let i=0;i<refs.length-1;i++){
    const boundary=(refs[i].scale+refs[i+1].scale)/2;
    if(scale>=boundary) return `PLAN ${refs[i].label}`;
  }
  return `PLAN ${refs[refs.length-1].label}`;
}
function frameFigureMarkup(){
  return `<img class="bos-frame-person" src="assets/mannequin-preview.png" alt="Mannequin de cadrage FRAME" draggable="false">`;
}
function trimFrNumber(value,maxDigits=2){
  const n=Number(value);
  if(!Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:maxDigits});
}
function focalReadoutText(value=state.focal){ return `${trimFrNumber(value,2)} mm`; }
function apertureReadoutText(value=state.aperture){ return `f/${trimFrNumber(value,2)}`; }
function distanceReadoutText(valueM=(Number(state.distanceCm)||250)/100){ return `${Number(valueM).toFixed(2).replace('.',',')} m`; }
function heightReadoutText(value=state.frameCameraHeightM){ return `${Number(value||1.55).toFixed(2).replace('.',',')} m`; }
function nearestApertureIndex(value=state.aperture){
  const target=Number(value)||2.8;
  let best=0,diff=Infinity;
  apertures.forEach((v,i)=>{const d=Math.abs(Number(v)-target);if(d<diff){diff=d;best=i;}});
  return best;
}
function freeValueConfig(key){
  if(key==='focal') return {value:Number(state.focal)||35,min:9,max:200,step:'any',label:'Focale'};
  if(key==='aperture') return {value:Number(state.aperture)||2.8,min:1,max:22,step:'any',label:'Diaph'};
  if(key==='distance') return {value:(Number(state.distanceCm)||250)/100,min:.30,max:50,step:'any',label:'Distance'};
  if(key==='cameraHeight') return {value:Number(state.frameCameraHeightM)||1.55,min:.50,max:2.50,step:'any',label:'Hauteur caméra'};
  if(key==='waveform') return {value:Number(state.expo?.read)||0,min:0,max:100,step:'any',label:'Waveform'};
  return null;
}
function applyFreeValue(key,value){
  const n=Number(String(value).replace(',','.'));
  if(!Number.isFinite(n)) return;
  if(key==='focal') setLinkedFocal(n,true);
  else if(key==='aperture') setLinkedAperture(n,true);
  else if(key==='distance') setLinkedDistanceMeters(n,true);
  else if(key==='cameraHeight') setFrameCameraHeight(n,true);
  else if(key==='waveform') updateExpoWaveformUi(n,true);
}
function beginFreeValueEdit(readout){
  if(!readout || readout.querySelector('input')) return;
  const key=readout.dataset.freeControl,cfg=freeValueConfig(key); if(!cfg) return;
  const previous=readout.textContent;
  const input=document.createElement('input');
  input.type='number'; input.inputMode='decimal'; input.step=cfg.step; input.min=String(cfg.min); input.max=String(cfg.max);
  input.className='free-value-input'; input.value=String(cfg.value);
  input.setAttribute('aria-label',`${cfg.label} libre`);
  readout.textContent=''; readout.appendChild(input); input.focus(); input.select();
  let done=false;
  const finish=(commit)=>{
    if(done) return; done=true;
    const value=input.value;
    if(commit && value!=='') applyFreeValue(key,value);
    else readout.textContent=previous;
  };
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();finish(true);input.blur();}
    else if(e.key==='Escape'){e.preventDefault();finish(false);input.blur();}
  });
  input.addEventListener('blur',()=>finish(true),{once:true});
}
function bindFreeValueEditing(){
  document.addEventListener('click',e=>{
    if(e.target.closest('.free-value-input')) return;
    const readout=e.target.closest('[data-free-control]'); if(readout) beginFreeValueEdit(readout);
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter' && e.key!==' ') return;
    const readout=e.target.closest?.('[data-free-control]');
    if(readout && !readout.querySelector('input')){e.preventDefault();beginFreeValueEdit(readout);}
  });
}
function setFrameCameraHeight(value,free=false){
  let v=Math.max(.50,Math.min(2.50,Number(value)||1.55));
  v=free ? Math.round(v*100)/100 : Math.round(v/0.05)*0.05;
  state.frameCameraHeightM=v; save(); updateFrame();
}
function renderCameraSummary(){
  const el=document.getElementById('cameraSummary'); if(!el) return;
  const cam=currentCamera();
  el.textContent=`${cam?.name||'—'} · ${gammaShortLabel(cam)}`;
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
  renderCameraSummary(); renderGammaButtons(); renderRatioDialog(); syncGlobalLimitState();
}
function syncGlobalLimitState(){
  /* Les alertes de limite appartiennent uniquement au module EXPO. */
}
function setLinkedDistanceMeters(value,free=false){
  let v=Math.max(.30,Math.min(50,Number(value)||.30));
  v=free ? Math.round(v*100)/100 : Math.round(v*10)/10;
  state.distanceCm=v*100;
  syncDistanceRange('globalDistanceSlider','globalDistanceReadout');
  save(); renderCameraSummary(); updateLive();
}
function setLinkedFocal(value,free=false){
  let v=Math.max(9,Math.min(200,Number(value)||35));
  v=free ? Math.round(v*100)/100 : Math.round(v);
  state.focal=v;
  const cameraFocal=document.getElementById('focalSlider'),cameraReadout=document.getElementById('focalReadout');
  if(cameraFocal) cameraFocal.value=String(v);
  if(cameraReadout) cameraReadout.textContent=focalReadoutText(v);
  const dofFocal=document.getElementById('dofFocalSlider'),dofReadout=document.getElementById('dofFocalReadout');
  if(dofFocal) dofFocal.value=String(v);
  if(dofReadout) dofReadout.textContent=focalReadoutText(v);
  const frameFocal=document.getElementById('frameFocalSlider'),frameReadout=document.getElementById('frameFocalReadout');
  if(frameFocal) frameFocal.value=String(v);
  if(frameReadout) frameReadout.textContent=focalReadoutText(v);
  save(); renderCameraSummary(); updateLive();
}
function setLinkedAperture(value,free=false){
  let numeric=Math.max(1,Math.min(22,Number(value)||2.8));
  if(!free) numeric=Number(apertures[nearestApertureIndex(numeric)]);
  else numeric=Math.round(numeric*100)/100;
  state.aperture=numeric;
  const idx=nearestApertureIndex(numeric);
  const cameraAperture=document.getElementById('globalApertureSlider'),cameraReadout=document.getElementById('globalApertureReadout');
  if(cameraAperture) cameraAperture.value=String(idx);
  if(cameraReadout) cameraReadout.textContent=apertureReadoutText(numeric);
  save(); renderCameraSummary(); updateLive();
}
function syncDistanceRange(sliderId,readoutId){
  const slider=document.getElementById(sliderId),readout=document.getElementById(readoutId);
  const distanceM=Math.max(.30,(Number(state.distanceCm)||30)/100);
  if(slider){slider.min='0.30';slider.step='0.10';slider.max=String(Math.max(15,Math.ceil(distanceM+1)));slider.value=String(distanceM);}
  if(readout) readout.textContent=distanceReadoutText(distanceM);
}
function bindGlobal(){
  document.getElementById('cameraToggle').addEventListener('click',()=>{state.cameraOpen=!state.cameraOpen; save(); renderGlobalCameraControls();});
  document.getElementById('cameraBrandMode').addEventListener('click',e=>{const btn=e.target.closest('[data-camerabrand]'); if(!btn)return; const brand=btn.dataset.camerabrand,remembered=getLastCameraForBrand(brand),first=camerasForBrand(brand)[0]; if(remembered)applyCameraSelection(remembered); else if(first)applyCameraSelection(first.id);});
  document.getElementById('cameraSelect').addEventListener('change',e=>applyCameraSelection(e.target.value));
  const focalSlider=document.getElementById('focalSlider'); if(focalSlider) focalSlider.addEventListener('input',e=>setLinkedFocal(e.target.value));
  const aperture=document.getElementById('globalApertureSlider'); if(aperture) aperture.addEventListener('input',e=>{const idx=Math.max(0,Math.min(apertures.length-1,Math.round(Number(e.target.value)||0)));setLinkedAperture(apertures[idx]);});
  const distance=document.getElementById('globalDistanceSlider'); if(distance) distance.addEventListener('input',e=>setLinkedDistanceMeters(e.target.value));
  const gamma=document.getElementById('gammaMode'); if(gamma) gamma.addEventListener('click',e=>{const btn=e.target.closest('[data-gamma]'); if(!btn) return; state.cameraGamma=btn.dataset.gamma; save(); renderGlobalCameraControls(); renderModules();});
  const projectorDialog=document.getElementById('projectorDialog');
  const closeProjectorDialogBtn=document.getElementById('closeProjectorDialogBtn'); if(closeProjectorDialogBtn) closeProjectorDialogBtn.addEventListener('click',closeProjectorPicker);
  if(projectorDialog) projectorDialog.addEventListener('click',e=>{if(e.target===projectorDialog)closeProjectorPicker();});
  const pickerBrandChoices=document.getElementById('pickerBrandChoices'); if(pickerBrandChoices) pickerBrandChoices.addEventListener('click',e=>{const b=e.target.closest('[data-picker-brand]'); if(!b)return; lightPickerBrand=b.dataset.pickerBrand; lightPickerFamily=lightPickerFamilies(lightPickerBrand)[0]||''; renderProjectorPicker();});
  const pickerFamilyChoices=document.getElementById('pickerFamilyChoices'); if(pickerFamilyChoices) pickerFamilyChoices.addEventListener('click',e=>{const b=e.target.closest('[data-picker-family]'); if(!b)return; lightPickerFamily=b.dataset.pickerFamily; renderProjectorPicker();});
  const pickerModelChoices=document.getElementById('pickerModelChoices'); if(pickerModelChoices) pickerModelChoices.addEventListener('click',e=>{const b=e.target.closest('[data-picker-fixture]'); if(!b)return; selectProjectorFromPicker(b.dataset.pickerFixture);});
  document.getElementById('themeBtn').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark'; save(); setupTheme();});
  const projectDialog=document.getElementById('projectDialog');
  const projectContactBtn=document.getElementById('projectContactBtn');
  if(projectContactBtn && projectDialog) projectContactBtn.addEventListener('click',()=>projectDialog.showModal());
  if(projectDialog) projectDialog.addEventListener('click',e=>{if(e.target===projectDialog)projectDialog.close();});
  const dlg=document.getElementById('customizeDialog'); document.getElementById('customizeBtn').addEventListener('click',()=>{renderCustomize();dlg.showModal();});
  document.getElementById('resetLayout').addEventListener('click',()=>{state.layout=clone(defaultState.layout);state.visible=clone(defaultState.visible);state.open=clone(defaultState.open);state.cameraOpen=false;save();renderGlobalCameraControls();renderCustomize();renderModules();});
  bindFreeValueEditing();
}
function renderModules(){ const root=document.getElementById('modules'); root.innerHTML=state.layout.filter(id=>state.visible[id]).map(renderModule).join(''); bindModules(); updateLive(); syncGlobalLimitState(); }
function renderModule(id){ const [title,baseSub]=moduleMeta[id],sub=id==='plan'?planModuleSubtitle():baseSub; return `<article class="module ${state.open[id]?'open':''}" data-module="${id}"><button class="module-head" data-toggle="${id}"><span class="module-title"><i class="module-dot"></i><span><strong>${title}</strong><small>${esc(sub)}</small></span></span><span class="chev">⌄</span></button><div class="module-body">${renderBody(id)}</div></article>`; }

function renderBody(id){
  if(id==='plan') return renderPlanBody();
  if(id==='dof') return `<div class="resultbox dof-only"><div class="result-main" id="dofMain">—</div><div class="result-sub" id="dofSub">—</div></div><div class="bos-linked-controls"><div class="bos-linked-slider"><span>FOCALE</span><input id="dofFocalSlider" type="range" min="9" max="200" step="1" value="${Math.max(9,Math.min(200,Number(state.focal)||35))}"><strong id="dofFocalReadout" class="free-value-readout" data-free-control="focal" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${focalReadoutText(state.focal)}</strong></div><div class="bos-linked-slider"><span>DIAPH</span><input id="dofApertureSlider" type="range" min="0" max="${apertures.length-1}" step="1" value="${nearestApertureIndex(state.aperture)}"><strong id="dofApertureReadout" class="free-value-readout" data-free-control="aperture" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${apertureReadoutText(state.aperture)}</strong></div><div class="bos-linked-slider"><span>RECUL</span><input id="dofDistanceSlider" type="range" min="0.30" max="15" step="0.10" value="${Math.max(.3,state.distanceCm/100)}"><strong id="dofDistanceReadout" class="free-value-readout" data-free-control="distance" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${distanceReadoutText(state.distanceCm/100)}</strong></div></div>${appLink(id)}`;

  if(id==='media') return `<div class="grid2 media-grid"><label><span>Débit</span><div class="unit-input"><input id="mediaBitrate" type="number" inputmode="decimal" min="1" step="1" value="${state.media.bitrate}"><b id="mediaBitrateUnit">${state.media.unit}</b></div><div class="segmented compact"><button type="button" class="seg ${state.media.unit==='Mb/s'?'active':''}" data-mediaunit="Mb/s">Mb/s</button><button type="button" class="seg ${state.media.unit==='MB/s'?'active':''}" data-mediaunit="MB/s">MB/s</button></div></label><label><span>Carte</span><select id="mediaCard">${['64','128','256','512','1000','2000','4000'].map(v=>`<option value="${v}" ${String(state.media.card)===String(v)?'selected':''}>${v} Go</option>`).join('')}</select></label></div><div class="resultbox"><div class="result-main" id="mediaMain">—</div><div class="result-sub" id="mediaSub">temps d’enregistrement · réserve 0 %</div></div>${appLink(id)}`;

  if(id==='frame') return `<div class="bos-frame-card"><div class="bos-frame-card-head"><strong>PREVIEW</strong><span>SIMULATION · BOS</span></div><div class="bos-frame-stage" id="frameStage"><div class="bos-frame-window" id="frameWindow"><div class="bos-frame-corner tl"></div><div class="bos-frame-corner tr"></div><div class="bos-frame-corner bl"></div><div class="bos-frame-corner br"></div><div class="bos-frame-eye-line"><span>LIGNE DES YEUX · 1/3</span></div><div class="bos-frame-subject" id="frameSubject">${frameFigureMarkup()}<span class="bos-frame-person-badge">P1</span></div><div class="bos-frame-measure" id="frameMeasure"><strong>1,80 m</strong></div><div class="bos-frame-plan" id="framePlan"></div></div></div><div class="bos-frame-distance-slider bos-frame-focal-slider"><span>FOCALE</span><input id="frameFocalSlider" type="range" min="9" max="200" step="1" value="${Math.max(9,Math.min(200,Number(state.focal)||35))}"><strong id="frameFocalReadout" class="free-value-readout" data-free-control="focal" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${focalReadoutText(state.focal)}</strong></div><div class="bos-frame-distance-slider"><span>RECUL</span><input id="frameDistanceSlider" type="range" min="0.30" max="15" step="0.10" value="${Math.max(.3,state.distanceCm/100)}"><strong id="frameDistanceReadout" class="free-value-readout" data-free-control="distance" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${distanceReadoutText(state.distanceCm/100)}</strong></div><div class="bos-frame-distance-slider bos-frame-height-slider"><span>HAUTEUR CAMÉRA</span><input id="frameCameraHeightSlider" type="range" min="0.50" max="2.50" step="0.05" value="${Number(state.frameCameraHeightM||1.55).toFixed(2)}"><strong id="frameCameraHeightReadout" class="free-value-readout" data-free-control="cameraHeight" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${heightReadoutText(state.frameCameraHeightM)}</strong></div><div class="bos-frame-ratio-control"><span>RATIO</span><button type="button" class="ratio-select-btn" id="ratioBtn"><strong id="ratioText">${ratioLabel(state.ratio)}</strong><span>⌄</span></button></div><div class="bos-frame-foot" id="frameFoot">Sujet unique · 1,80 m</div></div>${appLink(id)}`;

  if(id==='light') { const lf=currentLight(); return `<label><span>Ma lumière</span><button type="button" class="model-picker-btn" id="lightPickerBtn" ${lightFixtures.length?'':'disabled'}><span>${esc(lf?.name||'Aucun projecteur disponible')}</span><strong>CHANGER</strong></button></label><div class="light-status light-status-plain" aria-label="Réglages lumière de référence">100 % <span>·</span> 5600 K <span>·</span> Nu <span>·</span> 1/50</div><div class="luxgrid luxgrid-3"><div class="luxbox"><small>à 1 m</small><strong id="lux1">—</strong><div class="iso-mini" id="iso1">Réglage —</div></div><div class="luxbox"><small>à 3 m</small><strong id="lux3">—</strong><div class="iso-mini" id="iso3">Réglage —</div></div><div class="luxbox luxbox-target"><small id="luxTargetLabel">à la distance sujet</small><strong id="luxTarget">—</strong><div class="iso-mini" id="isoTarget">Réglage —</div></div></div><div class="bos-linked-controls"><div class="bos-linked-slider"><span>RECUL</span><input id="lightDistanceSlider" type="range" min="0.30" max="15" step="0.10" value="${Math.max(.3,state.distanceCm/100)}"><strong id="lightDistanceReadout" class="free-value-readout" data-free-control="distance" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${distanceReadoutText(state.distanceCm/100)}</strong></div></div><div class="demo" id="lightSourceNote">BOS-PROJECTEURS-DB · 100 % · 5600 K · Nu</div>${appLink(id)}`; }

  if(id==='expo') return renderExpoWaveformBody();
  return '';
}

function slog3CodeValueBos(linear){
  const x=Math.max(0,Number(linear)||0);
  if(x>=0.01125)return 420 + Math.log10((x+0.01)/(0.18+0.01))*261.5;
  return x*(171.2102946929-95)/0.01125+95;
}
function slog3IreForLinearBos(linear){ return (slog3CodeValueBos(linear)-64)/(940-64)*100; }
function slog3IreFromStopsBos(stops){ return slog3IreForLinearBos(0.18*Math.pow(2,Number(stops)||0)); }
function slog3IreForReflectanceBos(reflectance){ return slog3IreForLinearBos(Number(reflectance)||0); }
function bosExpoWaveGuide(){
  const gamma=String(state.cameraGamma||'slog3').toLowerCase();
  if(gamma==='scinetone'){
    return {
      key:'scinetone',
      markers:[
        {value:1.5,label:'1,5 %'},
        {value:70,label:'70 %'},
        {value:100,label:'100 %'}
      ],
      zones:[
        {min:0,max:1.5,label:'SOUS LE NOIR',title:'Sous le noir nominal',text:'Sous le niveau noir S-Cinetone documenté par Sony.'},
        {min:1.5,max:12,label:'OMBRES PROFONDES',title:'Ombres profondes',text:'Zone très basse : détails et nuances deviennent plus fragiles.'},
        {min:12,max:30,label:'BASSES LUMIÈRES',title:'Basses lumières',text:'S-Cinetone renforce légèrement le contraste dans les basses lumières.'},
        {min:30,max:50,label:'MÉDIUMS BAS',title:'Médiums bas',text:'Zone de transition confortable pour conserver texture et couleur.'},
        {min:50,max:70,label:'MÉDIUMS HAUTS',title:'Médiums hauts',text:'Zone principale lumineuse avant le début du roll-off documenté.'},
        {min:70,max:85,label:'ROLL-OFF DOUX',title:'Début du roll-off',text:'À partir de 70 %, Sony réduit progressivement le contraste des hautes lumières.'},
        {min:85,max:100.01,label:'ROLL-OFF FORT',title:'Très hautes lumières',text:'Compression plus forte en approchant de la saturation : les écarts de lumière se resserrent dans le signal.'}
      ],
      note:'S-Cinetone n’est pas une courbe Log. Les seuils 1,5 % et 70 % sont documentés par Sony. Les subdivisions intermédiaires sont des zones de lecture pratiques BOS destinées à montrer que le comportement n’est pas uniforme ; les transitions réelles sont progressives.'
    };
  }
  const grey=slog3IreFromStopsBos(0),toe=slog3IreFromStopsBos(-4),m1=slog3IreFromStopsBos(-1),p3=slog3IreFromStopsBos(3),p5=slog3IreFromStopsBos(5),p6=slog3IreFromStopsBos(6);
  return {
    key:'slog3',
    toe,grey,m1,p3,p5,p6,
    stopsFn:slog3IreFromStopsBos,
    markers:[
      {value:toe,label:'≈12 %'},
      {value:grey,label:'≈41 %'},
      {value:slog3IreForReflectanceBos(.9),label:'≈61 %'},
      {value:p6,label:'≈94 %'}
    ],
    zones:[
      {min:0,max:toe,label:'PIED / TRÈS BASSES',title:'Pied de courbe'},
      {min:toe,max:m1,label:'OMBRES LOG',title:'Ombres'},
      {min:m1,max:p3,label:'MÉDIUMS',title:'Médiums'},
      {min:p3,max:p5,label:'HAUTES',title:'Hautes lumières'},
      {min:p5,max:p6,label:'TRÈS HAUTES',title:'Très hautes lumières'},
      {min:p6,max:100.01,label:'EXTRÊMES',title:'Extrêmes'}
    ]
  };
}
function bosExpoStopTableForGuide(guide){
  if(Array.isArray(guide?.stopTable)&&guide.stopTable.length>=2){
    return guide.stopTable.filter(x=>Number.isFinite(x?.stop)&&Number.isFinite(x?.percent)).sort((a,b)=>a.stop-b.stop);
  }
  if(!guide?.stopsFn) return [];
  let min=-8,max=6;
  if(Array.isArray(guide.stopRange)&&guide.stopRange.length===2){
    min=Math.ceil(guide.stopRange[0]);
    max=Math.floor(guide.stopRange[1]);
  }else if(guide.key==='slog3'){
    min=-8; max=6;
  }
  const out=[];
  for(let s=Math.ceil(min);s<=Math.floor(max);s++){
    const percent=guide.stopsFn(s);
    if(Number.isFinite(percent)&&percent>=0&&percent<=100)out.push({stop:s,percent});
  }
  return out;
}
function bosExpoWaveZone(value,guide=bosExpoWaveGuide()){
  const v=Math.max(0,Math.min(100,Number(value)||0));
  return guide.zones.find(z=>v>=z.min&&v<z.max)||guide.zones[guide.zones.length-1];
}
function bosExpoStopFromSignal(signal,guide=bosExpoWaveGuide()){
  if(!guide?.stopsFn) return NaN;
  const target=Math.max(0,Math.min(100,Number(signal)||0));
  let lo=-10,hi=10;
  if(Array.isArray(guide.stopRange)&&guide.stopRange.length===2){
    lo=Number(guide.stopRange[0]);hi=Number(guide.stopRange[1]);
  }else if(guide.key==='slog3'){
    lo=-10;hi=10;
  }
  for(let i=0;i<60;i++){
    const mid=(lo+hi)/2;
    if(guide.stopsFn(mid)<target)lo=mid;else hi=mid;
  }
  return (lo+hi)/2;
}
function bosExpoSignalTrend(zone,value){
  const label=String(zone?.label||zone?.title||'').toUpperCase();
  const min=Number(zone?.min),max=Number(zone?.max);
  const progress=Number.isFinite(min)&&Number.isFinite(max)&&max>min?Math.max(0,Math.min(1,(Number(value)-min)/(max-min))):.5;
  const high=/ROLL-OFF|HAUTES|EXTRÊME|SATURATION|HORS REPÈRE/.test(label);
  if(high){
    return {
      mode:'compression',progress,
      left:'Plus de marge',right:'Plus comprimé',
      note:'Dans cette zone, monter encore le signal ne signifie pas « meilleure image » : la marge diminue et la compression augmente.'
    };
  }
  return {
    mode:'cleaner',progress,
    left:'Bas de zone · plus fragile',right:'Haut de zone · plus robuste',
    note:'À zone comparable, placer le signal plus haut donne généralement davantage de signal utile et une image plus robuste, tant qu’on ne sacrifie pas les hautes lumières.'
  };
}
function bosExpoSignalAdvice(zone,value,guide=bosExpoWaveGuide()){
  const label=String(zone?.label||zone?.title||'').toUpperCase();
  const v=Math.max(0,Math.min(100,Number(value)||0));

  if(guide?.key==='scinetone'){
    if(v<1.5)return {
      useTitle:'NOIR / INFORMATION NON PRIORITAIRE',
      useText:'Sous le niveau noir nominal : à réserver à ce que tu acceptes de perdre.',
      quality:'TRÈS FRAGILE',
      qualityText:'Très peu de séparation utile dans le signal ; le détail sombre devient difficile à conserver.'
    };
    if(v<12)return {
      useTitle:'OMBRES PROFONDES',
      useText:'Pour des noirs avec juste assez de matière, pas pour un détail critique.',
      quality:'FRAGILE',
      qualityText:'Le signal est bas : la texture et la propreté dépendent fortement du niveau réel de lumière et de l’ISO.'
    };
    if(v<30)return {
      useTitle:'OMBRES AVEC MATIÈRE',
      useText:'Bonne zone pour garder du relief dans une partie sombre de l’image.',
      quality:'CORRECTE / CONTRASTÉE',
      qualityText:'S-Cinetone renforce légèrement le contraste des basses lumières : le rendu paraît dense, mais la réserve de correction reste moindre que dans les médiums.'
    };
    if(v<50)return {
      useTitle:'MÉDIUMS / TEXTURES',
      useText:'Zone confortable pour les matières, décors et sujets que tu veux garder riches en nuances.',
      quality:'BONNE',
      qualityText:'Signal confortable et encore peu comprimé ; bon compromis entre texture, contraste et souplesse.'
    };
    if(v<70)return {
      useTitle:'SUJETS LUMINEUX / PEAUX',
      useText:'Zone pratique pour les éléments importants que tu veux lumineux tout en gardant de la texture.',
      quality:'TRÈS CONFORTABLE',
      qualityText:'Signal fort avant le roll-off. La séparation tonale reste généreuse, sans supposer que toute valeur de cette zone est artistiquement idéale.'
    };
    if(v<85)return {
      useTitle:'HAUTES LUMIÈRES À PRÉSERVER',
      useText:'Le roll-off commence : utile pour conserver des hautes lumières avec une transition plus douce.',
      quality:'COMPRESSION DOUCE',
      qualityText:'Depuis 70 %, le contraste diminue progressivement. Les détails restent présents mais les écarts de lumière sont davantage comprimés.'
    };
    if(v<96)return {
      useTitle:'TRÈS HAUTES LUMIÈRES',
      useText:'À utiliser pour les zones très lumineuses dont tu veux encore garder un peu de texture.',
      quality:'FORTEMENT COMPRIMÉE',
      qualityText:'On approche de la saturation : les nuances se resserrent et la marge de correction diminue rapidement.'
    };
    return {
      useTitle:'SPÉCULAIRES / LIMITE',
      useText:'À réserver aux pics lumineux ou aux zones dont la texture n’est plus essentielle.',
      quality:'LIMITE',
      qualityText:'Très proche de la saturation du signal : faible séparation tonale restante.'
    };
  }

  if(/SOUS LE NOIR|PIED|TRÈS BASSES/.test(label))return {
    useTitle:'NOIRS / DÉTAIL NON PRIORITAIRE',
    useText:'À réserver aux noirs assumés ou aux zones dont le détail n’est pas essentiel.',
    quality:'FRAGILE',
    qualityText:'Très peu de signal utile : le bruit et la perte de détail deviennent plus visibles.'
  };
  if(/OMBRE/.test(label))return {
    useTitle:'OMBRES AVEC DÉTAIL',
    useText:'Intéressant pour garder de la matière dans les ombres sans les remonter inutilement.',
    quality:'CORRECTE À SURVEILLER',
    qualityText:'Détail exploitable, mais la propreté dépend davantage du capteur, de l’ISO/EI et du niveau réel de lumière.'
  };
  if(/MÉDIUM|ZONE PRINCIPALE|CONTRASTE PRINCIPAL/.test(label))return {
    useTitle:'SUJETS ET INFORMATIONS IMPORTANTES',
    useText:'Zone généralement confortable pour les éléments dont tu veux conserver texture et nuances.',
    quality:'TRÈS BONNE',
    qualityText:'Zone de signal robuste et facile à travailler, sous réserve du rendu artistique recherché.'
  };
  if(/TRÈS HAUTES|ROLL-OFF/.test(label))return {
    useTitle:'HAUTES LUMIÈRES À PRÉSERVER',
    useText:'Utile pour placer des sources, fenêtres ou reflets que tu veux encore conserver sans les sacrifier.',
    quality:'COMPRIMÉE',
    qualityText:'La courbe consacre moins de variation de signal aux écarts de lumière ; les nuances deviennent plus serrées.'
  };
  if(/HAUTES/.test(label))return {
    useTitle:'ÉLÉMENTS LUMINEUX IMPORTANTS',
    useText:'Bonne zone pour des hautes lumières dont tu veux garder la texture tout en restant lumineuses.',
    quality:'BONNE',
    qualityText:'Signal encore confortable, avec une compression croissante en allant vers le haut de la courbe.'
  };
  if(/EXTRÊME|HORS REPÈRE|SATURATION/.test(label))return {
    useTitle:'SPÉCULAIRES / ZONES SACRIFIABLES',
    useText:'À réserver de préférence aux pics lumineux ou aux éléments dont la texture n’est pas critique.',
    quality:'TRÈS COMPRIMÉE / LIMITE',
    qualityText:'Très faible marge de signal : risque de perte rapide de nuances ou de dépassement du repère documenté.'
  };
  return {
    useTitle:'SELON LE SUJET',
    useText:zone?.text||zone?.title||'Zone de la courbe sélectionnée.',
    quality:'À INTERPRÉTER',
    qualityText:'La qualité finale dépend de la caméra, de l’ISO/EI et de la quantité réelle de lumière.'
  };
}
function bosExpoSignalInfo(value,guide=bosExpoWaveGuide()){
  const v=Math.max(0,Math.min(100,Number(value)||0));
  const zone=bosExpoWaveZone(v,guide);
  const advice=bosExpoSignalAdvice(zone,v,guide);
  const trend=bosExpoSignalTrend(zone,v);
  const stop=bosExpoStopFromSignal(v,guide);
  return {
    zone,
    stop,
    quality:advice.quality,
    text:`${advice.qualityText} ${trend.note}`,
    progress:trend.progress,
    compression:trend.mode==='compression',
    left:trend.left,
    right:trend.right,
    useTitle:advice.useTitle,
    useText:advice.useText
  };
}
function bosExpoTerrainKey(zone,value,guide=bosExpoWaveGuide(),stop=bosExpoStopFromSignal(value,guide)){
  const label=String(zone?.label||zone?.title||'').toUpperCase();
  const zMin=Number(zone?.min),zMax=Number(zone?.max);
  const progress=Number.isFinite(zMin)&&Number.isFinite(zMax)&&zMax>zMin?Math.max(0,Math.min(1,(Number(value)-zMin)/(zMax-zMin))):.5;
  if(/SOUS LE NOIR|PIED|TRÈS BASSES/.test(label))return 'shadow-low';
  if(/OMBRE|BASSES LUMIÈRES/.test(label))return progress<.48?'shadow-low':'shadow-detail';
  if(Number.isFinite(stop)){
    if(stop>=2.5)return 'window';
    if(stop>=.75)return 'bright-face';
    if(stop>=-.75)return 'dark-face';
    if(stop>=-2)return 'shadow-detail';
    return 'shadow-low';
  }
  const z=guide?.zones||[];
  const idx=Math.max(0,z.indexOf(zone));
  const count=Math.max(1,z.length);
  const rel=(idx+.5)/count;
  if(/EXTRÊME|ROLL-OFF FORT|TRÈS HAUTES|SATURATION|HORS REPÈRE/.test(label)||rel>.82)return 'window';
  if(/HAUTES|ROLL-OFF DOUX|MÉDIUMS HAUTS/.test(label)||rel>.62)return 'bright-face';
  if(/MÉDIUM|ZONE PRINCIPALE|CONTRASTE PRINCIPAL/.test(label)||rel>.42)return 'dark-face';
  return 'shadow-detail';
}
function bosExpoTerrainUpperValue(key,guide=bosExpoWaveGuide()){
  for(let n=100;n>=0;n--){
    const zone=bosExpoWaveZone(n,guide);
    const stop=bosExpoStopFromSignal(n,guide);
    if(bosExpoTerrainKey(zone,n,guide,stop)===key)return n;
  }
  return Math.max(0,Math.min(100,Math.round(Number(state.expo?.read)||0)));
}
function bosExpoTerrainBounds(key,guide=bosExpoWaveGuide()){
  let min=101,max=-1;
  for(let n=0;n<=100;n++){
    const zone=bosExpoWaveZone(n,guide);
    const stop=bosExpoStopFromSignal(n,guide);
    if(bosExpoTerrainKey(zone,n,guide,stop)===key){
      if(min>100)min=n;
      max=n;
    }
  }
  if(max<0)return {min:0,max:100};
  return {min,max};
}
function bosExpoTerrainNote(key){
  const labels={
    window:'Exemples typiques : fenêtre, ciel clair, source visible ou reflet très lumineux.',
    'bright-face':'Exemples typiques : visage très éclairé, peau claire lumineuse, matière claire importante.',
    'dark-face':'Exemples typiques : visage plus sombre, sujet principal volontairement dense, matière en médiums bas.',
    'shadow-detail':'Exemples typiques : ombre avec matière, côté non éclairé d’un visage, décor sombre dont tu veux garder le détail.',
    'shadow-low':'Exemples typiques : ombre profonde, fond sombre ou zone dont le détail est secondaire.'
  };
  return `${labels[key]} Repère indicatif : le placement dépend du rendu recherché et des conditions de tournage.`;
}
function renderExpoWaveformBody(){
  const g=bosExpoWaveGuide();
  const v=Math.max(0,Math.min(100,Number(state.expo.read)||0));
  const info=bosExpoSignalInfo(v,g);
  const terrain=bosExpoTerrainKey(info.zone,v,g,info.stop);
  const stopTable=bosExpoStopTableForGuide(g);
  const segments=g.zones.map((z,i)=>`<span class="bos-wave-seg bos-wave-seg-${(i%5)+1}" style="left:${Math.max(0,z.min)}%;width:${Math.max(.15,Math.min(100,z.max)-Math.max(0,z.min))}%"></span>`).join('');
  const bands=stopTable.length>=2?stopTable.slice(0,-1).map((a,i)=>{const b=stopTable[i+1],left=Math.max(0,a.percent),right=Math.min(100,b.percent);return `<span class="bos-wave-stop-band ${i%2?'alt':''}" style="left:${left}%;width:${Math.max(.1,right-left)}%"></span>`}).join(''):'';
  const ticks=stopTable.length>=2?stopTable.map((x,i)=>{const pos=Math.max(0,Math.min(100,x.percent)),label=Math.abs(x.stop)<1e-9?'0':`${x.stop>0?'+':''}${x.stop}`,edge=i===0?' edge-left':i===stopTable.length-1?' edge-right':'';return `<span class="bos-wave-stop-tick${edge}" style="left:${pos}%"><i></i><b>${label}</b></span>`}).join(''):'';
  const markers=g.markers.map(m=>`<span class="bos-wave-marker" style="left:${Math.max(0,Math.min(100,m.value))}%"><i></i><b>${m.label}</b></span>`).join('');
  const stopHelp=stopTable.length>=2
    ? 'Chaque espace entre deux traits = 1 diaph de lumière réelle (×2 / ÷2). Ces traits décrivent la courbe / le rendu, pas la dynamique totale du capteur.'
    : 'Pas de conversion fiable waveform ↔ diaph pour ce profil.';
  return `<div class="bos-expo-wave">
    <div class="bos-expo-wave-head"><div class="bos-expo-wave-kicker">EXPLORER LA DYNAMIQUE DE L’IMAGE</div><div class="bos-expo-wave-value"><strong id="expoWaveValue" class="free-value-readout expo-free-readout" data-free-control="waveform" role="button" tabindex="0" title="Cliquer pour saisir une valeur libre">${trimFrNumber(v,2)}</strong><span>%</span></div></div>
    <div class="bos-wave-shell">
      <div class="bos-wave-scale">
        <div class="bos-wave-segments">${segments}</div>
        <div class="bos-wave-stop-bands">${bands}</div>
        <div class="bos-wave-markers">${markers}</div>
        <div class="bos-wave-stop-ticks">${ticks}</div>
        <div class="bos-wave-cursor" id="expoWaveCursor" style="left:${v}%"><span></span></div>
      </div>
      <div class="bos-wave-axis"><span>0</span><span>25</span><span>50</span><span>75</span><span>100 %</span></div>
      <div class="bos-wave-help${stopTable.length<2?' no-stops':''}" id="expoWaveStopHelp">${stopHelp}</div>
      <label class="bos-wave-slider-label" for="expoWaveSlider">NIVEAU LU SUR LE WAVEFORM</label>
      <input id="expoWaveSlider" class="bos-wave-slider" type="range" min="0" max="100" step="1" value="${v}">
    </div>
    <div class="bos-expo-quality-card">
      <span>SIGNAL / QUALITÉ ATTENDUE</span>
      <strong id="expoWaveQuality">${esc(info.quality)}</strong>
      <small id="expoWaveQualityText">${esc(info.text)}</small>
      <div class="bos-signal-quality-visual ${info.compression?'compression':'cleaner'}" id="expoWaveQualityVisual" role="slider" tabindex="0" aria-label="Position dans la zone de signal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(info.progress*100)}"><div class="bos-signal-noise"></div><div class="bos-signal-compression"></div><i id="expoWaveQualityCursor" style="left:${5+info.progress*90}%"></i></div>
      <div class="bos-signal-quality-labels"><span id="expoWaveQualityLeft">${info.left}</span><span id="expoWaveQualityRight">${info.right}</span></div>
    </div>
    <div class="bos-expo-terrain-card">
      <span>REPÈRES TERRAIN · EXEMPLES INDICATIFS</span>
      <div class="bos-terrain-strip" id="expoTerrainExamples">
        <button type="button" data-terrain="shadow-low" class="${terrain==='shadow-low'?'active':''}" title="Placer le waveform au haut de cette zone"><b>Ombre avec peu de détails</b><small>Très sombre</small></button>
        <button type="button" data-terrain="shadow-detail" class="${terrain==='shadow-detail'?'active':''}" title="Placer le waveform au haut de cette zone"><b>Ombre avec détails</b><small>Sombre</small></button>
        <button type="button" data-terrain="dark-face" class="${terrain==='dark-face'?'active':''}" title="Placer le waveform au haut de cette zone"><b>Visage sombre</b><small>Médium bas</small></button>
        <button type="button" data-terrain="bright-face" class="${terrain==='bright-face'?'active':''}" title="Placer le waveform au haut de cette zone"><b>Visage lumineux</b><small>Clair</small></button>
        <button type="button" data-terrain="window" class="${terrain==='window'?'active':''}" title="Placer le waveform au haut de cette zone"><b>Fenêtre / ciel</b><small>Très clair</small></button>
      </div>
      <small class="bos-terrain-note" id="expoTerrainNote">${esc(bosExpoTerrainNote(terrain))}</small>
    </div>
  </div>`;
}
function updateExpoWaveformUi(value,free=false){
  let v=Math.max(0,Math.min(100,Number(value)||0));
  v=free?Math.round(v*100)/100:Math.round(v);
  state.expo.read=v;
  const guide=bosExpoWaveGuide();
  const info=bosExpoSignalInfo(v,guide);
  const terrain=bosExpoTerrainKey(info.zone,v,guide,info.stop);
  const valueEl=document.getElementById('expoWaveValue'),cursor=document.getElementById('expoWaveCursor'),slider=document.getElementById('expoWaveSlider'),quality=document.getElementById('expoWaveQuality'),qualityText=document.getElementById('expoWaveQualityText'),visual=document.getElementById('expoWaveQualityVisual'),qualityCursor=document.getElementById('expoWaveQualityCursor'),left=document.getElementById('expoWaveQualityLeft'),right=document.getElementById('expoWaveQualityRight'),note=document.getElementById('expoTerrainNote');
  if(valueEl)valueEl.textContent=trimFrNumber(v,2);
  if(cursor)cursor.style.left=`${v}%`;
  if(slider)slider.value=String(v);
  if(quality)quality.textContent=info.quality;
  if(qualityText)qualityText.textContent=info.text;
  if(visual){
    visual.classList.toggle('compression',info.compression);
    visual.classList.toggle('cleaner',!info.compression);
    visual.setAttribute('aria-valuenow',String(Math.round(info.progress*100)));
  }
  if(qualityCursor)qualityCursor.style.left=`${5+info.progress*90}%`;
  if(left)left.textContent=info.left;
  if(right)right.textContent=info.right;
  document.querySelectorAll('#expoTerrainExamples [data-terrain]').forEach(el=>el.classList.toggle('active',el.dataset.terrain===terrain));
  if(note)note.textContent=bosExpoTerrainNote(terrain);
  save();
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

function setExpoFromQualityPointer(event,host){
  const rect=host.getBoundingClientRect();
  if(!rect.width) return;
  const raw=(event.clientX-rect.left)/rect.width;
  const normalized=Math.max(0,Math.min(1,(raw-.05)/.90));
  const current=Number(state.expo?.read)||0;
  const zone=bosExpoWaveZone(current);
  const min=Math.max(0,Number(zone.min)||0);
  const max=Math.min(100,Number(zone.max)||100);
  const span=Math.max(0,max-min);
  const target=span<=0 ? min : min + normalized*span;
  updateExpoWaveformUi(target,true);
}
function bindModules(){
  bindPlanModule();
  document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.toggle;state.open[id]=!state.open[id];save();b.closest('.module').classList.toggle('open',state.open[id]);}));
  const mb=document.getElementById('mediaBitrate'); if(mb)mb.addEventListener('input',e=>{state.media.bitrate=Math.max(1,Number(e.target.value)||1);save();updateMedia();});
  const mc=document.getElementById('mediaCard'); if(mc)mc.addEventListener('change',e=>{state.media.card=Number(e.target.value);save();updateMedia();});
  document.querySelectorAll('[data-mediaunit]').forEach(btn=>btn.addEventListener('click',()=>switchMediaUnit(btn.dataset.mediaunit)));
  const lightPickerBtn=document.getElementById('lightPickerBtn'); if(lightPickerBtn) lightPickerBtn.addEventListener('click',openProjectorPicker);
  const frameFocal=document.getElementById('frameFocalSlider'); if(frameFocal) frameFocal.addEventListener('input',e=>setLinkedFocal(e.target.value));
  const frameDistance=document.getElementById('frameDistanceSlider'); if(frameDistance) frameDistance.addEventListener('input',e=>setLinkedDistanceMeters(e.target.value));
  const frameCameraHeight=document.getElementById('frameCameraHeightSlider'); if(frameCameraHeight) frameCameraHeight.addEventListener('input',e=>setFrameCameraHeight(e.target.value,false));
  const ratioBtn=document.getElementById('ratioBtn'); if(ratioBtn) ratioBtn.addEventListener('click',()=>{renderRatioDialog();document.getElementById('ratioDialog')?.showModal();});
  const dofFocal=document.getElementById('dofFocalSlider'); if(dofFocal) dofFocal.addEventListener('input',e=>setLinkedFocal(e.target.value));
  const dofDistance=document.getElementById('dofDistanceSlider'); if(dofDistance) dofDistance.addEventListener('input',e=>setLinkedDistanceMeters(e.target.value));
  const lightDistance=document.getElementById('lightDistanceSlider'); if(lightDistance) lightDistance.addEventListener('input',e=>setLinkedDistanceMeters(e.target.value));
  const dofAperture=document.getElementById('dofApertureSlider'); if(dofAperture) dofAperture.addEventListener('input',e=>{const idx=Math.max(0,Math.min(apertures.length-1,Math.round(Number(e.target.value)||0)));setLinkedAperture(apertures[idx]);});
  const wave=document.getElementById('expoWaveSlider'); if(wave)wave.addEventListener('input',e=>updateExpoWaveformUi(e.target.value));
  document.querySelectorAll('#expoTerrainExamples [data-terrain]').forEach(btn=>btn.addEventListener('click',()=>updateExpoWaveformUi(bosExpoTerrainUpperValue(btn.dataset.terrain,bosExpoWaveGuide()))));
  const qualityVisual=document.getElementById('expoWaveQualityVisual');
  if(qualityVisual){
    qualityVisual.addEventListener('pointerdown',e=>{qualityVisual.setPointerCapture?.(e.pointerId);setExpoFromQualityPointer(e,qualityVisual);});
    qualityVisual.addEventListener('pointermove',e=>{if(qualityVisual.hasPointerCapture?.(e.pointerId))setExpoFromQualityPointer(e,qualityVisual);});
    qualityVisual.addEventListener('pointerup',e=>qualityVisual.releasePointerCapture?.(e.pointerId));
    qualityVisual.addEventListener('pointercancel',e=>qualityVisual.releasePointerCapture?.(e.pointerId));
    qualityVisual.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();
      const current=Number(state.expo?.read)||0;
      const zone=bosExpoWaveZone(current);
      const min=Math.max(0,Number(zone.min)||0);
      const max=Math.min(100,Number(zone.max)||100);
      let next=current;
      if(e.key==='Home') next=min;
      else if(e.key==='End') next=max;
      else next=current+(e.key==='ArrowRight'?1:-1);
      next=Math.max(min,Math.min(max,next));
      updateExpoWaveformUi(next,true);
    });
  }
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

function updateLive(){
  for(const fn of [updateDOF,updateMedia,updateFrame,updateLight]){
    try{fn();}catch(err){console.error('BOS live update',err);}
  }
}
function cameraCocMm(cam=currentCamera()){
  const explicit=Number(cam?.dof?.cocMm);
  if(Number.isFinite(explicit) && explicit>0) return explicit;
  const sensor=Number(cam?.sensorWidthMm)||36;
  return 0.029*(sensor/36);
}
function calculateDofExact(){
  const cam=currentCamera();
  const f=Math.max(1,Number(state.focal)||35);
  const N=Math.max(.5,Number(state.aperture)||2.8);
  const c=cameraCocMm(cam);
  const s=Math.max(f+1,(Number(state.distanceCm)||250)*10);
  const H=(f*f)/(N*c)+f;
  const near=(H*s)/(H+(s-f));
  const den=H-(s-f);
  const far=den<=0?Infinity:(H*s)/den;
  return {cam,f,N,c,s,H,near,far,total:far===Infinity?Infinity:Math.max(0,far-near)};
}
function fmtDofMm(mm){
  if(!Number.isFinite(mm)) return '∞';
  if(mm<1000) return `${Math.round(mm/10)} cm`;
  return `${(mm/1000).toFixed(2).replace('.',',')} m`;
}
function updateDOF(){
  const out=document.getElementById('dofMain'); if(!out)return;
  const r=calculateDofExact();
  out.textContent=`PDC ${fmtDofMm(r.total)}`;
  const sub=document.getElementById('dofSub');
  if(sub) sub.textContent=`Net de ${fmtDofMm(r.near)} à ${fmtDofMm(r.far)} · MAP ${fmtDofMm(r.s)} · ${r.f} mm · f/${r.N} · ${r.cam?.dof?.label||'capteur'}`;
  const focalSlider=document.getElementById('dofFocalSlider'),focalReadout=document.getElementById('dofFocalReadout');
  if(focalSlider) focalSlider.value=String(Math.max(9,Math.min(200,Number(state.focal)||35)));
  if(focalReadout) focalReadout.textContent=focalReadoutText(state.focal);
  syncDistanceRange('dofDistanceSlider','dofDistanceReadout');
  const apertureSlider=document.getElementById('dofApertureSlider'),apertureReadout=document.getElementById('dofApertureReadout');
  const idx=nearestApertureIndex(state.aperture);
  if(apertureSlider) apertureSlider.value=String(idx);
  if(apertureReadout) apertureReadout.textContent=apertureReadoutText(state.aperture);
}
function frameEyeHeightRatio(){
  const body=FRAME_FIGURE.footY-FRAME_FIGURE.headTopY;
  return 1-((FRAME_FIGURE.eyeY-FRAME_FIGURE.headTopY)/body);
}
function frameProjectSingleSubject(){
  const d=Math.max(.05,(Number(state.distanceCm)||250)/100);
  const subjectH=FRAME_SUBJECT_HEIGHT_M;
  const cameraH=Math.max(.50,Math.min(2.50,Number(state.frameCameraHeightM)||1.55));
  const compositionReferenceH=1.55;
  const eyeZ=subjectH*frameEyeHeightRatio();
  const vfov=frameVerticalFovDeg()*Math.PI/180;
  const desiredEyeAngle=Math.atan((1/3)*Math.tan(vfov/2));
  // La visée de référence reste celle qui place les yeux au 1/3 à 1,55 m.
  // Ensuite, monter/descendre la caméra déplace réellement le sujet dans le cadre.
  const axisElevation=Math.atan2(eyeZ-compositionReferenceH,d)-desiredEyeAngle;
  const projectZ=(z)=>{
    const dy=d,dz=z-cameraH;
    const depth=dy*Math.cos(axisElevation)+dz*Math.sin(axisElevation);
    if(depth<=.03) return null;
    const up=-dy*Math.sin(axisElevation)+dz*Math.cos(axisElevation);
    return up/(depth*Math.tan(vfov/2));
  };
  const head=projectZ(subjectH),eye=projectZ(eyeZ),feet=projectZ(0);
  if(head===null||eye===null||feet===null) return null;
  const bodyScale=Math.abs(feet-head)/2;
  const eyeToFeet=Math.abs(feet-eye)/2;
  const mannequinHeightPct=eyeToFeet/(FRAME_FIGURE.footRatio-FRAME_FIGURE.eyeRatio)*100;
  const eyeYPct=50-eye*50;
  const topPct=eyeYPct-FRAME_FIGURE.eyeRatio*mannequinHeightPct;
  return {d,head,eye,feet,bodyScale,mannequinHeightPct,topPct,cameraH};
}
function updateMedia(){ const el=document.getElementById('mediaMain'),sub=document.getElementById('mediaSub'); if(!el)return; const bitrateMb=bitrateToMbPerSec(),sec=(Number(state.media.card)*1000*8)/bitrateMb; el.textContent=fmtDuration(sec); if(sub)sub.textContent=`temps d’enregistrement · ${bitrateMb.toLocaleString('fr-FR')} Mb/s · réserve 0 %`; }
function updateFrame(){
  const stage=document.getElementById('frameStage'),win=document.getElementById('frameWindow'),subject=document.getElementById('frameSubject'),planEl=document.getElementById('framePlan'),foot=document.getElementById('frameFoot'),measure=document.getElementById('frameMeasure'),distanceSlider=document.getElementById('frameDistanceSlider'),distanceReadout=document.getElementById('frameDistanceReadout'),cameraHeightSlider=document.getElementById('frameCameraHeightSlider'),cameraHeightReadout=document.getElementById('frameCameraHeightReadout');
  if(!stage||!win||!subject||!planEl) return;
  const cam=currentCamera(),metrics=frameMetricsAtDistance(state.distanceCm/100),ratio=Math.max(.2,Number(state.ratio)||16/9),stageAspect=16/9;
  let w=92,h=w*stageAspect/ratio; if(h>82){h=82;w=h*ratio/stageAspect;}
  win.style.width=`${w}%`; win.style.height=`${h}%`;
  const projection=frameProjectSingleSubject();
  if(projection){
    subject.style.height=`${projection.mannequinHeightPct}%`;
    subject.style.top=`${projection.topPct}%`;
    subject.style.width='auto';
    const mh=projection.mannequinHeightPct;
    if(measure){
      measure.style.height=`${mh*FRAME_FIGURE.bodyRatio}%`;
      measure.style.top=`${projection.topPct+mh*FRAME_FIGURE.headTopRatio}%`;
      measure.style.left='72%';
    }
  }
  const plan=closestPreviewPlan(projection?.bodyScale||0);
  planEl.innerHTML=`<strong>${plan}</strong>`;
  const frameFocalSlider=document.getElementById('frameFocalSlider'),frameFocalReadout=document.getElementById('frameFocalReadout');
  if(frameFocalSlider) frameFocalSlider.value=String(Math.max(9,Math.min(200,Number(state.focal)||35)));
  if(frameFocalReadout) frameFocalReadout.textContent=focalReadoutText(state.focal);
  syncDistanceRange('frameDistanceSlider','frameDistanceReadout');
  if(cameraHeightSlider) cameraHeightSlider.value=Number(state.frameCameraHeightM||1.55).toFixed(2);
  if(cameraHeightReadout) cameraHeightReadout.textContent=heightReadoutText(state.frameCameraHeightM);
  const ratioText=document.getElementById('ratioText'); if(ratioText) ratioText.textContent=ratioLabel(state.ratio);
  if(foot) foot.textContent=`Sujet unique · 1,80 m · caméra ${Number(state.frameCameraHeightM||1.55).toFixed(2).replace('.',',')} m · champ : ${metrics.frameWidth.toFixed(2).replace('.',',')} × ${metrics.frameHeight.toFixed(2).replace('.',',')} m`;
}
function idealIsoFromLux(lux,aperture,shutterFraction='1/50'){
  const L=Number(lux),N=Number(aperture);
  const parts=String(shutterFraction).split('/').map(Number);
  const t=(parts.length===2&&parts[1])?parts[0]/parts[1]:1/50;
  if(!(L>0)||!(N>0)||!(t>0)) return null;
  return (250*N*N)/(L*t);
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
  const shutter='1/50',aperture=state.aperture,minIso=100,maxIso=51200;
  const ideal=idealIsoFromLux(lux,aperture,shutter);
  if(!ideal)return {text:'Réglage —',status:'normal'};
  if(ideal<minIso){const excessStops=Math.log2(minIso/ideal),nd=nearestNdForStops(excessStops);return {text:`ISO 100 · ND ${nd.toFixed(1)} · f/${aperture} · 1/50`,status:'bright'};}
  if(ideal>maxIso){const missingStops=Math.log2(ideal/maxIso);return {text:`ISO 51 200 · manque ${missingStops.toFixed(1).replace('.',',')} stop · f/${aperture} · 1/50`,status:'dark'};}
  const iso=nearestIsoValue(ideal,minIso,maxIso); return {text:`ISO ${iso.toLocaleString('fr-FR')} · f/${aperture} · 1/50`,status:'normal'};
}
function updateLight(){
  const a=document.getElementById('lux1'),b=document.getElementById('lux3'),t=document.getElementById('luxTarget'),i1=document.getElementById('iso1'),i3=document.getElementById('iso3'),it=document.getElementById('isoTarget'),tl=document.getElementById('luxTargetLabel'),note=document.getElementById('lightSourceNote'); if(!a||!b||!t||!i1||!i3||!it)return;
  syncDistanceRange('lightDistanceSlider','lightDistanceReadout');
  const fixture=currentLight(),targetDistance=Math.max(.1,state.distanceCm/100); if(tl)tl.textContent=`à ${targetDistance.toFixed(2).replace('.',',')} m`;
  if(!fixture){a.textContent=b.textContent=t.textContent='—';i1.textContent=i3.textContent=it.textContent='Réglage —';if(note)note.textContent='Base projecteurs indisponible';return;}
  const at1=luxAtDistance(fixture,1),at3=luxAtDistance(fixture,3),atT=luxAtDistance(fixture,targetDistance),renderLux=r=>r?`${r.exact?'':'≈ '}${Math.round(r.lux).toLocaleString('fr-FR')} lx`:'—';
  a.textContent=renderLux(at1);b.textContent=renderLux(at3);t.textContent=renderLux(atT);
  const adv1=at1?lightExposureAdvice(at1.lux):null,adv3=at3?lightExposureAdvice(at3.lux):null,advT=atT?lightExposureAdvice(atT.lux):null;
  i1.textContent=adv1?adv1.text:'Réglage —';i3.textContent=adv3?adv3.text:'Réglage —';it.textContent=advT?advT.text:'Réglage —';i1.dataset.status=adv1?.status||'normal';i3.dataset.status=adv3?.status||'normal';it.dataset.status=advT?.status||'normal';
  const calculated=[at1,at3,atT].some(r=>r&&!r.exact),bare=fixture?.calculator?.accessories?.bare,quality=bare?.quality==='measured'?'mesure constructeur':(bare?.quality==='single'?'mesure de référence':(bare?.quality||'donnée DB'));
  if(note){const src=lightDatabaseSource==='remote'?'en ligne':(lightDatabaseSource==='fallback'?'secours local':'indisponible');note.textContent=`BOS-PROJECTEURS-DB ${lightDatabase?.databaseVersion||''} · ${src} · ${quality} · calcul f/${state.aperture} · 1/50${calculated?' · ≈ extrapolé':''}`;}
}
function renderCustomize(){ const root=document.getElementById('customizeList'); if(!root)return; root.innerHTML=state.layout.map((id,i)=>`<div class="custom-item"><input type="checkbox" data-vis="${id}" ${state.visible[id]?'checked':''}><span class="custom-name">${moduleMeta[id][0]}</span><button type="button" class="movebtn" data-up="${id}" ${i===0?'disabled':''}>↑</button><button type="button" class="movebtn" data-down="${id}" ${i===state.layout.length-1?'disabled':''}>↓</button></div>`).join(''); root.querySelectorAll('[data-vis]').forEach(x=>x.addEventListener('change',()=>{state.visible[x.dataset.vis]=x.checked;save();renderModules();})); root.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.up,-1))); root.querySelectorAll('[data-down]').forEach(b=>b.addEventListener('click',()=>moveModule(b.dataset.down,1))); }
function moveModule(id,dir){ const i=state.layout.indexOf(id),j=i+dir;if(j<0||j>=state.layout.length)return;[state.layout[i],state.layout[j]]=[state.layout[j],state.layout[i]];save();renderCustomize();renderModules(); }

document.addEventListener('DOMContentLoaded',init);
