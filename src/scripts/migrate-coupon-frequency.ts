import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/database';
import { Bond } from '../models/Bond';

dotenv.config();

/**
 * Script de migration pour convertir couponFrequency en couponFrequencyMonths
 */
async function migrateFrequency() {
  try {
    await connectDB();
    console.log('✅ Connecté à MongoDB\n');

    // Mapping des anciennes fréquences vers des mois
    const frequencyMap: { [key: string]: number } = {
      'monthly': 1,
      'quarterly': 3,
      'semi-annual': 6,
      'annual': 12,
      'none': 12 // Par défaut 12 mois si pas de coupon
    };

    // Récupère toutes les obligations
    const bonds = await Bond.find({});
    console.log(`📊 ${bonds.length} obligation(s) trouvée(s)\n`);

    for (const bond of bonds) {
      // @ts-ignore - on accède à l'ancien champ qui peut encore exister
      const oldFrequency = bond.couponFrequency;
      
      // Si le bond n'a pas encore couponFrequencyMonths
      if (!bond.couponFrequencyMonths) {
        const months = oldFrequency && frequencyMap[oldFrequency] 
          ? frequencyMap[oldFrequency] 
          : 6; // Par défaut semestriel
        
        bond.couponFrequencyMonths = months;
        await bond.save();
        
        console.log(`✅ ${bond.bondId}:`);
        console.log(`   ${oldFrequency || 'non défini'} → ${months} mois`);
      } else {
        console.log(`⏭️  ${bond.bondId}: déjà migré (${bond.couponFrequencyMonths} mois)`);
      }
    }

    console.log('\n🎉 Migration terminée !');
    await disconnectDB();
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    await disconnectDB();
    process.exit(1);
  }
}

migrateFrequency();
