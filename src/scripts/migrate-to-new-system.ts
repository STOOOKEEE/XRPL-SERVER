import dotenv from 'dotenv';

dotenv.config();

/**
 * Script de migration de l'ancien système vers le nouveau
 * 
 * Note: Ce script a été désactivé car les anciens modèles (BondHolder, Transaction, CouponPayment)
 * ont été supprimés du projet. La nouvelle architecture utilise uniquement:
 * - Une collection globale 'bonds' 
 * - Des collections dynamiques 'investors_<bondId>' par obligation
 * 
 * Si vous avez besoin de migrer des données historiques, restaurez temporairement
 * les anciens modèles depuis l'historique git.
 */
async function migrate() {
  console.log('⚠️  Ce script de migration nécessite les anciens modèles qui ont été supprimés');
  console.log('ℹ️  Si vous avez besoin de migrer des données, restaurez temporairement BondHolder.ts, Transaction.ts et CouponPayment.ts depuis git');
  console.log('📚 Nouvelle architecture:');
  console.log('   - Collection bonds: Toutes les obligations avec stats intégrées');
  console.log('   - Collections investors_<bondId>: Un collection par obligation pour ses investisseurs');
  console.log('   - Historique des transactions: Stocké dans investor.transactionHistory');
  process.exit(0);
}

migrate().catch(console.error);
