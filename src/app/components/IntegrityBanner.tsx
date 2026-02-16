import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { runIntegrityCheck, IntegrityReport } from '../../services/integrity';
import { useStorage } from '../../contexts/StorageContext';

interface IntegrityBannerProps {
  onOpenBackup: () => void;
}

export function IntegrityBanner({ onOpenBackup }: IntegrityBannerProps) {
  const storage = useStorage();
  const [missingCount, setMissingCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const report = await runIntegrityCheck(storage);
        if (!cancelled) {
          setMissingCount(report.missingFiles.length);
          setChecked(true);
        }
      } catch (err) {
        console.error('Integrity check failed:', err);
        if (!cancelled) {
          setChecked(true);
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [storage]);

  if (!checked || missingCount === 0 || dismissed) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Data integrity issue:</span>{' '}
          {missingCount} document {missingCount === 1 ? 'file is' : 'files are'} missing.{' '}
          <button
            onClick={onOpenBackup}
            className="underline font-medium hover:text-amber-900"
          >
            Open Backup & Restore
          </button>{' '}
          to review.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-200 rounded transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <X className="w-4 h-4 text-amber-600" />
      </button>
    </div>
  );
}
