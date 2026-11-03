import { test } from "node:test";
import assert from "node:assert/strict";
import { createSolrClient, SolrHttpError } from "../src/index.js";

test("Basic authentication sends an Authorization header without exposing credentials in errors", async () => {
  const username = "solr-service";
  const password = "test-password-value-7f3a";
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  let sentAuthorization: string | null = null;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    auth: { type: "basic", username, password },
    fetch: async (_input, init) => {
      sentAuthorization = new Headers(init?.headers).get("authorization");
      return new Response(JSON.stringify({ error: { msg: "Authentication required" } }), {
        status: 401,
        statusText: "Unauthorized"
      });
    }
  });

  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    const errorText = [
      error.message,
      error.endpoint,
      error.body,
      JSON.stringify(error.payload),
      JSON.stringify(error.solrError)
    ].join(" ");
    assert.equal(errorText.includes(password), false);
    assert.equal(errorText.includes(authorization), false);
    assert.equal("authorization" in error, false, "HTTP errors must not expose request authorization headers");
    assert.equal("headers" in error, false, "HTTP errors must not expose request headers");
    return true;
  });
  assert.equal(sentAuthorization, authorization);
});

test("Bearer authentication sends a token header without exposing the token in errors", async () => {
  const token = "test-bearer-token-3a91";
  let sentAuthorization: string | null = null;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    auth: { type: "bearer", token },
    fetch: async (_input, init) => {
      sentAuthorization = new Headers(init?.headers).get("authorization");
      return new Response("forbidden", { status: 403, statusText: "Forbidden" });
    }
  });

  await assert.rejects(client.ping(), (error: unknown) => {
    assert.ok(error instanceof SolrHttpError);
    const errorText = [error.message, error.endpoint, error.body, JSON.stringify(error.payload)].join(" ");
    assert.equal(errorText.includes(token), false);
    assert.equal(errorText.includes(`Bearer ${token}`), false);
    assert.equal("authorization" in error, false, "HTTP errors must not expose bearer authorization headers");
    assert.equal("headers" in error, false, "HTTP errors must not expose request headers");
    return true;
  });
  assert.equal(sentAuthorization, `Bearer ${token}`);
});

test("legacy Basic authentication remains supported", async () => {
  let sentAuthorization: string | null = null;
  const client = createSolrClient({
    baseUrl: "https://solr.example.test",
    core: "catalog",
    username: "legacy-user",
    password: "legacy-password",
    fetch: async (_input, init) => {
      sentAuthorization = new Headers(init?.headers).get("authorization");
      return new Response(JSON.stringify({ status: "ok" }));
    }
  });

  await client.ping();
  assert.equal(
    sentAuthorization,
    `Basic ${Buffer.from("legacy-user:legacy-password").toString("base64")}`
  );
});
