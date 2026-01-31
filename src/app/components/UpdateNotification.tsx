import { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    // Check if we're in Electron
    if (typeof window === 'undefined' || !('electronAPI' in window)) {
      return;
    }

    const api = (window as any).electronAPI;
    if (!api.updater) return;

    // Get current version
    api.updater.getVersion().then((result: { version: string }) => {
      setCurrentVersion(result.version);
    });

    // Set up event listeners
    api.updater.onChecking(() => {
      setStatus('checking');
    });

    api.updater.onAvailable((info: UpdateInfo) => {
      setStatus('available');
      setUpdateInfo(info);
      setDismissed(false);
    });

    api.updater.onNotAvailable((info: UpdateInfo) => {
      setStatus('not-available');
      setUpdateInfo(info);
    });

    api.updater.onProgress((prog: DownloadProgress) => {
      setStatus('downloading');
      setProgress(prog);
    });

    api.updater.onDownloaded((info: UpdateInfo) => {
      setStatus('downloaded');
      setUpdateInfo(info);
      setDismissed(false);
    });

    api.updater.onError((err: { message: string }) => {
      setStatus('error');
      setError(err.message);
    });

    // Cleanup
    return () => {
      api.updater.removeAllListeners();
    };
  }, []);

  const handleDownload = async () => {
    const api = (window as any).electronAPI;
    if (api?.updater) {
      setStatus('downloading');
      await api.updater.download();
    }
  };

  const handleInstall = () => {
    const api = (window as any).electronAPI;
    if (api?.updater) {
      api.updater.install();
    }
  };

  const handleCheckForUpdates = async () => {
    const api = (window as any).electronAPI;
    if (api?.updater) {
      setStatus('checking');
      setError(null);
      await api.updater.check();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show anything in browser mode
  if (typeof window === 'undefined' || !('electronAPI' in window)) {
    return null;
  }

  // Don't show if dismissed (for available/downloaded states)
  if (dismissed && (status === 'available' || status === 'downloaded')) {
    return null;
  }

  // Don't show for idle or not-available states
  if (status === 'idle' || status === 'not-available') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {status === 'checking' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-blue-800">Checking for updates...</span>
        </div>
      )}

      {status === 'available' && updateInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Update Available</p>
                <p className="text-sm text-green-700 mt-1">
                  Version {updateInfo.version} is ready to download
                </p>
                {currentVersion && (
                  <p className="text-xs text-green-600 mt-1">
                    Current: v{currentVersion}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Download Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {status === 'downloading' && progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Download className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">Downloading update...</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-2">
            {progress.percent.toFixed(0)}% - {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
          </p>
        </div>
      )}

      {status === 'downloaded' && updateInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Update Ready</p>
                <p className="text-sm text-green-700 mt-1">
                  Version {updateInfo.version} will be installed on restart
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Restart Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Update Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleCheckForUpdates}
            className="mt-3 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
