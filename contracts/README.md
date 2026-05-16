# DuelEscrow Smart Contract

Production-ready escrow contract for DUELCHAIN competitive 1v1 duels on Base.

## Overview

DuelEscrow locks both players' funds before a duel starts, then releases them to the winner after a backend-validated result. A 2.5% platform fee is deducted from each duel's total pot.

**Classic mode does NOT interact with this contract.**
Only Competitive/Ranked mode uses on-chain escrow.

## Supported Assets

| Asset | Address | Decimals |
|-------|---------|----------|
| ETH (native) | `address(0)` | 18 |
| USDC on Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |

## Fee Structure

- Platform fee: **2.5%** (250 bps, immutable)
- Fee recipient: `0x376B52059A8262dC67cC5B08E8F9E57676992714`
- Winner receives: 97.5% of the total pot

## Duel Lifecycle

```
Created ──> Active ──> Resolved (winner paid)
  │            │
  │            └──> Refunded (both refunded if resultDeadline expires)
  │
  ├──> Cancelled (player1 cancels before join)
  └──> Refunded (no join before joinDeadline)
```

### Active ──> Resolved options:
1. **submitResult()** — Backend signs EIP-712 result, anyone submits on-chain
2. **forfeit()** — A player voluntarily forfeits, opponent wins

## Flow

### 1. Player Creates Duel

```
player1 calls createDuel(duelId, player2, token, stakeAmount, game, joinDeadline, resultDeadline)
├── Deposits stakeAmount (ETH via msg.value, or USDC via transferFrom)
├── Status: Created
└── Sets activeDuelOf[player1] = duelId
```

### 2. Player Joins Duel

```
player2 calls joinDuel(duelId)
├── Deposits matching stakeAmount
├── Status: Active
├── totalPot = stakeAmount * 2
└── Sets activeDuelOf[player2] = duelId
```

### 3. Game Plays Off-Chain

The smart contract does NOT evaluate game logic. Chess, Connect Four, Tic-Tac-Toe, etc. are validated by the backend game server.

### 4. Backend Signs Result

```
Backend validates game → Signs EIP-712 typed data:
  DuelResult(duelId, player1, player2, winner, token, stakeAmount, game, resultHash, deadline)
```

### 5. Result Submitted On-Chain

```
Anyone calls submitResult(duelId, winner, resultHash, deadline, signature)
├── Verifies EIP-712 signature from resultSigner
├── Transfers fee to feeRecipient
├── Transfers payout to winner
├── Status: Resolved
└── Clears activeDuelOf for both players
```

## Security Design

### Result Validation
- **Frontend CANNOT decide the winner** — only a backend-signed EIP-712 message is accepted
- The duelId, player addresses, token, stake, and game must all match stored data
- Signatures include a deadline to prevent indefinite validity
- Each duel can only be resolved once (replay protection)
- The signature includes the contract address via EIP-712 domain separator

### Fund Safety
- Owner/admin CANNOT withdraw player funds
- Pausing blocks new duel creation but does NOT block refunds or result claims
- Reentrancy protection on all fund-transfer functions
- Checks-effects-interactions pattern throughout
- SafeERC20 for USDC transfers

### Concurrency
- Duels are stored in `mapping(bytes32 => Duel)` — fully independent
- No global state shared between duels
- One active duel per player (tracked via `activeDuelOf[player]`)
- Signature for duel A cannot resolve duel B (duelId is in the signed struct)

### Attack Prevention
- Duplicate duelId: reverts
- Double payout: status check prevents re-resolution
- Replay attacks: duelId + contract address in EIP-712 domain
- Invalid winner: must be player1 or player2
- Wrong stake: exact match required
- ETH for USDC duel: reverts
- Unsupported tokens: reverts
- Self-join: reverts
- Expired join: reverts

## Dependencies

- OpenZeppelin Contracts v5.x
  - Ownable2Step
  - ReentrancyGuard
  - Pausable
  - SafeERC20
  - EIP712
  - ECDSA

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Install Dependencies

```bash
cd contracts
forge install openzeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

### Build

```bash
forge build
```

### Test

```bash
forge test -vvv
```

### Deploy to Base

```bash
export PRIVATE_KEY=0x...
export RESULT_SIGNER=0x...
export BASE_RPC_URL=https://mainnet.base.org

forge script script/DeployDuelEscrow.s.sol:DeployDuelEscrow \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify
```

## Frontend Integration

See `src/lib/duelEscrow.ts` for wagmi/viem helpers.

### Competitive Mode Flow:

1. Player selects stake amount in USD
2. Frontend converts to ETH (via price feed) or USDC units
3. For USDC: user approves escrow contract first
4. User creates duel (or joins existing one)
5. Both deposits are locked — game starts
6. Backend validates the final game result off-chain
7. Backend signs result using EIP-712 (resultSigner key)
8. Frontend (or backend) submits signed result to contract
9. Contract pays winner 97.5%, sends 2.5% fee to platform

### Classic Mode:

- Zero contract interaction
- No escrow
- No on-chain state
- Purely off-chain fun

## Gas Estimates (Base L2)

| Function | Gas |
|----------|-----|
| createDuel (ETH) | ~130k |
| createDuel (USDC) | ~160k |
| joinDuel (ETH) | ~100k |
| joinDuel (USDC) | ~130k |
| submitResult (ETH) | ~85k |
| submitResult (USDC) | ~95k |
| forfeit | ~80k |
| cancelDuel | ~50k |

*Actual costs on Base are very low due to L2 gas pricing.*
