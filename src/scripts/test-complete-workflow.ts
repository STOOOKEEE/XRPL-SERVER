import dotenv from 'dotenv';

dotenv.config();

async function testWorkflow() {
  console.log('This test script has been disabled');
  console.log('Use the REST API endpoints to test the system:');
  console.log('');
  console.log('Create a bond:');
  console.log('   POST /api/bonds');
  console.log('');
  console.log('View investors:');
  console.log('   GET /api/bonds/:bondId/investors');
  console.log('');
  console.log('View transactions:');
  console.log('   GET /api/bonds/:bondId/transactions');
  console.log('');
  console.log('View statistics:');
  console.log('   GET /api/bonds/:bondId/stats');
  console.log('');
  console.log('XRPL monitoring is automatic via BondTransactionMonitor');
  process.exit(0);
}

testWorkflow().catch(console.error);
