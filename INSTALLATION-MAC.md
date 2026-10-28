# Démarrer sur macOS

Installer Java 21 et Node.js 22, puis suivre les deux terminaux décrits dans le README. Les wrappers Maven peuvent être lancés avec `bash mvnw`.

Le script optionnel `bash scripts/mac-install.sh` installe les outils avec Homebrew, vérifie et compile le projet. Il ne contient aucune donnée de campagne.

Pour le premier lancement, démarrer le JAR depuis `backend/` puis l'interface depuis `frontend/`. L'ouverture de l'accueil crée une base neuve automatiquement. Ensuite, après arrêt de ces processus, `bash scripts/mac-start.sh data/campaign-copy.sqlite` permet d'utiliser le lanceur commun.

Les scripts macOS n'ont pas été exécutés sur un Mac lors de la préparation. Cette distribution n'inclut pas de configuration d'exposition Internet ; le site actuel donne accès au GM à toute personne pouvant l'ouvrir.
