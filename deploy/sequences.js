
const fs = require('fs');
const { ethers } = require("hardhat");
const {readJsonSync, DeployUtil} = require('../utils/misc')

let cacheJson = {}
let deployResult = {}
let deployUtilInstance = null;

const ENSRegistry_SourceName = 'contracts/registry/ENSRegistry.sol'
const DefaultReverseResolver_SourceName = 'contracts/resolvers/DefaultReverseResolver.sol'
const ReverseRegistrar_SourceName = 'contracts/registry/ReverseRegistrar.sol'
const PublicResolver_SourceName = 'contracts/resolvers/PublicResolver.sol'

let ensRegistryResult = {}
let defaultReverseResolverResult = {}
let reverseRegistrarResult = {}
let publicResolverResult = {}


const initialize = (network) => {
    deployUtilInstance = new DeployUtil(cacheJson, deployResult, network,process.env.FORCE === 'true' )
    cacheJson = readJsonSync('cache/solidity-files-cache.json')
    deployResult = readJsonSync(`deployments/${network.name}_result.json`)
    ensRegistryResult = deployResult[ENSRegistry_SourceName] || {}
    defaultReverseResolverResult = deployResult[DefaultReverseResolver_SourceName] || {}
    reverseRegistrarResult = deployResult[ReverseRegistrar_SourceName] || {}
    publicResolverResult = deployResult[PublicResolver_SourceName] || {}

}


module.exports = async ({ getNamedAccounts, deployments, network }) => {

    try {

    
    console.log('deployer network=', network.name);
    initialize(network);



    const { deploy } = deployments;
    const { deployer, owner } = await getNamedAccounts();

    // console.log(`deployer=${deployer}, owner=${owner}`)
    console.log('\n【部署核心注册表合约】 STEP [1] --->  ensAddress = deploy ENSRegistry()')

    if (!deployUtilInstance.check(ENSRegistry_SourceName).address) {
        ensRegistryResult = await deploy('ENSRegistry', {
            from: deployer,
            args: [],
            log: true,
        });
        console.log('ensRegistryResult.address=', ensRegistryResult.address)

        deployResult[ENSRegistry_SourceName] = {
            contentHash: deployUtilInstance.check(ENSRegistry_SourceName).contentHash,
            address: ensRegistryResult.address,
            args: []
        }
    }

    console.log('\n【部署默认反向解析器】 STEP [2] --->  defaultReverseResolverAddress = deploy DefaultReverseResolver(ensAddress)')

    if (!deployUtilInstance.check(DefaultReverseResolver_SourceName).address) {
        const defaultReverseResolverArgs = [ensRegistryResult.address]
        defaultReverseResolverResult = await deploy('DefaultReverseResolver', {
            from: deployer,
            args: defaultReverseResolverArgs,
            log: true,
        });
        console.log('defaultReverseResolverResult.address=', defaultReverseResolverResult.address)

        deployResult[DefaultReverseResolver_SourceName] = {
            contentHash: deployUtilInstance.check(DefaultReverseResolver_SourceName).contentHash,
            address: defaultReverseResolverResult.address,
            args: defaultReverseResolverArgs
        }
    }


    console.log('\n【部署反向注册器 & 设置默认反向解析器】 STEP [3] --->  reverseRegisterAddress = deploy ReverseRegistrar(ensAddress, defaultReverseResolverAddress)')
    if (!deployUtilInstance.check(ReverseRegistrar_SourceName).address) {
        const reverseRegistrarArgs = [ensRegistryResult.address, defaultReverseResolverResult.address];
        reverseRegistrarResult = await deploy('ReverseRegistrar', {
            from: deployer,
            args: reverseRegistrarArgs,
            log: true,
        });
        console.log('reverseRegistrarResult.address=', reverseRegistrarResult.address)

        deployResult[ReverseRegistrar_SourceName] = {
            contentHash: deployUtilInstance.check(ReverseRegistrar_SourceName).contentHash,
            address: reverseRegistrarResult.address,
            args: reverseRegistrarArgs
        }
    }
    console.log('\n【部署默认正向公共解析器】 STEP [4] --->  publicResolverAddress = deploy PublicResolver(ensAddress)')

    if (!deployUtilInstance.check(PublicResolver_SourceName).address) {
        const publicResolverArgs = [ensRegistryResult.address];
        publicResolverResult = await deploy('PublicResolver', {
            from: deployer,
            args: [ensRegistryResult.address],
            log: true,
        });
        console.log('publicResolverResult.address=', publicResolverResult.address)

        deployResult[PublicResolver_SourceName] = {
            contentHash: deployUtilInstance.check(PublicResolver_SourceName).contentHash,
            address: publicResolverResult.address,
            args: publicResolverArgs
        }
    }

    // console.log('deployResult=', JSON.stringify(deployResult, null, 2))
    fs.writeFileSync(`deployments/${network.name}_result.json`, JSON.stringify(deployResult, null, 2));
} catch(e) {
    console.log('deploy fail, error=',e)
}
    return true;

};

module.exports.tags = ['core'];
module.exports.id = "core";
