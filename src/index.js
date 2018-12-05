// @ts-check
/**
 * Support for type checking and intellisense in vscode:
 * @typedef {import("./solr").SolrConfig} SolrConfig
 * @typedef {import("./solr").ConfigRequest} ConfigRequest
 * @typedef {import("./solr").SolrData} SolrData
 * @typedef {import("./solr").SolrDocument} SolrDocument
 * @typedef {import("./solr").SolrResponse} SolrResponse
 * @typedef {import("./solr").DeleteRequest} DeleteRequest
 * @typedef {import("./solr").FieldProperties} FieldProperties
 * @typedef {import("./solr").FieldTypeProperties} FieldTypeProperties
 * @typedef {import("./solr").QueryRequest} QueryRequest
 */

const url = require("url")
const { default: axios } = require("axios")
const { mergeConfig, ensureArray, isEmptyObject } = require("./utils")

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

/** @type {(config:SolrConfig) => (path:string) => (data:SolrData) => Promise<SolrResponse>} */
const solrPost = config => path => async data => {
  const { core, apiPrefix } = config
  const solrUrl = url.format({
    ...config.urlConfig,
    pathname: `${apiPrefix}/${core}/${path}`
  })

  if (config.debug) {
    const dataPart = isEmptyObject(data) ? "" : `-d '${JSON.stringify(data)}'`
    console.debug(
      `\ncurl -X POST '${solrUrl}' -H 'Content-Type: application/json' ${dataPart}\n`
    )
  }

  const response = await axios.post(solrUrl, data, {
    headers: { "Content-Type": "application/json" }
  })

  return response.data
}

/** @param {SolrConfig} userConfig */
const prepareSolrClient = (userConfig = {}) => {
  const config = mergeConfig(defaultConfig, userConfig)

  // sanity checks
  if (!config.core) {
    throw Error("missing 'core' parameter in your config")
  }

  // some functions require /solr prefix instead of /api/cores/
  const configWithSolrPrefix = { ...config, apiPrefix: "solr" }

  // we already use the variable config, therefore solrConfigRequest
  // represents the "config" API call from Solr
  const solrConfigRequest = solrPost(configWithSolrPrefix)("config")

  const solrSchemaRequest = op => data =>
    solrPost(config)("schema")({ [op]: data })

  // now creating the API
  return {
    mergedConfig: () => config,
    ping: () =>
      solrPost(configWithSolrPrefix)("admin/ping")({})
        .then(value => {
          return value.status === "OK"
        })
        .catch(() => false),

    /** @param {SolrDocument | SolrDocument[]} data */
    add: data => solrPost(config)("update")(ensureArray(data)),

    /** @param {DeleteRequest} deleteQuery */
    delete: deleteQuery =>
      solrPost(configWithSolrPrefix)("update")({
        delete: deleteQuery
      }),

    /** @type {(data:FieldProperties) => Promise<SolrResponse>} */
    addField: solrSchemaRequest("add-field"),

    /** @type {(data:FieldTypeProperties) => Promise<SolrResponse>} */
    addFieldType: solrSchemaRequest("add-field-type"),

    /** @type {({name:string}) => Promise<SolrResponse>} */
    deleteField: solrSchemaRequest("delete-field"),

    /** @type {({name:string}) => Promise<SolrResponse>} */
    deleteFieldType: solrSchemaRequest("delete-field-type"),

    /** @type {(data:QueryRequest) => Promise<SolrResponse>} */
    query: solrPost(config)("query"),

    config: solrConfigRequest,

    /**
     * Convenience function to set the `update.autoCreateFields` user property.
     * @param {boolean} enable
     */
    configAutoEnableFields: enable =>
      solrConfigRequest({
        "set-user-property": {
          "update.autoCreateFields": enable ? "true" : "false"
        }
      })
  }
}

module.exports = {
  prepareSolrClient,
  defaultConfig,
  mergeConfig
}
