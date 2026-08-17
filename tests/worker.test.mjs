import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const payload = {
  schemaVersion: "recommendation_summary.v1",
  comparison: { status: "complete" },
  dimensions: [{ id: "interest", label: "兴趣程度", weight: 8 }],
  offers: [{
    id: "a",
    name: "Offer A",
    rank: 1,
    weightedScore: 8.5,
    scores: { interest: 9 }
  }],
  recommendation: { selectedOfferName: "Offer A" }
};

const env = {
  ALLOWED_ORIGIN: "http://127.0.0.1:5173",
  AI: {
    run: async () => ({ response: "Offer A 当前更适合。它在兴趣程度上领先。" })
  }
};

function request(method, body, origin = env.ALLOWED_ORIGIN) {
  return new Request("https://summary.example/summary", {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test("returns a summary for an allowed origin", async () => {
  const response = await worker.fetch(request("POST", payload), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    summary: "Offer A 当前更适合。它在兴趣程度上领先。"
  });
});

test("returns CORS preflight headers only for the configured origin", async () => {
  const response = await worker.fetch(request("OPTIONS"), env);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), env.ALLOWED_ORIGIN);
});

test("rejects an untrusted origin", async () => {
  const response = await worker.fetch(request("POST", payload, "https://untrusted.example"), env);

  assert.equal(response.status, 403);
});

test("rejects notes in an otherwise valid request", async () => {
  const response = await worker.fetch(request("POST", {
    ...payload,
    offers: [{ ...payload.offers[0], notes: { interest: "private" } }]
  }), env);

  assert.equal(response.status, 400);
});

test("rejects unsupported methods and invalid JSON", async () => {
  const methodResponse = await worker.fetch(request("GET"), env);
  const jsonResponse = await worker.fetch(new Request("https://summary.example/summary", {
    method: "POST",
    headers: { Origin: env.ALLOWED_ORIGIN, "Content-Type": "application/json" },
    body: "{"
  }), env);

  assert.equal(methodResponse.status, 405);
  assert.equal(jsonResponse.status, 400);
});

test("returns 502 when the model call fails", async () => {
  const response = await worker.fetch(request("POST", payload), {
    ...env,
    AI: { run: async () => { throw new Error("model unavailable"); } }
  });

  assert.equal(response.status, 502);
});
