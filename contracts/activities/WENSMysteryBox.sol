import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract WENSMysteryBox is ERC721Enumerable, Pausable, Ownable, ERC721Holder {

    enum Status {
        Paused,
        Preminting,
        Started
    }

    using Strings for uint256;

    event CollectionAddressAdded(address addr);

    Status public status = Status.Paused;
    bytes32 public root;
    address[] public collections;

    mapping(address => uint256) private _numberMinted;
    mapping(uint256 => uint256) private seeds;

    uint256 public MAX_MINT_PER_ADDR = 2;
    uint256 public MAX_MINT_PER_ADDR_PUBLIC = 2;
    string public boxURI = "ipfs://bafkreies2ij5yltw5yjscoezjwoec73zye3zvbtrhmulftgnomvgan6otq";

    uint256 public maxSupply = 111110;
    uint256 public allowlistSupply = 40000;
    uint256 public price = 99000000000000000; //0.099 ETHW
    uint256 public currentId = 1;
    bool public canOpen;

    constructor(address[] memory addrs) ERC721("WENS Mystery Box", "WENS-MBOX") {
        setAddressToCollection(addrs);
    }

    function numberMinted(address owner) public view returns (uint256) {
        return _numberMinted[owner];
    }

    function allowlistClaim(uint256 quantity, bytes32[] memory _proof) public payable {
        require(status == Status.Preminting, "not start");
        require(_verify(_leaf(msg.sender), _proof), "not in allowlist");
        require(currentId + quantity <= allowlistSupply, "out of allowlist supply");
        require(
            numberMinted(msg.sender) + quantity <= MAX_MINT_PER_ADDR,
            "exceeded"
        );
        claim(quantity);
    }

    function publicClaim(uint256 quantity) public payable {
        require(status == Status.Started, "not start");
        require(
            numberMinted(msg.sender) + quantity <= MAX_MINT_PER_ADDR_PUBLIC,
            "exceeded"
        );
        claim(quantity);
    }

    function claim(uint256 quantity) internal {
        require(tx.origin == msg.sender, "contract call not allowed");
        require(currentId + quantity <= maxSupply, "out of max supply");
        _numberMinted[msg.sender] += quantity;
        mint(msg.sender, quantity);
        checkPrice(price * quantity);
    }

    function open(uint256 tokenId) public {
        require(tx.origin == msg.sender, "contract call not allowed");
        require(canOpen, "not start");
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not token owner nor approved");
        uint256 seed = seeds[tokenId];
        address nftAddress = getCollection(seed, tokenId);
        require(nftAddress != address(0), "no reward");
        IERC721Enumerable nft = IERC721Enumerable(nftAddress);
        uint256 balance = nft.balanceOf(address(this));
        uint256 index = (seed + block.difficulty + tokenId + block.timestamp) % balance;
        uint256 rewardTokenId = nft.tokenOfOwnerByIndex(address(this), index);
        nft.safeTransferFrom(
            address(this),
            msg.sender,
            rewardTokenId
        );
        _burn(tokenId);
    }

    function mint(address to,uint256 quantity) internal {
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = currentId + i;
            _safeMint(to, tokenId);
            uint256 seed = (block.timestamp + block.difficulty + block.number + tokenId * 33 ) % 1000;
            seeds[tokenId] = seed;
        }
        currentId = currentId + quantity;
    }

    function checkPrice(uint256 cost) private {
        require(msg.value >= cost, "ETH is not enough");

        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function getCollection(uint256 seed, uint256 tokenId) private returns (address) {
        uint length = collections.length;
        uint256 index = (seed + tokenId + block.timestamp) % length;
        address collectionAddress = collections[index];
        if(IERC721(collectionAddress).balanceOf(address(this)) > 0) {
            return collectionAddress;
        }
        return getFallbackCollection();
    }

    function getFallbackCollection() private returns (address) {
        for (uint256 i = 0; i < collections.length; i++) {
            address collectionAddress = collections[i];
            if(IERC721(collectionAddress).balanceOf(address(this)) > 0) {
                return collectionAddress;
            }
        }
    }

    function addAddressToCollection(address addr) onlyOwner public returns(bool success) {
        collections.push(addr);
        emit CollectionAddressAdded(addr);
        success = true;
    }

    function setAddressToCollection(address[] memory addrs) onlyOwner public {
        delete collections;
        for (uint256 i = 0; i < addrs.length; i++) {
            addAddressToCollection(addrs[i]);
        }
    }

    function setAmount(uint256 amount) public onlyOwner {
        MAX_MINT_PER_ADDR = amount;
    }

    function setPublicAmount(uint256 amount) public onlyOwner {
        MAX_MINT_PER_ADDR_PUBLIC = amount;
    }

    function setAllowlistSupply(uint256 supply) public onlyOwner {
        require(supply < maxSupply, 'exceeded');
        allowlistSupply = supply;
    }

    function setPrice(uint256 newPrice) public onlyOwner {
        price = newPrice;
    }

    function setStatus(Status newStatus) public onlyOwner {
        status = newStatus;
    }

    function setOpenStatus(bool newStatus) public onlyOwner {
        canOpen = newStatus;
    }

    function withdraw() public payable onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function emergencyWithdrawNFT(address nftAddress, uint256 tokenId) public onlyOwner {
        IERC721 nft = IERC721(nftAddress);
        nft.safeTransferFrom(address(this), owner(), tokenId);
    }

    function tokenURI(uint256 tokenId)
    public
    view
    override
    returns (string memory)
    {
        string memory baseURI = _baseURI();
        return
        bytes(baseURI).length != 0
        ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json"))
        : boxURI;
    }

    function setRoot(uint256 _root) public onlyOwner {
        root = bytes32(_root);
    }

    function _leaf(address account) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof)
    internal
    view
    returns (bool)
    {
        return MerkleProof.verify(proof, root, leaf);
    }
}