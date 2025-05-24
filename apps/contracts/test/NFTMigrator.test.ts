import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'

const deploy = async () => {
  const migrator = await hre.viem.deployContract('NFTMigrator', [
    'NFTMigrator', // _name
  ])

  return { migrator }
}

describe('Tests', function () {
  it('should return the contract name', async function () {
    const { migrator } = await loadFixture(deploy)

    const contractName = await migrator.read.name()
    expect(contractName).to.equal('NFTMigrator')
  })
})
