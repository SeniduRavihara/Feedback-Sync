"use client";

import { Camera, Loader2, MousePointer2, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

export default function PreviewWithAnnotations({
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
  const [isSaving, setIsSaving] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [selectedAnnotation, setSelectedAnnotation] = useState<number | null>(
    null
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      console.log("Received message:", event.data.type);

      switch (event.data.type) {
        case "FEEDBACK_WIDGET_READY":
          setIsWidgetReady(true);
          console.log("✅ Widget is ready! Project:", event.data.projectId);
          break;

        case "ANNOTATION_MODE_ACTIVATED":
          setAnnotationMode(true);
          break;

        case "ANNOTATION_MODE_DEACTIVATED":
          setAnnotationMode(false);
          break;

        case "ANNOTATION_ADDED":
          const annotationData = event.data.data;
          setSelectedAnnotation(annotationData.id);
          setCurrentComment("");
          // Wait for user to add comment
          break;

        case "SCREENSHOT_CAPTURED":
          setScreenshotData(event.data.data);
          setIsCapturing(false);
          console.log("✅ Screenshot captured successfully");
          break;

        case "SCREENSHOT_ERROR":
          console.error("Screenshot error:", event.data.error);
          setIsCapturing(false);
          alert("Failed to capture screenshot: " + event.data.error);
          break;

        case "ANNOTATIONS_CLEARED":
          setAnnotations([]);
          setSelectedAnnotation(null);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Handle adding comment to annotation
  useEffect(() => {
    if (selectedAnnotation !== null && currentComment) {
      // Wait a bit to let user finish typing
      const timer = setTimeout(() => {
        const existingIndex = annotations.findIndex(
          (a) => a.id === selectedAnnotation
        );

        if (existingIndex >= 0) {
          // Update existing annotation
          const updated = [...annotations];
          updated[existingIndex] = {
            ...updated[existingIndex],
            comment: currentComment,
          };
          setAnnotations(updated);
        } else {
          // This is a new annotation from iframe
          // We need to get the data from the last message
          // For now, we'll add it when user confirms
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [currentComment, selectedAnnotation]);

  const sendMessageToIframe = (message: any) => {
    if (!iframeRef.current?.contentWindow) {
      console.error("Iframe not ready");
      return;
    }
    iframeRef.current.contentWindow.postMessage(message, "*");
  };

  const toggleAnnotationMode = () => {
    if (annotationMode) {
      sendMessageToIframe({ type: "DEACTIVATE_ANNOTATION_MODE" });
    } else {
      sendMessageToIframe({ type: "ACTIVATE_ANNOTATION_MODE" });
    }
  };

  const handleAddAnnotation = (annotationData: any) => {
    const newAnnotation: Annotation = {
      ...annotationData,
      comment: currentComment || "Click to add comment",
    };
    setAnnotations([...annotations, newAnnotation]);
    setSelectedAnnotation(null);
    setCurrentComment("");
  };

  const captureScreenshot = () => {
    setIsCapturing(true);
    sendMessageToIframe({ type: "CAPTURE_SCREENSHOT" });
  };

  const clearAllAnnotations = () => {
    sendMessageToIframe({ type: "CLEAR_ANNOTATIONS" });
    setAnnotations([]);
    setScreenshotData(null);
    setSelectedAnnotation(null);
  };

  const handleSaveFeedback = async () => {
    if (!screenshotData || annotations.length === 0) {
      alert("Please add annotations and capture a screenshot first");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        annotations: annotations,
        screenshot: screenshotData.screenshot,
        pageUrl: screenshotData.url,
        metadata: {
          viewport: screenshotData.viewport,
          timestamp: screenshotData.timestamp,
          projectId: projectId,
        },
      });

      alert("Feedback saved successfully!");
      clearAllAnnotations();
    } catch (error) {
      console.error("Failed to save feedback:", error);
      alert("Failed to save feedback. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Controls */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold mb-2">Preview Controls</h2>
          <div className="flex items-center gap-2 text-sm">
            {isWidgetReady ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-600 font-medium">
                  Widget Active
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-gray-400">Waiting for widget...</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-3 border-b">
          <button
            onClick={toggleAnnotationMode}
            disabled={!isWidgetReady}
            className={`w-full flex items-center justify-start px-4 py-2 rounded-lg font-medium transition-colors ${
              annotationMode
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <MousePointer2 className="mr-2 h-4 w-4" />
            {annotationMode ? "Annotation Mode: ON" : "Start Annotating"}
          </button>

          <button
            onClick={captureScreenshot}
            disabled={!isWidgetReady || annotations.length === 0 || isCapturing}
            className="w-full flex items-center justify-start px-4 py-2 rounded-lg font-medium transition-colors bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCapturing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {isCapturing ? "Capturing..." : "Capture Screenshot"}
          </button>

          <button
            onClick={clearAllAnnotations}
            disabled={annotations.length === 0}
            className="w-full flex items-center justify-start px-4 py-2 rounded-lg font-medium transition-colors bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </button>
        </div>

        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-semibold mb-3 flex items-center justify-between">
            <span>Annotations ({annotations.length})</span>
          </h3>

          {annotationMode && annotations.length === 0 && (
            <div className="text-sm text-gray-500 italic bg-blue-50 p-3 rounded">
              Click anywhere on the preview to add an annotation
            </div>
          )}

          <div className="space-y-3">
            {annotations.map((ann, idx) => (
              <div
                key={ann.id}
                className="p-3 bg-gray-50 rounded-lg border cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => setSelectedAnnotation(ann.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {ann.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={
                        ann.id === selectedAnnotation
                          ? currentComment
                          : ann.comment
                      }
                      onChange={(e) => {
                        setCurrentComment(e.target.value);
                        const updated = [...annotations];
                        updated[idx].comment = e.target.value;
                        setAnnotations(updated);
                      }}
                      placeholder="Add comment..."
                      className="w-full text-sm bg-transparent border-none focus:outline-none"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Position: {ann.x.toFixed(1)}%, {ann.y.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Screenshot Preview */}
        {screenshotData && (
          <div className="p-6 border-t bg-gray-50">
            <h3 className="font-semibold mb-2 text-sm">Screenshot Preview</h3>
            <img
              src={screenshotData.screenshot}
              alt="Captured screenshot"
              className="w-full border rounded shadow-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              {new Date(screenshotData.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="p-6 border-t bg-white">
          <button
            onClick={handleSaveFeedback}
            disabled={!screenshotData || annotations.length === 0 || isSaving}
            className="w-full flex items-center justify-center px-4 py-3 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Feedback
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Side - Iframe Preview */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Preview: <span className="font-mono text-xs">{websiteUrl}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 relative bg-white">
          <iframe
            ref={iframeRef}
            src={websiteUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Website Preview"
          />
        </div>
      </div>
    </div>
  );
}
