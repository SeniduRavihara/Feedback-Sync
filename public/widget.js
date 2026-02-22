/**
 * Feedback-Sync Embeddable Widget
 *
 * This script is invisible on the client's live website.
 * It only activates when loaded inside the Feedback-Sync dashboard preview iframe.
 *
 * Usage: Add to client's website:
 * <script src="https://feedback-sync.vercel.app/widget.js" data-project-id="YOUR_PROJECT_ID"></script>
 */

(function () {
  "use strict";

  // Get project ID from script tag
  const scriptTag =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"]');

  const projectId = scriptTag?.getAttribute("data-project-id");

  if (!projectId) {
    console.warn("Feedback Widget: No data-project-id attribute found");
    return;
  }

  // Check if we're running inside the Feedback-Sync preview iframe
  const isInPreviewIframe =
    window.parent !== window && window.location !== window.parent.location;

  // On live website: Do nothing (completely invisible)
  if (!isInPreviewIframe) {
    return;
  }

  // Only proceed if inside preview iframe
  console.log("Feedback Widget: Activated in preview mode");

  // State
  let annotationOverlay = null;
  let annotations = [];
  let annotationMode = false;

  // Notify parent dashboard that widget is ready
  function notifyReady() {
    try {
      window.parent.postMessage(
        {
          type: "FEEDBACK_WIDGET_READY",
          projectId: projectId,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
        "*"
      );
    } catch (e) {
      console.error("Failed to notify parent:", e);
    }
  }

  // Activate annotation mode - show clickable overlay
  function activateAnnotationMode() {
    if (annotationOverlay) return; // Already active

    annotationMode = true;

    // Create overlay
    annotationOverlay = document.createElement("div");
    annotationOverlay.id = "feedback-annotation-overlay";
    annotationOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
      cursor: crosshair;
      background: rgba(0, 0, 0, 0.1);
    `;

    // Handle clicks on overlay
    annotationOverlay.addEventListener("click", handleAnnotationClick);

    document.body.appendChild(annotationOverlay);

    // Notify parent
    window.parent.postMessage(
      {
        type: "ANNOTATION_MODE_ACTIVATED",
      },
      "*"
    );
  }

  // Deactivate annotation mode
  function deactivateAnnotationMode() {
    if (annotationOverlay) {
      annotationOverlay.remove();
      annotationOverlay = null;
    }
    annotationMode = false;

    window.parent.postMessage(
      {
        type: "ANNOTATION_MODE_DEACTIVATED",
      },
      "*"
    );
  }

  // Handle annotation click
  function handleAnnotationClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const rect = document.documentElement.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Calculate percentage position relative to entire document
    const x =
      ((event.clientX + scrollX) / document.documentElement.scrollWidth) * 100;
    const y =
      ((event.clientY + scrollY) / document.documentElement.scrollHeight) * 100;

    // Create visual marker
    const marker = document.createElement("div");
    marker.className = "feedback-annotation-marker";
    marker.style.cssText = `
      position: absolute;
      left: ${event.clientX + scrollX}px;
      top: ${event.clientY + scrollY}px;
      width: 30px;
      height: 30px;
      margin-left: -15px;
      margin-top: -15px;
      background: #FF6B6B;
      border: 3px solid white;
      border-radius: 50%;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      z-index: 2147483646;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    marker.textContent = annotations.length + 1;
    document.body.appendChild(marker);

    annotations.push({
      id: Date.now(),
      x: x,
      y: y,
      marker: marker,
    });

    // Send annotation to parent
    window.parent.postMessage(
      {
        type: "ANNOTATION_ADDED",
        data: {
          id: Date.now(),
          x: x,
          y: y,
          absoluteX: event.clientX + scrollX,
          absoluteY: event.clientY + scrollY,
          number: annotations.length,
        },
      },
      "*"
    );
  }

  // Clear all annotations
  function clearAnnotations() {
    annotations.forEach((ann) => {
      if (ann.marker) {
        ann.marker.remove();
      }
    });
    annotations = [];

    window.parent.postMessage(
      {
        type: "ANNOTATIONS_CLEARED",
      },
      "*"
    );
  }

  // Capture screenshot with html2canvas
  function captureScreenshot() {
    console.log("Widget: Capture screenshot called, html2canvas typeof:", typeof html2canvas);
    // Check if html2canvas is already loaded
    if (typeof html2canvas !== "undefined") {
      performCapture();
    } else {
      console.log("Widget: Dynamically loading html2canvas script...");
      // Load html2canvas dynamically
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.onload = () => {
        console.log("Widget: html2canvas loaded successfully");
        performCapture();
      };
      script.onerror = () => {
        console.error("Widget: html2canvas failed to load from CDN");
        window.parent.postMessage(
          {
            type: "SCREENSHOT_ERROR",
            error: "Failed to load html2canvas library",
          },
          "*"
        );
      };
      document.head.appendChild(script);
    }
  }

  function performCapture() {
    // Temporarily hide annotation overlay and markers for clean screenshot
    const overlay = annotationOverlay;
    const markers = Array.from(
      document.querySelectorAll(".feedback-annotation-marker")
    );

    if (overlay) overlay.style.display = "none";
    markers.forEach((m) => (m.style.display = "none"));

    // Suppress console.warn for html2canvas color issues
    const originalWarn = console.warn;
    console.warn = function () {};

    console.log("Widget: Calling html2canvas...");
    html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      logging: true, // Enable logging temporarily to see where it fails
      scale: window.devicePixelRatio || 1, // Better quality
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      x: window.pageXOffset,
      y: window.pageYOffset,
      width: window.innerWidth,
      height: window.innerHeight,
      foreignObjectRendering: false, // Can cause issues on some browsers
      imageTimeout: 15000, // Important: Don't hang forever waiting for broken images
      removeContainer: true,
      ignoreElements: (element) => {
        // Ignore video elements or specific complex iframes that might stall capture
        if (element.tagName === 'IFRAME' || element.tagName === 'VIDEO') {
           return true;
        }
        return false;
      }
    })
      .then((canvas) => {
        console.log("Widget: html2canvas resolved successfully");
        // Restore console.warn
        console.warn = originalWarn;

        // Show overlay and markers again
        if (overlay) overlay.style.display = "block";
        markers.forEach((m) => (m.style.display = "flex"));

        const screenshot = canvas.toDataURL("image/jpeg", 0.85);

        // Send screenshot to parent with metadata
        window.parent.postMessage(
          {
            type: "SCREENSHOT_CAPTURED",
            data: {
              screenshot: screenshot,
              url: window.location.href,
              timestamp: new Date().toISOString(),
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: window.pageXOffset,
                scrollY: window.pageYOffset,
              },
              annotations: annotations.map((a) => ({
                id: a.id,
                x: a.x,
                y: a.y,
              })),
            },
          },
          "*"
        );
      })
      .catch((error) => {
        // Restore console.warn
        console.warn = originalWarn;

        // Show overlay and markers again
        if (overlay) overlay.style.display = "block";
        markers.forEach((m) => (m.style.display = "flex"));

        window.parent.postMessage(
          {
            type: "SCREENSHOT_ERROR",
            error: error.message,
          },
          "*"
        );
      });
  }

  // Listen for messages from parent dashboard
  window.addEventListener("message", function (event) {
    // Accept messages from parent window
    if (event.source !== window.parent) return;

    const message = event.data;

    switch (message.type) {
      case "ACTIVATE_ANNOTATION_MODE":
        activateAnnotationMode();
        break;

      case "DEACTIVATE_ANNOTATION_MODE":
        deactivateAnnotationMode();
        break;

      case "CLEAR_ANNOTATIONS":
        clearAnnotations();
        break;

      case "CAPTURE_SCREENSHOT":
        captureScreenshot();
        break;

      case "PING":
        window.parent.postMessage(
          {
            type: "PONG",
            projectId: projectId,
          },
          "*"
        );
        break;
    }
  });

  // Notify parent when ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", notifyReady);
  } else {
    notifyReady();
  }

  console.log("Feedback Widget: Initialized with project ID:", projectId);
})();
