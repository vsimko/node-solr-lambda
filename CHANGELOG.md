# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.0.3](https://github.com/vsimko/node-solr-lambda/compare/v3.0.1...v3.0.3) (2020-05-12)


### Bug Fixes

* link to types.d.ts mentioned in jsdocs ([c732f02](https://github.com/vsimko/node-solr-lambda/commit/c732f02bdd16a5be414658b4d92bbc46187af3b7))

<a name="3.0.1"></a>
## [3.0.1](https://github.com/vsimko/node-solr-lambda/compare/v3.0.0...v3.0.1) (2018-12-09)


### Bug Fixes

* update docs, move solr.d.ts to types.d.ts ([af72e46](https://github.com/vsimko/node-solr-lambda/commit/af72e46))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/vsimko/node-solr-lambda/compare/v2.2.0...v3.0.0) (2018-12-08)


### Bug Fixes

* convert 404 and 400 http errors to exceptions ([6ca25ed](https://github.com/vsimko/node-solr-lambda/commit/6ca25ed))


### Features

* split api between client and core admin and simplify internal design ([37b0788](https://github.com/vsimko/node-solr-lambda/commit/37b0788))


### BREAKING CHANGES

* - config:
  - removed parameters debug, apiPrefix
  - urlConfig moved up one level
- printing of debugging messages removed
- prepareSolrClient accepts first parameter `core` and optinoal parameter `userConfig`
- added function `commit`
- added function `solrListFields`
- moved function `ping` to `prepareCoreAdmin`
- added function `solrDeleteCore` to `prepareCoreAdmin`
- functions `deleteField` and `deleteFieldType` now accepts a single `name` parameter rather than object



<a name="2.2.0"></a>
# [2.2.0](https://github.com/vsimko/node-solr-lambda/compare/v2.1.0...v2.2.0) (2018-12-05)


### Bug Fixes

* function `mergeConfig` now uses `deepCopy` through JSON serdes. ([c240ad3](https://github.com/vsimko/node-solr-lambda/commit/c240ad3))


### Features

* add `mergedConfig` function ([9ca2fe6](https://github.com/vsimko/node-solr-lambda/commit/9ca2fe6))



<a name="2.1.0"></a>
# [2.1.0](https://github.com/vsimko/node-solr-lambda/compare/v2.0.2...v2.1.0) (2018-12-05)


### Features

* add solr.config function and and configAutoEnableFields ([ade5e8a](https://github.com/vsimko/node-solr-lambda/commit/ade5e8a))



<a name="2.0.2"></a>
## [2.0.2](https://github.com/vsimko/node-solr-lambda/compare/v2.0.0...v2.0.2) (2018-12-04)



<a name="2.0.1"></a>
## [2.0.1](https://github.com/vsimko/node-solr-lambda/compare/v2.0.0...v2.0.1) (2018-12-04)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/vsimko/node-solr-lambda/compare/v1.1.0...v2.0.0) (2018-12-04)


### Bug Fixes

* add explicit typedef imports instead of declare global ([c388079](https://github.com/vsimko/node-solr-lambda/commit/c388079))


### Features

* add mergeConfig exported function used also in prepareSolrClient ([051ecd0](https://github.com/vsimko/node-solr-lambda/commit/051ecd0))


### BREAKING CHANGES

* the prepareSolrClient function now accepts
user config which is merged with the default config (overrides its
fields). The userConfig can also be empty.



<a name="1.1.0"></a>
# [1.1.0](https://github.com/vsimko/node-solr-lambda/compare/v1.0.0...v1.1.0) (2018-12-04)


### Bug Fixes

* printing curl command in debug mode should use quoted data ([752c1cc](https://github.com/vsimko/node-solr-lambda/commit/752c1cc))


### Features

* implemented `delete` function for deleting document by id or query ([e1166e4](https://github.com/vsimko/node-solr-lambda/commit/e1166e4))



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
