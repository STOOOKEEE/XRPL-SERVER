import { Client, Wallet } from 'xrpl';
import { connectDB, disconnectDB } from '../config/database';
import { Campaign } from '../models/Campaign';

/**
 * Script de test complet du workflow fundraising
 * 
 * 1. Crée une campagne
 * 2. Simule des investissements (EscrowCreate)
 * 3. Vérifie que le monitor détecte les transactions
 * 4. Affiche les résultats
 */

const TESTNET_URL = 'wss://s.altnet.rippletest.net:51233';
const USDC_ISSUER = 'rUSDCIssuerTestnet'; // Remplacer par un vrai issuer de testnet

async function main() {
  console.log('🧪 Test complet du workflow fundraising\n');

  let client: Client | null = null;

  try {
    // 1. Connexion
    console.log('📡 Connexion au testnet...');
    client = new Client(TESTNET_URL);
    await client.connect();
    console.log('✅ Connecté\n');

    await connectDB();

    // 2. Créer wallets de test
    console.log('💼 Création des wallets...');
    const companyWallet = Wallet.generate();
    const investor1 = Wallet.generate();
    const investor2 = Wallet.generate();
    
    console.log(`   Entreprise: ${companyWallet.address}`);
    console.log(`   Investisseur 1: ${investor1.address}`);
    console.log(`   Investisseur 2: ${investor2.address}\n`);

    // 3. Financer les wallets (via faucet)
    console.log('💰 Financement des wallets...');
    try {
      await client.fundWallet(companyWallet);
      await client.fundWallet(investor1);
      await client.fundWallet(investor2);
      console.log('✅ Wallets financés\n');
    } catch (error) {
      console.log('⚠️  Faucet indisponible, utilisez les adresses manuellement\n');
    }

    // 4. Créer une campagne
    console.log('🎯 Création de la campagne...');
    const campaignId = `TEST-${Date.now()}`;
    const deadline = Math.floor(Date.now() / 1000) + 3600; // +1 heure

    const campaign = new Campaign({
      campaignId,
      companyAddress: companyWallet.address,
      companyName: 'Test Startup',
      title: 'Campagne de test',
      description: 'Test du workflow fundraising',
      objectif: '100000000000', // 100,000 USDC
      deadline,
      usdcIssuer: USDC_ISSUER,
      investors: [],
      totalRaised: '0',
      status: 'active'
    });

    await campaign.save();
    console.log(`✅ Campagne créée: ${campaignId}\n`);

    // 5. Simuler investissement 1
    console.log('💸 Investissement 1 (50,000 USDC)...');
    const escrow1 = await createEscrow(
      client,
      investor1,
      companyWallet.address,
      '50000',
      deadline,
      campaignId
    );
    console.log(`   Tx: ${escrow1.result.hash}\n`);

    // 6. Simuler investissement 2
    console.log('💸 Investissement 2 (30,000 USDC)...');
    const escrow2 = await createEscrow(
      client,
      investor2,
      companyWallet.address,
      '30000',
      deadline,
      campaignId
    );
    console.log(`   Tx: ${escrow2.result.hash}\n`);

    // 7. Attendre que le monitor détecte
    console.log('⏳ Attente détection par le monitor (10 secondes)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 8. Vérifier les résultats
    console.log('📊 Vérification des résultats...\n');
    const updatedCampaign = await Campaign.findOne({ campaignId });

    if (!updatedCampaign) {
      console.log('❌ Campagne non trouvée');
      return;
    }

    console.log('✅ Résultats:');
    console.log(`   Campaign ID: ${updatedCampaign.campaignId}`);
    console.log(`   Objectif: ${formatAmount(updatedCampaign.objectif)} USDC`);
    console.log(`   Total raised: ${formatAmount(updatedCampaign.totalRaised)} USDC`);
    console.log(`   Investisseurs: ${updatedCampaign.investors.length}`);
    console.log(`   Status: ${updatedCampaign.status}`);
    console.log();

    if (updatedCampaign.investors.length > 0) {
      console.log('👥 Investisseurs:');
      updatedCampaign.investors.forEach((inv, i) => {
        console.log(`   ${i + 1}. ${inv.address.substring(0, 10)}... → ${formatAmount(inv.amount)} USDC`);
      });
    } else {
      console.log('⚠️  Aucun investisseur détecté. Le monitor est-il démarré ?');
      console.log('   Lancez: npm run dev (dans un autre terminal)');
    }

    console.log('\n✅ Test terminé !');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
  } finally {
    if (client) {
      await client.disconnect();
    }
    await disconnectDB();
  }
}

async function createEscrow(
  client: Client,
  investor: Wallet,
  destination: string,
  amount: string,
  finishAfter: number,
  campaignId: string
) {
  const escrowCreate: any = {
    TransactionType: 'EscrowCreate',
    Account: investor.address,
    Destination: destination,
    Amount: {
      currency: 'USD',
      value: amount,
      issuer: USDC_ISSUER
    },
    FinishAfter: finishAfter,
    CancelAfter: finishAfter + 604800, // +7 jours
    Data: Buffer.from(JSON.stringify({
      campaignId
    })).toString('hex').toUpperCase()
  };

  const prepared = await client.autofill(escrowCreate);
  const signed = investor.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  return result;
}

function formatAmount(microUnits: string): string {
  const value = parseFloat(microUnits) / 1000000;
  return value.toLocaleString('fr-FR', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  });
}

// Exécuter
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
