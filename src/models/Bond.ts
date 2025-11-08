import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface pour une obligation émise
 * Table unique qui répertorie toutes les obligations
 */
export interface IBond extends Document {
  bondId: string;                    // ID unique de l'obligation
  issuerAddress: string;             // Adresse XRPL de l'émetteur
  issuerName: string;                // Nom de l'entreprise émettrice
  
  // Informations du token
  tokenCurrency: string;             // Code du token MPT sur XRPL (hex)
  tokenName: string;                 // Nom lisible du token
  totalSupply: string;               // Nombre total de tokens émis
  denomination: string;              // Valeur nominale par token (en USDC micro-units)
  usdcIssuer?: string;               // Issuer du token USDC sur XRPL
  
  // Conditions financières
  couponRate: number;                // Taux du coupon (ex: 5 pour 5%)
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'none';
  maturityDate: number;              // Date d'échéance (timestamp)
  issueDate: number;                 // Date d'émission (timestamp)
  nextCouponDate: number;            // Prochaine date de paiement de coupon
  
  // Statut et métadonnées
  status: 'active' | 'matured' | 'defaulted' | 'cancelled';
  description: string;
  riskRating?: string;               // AAA, AA, A, BBB, etc.
  
  // Statistiques (calculées et mises à jour automatiquement)
  stats: {
    totalInvestors: number;          // Nombre total d'investisseurs
    totalInvested: string;           // Montant total investi (en tokens)
    percentageDistributed: number;   // % du totalSupply distribué
    lastTransactionDate?: number;    // Dernière transaction
    totalCouponsPaid: string;        // Total des coupons payés
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const BondSchema = new Schema<IBond>({
  bondId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  issuerAddress: { 
    type: String, 
    required: true,
    index: true 
  },
  issuerName: { 
    type: String, 
    required: true 
  },
  tokenCurrency: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  tokenName: { 
    type: String, 
    required: true 
  },
  totalSupply: { 
    type: String, 
    required: true 
  },
  denomination: { 
    type: String, 
    required: true 
  },
  usdcIssuer: { 
    type: String 
  },
  couponRate: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100 
  },
  couponFrequency: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'semi-annual', 'annual', 'none'],
    required: true 
  },
  maturityDate: { 
    type: Number, 
    required: true 
  },
  issueDate: { 
    type: Number, 
    required: true 
  },
  nextCouponDate: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'matured', 'defaulted', 'cancelled'],
    default: 'active',
    index: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  riskRating: { 
    type: String 
  },
  stats: {
    totalInvestors: { type: Number, default: 0 },
    totalInvested: { type: String, default: '0' },
    percentageDistributed: { type: Number, default: 0 },
    lastTransactionDate: { type: Number },
    totalCouponsPaid: { type: String, default: '0' }
  }
}, {
  timestamps: true
});

// Index composés pour requêtes fréquentes
BondSchema.index({ status: 1, nextCouponDate: 1 });
BondSchema.index({ issuerAddress: 1, status: 1 });

export const Bond = mongoose.model<IBond>('Bond', BondSchema);
