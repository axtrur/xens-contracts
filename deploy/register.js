const { ethers, network } = require("hardhat");
const fs = require('fs');
const {readJsonSync, DeployUtil} = require('../utils/misc')
const { domainConfig } = require('../constants/index');

let cacheJson = {}
let deployResult = {}
let deployUtilInstance = {};

const BaseRegistrarImplementation_SourceName = 'contracts/ethregistrar/BaseRegistrarImplementation.sol'
const ETHRegistrarController_SourceName = 'contracts/ethregistrar/ETHRegistrarController.sol'

let ethRegistrarControllerResult = {}


const initialize = (network) => {
    deployUtilInstance = new DeployUtil(cacheJson, deployResult, network,process.env.FORCE === 'true' )

    cacheJson = readJsonSync('cache/solidity-files-cache.json')
    deployResult = readJsonSync(`deployments/${network.name}_result.json`)
    ethRegistrarControllerResult = deployResult[ETHRegistrarController_SourceName] || {}

}


module.exports = async ({ getNamedAccounts, deployments, network }) => {

    try {


        console.log('deployer network=', network.name);
        initialize(network);



        const { deploy } = deployments;
        const { deployer, owner } = await getNamedAccounts();

        // console.log(`deployer=${deployer}, owner=${owner}`)

        console.log('\n【部署注册控制器入口合约】STEP [1] ---> RegisterControllerAddress = deploy ETHRegistrarController(baseRegisterAddress,StableLogicControlAddress, reverseRegistrarAddress, minCommitmentAge, maxCommitmentAge) && baseRegisterAddress.addController(controllerAddress,true), reverseRegisterAddress.setController(controllerAddress)')

        if (!deployUtilInstance.check(ETHRegistrarController_SourceName).address) {
            const ethRegistrarControllerResultArgs = [deployResult[BaseRegistrarImplementation_SourceName].address, domainConfig.basePrice, 60, 86400];
            ethRegistrarControllerResult = await deploy('ETHRegistrarController', {
                from: deployer,
                args: ethRegistrarControllerResultArgs,
                log: true,
            });
            deployResult[ETHRegistrarController_SourceName] = {
                contentHash: deployUtilInstance.check(ETHRegistrarController_SourceName).contentHash,
                address: ethRegistrarControllerResult.address,
                args: ethRegistrarControllerResultArgs
            }
        }

     
    
        const registrarAddress = deployResult[BaseRegistrarImplementation_SourceName].address;
        const baseRegistrarImplementationContract =
            await ethers.getContractAt('BaseRegistrarImplementation', registrarAddress);
        const addControllerTx1 = await baseRegistrarImplementationContract.addController(ethRegistrarControllerResult.address, {
            from: deployer,
            // gasPrice: 13631902525
        })
        console.log(
            `Domain: ${domainConfig.baseNodeDomain} - Adding  controller as controller on registrar (tx: ${addControllerTx1.hash})...`,
        )
        await addControllerTx1.wait()

        // test
        const ControllerAdded = await baseRegistrarImplementationContract.controllers(ethRegistrarControllerResult.address)
        console.log('ControllerAdded=', ControllerAdded)

        // deployResult
        // console.log('deployResult=', JSON.stringify(deployResult, null, 2))
        fs.writeFileSync(`deployments/${network.name}_result.json`, JSON.stringify(deployResult, null, 2));
    } catch (e) {
        console.log('deploy fail, error=', e)
    }
    return true;

};

module.exports.tags = ['register'];
module.exports.id = "register";
module.exports.dependencies = ['core','root','base'];
