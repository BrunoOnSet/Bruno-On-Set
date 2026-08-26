// BOS-PROJECTEURS-DB loader — source commune de référence pour les projecteurs BOS
// Ordre : base centrale GitHub, puis copie locale de secours issue de la même DB.
(function(){
  const REMOTE_URL = 'https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json';
  const LOCAL_URL = '../data/lights.json';

  function validate(db){
    if(!db || typeof db !== 'object') throw new Error('BOS-PROJECTEURS-DB invalide');
    if(!Array.isArray(db.fixtures)) throw new Error('fixtures manquant dans BOS-PROJECTEURS-DB');
    if(!db.calculatorUi || !db.calculatorUi.groups) throw new Error('calculatorUi manquant dans BOS-PROJECTEURS-DB');
    return db;
  }

  async function fetchJson(url){
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return validate(await res.json());
  }

  async function load(){
    try{
      const db=await fetchJson(REMOTE_URL);
      return {db, source:'remote', url:REMOTE_URL};
    }catch(remoteError){
      try{
        const db=await fetchJson(LOCAL_URL);
        return {db, source:'local', url:LOCAL_URL, remoteError:String(remoteError)};
      }catch(localError){
        throw new Error(`Impossible de charger BOS-PROJECTEURS-DB (${remoteError}; ${localError})`);
      }
    }
  }

  window.BOSProjecteursDB={REMOTE_URL,LOCAL_URL,load,validate};
})();
