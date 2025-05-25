// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface BurnableERC721 is IERC721 {
    function burn(uint256 tokenId) external;
}

interface AcrossV3SpokePool {
    function depositV3(
        address depositor,
        address recipient,
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 destinationChainId,
        address exclusiveRelayer,
        uint32 quoteTimestamp,
        uint32 fillDeadline,
        uint32 exclusivityDeadline,
        bytes calldata message
    ) external;
}

contract NFTMigrator {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                               PARAMETERS
    //////////////////////////////////////////////////////////////*/

    BurnableERC721 public immutable originCollection;
    AcrossV3SpokePool public immutable spokePool;
    uint256 public immutable destinationChainId;
    address public immutable destinationCollection;
    address public immutable weth;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _originCollection,
        address _spokePool,
        uint256 _destinationChainId,
        address _destinationCollection,
        address _weth
    ) {
        originCollection = BurnableERC721(_originCollection);
        spokePool = AcrossV3SpokePool(_spokePool);
        destinationChainId = _destinationChainId;
        destinationCollection = _destinationCollection;
        weth = _weth;
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    // TODO: figure out what happens in worst case scenario when `msg.value` isn't enough to cover the Across fee
    function migrate(uint256 tokenId, address recipient) external payable {
        // This will revert if the sender does not own the NFT, so we don't need additional checks
        originCollection.burn(tokenId);

        // Initiate a cross-chain intent to mint an equivalent NFT on Base
        spokePool.depositV3{value: msg.value}(
            msg.sender, // depositor
            destinationCollection, // recipient
            weth, // inputToken (user pays Across fee in ETH which will be automatically wrapped)
            address(0), // outputToken (0 means its the equivalent of `inputToken` on the destination chain)
            msg.value, // inputAmount (this is the Across fee)
            0, // outputAmount
            destinationChainId, // destinationChainId
            address(0), // exclusiveRelayer (we want any relayer to be able to fill the intent)
            block.timestamp, // quoteTimestamp
            block.timestamp + 3600, // fillDeadline (intent is valid for 1 hour)
            0, // exclusivityDeadline (irrelevant because we've disabled relayer exclusivity)
            abi.encode(tokenId, recipient) // message (decoded on the destination chain to mint the NFT)
        );
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                           REQUIRED OVERRIDES
    //////////////////////////////////////////////////////////////*/
}
