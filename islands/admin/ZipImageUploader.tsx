import { useState } from "preact/hooks";
import { JSX } from "preact";

interface ZipImageUploaderProps {
  productId: string;
  onImagesExtracted: (images: string[]) => void;
}

export default function ZipImageUploader(
  { productId, onImagesExtracted }: ZipImageUploaderProps,
) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // This function will be called when a ZIP file is selected
  const handleZipFileSelect = (
    event: JSX.TargetedEvent<HTMLInputElement, Event>,
  ) => {
    const fileInput = event.currentTarget;
    const _file = fileInput.files?.[0];

    if (!_file || !_file.name.toLowerCase().endsWith(".zip")) {
      alert("Please select a valid ZIP file.");
      return;
    }

    // Process the ZIP file with the backend API
    processZipFile(_file);

    // Reset file input for future uploads
    fileInput.value = "";
  };

  // Function to process a ZIP file and upload to the backend
  const processZipFile = async (_file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setExtractedImages([]);

      // Create FormData to send the file
      const formData = new FormData();
      formData.append("zipFile", _file);

      // Set up fetch options with progress tracking if supported
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout

      try {
        // Upload the file to our backend endpoint
        const response = await fetch(`/api/admin/product/${productId}/images`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Update progress to indicate file is uploaded and processing
        setUploadProgress(50);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Server error occurred");
        }

        // Process the successful response
        const data = await response.json();

        // Update progress to show completion
        setUploadProgress(100);

        // Show success message but don't display PNG images
        alert(data.message + " " + (data.note || ""));

        // Clear any previous images since we uploaded PNG but want to show WebP
        setExtractedImages([]);
        
        // Call the callback to notify parent component
        onImagesExtracted([]);
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          throw new Error(
            "Upload timed out. Please try again with a smaller file.",
          );
        }
        throw fetchError;
      }
    } catch (error: unknown) {
      console.error("Error processing ZIP file:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      alert(`Error processing ZIP file: ${errorMessage}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
  };

  // Function to show S3 bucket contents
  const showS3BucketContents = async () => {
    try {
      // Fetch the list of S3 images from the backend
      setIsUploading(true);
      const response = await fetch(`/api/admin/product/${productId}/images`);

      if (!response.ok) {
        throw new Error(`Failed to fetch S3 images: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        setExtractedImages(data.images);
        setShowPreview(true);
      } else {
        alert("No images found in S3 bucket for this product.");
      }
    } catch (error: unknown) {
      console.error("Error fetching S3 images:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      alert(`Error fetching S3 images: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div class="rounded p-4 mb-4">
      <h3 class="text-lg font-semibold mb-3">Image ZIP Upload</h3>

      {/* Hidden file input for ZIP selection */}
      <input
        type="file"
        id={`zip-upload-${productId}`}
        accept=".zip"
        class="hidden"
        onChange={handleZipFileSelect}
      />

      {/* Upload Controls */}
      <div class="flex space-x-2 mb-4">
        <button
          type="button"
          onClick={() =>
            document.getElementById(`zip-upload-${productId}`)?.click()}
          disabled={isUploading}
          class="bg-primary hover:bg-primary-focus  py-2 px-4 rounded transition cursor-pointer"
        >
          Select ZIP File
        </button>

        <button
          type="button"
          onClick={showS3BucketContents}
          class="bg-secondary hover:bg-secondary-focus  py-2 px-4 rounded transition cursor-pointer"
        >
          View WebP Images
        </button>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div class="w-full bg-base-200 rounded-full h-2.5 mb-4">
          <div
            class="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          >
          </div>
          <p class="text-sm text-base-content mt-1">
            Uploading images for Lambda processing... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Image Preview Modal */}
      {showPreview && extractedImages.length > 0 && (
        <div class="fixed inset-0 bg-base-300 bg-opacity-80 flex items-center justify-center z-50">
          <div class="bg-base-100 p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-base-300">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold">Processed WebP Images</h3>
              <button
                type="button"
                onClick={closePreview}
                class="text-base-content hover:text-base-content/80 cursor-pointer"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  >
                  </path>
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {extractedImages.map((imageUrl, index) => (
                <div key={index} class="border rounded overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={`Extracted image ${index + 1}`}
                    class="w-full h-40 object-cover"
                  />
                  <div class="p-2 text-xs truncate">{imageUrl}</div>
                </div>
              ))}
            </div>

            <div class="mt-4 flex justify-end">
              <button
                type="button"
                onClick={closePreview}
                class="bg-primary hover:bg-primary-focus  py-2 px-4 rounded transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Images List (when not in preview modal) */}
      {extractedImages.length > 0 && !showPreview && (
        <div class="mt-4">
          <h4 class="font-medium mb-2">Processed WebP Images:</h4>
          <div class="bg-base-200 p-3 rounded">
            <ul class="text-sm text-base-content">
              {extractedImages.map((imageUrl, index) => (
                <li key={index} class="m-4">{imageUrl}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              class="mt-2 text-primary hover:text-primary-focus text-sm cursor-pointer"
            >
              Show Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
