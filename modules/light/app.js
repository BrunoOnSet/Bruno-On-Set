// BOS LIGHT V0.29 — UI numérique FRAME + choix compacts
const INCIDENT_C = 340;
const STORAGE_KEY = 'bos-light-settings-v1';
const BOS_SHARED_STATE_KEY='bos-shared-state-v1';
let bosSharedReady=false;

const state = {
  fixture: 'halo60x', accessory: 'softbox', cct: 5600,
  intensityPct: 100, iso: 800, shutterDenom: 50, aperture: 2.8,
  testDistance: 2.0,
  fillEnabled: false, fillFixture: 'halo60x', fillAccessory: 'softbox', fillCct: 5600,
  fillIntensityPct: 50, fillDistance: 2.0,
  selectedGelId: 'lee204', gelTarget:'none', gelTransmissionSource:'daylight'
};

function bosReadSharedState(){
  try{
    const raw=JSON.parse(localStorage.getItem(BOS_SHARED_STATE_KEY)||'null');
    return raw && typeof raw==='object' ? raw : null;
  }catch(_){ return null; }
}
function bosPublishSharedState(){
  if(!bosSharedReady) return;
  try{
    const previous=bosReadSharedState()||{};
    const theme=document.body.classList.contains('dark')?'dark':'light';
    const payload={
      ...previous,
      theme,
      aperture:Number(state.aperture),
      cameraIso:String(state.iso),
      cameraShutter:`1/${state.shutterDenom}`,
      distanceCm:Math.round(Number(state.testDistance||2)*100),
      light:{ fixture: state.fixture || '' },
      updatedAt:Date.now(),
      source:'light'
    };
    localStorage.setItem(BOS_SHARED_STATE_KEY,JSON.stringify(payload));
  }catch(_){ }
}
function bosApplySharedState(){
  const shared=bosReadSharedState();
  if(!shared) return false;
  let changed=false;
  if(shared.theme==='light' || shared.theme==='dark'){
    try{ localStorage.setItem('bg-set-tools-theme', shared.theme); }catch(_){ }
  }
  if(shared.light && typeof shared.light==='object' && shared.light.fixture && fixtures[shared.light.fixture] && state.fixture!==shared.light.fixture){
    state.fixture=shared.light.fixture;
    changed=true;
  }
  const sharedIso=Number(shared.cameraIso);
  if(ISO_VALUES.includes(sharedIso) && Number(state.iso)!==sharedIso){ state.iso=sharedIso; changed=true; }
  const sh=String(shared.cameraShutter||'').match(/1\/(\d+)/);
  const denom=sh?Number(sh[1]):NaN;
  if(SHUTTER_DENOMS.includes(denom) && Number(state.shutterDenom)!==denom){ state.shutterDenom=denom; changed=true; }
  const ap=Number(shared.aperture);
  if(APERTURES.includes(ap) && Number(state.aperture)!==ap){ state.aperture=ap; changed=true; }
  const dist=Number(shared.distanceCm);
  if(Number.isFinite(dist)){
    const meters=Math.max(1,Math.min(20, dist/100));
    if(Math.abs(Number(state.testDistance)-meters) > 0.0001){ state.testDistance=meters; changed=true; }
  }
  return changed;
}

let fixtures = {};
let UI_GROUPS = {};
let BRAND_GROUPS = {};
let BRAND_LABELS = {};
let GROUP_LABELS = {};
let POWER_LABELS = {};
let DATABASE_INFO = {version:'—', updated:'—', source:'—', fixtureCount:0};
let pickerTarget='key', pickerBrand='', pickerFamily='';
let numericEditConfig=null;

const ISO_VALUES=[100,125,160,200,250,320,400,500,640,800,1000,1250,1600,2000,2500,3200,4000,5000,6400,8000,10000,12800];
const SHUTTER_DENOMS=[24,25,30,40,48,50,60,80,100,120,125,160,200,250,320,400,500,640,800,1000];
const APERTURES=[1.4,1.6,1.8,2,2.2,2.5,2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16,18,20,22];

