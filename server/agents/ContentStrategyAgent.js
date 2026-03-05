const BaseAgent = require('./BaseAgent');
const Groq = require('groq-sdk');
const { chromium } = require('playwright');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Main Agent ────────────────────────────────────────────────────────────────

class ContentStrategyAgent extends BaseAgent {
  constructor() {
    super('ContentStrategyAgent', 'Elite Content Strategist — turns Brand DNA into a 30-day content plan.');
  }

  // ── STEP 1: Scrape LinkedIn Posts ───────────────────────────────────────────
  // LinkedIn company post pages are public and server-side rendered.
  // We can reliably get the last 5-10 post texts without login.
  async scrapeLinkedInPosts(context, linkedinUrl) {
    this.log(`Scraping LinkedIn posts: ${linkedinUrl}`);
    const page = await context.newPage();

    try {
      // Navigate to the posts tab directly
      const postsUrl = linkedinUrl.replace(/\/$/, '') + '/posts/';
      await page.goto(postsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const posts = await page.evaluate(() => {
        // LinkedIn renders post text in these containers on public pages
        const postElements = Array.from(document.querySelectorAll(
          '[class*="feed-shared-update-v2"], [class*="occludable-update"], ' +
          'article, [class*="post-content"], [data-urn]'
        ));

        return postElements
          .map(el => {
            const text = el.innerText?.trim();
            // Filter noise — keep only real post-length content
            if (!text || text.length < 30 || text.length > 3000) return null;
            return text.substring(0, 500); // cap each post at 500 chars
          })
          .filter(Boolean)
          .slice(0, 8); // last 8 posts is enough for pattern analysis
      });

      await page.close();

      if (posts.length === 0) {
        this.log('LinkedIn posts: none found (possible block or empty feed).');
        return { scraped: false, posts: [] };
      }

      this.log(`LinkedIn posts scraped: ${posts.length} posts found.`);
      return { scraped: true, posts };

    } catch (e) {
      await page.close().catch(() => {});
      this.log(`LinkedIn posts scrape failed: ${e.message}`);
      return { scraped: false, posts: [], error: e.message };
    }
  }

  // ── STEP 2: Scrape Instagram Post Captions ──────────────────────────────────
  // Instagram embeds structured post data inside <script type="application/ld+json">
  // on public profile pages. This is reliable, fast, and doesn't trigger login walls.
  // We get the last 12 post captions without touching the feed directly.
  async scrapeInstagramCaptions(context, instagramUrl) {
    this.log(`Scraping Instagram captions: ${instagramUrl}`);
    const page = await context.newPage();

    try {
      await page.goto(instagramUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const captions = await page.evaluate(() => {
        // Method 1: ld+json structured data (most reliable)
        const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const captions = [];

        for (const script of ldScripts) {
          try {
            const data = JSON.parse(script.innerText);
            // Instagram ld+json can be an array or single object
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item.caption) captions.push(item.caption.substring(0, 400));
              if (item.articleBody) captions.push(item.articleBody.substring(0, 400));
              // Sometimes nested in @graph
              if (item['@graph']) {
                for (const node of item['@graph']) {
                  if (node.caption) captions.push(node.caption.substring(0, 400));
                }
              }
            }
          } catch (e) { /* malformed JSON — skip */ }
        }

        // Method 2: Fallback — visible caption text in the DOM
        if (captions.length === 0) {
          const visibleCaptions = Array.from(document.querySelectorAll(
            '[class*="caption"], [class*="post-text"], li article span'
          ))
            .map(el => el.innerText?.trim())
            .filter(t => t && t.length > 20)
            .slice(0, 12);
          captions.push(...visibleCaptions);
        }

        return captions.slice(0, 12);
      });

      await page.close();

      if (captions.length === 0) {
        this.log('Instagram captions: none found.');
        return { scraped: false, captions: [] };
      }

      this.log(`Instagram captions scraped: ${captions.length} posts found.`);
      return { scraped: true, captions };

    } catch (e) {
      await page.close().catch(() => {});
      this.log(`Instagram captions scrape failed: ${e.message}`);
      return { scraped: false, captions: [], error: e.message };
    }
  }

