
const {BigNumber} = require("ethers")
const { keccak256 } = require('js-sha3');

function getTokenId(name) {
    const labelHash = '0x'+keccak256(name)
    const tokenId = BigNumber.from(labelHash).toString()
    return tokenId
}
async function main() {
    console.log('tokenId=', getTokenId('axtrur'))
}
main()

