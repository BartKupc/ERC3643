import '@xyrusworx/hardhat-solidity-json';
import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-coverage';
import '@nomiclabs/hardhat-solhint';
import '@primitivefi/hardhat-dodoc';
import * as dotenv from 'dotenv';

// Extend HardhatUserConfig to include dodoc
declare module 'hardhat/types/config' {
  interface HardhatUserConfig {
    dodoc?: {
      include?: string[];
      exclude?: string[];
      runOnCompile?: boolean;
      debugMode?: boolean;
      templatePath?: string;
      outputDir?: string;
      keepFileStructure?: boolean;
      freshOutput?: boolean;
    };
  }
}

// Load environment variables
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  gasReporter: {
    enabled: true,
  },
  dodoc: {
    runOnCompile: false,
    debugMode: true,
    outputDir: "./docgen",
    freshOutput: true,
  },
  networks: {
    localhost: {
      url: process.env.RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
