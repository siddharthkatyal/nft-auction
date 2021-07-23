import React, { Component } from "react";
//import getNFTContract from './getNFTContract';
import Formate from './utils/Formate';
import getWeb3 from "./getWeb3";
import Home from "../src/components/Home";
import 'semantic-ui-css/semantic.min.css'
import Web3 from 'web3'
import "./App.css";
import NFT from './contracts/ImageNFT.json';

require('dotenv').config();

class App extends Component {
  state = {
    web3: null,
    account: null,    
    contractNFT: null,   
    imageName: '',    
    imageSymbol: '',
    balanceETH: 0, 
    numberOfMintedImages: 0
  };

  componentDidMount = async () => {
    // try {
      // connect to web3 and get contract instances
      var Web3 = require('web3')
      var web3 = new Web3('http://localhost:7545')
      var NFT = require('./contracts/ImageNFT')
    
      
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = NFT.networks[networkId];
        const contract = new web3.eth.Contract(
            NFT.abi,
            deployedNetwork.address
        );
    
       
     
      //== ERC721 token contract
      console.log('ERC721 CONTRACT =', contract);

      const accounts = await web3.eth.getAccounts();

      // get eth balance and RPT balance of the user
      await web3.eth.getBalance(accounts[0], (err, balance) => {
        if (!err) {
          this.setState({ balanceETH: Formate(web3.utils.fromWei(balance, 'ether')) });
        }
      });

      

      // Update states
      this.setState(
        {
          web3,
          
          contractNFT: contract,
          
          account: accounts[0],
          
        },
        this.start
      );
    // } catch (error) {
    //   // Catch any errors for any of the above operations.
    //   alert(
    //     `Failed to load web3, accounts, or contract. Check console for details.`,
    //   );
    //   console.error(error);
    // }
  }

  start = async () => {    
    const { contractNFT } = this.state;
     
    this.getAccount();

    

    //==== ERC721 token


    // update states
    this.setState({
      
      imageName: await contractNFT.methods.name().call(),
      imageSymbol: await contractNFT.methods.symbol().call(),
      numberOfMintedImages: await contractNFT.methods.counter().call()

    });
  }

  getAccount = async () => {
    if (this.state.web3 !== null || this.state.web3 !== undefined) {
      await window.ethereum.on('accountsChanged', async (accounts) => {
        this.setState({
          account: accounts[0]
        });

        this.state.web3.eth.getBalance(accounts[0], (err, balance) => {
          if (!err) {
            this.setState({ balanceETH: Formate(this.state.web3.utils.fromWei(balance, 'ether')) });
          }
        });

        
      });
    }
  }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <Home
          web3={this.state.web3}
          account={this.state.account}
          balanceETH={this.state.balanceETH}
          contractNFT={this.state.contractNFT}
          imageName={this.state.imageName}
          imageSymbol={this.state.imageSymbol}
          numberOfMintedImages={this.state.numberOfMintedImages}
        />
      </div>
    );
  }
}

export default App;
