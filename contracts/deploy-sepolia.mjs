/**
 * DuelEscrow deployment script for Base Sepolia.
 * Compiles with solc then deploys with viem.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node contracts/deploy-sepolia.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  encodeDeployData,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const OZ = path.join(PROJECT_ROOT, 'node_modules', '@openzeppelin', 'contracts');

const BASE_SEPOLIA_RPC  = 'https://sepolia.base.org';
const FEE_RECIPIENT     = '0x376B52059A8262dC67cC5B08E8F9E57676992714';
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ── 1. Result signer wallet ───────────────────────────────────────────────────
const signerPk      = generatePrivateKey();
const signerAccount = privateKeyToAccount(signerPk);
console.log('\n[1] Generated result signer:', signerAccount.address);

// ── 2. Deployer wallet ────────────────────────────────────────────────────────
const deployerPk = process.env.DEPLOYER_PRIVATE_KEY;
if (!deployerPk) { console.error('Set DEPLOYER_PRIVATE_KEY'); process.exit(1); }
const deployer = privateKeyToAccount(deployerPk);
console.log('[2] Deployer:', deployer.address);

// ── 3. Collect all OZ sources recursively ────────────────────────────────────
console.log('[3] Resolving OpenZeppelin imports...');

const sources = {};

/**
 * Given an OZ alias like "@openzeppelin/contracts/access/Ownable2Step.sol",
 * read the file and recursively collect all its imports.
 */
function collectOzSource(alias) {
  if (sources[alias]) return;

  // Convert alias to filesystem path
  const rel = alias.replace('@openzeppelin/contracts/', '');
  const fsPath = path.join(OZ, rel);

  let content;
  try {
    content = readFileSync(fsPath, 'utf8');
  } catch {
    console.warn('    WARNING: cannot read', fsPath);
    return;
  }

  sources[alias] = { content };

  // Find all imports in this file
  const importRe = /import\s+(?:(?:\{[^}]*\}|[^"']*)\s+from\s+)?["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const imp = m[1];

    if (imp.startsWith('@openzeppelin/contracts/')) {
      collectOzSource(imp);
    } else if (imp.startsWith('./') || imp.startsWith('../')) {
      // Resolve relative import relative to current alias's directory
      const aliasDir = alias.substring(0, alias.lastIndexOf('/'));
      const resolved = resolveRelative(aliasDir, imp);
      collectOzSource(resolved);
    }
  }
}

/**
 * Resolve a relative import path against a base alias directory.
 * e.g. resolveRelative("@openzeppelin/contracts/access", "../utils/Context.sol")
 *   => "@openzeppelin/contracts/utils/Context.sol"
 */
function resolveRelative(baseDir, relativePath) {
  const parts = baseDir.split('/');
  const relParts = relativePath.split('/');

  for (const part of relParts) {
    if (part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }

  return parts.join('/');
}

// Seed with the root contract
sources['DuelEscrow.sol'] = { content: readFileSync(path.join(__dirname, 'src/DuelEscrow.sol'), 'utf8') };

// Parse DuelEscrow.sol's direct imports to start the recursion
{
  const content = sources['DuelEscrow.sol'].content;
  const importRe = /import\s+(?:(?:\{[^}]*\}|[^"']*)\s+from\s+)?["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const imp = m[1];
    if (imp.startsWith('@openzeppelin/contracts/')) {
      collectOzSource(imp);
    }
  }
}

console.log(`    Collected ${Object.keys(sources).length} source files`);

// ── 4. Compile ────────────────────────────────────────────────────────────────
console.log('[4] Compiling DuelEscrow.sol...');
const solcInput = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 10000 },
    evmVersion: 'cancun',
    outputSelection: { 'DuelEscrow.sol': { DuelEscrow: ['abi', 'evm.bytecode.object'] } },
  },
};

writeFileSync(path.join(__dirname, 'solc_input.json'), JSON.stringify(solcInput));
const rawOutput = execSync(
  `npx --yes solc@0.8.24 --standard-json < "${path.join(__dirname, 'solc_input.json')}"`,
  { maxBuffer: 50 * 1024 * 1024 }
).toString();

// Strip any non-JSON prefix (e.g. SMT solver warnings on stdout)
const jsonStart = rawOutput.indexOf('{');
const raw = jsonStart > 0 ? rawOutput.slice(jsonStart) : rawOutput;

const compiled = JSON.parse(raw);
const errs = (compiled.errors || []).filter(e => e.severity === 'error');
if (errs.length) { errs.forEach(e => console.error(e.formattedMessage)); process.exit(1); }

const { abi, evm: { bytecode: { object: bc } } } = compiled.contracts['DuelEscrow.sol'].DuelEscrow;
const bytecode = `0x${bc}`;
console.log(`    Bytecode: ${bytecode.length / 2} bytes`);

// ── 5. Deploy ─────────────────────────────────────────────────────────────────
console.log('[5] Deploying to Base Sepolia...');
const pub = createPublicClient({ chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) });
const wal = createWalletClient({ account: deployer, chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) });

const bal = await pub.getBalance({ address: deployer.address });
console.log(`    Balance: ${Number(bal) / 1e18} ETH`);
if (bal < parseEther('0.001')) {
  console.error('Need ≥0.001 ETH on Base Sepolia. Fund:', deployer.address);
  process.exit(1);
}

const data = encodeDeployData({ abi, bytecode, args: [FEE_RECIPIENT, signerAccount.address, BASE_SEPOLIA_USDC] });
const txHash = await wal.sendTransaction({ data, gas: 3_000_000n });
console.log('    TX:', txHash);
const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
if (receipt.status !== 'success') { console.error('TX failed'); process.exit(1); }

const addr = receipt.contractAddress;
console.log('[6] Contract deployed:', addr);
console.log('    Block:', receipt.blockNumber.toString());

// ── 6. Save results ───────────────────────────────────────────────────────────
const out = {
  contractAddress: addr, txHash, chainId: 84532, feeRecipient: FEE_RECIPIENT,
  resultSignerAddress: signerAccount.address, usdcAddress: BASE_SEPOLIA_USDC,
  deployedAt: new Date().toISOString(),
};
writeFileSync(path.join(__dirname, 'deployment-sepolia.json'), JSON.stringify(out, null, 2));

console.log('\n=================================================================');
console.log('VITE_DUEL_ESCROW_ADDRESS  =', addr);
console.log('RESULT_SIGNER_ADDRESS     =', signerAccount.address);
console.log('RESULT_SIGNER_PRIVATE_KEY =', signerPk);
console.log('DUEL_ESCROW_ADDRESS       =', addr, '  (edge function secret)');
console.log('=================================================================');
console.log('\nBasescan:', `https://sepolia.basescan.org/address/${addr}`);
