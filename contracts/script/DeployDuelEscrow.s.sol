// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {DuelEscrow} from "../src/DuelEscrow.sol";

/// @title DeployDuelEscrow
/// @notice Deploys DuelEscrow to Base mainnet.
/// Required env vars:
///   PRIVATE_KEY        - deployer private key
///   RESULT_SIGNER      - address of the backend result signer
///   BASE_RPC_URL       - Base mainnet RPC
contract DeployDuelEscrow is Script {
    // Base mainnet USDC
    address constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    // Platform fee recipient
    address constant FEE_RECIPIENT = 0x376B52059A8262dC67cC5B08E8F9E57676992714;

    function run() external {
        address resultSigner = vm.envAddress("RESULT_SIGNER");
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPk);

        DuelEscrow escrow = new DuelEscrow(FEE_RECIPIENT, resultSigner, BASE_USDC);

        console2.log("DuelEscrow deployed at:", address(escrow));
        console2.log("Fee recipient:", FEE_RECIPIENT);
        console2.log("Result signer:", resultSigner);
        console2.log("Base USDC:", BASE_USDC);

        vm.stopBroadcast();
    }
}
