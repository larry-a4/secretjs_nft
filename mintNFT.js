const {
    EnigmaUtils, Secp256k1Pen, SigningCosmWasmClient, pubkeyToAddress, encodeSecp256k1Pubkey, unmarshalTx
  } = require("secretjs");
const { Slip10RawIndex } = require("@iov/crypto");
const { fromUtf8 } = require("@iov/encoding");
  
  const fs = require("fs");
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


    const device_IMEI = process.env.IMEI
    // 1. Mint my device NFT
    handleMsg = {
        mint_nft: 
        {
            token_id: device_IMEI,
            owner: accAddress
        }
    };
    console.log('Minting NFT for the device');
    response = await client.execute(contractAddress, handleMsg);
    console.log('Mint response: ', response)

    const phoneNumber = process.env.PHONE;
    // 2. Set public metadata for my device
    handleMsg = {
        set_public_metadata: 
        {
            token_id: device_IMEI,
            metadata: {
                phone: phoneNumber
            }
        }
    };
    console.log('Setting metadata for the device');
    response = await client.execute(contractAddress, handleMsg);
    console.log('SetPublicMetadata response: ', response)
    
  };
  
  main();
  