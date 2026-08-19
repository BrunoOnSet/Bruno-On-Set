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
