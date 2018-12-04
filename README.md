# node-solr-lambda

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

# Features

- functional-style API with jsdoc type annotations
- plain javascipt in commonjs format - no additional build step required
- ES6+ including async/await, lambdas, spread operator...
- typechecking support in vscode (without compiling typescript code)
- no dependencies other than `axios`
- as close as possible to the Solr Json-based REST API
- functions for working with document, fields and field types

# Example

```js
const { prepareSolrClient } = require("node-solr-lambda");
const solr = prepareSolrClient({ core: "mycore" });

async function myfun() {
  const mycoreExists = await solr.ping(); // -> true if "mycore" exists
  const result = await solr.query({ query: "label:something" });
  console.log(result.data);

  await solr.addField({ name: "price", type: "plong", multiValued: false });
  await solr.addField({
    name: "category",
    type: "string",
    multiValued: true,
    docValues: true
  });

  const item1 = { id: "item1", price: 123, category: ["cpu", "ram"] };
  const item2 = { id: "item2", price: 456, category: ["cpu", "usb"] };
  await solr.add(item1); // works with single object
  await solr.add([item1, item2]); // works with object[]

  await solr.query({
    query: "*:*",
    facet: {
      top_5_categories: {
        terms: {
          field: "category",
          limit: 5,
          facet: {
            avg_price: "avg(price)"
          }
        }
      }
    }
  });
}
```