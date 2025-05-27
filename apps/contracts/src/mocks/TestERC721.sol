// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestERC721
 * @dev A simple ERC721 contract with minting and burning capabilities for testing purposes
 */
contract TestERC721 is ERC721, ERC721Burnable, Ownable {
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {}

    /**
     * @dev Mint a new token to the specified address
     * @param to The address that will receive the minted token
     * @param tokenId The token ID to mint
     */
    function mint(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
    }

    /**
     * @dev Mint multiple tokens to the specified address
     * @param to The address that will receive the minted tokens
     * @param tokenIds Array of token IDs to mint
     */
    function mintBatch(address to, uint256[] calldata tokenIds) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _safeMint(to, tokenIds[i]);
        }
    }
} 