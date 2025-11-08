import { Client, Wallet, xrpToDrops } from 'xrpl';
import { Bond } from '../models/Bond';
import { BondHolder } from '../models/BondHolder';
import { CouponPayment } from '../models/CouponPayment';
import { Transaction } from '../models/Transaction';

/**
 * Service de distribution des coupons aux détenteurs d'obligations
 */
export class CouponDistributionService {
  private client: Client;
  private issuerWallet: Wallet;

  constructor(
    issuerSeed: string,
    xrplUrl: string = 'wss://s.altnet.rippletest.net:51233'
  ) {
    this.client = new Client(xrplUrl);
    this.issuerWallet = Wallet.fromSeed(issuerSeed);
  }

  /**
   * Calcule le prochain paiement de coupon pour une obligation
   */
  calculateNextCouponDate(bond: any): number {
    const currentDate = Date.now();
    let nextDate = bond.nextCouponDate;

    // Si la date est passée, calcule la prochaine
    while (nextDate <= currentDate) {
      nextDate = this.addPeriod(nextDate, bond.couponFrequency);
    }

    return nextDate;
  }

  /**
   * Ajoute une période à une date
   */
  private addPeriod(timestamp: number, frequency: string): number {
    const date = new Date(timestamp);
    
    switch (frequency) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'semi-annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.getTime();
  }

  /**
   * Planifie tous les paiements de coupons à venir
   */
  async scheduleAllCouponPayments(): Promise<void> {
    try {
      const activeBonds = await Bond.find({ status: 'active' });
      
      console.log(`📅 Planification des coupons pour ${activeBonds.length} obligation(s)...`);

      for (const bond of activeBonds) {
        await this.scheduleCouponPayment(bond.bondId);
      }

      console.log('✅ Planification terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la planification:', error);
      throw error;
    }
  }

  /**
   * Planifie le prochain paiement de coupon pour une obligation
   */
  async scheduleCouponPayment(bondId: string): Promise<void> {
    try {
      const bond = await Bond.findOne({ bondId });
      if (!bond) {
        throw new Error(`Obligation ${bondId} introuvable`);
      }

      // Vérifie si un paiement est déjà planifié
      const existingPayment = await CouponPayment.findOne({
        bondId,
        status: { $in: ['scheduled', 'processing'] }
      });

      if (existingPayment) {
        console.log(`ℹ️  Un paiement est déjà planifié pour ${bond.tokenName}`);
        return;
      }

      // Récupère tous les holders actuels
      const holders = await BondHolder.find({ bondId });
      
      if (holders.length === 0) {
        console.log(`⚠️  Aucun holder pour ${bond.tokenName}, paiement ignoré`);
        return;
      }

      // Calcule le montant du coupon par token
      const denominationNum = BigInt(bond.denomination);
      const couponPerToken = (denominationNum * BigInt(Math.floor(bond.couponRate * 100))) / BigInt(10000);

      // Calcule les montants pour chaque holder
      const recipients = holders.map(holder => {
        const balanceNum = BigInt(holder.balance);
        const amount = (balanceNum * couponPerToken) / BigInt(1000000); // Ajuste selon la précision
        
        return {
          holderAddress: holder.holderAddress,
          balance: holder.balance,
          amount: amount.toString(),
          status: 'pending' as const
        };
      });

      const totalAmount = recipients.reduce(
        (sum, r) => sum + BigInt(r.amount),
        BigInt(0)
      );

      // Période du coupon
      const periodEnd = bond.nextCouponDate;
      const periodStart = this.subtractPeriod(periodEnd, bond.couponFrequency);

      // Crée le paiement planifié
      await CouponPayment.create({
        bondId,
        paymentDate: bond.nextCouponDate,
        periodStart,
        periodEnd,
        totalAmount: totalAmount.toString(),
        couponRate: bond.couponRate,
        recipients,
        status: 'scheduled',
        executionTxHashes: []
      });

      console.log(`✅ Coupon planifié pour ${bond.tokenName} - ${recipients.length} destinataire(s) - Total: ${totalAmount.toString()}`);
    } catch (error) {
      console.error('❌ Erreur lors de la planification du coupon:', error);
      throw error;
    }
  }

  /**
   * Soustrait une période à une date
   */
  private subtractPeriod(timestamp: number, frequency: string): number {
    const date = new Date(timestamp);
    
    switch (frequency) {
      case 'monthly':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() - 3);
        break;
      case 'semi-annual':
        date.setMonth(date.getMonth() - 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }
    
    return date.getTime();
  }

