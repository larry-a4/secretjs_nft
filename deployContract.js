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
    
    // 1. Upload the wasm of a simple contract
    const wasm = fs.readFileSync("contract.wasm");
    console.log('Uploading contract')
    const uploadReceipt = await client.upload(wasm, {});
    const codeId = uploadReceipt.codeId;
  
    // 2. Create an instance of the token contract, minting some tokens to our wallet
    const initMsg = {
        "name":"nft",
        "symbol":"NFT",
        "entropy": Buffer.from("Something really random").toString('base64'),
        "admin": accAddress
    }
    const contract = await client.instantiate(codeId, initMsg, "NFT Token" + Math.ceil(Math.random()*10000));
    console.log('contract: ', contract);
    const contractAddress = contract.contractAddress;
    console.log('contract address: ', contractAddress);

    // 3. Create viewing key for queries
    const entropy = "Another really random thing";
    let handleMsg = { create_viewing_key: {entropy: entropy} };
    console.log('Creating viewing key');
    response = await client.execute(contractAddress, handleMsg);
    console.log('response: ', response);

    const apiKey = JSON.parse(fromUtf8(response.data)).viewing_key.key;
    console.log("apiKey: ", apiKey);

  };

main()