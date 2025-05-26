// SPDX-License-Identifier: MIT
// https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/start
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {OApp, MessagingFee, Origin} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {MessagingReceipt} from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

// This is the interface for the Farcaster OG collection
interface BurnableERC721 is IERC721 {
    function burn(uint256 tokenId) external;
}

contract NFTMigrator is OApp {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    BurnableERC721 public immutable collection;
    uint32 public immutable destEndpointId;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Burned(uint256 tokenId, address owner);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _endpoint,
        address _delegate,
        address _collection,
        uint32 _destEndpointId
    ) OApp(_endpoint, _delegate) Ownable(_delegate) {
        collection = BurnableERC721(_collection);
        destEndpointId = _destEndpointId;
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev The user will need to approve this contract to transfer their NFT before this method can be called.
    /// TODO: Figure out what happens in a worse case scenario where the _lzSend doesn't get executed.
    function migrate(
        uint256 tokenId,
        address recipient
    ) external payable returns (MessagingReceipt memory receipt) {
        bytes memory data = abi.encode(tokenId, recipient);
        MessagingFee memory fee = quote(tokenId, recipient);

        // This will revert if the sender does not own the NFT, so we don't need additional checks
        collection.burn(tokenId);

        receipt = _lzSend(destEndpointId, data, "", fee, payable(msg.sender));
        emit Burned(tokenId, msg.sender);
        return receipt;
    }

    /// @notice Quotes the fee to pay for the full omnichain transaction in ETH.
    function quote(
        uint256 tokenId,
        address recipient
    ) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(tokenId, recipient);
        return _quote(destEndpointId, payload, "", false);
    }

    /*//////////////////////////////////////////////////////////////
                               OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /// @dev `OApp` requires this override, but we don't expect to receive any messages so will keep it empty
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata payload,
        address,
        bytes calldata
    ) internal override {}
}
