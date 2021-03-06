// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ImageNFT is ERC721("NFT Marketplace", "USTNFT") {
    //Variables Marketplace
    string[] public images;
    uint256 public counter;
    uint256 public ipfsHash;
    
    //Variables Auction
    uint256 public minimumBid;
    address payable public owner;
    address public auctioneer;
    address public highestBidder;
    uint256 public highestBindingBid;
    uint256 public roundNumber=1;
    uint256 public activeUsersCount;
    uint256 public copy;
    bytes32 public hashedBid;
    uint256 biddingEnd;
    uint256 revealEnd;
    uint256 biddingTime = 120 seconds; // bidding time is 150 seconds
    uint256 revealTime = 60 seconds; // bid revealing time is 60 seconds
    bool public ended;
    bool public cancelled;

    struct Bid {
        // 6 actual + 10 fake = 16
        // address Bidder;
        uint256 maskedBid;
        bytes32 saltHash;
    }

    mapping(string => bool) imageAlreadyMinted;
    mapping(string => uint256) public imageIDs;
   
   
    mapping(address => Bid[]) public bids;
    mapping(address => uint256) public pendingReturns;


// MODIFIERS
 
    modifier onlyBefore(uint256 _time) {
        require(block.timestamp < _time);
        _;
    }
    modifier onlyAfter(uint256 _time) {
        require(block.timestamp > _time);
        _;
    }
 
    modifier onlyAuctioneer() {
        require(msg.sender == auctioneer);
        _;
    }
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    modifier onlyNotOwner() {
        require(msg.sender != owner);
        _;
    }
    modifier onlyNotCancelled() {
        require(!cancelled);
        _;
    }
    modifier onlyValidWithdrawal() {
        require(msg.sender != highestBidder || cancelled == true);
        _;
    }
    modifier onlyNotEnded() {
        require(!ended);
        _;
    }
 
    // EVENTS
    event GetBlindBid(bytes32 indexed hashed);
    event roundEnded(address bidder, uint256 amount, uint256 userCount);
    event AuctionEnded(address winner, uint256 amount);
    event roundStarted(uint256 amount);

    //Constructors
        constructor(
        address payable _owner,
        uint256 _minimumBid,
        address _auctioneer
    ) {
        auctioneer = _auctioneer;
        owner = _owner;
        minimumBid = _minimumBid;
        biddingEnd = block.timestamp + biddingTime;
        revealEnd = biddingEnd + revealTime;
        //bufferTime = _bufferTime;
        roundNumber = 1;
    }
   
    //Functions
    function createImage(string memory _imageCID) public {
        // cannot mint the same image twice.
        // IPFS will be used to store images returning a unique CID (image URI).
        // Since CIDs are based on the image content, same image will always
        // return same CID.
        require(!imageAlreadyMinted[_imageCID], "image already minted");
        uint256 newImageId = counter;

        // store the image URI on the Blockchain
        images.push(_imageCID);

        // mint the image
        _safeMint(msg.sender, newImageId);

        // store the information that the image has been minted
        imageAlreadyMinted[_imageCID] = true;

        // store the image ID of the image in a mapping
        //faiods78dsagk => 0
        imageIDs[_imageCID] = newImageId;

        // transfer the ownership of the image
        owner = payable(ownerOf(newImageId));

        counter++;
    }

    function buyImage(uint256 _imageID) public payable returns (bool) {
        // ERC721 contract defines requires needed
        // Double checking would not be optimal since it costs gas

        // get the owner of the image. Always work with local variable
        // not state variable.
        address payable ownerAddress = payable(ownerOf(_imageID));

        require(msg.sender != ownerAddress, "ImageNFT: buy by owner");

        // cash out ETH
        require(
            msg.value != 0 && msg.value < msg.sender.balance,
            "ImageNFT: not enough eth"
        );
        payable(ownerAddress).transfer(msg.value);

        // transfer the token CID from the owner to the buyer
        // images cost 1 ETH
        require(msg.value == 1 ether, "ImageNFT: pay 1 ETH");
        _safeTransfer(ownerAddress, msg.sender, _imageID, "Enjoy!");

        return true;
    }

     function generateBlindedBidBytes32(uint256 value)
        payable
        public
        onlyNotEnded
        onlyNotOwner
       /// returns (bytes32)
    {
      
        hashedBid = keccak256(abi.encodePacked(value));
       // payable(owner).transfer(value);
       // bid(hashedBid);
       // emit GetBlindBid(hashedBid);
       // return hashedBid;
    }

    function gettBlindedBidBytes32() public view onlyNotEnded onlyNotOwner returns (bytes32) {
      //  bytes32 bidHashed = hashedBid;
       // emit getBlindBid(bidHashed);
       
        return hashedBid;
        
    }

 
    function bid(bytes32 _blindedBid)
        public
        payable
        onlyBefore(biddingEnd)
        onlyNotCancelled
    {
        // bids[msg.sender].push(
        //     Bid({blindedBid: _blindedBid, deposit: msg.value})
        // );
        // push is used as an array of structs exists and so, the newest struct is pushed into the array and forms the most recent element
        bids[msg.sender].push(
            Bid({maskedBid: msg.value, saltHash: _blindedBid})
        );
    }
 
    function revealAndPlaceBid(uint256 extraBid)
        public
        onlyAfter(biddingEnd)
        onlyBefore(revealEnd)
        onlyNotCancelled
        onlyNotEnded
    {
        uint256 totalBidValue;
 
        uint256 length = bids[msg.sender].length;
 
        bids[msg.sender][length - 1].maskedBid =
            bids[msg.sender][length - 1].maskedBid -
            extraBid;
 
        // this function merges both the bid reveal process and the bid placing process
        // To reveal the bid submitted by the user and place the bid (will return true if the bid is sucessfully placed)
 
        // 0x1234 => [[hdjwhksjkd, 1], [ervbcdbchebdskcb, 2]]
        // length measures the number of total bids submitted by the user in all rounds till now (single bid per round)
        require(length == roundNumber); // check to make sure the user has participated in all rounds of the auction till now
 
        Bid storage bidToCheck = bids[msg.sender][length - 1];
 
        require(bidToCheck.saltHash == keccak256(abi.encodePacked(extraBid)));
 
        for (uint256 i = 0; i < length; i++) {
            Bid storage roundBid = bids[msg.sender][i];
            totalBidValue += roundBid.maskedBid;
        }
 
        // totalBidValue -= extraBid;
 
        payable(msg.sender).transfer(extraBid);
 
        require(totalBidValue > minimumBid);
        // (when totalBidValue > minimumBid)
        if (totalBidValue > highestBindingBid) {
            highestBindingBid = totalBidValue;
            highestBidder = msg.sender;
        }
        pendingReturns[msg.sender] = totalBidValue;
        activeUsersCount++; // this must be reset / initialized at the start of every round
    }
 
    function roundEnd(uint256 _imageID)
        public
        onlyAfter(revealEnd)
        onlyAuctioneer
        onlyNotCancelled
        onlyNotEnded
    {
        // if will be the case where one round has ended, more than 1 user remains and the auction proceeds to the next round
        //roundEndTime = block.timestamp;
 
        // must check for a case where no users participate in a round
 
        if (activeUsersCount > 1) {
            emit roundEnded(highestBidder, highestBindingBid, activeUsersCount);
            roundStart();
            // minimumBid = highestBid;
            // activeUsersCount = 0;
            // roundNumber++;
        }
        // else will be the case where the auction has ended and only 1 user remains
        else {
            require(!ended);
            emit AuctionEnded(highestBidder, highestBindingBid);
            ended = true;
            // transfer the NFT to the highest bidder
            // transfer the winning bid to the NFT owner
            // transfer the NFT image to the highestBidder
            _safeTransfer(owner, highestBidder, _imageID, "Enjoy!");
            owner.transfer(highestBindingBid);

        }
    }

    // function roundNumberfun() public returns  (uint256 round_number)
    // {
    //     return 1;
    // }
    
    // function highestBidderfun() public returns  (uint256 round_number)
    // {
    //     return 1;
    // }

    // function highestBindingBidfun() public returns  (uint256 round_number)
    // {
    //     return 1;
    // }

    function roundStart() internal returns (uint256 roundStartBid) {
        minimumBid = highestBindingBid;
        activeUsersCount = 0;
        roundNumber++;
        biddingEnd = block.timestamp + biddingTime;
        revealEnd = biddingEnd + revealTime;
        emit roundStarted(minimumBid);
        return minimumBid;
    }
 
    function withdraw() public onlyValidWithdrawal returns (bool success) {
        // mention when a user can withdraw w.r.t the rounds taking place
        address withdrawalAccount;
        uint256 withdrawalAmount;
 
        withdrawalAccount = msg.sender;
        withdrawalAmount = pendingReturns[withdrawalAccount];
        if (withdrawalAmount > 0) {
            pendingReturns[withdrawalAccount] = 0;
            payable(withdrawalAccount).transfer(withdrawalAmount);
            return true;
        } else {
            return false;
        }
    }
 
    function cancelAuction()
        public
        onlyNotCancelled
        onlyNotEnded
        onlyAuctioneer
    {
        cancelled = true;
    }

}