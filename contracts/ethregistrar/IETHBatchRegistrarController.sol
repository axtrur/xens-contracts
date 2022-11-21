pragma solidity >=0.8.4;

import "./BaseRegistrarImplementation.sol";

interface IETHBatchRegistrarController {
    function rentPrice(string memory, uint256, BaseRegistrarImplementation[] calldata)
        external
        returns (uint256);

    function available(string memory, BaseRegistrarImplementation[] calldata) external returns (bool);

    function makeCommitment(
        string memory,
        address,
        bytes32,
        address
    ) external returns (bytes32);

    function commit(bytes32) external;

    function register(
        string calldata,
        address,
        uint256,
        bytes32,
        address,
        BaseRegistrarImplementation[] calldata
    ) external payable;

    function renew(string calldata, uint256, BaseRegistrarImplementation[] calldata) external payable;
}
