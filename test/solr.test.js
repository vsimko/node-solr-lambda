const { prepareSolrClient } = require("../src/index")
const { expect } = require("chai")

describe("#prepareSolrClient", () => {
  it("should be able to prepare the client", () => {
    const solr = prepareSolrClient({ core: "dummy" })
    expect(solr).to.haveOwnProperty("ping")
    expect(solr).to.haveOwnProperty("query")
    expect(solr).to.haveOwnProperty("add")
  })
})
