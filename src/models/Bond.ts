import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface pour une obligation émise
 */
export interface IBond extends Document {
  bondId: string;                    // ID unique de l'obligation
  issuerAddress: string;             // Adresse XRPL de l'émetteur
  issuerName: string;                // Nom de l'entreprise émettrice
  
  // Informations de l'obligation
  tokenCurrency: string;             // Code du token MPT sur XRPL (hex)
  tokenName: string;                 // Nom lisible du token
  totalSupply: string;               // Nombre total de tokens émis
  denomination: string;              // Valeur nominale par token (en USDC micro-units)
  usdcIssuer?: string;               // Issuer du token USDC sur XRPL
  
  // Conditions financières
  couponRate: number;                // Taux du coupon (ex: 5 pour 5%)
  couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  maturityDate: number;              // Date d'échéance (timestamp)
  issueDate: number;                 // Date d'émission (timestamp)
  nextCouponDate: number;            // Prochaine date de paiement de coupon
  
  // Statut
  status: 'active' | 'matured' | 'defaulted' | 'cancelled';
  
  // Métadonnées
  description: string;
  riskRating?: string;               // AAA, AA, A, BBB, etc.
  
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
    enum: ['monthly', 'quarterly', 'semi-annual', 'annual'],
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
  }
}, {
  timestamps: true
});

// Index composé pour les requêtes fréquentes
BondSchema.index({ status: 1, nextCouponDate: 1 });
BondSchema.index({ issuerAddress: 1, status: 1 });

export const Bond = mongoose.model<IBond>('Bond', BondSchema);
