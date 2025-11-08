import { Bond } from '../models/Bond';
import { getBondInvestorModel } from '../models/BondInvestor';

/**
 * Service pour gérer et mettre à jour les statistiques des obligations
 */
export class BondStatsService {
  
  /**
   * Met à jour toutes les statistiques d'une obligation
   * @param bondId - ID de l'obligation
   */
  static async updateBondStats(bondId: string): Promise<void> {
    try {
      const bond = await Bond.findOne({ bondId });
      if (!bond) {
        throw new Error(`Obligation ${bondId} introuvable`);
      }

      const InvestorModel = getBondInvestorModel(bondId);
      const investors = await InvestorModel.find({});

      // Calcule les statistiques
      const totalInvestors = investors.length;
      const totalInvested = investors.reduce(
        (sum, inv) => sum + BigInt(inv.balance),
        BigInt(0)
      ).toString();

      const totalSupply = BigInt(bond.totalSupply);
      const invested = BigInt(totalInvested);
      const percentageDistributed = totalSupply > 0
        ? Number((invested * BigInt(10000)) / totalSupply) / 100
        : 0;

      const totalCouponsPaid = investors.reduce(
        (sum, inv) => sum + BigInt(inv.totalCouponsReceived || '0'),
        BigInt(0)
      ).toString();

      // Trouve la dernière transaction
      let lastTransactionDate: number | undefined;
      for (const investor of investors) {
        if (investor.transactionHistory && investor.transactionHistory.length > 0) {
          const lastTx = investor.transactionHistory[investor.transactionHistory.length - 1];
          if (!lastTransactionDate || lastTx.timestamp > lastTransactionDate) {
            lastTransactionDate = lastTx.timestamp;
          }
        }
      }

      // Met à jour les stats du bond
      bond.stats = {
        totalInvestors,
        totalInvested,
        percentageDistributed,
        lastTransactionDate,
        totalCouponsPaid
      };

      await bond.save();
      
      console.log(`✅ Stats mises à jour pour ${bondId}: ${totalInvestors} investisseurs, ${percentageDistributed}% distribué`);
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour des stats pour ${bondId}:`, error);
      throw error;
    }
  }

  /**
   * Recalcule les pourcentages de tous les investisseurs d'une obligation
   * @param bondId - ID de l'obligation
   */
  static async recalculateInvestorPercentages(bondId: string): Promise<void> {
    try {
      const bond = await Bond.findOne({ bondId });
      if (!bond) {
        throw new Error(`Obligation ${bondId} introuvable`);
      }

      const InvestorModel = getBondInvestorModel(bondId);
      const investors = await InvestorModel.find({});
      
      const totalSupply = BigInt(bond.totalSupply);
      const denomination = BigInt(bond.denomination);

      for (const investor of investors) {
        const balance = BigInt(investor.balance);
        
        // Calcule le pourcentage
        const percentage = totalSupply > 0
          ? Number((balance * BigInt(10000)) / totalSupply) / 100
          : 0;
        
        // Calcule le montant investi (valeur nominale)
        const investedAmount = (balance * denomination).toString();
        
        investor.percentage = percentage;
        investor.investedAmount = investedAmount;
        
        await investor.save();
      }

      console.log(`✅ Pourcentages recalculés pour ${investors.length} investisseurs de ${bondId}`);
    } catch (error) {
      console.error(`❌ Erreur lors du recalcul des pourcentages pour ${bondId}:`, error);
      throw error;
    }
  }

  /**
   * Met à jour les statistiques de toutes les obligations actives
   */
  static async updateAllBondsStats(): Promise<void> {
    try {
      const bonds = await Bond.find({ status: 'active' });
      
      console.log(`🔄 Mise à jour des stats pour ${bonds.length} obligations...`);
      
      for (const bond of bonds) {
        await this.updateBondStats(bond.bondId);
      }
      
      console.log(`✅ Toutes les stats ont été mises à jour`);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour globale des stats:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques détaillées d'une obligation
   * @param bondId - ID de l'obligation
   * @returns Statistiques enrichies
   */
  static async getBondDetailedStats(bondId: string) {
    const bond = await Bond.findOne({ bondId });
    if (!bond) {
      throw new Error(`Obligation ${bondId} introuvable`);
    }

    const InvestorModel = getBondInvestorModel(bondId);
    const investors = await InvestorModel.find({}).sort({ percentage: -1 });

    // Top 10 investisseurs
    const top10Investors = investors.slice(0, 10).map(inv => ({
      address: inv.investorAddress,
      balance: inv.balance,
      percentage: inv.percentage,
      investedAmount: inv.investedAmount
    }));

    // Distribution par tranche
    const distribution = {
      whales: investors.filter(inv => inv.percentage >= 10).length, // >= 10%
      large: investors.filter(inv => inv.percentage >= 1 && inv.percentage < 10).length, // 1-10%
      medium: investors.filter(inv => inv.percentage >= 0.1 && inv.percentage < 1).length, // 0.1-1%
      small: investors.filter(inv => inv.percentage < 0.1).length // < 0.1%
    };

    // Concentration (% détenu par top 10)
    const top10Percentage = top10Investors.reduce((sum, inv) => sum + inv.percentage, 0);

    return {
      bondInfo: {
        bondId: bond.bondId,
        tokenName: bond.tokenName,
        status: bond.status,
        totalSupply: bond.totalSupply
      },
      stats: bond.stats,
      top10Investors,
      distribution,
      concentration: {
        top10Percentage,
        herfindahlIndex: this.calculateHerfindahlIndex(investors)
      }
    };
  }

  /**
   * Calcule l'indice de Herfindahl (mesure de concentration)
   * @param investors - Liste des investisseurs
   * @returns Indice entre 0 et 10000 (10000 = monopole)
   */
  private static calculateHerfindahlIndex(investors: any[]): number {
    return investors.reduce((sum, inv) => {
      return sum + Math.pow(inv.percentage, 2);
    }, 0);
  }
}
