var DIVXToken = artifacts.require("./DIVXToken.sol");

module.exports = function(deployer) {
  var ethfund = "0x39aeeba1b26c59bb0239a7740a3aaf7aa3bc94aa";
  var start = 10;
  var middle = 15;
  var end = 20;
 deployer.deploy(DIVXToken, ethfund, 10, 20, 30, 40, 50);
};
