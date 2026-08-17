import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLocalDecisionSummary,
  buildSummaryPayload,
  canGenerateDecisionSummary
} from "../summary-payload.mjs";

const source = {
  dimensions: [{ id: "interest", label: "兴趣程度" }],
  activeArchive: { name: "私密档案", weights: { interest: 8 } },
  rankedOffers: [{
    id: "a",
    name: "Offer A",
    weightedScore: 8.5,
    scores: { interest: 9 },
    notes: { interest: "不应外发" }
  }],
  comparisonStatus: { isComplete: true, missingByOffer: [] }
};

test("buildSummaryPayload keeps the ranking inputs required for a summary", () => {
  assert.deepEqual(buildSummaryPayload(source), {
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
    recommendation: {
      selectedOfferId: "a",
      selectedOfferName: "Offer A",
      selectedOfferRank: 1,
      selectedOfferWeightedScore: 8.5
    }
  });
});

test("buildSummaryPayload excludes private notes and archive metadata", () => {
  const payload = buildSummaryPayload(source);

  assert.equal(JSON.stringify(payload).includes("不应外发"), false);
  assert.equal("archive" in payload, false);
  assert.equal("notes" in payload.offers[0], false);
});

test("allows a summary whenever the comparison is complete and has an eligible offer", () => {
  assert.equal(canGenerateDecisionSummary({ isComplete: true }, true), true);
  assert.equal(canGenerateDecisionSummary({ isComplete: false }, true), false);
  assert.equal(canGenerateDecisionSummary({ isComplete: true }, false), false);
});

test("builds a useful local decision summary from scores and notes", () => {
  const summary = buildLocalDecisionSummary({
    dimensions: [
      { id: "interest", label: "兴趣程度" },
      { id: "salary", label: "待遇" },
      { id: "location", label: "工作地" }
    ],
    activeArchive: {
      weights: { interest: 5, salary: 3, location: 2 }
    },
    rankedOffers: [
      {
        name: "Offer A",
        weightedScore: 8.1,
        scores: { interest: 9, salary: 8, location: 6 },
        note: "团队方向和长期发展更符合预期",
        notes: { interest: "面试沟通顺畅" }
      },
      {
        name: "Offer B",
        weightedScore: 7.4,
        scores: { interest: 6, salary: 9, location: 7 },
        note: ""
      }
    ],
    comparisonStatus: { isComplete: true }
  });

  assert.match(summary, /Offer A/);
  assert.match(summary, /兴趣程度/);
  assert.match(summary, /工作地/);
  assert.match(summary, /团队方向和长期发展更符合预期/);
  assert.doesNotMatch(summary, /兜底|不可用|失败|endpoint/i);
});
