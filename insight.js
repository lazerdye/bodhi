// Interface to access the BitPay insight server over socket.io and REST.
var colors = require('colors/safe')
var request = require('request-promise')
var logger = require('winston')

var Insight = exports.Insight = function (options) {
  options = options || {}
  this._api = options.api || 'https://insight.bitpay.com/'
}

Insight.prototype.listen = function () {
  var socket = require('socket.io-client')(this._api)
  this._socket = socket
  socket.on('connect', function () {
    socket.emit('subscribe', 'inv')

    logger.info(colors.green('Socket connected'))
  })
  socket.on('disconnect', function () {
    logger.error(colors.red('Socket disconnected'))
  })
}

Insight.prototype.onTransaction = function (cb) {
  this._socket.on('tx', function (data) {
    cb(data)
  })
}

Insight.prototype.onNewBlockHash = function (cb) {
  return this._socket.on('block', cb)
}

Insight.prototype._status = function () {
  return request(this._api + 'api/status').then(JSON.parse)
}

Insight.prototype.getBlockHeight = function () {
  return this._status().then(function (data) {
    return data.info.blocks
  })
}

Insight.prototype.getBlockIndex = function (height) {
  return request(this._api + 'api/block-index/' + height).then(JSON.parse).then(function (data) {
    return data.blockHash
  })
}

Insight.prototype.getBlock = function (hash) {
  logger.info('getBlock: api/block/' + hash)
  return request(this._api + 'api/block/' + hash).then(JSON.parse)
}

Insight.prototype.getAddress = function (address) {
  return request(this._api + 'api/addr/' + address).then(JSON.parse)
}

Insight.prototype.getTransactions = function (address) {
  return request(this._api + 'api/txs?pageLength=10&address=' + address).then(JSON.parse)
}
