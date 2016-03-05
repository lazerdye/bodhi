// Code to show block information.
const logging = require('winston')

var BlockView = exports.BlockView = function (insight, markdown, templ, options) {
  this._i = insight
  this._markdown = markdown
  this._templ = templ
}

BlockView.TEMPLATE = `
Block {{height}} with {{tx.length}} transactions:
* **Hash**: {{hash}}
* **Time**: {{time}}
* **Size**: {{size}}
* **Difficulty**: {{difficulty}}
* **Version**: {{version}} ({{bits}})
* **MerkleRoot**: {{merkleroot}}
{% if poolInfo %}
* **Pool**: {{poolInfo.poolName}} {{poolInfo.url}}
{% endif %}
`

BlockView.prototype.show = function (blockHash) {
  const self = this
  logging.info('Show block: %s', JSON.stringify(blockHash))
  return this._i.getBlock(blockHash).then(function (block) {
    self._markdown.setMarkdown(self._templ.renderString(BlockView.TEMPLATE, block))
  })
}
