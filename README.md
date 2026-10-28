# Les Royaumes

Jeu de gestion de royaumes inspiré de la Terre du Milieu : factions, cités, progression des bâtiments jusqu'au niveau 40, files de construction, armées, économie et réglages GM.

Backend **Java 21 / Spring Boot** ; interface **Next.js / React / TypeScript** ; stockage **SQLite**.

## Accès libre

Aucune connexion n'est nécessaire. Le sélecteur « Vue affichée » permet de choisir GM ou joueur. **Toute personne ayant accès au site peut choisir le GM et modifier les campagnes.** La sélection d'un royaume est une vue, pas une protection d'accès.

Cette distribution contient uniquement du code, des illustrations et des données de test fictives. Elle ne contient aucune campagne réelle, sauvegarde, session, configuration privée ni ancien mot de passe utilisateur.

## Premier démarrage depuis ce dépôt

Prérequis : Java 21 et Node.js 22.13 ou supérieur. Maven est téléchargé par le wrapper fourni.

Terminal 1, depuis la racine du dépôt :

```sh
cd backend
# Windows : .\mvnw.cmd verify
# macOS / Linux :
bash mvnw verify
java -jar target/royaumes-backend-1.0.0.jar
```

Terminal 2, depuis la racine :

```sh
cd frontend
npm ci
npm run dev
```

Ouvrir http://localhost:3102. Java écoute sur http://127.0.0.1:8082.
La première ouverture crée une campagne neuve et un GM sans mot de passe. Dans **Espace Game Master → Joueurs**, ajouter un nom et une faction, puis actualiser le sélecteur de profils.

La démo locale est disponible à http://localhost:3102/?demo=1. Elle fonctionne sans campagne réelle.

Pour compiler l'interface : `npm run build`, puis `npm start` dans `frontend/`. Une fois la base créée et les deux services compilés, le lanceur Windows `DEMARRER-WINDOWS.cmd` peut les démarrer ensemble. Il refuse les ports déjà occupés.

## Configuration

Les valeurs par défaut suffisent en local. Aucun secret n'est nécessaire. Le fichier `frontend/.env.example` est un exemple public.

| Variable | Défaut | Rôle |
|---|---|---|
| DATABASE_PATH | ../data/campaign-copy.sqlite depuis backend | Base créée automatiquement |
| PUBLIC_ORIGIN | http://localhost:3102 | Origine exacte de l'interface |
| PORT | 8082 | Port Java |
| SERVER_ADDRESS | 127.0.0.1 | Adresse Java |
| JAVA_BACKEND_URL | http://127.0.0.1:8082 | Proxy Next.js |
| OPEN_ACCESS | true | Mode public actuel, laisser true |

La base créée localement reste dans `data/`, exclu de Git. Ne pas partager ce dossier après avoir commencé à jouer.

## Vérifications

```sh
cd backend
bash mvnw verify
cd ../frontend
npm test
npm run format:check
npm run typecheck
npm run build
cd ..
node scripts/sync-catalog.mjs --check
# Avec les deux serveurs lancés :
node scripts/check-local.mjs
```

Sous Windows, utiliser `.\mvnw.cmd verify`. Les tests Java utilisent uniquement des bases temporaires et des comptes fictifs. Le modèle `docs/github-actions-verify.yml` pourra être placé dans `.github/workflows/verify.yml` pour activer les tests et la compilation sur GitHub. La connexion utilisée pour publier le code n'a pas l'autorisation OAuth `workflow` : le modèle est donc fourni sans activation automatique.

Voir [CONTRIBUTING](CONTRIBUTING.md) pour modifier le code et [PARTAGER](PARTAGER.md) pour créer le dépôt GitHub.

Les combats et livraisons Minecraft restent coordonnés manuellement avec le GM. Aucune connexion automatique au mod n'est implémentée.
