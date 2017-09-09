var DIVXToken = artifacts.require("./DIVXToken.sol");

module.exports = function(deployer) {
  deployer.deploy(DIVXToken);
};
