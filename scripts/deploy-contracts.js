/**
 * AleoBrowser Contract Deployment Script
 * Uses @provablehq/sdk to deploy Leo contracts to testnet
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PRIVATE_KEY = 'APrivateKey1zkp4bt1oc8PCNf5aJ1juYzkBAvKbuV9YqmAj1fmiR8qUwBD';
const ENDPOINT = 'https://api.explorer.provable.com/v1/testnet';

const contracts = [
  { name: 'bookmark_v1', path: '../contracts/bookmark/build/main.aleo' },
  { name: 'notes_v1', path: '../contracts/notes/build/main.aleo' },
  { name: 'credentials_v1', path: '../contracts/credentials/build/main.aleo' },
];

async function deployContract(sdk, programPath, name, privateKey) {
  console.log(`\n📦 Deploying ${name}...`);

  try {
    // Read the compiled Aleo program
    const fullPath = path.resolve(__dirname, programPath);
    const programSource = fs.readFileSync(fullPath, 'utf8');

    console.log(`  Read program from: ${fullPath}`);
    console.log(`  Program size: ${programSource.length} bytes`);

    // Get address from private key
    const pk = sdk.PrivateKey.from_string(PRIVATE_KEY);
    const address = sdk.Address.from_private_key(pk).to_string();
    console.log(`  Account: ${address}`);

    // Create ProgramManager for deployment
    if (!sdk.ProgramManager) {
      throw new Error('ProgramManager not found in SDK');
    }

    const keyProvider = new sdk.AleoKeyProvider();
    keyProvider.useCache(true);

    const networkClient = new sdk.AleoNetworkClient(ENDPOINT);

    const programManager = new sdk.ProgramManager(ENDPOINT, keyProvider, undefined);

    // Set the private key
    programManager.setAccount(new sdk.Account({ privateKey: PRIVATE_KEY }));

    // Deploy the program
    const fee = 3000000; // 3 ALEO in microcredits

    console.log(`  Deploying with fee: ${fee / 1000000} ALEO...`);
    console.log(`  This may take a few minutes...`);

    const txId = await programManager.deploy(programSource, fee);

    console.log(`  ✅ Deployed! Transaction ID: ${txId}`);
    return txId;

  } catch (error) {
    console.error(`  ❌ Failed to deploy ${name}:`, error.message);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 AleoBrowser Contract Deployment');
  console.log('===================================');
  console.log(`Endpoint: ${ENDPOINT}`);

  try {
    // Import the SDK
    console.log('\nLoading Aleo SDK...');
    const sdk = await import('@provablehq/sdk');
    console.log('SDK loaded successfully');
    console.log('SDK exports:', Object.keys(sdk).slice(0, 20).join(', '));

    // Try different ways to create an account
    let account;
    if (sdk.PrivateKey) {
      console.log('Using PrivateKey.from_string...');
      const privateKey = sdk.PrivateKey.from_string(PRIVATE_KEY);
      if (sdk.Account && typeof sdk.Account.from_private_key === 'function') {
        account = sdk.Account.from_private_key(privateKey);
      } else {
        // Create a simple account object
        account = {
          privateKey: () => privateKey,
          viewKey: () => sdk.ViewKey.from_private_key(privateKey),
          address: () => sdk.Address.from_private_key(privateKey),
        };
      }
    } else if (sdk.Account) {
      console.log('Using Account constructor...');
      account = new sdk.Account({ privateKey: PRIVATE_KEY });
    }

    const address = typeof account.address === 'function' ? account.address().to_string() : account.address;
    console.log(`Account address: ${address}`);

    // Deploy each contract
    const results = [];
    for (const contract of contracts) {
      try {
        const txId = await deployContract(sdk, contract.path, contract.name);
        results.push({ name: contract.name, txId, success: true });
      } catch (error) {
        results.push({ name: contract.name, error: error.message, success: false });
      }
    }

    // Summary
    console.log('\n📊 Deployment Summary');
    console.log('=====================');
    for (const result of results) {
      if (result.success) {
        console.log(`✅ ${result.name}: ${result.txId}`);
      } else {
        console.log(`❌ ${result.name}: ${result.error}`);
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
