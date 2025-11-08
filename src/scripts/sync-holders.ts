import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { BondTransactionMonitor } from '../services/BondTransactionMonitor';

dotenv.config();

/**
 * Script pour synchroniser les holders depuis le ledger XRPL
 */
async function syncHolders() {
  const bondId = process.argv[2];

  if (!bondId) {
    console.error('❌ Usage: npm run sync-holders <bondId>');
    process.exit(1);
  }

  try {
    await connectDB();

    const monitor = new BondTransactionMonitor(
      process.env.XRPL_URL || 'wss://s.altnet.rippletest.net:51233'
    );

    console.log(`🔄 Synchronisation des holders pour ${bondId}...`);
    await monitor.syncBondHolders(bondId);

    await disconnectDB();
    console.log('✅ Synchronisation terminée');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    process.exit(1);
  }
}

syncHolders();
