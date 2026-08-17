function isMissingScore(value) {
  return value === "" || value === null || value === undefined;
}

function getNumericScore(value) {
  if (isMissingScore(value)) {
    return null;
  }

  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

export function getComparisonStatus(dimensions, archive) {
  const requiredDimensions = dimensions
    .filter((dimension) => Number(archive.weights[dimension.id]) > 0);
  const missingByOffer = archive.offers.map((offer) => {
    const missingDimensions = requiredDimensions
      .filter((dimension) => isMissingScore(offer.scores[dimension.id]))
      .map(({ id, label }) => ({ id, label }));

    return missingDimensions.length
      ? { offerId: offer.id, offerName: offer.name, dimensions: missingDimensions }
      : null;
  }).filter(Boolean);

  const totalRequiredScoreCount = requiredDimensions.length * archive.offers.length;
  const completedScoreCount = totalRequiredScoreCount - missingByOffer
    .reduce((count, item) => count + item.dimensions.length, 0);

  return {
    isComplete: missingByOffer.length === 0,
    missingByOffer,
    completedScoreCount,
    totalRequiredScoreCount
  };
}

export function getHardConstraintStatus(dimensions, archive) {
  const failures = archive.offers.map((offer) => {
    const failedDimensions = dimensions.flatMap((dimension) => {
      const minimum = getNumericScore(archive.minimumScores?.[dimension.id]);
      const score = getNumericScore(offer.scores?.[dimension.id]);
      return minimum !== null && minimum > 0 && score !== null && score < minimum
        ? [{ id: dimension.id, label: dimension.label, score, minimum }]
        : [];
    });

    return failedDimensions.length
      ? { offerId: offer.id, offerName: offer.name, dimensions: failedDimensions }
      : null;
  }).filter(Boolean);
  const failedIds = new Set(failures.map((item) => item.offerId));

  return {
    eligibleOfferIds: archive.offers
      .filter((offer) => !failedIds.has(offer.id))
      .map((offer) => offer.id),
    failures
  };
}

export function getRecommendationExplanation(dimensions, ranking, weights) {
  const leader = ranking[0];
  if (!leader) {
    return { primaryStrength: null, primaryWeakness: null, keyDifference: null };
  }

  const scoredDimensions = dimensions.map((dimension) => ({
    label: dimension.label,
    score: getNumericScore(leader.scores[dimension.id]),
    weight: Number(weights[dimension.id]) || 0
  })).filter((dimension) => dimension.score !== null && dimension.weight > 0);

  const primaryStrength = [...scoredDimensions]
    .sort((a, b) => b.score * b.weight - a.score * a.weight)[0] || null;
  const primaryWeakness = [...scoredDimensions]
    .sort((a, b) => a.score - b.score)[0] || null;
  const runnerUp = ranking[1];
  const keyDifference = runnerUp
    ? dimensions.filter((dimension) => Number(weights[dimension.id]) > 0).map((dimension) => {
      const leaderScore = getNumericScore(leader.scores[dimension.id]);
      const runnerUpScore = getNumericScore(runnerUp.scores[dimension.id]);
      return leaderScore === null || runnerUpScore === null
        ? null
        : {
          label: dimension.label,
          value: (leaderScore - runnerUpScore) * (Number(weights[dimension.id]) || 0)
        };
    }).filter(Boolean).sort((a, b) => b.value - a.value)[0] || null
    : null;

  return {
    primaryStrength: primaryStrength && { label: primaryStrength.label, value: primaryStrength.score * primaryStrength.weight },
    primaryWeakness: primaryWeakness && { label: primaryWeakness.label, value: primaryWeakness.score },
    keyDifference
  };
}
