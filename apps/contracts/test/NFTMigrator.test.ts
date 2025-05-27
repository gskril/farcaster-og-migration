import { Options } from '@layerzerolabs/lz-v2-utilities'
import { expect } from 'chai'
import hre, { viem } from 'hardhat'
import { pad, parseAbi } from 'viem'
import { PublicClient, WalletClient } from 'viem'
import { deployContract, readContract, writeContract } from 'viem/actions'
import { parseEventLogs } from 'viem/utils'

import FarcasterOGArtifact from '../artifacts/src/FarcasterOG.sol/FarcasterOG.json'
import NFTMigratorArtifact from '../artifacts/src/NFTMigrator.sol/NFTMigrator.json'
import EndpointV2MockArtifact from '../artifacts/src/mocks/EndpointV2Mock.sol/EndpointV2Mock.json'
import TestERC721Artifact from '../artifacts/src/mocks/TestERC721.sol/TestERC721.json'

describe('NFTMigrator', function () {
  // Constant representing a mock Endpoint ID for testing purposes
  const eidA = 1
  const eidB = 2

  let mintedTokenId: number | null = null
  let sourceCollection: { address: `0x${string}` | null }
  let destinationCollection: { address: `0x${string}` | null }
  let migrator: { address: `0x${string}` | null }
  let mockEndpointOnChainA: `0x${string}` | null
  let mockEndpointOnChainB: `0x${string}` | null
  let publicClient: PublicClient
  let owner: WalletClient
  let delegate: WalletClient
  let user: WalletClient

  const destEndpointId = 30101 // Arbitrum endpoint ID for example

  before(async function () {
    ;[owner, delegate, user] = await hre.viem.getWalletClients()
    publicClient = await hre.viem.getPublicClient()
  })

  beforeEach(async function () {
    // Deploy a mock LayerZero endpoint
    console.log('Deploying mock endpoint on chain A')
    mockEndpointOnChainA = await deployContract(owner, {
      abi: EndpointV2MockArtifact.abi,
      bytecode: EndpointV2MockArtifact.bytecode as `0x${string}`,
      args: [eidA],
      account: owner.account || null,
      chain: null,
    })
    // Get the contract address from the mockEndpoint deploy hash (transaction)
    // If the viem deployContract didn't return the address, fetch it from the receipt
    const mockEndpointReceipt = await publicClient.getTransactionReceipt({
      hash: mockEndpointOnChainA,
    })
    mockEndpointOnChainA = mockEndpointReceipt.contractAddress || null

    console.log({
      mockEndpoint: mockEndpointOnChainA,
      delegate: delegate.account?.address,
      user: user.account?.address,
      owner: owner.account?.address,
    })

    console.log('Deploying mock endpoint on chain B')
    mockEndpointOnChainB = await deployContract(owner, {
      abi: EndpointV2MockArtifact.abi,
      bytecode: EndpointV2MockArtifact.bytecode as `0x${string}`,
      args: [eidB],
      account: owner.account || null,
      chain: null,
    })

    const mockEndpointOnChainBReceipt =
      await publicClient.getTransactionReceipt({
        hash: mockEndpointOnChainB,
      })
    mockEndpointOnChainB = mockEndpointOnChainBReceipt.contractAddress || null

    console.log({
      mockEndpointOnChainB: mockEndpointOnChainB,
    })

    if (!mockEndpointOnChainA || !mockEndpointOnChainB) {
      throw new Error('Mock endpoint addresses are null')
    }

    // Deploy the source ERC721 collection (TestERC721)
    const sourceCollectionHash = await deployContract(owner, {
      abi: TestERC721Artifact.abi,
      bytecode: TestERC721Artifact.bytecode as `0x${string}`,
      args: ['Test NFT Collection', 'TEST'],
      account: owner.account || null,
      chain: null,
    })
    const sourceCollectionReceipt = await publicClient.getTransactionReceipt({
      hash: sourceCollectionHash,
    })
    const sourceCollectionAddress =
      sourceCollectionReceipt.contractAddress || null
    sourceCollection = { address: sourceCollectionAddress }

    // Deploy the destination ERC721 collection (TestERC721)
    const destinationCollectionHash = await deployContract(owner, {
      abi: FarcasterOGArtifact.abi,
      bytecode: FarcasterOGArtifact.bytecode as `0x${string}`,
      args: [mockEndpointOnChainA, delegate.account?.address],
      account: owner.account || null,
      chain: null,
    })
    const destinationCollectionReceipt =
      await publicClient.getTransactionReceipt({
        hash: destinationCollectionHash,
      })
    const destinationCollectionAddress =
      destinationCollectionReceipt.contractAddress || null
    destinationCollection = { address: destinationCollectionAddress }

    console.log({
      mockEndpointOnChainA: mockEndpointOnChainA,
      mockEndpointOnChainB: mockEndpointOnChainB,
      delegate: delegate.account?.address,
      user: user.account?.address,
      owner: owner.account?.address,
      sourceCollection: sourceCollectionAddress,
      destinationCollection: destinationCollectionAddress,
    })

    // Deploy the NFTMigrator contract
    const migratorHash = await deployContract(owner, {
      abi: NFTMigratorArtifact.abi,
      bytecode: NFTMigratorArtifact.bytecode as `0x${string}`,
      args: [
        mockEndpointOnChainA,
        delegate.account?.address,
        sourceCollectionAddress,
        destEndpointId,
      ],
      account: owner.account || null,
      chain: null,
    })

    // Get the migrator contract address from the transaction receipt
    const migratorReceipt = await publicClient.getTransactionReceipt({
      hash: migratorHash,
    })
    const migratorAddress = migratorReceipt.contractAddress || null
    migrator = { address: migratorAddress }

    if (!sourceCollectionAddress) {
      throw new Error('Source collection address is null')
    }

    await writeContract(delegate, {
      account: delegate.account?.address || null,
      address: mockEndpointOnChainA,
      abi: EndpointV2MockArtifact.abi,
      functionName: 'setDestLzEndpoint',
      args: [migratorAddress, mockEndpointOnChainB],
      chain: null,
    })

    if (!migratorAddress) {
      throw new Error('Migrator address is null')
    }

    await writeContract(delegate, {
      account: delegate.account?.address || null,
      address: migratorAddress,
      abi: NFTMigratorArtifact.abi,
      functionName: 'setPeer',
      args: [
        eidB,
        pad(destinationCollectionAddress as `0x${string}`, { size: 32 }),
      ],
      chain: null,
    })

    // Mint an NFT to the user (owner mints since TestERC721 requires onlyOwner)
    await writeContract(owner, {
      account: owner.account || null,
      address: sourceCollectionAddress,
      abi: TestERC721Artifact.abi,
      functionName: 'mint',
      args: [user.account?.address || '', 1],
      chain: null,
    })

    // Query the NFT id that was just minted to the user
    // We'll fetch all tokens owned by the user and get the first one (since only one was minted)
    // TestERC721 does not have an on-chain enumeration, so we assume tokenId 1 was minted,
    // but to query, let's check which tokenId the user owns by checking ownerOf for likely tokenIds.
    for (let tokenId = 1; tokenId <= 10; tokenId++) {
      try {
        const ownerOf = (await readContract(owner, {
          address: sourceCollectionAddress,
          abi: TestERC721Artifact.abi,
          functionName: 'ownerOf',
          args: [tokenId],
        })) as `0x${string}`
        if (
          ownerOf &&
          ownerOf.toLowerCase() === (user.account?.address || '').toLowerCase()
        ) {
          mintedTokenId = tokenId
          break
        }
      } catch (err) {
        // ownerOf will revert if token does not exist, so just continue
        continue
      }
    }
    if (mintedTokenId === null) {
      throw new Error('Could not find minted tokenId for user')
    }
    console.log({ mintedTokenId })
  })

  it('should burn the NFT and emit Burned event on migrate', async function () {
    // Verify user owns the NFT
    if (!sourceCollection.address) {
      throw new Error('Source collection address is null')
    }

    const initialOwner = (await readContract(owner, {
      address: sourceCollection.address || null,
      abi: TestERC721Artifact.abi,
      functionName: 'ownerOf',
      args: [1],
    })) as `0x${string}`
    expect(initialOwner.toLowerCase()).to.equal(
      user.account?.address.toLowerCase()
    )

    // User approves the migrator to burn their NFT
    await writeContract(user, {
      account: user.account || null,
      address: sourceCollection.address || '',
      abi: TestERC721Artifact.abi,
      functionName: 'approve',
      args: [migrator.address, 1],
      chain: null,
    })

    // Get quote for migration
    if (!migrator.address) {
      throw new Error('Migrator address is null')
    }

    const quote = (await readContract(owner, {
      address: migrator.address,
      abi: NFTMigratorArtifact.abi,
      functionName: 'quote',
      args: [mintedTokenId, user.account?.address || ''],
    })) as { nativeFee: bigint; lzTokenFee: bigint }
    console.log({ quote })

    // Call migrate with the quoted fee
    const tx = await writeContract(user, {
      account: user.account || null,
      address: migrator.address || '',
      abi: NFTMigratorArtifact.abi,
      functionName: 'migrate',
      args: [1, user.account?.address || ''],
      chain: null,
      value: quote.nativeFee || 0n,
    })

    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: tx,
    })

    // Check that the NFT is burned (ownerOf should revert)
    await expect(
      readContract(owner, {
        address: sourceCollection.address,
        abi: TestERC721Artifact.abi,
        functionName: 'ownerOf',
        args: [1],
      })
    ).to.be.rejectedWith('ERC721: invalid token ID')

    // Parse events from the receipt
    const logs = parseEventLogs({
      abi: NFTMigratorArtifact.abi,
      logs: receipt.logs,
    })

    // Check that the Burned event was emitted
    const burnedEvent = logs.find((log: any) => log.eventName === 'Burned')
    expect(burnedEvent).to.not.be.undefined
    expect((burnedEvent as any)?.args.tokenId).to.equal(1n)
    expect((burnedEvent as any)?.args.owner.toLowerCase()).to.equal(
      user.account?.address.toLowerCase()
    )
  })

  it('should revert if user does not own the NFT', async function () {
    if (!migrator.address) {
      throw new Error('Migrator address is null')
    }

    // Another user tries to migrate a token they don't own
    await expect(
      writeContract(delegate, {
        account: delegate.account || null,
        address: migrator.address || '',
        abi: NFTMigratorArtifact.abi,
        functionName: 'migrate',
        args: [1, delegate.account?.address || ''],
        chain: null,
      })
    ).to.be.rejected
  })

  it('should revert if NFT does not exist', async function () {
    if (!migrator.address) {
      throw new Error('Migrator address is null')
    }

    // Try to migrate a non-existent token
    await expect(
      writeContract(user, {
        account: user.account || null,
        address: migrator.address || '',
        abi: NFTMigratorArtifact.abi,
        functionName: 'migrate',
        args: [999, user.account?.address || ''],
        chain: null,
      })
    ).to.be.rejected
  })
})
