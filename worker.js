const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_OFFERS = 10;
const MAX_DIMENSIONS = 12;

function headers(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), { status, headers: headers(env) });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "请求体必须是对象。";
  }

  if (payload.schemaVersion !== "recommendation_summary.v1") {
    return "不支持的摘要数据版本。";
  }

  if (!Array.isArray(payload.dimensions) || !payload.dimensions.length || payload.dimensions.length > MAX_DIMENSIONS) {
    return "维度数量无效。";
  }

  if (!Array.isArray(payload.offers) || !payload.offers.length || payload.offers.length > MAX_OFFERS) {
    return "Offer 数量无效。";
  }

  if (!payload.recommendation || typeof payload.recommendation !== "object") {
    return "缺少推荐结果。";
  }

  if ("notes" in payload || payload.offers.some((offer) => offer && typeof offer === "object" && "notes" in offer)) {
    return "摘要请求不能包含备注。";
  }

  return null;
}

export default {
  async fetch(request, env) {
    if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
      return json({ error: "不允许的来源。" }, 403, env);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: headers(env) });
    }

    if (request.method !== "POST") {
      return json({ error: "仅支持 POST。" }, 405, env);
    }

    if (new URL(request.url).pathname !== "/summary") {
      return json({ error: "未找到接口。" }, 404, env);
    }

    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return json({ error: "Content-Type 必须为 application/json。" }, 400, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_error) {
      return json({ error: "请求体必须是有效 JSON。" }, 400, env);
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      return json({ error: validationError }, 400, env);
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content: "你是职业选择决策助手。只依据用户 JSON，以 2-3 句中文说明当前排序；comparison.status 为 incomplete 时只能说明暂时排名与待补信息，不得编造事实。"
          },
          { role: "user", content: JSON.stringify(payload) }
        ],
        max_tokens: 220
      });
      const summary = String(result?.response || "").trim();

      return summary
        ? json({ summary }, 200, env)
        : json({ error: "模型未返回摘要。" }, 502, env);
    } catch (_error) {
      return json({ error: "AI 摘要暂不可用，请稍后重试。" }, 502, env);
    }
  }
};
