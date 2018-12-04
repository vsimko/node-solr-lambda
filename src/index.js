// @ts-check
/**
 * @typedef {typeof defaultConfig} SolrConfig
 * @typedef {import(".").SolrDocument} SolrDocument
 * @typedef {import(".").SolrData} SolrData
 * @typedef {import(".").SolrResponse} SolrResponse
 * @typedef {import("axios").AxiosError} AxiosError
 * @typedef {import(".").SolrException} SolrException
 */

const url = require("url")
const { default: axios } = require("axios")

const defaultConfig = {
  hostname: "localhost",
  port: 8983,
  protocol: "http",
  debug: false,
  core: "",
  apiPrefix: "api/cores"
}

/** @type {(x:object) => object|object[]} */
const ensureArray = x => (Object(x) instanceof Array ? x : [x])

/**
 * @type {(config:SolrConfig) => (path:string) => (data:SolrData) => Promise<SolrResponse>}
 */
const solrPost = config => path => async data => {
  const { core, apiPrefix } = config
  const solrUrl = url.format({
    ...defaultConfig,
    ...config, // overrides defalt config
    pathname: `${apiPrefix}/${core}/${path}`,
    query: {
      wt: "json",
      overwrite: true,
      commitWithin: 1000
    }
  })

  if (config.debug) {
    console.debug(`\n$ curl '${solrUrl}' -d '${JSON.stringify(data)}'\n`)
  }

  const response = await axios.post(solrUrl, data, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      accept: "application/json; charset=utf-8"
    }
  })

  return response.data
}

/**
 * @type {(config:SolrConfig) => (path:string) => (query:any) => Promise<SolrResponse>}
 */
const solrGet = config => path => async query => {
  const core = query.core || config.core
  const { apiPrefix } = config

  // we don't want to alter the query structure
  const queryWithoutCore = { ...query }
  delete queryWithoutCore.core

  const solrUrl = url.format({
    ...defaultConfig,
    ...config, // overrides defalt config
    pathname: `${apiPrefix}/${core}/${path}`,
    query: queryWithoutCore // DO NOT rename the "query" parameter!
  })

  if (config.debug) {
    console.debug(`\n$ curl '${solrUrl}'\n`)
  }

  const response = await axios(solrUrl)
  return response.data
}

/**
 * Perform an operation on solr schema.
 * @see https://lucene.apache.org/solr/guide/7_5/schema-api.html#modify-the-schema
 * @param {SolrConfig} config
 */
const solrSchema = config => op => data =>
  solrPost(config)("schema")({ [op]: data })

/** @param {SolrConfig} config */
const prepareSolrClient = config => ({
  ping: () =>
    solrGet({ ...config, apiPrefix: "solr" })("admin/ping")({})
      .then(value => {
        return value.status === "OK"
      })
      .catch(() => false),

  /**
   * @param {SolrDocument} data */
  add: data => solrPost(config)("update")(ensureArray(data)),

  /**
   * @type {(data: import(".").FieldProperties) => Promise<SolrResponse>}
   * @see https://lucene.apache.org/solr/guide/7_5/schema-api.html#add-a-new-field
   */
  addField: solrSchema(config)("add-field"),

  /**
   * @type {(data:import(".").FieldTypeProperties) => Promise<SolrResponse>}
   * @see https://lucene.apache.org/solr/guide/7_5/schema-api.html#add-a-new-field-type
   */
  addFieldType: solrSchema(config)("add-field-type"),

  /**
   * @type {({name:string}) => Promise<SolrResponse>}
   */
  deleteField: solrSchema(config)("delete-field"),

  /**
   * @type {({name:string}) => Promise<SolrResponse>}
   */
  deleteFieldType: solrSchema(config)("delete-field-type"),

  /**
   * @type {(query:import(".").SolrSelect) => Promise<SolrResponse>}
   */
  select: solrGet(config)("select"),

  facet: (facetMap, filterArr = []) =>
    solrPost(config)("query")({
      query: "*:*",
      limit: "0",
      filter: filterArr,
      facet: facetMap
    })
})

module.exports = {
  prepareSolrClient,
  defaultConfig
}
