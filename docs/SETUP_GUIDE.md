# SlidesLive - Setup Guide

Complete setup instructions for getting the project running locally.

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Chrome browser
- Firebase CLI: `npm install -g firebase-tools`
- Git

---

## 🔧 Step 1: Domain & Firebase Setup

### 1.1 Register Domain

**Option A: slides-live.com ($12-15/year)**
- Go to [Namecheap](https://www.namecheap.com) or [Porkbun](https://porkbun.com)
- Search for "slides-live.com"
- Purchase with WHOIS privacy

**Option B: slideslive.io ($30-60/year)**
- Same process as above
- More expensive but cleaner look

### 1.2 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name: `slideslive-prod`
4. Disable Google Analytics (optional for now)
5. Click "Create project"

### 1.3 Enable Firebase Services

**Realtime Database:**
1. In Firebase Console → Build → Realtime Database
2. Click "Create Database"
3. Choose location (us-central1 recommended)
4. Start in **Test mode** (we'll add rules later)

**Authentication:**
1. Build → Authentication → Get started
2. Enable "Google" sign-in provider
3. Add authorized domain: your-domain.com

**Storage:**
1. Build → Storage → Get started
2. Start in **Test mode**

**Hosting:**
1. Build → Hosting → Get started
2. Follow setup instructions

### 1.4 Get Firebase Config

1. Project Overview → Project settings (gear icon)
2. Scroll to "Your apps" → Web app
3. Click "Add app" or copy existing config
4. Save the config object - you'll need it for `.env` files

Example config:
```javascript
{
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "slideslive-prod.firebaseapp.com",
  databaseURL: "https://slideslive-prod.firebaseio.com",
  projectId: "slideslive-prod",
  storageBucket: "slideslive-prod.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
}
```

---

## 🚀 Step 2: Local Development Setup

### 2.1 Clone/Copy Code (from interactive-presentations)

We'll copy the core code from your existing project and clean it up.

```bash
cd "/Volumes/G-DRIVE with Thunderbolt 1/projects/slides-live"

# We'll do this step by step with Claude's help
# Don't run these commands yet - they're placeholders
```

### 2.2 Install Dependencies

```bash
# Install root dependencies (if using workspaces)
npm install

# Or install per package
cd shared && npm install
cd ../web-app && npm install
cd ../extension && npm install
```

### 2.3 Configure Environment Variables

**For web-app:**

Create `web-app/.env.local`:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=slideslive-prod.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://slideslive-prod.firebaseio.com
VITE_FIREBASE_PROJECT_ID=slideslive-prod
VITE_FIREBASE_STORAGE_BUCKET=slideslive-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Stripe (add later when ready for payments)
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
```

**For extension:**

Create `extension/src/config.ts`:
```typescript
export const FIREBASE_CONFIG = {
  apiKey: "your_api_key_here",
  authDomain: "slideslive-prod.firebaseapp.com",
  databaseURL: "https://slideslive-prod.firebaseio.com",
  projectId: "slideslive-prod",
  storageBucket: "slideslive-prod.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
};

export const ATTENDEE_APP_URL = "http://localhost:5173"; // Local dev
// export const ATTENDEE_APP_URL = "https://slides-live.com"; // Production
```

---

## 🏃 Step 3: Run Development Servers

### 3.1 Build Shared Types (first time and when types change)

```bash
cd shared
npm run build
# or for continuous development:
npm run watch
```

### 3.2 Start Web App

```bash
cd web-app
npm run dev
# Opens at http://localhost:5173
```

### 3.3 Build Extension

```bash
cd extension
npm run build
# or for watch mode:
npm run dev
```

### 3.4 Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select `/Volumes/G-DRIVE with Thunderbolt 1/projects/slides-live/extension/dist`

---

## 🧪 Step 4: Test End-to-End

1. **Open Google Slides:**
   - Go to slides.google.com
   - Open any presentation (or create a test one)

2. **Start Session:**
   - Click the SlidesLive extension icon
   - Click "Start Session"
   - QR code should appear

3. **Join as Attendee:**
   - On phone: Scan QR code
   - On computer: Open `localhost:5173` and enter session code

4. **Test Activity:**
   - For now, you'll need to manually trigger activities in Firebase
   - Or wait until Activity Builder is complete

---

## 📁 Project Structure Reference

```
slides-live/
├── README.md
├── .gitignore
├── package.json (optional - for workspaces)
│
├── shared/                      # TypeScript types
│   ├── src/
│   │   ├── types/
│   │   │   ├── session.ts
│   │   │   ├── activity.ts
│   │   │   └── user.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── web-app/                     # React app (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Join.tsx        # Enter session code
│   │   │   ├── Attend.tsx      # Student view
│   │   │   ├── Present.tsx     # Teacher dashboard
│   │   │   └── Builder.tsx     # Activity builder
│   │   ├── components/
│   │   │   └── activities/
│   │   │       ├── Poll.tsx
│   │   │       ├── Quiz.tsx
│   │   │       ├── TextResponse.tsx
│   │   │       └── Announcement.tsx
│   │   ├── hooks/
│   │   ├── firebase.ts
│   │   └── App.tsx
│   ├── .env.local (YOU CREATE THIS)
│   ├── package.json
│   └── vite.config.ts
│
├── extension/                   # Chrome extension
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── src/
│   │   ├── background.ts       # Service worker
│   │   ├── content.ts          # Injected into Google Slides
│   │   ├── popup/              # Extension popup UI
│   │   └── config.ts (YOU CREATE THIS)
│   └── package.json
│
├── landing/                     # Marketing site (future)
│   └── (TBD)
│
├── firebase/                    # Firebase config & functions
│   ├── firestore.rules
│   ├── storage.rules
│   └── functions/
│       └── (TBD - Stripe webhooks, etc)
│
└── docs/
    ├── SETUP_GUIDE.md (this file)
    ├── PROJECT_PLAN.md
    └── (more docs as we go)
```

---

## ⚠️ Common Issues

### Issue: "Permission denied" when loading extension
**Fix:** Make sure the `dist/` folder exists in extension directory. Run `npm run build` first.

### Issue: Firebase connection fails
**Fix:** Check that `.env.local` has correct Firebase config. Make sure Realtime Database is created.

### Issue: QR code doesn't generate
**Fix:** Check browser console for errors. Verify extension has permission to access Google Slides.

### Issue: Can't join session
**Fix:** Make sure web app is running on localhost:5173 or update `ATTENDEE_APP_URL` in extension config.

---

## 🎯 Next Steps After Setup

1. ✅ Confirm extension can detect slide changes
2. ✅ Confirm QR code generates
3. ✅ Confirm attendee can join session
4. ✅ Test a simple poll activity
5. 🔲 Start removing ST Math specific code
6. 🔲 Add freemium logic
7. 🔲 Build activity builder UI

---

**Questions?** Check `/docs/PROJECT_PLAN.md` for overall roadmap.
