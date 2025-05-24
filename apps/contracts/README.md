# Contracts

There are two contracts in this project:

- `NFTMigrator.sol`: Burns NFTs on Zora and initiates a crosschain intent to mint an equivalent NFT on Base.
- `FarcasterOG.sol`: New Farcaster OG NFT collection on Base.

Zora collection: [`0xe03ef4b9db1a47464de84fb476f9baf493b3e886`](https://explorer.zora.energy/address/0xe03ef4b9db1a47464de84fb476f9baf493b3e886)

Base collection: `TODO`

## Local Development

From the parent monorepo directory, install dependencies.

```bash
pnpm install
```

Navigate to the contracts directory and create a `.env` file. You don't have to change any of the values for testing purposes.

```bash
cd apps/contracts
cp .env.example .env
```

Compile contracts and run the tests.

```bash
pnpm test
```
