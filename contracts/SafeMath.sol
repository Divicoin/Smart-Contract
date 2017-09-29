pragma solidity 0.4.11;

/* taking ideas from FirstBlood token */
contract SafeMath {

    function safeAdd(uint256 x, uint256 y) internal returns(uint256) {
      uint256 z = x + y;
      assert((z >= x));
      return z;
    }

    function safeSubtract(uint256 x, uint256 y) internal constant returns(uint256) {
      assert(x >= y);
      return x - y;
    }

    function safeMult(uint256 x, uint256 y) internal constant returns(uint256) {
      uint256 z = x * y;
      assert((x == 0)||(z/x == y));
      return z;
    }

    function safeDiv(uint256 x, uint256 y) internal constant returns (uint256) {
      uint256 z = x / y;
      return z;
    }
    
}
