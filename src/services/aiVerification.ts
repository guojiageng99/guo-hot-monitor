import axios from "axios";

interface AIVerificationResult {
  isReal: boolean; // 内容是否真实
  summary: string; // AI生成的摘要
  tags: string[]; // 自动标签
  relevanceScore: number; // 相关性评分 0-100
}

interface KeywordMatchResult {
  matches: boolean;
  confidence: number; // 匹配置信度 0-100
}

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const apiUrl = "https://openrouter.ai/api/v1/chat/completions";

export const aiVerificationService = {
  /**
   * 验证热点内容的真实性并生成标签
   */
  async verifyAndTag(
    title: string,
    content: string,
  ): Promise<AIVerificationResult> {
    try {
      if (!openrouterApiKey) {
        console.warn("⚠️ OpenRouter API Key 未配置，返回默认验证结果");
        return {
          isReal: true,
          summary: content.substring(0, 200),
          tags: ["待验证"],
          relevanceScore: 50,
        };
      }

      const prompt = `你是一个AI热点监控助手。请分析以下内容：

标题: ${title}
内容: ${content}

请执行以下任务：
1. 判断这个内容是否真实合理（考虑是否存在虚假信息、标题党等）
2. 生成一个简洁的摘要（不超过100字）
3. 自动识别3-5个相关标签
4. 给出相关性评分（0-100）

请以JSON格式返回以下数据：
{
  "isReal": true/false,
  "summary": "摘要内容",
  "tags": ["标签1", "标签2"],
  "relevanceScore": 75
}`;

      const response = await axios.post(
        apiUrl,
        {
          model: process.env.AI_MODEL || "deepseek/deepseek-v3.2",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            "HTTP-Referer": "https://guo-hot-monitor.local",
          },
        },
      );

      const aiResponse = response.data.choices[0].message.content;

      // 解析 JSON 响应
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI 响应格式错误");
      }

      const result = JSON.parse(jsonMatch[0]) as AIVerificationResult;
      return result;
    } catch (error) {
      console.error("❌ AI 验证失败:", error);
      return {
        isReal: true,
        summary: content.substring(0, 200),
        tags: ["验证失败"],
        relevanceScore: 50,
      };
    }
  },

  /**
   * 判断热点是否匹配指定关键词
   */
  async matchKeyword(
    title: string,
    content: string,
    keyword: string,
  ): Promise<boolean> {
    try {
      if (!openrouterApiKey) {
        // 简单的关键词匹配降级方案
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
          model: process.env.AI_MODEL || "deepseek/deepseek-v3.2",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
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
      // 降级方案：简单的字符串匹配
      const text = `${title} ${content}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    }
  },
};
