const { prepareSolrClient } = require("../src/index")
const { expect } = require("chai")

describe("#prepareSolrClient", () => {
  it("should be able to prepare the client", () => {
    const client = prepareSolrClient()
    expect(client).to.haveOwnProperty("ping")
    expect(client).to.haveOwnProperty("select")
    expect(client).to.haveOwnProperty("add")
  })
})
