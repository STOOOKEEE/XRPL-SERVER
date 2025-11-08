import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { Bond } from '../models/Bond';
import { BondHolder } from '../models/BondHolder';
import { Transaction } from '../models/Transaction';
import { CouponPayment } from '../models/CouponPayment';

dotenv.config();

/**
 * Script de test complet du workflow
 */
async function testWorkflow() {
  try {
    await connectDB();
    console.log('✅ Connecté à MongoDB\n');

    // 1. Créer une obligation de test
    console.log('📝 1. Création d\'une obligation de test...');
    const bond = await Bond.create({
      bondId: `TEST-BOND-${Date.now()}`,
      issuerAddress: 'rTestIssuer123456789',
      issuerName: 'Test Corporation',
      tokenCurrency: '00000000000000000000000054455354', // "TEST" en hex
      tokenName: 'Test Corp 7% 2029',
      totalSupply: '1000000000', // 1000 tokens
      denomination: '1000000',   // 1 USDC par token
      couponRate: 7.0,
      couponFrequency: 'quarterly',
      issueDate: Date.now(),
      maturityDate: new Date('2029-12-31').getTime(),
      nextCouponDate: Date.now() + (90 * 24 * 60 * 60 * 1000), // +90 jours
      status: 'active',
      description: 'Obligation de test pour développement'
    });
    console.log(`   ✅ Obligation créée: ${bond.bondId}\n`);

    // 2. Simuler des détenteurs
    console.log('👥 2. Création de détenteurs simulés...');
    const holders = [
      {
        bondId: bond.bondId,
        holderAddress: 'rHolder1AAAA',
        balance: '500000000', // 500 tokens
        firstAcquisitionDate: Date.now(),
        lastUpdateDate: Date.now(),
        totalCouponsReceived: '0'
      },
      {
        bondId: bond.bondId,
        holderAddress: 'rHolder2BBBB',
        balance: '300000000', // 300 tokens
        firstAcquisitionDate: Date.now(),
        lastUpdateDate: Date.now(),
        totalCouponsReceived: '0'
      },
      {
        bondId: bond.bondId,
        holderAddress: 'rHolder3CCCC',
        balance: '200000000', // 200 tokens
        firstAcquisitionDate: Date.now(),
        lastUpdateDate: Date.now(),
        totalCouponsReceived: '0'
      }
    ];

    await BondHolder.insertMany(holders);
    console.log(`   ✅ ${holders.length} détenteurs créés\n`);

    // 3. Simuler des transactions
    console.log('💸 3. Simulation de transactions...');
    const transactions = [
      {
        bondId: bond.bondId,
        txHash: `TX-ISSUANCE-${Date.now()}`,
        ledgerIndex: 12345,
        fromAddress: bond.issuerAddress,
        toAddress: 'rHolder1AAAA',
        amount: '500000000',
        type: 'issuance',
        timestamp: Date.now() - 1000
      },
      {
        bondId: bond.bondId,
        txHash: `TX-TRANSFER-${Date.now()}`,
        ledgerIndex: 12346,
        fromAddress: 'rHolder1AAAA',
        toAddress: 'rHolder2BBBB',
        amount: '100000000',
        type: 'transfer',
        timestamp: Date.now()
      }
    ];

    await Transaction.insertMany(transactions);
    console.log(`   ✅ ${transactions.length} transactions enregistrées\n`);

    // 4. Calculer et simuler un paiement de coupon
    console.log('💰 4. Simulation de paiement de coupon...');
    
    // Calcul du coupon pour chaque holder
    const recipients = holders.map(holder => {
      const balance = BigInt(holder.balance);
      const denomination = BigInt(bond.denomination);
      const rate = BigInt(Math.floor(bond.couponRate * 100));
      
      // Coupon = (balance * denomination * rate / 10000) / 4 (quarterly)
      const amount = (balance * denomination * rate) / (BigInt(10000) * BigInt(4));
      
      return {
        holderAddress: holder.holderAddress,
        balance: holder.balance,
        amount: amount.toString(),
        status: 'paid' as const,
        txHash: `TX-COUPON-${holder.holderAddress}-${Date.now()}`
      };
    });

    const totalAmount = recipients.reduce(
      (sum, r) => sum + BigInt(r.amount),
      BigInt(0)
    );

    const couponPayment = await CouponPayment.create({
      bondId: bond.bondId,
      paymentDate: Date.now(),
      periodStart: Date.now() - (90 * 24 * 60 * 60 * 1000),
      periodEnd: Date.now(),
      totalAmount: totalAmount.toString(),
      couponRate: bond.couponRate,
      recipients,
      status: 'completed',
      executionTxHashes: recipients.map(r => r.txHash!)
    });

    console.log(`   ✅ Coupon distribué: ${totalAmount.toString()} micro-units`);
    console.log(`   💵 Détails par holder:`);
    recipients.forEach(r => {
      console.log(`      - ${r.holderAddress}: ${r.amount} micro-units`);
    });
    console.log();

    // 5. Afficher les statistiques
    console.log('📊 5. Statistiques finales:');
    console.log(`   Obligation: ${bond.tokenName}`);
    console.log(`   Total Supply: ${bond.totalSupply} tokens`);
    console.log(`   Nombre de holders: ${holders.length}`);
    console.log(`   Total distribué: ${holders.reduce((sum, h) => sum + BigInt(h.balance), BigInt(0)).toString()} tokens`);
    console.log(`   Nombre de transactions: ${transactions.length}`);
    console.log(`   Total coupons payés: ${totalAmount.toString()} micro-units USDC\n`);

    // 6. Vérification des données
    console.log('✓ 6. Vérification de la cohérence...');
    const bondCount = await Bond.countDocuments({ bondId: bond.bondId });
    const holderCount = await BondHolder.countDocuments({ bondId: bond.bondId });
    const txCount = await Transaction.countDocuments({ bondId: bond.bondId });
    const couponCount = await CouponPayment.countDocuments({ bondId: bond.bondId });

    console.log(`   ✓ Bonds: ${bondCount}`);
    console.log(`   ✓ Holders: ${holderCount}`);
    console.log(`   ✓ Transactions: ${txCount}`);
    console.log(`   ✓ Coupons: ${couponCount}\n`);

    console.log('🎉 Test complet réussi!\n');
    console.log('💡 Prochaines étapes:');
    console.log('   1. Démarrez le serveur: pnpm run dev');
    console.log('   2. Testez l\'API: curl http://localhost:3001/api/bonds');
    console.log(`   3. Consultez cette obligation: curl http://localhost:3001/api/bonds/${bond.bondId}`);
    console.log(`   4. Nettoyez les données de test si nécessaire\n`);

    await disconnectDB();
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    await disconnectDB();
    process.exit(1);
  }
}

testWorkflow();
