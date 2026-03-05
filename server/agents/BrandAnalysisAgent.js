const BaseAgent = require('./BaseAgent');
const Groq = require('groq-sdk');
const { chromium } = require('playwright');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Color Utilities ───────────────────────────────────────────────────────────

function rgbToHex(rgb) {
  if (!rgb || rgb === 'none' || rgb === 'transparent') return null;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  if (r > 250 && g > 250 && b > 250) return null;
  if (r < 10 && g < 10 && b < 10) return null;
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function isValidHex(hex) {
  return typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex.trim());
}

function cleanColorArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(item => item && isValidHex(item.hex))
    .map(item => ({ hex: item.hex.toUpperCase(), usage: item.usage || '' }));
}

// ─── Social URL Auto-Detector ──────────────────────────────────────────────────
// Finds social media profile links from the brand's own website footer/header.
// This means the user doesn't need to paste social URLs manually.

function extractSocialUrls(pageLinks = []) {
  const social = { instagram: null, linkedin: null, facebook: null };

  for (const link of pageLinks) {
    if (!link) continue;
    if (!social.instagram && /instagram\.com\/(?!p\/|reel\/|explore\/|stories\/)([A-Za-z0-9_.]+)/.test(link)) {
      social.instagram = link.split('?')[0].replace(/\/$/, '');
    }
    if (!social.linkedin && /linkedin\.com\/(company|in)\/([A-Za-z0-9_-]+)/.test(link)) {
      social.linkedin = link.split('?')[0].replace(/\/$/, '');
    }
    if (!social.facebook && /facebook\.com\/(?!sharer|share|dialog)([A-Za-z0-9_.]+)/.test(link)) {
      social.facebook = link.split('?')[0].replace(/\/$/, '');
    }
  }

  return social;
}

// ─── Main Agent ────────────────────────────────────────────────────────────────

class BrandAnalysisAgent extends BaseAgent {
  constructor() {
    super('BrandAnalysisAgent', 'Elite Visual + Strategic Brand Analyst.');
  }

  // ── STEP 1: Deep Visual Scan ────────────────────────────────────────────────
  async deepVisualScan(page) {
    this.log('Running Deep Visual Scan...');

    return await page.evaluate(() => {
      const rgbToHex = (rgb) => {
        if (!rgb || rgb === 'none' || rgb === 'transparent') return null;
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
        if (r > 250 && g > 250 && b > 250) return null;
        if (r < 10 && g < 10 && b < 10) return null;
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      };

      // A. CSS Variable Hunting
      const cssVarColors = {};
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (rule.style) {
              const varNames = [
                '--primary', '--primary-color', '--brand', '--brand-color',
                '--accent', '--accent-color', '--color-primary', '--theme-color',
                '--main-color', '--secondary', '--highlight', '--cta-color', '--button-color'
              ];
              for (const v of varNames) {
                const val = rule.style.getPropertyValue(v).trim();
                if (val && val.startsWith('#')) cssVarColors[v] = val.toUpperCase();
              }
            }
          }
        } catch (e) { /* Cross-origin — skip */ }
      }
      const rootStyle = getComputedStyle(document.documentElement);
      ['--primary', '--primary-color', '--brand-color', '--accent', '--secondary'].forEach(v => {
        const val = rootStyle.getPropertyValue(v).trim();
        if (val) cssVarColors[v] = val;
      });

      // B. Button / CTA Color + Text Mining
      const buttons = Array.from(document.querySelectorAll('a, button, [class*="btn"], [class*="button"], [class*="cta"]'));
      const btnColors = {};
      const ctaTexts = [];

      buttons.slice(0, 30).forEach(btn => {
        const style = window.getComputedStyle(btn);
        const bg = rgbToHex(style.backgroundColor);
        const color = rgbToHex(style.color);
        if (bg) btnColors[bg] = (btnColors[bg] || 0) + 1;
        if (color) btnColors[color] = (btnColors[color] || 0) + 1;
        const text = btn.innerText?.trim();
        if (text && text.length > 1 && text.length < 50) ctaTexts.push(text);
      });

