# Guide de déploiement sur Railway

## 🚀 Étapes de déploiement

### 1. Préparez votre MongoDB Atlas

Si ce n'est pas déjà fait:
- Créez un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Créez un cluster (gratuit M0)
- Créez un utilisateur de base de données
- Autorisez toutes les IP (0.0.0.0/0) dans Network Access
- Récupérez votre connection string

### 2. Initialisez Git dans ce dossier

```bash
cd /Users/armandsechon/dev/XRPL-BONDS-SERVER
git init
git add .
git commit -m "Initial commit - XRPL Bonds Server"
```

### 3. Créez un repo sur GitHub

1. Allez sur https://github.com/new
2. Nom: `xrpl-bonds-server`
3. Public ou Private (au choix)
4. Ne cochez RIEN (pas de README, pas de .gitignore, etc.)
5. Créez le repo

### 4. Poussez votre code

```bash
git remote add origin https://github.com/VOTRE-USERNAME/xrpl-bonds-server.git
git branch -M main
git push -u origin main
```

### 5. Déployez sur Railway

1. Allez sur https://railway.app
2. Connectez-vous avec GitHub
3. Cliquez sur "New Project"
4. Sélectionnez "Deploy from GitHub repo"
5. Choisissez `xrpl-bonds-server`
6. Railway va détecter automatiquement Node.js

### 6. Configurez les variables d'environnement

Dans Railway, allez dans l'onglet "Variables" et ajoutez:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/xrpl-bonds?retryWrites=true&w=majority
XRPL_URL=wss://s.altnet.rippletest.net:51233
PORT=3001
NODE_ENV=production
```

**IMPORTANT**: Remplacez `username` et `password` par vos vraies credentials MongoDB !

### 7. Variables optionnelles

Si vous voulez activer les paiements de coupons, ajoutez:
```
ISSUER_SEED=sVotreSecretSeed
```

### 8. Déployez !

Railway va automatiquement:
- ✅ Installer les dépendances (`npm install`)
- ✅ Compiler TypeScript (`npm run build`)
- ✅ Démarrer le serveur (`npm start`)
- ✅ Attribuer une URL publique
- ✅ Configurer HTTPS
- ✅ Auto-restart en cas de crash

### 9. Vérifiez le déploiement

Une fois déployé, testez:
```bash
curl https://votre-app.up.railway.app/health
```

Vous devriez voir: `{"status":"ok","timestamp":"..."}`

### 10. Surveillez les logs

Dans Railway, allez dans l'onglet "Deployments" pour voir les logs en temps réel.

Vous devriez voir:
```
✅ MongoDB connecté
✅ Connecté au XRPL
🚀 Serveur démarré sur le port 3001
👀 Monitoring des transactions démarré
```

## 🎯 C'est terminé !

Votre serveur observe maintenant 24/7 les transactions XRPL et met à jour automatiquement votre base de données MongoDB !

## 📊 Utilisation de l'API

Votre API est maintenant accessible publiquement:

```bash
# Liste des obligations
curl https://votre-app.up.railway.app/api/bonds

# Créer une obligation
curl -X POST https://votre-app.up.railway.app/api/bonds \
  -H "Content-Type: application/json" \
  -d '{"bondId": "BOND-001", ...}'

# Détenteurs
curl https://votre-app.up.railway.app/api/bonds/BOND-001/holders
```

## 🔧 Mise à jour

Pour déployer des changements:

```bash
git add .
git commit -m "Update"
git push
```

Railway redéploiera automatiquement !
