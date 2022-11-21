const {ethers} = require("ethers")
const crypto = require("crypto")
const registerContractInfo = require("./deployments/goerli/ETHRegistrarController.json");
const url = process.env.INFURA
const deployResult = require("./deployments/goerli_result.json");
console.log('deployResult=',deployResult)
const ENS_ADDR = deployResult["contracts/ethregistrar/ETHRegistrarController.sol"].address
const RESOLVER_ADDR = deployResult["contracts/resolvers/PublicResolver.sol"].address

const rpcProvider = new ethers.providers.JsonRpcProvider(url)
const testAccount = process.env.OWNER_KEY
const wallet = new ethers.Wallet(testAccount, rpcProvider)
const registerContract = new ethers.Contract(ENS_ADDR, registerContractInfo.abi, wallet)

const buf = crypto.randomBytes(32).toString('hex');
const salt = "0x" + buf;
console.log({salt})

const name = "jason"
let owner = "";
const DAYS = 24 * 60 * 60;

//0xb9924a250ea0bfccffdccd837fb8a9f856412690b8a4cf3f25b5105e8a954e30


const main = async () => {

  owner = await wallet.getAddress();

  const available = await registerContract.available(name);
  console.log(`available `,available);
  if(!available) return;
  await commit();

  setTimeout(async () => {
    await register();
  }, 62000)
}

async function commit() {
 
  console.log('committing')
  const commitment = await registerContract.makeCommitment(
    name,
    owner,
    salt, 
    RESOLVER_ADDR,
    );
  console.log(`committing, commitment: ${commitment}`);
  
  const tx = await registerContract.commit(commitment);
  console.log(`committing, tx: ${tx.hash}`);

  await tx.wait();

  console.log(`committed, commitment: ${commitment}, wait 60s`);
}

async function register() {
  const duration = 365 * DAYS;
  const price = await registerContract.rentPrice(name, duration);
  console.log({ price });
  console.log(`resgistering, price: ${price / 10 ** 18}`);
  const rtx = await registerContract.register(name, owner, duration, salt, RESOLVER_ADDR, {
    // gasLimit: 800000,
    value: price
  });
  await rtx.wait();
  console.log("registered");
}



main()
