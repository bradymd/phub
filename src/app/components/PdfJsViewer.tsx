/**
 * PdfJsViewer - PDF viewer using pdf.js instead of Chromium's built-in PDFium
 *
 * This avoids the font enumeration performance issue where PDFium takes 20+ seconds
 * to load PDFs on systems with many fonts (especially Noto CJK fonts).
 * pdf.js does its own rendering and doesn't depend on system font enumeration.
 */

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

// Set up the worker - use relative path for Electron file:// protocol compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

interface PdfJsViewerProps {
  src: string; // Can be a blob URL, data URL, or file path
  title?: string;
}

export function PdfJsViewer({ src, title }: PdfJsViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        // Convert data URL to ArrayBuffer if needed
        let pdfData: string | ArrayBuffer = src;
        if (src.startsWith('data:')) {
          const base64 = src.split(',')[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          pdfData = bytes.buffer;
        }

        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdf = await loadingTask.promise;

        if (!cancelled) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load PDF:', err);
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Track render task for cancellation
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        // Cancel any existing render task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(currentPage);

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Get viewport with scale and rotation
        const viewport = page.getViewport({ scale, rotation });

        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Render PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err) {
        // Ignore cancellation errors
        if (err instanceof Error && err.message.includes('cancelled')) {
          return;
        }
        console.error('Failed to render page:', err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  // Auto-fit width on initial load
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    const fitToWidth = async () => {
      try {
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth || 800;
        const newScale = (containerWidth - 40) / viewport.width; // 40px padding
        setScale(Math.min(Math.max(newScale, 0.5), 3)); // Clamp between 0.5 and 3
      } catch (err) {
        console.error('Failed to calculate scale:', err);
      }
    };

    fitToWidth();
  }, [pdfDoc]);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.25, 4));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.25));
  };

  const rotate = () => {
    setRotation((rotation + 90) % 360);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400">
          <p className="text-lg mb-2">Failed to load PDF</p>
          <p className="text-sm opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-800">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-4 p-2 bg-gray-700 border-b border-gray-600">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white text-sm min-w-[80px] text-center">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="p-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-600" />

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded hover:bg-gray-600"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </button>
          <span className="text-white text-sm min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2 rounded hover:bg-gray-600"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-600" />

        {/* Rotate */}
        <button
          onClick={rotate}
          className="p-2 rounded hover:bg-gray-600"
          title="Rotate"
        >
          <RotateCw className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* PDF Canvas - scrollable container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto p-4"
      >
        <div className="flex justify-center min-w-fit">
          <canvas
            ref={canvasRef}
            className="shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
