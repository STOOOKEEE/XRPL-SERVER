import { Client, Transaction } from 'xrpl';
import { Campaign } from '../models/Campaign';
import { connectDB } from '../config/database';

/**
 * Service qui monitor les transactions XRPL et détecte les EscrowCreate
 * pour enregistrer les investissements dans la base de données
 */
export class EscrowMonitor {
  private client: Client;
  private isRunning: boolean = false;

  constructor(private websocketUrl: string) {
    this.client = new Client(websocketUrl);
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Monitor déjà en cours d\'exécution');
      return;
    }

    console.log('🚀 Démarrage du monitor XRPL...');

    // Connexion à MongoDB
    await connectDB();

    // Connexion au serveur XRPL
    await this.client.connect();
    console.log(`✅ Connecté à ${this.websocketUrl}`);

    // Subscribe aux transactions
    await this.client.request({
      command: 'subscribe',
      streams: ['transactions']
    });
    console.log('📡 Subscription aux transactions activée');

    // Écouter les transactions
    this.client.on('transaction', (tx: any) => {
      this.handleTransaction(tx);
    });

    this.isRunning = true;
    console.log('✅ Monitor actif\n');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('\n🛑 Arrêt du monitor...');
    await this.client.disconnect();
    this.isRunning = false;
    console.log('👋 Monitor arrêté');
  }

  private async handleTransaction(tx: any) {
    try {
      const transaction = tx.transaction;
      const meta = tx.meta;

      // Filtrer seulement les EscrowCreate
      if (transaction.TransactionType !== 'EscrowCreate') {
        return;
      }

      // Vérifier que la transaction a réussi
      if (meta.TransactionResult !== 'tesSUCCESS') {
        return;
      }

      console.log(`\n📥 EscrowCreate détecté: ${transaction.hash}`);

      // Parser les données de l'escrow
      const escrowData = this.parseEscrowData(transaction);

      if (!escrowData.campaignId) {
        console.log('  ⏭️  Pas de campaignId dans le Data field, ignoré');
        return;
      }

      // Enregistrer l'investissement
      await this.recordInvestment(escrowData, transaction, meta);

    } catch (error) {
      console.error('❌ Erreur handleTransaction:', error);
    }
  }

  private parseEscrowData(transaction: any): any {
    // Le Data field contient: campaignId encodé en hex
    const dataHex = transaction.Data;
    
    if (!dataHex) {
      return {};
    }

    try {
      // Decoder le hex en string
      const dataStr = Buffer.from(dataHex, 'hex').toString('utf8');
      
      // Format attendu: "campaignId:Campaign123"
      // Ou JSON: {"campaignId":"Campaign123"}
      
      // Essayer de parser en JSON
      try {
        return JSON.parse(dataStr);
      } catch {
        // Sinon, parser en key:value
        const matches = dataStr.match(/campaignId:([^\s,}]+)/);
        if (matches) {
          return { campaignId: matches[1] };
        }
      }
    } catch (error) {
      console.error('  ⚠️  Erreur parsing Data field:', error);
    }

    return {};
  }

  private async recordInvestment(
    escrowData: any,
    transaction: any,
    meta: any
  ) {
    const campaignId = escrowData.campaignId;
    const investorAddress = transaction.Account;
    const amount = this.parseAmount(transaction.Amount);
    const escrowSequence = transaction.Sequence;
    const escrowId = this.calculateEscrowId(transaction.Account, escrowSequence);
    const txHash = transaction.hash;
    const timestamp = Date.now();

    console.log(`  Campaign: ${campaignId}`);
    console.log(`  Investor: ${investorAddress}`);
    console.log(`  Amount: ${amount}`);
    console.log(`  EscrowID: ${escrowId}`);

    // Trouver la campagne
    const campaign = await Campaign.findOne({ campaignId });

    if (!campaign) {
      console.log(`  ❌ Campagne ${campaignId} non trouvée`);
      return;
    }

    // Vérifier si déjà enregistré
    const existingInvestor = campaign.investors.find(
      inv => inv.escrowId === escrowId
    );

    if (existingInvestor) {
      console.log(`  ⏭️  Investissement déjà enregistré`);
      return;
    }

    // Ajouter l'investisseur
    campaign.investors.push({
      address: investorAddress,
      amount: amount,
      escrowId: escrowId,
      escrowSequence: escrowSequence,
      timestamp: timestamp,
      txHash: txHash,
      status: 'pending'
    });

    // Sauvegarder (le total sera recalculé automatiquement)
    await campaign.save();

    console.log(`  ✅ Investissement enregistré`);
    console.log(`  💰 Total raised: ${campaign.totalRaised}`);
    console.log(`  🎯 Objectif: ${campaign.objectif}`);
    console.log(`  📊 Progression: ${this.calculateProgress(campaign)}%`);
  }

  private parseAmount(amount: any): string {
    if (typeof amount === 'string') {
      // XRP en drops
      return amount;
    } else if (typeof amount === 'object') {
      // Issued Currency (USDC)
      // Convertir en micro-units (multiplier par 1000000)
      const value = parseFloat(amount.value);
      const microUnits = Math.floor(value * 1000000);
      return microUnits.toString();
    }
    return '0';
  }

  private calculateEscrowId(account: string, sequence: number): string {
    // Format standard XRPL: hash(account + sequence)
    return `${account}:${sequence}`;
  }

  private calculateProgress(campaign: any): string {
    const total = BigInt(campaign.totalRaised);
    const objectif = BigInt(campaign.objectif);
    
    if (objectif === BigInt(0)) {
      return '0';
    }
    
    const progress = (Number(total) / Number(objectif)) * 100;
    return progress.toFixed(2);
  }
}

// Point d'entrée si exécuté directement
if (require.main === module) {
  const TESTNET_URL = process.env.XRPL_WEBSOCKET_URL || 'wss://s.altnet.rippletest.net:51233';
  
  const monitor = new EscrowMonitor(TESTNET_URL);

  // Gérer les signaux d'arrêt
  process.on('SIGINT', async () => {
    await monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await monitor.stop();
    process.exit(0);
  });

  monitor.start().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}
