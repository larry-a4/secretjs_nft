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
  
    // Use key created in tutorial #2
    const mnemonic = process.env.MNEMONIC;
  
    // A pen is the most basic tool you can think of for signing.
    // This wraps a single keypair and allows for signing.
    const signingPen = await Secp256k1Pen.fromMnemonic(mnemonic);
  
    // Get the public key
    const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);
  
    // get the wallet address
    const accAddress = pubkeyToAddress(pubkey, 'secret');
  
    const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();
    
    const client = new SigningCosmWasmClient(
        httpUrl,
        accAddress,
        (signBytes) => signingPen.sign(signBytes),
        txEncryptionSeed, customFees
    );
    console.log(`Wallet address=${accAddress}`)
    
    // Upload the wasm of a simple contract
    const wasm = fs.readFileSync("contract.wasm");
    console.log('Uploading contract')
    const uploadReceipt = await client.upload(wasm, {});
  
    // Get the code ID from the receipt
    const codeId = uploadReceipt.codeId;
  
    // Create an instance of the token contract, minting some tokens to our wallet
    const initMsg = {
        "name":"nft",
        "symbol":"NFT",
        "entropy": Buffer.from("Something really random").toString('base64'),
        "admin": accAddress
    }
    const contract = await client.instantiate(codeId, initMsg, "NFT Token" + Math.ceil(Math.random()*10000));
    console.log('contract: ', contract);
    
    const contractAddress = contract.contractAddress;
  
    // Entropy: Secure implementation is left to the client, but it is recommended to use base-64 encoded random bytes and not predictable inputs.
    const entropy = "Another really random thing";


    let handleMsg = { create_viewing_key: {entropy: entropy} };
    console.log('Creating viewing key');
    response = await client.execute(contractAddress, handleMsg);
    console.log('response: ', response);

    // Convert the UTF8 bytes to String, before parsing the JSON for the api key.
    const apiKey = JSON.parse(fromUtf8(response.data)).viewing_key.key;

    // Query contract info
    const contractQuery = { 
        contract_info: {}
    };
    let contractInfo = await client.queryContractSmart(contractAddress, contractQuery);

    console.log('My NFT contract info: ', contractInfo);

    const device_IMEI = process.env.IMEI
    // mint my device NFT
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

    // Query all my tokens
    const tokensQuery = { 
        all_tokens: {
            viewer: {
                address: accAddress,
                viewing_key: apiKey
            }
        }
    };
    let allTokens = await client.queryContractSmart(contractAddress, tokensQuery);

    console.log('All My NFT tokens: ', allTokens);
    
    const phoneNumber = process.env.PHONE;
    // set public metadata for my device
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

    // Query my token info
    const nftInfoQuery = { 
        nft_info: {
            token_id: process.env.IMEI
        }
    };
    let nftInfo = await client.queryContractSmart(contractAddress, nftInfoQuery);

    console.log('My NFT token info: ', nftInfo);
    
  };

  // Util to generate another address to send to
  async function getAddress(mnemonic, index) {
    const signingPen = await Secp256k1Pen.fromMnemonic(mnemonic, [Slip10RawIndex.normal(index)]);
    const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);
    return pubkeyToAddress(pubkey, 'secret');
  }
  
  main();
  