pragma solidity >=0.8.4;

import "./LogicControl.sol";
import "./SafeMath.sol";
import "./StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


// StableLogicControl sets a price in USD, based on an oracle.
contract StableLogicControl is Ownable, LogicControl {
    using SafeMath for *;
    using StringUtils for *;

    // Rent in base price (price by coin) units by length. Element 0 is for 1-length names, and so on.
    uint[] public rentPrices;

    mapping(string => address) public reservenames;

    mapping(address => bool) public controllers;

    event OracleChanged(address oracle);

    event RentPriceChanged(uint[] prices);

    bytes4 constant private INTERFACE_META_ID = bytes4(keccak256("supportsInterface(bytes4)"));
    bytes4 constant private ORACLE_ID = bytes4(keccak256("price(string,uint256,uint256)") ^ keccak256("premium(string,uint256,uint256)"));

    constructor(uint[] memory _rentPrices) public {
        setPrices(_rentPrices);
    }

    modifier authorised {
        require(
            msg.sender == owner() || controllers[msg.sender],
            "Caller is not a controller or owner"
        );
        _;
    }
    function setController(address controller, bool enabled) public onlyOwner {
        controllers[controller] = enabled;
    }

    function setReserveNames(string[] memory namelist, address[] memory addresslist) public authorised {
        require(namelist.length == addresslist.length, "array length invalid");
        for (uint256 i = 0; i < namelist.length; i++) {
            reservenames[namelist[i]] = addresslist[i];
        }
    }
    function removeReserveNames(string[] memory namelist) public authorised {
        for (uint256 i = 0; i < namelist.length; i++) {
            delete reservenames[namelist[i]];
        }
    }

    function accessible(string memory name, address accessAddress) public view override returns (bool) {
        if(accessAddress == address(this)) {
            return true;
        }
        if(accessAddress == owner()) {
            return true;
        }
        if(reservenames[name] !=  address(0) && accessAddress != reservenames[name]) {
            return false;
        }
        return true;
    }

    function price(string calldata name, uint expires, uint duration) external view override returns(uint) {
        uint len = name.strlen();
        if(len > rentPrices.length) {
            len = rentPrices.length;
        }
        require(len > 0);
        
        uint basePrice = rentPrices[len - 1].mul(duration);
        basePrice = basePrice.add(_premium(name, expires, duration));

        return toStandardPrice(basePrice);
    }

    /**
     * @dev Sets rent prices.
     * @param _rentPrices The price array. Each element corresponds to a specific
     *                    name length; names longer than the length of the array
     *                    default to the price of the last element. Values are
     *                    in base price units, equal to one attodollar (1e-18
     *                    dollar) each.
     */
    function setPrices(uint[] memory _rentPrices) public onlyOwner {
        rentPrices = _rentPrices;
        emit RentPriceChanged(_rentPrices);
    }

    /**
     * @dev Returns the pricing premium in wei.
     */
    function premium(string calldata name, uint expires, uint duration) external view returns(uint) {
        return toStandardPrice(_premium(name, expires, duration));
    }

    /**
     * @dev Returns the pricing premium in internal base units.
     */
    function _premium(string memory name, uint expires, uint duration) virtual internal view returns(uint) {
        return 0;
    }

    function toStandardPrice(uint amount) internal view returns(uint) {
        return amount ; // wei
    }

    function supportsInterface(bytes4 interfaceID) public view virtual returns (bool) {
        return interfaceID == INTERFACE_META_ID || interfaceID == ORACLE_ID;
    }
}
