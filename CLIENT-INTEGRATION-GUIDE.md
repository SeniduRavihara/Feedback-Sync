# 🚀 Feedback-Sync Client Integration Guide

## For Your Clients

This guide shows your clients how to integrate the Feedback-Sync widget into their website.

---

## Quick Start (1 Minute Setup)

### Step 1: Add the Script Tag

Add this **single line** to your website's HTML, just before the closing `</body>` tag:

```html
<script
  src="https://your-domain.vercel.app/api/widget"
  data-project-id="YOUR_PROJECT_ID"
></script>
```

**Replace:**

- `your-domain.vercel.app` with your actual Vercel domain
- `YOUR_PROJECT_ID` with the unique project ID you provide to the client

### Step 2: That's It! ✅

The widget is now installed. Here's what happens:

- **On Your Live Website:** Widget is **completely invisible** - no overlays, no buttons, no performance impact
- **In Feedback-Sync Dashboard:** Widget activates automatically when previewed, allowing annotations and screenshot capture

---

## Example Integration

### For WordPress:

1. Go to **Appearance → Theme File Editor**
2. Open `footer.php`
3. Add the script tag before `</body>`
4. Save changes

### For Static HTML Sites:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
  </head>
  <body>
    <!-- Your website content -->

    <!-- Feedback-Sync Widget - Add before closing body tag -->
    <script
      src="https://your-domain.vercel.app/api/widget"
      data-project-id="client-abc123"
    ></script>
  </body>
</html>
```

### For React/Next.js:

Add to your root layout or main component:

```jsx
// In your layout.tsx or _app.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <script
          src="https://your-domain.vercel.app/api/widget"
          data-project-id="client-abc123"
        />
      </body>
    </html>
  );
}
```

---

## How It Works

### 1. **Client's Perspective (Live Website)**

- Widget script loads silently
- **Nothing visible** to end users
- Zero UI interference
- Minimal performance impact (< 5KB)

### 2. **Your Perspective (Dashboard)**

- Open client's website URL in Feedback-Sync dashboard
- Widget automatically activates in preview mode
- Click anywhere to add annotations
- Capture screenshots with annotations
- Save feedback directly to your database

### 3. **Security & Privacy**

- Widget only activates when loaded in your dashboard's iframe
- No data collection on the live website
- CORS-enabled for cross-domain compatibility
- No cookies, no tracking on client's site

---

## Technical Details

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance

- Script size: ~5KB (gzipped)
- Load time: < 50ms
- No impact on website performance
- Lazy-loads screenshot library only when needed

### Security Headers

The widget is served with proper CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Cache-Control: public, max-age=3600
```

---

## Testing the Integration

### 1. Verify Script is Loaded

Open browser DevTools → Network tab → Look for `api/widget` request (should return 200 OK)

### 2. Test in Dashboard

1. Go to your Feedback-Sync dashboard
2. Navigate to Preview page
3. Enter client's website URL
4. Click "Start Annotating"
5. Click anywhere on the page to add annotations
6. Capture screenshot
7. Save feedback

### 3. Verify Live Site is Unaffected

Visit the client's live website → Should see **no visible changes**

---

## Troubleshooting

### Widget Not Activating in Dashboard?

**Check:**

- Script tag has correct `data-project-id`
- Website URL is correct in dashboard preview
- No browser console errors
- Client's website doesn't have X-Frame-Options blocking iframes

### Script Not Loading on Client Site?

**Check:**

- Script URL is correct (https://your-domain.vercel.app/api/widget)
- No Content Security Policy (CSP) blocking external scripts
- Browser DevTools → Network tab shows successful script load

### CORS Errors?

The API route handles CORS automatically. If issues persist:

- Verify `/api/widget/route.ts` exists
- Check Vercel deployment logs
- Ensure API route is deployed correctly

---

## Support

For technical support or questions, contact:

- Email: support@your-domain.com
- Documentation: https://your-domain.vercel.app/docs

---

## What to Provide Each Client

When onboarding a new client, send them:

1. **Script Tag** (with their unique project ID):

   ```html
   <script
     src="https://your-domain.vercel.app/api/widget"
     data-project-id="client-xyz789"
   ></script>
   ```

2. **Installation Instructions** (copy relevant section above based on their platform)

3. **Dashboard Access** (if they need to view feedback):
   - Dashboard URL: https://your-domain.vercel.app/dashboard
   - Their project ID: `client-xyz789`

---

## Advanced Configuration

### Custom Widget Behavior (Optional)

Clients can add custom configuration:

```html
<script
  src="https://your-domain.vercel.app/api/widget"
  data-project-id="client-123"
  data-environment="production"
></script>
```

This allows you to extend widget functionality in the future without requiring clients to update their integration.

---

**Last Updated:** February 2026  
**Version:** 1.0.0
