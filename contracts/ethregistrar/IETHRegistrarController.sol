pragma solidity >=0.8.4;

interface IETHRegistrarController {
    function rentPrice(string memory, uint256)
        external
        returns (uint256);

    function available(string memory) external returns (bool);

    function makeCommitment(
        string memory,
        address,
        bytes32,
        address,
        bool
    ) external returns (bytes32);

    function commit(bytes32) external;

    function register(
        string calldata,
        address,
        uint256,
        bytes32,
        address,
        bool
    ) external payable;

    function renew(string calldata, uint256) external payable;
}
