pragma solidity ^0.4.11;

interface IERC20 {
    function totalSupply() constant returns (uint256 totalSupply);
    function balanceOf(address _owner) constant returns (uint256 balance);
    function transfer(address _to, uint256 _value) returns (bool success);
    function transferFrom(address _from, address _to, uint256 _value) returns (bool success);
    function approve(address _spender, uint256 _value) returns (bool success);
    function allowance(address _owner, address _spender) constant returns (uint256 remaining);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
  function mul(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal constant returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function sub(uint256 a, uint256 b) internal constant returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

// -------------------------------------------------------------------
// DIVX is an ERC20 Token. Symbol, name, and decimals below along
// with crowdsale contract
// -------------------------------------------------------------------
    
contract DiviExchangeToken is IERC20 { 
    
    using SafeMath for uint256;
    
    uint public _totalSupply = 0;
    
    // -------------------------------------------------
    // Token Information
    // -------------------------------------------------
    string public constant symbol = "DIVX";
    string public constant name = "Divi Exchange Token";
    uint8 public constant decimals = 18;
    
    // Do not use `now` here
    uint256 public STARTDATE;
    uint256 public ENDDATE;

    // Cap USD 20M @ 300 ETH/USD or 50M DIVX
    uint256 public CAP;

    // Cannot have a constant address here - Solidity bug
    // https://github.com/ethereum/solidity/issues/2441
    address public multisig;
    
    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowed;
    
    
    function DiviExchangeToken(uint256 _start, uint256 _end, uint256 _cap, address _multisig) {
        balances [msg.sender] = _totalSupply;
        
        STARTDATE = _start;
        ENDDATE   = _end;
        CAP       = _cap;
        multisig  = _multisig;
    }

    function totalSupply() constant returns (uint256 totalSupply) {
        return _totalSupply;
    }
    
    // Find DIVX to ETH rate
    uint256 _buyPrice = buyPrice();
    
    uint256 public totalEthers;
    
    // ------------------------------------------------------------------------
    // Tokens per ETH
    // Days 01-09: 750 DIVX = 1 Ether
    // Days 10-14: 700 DIVX = 1 Ether
    // Days 15-25: 625 DIVX = 1 Ether
    // Days 25-35: 550 DIVX = 1 Ether
    // Days 35-45: 500 DIVX = 1 Ether
    // ------------------------------------------------------------------------
    function buyPrice() constant returns (uint256) {
        return buyPriceAt(now);
    }

    function buyPriceAt(uint256 at) constant returns (uint256) {
        if (at < STARTDATE) {
            return 0;
        } else if (at < (STARTDATE + 9 days)) {
            return 750;
        }else if (at < (STARTDATE + 14 days)) {
            return 700;
        } else if (at < (STARTDATE + 24 days)) {
            return 625;
        } else if (at < (STARTDATE + 34 days)) {
            return 550;
        } else if (at < (STARTDATE + 44 days)) {
            return 500;
        } else if (at <= ENDDATE) {
            return 500;
        } else {
            return 0;
        }
    }
    
    function () payable {
        createTokens();
    }
    
    function createTokens() payable {
        // No 0 contributions
        require(msg.value > 0);
        // No contributions before beginning of sale
        require(now >= STARTDATE);
        // No contributions after end of sale
        require(now <= ENDDATE);
        
        //Add ETH raised to total
        totalEthers = totalEthers.add(msg.value);
        //Cannot exceed cap
        require(totalEthers <= CAP);
        
        // Token value equivalent to ETH sent multiplied by current buy price
        uint256 tokens = msg.value.mul(_buyPrice);
        
        // Add to balances
        balances[msg.sender] = balances[msg.sender].add(tokens);
        balances[multisig] = balances[multisig].add(multisigTokens);
        
        // Add to total supply
        _totalSupply = _totalSupply.add(tokens);
        _totalSupply = _totalSupply.add(multisigTokens);
        
        // Check tokens > 0
        require(tokens > 0);
        
        // Compute tokens for foundation 10%
        // Number of tokens restricted so maths is safe
        uint multisigTokens = tokens * 100/10;
        
        // Log events
        TokensBought(msg.sender, msg.value, totalEthers, tokens, multisigTokens, _totalSupply, _buyPrice);
        Transfer(0x0, msg.sender, tokens);
        Transfer(0x0, multisig, multisigTokens);
        
        // Move funds to a safe wallet
        multisig.transfer(msg.value);
    }
    event TokensBought(address indexed buyer, uint256 ethers, uint256 newEtherBalance, uint256 tokens, uint256 multisigTokens, uint256 newTotalSupply, uint256 buyPrice);
    
    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
        
    }
    
    function transfer(address _to, uint256 _value) returns (bool success) {
        require(
            balances[msg.sender] >= _value
            && _value > 0 
        );
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
        return true;
        
    }
    
    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {
        require(
            allowed[_from][msg.sender] >= _value
            && balances[_from] >= _value
            && _value > 0
            
        );
        balances[_from] = balances[msg.sender].sub(_value);
        balances[_to] = balances[msg.sender].add(_value);
        allowed[_from][msg.sender] = balances[msg.sender].sub(_value);
        Transfer(_from, _to, _value);
        return true;
        
    }
    
    function approve(address _spender, uint256 _value) returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
        
    }
    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
        return allowed[_owner][_spender];
        
    }
    
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

}