# 🚀 SlidesLive - Your Next Steps

Quick reference for what to do next!

---

## ⏰ This Week (6-10 hours)

### 1. Buy Domain (30 min)
- [ ] Go to [Namecheap.com](https://namecheap.com) or [Porkbun.com](https://porkbun.com)
- [ ] Search for your preferred domain:
  - **Recommended:** slides-live.com ($12/year)
  - **Alternative:** slideslive.io ($60/year)
- [ ] Purchase with WHOIS privacy enabled
- [ ] Save login credentials

### 2. Create Firebase Project (20 min)
- [ ] Go to [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Click "Add project"
- [ ] Name: `slideslive-prod`
- [ ] Disable Google Analytics (for now)
- [ ] Click through to create

### 3. Enable Firebase Services (15 min)
- [ ] **Realtime Database:** Build → Realtime Database → Create Database (test mode, us-central1)
- [ ] **Authentication:** Build → Authentication → Get started → Enable Google provider
- [ ] **Storage:** Build → Storage → Get started (test mode)
- [ ] **Hosting:** Build → Hosting → Get started

### 4. Get Firebase Config (5 min)
- [ ] Project settings (gear icon) → Your apps → Web app
- [ ] Copy the config object (looks like this):
```javascript
{
  apiKey: "AIza...",
  authDomain: "slideslive-prod.firebaseapp.com",
  databaseURL: "https://slideslive-prod.firebaseio.com",
  projectId: "slideslive-prod",
  storageBucket: "slideslive-prod.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
}
```
- [ ] **Save this in a secure note** (you'll need it for .env files)

### 5. Initialize Git Repo (5 min)
```bash
cd "/Volumes/G-DRIVE with Thunderbolt 1/projects/slides-live"
git init
git add .
git commit -m "Initial project structure and documentation"
```

### 6. Copy Extension Code (2-3 hours)
Ask Claude to help with this! Say:
> "Help me copy the extension code from interactive-presentations to slides-live, removing ST Math specific stuff"

### 7. Copy Web App Code (3-4 hours)
Ask Claude to help with this! Say:
> "Help me copy the web app code from interactive-presentations to slides-live, keeping only Poll, Quiz, TextResponse, and Announcement activities"

### 8. Test End-to-End (1 hour)
- [ ] Build extension: `cd extension && npm install && npm run build`
- [ ] Load extension in Chrome (chrome://extensions → Load unpacked → select `extension/dist`)
- [ ] Start web app: `cd web-app && npm install && npm run dev`
- [ ] Open Google Slides, click extension icon, start session
- [ ] Join session on phone/another browser
- [ ] Verify QR code works and connection is stable

---

## 📝 After This Week

Once you've got the basic setup working, next priorities are:

### Week 2-3: Clean Up & Simplify
- Remove all ST Math branding
- Simplify activity builder
- Test on multiple devices
- Fix any bugs

### Week 4-5: Freemium Logic
- Add Google OAuth login for teachers
- Implement 30-participant limit
- Implement 3-presentation limit
- Add "Upgrade to Pro" prompts

### Week 6-7: Payment Integration
- Set up Stripe account
- Add checkout flow
- Subscription management page
- Test payments (use Stripe test mode)

### Week 8-9: Polish
- Create landing page
- Record demo video
- Write quick start guide
- Prepare Chrome Web Store listing

### Week 10: Launch!
- Submit extension to Chrome Web Store
- Share with 10-20 beta teachers
- Collect feedback
- Iterate

---

## 🆘 If You Get Stuck

### Can't find a file in interactive-presentations?
Ask Claude:
> "Where is [file/component] in the interactive-presentations project?"

### Firebase not connecting?
- Check that `.env.local` has correct values
- Check browser console for errors
- Verify Firebase project is in "test mode" (not production rules yet)

### Extension won't load?
- Make sure you ran `npm run build` in the extension folder
- Check that `dist/` folder exists and has files
- Look at chrome://extensions for error messages

### Code is too complex?
- Ask Claude to simplify specific components
- Remember: MVP is 4 activity types, not everything
- It's okay to delete code you don't need yet

---

## 💡 Tips for Success

1. **Work in small chunks** - 1-2 hours at a time is fine
2. **Git commit often** - After each working feature
3. **Test early, test often** - Don't wait until "everything" is done
4. **Ask Claude for help** - That's what I'm here for!
5. **Don't over-engineer** - Simple working product beats complex perfect product
6. **Talk to teachers early** - Get feedback before building too much

---

## 📞 Need Help?

Just ask Claude:
- "Help me set up [specific thing]"
- "Debug this error: [paste error]"
- "Simplify this code: [paste code]"
- "How do I [specific task]?"

---

## 🎯 Current Location

Your project is here:
```
/Volumes/G-DRIVE with Thunderbolt 1/projects/slides-live/
```

Key docs to reference:
- `README.md` - Project overview
- `docs/PROJECT_PLAN.md` - Full 16-week roadmap
- `docs/SETUP_GUIDE.md` - Detailed setup instructions
- `docs/CURRENT_STATUS.md` - What's done, what's next
- `NEXT_STEPS.md` - This file!

---

**You've got this! 🚀**

Start with domain + Firebase, then we'll tackle the code copying together.