const gelFilters=[
  {id:'lee017',code:'017',name:'Surprise Peach',ref:'LEE 017',localSwatch:'assets/gels/lee017-swatch-flat.png',description:'Surprise Peach',use:'Bon pour les carnations et pour créer une ambiance lumineuse plus sombre / expressive.',tC:19.6,tT:21.9,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/017-surprise-peach/',swatchUrls:['https://usa.leefiltersdirect.com/cdn/shop/files/017_Surprise_Peach_150x150.jpg?v=1737750959'],localSpectrum:'assets/gels/lee017-spectrum.png',spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/017Chart.jpg']},
  {id:'lee117',code:'117',name:'Steel Blue',ref:'LEE 117',localSwatch:'assets/gels/lee117-swatch-flat.png',description:'Steel Blue',use:'Pour des ambiances froides. Ajoute une légère teinte verte et évoque un climat glacé.',tC:54.7,tT:53.0,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/117-steel-blue/',swatchUrls:['https://usa.leefiltersdirect.com/cdn/shop/files/Lee_Filters_117_150x150.jpg?v=1737751171'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/products/117Graph_5881f22d-ac51-4bf3-b884-e2c92b10b533.jpg','https://leefiltersdirect.com/cdn/shop/files/117Chart.jpg']},
  {id:'lee201',code:'201',name:'Full CTB',ref:'LEE 201',localSwatch:'assets/gels/lee201-swatch-flat.png',description:'Full C.T. Blue',use:'Convertit une source tungstène 3200 K vers le daylight photographique 5700 K.',tC:34.0,tT:35.0,temp:'3200 K → 5700 K',mired:'−137',sourceUrl:'https://leefilters.com/colour/201-full-c-t-blue/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/files/Lee_Filters_201_Full_CTB_Photo_600x_crop_center.jpg?v=1743509450'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/Light-transmitted-201-full-ct-blue-LEE-Filters_JPG.png','https://leefiltersdirect.com/cdn/shop/files/LEE-Filters-201-Full-CTB-Chart_grande.png']},
  {id:'lee202',code:'202',name:'1/2 CTB',ref:'LEE 202',localSwatch:'assets/gels/lee202-swatch-flat.png',description:'Half C.T. Blue',use:'Convertit une source tungstène 3200 K vers 4300 K.',tC:54.9,tT:53.2,temp:'3200 K → 4300 K',mired:'−78',sourceUrl:'https://leefilters.com/colour/202-half-c-t-blue/',swatchUrls:['https://usa.leefiltersdirect.com/cdn/shop/products/202RC1_Gel_Color_db1b2f6f-2a67-4c30-90fe-18e05d7593d3_150x150.webp?v=1737751235'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/202Chart.jpg','https://leefiltersdirect.com/cdn/shop/files/Light-transmitted-202-half-c-t-blue-LEE-Filters_JPG.png','https://leefiltersdirect.com/cdn/shop/products/202Graph.jpg']},
  {id:'lee203',code:'203',name:'1/4 CTB',ref:'LEE 203',localSwatch:'assets/gels/lee203-swatch-flat.png',description:'Quarter C.T. Blue',use:'Convertit une source tungstène 3200 K vers 3600 K.',tC:69.3,tT:70.5,temp:'3200 K → 3600 K',mired:'−35',sourceUrl:'https://leefilters.com/colour/203-quarter-c-t-blue/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/products/Lee_Filters_203_150x150.jpg?v=1666092043'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/Light-transmitted-203-quarter-ct-blue-LEE-Filters_JPG.png','https://leefiltersdirect.com/cdn/shop/files/203Chart.jpg']},
  {id:'lee204',code:'204',name:'Full CTO',ref:'LEE 204',localSwatch:'assets/gels/lee204-swatch-flat.png',description:'Full C.T. Orange',use:'Convertit la lumière du jour 6500 K vers 3200 K.',tC:55.4,tT:62.8,temp:'6500 K → 3200 K',mired:'+159',sourceUrl:'https://leefilters.com/colour/204-full-c-t-orange/',swatchUrls:['https://usa.leefiltersdirect.com/cdn/shop/products/204RC1_Gel_Color_4dba80fc-4895-43e3-aeda-412424de0f60_150x150.webp?v=1737751233'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/Light-transmitted-204-full-ct-orange-LEE-Filters_JPG.png','https://leefiltersdirect.com/cdn/shop/files/204Chart.jpg','https://leefiltersdirect.com/cdn/shop/products/204Graph.jpg']},
  {id:'lee205',code:'205',name:'1/2 CTO',ref:'LEE 205',localSwatch:'assets/gels/lee205-swatch-flat.png',description:'Half C.T. Orange',use:'Convertit la lumière du jour 6500 K vers 3800 K.',tC:70.8,tT:74.5,temp:'6500 K → 3800 K',mired:'+109',sourceUrl:'https://leefilters.com/colour/205-half-c-t-orange/',swatchUrls:['https://usa.leefiltersdirect.com/cdn/shop/products/205RC1_Gel_Color_b943866a-0246-4f27-bc27-7288507eb021_150x150.webp?v=1737751231'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/Light-transmitted-205-half-ct-orange-LEE-Filters_JPG.png','https://leefiltersdirect.com/cdn/shop/files/205Chart.jpg','https://leefiltersdirect.com/cdn/shop/products/205Graph.jpg']},
  {id:'lee206',code:'206',name:'1/4 CTO',ref:'LEE 206',localSwatch:'assets/gels/lee206-swatch-flat.png',description:'Quarter C.T. Orange',use:'Convertit la lumière du jour 6500 K vers 4600 K.',tC:79.1,tT:82.6,temp:'6500 K → 4600 K',mired:'+64',sourceUrl:'https://leefilters.com/colour/206-quarter-c-t-orange/',swatchUrls:['https://usa.leefiltersdirect.com/cdn/shop/products/206RC1_Gel_Color_0b396704-7b36-46b1-9aee-dfa21975a4ed_150x150.webp?v=1737751230'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/Light-transmitted-206-quarter-ct-orange-LEE-Filters_JPG.png','https://leefiltersdirect.com/cdn/shop/files/206Chart.jpg','https://leefiltersdirect.com/cdn/shop/products/206Graph.jpg']},
  {id:'lee213',code:'213',name:'White Flame Green',ref:'LEE 213',localSwatch:'assets/gels/lee213-swatch-flat.png',description:'White Flame Green',use:'Corrige les arcs carbone white flame en absorbant l’ultraviolet.',tC:80.0,tT:80.0,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/213-white-flame-green/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/files/213_Whit_Flame_Green_150x150.jpg?v=1688460071'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/213Chart.jpg']},
  {id:'lee245',code:'245',name:'Half Plus Green',ref:'LEE 245',localSwatch:'assets/gels/lee245-swatch-flat.png',description:'Half Plus Green',use:'Ajoute une dominante verte modérée pour rapprocher une source daylight ou tungstène de sources à décharge.',tC:81.7,tT:81.6,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/245-half-plus-green/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/files/245_Half_Plus_Green_150x150.jpg?v=1688636987'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/245Chart.jpg']},
  {id:'lee246',code:'246',name:'Quarter Plus Green',ref:'LEE 246',localSwatch:'assets/gels/lee246-swatch-flat.png',description:'Quarter Plus Green',use:'Ajoute une légère dominante verte pour rapprocher daylight ou tungstène de sources à décharge.',tC:84.6,tT:85.0,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/246-quarter-plus-green/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/files/246_Quarter_Plus_Green_150x150.jpg?v=1688642034'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/246Chart.jpg']},
  {id:'lee248',code:'248',name:'Half Minus Green',ref:'LEE 248',localSwatch:'assets/gels/lee248-swatch-flat.png',description:'Half Minus Green',use:'Réduit une dominante verte indésirable créée par des sources à décharge avec une correction plus forte que le Quarter Minus Green.',tC:72.0,tT:71.0,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/248-half-minus-green/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/files/Lee_Filters_248_Half_Minus_Green_150x150.jpg?v=1685971379'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/248Chart.jpg']},
  {id:'lee249',code:'249',name:'Quarter Minus Green',ref:'LEE 249',localSwatch:'assets/gels/lee249-swatch-flat.png',description:'Quarter Minus Green',use:'Réduit une dominante verte indésirable créée par des sources à décharge.',tC:82.4,tT:80.5,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/249-quarter-minus-green/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/files/LEE-249_Quarter_Minus_Green-Photo_150x150.jpg?v=1743506323'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/249Chart.jpg','https://leefiltersdirect.com/cdn/shop/files/LEE-249-Quarter-Minus-Green-Colour-Black-and-Chart.png']},
  {id:'lee506',code:'506',name:'Marlene',ref:'LEE 506',localSwatch:'assets/gels/lee506-swatch-flat.png',description:'Marlene',use:'Filtre flatteur pour les carnations, sans dominante rose caricaturale.',tC:67.3,tT:70.4,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/506-marlene/',swatchUrls:['https://ca.leefiltersdirect.com/cdn/shop/products/Lee_Filters_506_Marlene_150x150.jpg?v=1695631473'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/506Chart.jpg','https://leefiltersdirect.com/cdn/shop/products/506Graph.jpg']},
  {id:'lee603',code:'603',name:'Moonlight White',ref:'LEE 603',localSwatch:'assets/gels/lee603-swatch-flat.png',description:'Moonlight White',use:'Filtre d’effet froid / moonlight de la série LEE 600.',tC:28.3,tT:27.3,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/603-moonlight-white/',swatchUrls:['https://usa.leefiltersdirect.com/cdn/shop/files/Lee_Filters_603_Moonlight_White_600x_crop_center.jpg?v=1737751092'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/603Chart.jpg']},
  {id:'lee728',code:'728',name:'Steel Green',ref:'LEE 728',localSwatch:'assets/gels/lee728-swatch-flat.png',description:'Steel Green',use:'Orages approchants, ciel couvert, lumière froide métallique, moonlight inquiétante.',tC:45.9,tT:41.4,temp:'Non communiqué',mired:'—',sourceUrl:'https://leefilters.com/colour/728-steel-green/',swatchUrls:['https://leefiltersdirect.com/cdn/shop/files/Lee_Filters_728_Steel_Green_150x150.jpg?v=1689167712'],spectrumUrls:['https://leefiltersdirect.com/cdn/shop/files/728Chart.jpg']}
];


const $ = sel => document.querySelector(sel);
const els = {
  accessoryGrid:$('#accessoryGrid'), accessoryNote:$('#accessoryNote'), cctGrid:$('#cctGrid'), cctSection:$('#cctSection'), cctValue:$('#cctValue'), cctNote:$('#cctNote'),
  intensitySlider:$('#intensitySlider'), intensityValue:$('#intensityValue'), isoSelect:$('#isoSelect'), shutterSelect:$('#shutterSelect'), apertureSelect:$('#apertureSelect'), cameraSummary:$('#cameraSummary'), cameraHeadingMeta:$('#cameraHeadingMeta'), lightSummary:$('#lightSummary'),
  keyModelPickerBtn:$('#keyModelPickerBtn'), keyModelPickerLabel:$('#keyModelPickerLabel'),
  maxDistance:$('#maxDistance'), resultDistanceSummary:$('#resultDistanceSummary'), heroSummary:$('#heroSummary'), beamHint:$('#beamHint'), resultHeroCard:$('#resultHeroCard'), testDistanceSlider:$('#testDistanceSlider'), testDistanceValue:$('#testDistanceValue'), statusBox:$('#statusBox'), statusTitle:$('#statusTitle'), statusText:$('#statusText'), solutionIntro:$('#solutionIntro'), solutions:$('#solutions'), contrastSection:$('#contrastSection'),
  keyTechPopover:$('#keyTechPopover'), keyTechSourceDescriptor:$('#keyTechSourceDescriptor'), keyTechMeasurementRow:$('#keyTechMeasurementRow'),
  resultTechPopover:$('#resultTechPopover'), resultTechLux:$('#resultTechLux'), resultTechMargin:$('#resultTechMargin'), resultTechRequiredIso:$('#resultTechRequiredIso'), resultTechPossibleAperture:$('#resultTechPossibleAperture'), resultTechDataNote:$('#resultTechDataNote'),
  resetBtn:$('#resetBtn'), themeToggle:$('#themeToggle'), themeColor:$('#themeColor'),
  fillDetails:$('#fillDetails'), fillSummary:$('#fillSummary'), fillDisabled:$('#fillDisabled'), fillControls:$('#fillControls'), enableFillBtn:$('#enableFillBtn'), disableFillBtn:$('#disableFillBtn'),
  fillModelPickerBtn:$('#fillModelPickerBtn'), fillModelPickerLabel:$('#fillModelPickerLabel'), fillAccessoryGrid:$('#fillAccessoryGrid'), fillAccessoryNote:$('#fillAccessoryNote'),
  fillIntensitySlider:$('#fillIntensitySlider'), fillIntensityValue:$('#fillIntensityValue'), fillCctSection:$('#fillCctSection'), fillCctGrid:$('#fillCctGrid'), fillCctValue:$('#fillCctValue'), fillCctNote:$('#fillCctNote'), fillDistanceSlider:$('#fillDistanceSlider'), fillDistanceValue:$('#fillDistanceValue'),
  fillTechPopover:$('#fillTechPopover'), fillTechSourceDescriptor:$('#fillTechSourceDescriptor'), fillTechMeasurementRow:$('#fillTechMeasurementRow'),
  contrastCard:$('#contrastCard'), contrastCharacter:$('#contrastCharacter'), keyLuxResult:$('#keyLuxResult'), fillLuxResult:$('#fillLuxResult'), sourceGapResult:$('#sourceGapResult'), sourceGapDetail:$('#sourceGapDetail'), sourceRatioResult:$('#sourceRatioResult'), estimatedContrastResult:$('#estimatedContrastResult'),
  projectorDialog:$('#projectorDialog'), projectorDialogTitle:$('#projectorDialogTitle'), projectorChooserContext:$('#projectorChooserContext'), closeProjectorDialogBtn:$('#closeProjectorDialogBtn'), pickerBrandChoices:$('#pickerBrandChoices'), pickerFamilyChoices:$('#pickerFamilyChoices'), pickerModelChoices:$('#pickerModelChoices'), pickerCatalogCount:$('#pickerCatalogCount'),
  numericDialog:$('#numericDialog'), numericDialogForm:$('#numericDialogForm'), numericDialogTitle:$('#numericDialogTitle'), numericDialogInput:$('#numericDialogInput'), numericDialogUnit:$('#numericDialogUnit'), numericDialogValidate:$('#numericDialogValidate'),
  gelFilterButtons:$('#gelFilterButtons'), gelSummary:$('#gelSummary'), gelName:$('#gelName'), gelDescription:$('#gelDescription'), gelRef:$('#gelRef'), gelTransmissionC:$('#gelTransmissionC'), gelTransmissionT:$('#gelTransmissionT'), gelTemperature:$('#gelTemperature'), gelMired:$('#gelMired'), gelUse:$('#gelUse'), gelSwatchImage:$('#gelSwatchImage'), gelImageFallback:$('#gelImageFallback'), gelSpectrumImage:$('#gelSpectrumImage'), gelSpectrumSource:$('#gelSpectrumSource'), gelSourceLink:$('#gelSourceLink'), gelDataStatus:$('#gelDataStatus'), gelTargetButtons:$('#gelTargetButtons'), gelSourceButtons:$('#gelSourceButtons'), gelSourceHelp:$('#gelSourceHelp'), gelImpactTarget:$('#gelImpactTarget'), gelImpactLux:$('#gelImpactLux'), gelImpactLoss:$('#gelImpactLoss'), gelImpactDistance:$('#gelImpactDistance'), gelImpactTransmission:$('#gelImpactTransmission'), gelImpactNote:$('#gelImpactNote')
};

init().catch(err=>{console.error(err); document.body.dataset.dbError='1';});

async function init(){
  applyTheme(bosReadSharedState()?.theme || localStorage.getItem('bg-set-tools-theme') || 'light');
  const loaded = await window.BOSProjecteursDB.load();
  buildCatalogFromDatabase(loaded.db,loaded);
  loadSavedState();
  bosApplySharedState();
  populateSelect(els.isoSelect,ISO_VALUES,v=>`ISO ${v}`,state.iso);
  populateSelect(els.apertureSelect,APERTURES,v=>`f/${formatAperture(v)}`,state.aperture);
  populateSelect(els.shutterSelect,SHUTTER_DENOMS,v=>`1/${v}`,state.shutterDenom);
  els.intensitySlider.value=state.intensityPct;
  els.testDistanceSlider.value=state.testDistance;
  els.fillIntensitySlider.value=state.fillIntensityPct;
  els.fillDistanceSlider.value=state.fillDistance;
  bindUI();
  bosSharedReady=true;
  update();
  updateGelPanel();
}

function naturalModelSort(a,b){
  const la=POWER_LABELS[a]||a, lb=POWER_LABELS[b]||b;
  const na=Number((la.match(/\d+(?:\.\d+)?/)||['99999'])[0]);
  const nb=Number((lb.match(/\d+(?:\.\d+)?/)||['99999'])[0]);
  if(na!==nb) return na-nb;
  return la.localeCompare(lb,'fr',{numeric:true,sensitivity:'base'});
}
function buildCatalogFromDatabase(db,sourceMeta={}){
  fixtures={}; UI_GROUPS={}; BRAND_GROUPS={}; BRAND_LABELS={}; GROUP_LABELS={}; POWER_LABELS={};
  const ui=db.calculatorUi||{};
  BRAND_LABELS={...(ui.brandLabels||{})};

  for(const item of db.fixtures||[]){
    const calc=item.calculator;
    if(!item.capabilities?.lightCalculator || !calc) continue;
    const key=calc.key||item.id;
    fixtures[key]={label:item.name,brand:calc.brandKey,group:calc.group,defaultAccessory:calc.defaultAccessory,accessories:calc.accessories||{},note:calc.note||'',databaseId:item.id,plan:item.plan||null};
    POWER_LABELS[key]=calc.powerLabel||item.short||item.name;
    GROUP_LABELS[calc.group]=calc.groupLabel||ui.groups?.[calc.group]?.label||calc.group;
    (UI_GROUPS[calc.group]??=[]).push(key);
  }
  Object.values(UI_GROUPS).forEach(keys=>keys.sort(naturalModelSort));
  const brandOrder=(ui.brandOrder||Object.keys(BRAND_LABELS));
  for(const brand of brandOrder){
    const groups=Object.entries(ui.groups||{})
      .filter(([key,g])=>g.brandKey===brand && UI_GROUPS[key]?.length)
      .map(([key,g])=>({key,order:Number(g.order)||0}))
      .filter(x=>UI_GROUPS[x.key]?.length)
      .sort((a,b)=>a.order-b.order)
      .map(x=>x.key);
    const extra=Object.keys(UI_GROUPS).filter(group=>{
      const first=fixtures[UI_GROUPS[group][0]];
      return first?.brand===brand && !groups.includes(group);
    });
    BRAND_GROUPS[brand]=[...groups,...extra];
    if(!BRAND_LABELS[brand]) BRAND_LABELS[brand]=brand;
  }
  for(const f of Object.values(fixtures)){
    if(!BRAND_GROUPS[f.brand]){
      BRAND_GROUPS[f.brand]=Object.keys(UI_GROUPS).filter(g=>fixtures[UI_GROUPS[g][0]]?.brand===f.brand);
      BRAND_LABELS[f.brand] ||= f.brand;
    }
  }
  DATABASE_INFO={version:db.databaseVersion||db.schemaVersion||'—',updated:db.updated||'—',source:sourceMeta.source||'—',url:sourceMeta.url||'',fixtureCount:Object.keys(fixtures).length,totalFixtureCount:(db.fixtures||[]).length};
}

function loadSavedState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(!saved||typeof saved!=='object')return;
    const allowed=['fixture','accessory','cct','intensityPct','iso','shutterDenom','aperture','testDistance','fillEnabled','fillFixture','fillAccessory','fillCct','fillIntensityPct','fillDistance','selectedGelId','gelTarget','gelTransmissionSource'];
    allowed.forEach(k=>{if(saved[k]!==undefined)state[k]=saved[k];});
    if(!fixtures[state.fixture]) state.fixture=fixtures.halo60x?'halo60x':Object.keys(fixtures)[0];
    if(!fixtures[state.fillFixture]) state.fillFixture=state.fixture;
    if(!ISO_VALUES.includes(Number(state.iso))) state.iso=800;
    if(!SHUTTER_DENOMS.includes(Number(state.shutterDenom))) state.shutterDenom=50;
    if(!APERTURES.includes(Number(state.aperture))) state.aperture=2.8;
    state.intensityPct=Math.max(0,Math.min(100,Number(state.intensityPct)||0));
    state.testDistance=Math.max(1,Math.min(20,Number(state.testDistance)||2));
    state.cct=Number(state.cct)||5600;
    state.fillEnabled=Boolean(state.fillEnabled);
    state.fillIntensityPct=Math.max(0,Math.min(100,Number(state.fillIntensityPct)??50));
    state.fillDistance=Math.max(1,Math.min(20,Number(state.fillDistance)||2));
    state.fillCct=Number(state.fillCct)||5600;
    if(!gelFilters.some(g=>g.id===state.selectedGelId)) state.selectedGelId='lee204';
    if(!['none','key','fill'].includes(state.gelTarget)) state.gelTarget='none';
    if(!['daylight','tungsten'].includes(state.gelTransmissionSource)) state.gelTransmissionSource='daylight';
    if(state.gelTarget==='fill'&&!state.fillEnabled) state.gelTarget='none';
  }catch(_){ }
}
function persistState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}}
function populateSelect(select,values,labelFn,selected){select.innerHTML='';values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=labelFn(v);if(Number(v)===Number(selected))o.selected=true;select.appendChild(o);});}
function brandForFixture(key=state.fixture){return fixtures[key]?.brand || Object.keys(BRAND_GROUPS)[0] || 'amaran';}
function uiGroupForFixture(key=state.fixture){return fixtures[key]?.group || Object.keys(UI_GROUPS)[0] || '';}
function fixture(){return fixtures[state.fixture];}
function fillFixture(){return fixtures[state.fillFixture];}
function accessory(fixtureKey=state.fixture,accessoryKey=state.accessory){return fixtures[fixtureKey].accessories[accessoryKey];}
function fillAccessory(){return accessory(state.fillFixture,state.fillAccessory);}
function getPoints(fixtureKey=state.fixture,accessoryKey=state.accessory,cct=state.cct){const a=accessory(fixtureKey,accessoryKey);const keys=Object.keys(a.data).map(Number);const use=keys.includes(Number(cct))?Number(cct):(keys.includes(5600)?5600:keys[0]);return a.data[use];}
function ensureAccessoryAndCct(){const f=fixture(); if(!f.accessories[state.accessory]) state.accessory=f.defaultAccessory; const keys=Object.keys(accessory().data).map(Number); if(!keys.includes(state.cct)) state.cct=keys.includes(5600)?5600:keys[0];}
function ensureFillAccessoryAndCct(){const f=fillFixture(); if(!f)return; if(!f.accessories[state.fillAccessory]) state.fillAccessory=f.defaultAccessory; const keys=Object.keys(fillAccessory().data).map(Number); if(!keys.includes(state.fillCct)) state.fillCct=keys.includes(5600)?5600:keys[0];}

function bindUI(){
  els.keyModelPickerBtn.addEventListener('click',()=>openProjectorPicker('key'));
  els.fillModelPickerBtn.addEventListener('click',()=>openProjectorPicker('fill'));
  els.closeProjectorDialogBtn.addEventListener('click',closeProjectorPicker);
  els.projectorDialog.addEventListener('click',e=>{if(e.target===els.projectorDialog)closeProjectorPicker();});
  els.pickerBrandChoices.addEventListener('click',e=>{const b=e.target.closest('button[data-picker-brand]');if(!b)return;pickerBrand=b.dataset.pickerBrand;pickerFamily=BRAND_GROUPS[pickerBrand]?.[0]||'';renderProjectorPicker();});
  els.pickerFamilyChoices.addEventListener('click',e=>{const b=e.target.closest('button[data-picker-family]');if(!b)return;pickerFamily=b.dataset.pickerFamily;renderProjectorPicker();});
  els.pickerModelChoices.addEventListener('click',e=>{const b=e.target.closest('button[data-picker-fixture]');if(!b)return;selectProjectorFromPicker(b.dataset.pickerFixture);});

  els.accessoryGrid.addEventListener('click',e=>{const b=e.target.closest('button[data-accessory]');if(!b)return;state.accessory=b.dataset.accessory;ensureAccessoryAndCct();update();});
  els.cctGrid.addEventListener('click',e=>{const b=e.target.closest('button[data-cct]');if(!b)return;state.cct=Number(b.dataset.cct);update();});
  els.intensitySlider.addEventListener('input',()=>{state.intensityPct=Number(els.intensitySlider.value);update();});
  els.intensityValue.addEventListener('click',()=>openNumericEditor('intensity'));
  els.testDistanceValue.addEventListener('click',()=>openNumericEditor('distance'));
  els.fillIntensityValue.addEventListener('click',()=>openNumericEditor('fillIntensity'));
  els.fillDistanceValue.addEventListener('click',()=>openNumericEditor('fillDistance'));
  els.isoSelect.addEventListener('change',()=>{state.iso=Number(els.isoSelect.value);update();});
  els.apertureSelect.addEventListener('change',()=>{state.aperture=Number(els.apertureSelect.value);update();});
  els.shutterSelect.addEventListener('change',()=>{state.shutterDenom=Number(els.shutterSelect.value);update();});
  els.testDistanceSlider.addEventListener('input',()=>{state.testDistance=Number(els.testDistanceSlider.value);update();});

  els.enableFillBtn.addEventListener('click',()=>{state.fillEnabled=true;if(!fixtures[state.fillFixture]){state.fillFixture=state.fixture;state.fillAccessory=state.accessory;state.fillCct=state.cct;state.fillDistance=state.testDistance;}ensureFillAccessoryAndCct();els.fillDetails.open=true;update();});
  els.disableFillBtn.addEventListener('click',()=>{state.fillEnabled=false;update();});
  els.fillAccessoryGrid.addEventListener('click',e=>{const b=e.target.closest('button[data-fill-accessory]');if(!b)return;state.fillAccessory=b.dataset.fillAccessory;ensureFillAccessoryAndCct();update();});
  els.fillCctGrid.addEventListener('click',e=>{const b=e.target.closest('button[data-fill-cct]');if(!b)return;state.fillCct=Number(b.dataset.fillCct);update();});
  els.fillIntensitySlider.addEventListener('input',()=>{state.fillIntensityPct=Number(els.fillIntensitySlider.value);update();});
  els.fillDistanceSlider.addEventListener('input',()=>{state.fillDistance=Number(els.fillDistanceSlider.value);update();});

  els.gelTargetButtons?.addEventListener('click',e=>{
    const b=e.target.closest('button[data-gel-target]'); if(!b||b.disabled)return;
    state.gelTarget=b.dataset.gelTarget;
    if(state.gelTarget!=='none'){
      const targetCct=state.gelTarget==='fill'?state.fillCct:state.cct;
      if(targetCct<=3600) state.gelTransmissionSource='tungsten';
      else if(targetCct>=5000) state.gelTransmissionSource='daylight';
    }
    update();
  });
  els.gelSourceButtons?.addEventListener('click',e=>{
    const b=e.target.closest('button[data-gel-source]'); if(!b)return;
    state.gelTransmissionSource=b.dataset.gelSource;
    update();
  });


  els.numericDialogValidate?.addEventListener('click',applyNumericEditor);
  els.numericDialogInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyNumericEditor();}});
  els.numericDialog?.addEventListener('click',e=>{if(e.target===els.numericDialog)els.numericDialog.close();});

  els.resetBtn.addEventListener('click',reset);
  els.themeToggle?.addEventListener('click',()=>{const next=document.body.classList.contains('dark')?'light':'dark';try{localStorage.setItem('bg-set-tools-theme',next);}catch(_){}applyTheme(next);bosPublishSharedState();});
}

