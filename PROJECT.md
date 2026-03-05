# ⚡ Amplifyer — Brand Strategy Multi-Agent System

> **AI-powered SaaS that analyzes any brand's visual identity, tone, strategy, and content pillars — in seconds.**

---

## 📌 Table of Contents

- [What is Amplifyer?](#-what-is-amplifyer)
- [System Architecture](#-system-architecture)
- [The 3-Agent Pipeline](#-the-3-agent-pipeline)
  - [Agent 1: Brand Analysis (Built ✅)](#agent-1-brand-analysis-agent-built-)
  - [Agent 2: Content Strategy (Planned 🔜)](#agent-2-content-strategy-agent-planned-)
  - [Agent 3: Content Generation (Planned 🔜)](#agent-3-content-generation-agent-planned-)
- [Tech Stack](#-tech-stack)
- [Project Folder Structure](#-project-folder-structure)
- [Current Features](#-current-features)
- [API Reference](#-api-reference)
- [Data Models](#-data-models)
- [Setup & Running Locally](#-setup--running-locally)
- [What We're Building Next](#-what-were-building-next)
- [Learning Notes for Developer](#-learning-notes-for-developer)

---

## 🎯 What is Amplifyer?

**Amplifyer** is a multi-agent AI SaaS platform. You give it any company's website URL, and it:

1. **Scrapes** the website using a real browser (Playwright)
2. **Analyzes** the brand using a Large Language Model (LLM via Groq API)
3. **Returns** a full Brand Intelligence Report with colors, fonts, tone, audience, content strategy, and more

Think of it like having a world-class brand strategist analyze a company's website automatically.

### 🏆 Final Vision

> A complete **Brand-to-Content pipeline** where a user pastes a URL and receives:
> - Full brand analysis
> - A 30-day content calendar
> - AI-generated posts, captions, blogs
> - Tool recommendations for their team

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   AMPLIFYER SYSTEM                           │
│                                                              │
│  ┌─────────────┐    ┌──────────────────────────────────┐    │
│  │ Input Layer │    │           Data Store             │    │
│  │  URL Input  │───▶│  Generated Content │ Brand Data  │    │
│  └─────────────┘    │  Content Calendar  │ Audience    │    │
│         │           └──────────────────────────────────┘    │
│         ▼                      ▲  ▲  ▲                      │
│  ┌──────────────┐  ┌───────────┘  │  └───────────────┐     │
│  │   AGENT 1    │  │   AGENT 2    │    AGENT 3        │     │
│  │  Brand       │  │  Content     │    Content        │     │
│  │  Analysis    │  │  Strategy    │    Generation     │     │
│  │  ✅ BUILT    │  │  🔜 PLANNED  │    🔜 PLANNED     │     │
│  └──────────────┘  └─────────────┘    └───────────────┘     │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────┐                               │
│  │       Output Layer       │                               │
│  │  Content Preview         │                               │
│  │  Content Calendar Display│                               │
│  │  Export Module           │                               │
│  └──────────────────────────┘                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               External Services                      │   │
│  │  Playwright (Web Scraping) │ Groq (LLM Models)       │   │
│  │  Social Media APIs         │ AI Content Tools        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🤖 The 3-Agent Pipeline

### Agent 1: Brand Analysis Agent (Built ✅)

**Purpose:** Extract the complete "Brand DNA" from any website URL.

**How it works — Step by Step:**

```
URL Input
    │
    ▼
┌─────────────────────────────────────────────┐
│  STEP 1: Deep Visual Scan (Playwright)      │
│  • Opens real browser (Chromium)            │
│  • Reads CSS variables (--primary, etc.)    │
│  • Scans buttons/CTAs for dominant colors   │
│  • Extracts typography (fonts, sizes)       │
│  • Detects logo (img, og:image, favicon)    │
│  • Reads headings (H1, H2) and metadata     │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  STEP 2: Page Content Scraping              │
│  • Removes noise (nav, footer, popups)      │
│  • Extracts homepage text (max 8000 chars)  │
│  • Tries to scrape /about page too          │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  STEP 3: AI Synthesis (Groq / Llama 3.3)   │
│  • Sends all scraped data to LLM            │
│  • Temperature = 0.05 (very precise)        │
│  • Returns structured JSON Brand Report     │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  STEP 4: Ground Truth Color Injection       │
│  • Overrides AI guessed colors with REAL    │
│    scraped hex codes (AI can hallucinate)   │
│  • Primary: CSS vars → dominant palette     │
│  • Accent: CTA/button colors                │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  STEP 5: Cache & Return                     │
│  • Saves to MongoDB (24-hour cache)         │
│  • Returns Brand Intelligence JSON          │
└─────────────────────────────────────────────┘
```

**Output — Brand Intelligence Report:**

| Field | Description |
|---|---|
| `brand_summary` | One-paragraph brand overview |
| `industry` | e.g., "E-commerce / Fashion" |
| `target_audience` | Who the brand serves |
| `brand_tone` | 3–5 adjectives (e.g., "Minimalist, Premium") |
| `brand_personality_traits` | Character descriptors |
| `core_offers` | Products/services list |
| `value_proposition` | The brand's core promise |
| `unique_differentiators` | What makes them stand out |
| `customer_pain_points` | Problems they solve |
| `content_pillars` | 4–6 content themes |
| `visual_identity` | Colors, fonts, design style |
| `suggested_positioning_statement` | Marketing tagline suggestion |

---

### Agent 2: Content Strategy Agent (Planned 🔜)

**Purpose:** Use the Brand DNA from Agent 1 to build a smart content strategy.

**Sub-components to build:**

| Sub-Agent | What it does |
|---|---|
| **Audience Analyzer** | Deep-dives into target personas, demographics, psychographics |
| **Content Calendar Generator** | Builds a 30-day posting schedule (platform-specific) |
| **Insights Generator** | Recommends when to post, what format, trending hooks |

**Input:** Brand Intelligence Report from Agent 1  
**Output:** Content Calendar + Audience Insights saved to Data Store

---

### Agent 3: Content Generation Agent (Planned 🔜)

**Purpose:** Actually *create* the content — captions, blogs, scripts — using the strategy.

**Sub-components to build:**

| Sub-Agent | What it does |
|---|---|
| **Prompt Suggester** | Creates tailored prompts for each content type |
| **AI Tool Recommender** | Suggests which AI tool to use (Midjourney, DALL·E, etc.) |
| **Content Generator Coordinator** | Orchestrates multi-format content creation |

**Input:** Content Strategy from Agent 2  
**Output:** Ready-to-use content saved in Data Store → displayed in Output Layer

---

## 🛠️ Tech Stack

### Backend (Server)

| Technology | Purpose | Why we use it |
|---|---|---|
| **Node.js** | Runtime environment | Runs JavaScript on the server |
| **Express.js** | Web framework | Creates API routes (like `/api/agents/analyze`) |
| **MongoDB + Mongoose** | Database | Stores brand analysis results, enables caching |
| **Playwright** | Browser automation | Scrapes real websites (handles JS-rendered pages) |
| **Groq SDK** | LLM API Client | Talks to Llama 3.3-70b for AI analysis |
| **dotenv** | Environment config | Keeps secrets like API keys out of code |
| **nodemon** | Dev tool | Auto-restarts server when you save files |

### Frontend (Client)

| Technology | Purpose | Why we use it |
|---|---|---|
| **React** | UI Framework | Component-based, reactive UI |
| **Vite** | Build tool | Super fast dev server, hot module reload |
| **Axios** | HTTP client | Makes API requests to the backend |
| **Lucide React** | Icon library | Clean, modern SVG icons |
| **CSS (Vanilla)** | Styling | Full control, glassmorphism design system |

### External Services

| Service | Purpose |
|---|---|
| **Groq API** | Fast LLM inference (Llama 3.3-70b-versatile) |
| **MongoDB Atlas** | Managed cloud database |
| **Playwright Chromium** | Headless browser for scraping |

---

## 📁 Project Folder Structure

```
amplifyer/
│
├── 📄 PROJECT.md              ← This file! Project documentation
├── 🖼️ AI_AGENT.png            ← System architecture diagram
├── .gitignore
│
├── client/                    ← React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx            ← Main React component (all UI logic)
│   │   ├── App.css            ← Component-specific styles
│   │   ├── index.css          ← Global design system (CSS variables, glassmorphism)
│   │   └── main.jsx           ← React entry point (mounts App into DOM)
│   ├── index.html             ← HTML shell
│   └── package.json           ← Frontend dependencies (React, Vite, Axios)
│
└── server/                    ← Node.js + Express Backend
    ├── index.js               ← Main server entry (Express app, MongoDB connect)
    ├── .env                   ← Secret keys (NOT in git) 
    ├── .env.example           ← Example env file (safe to share)
    │
    ├── agents/                ← 🤖 AI Agent logic lives here
    │   ├── BaseAgent.js       ← Base class (shared agent utilities)
    │   └── BrandAnalysisAgent.js  ← Agent 1 (Playwright + Groq analysis)
    │
    ├── routes/                ← API route definitions
    │   └── agentRoutes.js     ← POST /analyze endpoint, cache logic
    │
    ├── models/                ← MongoDB schemas
    │   └── Brand.js           ← Brand data model (stores analysis + logo_url)
    │
    ├── controllers/           ← (To be populated as app grows)
    ├── middleware/            ← (Auth middleware, rate limiting, etc.)
    ├── utils/                 ← (Helper functions)
    └── package.json           ← Backend dependencies (Express, Mongoose, Playwright, Groq)
```

---

## ✨ Current Features

| Feature | Status | Details |
|---|---|---|
| URL Input | ✅ Done | User pastes any website URL |
| Web Scraping | ✅ Done | Playwright scrapes colors, fonts, text, logo |
| AI Brand Analysis | ✅ Done | Llama 3.3-70b generates full brand report |
| Color Extraction | ✅ Done | CSS vars + DOM scan + CTA colors |
| Logo Detection | ✅ Done | img tag, og:image, favicon fallback chain |
| 24-Hour Caching | ✅ Done | MongoDB cache prevents redundant API calls |
| Force Re-scan | ✅ Done | "Fresh Scan" button bypasses cache |
| LocalStorage Persistence | ✅ Done | Last result survives browser refresh |
| Brand Report UI | ✅ Done | Glassmorphism dark UI, color swatches, tags |
| Click-to-Copy Hex | ✅ Done | Click any color swatch to copy HEX code |

---

## 📡 API Reference

### `POST /api/agents/analyze`

Analyzes a brand from a given URL.

**Request Body:**
```json
{
  "url": "https://stripe.com"
}
```

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `force` | `boolean` | Set `?force=true` to skip 24hr cache |

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "brand_summary": "...",
    "industry": "...",
    "target_audience": "...",
    "brand_tone": ["Modern", "Trustworthy"],
    "brand_personality_traits": ["..."],
    "core_offers": ["..."],
    "value_proposition": "...",
    "unique_differentiators": ["..."],
    "customer_pain_points": ["..."],
    "desired_customer_outcomes": ["..."],
    "content_pillars": ["..."],
    "visual_identity": {
      "primary_colors": [{ "hex": "#635BFF", "usage": "Primary Brand Color" }],
      "secondary_colors": [...],
      "accent_colors": [{ "hex": "#0A2540", "usage": "CTA / Button Color" }],
      "typography": {
        "primary_font": "Inter",
        "secondary_font": "Sohne",
        "font_style_description": "..."
      },
      "design_style_description": "...",
      "logo_style_description": "..."
    },
    "suggested_positioning_statement": "...",
    "logo_url": "https://..."
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Message describing what went wrong"
}
```

---

## 🗄️ Data Models

### Brand (MongoDB Schema)

```javascript
// server/models/Brand.js
{
  url: String,           // The analyzed website URL (unique key)
  analysisResult: {      // Full brand report from AI + scraped data
    brand_summary: String,
    industry: String,
    // ... all other fields from API response above
    visual_identity: {
      primary_colors: [{ hex: String, usage: String }],
      secondary_colors: [{ hex: String, usage: String }],
      accent_colors: [{ hex: String, usage: String }],
      typography: { ... }
    }
  },
  logo_url: String,      // Detected logo image URL
  lastAnalyzed: Date,    // Timestamp for 24-hour cache invalidation
  createdAt: Date,       // Auto-set by Mongoose
  updatedAt: Date        // Auto-updated by Mongoose (used for cache check)
}
```

---

## 🚀 Setup & Running Locally

### Prerequisites

- Node.js v18+ installed
- MongoDB Atlas account (or local MongoDB)
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Create `server/.env` (copy from `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/amplifyer
GROQ_API_KEY=your_groq_api_key_here
```

> ⚠️ **NEVER commit `.env` to git!** It's already in `.gitignore`.

### 3. Install Playwright Browsers

```bash
# In the server directory
npx playwright install chromium
```

### 4. Run the App

```bash
# Terminal 1: Start the backend
cd server
npx nodemon index.js

# Terminal 2: Start the frontend
cd client
npm run dev
```

### 5. Open the App

Visit: **[http://localhost:5173](http://localhost:5173)**

---

## 🔜 What We're Building Next

### Phase 2 — Agent 2: Content Strategy

- [ ] Build `ContentStrategyAgent.js` in `server/agents/`
- [ ] Create `AudienceAnalyzer` sub-module
- [ ] Build `ContentCalendarGenerator` sub-module  
- [ ] Create MongoDB model for `ContentCalendar`
- [ ] Add new API route `POST /api/agents/strategy`
- [ ] Display content calendar in the frontend UI

### Phase 3 — Agent 3: Content Generation

- [ ] Build `ContentGenerationAgent.js`
- [ ] Integrate prompt templates for different content types
- [ ] Add `PromptSuggester` (per platform: LinkedIn, Instagram, Twitter)
- [ ] Add `AIToolRecommender` that maps content type → best AI tool
- [ ] Build export module (PDF, Notion, CSV)

### Phase 4 — Platform & Scale

- [ ] User authentication (JWT)
- [ ] Dashboard with history of analyzed brands
- [ ] Social Media API integrations (schedule posts directly)
- [ ] Multi-language support
- [ ] Subscription / Pricing model

---

## 📚 Learning Notes for Developer

> These notes explain the key JavaScript, React, and Node.js concepts used in this project.

### JavaScript Concepts Used

| Concept | Where it's used | What it means |
|---|---|---|
| `async/await` | All agent methods | Handles asynchronous operations (waiting for scraping, API calls) without blocking |
| `try/catch` | Route handlers, agent `run()` | Catches errors so the server doesn't crash |
| `JSON.parse / JSON.stringify` | `agentRoutes.js`, `App.jsx` | Converts between JS objects and JSON strings |
| Spread operator `...` | `{ ...analysis, logo_url }` | Merges objects — copies all fields + adds logo_url |
| Arrow functions `=>` | Everywhere | Shorter way to write functions |
| Template literals `` ` `` | URLs, console logs | Embeds variables inside strings with `${variable}` |
| `Array.filter()` | Color cleaning | Creates new array keeping only items that pass a test |
| `Array.map()` | Color rendering, tag rendering | Transforms each array item into something new |

### React Concepts Used

| Concept | Where it's used | What it means |
|---|---|---|
| `useState` | `url`, `loading`, `result`, `error` | Local state that causes re-renders when it changes |
| `useEffect` | Loading from localStorage | Runs side effects after component renders |
| Props | `ColorSwatch`, `FeatureCard` components | Passing data from parent to child component |
| Conditional rendering `&&` | `{result && <section>}` | Only renders the element if the condition is true |
| Event handlers | `onSubmit`, `onChange`, `onClick` | React's way of handling user interactions |

### Node.js / Backend Concepts Used

| Concept | Where it's used | What it means |
|---|---|---|
| `require()` / `module.exports` | All server files | Node's way of importing/exporting code between files |
| Express Router | `agentRoutes.js` | Groups related API routes together |
| Middleware | `app.use(cors())` | Functions that run on every request (CORS, JSON parsing) |
| Mongoose models | `Brand.js` | Defines the shape of data in MongoDB |
| `findOneAndUpdate` with `upsert` | Route caching | Creates a record if it doesn't exist, updates if it does |
| Environment variables | `process.env.GROQ_API_KEY` | Keeps secrets outside of code, loaded from `.env` |

---

*Built with ❤️ using Node.js, React, Playwright, and Groq AI — March 2026*
