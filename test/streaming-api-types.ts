import type {
  SolrClient,
  SolrStreamingExpressionErrorTuple,
  SolrStreamingExpressionResponse,
  SolrStreamingExpressionTuple
} from "../src/index.js";

declare const client: SolrClient;

const defaultResponse: Promise<SolrStreamingExpressionResponse> = client.stream("search(catalog, q=*:*)");
void defaultResponse.then(result => {
  const tuples = result["result-set"]?.docs;
  const eof: boolean | undefined = result["result-set"]?.EOF;
  const firstTuple: SolrStreamingExpressionTuple | undefined = tuples?.[0];
  const expressionError: string | undefined = tuples?.find(
    (tuple): tuple is SolrStreamingExpressionErrorTuple => typeof tuple.EXCEPTION === "string"
  )?.EXCEPTION;
  void [eof, firstTuple, expressionError];
});

interface SearchTuple extends SolrStreamingExpressionTuple {
  id: string;
  score?: number;
}
const typedResponse: Promise<SolrStreamingExpressionResponse<SearchTuple>> =
  client.stream<SearchTuple>("search(catalog, q=*:*)");
void typedResponse.then(result => {
  const id: string | undefined = result["result-set"]?.docs?.[0]?.id;
  const score: number | undefined = result["result-set"]?.docs?.[0]?.score;
  void [id, score];
});

const errorTuple: SolrStreamingExpressionErrorTuple = {
  EXCEPTION: "Expression evaluation failed",
  EOF: true
};
void errorTuple;

// @ts-expect-error An expression error tuple must contain its server exception message.
const invalidErrorTuple: SolrStreamingExpressionErrorTuple = { EOF: true };
void invalidErrorTuple;