function openNumericEditor(kind){
  const configs={
    intensity:{title:'Intensité Key Light',unit:'%',min:0,max:100,step:1,get:()=>state.intensityPct,set:v=>{state.intensityPct=v;els.intensitySlider.value=v;}},
    distance:{title:'Distance Key Light',unit:'m',min:1,max:20,step:.1,get:()=>state.testDistance,set:v=>{state.testDistance=v;els.testDistanceSlider.value=v;}},
    fillIntensity:{title:'Intensité Fill Light',unit:'%',min:0,max:100,step:1,get:()=>state.fillIntensityPct,set:v=>{state.fillIntensityPct=v;els.fillIntensitySlider.value=v;}},
    fillDistance:{title:'Distance Fill Light',unit:'m',min:1,max:20,step:.1,get:()=>state.fillDistance,set:v=>{state.fillDistance=v;els.fillDistanceSlider.value=v;}}
  };
  numericEditConfig=configs[kind];
  if(!numericEditConfig)return;
  els.numericDialogTitle.textContent=numericEditConfig.title;
  els.numericDialogUnit.textContent=numericEditConfig.unit;
  els.numericDialogInput.min=numericEditConfig.min;
  els.numericDialogInput.max=numericEditConfig.max;
  els.numericDialogInput.step=numericEditConfig.step;
  els.numericDialogInput.value=numericEditConfig.get();
  if(typeof els.numericDialog.showModal==='function')els.numericDialog.showModal();else els.numericDialog.setAttribute('open','');
  setTimeout(()=>{els.numericDialogInput.focus();els.numericDialogInput.select();},30);
}
function applyNumericEditor(){
  if(!numericEditConfig)return;
  let v=Number(String(els.numericDialogInput.value).replace(',','.'));
  if(!Number.isFinite(v))return;
  v=Math.max(numericEditConfig.min,Math.min(numericEditConfig.max,v));
  if(numericEditConfig.step>=1)v=Math.round(v);
  else v=Math.round(v/numericEditConfig.step)*numericEditConfig.step;
  numericEditConfig.set(v);
  update();
  if(els.numericDialog.open&&typeof els.numericDialog.close==='function')els.numericDialog.close();else els.numericDialog.removeAttribute('open');
}