      const sortedBtnColors = Object.entries(btnColors)
        .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hex]) => hex);
      const uniqueCtaTexts = [...new Set(ctaTexts)].slice(0, 10);

      // C. Global Color Frequency
      const colorFrequency = {};
      Array.from(document.querySelectorAll('*')).slice(0, 200).forEach(el => {
        const style = window.getComputedStyle(el);
        [style.backgroundColor, style.color, style.borderColor].forEach(c => {
          const hex = rgbToHex(c);
          if (hex) colorFrequency[hex] = (colorFrequency[hex] || 0) + 1;
        });
      });
      const dominantColors = Object.entries(colorFrequency)
        .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([hex]) => hex);

      // D. Logo Detection
      const logoImg = Array.from(document.querySelectorAll('img, svg')).find(el => {
        const attrs = (el.alt || '') + (el.className || '') + (el.id || '') + (el.src || '');
        return /logo/i.test(attrs);
      });

      // E. Typography
      const bodyStyle = window.getComputedStyle(document.body);
      const h1 = document.querySelector('h1');
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      const btn1 = document.querySelector('button, [class*="btn"]');
      const btn1Style = btn1 ? window.getComputedStyle(btn1) : null;

      // F. Social Media Links — auto-detected from all page anchors
      const allLinks = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(href => /instagram|linkedin|facebook/.test(href));

      return {
        colors: { css_variables: cssVarColors, cta_colors: sortedBtnColors, dominant_palette: dominantColors },
        cta_texts: uniqueCtaTexts,
        social_links_found: allLinks,
        logo: {
          img_src  : logoImg?.src || null,
          og_image : document.querySelector('meta[property="og:image"]')?.content || null,
          favicon  : document.querySelector('link[rel*="icon"]')?.href || null
        },
        typography: {
          body_font    : bodyStyle.fontFamily?.split(',')[0].replace(/['"]/g, '').trim(),
          heading_font : h1Style?.fontFamily?.split(',')[0].replace(/['"]/g, '').trim() || null,
          cta_font     : btn1Style?.fontFamily?.split(',')[0].replace(/['"]/g, '').trim() || null,
          body_size    : bodyStyle.fontSize,
          heading_size : h1Style?.fontSize || null
        },
        metadata: {
          title          : document.title,
          description    : document.querySelector('meta[name="description"]')?.content || '',
          og_title       : document.querySelector('meta[property="og:title"]')?.content || '',
          og_description : document.querySelector('meta[property="og:description"]')?.content || '',
          keywords       : document.querySelector('meta[name="keywords"]')?.content || ''
        },
        headings: {
          h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(Boolean).join(' | '),
          h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 8).join(' | ')
        }
      };
    });
  }

  // ── STEP 2: Clean page text ─────────────────────────────────────────────────
  async getPageContent(page, maxChars = 6000) {
    await page.evaluate(() => {
      document.querySelectorAll(
        'nav, footer, header, script, style, noscript, ' +
        '[class*="cookie"], [class*="popup"], [class*="modal"], ' +
        '[class*="banner"], [class*="toast"], [class*="chat"], ' +
        '[class*="widget"], [aria-hidden="true"], [class*="ad-"], ' +
        '[class*="overlay"], [class*="consent"], [id*="cookie"], ' +
        '[id*="chat"], [id*="intercom"], [id*="zendesk"]'
      ).forEach(el => el.remove());
    });
    return await page.evaluate(
      (max) => document.body.innerText.replace(/\s+/g, ' ').trim().substring(0, max),
      maxChars
    );
  }

  // ── STEP 3: Scrape LinkedIn ─────────────────────────────────────────────────
  // LinkedIn public company pages are the most reliably scrapeable.
  // We extract: tagline, about text, follower/employee stats, specialties, recent post snippets.
  async scrapeLinkedIn(context, linkedinUrl) {
    this.log(`Scraping LinkedIn: ${linkedinUrl}`);
    const page = await context.newPage();
    try {
      await page.goto(linkedinUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const data = await page.evaluate(() => {
        const statsText = Array.from(document.querySelectorAll('p, span, div'))
          .map(el => el.innerText?.trim())
          .filter(t => t && /follower|employee/i.test(t) && t.length < 80)
          .slice(0, 3);

        const tagline = document.querySelector('h2')?.innerText?.trim()
          || document.querySelector('[class*="tagline"]')?.innerText?.trim()
          || null;

        const aboutSection = document.querySelector('[class*="about"]')?.innerText?.trim()
          || document.querySelector('section p')?.innerText?.trim()
          || null;

        const posts = Array.from(document.querySelectorAll('[class*="post"], [class*="feed"], article'))
          .map(el => el.innerText?.trim().substring(0, 200))
          .filter(t => t && t.length > 30)
          .slice(0, 5);

        const specialties = Array.from(document.querySelectorAll('[class*="specialt"]'))
          .map(el => el.innerText?.trim()).filter(Boolean).slice(0, 1).join('');

        return { stats: statsText, tagline, about: aboutSection, recent_posts: posts, specialties };
      });

      await page.close();

      const hasContent = data.tagline || data.about || data.stats.length > 0;
      if (!hasContent) {
        this.log('LinkedIn: blocked or no public content found.');
        return { scraped: false, url: linkedinUrl };
      }

      this.log(`LinkedIn scraped — tagline: "${data.tagline?.substring(0, 50)}"`);
      return { scraped: true, url: linkedinUrl, ...data };

    } catch (e) {
      await page.close().catch(() => {});
      this.log(`LinkedIn scrape failed: ${e.message}`);
      return { scraped: false, url: linkedinUrl, error: e.message };
    }
  }

  // ── STEP 4: Scrape Instagram ────────────────────────────────────────────────
  // Instagram aggressively blocks feed scraping.
  // We ONLY target the public profile: bio, hashtags, category from meta tags.
  // This is enough for brand tone and content style inference.
  async scrapeInstagram(context, instagramUrl) {
    this.log(`Scraping Instagram: ${instagramUrl}`);
    const page = await context.newPage();
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      });

      await page.goto(instagramUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const data = await page.evaluate(() => {
        // Meta description is most reliable — Instagram always sets this for public profiles
        const bio = document.querySelector('meta[name="description"]')?.content
          || document.querySelector('[class*="bio"]')?.innerText?.trim()
          || null;

        const hashtags = (bio || '').match(/#[A-Za-z0-9_]+/g)?.slice(0, 10) || [];
        const category = document.querySelector('[class*="category"]')?.innerText?.trim() || null;
        const loginWall = !!document.querySelector('input[name="username"]')
          || /log in/i.test(document.title);

        return { bio, hashtags, category, login_wall: loginWall, title: document.title };
      });

      await page.close();

      if (data.login_wall) {
        this.log('Instagram: login wall — using meta data only.');
        return {
          scraped: 'partial', url: instagramUrl,
          bio: data.bio, hashtags: data.hashtags, category: data.category,
          note: 'Login wall — limited to public meta data'
        };
      }

      this.log(`Instagram scraped — bio: "${data.bio?.substring(0, 60)}"`);
      return { scraped: true, url: instagramUrl, ...data };

    } catch (e) {
      await page.close().catch(() => {});
      this.log(`Instagram scrape failed: ${e.message}`);
      return { scraped: false, url: instagramUrl, error: e.message };
    }
  }

  // ── STEP 5: Scrape Facebook ─────────────────────────────────────────────────
  // Facebook public pages give us: description, category, about fragments from meta.
  // Feed posts require login so we don't attempt those.
  async scrapeFacebook(context, facebookUrl) {
    this.log(`Scraping Facebook: ${facebookUrl}`);
    const page = await context.newPage();
    try {
      await page.goto(facebookUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const data = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]')?.content || null;
        const ogDesc   = document.querySelector('meta[property="og:description"]')?.content || null;
        const title    = document.querySelector('meta[property="og:title"]')?.content || document.title || null;
        const category = document.querySelector('[class*="category"]')?.innerText?.trim() || null;

        const aboutFragments = Array.from(document.querySelectorAll('p, [role="main"] span'))
          .map(el => el.innerText?.trim())
          .filter(t => t && t.length > 20 && t.length < 300)
          .slice(0, 5);

        const loginWall = /log in/i.test(document.title)
          || !!document.querySelector('[data-testid="royal_login_form"]');

        return { meta_description: metaDesc, og_description: ogDesc, title, category, about_fragments: aboutFragments, login_wall: loginWall };
      });

      await page.close();

      if (data.login_wall) {
        this.log('Facebook: login wall — using meta data only.');
        return {
          scraped: 'partial', url: facebookUrl,
          description: data.meta_description || data.og_description,
          title: data.title, category: data.category,
          note: 'Login wall — limited to public meta data'
        };
      }

      this.log(`Facebook scraped — title: "${data.title?.substring(0, 60)}"`);
      return { scraped: true, url: facebookUrl, ...data };

    } catch (e) {
      await page.close().catch(() => {});
      this.log(`Facebook scrape failed: ${e.message}`);
      return { scraped: false, url: facebookUrl, error: e.message };
    }
  }

  // ── STEP 6: LLM call with retry ─────────────────────────────────────────────
  async callLLM(systemPrompt, userPrompt, retryCount = 0) {
    this.log(`Calling Llama 3.3-70b... (attempt ${retryCount + 1})`);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.05,
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
        this.log(`JSON parse failed: "${parseError.message}" — retrying with error feedback...`);
        const fixedUserPrompt = `${userPrompt}

---
IMPORTANT: Your previous response failed JSON.parse with this error:
"${parseError.message}"
Return ONLY valid, parseable JSON. No markdown. No explanation. Just the JSON object.`;
        return this.callLLM(systemPrompt, fixedUserPrompt, retryCount + 1);
      }
      throw new Error(`LLM returned invalid JSON after 3 attempts. Last error: ${parseError.message}`);
    }
  }

  // ── MAIN RUN ────────────────────────────────────────────────────────────────
  // socialUrls is optional — { instagram, linkedin, facebook }
  // If not passed, we auto-detect from the website's own footer/header links.
  async run(brandUrl, socialUrls = {}) {
    this.log(`== ELITE Agent 1 Starting: ${brandUrl} ==`);
    let browser;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 }
      });

      // ── Homepage ──
      const homePage = await context.newPage();
      await homePage.goto(brandUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await homePage.waitForTimeout(2000);

      const visual   = await this.deepVisualScan(homePage);
      const homeText = await this.getPageContent(homePage, 5000);
      await homePage.close();

      // ── Resolve social URLs: user-provided > auto-detected from homepage ──
      const detectedSocials = extractSocialUrls(visual.social_links_found || []);
      const resolvedSocials = {
        instagram : socialUrls.instagram || detectedSocials.instagram,
        linkedin  : socialUrls.linkedin  || detectedSocials.linkedin,
        facebook  : socialUrls.facebook  || detectedSocials.facebook
      };
      this.log(`Socials — IG: ${resolvedSocials.instagram || 'none'} | LI: ${resolvedSocials.linkedin || 'none'} | FB: ${resolvedSocials.facebook || 'none'}`);

      // ── About Page ──
      let aboutText = '';
      try {
        const p = await context.newPage();
        await p.goto(`${new URL(brandUrl).origin}/about`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await p.waitForTimeout(1000);
        aboutText = await this.getPageContent(p, 3000);
        this.log('About page scraped.');
        await p.close();
      } catch (e) { this.log('About page not found.'); }

      // ── Pricing Page ──
      let pricingText = '';
      try {
        const p = await context.newPage();
        await p.goto(`${new URL(brandUrl).origin}/pricing`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await p.waitForTimeout(1000);
        pricingText = await this.getPageContent(p, 2000);
        this.log('Pricing page scraped.');
        await p.close();
      } catch (e) { this.log('Pricing page not found.'); }

      // ── Social Media Scraping — all 3 in parallel for speed ──
      // Total wait time = slowest platform, NOT sum of all three.
      this.log('Starting social scraping (parallel)...');
      const [linkedinData, instagramData, facebookData] = await Promise.all([
        resolvedSocials.linkedin  ? this.scrapeLinkedIn(context, resolvedSocials.linkedin)   : Promise.resolve({ scraped: false, reason: 'No URL' }),
        resolvedSocials.instagram ? this.scrapeInstagram(context, resolvedSocials.instagram) : Promise.resolve({ scraped: false, reason: 'No URL' }),
        resolvedSocials.facebook  ? this.scrapeFacebook(context, resolvedSocials.facebook)   : Promise.resolve({ scraped: false, reason: 'No URL' })
      ]);
      this.log(`Social results — LI: ${linkedinData.scraped} | IG: ${instagramData.scraped} | FB: ${facebookData.scraped}`);

      await browser.close();
      browser = null;

      // ── Build social context object for the LLM ──
      // Scraped platforms get real data. Blocked/missing platforms get status "not_scraped"
      // and the AI falls back to Option C (inference from website data).
      const socialContext = {
        linkedin: linkedinData.scraped
          ? {
              status      : 'scraped',
              url         : linkedinData.url,
              tagline     : linkedinData.tagline     || null,
              about       : linkedinData.about       || null,
              stats       : linkedinData.stats       || [],
              specialties : linkedinData.specialties || null,
              recent_posts: linkedinData.recent_posts || []
            }
          : { status: 'not_scraped', url: resolvedSocials.linkedin || null, reason: linkedinData.reason || linkedinData.error || 'Blocked or not found' },

        instagram: (instagramData.scraped === true || instagramData.scraped === 'partial')
          ? {
              status  : instagramData.scraped === 'partial' ? 'partial' : 'scraped',
              url     : instagramData.url,
              bio     : instagramData.bio      || null,
              hashtags: instagramData.hashtags || [],
              category: instagramData.category || null,
              note    : instagramData.note     || null
            }
          : { status: 'not_scraped', url: resolvedSocials.instagram || null, reason: instagramData.reason || instagramData.error || 'Blocked or not found' },

        facebook: (facebookData.scraped === true || facebookData.scraped === 'partial')
          ? {
              status     : facebookData.scraped === 'partial' ? 'partial' : 'scraped',
              url        : facebookData.url,
              description: facebookData.description || facebookData.meta_description || null,
              category   : facebookData.category    || null,
              about      : facebookData.about_fragments?.join(' ') || null
            }
          : { status: 'not_scraped', url: resolvedSocials.facebook || null, reason: facebookData.reason || facebookData.error || 'Blocked or not found' }
      };

      // ── Structure all website data ──
      const structuredContent = {
        page_title      : visual.metadata.title,
        meta_description: visual.metadata.description,
        og_title        : visual.metadata.og_title,
        og_description  : visual.metadata.og_description,
        keywords        : visual.metadata.keywords,
        h1_headings     : visual.headings.h1.split(' | ').filter(Boolean),
        h2_headings     : visual.headings.h2.split(' | ').filter(Boolean),
        cta_button_texts: visual.cta_texts,
        homepage_body   : homeText,
        about_page      : aboutText   || null,
        pricing_page    : pricingText || null
      };

      // ── AI Synthesis ──
      this.log('Synthesizing brand + social data with Llama 3.3-70b...');

      const systemPrompt = `You are a world-class brand strategist with 20 years of experience analyzing Fortune 500 brands. You synthesize scraped website data, visual signals, and social media data into precise Brand Intelligence Reports.

THINKING PROCESS:
Think step by step inside a <thinking> block first:
1. What industry and market position does this brand occupy?
2. What do CTA texts and headings reveal about their GTM strategy?
3. What tone and personality emerges from their website AND social media language?
4. What does their LinkedIn presence say about their professional positioning?
5. What does their Instagram bio/hashtags reveal about their visual content style?
6. For any platform marked "not_scraped", infer their likely strategy from website tone, industry, and audience.
Then output the JSON after your thinking.

SOCIAL MEDIA RULES:
- status "scraped" or "partial" → base analysis on real provided data
- status "not_scraped" → infer strategy from brand tone + industry + website content. Set data_source to "inferred".
- Always populate social_media_presence for ALL 3 platforms regardless of scrape status.

STRICT RULES:
- brand_tone: EXACTLY 3–5 single adjectives
- content_pillars: EXACTLY 4–6 specific themes — NOT generic ones like "Education"
- All hex values must match /^#[0-9A-Fa-f]{6}$/ format
- Be SPECIFIC to this brand — no generic filler
- If website content appears to be a bot-detection page with fewer than 50 real words: return {"error": "insufficient_content", "reason": "..."}
- Do NOT invent colors — colors are injected from real scraped data

QUALITY BAR:
For Apple: brand_tone = ["Minimalist", "Aspirational", "Premium"]
For Stripe: brand_tone = ["Clean", "Developer-first", "Trustworthy"]
For Airbnb: brand_tone = ["Warm", "Community-focused", "Adventurous"]`;

      const userPrompt = `Analyze this brand and return a complete Brand Intelligence Report including social media analysis.

=== WEBSITE DATA ===
${JSON.stringify(structuredContent, null, 2)}

=== VISUAL FINGERPRINT ===
CSS Variables: ${JSON.stringify(visual.colors.css_variables)}
CTA Button Colors: ${visual.colors.cta_colors.join(', ')}
Dominant Palette: ${visual.colors.dominant_palette.join(', ')}
Body Font: ${visual.typography.body_font}
Heading Font: ${visual.typography.heading_font}
CTA Font: ${visual.typography.cta_font}
Body Font Size: ${visual.typography.body_size}
Heading Font Size: ${visual.typography.heading_size}

=== SOCIAL MEDIA DATA ===
${JSON.stringify(socialContext, null, 2)}

NOTE: For platforms with status "not_scraped" — infer their likely social strategy.
For platforms with status "scraped" or "partial" — base your analysis on the real data provided.

=== RETURN THIS EXACT JSON FORMAT ===
{
  "brand_summary": "",
  "industry": "",
  "target_audience": "",
  "brand_tone": [],
  "brand_personality_traits": [],
  "core_offers": [],
  "value_proposition": "",
  "unique_differentiators": [],
  "customer_pain_points": [],
  "desired_customer_outcomes": [],
  "content_pillars": [],
  "visual_identity": {
    "primary_colors": [{"hex": "", "usage": ""}],
    "secondary_colors": [{"hex": "", "usage": ""}],
    "accent_colors": [{"hex": "", "usage": ""}],
    "typography": {
      "primary_font": "",
      "secondary_font": "",
      "font_style_description": ""
    },
    "design_style_description": "",
    "logo_style_description": ""
  },
  "social_media_presence": {
    "linkedin": {
      "data_source": "scraped | partial | inferred",
      "positioning": "",
      "content_style": "",
      "audience_type": "",
      "post_themes": [],
      "engagement_tone": ""
    },
    "instagram": {
      "data_source": "scraped | partial | inferred",
      "bio_summary": "",
      "content_style": "",
      "hashtag_strategy": "",
      "visual_aesthetic": "",
      "audience_type": ""
    },
    "facebook": {
      "data_source": "scraped | partial | inferred",
      "page_purpose": "",
      "content_style": "",
      "audience_type": "",
      "community_tone": ""
    }
  },
  "cross_platform_content_strategy": "",
  "suggested_positioning_statement": ""
}`;

      const report = await this.callLLM(systemPrompt, userPrompt);

      // ── Insufficient content guard ──
      if (report.error === 'insufficient_content') {
        throw new Error(`Brand analysis failed: ${report.reason || 'Insufficient page content — possible bot block'}`);
      }

      // ── Ground Truth Color Injection ──
      const ctaColors = visual.colors.cta_colors;
      const palette   = visual.colors.dominant_palette;
      const cssVars   = visual.colors.css_variables;

      report.visual_identity.primary_colors   = cleanColorArray(report.visual_identity.primary_colors);
      report.visual_identity.secondary_colors = cleanColorArray(report.visual_identity.secondary_colors);
      report.visual_identity.accent_colors    = cleanColorArray(report.visual_identity.accent_colors);

      const cssColorValues = Object.values(cssVars).filter(isValidHex).map(h => h.toUpperCase());
      const primarySource  = [...cssColorValues, ...palette].filter(isValidHex).slice(0, 3);

      if (primarySource.length > 0) {
        report.visual_identity.primary_colors = primarySource.map((hex, i) => ({
          hex,
          usage: i === 0 ? 'Primary Brand Color' : i === 1 ? 'Secondary Brand Color' : 'Tertiary Brand Color'
        }));
      }

      if (ctaColors.length > 0) {
        report.visual_identity.accent_colors = ctaColors.slice(0, 2).map((hex, i) => ({
          hex,
          usage: i === 0 ? 'CTA / Button Color' : 'Secondary CTA Color'
        }));
      }

      this.log(`Colors injected — Primary: ${report.visual_identity.primary_colors.length}, Accent: ${report.visual_identity.accent_colors.length}`);

      // ── Attach scrape metadata for frontend badges ──
      // Frontend can use this to show "Live Data" vs "AI Inferred" badges per platform
      report._social_scrape_meta = {
        linkedin  : { status: linkedinData.scraped,  url: resolvedSocials.linkedin  || null },
        instagram : { status: instagramData.scraped, url: resolvedSocials.instagram || null },
        facebook  : { status: facebookData.scraped,  url: resolvedSocials.facebook  || null }
      };

      const logo_url = visual.logo.img_src || visual.logo.og_image || visual.logo.favicon;

      this.log('== ELITE Analysis Complete (Website + Social Intelligence) ==');
      return { analysis: report, logo_url };

    } catch (error) {
      if (browser) await browser.close();
      this.log(`ELITE Agent failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new BrandAnalysisAgent();