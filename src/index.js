// @ts-check
/**
 * Support for type checking and intellisense in vscode:
 * @typedef {import("./solr").SolrConfig} SolrConfig
 * @typedef {import("./solr").SolrData} SolrData
 * @typedef {import("./solr").SolrDocument} SolrDocument
 * @typedef {import("./solr").SolrResponse} SolrResponse
 * @typedef {import("./solr").DeleteQuery} DeleteQuery
 * @typedef {import("./solr").FieldProperties} FieldProperties
 * @typedef {import("./solr").FieldTypeProperties} FieldTypeProperties
 * @typedef {import("./solr").SolrQuery} SolrQuery
 */

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

const mergeConfig = (a, b) => mergeConfigImpure({ ...a }, b)

function mergeConfigImpure (target, source) {
  for (let k in source) {
    const objOrScalar = target[k]
    if (objOrScalar != null && objOrScalar.constructor === Object) {
      mergeConfigImpure(objOrScalar, source[k]) // recurse on objects
    } else {
      target[k] = source[k] // assign scalar value
    }
  }
  return target
}

/** @param {SolrConfig} userConfig */
const prepareSolrClient = (userConfig = {}) => {
  const config = mergeConfig(defaultConfig, userConfig)

  // sanity checks
  if (!config.core) {
    throw Error("missing 'core' parameter in your config")
  }
  // now creating the API
  return {
    ping: () =>
      solrPost({ ...config, apiPrefix: "solr" })("admin/ping")({})
        .then(value => {
          return value.status === "OK"
        })
        .catch(() => false),

    /** @param {SolrDocument | SolrDocument[]} data */
    add: data => solrPost(config)("update")(ensureArray(data)),

    /** @param {DeleteQuery} deleteQuery */
    delete: deleteQuery =>
      solrPost({ ...config, apiPrefix: "solr" })("update")({
        delete: deleteQuery
      }),

    /** @type {(data:FieldProperties) => Promise<SolrResponse>} */
    addField: solrSchema(config)("add-field"),

    /** @type {(data:FieldTypeProperties) => Promise<SolrResponse>} */
    addFieldType: solrSchema(config)("add-field-type"),

    /** @type {({name:string}) => Promise<SolrResponse>} */
    deleteField: solrSchema(config)("delete-field"),

    /** @type {({name:string}) => Promise<SolrResponse>} */
    deleteFieldType: solrSchema(config)("delete-field-type"),

    /** @type {(data:SolrQuery) => Promise<SolrResponse>} */
    query: solrPost(config)("query")
  }
}

module.exports = {
  prepareSolrClient,
  defaultConfig,
  mergeConfig
}
