const { ethers } = require("hardhat");
const namehash = require('eth-ens-namehash')
const { keccak256 } = require('js-sha3');
const fs = require('fs');
const { domainConfig } = require('../constants/index');
const {readJsonSync, DeployUtil} = require('../utils/misc')

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

////////////////////////////////////////////////////////////////////////////

let cacheJson = {}
let deployResult = {}
let deployUtilInstance = {};

const ENSRegistry_SourceName = 'contracts/registry/ENSRegistry.sol'
const ReverseRegistrar_SourceName = 'contracts/registry/ReverseRegistrar.sol'
const PublicResolver_SourceName = 'contracts/resolvers/PublicResolver.sol'
const BaseRegistrarImplementation_SourceName = 'contracts/ethregistrar/BaseRegistrarImplementation.sol'
const Root_SourceName = 'contracts/root/Root.sol'
let ensRegistryResult = {}
let reverseRegistrarResult = {}
let publicResolverResult = {}
let rootResult = {}


const initialize = (network) => {
    deployUtilInstance = new DeployUtil(cacheJson, deployResult, network,process.env.FORCE === 'true' )

    cacheJson = readJsonSync('cache/solidity-files-cache.json')
    deployResult = readJsonSync(`deployments/${network.name}_result.json`)
    ensRegistryResult = deployResult[ENSRegistry_SourceName] || {}
    reverseRegistrarResult = deployResult[ReverseRegistrar_SourceName] || {}
    publicResolverResult = deployResult[PublicResolver_SourceName] || {}
    rootResult = deployResult[Root_SourceName] || {}
}

module.exports = async ({ getNamedAccounts, deployments, network }) => {

    try {


        console.log('deployer network=', network.name);
        initialize(network);



        const { deploy } = deployments;
        const { deployer, owner } = await getNamedAccounts();

        // console.log(`deployer=${deployer}, owner=${owner}`)
        const ensRegistryContract = await ethers.getContractAt('ENSRegistry', deployResult[ENSRegistry_SourceName].address);


        console.log('\n【部署根合约】 STEP [1] ---> rootAddress = deploy Root(ensAddress) & ensAddress.setOwner(ZERO_HASH, rootAddress) && rootAddress.setSubOwner(reserve.add, reverseRegisterAddress) & rootAddress.setSubOwner(ethw, baseRegisterAddress)')
        if (!deployUtilInstance.check(Root_SourceName).address) {
            const rootArgs = [ensRegistryResult.address];
            rootResult = await deploy('Root', {
                from: deployer,
                args: rootArgs,
                log: true,
            });
            console.log('rootResult.address=', rootResult.address)

            deployResult[Root_SourceName] = {
                contentHash: deployUtilInstance.check(Root_SourceName).contentHash,
                address: rootResult.address,
                args: rootArgs
            }
            console.log(`Setting final owner of root node on registry`);

            const setOwnerTx = await ensRegistryContract.setOwner(ZERO_HASH, rootResult.address, { from: deployer });
            console.log(`【设置根域名owner到根合约】Setting final owner of root node on registry (tx:${setOwnerTx.hash})...`);

            await setOwnerTx.wait();

            const rootContract = await ethers.getContractAt('Root', deployResult[Root_SourceName].address);
            let temp = await rootContract.controllers(owner)
            console.log('controller=', temp)
            if (!await rootContract.controllers(owner)) {
                setControllerTx = await rootContract.connect(await ethers.getSigner(owner)).setController(owner, true);
                console.log(`Setting final owner as controller on root contract (tx: ${setControllerTx.hash})...`);
                await setControllerTx.wait();
            }

            console.log('\n【设置.eth一级域名的owner到正向注册器】 STEP [2] ---> root.setSubnodeOwner(baseNodeDomain) & registrar.setResolver(publicResolver)')
            const registrarAddress = deployResult[BaseRegistrarImplementation_SourceName].address;
            const baseRegistrarImplementationContract =
                await ethers.getContractAt('BaseRegistrarImplementation', registrarAddress);
            const setSubnodeOwnerTx = await rootContract
                .connect(await ethers.getSigner(owner))
                .setSubnodeOwner('0x' + keccak256(domainConfig.baseNodeDomain), baseRegistrarImplementationContract.address)
            console.log(
                `Domain: ${domainConfig.baseNodeDomain} - Setting owner of eth node to registrar on root (tx: ${setSubnodeOwnerTx.hash})...`,
            )
            await setSubnodeOwnerTx.wait()

            const tx2 = await baseRegistrarImplementationContract.setResolver(publicResolverResult.address, { from: deployer })
            console.log(`Domain: ${domainConfig.baseNodeDomain} - Set publicResolver to registrar (tx: ${tx2.hash})...`)
            await tx2.wait()

            console.log(`Domain: ${domainConfig.baseNodeDomain} - baseRegistrarImplementationContract.setResolver done`)

            console.log('\n[root] STEP [3] ---> setup reverse resolver')

            const setSubnodeOwnerTx2 = await rootContract.connect(await ethers.getSigner(owner)).setSubnodeOwner('0x' + keccak256('reverse'), owner)
            console.log(`【设置.reverse一级域名的owner到根合约】Setting owner of .reverse to owner on root (tx: ${setSubnodeOwnerTx2.hash})...`)
            await setSubnodeOwnerTx2.wait()



        }

        //@todo
        const setSubnodeOwnerTx3 = await ensRegistryContract.connect(await ethers.getSigner(owner)).setSubnodeOwner(namehash.hash('reverse'), '0x' + keccak256('addr'), reverseRegistrarResult.address)
        console.log(
            `【设置.addr.reverse二级域名的owner到反向注册器合约】Setting owner of .addr.reverse to ReverseRegistrar on ensRegistryContract (tx: ${setSubnodeOwnerTx3.hash})...`,
        )
        await setSubnodeOwnerTx3.wait()


        // deployResult

        // console.log('deployResult=', JSON.stringify(deployResult, null, 2))
        fs.writeFileSync(`deployments/${network.name}_result.json`, JSON.stringify(deployResult, null, 2));
    } catch (e) {
        console.log('deploy fail, error=', e)
    }
    return true;

};

module.exports.tags = ['root'];
module.exports.id = "root";
module.exports.dependencies = ['core', 'base'];
