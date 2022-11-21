```bash
├── ethregistrar
│   ├── BaseRegistrar.sol
│   ├── BaseRegistrarImplementation.sol // 注册器 NFT合约 （每个域名后缀部署一个）
│   ├── BulkRenewal.sol
│   ├── DummyOracle.sol
│   ├── ETHRegistrarController.sol // 域名入口控制器器
│   ├── IETHBatchRegistrarController.sol
│   ├── IETHRegistrarController.sol
│   ├── LinearPremiumPriceOracle.sol
│   ├── LogicControl.sol
│   ├── SafeMath.sol
│   ├── StableLogicControl.sol // 可升级合约：负责定义价格, 保留域名逻辑
│   ├── StringUtils.sol
│   ├── TestResolver.sol
│   ├── TokenURIBuilder.sol
│   ├── Whitelist.sol
│   ├── artifacts
│   └── mocks
├── readme.md
├── registry
│   ├── ENSRegistry.sol  // 注册表核心合约
│   ├── ReverseRegistrar.sol // 反向注册器合约 负责 {{addr}}.addr.reserve => name的映射
│   ├── ENS.sol // 注册表核心合约定义
│   └── artifacts
├── resolvers
│   ├── DefaultReverseResolver.sol // 反向解析器合约，由ReverseRegistrar托管
│   ├── IMulticallable.sol
│   ├── ISupportsInterface.sol
│   ├── Multicallable.sol
│   ├── OwnedResolver.sol
│   ├── PublicResolver.sol // 正向解析器合约，由控制器管理，负责 name => 地址，自定义key， contenthash等内容映射
│   ├── Resolver.sol // 解析器定义
│   ├── ResolverBase.sol
│   ├── SupportsInterface.sol
│   ├── artifacts
│   └── profiles
└── root
    ├── Controllable.sol
    ├── Ownable.sol
    └── Root.sol // 根合约，是reserve和各个域名后缀的一级域名的owner
```


