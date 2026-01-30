/**
 * Print Utility
 * Prints formatted content from view windows
 */

export interface PrintableField {
  label: string;
  value: string | number | undefined | null;
}

export interface PrintableSection {
  title: string;
  fields: PrintableField[];
}

/**
 * Generate print-friendly HTML
 */
function generatePrintHTML(
  title: string,
  subtitle: string | undefined,
  sections: PrintableSection[],
  notes?: string
): string {
  const fieldsHTML = sections.map(section => {
    const fieldRows = section.fields
      .filter(f => f.value !== undefined && f.value !== null && f.value !== '')
      .map(f => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 35%;">${f.label}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${f.value}</td>
        </tr>
      `).join('');

    if (!fieldRows) return '';

    return `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${section.title}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${fieldRows}
        </table>
      </div>
    `;
  }).join('');

  const notesHTML = notes ? `
    <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
      <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">Notes</h3>
      <p style="white-space: pre-wrap; color: #4b5563; font-size: 14px;">${notes}</p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          .no-print { display: none; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.5;
          color: #1f2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1f2937;">
        <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 4px 0;">${title}</h1>
        ${subtitle ? `<p style="color: #6b7280; margin: 0; font-size: 14px;">${subtitle}</p>` : ''}
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">Printed: ${new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>

      ${fieldsHTML}
      ${notesHTML}

      <div class="no-print" style="margin-top: 32px; text-align: center;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
          Print This Page
        </button>
        <button onclick="window.close()" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-left: 8px;">
          Close
        </button>
      </div>
    </body>
    </html>
  `;
}

/**
 * Open a print preview window with formatted content
 */
export function printRecord(
  title: string,
  subtitle: string | undefined,
  sections: PrintableSection[],
  notes?: string
): void {
  const html = generatePrintHTML(title, subtitle, sections, notes);

  // Open new window for print preview
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Auto-focus for immediate printing if desired
    printWindow.focus();
  }
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '';
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
