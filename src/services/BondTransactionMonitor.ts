import { Client, Transaction as XRPLTransaction } from 'xrpl';
import { Bond } from '../models/Bond';
import { getBondInvestorModel } from '../models/BondInvestor';
import { BondStatsService } from './BondStatsService';
import { BondEventNotifier } from './BondEventNotifier';

/**
 * Service de monitoring des transactions XRPL pour les obligations
 * Écoute les transferts de tokens MPT et met à jour la base de données
 */
export class BondTransactionMonitor {
  private client: Client;
  private isMonitoring: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private notifier: BondEventNotifier;

  constructor(xrplUrl: string = 'wss://s.altnet.rippletest.net:51233', webhookUrl?: string) {
    this.client = new Client(xrplUrl);
    this.notifier = new BondEventNotifier(webhookUrl);
  }

  /**
   * Démarre le monitoring des transactions
   */
  async start(): Promise<void> {
    try {
      console.log('🔗 Connexion au XRPL...');
      await this.client.connect();
      console.log('✅ Connecté au XRPL');
      
      this.isMonitoring = true;
      this.reconnectAttempts = 0;

      // Écoute les nouvelles transactions validées
      this.client.on('transaction', async (tx: any) => {
        await this.handleTransaction(tx);
      });

      // Écoute les déconnexions
      this.client.on('disconnected', async (code: number) => {
        console.warn(`⚠️  Déconnecté du XRPL (code: ${code})`);
        if (this.isMonitoring) {
          await this.reconnect();
        }
      });

        // Subscribe aux transactions de tous les bonds actifs
        await this.subscribeToActiveBonds();
        // S'abonner aussi au flux global de transactions pour détecter
        // les transferts entre holders (utile si le transfer n'implique pas
        // directement l'adresse de l'émetteur)
        try {
          await this.client.request({ command: 'subscribe', streams: ['transactions'] });
          console.log('✅ Abonné au stream global de transactions');
        } catch (e: any) {
          // Ne bloque pas le monitoring si l'abonnement échoue
          console.warn('⚠️ Impossible de s\'abonner au stream global de transactions:', e?.message || e);
        }

      console.log('👀 Monitoring des transactions démarré');
    } catch (error) {
      console.error('❌ Erreur lors du démarrage du monitoring:', error);
      throw error;
    }
  }

  /**
   * Arrête le monitoring
   */
  async stop(): Promise<void> {
    console.log('🛑 Arrêt du monitoring...');
    this.isMonitoring = false;
    await this.client.disconnect();
    console.log('✅ Monitoring arrêté');
  }

  /**
   * Reconnexion automatique
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Nombre maximal de tentatives de reconnexion atteint');
      this.isMonitoring = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.start();
    } catch (error) {
      console.error('❌ Échec de la reconnexion:', error);
      await this.reconnect();
    }
  }

  /**
   * Subscribe aux transactions des obligations actives
   */
  private async subscribeToActiveBonds(): Promise<void> {
    try {
      const activeBonds = await Bond.find({ status: 'active' });
      
      if (activeBonds.length === 0) {
        console.log('ℹ️  Aucune obligation active à surveiller');
        return;
      }

      // Regex stricte pour valider les adresses XRPL
      const xrplAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

      // Filtre uniquement les adresses XRPL valides
      const validAccounts = activeBonds
        .map(bond => bond.issuerAddress)
        .filter(address => {
          // Vérifie avec regex strict
          const isValid = address && 
                         typeof address === 'string' && 
                         xrplAddressRegex.test(address);
          
          if (!isValid && address) {
            console.log(`⚠️  Adresse invalide ignorée: ${address}`);
          }
          
          return isValid;
        });

      if (validAccounts.length === 0) {
        console.log('⚠️  Aucune adresse XRPL valide à surveiller');
        return;
      }

      // Déduplique les adresses
      const uniqueAccounts = [...new Set(validAccounts)];

      if (uniqueAccounts.length === 0) {
        console.log('⚠️  Aucune adresse valide après déduplication');
        return;
      }

      console.log(`📋 Tentative d'abonnement à: ${uniqueAccounts.join(', ')}`);

      await this.client.request({
        command: 'subscribe',
        accounts: uniqueAccounts
      });

      console.log(`✅ Abonné à ${uniqueAccounts.length} adresse(s) XRPL valide(s)`);
    } catch (error: any) {
      console.error('❌ Erreur lors de la souscription aux bonds:', error.message || error);
      // Ne lance pas d'erreur pour permettre au serveur de continuer
    }
  }

