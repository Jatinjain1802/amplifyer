const BaseAgent = require('./BaseAgent');
const Groq = require('groq-sdk');
const { chromium } = require('playwright');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Convert rgb(r, g, b) string to #HEX
function rgbToHex(rgb) {
  if (!rgb || rgb === 'none' || rgb === 'transparent') return null;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  // Ignore near-white and near-black
  if (r > 240 && g > 240 && b > 240) return null; // white
  if (r < 15 && g < 15 && b < 15) return null;    // black
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

class BrandAnalysisAgent extends BaseAgent {
  constructor() {
    super('BrandAnalysisAgent', 'Elite Visual + Strategic Brand Analyst.');
  }

  /** STEP 1: Deep Visual Scan with Playwright */
  async deepVisualScan(page, baseUrl) {
    this.log('Running Deep Visual Scan...');

    const result = await page.evaluate(() => {
      const rgbToHex = (rgb) => {
        if (!rgb || rgb === 'none' || rgb === 'transparent') return null;
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
        if (r > 240 && g > 240 && b > 240) return null;
        if (r < 15 && g < 15 && b < 15) return null;
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      };

      // --- A. CSS Variable Hunting ---
      const cssVarColors = {};
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.style) {
              const varNames = ['--primary', '--primary-color', '--brand', '--brand-color',
                '--accent', '--accent-color', '--color-primary', '--theme-color', '--main-color',
                '--secondary', '--highlight', '--cta-color', '--button-color'];
              for (const v of varNames) {
                const val = rule.style.getPropertyValue(v).trim();
                if (val && val.startsWith('#')) cssVarColors[v] = val.toUpperCase();
              }
            }
          }
        } catch (e) { /* Cross-origin sheets can't be read - we skip */ }
      }
      // Also check :root computed styles
      const rootStyle = getComputedStyle(document.documentElement);
      const varNamesToCheck = ['--primary', '--primary-color', '--brand-color', '--accent', '--secondary'];
      for (const v of varNamesToCheck) {
        const val = rootStyle.getPropertyValue(v).trim();
        if (val) cssVarColors[v] = val;
      }

      // --- B. Button / CTA Color Mining ---
      const buttons = Array.from(document.querySelectorAll('a, button, [class*="btn"], [class*="button"], [class*="cta"]'));
      const btnColors = {};
      buttons.slice(0, 30).forEach(btn => {
        const style = window.getComputedStyle(btn);
        const bg = rgbToHex(style.backgroundColor);
        const color = rgbToHex(style.color);
        if (bg) btnColors[bg] = (btnColors[bg] || 0) + 1;
        if (color) btnColors[color] = (btnColors[color] || 0) + 1;
      });
      // Sort by frequency to find dominant CTA color
      const sortedBtnColors = Object.entries(btnColors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hex]) => hex);

      // --- C. Global Color Frequency Map ---
      const allElements = Array.from(document.querySelectorAll('*')).slice(0, 200);
      const colorFrequency = {};
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = rgbToHex(style.backgroundColor);
        const color = rgbToHex(style.color);
        const border = rgbToHex(style.borderColor);
        [bg, color, border].forEach(c => {
          if (c) colorFrequency[c] = (colorFrequency[c] || 0) + 1;
        });
      });
      const dominantColors = Object.entries(colorFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([hex]) => hex);

      // --- D. Logo Detection ---
      const logoImg = Array.from(document.querySelectorAll('img, svg')).find(el => {
        const attrs = (el.alt || '') + (el.className || '') + (el.id || '') + (el.src || '');
        return /logo/i.test(attrs);
      });
      const ogImage = document.querySelector('meta[property="og:image"]')?.content;
      const favicon = document.querySelector('link[rel*="icon"]')?.href;

      // --- E. Typography ---
      const bodyStyle = window.getComputedStyle(document.body);
      const h1 = document.querySelector('h1');
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      const btn1 = document.querySelector('button, [class*="btn"]');
      const btn1Style = btn1 ? window.getComputedStyle(btn1) : null;

      // --- F. Metadata & Content ---
      const headings = {
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(Boolean).join(' | '),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 6).join(' | ')
      };

      return {
        colors: {
          css_variables: cssVarColors,
          cta_colors: sortedBtnColors,
          dominant_palette: dominantColors
        },
        logo: {
          img_src: logoImg?.src || null,
          og_image: ogImage || null,
          favicon: favicon || null
        },
        typography: {
          body_font: bodyStyle.fontFamily?.split(',')[0].replace(/['"]/g, '').trim(),
          heading_font: h1Style?.fontFamily?.split(',')[0].replace(/['"]/g, '').trim() || null,
          cta_font: btn1Style?.fontFamily?.split(',')[0].replace(/['"]/g, '').trim() || null,
          body_size: bodyStyle.fontSize,
          heading_size: h1Style?.fontSize || null
        },
        metadata: {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          og_title: document.querySelector('meta[property="og:title"]')?.content || '',
          og_description: document.querySelector('meta[property="og:description"]')?.content || '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || ''
        },
        headings
      };
    });

    return result;
  }

  /** STEP 2: Scrape text from homepage + about page */
  async getPageContent(page, url) {
    // Remove noise
    await page.evaluate(() => {
      document.querySelectorAll('nav, footer, header, script, style, noscript, [class*="cookie"], [class*="popup"], [class*="modal"]')
        .forEach(el => el.remove());
    });
    const text = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 8000)
    );
    return text;
  }

  async run(brandUrl) {
    this.log(`== ELITE Agent 1 Starting: ${brandUrl} ==`);
    let browser;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 }
      });

      // ===== HOMEPAGE SCAN =====
      const homePage = await context.newPage();
      await homePage.goto(brandUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await homePage.waitForTimeout(2000);

      const visual = await this.deepVisualScan(homePage, brandUrl);
      const homeText = await this.getPageContent(homePage, brandUrl);
      await homePage.close();

      // ===== ABOUT PAGE SCAN (if exists) =====
      let aboutText = '';
      try {
        const aboutPage = await context.newPage();
        const baseOrigin = new URL(brandUrl).origin;
        const aboutUrl = `${baseOrigin}/about`;
        await aboutPage.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await aboutPage.waitForTimeout(1000);
        aboutText = await this.getPageContent(aboutPage, aboutUrl);
        this.log('About page also scraped.');
        await aboutPage.close();
      } catch (e) {
        this.log('About page not found – continuing without it.');
      }

      await browser.close();
      browser = null;

      // ===== AI SYNTHESIS =====
      this.log('Synthesizing brand data with Llama 3.3-70b...');

      const systemPrompt = `You are the world's best brand strategist. Your role is to synthesize raw scraped website data and visual design signals into a highly accurate, structured Brand Intelligence Report.

You will be given:
- Text content (homepage + about page if available)
- Extracted brand colors (from CSS variables, buttons, and global elements)
- Typography (fonts, sizes)
- Site metadata

Your job is to return ONLY a raw JSON object. No markdown. No reasoning. No code blocks. Just the JSON.

EXAMPLE QUALITY STANDARD:
For Apple: brand_tone = ["Minimalist", "Aspirational", "Premium"], personality = ["Innovative", "Refined", "Trustworthy"]
For Airbnb: brand_tone = ["Warm", "Community-focused", "Adventurous"], personality = ["Welcoming", "Empowering"]

RULES:
- brand_tone: 3–5 single adjectives
- content_pillars: 4–6 themes
- All HEX values must be valid (e.g., #FF5722)
- Be SPECIFIC. Do not use generic statements.
- Infer missing data from industry context, heading language, and visual style`;

      const userPrompt = `
=== BRAND TEXT ANALYSIS ===
Homepage Content: ${homeText}
About Page Content: ${aboutText || '(Not found)'}

=== METADATA ===
Title: ${visual.metadata.title}
SEO Description: ${visual.metadata.description}
OG Description: ${visual.metadata.og_description}
Keywords: ${visual.metadata.keywords}

=== VISUAL FINGERPRINT ===
Headings H1: ${visual.headings.h1}
Headings H2: ${visual.headings.h2}

CSS Variables Found: ${JSON.stringify(visual.colors.css_variables)}
CTA Button Colors: ${visual.colors.cta_colors.join(', ')}
Dominant Palette: ${visual.colors.dominant_palette.join(', ')}

TYPOGRAPHY:
Body Font: ${visual.typography.body_font}
Heading Font: ${visual.typography.heading_font}
CTA Font: ${visual.typography.cta_font}
Body Size: ${visual.typography.body_size}
Heading Size: ${visual.typography.heading_size}

=== RETURN THIS EXACT FORMAT ===
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
  "suggested_positioning_statement": ""
}`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.05, // Near-zero for strict structured output
        max_tokens: 3000
      });

      let responseText = completion.choices[0].message.content.trim();
      // Strip any accidental markdown code fences
      responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const report = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

      // Inject actually extracted colors into the report if AI didn't find them
      const ctaColor = visual.colors.cta_colors[0];
      const palette = visual.colors.dominant_palette;

      if (ctaColor && (!report.visual_identity.accent_colors || !report.visual_identity.accent_colors.length)) {
        report.visual_identity.accent_colors = [{ hex: ctaColor, usage: 'CTA / Button (Extracted)' }];
      }
      if (palette.length > 0 && (!report.visual_identity.primary_colors || !report.visual_identity.primary_colors[0]?.hex)) {
        report.visual_identity.primary_colors = palette.slice(0, 2).map((hex, i) => ({
          hex, usage: i === 0 ? 'Primary Brand Color (Extracted)' : 'Secondary Brand Color (Extracted)'
        }));
      }

      // Smart logo selection
      const logo_url = visual.logo.img_src || visual.logo.og_image || visual.logo.favicon;

      this.log('== ELITE Analysis Complete ==');
      return { analysis: report, logo_url };

    } catch (error) {
      if (browser) await browser.close();
      this.log(`ELITE Agent failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new BrandAnalysisAgent();
