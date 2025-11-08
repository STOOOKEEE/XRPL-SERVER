import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface pour une transaction de transfert de tokens d'obligations
 * Permet la traçabilité complète de tous les mouvements
 */
export interface ITransaction extends Document {
  bondId: string;                    // Référence à l'obligation
  txHash: string;                    // Hash de la transaction XRPL
  ledgerIndex: number;               // Numéro du ledger XRPL
  
  // Détails du transfert
  fromAddress: string;               // Adresse de l'expéditeur
  toAddress: string;                 // Adresse du destinataire
  amount: string;                    // Nombre de tokens transférés
  
  // Type de transaction
  type: 'issuance' | 'transfer' | 'redemption' | 'coupon_payment';
  
  // Métadonnées
  timestamp: number;                 // Timestamp de la transaction
  memo?: string;                     // Mémo optionnel
  
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  bondId: { 
    type: String, 
    required: true,
    index: true,
    ref: 'Bond'
  },
  txHash: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  ledgerIndex: { 
    type: Number, 
    required: true,
    index: true 
  },
  fromAddress: { 
    type: String, 
    required: true,
    index: true 
  },
  toAddress: { 
    type: String, 
    required: true,
    index: true 
  },
  amount: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['issuance', 'transfer', 'redemption', 'coupon_payment'],
    required: true,
    index: true 
  },
  timestamp: { 
    type: Number, 
    required: true,
    index: true 
  },
  memo: { 
    type: String 
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Index composés pour les requêtes fréquentes
TransactionSchema.index({ bondId: 1, timestamp: -1 });
TransactionSchema.index({ fromAddress: 1, timestamp: -1 });
TransactionSchema.index({ toAddress: 1, timestamp: -1 });
TransactionSchema.index({ bondId: 1, type: 1, timestamp: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
