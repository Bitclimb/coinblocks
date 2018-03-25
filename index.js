const EventEmitter = require('eventemitter3');
const Client = require('bitcoin-core');
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
    const self = this;
    setImmediate(async () => {
      for (const opts of self.opts) {
        self.coins.push(opts.coin);
        if (opts.family == 'btc') {
          self.rpc[opts.coin] = new Client(opts.rpc);
        } else if (opts.family == 'eth') {
          self.rpc[opts.coin] = new Web3(`ws://${opts.rpc.host}:${opts.rpc.port}`);
        }
        self.blocks[opts.coin] = await self.getLatestBlock(opts.coin);
      }
      await self._listen();
    });
  }
  async getLatestBlock (coin) {
    const self = this;
    let res;
    if (coin !== 'eth') {
      res = await self.rpc[coin].command('getblockchaininfo');
      return { height: res.blocks, hash: res.bestblockhash };
    } else {
      res = await self.rpc[coin].eth.getBlockNumber();
      return { height: res };
    }
  }
  async _listen () {
    const self = this;
    for (const coin of self.coins) {
      if (coin == 'eth') {
        console.log('Listening for new blocks started for', coin);
        self.ethfilter = self.rpc[coin].eth.subscribe('newBlockHeaders');
        self.ethfilter.on('data', async result => {
          if (self.blocks[coin].height < result.number) {
            const r = await self.rpc[coin].eth.getBlock(result.number, true);
            self.blocks[coin].height = r.number;
            self._emit(coin, r);
          }
        });
        self.ethfilter.on('error', err => {
          console.error(err);
        });
      } else {
        console.log('Listening for new blocks started for', coin);
        self.timers[coin] = setInterval(async () => {
          const blockinfo = await self.getLatestBlock(coin);
          if (self.blocks[coin].height < blockinfo.height) {
            self.blocks[coin].height = blockinfo.height;
            self.blocks[coin].hash = blockinfo.hash;
            const r = await self.rpc[coin].command('getblock', blockinfo.hash);
            self._emit(coin, r);
          }
        }, 30 * 1000);
      }
    }
  }
  close () {
    const self = this;
    for (const timers of Object.values(self.timers)) {
      clearInterval(timers);
    }
    self.ethfilter.unsubscribe((error, success) => {
      if (success) { console.log('Successfully unsubscribed!'); }
    });
    console.log('Coinblock stopped');
  }
  _emit (coin, blockObj) {
    this.emit('newBlock', { coin, data: blockObj });
  }
};
