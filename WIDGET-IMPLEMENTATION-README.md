# Embeddable Widget Implementation - Quick Start Guide

## 🎯 What We Built

A **hybrid annotation system** that combines:

- ✅ **Invisible widget** on client websites (dormant until activated)
- ✅ **Dashboard preview** with full annotation controls
- ✅ **Perfect screenshots** (no CORS issues - same-origin in iframe)
- ✅ **postMessage communication** between iframe and dashboard

---

## 📁 Files Created

### 1. **Widget Script** (`public/widget.js`)

The embeddable script clients add to their websites.

- Completely invisible on live sites
- Only activates inside your dashboard's preview iframe
- Handles annotation overlay and screenshot capture

### 2. **Preview Component** (`src/components/preview-with-annotations.tsx`)

The dashboard interface for managing annotations.

- Left sidebar with controls
- Iframe preview on the right
- Annotation list and screenshot preview

### 3. **API Endpoint** (`src/app/api/feedback/save/route.ts`)

Saves feedback with screenshots to Firebase.

- Validates data
- Stores in Firestore
- Returns feedback ID

### 4. **Preview Page** (`src/app/preview-feedback/page.tsx`)

The page that uses the preview component.

- Accepts URL and project ID as params
- Handles saving feedback

### 5. **Test Website** (`public/test-website.html`)

Sample HTML page for testing.

- Demonstrates widget integration
- Various sections to annotate

---

## 🚀 How to Use

### Step 1: Run Your Development Server

```bash
npm run dev
```

Your app runs at: `http://localhost:3000`

### Step 2: Test the Widget

1. **Open the test website** in a new tab:

   ```
   http://localhost:3000/test-website.html
   ```

2. **Open the preview page** in another tab:

   ```
   http://localhost:3000/preview-feedback?url=http://localhost:3000/test-website.html&projectId=test-project
   ```

3. **Try the annotation flow:**
   - Wait for "Widget Active" green indicator
   - Click "Start Annotating"
   - Click anywhere on the preview
   - Add comments to annotations
   - Click "Capture Screenshot"
   - Click "Save Feedback"

### Step 3: Check Firebase

Go to your Firebase console → Firestore → `feedback` collection
You should see a new document with:

- `annotations[]` - Array of annotation data
- `screenshot` - Base64 encoded image
- `pageUrl` - The URL that was annotated
- `projectId` - "test-project"
- `metadata` - Viewport info, timestamp

---

## 🔌 Client Integration

### For Clients to Add to Their Website:

```html
<!-- Add before closing </body> tag -->
<script
  src="https://feedback-sync.vercel.app/widget.js"
  data-project-id="YOUR_PROJECT_ID"
></script>
```

**Important Notes:**

- Widget is **completely invisible** on their live website
- **Zero performance impact** (does nothing until activated)
- **No customer sees anything** (only activates in your preview)
- Works on any website (WordPress, React, static HTML, etc.)

---

## 🎮 How It Works

### Architecture Flow:

```
┌─────────────────────────────────────────────────────┐
│ 1. Client's Website (live)                         │
│    - Has widget script embedded                     │
│    - Widget is DORMANT (invisible)                  │
│    - No UI elements shown                           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ 2. Your Dashboard (preview-feedback page)          │
│    - Loads client's website in IFRAME              │
│    - Widget detects it's in iframe                  │
│    - Widget sends "READY" message                   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ 3. Click "Start Annotating"                        │
│    - Dashboard sends ACTIVATE_ANNOTATION_MODE       │
│    - Widget shows clickable overlay                 │
│    - User clicks to add annotations                 │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ 4. Click "Capture Screenshot"                      │
│    - Dashboard sends CAPTURE_SCREENSHOT             │
│    - Widget loads html2canvas dynamically           │
│    - Captures screenshot (NO CORS ISSUES!)          │
│    - Sends base64 image back to dashboard           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ 5. Click "Save Feedback"                           │
│    - Dashboard posts to /api/feedback/save          │
│    - Saves to Firebase with all data                │
│    - Shows success message                          │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### 1. **Origin Checking**

The widget only activates when inside an iframe (not on live site).

### 2. **postMessage Communication**

All communication between iframe and dashboard uses postMessage API.

### 3. **CORS Headers**

API endpoint allows requests from any origin (for future flexibility).

### 4. **Data Validation**

API validates all required fields before saving.

---

## 🎨 Customization

### Change Widget Button Position

In `widget.js`, modify the annotation overlay styles:

```javascript
annotationOverlay.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2147483647;
  cursor: crosshair;
  background: rgba(0, 0, 0, 0.1); // Change transparency here
