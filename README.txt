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


V23 :
- EXPO passe en dernier par défaut, fermé, avec le sous-titre « BIENTÔT DISPONIBLE » et sans calcul actif dans le cockpit.
- Ajout du module PLAN.
- Lecture directe de la bibliothèque locale BOS PLAN (`bos-plan-feu-library-v06`) quand elle est accessible.
- Navigation entre plusieurs plans directement dans Bruno OnSet (liste + boutons précédent/suivant).
- Aperçu simplifié du plan vu du dessus, avec caméras, sujets, projecteurs, faisceaux et décor.
- Bouton ACTUALISER pour relire la bibliothèque PLAN.
- Bouton IMPORTER comme solution de secours pour des fichiers `.bosplan.json`; plusieurs fichiers peuvent être importés et restent navigables dans Bruno OnSet.

V24 : module EXPO simplifié autour de l’explorateur de dynamique S-Log3 inspiré de BOS EXPO V3.62. Le module affiche uniquement le schéma waveform 0–100 %, le curseur, la qualité de signal attendue et les repères terrain. EXPO reste en dernier par défaut et porte toujours le sous-titre BIENTÔT DISPONIBLE.

V25 : dans la bulle Caméra, suppression de toute la zone des réglages caméra (diaph / ISO / shutter / distance et limites). Remplacée par un choix simple de courbe gamma avec panneau d'information ISO natifs / Lo-Hi.

V26 : Diaph, distance sujet et ratio remis dans Réglages caméra. DOF exact à la distance choisie. FRAME Preview : sujet unique 1,80 m, cadrage calculé selon caméra/capteur/focale/distance/ratio. LIGHT : 1 m, 3 m et distance sujet avec lux estimés et ISO conseillé pour le diaph choisi à 1/50.

V27 : DOF exact et live, FRAME live avec projection issue de FRAME et mannequin du Preview, LIGHT live corrigé (ISO calculé à 1/50).

V28 : FRAME simplifié — suppression des informations caméra/focale/format/HFOV de la preview et du sous-texte technique du cartouche de plan. Ajout d'une barre RECUL horizontale reliée bidirectionnellement à Distance sujet dans Réglages caméra : modifier l'un met immédiatement à jour l'autre, ainsi que FRAME, DOF et LIGHT.

V29 : ajout d'une barre RECUL dans DOF et LIGHT, synchronisée avec FRAME et Réglages caméra. Ajout dans DOF d'une barre DIAPH de f/1,0 à f/22 sur les valeurs normalisées de l'app ; tous les contrôles restent bidirectionnellement liés.

V30 — MISE À JOUR ANDROID / PWA RENFORCÉE
- Service worker passé en network-first pour les navigations, JS et CSS.
- Cache de version dédié `bos-bruno-onset-v30` et suppression automatique des anciens caches BOS.
- `skipWaiting()` + `clients.claim()` + rechargement des fenêtres/PWA déjà ouvertes lors de l’activation d’une nouvelle version.
- Ajout de `version.json`, interrogé sans cache au démarrage, au retour au premier plan et toutes les 60 s.
- Si une nouvelle version est détectée, BOS force une actualisation avec paramètre anti-cache.
- `style.css`, `app.js` et le manifest sont versionnés dans `index.html`.

V31 : simplification des contrôles. Toutes les barres de distance/recul utilisent désormais un pas de 0,10 m et affichent toujours deux décimales (ex. 1,50 m, 1,60 m). Dans Réglages caméra, le diaph devient une barre horizontale identique à DOF, et la focale devient une barre continue de 9 à 200 mm par pas de 1 mm.

V32 : correctif critique de la V31. La fonction apertureRangeValues(), supprimée par erreur lors du passage du diaph en slider, est restaurée. Cette erreur JavaScript bloquait l'initialisation complète : liste des caméras vide, gamma absent et sliders inactifs. Mise à jour du cache/version en V32.

V33 : Distance sujet remplacée par un slider horizontal lié aux sliders RECUL de FRAME/DOF/LIGHT. Pas 0,10 m et affichage à deux décimales. Correction CSS des sliders : suppression du padding horizontal hérité des inputs génériques, qui raccourcissait visuellement et réellement la course vers les extrémités.

V34 : Ratio retiré des Réglages caméra et déplacé dans FRAME sous RECUL. DOF reçoit trois contrôles liés, dans l’ordre FOCALE (9–200 mm), DIAPH, puis RECUL. La focale DOF est synchronisée bidirectionnellement avec la focale globale et recalcule FRAME/DOF/LIGHT immédiatement.

