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

- K-12 teachers (primary)
- College instructors
- Corporate trainers
- Conference presenters

## 🔗 Links

- Domain: slides-live.com (or slideslive.io)
- Firebase: [TBD - create project]
- Chrome Web Store: [TBD - publish extension]

---

**Status:** 🏗️ In Development
**Started:** April 2026
**Forked from:** interactive-presentations (MIND Education internal project)
