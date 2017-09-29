var DivxToken = artifacts.require("DivxToken");

async function mineBlocks(num=1) {
    for (let i=0; i<num; ++i) {
        await new Promise(function(resolve, reject) { web3.currentProvider.sendAsync({ jsonrpc: "2.0", method: "evm_mine", id: i }, function(err, result) { resolve(); }); });
    }
}

function blockNumber() {
    return new Promise(function(resolve, reject) {
        web3.currentProvider.sendAsync({ jsonrpc: "2.0", method: "eth_blockNumber", id: 0x05 }, function(err, result) { resolve(parseInt(result.result)) });
    });
}

function convertInt(val) {
    return val.toNumber();
}

function snapshot() {
    return new Promise(function(resolve, reject) {
        web3.currentProvider.sendAsync({ jsonrpc: "2.0", method: "evm_snapshot", id: 0xabcd }, function(err, result) { resolve(); });
    });
}

function revert() {
    return new Promise(function(resolve, reject) {
        web3.currentProvider.sendAsync({ jsonrpc: "2.0", method: "evm_revert", id: 0xabcd }, function(err, result) { resolve(); });
    });
}

function reset() {
    return new Promise(function(resolve, reject) {
        web3.currentProvider.sendAsync({ jsonrpc: "2.0", method: "evm_reset", id: 0xabce }, function(err, result) { resolve(); });
    });
}

