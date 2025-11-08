import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { Bond } from '../models/Bond';

dotenv.config();

/**
 * Script pour tester la nouvelle frequence des coupons
 */
async function testNewFrequency() {
  try {
    await connectDB();
    console.log('✅ Connecté à MongoDB\n');

    // Affiche l'obligation existante
    console.log('=== OBLIGATION EXISTANTE (après migration) ===');
    const existingBond = await Bond.findOne({ bondId: 'BOND-TESLA-2030' });
    if (existingBond) {
      console.log(`📊 ${existingBond.tokenName}`);
      console.log(`   Taux de coupon: ${existingBond.couponRate}%`);
      console.log(`   Fréquence: Tous les ${existingBond.couponFrequencyMonths} mois`);
      console.log(`   Prochaine date: ${new Date(existingBond.nextCouponDate).toLocaleDateString('fr-FR')}`);
      console.log('');
    }

    // Crée quelques exemples d'obligations avec différentes fréquences
    const examples = [
      {
        bondId: `BOND-MONTHLY-${Date.now()}`,
        issuerAddress: 'rExampleIssuer1',
        issuerName: 'Monthly Payments Corp',
        tokenCurrency: `4D4E54484C59${Date.now().toString(16).slice(-10)}`,
        tokenName: 'Monthly Bond 6% 12M',
        totalSupply: '1000000000',
        denomination: '1000000',
        couponRate: 6.0,
        couponFrequencyMonths: 1, // Mensuel
        issueDate: Date.now(),
        maturityDate: Date.now() + 365 * 24 * 3600 * 1000,
        nextCouponDate: Date.now() + 30 * 24 * 3600 * 1000,
        status: 'active' as const,
        description: 'Obligation avec paiements mensuels'
      },
      {
        bondId: `BOND-BIMONTHLY-${Date.now()}`,
        issuerAddress: 'rExampleIssuer2',
        issuerName: 'BiMonthly Payments Corp',
        tokenCurrency: `42494D4F4E544C${Date.now().toString(16).slice(-10)}`,
        tokenName: 'BiMonthly Bond 5% 6M',
        totalSupply: '500000000',
        denomination: '1000000',
        couponRate: 5.0,
        couponFrequencyMonths: 2, // Bimensuel
        issueDate: Date.now(),
        maturityDate: Date.now() + 180 * 24 * 3600 * 1000,
        nextCouponDate: Date.now() + 60 * 24 * 3600 * 1000,
        status: 'active' as const,
        description: 'Obligation avec paiements bimensuels (tous les 2 mois)'
      },
      {
        bondId: `BOND-QUARTERLY-${Date.now()}`,
        issuerAddress: 'rExampleIssuer3',
        issuerName: 'Quarterly Payments Corp',
        tokenCurrency: `5155415254${Date.now().toString(16).slice(-12)}`,
        tokenName: 'Quarterly Bond 4.5% 24M',
        totalSupply: '2000000000',
        denomination: '1000000',
        couponRate: 4.5,
        couponFrequencyMonths: 3, // Trimestriel
        issueDate: Date.now(),
        maturityDate: Date.now() + 730 * 24 * 3600 * 1000,
        nextCouponDate: Date.now() + 90 * 24 * 3600 * 1000,
        status: 'active' as const,
        description: 'Obligation avec paiements trimestriels'
      }
    ];

    console.log('=== CRÉATION D\'EXEMPLES D\'OBLIGATIONS ===\n');
    
    for (const example of examples) {
      const bond = await Bond.create(example);
      console.log(`✅ ${bond.tokenName}`);
      console.log(`   ID: ${bond.bondId}`);
      console.log(`   Taux: ${bond.couponRate}%`);
      console.log(`   Fréquence: Tous les ${bond.couponFrequencyMonths} mois`);
      console.log(`   Prochaine date: ${new Date(bond.nextCouponDate).toLocaleDateString('fr-FR')}`);
      
      // Calcule le nombre de paiements
      const durationMs = bond.maturityDate - bond.issueDate;
      const durationMonths = durationMs / (30 * 24 * 3600 * 1000);
      const numberOfPayments = Math.floor(durationMonths / bond.couponFrequencyMonths);
      console.log(`   Nombre de paiements prévus: ${numberOfPayments}`);
      console.log('');
    }

    // Affiche toutes les obligations
    console.log('=== RÉSUMÉ DE TOUTES LES OBLIGATIONS ===');
    const allBonds = await Bond.find({}).sort({ couponFrequencyMonths: 1 });
    
    console.log('\n| Bond ID | Fréquence | Taux | Prochain paiement |');
    console.log('|---------|-----------|------|-------------------|');
    
    for (const bond of allBonds) {
      const freqLabel = bond.couponFrequencyMonths === 1 ? '1 mois' : `${bond.couponFrequencyMonths} mois`;
      const nextDate = new Date(bond.nextCouponDate).toLocaleDateString('fr-FR');
      console.log(`| ${bond.bondId.substring(0, 20).padEnd(20)} | ${freqLabel.padEnd(9)} | ${bond.couponRate}% | ${nextDate} |`);
    }

    console.log('\n✅ Tests terminés !');
    console.log('\n💡 Vous pouvez maintenant créer des obligations avec n\'importe quelle fréquence entre 1 et 120 mois.');
    
    await disconnectDB();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await disconnectDB();
    process.exit(1);
  }
}

testNewFrequency();
