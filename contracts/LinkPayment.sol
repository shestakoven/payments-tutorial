// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LinkPayment is Ownable {
    IERC20 public paymentToken; // USDC or other ERC20 token
    uint256 public constant COMMISSION_RATE = 10; // 10% commission
    uint256 public constant PAYMENT_INTERVAL = 30 minutes;

    struct Link {
        address owner;
        uint256 price;
        uint256 lastPayment;
        uint256 balance;
    }

    mapping(bytes32 => Link) public links;
    mapping(address => uint256) public userBalances;

    event LinkCreated(bytes32 indexed linkId, address indexed owner, uint256 price);
    event PaymentProcessed(bytes32 indexed linkId, address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
    }

    function createLink(bytes32 linkId, uint256 price) external {
        require(links[linkId].owner == address(0), "Link already exists");
        links[linkId] = Link({
            owner: msg.sender,
            price: price,
            lastPayment: block.timestamp,
            balance: 0
        });
        emit LinkCreated(linkId, msg.sender, price);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        userBalances[msg.sender] += amount;
    }

    function processPayments(bytes32[] calldata linkIds) external {
        for (uint i = 0; i < linkIds.length; i++) {
            Link storage link = links[linkIds[i]];
            require(link.owner != address(0), "Link does not exist");
            require(block.timestamp >= link.lastPayment + PAYMENT_INTERVAL, "Too early for payment");

            uint256 commission = (link.balance * COMMISSION_RATE) / 100;
            uint256 ownerAmount = link.balance - commission;

            // Transfer to owner
            require(paymentToken.transfer(link.owner, ownerAmount), "Transfer to owner failed");
            // Transfer commission to contract owner
            require(paymentToken.transfer(owner(), commission), "Transfer commission failed");

            link.lastPayment = block.timestamp;
            link.balance = 0;

            emit PaymentProcessed(linkIds[i], msg.sender, link.balance);
        }
    }

    function withdraw() external {
        uint256 amount = userBalances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        userBalances[msg.sender] = 0;
        require(paymentToken.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    function getLinkInfo(bytes32 linkId) external view returns (
        address owner,
        uint256 price,
        uint256 lastPayment,
        uint256 balance
    ) {
        Link storage link = links[linkId];
        return (link.owner, link.price, link.lastPayment, link.balance);
    }
} 