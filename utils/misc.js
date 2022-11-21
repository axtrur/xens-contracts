const fs = require('fs');

module.exports.readJsonSync = (fileName) => {
    let result = {}
    if (fs.existsSync(fileName)) {
        let rawdata = fs.readFileSync(fileName);
        result = JSON.parse(rawdata);
    }
    // console.log(`readJsonSync ${fileName} result=${JSON.stringify(result, null, 2)}`)
    return result
}


class DeployUtil {
    constructor(cacheJson, deployResult, network, force) {
        this.cacheJson = cacheJson;
        this.deployResult = deployResult;
        this.network = network;
        this.force = force;
    }
    check (contractSourceName, subKey) {
        // force re deploy 
        const cachePayload = Object.values(this.cacheJson.files || {}).find(e => e.sourceName === contractSourceName)
    
        if (this.force || this.network.name === 'hardhat') {
            return {
                address: '',
                contentHash: cachePayload ? cachePayload.contentHash : '',
                args: [],
            }
        }
        const deployPayload = subKey ? (this.deployResult[contractSourceName] || {})[subKey] : this.deployResult[contractSourceName]
        if (deployPayload && cachePayload && deployPayload.contentHash && cachePayload.contentHash === deployPayload.contentHash) {
            console.log('check exist skip deploy ', contractSourceName, '|address=', deployPayload.address)
            return deployPayload
        }
        console.log(`${contractSourceName}.${subKey}|cachePayload=${cachePayload}`)
        return {
            address: '',
            contentHash: cachePayload ? cachePayload.contentHash : '',
            args: [],
        }
    }
}
module.exports.DeployUtil = DeployUtil;