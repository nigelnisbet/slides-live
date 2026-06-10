# SlidesLive - Cleanup Checklist

**Date:** April 24, 2026

---

## 🔍 **Issues Found in Code Review**

### **1. Branding - ST Math References**

**Files with ST Math branding:**
- [ ] `components/presenter/PollResults.tsx` - ST Math colors (stMathBlue, stMathOrange)
- [ ] `components/SessionCodeBadge.tsx` - ST Math colors
- [ ] `components/FloatingFeedbackButton.tsx` - ST Math orange
- [ ] `components/FeedbackModal.tsx` - ST Math colors

**Action:** Replace with SlidesLive brand colors:
- Primary Blue: `#3b82f6`
- Primary Dark: `#2563eb`
- Accent: `#10b981`

---

### **2. Old Firebase Project References**

**Files with old Firebase config:**
- [ ] `components/builder/firebaseConfig.ts` - Still has class-session-games
- [ ] `components/presenter/TextResponseResults.tsx` - Old Firebase config
- [ ] `components/builder/ActivityFormFields.tsx` - Old URL in placeholder
- [ ] `components/builder/ActivityLibrary.tsx` - Old URL in placeholder

**Action:** Update to use slideslive-prod Firebase project

---

### **3. Old Domain References**

**Files with presentations.stmath.com:**
- [ ] `pages/AdminDashboard.tsx` - Multiple references to presentations.stmath.com

**Action:** Update to slides-live.com

---

### **4. Unused Pages/Features**

**Pages that may not be needed for MVP:**
- [ ] `pages/AdminDashboard.tsx` - Personal sessions management (ST Math specific)
- [ ] `pages/PersonalSessionJoin.tsx` - Auto-join by name (ST Math specific)
- [ ] Route `/conv-tool/:name` in App.tsx
- [ ] Route `/admin` in App.tsx

**Options:**
- Remove entirely (recommended for MVP)
- Keep but disable routes
- Update for generic use

---

### **5. Activity Types Review**

**Current Activity Types:**
✅ Poll - Multiple choice with live results
✅ Quiz - Timed questions with leaderboard
✅ TextResponse - Open-ended questions
✅ Announcement - Simple message display

**Potentially Missing:**
- ❓ Web Link - Iframe embed or link to external content
- ❓ Image/Media - Display image or video
- ❓ Drawing/Whiteboard - Collaborative drawing
- ❓ Word Cloud - Aggregate text responses visually

**Decision Needed:** Are 4 types enough for MVP launch?

---

### **6. Firebase Security Rules**

**Status:** Currently in TEST MODE (insecure!)

**Action Needed:**
- [ ] Write production security rules
- [ ] Limit read/write to session participants
- [ ] Prevent data tampering
- [ ] Set up proper authentication rules

---

### **7. Environment Variables Check**

**Files to verify:**
- [ ] `web-app/.env.local` - Development config
- [ ] `web-app/.env.production` - Production config
- [ ] `extension/src/firebase-config.ts` - Extension config

**Verify all point to slideslive-prod project**

---

### **8. Build Configuration**

**Check:**
- [ ] Extension manifest.json - Correct name, description, URLs
- [ ] Web app package.json - Correct name, description
- [ ] vite.config.ts - Production build settings
- [ ] No console.logs in production builds

---

### **9. Documentation Updates**

**Files to update:**
- [ ] README.md - Update project name, URLs
- [ ] Remove references to ST Math
- [ ] Update setup instructions
- [ ] Update deployment instructions

---

### **10. Testing Checklist**

After cleanup, test:
- [ ] Extension loads without errors
- [ ] Can create session in Google Slides
- [ ] QR code shows correct URL (slides-live.com)
- [ ] Web app loads at localhost:5173
- [ ] Can join session with code
- [ ] Poll activity works end-to-end
- [ ] Quiz activity works with timer
- [ ] TextResponse accepts input
- [ ] Announcement displays message
- [ ] Participant count updates
- [ ] Firebase data structure looks correct
- [ ] No console errors in browser

---

## 📊 **Priority Levels**

### **High Priority (Must Fix Before Launch)**
1. Update all Firebase configs to slideslive-prod
2. Replace ST Math branding colors
3. Update URLs from presentations.stmath.com to slides-live.com
4. Fix Firebase security rules (move from test mode)

### **Medium Priority (Should Fix Soon)**
5. Remove or update AdminDashboard
6. Remove PersonalSessionJoin or make generic
7. Clean up console.logs
8. Update documentation

### **Low Priority (Can Do Later)**
9. Consider adding more activity types
10. Optimize bundle size
11. Add better error handling
12. Improve accessibility

---

## 🎯 **Estimated Time**

- **High Priority:** 1-2 hours
- **Medium Priority:** 1-2 hours
- **Low Priority:** 2-4 hours
- **Total:** 4-8 hours for complete cleanup

---

## ✅ **Completion Criteria**

Ready for launch when:
- [ ] No ST Math references remain
- [ ] All configs point to slideslive-prod
- [ ] All URLs point to slides-live.com
- [ ] Firebase security rules in place
- [ ] All 4 activity types tested end-to-end
- [ ] No console errors
- [ ] Extension and web app both build successfully
- [ ] Documentation updated

---

**Status:** 🟡 In Progress - Review Complete, Cleanup Pending
