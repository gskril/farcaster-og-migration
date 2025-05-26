import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'
import { zeroAddress } from 'viem'

const deploy = async () => {
  const migrator = await hre.viem.deployContract('NFTMigrator', [
    '0x0000000000000000000000000000000000000000', // address _endpoint,
    '0x0000000000000000000000000000000000000000', // address _delegate,
    '0x0000000000000000000000000000000000000000', // address _collection,
    0, // uint32 _destEndpointId
  ])

  return { migrator }
}

describe('Tests', function () {
  it('should deploy the contract', async function () {})
})
