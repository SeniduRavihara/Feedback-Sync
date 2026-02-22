# Bug Fix: Infinite "Capturing..." Loading State

## Date

February 22, 2026

## Issue Description

The annotation system was stuck in an infinite "Capturing..." loading state when users clicked "Add Annotation". The button would never return to its normal state and the screenshot would never be captured.

## Root Causes

### 1. Stale Annotations Array

When `captureScreenshot()` was called after adding a new annotation, it was using the OLD annotations array from the previous render, before the new annotation was added to state.

**Problem Code:**

```typescript
setAnnotations((prev) => [...prev, newAnnotation]);
// ...
setTimeout(() => captureScreenshot(), 100);

// captureScreenshot() would use the old 'annotations' array
const captureScreenshot = () => {
  sendMessageToIframe({
    type: "CAPTURE_SCREENSHOT",
    annotations: annotations.map((a) => ({ id: a.id, x: a.x, y: a.y })),
    // ⚠️ This 'annotations' doesn't include newAnnotation yet!
  });
};
```

**Why it failed:**

- React state updates are asynchronous
- The `annotations` variable in `captureScreenshot()` closure captured the old state
- Widget received empty or incomplete annotations array
- Screenshot likely failed or wasn't sent back

### 2. Premature Auto-Save

After screenshot capture, the code automatically called `handleSaveFeedback()`, which could have timing or undefined function issues.

**Problem Code:**

```typescript
} else if (event.data.type === "SCREENSHOT_CAPTURED") {
  setScreenshotData(event.data.data);
  setIsCapturing(false);

  // Auto-save after screenshot is captured
  setTimeout(() => {
    handleSaveFeedback(); // Might fail or have issues
  }, 500);
}
```

### 3. Safety Timeout Closure Issue

The safety timeout was checking `if (isCapturing)` but due to closure, it was checking against the old value from when the timeout was created.

**Problem Code:**

```typescript
setTimeout(() => {
  if (isCapturing) {
    // This checks OLD value from closure
    setIsCapturing(false);
  }
}, 10000);
```

## Solutions Implemented

### Fix 1: Use Updated Annotations Directly

Instead of relying on state updates, capture the screenshot with the newly created annotations array immediately.

**Fixed Code:**

```typescript
const newAnnotation: Annotation = {
  ...annotationToAdd,
  number: annotations.length + 1,
  comment: annotationComment.trim(),
};

const updatedAnnotations = [...annotations, newAnnotation];
setAnnotations(updatedAnnotations);
setAnnotationComment("");
setCurrentAnnotation(null);

// Auto-capture screenshot with UPDATED annotations
setTimeout(() => {
  console.log(
    "🎬 Starting screenshot with annotations:",
    updatedAnnotations.length
  );
  setIsCapturing(true);
  sendMessageToIframe({
    type: "CAPTURE_SCREENSHOT",
    annotations: updatedAnnotations.map((a) => ({ id: a.id, x: a.x, y: a.y })),
    // ✅ Now using updatedAnnotations that includes the new one!
  });
}, 100);
```

### Fix 2: Remove Auto-Save

Removed the automatic save call to prevent premature or problematic saves. User can now manually save when ready.

**Fixed Code:**

```typescript
} else if (event.data.type === "SCREENSHOT_CAPTURED") {
  console.log('📸 Screenshot captured successfully');
  setScreenshotData(event.data.data);
  setIsCapturing(false);
  // Auto-save removed - user controls when to save
}
```

### Fix 3: Fix Safety Timeout

Removed the conditional check since it was checking stale closure value.

**Fixed Code:**

```typescript
setTimeout(() => {
  console.log("⚠️ Screenshot timeout - forcing reset");
  setIsCapturing(false); // Always reset, no condition needed
}, 10000);
```

## Testing Steps

1. Open preview with URL
2. Click on the webpage to create annotation point
3. Type feedback comment in the sidebar
4. Click "Add Annotation" button
5. ✅ Button should show "Capturing..." briefly
6. ✅ Screenshot should be captured
7. ✅ Button should return to "Add Annotation" state
8. ✅ Annotation should appear in the list

## Files Modified

- `/src/components/modern-preview-with-annotations.tsx`

## Related Issues

- Fixed in conjunction with previous issues:
  - Light theme → Dark theme redesign
  - Modal not appearing → Always-visible input panel
  - Multiple JSX syntax errors
  - searchParams Promise handling

## Status

✅ **RESOLVED** - Screenshot capture now works correctly with updated annotations array.