  // ── STEP 3: LLM Call with Retry ─────────────────────────────────────────────
  async callLLM(systemPrompt, userPrompt, retryCount = 0) {
    this.log(`Calling Llama 3.3-70b... (attempt ${retryCount + 1})`);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3, // slightly higher than Agent 1 — content ideas need creativity
      max_tokens: 4096
    });

    const usage = completion.usage;
    this.log(`Tokens — Prompt: ${usage.prompt_tokens} | Completion: ${usage.completion_tokens} | Total: ${usage.total_tokens}`);

    let responseText = completion.choices[0].message.content.trim();
    responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    responseText = responseText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    try {
      return JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseError) {
      if (retryCount < 2) {
        this.log(`JSON parse failed: "${parseError.message}" — retrying...`);
        const fixedPrompt = `${userPrompt}

---
IMPORTANT: Your previous response failed JSON.parse with: "${parseError.message}"
Return ONLY valid JSON. No markdown. No explanation.`;
        return this.callLLM(systemPrompt, fixedPrompt, retryCount + 1);
      }
      throw new Error(`LLM returned invalid JSON after 3 attempts: ${parseError.message}`);
    }
  }

  // ── MAIN RUN ────────────────────────────────────────────────────────────────
  // Takes the full Brand DNA from Agent 1 + scrapes real posts
  // Returns: audience personas, post analysis, gap analysis, 30-day calendar
  async run(brandData) {
    // brandData = the full Agent 1 output: { analysis, logo_url }
    // analysis contains: brand_tone, content_pillars, social_media_presence, etc.
    this.log(`== Agent 2 Starting: ${brandData.analysis.industry} brand ==`);

    const { analysis } = brandData;
    const socialMeta = analysis._social_scrape_meta || {};

    let browser;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 }
      });

      // ── Scrape posts from platforms where we have URLs ──
      // Run in parallel for speed
      this.log('Scraping social media posts (parallel)...');

      const linkedinUrl  = socialMeta.linkedin?.url  || null;
      const instagramUrl = socialMeta.instagram?.url || null;

      const [linkedinPosts, instagramCaptions] = await Promise.all([
        linkedinUrl  ? this.scrapeLinkedInPosts(context, linkedinUrl)       : Promise.resolve({ scraped: false, posts: [] }),
        instagramUrl ? this.scrapeInstagramCaptions(context, instagramUrl)  : Promise.resolve({ scraped: false, captions: [] })
      ]);

      this.log(`Post scrape — LI: ${linkedinPosts.scraped} (${linkedinPosts.posts?.length || 0} posts) | IG: ${instagramCaptions.scraped} (${instagramCaptions.captions?.length || 0} captions)`);

      await browser.close();
      browser = null;

      // ── Build post data context ──
      const postData = {
        linkedin: {
          available: linkedinPosts.scraped,
          posts    : linkedinPosts.posts || [],
          note     : !linkedinPosts.scraped ? 'Could not scrape — will infer from brand data' : null
        },
        instagram: {
          available: instagramCaptions.scraped,
          captions : instagramCaptions.captions || [],
          note     : !instagramCaptions.scraped ? 'Could not scrape — will infer from brand data' : null
        }
      };

      // ── AI Synthesis — 2 focused calls ──
      // Call 1: Post Analysis + Gap Analysis (analytical, low temp)
      // Call 2: 30-day Calendar (creative, slightly higher temp)
      // Splitting keeps each call focused and under token limits.

      // ─── CALL 1: Post Analysis + Audience Personas + Gap Analysis ───────────
      this.log('Running Call 1: Post analysis + gap analysis...');

      const analysisSystemPrompt = `You are a world-class content strategist. You analyze a brand's existing social media posts against their Brand DNA to identify content patterns, audience personas, and strategic gaps.

Think step by step inside a <thinking> block:
1. What content themes appear most in their actual posts?
2. What tone do they use on each platform?
3. Does their social voice match their website brand tone?
4. Which of their content pillars are underrepresented in posts?
5. Who is actually engaging with this content (persona inference)?
Then output the JSON.

STRICT RULES:
- Be specific — no generic statements
- If post data is unavailable for a platform, infer patterns from brand DNA + industry
- audience_personas: exactly 2-3 personas with name, demographics, goals, pain points
- content_gaps: exactly 3-5 specific gaps (not generic)
- Return ONLY raw JSON`;

      const analysisUserPrompt = `Analyze this brand's content strategy.

=== BRAND DNA (from Agent 1) ===
Industry: ${analysis.industry}
Target Audience: ${analysis.target_audience}
Brand Tone: ${JSON.stringify(analysis.brand_tone)}
Brand Personality: ${JSON.stringify(analysis.brand_personality_traits)}
Content Pillars: ${JSON.stringify(analysis.content_pillars)}
Value Proposition: ${analysis.value_proposition}
Customer Pain Points: ${JSON.stringify(analysis.customer_pain_points)}
Desired Outcomes: ${JSON.stringify(analysis.desired_customer_outcomes)}

=== SOCIAL MEDIA PRESENCE (from Agent 1) ===
${JSON.stringify(analysis.social_media_presence, null, 2)}

=== REAL POST DATA (scraped now) ===
${JSON.stringify(postData, null, 2)}

=== RETURN THIS EXACT JSON ===
{
  "post_analysis": {
    "linkedin": {
      "data_source": "scraped | inferred",
      "dominant_themes": [],
      "tone_observed": "",
      "content_formats_used": [],
      "avg_post_length": "short | medium | long",
      "top_hashtags": [],
      "posting_pattern": "",
      "voice_matches_brand": true,
      "voice_gap_notes": ""
    },
    "instagram": {
      "data_source": "scraped | inferred",
      "dominant_themes": [],
      "tone_observed": "",
      "content_formats_used": [],
      "avg_caption_length": "short | medium | long",
      "top_hashtags": [],
      "visual_style_inferred": "",
      "voice_matches_brand": true,
      "voice_gap_notes": ""
    }
  },
  "audience_personas": [
    {
      "persona_name": "",
      "age_range": "",
      "role_or_identity": "",
      "platforms_they_use": [],
      "goals": [],
      "pain_points": [],
      "content_they_engage_with": "",
      "best_platform_to_reach_them": ""
    }
  ],
  "content_gaps": [
    {
      "gap": "",
      "why_it_matters": "",
      "suggested_fix": "",
      "priority": "high | medium | low"
    }
  ],
  "platform_strategy": {
    "linkedin": {
      "primary_goal": "",
      "content_mix": "",
      "best_post_types": [],
      "optimal_posting_frequency": "",
      "best_times_to_post": []
    },
    "instagram": {
      "primary_goal": "",
      "content_mix": "",
      "best_post_types": [],
      "optimal_posting_frequency": "",
      "best_times_to_post": []
    },
    "facebook": {
      "primary_goal": "",
      "content_mix": "",
      "best_post_types": [],
      "optimal_posting_frequency": "",
      "best_times_to_post": []
    }
  },
  "overall_content_health_score": 0,
  "overall_content_health_notes": ""
}`;

      const strategyAnalysis = await this.callLLM(analysisSystemPrompt, analysisUserPrompt);

      // ─── CALL 2: 30-Day Content Calendar ─────────────────────────────────────
      this.log('Running Call 2: 30-day content calendar...');

      const calendarSystemPrompt = `You are a world-class social media content planner. You create detailed, platform-specific 30-day content calendars grounded in real brand data and gap analysis.

Think step by step inside a <thinking> block:
1. Which content pillars should be rotated across the 30 days?
2. Which gaps identified need to be addressed first?
3. How should the mix of educational / promotional / entertaining / community content be distributed?
4. What hooks and formats work best for this brand's tone?
Then output the JSON calendar.

STRICT RULES:
- Generate exactly 30 days of content
- Each day has exactly ONE post per active platform (LinkedIn + Instagram)
- Distribute content pillars evenly — no pillar should dominate more than 40% of posts
- Include a mix of: educational, promotional, storytelling, community, behind-the-scenes
- caption_hook: the FIRST sentence of the post — must be attention-grabbing and specific to this brand
- hashtags: 3-5 relevant hashtags per post
- Do NOT use generic hooks like "Are you struggling with...?" — be brand-specific
- Return ONLY raw JSON`;

      const calendarUserPrompt = `Create a 30-day content calendar for this brand.

=== BRAND DNA ===
Brand Summary: ${analysis.brand_summary}
Industry: ${analysis.industry}
Brand Tone: ${JSON.stringify(analysis.brand_tone)}
Content Pillars: ${JSON.stringify(analysis.content_pillars)}
Value Proposition: ${analysis.value_proposition}
Suggested Positioning: ${analysis.suggested_positioning_statement}

=== STRATEGY & GAPS (from Call 1) ===
Content Gaps: ${JSON.stringify(strategyAnalysis.content_gaps, null, 2)}
Platform Strategy: ${JSON.stringify(strategyAnalysis.platform_strategy, null, 2)}
Audience Personas: ${JSON.stringify(strategyAnalysis.audience_personas, null, 2)}

=== RETURN THIS EXACT JSON ===
{
  "calendar": [
    {
      "day": 1,
      "date_label": "Day 1",
      "content_pillar": "",
      "content_theme": "",
      "content_type": "educational | promotional | storytelling | community | behind-the-scenes",
      "linkedin": {
        "post_format": "text | carousel | video | poll | article",
        "caption_hook": "",
        "full_caption_guide": "",
        "hashtags": [],
        "cta": ""
      },
      "instagram": {
        "post_format": "single-image | carousel | reel | story",
        "caption_hook": "",
        "full_caption_guide": "",
        "hashtags": [],
        "visual_direction": "",
        "cta": ""
      }
    }
  ],
  "calendar_summary": {
    "total_posts": 60,
    "pillar_distribution": {},
    "content_type_distribution": {},
    "key_themes_this_month": []
  }
}`;

      const calendarResult = await this.callLLM(calendarSystemPrompt, calendarUserPrompt);

      // ── Assemble final Agent 2 output ──
      const result = {
        // From Call 1
        post_analysis              : strategyAnalysis.post_analysis,
        audience_personas          : strategyAnalysis.audience_personas,
        content_gaps               : strategyAnalysis.content_gaps,
        platform_strategy          : strategyAnalysis.platform_strategy,
        overall_content_health_score: strategyAnalysis.overall_content_health_score,
        overall_content_health_notes: strategyAnalysis.overall_content_health_notes,

        // From Call 2
        calendar        : calendarResult.calendar,
        calendar_summary: calendarResult.calendar_summary,

        // Metadata
        _meta: {
          brand_industry    : analysis.industry,
          linkedin_posts_used : linkedinPosts.posts?.length || 0,
          instagram_posts_used: instagramCaptions.captions?.length || 0,
          generated_at      : new Date().toISOString()
        }
      };

      this.log(`== Agent 2 Complete — ${result.calendar?.length || 0} calendar days generated ==`);
      return result;

    } catch (error) {
      if (browser) await browser.close();
      this.log(`Agent 2 failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ContentStrategyAgent();