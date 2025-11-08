// Export tous les modèles
export { Bond, IBond } from './Bond';
export { getBondInvestorModel, deleteBondInvestorCollection, IBondInvestor } from './BondInvestor';

// Anciens modèles conservés pour compatibilité mais dépréciés
export { BondHolder, IBondHolder } from './BondHolder';
export { Transaction, ITransaction } from './Transaction';
export { CouponPayment, ICouponPayment } from './CouponPayment';
