// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {DuelEscrow} from "../src/DuelEscrow.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract DuelEscrowTest is Test {
    DuelEscrow public escrow;
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public feeRecipient = 0x376B52059A8262dC67cC5B08E8F9E57676992714;
    uint256 public signerPk = 0xABCD;
    address public signer;
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    address public player3 = makeAddr("player3");

    bytes32 public constant RESULT_TYPEHASH = keccak256(
        "DuelResult(bytes32 duelId,address player1,address player2,address winner,address token,uint256 stakeAmount,string game,bytes32 resultHash,uint256 deadline)"
    );

    function setUp() public {
        signer = vm.addr(signerPk);

        vm.startPrank(owner);
        usdc = new MockUSDC();
        escrow = new DuelEscrow(feeRecipient, signer, address(usdc));
        vm.stopPrank();

        // Fund players
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(player3, 100 ether);
        usdc.mint(player1, 10_000e6);
        usdc.mint(player2, 10_000e6);
        usdc.mint(player3, 10_000e6);

        // Approve USDC
        vm.prank(player1);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(player2);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(player3);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function _createEthDuel(bytes32 id, uint256 stake) internal {
        vm.prank(player1);
        escrow.createDuel{value: stake}(
            id,
            address(0),
            address(0), // ETH
            stake,
            "connect-four",
            uint64(block.timestamp + 1 hours),
            uint64(block.timestamp + 2 hours)
        );
    }

    function _createUsdcDuel(bytes32 id, uint256 stake) internal {
        vm.prank(player1);
        escrow.createDuel(
            id,
            address(0),
            address(usdc),
            stake,
            "chess",
            uint64(block.timestamp + 1 hours),
            uint64(block.timestamp + 2 hours)
        );
    }

    function _joinEthDuel(bytes32 id, uint256 stake) internal {
        vm.prank(player2);
        escrow.joinDuel{value: stake}(id);
    }

    function _joinUsdcDuel(bytes32 id) internal {
        vm.prank(player2);
        escrow.joinDuel(id);
    }

    function _signResult(
        bytes32 duelId,
        address _player1,
        address _player2,
        address winner,
        address token,
        uint256 stakeAmount,
        string memory game,
        bytes32 resultHash,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                RESULT_TYPEHASH,
                duelId,
                _player1,
                _player2,
                winner,
                token,
                stakeAmount,
                keccak256(bytes(game)),
                resultHash,
                deadline
            )
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(escrow.domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    // ─── ETH Duel: Full Flow ────────────────────────────────────────────

    function test_ethDuel_createJoinResolve() public {
        bytes32 id = keccak256("duel-eth-1");
        uint256 stake = 0.1 ether;

        _createEthDuel(id, stake);
        assertEq(address(escrow).balance, stake);

        _joinEthDuel(id, stake);
        assertEq(address(escrow).balance, stake * 2);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("game1"), deadline);

        uint256 p1Before = player1.balance;
        uint256 feeRecBefore = feeRecipient.balance;

        escrow.submitResult(id, player1, keccak256("game1"), deadline, sig);

        uint256 totalPot = stake * 2;
        uint256 fee = (totalPot * 250) / 10000;
        uint256 payout = totalPot - fee;

        assertEq(player1.balance - p1Before, payout);
        assertEq(feeRecipient.balance - feeRecBefore, fee);
        assertEq(address(escrow).balance, 0);

        DuelEscrow.Duel memory d = escrow.getDuel(id);
        assertEq(uint8(d.status), uint8(DuelEscrow.DuelStatus.Resolved));
        assertEq(d.winner, player1);
        assertTrue(d.feePaid);
    }

    // ─── USDC Duel: Full Flow ───────────────────────────────────────────

    function test_usdcDuel_createJoinResolve() public {
        bytes32 id = keccak256("duel-usdc-1");
        uint256 stake = 100e6; // 100 USDC

        _createUsdcDuel(id, stake);
        assertEq(usdc.balanceOf(address(escrow)), stake);

        _joinUsdcDuel(id);
        assertEq(usdc.balanceOf(address(escrow)), stake * 2);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player2, address(usdc), stake, "chess", keccak256("game2"), deadline);

        uint256 p2Before = usdc.balanceOf(player2);
        uint256 feeRecBefore = usdc.balanceOf(feeRecipient);

        escrow.submitResult(id, player2, keccak256("game2"), deadline, sig);

        uint256 totalPot = stake * 2;
        uint256 fee = (totalPot * 250) / 10000;
        uint256 payout = totalPot - fee;

        assertEq(usdc.balanceOf(player2) - p2Before, payout);
        assertEq(usdc.balanceOf(feeRecipient) - feeRecBefore, fee);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    // ─── Fee Precision ──────────────────────────────────────────────────

    function test_feeIs2point5Percent() public {
        bytes32 id = keccak256("fee-test");
        uint256 stake = 1 ether;

        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("x"), deadline);

        uint256 feeRecBefore = feeRecipient.balance;
        escrow.submitResult(id, player1, keccak256("x"), deadline, sig);

        uint256 fee = feeRecipient.balance - feeRecBefore;
        // 2 ether * 250 / 10000 = 0.05 ether
        assertEq(fee, 0.05 ether);
    }

    function test_winnerGets97point5Percent() public {
        bytes32 id = keccak256("payout-test");
        uint256 stake = 2 ether;

        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player2, address(0), stake, "connect-four", keccak256("y"), deadline);

        uint256 p2Before = player2.balance;
        escrow.submitResult(id, player2, keccak256("y"), deadline, sig);

        uint256 totalPot = stake * 2;
        uint256 expected = totalPot - (totalPot * 250 / 10000);
        assertEq(player2.balance - p2Before, expected);
    }

    // ─── Cancel ─────────────────────────────────────────────────────────

    function test_cancelBeforeJoin() public {
        bytes32 id = keccak256("cancel-1");
        uint256 stake = 0.5 ether;

        _createEthDuel(id, stake);
        uint256 before = player1.balance;

        vm.prank(player1);
        escrow.cancelDuel(id);

        assertEq(player1.balance - before, stake);
        DuelEscrow.Duel memory d = escrow.getDuel(id);
        assertEq(uint8(d.status), uint8(DuelEscrow.DuelStatus.Cancelled));
    }

    function test_cancelByNonPlayer1Reverts() public {
        bytes32 id = keccak256("cancel-2");
        _createEthDuel(id, 0.1 ether);

        vm.prank(player2);
        vm.expectRevert(DuelEscrow.UnauthorizedPlayer.selector);
        escrow.cancelDuel(id);
    }

    function test_cancelAfterJoinReverts() public {
        bytes32 id = keccak256("cancel-3");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.InvalidStatus.selector);
        escrow.cancelDuel(id);
    }

    // ─── Refund Expired (no join) ───────────────────────────────────────

    function test_refundAfterJoinDeadline() public {
        bytes32 id = keccak256("refund-nojoin");
        uint256 stake = 0.3 ether;
        _createEthDuel(id, stake);

        // Warp past join deadline
        vm.warp(block.timestamp + 2 hours);

        uint256 before = player1.balance;
        escrow.refundExpiredDuel(id);

        assertEq(player1.balance - before, stake);
        DuelEscrow.Duel memory d = escrow.getDuel(id);
        assertEq(uint8(d.status), uint8(DuelEscrow.DuelStatus.Refunded));
    }

    function test_refundBeforeDeadlineReverts() public {
        bytes32 id = keccak256("refund-early");
        _createEthDuel(id, 0.1 ether);

        vm.expectRevert(DuelEscrow.JoinDeadlineNotReached.selector);
        escrow.refundExpiredDuel(id);
    }

    // ─── Refund Unresolved ──────────────────────────────────────────────

    function test_refundAfterResultDeadline() public {
        bytes32 id = keccak256("refund-unresolved");
        uint256 stake = 0.2 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        vm.warp(block.timestamp + 3 hours);

        uint256 p1Before = player1.balance;
        uint256 p2Before = player2.balance;

        escrow.refundUnresolvedDuel(id);

        assertEq(player1.balance - p1Before, stake);
        assertEq(player2.balance - p2Before, stake);
    }

    function test_refundUnresolvedBeforeDeadlineReverts() public {
        bytes32 id = keccak256("refund-early-active");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        vm.expectRevert(DuelEscrow.ResultDeadlineNotReached.selector);
        escrow.refundUnresolvedDuel(id);
    }

    // ─── Forfeit ────────────────────────────────────────────────────────

    function test_forfeit() public {
        bytes32 id = keccak256("forfeit-1");
        uint256 stake = 0.5 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 p2Before = player2.balance;
        uint256 feeRecBefore = feeRecipient.balance;

        vm.prank(player1); // player1 forfeits
        escrow.forfeit(id);

        uint256 totalPot = stake * 2;
        uint256 fee = (totalPot * 250) / 10000;
        uint256 payout = totalPot - fee;

        assertEq(player2.balance - p2Before, payout);
        assertEq(feeRecipient.balance - feeRecBefore, fee);
    }

    function test_forfeitByNonPlayerReverts() public {
        bytes32 id = keccak256("forfeit-bad");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        vm.prank(player3);
        vm.expectRevert(DuelEscrow.UnauthorizedPlayer.selector);
        escrow.forfeit(id);
    }

    // ─── Security: Double Claim ─────────────────────────────────────────

    function test_cannotDoubleClaim() public {
        bytes32 id = keccak256("double-claim");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("z"), deadline);

        escrow.submitResult(id, player1, keccak256("z"), deadline, sig);

        vm.expectRevert(DuelEscrow.InvalidStatus.selector);
        escrow.submitResult(id, player1, keccak256("z"), deadline, sig);
    }

    // ─── Security: Fake Winner ──────────────────────────────────────────

    function test_cannotSubmitFakeWinner() public {
        bytes32 id = keccak256("fake-winner");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 1 hours;
        // Sign with player3 as winner (not a participant)
        bytes memory sig = _signResult(id, player1, player2, player3, address(0), stake, "connect-four", keccak256("a"), deadline);

        vm.expectRevert(DuelEscrow.InvalidWinner.selector);
        escrow.submitResult(id, player3, keccak256("a"), deadline, sig);
    }

    // ─── Security: Invalid Signature ────────────────────────────────────

    function test_invalidSignatureReverts() public {
        bytes32 id = keccak256("bad-sig");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 1 hours;
        // Sign with wrong private key
        uint256 fakePk = 0xDEAD;
        bytes32 structHash = keccak256(
            abi.encode(
                RESULT_TYPEHASH,
                id,
                player1,
                player2,
                player1,
                address(0),
                stake,
                keccak256(bytes("connect-four")),
                keccak256("b"),
                deadline
            )
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(escrow.domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(fakePk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert(DuelEscrow.InvalidSignature.selector);
        escrow.submitResult(id, player1, keccak256("b"), deadline, sig);
    }

    // ─── Security: Replay ───────────────────────────────────────────────

    function test_cannotReplaySignatureAcrossDuels() public {
        bytes32 id1 = keccak256("duel-A");
        bytes32 id2 = keccak256("duel-B");
        uint256 stake = 0.1 ether;

        // Create & join duel A
        _createEthDuel(id1, stake);
        _joinEthDuel(id1, stake);

        // Resolve duel A
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id1, player1, player2, player1, address(0), stake, "connect-four", keccak256("c"), deadline);
        escrow.submitResult(id1, player1, keccak256("c"), deadline, sig);

        // Create & join duel B with player3 as player1
        vm.prank(player3);
        escrow.createDuel{value: stake}(
            id2, address(0), address(0), stake, "connect-four",
            uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours)
        );
        vm.prank(player2);
        escrow.joinDuel{value: stake}(id2);

        // Try to use duel A's sig on duel B — must fail
        // Winner player1 is not a participant of duel B (player3, player2)
        vm.expectRevert(DuelEscrow.InvalidWinner.selector);
        escrow.submitResult(id2, player1, keccak256("c"), deadline, sig);
    }

    // ─── Security: Expired Join ─────────────────────────────────────────

    function test_cannotJoinExpiredDuel() public {
        bytes32 id = keccak256("expired-join");
        _createEthDuel(id, 0.1 ether);

        vm.warp(block.timestamp + 2 hours);

        vm.prank(player2);
        vm.expectRevert(DuelEscrow.JoinDeadlineExpired.selector);
        escrow.joinDuel{value: 0.1 ether}(id);
    }

    // ─── Security: Self-join ────────────────────────────────────────────

    function test_cannotJoinOwnDuel() public {
        bytes32 id = keccak256("self-join");
        _createEthDuel(id, 0.1 ether);

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.CannotJoinOwnDuel.selector);
        escrow.joinDuel{value: 0.1 ether}(id);
    }

    // ─── Security: Unsupported Token ────────────────────────────────────

    function test_unsupportedTokenReverts() public {
        bytes32 id = keccak256("bad-token");
        address fakeToken = makeAddr("fake");

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.UnsupportedToken.selector);
        escrow.createDuel(id, address(0), fakeToken, 100, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));
    }

    // ─── Security: Wrong ETH ────────────────────────────────────────────

    function test_wrongEthAmountReverts() public {
        bytes32 id = keccak256("wrong-eth");
        vm.prank(player1);
        vm.expectRevert(DuelEscrow.IncorrectEthValue.selector);
        escrow.createDuel{value: 0.05 ether}(id, address(0), address(0), 0.1 ether, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));
    }

    // ─── Security: ETH sent for USDC duel ───────────────────────────────

    function test_ethSentForUsdcDuelReverts() public {
        bytes32 id = keccak256("eth-usdc");
        vm.prank(player1);
        vm.expectRevert(DuelEscrow.EthNotAllowed.selector);
        escrow.createDuel{value: 0.1 ether}(id, address(0), address(usdc), 100e6, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));
    }

    // ─── Security: Expired Signature ────────────────────────────────────

    function test_expiredSignatureReverts() public {
        bytes32 id = keccak256("expired-sig");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 30 minutes;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("d"), deadline);

        vm.warp(block.timestamp + 1 hours);

        vm.expectRevert(DuelEscrow.SignatureExpired.selector);
        escrow.submitResult(id, player1, keccak256("d"), deadline, sig);
    }

    // ─── Pause ──────────────────────────────────────────────────────────

    function test_pauseBlocksNewDuels() public {
        vm.prank(owner);
        escrow.pause();

        bytes32 id = keccak256("paused-duel");
        vm.prank(player1);
        vm.expectRevert();
        escrow.createDuel{value: 0.1 ether}(id, address(0), address(0), 0.1 ether, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));
    }

    function test_pauseDoesNotBlockRefunds() public {
        bytes32 id = keccak256("pause-refund");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);

        vm.prank(owner);
        escrow.pause();

        // Cancel still works
        uint256 before = player1.balance;
        vm.prank(player1);
        escrow.cancelDuel(id);
        assertEq(player1.balance - before, stake);
    }

    function test_pauseDoesNotBlockResultClaims() public {
        bytes32 id = keccak256("pause-resolve");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        vm.prank(owner);
        escrow.pause();

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("e"), deadline);

        escrow.submitResult(id, player1, keccak256("e"), deadline, sig);
        DuelEscrow.Duel memory d = escrow.getDuel(id);
        assertEq(uint8(d.status), uint8(DuelEscrow.DuelStatus.Resolved));
    }

    // ─── Admin ──────────────────────────────────────────────────────────

    function test_updateResultSigner() public {
        address newSigner = makeAddr("newSigner");
        vm.prank(owner);
        escrow.updateResultSigner(newSigner);
        assertEq(escrow.resultSigner(), newSigner);
    }

    function test_updateFeeRecipient() public {
        address newRec = makeAddr("newRec");
        vm.prank(owner);
        escrow.updateFeeRecipient(newRec);
        assertEq(escrow.feeRecipient(), newRec);
    }

    function test_nonOwnerCannotUpdateSigner() public {
        vm.prank(player1);
        vm.expectRevert();
        escrow.updateResultSigner(player1);
    }

    // ─── Concurrency ────────────────────────────────────────────────────

    function test_twoEthDuelsRunSimultaneously() public {
        bytes32 id1 = keccak256("concurrent-eth-1");
        bytes32 id2 = keccak256("concurrent-eth-2");
        uint256 stake = 0.1 ether;

        // Duel 1: player1 vs player2
        _createEthDuel(id1, stake);
        _joinEthDuel(id1, stake);

        // Duel 2: player3 vs player2 (player2 just finished duel1)
        // First resolve duel1 to free player2
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig1 = _signResult(id1, player1, player2, player1, address(0), stake, "connect-four", keccak256("c1"), deadline);
        escrow.submitResult(id1, player1, keccak256("c1"), deadline, sig1);

        // Now player1 and player2 are free
        _createEthDuel(id2, stake);
        _joinEthDuel(id2, stake);

        bytes memory sig2 = _signResult(id2, player1, player2, player2, address(0), stake, "connect-four", keccak256("c2"), deadline);
        escrow.submitResult(id2, player2, keccak256("c2"), deadline, sig2);

        // Both resolved independently
        assertEq(uint8(escrow.getDuel(id1).status), uint8(DuelEscrow.DuelStatus.Resolved));
        assertEq(uint8(escrow.getDuel(id2).status), uint8(DuelEscrow.DuelStatus.Resolved));
        assertEq(escrow.getDuel(id1).winner, player1);
        assertEq(escrow.getDuel(id2).winner, player2);
    }

    function test_ethAndUsdcDuelsIndependent() public {
        bytes32 idEth = keccak256("mixed-eth");
        bytes32 idUsdc = keccak256("mixed-usdc");
        uint256 ethStake = 0.5 ether;
        uint256 usdcStake = 500e6;

        // ETH duel: player1 vs player2
        _createEthDuel(idEth, ethStake);
        _joinEthDuel(idEth, ethStake);

        // Resolve ETH duel first (to free players for USDC duel)
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(idEth, player1, player2, player2, address(0), ethStake, "connect-four", keccak256("m1"), deadline);
        escrow.submitResult(idEth, player2, keccak256("m1"), deadline, sig);

        // USDC duel: same players
        _createUsdcDuel(idUsdc, usdcStake);
        _joinUsdcDuel(idUsdc);

        bytes memory sig2 = _signResult(idUsdc, player1, player2, player1, address(usdc), usdcStake, "chess", keccak256("m2"), deadline);
        escrow.submitResult(idUsdc, player1, keccak256("m2"), deadline, sig2);

        assertEq(uint8(escrow.getDuel(idEth).status), uint8(DuelEscrow.DuelStatus.Resolved));
        assertEq(uint8(escrow.getDuel(idUsdc).status), uint8(DuelEscrow.DuelStatus.Resolved));
    }

    function test_resultSignatureForDuelACannnotResolveDuelB() public {
        bytes32 idA = keccak256("cross-A");
        bytes32 idB = keccak256("cross-B");
        uint256 stake = 0.1 ether;

        // Create and join duel A
        _createEthDuel(idA, stake);
        _joinEthDuel(idA, stake);

        // Resolve duel A
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sigA = _signResult(idA, player1, player2, player1, address(0), stake, "connect-four", keccak256("rA"), deadline);
        escrow.submitResult(idA, player1, keccak256("rA"), deadline, sigA);

        // Create and join duel B
        _createEthDuel(idB, stake);
        _joinEthDuel(idB, stake);

        // Try to use sigA (which is for duelId=idA) on duel B => different struct hash => wrong signer recovered
        vm.expectRevert(DuelEscrow.InvalidSignature.selector);
        escrow.submitResult(idB, player1, keccak256("rA"), deadline, sigA);
    }

    // ─── Active Duel Tracking ───────────────────────────────────────────

    function test_cannotCreateTwoDuelsAtOnce() public {
        bytes32 id1 = keccak256("active-1");
        bytes32 id2 = keccak256("active-2");
        uint256 stake = 0.1 ether;

        _createEthDuel(id1, stake);

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.PlayerAlreadyInDuel.selector);
        escrow.createDuel{value: stake}(id2, address(0), address(0), stake, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));
    }

    function test_activeDuelClearedAfterResolve() public {
        bytes32 id = keccak256("active-clear");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        assertEq(escrow.activeDuelOf(player1), id);
        assertEq(escrow.activeDuelOf(player2), id);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("f"), deadline);
        escrow.submitResult(id, player1, keccak256("f"), deadline, sig);

        assertEq(escrow.activeDuelOf(player1), bytes32(0));
        assertEq(escrow.activeDuelOf(player2), bytes32(0));
    }

    // ─── Duplicate DuelId ───────────────────────────────────────────────

    function test_duplicateDuelIdReverts() public {
        bytes32 id = keccak256("dup");
        _createEthDuel(id, 0.1 ether);

        // Cancel to free player1 active slot
        vm.prank(player1);
        escrow.cancelDuel(id);

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.DuelAlreadyExists.selector);
        escrow.createDuel{value: 0.1 ether}(id, address(0), address(0), 0.1 ether, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));
    }

    // ─── Fuzz: Fee Calculation ──────────────────────────────────────────

    function testFuzz_feeCalculation(uint128 _stake) public {
        uint256 stake = uint256(_stake);
        vm.assume(stake > 0 && stake <= 10 ether);

        bytes32 id = keccak256(abi.encode("fuzz", stake));

        vm.prank(player1);
        escrow.createDuel{value: stake}(id, address(0), address(0), stake, "connect-four", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));

        vm.prank(player2);
        escrow.joinDuel{value: stake}(id);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256(abi.encode("fuzz", stake)), deadline);

        uint256 feeRecBefore = feeRecipient.balance;
        uint256 p1Before = player1.balance;
        escrow.submitResult(id, player1, keccak256(abi.encode("fuzz", stake)), deadline, sig);

        uint256 totalPot = stake * 2;
        uint256 expectedFee = (totalPot * 250) / 10000;
        uint256 expectedPayout = totalPot - expectedFee;

        assertEq(feeRecipient.balance - feeRecBefore, expectedFee);
        assertEq(player1.balance - p1Before, expectedPayout);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADDITIONAL SECURITY TESTS
    // ═══════════════════════════════════════════════════════════════════════

    // ─── Constructor Validation ─────────────────────────────────────────

    function test_constructorRevertsZeroFeeRecipient() public {
        vm.expectRevert(DuelEscrow.ZeroAddress.selector);
        new DuelEscrow(address(0), signer, address(usdc));
    }

    function test_constructorRevertsZeroResultSigner() public {
        vm.expectRevert(DuelEscrow.ZeroAddress.selector);
        new DuelEscrow(feeRecipient, address(0), address(usdc));
    }

    function test_constructorRevertsZeroUsdc() public {
        vm.expectRevert(DuelEscrow.ZeroAddress.selector);
        new DuelEscrow(feeRecipient, signer, address(0));
    }

    // ─── Deadline Validation ────────────────────────────────────────────

    function test_resultDeadlineMustExceedJoinDeadline() public {
        bytes32 id = keccak256("deadline-bad");
        uint64 joinDl = uint64(block.timestamp + 2 hours);
        uint64 resultDl = uint64(block.timestamp + 1 hours); // resultDeadline < joinDeadline

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.InvalidDeadline.selector);
        escrow.createDuel{value: 0.1 ether}(id, address(0), address(0), 0.1 ether, "chess", joinDl, resultDl);
    }

    function test_resultDeadlineEqualsJoinDeadlineReverts() public {
        bytes32 id = keccak256("deadline-eq");
        uint64 dl = uint64(block.timestamp + 1 hours);

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.InvalidDeadline.selector);
        escrow.createDuel{value: 0.1 ether}(id, address(0), address(0), 0.1 ether, "chess", dl, dl);
    }

    function test_joinDeadlineInPastReverts() public {
        bytes32 id = keccak256("deadline-past");
        vm.warp(1000);

        vm.prank(player1);
        vm.expectRevert(DuelEscrow.InvalidDeadline.selector);
        escrow.createDuel{value: 0.1 ether}(id, address(0), address(0), 0.1 ether, "chess", uint64(999), uint64(2000));
    }

    // ─── activeDuelOf Cleared: Cancel ───────────────────────────────────

    function test_activeDuelClearedAfterCancel() public {
        bytes32 id = keccak256("active-cancel");
        _createEthDuel(id, 0.1 ether);

        assertEq(escrow.activeDuelOf(player1), id);

        vm.prank(player1);
        escrow.cancelDuel(id);

        assertEq(escrow.activeDuelOf(player1), bytes32(0));
    }

    // ─── activeDuelOf Cleared: Refund Expired ───────────────────────────

    function test_activeDuelClearedAfterRefundExpired() public {
        bytes32 id = keccak256("active-refund-exp");
        _createEthDuel(id, 0.1 ether);

        assertEq(escrow.activeDuelOf(player1), id);

        vm.warp(block.timestamp + 2 hours);
        escrow.refundExpiredDuel(id);

        assertEq(escrow.activeDuelOf(player1), bytes32(0));
    }

    // ─── activeDuelOf Cleared: Refund Unresolved ────────────────────────

    function test_activeDuelClearedAfterRefundUnresolved() public {
        bytes32 id = keccak256("active-refund-unres");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        assertEq(escrow.activeDuelOf(player1), id);
        assertEq(escrow.activeDuelOf(player2), id);

        vm.warp(block.timestamp + 3 hours);
        escrow.refundUnresolvedDuel(id);

        assertEq(escrow.activeDuelOf(player1), bytes32(0));
        assertEq(escrow.activeDuelOf(player2), bytes32(0));
    }

    // ─── activeDuelOf Cleared: Forfeit ──────────────────────────────────

    function test_activeDuelClearedAfterForfeit() public {
        bytes32 id = keccak256("active-forfeit");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        assertEq(escrow.activeDuelOf(player1), id);
        assertEq(escrow.activeDuelOf(player2), id);

        vm.prank(player1);
        escrow.forfeit(id);

        assertEq(escrow.activeDuelOf(player1), bytes32(0));
        assertEq(escrow.activeDuelOf(player2), bytes32(0));
    }

    // ─── Pause: Join also blocked ───────────────────────────────────────

    function test_pauseBlocksJoin() public {
        bytes32 id = keccak256("pause-join");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);

        vm.prank(owner);
        escrow.pause();

        vm.prank(player2);
        vm.expectRevert();
        escrow.joinDuel{value: stake}(id);
    }

    function test_pauseAllowsForfeit() public {
        bytes32 id = keccak256("pause-forfeit");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        vm.prank(owner);
        escrow.pause();

        vm.prank(player1);
        escrow.forfeit(id);

        DuelEscrow.Duel memory d = escrow.getDuel(id);
        assertEq(uint8(d.status), uint8(DuelEscrow.DuelStatus.Resolved));
    }

    function test_pauseAllowsRefundExpired() public {
        bytes32 id = keccak256("pause-refund-exp");
        _createEthDuel(id, 0.1 ether);

        vm.prank(owner);
        escrow.pause();

        vm.warp(block.timestamp + 2 hours);

        uint256 before = player1.balance;
        escrow.refundExpiredDuel(id);
        assertEq(player1.balance - before, 0.1 ether);
    }

    function test_pauseAllowsRefundUnresolved() public {
        bytes32 id = keccak256("pause-refund-unres");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        vm.prank(owner);
        escrow.pause();

        vm.warp(block.timestamp + 3 hours);

        uint256 p1Before = player1.balance;
        uint256 p2Before = player2.balance;
        escrow.refundUnresolvedDuel(id);
        assertEq(player1.balance - p1Before, stake);
        assertEq(player2.balance - p2Before, stake);
    }

    // ─── Signer Rotation ────────────────────────────────────────────────

    function test_oldSignerFailsAfterRotation() public {
        bytes32 id = keccak256("signer-rotate");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        // Sign with current signer (signerPk)
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("rot"), deadline);

        // Rotate signer
        uint256 newSignerPk = 0xBEEF;
        address newSigner = vm.addr(newSignerPk);
        vm.prank(owner);
        escrow.updateResultSigner(newSigner);

        // Old signature must now fail
        vm.expectRevert(DuelEscrow.InvalidSignature.selector);
        escrow.submitResult(id, player1, keccak256("rot"), deadline, sig);
    }

    function test_newSignerWorksAfterRotation() public {
        bytes32 id = keccak256("new-signer-ok");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        // Rotate signer
        uint256 newSignerPk = 0xBEEF;
        address newSigner = vm.addr(newSignerPk);
        vm.prank(owner);
        escrow.updateResultSigner(newSigner);

        // Sign with new signer
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                RESULT_TYPEHASH,
                id,
                player1,
                player2,
                player1,
                address(0),
                stake,
                keccak256(bytes("connect-four")),
                keccak256("new"),
                deadline
            )
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(escrow.domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(newSignerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        escrow.submitResult(id, player1, keccak256("new"), deadline, sig);
        assertEq(uint8(escrow.getDuel(id).status), uint8(DuelEscrow.DuelStatus.Resolved));
    }

    // ─── Wrong Domain (different contract) ──────────────────────────────

    function test_signatureFromDifferentContractFails() public {
        bytes32 id = keccak256("wrong-domain");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        // Deploy a second DuelEscrow instance (different address => different domain separator)
        vm.prank(owner);
        DuelEscrow escrow2 = new DuelEscrow(feeRecipient, signer, address(usdc));

        // Sign using escrow2's domain separator
        bytes32 structHash = keccak256(
            abi.encode(
                RESULT_TYPEHASH,
                id,
                player1,
                player2,
                player1,
                address(0),
                stake,
                keccak256(bytes("connect-four")),
                keccak256("wrong-dom"),
                block.timestamp + 1 hours
            )
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(escrow2.domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Submit to escrow (first instance) — wrong domain separator
        vm.expectRevert(DuelEscrow.InvalidSignature.selector);
        escrow.submitResult(id, player1, keccak256("wrong-dom"), block.timestamp + 1 hours, sig);
    }

    // ─── Signature for Duel A Cannot Resolve Duel B (same participants) ─

    function test_signatureForDuelACannotResolveDuelBSamePlayers() public {
        bytes32 idA = keccak256("sig-cross-a");
        bytes32 idB = keccak256("sig-cross-b");
        uint256 stake = 0.1 ether;

        // Create and resolve duel A
        _createEthDuel(idA, stake);
        _joinEthDuel(idA, stake);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sigA = _signResult(idA, player1, player2, player1, address(0), stake, "connect-four", keccak256("sA"), deadline);
        escrow.submitResult(idA, player1, keccak256("sA"), deadline, sigA);

        // Create duel B (same players, same game, same stake)
        _createEthDuel(idB, stake);
        _joinEthDuel(idB, stake);

        // Attempt to reuse sigA (signed for idA) on idB — must fail
        vm.expectRevert(DuelEscrow.InvalidSignature.selector);
        escrow.submitResult(idB, player1, keccak256("sA"), deadline, sigA);
    }

    // ─── Admin: updateResultSigner to zero reverts ──────────────────────

    function test_updateSignerToZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(DuelEscrow.ZeroAddress.selector);
        escrow.updateResultSigner(address(0));
    }

    function test_updateFeeRecipientToZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(DuelEscrow.ZeroAddress.selector);
        escrow.updateFeeRecipient(address(0));
    }

    // ─── Owner Cannot Withdraw Player Funds ─────────────────────────────

    function test_ownerCannotWithdrawFunds() public {
        bytes32 id = keccak256("no-withdraw");
        uint256 stake = 1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        // Contract holds 2 ether now
        assertEq(address(escrow).balance, 2 ether);

        // Owner has no withdraw function — there's no way to call one
        // Verify contract does not have a selfdestruct/withdraw
        // The only way funds move is via resolve/refund/forfeit/cancel

        // Even if owner tries to call with arbitrary data, it will fail
        vm.prank(owner);
        (bool success,) = address(escrow).call(abi.encodeWithSignature("withdraw()"));
        assertFalse(success);

        vm.prank(owner);
        (success,) = address(escrow).call(abi.encodeWithSignature("withdrawAll()"));
        assertFalse(success);

        vm.prank(owner);
        (success,) = address(escrow).call(abi.encodeWithSignature("emergencyWithdraw()"));
        assertFalse(success);

        // Funds unchanged
        assertEq(address(escrow).balance, 2 ether);
    }

    // ─── Wrong ETH Amount on Join ───────────────────────────────────────

    function test_wrongEthAmountOnJoinReverts() public {
        bytes32 id = keccak256("wrong-join-eth");
        uint256 stake = 0.5 ether;
        _createEthDuel(id, stake);

        vm.prank(player2);
        vm.expectRevert(DuelEscrow.IncorrectEthValue.selector);
        escrow.joinDuel{value: 0.3 ether}(id);
    }

    // ─── ETH Sent for USDC Join ─────────────────────────────────────────

    function test_ethSentForUsdcJoinReverts() public {
        bytes32 id = keccak256("usdc-join-eth");
        uint256 stake = 100e6;
        _createUsdcDuel(id, stake);

        vm.prank(player2);
        vm.expectRevert(DuelEscrow.EthNotAllowed.selector);
        escrow.joinDuel{value: 0.1 ether}(id);
    }

    // ─── Restricted Player2 ─────────────────────────────────────────────

    function test_restrictedPlayer2OnlyAllowedAddress() public {
        bytes32 id = keccak256("restricted-p2");
        uint256 stake = 0.1 ether;

        vm.prank(player1);
        escrow.createDuel{value: stake}(id, player2, address(0), stake, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));

        // player3 cannot join
        vm.prank(player3);
        vm.expectRevert(DuelEscrow.UnauthorizedPlayer.selector);
        escrow.joinDuel{value: stake}(id);

        // player2 can join
        vm.prank(player2);
        escrow.joinDuel{value: stake}(id);
        assertEq(uint8(escrow.getDuel(id).status), uint8(DuelEscrow.DuelStatus.Active));
    }

    // ─── Zero Stake Reverts ─────────────────────────────────────────────

    function test_zeroStakeReverts() public {
        bytes32 id = keccak256("zero-stake");
        vm.prank(player1);
        vm.expectRevert(DuelEscrow.ZeroStake.selector);
        escrow.createDuel(id, address(0), address(0), 0, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));
    }

    // ─── Cannot Forfeit After Resolution ────────────────────────────────

    function test_cannotForfeitAfterResolution() public {
        bytes32 id = keccak256("forfeit-after-resolve");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("g"), deadline);
        escrow.submitResult(id, player1, keccak256("g"), deadline, sig);

        vm.prank(player2);
        vm.expectRevert(DuelEscrow.InvalidStatus.selector);
        escrow.forfeit(id);
    }

    // ─── Cannot Refund Resolved Duel ────────────────────────────────────

    function test_cannotRefundResolvedDuel() public {
        bytes32 id = keccak256("refund-resolved");
        uint256 stake = 0.1 ether;
        _createEthDuel(id, stake);
        _joinEthDuel(id, stake);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player1, address(0), stake, "connect-four", keccak256("h"), deadline);
        escrow.submitResult(id, player1, keccak256("h"), deadline, sig);

        vm.warp(block.timestamp + 3 hours);
        vm.expectRevert(DuelEscrow.InvalidStatus.selector);
        escrow.refundUnresolvedDuel(id);
    }

    // ─── Player Can Create New Duel After Old One Resolves ──────────────

    function test_playerCanCreateAfterPreviousDuelResolves() public {
        bytes32 id1 = keccak256("seq-1");
        bytes32 id2 = keccak256("seq-2");
        uint256 stake = 0.1 ether;

        _createEthDuel(id1, stake);
        _joinEthDuel(id1, stake);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id1, player1, player2, player1, address(0), stake, "connect-four", keccak256("i"), deadline);
        escrow.submitResult(id1, player1, keccak256("i"), deadline, sig);

        // Now player1 should be free to create again
        assertEq(escrow.activeDuelOf(player1), bytes32(0));
        _createEthDuel(id2, stake);
        assertEq(escrow.activeDuelOf(player1), id2);
    }

    // ─── Fuzz: Random Stake + Token ─────────────────────────────────────

    function testFuzz_usdcFeeCalculation(uint64 _stake) public {
        uint256 stake = uint256(_stake);
        vm.assume(stake > 0 && stake <= 5_000e6);

        bytes32 id = keccak256(abi.encode("fuzz-usdc", stake));

        vm.prank(player1);
        escrow.createDuel(id, address(0), address(usdc), stake, "chess", uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours));

        vm.prank(player2);
        escrow.joinDuel(id);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signResult(id, player1, player2, player2, address(usdc), stake, "chess", keccak256(abi.encode("fuzz-usdc", stake)), deadline);

        uint256 feeRecBefore = usdc.balanceOf(feeRecipient);
        uint256 p2Before = usdc.balanceOf(player2);
        escrow.submitResult(id, player2, keccak256(abi.encode("fuzz-usdc", stake)), deadline, sig);

        uint256 totalPot = stake * 2;
        uint256 expectedFee = (totalPot * 250) / 10000;
        uint256 expectedPayout = totalPot - expectedFee;

        assertEq(usdc.balanceOf(feeRecipient) - feeRecBefore, expectedFee);
        assertEq(usdc.balanceOf(player2) - p2Before, expectedPayout);
    }
}
