const express = require('express');
const router = express.Router();

const BrandAnalysisAgent   = require('../agents/BrandAnalysisAgent');
const ContentStrategyAgent = require('../agents/ContentStrategyAgent');
const Brand           = require('../models/Brand');
const ContentStrategy = require('../models/ContentStrategy');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/analyze  —  Agent 1: Brand Analysis
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  const { url, socialUrls = {} } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    const forceRefresh  = req.query.force === 'true';
    const existingBrand = await Brand.findOne({ url });
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

    // ── Cache Hit ──
    if (!forceRefresh && existingBrand && (Date.now() - existingBrand.updatedAt < ONE_DAY_IN_MS)) {
      console.log(`[Agent 1 Cache Hit] ${url}`);
      const plainAnalysis = existingBrand.analysisResult.toObject();
      return res.json({
        success: true,
        data: {
          ...plainAnalysis,
          logo_url           : existingBrand.logo_url,
          _social_scrape_meta: existingBrand.social_scrape_meta || null
        }
      });
    }

    // ── Cache Miss — run Agent 1 ──
    console.log(`[Agent 1 Cache Miss] Running for: ${url}`);
    const { analysis, logo_url } = await BrandAnalysisAgent.run(url, socialUrls);
    const { _social_scrape_meta, ...cleanAnalysis } = analysis;

    await Brand.findOneAndUpdate(
      { url },
      {
        analysisResult    : cleanAnalysis,
        logo_url,
        social_scrape_meta: _social_scrape_meta || null,
        lastAnalyzed      : Date.now()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data   : { ...cleanAnalysis, logo_url, _social_scrape_meta }
    });

  } catch (error) {
    console.error(`[Agent 1 Error] ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/strategy  —  Agent 2: Content Strategy
//
// Requires Agent 1 to have already run for this URL.
// Scrapes real LinkedIn + Instagram posts, analyzes them against the Brand DNA,
// and generates: audience personas, content gap analysis, 30-day calendar.
//
// Body:  { "url": "https://stripe.com" }
// Query: ?force=true  to skip 24hr cache and regenerate
// ─────────────────────────────────────────────────────────────────────────────
router.post('/strategy', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    const forceRefresh  = req.query.force === 'true';
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

    // ── Step 1: Agent 1 must have run first ──
    const brandDoc = await Brand.findOne({ url });
    if (!brandDoc) {
      return res.status(404).json({
        success: false,
        error  : 'Brand not found. Run /analyze first before requesting a content strategy.'
      });
    }

    // ── Step 2: Check strategy cache ──
    const existingStrategy = await ContentStrategy.findOne({ brand_url: url });
    if (!forceRefresh && existingStrategy && (Date.now() - existingStrategy.updatedAt < ONE_DAY_IN_MS)) {
      console.log(`[Agent 2 Cache Hit] ${url}`);
      return res.json({ success: true, cached: true, data: existingStrategy.toObject() });
    }

    // ── Step 3: Rebuild brandData from DB for Agent 2 ──
    const plainAnalysis = brandDoc.analysisResult.toObject();
    const brandData = {
      analysis: {
        ...plainAnalysis,
        _social_scrape_meta: brandDoc.social_scrape_meta || {}
      },
      logo_url: brandDoc.logo_url
    };

    // ── Step 4: Run Agent 2 ──
    console.log(`[Agent 2 Cache Miss] Running for: ${url}`);
    const strategyResult = await ContentStrategyAgent.run(brandData);

    // ── Step 5: Save to MongoDB ──
    await ContentStrategy.findOneAndUpdate(
      { brand_url: url },
      {
        brand_url    : url,
        brand_industry: strategyResult._meta?.brand_industry || plainAnalysis.industry,

        post_analysis              : strategyResult.post_analysis,
        audience_personas          : strategyResult.audience_personas,
        content_gaps               : strategyResult.content_gaps,
        platform_strategy          : strategyResult.platform_strategy,
        overall_content_health_score: strategyResult.overall_content_health_score,
        overall_content_health_notes: strategyResult.overall_content_health_notes,

        calendar        : strategyResult.calendar,
        calendar_summary: strategyResult.calendar_summary,

        linkedin_posts_used : strategyResult._meta?.linkedin_posts_used  || 0,
        instagram_posts_used: strategyResult._meta?.instagram_posts_used || 0,
        generated_at        : strategyResult._meta?.generated_at || new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`[Agent 2] Strategy saved for: ${url}`);
    res.json({ success: true, cached: false, data: strategyResult });

  } catch (error) {
    console.error(`[Agent 2 Error] ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;