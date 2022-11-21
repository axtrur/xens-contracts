// pragma solidity >=0.8.4;

// import "../registry/ENS.sol";
// import "./BaseRegistrar.sol";
// import {ERC721Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
// import {ERC721EnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
// import {ERC721URIStorageUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
// import {ERC721BurnableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
// import {IERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
// import {OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// contract BaseRegistrarImplementationUpgradeable is OwnableUpgradeable,ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable,ERC721BurnableUpgradeable, BaseRegistrar{
//     // A map of expiry times
//     mapping(uint256=>uint) expiries;

//     bytes4 constant private INTERFACE_META_ID = bytes4(keccak256("supportsInterface(bytes4)"));
//     bytes4 constant private ERC721_ID = bytes4(
//         keccak256("balanceOf(address)") ^
//         keccak256("ownerOf(uint256)") ^
//         keccak256("approve(address,uint256)") ^
//         keccak256("getApproved(uint256)") ^
//         keccak256("setApprovalForAll(address,bool)") ^
//         keccak256("isApprovedForAll(address,address)") ^
//         keccak256("transferFrom(address,address,uint256)") ^
//         keccak256("safeTransferFrom(address,address,uint256)") ^
//         keccak256("safeTransferFrom(address,address,uint256,bytes)")
//     );
//     bytes4 constant private RECLAIM_ID = bytes4(keccak256("reclaim(uint256,address)"));

//     string public _baseTokenURI;

//     function _isApprovedOrOwner(address spender, uint256 tokenId) internal view override returns (bool) {
//         address owner = ownerOf(tokenId);
//         return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
//     }

// 	function __BaseRegistrarImplementation_i(ENS _ens, bytes32 _baseNode) initializer public {
//         __ERC721_init("XNS Name Service", "XNS");
//         __ERC721Enumerable_init();
//         __ERC721URIStorage_init();
//         __ERC721Burnable_init();
//         __Ownable_init();
//         __BaseRegistrarImplementation_init(_ens,_baseNode);
//     }

//     function __BaseRegistrarImplementation_init(ENS _ens, bytes32 _baseNode) internal onlyInitializing {
//         __BaseRegistrarImplementation_init_unchained( _ens, _baseNode);
//     }

//     function __BaseRegistrarImplementation_init_unchained(ENS _ens, bytes32 _baseNode) internal onlyInitializing {
//         ens = _ens;
//         baseNode = _baseNode;
//     }

//     function _baseURI() internal view virtual override returns (string memory) {
//         return _baseTokenURI; //"ipfs://mehu4wWNM/"
//     }

//     function setBaseURI(string calldata baseURI) external onlyOwner {
//         _baseTokenURI = baseURI;
//     }	

//     modifier live {
//         require(ens.owner(baseNode) == address(this));
//         _;
//     }

//     modifier onlyController {
//         require(controllers[msg.sender]);
//         _;
//     }



//     /**
//      * @dev Gets the owner of the specified token ID. Names become unowned
//      *      when their registration expires.
//      * @param tokenId uint256 ID of the token to query the owner of
//      * @return address currently marked as the owner of the given token ID
//      */
//     function ownerOf(uint256 tokenId) public view override(IERC721, ERC721Upgradeable) returns (address) {
//         require(expiries[tokenId] > block.timestamp);
//         return super.ownerOf(tokenId);
//     }

//     // Authorises a controller, who can register and renew domains.
//     function addController(address controller) external override onlyOwner {
//         controllers[controller] = true;
//         emit ControllerAdded(controller);
//     }

//     // Revoke controller permission for an address.
//     function removeController(address controller) external override onlyOwner {
//         controllers[controller] = false;
//         emit ControllerRemoved(controller);
//     }

//     // Set the resolver for the TLD this registrar manages.
//     function setResolver(address resolver) external override onlyOwner {
//         ens.setResolver(baseNode, resolver);
//     }

//     // Returns the expiration timestamp of the specified id.
//     function nameExpires(uint256 id) external view override returns(uint) {
//         return expiries[id];
//     }

//     // Returns true iff the specified name is available for registration.
//     function available(uint256 id) public view override returns(bool) {
//         // Not available if it's registered here or in its grace period.
//         return expiries[id] + GRACE_PERIOD < block.timestamp;
//     }

//     /**
//      * @dev Register a name.
//      * @param id The token ID (keccak256 of the label).
//      * @param owner The address that should own the registration.
//      * @param duration Duration in seconds for the registration.
//      */
//     function register(uint256 id, address owner, uint duration) external override returns(uint) {
//       return _register(id, owner, duration, true);
//     }

//     /**
//      * @dev Register a name, without modifying the registry.
//      * @param id The token ID (keccak256 of the label).
//      * @param owner The address that should own the registration.
//      * @param duration Duration in seconds for the registration.
//      */
//     function registerOnly(uint256 id, address owner, uint duration) external returns(uint) {
//       return _register(id, owner, duration, false);
//     }

//     function _register(uint256 id, address owner, uint duration, bool updateRegistry) internal live onlyController returns(uint) {
//         require(available(id));
//         require(block.timestamp + duration + GRACE_PERIOD > block.timestamp + GRACE_PERIOD); // Prevent future overflow

//         expiries[id] = block.timestamp + duration;
//         if(_exists(id)) {
//             // Name was previously owned, and expired
//             _burn(id);
//         }
//         _mint(owner, id);
//         if(updateRegistry) {
//             ens.setSubnodeOwner(baseNode, bytes32(id), owner);
//         }

//         emit NameRegistered(id, owner, block.timestamp + duration);

//         return block.timestamp + duration;
//     }

//     function renew(uint256 id, uint duration) external override live onlyController returns(uint) {
//         require(expiries[id] + GRACE_PERIOD >= block.timestamp); // Name must be registered here or in grace period
//         require(expiries[id] + duration + GRACE_PERIOD > duration + GRACE_PERIOD); // Prevent future overflow

//         expiries[id] += duration;
//         emit NameRenewed(id, expiries[id]);
//         return expiries[id];
//     }

//     /**
//      * @dev Reclaim ownership of a name in ens, if you own it in the registrar.
//      */
//     function reclaim(uint256 id, address owner) external override live {
//         require(_isApprovedOrOwner(msg.sender, id));
//         ens.setSubnodeOwner(baseNode, bytes32(id), owner);
//     }

//     function supportsInterface(bytes4 interfaceID) public override(IERC165,ERC721Upgradeable,ERC721EnumerableUpgradeable) view returns (bool) {
//         return interfaceID == INTERFACE_META_ID ||
//                interfaceID == ERC721_ID ||
//                interfaceID == RECLAIM_ID||super.supportsInterface(interfaceID);
//               // return interfaceId == type(IERC721EnumerableUpgradeable).interfaceId || super.supportsInterface(interfaceId);
//     }
	

//     function _burn(uint256 tokenId)
//         internal
//         override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
//     {
//         super._burn(tokenId);
//     }

//     function tokenURI(uint256 tokenId)
//         public
//         view
//         override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
//         returns (string memory)
//     {
//         return super.tokenURI(tokenId);
//     }

// }