pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "../resolvers/PublicResolver.sol";
import "./StringUtils.sol";
import "../registry/ENS.sol";
import "./BaseRegistrarImplementation.sol";

contract TokenURIBuilder {
    using StringUtils for *;

    BaseRegistrarImplementation public nft;

    constructor(BaseRegistrarImplementation _nft) {
        nft = _nft;
    }


    function formatName(string memory name) private view returns(string memory) {
        uint len = name.strlen();
        if(len >= 20) {
            string memory x = name.substring(0, 19);
            return string(abi.encodePacked(x, '...'));
        }
        return name;
    }


    function tokenURI(uint256 tokenId) public view returns (string memory) {
        string[7] memory parts;
        string memory name = nft.getName(tokenId);
        string memory wensName = string(abi.encodePacked(name, '.', nft.baseName()));

        uint len = name.strlen();

        string memory displayName = string(abi.encodePacked(formatName(name), '.', nft.baseName()));
        parts[0] = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500" height="500" viewBox="0 0 500 500"><path id="a" d="M0 0h500v500H0z"/><g fill="none" fill-rule="evenodd"><path fill="#000000" d="M0 0h500v500H0z"/><mask id="b" fill="#fff"><use xlink:href="#a"/></mask><g mask="url(#b)"><path fill-opacity=".1" fill="#00f28d" d="M250-12l111.75 160.375L512 250 361.75 358 250 512 138.25 358-12 250l150.25-101.625z"/><path fill-opacity=".1" fill="#A192FF" d="M250-115.75l156 224L615.75 250 406 400.75l-156 215-156-215L-115.75 250 94 108.25z"/><path fill-opacity=".1" fill="#00f28d" d="M250-260.5L467.75 52.125 760.5 250 467.75 460.375 250 760.5 32.25 460.375-260.5 250 32.25 52.125z"/></g><text font-family="arial" font-size="32" font-weight="500" fill="#00f28d"><tspan x="50%" y="265" text-anchor="middle">';
        parts[1] = displayName;
        parts[2] = '</tspan></text></g></svg>';

         string memory output = string(abi.encodePacked(
                 parts[0], parts[1], parts[2]
         ));

         string memory json = Base64.encode(bytes(string(abi.encodePacked('{"name": "', wensName, '", "description":"', wensName, ', an web3 domain name for builder dao.", "attributes":[{"trait_type":"Length","display_type":"number","value": "', Strings.toString(len) ,'"},{"trait_type":"Expiration Date","display_type":"date","value":"' , Strings.toString(nft.nameExpires(tokenId)) ,'"}], "image": "data:image/svg+xml;base64,', Base64.encode(bytes(output)), '"}'))));
         output = string(abi.encodePacked('data:application/json;base64,', json));

         return output;
    }
}
