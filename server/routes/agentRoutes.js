const express = require('express');
const router = express.Router();
const BrandAnalysisAgent = require('../agents/BrandAnalysisAgent');
const Brand = require('../models/Brand');

// Endpoint to start brand analysis
router.post('/analyze', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // 1. Check if we've already analyzed this URL recently (within 24 hours)
    const existingBrand = await Brand.findOne({ url });
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

    if (existingBrand && (Date.now() - existingBrand.updatedAt < ONE_DAY_IN_MS)) {
      console.log(`[Cache Hit] Serving existing analysis for: ${url}`);
      return res.json({ 
        success: true, 
        data: { 
          ...existingBrand.analysisResult, 
          logo_url: existingBrand.logo_url 
        } 
      });
    }

    // 2. If not in cache or too old, run the Agent (Groq + Playwright call)
    console.log(`[Cache Miss] Running AI Agent for: ${url}`);
    const { analysis, logo_url } = await BrandAnalysisAgent.run(url);

    // 3. Save/Update in MongoDB
    await Brand.findOneAndUpdate(
      { url },
      { 
        analysisResult: analysis,
        logo_url: logo_url,
        lastAnalyzed: Date.now() 
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      data: { 
        ...analysis, 
        logo_url: logo_url 
      } 
    });
  } catch (error) {
    console.error(`Analysis Route Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
