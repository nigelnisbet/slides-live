# SlidesLive

Transform your Google Slides presentations into interactive, real-time experiences!

## 🎯 Product Vision

A simple, affordable tool for teachers to add real-time polls, quizzes, and Q&A to their Google Slides presentations. Students join via QR code on their phones - no apps to download, no accounts required.

## 🏗️ Architecture

- **Chrome Extension** - Detects slide changes in Google Slides
- **Web App** - Attendee interface + Presenter dashboard + Activity builder
- **Firebase Backend** - Real-time sync, authentication, storage

## 💰 Business Model

**Freemium SaaS:**
- Free: Up to 30 students, 3 presentations
- Pro: $9.99/month - Unlimited students & presentations
- School/District: Custom pricing

## 🚀 Tech Stack

- React + TypeScript + Vite
- Firebase (Realtime Database, Auth, Hosting)
- Tailwind CSS
- Chrome Extension API

## 📁 Project Structure

```
slides-live/
├── extension/          Chrome extension for Google Slides
├── web-app/           Attendee + Presenter + Builder app
├── shared/            Shared TypeScript types
├── landing/           Marketing site
└── firebase/          Firebase configuration & functions
```

## 🎓 Target Market

**Go-to-market sequencing (updated June 2026 - see [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md)):**
1. **General presenter community (primary, first)** - conference speakers, corporate trainers, college instructors. Fewer IT/device restrictions than K-12, more likely to evangelize a slicker tool to peers (conferences are a built-in viral distribution channel).
2. **K-12 teachers (secondary, pulled in by demand)** - bottom-up teacher requests once there's traction, backed by an easy district-admin allowlisting path for Chrome extension installs (many districts lock down extension installs via Google Workspace for Education policy).

## 🔗 Links

- Domain: slides-live.com (connected to Firebase Hosting)
- Firebase: slideslive-prod
- Chrome Web Store: [TBD - not yet published]

## 🌐 Live

- **Site:** [slides-live.com](https://slides-live.com)
- Extension and web app are built and deployed; production Firebase security rules are live

See [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) for what's shipped and what's next.

---

**Status:** 🟢 MVP Live - working on freemium logic and launch prep
**Started:** April 2026
**Forked from:** interactive-presentations (MIND Education internal project)
