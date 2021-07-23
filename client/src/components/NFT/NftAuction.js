import React, { Component,} from 'react';
import ReactFileReader from 'react-file-reader';
import { Grid, Button, Form, Image, Input, Label, Icon } from 'semantic-ui-react';
import Formate from '../../utils/Formate';
import SendToIPFS from '../../utils/SendToIPFS';
import FetchFromIPFS from '../../utils/FetchFromIPFS';
import "../../App.css";
// import {
//     Link,
//     useHistory,
//   } from 'react-router-dom'
//import BigNumber from 'bignumber.js'

// var web3 = require('web3');
// async function getFirstAccount() {
//     let accounts = await web3.eth.getAccounts()
//     console.log(accounts[2])
//     return accounts[2]
//   }

class NftAuction extends Component {

    state = {
        owner: '',
        image: '',
        amount: 0,
        filename: '',
        mint: '',
        base64: '',
        imageFromIPFS: '',
        imageID: '',
        imageCIDFromContract: '',
        id: null,
        highestBidder: '',
        highestBindingBid: 0,
        auctionState: '',
        roundNumber: 1
    }

    componentDidMount = async () => {
        //get the highest bidder and highest binding bid
        let highestBidder = await this.props.contractNFT.methods.highestBidder().call();
        let highestBindingBid = await this.props.contractNFT.methods.highestBindingBid().call();
        highestBindingBid = await this.props.web3.utils.fromWei(highestBindingBid.toString());

        // store initial states for auction
        this.setState({
            highestBidder,
            highestBindingBid: Formate(highestBindingBid),
            });

        // auctionState === '0' ?
        //     this.setState({ auctionState: 'Running' }) :
        //     this.setState({ auctionState: 'Ended' });
    }

    handleFiles = async files => {
        this.setState({
            filename: files.fileList[0].name,
            base64: files.base64,
            mint: 'yes',
            imageCID: '',
            bid: 0
        });

    }
    
    
    onButtonClick = async e => {
        //e.preventDefault();
        console.log('here')
        this.setState({ mint: '' });

        // send the image to ipfs and get its cid
        let CID = await SendToIPFS(this.state.base64);

        // Mint the image and store its CID to the Blockchain
        await this.props.contractNFT.methods
            .createImage(CID).send({ from: this.props.account,
                gas: 1500000,
                gasPrice: '3000000000', 
            });

        // Now the image has been minted, one can get its CID from the contract
        // First let's get the ID that has been stored to the contract,
        // it ensures all information are coming from the Blockchain.
        // let sender = await getFirstAccount()   
        let imageID = await this.props.contractNFT.methods
            .imageIDs(CID).call();
         
        let imageCID = await this.props.contractNFT.methods.images(imageID).call();

        // get the owner of the image from the contract
        const owner = await this.props.contractNFT.methods.ownerOf(imageID).call();

        this.setState({
            imageID,
            imageCID,
            owner,
            imageFromIPFS: await FetchFromIPFS(imageCID)
        });
    }

    onPlaceBidButtonClick = async () => {
        // convert the bid to wei and send it to the contract
        const bid = await this.props.web3.utils.toWei(this.state.bid.toString());
        console.log("BID =", bid);
        console.log("THIS ACCOUNT =", this.props.account);

        await this.props.contractNFT.methods.bid(bid)
            .send({ from: this.props.account, value: bid });

        

    }
    onSubmitBidButtonClick = async () => {
        
    }

    onAuctionEnded = async () => {
        // Only the owner can cancel the auction (requires in the contract)
        

        // update the auction's state

    }

