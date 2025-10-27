"use client";

import React, { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ Uploaded successfully! Key: ${data.key}`);
      } else {
        setStatus(`❌ Failed: ${data.error}`);
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">📄 Upload a PDF File</h1>

      <div className="bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md">
        <input
          type="file"
          accept="application/pdf"
          className="mb-4 w-full text-sm text-gray-300"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`w-full py-2 mt-2 rounded-lg ${
            uploading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>

        {status && (
          <p className="mt-4 text-sm text-center text-gray-300">{status}</p>
        )}
      </div>
    </div>
  );
}
