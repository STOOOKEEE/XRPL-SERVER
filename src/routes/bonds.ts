import express, { Request, Response } from 'express';
import { Bond } from '../models/Bond';
import { getBondInvestorModel } from '../models/BondInvestor';
import { BondStatsService } from '../services/BondStatsService';

// Anciens modèles pour compatibilité
import { BondHolder } from '../models/BondHolder';
import { CouponPayment } from '../models/CouponPayment';
import { Transaction } from '../models/Transaction';

const router = express.Router();

/**
 * GET /api/bonds
 * Liste toutes les obligations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, issuerAddress } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;
    if (issuerAddress) filter.issuerAddress = issuerAddress;

    const bonds = await Bond.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: bonds.length,
      data: bonds
    });
  } catch (error) {
    console.error('Error fetching bonds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bonds'
    });
  }
});

/**
 * GET /api/bonds/:bondId
 * Récupère une obligation spécifique avec ses statistiques
 */
router.get('/:bondId', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    
    const bond = await Bond.findOne({ bondId });
    
    if (!bond) {
      return res.status(404).json({
        success: false,
        error: 'Bond not found'
      });
    }

    // Retourne le bond avec ses statistiques intégrées
    res.json({
      success: true,
      data: bond
    });
  } catch (error) {
    console.error('Error fetching bond:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bond'
    });
  }
});

/**
 * POST /api/bonds
 * Crée une nouvelle obligation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const bondData = req.body;
    
    // Validation basique
    if (!bondData.bondId || !bondData.tokenCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bondId, tokenCurrency'
      });
    }

    // Vérifie que l'obligation n'existe pas déjà
    const existing = await Bond.findOne({
      $or: [
        { bondId: bondData.bondId },
        { tokenCurrency: bondData.tokenCurrency }
      ]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Bond with this ID or token currency already exists'
      });
    }

    // Initialise les stats
    if (!bondData.stats) {
      bondData.stats = {
        totalInvestors: 0,
        totalInvested: '0',
        percentageDistributed: 0,
        totalCouponsPaid: '0'
      };
    }

    const bond = await Bond.create(bondData);
    
    res.status(201).json({
      success: true,
      data: bond
    });
  } catch (error) {
    console.error('Error creating bond:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bond'
    });
  }
});

/**
 * PATCH /api/bonds/:bondId
 * Met à jour une obligation
 */
router.patch('/:bondId', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    const updates = req.body;

    // Empêche la modification de certains champs critiques
    delete updates.bondId;
    delete updates.tokenCurrency;
    delete updates.issuerAddress;

    const bond = await Bond.findOneAndUpdate(
      { bondId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!bond) {
      return res.status(404).json({
        success: false,
        error: 'Bond not found'
      });
    }

    res.json({
      success: true,
      data: bond
    });
  } catch (error) {
    console.error('Error updating bond:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bond'
    });
  }
});

/**
 * GET /api/bonds/:bondId/investors
 * Liste les investisseurs d'une obligation spécifique (nouveau système)
 */
router.get('/:bondId/investors', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    const { minPercentage, sortBy = 'percentage', order = 'desc' } = req.query;

    // Vérifie que l'obligation existe
    const bond = await Bond.findOne({ bondId });
    if (!bond) {
      return res.status(404).json({
        success: false,
        error: 'Bond not found'
      });
    }

    // Récupère le modèle d'investisseurs pour cette obligation
    const InvestorModel = getBondInvestorModel(bondId);
    
    const filter: any = {};
    if (minPercentage) {
      filter.percentage = { $gte: Number(minPercentage) };
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const investors = await InvestorModel.find(filter)
      .sort({ [sortBy as string]: sortOrder });

    res.json({
      success: true,
      bondId,
      count: investors.length,
      data: investors
    });
  } catch (error) {
    console.error('Error fetching investors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch investors'
    });
  }
});

/**
 * GET /api/bonds/:bondId/investors/:address
 * Récupère un investisseur spécifique
 */
router.get('/:bondId/investors/:address', async (req: Request, res: Response) => {
  try {
    const { bondId, address } = req.params;

    const InvestorModel = getBondInvestorModel(bondId);
    const investor = await InvestorModel.findOne({ investorAddress: address });

    if (!investor) {
      return res.status(404).json({
        success: false,
        error: 'Investor not found'
      });
    }

    res.json({
      success: true,
      data: investor
    });
  } catch (error) {
    console.error('Error fetching investor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch investor'
    });
  }
});

/**
 * GET /api/bonds/:bondId/stats
 * Récupère les statistiques détaillées d'une obligation
 */
router.get('/:bondId/stats', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;

    const stats = await BondStatsService.getBondDetailedStats(bondId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching bond stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bond stats'
    });
  }
});

/**
 * GET /api/bonds/:bondId/holders (ancienne route, redirige vers investors)
 * @deprecated Utiliser /api/bonds/:bondId/investors à la place
 */
router.get('/:bondId/holders', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    const { minBalance } = req.query;

    const filter: any = { bondId };
    if (minBalance) {
      filter.balance = { $gte: minBalance };
    }

    const holders = await BondHolder.find(filter)
      .sort({ balance: -1 });

    const totalBalance = holders.reduce(
      (sum, h) => sum + BigInt(h.balance),
      BigInt(0)
    ).toString();

    res.json({
      success: true,
      count: holders.length,
      totalBalance,
      data: holders
    });
  } catch (error) {
    console.error('Error fetching holders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holders'
    });
  }
});

/**
 * GET /api/bonds/:bondId/transactions
 * Liste les transactions d'une obligation
 */
router.get('/:bondId/transactions', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    const { type, limit = 100, offset = 0 } = req.query;

    const filter: any = { bondId };
    if (type) filter.type = type;

    const transactions = await Transaction.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      count: transactions.length,
      total,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

/**
 * GET /api/bonds/:bondId/coupons
 * Liste les paiements de coupons
 */
router.get('/:bondId/coupons', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    const { status } = req.query;

    const filter: any = { bondId };
    if (status) filter.status = status;

    const coupons = await CouponPayment.find(filter)
      .sort({ paymentDate: -1 });

    res.json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coupons'
    });
  }
});

/**
 * POST /api/bonds/:bondId/coupons/schedule
 * Planifie le prochain paiement de coupon
 */
router.post('/:bondId/coupons/schedule', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    
    // Cette route nécessite d'importer le CouponDistributionService
    // Pour l'instant, retourne une réponse simple
    res.json({
      success: true,
      message: 'Use the CouponDistributionService.scheduleCouponPayment() method'
    });
  } catch (error) {
    console.error('Error scheduling coupon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule coupon'
    });
  }
});

/**
 * GET /api/holders/:address
 * Récupère les obligations détenues par une adresse
 */
router.get('/holders/:address/bonds', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const holdings = await BondHolder.find({ holderAddress: address });
    
    // Enrichit avec les informations des bonds
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const bond = await Bond.findOne({ bondId: holding.bondId });
        return {
          ...holding.toObject(),
          bond: bond ? {
            tokenName: bond.tokenName,
            couponRate: bond.couponRate,
            nextCouponDate: bond.nextCouponDate,
            maturityDate: bond.maturityDate,
            status: bond.status
          } : null
        };
      })
    );

    res.json({
      success: true,
      count: enrichedHoldings.length,
      data: enrichedHoldings
    });
  } catch (error) {
    console.error('Error fetching holder bonds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holder bonds'
    });
  }
});

export default router;
