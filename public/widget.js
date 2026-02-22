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

  // Firebase Configuration - Client SDK
  const firebaseConfig = {
    apiKey: "AIzaSyBKd_AbCsMi8ohZZOl3Ht8e3F1MQAicJR0",
    authDomain: "project-handler-b9687.firebaseapp.com",
    projectId: "project-handler-b9687",
    storageBucket: "project-handler-b9687.firebasestorage.app",
    messagingSenderId: "124985382283",
    appId: "1:124985382283:web:7025201715eda152cbcb8e",
  };

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
  let capturePromptOverlay = null;
  let db = null;

  // Initialize Firebase
  function initFirebase() {
    if (!window.firebase) {
      console.log("📦 Loading Firebase SDK...");
      loadFirebaseSDK(() => {
        console.log("✅ Firebase SDK loaded");
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore(app);
        console.log("✅ Firestore initialized");
      });
    } else {
      const app = firebase.initializeApp(firebaseConfig);
      db = firebase.firestore(app);
    }
  }

  // Load Firebase SDK dynamically
  function loadFirebaseSDK(callback) {
    const script1 = document.createElement("script");
    script1.src =
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
    script1.onload = () => {
      const script2 = document.createElement("script");
      script2.src =
        "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js";
      script2.onload = callback;
      document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
  }

  // Initialize Firebase on load
  initFirebase();

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

  // Show a prompt to the user to capture the screen (required for browser security gesture)
  function showCapturePrompt() {
    if (capturePromptOverlay) return;

    capturePromptOverlay = document.createElement("div");
    capturePromptOverlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e1e;
      color: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      z-index: 2147483647;
      text-align: center;
      font-family: sans-serif;
      width: 320px;
    `;

    const title = document.createElement("h3");
    title.textContent = "Confirm Screenshot";
    title.style.margin = "0 0 12px 0";

    const desc = document.createElement("p");
    desc.textContent =
      "Click the button below and then select this tab to capture your feedback perfectly.";
    desc.style.fontSize = "14px";
    desc.style.color = "#aaa";
    desc.style.marginBottom = "20px";

    const btn = document.createElement("button");
    btn.textContent = "Take Screenshot Now";
    btn.style.cssText = `
      background: #FF6B6B;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      width: 100%;
      font-size: 16px;
    `;

    btn.onclick = function () {
      capturePromptOverlay.remove();
      capturePromptOverlay = null;
      captureScreenshot();
    };

    capturePromptOverlay.appendChild(title);
    capturePromptOverlay.appendChild(desc);
    capturePromptOverlay.appendChild(btn);
    document.body.appendChild(capturePromptOverlay);
  }

  // Capture screenshot using native browser Screen Capture API
  function captureScreenshot(requestedAnnotations) {
    // Hide overlay and markers for a clean screenshot
    const overlay = annotationOverlay;
    const markers = Array.from(
      document.querySelectorAll(".feedback-annotation-marker")
    );
    if (overlay) overlay.style.display = "none";
    markers.forEach(function (m) {
      m.style.display = "none";
    });

    // Use native browser Screen Capture API — works perfectly regardless of CSS or CORS
    navigator.mediaDevices
      .getDisplayMedia({ video: { mediaSource: "screen" }, audio: false })
      .then(function (stream) {
        var video = document.createElement("video");
        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = function () {
          var canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0);

          // Stop the stream immediately after capturing one frame
          stream.getTracks().forEach(function (t) {
            t.stop();
          });

          var screenshot = canvas.toDataURL("image/jpeg", 0.9);

          // Restore overlay and markers
          if (overlay) overlay.style.display = "block";
          markers.forEach(function (m) {
            m.style.display = "flex";
          });

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
                annotations: (requestedAnnotations || annotations).map(
                  function (a) {
                    return { id: a.id, x: a.x, y: a.y };
                  }
                ),
              },
            },
            "*"
          );
        };
      })
      .catch(function (error) {
        // User cancelled or browser denied permission
        // Restore overlay and markers
        if (overlay) overlay.style.display = "block";
        markers.forEach(function (m) {
          m.style.display = "flex";
        });

        window.parent.postMessage(
          {
            type: "SCREENSHOT_ERROR",
            error: error.message || "Screen capture was cancelled or denied.",
          },
          "*"
        );
      });
  }

  // Save feedback directly to Firestore
  function saveFeedbackToFirestore(feedbackData) {
    console.log("💾 Save request received", feedbackData);
    
    // Wait for Firebase to be ready
    function attemptSave(retries) {
      if (!window.firebase || !db) {
        if (retries > 0) {
          console.log("⏳ Waiting for Firebase... retries left:", retries);
          setTimeout(function() {
            attemptSave(retries - 1);
          }, 500);
        } else {
          console.error("❌ Firestore not initialized after waiting");
          window.parent.postMessage(
            { type: "SAVE_FEEDBACK_ERROR", error: "Firestore failed to initialize" },
            "*"
          );
        }
        return;
      }

      console.log("💾 Saving feedback to Firestore...");

      db.collection("feedback")
        .add({
          projectId: feedbackData.projectId,
          pageUrl: feedbackData.pageUrl || window.location.href,
          annotations: feedbackData.annotations,
          screenshot: feedbackData.screenshot || "",
          clientId: feedbackData.clientId || "widget_user",
          clientName: feedbackData.clientName || "Anonymous",
          metadata: {
            viewport: feedbackData.metadata?.viewport || {},
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
          status: "new",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(function (docRef) {
          console.log("✅ Feedback saved with ID:", docRef.id);
          window.parent.postMessage(
            {
              type: "SAVE_FEEDBACK_SUCCESS",
              feedbackId: docRef.id,
            },
            "*"
          );
        })
        .catch(function (error) {
          console.error("❌ Error saving feedback:", error);
          window.parent.postMessage(
            {
              type: "SAVE_FEEDBACK_ERROR",
              error: error.message,
            },
            "*"
          );
        });
    }
    
    attemptSave(10); // Try up to 10 times (5 seconds)
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
        console.log(
          "📸 Widget: Capture request received. Showing prompt for user gesture."
        );
        showCapturePrompt();
        break;

      case "SAVE_FEEDBACK":
        saveFeedbackToFirestore(message.data);
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
