import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import campaignsRouter from './routes/campaigns';
import { EscrowMonitor } from './services/EscrowMonitor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const XRPL_WEBSOCKET_URL = process.env.XRPL_WEBSOCKET_URL || 'wss://s.altnet.rippletest.net:51233';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'XRPL Bonds API',
    version: '1.0.0',
    endpoints: {
      campaigns: '/api/campaigns',
      health: '/api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/campaigns', campaignsRouter);

// Démarrer le serveur
async function start() {
  try {
    // Connexion MongoDB
    await connectDB();
    
    // Démarrer le serveur HTTP
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📡 API disponible sur http://localhost:${PORT}`);
    });
    
    // Démarrer le monitor XRPL
    const monitor = new EscrowMonitor(XRPL_WEBSOCKET_URL);
    await monitor.start();
    
    // Gérer l'arrêt gracieux
    process.on('SIGINT', async () => {
      console.log('\n🛑 Arrêt du serveur...');
      await monitor.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Erreur démarrage:', error);
    process.exit(1);
  }
}

start();
