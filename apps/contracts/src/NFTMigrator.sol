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

    BurnableERC721 public immutable collection;
    AcrossV3SpokePool public immutable spokePool;
    uint256 public immutable destinationChainId;

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
        address _collection,
        address _spokePool,
        uint256 _destinationChainId
    ) {
        collection = BurnableERC721(_collection);
        spokePool = AcrossV3SpokePool(_spokePool);
        destinationChainId = _destinationChainId;
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function migrate(uint256 tokenId, address recipient) external {
        // This will revert if the sender does not own the NFT, so we don't need additional checks.
        collection.burn(tokenId);

        // Initiate a cross-chain intent to mint an equivalent NFT on Base.
        spokePool.depositV3(
            msg.sender, // depositor
            recipient, // recipient
            address(0), // inputToken
            address(0), // outputToken
            0, // inputAmount
            0, // outputAmount
            destinationChainId, // destinationChainId
            address(0), // exclusiveRelayer (TODO: fix)
            block.timestamp, // quoteTimestamp
            block.timestamp + 3600, // fillDeadline
            block.timestamp + 3600, // exclusivityDeadline
            abi.encode(tokenId, recipient) // message
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
