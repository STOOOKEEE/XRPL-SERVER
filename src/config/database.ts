import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charge les variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/xrpl-bonds';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connecté');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('👋 MongoDB déconnecté');
  } catch (error) {
    console.error('❌ Erreur déconnexion MongoDB:', error);
  }
}
