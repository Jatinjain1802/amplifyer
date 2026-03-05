// const mongoose = require('mongoose');

// const BrandSchema = new mongoose.Schema({
//   url: { type: String, required: true, unique: true },
//   logo_url: String,
//   analysisResult: {
//     brand_summary: String,
//     industry: String,
//     target_audience: String,
//     brand_tone: [String],
//     brand_personality_traits: [String],
//     core_offers: [String],
//     value_proposition: String,
//     unique_differentiators: [String],
//     customer_pain_points: [String],
//     desired_customer_outcomes: [String],
//     content_pillars: [String],
//     visual_identity: {
//       primary_colors: [{ hex: String, usage: String }],
//       secondary_colors: [{ hex: String, usage: String }],
//       accent_colors: [{ hex: String, usage: String }],
//       background_colors: [String],
//       typography: {
//         primary_font: String,
//         secondary_font: String,
//         font_style_description: String
//       },
//       design_style_description: String,
//       logo_style_description: String
//     },
//     suggested_positioning_statement: String
//   },
//   lastAnalyzed: { type: Date, default: Date.now }
// }, { timestamps: true });

// module.exports = mongoose.model('Brand', BrandSchema);
const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema(
  {
    url: {
      type    : String,
      required: true,
      unique  : true
    },

    analysisResult: {
      type: mongoose.Schema.Types.Mixed, // flexible — stores the full AI report
      required: true
    },

    logo_url: {
      type   : String,
      default: null
    },

    // ── NEW: stores raw scrape status per platform ──
    // Used by the frontend to show Live / Partial / Inferred / Not Found badges.
    // Stored separately from analysisResult to keep the AI report clean.
    social_scrape_meta: {
      type: {
        linkedin : {
          status: mongoose.Schema.Types.Mixed, // true | 'partial' | false
          url   : { type: String, default: null }
        },
        instagram: {
          status: mongoose.Schema.Types.Mixed,
          url   : { type: String, default: null }
        },
        facebook : {
          status: mongoose.Schema.Types.Mixed,
          url   : { type: String, default: null }
        }
      },
      default: null
    },

    lastAnalyzed: {
      type   : Date,
      default: Date.now
    }
  },
  {
    timestamps: true // adds createdAt + updatedAt — updatedAt is used for 24hr cache check
  }
);

module.exports = mongoose.model('Brand', BrandSchema);