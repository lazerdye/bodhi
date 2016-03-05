const winston = require('winston')
const util = require('util')
const insight = require('./insight')
const address = require('./address_view')
const blocks = require('./block_view')

winston.add(winston.transports.File, {
  filename: 'console.log',
  level: 'debug',
  json: false
})
winston.remove(winston.transports.Console)

var blessed = require('blessed')
var contrib = require('blessed-contrib')
var sprintf = require('sprintf-js').sprintf
var nunjucks = require('nunjucks')
var env = new nunjucks.Environment()

env.addFilter('shorten', function (str, count) {
  return str.slice(0, count || 5)
})

const _insight = new insight.Insight()
_insight.listen()

var screen = blessed.screen({
  smartCSR: true
})

var grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen
})

var form = grid.set(0, 0, 1, 10, blessed.form, {
  parent: screen,
  label: 'Command'
})

var input = blessed.textbox({
  parent: form,
  name: 'command',
  inputOnFocus: true
})

input.key(['enter'], function (ch, key) {
  return form.submit()
})

form.on('submit', function (data) {
  processCommand(data.command)
  form.reset()
  screen.render()
})

const transactions = grid.set(0, 10, 8, 2, contrib.log, {
  label: 'Transactions'
})
const statusLog = grid.set(8, 0, 4, 12, contrib.log, {
  label: 'Log'
})
const info = grid.set(1, 0, 7, 10, contrib.markdown, {
  scrollable: true,
  scrollbar: true
})

const addressView = new address.AddressView(_insight, info, env, {})
const blockView = new blocks.BlockView(_insight, info, env, {})

_insight.onTransaction(function (tx) {
  transactions.log(sprintf('%.8s: %14.8f', tx.txid, tx.valueOut))
})

var GridLogger = winston.transports.CustomLogger = function (options) {
  this.name = 'gridLogger'
  this.level = options.level || 'info'
}
util.inherits(GridLogger, winston.Transport)

GridLogger.prototype.log = function (level, msg, meta, callback) {
  statusLog.log(msg)
  callback(null, true)
}

winston.add(GridLogger, {})

screen.key(['q', 'escape', 'C-c'], function (ch, key) {
  return process.exit(0)
})

screen.key('enter', function (ch, key) {
  input.focus()
})

screen.key('pageup', function (ch, key) {
  info.scroll(-5, true)
  screen.render()
})

screen.key('pagedown', function (ch, key) {
  info.scroll(5, true)
  screen.render()
})

screen.key(['b'], showBlocks)

screen.key(['a'], function () {
  form.reset()
  input.setValue('address ')
  input.focus()
  screen.render()
})

var show

_insight.onNewBlockHash(function (hash) {
  winston.info('New hash: %s', hash)
  if (show === 'block') {
    blockView.show(hash).catch(function (err) {
      winston.error('Failure to load block: ' + err)
    })
  }
})

var showBlocks = function () {
  show = 'block'
  return _insight.getBlockHeight().then(function (height) {
    return _insight.getBlockIndex(height)
  }).then(function (hash) {
    return blockView.show(hash)
  }).catch(function (err) {
    winston.error('Failure to load block: ' + err)
  })
}

var showAddress = function (address) {
  show = 'address'
  return addressView.show(address).then(function (data) {
    winston.debug('Address ret: %s', data)
    screen.render()
  }).catch(function (err) {
    winston.error('Failure to load address: ' + err)
  })
}

var processCommand = function (command) {
  winston.info('Command: %s', command)
  var parts = command.split(/[ ,]+/)
  if (parts.length === 0) {
    return
  }
  if (parts[0].startsWith('e')) {
    return process.exit(0)
  } else if (parts[0].startsWith('a')) {
    if (parts.length < 2) {
      winston.warn('Missing option to address command')
    } else {
      showAddress(parts[1])
    }
    return
  } else if (parts[0].startsWith('b')) {
    showBlocks()
    return
  } else {
    winston.info('Unknown command: %s', parts)
    return
  }
}

showBlocks()
