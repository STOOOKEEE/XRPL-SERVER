# XRPL Bonds Server

Backend Node.js/TypeScript pour la gestion d'obligations tokenisées sur le XRPL (XRP Ledger).

## 🎯 Architecture de la Base de Données

Ce projet utilise une architecture **2 tables** optimisée :

### 1. Table Unique `bonds`
Collection globale qui répertorie **toutes les obligations** avec :
- Métadonnées complètes (émetteur, taux, échéance, etc.)
- Statut en temps réel
- **Statistiques agrégées** (nombre d'investisseurs, montant total investi, % distribué)

```typescript
{
  bondId: "BOND-001",
  tokenName: "Tesla Green Bond 4.5% 2030",
  status: "active",
  stats: {
    totalInvestors: 150,
    totalInvested: "5000000",
    percentageDistributed: 78.5,
    totalCouponsPaid: "125000"
  }
}
```

### 2. Tables Dynamiques par Obligation `investors_<bondId>`
**Une collection MongoDB par obligation** qui regroupe tous ses investisseurs :
- Adresse de l'investisseur
- Balance (nombre de tokens)
- **Pourcentage de détention**
- **Montant investi** (valeur nominale)
- Historique complet des transactions
- Coupons reçus

```typescript
{
  investorAddress: "rXXXXXXXX",
  balance: "100000",
  percentage: 5.2,
  investedAmount: "100000000",
  transactionHistory: [
    { type: "buy", amount: "50000", txHash: "...", timestamp: 1699430400000 },
    { type: "transfer_in", amount: "50000", txHash: "...", timestamp: 1699516800000 }
  ]
}
```

### ✅ Avantages de cette Architecture

1. **Performance** : Chaque obligation a sa propre collection → requêtes ultra-rapides
2. **Isolation** : Les données d'une obligation n'impactent pas les autres
3. **Scalabilité** : Ajout de nouvelles obligations sans impact sur les existantes
4. **Statistiques en temps réel** : Mises à jour automatiques à chaque transaction

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Éditer .env avec votre MongoDB URI

# Migration des données (si vous avez des anciennes données)
npm run migrate

# Développement
npm run dev

# Production
npm run build
npm start
```

## 📊 API Endpoints

### Obligations

```
GET    /api/bonds                    # Liste toutes les obligations
POST   /api/bonds                    # Créer une nouvelle obligation
GET    /api/bonds/:bondId            # Détails d'une obligation (avec stats)
PATCH  /api/bonds/:bondId            # Mettre à jour une obligation
```

### Investisseurs (Nouveau Système)

```
GET    /api/bonds/:bondId/investors          # Liste des investisseurs
GET    /api/bonds/:bondId/investors/:address # Détails d'un investisseur
GET    /api/bonds/:bondId/stats              # Statistiques détaillées
```

**Paramètres de requête** :
- `minPercentage` - Filtrer par % minimum de détention
- `sortBy` - Trier par `percentage`, `balance`, `investedAmount`
- `order` - `asc` ou `desc`

### Exemple de Réponse

```json
{
  "success": true,
  "bondId": "BOND-001",
  "count": 3,
  "data": [
    {
      "investorAddress": "rABC123...",
      "balance": "500000",
      "percentage": 10.5,
      "investedAmount": "500000000",
      "transactionHistory": [...],
      "totalCouponsReceived": "25000"
    }
  ]
}
```

## 🔄 Mises à Jour Automatiques

Le système met automatiquement à jour :

1. **À chaque transaction XRPL** :
   - Balance de l'investisseur
   - Pourcentage de détention
   - Historique des transactions
   - Statistiques de l'obligation

2. **Événements surveillés** :
   - `Payment` - Transferts de tokens
   - `MPTokenIssuanceCreate` - Création de nouveaux tokens
   - `MPTokenAuthorize` - Autorisation d'investisseurs

## 🔧 Scripts Disponibles

```bash
npm run dev              # Serveur en mode développement
npm run build            # Compilation TypeScript
npm start                # Serveur en mode production
npm run migrate          # Migration vers le nouveau système
npm run test-workflow    # Test complet du workflow
```

## 📋 Variables d'Environnement

```env
# MongoDB (REQUIS)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/xrpl-bonds

# XRPL (REQUIS)
XRPL_URL=wss://s.altnet.rippletest.net:51233

# Serveur (REQUIS)
PORT=3001
NODE_ENV=development

# Optionnel
ISSUER_SEED=sXXXX...          # Pour distribution de coupons
WEBHOOK_URL=https://...       # Pour notifications
FRONTEND_URL=http://localhost:3000  # Pour CORS
```

## 🌐 Déploiement

### Sur Render

1. Connectez votre repo GitHub
2. Ajoutez les variables d'environnement
3. Build command: `npm run build`
4. Start command: `npm start`
5. Déployez !

### Sur Railway

1. Push sur GitHub
2. Nouveau projet sur [Railway.app](https://railway.app)
3. Configurez les variables d'environnement
4. Déployez automatiquement

## 🎯 Fonctionnalités

✅ Monitoring temps réel des transactions XRPL  
✅ Collections dynamiques par obligation  
✅ Statistiques automatiques et agrégées  
✅ Historique complet des transactions  
✅ API REST complète  
✅ TypeScript + Mongoose  
✅ Validation stricte des adresses XRPL  
✅ Notifications d'événements  

## 📖 Documentation Technique

### Modèles de Données

- **Bond** (`src/models/Bond.ts`) - Modèle d'obligation avec stats
- **BondInvestor** (`src/models/BondInvestor.ts`) - Factory de modèles dynamiques
- **BondStatsService** (`src/services/BondStatsService.ts`) - Gestion des statistiques
- **BondTransactionMonitor** (`src/services/BondTransactionMonitor.ts`) - Monitoring XRPL

### Création d'une Collection Dynamique

```typescript
import { getBondInvestorModel } from './models/BondInvestor';

// Crée/récupère le modèle pour une obligation
const InvestorModel = getBondInvestorModel('BOND-001');

// Utilise comme un modèle Mongoose normal
const investors = await InvestorModel.find({});
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Ce projet est développé pour le **Hackathon XRPL Rome 2025**.

## 📝 License

MIT
