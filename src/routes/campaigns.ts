import express, { Request, Response } from 'express';
import { Campaign } from '../models/Campaign';

const router = express.Router();

/**
 * GET /campaigns
 * Liste toutes les campagnes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const query = status ? { status } : {};
    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: campaigns.length,
      campaigns: campaigns.map(c => ({
        campaignId: c.campaignId,
        companyName: c.companyName,
        title: c.title,
        description: c.description,
        objectif: c.objectif,
        totalRaised: c.totalRaised,
        deadline: c.deadline,
        status: c.status,
        investorCount: c.investors.length,
        progress: calculateProgress(c.totalRaised, c.objectif),
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur récupération campagnes'
    });
  }
});

/**
 * GET /campaigns/:campaignId
 * Détails d'une campagne
 */
router.get('/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Campaign.findOne({ campaignId });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée'
      });
    }
    
    res.json({
      success: true,
      campaign: {
        campaignId: campaign.campaignId,
        companyAddress: campaign.companyAddress,
        companyName: campaign.companyName,
        title: campaign.title,
        description: campaign.description,
        objectif: campaign.objectif,
        totalRaised: campaign.totalRaised,
        deadline: campaign.deadline,
        usdcIssuer: campaign.usdcIssuer,
        status: campaign.status,
        investorCount: campaign.investors.length,
        progress: calculateProgress(campaign.totalRaised, campaign.objectif),
        investors: campaign.investors.map(inv => ({
          address: inv.address,
          amount: inv.amount,
          timestamp: inv.timestamp,
          status: inv.status
        })),
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur récupération campagne'
    });
  }
});

/**
 * POST /campaigns
 * Créer une nouvelle campagne
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      campaignId,
      companyAddress,
      companyName,
      title,
      description,
      objectif,
      deadline,
      usdcIssuer
    } = req.body;
    
    // Validation
    if (!campaignId || !companyAddress || !companyName || !title || !objectif || !deadline) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis manquants'
      });
    }
    
    // Vérifier si existe déjà
    const existing = await Campaign.findOne({ campaignId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Une campagne avec cet ID existe déjà'
      });
    }
    
    // Créer la campagne
    const campaign = new Campaign({
      campaignId,
      companyAddress,
      companyName,
      title,
      description: description || '',
      objectif,
      deadline,
      usdcIssuer: usdcIssuer || 'rUSDCIssuerAddress', // Default issuer
      investors: [],
      totalRaised: '0',
      status: 'active'
    });
    
    await campaign.save();
    
    res.status(201).json({
      success: true,
      message: 'Campagne créée',
      campaign: {
        campaignId: campaign.campaignId,
        companyName: campaign.companyName,
        title: campaign.title,
        objectif: campaign.objectif,
        deadline: campaign.deadline,
        status: campaign.status
      }
    });
  } catch (error) {
    console.error('Erreur création campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur création campagne'
    });
  }
});

/**
 * GET /campaigns/:campaignId/investors
 * Liste des investisseurs d'une campagne
 */
router.get('/:campaignId/investors', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Campaign.findOne({ campaignId });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée'
      });
    }
    
    res.json({
      success: true,
      count: campaign.investors.length,
      totalRaised: campaign.totalRaised,
      investors: campaign.investors.map(inv => ({
        address: inv.address,
        amount: inv.amount,
        escrowId: inv.escrowId,
        timestamp: inv.timestamp,
        txHash: inv.txHash,
        status: inv.status
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur récupération investisseurs'
    });
  }
});

/**
 * GET /campaigns/:campaignId/stats
 * Statistiques d'une campagne
 */
router.get('/:campaignId/stats', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Campaign.findOne({ campaignId });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campagne non trouvée'
      });
    }
    
    const now = Date.now() / 1000;
    const timeRemaining = Math.max(0, campaign.deadline - now);
    const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
    
    res.json({
      success: true,
      stats: {
        totalRaised: campaign.totalRaised,
        objectif: campaign.objectif,
        progress: calculateProgress(campaign.totalRaised, campaign.objectif),
        investorCount: campaign.investors.length,
        averageInvestment: calculateAverage(campaign.investors),
        daysRemaining: daysRemaining,
        isDeadlinePassed: campaign.isDeadlinePassed(),
        isObjectifReached: campaign.isObjectifReached(),
        status: campaign.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur récupération statistiques'
    });
  }
});

// Helpers
function calculateProgress(totalRaised: string, objectif: string): number {
  const total = BigInt(totalRaised);
  const goal = BigInt(objectif);
  
  if (goal === BigInt(0)) {
    return 0;
  }
  
  return parseFloat(((Number(total) / Number(goal)) * 100).toFixed(2));
}

function calculateAverage(investors: any[]): string {
  if (investors.length === 0) {
    return '0';
  }
  
  const total = investors.reduce((sum, inv) => sum + BigInt(inv.amount), BigInt(0));
  const avg = total / BigInt(investors.length);
  
  return avg.toString();
}

export default router;
