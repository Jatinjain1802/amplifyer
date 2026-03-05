const mongoose = require('mongoose');

// ── Audience Persona Sub-schema ──────────────────────────────────────────────
const PersonaSchema = new mongoose.Schema({
  persona_name            : String,
  age_range               : String,
  role_or_identity        : String,
  platforms_they_use      : [String],
  goals                   : [String],
  pain_points             : [String],
  content_they_engage_with: String,
  best_platform_to_reach_them: String
}, { _id: false });

// ── Content Gap Sub-schema ───────────────────────────────────────────────────
const GapSchema = new mongoose.Schema({
  gap           : String,
  why_it_matters: String,
  suggested_fix : String,
  priority      : { type: String, enum: ['high', 'medium', 'low'] }
}, { _id: false });

// ── Calendar Day Sub-schema ──────────────────────────────────────────────────
const CalendarDaySchema = new mongoose.Schema({
  day           : Number,
  date_label    : String,
  content_pillar: String,
  content_theme : String,
  content_type  : {
    type: String,
    enum: ['educational', 'promotional', 'storytelling', 'community', 'behind-the-scenes']
  },
  linkedin: {
    post_format       : String,
    caption_hook      : String,
    full_caption_guide: String,
    hashtags          : [String],
    cta               : String
  },
  instagram: {
    post_format       : String,
    caption_hook      : String,
    full_caption_guide: String,
    hashtags          : [String],
    visual_direction  : String,
    cta               : String
  }
}, { _id: false });

// ── Main ContentStrategy Schema ──────────────────────────────────────────────
const ContentStrategySchema = new mongoose.Schema(
  {
    // Links back to the Brand document — one brand, one strategy at a time
    brand_url: {
      type    : String,
      required: true,
      unique  : true  // one strategy per brand URL, upserted on refresh
    },

    // ── From Agent 1 (stored for reference / Agent 3 use) ──
    brand_industry: String,

    // ── Post Analysis ──
    post_analysis: {
      linkedin : { type: mongoose.Schema.Types.Mixed, default: null },
      instagram: { type: mongoose.Schema.Types.Mixed, default: null }
    },

    // ── Audience Personas ──
    audience_personas: [PersonaSchema],

    // ── Content Gaps ──
    content_gaps: [GapSchema],

    // ── Platform Strategy ──
    platform_strategy: {
      linkedin : { type: mongoose.Schema.Types.Mixed, default: null },
      instagram: { type: mongoose.Schema.Types.Mixed, default: null },
      facebook : { type: mongoose.Schema.Types.Mixed, default: null }
    },

    // ── Health Score ──
    overall_content_health_score: { type: Number, default: null },
    overall_content_health_notes: { type: String, default: null },

    // ── 30-Day Calendar ──
    calendar: [CalendarDaySchema],

    calendar_summary: {
      total_posts              : Number,
      pillar_distribution      : mongoose.Schema.Types.Mixed,
      content_type_distribution: mongoose.Schema.Types.Mixed,
      key_themes_this_month    : [String]
    },

    // ── Metadata ──
    linkedin_posts_used : { type: Number, default: 0 },
    instagram_posts_used: { type: Number, default: 0 },
    generated_at        : { type: Date, default: Date.now }
  },
  {
    timestamps: true // createdAt + updatedAt for cache invalidation
  }
);

module.exports = mongoose.model('ContentStrategy', ContentStrategySchema);