# node-solr-lambda

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)


# Examples
```js
const solr = require('node-solr-lambda').prepareSolrClient()
solr.ping('my_core')
solr.select({q:'label:something'},'my_core')
```

```js
const solr = require('node-solr-lambda').prepareSolrClient({core:'my_core'})
solr.ping()
solr.select({q:'label:something'})
```
