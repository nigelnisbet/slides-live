# SlidesLive - Current Status

**Last Updated:** June 17, 2026 (evening)

---

## ✅ Phase 0 Shipped: Deep Slides Integration (June 17, 2026, evening)

Everything in the "Strategy Update" validation below is now wired into the
real extension and tested end-to-end on a real Google Slides presentation
with a real second device joining. This is the new primary UX - the
extension popup is no longer needed for the core flow at all.

### What it does now
- **One-click "Go Live"** (green, bottom-center of the editor): creates a
  session and starts the floating stats window in a single click. Falls
  back to a "📊 Start Floating Stats" button (same slot) if a session is
  already active (page reload mid-session, or closed the floating window
  without ending the session - it reopens without needing a page refresh).
- **Floating live-stats window** (classic video Picture-in-Picture):
  shows the QR code + join code + connected count when no activity is
  running (announcements count as "no activity" too, since there's no
  response data to show); switches to live results (counts/bars) once an
  activity starts. Resize-aware: drag bigger for full results, smaller for
  a glanceable count. Survives real Present-mode fullscreen and slide
  navigation, confirmed live.
- **"⏹ End Session"** (red, bottom-left): ends the session from inside
  Slides, no popup needed. Closes the floating window first if open.
- **"+ Add Activity"** (blue, bottom-right): on-slide authoring panel for
  poll/quiz/word-cloud/announcement. Re-opening it for a slide that already
  has an activity pre-fills the existing data (title becomes "Edit
  Activity") and adds a "Delete this activity" option. Quiz includes a
  per-option "mark as correct" radio (was missing entirely at first -
  quizzes always showed every answer as wrong until fixed).
- **Color-coded thumbnail badges**: each filmstrip thumbnail with an
  activity gets a small colored dot (matches the floating window's
  activity-type colors); clicking the dot jumps straight to editing that
  slide's activity without navigating to it first.
- **Anonymous Firebase auth** (enabled in the `slideslive-prod` console)
  satisfies the existing `presentations/{id}/config` write rule
  (`auth != null`) with zero sign-in UI - this is a Phase 0 stand-in, not
  meant to survive into the real freemium/account system.

### Real bugs found and fixed along the way (useful context if they resurface)
- `isInPresentationMode()` used `.includes('/present')`, which is true for
  *every* Slides URL since `/presentation/` contains that substring -
  always returned `true`, even in the normal editor. Fixed to match the
  `present` path segment exactly.
- Slide-index detection (`getSlideIndexFromFilmstrip()`) was built against
  `.punch-filmstrip-thumbnail` class selectors that no longer exist in the
  current Slides editor markup - was silently degraded to weaker
  URL-parsing fallbacks. Added a new primary method using the filmstrip's
  current SVG group ids (`filmstrip-slide-{N}-...-bg`, discovered during
  the validation session) matched against the URL's slide object id.
  `getTotalSlides()` updated the same way.
- The content script can't use ES `import`/`export` at all (only the
  `"type":"module"` background worker can) - the Vite build was producing
  exactly that for `content.js`, throwing `Cannot use import statement
  outside a module` at runtime. Fixed with a separate `vite.content.config.ts`
  build pass using `format: 'iife'` so the content script's whole
  dependency graph gets inlined into one self-contained file.
- Drawing the cross-origin QR code image onto the canvas without
  `crossOrigin = 'anonymous'` taints the canvas, and `captureStream()`
  rendered the tainted region as a corrupted gray gradient instead of the
  QR code. `api.qrserver.com` already sends CORS headers, so setting
  `crossOrigin` fixed it cleanly.
- A `window.focus()` call on the PiP window's `resize` event (meant to fix
  focus getting stuck on the floating window after a drag-resize) broke
  slide click/keyboard navigation entirely - reverted. See "Known Minor
  Issues" below.

---

## 🧭 Strategy Update (June 17, 2026)

