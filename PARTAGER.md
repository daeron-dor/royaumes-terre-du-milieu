# Mettre le code sur GitHub

Ce dossier est la racine du futur dépôt. Il ne reprend pas l'historique Git du projet de travail.

1. Créer un dépôt **privé** vide sur GitHub, sans README ajouté automatiquement.
2. Dans ce dossier, vérifier les fichiers avec `git status` et `git diff --cached --name-only`.
3. Créer le premier commit, puis renseigner l'URL de votre dépôt :
```sh
git commit -m "Initial source release"
git remote add origin https://github.com/VOTRE-COMPTE/VOTRE-DEPOT.git
git push -u origin main
```
4. Dans les paramètres du dépôt GitHub, inviter votre ami comme collaborateur.
5. Il pourra cloner le dépôt et suivre le README sans recevoir vos comptes ni votre base.

Le dossier préparé possède déjà un dépôt Git neuf et ses sources sont sélectionnées pour le premier commit. Si vous utilisez l'archive ZIP, initialiser d'abord Git :
```sh
git init -b main
git add .
```

Aucun dépôt distant n'a été créé et rien n'a été publié automatiquement. Les ressources graphiques sont fournies pour la reprise du projet ; aucune licence générale de redistribution n'est attribuée par cette préparation.
