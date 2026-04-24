# SlidesLive - Project Plan

## 📋 Overview

**Goal:** Launch a freemium interactive presentation tool for teachers by Q3 2026

**Target Revenue:** $10K-15K ARR in Year 1 (100-150 paying users @ $9.99/month)

---

## 🎯 Phase 1: MVP Foundation (Weeks 1-4)

### Week 1: Setup & Core Infrastructure
- [x] Create project structure
- [ ] Register domain (slides-live.com or slideslive.io)
- [ ] Create Firebase project (slideslive-prod)
- [ ] Set up Firebase Hosting
- [ ] Initialize git repository
- [ ] Copy core code from interactive-presentations

### Week 2: Extension Development
- [ ] Google Slides detection (copy from existing)
- [ ] QR code generation
- [ ] Session management UI
- [ ] Firebase connection
- [ ] Test with multiple slides

### Week 3: Web App Core
- [ ] Join flow (scan QR / enter code)
- [ ] Waiting screen
- [ ] Poll activity component
- [ ] Quiz activity component
- [ ] Text Response activity component
- [ ] Announcement component

### Week 4: Presenter Dashboard
- [ ] Real-time results display
- [ ] Participant list
- [ ] Activity controls (start/stop)
- [ ] Session management

---

## 🎯 Phase 2: Freemium & Monetization (Weeks 5-6)

### Week 5: Authentication & Limits
- [ ] Google OAuth for teachers
- [ ] Teacher account creation
- [ ] Session participant counting
- [ ] Enforce 30-participant limit on free tier
- [ ] Presentation limit (3 for free)
- [ ] Upgrade prompts in UI

### Week 6: Payment Integration
- [ ] Stripe account setup
- [ ] Subscription checkout flow
- [ ] Subscription management page
- [ ] Webhook handling (successful payment, cancellation)
- [ ] Trial period logic (14 days)

---

## 🎯 Phase 3: Builder & Content (Weeks 7-8)

### Week 7: Activity Builder
- [ ] Simple JSON editor interface
- [ ] Activity type selector
- [ ] Form validation
- [ ] Save/load configurations
- [ ] Preview mode
- [ ] Link activities to slide positions

### Week 8: Template Library
- [ ] Create 10 starter templates:
  - [ ] Icebreaker poll
  - [ ] Exit ticket
  - [ ] Multiple choice review
  - [ ] Quiz with leaderboard
  - [ ] Think-Pair-Share prompt
  - [ ] Check for understanding
  - [ ] Feedback form
  - [ ] True/False quiz
  - [ ] Open-ended reflection
  - [ ] Vocabulary check
- [ ] Template browser UI
- [ ] One-click template insertion

---

## 🎯 Phase 4: Polish & Launch (Weeks 9-10)

### Week 9: Documentation & Marketing
- [ ] Landing page (value prop, demo video, pricing)
- [ ] Quick start guide
- [ ] Video tutorials (3-5 minutes each):
  - [ ] Getting started
  - [ ] Creating your first poll
  - [ ] Using the activity builder
  - [ ] Reading results
- [ ] FAQ page
- [ ] Privacy policy & Terms of Service

### Week 10: Chrome Web Store Launch
- [ ] Extension screenshots (5 required)
- [ ] Promo video (30-60 seconds)
- [ ] Store listing copy
- [ ] Submit for review
- [ ] Set up analytics (Google Analytics)
- [ ] Soft launch to 10-20 beta teachers

---

## 🎯 Phase 5: Growth & Iteration (Weeks 11-16)

### Weeks 11-12: User Feedback
- [ ] Interview 20 teachers
- [ ] Identify friction points
- [ ] Prioritize feature requests
- [ ] Fix critical bugs
- [ ] Improve onboarding flow

### Weeks 13-14: Feature Additions
Based on feedback, likely candidates:
- [ ] Question bank / saved questions
- [ ] Export results to CSV
- [ ] Integration with Google Classroom (roster import)
- [ ] Custom branding (school logo)
- [ ] Anonymous vs named responses toggle

### Weeks 15-16: Marketing Push
- [ ] Post in r/teachers (with value, not spam)
- [ ] Share in Facebook teacher groups (5-10 groups)
- [ ] Twitter #edutwitter engagement
- [ ] Create blog content (SEO)
- [ ] Reach out to education influencers
- [ ] Product Hunt launch?

---

## 📊 Success Metrics

### Week 4 (MVP Complete)
- ✅ Extension works end-to-end
- ✅ Can run a live poll with 5 devices

### Week 6 (Freemium Live)
- 🎯 10 teacher signups
- 🎯 2 paying customers (beta pricing)

### Week 10 (Public Launch)
- 🎯 50 extension installs
- 🎯 25 active teacher accounts
- 🎯 5 paying customers ($50 MRR)

### Week 16 (Growth Phase)
- 🎯 200 extension installs
- 🎯 100 active teacher accounts
- 🎯 15 paying customers ($150 MRR)
- 🎯 80% customer satisfaction (from interviews)

### 6 Months Post-Launch
- 🎯 1,000 extension installs
- 🎯 500 teacher accounts
- 🎯 50 paying customers ($500 MRR / $6K ARR)

---

## 🔧 Technical Decisions

### What We're Keeping from interactive-presentations:
- ✅ Firebase architecture (works great)
- ✅ Activity component structure
- ✅ Google Slides detection logic
- ✅ Real-time sync patterns
- ✅ QR code generation

### What We're Removing:
- ❌ ST Math game integrations
- ❌ Submit-Sample (canvas activities) - too complex for MVP
- ❌ Trillionaire/Collaborative games - can add later
- ❌ Review Game - can add later
- ❌ Reveal.js support (Google Slides only)

### What We're Simplifying:
- 🔄 Activity types: Focus on Poll, Quiz, Text Response, Announcement
- 🔄 Builder: Simpler form-based editor (not full JSON)
- 🔄 Branding: Generic education, not ST Math specific

---

## 💰 Budget Estimate (Year 1)

### One-time Costs:
- Domain: $12-60 (slides-live.com or slideslive.io)
- Logo design: $0-50 (Canva or Fiverr)
- **Total one-time: ~$60-110**

### Monthly Costs:
- Firebase Spark (Free tier): $0
  - Likely stays free until 100+ active users
- Firebase Blaze (if needed): ~$25-100/month
- Stripe fees: 2.9% + $0.30 per transaction (~3-5% of revenue)
- Email service (transactional): $0-10/month
- **Total monthly: ~$25-110**

### Annual Costs (Year 1):
- Infrastructure: ~$300-1,200
- If you hit $10K revenue: ~$300 in Stripe fees
- **Total Year 1 spend: ~$600-1,500**

**Break-even:** ~10-15 paying customers

---

## 🚨 Risk Mitigation

### Risk: Google builds this into Slides
**Mitigation:** Move fast, focus on teacher-specific features, build community

### Risk: Low adoption
**Mitigation:** Free tier is genuinely useful, focus on word-of-mouth

### Risk: Technical complexity
**Mitigation:** Start with proven code, simplify rather than add features

### Risk: Time commitment
**Mitigation:** No artificial deadlines, keep day job, treat as side project

---

## 📞 Next Actions (This Week)

1. ✅ Create project structure
2. 🔲 Buy domain
3. 🔲 Create Firebase project
4. 🔲 Copy extension code
5. 🔲 Copy web app core
6. 🔲 Test end-to-end with new Firebase
7. 🔲 Remove ST Math branding

**Time estimate:** 6-10 hours this week

---

**Last updated:** April 22, 2026
