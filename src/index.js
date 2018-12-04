// @ts-check
const url = require("url")
const { default: axios } = require("axios")

/** @type {SolrConfig} */
const defaultConfig = {
  urlConfig: {
    hostname: "localhost",
    port: 8983,
    protocol: "http",
    query: {
      commitWithin: 500,
      overwrite: true,
      wt: "json"
    }
  },
  debug: false,
  apiPrefix: "api/cores"
}

/** @type {(x:object) => object|object[]} */
const ensureArray = x => (Object(x) instanceof Array ? x : [x])

const isEmptyObject = obj =>
  Object.keys(obj).length === 0 && obj.constructor === Object

/** @type {(config:SolrConfig) => (path:string) => (data:SolrData) => Promise<SolrResponse>} */
const solrPost = config => path => async data => {
  const { core, apiPrefix } = config
  const solrUrl = url.format({
    ...config.urlConfig,
    pathname: `${apiPrefix}/${core}/${path}`
  })

  if (config.debug) {
    const dataPart = isEmptyObject(data) ? "" : ` -d '${JSON.stringify(data)}'`
    console.debug(
      `\n$ curl -X POST '${solrUrl}' -H 'Content-Type: application/json'${dataPart}\n`
    )
  }

  const response = await axios.post(solrUrl, data, {
    headers: { "Content-Type": "application/json" }
  })

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
const prepareSolrClient = config => {
  if (!config.core) {
    throw Error("missing 'core' parameter in your config")
  }
  return {
    ping: () =>
      solrPost({ ...config, apiPrefix: "solr" })("admin/ping")({})
        .then(value => {
          return value.status === "OK"
        })
        .catch(() => false),

    /**
     * @param {SolrDocument | SolrDocument[]} data */
    add: data => solrPost(config)("update")(ensureArray(data)),

    /**
     * @type {(data:FieldProperties) => Promise<SolrResponse>}
     * @see https://lucene.apache.org/solr/guide/7_5/schema-api.html#add-a-new-field
     */
    addField: solrSchema(config)("add-field"),

    /**
     * @type {(data:FieldTypeProperties) => Promise<SolrResponse>}
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
     * @type {(data:SolrQuery) => Promise<SolrResponse>}
     */
    query: solrPost(config)("query")
  }
}

module.exports = {
  prepareSolrClient,
  defaultConfig
}
