"use client";

import PreviewWithAnnotations from "@/components/preview-with-annotations";
import { use, useState } from "react";

interface PreviewFeedbackPageProps {
  searchParams: Promise<{
    url?: string;
    projectId?: string;
  }>;
}

export default function PreviewFeedbackPage({
  searchParams,
}: PreviewFeedbackPageProps) {
  const params = use(searchParams);
  const websiteUrl = params.url || "";
  const projectId = params.projectId || "";

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!websiteUrl || !projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Parameters
          </h1>
          <p className="text-gray-600">Missing website URL or project ID</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSaveFeedback = async (data: {
    annotations: any[];
    screenshot: string;
    pageUrl: string;
    metadata: any;
  }) => {
    try {
      const response = await fetch("/api/feedback/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          annotations: data.annotations,
          screenshot: data.screenshot,
          pageUrl: data.pageUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save feedback");
      }

      const result = await response.json();
      console.log("✅ Feedback saved:", result.feedbackId);
      setSavedSuccess(true);

      // Reset after 3 seconds
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save feedback:", error);
      throw error;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {savedSuccess && (
        <div className="bg-green-500 text-white px-6 py-3 text-center font-medium">
          ✅ Feedback saved successfully!
        </div>
      )}

      <PreviewWithAnnotations
        websiteUrl={websiteUrl}
        projectId={projectId}
        onSave={handleSaveFeedback}
      />
    </div>
  );
}
