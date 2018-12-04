import { AxiosError } from "axios"
import { ClientRequest } from "http"
import { UrlObject } from "url"

// TODO: similarity https://lucene.apache.org/solr/guide/7_5/other-schema-elements.html#similarity
// TODO: unique key https://lucene.apache.org/solr/guide/7_5/other-schema-elements.html#unique-key
// TODO: dynamic fields https://lucene.apache.org/solr/guide/7_5/dynamic-fields.html
// TODO: copying fields https://lucene.apache.org/solr/guide/7_5/copying-fields.html
// https://lucene.apache.org/solr/guide/7_5/v2-api.html

/**
 * Field types that are available in Solr (except deprecated fields).
 * @see https://lucene.apache.org/solr/guide/7_5/field-types-included-with-solr.html#field-types-included-with-solr
 */
type FieldTypesIncludedInSolr =
  | "solr.BinaryField"
  | "solr.BoolField"
  | "solr.CollationField"
  | "solr.CurrencyFieldType"
  | "solr.DateRangeField"
  | "solr.DatePointField"
  | "solr.DoublePointField"
  | "solr.ExternalFileField"
  | "solr.EnumFieldType"
  | "solr.FloatPointField"
  | "solr.ICUCollationField"
  | "solr.IntPointField"
  | "solr.LatLonPointSpatialField"
  | "solr.LongPointField"
  | "solr.PointType"
  | "solr.PreAnalyzedField"
  | "solr.RandomSortField"
  | "solr.SpatialRecursivePrefixTreeFieldType"
  | "solr.StrField"
  | "solr.StrField"
  | "solr.TextField"
  | "solr.UUIDField"

/**
 * Field definitions must have a `name` and `class`.
 * @see https://lucene.apache.org/solr/guide/7_5/defining-fields.html#field-properties
 */
interface FieldGeneralProperties {
  /**
   * The name of the field. Field names should consist of alphanumeric or underscore characters
   * only and not start with a digit. This is not currently strictly enforced, but other field
   * names will not have first class support from all components and back compatibility is not
   * guaranteed. Names with both leading and trailing underscores (e.g., _version_) are reserved.
   * Every field must have a name.
   */
  name: string

  /**
   * The name of the fieldType for this field. This will be found in the name attribute on
   * the fieldType definition. Every field must have a type.
   */
  type: string

  /**
   * A default value that will be added automatically to any document that does not have a value
   * in this field when it is indexed. If this property is not specified, there is no default.
   */
  default?: string
}

/**
 */
interface FieldTypeGeneralProperties {
  /**
   * The name of the fieldType. This value gets used in field definitions,
   * in the "type" attribute. It is strongly recommended that names consist
   * of alphanumeric or underscore characters only and not start with a digit.
   * This is not currently strictly enforced.
   */
  name: string

  /**
   * The class name that gets used to store and index the data for this type.
   * Note that you may prefix included class names with "solr." and Solr will
   * automatically figure out which packages to search for the class - so
   * `solr.TextField` will work.
   *
   * If you are using a third-party class, you will probably need to have a fully
   * qualified class name. The fully qualified equivalent for `solr.TextField`
   * is `org.apache.solr.schema.TextField`.
   */
  class: FieldTypesIncludedInSolr // | string

  /**
   * For multivalued fields, specifies a distance between multiple values,
   * which prevents spurious phrase matches.
   */
  positionIncrementGap?: number

  /**
   * For text fields. If true, Solr automatically generates phrase queries
   * for adjacent terms. If false, terms must be enclosed in double-quotes
   * to be treated as phrases.
   */
  autoGeneratePhraseQueries?: boolean

  /**
   * Query used to combine scores of overlapping query terms (i.e., synonyms).
   * Consider a search for "blue tee" with query-time synonyms `tshirt,tee`.
   * - Use `as_same_term` (default) to blend terms, i.e., `SynonymQuery(tshirt,tee)`
   *   where each term will be treated as equally important. The value `as_same_term`
   *   is appropriate when terms are true synonyms (television, tv).
   * - Use `pick_best` to select the most significant synonym when scoring `Dismax(tee,tshirt)`.
   * - Use `as_distinct_terms` to bias scoring towards the most significant synonym (`pants OR slacks`).
   * - Use `pick_best` or `as_distinct_terms` when synonyms are expanding to hyponyms
   *   (`q=jeans w/ jeans=>jeans,pants`) and you want exact to come before parent and
   *   sibling concepts.
   * @see http://opensourceconnections.com/blog/2017/11/21/solr-synonyms-mea-culpa/
   */
  synonymQueryStyle?: "as_same_term" | "pick_best" | "as_distinct_terms"