function formatGelPct(v){return `${Number(v).toFixed(1).replace('.',',').replace(',0','')} %`;}
function gelRemoteSwatchUrl(code){
  return `https://www.direct-digital.com/sites/default/files/Website-Stock-Image-Bank/GELMTC${code}%20-%2001.jpg`;
}
function renderGelFilters(){
  if(!els.gelFilterButtons) return;
  els.gelFilterButtons.innerHTML='';
  gelFilters.forEach(g=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='gel-chip'+(state.selectedGelId===g.id?' active':'');
    b.textContent=g.name;
    b.addEventListener('click',()=>{state.selectedGelId=g.id; updateGelPanel(); update();});
    els.gelFilterButtons.appendChild(b);
  });
}
function loadFirstImage(img, urls, onFail){
  const list=(urls||[]).filter(Boolean);
  let i=0;
  const next=()=>{
    if(i>=list.length){ img.onerror=null; img.removeAttribute('src'); img.hidden=true; onFail?.(); return; }
    const url=list[i++];
    img.onerror=next;
    img.onload=()=>{img.hidden=false;};
    img.src=url;
  };
  next();
}
function currentGel(){return gelFilters.find(x=>x.id===state.selectedGelId)||gelFilters[0];}
function gelTransmissionValue(){const g=currentGel();return state.gelTransmissionSource==='tungsten'?Number(g.tT):Number(g.tC);}
function gelTransmissionFactor(){const v=gelTransmissionValue();return Number.isFinite(v)&&v>=0?v/100:1;}
function gelFactorForTarget(target){return state.gelTarget===target?gelTransmissionFactor():1;}
function targetRawLux(target){
  if(target==='fill') return estimatedLuxAtDistance(state.fillDistance,state.fillFixture,state.fillIntensityPct,state.fillAccessory,state.fillCct);
  return estimatedLuxAtDistance(state.testDistance,state.fixture,state.intensityPct,state.accessory,state.cct);
}
function targetMaxDistance(target,reqLux,factor=1){
  const safe=Math.max(.0001,factor||1);
  if(target==='fill') return solveDistanceForLuxForConfig(reqLux/safe,state.fillFixture,state.fillAccessory,state.fillCct,state.fillIntensityPct);
  return solveDistanceForLuxForConfig(reqLux/safe,state.fixture,state.accessory,state.cct,state.intensityPct);
}
function renderGelImpact(){
  if(!els.gelImpactLux)return;
  const g=currentGel();
  const fillBtn=els.gelTargetButtons?.querySelector('[data-gel-target="fill"]');
  if(fillBtn) fillBtn.disabled=!state.fillEnabled;
  els.gelTargetButtons?.querySelectorAll('button[data-gel-target]').forEach(b=>b.classList.toggle('active',b.dataset.gelTarget===state.gelTarget));
  els.gelSourceButtons?.querySelectorAll('button[data-gel-source]').forEach(b=>b.classList.toggle('active',b.dataset.gelSource===state.gelTransmissionSource));
  const sourceLabel=state.gelTransmissionSource==='tungsten'?'Source Tungstène':'Source Daylight';
  const leeSourceLabel=state.gelTransmissionSource==='tungsten'?'Tungstène':'Daylight (Source C)';
  els.gelSourceHelp.textContent=`Transmission Y LEE utilisée : ${leeSourceLabel}. Pour une LED ou une CCT intermédiaire, LIGHT n’interpole pas entre les deux mesures constructeur.`;
  if(state.gelTarget==='none'){
    els.gelImpactTarget.textContent='Aucune source sélectionnée';
    els.gelImpactLux.textContent='—'; els.gelImpactLoss.textContent='—'; els.gelImpactDistance.textContent='—'; els.gelImpactTransmission.textContent='—';
    els.gelImpactNote.textContent='Choisis Key Light ou Fill Light pour appliquer la gélatine aux calculs de LIGHT.';
    return;
  }
  if(state.gelTarget==='fill'&&!state.fillEnabled){state.gelTarget='none';renderGelImpact();return;}
  const reqLux=requiredLux(state.iso,state.shutterDenom,state.aperture);
  const raw=targetRawLux(state.gelTarget), factor=gelTransmissionFactor(), filtered=raw*factor;
  const loss=factor>0?-Math.log2(factor):Infinity;
  const beforeD=targetMaxDistance(state.gelTarget,reqLux,1), afterD=targetMaxDistance(state.gelTarget,reqLux,factor);
  const label=state.gelTarget==='fill'?'FILL LIGHT':'KEY LIGHT';
  const cct=state.gelTarget==='fill'?state.fillCct:state.cct;
  els.gelImpactTarget.textContent=`${label} · ${cct} K · ${g.name}`;
  els.gelImpactLux.textContent=`${formatLux(raw)} → ${formatLux(filtered)} lux`;
  els.gelImpactLoss.textContent=Number.isFinite(loss)?`−${loss.toFixed(2).replace('.',',')} stop${loss>=1.5?'s':''}`:'—';
  els.gelImpactDistance.textContent=`${formatDistance(beforeD)} → ${formatDistance(afterD)} m`;
  els.gelImpactTransmission.textContent=`${formatGelPct(gelTransmissionValue())} · ${sourceLabel}`;
  els.gelImpactNote.textContent=state.gelTarget==='fill'?'La Fill filtrée est maintenant prise en compte dans le ratio Key / Fill ci-dessus.':'La gélatine est maintenant prise en compte dans le résultat et la distance maximale de la Key Light.';
}

