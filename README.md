# node-solr-lambda

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)


# Short example
```js
const {prepareSolrClient, defaultConfig} = require('node-solr-lambda')
const solr = prepareSolrClient({ ...defaultConfig, core:'mycore'})
solr.ping() // -> true if mycore exists
solr.select({q:'label:something'}).then(console.log)
```

# Example with async
```js
const {prepareSolrClient, defaultConfig} = require('node-solr-lambda')
const solr = prepareSolrClient({ ...defaultConfig, core:'mycore'})

main()
async main() {
  try {
    await solr.addField({ name:"myfield", type:"text_general" })
    const resp = await solr.select({q:'*:*'})
    console.log(resp)
  } catch(e) {
    console.error(e)
  }
}
```