  /**
   * For text fields,applicable when querying with
   * [`sow=false`](https://lucene.apache.org/solr/guide/7_5/the-standard-query-parser.html#standard-query-parser-parameters)
   * (which is the default for the sow parameter).
   * - Use `true`, the default, for field types with query analyzers including graph-aware filters,
   *   e.g., [Synonym Graph Filter](https://lucene.apache.org/solr/guide/7_5/filter-descriptions.html#synonym-graph-filter)
   *   and [Word Delimiter Graph Filter](https://lucene.apache.org/solr/guide/7_5/filter-descriptions.html#word-delimiter-graph-filter).
   * - Use `false` for field types with query analyzers including filters that
   *   can match docs when some tokens are missing,
   *   e.g., [Shingle Filter](https://lucene.apache.org/solr/guide/7_5/filter-descriptions.html#shingle-filter).
   */
  enableGraphQueries?: boolean

  /**
   * Defines a custom `DocValuesFormat` to use for fields of this type.
   * This requires that a schema-aware codec, such as the `SchemaCodecFactory`
   * has been configured in `solrconfig.xml`.
   */
  docValuesFormat?: string

  /**
   * Defines a custom `PostingsFormat` to use for fields of this type.
   * This requires that a schema-aware codec, such as the `SchemaCodecFactory`
   * has been configured in `solrconfig.xml`.
   *
   * **Note:**
   * Lucene index back-compatibility is only supported for the default codec.
   * If you choose to customize the `postingsFormat` or `docValuesFormat` in your
   * `schema.xml`, upgrading to a future version of Solr may require you to either
   * switch back to the default codec and optimize your index to rewrite it into
   * the default codec before upgrading, or re-build your entire index from scratch
   * after upgrading.
   */
  postingsFormat?: string
}

/**
 * Fields can have many of the same properties as field types.
 * @see https://lucene.apache.org/solr/guide/7_5/field-type-definitions-and-properties.html#field-default-properties
 */
interface FieldTypeDefaultProperties {
  /** If true, the value of the field can be used in queries to retrieve matching documents. */
  indexed?: boolean

  /** If true, the actual value of the field can be retrieved by queries. */
  stored?: boolean

  /**
   * If true, the value of the field will be put in a column-oriented
   * [DocValues](https://lucene.apache.org/solr/guide/7_5/docvalues.html#docvalues) structure.
   */
  docValues?: boolean

  /** Control the placement of documents when a sort field is not present. */
  sortMissingFirst?: boolean

  /** Control the placement of documents when a sort field is not present. */
  sortMissingLast?: boolean

  /** If true, indicates that a single document might contain multiple values for this field type. */
  multiValued?: boolean

  /**
   * If true, omits the norms associated with this field (this disables length normalization
   * for the field, and saves some memory). **Defaults to true for all primitive (non-analyzed)
   * field types, such as int, float, data, bool, and string.** Only full-text fields or fields need norms.
   */
  omitNorms?: boolean

  /**
   * If true, omits term frequency, positions, and payloads from postings for this field.
   * This can be a performance boost for fields that don’t require that information.
   * It also reduces the storage space required for the index. Queries that rely on position
   * that are issued on a field with this option will silently fail to find documents.
   * **This property defaults to true for all field types that are not text fields.**
   */
  omitTermFreqAndPositions?: boolean

  /**
   * Similar to `omitTermFreqAndPositions` but preserves term frequency information.
   */
  omitPositions?: boolean

  /**
   * These options instruct Solr to maintain full term vectors for each document,
   * optionally including position, offset and payload information for each term
   * occurrence in those vectors. These can be used to accelerate highlighting and
   * other ancillary functionality, but impose a substantial cost in terms of index size.
   * They are not necessary for typical uses of Solr.
   */
  termVectors?: boolean
  termPositions?: boolean
  termOffsets?: boolean
  termPayloads?: boolean

