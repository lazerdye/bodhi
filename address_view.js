// Code to show the status of an address.
var logging = require('winston')

var AddressView = exports.AddressView = function (insight, markdown, templ, options) {
  this._i = insight
  this._markdown = markdown
  this._templ = templ
}

AddressView.TEMPLATE = `
Address {{addrStr}} with balance: {{balance}}
* **Total Sent**: {{totalSent}}
* **Total Received**: {{totalReceived}}
* **Transactions**: {{txApperances}}{% if unconfirmedTxApperances %} ({{ unconfirmedTxApperances }} unconfirmed){% endif %}
{%- for tx in transactions %}
* {{ tx|shorten(8) }}: {% if tx -%}
 ...
{% endif %}
{%- else %}
* (No transactions)
{%- endfor %}
`

AddressView.prototype.show = function (address) {
  const self = this
  this._address = address

  return this._i.getAddress(address).then(function (addressData) {
    logging.debug('addressData: %s', JSON.stringify(addressData))
    const text = self._templ.renderString(AddressView.TEMPLATE, addressData)
    self._markdown.scrollTo(0)
    self._markdown.setMarkdown(text)
  })
}
