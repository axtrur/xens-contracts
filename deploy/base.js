const { ethers } = require("hardhat");
const namehash = require('eth-ens-namehash')
const fs = require('fs');
const {readJsonSync, DeployUtil} = require('../utils/misc')
const { domainConfig } = require('../constants/index');

let cacheJson = {}
let deployResult = {}
let deployUtilInstance = null;


const ENSRegistry_SourceName = 'contracts/registry/ENSRegistry.sol'
const BaseRegistrarImplementation_SourceName = 'contracts/ethregistrar/BaseRegistrarImplementation.sol'
const TokenURIBuilder_SourceName = 'contracts/ethregistrar/TokenURIBuilder.sol'

let ensRegistryResult = {}

const initialize = (network) => {
    deployUtilInstance = new DeployUtil(cacheJson, deployResult, network,process.env.FORCE === 'true' )
    cacheJson = readJsonSync('cache/solidity-files-cache.json')
    deployResult = readJsonSync(`deployments/${network.name}_result.json`)
    ensRegistryResult = deployResult[ENSRegistry_SourceName] || {}
}


module.exports = async ({ getNamedAccounts, deployments, network }) => {

    try {

    
    console.log('deployer network=', network.name);
    initialize(network);

    const { deploy } = deployments;
    const { deployer, owner } = await getNamedAccounts();

    // console.log(`deployer=${deployer}, owner=${owner}`)

    console.log('\n【部署正向注册器合约】 STEP [1] ---> 5 x baseRegistrarAddress = deploy BaseRegistrarImplementation(ensAddress, baseNode) & baseRegistrarAddress.addController(owner, true)')

    deployResult[BaseRegistrarImplementation_SourceName] = deployResult[BaseRegistrarImplementation_SourceName] || {}

    if (!deployUtilInstance.check(BaseRegistrarImplementation_SourceName).address) {

        const baseNode = namehash.hash(domainConfig.baseNodeDomain)
        console.log(domainConfig.baseNodeDomain, ' domain baseNode=', baseNode)
        const baseRegistrarImplementationArgs = [
            domainConfig.name,
            domainConfig.symbol,
            ensRegistryResult.address, 
            baseNode, 
            domainConfig.baseNodeDomain
        ];
        const baseRegistrarImplementationResult = await deploy('BaseRegistrarImplementation', {
            from: deployer,
            args: baseRegistrarImplementationArgs,
            log: true,
        });
        console.log(`Domain: ${domainConfig.baseNodeDomain} - baseRegistrarImplementationResult.address=`, baseRegistrarImplementationResult.address)

        deployResult[BaseRegistrarImplementation_SourceName] = {
            contentHash: deployUtilInstance.check(BaseRegistrarImplementation_SourceName).contentHash,
            address: baseRegistrarImplementationResult.address,
            args: baseRegistrarImplementationArgs
        }

        // const baseRegistrarImplementationContract =
        // await ethers.getContractAt('BaseRegistrarImplementation', baseRegistrarImplementationResult.address);

        // const tx1 = await baseRegistrarImplementationContract.addController(owner, { from: deployer })
        // console.log(`Domain: ${domainConfig.baseNodeDomain} - Adding owner as controller to registrar (tx: ${tx1.hash})...`)
        // await tx1.wait()

    

    }
    console.log('\n【部署TokenURL构造器合约】 STEP [2] ---> ensAddress = deploy TokenURIBuilder() and setTokenURIBuilder')
    if (!deployUtilInstance.check(TokenURIBuilder_SourceName).address) {

        const registrarAddress = deployResult[BaseRegistrarImplementation_SourceName].address;
        const tokenURIBuilderArgs = [registrarAddress];
        const tokenURIBuilder = await deploy('TokenURIBuilder', {
            from: deployer,
            args: tokenURIBuilderArgs,
            log: true,
        });
        console.log(`Domain: ${domainConfig.baseNodeDomain} - tokenURIBuilder.address=`, tokenURIBuilder.address)

        deployResult[TokenURIBuilder_SourceName] = {
            contentHash: deployUtilInstance.check(TokenURIBuilder_SourceName).contentHash,
            address: tokenURIBuilder.address,
            args: tokenURIBuilderArgs
        }

        const baseRegistrarImplementationContract =
        await ethers.getContractAt('BaseRegistrarImplementation', registrarAddress);

    const txbuilder = await baseRegistrarImplementationContract.setTokenURIBuilder(tokenURIBuilder.address, { from: deployer })
    console.log(`【设置TokenURL合约到基础注册器合约】Domain: ${domainConfig.baseNodeDomain} - Adding token uri builder to registrar (tx: ${txbuilder.hash})...`)
    await txbuilder.wait()


    }


  

    // console.log('\n[base] STEP [3] ---> StableLogicControlAddress = deploy StableLogicControl(rentPrices)')

    // if (!deployUtilInstance.check(StableLogicControl_SourceName).address) {
        
    //     const StableLogicControlArgs = [rentPrices]
    //     stableLogicControlResult = await deploy('StableLogicControl', {
    //         from: deployer,
    //         args: StableLogicControlArgs,
    //         log: true,
    //     });
    //     deployResult[StableLogicControl_SourceName] = {
    //         contentHash: deployUtilInstance.check(StableLogicControl_SourceName).contentHash,
    //         address: stableLogicControlResult.address,
    //         args: StableLogicControlArgs
    //     }
    // }
    // deployResult

    // console.log('deployResult=', JSON.stringify(deployResult, null, 2))
    fs.writeFileSync(`deployments/${network.name}_result.json`, JSON.stringify(deployResult, null, 2));
} catch(e) {
    console.log('deploy fail, error=',e)
}
    return true;

};

module.exports.tags = ['base'];
module.exports.id = "base";
module.exports.dependencies = ['core']