    onAuctionTerminated = async () => {
        // Each participant should click this button either
        //for the refund or to get the NFT image(winner)
        

        // update the auction's state

        // get the new owner of the image from the contract and set it to state variable
        const owner = await this.props.contractNFT.methods.ownerOf(this.state.id).call();
        this.setState({ owner });
    }
    onRefundButtonClick = async () =>{

    } 
    onNextRoundClick = async () => {
        // update the highest bidder and highest binding bid
        let highestBidder = await this.props.contractNFT.methods.highestBidder().call();
        let highestBindingBid = await this.props.contractNFT.methods.highestBindingBid().call();
        highestBindingBid = await this.props.web3.utils.fromWei(highestBindingBid.toString());
        let roundNUmber = this.state.roundNumber;
        roundNUmber++;       
        this.setState({
            highestBidder,
            highestBindingBid: Formate(highestBindingBid),    
            roundNUmber        
        });
        
    }
    render() {
        return (
            <div className="ico">
                <div className="token-info">
                    <h1>Welcome to  {this.props.imageName} Auction</h1>                    
                    <h3>highest bidder: {this.state.highestBidder} </h3>
                    <h3 className="pad-bott">highest binding bid: {this.state.highestBindingBid} </h3>
                    <h3>Round Number: {this.state.roundNumber} </h3>
                    <Button color='red' onClick={this.onAuctionEnded}>
                        End auction
                    </Button>
                    
                    <br></br>
                    <br></br>
                    <span className='input-btn'>
                        <Input placeholder='Amount' onChange={e => { this.setState({ id: e.target.value }) }}>
                        </Input>
                    </span>
                    <Button color='blue' onClick={this.onRefundButtonClick}>
                        Refund
                    </Button>
                    <Button color='blue' onClick={this.onAuctionTerminated}>
                        Next round
                    </Button>
                </div>
                <hr></hr>

                <div className='token-grid'>
                    <Grid columns={3} celled stackable>
                        <Grid.Row>
                            <Grid.Column textAlign='center' width={4}>
                                <h2>Mint an image or bid <Icon name='hand point right' color='orange' />
                                    <br></br>
                                for existing image</h2>
                                <br></br>
                                Upload image
                                <br></br>
                                <div className='token-buy-input'>
                                    <Form size="large">
                                        <Form.Field>
                                            <ReactFileReader
                                                fileTypes={[".png", ".jpeg", ".gif", ".pdf", ".psd", ".eps", ".ai", ".indd", ".tiff", ".bmp"]}
                                                base64={true} handleFiles={this.handleFiles}
                                            >
                                                {
                                                    this.state.mint === '' ?
                                                        <Button>Upload</Button> :
                                                        <p></p>
                                                }
                                            </ReactFileReader>
                                        </Form.Field>

                                        {
                                            this.state.mint !== '' ?
                                                <Button primary onClick={this.onButtonClick}>Mint</Button> :
                                                console.log('Waiting for file upload')
                                        }

                                    </Form>
                                </div>
                            </Grid.Column>
                            <Grid.Column textAlign='center' width={4}>
                                <h2>Your bid</h2>
                                <br></br>
                                {/* {this.props.contractNFT.bids[this.props.account]().call()} */}
                                <br></br>
                                <div className='token-buy-input'>
                                    <Input labelPosition='right' type='text' placeholder='min: 1 ETH'>
                                        <Label basic>Amout</Label>
                                        <input
                                            onChange={e => { this.setState({ bid: e.target.value }) }}
                                        />
                                    </Input>
                                </div>

                                <br></br>
                                <div className='token-buy-input'>
                                    <Button color='orange' onClick={this.onPlaceBidButtonClick}>
                                       Place Bid
                                    </Button>
                                    <Button color='orange' onClick={this.onSubmitBidButtonClick}>
                                       Submit Bid
                                    </Button>
                                </div>
                                <br></br>
                            </Grid.Column>
                            <Grid.Column textAlign='center' width={8}>
                                <h2>NFT image</h2>
                                <br></br>
                                ID: <strong>{this.state.imageID}</strong>
                                <br></br>
                                owner: <strong>{this.state.owner}</strong>
                                <br></br>
                                {
                                    this.state.imageID !== '' ?
                                        <div className='img-center'>
                                            <Image
                                                src={this.state.imageFromIPFS}
                                                size='medium'
                                            />
                                        </div>
                                        :
                                        console.log("load image")
                                }
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </div>

            </div>
        );
    }
}

export default NftAuction
