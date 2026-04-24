# SlidesLive - Current Status

**Last Updated:** April 22, 2026

---

## ✅ What's Been Done

### Project Setup
- ✅ Created project directory structure at `/Volumes/G-DRIVE with Thunderbolt 1/projects/slides-live/`
- ✅ Set up folder hierarchy (extension, web-app, shared, landing, firebase, docs)
- ✅ Created `.gitignore`
- ✅ Created `README.md` with project vision

### Shared Types Package
- ✅ Created `package.json` and `tsconfig.json`
- ✅ Defined core TypeScript types:
  - `session.ts` - Session, Participant, SlidePosition
  - `activity.ts` - Activity types (Poll, Quiz, TextResponse, Announcement)
  - `user.ts` - User accounts, subscription tiers, freemium limits
- ✅ MVP activity types selected (4 core types to start)

### Documentation
- ✅ **PROJECT_PLAN.md** - Complete 16-week roadmap with phases, metrics, budget
- ✅ **SETUP_GUIDE.md** - Step-by-step setup instructions
- ✅ **CURRENT_STATUS.md** - This file!

### Strategic Decisions Made
- ✅ Chose freemium model: Free (30 students, 3 presentations) / Pro ($9.99/mo)
- ✅ Target market: K-12 teachers primarily
- ✅ Positioning: "The Kahoot for Google Slides"
- ✅ **Domain purchased:** slides-live.com from Namecheap ($12/yr)
- ✅ Simplified to 4 MVP activity types (removing complex features for launch)

---

## 🔲 What's Next (Immediate Actions)

### This Week - Foundation Setup

1. **Register Domain** ✅ DONE
   - [x] Purchased slides-live.com from Namecheap
   - [x] Saved login credentials
   - Note: DNS configuration will happen later when deploying

2. **Create Firebase Project** ✅ DONE
   - [x] Created project: "slideslive-prod"
   - [x] Enabled Realtime Database (test mode, us-central1)
   - [x] Enabled Authentication (Google provider)
   - [x] Enabled Storage (test mode)
   - [x] Enabled Hosting
   - [x] Firebase config saved to project files

3. **Copy Extension Code** ✅ DONE
   - [x] Copied from interactive-presentations extension-google-slides
   - [x] Updated manifest.json (SlidesLive branding)
   - [x] Created firebase-config.ts with new Firebase credentials
   - [x] Updated service-worker.ts to use new config
   - [x] Changed all log messages to [SlidesLive]
   - [x] Updated attendee URL (slides-live.com / localhost:5173)
   - [x] Installed dependencies: `npm install`
   - [x] Test build successful: Extension builds without errors!

4. **Copy Web App Code** ✅ DONE
   - [x] Copied all files from `interactive-presentations/packages/attendee-app/`
   - [x] Installed dependencies (npm install successful)
   - [x] Removed non-MVP activity components (6 files deleted)
   - [x] Updated App.tsx (removed imports and cases for removed activities)
   - [x] Updated firebase.ts to use environment variables
   - [x] Created .env.local and .env.production with credentials
   - [x] Copied types to web-app/src/types/
   - [x] Updated package.json (renamed to @slideslive/web-app)
   - [x] Updated PresenterDashboard colors (ST Math → SlidesLive)
   - [x] Fixed FirebaseContext type errors (removed Review Game code)
   - [x] Added missing types to src/types/session.ts
   - [x] Fixed syntax errors (extra closing braces)
   - [x] Removed unused imports
   - [x] Test build: **`npm run build` ✅ BUILDS SUCCESSFULLY!**
   - [x] Test dev server: **`npm run dev` ✅ STARTS ON localhost:5173!**
   
   **Status:** ✅ Web app fully functional and ready to test!

