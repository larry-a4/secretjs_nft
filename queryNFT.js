const {
    EnigmaUtils, Secp256k1Pen, SigningCosmWasmClient, pubkeyToAddress, encodeSecp256k1Pubkey, unmarshalTx
  } = require("secretjs");
const { Slip10RawIndex } = require("@iov/crypto");
const { fromUtf8 } = require("@iov/encoding");
  
  const fs = require("fs");
  
  // Load environment variables
  require('dotenv').config();
  
  const customFees = {
    upload: {
        amount: [{ amount: "3000000", denom: "uscrt" }],
        gas: "3000000",
    },
    init: {
        amount: [{ amount: "500000", denom: "uscrt" }],
        gas: "500000",
    },
    exec: {
        amount: [{ amount: "500000", denom: "uscrt" }],
        gas: "500000",
    },
    send: {
        amount: [{ amount: "80000", denom: "uscrt" }],
        gas: "80000",
    },
  }
  
  const main = async () => {
    const httpUrl = process.env.SECRET_REST_URL;
    const mnemonic = process.env.MNEMONIC;
    const contractAddress = process.env.CONTRACTADDRESS;
    const viewKey = process.env.VIEW_KEY;

    const signingPen = await Secp256k1Pen.fromMnemonic(mnemonic);
    const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);
    const accAddress = pubkeyToAddress(pubkey, 'secret');
  
    const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();

    const client = new SigningCosmWasmClient(
        httpUrl,
        accAddress,
        (signBytes) => signingPen.sign(signBytes),
        txEncryptionSeed, customFees
    );
    console.log(`Wallet address=${accAddress}`)
  
    // 1. Query contract info
    const contractQuery = { 
        contract_info: {}
    };
    let contractInfo = await client.queryContractSmart(contractAddress, contractQuery);
    console.log('My NFT contract info: ', contractInfo);

    // 2. Query all my tokens
    const tokensQuery = { 
        all_tokens: {
            viewer: {
                address: accAddress,
                viewing_key: viewKey
            }
        }
    };
    let allTokens = await client.queryContractSmart(contractAddress, tokensQuery);
    console.log('All My NFT tokens: ', allTokens);

    // 3. Query specific token info
    const nftInfoQuery = { 
        nft_info: {
            token_id: process.env.IMEI
        }
    };
    let nftInfo = await client.queryContractSmart(contractAddress, nftInfoQuery);
    console.log('My NFT token info: ', nftInfo);
    
  };

  main();
  