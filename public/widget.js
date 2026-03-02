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

  console.log(
    "Feedback Widget: Activated in",
    isInPreviewIframe ? "preview iframe mode" : "standalone mode"
  );

  // State
  let annotationOverlay = null;
  let annotations = [];
  let annotationMode = false;
  let db = null;
  let storage = null;
  let firebaseReady = false;
  let html2canvasLoaded = false;
  
  // Standalone UI State
  let floatingBtn = null;
  let controlPanel = null;
  let isCapturing = false;

  // Load html2canvas library
  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = () => {
        html2canvasLoaded = true;
        console.log("✅ html2canvas loaded");
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.head.appendChild(script);
    });
  }

  // Load Firebase SDK dynamically
  function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
      if (window.firebase) {
        resolve();
        return;
      }

      const script1 = document.createElement("script");
      script1.src =
        "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
      script1.onerror = () => reject(new Error("Failed to load Firebase App"));
      script1.onload = () => {
        const script2 = document.createElement("script");
        script2.src =
          "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js";
        script2.onerror = () =>
          reject(new Error("Failed to load Firebase Firestore"));
        script2.onload = () => {
          const script3 = document.createElement("script");
          script3.src =
            "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js";
          script3.onerror = () =>
            reject(new Error("Failed to load Firebase Storage"));
          script3.onload = () => resolve();
          document.head.appendChild(script3);
        };
        document.head.appendChild(script2);
      };
      document.head.appendChild(script1);
    });
  }

  // Initialize Firebase
  async function initFirebase() {
    try {
      console.log("📦 Loading Firebase SDK...");
      await loadFirebaseSDK();
      console.log("✅ Firebase SDK loaded");

      const app = firebase.initializeApp(firebaseConfig);
      db = firebase.firestore(app);
      storage = firebase.storage(app);
      firebaseReady = true;
      console.log("✅ All Firebase services ready");
      
      // If standalone, show the floating button once Firebase is ready
      if (!isInPreviewIframe) {
        createFloatingButton();
      }
    } catch (error) {
      console.error("❌ Firebase initialization failed:", error);
      firebaseReady = false;
    }
  }

  // Initialize SDKs
  initFirebase();
  loadHtml2Canvas();

  // ----------------------------------------------------------------------
  // STANDALONE UI COMPONENTS
  // ----------------------------------------------------------------------

  function createFloatingButton() {
    if (floatingBtn) return;
    
    // REQUIREMENT: Special activation mechanism.
    // The widget should only appear if the URL has ?feedback=true
    // This prevents normal website visitors from seeing the feedback tool.
    const urlParams = new URLSearchParams(window.location.search);
    const hasFeedbackParam = urlParams.get('feedback') === 'true';

    if (!hasFeedbackParam) {
      console.log("Feedback Widget: Standalone mode is dormant. Add '?feedback=true' to the URL to activate.");
      return; 
    }
    
    floatingBtn = document.createElement("button");
    // Ensure button sits below the overlay using z-index
    floatingBtn.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #14b8a6; /* teal-500 */
      color: white;
      border: none;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483640; 
      transition: all 0.3s ease;
      font-family: sans-serif;
    `;
    
    // Simple icon SVG
    floatingBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    
    floatingBtn.onmouseover = () => { floatingBtn.style.transform = "scale(1.1)"; };
    floatingBtn.onmouseout = () => { floatingBtn.style.transform = "scale(1)"; };
    
    floatingBtn.onclick = () => {
      floatingBtn.style.display = "none";
      activateAnnotationMode();
      createControlPanel();
    };
    
    document.body.appendChild(floatingBtn);
  }

  function createControlPanel() {
    if (controlPanel) {
      controlPanel.style.display = "flex";
      updateControlPanel();
      return;
    }

    controlPanel = document.createElement("div");
    // Control panel sits above everything
    controlPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background-color: #1e293b; /* slate-800 */
      color: white;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 2147483648; 
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      border: 1px solid #334155; /* slate-700 */
      overflow: hidden;
    `;

    document.body.appendChild(controlPanel);
    updateControlPanel();
  }

  function updateControlPanel() {
    if (!controlPanel) return;

    controlPanel.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom right, #0f172a, #1e293b);">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Feedback Mode Active</h3>
        <button id="fb-close-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div style="padding: 16px; flex: 1;">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #cbd5e1;">Click anywhere on the page to leave a feedback marker.</p>
        
        <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px; font-weight: 500;">Annotations Added:</span>
            <span style="background: #14b8a6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${annotations.length}</span>
          </div>
        </div>
        
        <button id="fb-submit-btn" ${annotations.length === 0 || isCapturing ? 'disabled' : ''} style="
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          background: ${annotations.length === 0 ? '#475569' : 'linear-gradient(to right, #14b8a6, #0891b2)'};
          color: white;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: ${annotations.length === 0 || isCapturing ? 'not-allowed' : 'pointer'};
          opacity: ${annotations.length === 0 || isCapturing ? '0.7' : '1'};
          transition: all 0.2s;
        ">
          ${isCapturing ? 'Saving Feedback...' : 'Submit Feedback'}
        </button>
      </div>
    `;

    document.getElementById("fb-close-btn").onclick = closeStandaloneMode;
    
    document.getElementById("fb-submit-btn").onclick = async () => {
      if (annotations.length === 0 || isCapturing) return;
      isCapturing = true;
      updateControlPanel();
      
      try {
        const screenshotData = await captureScreenshotInternal();
        await saveFeedbackToFirestore({
           projectId,
           annotations: annotations.map(a => ({ id: a.id, x: a.x, y: a.y, comment: a.comment, number: a.number })),
           screenshot: screenshotData.screenshot,
           pageUrl: screenshotData.url,
           metadata: {
              viewport: screenshotData.viewport,
              timestamp: screenshotData.timestamp
           }
        });
        
        alert("Feedback submitted successfully!");
        closeStandaloneMode();
      } catch (err) {
        console.error(err);
        alert("Failed to submit feedback: " + err.message);
      } finally {
        isCapturing = false;
        updateControlPanel();
      }
    };
  }

  function closeStandaloneMode() {
    deactivateAnnotationMode();
    clearAnnotations();
    if (controlPanel) controlPanel.style.display = "none";
    if (floatingBtn) floatingBtn.style.display = "flex";
  }

  // ----------------------------------------------------------------------
  // ANNOTATION LOGIC
  // ----------------------------------------------------------------------

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
      z-index: 2147483645;
      cursor: crosshair;
      background: rgba(0, 0, 0, 0.1);
    `;

    // Handle clicks on overlay
    annotationOverlay.addEventListener("click", handleAnnotationClick);

    document.body.appendChild(annotationOverlay);

    if (isInPreviewIframe) {
      window.parent.postMessage({ type: "ANNOTATION_MODE_ACTIVATED" }, "*");
    }
  }

  function deactivateAnnotationMode() {
    if (annotationOverlay) {
      annotationOverlay.remove();
      annotationOverlay = null;
    }
    annotationMode = false;

    if (isInPreviewIframe) {
      window.parent.postMessage({ type: "ANNOTATION_MODE_DEACTIVATED" }, "*");
    }
  }

  function handleAnnotationClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const rect = document.documentElement.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Calculate percentage position relative to entire document
    const x = ((event.clientX + scrollX) / document.documentElement.scrollWidth) * 100;
    const y = ((event.clientY + scrollY) / document.documentElement.scrollHeight) * 100;

    let comment = "";
    
    // In standalone mode, prompt for comment immediately
    if (!isInPreviewIframe) {
       comment = prompt("Please enter a comment for this feedback marker:") || "";
       if (!comment.trim()) {
           return; // Cancelled
       }
    }

    const number = annotations.length + 1;

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
      background: #14b8a6; /* teal-500 */
      border: 3px solid white;
      border-radius: 50%;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      z-index: 2147483646;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
      pointer-events: none;
      font-family: sans-serif;
    `;
    marker.textContent = number;
    document.body.appendChild(marker);

    const annotationData = {
      id: Date.now(),
      x: x,
      y: y,
      marker: marker,
      comment: comment,
      number: number
    };

    annotations.push(annotationData);

    if (isInPreviewIframe) {
      // Send annotation to parent
      window.parent.postMessage(
        {
          type: "ANNOTATION_ADDED",
          data: {
            id: annotationData.id,
            x: x,
            y: y,
            absoluteX: event.clientX + scrollX,
            absoluteY: event.clientY + scrollY,
            number: number,
          },
        },
        "*"
      );
    } else {
      updateControlPanel();
    }
  }

  function clearAnnotations() {
    annotations.forEach((ann) => {
      if (ann.marker) {
        ann.marker.remove();
      }
    });
    annotations = [];

    if (isInPreviewIframe) {
      window.parent.postMessage({ type: "ANNOTATIONS_CLEARED" }, "*");
    } else {
      updateControlPanel();
    }
  }

  // ----------------------------------------------------------------------
  // SCREENSHOT & UPLOAD
  // ----------------------------------------------------------------------

  // Internal Promise-based screenshot function for reuse
  async function captureScreenshotInternal(requestedAnnotations) {
    if (!window.html2canvas) throw new Error("Screenshot library not ready");

    // Hide overlay, markers, and control panels for clean screenshot
    const overlay = annotationOverlay;
    const markers = Array.from(document.querySelectorAll(".feedback-annotation-marker"));
    const panels = [];
    if (controlPanel) panels.push(controlPanel);
    if (floatingBtn) panels.push(floatingBtn);

    if (overlay) overlay.style.display = "none";
    markers.forEach(m => m.style.display = "none");
    panels.forEach(p => p.style.display = "none");

    try {
      // Capture the current viewport
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: window.pageXOffset,
        y: window.pageYOffset,
        ignoreElements: function (element) { return false; },
        onclone: function (clonedDoc) {
          try {
            const styleSheets = clonedDoc.styleSheets;
            for (let i = 0; i < styleSheets.length; i++) {
              try {
                const rules = styleSheets[i].cssRules || styleSheets[i].rules;
                for (let j = 0; j < rules.length; j++) {
                  const rule = rules[j];
                  if (rule.style) {
                    for (let prop of rule.style) {
                      if (rule.style[prop] && rule.style[prop].includes("oklch")) {
                        rule.style[prop] = "transparent";
                      }
                    }
                  }
                }
              } catch (e) { continue; }
            }
          } catch (e) {
            console.warn("Could not process stylesheets:", e);
          }
        },
      });

      // Restore elements
      if (overlay) overlay.style.display = "block";
      markers.forEach(m => m.style.display = "flex");
      if (!isInPreviewIframe && controlPanel) controlPanel.style.display = "flex";

      const screenshot = canvas.toDataURL("image/jpeg", 0.8);
      
      return {
        screenshot: screenshot,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.pageXOffset,
          scrollY: window.pageYOffset,
        },
        annotations: (requestedAnnotations || annotations).map(a => ({ id: a.id, x: a.x, y: a.y }))
      };
    } catch (e) {
      // Ensure we restore everything before bubbling error
      if (overlay) overlay.style.display = "block";
      markers.forEach(m => m.style.display = "flex");
      if (!isInPreviewIframe && controlPanel) controlPanel.style.display = "flex";
      throw e;
    }
  }

  // Wrapper for parent iframe postMessage communication
  async function captureScreenshot(requestedAnnotations) {
    try {
      console.log("📸 Capturing screenshot with html2canvas...");
      const data = await captureScreenshotInternal(requestedAnnotations);
      
      console.log("✅ Screenshot captured:", data.screenshot.length, "bytes");

      window.parent.postMessage(
        {
          type: "SCREENSHOT_CAPTURED",
          data: data,
        },
        "*"
      );
    } catch (error) {
      console.error("❌ Screenshot failed:", error);
      window.parent.postMessage(
        {
          type: "SCREENSHOT_ERROR",
          error: error.message || "Screenshot capture failed",
        },
        "*"
      );
    }
  }

  // Upload screenshot to Firebase Storage
  async function uploadScreenshot(base64Data, feedbackId) {
    if (!base64Data || !storage) return null;

    try {
      console.log("📤 Uploading screenshot to Storage...");
      const timestamp = new Date().getTime();
      const path = `feedback-screenshots/${feedbackId}_${timestamp}.jpg`;
      const storageRef = storage.ref(path);

      const uploadTask = storageRef.putString(
        base64Data,
        firebase.storage.StringFormat.DATA_URL,
        { contentType: "image/jpeg" }
      );

      await uploadTask;
      const downloadURL = await storageRef.getDownloadURL();
      console.log("✅ Screenshot uploaded:", downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("❌ Screenshot upload failed:", error);
      if (error.code === "storage/unauthorized") {
        console.error("🚫 Storage rules deny upload. Check Firebase Console > Storage > Rules");
      }
      return null;
    }
  }

  // Save feedback directly to Firestore
  async function saveFeedbackToFirestore(feedbackData) {
    console.log("💾 Save request received", feedbackData);

    try {
      const maxWait = 20;
      let attempts = 0;

      while (!firebaseReady && attempts < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }

      if (!firebaseReady || !db) {
        throw new Error("Firebase failed to initialize after 10 seconds");
      }

      let screenshotUrl = "";
      if (feedbackData.screenshot) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        screenshotUrl = await uploadScreenshot(feedbackData.screenshot, tempId);
      }

      const docRef = await db.collection("feedback").add({
        projectId: feedbackData.projectId,
        pageUrl: feedbackData.pageUrl || window.location.href,
        annotations: feedbackData.annotations || [],
        screenshotUrl: screenshotUrl || "",
        clientId: feedbackData.clientId || "widget_user",
        clientName: feedbackData.clientName || "Anonymous",
        metadata: {
          viewport: feedbackData.metadata?.viewport || {},
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
        status: "new",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Feedback document created with ID:", docRef.id);

      if (isInPreviewIframe) {
        window.parent.postMessage(
          {
            type: "SAVE_FEEDBACK_SUCCESS",
            feedbackId: docRef.id,
            screenshotUrl: screenshotUrl,
          },
          "*"
        );
      }
      
      return docRef.id;
    } catch (error) {
      console.error("❌ Error saving feedback:", error);
      if (isInPreviewIframe) {
        window.parent.postMessage(
          {
            type: "SAVE_FEEDBACK_ERROR",
            error: error.message || "Failed to save feedback",
          },
          "*"
        );
      }
      throw error;
    }
  }

  // ----------------------------------------------------------------------
  // MESSAGE LISTENER (PREVIEW MODE)
  // ----------------------------------------------------------------------

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

  // Notify parent when ready (only if in iframe)
  function notifyReady() {
    if (!isInPreviewIframe) return;
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", notifyReady);
  } else {
    notifyReady();
  }

})();

