# Guide développeur

## Architecture

Le projet est autonome. Ouvrir `backend/pom.xml` dans un IDE Java ; l'interface se trouve dans `frontend/`.

| Fonction | Fichiers |
|---|---|
| API sans connexion | backend/src/main/java/fr/royaumes/OpenApiController.java |
| Profils publics et premier GM | backend/src/main/java/fr/royaumes/OpenAccess.java |
| Transactions des commandes | backend/src/main/java/fr/royaumes/GameService.java |
| Actions et validation | GameActions.java, ActionValidation.java |
| Construction et production hors ligne | Campaigns.java |
| Prix, durées et doctrines | Economy.java, Catalog.java |
| SQLite | Database.java |
| Catalogue partagé | backend/src/main/resources/catalog.json |
| Vues et état React | frontend/app/realm/, frontend/app/realm-app.tsx |
| Armées | frontend/app/military/ |
| Thèmes et styles | frontend/app/ui-styles/ |
| Illustrations | frontend/public/art/ |

Les noms de classes sans chemin sont relatifs à `backend/src/main/java/fr/royaumes/`.

Le catalogue Java est la référence. Après changement, exécuter `node scripts/sync-catalog.mjs`. Ne pas modifier manuellement `frontend/app/catalog-data.json`.

## Règles de maintenance

- Les règles Java font autorité pour la campagne ; certaines formules existent aussi en TypeScript pour la démo et l'affichage. Maintenir les deux et vérifier leur parité.
- Les campagnes sont stockées en JSON pour la compatibilité. Tester les valeurs par défaut et anciens états lors d'une évolution du schéma.
- Ne pas réordonner les imports de `ui-styles/index.css` : ils contrôlent la cascade. Comparer les factions Gondor, elfes, nains et Mordor après un changement de style.
- Interface : `npm run format`, puis `npm run format:check`. Java : format Google Java Format, deux espaces.
- Les fixtures de parité sont figées. Ne pas les régénérer pour masquer une régression.
- L'accès public est intentionnel. Les contrôles de propriété limitent une vue sélectionnée ; chacun peut cependant choisir le GM. Ne pas présenter ces vues comme une séparation sécurisée.
- `ApiController`, `AuthService`, `AccountService` et `Passwords` conservent la compatibilité de l'ancien moteur et ses tests. L'ancien contrôleur est désactivé par défaut ; aucun formulaire de connexion n'est livré.
- Les chaînes de mots de passe et empreintes présentes dans les tests sont synthétiques, notamment `src/test/resources/scrypt.json`. Aucun ancien mot de passe réel n'est nécessaire aux tests.

## Tests

Exécuter les commandes du README avant de proposer une modification. Les tests HTTP travaillent sur des bases temporaires indépendantes ; ne jamais leur donner une base de jeu réelle.

Les tests de l'ancien contrôleur utilisent explicitement `royaumes.open-access=false` pour contrôler la compatibilité. `OpenAccessHttpTest` vérifie le mode public actif. Ne pas passer le site actuel en mode authentifié : son interface de connexion a été retirée.

Lancer aussi la démo et vérifier les vues GM/joueur, un changement de faction, les ressources et les panneaux sur mobile et ordinateur. Les tests automatiques ne remplacent pas toutes les vérifications visuelles.

## Données privées

`.gitignore` exclut bases SQLite, configurations locales, sauvegardes, dépendances et compilations. Cette protection ne retire pas des fichiers déjà suivis : vérifier `git diff --cached --name-only` avant un commit. Ne jamais ajouter `data/`, `outputs/`, des exports ou des identifiants.
