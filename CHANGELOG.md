# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.0.0"></a>
# [1.0.0](https://github.com/vsimko/node-solr-lambda/compare/v0.2.2...v1.0.0) (2018-12-04)


### Bug Fixes

* export defaultConfig ([773c947](https://github.com/vsimko/node-solr-lambda/commit/773c947))
* problem with `query` param accidentally renamed ([b1fbe8c](https://github.com/vsimko/node-solr-lambda/commit/b1fbe8c))
* remove solrGet and use solrPost everywhere, update typedefs ([6837233](https://github.com/vsimko/node-solr-lambda/commit/6837233))


### Features

* add debugging of GET requests ([d609b65](https://github.com/vsimko/node-solr-lambda/commit/d609b65))
* add type annotations, new solr functions ([253f335](https://github.com/vsimko/node-solr-lambda/commit/253f335))
* add typings mainly for nicer vscode assistance ([9d3604e](https://github.com/vsimko/node-solr-lambda/commit/9d3604e))
* facet function to get solr facets using JSON api ([c7cfa78](https://github.com/vsimko/node-solr-lambda/commit/c7cfa78))


### BREAKING CHANGES

* - `select` function replaced by `query`
- `facet` function removed because we now have query+typedefs
- we now use the Solr JSON API in `SolrQuery` type with additional parameters inside `SolrQuery.params`.
- the config has now nested section `urlConfig` which is passed directly to `url.format` before calling `axios.post`.
* From now on,  the `core` parameter needs
to be passed through the `config` parameter. This simplifies
the API by removing special cases.
The provided typings provide better user experience when developing
in an IDE such as vscode.



<a name="0.2.2"></a>
## [0.2.2](https://github.com/vsimko/node-solr-lambda/compare/v0.2.1...v0.2.2) (2018-07-31)



<a name="0.2.1"></a>
## [0.2.1](https://github.com/vsimko/node-solr-lambda/compare/v0.1.1...v0.2.1) (2018-07-31)



<a name="0.1.1"></a>
## 0.1.1 (2018-06-20)


### Bug Fixes

* some typos ([c469209](https://github.com/vsimko/node-solr-lambda/commit/c469209))
