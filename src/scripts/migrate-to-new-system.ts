import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { Bond } from '../models/Bond';
import { BondHolder } from '../models/BondHolder';
import { getBondInvestorModel } from '../models/BondInvestor';
import { BondStatsService } from '../services/BondStatsService';

dotenv.config();

/**
 * Script de migration de l'ancien système vers le nouveau
 * Migre les données de BondHolder vers les collections BondInvestor dynamiques
 */
async function migrate() {
  try {
    await connectDB();
    console.log('✅ Connecté à MongoDB\n');

    // Récupère toutes les obligations
    const bonds = await Bond.find({});
    console.log(`📊 ${bonds.length} obligations trouvées\n`);

    for (const bond of bonds) {
      console.log(`\n🔄 Migration de ${bond.bondId} (${bond.tokenName})...`);

      // Récupère les anciens holders
      const oldHolders = await BondHolder.find({ bondId: bond.bondId });
      console.log(`   📋 ${oldHolders.length} ancien(s) holder(s) trouvé(s)`);

      if (oldHolders.length === 0) {
        console.log(`   ⏭️  Aucun holder à migrer`);
        continue;
      }

      // Crée le nouveau modèle
      const InvestorModel = getBondInvestorModel(bond.bondId);

      // Migre chaque holder
      const totalSupply = BigInt(bond.totalSupply);
      const denomination = BigInt(bond.denomination);

      for (const holder of oldHolders) {
        const balance = BigInt(holder.balance);
        const percentage = Number((balance * BigInt(10000)) / totalSupply) / 100;
        const investedAmount = (balance * denomination).toString();

        // Vérifie si l'investisseur existe déjà
        const existing = await InvestorModel.findOne({ 
          investorAddress: holder.holderAddress 
        });

        if (existing) {
          console.log(`   ⚠️  ${holder.holderAddress} existe déjà, skip`);
          continue;
        }

        // Crée le nouvel investisseur
        await InvestorModel.create({
          investorAddress: holder.holderAddress,
          balance: holder.balance,
          percentage,
          investedAmount,
          firstInvestmentDate: holder.firstAcquisitionDate,
          lastUpdateDate: holder.lastUpdateDate,
          transactionHistory: [], // Historique vide (on peut le reconstruire si nécessaire)
          totalCouponsReceived: holder.totalCouponsReceived || '0',
          lastCouponDate: holder.lastCouponPaid
        });

        console.log(`   ✅ ${holder.holderAddress} → ${percentage.toFixed(2)}%`);
      }

      // Met à jour les statistiques du bond
      await BondStatsService.updateBondStats(bond.bondId);
      console.log(`   📊 Statistiques mises à jour`);
    }

    console.log(`\n\n🎉 Migration terminée !`);
    console.log(`\n💡 Les anciennes collections (bondholders, transactions, couponpayments) peuvent être supprimées manuellement si vous le souhaitez.`);
    console.log(`   Mais elles sont conservées pour compatibilité.`);

    await disconnectDB();
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    await disconnectDB();
    process.exit(1);
  }
}

migrate();