function updateGelPanel(){
  if(!els.gelName) return;
  const g=gelFilters.find(x=>x.id===state.selectedGelId)||gelFilters[0];
  els.gelSummary.textContent=g.name;
  els.gelName.textContent=g.name;
  els.gelDescription.textContent=g.description;
  els.gelRef.textContent=g.ref;
  els.gelTransmissionC.textContent=formatGelPct(g.tC);
  els.gelTransmissionT.textContent=formatGelPct(g.tT);
  els.gelTemperature.textContent=g.temp;
  els.gelMired.textContent=g.mired;
  els.gelUse.textContent=g.use;
  els.gelSourceLink.href=g.sourceUrl;
  els.gelDataStatus.textContent=(g.temp==='Non communiqué')?'Transmission Y vérifiée sur la fiche LEE pour une source Daylight (Source C) et une source Tungstène. Température de conversion non communiquée par LEE pour ce filtre.':'Transmission Y, conversion et Mired Shift vérifiés sur la fiche LEE.';

  els.gelImageFallback.hidden=true;
  els.gelSwatchImage.alt=`Aplat couleur ${g.ref} ${g.name}`;
  const swatchCandidates=[g.localSwatch,gelRemoteSwatchUrl(g.code),...(g.swatchUrls||[])].filter(Boolean);
  loadFirstImage(els.gelSwatchImage,swatchCandidates,()=>{
    els.gelSwatchImage.hidden=true;
    els.gelImageFallback.hidden=false;
    els.gelImageFallback.textContent='Aperçu constructeur non chargé';
  });

  els.gelSpectrumImage.alt=`Courbe de transmission LEE ${g.ref} ${g.name}`;
  els.gelSpectrumSource.hidden=true;
  const spectrumCandidates=[g.localSpectrum,...(g.spectrumUrls||[])].filter(Boolean);
  loadFirstImage(els.gelSpectrumImage,spectrumCandidates,()=>{
    els.gelSpectrumSource.hidden=false;
    els.gelSpectrumSource.querySelector('strong').textContent=`Courbe ${g.ref} · LEE Filters`;
    els.gelSpectrumSource.querySelector('span').textContent='La courbe constructeur n’a pas pu être chargée. Utilise le lien vers la fiche LEE ci-dessous.';
  });
  renderGelFilters();
  renderGelImpact();
}

function applyTheme(theme){
  const isDark=theme==='dark'; document.body.classList.toggle('dark',isDark);
  if(els.themeToggle){els.themeToggle.textContent=isDark?'LIGHT':'DARK'; els.themeToggle.setAttribute('aria-label',isDark?'Passer en mode clair':'Passer en mode sombre');}
  els.themeColor?.setAttribute('content',isDark?'#0B0C0E':'#F3F1EC');
}
function reset(){const defaultFixture=fixtures.halo60x?'halo60x':Object.keys(fixtures)[0];const defaultAccessory=fixtures[defaultFixture]?.defaultAccessory||Object.keys(fixtures[defaultFixture]?.accessories||{})[0];Object.assign(state,{fixture:defaultFixture,accessory:defaultAccessory,cct:5600,intensityPct:100,iso:800,shutterDenom:50,aperture:2.8,testDistance:2,fillEnabled:false,fillFixture:defaultFixture,fillAccessory:defaultAccessory,fillCct:5600,fillIntensityPct:50,fillDistance:2,selectedGelId:'lee204',gelTarget:'none',gelTransmissionSource:'daylight'});try{localStorage.removeItem(STORAGE_KEY);}catch(_){}els.intensitySlider.value=100;els.isoSelect.value=800;els.apertureSelect.value=2.8;els.shutterSelect.value=50;els.testDistanceSlider.value=2;els.fillIntensitySlider.value=50;els.fillDistanceSlider.value=2;document.querySelectorAll('details.collapsible-card').forEach(d=>d.open=false);update();}

function update(){
  ensureAccessoryAndCct(); ensureFillAccessoryAndCct();
  renderAccessoryButtons(); renderCctButtons();
  renderFillState();

  const reqLux=requiredLux(state.iso,state.shutterDenom,state.aperture);
  const keyGelFactor=gelFactorForTarget('key');
  const maxD=state.intensityPct<=0?0:solveDistanceForLuxForConfig(reqLux/Math.max(.0001,keyGelFactor),state.fixture,state.accessory,state.cct,state.intensityPct);

  els.intensityValue.textContent=`${state.intensityPct} %`;
  els.testDistanceValue.textContent=`${formatDistance(state.testDistance)} m`;
  els.maxDistance.textContent=maxD>0?formatDistance(maxD):'0,0';
  if(els.resultDistanceSummary) els.resultDistanceSummary.textContent=`Distance possible : ${maxD>0?formatDistance(maxD):'0,0'} m`;
  els.cameraSummary.textContent=`ISO ${state.iso} · f/${formatAperture(state.aperture)} · 1/${state.shutterDenom}`;
  if(els.cameraHeadingMeta) els.cameraHeadingMeta.textContent=els.cameraSummary.textContent;

  const brandLabel=BRAND_LABELS[brandForFixture()]||brandForFixture();
  const modelLabel=fixture().label.replace(new RegExp('^'+escapeRegex(brandLabel)+'\\s+','i'),'');
  els.lightSummary.textContent=`${brandLabel} · ${modelLabel} · ${accessoryUiLabel()}`;
  els.keyModelPickerLabel.textContent=fixture().label;
  els.heroSummary.textContent=`${fixture().label} · ${accessoryUiLabel()} · ${state.intensityPct} %${state.gelTarget==='key'?` · ${currentGel().name}`:''} · ISO max ${state.iso} · f/${formatAperture(state.aperture)} · 1/${state.shutterDenom}`;
  els.beamHint.textContent=modifierHint();

  updateDistanceStatus(reqLux,maxD);
  updateManufacturerTech({sourceDescriptor:els.keyTechSourceDescriptor,measurementRow:els.keyTechMeasurementRow}, {fixtureKey:state.fixture,accessoryKey:state.accessory,cct:state.cct});
  updateResultTech({lux:els.resultTechLux,margin:els.resultTechMargin,requiredIso:els.resultTechRequiredIso,possibleAperture:els.resultTechPossibleAperture,dataNote:els.resultTechDataNote}, {fixtureKey:state.fixture,accessoryKey:state.accessory,cct:state.cct,intensityPct:state.intensityPct,distance:state.testDistance,gelFactor:keyGelFactor}, reqLux);
  updateFillContrast();
  renderGelImpact();
  if(state.fillEnabled){
    updateManufacturerTech({sourceDescriptor:els.fillTechSourceDescriptor,measurementRow:els.fillTechMeasurementRow}, {fixtureKey:state.fillFixture,accessoryKey:state.fillAccessory,cct:state.fillCct});
  }
  persistState();
  bosPublishSharedState();
}


