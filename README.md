
### 修改内容
* 去除dns相关的注册逻辑
* 修复域名NFT转移owner没有同步转移的问题
* 增加721Enumrable
* 改造tokenURI为链上svg的形式
* 修复零宽问题
* 增加保留字到stableLogicControl.sol里
* 为方便部署体验注册功能，去除价格预言机，改成固定价格，如有需要则可部署StableLogicControl设置价格
* 【todo】如果想实现正向注册器合约BaseRegistrarImplementation可升级，可以用BaseRegistrarImplementationUpgradeable按照@openzeppelin/contracts-upgradeable规范自行修改验证

### 前置工作
* 修改constant/index.js的域名配置改成自己想部署的域名信息
* 
``` js
{
    domainConfig: {
        baseNodeDomain: 'buidlerdao', // 后缀
        name: 'buidlerdao name service', // nft name
        symbol: 'BUILDLERDAO', // nft symbol
        basePrice: 10000 // wei
    }
}
```

### develop tips
```sh
npx hardhat compile
npx hardhat deploy 
npx hardhat test
OWNER_KEY={{account private key}} INFURA_ID=c03713652e3c4ef6a3c09ea7dbf58711 npx hardhat deploy --network goerli (INFURA_ID可以替换成自己的infuraid，执行前删除deployment/goerli/.migrations.json)
FORCE=true OWNER_KEY={{account private key}} INFURA_ID=c03713652e3c4ef6a3c09ea7dbf58711 npx hardhat deploy --network goerli （强制都重新deploy）
```
如果只重新部署某个id的js，则从.migrations.json里去掉对应的id即可

如果只重新部署某个合约，则从{{network}}_result.json里把对应address置空即可