A focused R&D session validated several deep Google Slides integration
mechanisms that materially change the product's differentiation and
go-to-market sequencing.

### What we validated (all confirmed against real Google Slides + real Firebase, not mocks)
- **Floating "live stats" window that survives Present-mode fullscreen.** Built via
  classic `<video>` Picture-in-Picture (canvas → `captureStream()` → hidden
  `<video>` → `requestPictureInPicture()`), *not* the newer Document PiP API
  (which we confirmed kicks the page out of fullscreen - a dealbreaker).
  Confirmed it: persists across real slide navigation, is resize-aware (compact
  "12 answered" view that the presenter can drag-resize into a full results
  view, then shrink back down), and is freely draggable. Key implementation
  gotcha: the PiP pipeline must be started *before* entering fullscreen, or the
  window doesn't get composited above the fullscreen layer until a fullscreen
  toggle forces a re-layer.
- **On-slide activity authoring.** While editing (not presenting - no
  fullscreen to fight), a small injected "+ Add Activity" button + form panel
  can create an activity for whichever slide is currently open, detected
  reliably via the URL hash (`#slide=id.XXXX`) matched against the filmstrip's
  DOM ids. This can replace the "open a separate builder app, drag in a
  presentation URL" flow for the common case (poll/quiz/word cloud/announcement).
- **Color-coded activity badges on slide thumbnails.** Each filmstrip thumbnail
  has a stable, indexed DOM anchor (`filmstrip-slide-{N}-...-bg`), so we can
  overlay a small colored dot per activity type, live-updated on scroll/resize.
  Note: Slides enforces a Trusted Types CSP, so any injected DOM manipulation
  must avoid `innerHTML` (use `createElement`/`replaceChildren` instead).
- **Full real end-to-end round trip**, bypassing the extension entirely: wrote
  a session directly into `slideslive-prod` via the open `sessions/$code` RTDB
  rule, generated a real QR code, scanned it on a phone, hit the live
  `slides-live.com` attendee app, submitted a poll answer, and confirmed the
  response + live-aggregated results landed in Firebase.

### Resulting go-to-market shift
The on-slide authoring + persistent floating stats window make "radically
easier than Slido/Mentimeter" a real, demonstrable claim (no separate
dashboard, no context-switching, author and present from inside Slides
itself) - strong enough to justify leading with it as the core wedge.

- **Target sequencing changed**: lead with the general presenter community
  (conference speakers, corporate trainers, college instructors) rather than
  K-12 teachers first. Less IT/device restriction, and conferences are a
  built-in viral distribution channel (one speaker presenting to 200 people who
  all see the QR + branding). K-12 becomes a secondary wave, pulled in by
  bottom-up teacher demand once there's traction - at which point we need an
  easy district-admin allowlisting path ready (many districts block
  non-allowlisted Chrome extension installs via Google Workspace for
  Education policy).
- **Viral loop needs to live on the attendee side, not just the presenter
  side.** The presenter-facing floating window should carry the SlidesLive
  logo/wordmark persistently (also doubles as a freemium lever - Pro removes
  or shrinks it). More importantly: attendees vastly outnumber presenters, so
  the bigger growth lever is on their device. Plan: when a session ends, the
  attendee's device redirects to a configurable URL.
  - **Free tier default:** redirects to a SlidesLive landing/signup page
    (`slides-live.com/signup` or similar) - turns every attendee into a
    potential next presenter.
  - **Pro feature:** presenter can specify their own custom redirect URL
    (their website, a newsletter signup, a social profile, etc.) instead of
    the SlidesLive default - a clean, low-effort monetization hook.
- **Activity-type roadmap reordered**: general presenter activities first
  (poll, quiz, word cloud, live Q&A) ahead of classroom-specific extensions
  (Google Classroom roster import, leaderboards, timer-locked quizzes), which
  move later/secondary to match the new primary audience.

---

