import { connectDB, disconnectDB } from '../config/database';
import { Campaign } from '../models/Campaign';

/**
 * Script pour créer une nouvelle campagne de fundraising
 */

async function createCampaign() {
  try {
    await connectDB();
    
    // Configuration de la campagne
    const campaignData = {
      campaignId: `CAMPAIGN-${Date.now()}`,
      companyAddress: 'rDxsuBd4N45CoVPJggaxHi8zTowN7YnQrg', // Remplacer par votre adresse
      companyName: 'Ma Startup',
      title: 'Levée de fonds pour développer notre plateforme',
      description: 'Nous cherchons à lever 1M USDC pour financer le développement de notre solution innovante.',
      objectif: '1000000000000', // 1,000,000 USDC en micro-units (1M * 1,000,000)
      deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // +30 jours
      usdcIssuer: 'rUSDCIssuerAddress' // Remplacer par l'issuer USDC du testnet
    };
    
    console.log('🚀 Création de la campagne...\n');
    console.log('📋 Données:');
    console.log(`   ID: ${campaignData.campaignId}`);
    console.log(`   Entreprise: ${campaignData.companyName}`);
    console.log(`   Titre: ${campaignData.title}`);
    console.log(`   Objectif: ${campaignData.objectif} micro-units`);
    console.log(`   Deadline: ${new Date(campaignData.deadline * 1000).toISOString()}`);
    console.log();
    
    // Vérifier si existe déjà
    const existing = await Campaign.findOne({ campaignId: campaignData.campaignId });
    if (existing) {
      console.log('⚠️  Une campagne avec cet ID existe déjà');
      await disconnectDB();
      return;
    }
    
    // Créer la campagne
    const campaign = new Campaign(campaignData);
    await campaign.save();
    
    console.log('✅ Campagne créée avec succès!\n');
    console.log('📊 Détails:');
    console.log(`   MongoDB _id: ${campaign._id}`);
    console.log(`   Campaign ID: ${campaign.campaignId}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Total raised: ${campaign.totalRaised}`);
    console.log();
    console.log('🔗 Pour investir, les utilisateurs doivent:');
    console.log(`   1. Créer un EscrowCreate vers: ${campaign.companyAddress}`);
    console.log(`   2. Mettre dans le Data field: {"campaignId":"${campaign.campaignId}"}`);
    console.log(`   3. Spécifier le montant en USDC`);
    console.log();
    console.log('📡 Le monitor détectera automatiquement les investissements');
    
    await disconnectDB();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createCampaign();
}

export { createCampaign };
