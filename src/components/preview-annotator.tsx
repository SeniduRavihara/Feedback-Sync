"use client";

import {
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

interface Annotation {
  id: string;
  x: number; // percentage
  y: number; // percentage
  comment: string;
  createdAt: string;
  userName: string;
}

interface PreviewAnnotatorProps {
  previewUrl: string;
  projectId: string;
  projectName: string;
  userName: string;
  onClose: () => void;
  onSubmitFeedback: (
    comment: string,
    position: { x: number; y: number },
    metadata?: {
      screenshot: string;
      pageUrl: string;
      annotationNumber: number;
    }
  ) => Promise<void>;
  existingAnnotations?: Annotation[];
}

export function PreviewAnnotator({
  previewUrl,
  projectName,
  userName,
  onClose,
  onSubmitFeedback,
  existingAnnotations = [],
}: PreviewAnnotatorProps) {
  const [annotations, setAnnotations] =
    useState<Annotation[]>(existingAnnotations);
  const [activeAnnotation, setActiveAnnotation] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [annotationMode, setAnnotationMode] = useState(false);

  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!iframeContainerRef.current) return;

    const rect = iframeContainerRef.current.getBoundingClientRect();

    // Simple percentage-based positioning relative to viewport
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setActiveAnnotation({ x, y });
  };

  const handleSubmit = async () => {
    if (!activeAnnotation || !comment.trim()) return;

    setSubmitting(true);
    try {
      const iframe = iframeRef.current;
      const container = iframeContainerRef.current;
      let pageUrl = previewUrl;
      let screenshotDataUrl = "";

      if (iframe && iframe.contentWindow) {
        try {
          pageUrl = iframe.contentWindow.location.href;
        } catch (e) {
          pageUrl = previewUrl;
        }
      }

      // Capture screenshot using Screen Capture API
      if (
        container &&
        "mediaDevices" in navigator &&
        "getDisplayMedia" in navigator.mediaDevices
      ) {
        try {
          // Request screen capture
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { mediaSource: "screen" } as any,
            audio: false,
          });

          // Create video element to capture frame
          const video = document.createElement("video");
          video.srcObject = stream;
          video.play();

          // Wait for video to be ready
          await new Promise((resolve) => {
            video.onloadedmetadata = resolve;
          });

          // Create canvas and capture current frame
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.drawImage(video, 0, 0);
            screenshotDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          }

          // Stop screen capture
          stream.getTracks().forEach((track) => track.stop());
        } catch (error) {
          console.log("Screen capture declined or failed:", error);
        }
      }

      // If screen capture failed or was declined, use fallback
      if (!screenshotDataUrl) {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Create a clean annotation marker image
          ctx.fillStyle = "#0D0D0D";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Title
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            `Annotation #${annotations.length + 1}`,
            canvas.width / 2,
            60
          );

          // Page URL
          ctx.font = "18px sans-serif";
          ctx.fillStyle = "#00A388";
          const urlText =
            pageUrl.length > 80 ? pageUrl.substring(0, 77) + "..." : pageUrl;
          ctx.fillText(urlText, canvas.width / 2, 100);

          // Position
          ctx.fillStyle = "#666666";
          ctx.font = "16px sans-serif";
          ctx.fillText(
            `Click Position: ${activeAnnotation.x.toFixed(
              1
            )}% from left, ${activeAnnotation.y.toFixed(1)}% from top`,
            canvas.width / 2,
            140
          );

          // Draw viewport representation
          const boxX = 100;
          const boxY = 180;
          const boxWidth = canvas.width - 200;
          const boxHeight = canvas.height - 280;

          ctx.strokeStyle = "#2A2A2A";
          ctx.lineWidth = 3;
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

          ctx.fillStyle = "#1A1A1A";
          ctx.font = "14px sans-serif";
          ctx.fillText(
            "Preview Area (annotation marked below)",
            canvas.width / 2,
            boxY - 20
          );

          // Draw marker
          const markerX = boxX + (activeAnnotation.x / 100) * boxWidth;
          const markerY = boxY + (activeAnnotation.y / 100) * boxHeight;

          ctx.fillStyle = "#00A388";
          ctx.beginPath();
          ctx.arc(markerX, markerY, 35, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${annotations.length + 1}`, markerX, markerY);

          // Add note
          ctx.fillStyle = "#666666";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            "💡 Allow screen capture permission for better screenshots",
            canvas.width / 2,
            canvas.height - 30
          );

          screenshotDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        }
      }

      await onSubmitFeedback(comment, activeAnnotation, {
        screenshot: screenshotDataUrl,
        pageUrl: pageUrl,
        annotationNumber: annotations.length + 1,
      });

      if (container) {
        const rect = container.getBoundingClientRect();
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Background
          ctx.fillStyle = "#0D0D0D";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Border
          ctx.strokeStyle = "#1A1A1A";
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, canvas.width, canvas.height);

          // Title
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            `Annotation #${annotations.length + 1}`,
            canvas.width / 2,
            40
          );

          // Page URL
          ctx.font = "14px sans-serif";
          ctx.fillStyle = "#00A388";
          const urlText =
            pageUrl.length > 70 ? pageUrl.substring(0, 67) + "..." : pageUrl;
          ctx.fillText(urlText, canvas.width / 2, 70);

          // Position info
          ctx.fillStyle = "#666666";
          ctx.font = "12px sans-serif";
          ctx.fillText(
            `Position: ${activeAnnotation.x.toFixed(
              1
            )}% X, ${activeAnnotation.y.toFixed(1)}% Y`,
            canvas.width / 2,
            95
          );

          // Viewport representation
          const viewportX = 50;
          const viewportY = 120;
          const viewportWidth = canvas.width - 100;
          const viewportHeight = canvas.height - 150;

          // Draw viewport box
          ctx.strokeStyle = "#2A2A2A";
          ctx.lineWidth = 2;
          ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);

          // Draw annotation marker
          const markerX =
            viewportX + (activeAnnotation.x / 100) * viewportWidth;
          const markerY =
            viewportY + (activeAnnotation.y / 100) * viewportHeight;
          const markerSize = 30;

          // Marker circle
          ctx.fillStyle = "#00A388";
          ctx.beginPath();
          ctx.arc(markerX, markerY, markerSize, 0, Math.PI * 2);
          ctx.fill();

          // Marker border
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.stroke();

          // Marker number
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${annotations.length + 1}`, markerX, markerY);

          screenshotDataUrl = canvas.toDataURL("image/png", 0.9);
        }
      }

      await onSubmitFeedback(comment, activeAnnotation, {
        screenshot: screenshotDataUrl,
        pageUrl: pageUrl,
        annotationNumber: annotations.length + 1,
      });

      // Add to local annotations
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        x: activeAnnotation.x,
        y: activeAnnotation.y,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        userName,
      };

      setAnnotations((prev) => [...prev, newAnnotation]);
      setActiveAnnotation(null);
      setComment("");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAnnotation = () => {
    setActiveAnnotation(null);
    setComment("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`bg-[#0D0D0D] border border-[#1A1A1A] rounded-3xl shadow-2xl flex flex-col ${
          isFullscreen ? "w-full h-full" : "w-[95vw] h-[90vh] max-w-7xl"
        }`}
        style={{ overflow: "hidden" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A] bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00A388] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">{projectName} Preview</h2>
              <p className="text-xs text-neutral-500">
                {annotationMode
                  ? "Click anywhere to add feedback"
                  : "Browse mode - Toggle annotation to add feedback"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAnnotationMode(!annotationMode);
                if (annotationMode) {
                  setActiveAnnotation(null);
                  setComment("");
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                annotationMode
                  ? "bg-yellow-500 text-black"
                  : "bg-[#1A1A1A] text-neutral-400 hover:text-white"
              }`}
            >
              {annotationMode ? "📍 Annotating" : "Browse"}
            </button>
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                showAnnotations
                  ? "bg-[#00A388] text-white"
                  : "bg-[#1A1A1A] text-neutral-400 hover:text-white"
              }`}
            >
              {showAnnotations ? "Hide" : "Show"} Markers ({annotations.length})
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] text-neutral-400 hover:text-white transition-all"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1A1A1A] hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Container with Overlay */}
        <div className="flex-1 relative bg-[#050505] overflow-hidden">
          {/* Iframe */}
          <div ref={iframeContainerRef} className="w-full h-full relative">
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title={`${projectName} Preview`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />

            {/* Overlay for capturing clicks - only active when not scrolling */}
            <div
              className={`absolute inset-0 bg-transparent transition-all ${
                annotationMode
                  ? "cursor-crosshair hover:bg-yellow-500/5"
                  : "pointer-events-none"
              }`}
              onClick={annotationMode ? handleIframeClick : undefined}
            />
          </div>

          {/* Existing Annotations */}
          <AnimatePresence>
            {showAnnotations &&
              annotations.map((annotation, index) => {
                return (
                  <motion.div
                    key={annotation.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute group pointer-events-auto"
                    style={{
                      left: `${annotation.x}%`,
                      top: `${annotation.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="w-8 h-8 bg-[#00A388] rounded-full flex items-center justify-center shadow-lg shadow-[#00A388]/30 border-2 border-white/20 cursor-pointer relative">
                      <span className="text-white font-bold text-sm">
                        {index + 1}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-64 bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-4 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        <div className="text-xs text-neutral-500 mb-1">
                          {annotation.userName}
                        </div>
                        <div className="text-sm text-white">
                          {annotation.comment}
                        </div>
                        <div className="text-xs text-neutral-600 mt-2">
                          {new Date(annotation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>

          {/* Active Annotation Marker */}
          <AnimatePresence>
            {activeAnnotation && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute pointer-events-none"
                style={{
                  left: `${activeAnnotation.x}%`,
                  top: `${activeAnnotation.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 border-2 border-white animate-pulse">
                  <span className="text-white font-bold">
                    {annotations.length + 1}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Comment Input Panel */}
        <AnimatePresence>
          {activeAnnotation && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="border-t border-[#1A1A1A] bg-[#0A0A0A] p-6"
            >
              <div className="max-w-3xl mx-auto">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-neutral-400 mb-2">
                      What&apos;s the issue or suggestion?
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Describe the issue or improvement in detail..."
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#242424] rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-[#00A388] resize-none"
                      rows={3}
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-8">
                    <button
                      onClick={handleSubmit}
                      disabled={!comment.trim() || submitting}
                      className="px-6 py-3 bg-[#00A388] hover:bg-[#008F76] disabled:bg-[#1A1A1A] disabled:text-neutral-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelAnnotation}
                      className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#242424] text-neutral-400 hover:text-white rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