下面是执行本地网络部署的结果 `npx hardhat deploy`
```sh
deployer network= hardhat

【部署核心注册表合约】 STEP [1] --->  ensAddress = deploy ENSRegistry()
deploying "ENSRegistry" (tx: 0x7ebf36b5343df4665b79706decf5f240b02bf782bec2c2d04470cdbe59b7c0a6)...: deployed at 0x5FbDB2315678afecb367f032d93F642f64180aa3 with 743372 gas
ensRegistryResult.address= 0x5FbDB2315678afecb367f032d93F642f64180aa3

【部署默认反向解析器】 STEP [2] --->  defaultReverseResolverAddress = deploy DefaultReverseResolver(ensAddress)
deploying "DefaultReverseResolver" (tx: 0x235f2727edfd9dcb34343807630d4cb928cb19be344524a24af10319c4d52269)...: deployed at 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 with 419103 gas
defaultReverseResolverResult.address= 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

【部署反向注册器 & 设置默认反向解析器】 STEP [3] --->  reverseRegisterAddress = deploy ReverseRegistrar(ensAddress, defaultReverseResolverAddress)
deploying "ReverseRegistrar" (tx: 0x4d752766da691ffb2ae3d2710294544c9a80b559e00139e5d84db3966b76c066)...: deployed at 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 with 1234928 gas
reverseRegistrarResult.address= 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

【部署默认正向公共解析器】 STEP [4] --->  publicResolverAddress = deploy PublicResolver(ensAddress)
deploying "PublicResolver" (tx: 0x6a3462c1539c953e121e9d7a4478e165d68edff3715eec8997e6062c7b9d99f8)...: deployed at 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 with 1980210 gas
publicResolverResult.address= 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
deployer network= hardhat

【部署正向注册器合约】 STEP [1] ---> 5 x baseRegistrarAddress = deploy BaseRegistrarImplementation(ensAddress, baseNode) & baseRegistrarAddress.addController(owner, true)
buidlerdao  domain baseNode= 0xf4f740d56f576b63f57a508b18a60c24ab864b4afd50efaaeecca234babce5f5
deploying "BaseRegistrarImplementation" (tx: 0xba16e2863e6075da4c64cfc98f115e60c82f6e9811e75922092d95eb59c1872a)...: deployed at 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 with 2482613 gas
Domain: buidlerdao - baseRegistrarImplementationResult.address= 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

【部署TokenURL构造器合约】 STEP [2] ---> ensAddress = deploy TokenURIBuilder() and setTokenURIBuilder
deploying "TokenURIBuilder" (tx: 0x4c896452cc3ccbe2214580d91d81c3b43d84abae61b083b8b01650f36e167015)...: deployed at 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707 with 1184127 gas
Domain: buidlerdao - tokenURIBuilder.address= 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
【设置TokenURL合约到基础注册器合约】Domain: buidlerdao - Adding token uri builder to registrar (tx: 0x4a6d488305a6740326776e666f01d843c1c1f74c64b70d31e2acd5f87efe02bd)...
deployer network= hardhat

【部署根合约】 STEP [1] ---> rootAddress = deploy Root(ensAddress) & ensAddress.setOwner(ZERO_HASH, rootAddress) && rootAddress.setSubOwner(reserve.add, reverseRegisterAddress) & rootAddress.setSubOwner(ethw, baseRegisterAddress)
deploying "Root" (tx: 0x09d068fcc1d48ba9aa19a0e3ac4dd559379e528ae18f410e57ea563a486d9a90)...: deployed at 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 with 563614 gas
rootResult.address= 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
Setting final owner of root node on registry
【设置根域名owner到根合约】Setting final owner of root node on registry (tx:0x55334b8abdc0bfb829991862f436cbc79196bc3221d427802130739265140102)...
controller= false
Setting final owner as controller on root contract (tx: 0xc186ef45527fe0d757ad20ba67252a6ad5c88a5679597c8bf7dd9f65bde28be4)...

【设置.eth一级域名的owner到正向注册器】 STEP [2] ---> root.setSubnodeOwner(baseNodeDomain) & registrar.setResolver(publicResolver)
Domain: buidlerdao - Setting owner of eth node to registrar on root (tx: 0x446eae58bd0ac131cb1e7bab912b0149eeddcb48823736409ea72f859e9af31f)...
Domain: buidlerdao - Set publicResolver to registrar (tx: 0xd09abc111cf43e37551e7f6a6a90bb7d00685106f025acddbdc2a4c9da95f5af)...
Domain: buidlerdao - baseRegistrarImplementationContract.setResolver done

[root] STEP [3] ---> setup reverse resolver
【设置.reverse一级域名的owner到根合约】Setting owner of .reverse to owner on root (tx: 0xfc461f3a7517f1b3bc7224a9f6b5dfe5dd06c9d233439ca4de4b43e090ee7101)...
【设置.addr.reverse二级域名的owner到反向注册器合约】Setting owner of .addr.reverse to ReverseRegistrar on ensRegistryContract (tx: 0x9c0cb971a350123c117807590fb2e053044295aa87485964ccc54b6d5090e1a4)...
deployer network= hardhat

【部署注册控制器入口合约】STEP [1] ---> RegisterControllerAddress = deploy ETHRegistrarController(baseRegisterAddress,StableLogicControlAddress, reverseRegistrarAddress, minCommitmentAge, maxCommitmentAge) && baseRegisterAddress.addController(controllerAddress,true), reverseRegisterAddress.setController(controllerAddress)
deploying "ETHRegistrarController" (tx: 0x3d3c7e3896e03206f4c969518597088002f3fe7bc5a3db897d4faba0b7fad1d2)...: deployed at 0x9A676e781A523b5d0C0e43731313A708CB607508 with 1938236 gas
Domain: buidlerdao - Adding  controller as controller on registrar (tx: 0x2574349cbec760a0386577ab9ba35c3055eeb09cd58136c721cf3e7e8320ca64)...
ControllerAdded= true
```
本地deploy没有报错，就可以尝试部署其他网络，见 hardhat.config.js的network配置

### 部署测试网goerli后，执行注册脚本 ens.js

```sh
OWNKEY={{account private key}} INFURA=https://eth-goerli.alchemyapi.io/v2/GlaeWuylnNM3uuOo-SAwJxuwTdqHaY5l  node ens.js
```
就可以去opensea测试网查看了,比如我部署的：https://testnets.opensea.io/collection/buildlerdao-name-service

