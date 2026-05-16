const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-v4-flash";

type JsonRecord = Record<string, unknown>;

type DecisionSummaryRequest = {
  recommendation?: JsonRecord;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Only POST requests are supported." }, 405);
  }

  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekApiKey) {
    return jsonResponse({ error: "DEEPSEEK_API_KEY is not configured." }, 500);
  }

  let payload: DecisionSummaryRequest;
  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const recommendation = payload.recommendation;
  const validationError = validateRecommendation(recommendation);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  try {
    const summary = await generateDecisionSummary(deepseekApiKey, recommendation);
    return jsonResponse({ summary });
  } catch (error) {
    console.error("generate-decision-summary failed", error);
    return jsonResponse({ error: "Failed to generate decision summary." }, 500);
  }
});

function validateRecommendation(recommendation: unknown): string | null {
  if (!recommendation || typeof recommendation !== "object" || Array.isArray(recommendation)) {
    return "Missing recommendation object.";
  }

  const data = recommendation as JsonRecord;
  if (data.schemaVersion !== "recommendation_result.v1") {
    return "Unsupported recommendation schemaVersion.";
  }

  if (!Array.isArray(data.dimensions) || data.dimensions.length === 0) {
    return "recommendation.dimensions must be a non-empty array.";
  }

  if (!Array.isArray(data.offers) || data.offers.length === 0) {
    return "recommendation.offers must be a non-empty array.";
  }

  if (!data.recommendation || typeof data.recommendation !== "object") {
    return "recommendation.recommendation is required.";
  }

  return null;
}

async function generateDecisionSummary(deepseekApiKey: string, recommendation: JsonRecord): Promise<string> {
  const model = Deno.env.get("DEEPSEEK_MODEL") || DEFAULT_MODEL;
  const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${deepseekApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "你是一个职业选择决策助手。",
            "你的任务是基于用户提供的 offer 打分 JSON，生成简短、克制、可信的中文决策总结。",
            "只能使用 JSON 中出现的 offer、维度、分数、权重、排名和备注信息。",
            "不要编造 JSON 中没有的事实、公司背景、薪资细节或用户偏好。",
            "输出 2-3 句中文自然语言，不要输出 Markdown、JSON 或项目符号。"
          ].join("\n")
        },
        {
          role: "user",
          content: [
            "请基于以下推荐结果 JSON 生成决策总结。",
            "总结需要说明最终推荐哪个 offer，并结合所有 offer 的完整打分、权重和排名解释原因。",
            "可以简短提及其他 offer 的明显优势或权衡，但不要机械逐项罗列。",
            "",
            JSON.stringify(recommendation, null, 2)
          ].join("\n")
        }
      ],
      temperature: 0.4,
      max_tokens: 220,
      stream: false,
      thinking: {
        type: "disabled"
      }
    })
  });

  const responseBody = await response.json();
  if (!response.ok) {
    console.error("DeepSeek API error", response.status, responseBody);
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const summary = extractOutputText(responseBody);
  if (!summary) {
    console.error("DeepSeek API response did not include output text", responseBody);
    throw new Error("DeepSeek API response did not include output text.");
  }

  return summary.trim();
}

function extractOutputText(responseBody: JsonRecord): string {
  const choices = responseBody.choices;
  if (!Array.isArray(choices)) {
    return "";
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const message = (firstChoice as JsonRecord).message;
  if (!message || typeof message !== "object") {
    return "";
  }

  const content = (message as JsonRecord).content;
  return typeof content === "string" ? content : "";
}

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