`;
```

### Change Annotation Marker Color

In `widget.js`, find the marker creation:

```javascript
marker.style.cssText = `
  ...
  background: #FF6B6B; // Change to any color
  border: 3px solid white;
  ...
`;
```

### Change Screenshot Quality

In `widget.js`, find the canvas conversion:

```javascript
const screenshot = canvas.toDataURL("image/jpeg", 0.85); // 0.85 = 85% quality
```

---

## 🐛 Troubleshooting

### Widget Not Activating?

**Check 1:** Is the iframe loaded?

```javascript
// In browser console on preview page
console.log(document.querySelector("iframe"));
```

**Check 2:** Is the widget script loaded in iframe?

```javascript
// In browser console
document.querySelector("iframe").contentWindow.console.log("test");
```

**Check 3:** Check browser console for errors

- Look for CORS errors
- Check postMessage communication

### Screenshot Not Capturing?

**Issue:** html2canvas library not loading

**Solution:** Check internet connection (script loads from CDN)

**Issue:** Screenshot is blank/black

**Solution:** This shouldn't happen with embedded script approach!
The script runs inside the iframe (same-origin), so no CORS issues.

### Annotations Not Showing?

**Check:** Are you clicking inside the iframe when annotation mode is active?

**Debug:** Open browser DevTools and watch for `ANNOTATION_ADDED` messages.

---

## 📊 Data Structure

### Firestore Document Schema:

```javascript
{
  projectId: "test-project",
  pageUrl: "http://localhost:3000/test-website.html",
  annotations: [
    {
      id: 1708612345678,
      x: 45.5,  // Percentage from left
      y: 32.1,  // Percentage from top
      number: 1,
      comment: "Button is misaligned"
    },
    {
      id: 1708612456789,
      x: 78.3,
      y: 15.8,
      number: 2,
      comment: "Text color too light"
    }
  ],
  screenshot: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  metadata: {
    viewport: {
      width: 1920,
      height: 1080,
      scrollX: 0,
      scrollY: 120
    },
    timestamp: "2026-02-22T14:30:00.000Z",
    userAgent: "Mozilla/5.0 ..."
  },
  status: "new",
  createdAt: Timestamp
}
```

---

## 🚢 Deployment Checklist

### Before Going Live:

- [ ] Update widget.js URL in test-website.html to production URL
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Update widget.js in `public/` to use production domain
- [ ] Test on production URL
- [ ] Provide clients with embed code
- [ ] Set up Firebase security rules
- [ ] Configure CORS if needed

### Widget Embed Code for Clients:

```html
<script
  src="https://YOUR-DOMAIN.vercel.app/widget.js"
  data-project-id="CLIENT_PROJECT_ID"
></script>
```

---

## 🎯 Next Steps

### Integrate with Dashboard

Update your existing dashboard to use the preview:

```typescript
// In dashboard/page.tsx
import PreviewWithAnnotations from "@/components/preview-with-annotations";

// Add button to open preview
<Button
  onClick={() => {
    const url = `/preview-feedback?url=${project.websiteUrl}&projectId=${project.id}`;
    window.open(url, "_blank");
  }}
>
  Preview & Annotate
</Button>;
```

### Display Saved Feedback

Query Firestore for feedback with screenshots:

```typescript
const feedbackQuery = query(
  collection(db, "feedback"),
  where("projectId", "==", selectedProject.id)
);

const snapshot = await getDocs(feedbackQuery);
snapshot.forEach((doc) => {
  const data = doc.data();
  console.log("Screenshot:", data.screenshot);
  console.log("Annotations:", data.annotations);
});
```

---

## 📚 Additional Resources

- **postMessage API:** https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- **html2canvas:** https://html2canvas.hertzen.com/
- **Firebase Firestore:** https://firebase.google.com/docs/firestore

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Test website loads normally (widget invisible)
2. ✅ Preview page shows "Widget Active" green dot
3. ✅ Clicking in iframe creates numbered markers
4. ✅ Screenshot captures correctly (no black/blank)
5. ✅ Annotations have correct positions
6. ✅ Data saves to Firebase
7. ✅ Can reload and see saved feedback

---

## 🎉 You're Done!

You now have a fully functional embeddable annotation system that:

- ✅ Works on any client website
- ✅ Is invisible to end users
- ✅ Captures perfect screenshots
- ✅ Saves detailed feedback
- ✅ Has no CORS issues

**Happy annotating! 🚀**
