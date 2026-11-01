# Error handling

The client throws `SolrHttpError` when Solr returns a non-success HTTP status. The error includes the HTTP status, status text, and response payload.

The client throws `SolrValidationError` when an enabled schema rejects a request or response.

Network errors and abort errors from the Fetch API pass to the caller. Catch these errors at the application boundary. Do not assume that every failed request includes a Solr error response.
