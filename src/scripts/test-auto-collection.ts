import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import { Bond } from '../models/Bond';
import { getBondInvestorModel } from '../models/BondInvestor';

dotenv.config();

/**
 * Test de création automatique de collection lors de la création d'une obligation
 */
async function testAutoCollection() {
  try {
    await connectDB();
    console.log('✅ Connecté à MongoDB\n');

    // === 1. Créer une nouvelle obligation ===
    console.log('=== CRÉATION OBLIGATION ===');
    const newBond = await Bond.create({
      bondId: 'BOND-GOOGLE-2028',
      issuerAddress: 'rGoogleIssuerXXXXXXXXXXXXXX',
      issuerName: 'Google LLC',
      tokenCurrency: '474F4F470000000000000000', // GOOG
      tokenName: 'Google Tech Bond 4.8% 2028',
      totalSupply: '4000000000000',
      denomination: '1000000',
      couponRate: 4.8,
      couponFrequency: 'quarterly',
      issueDate: Date.now(),
      maturityDate: Date.now() + (3 * 365 * 24 * 60 * 60 * 1000),
      nextCouponDate: Date.now() + (90 * 24 * 60 * 60 * 1000),
      status: 'active',
      description: 'Tech bond pour financer les projets Google',
      stats: {
        totalInvestors: 0,
        totalInvested: '0',
        percentageDistributed: 0,
        totalCouponsPaid: '0'
      }
    });
    console.log(`✅ Obligation créée: ${newBond.bondId}`);
    console.log(`   Token: ${newBond.tokenName}\n`);

    // === 2. Vérifier les collections avant ajout d'investisseur ===
    console.log('=== COLLECTIONS AVANT AJOUT INVESTISSEUR ===');
    const collectionsBefore = await mongoose.connection.db.listCollections().toArray();
    const collectionNamesBefore = collectionsBefore.map(c => c.name);
    console.log('Collections existantes:', collectionNamesBefore.join(', '));
    const googleCollectionBefore = collectionNamesBefore.includes('investors_bond_google_2028');
    console.log(`Collection Google existe: ${googleCollectionBefore ? '✅ OUI' : '❌ NON'}\n`);

    // === 3. Ajouter un investisseur (création automatique de la collection) ===
    console.log('=== AJOUT PREMIER INVESTISSEUR ===');
    const GoogleInvestorModel = getBondInvestorModel('BOND-GOOGLE-2028');
    const now = Date.now();
    
    await GoogleInvestorModel.create({
      investorAddress: 'rGoogleInvestor1AAAAAAAA111',
      balance: '400000000000', // 10%
      percentage: 10,
      investedAmount: '400000000',
      firstInvestmentDate: now,
      lastUpdateDate: now,
      transactionHistory: [{
        type: 'buy',
        amount: '400000000000',
        txHash: `GOOGLE_TX_${Date.now()}`,
        timestamp: now,
        fromAddress: 'rGoogleIssuerXXXXXXXXXXXXXX',
        toAddress: 'rGoogleInvestor1AAAAAAAA111'
      }],
      totalCouponsReceived: '0'
    });
    console.log('✅ Investisseur ajouté: rGoogleInvestor1AAAAAAAA111 (10%)\n');

    // === 4. Vérifier les collections après ajout d'investisseur ===
    console.log('=== COLLECTIONS APRÈS AJOUT INVESTISSEUR ===');
    const collectionsAfter = await mongoose.connection.db.listCollections().toArray();
    const collectionNamesAfter = collectionsAfter.map(c => c.name);
    console.log('Collections existantes:', collectionNamesAfter.join(', '));
    const googleCollectionAfter = collectionNamesAfter.includes('investors_bond_google_2028');
    console.log(`Collection Google existe: ${googleCollectionAfter ? '✅ OUI' : '❌ NON'}\n`);

    // === 5. Vérifier le contenu de la nouvelle collection ===
    console.log('=== CONTENU COLLECTION GOOGLE ===');
    const investors = await GoogleInvestorModel.find();
    console.log(`Nombre d'investisseurs: ${investors.length}`);
    investors.forEach(inv => {
      console.log(`  - ${inv.investorAddress}: ${inv.percentage}% (${inv.balance} tokens)`);
    });
    console.log('');

    // === 6. Résumé ===
    console.log('=== RÉSUMÉ ===');
    console.log('✅ La collection est créée AUTOMATIQUEMENT lors du premier INSERT');
    console.log('✅ Pas besoin de code spécial pour créer la collection');
    console.log('✅ MongoDB gère la création de manière transparente');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await disconnectDB();
    console.log('👋 Déconnecté de MongoDB');
  }
}

testAutoCollection();
