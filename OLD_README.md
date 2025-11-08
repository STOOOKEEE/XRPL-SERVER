# XRPL Bonds Server

Serveur backend pour la gestion des obligations tokenisées sur XRPL avec MongoDB.

## 🚀 Déploiement sur Railway

1. Push ce repo sur GitHub
2. Connectez-vous sur [Railway.app](https://railway.app)
3. Créez un nouveau projet depuis GitHub
4. Ajoutez les variables d'environnement (voir ci-dessous)
5. Déployez !

## 📋 Variables d'environnement requises

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/xrpl-bonds
XRPL_URL=wss://s.altnet.rippletest.net:51233
PORT=3001
NODE_ENV=production
```

## 📋 Variables optionnelles

```env
ISSUER_SEED=sXXXXXXXXXXXXXX  # Pour les paiements de coupons
WEBHOOK_URL=https://your-app.com/webhook  # Pour les notifications
```

## 🔧 Installation locale

```bash
npm install
npm run dev
```

## 📊 API Endpoints

- `GET /health` - Santé du serveur
- `GET /api/bonds` - Liste des obligations
- `POST /api/bonds` - Créer une obligation
- `GET /api/bonds/:id` - Détails d'une obligation
- `GET /api/bonds/:id/holders` - Détenteurs
- `GET /api/bonds/:id/transactions` - Transactions
- `GET /api/bonds/:id/coupons` - Paiements de coupons

## 🎯 Fonctionnalités

✅ Monitoring temps réel des transactions XRPL
✅ Mise à jour automatique des balances
✅ Distribution automatique des coupons
✅ Traçabilité complète
✅ Notifications d'événements
