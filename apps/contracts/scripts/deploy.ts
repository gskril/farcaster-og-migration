import hre from 'hardhat'
import { encodeAbiParameters } from 'viem/utils'

import { create2Deploy } from './lib/create2'
import { getInitCode } from './lib/initcode'

async function main() {
  const contractName = 'Contract'

  const constructorArguments = [
    'Contract', // _name
  ] as const

  const encodedArgs = encodeAbiParameters(
    [{ type: 'string' }],
    constructorArguments
  )

  const { initCode, initCodeHash } = await getInitCode(
    contractName,
    encodedArgs
  )

  const { address } = await create2Deploy({
    initCode,
    salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  })

  console.log(`Deployed ${contractName} to ${address}`)

  try {
    // Wait 30 seconds for block explorers to index the deployment
    await new Promise((resolve) => setTimeout(resolve, 30_000))
    await hre.run('verify:verify', { address, constructorArguments })
  } catch (error) {
    console.error(error)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
