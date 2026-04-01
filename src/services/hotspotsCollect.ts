import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../index";

interface HotspotRaw {
  id?: number;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
}

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

const httpClient = axios.create({
  timeout: 15000,
  headers: defaultHeaders,
});

const crawlerService = {
  async crawlBing(keyword: string): Promise<HotspotRaw[]> {
    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`;
      const response = await httpClient.get(url);
      const $ = cheerio.load(response.data);

      const hotspots: HotspotRaw[] = [];

      $("li.b_algo")
        .slice(0, 5)
        .each((i, element) => {
          const $item = $(element);
          const title = $item.find("h2 a").text().trim();
          const link = $item.find("h2 a").attr("href");
          const content = $item.find(".b_caption > p").text().trim();

          if (title && content) {
            hotspots.push({
              title,
              content,
              source: "Bing搜索",
              sourceUrl: link,
            });
          }
        });

      console.log(`✅ Bing搜索采集: 获得 ${hotspots.length} 条结果`);
      return hotspots;
    } catch (error) {
      console.error("❌ Bing搜索爬虫错误:", error);
      return [];
    }
  },

  async crawlSougou(keyword: string): Promise<HotspotRaw[]> {
    try {
      const url = `https://www.sogou.com/web?query=${encodeURIComponent(keyword)}`;
      const response = await httpClient.get(url);
      const $ = cheerio.load(response.data);

      const hotspots: HotspotRaw[] = [];

      $("div.results > div.vrwrap")
        .slice(0, 5)
        .each((i, element) => {
          const $item = $(element);
          const title = $item.find("h3 a").text().trim();
          const link = $item.find("h3 a").attr("href");
          const content = $item.find(".txt-box").text().trim();

          if (title && content) {
            hotspots.push({
              title,
              content: content.substring(0, 200),
              source: "搜狗搜索",
              sourceUrl: link,
            });
          }
        });

      console.log(`✅ 搜狗搜索采集: 获得 ${hotspots.length} 条结果`);
      return hotspots;
    } catch (error) {
      console.error("❌ 搜狗爬虫错误:", error);
      return [];
    }
  },

  async crawlHackerNews(): Promise<HotspotRaw[]> {
    try {
      const url = "https://news.ycombinator.com/newest";
      const response = await httpClient.get(url);
      const $ = cheerio.load(response.data);

      const hotspots: HotspotRaw[] = [];

      $("span.titleline > a")
        .slice(0, 10)
        .each((i, element) => {
          const $link = $(element);
          const title = $link.text().trim();
          const href = $link.attr("href");

          if (title && href) {
            hotspots.push({
              title,
              content: "HackerNews热门",
              source: "HackerNews",
              sourceUrl: href.startsWith("http")
                ? href
                : `https://news.ycombinator.com/${href}`,
            });
          }
        });

      console.log(`✅ HackerNews采集: 获得 ${hotspots.length} 条结果`);
      return hotspots;
    } catch (error) {
      console.error("❌ HackerNews爬虫错误:", error);
      return [];
    }
  },
};

const twitterService = {
  async fetchLatestTweets(keyword: string): Promise<HotspotRaw[]> {
    try {
      const bearerToken = process.env.TWITTER_BEARER_TOKEN;
      if (!bearerToken) {
        console.warn("⚠️ Twitter API Key 未配置");
        return [];
      }

      const response = await axios.get(
        "https://api.twitter.com/2/tweets/search/recent",
        {
          params: {
            query: keyword,
            max_results: 10,
            "tweet.fields": "public_metrics,created_at",
          },
          headers: { Authorization: `Bearer ${bearerToken}` },
        },
      );

      const hotspots: HotspotRaw[] = [];

      if (response.data.data) {
        response.data.data.forEach((tweet: any) => {
          hotspots.push({
            title: tweet.text.substring(0, 100),
            content: tweet.text,
            source: "Twitter",
            sourceUrl: `https://twitter.com/i/web/status/${tweet.id}`,
          });
        });
      }

      console.log(`✅ Twitter采集: 获得 ${hotspots.length} 条推文`);
      return hotspots;
    } catch (error) {
      console.error("⚠️ Twitter API 错误:", error);
      return [];
    }
  },
};

export const hotspotsCollectService = {
  async collectFromAllSources(): Promise<HotspotRaw[]> {
    console.log("🌍 开始从多个源采集热点...");

    const allHotspots: HotspotRaw[] = [];

    const keywords = await prisma.keyword.findMany({
      where: { status: "active" },
      take: 3,
    });

    for (const kw of keywords) {
      try {
        const [bingResults, sougouResults] = await Promise.all([
          crawlerService.crawlBing(kw.keyword),
          crawlerService.crawlSougou(kw.keyword),
        ]);

        allHotspots.push(...bingResults);
        allHotspots.push(...sougouResults);
      } catch (error) {
        console.error(`❌ 采集关键词 "${kw.keyword}" 失败:`, error);
      }
    }

    try {
      const hackerNewsResults = await crawlerService.crawlHackerNews();
      allHotspots.push(...hackerNewsResults);
    } catch (error) {
      console.error("❌ 采集热点话题失败:", error);
    }

    const seenTitles = new Set<string>();
    const uniqueHotspots = allHotspots.filter((h) => {
      if (seenTitles.has(h.title)) {
        return false;
      }
      seenTitles.add(h.title);
      return true;
    });

    console.log(`🔍 采集完成: 总共 ${uniqueHotspots.length} 条唯一热点`);

    const savedHotspots: HotspotRaw[] = [];

    for (const hotspot of uniqueHotspots) {
      try {
        const existing = await prisma.hotspot.findFirst({
          where: { title: hotspot.title },
        });

        if (!existing) {
          const saved = await prisma.hotspot.create({
            data: {
              title: hotspot.title,
              content: hotspot.content,
              source: hotspot.source,
              sourceUrl: hotspot.sourceUrl || null,
              relevanceScore: 0,
              verified: false,
            },
          });

          savedHotspots.push({ ...hotspot, id: saved.id });
        }
      } catch (error) {
        console.error(`❌ 保存热点失败: ${hotspot.title}`, error);
      }
    }

    console.log(`💾 保存了 ${savedHotspots.length} 条新热点到数据库`);
    return savedHotspots;
  },
};