contract('DivxToken', function(accounts) {

    let fundingStartBlock = 10;
	let firstXRChangeBlock = 20;
	let secondXRChangeBlock = 30;
	let thirdXRChangeBlock = 40;
    let fundingEndBlock = 50;
    let privateExchangeRate = 1000;
	let firstExchangeRate = 650;
	let secondExchangeRate = 575;
	let thirdExchangeRate = 500;
    let receivedWeiCap = 100000000000000000000000;
    console.log(receivedWeiCap);
    let receivedWeiMin = 0;
    let totalReceivedWei = 0;
    let fundDeposit = '';
    const initialFundBalance = 999580000200000000000; // there is already some gas deducted for the contract
    const standardBid = 1000000000000000000;

    // enum
    const isFundraising = 0;
    const isFinalized = 1;
    const isRedeeming = 2;
    const isPaused = 3;

	var num = web3.eth.blockNumber;
	console.log(num);
	// working
    before(async function() {
        await reset();
        let div = null;
        return DivxToken.deployed().then(instance => {
            div = instance;
            return div.fundingStartBlock.call();
        }).then(result => {
            fundingStartBlock = convertInt(result);
            return div.privateExchangeRate.call();
        }).then(result => {
            privateExchangeRate = convertInt(result);
            return div.fundingEndBlock.call();
        }).then(result => {
            fundingEndBlock = convertInt(result);
            return div.firstExchangeRate.call();
        }).then(result => {
            firstXRChangeBlock = convertInt(result);
            return div.secondExchangeRate.call();
        }).then(result => {
            secondXRChangeBlock = convertInt(result);
            return div.receivedWeiCap.call();
        }).then(result => {
            receivedWeiCap = convertInt(result);
            return div.receivedWeiMin.call();
        }).then(result => {
            receivedWeiMin = convertInt(result);
            return div.totalReceivedWei.call();
        }).then(result => {
            totalReceivedWei = convertInt(result);
            return div.fundDeposit.call();
        }).then(result => {
            fundDeposit = result;
        });
    });
	// working
    it('should start at block 4', function() {
        return DivxToken.deployed().then(instance => {
            return blockNumber();
        }).then(block => {
            assert.equal(block, 4, 'after deploying we should be at block 4, perhaps you should restart testrpc');
        });
    });
	
	// working
    it('should not issue tokens before the beginning', function() {
        return DivxToken.deployed().then(div => {
            return div.createTokens({
                from: accounts[0],
                value: standardBid,
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            assert.fail('token creation did not fail');
        }).catch(e => {
            if (e.name == 'Error') {
                assert.ok(true);
            } else {
                assert.fail('token creation did not fail');
            }
        });
    });
	// working
    it('should not allow tokens to be traded without having them', function() {
        return DivxToken.deployed().then(div => {
            return div.transfer(accounts[1], 10, {
                from: accounts[0],
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            assert.fail('trading did not fail');
        }).catch(e => {
            if (e.name == 'Error') {
                assert.ok(true);
            } else {
                assert.fail('trading did not fail');
            }
        });
    });
	// working
    it('take a snapshot of the blockchain', function() {
        return snapshot();
    });
	// working 
    it('should issue tokens for the correct price in phase 1', function() {
        let net = null;
        const weis = standardBid;
        return DivxToken.deployed().then(instance => {
            net = instance;
            return blockNumber();
        }).then(currentBlock => {
            // mine necessary amount of blocks
            return mineBlocks(fundingStartBlock - currentBlock - 1);
        }).then(() => {
            return net.createTokens({
                from: accounts[0],
                value: weis,
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            return net.balanceOf.call(accounts[0]);
        }).then(balance => {
            assert.equal(balance, weis * privateExchangeRate, 'got wrong amount of tokens');
        }).catch(() => {
            assert.fail('token creation did fail');
        });
    });
	// working
    it('should not issue tokens that overshoot the eth received cap', function() {
        let div = null;
        const weis = receivedWeiCap; // definitely too much
        return DivxToken.deployed().then(instance => {
            div = instance;
            return div.createTokens({
                from: accounts[0],
                value: weis,
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            assert.fail('should not allow token creation overshooting cap');
        }).catch(() => {
            assert.ok(true);
        });
    });

    it('should issue tokens exactly matching eth cap', function() {
        let div = null;
        const weis = receivedWeiCap - standardBid;
        return DivxToken.deployed().then(instance => {
            div = instance;
            return div.createTokens({
                from: accounts[0],
                value: weis,
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            return div.balanceOf.call(accounts[0]);
        }).then(balance => {
            console.log(balance);
            assert.equal(balance, weis * privateExchangeRate, 'got wrong amount of tokens');
        });
    });
	// working
    it('no refunding at this point', function() {
        let div = null;
        return DivxToken.deployed().then(instance => {
            div = instance;
            return div.refund({
                from: accounts[0],
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            assert.fail('should not be possible to refund');
        }).catch(e => {
            if (e.name == 'Error') {
                assert.ok(true);
            } else {
                assert.fail('should not be possible to refund');
            }
        });
    });
	// working
    it('should not issue tokens after reaching the eth received cap', function() {
        let div = null;
        const weis = 1;
        return DivxToken.deployed().then(instance => {
            div = instance;
            return div.createTokens({
                from: accounts[2],
                value: weis,
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            assert.fail('should not allow token creation overshooting cap');
        }).catch(() => {
            assert.ok(true);
        });
    });

    it('should allow early finalization', function() {
        let div = null;
        const gasUsed = 34016; // calculated by running the transaction once
        const gasPrice = 20000000000;
        return DivxToken.deployed().then(instance => {
            div = instance;
            return div.finalize({
                from: fundDeposit,
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            return div.state.call();
        }).then(state => {
            assert.ok(convertInt(state) === isFinalized);
            return web3.eth.getBalance(fundDeposit);
        }).then(balance => {
            assert.ok(balance >= (receivedWeiCap+initialFundBalance-(gasUsed*gasPrice)), 'balance is not correctly updated');
        }).catch(() => {
            assert.fail('could not finalize contract');
        });
    });

    it('should allow tokens to be traded after finalization', function() {
        return DivxToken.deployed().then(div => {
            return div.transfer(accounts[1], 10, {
                from: accounts[0],
                gas: 2099999,
                gasPrice: 20000000000
            });
        }).then(() => {
            assert.ok(true);
        }).catch(() => {
            assert.fail('could not trade tokens');
        });
    });
});