  /**
   * Traite une transaction XRPL
   */
  private async handleTransaction(txData: any): Promise<void> {
    try {
      // Le format diffère selon la source (subscription account vs stream transactions)
      const tx = txData.transaction || txData.tx_json;
      
      // Vérifie que la transaction existe
      if (!tx) {
        console.warn('⚠️  Transaction reçue sans données tx:', txData);
        return;
      }
      
      // Ignore les transactions non validées
      if (txData.validated !== true) {
        return;
      }

      // Log toutes les transactions pour debugging
      const txHash = txData.transaction?.hash || txData.hash;
      console.log(`📡 Transaction détectée: ${tx.TransactionType} (${txHash})`);

      // Gère tous les types de transactions liées aux tokens
      switch (tx.TransactionType) {
        case 'Payment':
          await this.handlePaymentTransaction(tx, txData);
          break;
        case 'MPTokenIssuanceCreate':
          await this.handleTokenIssuance(tx, txData);
          break;
        case 'MPTokenAuthorize':
          await this.handleTokenAuthorize(tx, txData);
          break;
        case 'MPTokenIssuanceDestroy':
          console.log('🔥 Token détruit:', tx);
          break;
        case 'TrustSet':
          console.log('🤝 TrustLine modifiée:', tx);
          break;
        case 'EscrowCreate':
        case 'EscrowFinish':
        case 'EscrowCancel':
          console.log(`🔒 Escrow ${tx.TransactionType}:`, tx);
          break;
        default:
          // Log les autres types pour analyse
          console.log(`ℹ️  Autre transaction: ${tx.TransactionType}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du traitement de la transaction:', error, txData);
    }
  }

  /**
   * Traite une transaction de paiement (transfert de tokens)
   */
  private async handlePaymentTransaction(tx: any, txData: any): Promise<void> {
    try {
      // Vérifie si c'est un transfert de token MPT
      if (!tx.Amount || typeof tx.Amount !== 'object' || !tx.Amount.mpt_id) {
        return; // Pas un token MPT
      }

      const tokenCurrency = tx.Amount.mpt_id;
      const amount = tx.Amount.value;
      const fromAddress = tx.Account;
      const toAddress = tx.Destination;

      // Trouve l'obligation correspondante
      const bond = await Bond.findOne({ tokenCurrency });
      
      if (!bond) {
        return; // Token non surveillé
      }

      console.log(`📊 Transfert détecté pour ${bond.tokenName}: ${amount} tokens de ${fromAddress} vers ${toAddress}`);

      const txHash = txData.transaction?.hash || txData.hash;

      // Met à jour les balances des investisseurs (nouveau système)
      await this.updateHolderBalances(bond.bondId, fromAddress, toAddress, amount, txHash);

    } catch (error) {
      console.error('❌ Erreur lors du traitement du paiement:', error);
    }
  }

  /**
   * Traite l'émission d'un nouveau token
   */
  private async handleTokenIssuance(tx: any, txData: any): Promise<void> {
    try {
      console.log('🆕 Nouvelle émission de token détectée:', tx);

      // Certaines transactions d'émission fournissent l'ID mpt et le total
      const mptId = tx.MPToken?.mpt_id || tx.Amount?.mpt_id;
      const totalSupply = tx.MPToken?.total_amount || tx.Amount?.value || undefined;

      if (!mptId) return;

      // Cherche un bond existant
      let bond = await Bond.findOne({ tokenCurrency: mptId });

      if (!bond) {
        // Crée un bond basique si absent (données minimales)
        bond = await Bond.create({
          bondId: `AUTO-${mptId}-${Date.now()}`,
          issuerAddress: tx.Account || tx.Issuer || 'unknown',
          issuerName: 'Auto Issuer',
          tokenCurrency: mptId,
          tokenName: `Token ${mptId}`,
          totalSupply: totalSupply ? String(totalSupply) : '0',
          denomination: '1',
          couponRate: 0,
          couponFrequencyMonths: 12, // Par défaut annuel
          issueDate: Date.now(),
          maturityDate: Date.now() + 365 * 24 * 3600 * 1000,
          nextCouponDate: Date.now(),
          status: 'active',
          description: 'Auto-created bond from MPTokenIssuance',
          stats: {
            totalInvestors: 0,
            totalInvested: '0',
            percentageDistributed: 0,
            totalCouponsPaid: '0'
          }
        });

        console.log(`✅ Bond créé automatiquement pour le token ${mptId}`);
      } else if (totalSupply) {
        // Met à jour le totalSupply si fourni
        bond.totalSupply = String(totalSupply);
        await bond.save();
        console.log(`🔄 Bond ${bond.bondId} mis à jour totalSupply=${bond.totalSupply}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du traitement de l\'émission de token:', error);
    }
  }

  /**
   * Traite l'autorisation d'un holder
   */
  private async handleTokenAuthorize(tx: any, txData: any): Promise<void> {
    try {
      console.log('✅ Autorisation de holder détectée:', tx);

      // Extrait les informations possibles
      const mptId = tx.MPToken?.mpt_id || tx.Amount?.mpt_id;
      const holder = tx.Target || tx.Account || tx.Destination;

      if (!mptId || !holder) return;

      const bond = await Bond.findOne({ tokenCurrency: mptId });
      if (!bond) return;

      // Récupère le modèle d'investisseurs pour cette obligation
      const InvestorModel = getBondInvestorModel(bond.bondId);

      // Marque le holder comme autorisé si nécessaire (champ optionnel)
      const existing = await InvestorModel.findOne({ investorAddress: holder });
      if (existing) {
        // On peut ajouter un flag 'authorized' si voulu
        (existing as any).authorized = true;
        existing.lastUpdateDate = Date.now();
        await existing.save();
        console.log(`🔐 Investisseur ${holder} marqué comme autorisé pour ${bond.bondId}`);
      } else {
        const timestamp = Date.now();
        await InvestorModel.create({
          investorAddress: holder,
          balance: '0',
          percentage: 0,
          investedAmount: '0',
          firstInvestmentDate: timestamp,
          lastUpdateDate: timestamp,
          transactionHistory: [],
          totalCouponsReceived: '0',
          // @ts-ignore optional
          authorized: true
        });
        console.log(`🔐 Nouvel investisseur ${holder} créé et autorisé pour ${bond.bondId}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du traitement de l\'autorisation de token:', error);
    }
  }

  /**
   * Met à jour les balances des investisseurs avec le nouveau système
   */
  private async updateHolderBalances(
    bondId: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    txHash: string
  ): Promise<void> {
    const timestamp = Date.now();
    const amountNum = BigInt(amount);

    // Récupère le bond
    const bond = await Bond.findOne({ bondId });
    if (!bond) return;

    // Récupère le modèle d'investisseurs pour cette obligation
    const InvestorModel = getBondInvestorModel(bondId);
    const denomination = BigInt(bond.denomination);
    const totalSupply = BigInt(bond.totalSupply);

    // Met à jour l'expéditeur (réduit sa balance)
    const sender = await InvestorModel.findOne({ investorAddress: fromAddress });
    if (sender) {
      const newBalance = BigInt(sender.balance) - amountNum;
      
      // Ajoute la transaction à l'historique
      sender.transactionHistory.push({
        type: 'transfer_out',
        amount,
        txHash,
        timestamp,
        toAddress
      });
      
      if (newBalance <= BigInt(0)) {
        // Supprime l'investisseur s'il n'a plus de tokens
        await InvestorModel.deleteOne({ _id: sender._id });
        console.log(`🗑️  ${fromAddress} n'a plus de tokens ${bondId}`);
        
        // Notification de sortie
        await this.notifier.notifyHolderExit({
          bondId,
          bondName: bond.tokenName,
          holderAddress: fromAddress,
          timestamp
        });
      } else {
        sender.balance = newBalance.toString();
        sender.percentage = Number((newBalance * BigInt(10000)) / totalSupply) / 100;
        sender.investedAmount = (newBalance * denomination).toString();
        sender.lastUpdateDate = timestamp;
        await sender.save();
        console.log(`📉 ${fromAddress} balance: ${sender.balance} (${sender.percentage}%)`);
      }
    }

    // Met à jour le destinataire (augmente sa balance)
    let recipient = await InvestorModel.findOne({ investorAddress: toAddress });
    if (recipient) {
      const newBalance = BigInt(recipient.balance) + amountNum;
      recipient.balance = newBalance.toString();
      recipient.percentage = Number((newBalance * BigInt(10000)) / totalSupply) / 100;
      recipient.investedAmount = (newBalance * denomination).toString();
      recipient.lastUpdateDate = timestamp;
      
      // Ajoute la transaction à l'historique
      recipient.transactionHistory.push({
        type: 'transfer_in',
        amount,
        txHash,
        timestamp,
        fromAddress
      });
      
      await recipient.save();
      console.log(`📈 ${toAddress} balance: ${recipient.balance} (${recipient.percentage}%)`);
      
      // Vérifie si c'est une position importante (> 10%)
      if (recipient.percentage > 10) {
        await this.notifier.notifyLargeBalance({
          bondId,
          bondName: bond.tokenName,
          holderAddress: toAddress,
          balance: recipient.balance,
          percentageOfTotal: recipient.percentage,
          timestamp
        });
      }
    } else {
      // Crée un nouvel investisseur
      const percentage = Number((amountNum * BigInt(10000)) / totalSupply) / 100;
      const investedAmount = (amountNum * denomination).toString();
      
      recipient = await InvestorModel.create({
        investorAddress: toAddress,
        balance: amount,
        percentage,
        investedAmount,
        firstInvestmentDate: timestamp,
        lastUpdateDate: timestamp,
        transactionHistory: [{
          type: 'transfer_in',
          amount,
          txHash,
          timestamp,
          fromAddress
        }],
        totalCouponsReceived: '0'
      });
      
      console.log(`🆕 Nouvel investisseur créé: ${toAddress} avec ${amount} tokens (${percentage}%)`);
      
      // Notification nouveau holder
      await this.notifier.notifyNewHolder({
        bondId,
        bondName: bond.tokenName,
        holderAddress: toAddress,
        initialBalance: amount,
        timestamp
      });
    }

    // Notification du transfert
    await this.notifier.notifyTransfer({
      bondId,
      bondName: bond.tokenName,
      fromAddress,
      toAddress,
      amount,
      txHash,
      timestamp
    });

    // Met à jour les statistiques du bond
    await BondStatsService.updateBondStats(bondId);
  }

  /**
   * Convertit le temps Ripple en Unix timestamp
   */
  private rippleTimeToUnix(rippleTime: number): number {
    return (rippleTime + 946684800) * 1000; // Ripple epoch: 01/01/2000
  }

  /**
   * Récupère la balance actuelle d'un holder depuis le ledger XRPL
   */
  async getHolderBalanceFromLedger(holderAddress: string, mptId: string): Promise<string> {
    try {
      const response = await this.client.request({
        command: 'account_objects',
        account: holderAddress,
        type: 'mptoken'
      });

      const mptObject = response.result.account_objects?.find(
        (obj: any) => obj.mpt_id === mptId
      ) as any;

      return mptObject?.amount || '0';
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la balance:', error);
      return '0';
    }
  }

  /**
   * Récupère le notifier d'événements
   */
  getNotifier(): BondEventNotifier {
    return this.notifier;
  }

  /**
   * Synchronise les balances depuis le ledger XRPL
   * Utile pour initialiser ou vérifier la cohérence de la DB
   */
  async syncBondHolders(bondId: string): Promise<void> {
    try {
      const bond = await Bond.findOne({ bondId });
      if (!bond) {
        throw new Error(`Obligation ${bondId} introuvable`);
      }

      console.log(`🔄 Synchronisation des investisseurs pour ${bond.tokenName}...`);

      // Récupère tous les investisseurs actuels depuis la DB
      const InvestorModel = getBondInvestorModel(bondId);
      const dbInvestors = await InvestorModel.find({});

      // Pour chaque investisseur, vérifie la balance réelle sur le ledger
      for (const investor of dbInvestors) {
        const realBalance = await this.getHolderBalanceFromLedger(
          investor.investorAddress,
          bond.tokenCurrency
        );

        if (realBalance !== investor.balance) {
          console.log(`⚠️  Incohérence détectée pour ${investor.investorAddress}: DB=${investor.balance}, Ledger=${realBalance}`);
          
          const totalSupply = BigInt(bond.totalSupply);
          const denomination = BigInt(bond.denomination);
          const balance = BigInt(realBalance);
          
          investor.balance = realBalance;
          investor.percentage = Number((balance * BigInt(10000)) / totalSupply) / 100;
          investor.investedAmount = (balance * denomination).toString();
          investor.lastUpdateDate = Date.now();
          await investor.save();
        }
      }

      // Met à jour les stats du bond
      await BondStatsService.updateBondStats(bondId);

      console.log(`✅ Synchronisation terminée pour ${bond.tokenName}`);
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      throw error;
    }
  }
}
