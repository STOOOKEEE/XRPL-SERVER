import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { Bond } from '../models/Bond';
import { getBondInvestorModel } from '../models/BondInvestor';
import { BondStatsService } from '../services/BondStatsService';

dotenv.config();

/**
 * Script de demonstration de l'actualisation automatique des statistiques
 * Ajoute des investisseurs et montre comment les stats se mettent a jour
 */
async function demonstrateAutoUpdate() {
  try {
    await connectDB();
    console.log('✅ Connecte a MongoDB\n');

    // Trouve l'obligation Tesla
    const bondId = 'BOND-TESLA-2030';
    const bond = await Bond.findOne({ bondId });
    
    if (!bond) {
      console.log('❌ Obligation non trouvee. Creez-la d\'abord avec:');
      console.log('   POST http://localhost:3001/api/bonds');
      process.exit(1);
    }

    console.log(`📊 Obligation: ${bond.tokenName}`);
    console.log(`   Total Supply: ${bond.totalSupply}`);
    console.log('');

    // Affiche les stats initiales
    console.log('=== STATS INITIALES ===');
    let stats = await BondStatsService.getBondDetailedStats(bondId);
    console.log(`   Total investisseurs: ${stats.stats.totalInvestors}`);
    console.log(`   Total investi: ${stats.stats.totalInvested}`);
    console.log(`   Pourcentage distribue: ${stats.stats.percentageDistributed}%`);
    console.log('');

    // Recupere le modele d'investisseurs
    const InvestorModel = getBondInvestorModel(bondId);

    // Ajoute le premier investisseur (10%)
    console.log('➕ Ajout investisseur 1 (10% du total)...');
    const balance1 = '500000000000'; // 10% de 5000000000000
    const percentage1 = Number((BigInt(balance1) * BigInt(10000)) / BigInt(bond.totalSupply)) / 100;
    const now = Date.now();
    
    await InvestorModel.create({
      investorAddress: 'rInvestor1AAAA11111111111111',
      balance: balance1,
      percentage: percentage1,
      investedAmount: '500000000', // 500 USDC
      firstInvestmentDate: now,
      lastUpdateDate: now,
      transactionHistory: [{
        type: 'buy',
        amount: balance1,
        txHash: 'DEMO_TX_HASH_1',
        timestamp: now,
        fromAddress: 'rIssuer',
        toAddress: 'rInvestor1AAAA11111111111111'
      }],
      totalCouponsReceived: '0'
    });

    // Met a jour les stats
    await BondStatsService.updateBondStats(bondId);
    
    // Affiche les stats actualisees
    stats = await BondStatsService.getBondDetailedStats(bondId);
    console.log('   ✅ Stats actualisees:');
    console.log(`      Total investisseurs: ${stats.stats.totalInvestors}`);
    console.log(`      Total investi: ${stats.stats.totalInvested}`);
    console.log(`      Pourcentage distribue: ${stats.stats.percentageDistributed}%`);
    console.log('');

    // Ajoute le deuxieme investisseur (20%)
    console.log('➕ Ajout investisseur 2 (20% du total)...');
    const balance2 = '1000000000000'; // 20% de 5000000000000
    const percentage2 = Number((BigInt(balance2) * BigInt(10000)) / BigInt(bond.totalSupply)) / 100;
    const now2 = Date.now();
    
    await InvestorModel.create({
      investorAddress: 'rInvestor2BBBB22222222222222',
      balance: balance2,
      percentage: percentage2,
      investedAmount: '1000000000', // 1000 USDC
      firstInvestmentDate: now2,
      lastUpdateDate: now2,
      transactionHistory: [{
        type: 'buy',
        amount: balance2,
        txHash: 'DEMO_TX_HASH_2',
        timestamp: now2,
        fromAddress: 'rIssuer',
        toAddress: 'rInvestor2BBBB22222222222222'
      }],
      totalCouponsReceived: '0'
    });

    await BondStatsService.updateBondStats(bondId);
    
    stats = await BondStatsService.getBondDetailedStats(bondId);
    console.log('   ✅ Stats actualisees:');
    console.log(`      Total investisseurs: ${stats.stats.totalInvestors}`);
    console.log(`      Total investi: ${stats.stats.totalInvested}`);
    console.log(`      Pourcentage distribue: ${stats.stats.percentageDistributed}%`);
    console.log('');

    // Ajoute le troisieme investisseur (5%)
    console.log('➕ Ajout investisseur 3 (5% du total)...');
    const balance3 = '250000000000'; // 5% de 5000000000000
    const percentage3 = Number((BigInt(balance3) * BigInt(10000)) / BigInt(bond.totalSupply)) / 100;
    const now3 = Date.now();
    
    await InvestorModel.create({
      investorAddress: 'rInvestor3CCCC33333333333333',
      balance: balance3,
      percentage: percentage3,
      investedAmount: '250000000', // 250 USDC
      firstInvestmentDate: now3,
      lastUpdateDate: now3,
      transactionHistory: [{
        type: 'buy',
        amount: balance3,
        txHash: 'DEMO_TX_HASH_3',
        timestamp: now3,
        fromAddress: 'rIssuer',
        toAddress: 'rInvestor3CCCC33333333333333'
      }],
      totalCouponsReceived: '0'
    });

    await BondStatsService.updateBondStats(bondId);
    
    stats = await BondStatsService.getBondDetailedStats(bondId);
    console.log('   ✅ Stats actualisees:');
    console.log(`      Total investisseurs: ${stats.stats.totalInvestors}`);
    console.log(`      Total investi: ${stats.stats.totalInvested}`);
    console.log(`      Pourcentage distribue: ${stats.stats.percentageDistributed}%`);
    console.log('');

    // Affiche les statistiques detaillees finales
    console.log('=== STATISTIQUES FINALES DETAILLEES ===');
    console.log(JSON.stringify(stats, null, 2));
    console.log('');

    // Affiche les investisseurs
    console.log('=== LISTE DES INVESTISSEURS ===');
    const investors = await InvestorModel.find({}).sort({ percentage: -1 });
    investors.forEach((inv, index) => {
      console.log(`${index + 1}. ${inv.investorAddress}`);
      console.log(`   Balance: ${inv.balance}`);
      console.log(`   Pourcentage: ${inv.percentage}%`);
      console.log(`   Investi: ${inv.investedAmount} USDC`);
      console.log('');
    });

    console.log('✅ Demonstration terminee!');
    console.log('');
    console.log('💡 Les stats se sont actualisees automatiquement apres chaque ajout d\'investisseur');
    console.log('💡 Le systeme calcule automatiquement:');
    console.log('   - Le nombre total d\'investisseurs');
    console.log('   - Le montant total investi');
    console.log('   - Le pourcentage de distribution');
    console.log('   - La repartition par categorie (whales, large, medium, small)');
    console.log('   - L\'indice de concentration');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    await disconnectDB();
    process.exit(1);
  }
}

demonstrateAutoUpdate();
