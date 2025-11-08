import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface pour un investisseur dans une obligation spécifique
 * Chaque obligation a sa propre collection d'investisseurs
 */
export interface IBondInvestor extends Document {
  investorAddress: string;           // Adresse XRPL de l'investisseur
  balance: string;                   // Nombre de tokens détenus
  percentage: number;                // Pourcentage du total détenu
  investedAmount: string;            // Montant investi en valeur (denomination * balance)
  
  // Historique
  firstInvestmentDate: number;       // Date du premier investissement (timestamp)
  lastUpdateDate: number;            // Date de la dernière mise à jour
  
  // Transactions et coupons
  transactionHistory: Array<{
    type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out' | 'coupon';
    amount: string;                  // Montant de la transaction
    txHash: string;                  // Hash de la transaction XRPL
    timestamp: number;               // Date de la transaction
    fromAddress?: string;            // Pour les transferts
    toAddress?: string;              // Pour les transferts
  }>;
  
  totalCouponsReceived: string;      // Total des coupons reçus (en USDC micro-units)
  lastCouponDate?: number;           // Date du dernier coupon reçu
  
  createdAt: Date;
  updatedAt: Date;
}

const BondInvestorSchema = new Schema<IBondInvestor>({
  investorAddress: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  balance: { 
    type: String, 
    required: true,
    default: '0'
  },
  percentage: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  investedAmount: {
    type: String,
    required: true,
    default: '0'
  },
  firstInvestmentDate: { 
    type: Number, 
    required: true 
  },
  lastUpdateDate: { 
    type: Number, 
    required: true 
  },
  transactionHistory: [{
    type: {
      type: String,
      enum: ['buy', 'sell', 'transfer_in', 'transfer_out', 'coupon'],
      required: true
    },
    amount: { type: String, required: true },
    txHash: { type: String, required: true },
    timestamp: { type: Number, required: true },
    fromAddress: { type: String },
    toAddress: { type: String }
  }],
  totalCouponsReceived: { 
    type: String, 
    default: '0'
  },
  lastCouponDate: { 
    type: Number 
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
BondInvestorSchema.index({ balance: -1 }); // Pour trier par balance
BondInvestorSchema.index({ percentage: -1 }); // Pour trier par pourcentage
BondInvestorSchema.index({ lastUpdateDate: -1 }); // Pour l'historique

/**
 * Factory pour créer un modèle dynamique pour chaque obligation
 * @param bondId - ID de l'obligation
 * @returns Model<IBondInvestor>
 */
export function getBondInvestorModel(bondId: string): Model<IBondInvestor> {
  const collectionName = `investors_${bondId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  
  // Vérifie si le modèle existe déjà
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName] as Model<IBondInvestor>;
  }
  
  // Crée un nouveau modèle avec sa propre collection
  return mongoose.model<IBondInvestor>(
    collectionName,
    BondInvestorSchema,
    collectionName
  );
}

/**
 * Supprime le modèle et la collection pour une obligation
 * Utile pour nettoyer quand une obligation est supprimée
 */
export async function deleteBondInvestorCollection(bondId: string): Promise<void> {
  const collectionName = `investors_${bondId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  
  // Supprime le modèle du cache
  if (mongoose.models[collectionName]) {
    delete mongoose.models[collectionName];
  }
  
  // Supprime la collection
  try {
    await mongoose.connection.db.dropCollection(collectionName);
    console.log(`✅ Collection ${collectionName} supprimée`);
  } catch (error: any) {
    if (error.code === 26) {
      // Collection n'existe pas, pas grave
      console.log(`ℹ️  Collection ${collectionName} n'existe pas`);
    } else {
      throw error;
    }
  }
}
