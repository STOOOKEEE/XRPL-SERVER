import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { CouponDistributionService } from '../services/CouponDistributionService';
import { Bond } from '../models/Bond';

dotenv.config();

/**
 * Script pour executer manuellement les paiements de coupons
 */
async function executeCoupons() {
  const issuerSeed = process.env.ISSUER_SEED;

  if (!issuerSeed) {
    console.error('ISSUER_SEED non configure dans .env');
    process.exit(1);
  }

  try {
    await connectDB();

    const couponService = new CouponDistributionService(
      issuerSeed,
      process.env.XRPL_URL || 'wss://s.altnet.rippletest.net:51233'
    );

    // Recupere toutes les obligations actives
    const activeBonds = await Bond.find({ status: 'active' });
    console.log(`Found ${activeBonds.length} active bond(s)`);

    for (const bond of activeBonds) {
      console.log(`\nProcessing coupon payments for ${bond.tokenName}...`);
      await couponService.executeScheduledPayments(bond.bondId);
    }

    await disconnectDB();
    console.log('\nAll coupon payments processed');
    process.exit(0);
  } catch (error) {
    console.error('Error during execution:', error);
    process.exit(1);
  }
}

executeCoupons();
