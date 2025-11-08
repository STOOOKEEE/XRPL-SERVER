# Fréquence des Coupons - Guide d'utilisation

## 📅 Nouveau système de fréquence

Le système de fréquence des coupons a été modernisé pour offrir plus de flexibilité.

### Ancien système (deprecated)
```typescript
couponFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'none'
```

### Nouveau système ✅
```typescript
couponFrequencyMonths: number  // Nombre de mois entre chaque paiement de coupon
```

## 💡 Exemples d'utilisation

### Coupons mensuels
```json
{
  "couponRate": 4.5,
  "couponFrequencyMonths": 1
}
```
→ Paiements tous les mois

### Coupons bimensuels
```json
{
  "couponRate": 4.5,
  "couponFrequencyMonths": 2
}
```
→ Paiements tous les 2 mois

### Coupons trimestriels
```json
{
  "couponRate": 4.5,
  "couponFrequencyMonths": 3
}
```
→ Paiements tous les 3 mois (équivalent à l'ancien 'quarterly')

### Coupons quadrimestriels
```json
{
  "couponRate": 4.5,
  "couponFrequencyMonths": 4
}
```
→ Paiements tous les 4 mois

### Coupons semestriels
```json
{
  "couponRate": 4.5,
  "couponFrequencyMonths": 6
}
```
→ Paiements tous les 6 mois (équivalent à l'ancien 'semi-annual')

### Coupons annuels
```json
{
  "couponRate": 4.5,
  "couponFrequencyMonths": 12
}
```
→ Paiements tous les 12 mois (équivalent à l'ancien 'annual')

## 🎯 Cas d'usage réels

### Obligation à 6 mois avec coupons mensuels
```json
{
  "bondId": "BOND-STARTUP-2026",
  "tokenName": "Startup X 8% 6M",
  "issueDate": 1730419200000,
  "maturityDate": 1746028800000,  // +6 mois
  "couponRate": 8.0,
  "couponFrequencyMonths": 1,     // Paiement mensuel
  "nextCouponDate": 1733011200000  // Premier coupon dans 1 mois
}
```
→ 6 paiements de coupon sur la durée de l'obligation

### Obligation à 12 mois avec coupons bimensuels
```json
{
  "bondId": "BOND-MIDCAP-2026",
  "tokenName": "MidCap 6% 12M",
  "issueDate": 1730419200000,
  "maturityDate": 1762041600000,  // +12 mois
  "couponRate": 6.0,
  "couponFrequencyMonths": 2,     // Paiement tous les 2 mois
  "nextCouponDate": 1735689600000  // Premier coupon dans 2 mois
}
```
→ 6 paiements de coupon sur la durée de l'obligation

### Obligation à 24 mois avec coupons trimestriels
```json
{
  "bondId": "BOND-CORPORATE-2027",
  "tokenName": "Corporate 5% 24M",
  "issueDate": 1730419200000,
  "maturityDate": 1793664000000,  // +24 mois
  "couponRate": 5.0,
  "couponFrequencyMonths": 3,     // Paiement trimestriel
  "nextCouponDate": 1738368000000  // Premier coupon dans 3 mois
}
```
→ 8 paiements de coupon sur la durée de l'obligation

## 🔧 API - Création d'une obligation

```bash
curl -X POST http://localhost:3001/api/bonds \
  -H "Content-Type: application/json" \
  -d '{
    "bondId": "BOND-FLEXIBLE-2026",
    "issuerAddress": "rN7n7otQDd6FczFgLdlqtyMVrn3HMgkk62",
    "issuerName": "Flexible Inc.",
    "tokenCurrency": "464C455800000000000000",
    "tokenName": "Flexible Bond 7% Custom",
    "totalSupply": "1000000000000",
    "denomination": "1000000",
    "couponRate": 7.0,
    "couponFrequencyMonths": 2,    <-- Tous les 2 mois
    "issueDate": 1730419200000,
    "maturityDate": 1762041600000,
    "nextCouponDate": 1735689600000,
    "description": "Obligation avec paiements bimensuels",
    "status": "active"
  }'
```

## 📊 Calcul automatique

Le système calcule automatiquement la prochaine date de coupon en ajoutant le nombre de mois spécifié :

```typescript
nextCouponDate = currentDate + (couponFrequencyMonths * 30 jours)
```

## ⚡ Migration automatique

Les obligations existantes ont été automatiquement migrées :
- `'monthly'` → 1 mois
- `'quarterly'` → 3 mois
- `'semi-annual'` → 6 mois
- `'annual'` → 12 mois
- `'none'` → 12 mois (par défaut)

## 🎓 Avantages

✅ **Flexibilité totale** : Choisissez n'importe quel intervalle en mois (1 à 120)
✅ **Plus simple** : Un seul nombre au lieu d'un enum
✅ **Personnalisable** : Adaptez la fréquence à vos besoins spécifiques
✅ **Compatible** : Les anciennes obligations fonctionnent toujours après migration

## 🚀 Limites

- **Minimum** : 1 mois (paiements mensuels)
- **Maximum** : 120 mois (10 ans entre chaque coupon)
- Le système utilise l'arithmétique des mois (peut varier de 28 à 31 jours selon le mois)
