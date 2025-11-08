import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { Bond } from '../models/Bond';
import { getBondInvestorModel } from '../models/BondInvestor';
import { BondStatsService } from '../services/BondStatsService';

dotenv.config();

/**
 * Script de test avec 2 obligations et des investisseurs communs
 */
async function testMultipleBonds() {
  try {
    await connectDB();
    console.log('✅ Connecte a MongoDB\n');

    // === ÉTAPE 1: Créer une nouvelle obligation ===
    console.log('=== CRÉATION D\'UNE NOUVELLE OBLIGATION ===\n');
    
    const newBondData = {
      bondId: 'BOND-APPLE-2027',
      issuerAddress: 'rAppleIssuerXXXXXXXXXXXXXXXX',
      issuerName: 'Apple Inc.',
      tokenCurrency: '4150504C4500000000000000', // "APPLE" en hex
      tokenName: 'Apple Tech Bond 5.5% 2027',
      totalSupply: '3000000000000', // 3 millions de tokens
      denomination: '1000000',
      couponRate: 5.5,
      couponFrequency: 'quarterly' as const,
      issueDate: Date.now(),
      maturityDate: Date.now() + (3 * 365 * 24 * 3600 * 1000), // +3 ans
      nextCouponDate: Date.now() + (90 * 24 * 3600 * 1000), // +90 jours
      status: 'active' as const,
      description: 'Obligation technologique Apple pour R&D et expansion'
    };

    const appleBond = await Bond.create(newBondData);
    console.log(`✅ ${appleBond.tokenName} créée`);
    console.log(`   ID: ${appleBond.bondId}`);
    console.log(`   Total Supply: ${appleBond.totalSupply}`);
    console.log(`   Taux: ${appleBond.couponRate}%`);
    console.log('');

    // === ÉTAPE 2: Vérifier l'obligation Tesla existante ===
    console.log('=== OBLIGATION TESLA EXISTANTE ===\n');
    const teslaBond = await Bond.findOne({ bondId: 'BOND-TESLA-2030' });
    if (!teslaBond) {
      console.log('❌ Obligation Tesla non trouvée!');
      process.exit(1);
    }
    console.log(`✅ ${teslaBond.tokenName}`);
    console.log(`   Total Supply: ${teslaBond.totalSupply}`);
    console.log(`   Stats actuelles: ${teslaBond.stats.totalInvestors} investisseurs, ${teslaBond.stats.percentageDistributed}% distribué`);
    console.log('');

    // === ÉTAPE 3: Créer des investisseurs pour Apple (uniquement Apple) ===
    console.log('=== INVESTISSEURS UNIQUEMENT SUR APPLE ===\n');
    const AppleInvestorModel = getBondInvestorModel('BOND-APPLE-2027');
    const now = Date.now();

    const appleOnlyInvestors = [
      {
        address: 'rAppleInvestor1AAAAAA111111111',
        balance: '300000000000', // 10% de Apple
        investedAmount: '300000000'
      },
      {
        address: 'rAppleInvestor2BBBBBBB222222222',
        balance: '600000000000', // 20% de Apple
        investedAmount: '600000000'
      }
    ];

    for (const inv of appleOnlyInvestors) {
      const percentage = Number((BigInt(inv.balance) * BigInt(10000)) / BigInt(appleBond.totalSupply)) / 100;
      await AppleInvestorModel.create({
        investorAddress: inv.address,
        balance: inv.balance,
        percentage,
        investedAmount: inv.investedAmount,
        firstInvestmentDate: now,
        lastUpdateDate: now,
        transactionHistory: [{
          type: 'buy',
          amount: inv.balance,
          txHash: `APPLE_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now,
          fromAddress: 'rAppleIssuerXXXXXXXXXXXXXXXX',
          toAddress: inv.address
        }],
        totalCouponsReceived: '0'
      });
      console.log(`✅ ${inv.address.substring(0, 25)}... ajouté à Apple (${percentage}%)`);
    }

    await BondStatsService.updateBondStats('BOND-APPLE-2027');
    console.log('');

    // === ÉTAPE 4: Créer des investisseurs pour Tesla (uniquement Tesla) ===
    console.log('=== INVESTISSEURS UNIQUEMENT SUR TESLA ===\n');
    const TeslaInvestorModel = getBondInvestorModel('BOND-TESLA-2030');

    const teslaOnlyInvestors = [
      {
        address: 'rTeslaInvestor1CCCCCC333333333',
        balance: '250000000000', // 5% de Tesla
        investedAmount: '250000000'
      },
      {
        address: 'rTeslaInvestor2DDDDDD444444444',
        balance: '500000000000', // 10% de Tesla
        investedAmount: '500000000'
      }
    ];

    for (const inv of teslaOnlyInvestors) {
      const percentage = Number((BigInt(inv.balance) * BigInt(10000)) / BigInt(teslaBond.totalSupply)) / 100;
      await TeslaInvestorModel.create({
        investorAddress: inv.address,
        balance: inv.balance,
        percentage,
        investedAmount: inv.investedAmount,
        firstInvestmentDate: now,
        lastUpdateDate: now,
        transactionHistory: [{
          type: 'buy',
          amount: inv.balance,
          txHash: `TESLA_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now,
          fromAddress: 'rN7n7otQDd6FczFgLdlqtyMVrn3HMgkk62',
          toAddress: inv.address
        }],
        totalCouponsReceived: '0'
      });
      console.log(`✅ ${inv.address.substring(0, 25)}... ajouté à Tesla (${percentage}%)`);
    }

    await BondStatsService.updateBondStats('BOND-TESLA-2030');
    console.log('');

    // === ÉTAPE 5: Créer des investisseurs COMMUNS aux deux obligations ===
    console.log('=== INVESTISSEURS COMMUNS AUX DEUX OBLIGATIONS ===\n');

    const commonInvestors = [
      {
        address: 'rCommonInvestor1EEEEE555555555',
        apple: { balance: '450000000000', invested: '450000000' }, // 15% de Apple
        tesla: { balance: '1000000000000', invested: '1000000000' } // 20% de Tesla
      },
      {
        address: 'rCommonInvestor2FFFFF666666666',
        apple: { balance: '300000000000', invested: '300000000' }, // 10% de Apple
        tesla: { balance: '750000000000', invested: '750000000' } // 15% de Tesla
      },
      {
        address: 'rCommonInvestor3GGGGG777777777',
        apple: { balance: '150000000000', invested: '150000000' }, // 5% de Apple
        tesla: { balance: '250000000000', invested: '250000000' } // 5% de Tesla
      }
    ];

    for (const inv of commonInvestors) {
      // Ajout sur Apple
      const applePercentage = Number((BigInt(inv.apple.balance) * BigInt(10000)) / BigInt(appleBond.totalSupply)) / 100;
      await AppleInvestorModel.create({
        investorAddress: inv.address,
        balance: inv.apple.balance,
        percentage: applePercentage,
        investedAmount: inv.apple.invested,
        firstInvestmentDate: now,
        lastUpdateDate: now,
        transactionHistory: [{
          type: 'buy',
          amount: inv.apple.balance,
          txHash: `APPLE_COMMON_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now,
          fromAddress: 'rAppleIssuerXXXXXXXXXXXXXXXX',
          toAddress: inv.address
        }],
        totalCouponsReceived: '0'
      });

      // Ajout sur Tesla
      const teslaPercentage = Number((BigInt(inv.tesla.balance) * BigInt(10000)) / BigInt(teslaBond.totalSupply)) / 100;
      await TeslaInvestorModel.create({
        investorAddress: inv.address,
        balance: inv.tesla.balance,
        percentage: teslaPercentage,
        investedAmount: inv.tesla.invested,
        firstInvestmentDate: now,
        lastUpdateDate: now,
        transactionHistory: [{
          type: 'buy',
          amount: inv.tesla.balance,
          txHash: `TESLA_COMMON_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now,
          fromAddress: 'rN7n7otQDd6FczFgLdlqtyMVrn3HMgkk62',
          toAddress: inv.address
        }],
        totalCouponsReceived: '0'
      });

      console.log(`✅ ${inv.address.substring(0, 25)}...`);
      console.log(`   → Apple: ${applePercentage}% (${inv.apple.invested} USDC)`);
      console.log(`   → Tesla: ${teslaPercentage}% (${inv.tesla.invested} USDC)`);
    }

    await BondStatsService.updateBondStats('BOND-APPLE-2027');
    await BondStatsService.updateBondStats('BOND-TESLA-2030');
    console.log('');

    // === ÉTAPE 6: Afficher les statistiques finales ===
    console.log('=== STATISTIQUES FINALES ===\n');

    const appleStats = await BondStatsService.getBondDetailedStats('BOND-APPLE-2027');
    const teslaStats = await BondStatsService.getBondDetailedStats('BOND-TESLA-2030');

    console.log('📊 APPLE BOND:');
    console.log(`   Total investisseurs: ${appleStats.stats.totalInvestors}`);
    console.log(`   Pourcentage distribué: ${appleStats.stats.percentageDistributed}%`);
    console.log(`   Distribution: ${appleStats.distribution.whales} whales, ${appleStats.distribution.large} large, ${appleStats.distribution.medium} medium, ${appleStats.distribution.small} small`);
    console.log('');

    console.log('📊 TESLA BOND:');
    console.log(`   Total investisseurs: ${teslaStats.stats.totalInvestors}`);
    console.log(`   Pourcentage distribué: ${teslaStats.stats.percentageDistributed}%`);
    console.log(`   Distribution: ${teslaStats.distribution.whales} whales, ${teslaStats.distribution.large} large, ${teslaStats.distribution.medium} medium, ${teslaStats.distribution.small} small`);
    console.log('');

    // === ÉTAPE 7: Identifier les investisseurs communs ===
    console.log('=== ANALYSE DES INVESTISSEURS COMMUNS ===\n');

    const appleInvestors = await AppleInvestorModel.find({});
    const teslaInvestors = await TeslaInvestorModel.find({});

    const appleAddresses = new Set(appleInvestors.map(i => i.investorAddress));
    const teslaAddresses = new Set(teslaInvestors.map(i => i.investorAddress));

    const commonAddresses = [...appleAddresses].filter(addr => teslaAddresses.has(addr));
    const appleOnlyAddresses = [...appleAddresses].filter(addr => !teslaAddresses.has(addr));
    const teslaOnlyAddresses = [...teslaAddresses].filter(addr => !appleAddresses.has(addr));

    console.log(`👥 Investisseurs communs aux 2 obligations: ${commonAddresses.length}`);
    console.log(`🍎 Investisseurs uniquement sur Apple: ${appleOnlyAddresses.length}`);
    console.log(`⚡ Investisseurs uniquement sur Tesla: ${teslaOnlyAddresses.length}`);
    console.log('');

    if (commonAddresses.length > 0) {
      console.log('📋 DÉTAILS DES INVESTISSEURS COMMUNS:\n');
      for (const addr of commonAddresses) {
        const appleInv = appleInvestors.find(i => i.investorAddress === addr);
        const teslaInv = teslaInvestors.find(i => i.investorAddress === addr);
        
        console.log(`   ${addr.substring(0, 30)}...`);
        console.log(`      Apple: ${appleInv?.percentage}% (${appleInv?.investedAmount} USDC)`);
        console.log(`      Tesla: ${teslaInv?.percentage}% (${teslaInv?.investedAmount} USDC)`);
        
        const totalInvested = BigInt(appleInv?.investedAmount || '0') + BigInt(teslaInv?.investedAmount || '0');
        console.log(`      Total investi: ${totalInvested.toString()} USDC`);
        console.log('');
      }
    }

    // === ÉTAPE 8: Afficher le top investisseurs de chaque obligation ===
    console.log('=== TOP 5 INVESTISSEURS PAR OBLIGATION ===\n');

    console.log('🍎 APPLE - Top 5:');
    appleStats.top10Investors.slice(0, 5).forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.address.substring(0, 25)}... - ${inv.percentage}%`);
    });
    console.log('');

    console.log('⚡ TESLA - Top 5:');
    teslaStats.top10Investors.slice(0, 5).forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.address.substring(0, 25)}... - ${inv.percentage}%`);
    });
    console.log('');

    console.log('✅ Test terminé avec succès!');
    console.log('');
    console.log('💡 Résumé:');
    console.log(`   - 2 obligations créées (Apple et Tesla)`);
    console.log(`   - ${appleStats.stats.totalInvestors} investisseurs sur Apple`);
    console.log(`   - ${teslaStats.stats.totalInvestors} investisseurs sur Tesla`);
    console.log(`   - ${commonAddresses.length} investisseurs communs`);
    console.log(`   - Chaque obligation a sa propre collection MongoDB dynamique`);
    console.log(`   - Les statistiques sont calculées indépendamment pour chaque obligation`);

    await disconnectDB();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await disconnectDB();
    process.exit(1);
  }
}

testMultipleBonds();
