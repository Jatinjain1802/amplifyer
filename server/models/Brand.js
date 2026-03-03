const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  logo_url: String,
  analysisResult: {
    brand_summary: String,
    industry: String,
    target_audience: String,
    brand_tone: [String],
    brand_personality_traits: [String],
    core_offers: [String],
    value_proposition: String,
    unique_differentiators: [String],
    customer_pain_points: [String],
    desired_customer_outcomes: [String],
    content_pillars: [String],
    visual_identity: {
      primary_colors: [{ hex: String, usage: String }],
      secondary_colors: [{ hex: String, usage: String }],
      accent_colors: [{ hex: String, usage: String }],
      background_colors: [String],
      typography: {
        primary_font: String,
        secondary_font: String,
        font_style_description: String
      },
      design_style_description: String,
      logo_style_description: String
    },
    suggested_positioning_statement: String
  },
  lastAnalyzed: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Brand', BrandSchema);
