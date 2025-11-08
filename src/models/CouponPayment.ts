import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface pour un paiement de coupon
 */
export interface ICouponPayment extends Document {
  bondId: string;                    // Référence à l'obligation
  paymentDate: number;               // Date du paiement (timestamp)
  periodStart: number;               // Début de la période (timestamp)
  periodEnd: number;                 // Fin de la période (timestamp)
  
  // Montants
  totalAmount: string;               // Montant total distribué (en USDC micro-units)
  couponRate: number;                // Taux appliqué (pour historique)
  
  // Distribution
  recipients: {
    holderAddress: string;           // Adresse du détenteur
    balance: string;                 // Balance au moment du snapshot
    amount: string;                  // Montant du coupon reçu
    txHash?: string;                 // Hash de la transaction de paiement
    status: 'pending' | 'paid' | 'failed';
  }[];
  
  // Statut global
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  
  // Métadonnées
  snapshotLedger?: number;           // Ledger utilisé pour le snapshot
  executionTxHashes: string[];       // Liste des transactions de paiement
  errorMessage?: string;             // Message d'erreur si échec
  
  createdAt: Date;
  updatedAt: Date;
}

const RecipientSchema = new Schema({
  holderAddress: { type: String, required: true },
  balance: { type: String, required: true },
  amount: { type: String, required: true },
  txHash: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  }
}, { _id: false });

const CouponPaymentSchema = new Schema<ICouponPayment>({
  bondId: { 
    type: String, 
    required: true,
    index: true,
    ref: 'Bond'
  },
  paymentDate: { 
    type: Number, 
    required: true,
    index: true 
  },
  periodStart: { 
    type: Number, 
    required: true 
  },
  periodEnd: { 
    type: Number, 
    required: true 
  },
  totalAmount: { 
    type: String, 
    required: true 
  },
  couponRate: { 
    type: Number, 
    required: true 
  },
  recipients: [RecipientSchema],
  status: { 
    type: String, 
    enum: ['scheduled', 'processing', 'completed', 'failed'],
    default: 'scheduled',
    index: true 
  },
  snapshotLedger: { 
    type: Number 
  },
  executionTxHashes: [{ type: String }],
  errorMessage: { 
    type: String 
  }
}, {
  timestamps: true
});

// Index composé pour trouver les paiements à traiter
CouponPaymentSchema.index({ bondId: 1, paymentDate: 1 });
CouponPaymentSchema.index({ status: 1, paymentDate: 1 });

export const CouponPayment = mongoose.model<ICouponPayment>('CouponPayment', CouponPaymentSchema);
