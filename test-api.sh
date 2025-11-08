#!/bin/bash

# Script de test des APIs pour verifier l'actualisation

BASE_URL="http://localhost:3001/api"

echo "========================================="
echo "TEST 1: Liste de toutes les obligations"
echo "========================================="
curl -s "$BASE_URL/bonds" | jq '.data[] | {bondId, tokenName, status}'
echo ""

echo "========================================="
echo "TEST 2: Details de BOND-TESLA-2030"
echo "========================================="
curl -s "$BASE_URL/bonds/bond-tesla-2030" | jq '.data | {bondId, tokenName, totalSupply, stats}'
echo ""

echo "========================================="
echo "TEST 3: Investisseurs de BOND-TESLA-2030"
echo "========================================="
curl -s "$BASE_URL/bonds/bond-tesla-2030/investors" | jq '.data[] | {investorAddress, balance, percentage, investedAmount}'
echo ""

echo "========================================="
echo "TEST 4: Statistiques de BOND-TESLA-2030"
echo "========================================="
curl -s "$BASE_URL/bonds/bond-tesla-2030/stats" | jq '.'
echo ""

echo "========================================="
echo "TEST 5: Transactions de BOND-TESLA-2030"
echo "========================================="
curl -s "$BASE_URL/bonds/bond-tesla-2030/transactions" | jq '.data[0:3] | .[] | {type, amount, timestamp, fromAddress}'
echo ""

echo "========================================="
echo "TEST 6: Ajout d'un investisseur test"
echo "========================================="
curl -s -X POST "$BASE_URL/bonds/bond-tesla-2030/investors" \
  -H "Content-Type: application/json" \
  -d '{
    "investorAddress": "rTestInvestor999999999999999",
    "balance": "1000000000",
    "investedAmount": "1000000000"
  }' | jq '.'
echo ""

echo "========================================="
echo "TEST 7: Stats apres ajout (verification actualisation)"
echo "========================================="
curl -s "$BASE_URL/bonds/bond-tesla-2030/stats" | jq '.'
echo ""

echo "========================================="
echo "TEST 8: Tous les investisseurs (verification)"
echo "========================================="
curl -s "$BASE_URL/bonds/bond-tesla-2030/investors" | jq '.count, .data[-1] | {investorAddress, percentage}'
echo ""

echo "Tests termines!"
