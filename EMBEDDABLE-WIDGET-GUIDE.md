# Embeddable Feedback Widget - Complete Implementation Guide

## 📚 Table of Contents

1. [What is an Embeddable Widget?](#what-is-an-embeddable-widget)
2. [How It Works](#how-it-works)
3. [Real-World Examples](#real-world-examples)
4. [Architecture Overview](#architecture-overview)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [Security Considerations](#security-considerations)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Guide](#deployment-guide)

---

## What is an Embeddable Widget?

An **embeddable widget** is a piece of JavaScript code that your clients can add to their websites with just a single `<script>` tag. Once added, it automatically injects your feedback collection interface into their website.

### Think of it like:

- **Google Analytics** - Tracks user behavior
- **Hotjar** - Records heatmaps and session recordings
- **Intercom** - Chat widget that appears on every page
- **UserSnap** - Visual feedback and bug reporting

### Your Use Case:

Instead of clients opening a separate dashboard to give feedback, they can:

1. Add your script to their website
2. Click a feedback button that appears automatically
3. Click anywhere on their own page to add annotations
4. Submit feedback with screenshots directly to your system

---

## How It Works

### Traditional Approach (What You Had Before):

```
Client's Website → Opens your dashboard → Views iframe preview → Annotations don't sync
                                          ❌ Scroll issues
                                          ❌ Screen size differences
                                          ❌ Cross-origin problems
```

### Embeddable Widget Approach (Recommended):

```
Client's Website + Your Script → Feedback button appears → Click to annotate → Direct screenshot → Sent to your Firebase
                                 ✅ No scroll issues
                                 ✅ Perfect positioning
                                 ✅ Same-origin (can capture everything)
```

---

## Real-World Examples

### 1. Google Analytics

```html
<!-- Client adds this to their website -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXX"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "G-XXXXXXXXX");
</script>
```

**What it does:** Tracks page views, user behavior, conversions - all automatically.

### 2. Hotjar

```html
<script>
  (function (h, o, t, j, a, r) {
    h.hj =
      h.hj ||
      function () {
        (h.hj.q = h.hj.q || []).push(arguments);
      };
    h._hjSettings = { hjid: YOUR_ID, hjsv: 6 };
    // ... loads widget
  })(window, document, "https://static.hotjar.com/c/hotjar-", ".js?sv=");
</script>
```

**What it does:** Captures heatmaps, session recordings, and feedback polls.

### 3. Intercom (Chat Widget)

```html
<script>
  window.intercomSettings = {app_id: "YOUR_APP_ID"};
  (function(){var w=window;var ic=w.Intercom;...})();
</script>
```

**What it does:** Chat bubble appears on bottom-right, customers can message support.

### 4. Your Feedback Widget (What We'll Build)

```html
<!-- Client adds this to their website -->
<script
  src="https://feedback-sync.vercel.app/widget.js"
  data-project-id="hotel-booking"
></script>
```

**What it will do:**

- Floating feedback button appears
- Click to enter annotation mode
- Click on page to mark issues
- Automatically captures screenshot
- Sends to your Firebase with page URL

---

## Architecture Overview

### File Structure

```
feedback-sync/
├── public/
│   └── widget.js              # The embeddable script clients use
├── src/
│   ├── components/
│   │   └── EmbeddableWidget/  # Widget components
│   │       ├── WidgetButton.tsx
│   │       ├── AnnotationOverlay.tsx
│   │       └── FeedbackForm.tsx
│   ├── app/
│   │   └── api/
│   │       └── feedback/
│   │           └── route.ts   # API to receive feedback
│   └── lib/
│       └── widget-builder.ts  # Build widget.js bundle
└── EMBEDDABLE-WIDGET-GUIDE.md # This file
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT'S WEBSITE (e.g., hotel-booking.com)                      │
│                                                                  │
│  1. Page loads with your script tag:                            │
│     <script src="your-domain.com/widget.js" data-project-id=""> │
│                                                                  │
│  2. Widget initializes:                                          │
│     - Creates floating feedback button                           │
│     - Listens for click events                                   │
│                                                                  │
│  3. User clicks feedback button:                                 │
│     - Annotation overlay appears                                 │
│     - User clicks on page element to mark issue                  │
│                                                                  │
│  4. User submits feedback:                                       │
│     - Captures screenshot with html2canvas                       │
│     - Collects metadata (URL, position, browser info)            │
│                                                                  │
│  5. Sends to your API:                                           │
│     - POST to https://feedback-sync.vercel.app/api/feedback      │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ YOUR BACKEND (feedback-sync.vercel.app)                         │
│                                                                  │
│  6. API receives feedback:                                       │
│     - Validates project-id                                       │
│     - Stores in Firebase/Firestore                               │
│                                                                  │
│  7. Dashboard displays:                                          │
│     - Screenshot with annotation markers                         │
│     - Feedback text                                              │
│     - Page URL, timestamp                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Phase 1: Build the Widget Button Component

**File:** `src/components/EmbeddableWidget/WidgetButton.tsx`

```typescript
"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";

interface WidgetButtonProps {
  onActivate: () => void;
}

export default function WidgetButton({ onActivate }: WidgetButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onActivate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        backgroundColor: "#FF6B6B",
        border: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        transition: "all 0.3s ease",
        transform: isHovered ? "scale(1.1)" : "scale(1)",
      }}
      title="Give Feedback"
    >
      <MessageSquare color="white" size={24} />
    </button>
  );
}
```

**Why this works:**

- `position: fixed` - Stays in same place when scrolling
- `zIndex: 9999` - Appears above client's content
- `bottom/right: 20px` - Classic position like chat widgets

---

### Phase 2: Build the Annotation Overlay

**File:** `src/components/EmbeddableWidget/AnnotationOverlay.tsx`

```typescript
"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { X } from "lucide-react";

interface Annotation {
  id: number;
  x: number; // Percentage
  y: number; // Percentage
  comment: string;
}

interface AnnotationOverlayProps {
  onClose: () => void;
  projectId: string;
}

export default function AnnotationOverlay({
  onClose,
  projectId,
}: AnnotationOverlayProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePageClick = (e: React.MouseEvent) => {
    // Calculate percentage position
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;

    const comment = prompt("What's the issue here?");
    if (comment) {
      setAnnotations([
        ...annotations,
        {
          id: Date.now(),
          x,
          y,
          comment,
        },
      ]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Capture screenshot
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const screenshot = canvas.toDataURL("image/jpeg", 0.85);

      // Send to your API
      await fetch("https://feedback-sync.vercel.app/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          pageUrl: window.location.href,
          annotations,
          screenshot,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      alert("Feedback submitted successfully!");
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handlePageClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        zIndex: 9998,
        cursor: "crosshair",
      }}
    >
      {/* Annotation Markers */}
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          style={{
            position: "absolute",
            left: `${annotation.x}%`,
            top: `${annotation.y}%`,
            transform: "translate(-50%, -50%)",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "#FF6B6B",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "bold",
            border: "3px solid white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {annotations.indexOf(annotation) + 1}
        </div>
      ))}

      {/* Control Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 10000,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ margin: "0 0 10px 0" }}>Annotation Mode</h3>
        <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#666" }}>
          Click anywhere to add feedback
        </p>

        <div style={{ marginBottom: "10px" }}>
          <strong>{annotations.length}</strong> annotation(s) added
        </div>

        <button
          onClick={handleSubmit}
          disabled={annotations.length === 0 || isSubmitting}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: annotations.length === 0 ? "#ccc" : "#FF6B6B",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: annotations.length === 0 ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}
```

**Why percentage positioning:**

- Works across different screen sizes
- Admin viewing on different monitor sees correct positions
- Responsive by design

---

### Phase 3: Create the Main Widget Container

**File:** `src/components/EmbeddableWidget/WidgetContainer.tsx`

```typescript
"use client";

import { useState } from "react";
import WidgetButton from "./WidgetButton";
import AnnotationOverlay from "./AnnotationOverlay";

interface WidgetContainerProps {
  projectId: string;
}

export default function WidgetContainer({ projectId }: WidgetContainerProps) {
  const [isActive, setIsActive] = useState(false);

  if (!projectId) {
    console.error("Feedback Widget: No project ID provided");
    return null;
  }

  return (
    <>
      <WidgetButton onActivate={() => setIsActive(true)} />

      {isActive && (
        <AnnotationOverlay
          projectId={projectId}
          onClose={() => setIsActive(false)}
        />
      )}
    </>
  );
}
```

---

### Phase 4: Build the Embeddable Script

**File:** `public/widget.js`

This is the file clients will load on their websites.

```javascript
(function () {
  "use strict";

  // Get project ID from script tag
  const scriptTag =
    document.currentScript || document.querySelector("script[data-project-id]");

  const projectId = scriptTag?.getAttribute("data-project-id");

  if (!projectId) {
    console.error("Feedback Widget: No data-project-id attribute found");
    return;
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }

  function initWidget() {
    // Create container for React app
    const container = document.createElement("div");
    container.id = "feedback-widget-root";
    document.body.appendChild(container);

    // Load React and your widget bundle
    loadScript("https://unpkg.com/react@18/umd/react.production.min.js", () => {
      loadScript(
        "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
        () => {
          loadScript(
            "https://feedback-sync.vercel.app/widget-bundle.js",
            () => {
              // Your widget bundle will render into #feedback-widget-root
              window.FeedbackWidget.init(container, { projectId });
            }
          );
        }
      );
    });
  }

  function loadScript(src, callback) {
    const script = document.createElement("script");
    script.src = src;
    script.onload = callback;
    script.onerror = () => console.error(`Failed to load: ${src}`);
    document.head.appendChild(script);
  }
})();
```

**How it works:**

1. Runs immediately in an IIFE (Immediately Invoked Function Expression)
2. Gets `data-project-id` from the script tag
3. Waits for page to load
4. Creates a container div
5. Loads React libraries
6. Loads your widget bundle
7. Initializes widget with project ID

---

### Phase 5: Create the API Endpoint

**File:** `src/app/api/feedback/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      projectId,
      pageUrl,
      annotations,
      screenshot,
      userAgent,
      timestamp,
    } = body;

    // Validate required fields
    if (!projectId || !pageUrl || !annotations || !screenshot) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Store in Firestore
    const feedbackRef = collection(db, "feedback");
    await addDoc(feedbackRef, {
      projectId,
      pageUrl,
      annotations,
      screenshot,
      userAgent,
      clientTimestamp: timestamp,
      serverTimestamp: serverTimestamp(),
      status: "new",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback API Error:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}

// Enable CORS for widget to work on any domain
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
```

**CORS Explanation:**

- Your widget runs on `client-website.com`
- Makes request to `feedback-sync.vercel.app`
- Without CORS headers, browser blocks it
- `Access-Control-Allow-Origin: *` allows all domains

---

## Security Considerations

### 1. Content Security Policy (CSP)

Some client websites have strict CSP that blocks external scripts.

**Problem:**

```
Refused to load the script 'https://feedback-sync.vercel.app/widget.js'
because it violates the following Content Security Policy directive:
"script-src 'self'"
```

**Solution - Provide CSP Instructions:**

```html
<!-- Client needs to update their CSP -->
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'self' https://feedback-sync.vercel.app;"
/>
```

Or in HTTP headers:

```
Content-Security-Policy: script-src 'self' https://feedback-sync.vercel.app;
```

### 2. Rate Limiting

Prevent abuse by limiting feedback submissions.

**Implementation:**

```typescript
// In your API route
const submissionsPerIP = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  // Get recent submissions from this IP
  const recent = (submissionsPerIP.get(ip) || []).filter(
    (time) => now - time < 60000
  ); // Last minute

  if (recent.length >= 5) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Track this submission
  submissionsPerIP.set(ip, [...recent, now]);

  // ... rest of your code
}
```

### 3. Data Sanitization

Prevent XSS attacks in feedback comments.

```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .slice(0, 500); // Limit length
}

// Use it:
const sanitizedComment = sanitizeInput(annotation.comment);
```

### 4. Project ID Validation

Ensure only authorized projects can submit feedback.

```typescript
const ALLOWED_PROJECTS = ["hotel-booking", "e-commerce-site", "portfolio"];

if (!ALLOWED_PROJECTS.includes(projectId)) {
  return NextResponse.json({ error: "Invalid project ID" }, { status: 403 });
}
```

---

## Testing Strategy

### 1. Local Testing

Create a simple HTML file to test your widget:

**File:** `test/widget-test.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Widget Test Page</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 40px;
        line-height: 1.6;
      }
      .section {
        margin: 40px 0;
        padding: 20px;
        background: #f5f5f5;
        border-radius: 8px;
      }
    </style>
  </head>
  <body>
    <h1>Test Page for Feedback Widget</h1>

    <div class="section">
      <h2>Section 1</h2>
      <p>
        This is a test section. Try clicking the feedback button and annotating
        this area.
      </p>
      <button>Test Button</button>
    </div>

    <div class="section">
      <h2>Section 2</h2>
      <p>
        Another section with different content. You should be able to annotate
        anywhere.
      </p>
      <img src="https://via.placeholder.com/300x200" alt="Test Image" />
    </div>

    <!-- Your Widget Script -->
    <script
      src="http://localhost:3000/widget.js"
      data-project-id="test-project"
    ></script>
  </body>
</html>
```

**Testing Steps:**

1. Run your Next.js app: `npm run dev`
2. Open `widget-test.html` in browser
3. Click feedback button
4. Add annotations
5. Check Firebase for saved data

### 2. Production Testing

```html
<!-- Use your deployed URL -->
<script
  src="https://feedback-sync.vercel.app/widget.js"
  data-project-id="production-test"
></script>
```

### 3. Cross-Browser Testing

Test on:

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### 4. CSP Testing

Test with strict CSP:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self';"
/>
<!-- Your widget should fail here - document this -->
```

---

## Deployment Guide

### Step 1: Build Widget Bundle

You need to create a standalone `widget.js` that doesn't require Next.js.

**Option A: Simple Approach (For Testing)**
Just serve your components as static files.

**Option B: Production Approach (Recommended)**
Use a bundler like webpack or esbuild.

**File:** `scripts/build-widget.js`

```javascript
const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/widget-entry.tsx"],
    bundle: true,
    minify: true,
    format: "iife",
    globalName: "FeedbackWidget",
    outfile: "public/widget-bundle.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external: ["react", "react-dom"], // Loaded separately
  })
  .catch(() => process.exit(1));
```

Add to `package.json`:

```json
{
  "scripts": {
    "build:widget": "node scripts/build-widget.js",
    "build": "npm run build:widget && next build"
  }
}
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Your widget will be available at:

```
https://feedback-sync.vercel.app/widget.js
```

### Step 3: CDN Optimization (Optional)

For better performance, use a CDN:

1. Upload `widget.js` to Cloudflare, AWS CloudFront, or similar
2. Enable gzip compression
3. Set cache headers:
   ```
   Cache-Control: public, max-age=3600
   ```

### Step 4: Version Management

Support multiple versions for backwards compatibility:

```
https://feedback-sync.vercel.app/widget.js         # Latest
https://feedback-sync.vercel.app/widget-v1.2.3.js  # Specific version
```

---

## How Clients Use Your Widget

### Integration Instructions (What You Give Clients)

````markdown
# Add Feedback Widget to Your Website

## Quick Start

Add this single line to your HTML, right before `</body>`:

```html
<script
  src="https://feedback-sync.vercel.app/widget.js"
  data-project-id="YOUR_PROJECT_ID"
></script>
```
````

Replace `YOUR_PROJECT_ID` with your project identifier (we'll provide this).

## Examples

### Static HTML Site

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Site</title>
  </head>
  <body>
    <!-- Your content -->

    <!-- Add widget before closing body tag -->
    <script
      src="https://feedback-sync.vercel.app/widget.js"
      data-project-id="hotel-booking"
    ></script>
  </body>
</html>
```

### React App (public/index.html)

```html
<body>
  <div id="root"></div>

  <!-- Add after React root -->
  <script
    src="https://feedback-sync.vercel.app/widget.js"
    data-project-id="react-app"
  ></script>
</body>
```

### WordPress

Add to your theme's `footer.php`:

```php
<script src="https://feedback-sync.vercel.app/widget.js"
        data-project-id="wordpress-site"></script>
<?php wp_footer(); ?>
```

## CSP Configuration (If Needed)

If your site has Content Security Policy, add:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'self' https://feedback-sync.vercel.app;"
/>
```

## Privacy & Performance

- Widget loads asynchronously (won't slow your site)
- Only activates when users click the feedback button
- Screenshots never include sensitive form data
- GDPR compliant (users actively choose to submit feedback)

## Support

Questions? Contact support@feedback-sync.com

```

---

## Comparison: Before vs After

### Before (Iframe Approach)

```

❌ Client opens separate dashboard URL
❌ Views iframe preview of their site
❌ Annotations don't match scroll position
❌ Different screen sizes cause misalignment
❌ Cross-origin security issues
❌ Screen Capture API requires permission
❌ Complex multi-step process

```

### After (Embeddable Widget)

```

✅ Client adds one script tag
✅ Widget appears automatically on their site
✅ Annotations perfectly positioned (same DOM)
✅ Works on any screen size (percentage-based)
✅ Same-origin (widget runs on their domain)
✅ html2canvas works without permissions
✅ Simple one-click process

````

---

## FAQ

### Q: Will the widget slow down client websites?
**A:** No. The widget:
- Loads asynchronously
- Only initializes when clicked
- Is minified and gzipped (~20KB)
- Doesn't run until user interaction

### Q: What if a client has multiple pages?
**A:** One script tag works site-wide. Add it to your template/layout, and it appears on every page automatically.

### Q: Can clients customize the widget appearance?
**A:** Yes! You can add data attributes:
```html
<script src="widget.js"
        data-project-id="abc"
        data-button-color="#FF6B6B"
        data-position="bottom-left"></script>
````

### Q: How do you handle different projects?

**A:** Each client gets a unique `project-id`. In your dashboard, filter feedback by project:

```typescript
const projectFeedback = feedbackList.filter(
  (f) => f.projectId === "hotel-booking"
);
```

### Q: What about mobile devices?

**A:** The widget is fully responsive:

- Touch events work like clicks
- Button sized for touch (60px)
- Overlay works on mobile browsers

### Q: Can clients remove the widget easily?

**A:** Yes, just remove the `<script>` tag. No other cleanup needed.

### Q: What data do you collect?

**A:** Only what users explicitly submit:

- Screenshot (when they submit feedback)
- Page URL (current page)
- Annotations (positions and comments)
- User agent (browser info)
- Timestamp

No tracking, no cookies, no passive data collection.

---

## Next Steps

1. **Build the Components** - Start with WidgetButton.tsx
2. **Create API Endpoint** - Set up `/api/feedback/route.ts`
3. **Build Widget Bundle** - Package for deployment
4. **Test Locally** - Use the test HTML file
5. **Deploy to Vercel** - Make it publicly available
6. **Give to First Client** - Start with your hotel-booking project
7. **Iterate Based on Feedback** - Improve based on real usage

---

## Resources

- [html2canvas Documentation](https://html2canvas.hertzen.com/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## Support

Need help? Check:

- GitHub Issues: `https://github.com/YOUR_USERNAME/feedback-sync/issues`
- Documentation: This file!
- Email: your-email@example.com

---

**Built with ❤️ for better feedback collection**
