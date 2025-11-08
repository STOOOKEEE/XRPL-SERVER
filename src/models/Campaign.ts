import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestor {
  address: string;           // rAlice...
  amount: string;            // "10000" (en micro-units USDC)
  escrowId: string;          // ID de l'escrow créé
  escrowSequence: number;    // Sequence number de l'escrow
  timestamp: number;         // Date de l'investissement
  txHash: string;            // Hash de la transaction EscrowCreate
  status: 'pending' | 'completed' | 'refunded';
}

export interface ICampaign extends Document {
  campaignId: string;        // ID unique de la campagne
  companyAddress: string;    // Adresse qui reçoit les fonds
  companyName: string;       // Nom de l'entreprise
  title: string;             // Titre de la campagne
  description: string;       // Description
  objectif: string;          // "1000000000000" (en micro-units)
  deadline: number;          // Timestamp Unix
  usdcIssuer: string;        // Issuer du token USDC
  
  investors: IInvestor[];    // Liste des investisseurs
  totalRaised: string;       // Total collecté (calculé)
  
  status: 'active' | 'success' | 'failed' | 'cancelled';
  
  createdAt: Date;
  updatedAt: Date;
}

const InvestorSchema = new Schema<IInvestor>({
  address: { type: String, required: true },
  amount: { type: String, required: true },
  escrowId: { type: String, required: true, unique: true },
  escrowSequence: { type: Number, required: true },
  timestamp: { type: Number, required: true },
  txHash: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'refunded'],
    default: 'pending'
  }
});

const CampaignSchema = new Schema<ICampaign>({
  campaignId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  companyAddress: { type: String, required: true },
  companyName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  objectif: { type: String, required: true },
  deadline: { type: Number, required: true },
  usdcIssuer: { type: String, required: true },
  
  investors: [InvestorSchema],
  totalRaised: { type: String, default: '0' },
  
  status: {
    type: String,
    enum: ['active', 'success', 'failed', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index pour recherches rapides
CampaignSchema.index({ status: 1, deadline: 1 });
CampaignSchema.index({ companyAddress: 1 });

// Méthode pour calculer le total raised
CampaignSchema.methods.calculateTotalRaised = function() {
  const total = this.investors.reduce((sum, investor) => {
    return sum + BigInt(investor.amount);
  }, BigInt(0));
  
  this.totalRaised = total.toString();
  return this.totalRaised;
};

// Méthode pour vérifier si l'objectif est atteint
CampaignSchema.methods.isObjectifReached = function(): boolean {
  return BigInt(this.totalRaised) >= BigInt(this.objectif);
};

// Méthode pour vérifier si la deadline est passée
CampaignSchema.methods.isDeadlinePassed = function(): boolean {
  return Date.now() / 1000 >= this.deadline;
};

// Hook pour mettre à jour le statut automatiquement
CampaignSchema.pre('save', function(next) {
  // Recalculer le total
  this.calculateTotalRaised();
  
  // Mettre à jour le statut si deadline passée
  if (this.isDeadlinePassed() && this.status === 'active') {
    if (this.isObjectifReached()) {
      this.status = 'success';
    } else {
      this.status = 'failed';
    }
  }
  
  next();
});

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