V35 : ajout d'un réglage HAUTEUR CAMÉRA dans FRAME (0,50–2,50 m) qui déplace verticalement le sujet dans le cadre. Correction du calcul des ratios portrait : 9:16 est désormais traité comme une rotation physique de la caméra, avec échange logique des dimensions de champ par rapport au 16:9.

V36 : ajout d’une barre FOCALE dans FRAME, au-dessus de RECUL. Elle est synchronisée en temps réel avec la focale globale et la barre FOCALE de DOF (9 à 200 mm, pas de 1 mm).

V37 : correction du système de mise à jour. La V36 avait APP_VERSION resté sur V35 alors que version.json et le service worker étaient en V36, ce qui pouvait provoquer des rechargements répétés. V37 aligne tous les numéros, compare désormais les builds numériquement, ajoute un garde anti-boucle, supprime la navigation forcée depuis l'activation du service worker et espace la vérification périodique à 5 minutes.

V38 : EXPO sous-titré « DYNAMIQUE DE L’IMAGE ». Ajout d’un mode de saisie libre : cliquer sur la valeur affichée d’une barre horizontale ouvre un champ numérique. Focale, diaph, distance/recul, hauteur caméra et waveform peuvent ainsi recevoir une valeur précise hors des pas du slider ; les calculs synchronisés utilisent la valeur exacte.

V39 : correction du calcul des ratios FRAME. Les formats sont désormais traités comme des masques dans le cadre natif : 16:9 horizontal pour les formats paysage/carré (ex. 1:1 = cache latéral dans le 16:9), et 9:16 après rotation physique de la caméra pour les formats portrait. Le champ horizontal et vertical est calculé à partir de la zone réellement conservée du capteur.

V40 : sous-titre EXPO harmonisé avec les autres modules : « Dynamique de l'image ».

V41 — Sélecteur de projecteur façon BOS LIGHT (Marque → Gamme → Puissance/Modèle), réglages caméra globaux simplifiés à Marque/Caméra/Gamma, et vérification de mise à jour limitée à une fois par heure maximum. Service worker/cache alignés sur V41.

V42 — IDENTITÉ BRUNO ONSET
- Le logo utilisateur fourni est utilisé tel quel dans l'en-tête, sans transparence ni réinterprétation.
- « Bruno OnSet » est affiché à côté en Montserrat Bold, couleur BOS #2F5B66.
- L'icône PWA Android/iOS est dérivée directement de l'image fournie, sans recadrage de contenu.
- Cache / version / service worker incrémentés en V42.

V43 — ENTÊTE
- Remplacement du logo d'entête par l'image exacte fournie par l'utilisateur (BOS blanc sur fond bleu), sans réinterprétation.
- Logo affiché en entier dans l'entête (object-fit: contain).
- Version / cache / service worker incrémentés en V43.

V44 — ENTÊTE
- Ajout d'une phrase sous « Bruno OnSet » : « L'application de tournage professionnel ».
- Version / cache / service worker incrémentés en V44.

