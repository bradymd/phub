import React, { useState } from 'react';
import { showOpenDialog, readTextFile } from '../../utils/file-system';
import { createStorageService } from '../../services/storage';

interface ImportWizardProps {
  masterPassword: string;
  onImportComplete: () => void;
}

interface ImportProgress {
  current: string;
  total: number;
  completed: number;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({ masterPassword, onImportComplete }) => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      setProgress(null);

      // Open file dialog to select backup file
      const selectedResult = await showOpenDialog({
        multiple: false,
        filters: [{
          name: 'JSON Backup',
          extensions: ['json']
        }]
      });

      if (!selectedResult) {
        setImporting(false);
        return;
      }

      // Extract single file path
      const selected = typeof selectedResult === 'string' ? selectedResult : selectedResult[0];

      // Read the file
      const fileContent = await readTextFile(selected);
      const backupData = JSON.parse(fileContent);

      if (!backupData.data) {
        throw new Error('Invalid backup file format. Missing "data" field.');
      }

      const data = backupData.data;
      const storage = createStorageService(masterPassword);

      // Data keys to import
      const dataKeys = [
        'virtual_street_encrypted',
        'contacts_encrypted',
        'employment_records_encrypted',
        'finance_items_encrypted',
        'pensions_encrypted',
        'budget_items_encrypted',
        'medical_history_encrypted',
        'education_records_encrypted',
        'documents_certificates_encrypted',
        'certificates_encrypted',
        'photos_encrypted'
      ];

      const totalKeys = dataKeys.filter(key => data[key]).length;
      let completed = 0;

      const errors: string[] = [];

      for (const key of dataKeys) {
        if (data[key]) {
          const keyName = key.replace('_encrypted', '');
          setProgress({ current: keyName, total: totalKeys, completed });

          try {
            // Parse the encrypted data
            const encryptedData = JSON.parse(data[key]);

            // Import into storage - the storage service will handle decryption and re-encryption
            // For now, we'll write the encrypted data directly
            const storageKey = keyName.replace(/_/g, '_');

            // Decrypt the data from browser storage
            const { decrypt } = await import('../../utils/crypto');
            const decryptedJson = await decrypt(encryptedData, masterPassword);
            const items = JSON.parse(decryptedJson);

            // Save to desktop storage (will re-encrypt with same password)
            await storage.save(storageKey, items);

            completed++;
            setProgress({ current: keyName, total: totalKeys, completed });
          } catch (err) {
            const errorMsg = `Failed to import ${keyName}: ${err instanceof Error ? err.message : String(err)}`;
            console.error(errorMsg, err);
            errors.push(errorMsg);
            // Continue with other keys even if one fails
          }
        }
      }

      // If we had errors, show them
      if (errors.length > 0) {
        throw new Error(`Import completed with errors:\n${errors.join('\n')}`);
      }

      // Import master password hash
      if (data.master_password_hash) {
        localStorage.setItem('master_password_hash', data.master_password_hash);
      }

      setSuccess(true);
      setTimeout(() => {
        onImportComplete();
      }, 2000);

    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const handleSkip = () => {
    onImportComplete();
  };

  if (success) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#2d3748', marginBottom: '10px' }}>Import Successful!</h2>
          <p style={{ color: '#718096' }}>Your data has been imported successfully.</p>
          <p style={{ color: '#718096', fontSize: '14px', marginTop: '10px' }}>
            Location: ~/Documents/PersonalHub/data/
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '600px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ color: '#2d3748', marginBottom: '20px', fontSize: '28px' }}>
          Welcome to Personal Hub Desktop
        </h1>

        {!importing && !progress && (
          <>
            <p style={{ color: '#4a5568', marginBottom: '20px', lineHeight: '1.6' }}>
              This is your first time launching the desktop application.
              Would you like to import your data from a backup file?
            </p>

            <div style={{
              background: '#edf2f7',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#2d3748', marginBottom: '10px', fontSize: '16px' }}>
                What will be imported:
              </h3>
              <ul style={{ color: '#4a5568', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>Virtual High Street (websites & passwords)</li>
                <li>Contacts</li>
                <li>Employment records</li>
                <li>Finance accounts & budget items</li>
                <li>Pensions</li>
                <li>Health records</li>
                <li>Education records</li>
                <li>Certificates & documents</li>
              </ul>
            </div>

            {error && (
              <div style={{
                background: '#fed7d7',
                color: '#c53030',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSkip}
                style={{
                  padding: '12px 24px',
                  background: '#e2e8f0',
                  color: '#2d3748',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Skip for Now
              </button>
              <button
                onClick={handleImport}
                style={{
                  padding: '12px 24px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Import Backup File
              </button>
            </div>
          </>
        )}

        {importing && progress && (
          <div>
            <p style={{ color: '#4a5568', marginBottom: '20px' }}>
              Importing your data...
            </p>
            <div style={{
              background: '#edf2f7',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{ marginBottom: '10px', color: '#2d3748', fontWeight: '500' }}>
                {progress.current.replace(/_/g, ' ')}
              </div>
              <div style={{
                background: '#cbd5e0',
                height: '8px',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#667eea',
                  height: '100%',
                  width: `${(progress.completed / progress.total) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ marginTop: '10px', color: '#718096', fontSize: '14px' }}>
                {progress.completed} of {progress.total} items
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
