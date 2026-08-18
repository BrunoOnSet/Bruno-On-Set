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
