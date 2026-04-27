## Author

Yasir Shaikh
GitHub: https://github.com/YasirShaikh03

# Startup Intelligence Platform — Pro Edition

A fully client-side business analysis tool for Indian startups and street food businesses. Fill in your details, get an ML-scored report with AI-powered insights — no backend, no server, no sign-up needed.

![License](https://img.shields.io/badge/license-MIT-blue) ![Status](https://img.shields.io/badge/status-active-brightgreen) ![Made in India](https://img.shields.io/badge/made%20in-India%20🇮🇳-orange)

---

## What it does

You fill out a form about your business — location, revenue, team, competition, etc. — and the platform:

- Scores your business across 5 dimensions (Survival, Profit, Scale, Local Dominance, Overall)
- Compares your scores against category benchmarks
- Generates a personalised analysis using Claude AI (or falls back to an offline engine if you're offline)
- Gives you specific actions, risks, opportunities, and a scaling roadmap

It works for two types of businesses:

- **Startups** — Tech, SaaS, E-Commerce, Service, Manufacturing, Franchise
- **Street Food / Local** — Vada Pav, Chai, Pani Puri, any street stall or local shop

---

## Features

| Feature | Description |
|---|---|
| ML Scoring Engine | Weighted scoring across team, market, traction, funding, location, and digital signals |
| Claude AI Analysis | Deep personalised analysis using Claude claude-sonnet — runs client-side via Anthropic API |
| Offline Fallback | If Claude API isn't reachable, a local engine generates the full analysis automatically |
| Benchmark Comparison | See how your scores compare to category averages (Street Food, SaaS, E-Commerce, etc.) |
| 18-Month Revenue Forecast | Interactive chart with bull/base/bear scenarios and seasonal adjustments |
| What-If Scenario Engine | Simulate changes like "double my price" or "get fully licensed" and see the score impact |
| Break-Even Calculator | Enter fixed costs, variable costs, and price — instant break-even chart |
| Funding Readiness Meter | Weighted investor-readiness score with per-criteria breakdown |
| Government Scheme Matcher | Automatically matches your business type to relevant Indian govt schemes (Mudra, SVANidhi, etc.) |
| GST & Compliance Checklist | Personalised compliance checklist based on your revenue and business type |
| Pitch Deck Generator | AI-generated investor pitch deck (Claude API) |
| Business Plan Writer | Full AI-written business plan with export to PDF |
| Multi-Turn AI Chat | Ask follow-up questions about your analysis — context-aware, business-specific |
| Monthly Score Tracker | Tracks your score over time so you can see progress month-to-month |
| Comparison Engine | Compare 2–5 analyses from your history side-by-side with a radar chart |
| PDF Export | Print-ready report with all scores, insights, and charts |
| Shareable Link | Encode your analysis into a URL to share with a co-founder or advisor |
| History Panel | Last 20 analyses saved locally, exportable as JSON |

---

## Getting started

No install needed. It's just HTML, CSS, and vanilla JS.

**Option 1 — Open directly**

```
git clone https://github.com/your-username/startup-intelligence-platform.git
cd startup-intelligence-platform
open index.html
```

Or just double-click `index.html`.

**Option 2 — Serve locally** (recommended if you want the Claude API to work)

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Claude AI setup

The platform calls the Anthropic API directly from the browser. To use it:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Open `script.js` and find the fetch call to `https://api.anthropic.com/v1/messages`
3. Add your key in the headers:

```js
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_API_KEY_HERE',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
}
```

> **Note:** If no API key is set or the call fails for any reason, the platform silently falls back to the built-in offline engine. You'll still get a full analysis — just not Claude-generated prose.

---

## File structure

```
├── index.html       # the whole UI — form, result view, all panels
├── style.css        # dark theme, responsive, print styles
├── script.js        # scoring engine, AI calls, all feature logic
└── chart_min.js     # local Chart.js fallback (used if CDN is unavailable)
```

No build step. No dependencies to install. No framework.

---

## How the scoring works

The ML engine calculates a composite score (0–100) using weighted sub-scores:

**Startup mode**

| Dimension | Weight | What it measures |
|---|---|---|
| Traction | 24% | Revenue stage, product stage, online presence |
| Market | 20% | Market size, competition, trend |
| Team | 18% | Founder experience × team size |
| Funding | 14% | Stage + amount raised |
| Timing | 10% | Industry score × market trend |
| Moat | 8% | Competitive position + market reach |
| Location | 4% | Footfall, landmarks, area competition |
| Digital | 2% | Online + aggregator presence |

**Street Food mode**

| Dimension | Weight | What it measures |
|---|---|---|
| Location | 28% | Footfall, landmark proximity, competition |
| Product | 25% | Food type, hygiene, taste rating, repeat rate |
| Finance | 22% | Margin, break-even, daily revenue, rent ratio |
| Operations | 15% | License status, police risk, waste, weather |
| Growth | 10% | Online presence + aggregator listing |

A seasonal multiplier and an ML adjustment factor (based on multi-signal combinations) are applied on top.

---

## Government schemes covered

The scheme matcher automatically filters by your business type:

- **Pradhan Mantri Mudra Yojana** — up to ₹10L, no collateral
- **PM SVANidhi** — ₹10K–₹50K for street vendors
- **Startup India Seed Fund** — up to ₹20L for DPIIT startups
- **CGTMSE** — collateral-free loans up to ₹2Cr for MSMEs
- **Standup India** — ₹10L–₹1Cr for SC/ST and women entrepreneurs
- **MSME Udyam Registration** — free, unlocks subsidies and priority lending
- **Atal Innovation Mission** — for deeptech startups
- **FSSAI Basic Registration** — mandatory for food businesses (₹100)

---

## Browser support

Works in any modern browser — Chrome, Firefox, Safari, Edge. No IE support.

The Chart.js CDN is loaded from jsdelivr. If that fails, it falls back to the bundled `chart_min.js`.

---

## Contributing

Pull requests are welcome. A few things to keep in mind:

- Don't touch the scoring weights without testing the impact across multiple business types
- The offline analysis engine (`offlineAnalysis()`) should always produce a complete, useful result — it's the fallback for everyone without an API key
- Keep it dependency-free. No React, no bundler, no build step.

---

## License

MIT — do whatever you want with it.

---

*Built for Indian founders and street entrepreneurs. If this helped you, star the repo.*

## 🚀 Want a High-Level AI Startup Analysis Tool?

If you're looking for a more advanced, production-level project that not only analyzes startup ideas but also **generates new ideas and insights**, check out the upgraded version below 👇

---

## 🔥 Advanced Version (High-Level Project)

If you are looking for a more advanced and high-level implementation with enhanced features and improved logic, explore the upgraded version:

👉 Includes deeper analysis, improved idea generation, and scalable design approach.


---

# 🤖🚀 AI Startup Risk Analyzer

### 🎓 Semester 6 Mini Project | 🏆 Hackathon-Ready Intelligent System

This project was developed as part of my **Semester 6 Mini Project (B.E. Electronics & Computer Science)** and is designed to meet **hackathon-level standards**, focusing on intelligent startup evaluation, risk analysis, and idea generation.

It is not just a basic web project — it simulates how real-world startup ideas are analyzed using structured logic, scoring systems, and AI-inspired techniques.

---

## 🌍 Problem Statement

In today’s startup ecosystem, many innovative ideas fail due to:

* Lack of proper risk assessment
* No structured validation system
* Poor decision-making frameworks
* Limited access to intelligent analysis tools

Entrepreneurs often rely on guesswork instead of data-driven insights.

---

## 🧠 Proposed Solution

The **AI Startup Risk Analyzer** is an intelligent decision-support system that:

* Analyzes startup ideas using structured logic
* Evaluates risks through a scoring mechanism
* Generates innovative startup ideas
* Provides meaningful insights for better decision-making

It acts as a **virtual startup advisor**, helping users understand feasibility, risks, and opportunities.

---

## 🎯 Objectives

* To design an intelligent system for startup analysis
* To implement a risk scoring and evaluation model
* To generate new startup ideas automatically
* To simulate real-world decision-making processes
* To build a scalable and user-friendly platform

---

## ⚙️ Key Features

### 🤖 AI-Inspired Analysis Engine

Analyzes startup inputs using rule-based logic and structured evaluation techniques.

### 📊 Risk Scoring System

Assigns scores based on multiple factors such as feasibility, competition, and innovation.

### 💡 Startup Idea Generation

Generates new business ideas to inspire innovation and exploration.

### 📈 Data Visualization

Displays results using charts and visual insights for better understanding.

### 🆔 Unique Startup Identity System

Each analyzed idea is assigned a unique ID for tracking and comparison.

### ⚡ Interactive Web Interface

Fast, responsive, and user-friendly design for seamless experience.

---

## 🌐 Project Access

🔗 **GitHub Repository:**
https://github.com/YasirShaikh03/startup-risk-analyzer

🚀 **Live Deployment:**
https://yasirshaikh03.github.io/startup-risk-analyzer/

---

## 🧠 Use Cases

* 🎓 Academic Mini Project (Semester 6)
* 🏆 Hackathon Submission
* 🚀 Startup Idea Validation
* 📊 Business Risk Analysis
* 💡 Innovation & Idea Generation

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Visualization:** Chart.js
* **Logic:** AI-inspired rule-based evaluation

---

## 🔥 What Makes This Project High-Level?

* Combines **analysis + generation + visualization**
* Simulates **real-world startup evaluation systems**
* Includes **unique identity tracking concept**
* Designed with **scalability and extensibility in mind**
* Suitable for **both academic and industry-level demonstration**

---

## 🧠 Outcome

This project demonstrates how intelligent systems can be applied in **business intelligence, startup evaluation, and decision-making**, bridging the gap between raw ideas and structured analysis.

---

## 🔮 Future Enhancements

* Integration with real AI/ML models
* Cloud-based data storage (Firebase)
* User authentication system
* Startup comparison dashboard
* Advanced analytics and recommendations

---

## 👨‍💻 Author

**Yasir Shaikh**
GitHub: https://github.com/YasirShaikh03


## 👨‍💻 Author

**Yasir Shaikh**
GitHub: https://github.com/YasirShaikh03


