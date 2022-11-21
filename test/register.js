const ENS = artifacts.require('./registry/ENSRegistry');
const DefaultReverseResolver = artifacts.require('./resolvers/DefaultReverseResolver');
const ReverseRegistrar = artifacts.require('./registry/ReverseRegistrar');
const PublicResolver = artifacts.require('./resolvers/PublicResolver');
const BaseRegistrar = artifacts.require('./BaseRegistrarImplementation');
const ETHRegistrarController = artifacts.require('./ETHRegistrarController');
const StableLogicControl = artifacts.require('./StableLogicControl');
const TokenURIBuilder = artifacts.require('./TokenURIBuilder');

const { evm, exceptions } = require("./test-utils");
const namehash = require('eth-ens-namehash');
const { MerkleTree } = require("merkletreejs");
const { keccak256 } = require('js-sha3');
const { assert } = require("chai");
const { base64 } = require("ethers/lib/utils");
const { domainConfig } = require("../constants");
const sha3 = require('web3-utils').sha3;
const toBN = require('web3-utils').toBN;
const DAYS = 24 * 60 * 60;
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"
const BASE_UNIT_PRICE_WEI = 10000
contract('ETHRegistrarController', function (accounts) {
    let ens;
    let resolver;
    let baseRegistrar;
    let controller;
    let logicControl;
    let reverseResolver;
    let reverseRegistrar;

    const secret = "0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
    
    const ownerAccount = accounts[0]; // Account that owns the registrar
    const registrantAccount = accounts[1]; // Account that owns test names
    console.log('ownerAccount=',ownerAccount, '|registrantAccount=',registrantAccount)
    before(async () => {
        ens = await ENS.new();
        resolver = await PublicResolver.new(ens.address);
        baseRegistrar = await BaseRegistrar.new("name", "N", ens.address, namehash.hash(`${domainConfig.baseNodeDomain}`), `${domainConfig.baseNodeDomain}`, {from: ownerAccount});
        tokenBuilder = await TokenURIBuilder.new(baseRegistrar.address);
        await baseRegistrar.setTokenURIBuilder(tokenBuilder.address)
        reverseResolver = await DefaultReverseResolver.new(ens.address);
        reverseRegistrar = await ReverseRegistrar.new(ens.address, reverseResolver.address)
            // logicControl 
        const rentPrices = new Array(5).fill(BASE_UNIT_PRICE_WEI)
        logicControl = await StableLogicControl.new(rentPrices)
        console.log('baseRegistrar.address=',baseRegistrar.address, '0x'+ keccak256('reverse'),namehash.hash('reverse'))

        await ens.setSubnodeOwner('0x0', '0x'+ keccak256(`${domainConfig.baseNodeDomain}`), baseRegistrar.address, {from: ownerAccount});
        await ens.setSubnodeOwner('0x0', '0x'+ keccak256('reverse'), ownerAccount,{from: ownerAccount});
        await ens.setSubnodeOwner(namehash.hash('reverse'), '0x'+ keccak256('addr'), reverseRegistrar.address,{from: ownerAccount});

        controller = await ETHRegistrarController.new(
            baseRegistrar.address,
            BASE_UNIT_PRICE_WEI,
            600,
            86400,
            {from: ownerAccount});
        await baseRegistrar.addController(controller.address, {from: ownerAccount});
        await reverseRegistrar.setController(controller.address, {from: ownerAccount})
    });

    const checkLabels = {
        "testing": true,
        "longname12345678": true,
        "sixsix": true,
        "five5": true,
        "four": true,
        "iii": true,
        "ii": true,
        "i": true,
        "": false,

        // { ni } { hao } { ma } (chinese; simplified)
        "\u4f60\u597d\u5417": true,

        // { ta } { ko } (japanese; hiragana)
        "\u305f\u3053": true,

        // { poop } { poop } { poop } (emoji)
        "\ud83d\udca9\ud83d\udca9\ud83d\udca9": true,

        // { poop } { poop } (emoji)
        "\ud83d\udca9\ud83d\udca9": true
    };

    const allowlist = [
      ownerAccount
    ]

    const leafNodes = allowlist.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

    it('should report label validity', async () => {
        for (const label in checkLabels) {
            assert.equal(await controller.valid(label), checkLabels[label], label);
        }
    });

    it('should report unused names as available', async () => {
        assert.equal(await controller.available(sha3('available')), true);
    });

    it('should permit new registrations', async () => {
   
        var commitment = await controller.makeCommitment("newname", registrantAccount, secret, resolver.address);
        console.log('commitment=',commitment)
        var tx = await controller.commit(commitment);
        assert.equal(await controller.commitments(commitment), (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);
        await evm.advanceTime((await controller.minCommitmentAge()).toNumber());

        const value = BASE_UNIT_PRICE_WEI * 365 * DAYS;
        console.log('price value=',value);
        assert.equal((await controller.rentPrice("newname",365 * DAYS)), value);
        var balanceBefore = await web3.eth.getBalance(controller.address);
        

        var tx = await controller.register(
            "newname",
            registrantAccount,
            365 * DAYS,
            secret,
            resolver.address, 
            {value: value}
        );

        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "NameRegistered");
        assert.equal(tx.logs[0].args.name, "newname");
        assert.equal(tx.logs[0].args.owner, registrantAccount);
        var balanceAfter = await web3.eth.getBalance(controller.address)
        assert.equal(balanceAfter - balanceBefore, value);
        assert.equal((await baseRegistrar.balanceOf(registrantAccount)), 1);

    });

    it('should be able to get name with resolver', async () => {
        const id = await baseRegistrar.tokenByIndex(0);
        assert.equal(await baseRegistrar.getName(id), "newname");
    })
    it('should be able to get url with baseRegister', async () => {
        const id = await baseRegistrar.tokenByIndex(0);
        assert.equal(await baseRegistrar.tokenURI(id), await tokenBuilder.tokenURI(id));
    })

    it('should report registered names as unavailable', async () => {
        assert.equal(await controller.available('newname'), false);
    });


    it('should permit new registrations with config', async () => {
        var commitment = await controller.makeCommitment("newconfigname👽", registrantAccount, secret, resolver.address);
        var tx = await controller.commit(commitment);
        assert.equal(await controller.commitments(commitment), (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

        await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
        var balanceBefore = await web3.eth.getBalance(controller.address);
        const value = BASE_UNIT_PRICE_WEI * 365 * DAYS;

        var tx = await controller.register("newconfigname👽", registrantAccount, 365 * DAYS, secret, resolver.address, {value: value});
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "NameRegistered");
        assert.equal(tx.logs[0].args.name, "newconfigname👽");
        assert.equal(tx.logs[0].args.owner, registrantAccount);

        assert.equal((await web3.eth.getBalance(controller.address)) - balanceBefore, value);
        var nodehash = namehash.hash(`newconfigname👽.${domainConfig.baseNodeDomain}`);
        assert.equal((await ens.resolver(nodehash)), resolver.address);
        assert.equal((await ens.owner(nodehash)), registrantAccount);
        assert.equal((await resolver.addr(nodehash)), registrantAccount);
    });

    it('should able to get name with resolver', async () => {
      const id = await baseRegistrar.tokenByIndex(1);
      const name = await baseRegistrar.getName(id);
      assert.equal(name, "newconfigname👽");
    })

    it('should not allow a commitment with addr but not resolver', async () => {
        await exceptions.expectFailure(controller.makeCommitment("newconfigname2", registrantAccount, secret, NULL_ADDRESS));
    });

    it('should permit a registration with resolver but not addr', async () => {
        var commitment = await controller.makeCommitment("newconfigname2", registrantAccount, secret, resolver.address);
        var tx = await controller.commit(commitment);
        assert.equal(await controller.commitments(commitment), (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);
        const value = BASE_UNIT_PRICE_WEI * 365 * DAYS;
        await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
        var balanceBefore = await web3.eth.getBalance(controller.address);
        var tx = await controller.register("newconfigname2", registrantAccount, 365 * DAYS, secret, resolver.address, {value: value});
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "NameRegistered");
        assert.equal(tx.logs[0].args.name, "newconfigname2");
        assert.equal(tx.logs[0].args.owner, registrantAccount);
        assert.equal((await web3.eth.getBalance(controller.address)) - balanceBefore,value);
        var nodehash = namehash.hash(`newconfigname2.${domainConfig.baseNodeDomain}`);
        assert.equal((await ens.resolver(nodehash)), resolver.address);
        assert.equal((await resolver.addr(nodehash)), registrantAccount);
       
    });


    it('should reject duplicate registrations', async () => {
        await controller.commit(await controller.makeCommitment("newname", registrantAccount, secret,resolver.address));

        await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
        await exceptions.expectFailure(controller.register("newname", registrantAccount, 365 * DAYS, secret,resolver.address, {value: BASE_UNIT_PRICE_WEI * 365 * DAYS}));
    });

    it('should reject for expired commitments', async () => {
        await controller.commit(await controller.makeCommitment("newname2", registrantAccount, secret,resolver.address));

        await evm.advanceTime((await controller.maxCommitmentAge()).toNumber() + 1);
        await exceptions.expectFailure(controller.register("newname2", registrantAccount, 365 * DAYS, secret,resolver.address, {value: BASE_UNIT_PRICE_WEI * 365 * DAYS}));
    });

    it('should allow anyone to renew a name', async () => {
        var expires = await baseRegistrar.nameExpires(sha3("newname"));
        var balanceBefore = await web3.eth.getBalance(controller.address);
        const value = BASE_UNIT_PRICE_WEI * 365 * DAYS;
        await controller.renew("newname", 365 * DAYS, {value: value});
        var newExpires = await baseRegistrar.nameExpires(sha3("newname"));
        assert.equal(newExpires.toNumber() - expires.toNumber(), 365 * DAYS);
        assert.equal((await web3.eth.getBalance(controller.address)) - balanceBefore, value);
    });

    it('should require sufficient value for a renewal', async () => {
        await exceptions.expectFailure(controller.renew("name", 86400));
    });

    it('should allow the registrar owner to withdraw funds', async () => {
        await controller.withdraw({from: ownerAccount});
        assert.equal(await web3.eth.getBalance(controller.address), 0);
    });
});
