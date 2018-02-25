const EventEmitter = require('eventemitter3');
const bitcoin = require('bitcoin');
const Web3 = require('web3');

module.exports = class BlockNotify extends EventEmitter {
  constructor (opts) {
    super();
    this.rpc = {};
    this.coins = [];
    this.blocks = {};
    this.timers = {};
    this.ethfilter;
    this.opts = opts;
  }
  async start () {
    setImmediate(async () => {
      for (const opts of this.opts) {
        this.coins.push(opts.coin);
        if (opts.family == 'btc') {
          this.rpc[opts.coin] = new bitcoin.Client(opts.rpc);
        } else if (opts.family == 'eth') {
          this.rpc[opts.coin] = new Web3(new Web3.providers.HttpProvider(`http://${opts.rpc.host}:${opts.rpc.port}`)).eth;
        }
        this.blocks[opts.coin] = await this.getLatestBlock(opts.coin);
      }
      await this._listen();
    });
  }
  getLatestBlock (coin) {
    if (coin !== 'eth') {
      return new Promise((resolve, reject) => {
        this.rpc[coin].cmd('getblockchaininfo', (err, res) => {
          if (err) reject(err);
          resolve({ height: res.blocks, hash: res.bestblockhash });
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        this.rpc[coin].getBlockNumber((err, res) => {
          if (err) reject(err);
          resolve({ height: res });
        });
      });
    }
  }
  async _listen () {
    for (const coin of this.coins) {
      if (coin == 'eth') {
        console.log('Listening for new blocks started for', coin);
        this.ethfilter = this.rpc.eth.filter('latest');
        this.ethfilter.watch(async (error, result) => {
          if (!error) {
            this.rpc.eth.getBlock(result, true, (err, r) => {
              if (this.blocks[coin].height < r.number) {
                this.blocks[coin].height = r.number;
                this._emit(coin, r);
              }
            });
          }
        });
      } else {
        console.log('Listening for new blocks started for', coin);
        this.timers[coin] = setInterval(async () => {
          const blockinfo = await this.getLatestBlock(coin);
          if (this.blocks[coin].height < blockinfo.height) {
            this.blocks[coin].height = blockinfo.height;
            this.blocks[coin].hash = blockinfo.hash;
            this.rpc[coin].cmd('getblock', blockinfo.hash, (err, r) => {
              if (!err) {
                this._emit(coin, r);
              }
            });
          }
        }, 30 * 1000);
      }
    }
  }
  close () {
    for (const timers of Object.values(this.timers)) {
      clearInterval(timers);
    }
    this.ethfilter.stopWatching();
    console.log('Coinblock stopped');
  }
  _emit (coin, blockObj) {
    this.emit('newBlock', { coin, data: blockObj });
  }
};
