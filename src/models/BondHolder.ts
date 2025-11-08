import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface pour un détenteur d'obligations
 * Suit en temps réel les détenteurs actuels de chaque obligation
 */
export interface IBondHolder extends Document {
  bondId: string;                    // Référence à l'obligation
  holderAddress: string;             // Adresse XRPL du détenteur
  balance: string;                   // Nombre de tokens détenus
  
  // Historique
  firstAcquisitionDate: number;      // Date du premier achat (timestamp)
  lastUpdateDate: number;            // Date de la dernière mise à jour
  
  // Métadonnées pour les coupons
  lastCouponPaid?: number;           // Timestamp du dernier coupon reçu
  totalCouponsReceived: string;      // Total des coupons reçus (en USDC micro-units)
  
  createdAt: Date;
  updatedAt: Date;
}

const BondHolderSchema = new Schema<IBondHolder>({
  bondId: { 
    type: String, 
    required: true,
    index: true,
    ref: 'Bond'
  },
  holderAddress: { 
    type: String, 
    required: true,
    index: true 
  },
  balance: { 
    type: String, 
    required: true,
    default: '0'
  },
  firstAcquisitionDate: { 
    type: Number, 
    required: true 
  },
  lastUpdateDate: { 
    type: Number, 
    required: true 
  },
  lastCouponPaid: { 
    type: Number 
  },
  totalCouponsReceived: { 
    type: String, 
    default: '0'
  }
}, {
  timestamps: true
});

// Index unique composé pour éviter les doublons
BondHolderSchema.index({ bondId: 1, holderAddress: 1 }, { unique: true });

// Index pour les requêtes de distribution de coupons
BondHolderSchema.index({ bondId: 1, balance: 1 });

export const BondHolder = mongoose.model<IBondHolder>('BondHolder', BondHolderSchema);
