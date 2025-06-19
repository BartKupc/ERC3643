const hre = require("hardhat");
const { Token } = require("@tokenyico/trex-sdk");

async function main() {
  await hre.run("compile");
  const [signer] = await hre.ethers.getSigners();

  const config = {
    name: "Smart RWA",
    symbol: "SRWA",
    decimals: 0,
    onchainID: null,
    rules: {
      complianceRules: { useDefault: true },
      holderRules: {
        requiredClaims: [10101010000042, 10101000100006],
        trustedIssuers: {
          "0xD2902271342d077686B4B4Eb18b74DCb59624C9B": {
            trustedTopics: [10101010000042]
          },
          "0x990De116847ea9C5d6ed9605a76DBE3462e2b714": {
            trustedTopics: [10101000100006]
          },
          "0xfc5c8cfbd7dDFAA09e55fe5E3fc8d1563Ae0F006": {
            trustedTopics: [10101000100006]
          }
        }
      }
    }
  };

  const tokenFactory = await Token.createFactory(config);

  tokenFactory.on("fail", ev => console.error("❌ Deployment failed:", ev));
  tokenFactory.on("progress", ev => console.log("🔄 Progress:", ev.type));
  tokenFactory.on("deployed", ev => {
    console.log("✅ Deployed:", ev);
    console.log("🎉 Token address:", ev.deploymentAddress);
  });

  await tokenFactory.makePlan();
  console.log("🗂 Deployment plan:", tokenFactory.plan);

  const token = await tokenFactory.deploy({ signer });
}

main().catch(e => { console.error(e); process.exit(1); });
