// @ts-check
const { prepareSolrClient, prepareCoreAdmin } = require("../src/index")
const { expect, use } = require("chai")
const cap = require("chai-as-promised")
use(cap)

/** @typedef {import("../src/solr").SolrConfig} SolrConfig */

/** @type {SolrConfig} */
const testConfing = { port: 18983 } // see docker-compose.yml

describe("#prepareCoreAdmin", async () => {
  const admin = prepareCoreAdmin(testConfing)

  it("should ping core", () => {
    admin.ping("testcore")
    expect(admin.ping("non-existent-core")).to.be.rejectedWith("Not Found")
  })

  it("should delete core", () => {
    expect(admin.solrDeleteCore("non-existent-core")).to.be.rejectedWith(
      "Cannot unload non-existent core"
    )
  })
})

describe("#prepareSolrClient", () => {
  const solr = prepareSolrClient("testcore", testConfing)

  it("should query documents", async () => {
    await solr.query({ query: "*:*" })
  })

  it("should delete documents", async () => {
    await solr.delete({ id: "123" })
  })

  it("should add documents and commit", async () => {
    await solr.add({ id: "123", hello: "world" })
    await solr.commit()
  })

  it("should provide other functions", () => {
    expect(solr).to.haveOwnProperty("deleteField")
    expect(solr).to.haveOwnProperty("mergedConfig")
    expect(solr).to.haveOwnProperty("deleteFieldType")
    expect(solr).to.haveOwnProperty("addField")
    expect(solr).to.haveOwnProperty("addFieldType")
    expect(solr).to.haveOwnProperty("replaceField")
    expect(solr).to.haveOwnProperty("config")
    expect(solr).to.haveOwnProperty("solrListFields")
    expect(solr).to.haveOwnProperty("configAutoEnableFields")
  })
})
