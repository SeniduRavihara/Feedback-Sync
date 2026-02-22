# 🎯 Feedback-Sync

A powerful visual feedback and annotation tool for websites. Allows clients to click directly on website elements to report issues and suggest improvements with automatic screenshot capture.

## ✨ Features

- **📍 Visual Annotations**: Click anywhere on a website to add feedback markers
- **📸 Automatic Screenshots**: Captures screenshots with annotations for context
- **🎨 Embeddable Widget**: Single script tag integration for client websites
- **🔒 Invisible on Live Sites**: Widget only activates in preview mode
- **💾 Firebase Storage**: Saves all feedback with screenshots to Firestore
- **🎯 Percentage Positioning**: Annotations adapt to different screen sizes
- **🚀 Zero Performance Impact**: Lightweight script (< 5KB gzipped)

---

## 🚀 Quick Start

### Installation

```bash
npm install
# or
yarn install
```

### Environment Setup

Create `.env.local` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build for Production

```bash
npm run build
npm start
```

---

## 📖 How It Works

### 1. **Client Integration** (1 Minute Setup)

Clients add one line to their website:

```html
<script
  src="https://feedback-sync-bice.vercel.app/api/widget"
  data-project-id="client-123"
></script>
```

- Widget loads silently
- **Completely invisible** on live website
- Zero UI interference

### 2. **Dashboard Preview** (Admin Side)

1. Enter client website URL in dashboard
2. Website loads in iframe with widget activated
3. Click anywhere to add annotations
4. Capture screenshot with all annotations
5. Save feedback to Firebase

### 3. **Data Storage**

Feedback saved to Firestore:

```javascript
{
  projectId: "client-123",
  pageUrl: "https://client-site.com/pricing",
  annotations: [
    { x: 45.2, y: 30.5, comment: "Button color too dark" }
  ],
  screenshot: "data:image/jpeg;base64,...",
  viewport: { width: 1920, height: 1080 },
  timestamp: "2026-02-22T10:30:00Z"
}
```

---

## 🏗️ Project Structure

```
feedback-sync/
├── public/
│   ├── widget.js              # Embeddable widget script
│   └── test-website.html      # Test HTML page
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── widget/        # Widget API endpoint (CORS enabled)
│   │   │   ├── feedback/      # Feedback storage API
│   │   │   └── transcribe/    # Audio transcription
│   │   ├── preview-feedback/  # Preview page with annotations
│   │   └── dashboard/         # Main dashboard
│   ├── components/
│   │   ├── preview-with-annotations.tsx  # Main preview component
│   │   ├── audio-recorder.tsx
│   │   └── repo-selector.tsx
│   └── lib/
│       ├── firebase.ts        # Firebase config
│       └── gemini.ts          # AI integration
├── CLIENT-INTEGRATION-GUIDE.md  # Client setup instructions
└── WIDGET-IMPLEMENTATION-README.md  # Technical docs
```

---

## 🎯 Usage

### Testing Locally

1. **Start Dev Server:**

   ```bash
   npm run dev
   ```

2. **Open Test Page:**

   - Navigate to: `http://localhost:3000/test-website.html`
   - Widget script is already embedded

3. **Open Preview Dashboard:**
   - Go to: `http://localhost:3000/preview-feedback?url=http://localhost:3000/test-website.html&projectId=test-project`
   - Click "Start Annotating"
   - Click anywhere to add annotations
   - Capture screenshot
   - Save feedback

### Adding to Client Websites

See [CLIENT-INTEGRATION-GUIDE.md](./CLIENT-INTEGRATION-GUIDE.md) for detailed instructions.

---

## 🌐 Deploy on Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Deploy feedback-sync"
git push origin main
```

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Import your GitHub repository
2. Add environment variables (Firebase config)
3. Deploy

### 3. Your Production URL

✅ **Deployed at:** https://feedback-sync-bice.vercel.app

Client script tag:

```html
<script
  src="https://feedback-sync-bice.vercel.app/api/widget"
  data-project-id="client-123"
></script>
```

---

## 🔧 API Endpoints

### `GET /api/widget`

- Serves embeddable widget script
- CORS enabled for cross-domain loading
- Cached for 1 hour

### `POST /api/feedback/save`

- Saves feedback with annotations and screenshots
- Required body: `{ projectId, pageUrl, annotations, screenshot, viewport }`
- Returns: `{ success: true, feedbackId }`

### `POST /api/transcribe`

- Transcribes audio feedback to text
- Uses Google Gemini AI

---

## 📚 Documentation

- **[CLIENT-INTEGRATION-GUIDE.md](./CLIENT-INTEGRATION-GUIDE.md)** - For your clients
- **[WIDGET-IMPLEMENTATION-README.md](./WIDGET-IMPLEMENTATION-README.md)** - Technical details
- **[EMBEDDABLE-WIDGET-GUIDE.md](./EMBEDDABLE-WIDGET-GUIDE.md)** - Architecture overview

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **UI**: React 19.2.3, Tailwind CSS
- **Database**: Firebase/Firestore
- **Screenshot**: html2canvas
- **AI**: Google Gemini
- **Deployment**: Vercel
- **Communication**: postMessage API

---

## 🔒 Security

- Widget only activates in iframe context (dashboard preview)
- CORS headers configured for safe cross-domain loading
- No tracking or data collection on live client websites
- Firebase security rules protect data access

---

## 📝 License

MIT

---

## 🤝 Support

For questions or issues:

- Create an issue on GitHub
- Email: support@your-domain.com

---

**Built with ❤️ for seamless visual feedback**
