// Code to show the status of an address.
var logging = require('winston')

var AddressView = exports.AddressView = function (insight, markdown, templ, options) {
  this._i = insight
  this._markdown = markdown
  this._templ = templ
}

AddressView.TEMPLATE = `
Address {{a.addrStr}} with balance: {{a.balance}}
* **Total Sent**: {{a.totalSent}}
* **Total Received**: {{a.totalReceived}}
* **Transactions**: {{a.txApperances}}{% if unconfirmedTxApperances %} ({{ a.unconfirmedTxApperances }} unconfirmed){% endif %}
{%- for tx in a.transactions %}
* {{ tx }}: {% if txs[tx] and txs[tx].dir -%}
{% if txs[tx].dir == 'vin' -%}
Sent: {{ txs[tx].value }} ({{ txs[tx].confirmations }} confirmations)
{% elif txs[tx].dir == 'vout' -%}
Recv: {{ txs[tx].value }} ({{ txs[tx].confirmations }} confirmations)
{% endif -%}
{% else -%}
 ...
{% endif %}
{%- else %}
* (No transactions)
{%- endfor %}
`

AddressView.prototype.show = function (address) {
  const self = this
  this._address = address
  this._transactions = {}

  return this._i.getAddress(address).then(function (addressData) {
    logging.debug('addressData: %s', JSON.stringify(addressData))
    for (var i = 0; i < addressData.transactions.length; i++) {
      var tx = addressData.transactions[i]
      self._transactions[tx] = {}
    }
    self._markdown.scrollTo(0)
    self._redraw(addressData)
    return self._loadTransactions(addressData)
  })
}

AddressView.prototype._redraw = function (addressData) {
  const text = this._templ.renderString(AddressView.TEMPLATE, {
    'a': addressData,
    'txs': this._transactions
  })
  this._markdown.setMarkdown(text)
}

AddressView.prototype._loadTransactions = function (addressData) {
  const self = this
  const address = addressData.addrStr
  return self._i.getTransactions(address).then(function (txData) {
    logging.info('Transactions: ' + JSON.stringify(txData))
    for (var i = 0; i < txData.txs.length; i++) {
      var item = txData.txs[i]
      var mainTx = item.txid
      var confirmations = item.confirmations
      for (var vi = 0; vi < item.vin.length; vi++) {
        var vin = item.vin[vi]
        if (vin.addr === address) {
          logging.debug('Incoming transaction: %s', JSON.stringify(vin))
          self._transactions[vin.txid] = {
            'dir': 'vin',
            'value': vin.value,
            'spent': true,
            'confirmations': confirmations
          }
        }
      }
      for (var vo = 0; vo < item.vout.length; vo++) {
        var vout = item.vout[vo]
        if (!vout.scriptPubKey.addresses) {
          // Not a value transfer transaction.
        } else if (vout.scriptPubKey.addresses.length !== 1) {
          // Might be a multisig transaction.
          logging.debug('vout had unexpected number of scriptPubKeys: %s', vout)
        } else {
          if (vout.scriptPubKey.addresses[0] === address) {
            logging.debug('Outgoing transaction: %s', JSON.stringify(vout))
            var tx = vout.spentTxId
            if (!tx) {
              tx = mainTx
            }
            logging.debug('Transaction id: %s', tx)
            self._transactions[tx] = {
              'dir': 'vout',
              'value': vout.value,
              'spent': !!vout.spentTxId,
              'confirmations': confirmations
            }
          }
        }
      }
    }
    self._redraw(addressData)
  })
}
