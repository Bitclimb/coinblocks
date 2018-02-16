## coinblocks

- An event notifier for crypto currencies that emits an event once a new block is found on it's chain, supports btc-like coins and eth coins

### Installation

```bash
npm install coinblocks --save
```

### Options

- options[Array]

```js
const opts = [{
  coin: 'tbtc',
  rpc: {
    'host': '127.0.0.1',
    'port': 18332,
    'user': 'rpcusername',
    'pass': 'rpcpass',
    'timeout': 30000
  },
  'family': 'btc'
},
{
  coin: 'doge',
  'rpc': {
    'host': '127.0.0.1',
    'port': 22555,
    'user': 'rpcusername',
    'pass': 'rpcpass',
    'timeout': 30000
  },
  'family': 'btc'
},
{
  coin: 'eth',
  'rpc': {
    'host': '127.0.0.1',
    'port': 8545,
    'user': '',
    'pass': '',
    'timeout': 30000
  },
  'family': 'eth'
}];
```

### Usage

```js
const CoinBlocks = require('coinblocks');

// options from previous example
const coinblocks = new CoinBlocks(options);

//register a listener
coinblocks.on('newBlock', obj => {
  console.log('new block triggered for', obj.coin);
  console.log('block data info', obj.data);
});

//start coinblocks
coinblocks.start();

setTimeout(() => {
  // stops coinblocks
  coinblocks.close();
}, 10000);
```