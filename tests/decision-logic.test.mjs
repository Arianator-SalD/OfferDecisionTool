import test from "node:test";
import assert from "node:assert/strict";
import {
  getComparisonStatus,
  getHardConstraintStatus,
  getRecommendationExplanation
} from "../decision-logic.mjs";

const dimensions = [
  { id: "interest", label: "兴趣程度" },
  { id: "salary", label: "待遇" }
];

test("marks a weighted blank score as incomplete without treating zero as blank", () => {
  const status = getComparisonStatus(dimensions, {
    offers: [
      { id: "a", name: "Offer A", scores: { interest: 8, salary: "" } },
      { id: "b", name: "Offer B", scores: { interest: 0, salary: 7 } }
    ],
    weights: { interest: 8, salary: 6 }
  });

  assert.equal(status.isComplete, false);
  assert.deepEqual(status.missingByOffer, [
    { offerId: "a", offerName: "Offer A", dimensions: [{ id: "salary", label: "待遇" }] }
  ]);
  assert.equal(status.completedScoreCount, 3);
  assert.equal(status.totalRequiredScoreCount, 4);
});

test("ignores blank scores for zero-weight dimensions", () => {
  const status = getComparisonStatus(dimensions, {
    offers: [{ id: "a", name: "Offer A", scores: { interest: 8, salary: "" } }],
    weights: { interest: 8, salary: 0 }
  });

  assert.equal(status.isComplete, true);
  assert.deepEqual(status.missingByOffer, []);
});

test("explains the leading offer against the runner up", () => {
  const explanation = getRecommendationExplanation(dimensions, [
    { name: "Offer A", scores: { interest: 9, salary: 5 } },
    { name: "Offer B", scores: { interest: 7, salary: 8 } }
  ], { interest: 8, salary: 6 });

  assert.deepEqual(explanation.primaryStrength, { label: "兴趣程度", value: 72 });
  assert.deepEqual(explanation.primaryWeakness, { label: "待遇", value: 5 });
  assert.deepEqual(explanation.keyDifference, { label: "兴趣程度", value: 16 });
});

test("has no runner-up difference for one offer", () => {
  const explanation = getRecommendationExplanation(dimensions, [
    { name: "Offer A", scores: { interest: 9, salary: 5 } }
  ], { interest: 8, salary: 6 });

  assert.equal(explanation.keyDifference, null);
});

test("excludes zero-weight dimensions from recommendation evidence", () => {
  const explanation = getRecommendationExplanation(dimensions, [
    { name: "Offer A", scores: { interest: 8, salary: 1 } }
  ], { interest: 10, salary: 0 });

  assert.deepEqual(explanation.primaryStrength, { label: "兴趣程度", value: 80 });
  assert.deepEqual(explanation.primaryWeakness, { label: "兴趣程度", value: 8 });
});

test("filters explicit scores below user minimums without rejecting blanks", () => {
  const status = getHardConstraintStatus(dimensions, {
    offers: [
      { id: "a", name: "Offer A", scores: { interest: 7, salary: 5 } },
      { id: "b", name: "Offer B", scores: { interest: "", salary: 8 } }
    ],
    minimumScores: { interest: 8, salary: "" }
  });

  assert.deepEqual(status.eligibleOfferIds, ["b"]);
  assert.deepEqual(status.failures, [{
    offerId: "a",
    offerName: "Offer A",
    dimensions: [{ id: "interest", label: "兴趣程度", score: 7, minimum: 8 }]
  }]);
});
