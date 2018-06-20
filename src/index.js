const url = require('url')
const axios = require('axios')

const defaultConfig = {
  hostname: 'localhost',
  port: 8983,
  protocol: 'http'
}

const ensureArray = x => x instanceof Array ? x : [x]

const solrPost = config => path => (data, coreOpt = '') => {
  const core = coreOpt || config.core
  if (!core) {
    throw new Error('core not specified')
  }

  const solrUrl = url.format({
    ...defaultConfig,
    ...config, // overrides defalt config
    pathname: `solr/${core}/${path}`,
    query: {
      wt: 'json',
      overwrite: true,
      commitWithin: 1000
    }
  })

  return axios.post(solrUrl, ensureArray(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'accept': 'application/json; charset=utf-8'
    }
  }).then(r => r.data)
}

const solrGet = config => path => (query = {}, coreOpt = '') => {
  const core = coreOpt || query.core || config.core
  if (!core) {
    throw new Error('core not specified')
  }

  delete query.core

  const solrUrl = url.format({
    ...defaultConfig,
    ...config, // overrides defalt config
    pathname: `solr/${core}/${path}`,
    query
  })

  return axios(solrUrl).then(r => r.data)
}

const prepareSolrClient = config => ({
  select: solrGet(config)('select'),
  ping: core => solrGet(config)('admin/ping')({ core }),
  add: solrPost(config)('update'),
  delete: () => Error('not implemented yet'),
  commit: () => Error('not implemented yet'),
  rollback: () => Error('not implemented yet'),
  spell: () => Error('not implemented yet'),
  optimize: () => Error('not implemented yet'),
  realTimeGet: () => Error('not implemented yet')
})

module.exports = {
  prepareSolrClient
}
