import axios from "axios";

export type ImportanceLevel = "urgent" | "high" | "medium" | "low";

export interface AIVerificationResult {
  isReal: boolean;
  summary: string;
  tags: string[];
  /** 相对用户监控关键词的相关性 0-100 */
  relevanceScore: number;
  /** 重要性：紧急 / 高 / 中 / 低 */
  importance: ImportanceLevel;
  /** 命中的监控关键词原文（须与传入列表一致） */
  matchedKeywords: string[];
}

interface KeywordMatchResult {
  matches: boolean;
  confidence: number;
}

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const apiUrl = "https://openrouter.ai/api/v1/chat/completions";

const AI_MODEL = process.env.AI_MODEL?.trim() || "deepseek/deepseek-v3.2";

const IMPORTANCE_LEVELS: ImportanceLevel[] = [
  "urgent",
  "high",
  "medium",
  "low",
];

function normalizeImportance(v: unknown): ImportanceLevel {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (IMPORTANCE_LEVELS.includes(s as ImportanceLevel)) {
    return s as ImportanceLevel;
  }
  return "medium";
}

/** AI 返回的 matchedKeywords 归一化为用户列表中的原文 */
function normalizeMatchedKeywords(
  raw: unknown,
  allowed: string[],
): string[] {
  if (!Array.isArray(raw) || allowed.length === 0) {
    return [];
  }
  const lower = (x: string) => x.trim().toLowerCase();
  const rawList = raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim());
  const out: string[] = [];
  for (const canon of allowed) {
    const c = canon.trim();
    if (!c) continue;
    if (
      rawList.some((r) => lower(r) === lower(c)) &&
      !out.some((x) => lower(x) === lower(c))
    ) {
      out.push(c);
    }
  }
  return out;
}

function fallbackMatchedByText(
  title: string,
  content: string,
  allowed: string[],
): string[] {
  const text = `${title} ${content}`.toLowerCase();
  return allowed.filter((k) => {
    const t = k.trim().toLowerCase();
    return t.length > 0 && text.includes(t);
  });
}

function parseVerificationJson(
  text: string,
  monitoredKeywords: string[],
): AIVerificationResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI 响应格式错误");
  }
  const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const tagsRaw = raw.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((t): t is string => typeof t === "string").slice(0, 8)
    : [];

  const relevanceScore = Math.min(
    100,
    Math.max(0, Number(raw.relevanceScore) || 0),
  );

  return {
    isReal: Boolean(raw.isReal),
    summary:
      typeof raw.summary === "string"
        ? raw.summary.slice(0, 500)
        : String(raw.summary ?? "").slice(0, 500),
    tags: tags.length > 0 ? tags : ["未分类"],
    relevanceScore,
    importance: normalizeImportance(raw.importance),
    matchedKeywords: normalizeMatchedKeywords(
      raw.matchedKeywords,
      monitoredKeywords,
    ),
  };
}

export const aiVerificationService = {
  /**
   * 教程对齐：原始信息 → AI 分析 → 真实性 → 相对监控词的相关性评分 → 重要性分级 → 摘要（+标签）
   */
  async verifyAndTag(
    title: string,
    content: string,
    monitoredKeywords: string[],
  ): Promise<AIVerificationResult> {
    const kwList = [...new Set(monitoredKeywords.map((k) => k.trim()).filter(Boolean))];

    try {
      if (!openrouterApiKey) {
        console.warn("⚠️ OpenRouter API Key 未配置，返回默认验证结果");
        const matched = fallbackMatchedByText(title, content, kwList);
        return {
          isReal: true,
          summary: content.substring(0, 200),
          tags: ["待验证"],
          relevanceScore: matched.length > 0 ? 55 : 25,
          importance: matched.length > 0 ? "medium" : "low",
          matchedKeywords: matched,
        };
      }

      const keywordBlock =
        kwList.length > 0
          ? `用户当前监控的关键词列表（matchedKeywords 中的每一项必须是下列原文之一，逐字一致；无匹配则返回空数组 []）：\n${kwList.map((k) => `- ${k}`).join("\n")}\n`
          : `当前没有配置监控关键词。此时 relevanceScore 表示该内容与互联网热点、科技资讯的通用相关度（0-100）；matchedKeywords 必须为空数组 []；importance 仍须给出。\n`;

      const prompt = `你是一个 AI 热点审核助手。请严格按下列顺序分析，并只输出一个 JSON 对象（不要 markdown 代码块）。

${keywordBlock}
待审核内容：
标题: ${title}
正文: ${content}

请完成：
1. 真实性判断 isReal：内容是否真实可信；识别标题党、谣言、明显造假（false 表示不可信）。
2. 相关性评分 relevanceScore：整数 0-100。${kwList.length > 0 ? "表示该内容与上述「监控关键词」整体的相关程度；完全不相关可给 0-30，强相关 70-100。" : "按上文「无关键词」规则评定通用相关度。"}
3. 重要性分级 importance：仅从以下四个英文小写值中选一个：urgent（紧急）、high（高）、medium（中）、low（低）。
4. 摘要 summary：中文，简洁，便于速读，不超过 100 字。
5. 标签 tags：字符串数组，3-5 个关键词标签。
6. matchedKeywords：字符串数组。${kwList.length > 0 ? "仅包含上面列表中出现过的关键词原文；没有则 []。" : "必须为 []。"}

JSON 结构示例：
{"isReal":true,"relevanceScore":75,"importance":"medium","summary":"……","tags":["a","b"],"matchedKeywords":[]}`;

      const response = await axios.post(
        apiUrl,
        {
          model: AI_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            "HTTP-Referer": "https://guo-hot-monitor.local",
          },
        },
      );

      const aiResponse = response.data.choices[0].message.content as string;
      const result = parseVerificationJson(aiResponse, kwList);

      if (result.matchedKeywords.length === 0 && kwList.length > 0) {
        result.matchedKeywords = fallbackMatchedByText(title, content, kwList);
      }

      return result;
    } catch (error) {
      console.error("❌ AI 验证失败:", error);
      const matched = fallbackMatchedByText(title, content, kwList);
      return {
        isReal: true,
        summary: content.substring(0, 200),
        tags: ["验证失败"],
        relevanceScore: matched.length > 0 ? 50 : 20,
        importance: "low",
        matchedKeywords: matched,
      };
    }
  },

  /**
   * 可选：单独关键词语义匹配（备用，流水线以 verifyAndTag.matchedKeywords 为主）
   */
  async matchKeyword(
    title: string,
    content: string,
    keyword: string,
  ): Promise<boolean> {
    try {
      if (!openrouterApiKey) {
        const text = `${title} ${content}`.toLowerCase();
        return text.includes(keyword.toLowerCase());
      }

      const prompt = `你是一个内容匹配助手。判断以下内容是否与关键词相关：

关键词: "${keyword}"

内容:
标题: ${title}
摘要: ${content}

请判断这个内容是否与关键词相关。考虑语义相关性，不仅仅是字面匹配。

请返回JSON格式的结果：
{
  "matches": true/false,
  "confidence": 85
}`;

      const response = await axios.post(
        apiUrl,
        {
          model: AI_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            "HTTP-Referer": "https://guo-hot-monitor.local",
          },
        },
      );

      const aiResponse = response.data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("AI 响应格式错误");
      }

      const result = JSON.parse(jsonMatch[0]) as KeywordMatchResult;
      return result.matches && result.confidence > 60;
    } catch (error) {
      console.error("❌ 关键词匹配失败:", error);
      const text = `${title} ${content}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    }
  },
};