V45 — SLOGAN D'ENTÊTE
- Slogan validé : « Avec vous, sur chaque tournage. »
- Slogan en Montserrat regular, noir (#17191C).
- Version / cache / service worker incrémentés en V45.

V46 — LOGO + EXPO INTERACTIF + LIGHT
- Logo d'entête remplacé par l'image BOS V3 exacte fournie par l'utilisateur, sans modification.
- Les cinq repères terrain EXPO sont cliquables et placent le waveform au pourcentage entier le plus haut restant dans la zone correspondante.
- La barre « Signal / qualité attendue » est cliquable et déplaçable ; elle pilote en direct le niveau waveform supérieur.
- Les informations LIGHT 100 %, 5600 K, Nu et 1/50 sont désormais affichées comme texte simple, sans bulles.
- Cache / service worker / version incrémentés en V46 ; migration d'état depuis V45/V44/V43/V42 ajoutée.

V47 — ICÔNE APP + ORDRE PAR DÉFAUT
- Icône d'application remplacée par l'image exacte fournie par l'utilisateur (BOS avec point dans le O).
- icons/icon-192.png et icons/icon-512.png régénérées à partir de cette image.
- Ordre par défaut et ordre restauré par Réinitialiser : FRAME → DOF → EXPO → LIGHT → PLAN → MEDIA.
- Version / cache / service worker incrémentés en V47.

V48 — BULLES FERMÉES PAR DÉFAUT
- CAMÉRA, FRAME, DOF, EXPO, LIGHT, PLAN et MEDIA sont fermées par défaut.
- Le bouton Réinitialiser remet également toutes les bulles en position fermée.
- Version / cache / service worker incrémentés en V48.

V49 — CTA PROFESSIONNEL
- Ajout du CTA discret « Parler de votre tournage → » sous les modules et avant le footer.
- Au clic : carte premium présentant Bruno Guillard, Directeur de la photographie · Consultant image.
- Prestations affichées : Direction de la photographie / Conseil · préparation image.
- Aucun WhatsApp/e-mail n'est encore câblé dans cette version : cette itération sert à valider le placement et la présentation.
- Version / cache / service worker incrémentés en V49.

V50 — CTA + SIGNAL / QUALITÉ PAR ZONE
- Dans la carte « Parler de votre tournage », ajout d’un lien secondaire discret : BrunoGuillard.com.
- Dans EXPO, le schéma horizontal « Signal / qualité attendue » fonctionne désormais à l’échelle de la zone active.
- Quand on change de repère terrain, le niveau revient au début de la zone (à gauche du schéma), puis le curseur agit à l’intérieur de cette zone.
- Le clic / glisser sur le schéma « Signal / qualité attendue » déplace maintenant le waveform à l’intérieur de la zone courante.
- Version / cache / service worker incrémentés en V50.

V51 — CORRECTIF SIGNAL / QUALITÉ
- Correction de l’interprétation V50 : les repères terrain gardent leur comportement d’origine et placent le waveform au haut de leur zone indicative.
- La barre SIGNAL / QUALITÉ ATTENDUE est désormais locale à la zone de qualité réelle (PIED, OMBRES, MÉDIUMS, HAUTES, TRÈS HAUTES, EXTRÊMES).
- En entrant dans une nouvelle zone de qualité, le curseur repart bien à gauche du schéma, sans changer le libellé de qualité propre à cette zone.
- Fenêtre / ciel retrouve donc son comportement et sa qualité d’origine au lieu d’être reclassé artificiellement en « BONNE ».
- Version / cache / service worker incrémentés en V51.

V52 — schéma des zones EXPO aligné sur BOS_EXPO V3.65
- Le module EXPO de Bruno OnSet reprend désormais le même schéma de zones que l’application EXPO de référence.
- S-Log3 et S-Cinetone disposent chacun de leurs zones, repères terrain et logique SIGNAL / QUALITÉ attendue.
- Les boutons de repères terrain pointent à nouveau exactement vers la bonne famille de zone (notamment Fenêtre / ciel).
- Le repère SIGNAL / QUALITÉ reste local à la zone active et repart à gauche quand on change de zone.
- Si le profil ne permet pas une conversion fiable waveform ↔ diaph, le message d’aide l’indique explicitement.

V53 — CTA PROJET
- Le CTA principal devient : « Échangeons autour de votre projet → ».
- Version / cache / service worker incrémentés en V53.

V54 — CONTACT PROJET
- La carte « Échangeons autour de votre projet » contient désormais un bouton principal « Écrire à Bruno → ».
- Le bouton ouvre l’application e-mail avec l’adresse brunoguillardcontact@gmail.com, l’objet « Projet de tournage — Bruno OnSet » et un début de message prérempli.
- BrunoGuillard.com reste un lien secondaire discret.
- Version / cache / service worker incrémentés en V54.

V55 — MESSAGE CONTACT
- Le message e-mail prérempli devient simplement : « Bonjour Bruno, Je vous contacte depuis Bruno OnSet. »
- Suppression de « au sujet d’un projet ».
- Version / cache / service worker incrémentés en V55.

V56 — WHATSAPP SECONDAIRE
- Ajout de WhatsApp comme contact secondaire, sous le bouton principal « Écrire à Bruno → ».
- Présentation volontairement sobre : texte simple, sans bouton vert ni logo.
- Hiérarchie : e-mail principal, puis « WhatsApp · BrunoGuillard.com ».
- WhatsApp ouvre une conversation vers +33 6 79 97 91 11 avec « Bonjour Bruno, Je vous contacte depuis Bruno OnSet. » prérempli.
- Version / cache / service worker incrémentés en V56.

V57 — CTA PROJET
- Le CTA principal devient : « Besoin d’un regard sur votre projet ? → ».
- La carte de contact et sa hiérarchie restent inchangées : Écrire à Bruno, puis WhatsApp · BrunoGuillard.com.
- Version / cache / service worker incrémentés en V57.
