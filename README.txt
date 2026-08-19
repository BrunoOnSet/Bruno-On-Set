BOS — Bruno OnSet V1
====================

Prototype du cockpit BOS.

Modules V1 :
- EXPO : 2 verrouillés + 1 manuel + 1 auto, bouton BASE et compensation automatique.
- FRAME : caméra/focale communes + aperçu relatif. Liaison au calibrage FRAME à connecter.
- DOF : diaph + distance, calcul PDC avec caméra/focale communes.
- LIGHT : interface 100 % / 5600 K / nu et lux 1 m / 3 m. Valeurs de démonstration à remplacer par la database LIGHT.
- MEDIA : débit + capacité carte + temps d'enregistrement, réserve 0 %.

Personnalisation :
- afficher/masquer les modules ;
- changer leur ordre ;
- ouvrir/fermer les panneaux ;
- mémorisation locale ;
- mode Light/Dark.

Installation/test :
1. Mettre le contenu du dossier à la racine d'un dépôt GitHub Pages (ou autre hébergement HTTPS).
2. Ouvrir l'URL dans Chrome Android.
3. Installer comme PWA si souhaité.

À connecter dans une prochaine version :
- URLs réelles des applications BOS complètes (constante APP_LINKS dans app.js) ;
- stockage/calibrage partagé de FRAME ;
- database officielle des projecteurs de LIGHT.


V2 : focale avec raccourcis, FRAME simplifié, DOF en f/ et cm, LIGHT avec ISO mini estimé, MEDIA Mb/s ↔ MB/s, EXPO avec rôles 🔒 / M / A.

V3 : nouvelle logique EXPO sans BASE, bascule simple M / A sur chaque ligne, compensation auto multi-paramètres avec priorité ISO → ND → Shutter → Diaph, et lecture des ISO natifs / EI depuis BOS Camera DB V1.2.

V4 : module LIGHT connecté à BOS_LIGHT_DB_V1_0. La liste et la photométrie proviennent désormais de data/lights.json. Le cockpit reste fixé à 100 %, 5600 K et Nu ; les lux à 1 m / 3 m utilisent la mesure exacte quand elle existe, sinon un calcul en loi inverse du carré depuis la mesure DB la plus proche, signalé par ≈.

V5 : choix caméra aligné sur BOS EXPO V3.31 — boutons de marque + menu déroulant limité aux modèles de la marque, avec mémorisation du dernier modèle choisi par marque.


V6 — BOS-PROJECTEURS-DB partagé
- Source principale LIGHT : https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json
- data/lights.json n'est plus la source principale : il reste uniquement comme snapshot de secours hors ligne / indisponibilité distante.
- Le service worker utilise un mode network-first pour la DB distante afin de récupérer les mises à jour du dépôt dès qu'elles existent, puis conserve la dernière réponse distante en cache.
- LIGHT, PLAN et Bruno OnSet peuvent ainsi pointer vers la même source commune.

V7 : BOS-CAMERA-DB devient la source principale des caméras via GitHub. data/cameras.json est conservé uniquement comme fallback local/hors connexion. Tous les modules de Bruno OnSet (sélection caméra, EXPO, DOF, FRAME, MEDIA) utilisent la même liste chargée depuis cette DB commune. Le service worker applique un mode network-first aux Camera DB et Projecteurs DB.

V8 : EXPO signale désormais une compensation impossible. Le réglage Auto arrivé à sa limite conserve sa valeur limite mais celle-ci passe en rouge, avec le nombre de stops restant non compensés.


V9 : Caméra devient le réglage global (focale, diaph, distance). DOF et LIGHT consomment ces valeurs sans les redemander. EXPO abandonne M/A par ligne : ISO/Shutter/ND sont liés et compensent selon une priorité directionnelle. Ajout Diaph Manuel/Auto + ISO MIN/MAX libres.

V10 : ISO MIN/MAX déplacés dans la bulle Caméra, ajout DIAPH MIN/MAX, suppression du mode Diaph Manuel/Auto dans EXPO, et retour du Diaph comme réglage EXPO lié. Le diaph participe toujours en dernier recours à la compensation dans ses limites.

V11 : ajout d’un cadenas indépendant devant Diaph / ISO / Shutter / ND dans EXPO. Un réglage verrouillé est figé, son champ est désactivé et il est totalement exclu de la compensation. Le verrou Diaph fige aussi le Diaph commun dans la bulle Caméra ; le verrou ISO fige également ses limites ISO MIN/MAX.

V12 : ajout du Shutter dans la bulle Caméra, ligne compacte Diaph / Shutter / Distance, suppression de l’info ISO natif dans EXPO et ajout d’un RESET EXPO vers la référence Caméra (Diaph, Shutter, ISO MIN, ND 0).

V13 : ajout de l'ISO dans la bulle Caméra sur la même ligne que Diaph / Shutter / Distance, et bulle Caméra repliable avec résumé visible de la caméra utilisée même lorsqu'elle est fermée.

V14 : LIGHT utilise désormais Diaph + Shutter + ISO MIN/MAX de la bulle Caméra. Si l ISO théorique est sous ISO MIN, l app propose ISO MIN + ND requis ; au-dessus d ISO MAX, elle indique le manque de lumière en stops.

V15 : module EXPO reconstruit sur le visuel et le workflow de la bulle CALCUL de BOS EXPO V3.42. La référence n'est plus répétée dans EXPO : elle vient de la bulle Caméra. Quatre cartes Diaph / ISO / Shutter / ND, cadenas ronds, bouton = RÉF., résumé d'exposition. Les priorités BOS existantes sont conservées.

V16 : correction de la priorité EXPO (Assombrir : Diaph → ISO → ND → Shutter ; Éclaircir : Diaph → ND → ISO → Shutter) et alignement global de la DA sur BOS EXPO V3.43.

V17 : entête retravaillée pour se rapprocher visuellement de BOS EXPO (logo BOS en pastille, ligne Bruno OnSet, grand titre, bouton DARK en pastille), suppression de « COCKPIT », et titres de toutes les bulles en bleu BOS.

V18 : bouton thème aligné sur le comportement d'EXPO (DARK en mode clair, LIGHT en mode sombre), bouton « PERSONNALISER » explicite à la place de l'icône, et suppression du sous-texte « Affichage et ordre du cockpit » dans le panneau de personnalisation.

V19 : bouton PERSONNALISER déplacé entre l'entête et la bulle Caméra, et entête reprise au plus près du header de BOS EXPO V3.44 (mêmes tailles, espacements et style DARK/LIGHT).

V20 : suppression du grand titre « Bruno OnSet » dans l’entête. L’entête conserve uniquement la ligne BOS / BRUNO ONSET et les contrôles, comme demandé.

V21 : mise à jour des sous-titres de modules — EXPO : Compensation Expo ; FRAME : Director's Viewfinder ; LIGHT : Projecteurs et Lux.

V22 : correction explicite des sous-titres : EXPO = Compensation Expo ; FRAME = Director's Viewfinder ; LIGHT = Projecteurs et Lux.
