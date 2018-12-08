// @ts-check
/**
 * Support for type checking and intellisense in vscode:
 * @typedef {import("./solr").SolrConfig} SolrConfig
 * @typedef {import("./solr").ConfigRequest} ConfigRequest
 * @typedef {import("./solr").SolrException} SolrException
 * @typedef {import("./solr").SolrDocument} SolrDocument
 * @typedef {import("./solr").SolrResponse} SolrResponse
 * @typedef {import("./solr").DeleteRequest} DeleteRequest
 * @typedef {import("./solr").FieldProperties} FieldProperties
 * @typedef {import("./solr").FieldTypeProperties} FieldTypeProperties
 * @typedef {import("./solr").QueryRequest} QueryRequest
 * @typedef {{name:string, type?:string, [key:string]:any}} FieldDef
 * @typedef {import("axios").AxiosResponse} AxiosResponse
 */

const url = require("url")
const { default: axios } = require("axios")
const { mergeConfig, ensureArray } = require("./utils")

/** @type {SolrConfig} */
const defaultConfig = {
  hostname: "localhost",
  port: 8983,
  protocol: "http",
  query: {
    commitWithin: 500,
    overwrite: true
  }
}

/** @type {(axiosResp:AxiosResponse) => SolrResponse} */
const convertSolrResponse = axiosResp => axiosResp.data

// converting error response from solr
/** @param {SolrException} reason */
const convertSolrError = reason => {
  switch (reason.response.status) {
    case 400:
      throw Error(reason.response.data.error.msg)
    case 404:
      throw Error(`${reason.message}: ${reason.response.statusText}`)
    default:
      throw reason
  }
}

/**
 * @param {SolrConfig} userConfig This is merged with the defaultConfig
 * @param {string} core
 */
const prepareSolrClient = (core, userConfig = {}) => {
  console.assert(core, "Missing 'core' parameter")

  const config = mergeConfig(defaultConfig, userConfig)

  /** @type {(pathname:string) => (data:any) => Promise<SolrResponse>} */
  const httpPostReq = pathname => data =>
    axios
      .post(url.format({ ...config, pathname }), data)
      .then(convertSolrResponse)
      .catch(convertSolrError)

  /** @type {(pathname:string) => (query:any) => Promise<SolrResponse>} */
  const httpGetReq = pathname => query =>
    axios
      .get(url.format({ ...mergeConfig(config, { query }), pathname }))
      .then(convertSolrResponse)
      .catch(convertSolrError)

  /** @type {(op:string) => (fieldDef:FieldDef) => Promise<SolrResponse>} */
  const solrSchemaReq = op => fieldDef =>
    httpPostReq(`/api/cores/${core}/schema`)({ [op]: fieldDef })

  /** @type {(data:ConfigRequest) => Promise<SolrResponse> } */
  const configReq = httpPostReq(`/api/cores/${core}/config`)

  // now creating the API
  return {
    mergedConfig: () => config,

    commit: () => httpGetReq(`/solr/${core}/update`)({ commit: true }),

    /** @type {(data:QueryRequest) => Promise<SolrResponse>} */
    query: httpPostReq(`/api/cores/${core}/query`),

    /** @param {SolrDocument | SolrDocument[]} data */
    add: data => httpPostReq(`/api/cores/${core}/update`)(ensureArray(data)),

    /** @param {DeleteRequest} deleteQuery */
    delete: deleteQuery =>
      httpPostReq(`/api/cores/${core}/update`)({ delete: deleteQuery }),

    /** @param {string} name */
    deleteField: name => solrSchemaReq("delete-field")({ name }),

    /** @param {string} name */
    deleteFieldType: name => solrSchemaReq("delete-field-type")({ name }),

    /** @type {(data:FieldProperties) => Promise<SolrResponse>} */
    addField: solrSchemaReq("add-field"),

    /** @type {(data:FieldTypeProperties) => Promise<SolrResponse>} */
    addFieldType: solrSchemaReq("add-field-type"),

    /** @type {(data:FieldTypeProperties) => Promise<SolrResponse>} */
    replaceField: solrSchemaReq("replace-field"),

    config: configReq,

    /** @type {() => Promise<string[]>} */
    solrListFields: () =>
      httpGetReq(`/solr/${core}/schema/fields`)({}).then(data =>
        data.fields.map(field => field.name)
      ),

    /** @param {boolean} enable */
    configAutoEnableFields: enable =>
      configReq({
        "set-user-property": {
          "update.autoCreateFields": enable ? "true" : "false"
        }
      })
  }
}

/** @param {SolrConfig} userConfig */
const prepareCoreAdmin = userConfig => {
  const config = mergeConfig(defaultConfig, userConfig)
  return {
    /** @type {(core:string) => Promise<SolrResponse>} */
    ping: core =>
      axios
        .get(url.format({ ...config, pathname: `/solr/${core}/admin/ping` }))
        .then(convertSolrResponse)
        .catch(convertSolrError),

    /** @type {(core:string) => Promise<SolrResponse>} */
    solrDeleteCore: core =>
      axios
        .get(
          url.format({
            ...mergeConfig(config, {
              query: {
                core,
                action: "UNLOAD",
                deleteIndex: true,
                deleteDataDir: true,
                deleteInstanceDir: true
              }
            }),
            pathname: "/solr/admin/cores"
          })
        )
        .then(convertSolrResponse)
        .catch(convertSolrError)
  }
}

module.exports = {
  prepareSolrClient,
  prepareCoreAdmin,
  defaultConfig,
  mergeConfig
}