  /**
   * Instructs Solr to reject any attempts to add a document which does not have a value
   * for this field. This property defaults to false.
   */
  required?: boolean

  /**
   * If the field has docValues enabled, setting this to true would allow the field
   * to be returned as if it were a stored field (even if it has `stored=false`) when
   * matching `“*”` in an fl parameter.
   */
  useDocValuesAsStored?: boolean

  /**
   * Large fields are always lazy loaded and will only take up space in the document
   * cache if the actual value is < 512KB. This option requires `stored="true"` and
   * `multiValued="false"`. It’s intended for fields that might have very large values
   * so that they don’t get cached in memory.
   */
  large?: boolean
}

type SolrFragmentWithId = {
  id: string
  [key: string]: string | string[]
}

// TODO: SolrDataValue
type SolrDataValue = any
// type SolrDataValue =
//   | string
//   | string[]
//   | SolrFragmentWithId
//   | SolrFragmentWithId[]

/**
 * This type definition contains just the most important parts.
 */
interface SolrResponseHeader {
  params?: object
  status: number
  QTime: number
}

interface TermsFacet {
  buckets: { val: string; count: number }[]
}

interface FacetFunctionResult {
  [facetName: string]: number
}

declare global {
  interface SolrData {
    [key: string]: SolrDataValue
  }

  /**
   * Fields are defined in the fields element of `schema.xml`.
   * Once you have the **field types** set up, defining the fields themselves is simple.
   *
   * @see https://lucene.apache.org/solr/guide/7_5/defining-fields.html
   * @see https://lucene.apache.org/solr/guide/7_5/defining-fields.html#optional-field-type-override-properties
   */
  type FieldProperties = FieldGeneralProperties & FieldTypeDefaultProperties

  /**
   * A field type defines the analysis that will occur on a field when documents are indexed
   * or queries are sent to the index.
   * A field type definition can include four types of information:
   * - The `name` of the field type (**mandatory**).
   * - An implementation `class` name (**mandatory**).
   * - If the field type is `TextField`, a description of the field analysis for the field type.
   * - Field type properties - depending on the implementation class,
   *   some properties **may be mandatory**.
   *
   * The field type `class` determines most of the behavior of a field type, but optional properties
   * can also be defined.
   *
   * The properties that can be specified for a given field type fall into three major categories:
   * - Properties specific to the field type’s class.
   * - General Properties {@link FieldTypeGeneralProperties} that Solr supports for any field type.
   * - Field Default Properties {@link FieldTypeDefaultProperties} that can be specified on the field
   *   type that will be inherited by fields that use this type instead of the default behavior.
   */
  type FieldTypeProperties = FieldTypeGeneralProperties &
    FieldTypeDefaultProperties

  interface SolrDocument {
    id: string
    _childDocuments_?: SolrFragmentWithId | SolrFragmentWithId[]
    [key: string]: SolrDataValue | SolrData
  }

  /**
   * This type definition contains just the most important parts.
   */
  interface SolrResponse {
    status?: string
    facets?: {
      count?: number
    } & {
      [facetName: string]: (TermsFacet | FacetFunctionResult)[] // TODO: to be completed
    }
    response?: {
      docs: SolrDocument[]
      numFound: number
      start: number
    }
    responseHeader: SolrResponseHeader
  }

  /**
   * This type definition contains just the most important parts.
   */
  interface SolrException {
    config
    message: string
    request: ClientRequest
    response: {
      config
      data: {
        error: {
          code: number
          details: {
            errorMessages: string[]
            [key: string]: object
          }[]
          metadata: string[]
        }
        responseHeader: SolrResponseHeader
      }
      headers
      request: ClientRequest
      status: number
      statusText: string
    }
    stack: string
  }

  interface SolrQuery {
    query?
    filter?
    start?
    limit?
    sort?
    facet?
    params?: {
      hl?: "on" | "off"
      "hl.simple.pre"?: string
      "hl.simple.post"?: string
      "hl.fl"?: string
      indent?: "off" | "on"
    }
  }

  interface SolrConfig {
    urlConfig: UrlObject & {
      query: {
        overwrite: boolean
        commitWithin: number
        wt: "json" | "xml" | "python" | "ruby" | "php" | "csv"
        [key: string]: any
      }
    }
    debug: boolean
    core?: string
    apiPrefix: string
  }
}
