// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract AttendancePOAP is ERC721, Ownable {
    using ECDSA for bytes32;

    address public eventSigner;
    string private _baseTokenURI;

    uint256 private _nextTokenId = 1;
    mapping(address => bool) public hasMinted;

    event AttendanceMinted(address indexed attendee, uint256 indexed tokenId);
    event EventSignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_,
        address initialEventSigner,
        address initialOwner
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        require(initialEventSigner != address(0), "invalid signer");
        eventSigner = initialEventSigner;
        _baseTokenURI = baseTokenURI_;
    }

    function mint(bytes calldata signature) external {
        require(!hasMinted[msg.sender], "already minted");

        bytes32 digest = keccak256(
            abi.encodePacked(address(this), block.chainid, msg.sender)
        );
        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(digest);
        address recovered = ECDSA.recover(ethSigned, signature);

        require(recovered == eventSigner, "invalid event signature");

        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;
        hasMinted[msg.sender] = true;
        _safeMint(msg.sender, tokenId);

        emit AttendanceMinted(msg.sender, tokenId);
    }

    function setEventSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "invalid signer");
        address oldSigner = eventSigner;
        eventSigner = newSigner;
        emit EventSignerUpdated(oldSigner, newSigner);
    }

    function setBaseTokenURI(string calldata newBaseTokenURI) external onlyOwner {
        _baseTokenURI = newBaseTokenURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @dev All POAPs share the same metadata, so ignore tokenId and return the base URI directly.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _baseTokenURI;
    }
}