function renderFillState(){
  els.fillDisabled.hidden=state.fillEnabled;
  els.fillControls.hidden=!state.fillEnabled;
  els.contrastSection.hidden=!state.fillEnabled;
  if(!state.fillEnabled){els.fillSummary.textContent='Désactivée'; return;}
  renderFillAccessoryButtons(); renderFillCctButtons();
  els.fillIntensitySlider.value=state.fillIntensityPct;
  els.fillDistanceSlider.value=state.fillDistance;
  els.fillIntensityValue.textContent=`${state.fillIntensityPct} %`;
  els.fillDistanceValue.textContent=`${formatDistance(state.fillDistance)} m`;
  const brandLabel=BRAND_LABELS[brandForFixture(state.fillFixture)]||brandForFixture(state.fillFixture);
  const modelLabel=fillFixture().label.replace(new RegExp('^'+escapeRegex(brandLabel)+'\\s+','i'),'');
  els.fillSummary.textContent=`${brandLabel} · ${modelLabel} · ${accessoryUiLabel(state.fillAccessory,fillAccessory())}${state.gelTarget==='fill'?` · ${currentGel().name}`:''}`;
  els.fillModelPickerLabel.textContent=fillFixture().label;
}
function openProjectorPicker(target){
  pickerTarget=target;
  const currentKey=target==='fill'?state.fillFixture:state.fixture;
  pickerBrand=brandForFixture(currentKey);
  pickerFamily=uiGroupForFixture(currentKey);
  els.projectorDialogTitle.textContent='Changer de projecteur';
  els.projectorChooserContext.textContent=target==='fill'?'Fill Light':'Key Light';
  renderProjectorPicker();
  if(typeof els.projectorDialog.showModal==='function')els.projectorDialog.showModal();else els.projectorDialog.setAttribute('open','');
}
function closeProjectorPicker(){if(els.projectorDialog.open&&typeof els.projectorDialog.close==='function')els.projectorDialog.close();else els.projectorDialog.removeAttribute('open');}
function renderProjectorPicker(){
  const brandKeys=Object.keys(BRAND_GROUPS).filter(key=>BRAND_GROUPS[key]?.length);
  if(!brandKeys.includes(pickerBrand))pickerBrand=brandKeys[0]||'';
  const families=BRAND_GROUPS[pickerBrand]||[];
  if(!families.includes(pickerFamily))pickerFamily=families[0]||'';
  const currentKey=pickerTarget==='fill'?state.fillFixture:state.fixture;
  els.pickerBrandChoices.innerHTML=brandKeys.map(key=>`<button class="choice-btn ${key===pickerBrand?'active':''}" data-picker-brand="${key}" type="button">${BRAND_LABELS[key]}</button>`).join('');
  els.pickerFamilyChoices.innerHTML=families.map(key=>`<button class="choice-btn ${key===pickerFamily?'active':''}" data-picker-family="${key}" type="button">${GROUP_LABELS[key]}</button>`).join('');
  const models=UI_GROUPS[pickerFamily]||[];
  els.pickerModelChoices.innerHTML=models.map(key=>`<button class="choice-btn ${key===currentKey?'active':''}" data-picker-fixture="${key}" type="button">${POWER_LABELS[key]}</button>`).join('');
  els.pickerCatalogCount.textContent=`${DATABASE_INFO.fixtureCount} modèles utilisables dans LIGHT · ${DATABASE_INFO.totalFixtureCount} projecteurs dans BOS-PROJECTEURS-DB`;
}
function selectProjectorFromPicker(key){
  if(!fixtures[key])return;
  if(pickerTarget==='fill'){
    state.fillFixture=key;
    state.fillAccessory=fixtures[key].defaultAccessory;
    ensureFillAccessoryAndCct();
  }else{
    state.fixture=key;
    state.accessory=fixtures[key].defaultAccessory;
    ensureAccessoryAndCct();
  }
  closeProjectorPicker();
  update();
}

function renderAccessoryButtons(){const entries=Object.entries(fixture().accessories); els.accessoryGrid.style.gridTemplateColumns=`repeat(${Math.min(entries.length,3)},minmax(0,1fr))`; els.accessoryGrid.innerHTML=entries.map(([key,a])=>`<button data-accessory="${key}" class="${key===state.accessory?'active':''}" type="button">${accessoryUiLabel(key,a).toUpperCase()}</button>`).join(''); const a=accessory(); const notes=[]; if(a.quality==='single')notes.push('Ce mode repose sur un seul point constructeur : la distance est donc une estimation plus large.'); if(a.quality==='estimated')notes.push(`≈ ${a.estimateBasis || 'Valeur extrapolée : aucune photométrie constructeur n’est publiée pour ce modificateur.'}`); if(a.note)notes.push(a.note); if(fixture().note)notes.push(fixture().note); els.accessoryNote.textContent=notes.join(' ');}
function renderFillAccessoryButtons(){const entries=Object.entries(fillFixture().accessories); els.fillAccessoryGrid.style.gridTemplateColumns=`repeat(${Math.min(entries.length,3)},minmax(0,1fr))`; els.fillAccessoryGrid.innerHTML=entries.map(([key,a])=>`<button data-fill-accessory="${key}" class="${key===state.fillAccessory?'active':''}" type="button">${accessoryUiLabel(key,a).toUpperCase()}</button>`).join(''); const a=fillAccessory(), notes=[]; if(a.quality==='single')notes.push('Ce mode repose sur un seul point constructeur : la distance est donc une estimation plus large.'); if(a.quality==='estimated')notes.push(`≈ ${a.estimateBasis || 'Valeur extrapolée : aucune photométrie constructeur n’est publiée pour ce modificateur.'}`); if(a.note)notes.push(a.note); if(fillFixture().note)notes.push(fillFixture().note); els.fillAccessoryNote.textContent=notes.join(' ');}
function renderCctButtons(){const keys=Object.keys(accessory().data).map(Number).sort((a,b)=>a-b), isSingle=keys.length===1; els.cctSection.hidden=false; els.cctValue.textContent=`${state.cct} K`; els.cctGrid.style.gridTemplateColumns=`repeat(${Math.min(keys.length,6)},minmax(0,1fr))`; els.cctGrid.innerHTML=keys.map(k=>`<button data-cct="${k}" class="${k===state.cct?'active':''}" type="button">${k}</button>`).join(''); els.cctNote.textContent=isSingle?'Une seule température de référence est disponible dans les données publiées pour cette configuration.':'';}
function renderFillCctButtons(){const keys=Object.keys(fillAccessory().data).map(Number).sort((a,b)=>a-b), isSingle=keys.length===1; els.fillCctSection.hidden=false; els.fillCctValue.textContent=`${state.fillCct} K`; els.fillCctGrid.style.gridTemplateColumns=`repeat(${Math.min(keys.length,6)},minmax(0,1fr))`; els.fillCctGrid.innerHTML=keys.map(k=>`<button data-fill-cct="${k}" class="${k===state.fillCct?'active':''}" type="button">${k}</button>`).join(''); els.fillCctNote.textContent=isSingle?'Une seule température de référence est disponible dans les données publiées pour cette configuration.':'';}

function requiredLux(iso,shutterDenom,aperture){const t=1/shutterDenom;return INCIDENT_C*aperture*aperture/(iso*t);}
function curveLux(distance,points){const d=Math.max(.05,distance); if(points.length===1){const [d1,e1]=points[0];return e1*Math.pow(d1/d,2);} let a,b;if(d<=points[0][0])[a,b]=[points[0],points[1]];else if(d>=points[points.length-1][0])[a,b]=[points[points.length-2],points[points.length-1]];else{for(let i=0;i<points.length-1;i++){if(d>=points[i][0]&&d<=points[i+1][0]){a=points[i];b=points[i+1];break;}}} const [d1,e1]=a,[d2,e2]=b;const exponent=Math.log(e2/e1)/Math.log(d2/d1);return e1*Math.pow(d/d1,exponent);}
function estimatedLuxAtDistance(distance,fixtureKey=state.fixture,intensityPct=state.intensityPct,accessoryKey=null,cct=state.cct){if(intensityPct<=0)return 0; const aKey=accessoryKey||state.accessory; const points=getPoints(fixtureKey,aKey,cct); return curveLux(distance,points)*(intensityPct/100);}
function solveDistanceForLuxForConfig(targetLux,fixtureKey,accessoryKey,cct,intensityPct){if(intensityPct<=0)return 0; if(estimatedLuxAtDistance(.1,fixtureKey,intensityPct,accessoryKey,cct)<targetLux)return 0; let lo=.1,hi=1; while(estimatedLuxAtDistance(hi,fixtureKey,intensityPct,accessoryKey,cct)>targetLux&&hi<200)hi*=2; if(hi>=200&&estimatedLuxAtDistance(hi,fixtureKey,intensityPct,accessoryKey,cct)>targetLux)return 200; for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(estimatedLuxAtDistance(mid,fixtureKey,intensityPct,accessoryKey,cct)>=targetLux)lo=mid;else hi=mid;} return (lo+hi)/2;}

function updateDistanceStatus(reqLux,maxD){
  const d=state.testDistance,lux=estimatedLuxAtDistance(d)*gelFactorForTarget('key'),margin=lux>0?Math.log2(lux/reqLux):-Infinity,reqIso=lux>0?INCIDENT_C*state.aperture*state.aperture/(lux*(1/state.shutterDenom)):Infinity,possibleF=lux>0?Math.sqrt(lux*state.iso*(1/state.shutterDenom)/INCIDENT_C):0;
  els.statusBox.classList.remove('comfortable','just','insufficient');
  els.resultHeroCard?.classList.remove('status-comfortable','status-just','status-insufficient');
  let title,text,cls;
  if(state.intensityPct<=0||lux<=0){cls='insufficient';title='SOURCE ÉTEINTE';text='Le projecteur est à 0 %. Monte sa puissance pour commencer le calcul.';}
  else if(margin>=.7){cls='comfortable';title='CONFORTABLE';text=`À ${formatDistance(d)} m, la lumière reçue au niveau du sujet suffit pour tes réglages caméra, avec encore de la marge.`;}
  else if(margin>=0){cls='just';title='ÇA PASSE';text=`À ${formatDistance(d)} m, tu atteins l’exposition de référence avec tes réglages caméra, mais avec peu de marge.`;}
  else{cls='insufficient';title='PAS ASSEZ DE LUMIÈRE';text=`À ${formatDistance(d)} m, la lumière reçue au niveau du sujet est insuffisante pour tes réglages caméra.`;}
  els.statusBox.classList.add(cls); if(els.resultHeroCard) els.resultHeroCard.classList.add(`status-${cls}`); els.statusTitle.textContent=title; els.statusText.textContent=text;
  const solutions=[];
  if(state.intensityPct<=0){els.solutionIntro.textContent='Pour obtenir une exposition de référence, commence par :'; solutions.push(['MONTE LA PUISSANCE','au-dessus de 0 %']);}
  else if(margin>=0){ if(maxD>d+.1)solutions.push(['TU PEUX RECULER',`jusqu’à ${formatDistance(maxD)} m`]); const targetPct=state.intensityPct*reqLux/lux; if(targetPct<state.intensityPct-3&&targetPct>=1)solutions.push(['TU PEUX DIMMER',`vers ${Math.max(1,Math.round(targetPct))} %`]); const closeF=snapApertureForClosing(possibleF,state.aperture); if(closeF)solutions.push(['TU PEUX FERMER',`jusqu’à environ f/${formatAperture(closeF)}`]); els.solutionIntro.textContent=solutions.length?'Tu es dans la bonne zone. Si tu veux modifier ton installation :':'Tu es dans la bonne zone.'; }
  else{
    els.solutionIntro.textContent=`Pour obtenir une bonne exposition à ${formatDistance(d)} m, change au moins un de ces réglages :`;
    if(maxD>0)solutions.push(['RAPPROCHE TA SOURCE',maxD>=1?`place-la à ${formatDistance(maxD)} m ou moins`:'il faudrait moins de 1 m']);
    const neededPct=lux>0?state.intensityPct*reqLux/lux:Infinity;if(state.intensityPct<100&&neededPct<=100)solutions.push(['MONTE LA PUISSANCE',`vers ${Math.ceil(neededPct)} %`]);
    const openF=snapApertureForOpening(possibleF,state.aperture);if(openF)solutions.push(['OUVRE TON DIAPH',`passe à f/${formatAperture(openF)} ou plus ouvert`]);
    if(Number.isFinite(reqIso)&&reqIso>state.iso){const isoStep=snapIsoUp(reqIso);solutions.push(['MONTE TON ISO',isoStep?`passe à environ ISO ${isoStep}`:`il faudrait environ ISO ${formatIso(reqIso)}`]);}
    const stronger=findStrongerFixture(reqLux/Math.max(.0001,gelFactorForTarget('key')),d);if(stronger)solutions.push(['PRENDS PLUS PUISSANT',`passe au ${fixtures[stronger].label}`]);
  }
  els.solutions.innerHTML=solutions.slice(0,4).map(([l,v])=>`<div class="solution"><span>${l}</span><strong>${v}</strong></div>`).join('');
}