  /**
   * Exécute les paiements de coupons dus
   */
  async executeScheduledPayments(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Connecté au XRPL pour les paiements');

      const now = Date.now();
      
      // Trouve tous les paiements dus
      const duePayments = await CouponPayment.find({
        status: 'scheduled',
        paymentDate: { $lte: now }
      });

      console.log(`💰 ${duePayments.length} paiement(s) à exécuter`);

      for (const payment of duePayments) {
        await this.executeCouponPayment((payment._id as any).toString());
      }

      await this.client.disconnect();
      console.log('✅ Paiements terminés');
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution des paiements:', error);
      await this.client.disconnect();
      throw error;
    }
  }

  /**
   * Exécute un paiement de coupon spécifique
   */
  async executeCouponPayment(paymentId: string): Promise<void> {
    const payment = await CouponPayment.findById(paymentId);
    if (!payment) {
      throw new Error(`Paiement ${paymentId} introuvable`);
    }

    const bond = await Bond.findOne({ bondId: payment.bondId });
    if (!bond) {
      throw new Error(`Obligation ${payment.bondId} introuvable`);
    }

    console.log(`💸 Exécution du paiement pour ${bond.tokenName}...`);

    try {
      // Marque le paiement comme en cours
      payment.status = 'processing';
      await payment.save();

      const txHashes: string[] = [];

      // Envoie les paiements à chaque holder
      for (let i = 0; i < payment.recipients.length; i++) {
        const recipient = payment.recipients[i];
        
        try {
          console.log(`  → Paiement de ${recipient.amount} USDC à ${recipient.holderAddress}...`);

          const prepared = await this.client.autofill({
            TransactionType: 'Payment',
            Account: this.issuerWallet.address,
            Destination: recipient.holderAddress,
            Amount: {
              currency: 'USD', // Code USDC
              value: (BigInt(recipient.amount) / BigInt(1000000)).toString(), // Convertit en unités standards
              issuer: bond.usdcIssuer || this.issuerWallet.address // Issuer du USDC
            },
            Memos: [{
              Memo: {
                MemoType: Buffer.from('coupon_payment', 'utf8').toString('hex').toUpperCase(),
                MemoData: Buffer.from(`Bond: ${bond.tokenName}, Period: ${new Date(payment.periodStart).toISOString()} - ${new Date(payment.periodEnd).toISOString()}`, 'utf8').toString('hex').toUpperCase()
              }
            }]
          });

          const signed = this.issuerWallet.sign(prepared);
          const result = await this.client.submitAndWait(signed.tx_blob);

          if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
            const meta = result.result.meta as { TransactionResult: string };
            if (meta.TransactionResult === 'tesSUCCESS') {
              payment.recipients[i].status = 'paid';
              payment.recipients[i].txHash = result.result.hash;
              txHashes.push(result.result.hash);

              // Enregistre la transaction
              await Transaction.create({
                bondId: bond.bondId,
                txHash: result.result.hash,
                ledgerIndex: (result.result as any).ledger_index || 0,
                fromAddress: this.issuerWallet.address,
                toAddress: recipient.holderAddress,
                amount: recipient.amount,
                type: 'coupon_payment',
                timestamp: Date.now(),
                memo: `Coupon payment for ${bond.tokenName}`
              });

              // Met à jour le holder
              const holder = await BondHolder.findOne({
                bondId: bond.bondId,
                holderAddress: recipient.holderAddress
              });
              if (holder) {
                holder.lastCouponPaid = Date.now();
                holder.totalCouponsReceived = (
                  BigInt(holder.totalCouponsReceived) + BigInt(recipient.amount)
                ).toString();
                await holder.save();
              }

              console.log(`    ✅ Paiement réussi (${result.result.hash})`);
            } else {
              payment.recipients[i].status = 'failed';
              console.error(`    ❌ Paiement échoué: ${meta.TransactionResult}`);
            }
          }
        } catch (error) {
          payment.recipients[i].status = 'failed';
          console.error(`    ❌ Erreur lors du paiement à ${recipient.holderAddress}:`, error);
        }
      }

      // Met à jour le statut du paiement
      payment.executionTxHashes = txHashes;
      payment.status = payment.recipients.every(r => r.status === 'paid') ? 'completed' : 'failed';
      await payment.save();

      // Met à jour la date du prochain coupon
      if (payment.status === 'completed') {
        bond.nextCouponDate = this.calculateNextCouponDate(bond);
        await bond.save();
        
        // Planifie le prochain paiement
        await this.scheduleCouponPayment(bond.bondId);
      }

      console.log(`✅ Paiement ${payment.status === 'completed' ? 'complété' : 'partiellement échoué'}`);
    } catch (error) {
      payment.status = 'failed';
      payment.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await payment.save();
      console.error('❌ Erreur lors du paiement:', error);
      throw error;
    }
  }

  /**
   * Vérifie et exécute les paiements en boucle (cron-like)
   */
  async startCronJob(intervalMinutes: number = 60): Promise<void> {
    console.log(`⏰ Démarrage du cron job (vérification toutes les ${intervalMinutes} minutes)`);
    
    const check = async () => {
      try {
        console.log('🔍 Vérification des paiements dus...');
        await this.executeScheduledPayments();
        await this.scheduleAllCouponPayments();
      } catch (error) {
        console.error('❌ Erreur dans le cron job:', error);
      }
    };

    // Première exécution immédiate
    await check();

    // Puis répète à intervalle régulier
    setInterval(check, intervalMinutes * 60 * 1000);
  }
}