## ✅ MVP Complete & Live

The core product is built, deployed, and connected to the production domain.

### Chrome Extension
- Detects Google Slides presentations and tracks slide changes
- One-click "Go Live" creates a session and starts the in-page floating
  stats window (see Phase 0 section above) - the popup's Start
  Session/Open Live Stats buttons still work as a fallback but aren't
  needed for the core flow anymore
- On-slide activity authoring + color-coded thumbnail badges
- Builds without errors (two-pass build - see `extension/vite.content.config.ts`)

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
- **Anonymous Authentication enabled** (June 17) - lets the on-slide editor's writes satisfy the `presentations/{id}/config` rule with zero sign-in UI
- Firebase Hosting connected to custom domain slides-live.com (Apr 27)
- Both extension and web app build successfully

---

## 🔲 What's Next

### Activity-Type Coverage in the New On-Slide Editor / Floating Window
- [ ] Resize-aware expanded view for quiz (currently reuses the poll-style bar chart - fine since both are option/count shaped, but doesn't show correct-answer highlighting or a leaderboard)
- [ ] Text-response and word-cloud views in the floating window (only poll/quiz-shaped bar charts and the announcement/no-activity QR view exist today)
- [ ] Word-cloud isn't an actual activity type yet in `shared/src/types/activity.ts` - the on-slide editor offers it as an option but there's no attendee-side component for it

### Freemium Logic (Not Started)
- [ ] Teacher account creation (Google OAuth) - note this is separate from the anonymous auth added today, which only covers the on-slide editor's writes
- [ ] 30-participant limit enforcement (free tier)
- [ ] 3-presentation limit (free tier)
- [ ] "Upgrade to Pro" prompts
- [ ] Stripe payment integration
- [ ] Subscription management page
- [ ] Pro tier: presenter-specified custom post-session redirect URL (free tier default is shipped - see Phase 0 section above)
- [ ] SlidesLive logo/wordmark on the floating stats window/attendee screens as a removable-on-Pro watermark (currently always shown, not yet tied to any tier logic)

### Polish / Known Minor Issues
- [ ] Bundle size warning (~624KB, over 500KB threshold) - consider code splitting
- [ ] ~19 console.log statements across the web app - mix of useful debug logs and a few leftover dev notes (e.g. `AuthContext.tsx`)
- [ ] Interacting with the floating PiP stats window (clicking into it, especially after a resize) can steal OS keyboard focus from the Slides tab, so arrow-key slide navigation stops working until the presenter clicks back on the presentation. A `window.focus()`-on-resize fix was tried and reverted - it broke slide navigation entirely, likely because `PictureInPictureWindow`'s `resize` event fires more often than just "drag finished." A debounced version is worth retrying; for now this just needs a user-facing note ("click back on your slides after checking the stats window").
- [ ] PiP window chrome (timeline/CC button/"LIVE" badge, gray reveal-on-hover gradient) is native, unbrandable browser UI - confirmed not controllable via any web API. Media Session metadata was tried for the title but only affects OS-level "Now Playing" surfaces, not the PiP window itself - reverted expectations, not the code (it's harmless to leave in).
- [ ] Filmstrip `MutationObserver` setup (`setupFilmstripObserver` in `content-script.ts`) still targets the old `.punch-filmstrip` selector and never attaches - falls back to 500ms polling + click/keydown listeners, which works but isn't instant. Same root cause as the slide-index selector bug already fixed; worth updating to the new filmstrip markup too.

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
- **Jun 17, 2026:** R&D session validated deep Slides integration (PiP floating window, on-slide authoring, thumbnail badges) → go-to-market pivot to lead with the general presenter community → Phase 0 shipped same day: "Go Live"/"End Session"/"+ Add Activity" buttons live in the real extension, anonymous auth enabled, quiz correctAnswer bug fixed, tested end-to-end with a real second device

**Questions or blockers?** Update this document as we go!