function updateManufacturerTech(ui,cfg){
  const fixtureObj=fixtures[cfg.fixtureKey];
  const accessoryObj=fixtureObj.accessories[cfg.accessoryKey];
  const points=getPoints(cfg.fixtureKey,cfg.accessoryKey,cfg.cct);
  const cctLabel=accessoryObj.quality==='single'?'sortie max publiée':`${cfg.cct} K`;
  if(ui.sourceDescriptor) ui.sourceDescriptor.textContent=`${fixtureObj.label} · ${accessoryObj.label} · ${cctLabel} · à 100 %`;
  if(ui.measurementRow) ui.measurementRow.innerHTML=points.map(([md,mlux])=>`<span class="measure-inline"><b>${md} m</b><strong>${formatLux(mlux)} lux</strong></span>`).join('');
}

function updateResultTech(ui,cfg,reqLux){
  const accessoryObj=fixtures[cfg.fixtureKey].accessories[cfg.accessoryKey];
  const points=getPoints(cfg.fixtureKey,cfg.accessoryKey,cfg.cct);
  const gelFactor=cfg.gelFactor||1;
  const lux=estimatedLuxAtDistance(cfg.distance,cfg.fixtureKey,cfg.intensityPct,cfg.accessoryKey,cfg.cct)*gelFactor;
  const margin=lux>0?Math.log2(lux/reqLux):-Infinity;
  const reqIso=lux>0?INCIDENT_C*state.aperture*state.aperture/(lux*(1/state.shutterDenom)):Infinity;
  const possibleF=lux>0?Math.sqrt(lux*state.iso*(1/state.shutterDenom)/INCIDENT_C):0;
  ui.lux.textContent=`${formatLux(lux)} lux`;
  ui.margin.textContent=Number.isFinite(margin)?`${margin>=0?'+':''}${margin.toFixed(1).replace('.',',')} stop${Math.abs(margin)>=1.5?'s':''}`:'—';
  ui.requiredIso.textContent=Number.isFinite(reqIso)?`ISO ${formatIso(reqIso)}`:'—';
  ui.possibleAperture.textContent=possibleF>0?`f/${formatAperture(possibleF)}`:'—';
  const maxD=solveDistanceForLuxForConfig(reqLux/Math.max(.0001,gelFactor),cfg.fixtureKey,cfg.accessoryKey,cfg.cct,cfg.intensityPct);
  const rangeAtTest=classifyDistance(cfg.distance,points,accessoryObj.quality);
  const rangeAtMax=classifyDistance(maxD,points,accessoryObj.quality);
  const warning=rangeAtTest.warning||rangeAtMax.warning;
  if(accessoryObj.quality==='estimated') ui.dataNote.textContent='Cette configuration utilise une estimation pour le modificateur sélectionné.';
  else if(accessoryObj.quality==='single') ui.dataNote.textContent='Le calcul de distance repose sur un seul point photométrique disponible ; la distance est donc une estimation.';
  else if(warning) ui.dataNote.textContent=`Une partie du calcul sort de la plage mesurée (${rangeAtTest.label.toLowerCase()} / distance max : ${rangeAtMax.label.toLowerCase()}).`;
  else ui.dataNote.textContent='La distance testée et la distance maximale restent dans la plage photométrique disponible.';
  ui.dataNote.classList.toggle('warning',warning||accessoryObj.quality==='single'||accessoryObj.quality==='estimated');
  if(gelFactor<.999){ui.dataNote.textContent+=` Gélatine ${currentGel().name} appliquée · Transmission Y ${state.gelTransmissionSource==='tungsten'?'source Tungstène':'source Daylight'} : ${formatGelPct(gelTransmissionValue())}.`;}
}

function updateLightTechLegacy(ui,cfg,reqLux){
  const fixtureObj=fixtures[cfg.fixtureKey];
  const accessoryObj=fixtureObj.accessories[cfg.accessoryKey];
  const points=getPoints(cfg.fixtureKey,cfg.accessoryKey,cfg.cct);
  const gelFactor=cfg.gelFactor||1;
  const lux=estimatedLuxAtDistance(cfg.distance,cfg.fixtureKey,cfg.intensityPct,cfg.accessoryKey,cfg.cct)*gelFactor;
  const margin=lux>0?Math.log2(lux/reqLux):-Infinity;
  const reqIso=lux>0?INCIDENT_C*state.aperture*state.aperture/(lux*(1/state.shutterDenom)):Infinity;
  const possibleF=lux>0?Math.sqrt(lux*state.iso*(1/state.shutterDenom)/INCIDENT_C):0;
  ui.lux.textContent=`${formatLux(lux)} lux`;
  ui.margin.textContent=Number.isFinite(margin)?`${margin>=0?'+':''}${margin.toFixed(1).replace('.',',')} stop${Math.abs(margin)>=1.5?'s':''}`:'—';
  ui.requiredIso.textContent=Number.isFinite(reqIso)?`ISO ${formatIso(reqIso)}`:'—';
  ui.possibleAperture.textContent=possibleF>0?`f/${formatAperture(possibleF)}`:'—';
  const cctLabel=accessoryObj.quality==='single'?'sortie max publiée':`${cfg.cct} K`;
  ui.sourceDescriptor.textContent=`${fixtureObj.label} · ${accessoryObj.label} · ${cctLabel} · à 100 %`;
  ui.measurementRow.innerHTML=points.map(([md,mlux])=>`<div class="measure-chip"><span>${md} m</span><strong>${formatLux(mlux)} lux</strong></div>`).join('');
  const rangeAtTest=classifyDistance(cfg.distance,points,accessoryObj.quality);
  const maxD=solveDistanceForLuxForConfig(reqLux/Math.max(.0001,gelFactor),cfg.fixtureKey,cfg.accessoryKey,cfg.cct,cfg.intensityPct);
  const rangeAtMax=classifyDistance(maxD,points,accessoryObj.quality);
  const warning=rangeAtTest.warning||rangeAtMax.warning;
  if(accessoryObj.quality==='estimated') ui.dataNote.textContent=`ESTIMATION MODIFICATEUR — ${accessoryObj.estimateBasis || 'Aucune mesure constructeur directe pour cette configuration.'} ${accessoryObj.estimateWarning || ''}`;
  else if(accessoryObj.quality==='single') ui.dataNote.textContent='Un seul point constructeur est publié pour ce mode. LIGHT applique une décroissance en carré inverse : considère la distance comme une estimation, pas comme une mesure constructeur complète.';
  else ui.dataNote.textContent=warning?`Une partie du calcul sort de la plage mesurée (${rangeAtTest.label.toLowerCase()} / distance max : ${rangeAtMax.label.toLowerCase()}).`:'La distance testée et la distance max restent dans la plage de mesures constructeur ; LIGHT interpole entre les points publiés.';
  ui.dataNote.classList.toggle('warning',warning||accessoryObj.quality==='single'||accessoryObj.quality==='estimated');
  const src=DATABASE_INFO.source==='remote'?'base commune en ligne':DATABASE_INFO.source==='local'?'copie locale de secours':DATABASE_INFO.source;
  ui.databaseNote.textContent=`BOS-PROJECTEURS-DB v${DATABASE_INFO.version} · ${DATABASE_INFO.fixtureCount} projecteurs calculables / ${DATABASE_INFO.totalFixtureCount} au total · ${src} · mise à jour ${DATABASE_INFO.updated}`;
  if(cfg.intensityPct===100){ui.dimmerNote.textContent=fixtureObj.note?`Puissance 100 % : ${fixtureObj.note}`:'Puissance 100 % : les points de départ sont les mesures publiées par le constructeur.';ui.dimmerNote.classList.remove('warning');}
  else{ui.dimmerNote.textContent='Sous 100 %, LIGHT estime les lux proportionnellement au dimmer. Cette partie est moins fiable faute de courbe constructeur détaillée par pourcentage.';ui.dimmerNote.classList.add('warning');}
  ui.labBadge.textContent=accessoryObj.quality==='estimated'?'ESTIMATION':(BRAND_LABELS[brandForFixture(cfg.fixtureKey)]||brandForFixture(cfg.fixtureKey)).toUpperCase();
  ui.labBadge.classList.toggle('estimate-badge',accessoryObj.quality==='estimated');
}
function classifyDistance(distance,points,quality){if(!Number.isFinite(distance)||distance<=0)return{label:'source éteinte',warning:true};if(quality==='estimated')return{label:'estimation modificateur',warning:true};if(quality==='single')return{label:'estimation depuis 1 point',warning:true};const min=points[0][0],max=points[points.length-1][0];if(distance<min)return{label:`extrapolation < ${min} m`,warning:true};if(distance>max)return{label:`extrapolation > ${max} m`,warning:true};return{label:'interpolation constructeur',warning:false};}

