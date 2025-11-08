import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { CouponDistributionService } from '../services/CouponDistributionService';

dotenv.config();

/**
 * Script pour exécuter manuellement les paiements de coupons
 */
async function executeCoupons() {
  const issuerSeed = process.env.ISSUER_SEED;

  if (!issuerSeed) {
    console.error('❌ ISSUER_SEED non configuré dans .env');
    process.exit(1);
  }

  try {
    await connectDB();

    const couponService = new CouponDistributionService(
      issuerSeed,
      process.env.XRPL_URL || 'wss://s.altnet.rippletest.net:51233'
    );

    console.log('💰 Exécution des paiements de coupons dus...');
    await couponService.executeScheduledPayments();

    console.log('📅 Planification des prochains paiements...');
    await couponService.scheduleAllCouponPayments();

    await disconnectDB();
    console.log('✅ Traitement terminé');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution:', error);
    process.exit(1);
  }
}

executeCoupons();