5. **End-to-End Test** (1 hour)
   - [ ] Load extension in Chrome
   - [ ] Open Google Slides presentation
   - [ ] Start session (verify QR code appears)
   - [ ] Join on phone/another browser
   - [ ] Manually create a test poll in Firebase
   - [ ] Verify it shows on attendee screen
   - [ ] Submit answer
   - [ ] Verify presenter sees result

**Estimated Time This Week:** 6-10 hours

---

## 📊 MVP Feature Set (What We're Building)

### Activity Types (Launch with 4)
- ✅ Poll (multiple choice, live results)
- ✅ Quiz (timed, leaderboard, points)
- ✅ Text Response (open-ended)
- ✅ Announcement (discussion prompts)

### Core Features
- ✅ Chrome extension (Google Slides detection)
- ✅ QR code generation
- ✅ Session joining (code or QR scan)
- ✅ Real-time sync (Firebase)
- ✅ Presenter dashboard (see results)
- ✅ Activity builder (simple form-based)

### Freemium Features (Phase 2)
- 🔲 Teacher account creation (Google OAuth)
- 🔲 30-participant limit enforcement (free tier)
- 🔲 3-presentation limit (free tier)
- 🔲 Upgrade prompts
- 🔲 Stripe payment integration
- 🔲 Subscription management

### Future Features (Post-Launch)
- 🔲 WebLink activity (iframe embed)
- 🔲 Review Game (Kahoot-style)
- 🔲 Canvas-based activities (Submit-Sample)
- 🔲 Collaborative games (Trillionaire)
- 🔲 Google Classroom integration
- 🔲 Export results to CSV
- 🔲 Question bank / saved templates
- 🔲 Custom branding (school logos)

---

## 💰 Revenue Expectations

### Conservative Estimates
- **Week 10 (Launch):** 5 paying customers → $50 MRR
- **Week 16 (3 months):** 15 paying customers → $150 MRR
- **6 months:** 50 paying customers → $500 MRR ($6K ARR)
- **12 months:** 100 paying customers → $1K MRR ($12K ARR)

### Ambitious (10% market penetration in Year 2)
- **Year 2:** 500 paying customers → $5K MRR ($60K ARR)

**Personal Income Goal:** $10K-15K in Year 1 (100-150 subscribers)

---

## 🎨 Branding Notes

### Name: SlidesLive
- Simple, descriptive, memorable
- Works for all subjects (not just math)

### Tagline Options:
- "Interactive Google Slides, Instantly"
- "Turn Your Slides Into Conversations"
- "Real-Time Engagement for Every Presentation"
- "Polls, Quizzes, and Q&A for Google Slides"

### Visual Identity (Future)
- Modern, clean, education-friendly
- Primary colors: Blue (trust) + Green (growth)?
- Sans-serif font (friendly, readable)
- Icon: Combination of presentation screen + interaction (tap/click)

---

## 🚨 Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low adoption | Medium | High | Free tier is genuinely useful, focus on word-of-mouth |
| Google builds competing feature | Low | High | Move fast, focus on teacher-specific features |
| Time commitment too high | Medium | Medium | No artificial deadlines, keep as side project |
| Firebase costs spike | Low | Medium | Monitor usage, optimize queries, free tier goes far |
| Competition from Pear Deck | High | Medium | Be cheaper, simpler, more Google-native |
| Teacher budget constraints | High | Medium | Keep price point affordable ($9.99/mo) |

---

## 📝 Code Organization Decisions

### What We're Keeping from interactive-presentations:
- ✅ Firebase Realtime Database architecture (proven, reliable)
- ✅ Activity component structure (Poll, Quiz, etc)
- ✅ Google Slides detection logic (works great)
- ✅ QR code generation
- ✅ Session management patterns

### What We're Removing:
- ❌ ST Math branding
- ❌ ST Math game iframes
- ❌ Submit-Sample (canvas activities) - too complex for MVP
- ❌ Trillionaire/Collaborative games - can add later
- ❌ Review Game - can add later
- ❌ Reveal.js support (Google Slides only)
- ❌ Personal sessions (conv-tool) - focus on main product