function updateFillContrast(){
  if(!state.fillEnabled) return;
  const keyLux=estimatedLuxAtDistance(state.testDistance)*gelFactorForTarget('key');
  const fillLux=estimatedLuxAtDistance(state.fillDistance,state.fillFixture,state.fillIntensityPct,state.fillAccessory,state.fillCct)*gelFactorForTarget('fill');
  els.keyLuxResult.textContent=`${formatLux(keyLux)} lux`;
  els.fillLuxResult.textContent=`${formatLux(fillLux)} lux`;
  if(fillLux<=0){
    els.sourceGapResult.textContent='∞';
    els.sourceGapDetail.textContent='Fill éteinte';
    els.sourceRatioResult.textContent='∞ : 1';
    els.estimatedContrastResult.textContent='∞ · contraste non limité par la Fill';
    els.contrastCharacter.textContent='TRÈS CONTRASTÉ';
    return;
  }
  const q=keyLux/fillLux;
  let gapText, detail, gapStops=0;
  if(keyLux<=0){
    gapText='−∞';
    detail='Key éteinte';
  } else {
    const gap=Math.log2(q);
    gapStops=Math.abs(gap);
    gapText=`${gap>=0?'+':'−'}${Math.abs(gap).toFixed(1).replace('.',',')} stop${Math.abs(gap)>=1.5?'s':''}`;
    if(Math.abs(gap)<.05) detail='Niveaux pratiquement identiques';
    else if(gap>0) detail=`Key ${formatRatio(q)}× plus forte`;
    else detail=`Fill ${formatRatio(1/q)}× plus forte`;
  }
  const sourceRatio=q>=1?`${formatRatio(q)} : 1`:`1 : ${formatRatio(1/q)}`;
  const contrastRatio=1+q, contrastStops=Math.log2(contrastRatio);
  const character=gapStops<0.5?'FLAT':contrastStops<1.5?'DOUX':contrastStops<2.5?'MARQUÉ':contrastStops<4?'FORT':'TRÈS CONTRASTÉ';
  els.sourceGapResult.textContent=gapText;
  els.sourceGapDetail.textContent=detail;
  els.sourceRatioResult.textContent=sourceRatio;
  els.estimatedContrastResult.textContent=`≈ ${formatRatio(contrastRatio)} : 1 · ${contrastStops.toFixed(1).replace('.',',')} stops`;
  els.contrastCharacter.textContent=character;
}

function snapApertureForOpening(maxF,currentF){if(!Number.isFinite(maxF)||maxF<=0||maxF>=currentF)return null;const valid=APERTURES.filter(f=>f<=maxF&&f<currentF);return valid.length?valid[valid.length-1]:null;}
function snapApertureForClosing(maxF,currentF){if(!Number.isFinite(maxF)||maxF<=currentF)return null;const valid=APERTURES.filter(f=>f<=maxF&&f>currentF);return valid.length?valid[valid.length-1]:null;}
function snapIsoUp(requiredIso){return ISO_VALUES.find(v=>v>=requiredIso)||null;}
function accessoryRole(key,a){if(a?.role)return a.role;if(key==='bare')return'bare';if(key.toLowerCase().includes('reflector'))return'reflector';if(['reflector','miniReflector'].includes(key))return'reflector';if(key.includes('softbox')||key.includes('dome'))return'softbox';if(key.toLowerCase().includes('spot'))return'fresnelSpot';if(key.toLowerCase().includes('flood'))return'fresnelFlood';return key;}
function currentAccessoryRole(){return accessoryRole(state.accessory,accessory());}
function findAccessoryByRole(fixtureKey,role){const entries=Object.entries(fixtures[fixtureKey].accessories);return entries.find(([k,a])=>accessoryRole(k,a)===role)?.[0]||null;}
function findStrongerFixture(reqLux,distance){const group=uiGroupForFixture(),order=UI_GROUPS[group]||[],idx=order.indexOf(state.fixture),role=currentAccessoryRole(); for(let i=idx+1;i<order.length;i++){const key=order[i],candidateAccessory=findAccessoryByRole(key,role);if(candidateAccessory&&estimatedLuxAtDistance(distance,key,100,candidateAccessory)>=reqLux)return key;} return null;}
function accessoryUiLabel(key=state.accessory,a=accessory()){const role=accessoryRole(key,a); if(role==='reflector') return a.quality==='estimated'?'Bol ≈':'Bol'; return a.label;}
function modifierHint(){const a=accessory(), role=currentAccessoryRole(), label=accessoryUiLabel(); if(role==='reflector') return 'Avec bol — faisceau concentré'; if(role==='softbox') return `Avec ${label} — faisceau large et diffus`; if(role==='bare') return 'Nu — faisceau natif du projecteur'; if(role==='fresnelSpot') return `Avec ${label} — faisceau étroit et concentré`; if(role==='fresnelFlood') return `Avec ${label} — faisceau élargi`; if(role==='grid') return `Avec ${label} — faisceau contrôlé`; return label;}
function formatRatio(v){if(!Number.isFinite(v))return'∞';if(v===0)return'0';const r=Math.round(v);if(Math.abs(v-r)<.05)return String(r);return (v>=10?v.toFixed(0):v.toFixed(1)).replace('.',',');}
function formatLux(v){if(!Number.isFinite(v))return'—';if(v>=100)return Math.round(v).toLocaleString('fr-FR');if(v>=10)return v.toFixed(1).replace('.',',');return v.toFixed(2).replace('.',',');}
function formatDistance(v){if(!Number.isFinite(v))return'—';if(v>=20)return v.toFixed(0).replace('.',',');return v.toFixed(1).replace('.',',');}
function formatAperture(v){if(!Number.isFinite(v))return'—';return v.toFixed(1).replace(/\.0$/,'').replace('.',',');}
function formatIso(v){if(!Number.isFinite(v))return'—';if(v>=1000)return Math.round(v/10)*10;return Math.max(1,Math.round(v));}
function escapeRegex(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}



const projectContactBtn=document.getElementById('projectContactBtn');
if(projectContactBtn){
  projectContactBtn.addEventListener('click',()=>{
    window.open('https://www.brunoguillard.com/','_blank','noopener');
  });
}

const ideaContactBtn=document.getElementById('ideaContactBtn');
if(ideaContactBtn){
  ideaContactBtn.addEventListener('click',()=>{
    window.location.href='mailto:brunoguillardcontact@gmail.com?subject=Une%20id%C3%A9e%20pour%20am%C3%A9liorer%20LIGHT%20%E2%80%94%20Bruno%20OnSet&body=Bonjour%20Bruno%2C%0A%0AJ%E2%80%99ai%20une%20id%C3%A9e%20pour%20am%C3%A9liorer%20LIGHT%20%3A%0A%0A';
  });
}

let bosDeferredInstallPrompt=null;
const installAppBtn=document.getElementById('installAppBtn');
window.addEventListener('beforeinstallprompt',(event)=>{
  event.preventDefault();
  bosDeferredInstallPrompt=event;
  if(installAppBtn) installAppBtn.hidden=false;
});
if(installAppBtn){
  installAppBtn.addEventListener('click',async()=>{
    if(bosDeferredInstallPrompt){
      bosDeferredInstallPrompt.prompt();
      try{await bosDeferredInstallPrompt.userChoice;}catch(_){}
      bosDeferredInstallPrompt=null;
      return;
    }
    const ua=navigator.userAgent||'';
    if(/iPhone|iPad|iPod/i.test(ua)) alert('Sur iPhone/iPad : Partager → Sur l’écran d’accueil.');
    else alert('Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».');
  });
}
window.addEventListener('appinstalled',()=>{if(installAppBtn) installAppBtn.hidden=true;});


const bosBackBtn=document.getElementById('bosBackBtn');
if(bosBackBtn){
  bosBackBtn.addEventListener('click',()=>{
    bosPublishSharedState();
    try{sessionStorage.setItem('bos-cockpit-returning','1');}catch(_){ }
  });
}

window.addEventListener('pageshow',()=>{
  if(!bosSharedReady) return;
  if(bosApplySharedState()){
    populateSelect(els.isoSelect,ISO_VALUES,v=>`ISO ${v}`,state.iso);
    populateSelect(els.apertureSelect,APERTURES,v=>`f/${formatAperture(v)}`,state.aperture);
    populateSelect(els.shutterSelect,SHUTTER_DENOMS,v=>`1/${v}`,state.shutterDenom);
    els.testDistanceSlider.value=state.testDistance;
    update();
  }
});

if('serviceWorker' in navigator && location.protocol!=='file:'){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('../../sw.js?v=74',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
  });
}

