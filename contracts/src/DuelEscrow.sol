// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title DuelEscrow
/// @notice Escrow contract for DUELCHAIN 1v1 competitive duels on Base.
/// Locks both players' stakes, releases funds to the winner after a backend-signed result,
/// deducting a 2.5% platform fee.
contract DuelEscrow is Ownable2Step, ReentrancyGuard, Pausable, EIP712 {
    using SafeERC20 for IERC20;

    // ─── Constants ──────────────────────────────────────────────────────
    uint256 public constant FEE_BPS = 250;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    address public constant NATIVE_ETH = address(0);

    // ─── Immutables ─────────────────────────────────────────────────────
    address public immutable baseUsdc;

    // ─── State ──────────────────────────────────────────────────────────
    address public feeRecipient;
    address public resultSigner;

    /// @notice Tracks each player's current active competitive duel (at most one at a time).
    mapping(address => bytes32) public activeDuelOf;

    // ─── Enums / Structs ────────────────────────────────────────────────
    enum DuelStatus {
        Created,
        Active,
        Resolved,
        Cancelled,
        Refunded
    }

    struct Duel {
        address player1;
        address player2;
        address token;
        uint256 stakeAmount;
        uint256 totalPot;
        string game;
        uint64 joinDeadline;
        uint64 resultDeadline;
        DuelStatus status;
        address winner;
        bool feePaid;
    }

    mapping(bytes32 => Duel) public duels;

    // ─── EIP-712 typehash ───────────────────────────────────────────────
    bytes32 public constant RESULT_TYPEHASH = keccak256(
        "DuelResult(bytes32 duelId,address player1,address player2,address winner,address token,uint256 stakeAmount,string game,bytes32 resultHash,uint256 deadline)"
    );

    // ─── Events ─────────────────────────────────────────────────────────
    event DuelCreated(
        bytes32 indexed duelId,
        address indexed player1,
        address player2,
        address token,
        uint256 stakeAmount,
        string game,
        uint64 joinDeadline,
        uint64 resultDeadline
    );
    event DuelJoined(bytes32 indexed duelId, address indexed player2);
    event DuelCancelled(bytes32 indexed duelId);
    event DuelRefunded(bytes32 indexed duelId);
    event DuelResolved(bytes32 indexed duelId, address indexed winner, uint256 payout, uint256 fee);
    event DuelForfeited(bytes32 indexed duelId, address indexed forfeiter, address indexed winner);
    event ResultSignerUpdated(address oldSigner, address newSigner);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    // ─── Errors ─────────────────────────────────────────────────────────
    error DuelAlreadyExists();
    error ZeroStake();
    error UnsupportedToken();
    error IncorrectEthValue();
    error EthNotAllowed();
    error InvalidDeadline();
    error DuelNotFound();
    error InvalidStatus();
    error JoinDeadlineExpired();
    error UnauthorizedPlayer();
    error CannotJoinOwnDuel();
    error PlayerAlreadyInDuel();
    error InvalidWinner();
    error SignatureExpired();
    error InvalidSignature();
    error ResultDeadlineNotReached();
    error JoinDeadlineNotReached();
    error ZeroAddress();

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(
        address _feeRecipient,
        address _resultSigner,
        address _baseUsdc
    ) Ownable(msg.sender) EIP712("DuelEscrow", "1") {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_resultSigner == address(0)) revert ZeroAddress();
        if (_baseUsdc == address(0)) revert ZeroAddress();

        feeRecipient = _feeRecipient;
        resultSigner = _resultSigner;
        baseUsdc = _baseUsdc;
    }

    // ─── External: Create ───────────────────────────────────────────────
    /// @notice Player 1 creates a duel and deposits stake.
    /// @param duelId Unique identifier for the duel (generated off-chain).
    /// @param player2 Expected opponent, or address(0) for open match.
    /// @param token NATIVE_ETH or baseUsdc.
    /// @param stakeAmount Amount each player must stake.
    /// @param game Game identifier string.
    /// @param joinDeadline Timestamp by which player2 must join.
    /// @param resultDeadline Timestamp by which a result must be submitted.
    function createDuel(
        bytes32 duelId,
        address player2,
        address token,
        uint256 stakeAmount,
        string calldata game,
        uint64 joinDeadline,
        uint64 resultDeadline
    ) external payable nonReentrant whenNotPaused {
        if (duels[duelId].player1 != address(0)) revert DuelAlreadyExists();
        if (stakeAmount == 0) revert ZeroStake();
        if (token != NATIVE_ETH && token != baseUsdc) revert UnsupportedToken();
        if (joinDeadline <= block.timestamp) revert InvalidDeadline();
        if (resultDeadline <= joinDeadline) revert InvalidDeadline();
        if (activeDuelOf[msg.sender] != bytes32(0)) revert PlayerAlreadyInDuel();

        _collectDeposit(token, stakeAmount);

        duels[duelId] = Duel({
            player1: msg.sender,
            player2: player2,
            token: token,
            stakeAmount: stakeAmount,
            totalPot: 0,
            game: game,
            joinDeadline: joinDeadline,
            resultDeadline: resultDeadline,
            status: DuelStatus.Created,
            winner: address(0),
            feePaid: false
        });

        activeDuelOf[msg.sender] = duelId;

        emit DuelCreated(duelId, msg.sender, player2, token, stakeAmount, game, joinDeadline, resultDeadline);
    }

    // ─── External: Join ─────────────────────────────────────────────────
    /// @notice Player 2 joins an existing duel and deposits matching stake.
    function joinDuel(bytes32 duelId) external payable nonReentrant whenNotPaused {
        Duel storage d = duels[duelId];
        if (d.player1 == address(0)) revert DuelNotFound();
        if (d.status != DuelStatus.Created) revert InvalidStatus();
        if (block.timestamp > d.joinDeadline) revert JoinDeadlineExpired();
        if (msg.sender == d.player1) revert CannotJoinOwnDuel();
        if (d.player2 != address(0) && d.player2 != msg.sender) revert UnauthorizedPlayer();
        if (activeDuelOf[msg.sender] != bytes32(0)) revert PlayerAlreadyInDuel();

        _collectDeposit(d.token, d.stakeAmount);

        d.player2 = msg.sender;
        d.totalPot = d.stakeAmount * 2;
        d.status = DuelStatus.Active;

        activeDuelOf[msg.sender] = duelId;

        emit DuelJoined(duelId, msg.sender);
    }

    // ─── External: Cancel ───────────────────────────────────────────────
    /// @notice Player 1 cancels before anyone joins.
    function cancelDuel(bytes32 duelId) external nonReentrant {
        Duel storage d = duels[duelId];
        if (d.player1 == address(0)) revert DuelNotFound();
        if (d.status != DuelStatus.Created) revert InvalidStatus();
        if (msg.sender != d.player1) revert UnauthorizedPlayer();

        d.status = DuelStatus.Cancelled;
        _clearActiveDuel(d.player1, duelId);

        _sendFunds(d.token, d.player1, d.stakeAmount);

        emit DuelCancelled(duelId);
    }

    // ─── External: Refund Expired (no join) ─────────────────────────────
    /// @notice Refund player1 if nobody joined before joinDeadline.
    function refundExpiredDuel(bytes32 duelId) external nonReentrant {
        Duel storage d = duels[duelId];
        if (d.player1 == address(0)) revert DuelNotFound();
        if (d.status != DuelStatus.Created) revert InvalidStatus();
        if (block.timestamp <= d.joinDeadline) revert JoinDeadlineNotReached();

        d.status = DuelStatus.Refunded;
        _clearActiveDuel(d.player1, duelId);

        _sendFunds(d.token, d.player1, d.stakeAmount);

        emit DuelRefunded(duelId);
    }

    // ─── External: Submit Result ────────────────────────────────────────
    /// @notice Submit a backend-signed result to release funds to the winner.
    /// @param duelId The duel to resolve.
    /// @param winner The winning player address.
    /// @param resultHash Unique hash tying the result to off-chain game data.
    /// @param deadline Timestamp by which this signature must be used.
    /// @param signature EIP-712 signature from resultSigner.
    function submitResult(
        bytes32 duelId,
        address winner,
        bytes32 resultHash,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        Duel storage d = duels[duelId];
        if (d.player1 == address(0)) revert DuelNotFound();
        if (d.status != DuelStatus.Active) revert InvalidStatus();
        if (winner != d.player1 && winner != d.player2) revert InvalidWinner();
        if (block.timestamp > deadline) revert SignatureExpired();

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                RESULT_TYPEHASH,
                duelId,
                d.player1,
                d.player2,
                winner,
                d.token,
                d.stakeAmount,
                keccak256(bytes(d.game)),
                resultHash,
                deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != resultSigner) revert InvalidSignature();

        // Effects
        d.status = DuelStatus.Resolved;
        d.winner = winner;
        d.feePaid = true;
        _clearActiveDuel(d.player1, duelId);
        _clearActiveDuel(d.player2, duelId);

        // Interactions
        uint256 fee = (d.totalPot * FEE_BPS) / BPS_DENOMINATOR;
        uint256 payout = d.totalPot - fee;

        _sendFunds(d.token, feeRecipient, fee);
        _sendFunds(d.token, winner, payout);

        emit DuelResolved(duelId, winner, payout, fee);
    }

    // ─── External: Forfeit ──────────────────────────────────────────────
    /// @notice A player forfeits, awarding the opponent.
    function forfeit(bytes32 duelId) external nonReentrant {
        Duel storage d = duels[duelId];
        if (d.player1 == address(0)) revert DuelNotFound();
        if (d.status != DuelStatus.Active) revert InvalidStatus();
        if (msg.sender != d.player1 && msg.sender != d.player2) revert UnauthorizedPlayer();

        address winner = msg.sender == d.player1 ? d.player2 : d.player1;

        d.status = DuelStatus.Resolved;
        d.winner = winner;
        d.feePaid = true;
        _clearActiveDuel(d.player1, duelId);
        _clearActiveDuel(d.player2, duelId);

        uint256 fee = (d.totalPot * FEE_BPS) / BPS_DENOMINATOR;
        uint256 payout = d.totalPot - fee;

        _sendFunds(d.token, feeRecipient, fee);
        _sendFunds(d.token, winner, payout);

        emit DuelForfeited(duelId, msg.sender, winner);
    }

    // ─── External: Refund Unresolved ────────────────────────────────────
    /// @notice Refund both players if result deadline expires without resolution.
    function refundUnresolvedDuel(bytes32 duelId) external nonReentrant {
        Duel storage d = duels[duelId];
        if (d.player1 == address(0)) revert DuelNotFound();
        if (d.status != DuelStatus.Active) revert InvalidStatus();
        if (block.timestamp <= d.resultDeadline) revert ResultDeadlineNotReached();

        d.status = DuelStatus.Refunded;
        _clearActiveDuel(d.player1, duelId);
        _clearActiveDuel(d.player2, duelId);

        _sendFunds(d.token, d.player1, d.stakeAmount);
        _sendFunds(d.token, d.player2, d.stakeAmount);

        emit DuelRefunded(duelId);
    }

    // ─── Admin ──────────────────────────────────────────────────────────
    function updateResultSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit ResultSignerUpdated(resultSigner, newSigner);
        resultSigner = newSigner;
    }

    function updateFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── View ───────────────────────────────────────────────────────────
    function getDuel(bytes32 duelId) external view returns (Duel memory) {
        return duels[duelId];
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ─── Internal ───────────────────────────────────────────────────────
    function _collectDeposit(address token, uint256 amount) internal {
        if (token == NATIVE_ETH) {
            if (msg.value != amount) revert IncorrectEthValue();
        } else {
            if (msg.value != 0) revert EthNotAllowed();
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    function _sendFunds(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == NATIVE_ETH) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _clearActiveDuel(address player, bytes32 duelId) internal {
        if (activeDuelOf[player] == duelId) {
            activeDuelOf[player] = bytes32(0);
        }
    }

    /// @notice Contract can receive ETH refunds.
    receive() external payable {}
}
