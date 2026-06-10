# SlidesLive - Current Status

**Last Updated:** June 10, 2026

---

## ✅ MVP Complete & Live

The core product is built, deployed, and connected to the production domain.

### Chrome Extension
- Detects Google Slides presentations and tracks slide changes
- Starts/ends sessions, generates QR codes + session codes
- "📊 Open Live Stats" button opens a compact presenter window
- Builds without errors

### Web App (slides-live.com)
- 4 MVP activity types: Poll, Quiz, TextResponse, Announcement
- Attendee join flow (code or QR scan)
- Presenter dashboard (`/presenter/:code`) - full results view
- Compact presenter stats window (`/presenter-compact/:code`) - 400x600px live stats popup, added Apr 27
- Activity Builder (`/builder`)
- Feedback system (modal + floating button)
- SlidesLive branding throughout (blue `#3b82f6` / green `#10b981`)

### Personal Sessions (Sales Team Tool)
- `/admin` - Admin dashboard for managing personal session links
- `/conv-tool/:name` - Auto-join links for sales team members
- Originally an ST Math feature, repurposed for SlidesLive's own sales/demo use

### Infrastructure
- Firebase project: `slideslive-prod`
- Realtime Database with **production security rules** (added May 21, replacing test-mode rules)
- Firebase Hosting connected to custom domain slides-live.com (Apr 27)
- Both extension and web app build successfully

---

## 🔲 What's Next

### Freemium Logic (Not Started)
- [ ] Teacher account creation (Google OAuth)
- [ ] 30-participant limit enforcement (free tier)
- [ ] 3-presentation limit (free tier)
- [ ] "Upgrade to Pro" prompts
- [ ] Stripe payment integration
- [ ] Subscription management page

### Polish / Known Minor Issues
- [ ] Bundle size warning (~624KB, over 500KB threshold) - consider code splitting
- [ ] ~19 console.log statements across the web app - mix of useful debug logs and a few leftover dev notes (e.g. `AuthContext.tsx`)
- [ ] No activities configured by default - must be created via Activity Builder or Firebase

### Pre-Launch Checklist
- [ ] Chrome Web Store listing + submission
- [ ] Landing page + demo video
- [ ] Quick start guide for teachers
- [ ] Privacy policy & Terms of Service
- [ ] Beta test with 5-10 teachers
- [ ] Test on Chromebook, iOS, Android

---

## 📊 MVP Feature Set

### Activity Types (4, shipped)
- ✅ Poll (multiple choice, live results)
- ✅ Quiz (timed, leaderboard, points)
- ✅ Text Response (open-ended)
- ✅ Announcement (discussion prompts)

### Future Activity Types (post-launch)
- 🔲 WebLink (iframe embed)
- 🔲 Review Game (Kahoot-style)
- 🔲 Submit-Sample (canvas-based)
- 🔲 Collaborative tap games
- 🔲 Google Classroom integration
- 🔲 Export results to CSV
- 🔲 Question bank / saved templates
- 🔲 Custom branding (school logos)

---

## 💰 Business Model (unchanged)

- **Free:** 30 students, 3 presentations
- **Pro:** $9.99/month - unlimited students & presentations
- **School/District:** Custom pricing
- Target: K-12 teachers, college instructors, corporate trainers, conference presenters

---

## 🔗 Key Links

- **Live site:** slides-live.com
- **Firebase Console:** https://console.firebase.google.com/project/slideslive-prod
- **Repo docs:** `docs/PROJECT_PLAN.md` (16-week roadmap), `docs/SETUP_GUIDE.md` (setup instructions)
- **Archived session logs:** `docs/archive/` (April 2026 migration history)

---

## 📅 Timeline So Far

- **Apr 22, 2026:** Project started - extension + web app migrated from interactive-presentations
- **Apr 24, 2026:** Branding/Firebase/domain cleanup complete, both builds passing
- **Apr 27, 2026:** Compact presenter stats window added, custom domain connected
- **May 21, 2026:** Production security rules deployed (replacing expiring test-mode rules)

**Questions or blockers?** Update this document as we go!