### What We're Simplifying:
- 🔄 Activity Builder: Form-based UI, not raw JSON
- 🔄 Results Display: Clean, simple, exportable
- 🔄 Onboarding: 1-2 minute setup max

---

## 🎯 Success Metrics

### Technical Milestones
- [ ] Extension loads without errors
- [ ] QR code generates reliably
- [ ] Session creation < 5 seconds
- [ ] Real-time sync < 1 second latency
- [ ] Mobile-friendly on iOS and Android
- [ ] Works on Chromebook (important for schools!)

### User Experience Metrics
- [ ] Setup time: < 2 minutes (first presentation)
- [ ] Join time: < 15 seconds (student scanning QR)
- [ ] Response time: < 30 seconds (student submits answer)
- [ ] Results display: < 3 seconds (teacher sees results)

### Business Metrics
- Free → Paid conversion: 5-10% (industry standard)
- Churn rate: < 10%/month (good for education SaaS)
- CAC (Customer Acquisition Cost): < $20 (organic/word-of-mouth)
- LTV (Lifetime Value): $200+ (20 months average)

---

## 📞 Who Can Help

### Technical
- **Firebase:** Official docs + Stack Overflow
- **Chrome Extension:** MDN Web Docs, Chrome Developer docs
- **React/Vite:** Official docs are excellent

### Business/Marketing
- **Reddit:** r/teachers, r/SideProject, r/Entrepreneur
- **Twitter/X:** #edutwitter community
- **Facebook:** Teacher groups (50K+ members in many)

### Legal/Privacy
- **FERPA Compliance:** Consult education lawyer if needed
- **Terms of Service:** Use template from Termly or similar
- **Privacy Policy:** GDPR/COPPA compliant (Firebase helps)

---

## 💭 Open Questions

1. **Domain:** slides-live.com ($12) or slideslive.io ($60)?
   - Recommendation: slides-live.com (affordable, trusted .com TLD)

2. **Free tier limits:** 30 students good? Or 25? Or 40?
   - 30 is right in the middle - not too generous, not too restrictive

3. **Trial period:** 14 days? 30 days? No trial?
   - Recommendation: 14-day trial on Pro (standard, creates urgency)

4. **School licensing:** How to price? Per-teacher? Per-school?
   - Start with per-teacher ($3-5/teacher/month for 20+ licenses)
   - Can add per-school later

5. **Google Workspace Marketplace:** Apply now or later?
   - Later - need working product + users first

6. **Stripe vs other payment processor?**
   - Stripe is standard, well-documented, trusted by schools

---

## 🏁 Definition of "Launch Ready"

We can launch when we have:
- ✅ Extension published to Chrome Web Store
- ✅ Web app hosted on Firebase (or Vercel/Netlify)
- ✅ Domain connected and SSL working
- ✅ 4 core activity types working end-to-end
- ✅ Teacher authentication (Google OAuth)
- ✅ Freemium limits enforced
- ✅ Stripe payment integration working
- ✅ Landing page with demo video
- ✅ Quick start guide
- ✅ Privacy policy & Terms of Service
- ✅ Tested on 3+ devices (desktop, iOS, Android)
- ✅ Beta tested with 5-10 teachers

**Estimated time to "Launch Ready":** 8-12 weeks (working part-time)

---

## 📅 Key Dates (Tentative)

- **April 22, 2026:** Project started
- **May 1, 2026:** Firebase + domain setup complete (Target)
- **May 15, 2026:** Extension + web app working locally (Target)
- **June 1, 2026:** Freemium logic implemented (Target)
- **June 15, 2026:** Beta launch to 10 teachers (Target)
- **July 1, 2026:** Public launch - Chrome Web Store (Target)
- **September 1, 2026:** Iterate based on feedback (Target)

**Note:** These are flexible targets, not hard deadlines. Side project pace.

---

**Questions or blockers?** Update this document as we go!
