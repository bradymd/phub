import { useState, useEffect, useCallback } from 'react';
import { useStorage } from '../contexts/StorageContext';

interface PanelUsageRecord {
  panelId: string;
  accessCount: number;
  lastAccessed: string; // ISO timestamp
}

interface PanelUsageData {
  records: PanelUsageRecord[];
}

const STORAGE_KEY = 'panel_usage';

export function usePanelUsage() {
  const storage = useStorage();
  const [usageData, setUsageData] = useState<PanelUsageData>({ records: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load usage data on mount
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const data = await storage.get<PanelUsageData>(STORAGE_KEY);
        if (data.length > 0) {
          setUsageData(data[0]);
        }
        setIsLoaded(true);
      } catch (err) {
        // Storage might not exist yet
        setIsLoaded(true);
      }
    };
    loadUsage();
  }, [storage]);

  // Record a panel access
  const recordPanelAccess = useCallback(async (panelId: string) => {
    if (!panelId) return;

    const now = new Date().toISOString();

    setUsageData(prev => {
      const existingIndex = prev.records.findIndex(r => r.panelId === panelId);
      let newRecords: PanelUsageRecord[];

      if (existingIndex >= 0) {
        // Update existing record
        newRecords = prev.records.map((r, i) =>
          i === existingIndex
            ? { ...r, accessCount: r.accessCount + 1, lastAccessed: now }
            : r
        );
      } else {
        // Add new record
        newRecords = [...prev.records, { panelId, accessCount: 1, lastAccessed: now }];
      }

      const newData = { records: newRecords };

      // Save to storage (fire and forget)
      (async () => {
        try {
          const existing = await storage.get<PanelUsageData>(STORAGE_KEY);
          if (existing.length > 0) {
            await storage.update(STORAGE_KEY, (existing[0] as any).id, newData);
          } else {
            await storage.add(STORAGE_KEY, { ...newData, id: 'usage' });
          }
        } catch (err) {
          console.error('Failed to save panel usage:', err);
        }
      })();

      return newData;
    });
  }, [storage]);

  // Get usage score for a panel (higher = more used)
  const getUsageScore = useCallback((panelId: string): number => {
    const record = usageData.records.find(r => r.panelId === panelId);
    if (!record) return 0;

    // Combine access count with recency
    // More recent access and higher count = higher score
    const daysSinceAccess = record.lastAccessed
      ? (Date.now() - new Date(record.lastAccessed).getTime()) / (1000 * 60 * 60 * 24)
      : 365;

    // Decay factor: recent usage counts more
    // Score = accessCount * decay (where decay is higher for recent access)
    const decayFactor = Math.max(0.1, 1 - (daysSinceAccess / 30)); // Decay over 30 days
    return record.accessCount * decayFactor;
  }, [usageData]);

  return {
    recordPanelAccess,
    getUsageScore,
    isLoaded
  };
}
