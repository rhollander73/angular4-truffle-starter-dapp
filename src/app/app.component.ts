import {Component, HostListener, NgZone} from '@angular/core';
import {canBeNumber} from '../util/validation';

const Web3 = require('web3');
const contract = require('truffle-contract');
const metaincoinArtifacts = require('../../build/contracts/MetaCoin.json');

declare let window: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  MetaCoin = contract(metaincoinArtifacts);

  // TODO add proper types these variables
  account: any;
  accounts: any;
  web3: any;

  balance: number;
  sendingAmount: number;
  recipientAddress: string;
  status: string;
  canBeNumber = canBeNumber;

  constructor(private _ngZone: NgZone) {

  }

  @HostListener('window:load')
  windowLoaded() {
    this.checkAndInstantiateWeb3();
    this.onReady();
  }

  private checkAndInstantiateWeb3() {
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof window.web3 !== 'undefined') {
      console.warn(
        'Using web3 detected from external source. ' +
        'If you find that your accounts don\'t appear or you have 0 MetaCoin, ' +
        'ensure you\'ve configured that source properly. ' +
        'If using MetaMask, see the following link. ' +
        'Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask'
      );
      // Use Mist/MetaMask's provider
      this.web3 = new Web3(window.web3.currentProvider);
    } else {
      console.warn(
        'No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, ' +
        'as it\'s inherently insecure. Consider switching to Metamask for development. ' +
        'More info here: http://truffleframework.com/tutorials/truffle-and-metamask'
      );
      // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
      this.web3 = new Web3(
        new Web3.providers.HttpProvider('http://localhost:8545')
      );
    }
  }

  private onReady() {
    // Bootstrap the MetaCoin abstraction for Use.
    this.MetaCoin.setProvider(this.web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    this.getAccountsPromise()
      .then(accs => this.getAccounts(accs))
      .catch(err => {
        console.log(err);
        alert('There was an error fetching your accounts.');
        return;
    });
  }

  private getAccounts(accs) {
    if (accs.length === 0) {
      alert('Couldn\'t get any accounts! Make sure your Ethereum client is configured correctly.');
      return;
    }
    this.accounts = accs;
    this.account = this.accounts[0];

    this.addTransferWatch();
    this._ngZone.run(() => this.refreshBalance());
  }

  private addTransferWatch() {
    this.MetaCoin.deployed().then(instance => this.getTransferWatch(instance))
  }

  private getTransferWatch(instance) {
    return instance.Transfer().watch((err, result) => this.refresh(err, result));
  }

  private refresh(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(result.args);
    // This is run from window:load and ZoneJS is not aware of it we
    // need to use _ngZone.run() so that the UI updates on promise resolution
    this._ngZone.run(() => this.refreshBalance());
  }

  private getAccountsPromise() {
    return new Promise((resolve, reject) => {
      this.web3.eth.getAccounts((err, accounts) => {
        if (err !== null) {
          reject(err)
        } else {
          resolve(accounts)
        }
      })
    });
  }

  private refreshBalance() {
    this.MetaCoin
      .deployed()
      .then(instance => instance.getBalance.call(this.account))
      .then(value => this.balance = value)
      .catch(err => {
        console.log(err);
        this.setStatus('Error getting balance; see log.');
      });
  }

  private setStatus(message) {
    this.status = message;
  }

  sendCoin() {
    const amount = this.sendingAmount;
    const receiver = this.recipientAddress;

    this.setStatus('Initiating transaction... (please wait)');

    this.MetaCoin
      .deployed()
      .then(instance => instance.sendCoin(receiver, amount, {from: this.account}))
      .then(tx => {
        console.log(tx);
        this.setStatus('Transaction complete!');
      })
      .catch(err => {
        console.log(err);
        this.setStatus('Error sending coin; see log.');
      });
  }
}
