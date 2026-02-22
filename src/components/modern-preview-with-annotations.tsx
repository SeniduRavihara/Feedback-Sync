"use client";

import {
  Check,
  Loader2,
  MessageSquare,
  MousePointer2,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Annotation {
  id: number;
  x: number;
  y: number;
  absoluteX?: number;
  absoluteY?: number;
  number: number;
  comment: string;
}

interface ScreenshotData {
  screenshot: string;
  url: string;
  timestamp: string;
  viewport: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  };
  annotations: Array<{ id: number; x: number; y: number }>;
}

interface PreviewWithAnnotationsProps {
  websiteUrl: string;
  projectId: string;
  onSave: (data: {
    annotations: Annotation[];
    screenshot: string;
    pageUrl: string;
    metadata: any;
  }) => Promise<void>;
}

export default function ModernPreviewWithAnnotations({
  websiteUrl,
  projectId,
  onSave,
}: PreviewWithAnnotationsProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [screenshotData, setScreenshotData] = useState<ScreenshotData | null>(
    null
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCapturePending, setIsCapturePending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const [annotationComment, setAnnotationComment] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const sendMessageToIframe = useCallback((message: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, "*");
    }
  }, []);

  // Message handler for communication with widget
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("📨 Message received:", event.data); // Debug log

      if (event.data.type === "FEEDBACK_WIDGET_READY") {
        console.log("✅ Widget is ready!");
        setIsWidgetReady(true);
      } else if (event.data.type === "ANNOTATION_ADDED") {
        console.log("📍 Annotation added:", event.data.data);
        setCurrentAnnotation(event.data.data);
        setIsPanelOpen(true);
      } else if (event.data.type === "SCREENSHOT_CAPTURED") {
        console.log("📸 Screenshot captured successfully");
        console.log(
          "📸 Screenshot data:",
          event.data.data?.screenshot?.substring(0, 100)
        );
        setScreenshotData(event.data.data);
        setIsCapturing(false);
      } else if (event.data.type === "SCREENSHOT_ERROR") {
        console.log("❌ Screenshot error:", event.data.error);
        setIsCapturing(false);
      } else if (event.data.type === "SAVE_FEEDBACK_SUCCESS") {
        console.log("✅ Feedback saved with ID:", event.data.feedbackId);
        clearTimeout((window as any)._saveTimeout);
        setIsSaving(false);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAnnotations([]);
          setScreenshotData(null);
          setAnnotationMode(false);
          setIsPanelOpen(false);
          sendMessageToIframe({ type: "DEACTIVATE_ANNOTATION_MODE" });
        }, 2000);
      } else if (event.data.type === "SAVE_FEEDBACK_ERROR") {
        console.error("❌ Save error:", event.data.error);
        clearTimeout((window as any)._saveTimeout);
        setIsSaving(false);
        alert("Failed to save feedback: " + event.data.error);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendMessageToIframe]);

  const toggleAnnotationMode = () => {
    const newMode = !annotationMode;
    setAnnotationMode(newMode);
    console.log("🎯 Annotation mode:", newMode ? "ON" : "OFF");

    sendMessageToIframe({
      type: newMode ? "ACTIVATE_ANNOTATION_MODE" : "DEACTIVATE_ANNOTATION_MODE",
    });

    if (newMode) {
      setIsPanelOpen(true);
    }
  };

  const submitAnnotation = () => {
    if (annotationComment.trim()) {
      let annotationToAdd = currentAnnotation;

      // If no current annotation from click, create one at center
      if (!annotationToAdd) {
        annotationToAdd = {
          id: Date.now(),
          x: 50,
          y: 50,
        };
      }

      const newAnnotation: Annotation = {
        ...annotationToAdd,
        number: annotations.length + 1,
        comment: annotationComment.trim(),
      };

      const updatedAnnotations = [...annotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      setAnnotationComment("");
      setCurrentAnnotation(null);

      // Auto-capture screenshot after adding annotation with updated annotations
      setTimeout(() => {
        console.log(
          "🎬 Starting screenshot with annotations:",
          updatedAnnotations.length
        );
        setIsCapturing(true);
        sendMessageToIframe({
          type: "CAPTURE_SCREENSHOT",
          annotations: updatedAnnotations.map((a) => ({
            id: a.id,
            x: a.x,
            y: a.y,
          })),
        });
      }, 100);
    }
  };

  const captureScreenshot = () => {
    console.log("🎬 Starting screenshot capture...");
    setIsCapturing(true);
    sendMessageToIframe({
      type: "CAPTURE_SCREENSHOT",
      annotations: annotations.map((a) => ({ id: a.id, x: a.x, y: a.y })),
    });

    // Safety timeout in case screenshot never comes back
    setTimeout(() => {
      console.log("⚠️ Screenshot timeout - forcing reset");
      setIsCapturing(false);
    }, 10000);
  };

  const handleSaveFeedback = async () => {
    if (annotations.length === 0) return;

    setIsSaving(true);
    console.log("💾 Sending save request to widget...");

    // Safety timeout - if no response in 15 seconds, reset
    const timeout = setTimeout(() => {
      console.error("⏰ Save timeout - no response from widget after 15s");
      setIsSaving(false);
      alert("Save timeout - please check browser console and try again");
    }, 15000);

    // Store timeout in ref so it can be cleared by message handler
    (window as any)._saveTimeout = timeout;

    // Send save request to widget - it will handle Firestore directly
    sendMessageToIframe({
      type: "SAVE_FEEDBACK",
      data: {
        projectId,
        annotations,
        screenshot: screenshotData?.screenshot || "",
        pageUrl: screenshotData?.url || websiteUrl,
        metadata: {
          viewport: screenshotData?.viewport || null,
          timestamp: screenshotData?.timestamp || new Date().toISOString(),
        },
      },
    });
  };

  const deleteAnnotation = (id: number) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
    setScreenshotData(null);
    sendMessageToIframe({ type: "CLEAR_ANNOTATIONS" });
  };

  return (
    <div className="fixed inset-0 bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isWidgetReady ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-medium text-gray-200">
              {isWidgetReady ? "Widget Active" : "Loading Widget..."}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-600" />
          <span
            className="text-sm text-gray-400 truncate max-w-md"
            title={websiteUrl}
          >
            {websiteUrl}
          </span>
        </div>

        {annotations.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-teal-400" />
            <span className="font-medium text-gray-200">
              {annotations.length} Annotation
              {annotations.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Main Content - Full width iframe */}
      <div className="relative h-[calc(100vh-73px)]">
        <iframe
          ref={iframeRef}
          src={websiteUrl}
          className="w-full h-full border-0"
          title="Website Preview"
          allow="display-capture"
        />

        {/* Floating Action Button (FAB) - Always visible bottom right */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-teal-500 hover:bg-teal-600 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
        >
          <MousePointer2 className="w-7 h-7 text-white" />
        </button>

        {/* Sliding Panel */}
        <div
          className={`fixed top-0 right-0 h-full bg-slate-800 shadow-2xl border-l border-slate-700 transition-all duration-300 ease-in-out z-40 ${
            isPanelOpen ? "w-96" : "w-0"
          } overflow-hidden flex flex-col`}
        >
          {/* Panel Header */}
          <div className="p-6 border-b border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Feedback Panel
              </h3>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={toggleAnnotationMode}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  annotationMode
                    ? "bg-teal-500 text-white shadow-lg hover:bg-teal-600"
                    : "bg-slate-700 text-slate-300 border-2 border-slate-600 hover:border-teal-500"
                }`}
              >
                <MousePointer2 className="w-4 h-4" />
                {annotationMode ? "Annotating" : "Annotate"}
              </button>

              {annotations.length > 0 && (
                <button
                  onClick={clearAllAnnotations}
                  className="px-4 py-2.5 rounded-lg font-medium text-sm bg-slate-700 text-red-400 border-2 border-slate-600 hover:border-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Annotations List */}
            <div className="p-6 space-y-3">
              {annotations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No annotations yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click on the page to start
                  </p>
                </div>
              ) : (
                annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="group bg-slate-900 rounded-lg p-4 border border-slate-700 hover:border-teal-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {annotation.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 break-words">
                          {annotation.comment}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Position: {annotation.x.toFixed(1)}%,{" "}
                          {annotation.y.toFixed(1)}%
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(annotation.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900 rounded transition-all"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Screenshot Preview */}
            {screenshotData && (
              <div className="p-6 border-t border-slate-700 bg-slate-900">
                <p className="text-xs font-medium text-gray-400 mb-2">
                  Screenshot Preview
                </p>
                <img
                  src={screenshotData.screenshot}
                  alt="Screenshot"
                  className="w-full h-32 object-cover rounded-lg border border-slate-700"
                />
              </div>
            )}
          </div>

          {/* ALWAYS VISIBLE INPUT SECTION - Fixed at bottom */}
          <div className="p-6 border-t border-slate-700 bg-slate-900 flex-shrink-0">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-white mb-2">
                💬 Add Comment to Annotation #{annotations.length + 1}
              </label>
              <textarea
                value={annotationComment}
                onChange={(e) => setAnnotationComment(e.target.value)}
                placeholder="Click on the page to add annotation, then type your feedback here..."
                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none text-sm"
                rows={3}
              />
            </div>
            <button
              onClick={() => {
                if (annotationComment.trim()) {
                  submitAnnotation();
                }
              }}
              disabled={!annotationComment.trim() || isCapturing || isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg mb-4"
            >
              {isCapturing || isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isCapturing ? "Capturing..." : "Saving..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Add Annotation
                </>
              )}
            </button>
          </div>

          {/* Bottom Actions - Save Feedback - Fixed at bottom */}
          <div className="p-6 border-t border-slate-700 bg-slate-800 flex-shrink-0">
            {showSuccess ? (
              <div className="flex items-center justify-center gap-2 text-green-400 py-3">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Feedback saved successfully!
                </span>
              </div>
            ) : (
              <button
                onClick={handleSaveFeedback}
                disabled={annotations.length === 0 || isSaving}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-bold text-sm hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving Feedback...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Save Feedback ({annotations.length} annotation
                    {annotations.length !== 1 ? "s" : ""})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
