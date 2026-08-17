export function canGenerateDecisionSummary(comparisonStatus, hasEligibleOffer = true) {
  return Boolean(comparisonStatus?.isComplete && hasEligibleOffer);
}

function getLocalScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : null;
}

export function buildLocalDecisionSummary({ dimensions, activeArchive, rankedOffers }) {
  const selectedOffer = rankedOffers[0] || null;
  if (!selectedOffer) {
    return "当前没有满足底线的 Offer，建议先调整底线或补充评分。";
  }

  const rows = dimensions
    .map((dimension) => {
      const score = getLocalScore(selectedOffer.scores?.[dimension.id]);
      const weight = Number(activeArchive.weights?.[dimension.id]) || 0;
      return score === null ? null : {
        label: dimension.label,
        score,
        contribution: score * weight
      };
    })
    .filter(Boolean);
  const strengths = [...rows]
    .sort((a, b) => b.contribution - a.contribution || b.score - a.score)
    .slice(0, 2)
    .map((row) => `${row.label} ${row.score} 分`);
  const weakest = [...rows]
    .sort((a, b) => a.score - b.score || a.contribution - b.contribution)[0];
  const weightedScore = Number(selectedOffer.weightedScore);
  const scoreLabel = Number.isFinite(weightedScore) ? weightedScore.toFixed(2) : "暂未形成";
  const sentences = [`当前更推荐 ${selectedOffer.name}，综合评分 ${scoreLabel}。`];

  if (strengths.length) {
    sentences.push(`主要优势集中在${strengths.join("、")}。`);
  }
  if (weakest) {
    sentences.push(`需要重点核实${weakest.label}，当前为 ${weakest.score} 分。`);
  }

  const runnerUp = rankedOffers[1];
  if (runnerUp) {
    const difference = dimensions
      .map((dimension) => {
        const selectedScore = getLocalScore(selectedOffer.scores?.[dimension.id]);
        const runnerUpScore = getLocalScore(runnerUp.scores?.[dimension.id]);
        return selectedScore === null || runnerUpScore === null
          ? null
          : { label: dimension.label, value: selectedScore - runnerUpScore };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
    if (difference && difference.value !== 0) {
      const direction = difference.value > 0 ? "领先" : "落后";
      sentences.push(`与 ${runnerUp.name} 的关键差异在${difference.label}，${direction} ${Math.abs(difference.value)} 分。`);
    }
  }

  const note = [selectedOffer.note, ...Object.values(selectedOffer.notes || {})]
    .map((value) => String(value || "").trim())
    .find(Boolean);
  if (note) {
    sentences.push(`你记录的补充信息：“${note.slice(0, 100)}”。`);
  }

  return sentences.join("");
}

export function buildSummaryPayload({ dimensions, activeArchive, rankedOffers, comparisonStatus }) {
  const selectedOffer = rankedOffers[0] || null;

  return {
    schemaVersion: "recommendation_summary.v1",
    comparison: { status: comparisonStatus.isComplete ? "complete" : "incomplete" },
    dimensions: dimensions.map(({ id, label }) => ({
      id,
      label,
      weight: activeArchive.weights[id]
    })),
    offers: rankedOffers.map((offer, index) => ({
      id: offer.id,
      name: offer.name,
      rank: index + 1,
      weightedScore: Number(offer.weightedScore.toFixed(2)),
      scores: Object.fromEntries(dimensions.map(({ id }) => [
        id,
        offer.scores[id] === "" ? null : offer.scores[id]
      ]))
    })),
    recommendation: {
      selectedOfferId: selectedOffer?.id || null,
      selectedOfferName: selectedOffer?.name || null,
      selectedOfferRank: selectedOffer ? 1 : null,
      selectedOfferWeightedScore: selectedOffer ? Number(selectedOffer.weightedScore.toFixed(2)) : null
    }
  };
}
