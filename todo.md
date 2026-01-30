# Personal Hub - Development Notes

## Recently Completed

### January 2026 - Session Work

**Property Maintenance History** ✓
- Added maintenance history for completed work (decorator, plumber, electrician, etc.)
- Fields: date, type, description, cost, company/person, contact details, notes, documents
- View modal with print functionality
- Notes field uses larger textarea

**Vehicle Service Reminders** ✓
- Next service due date now shows in Key Dates section
- Service due dates included in reminder system (main panel badges)
- Tax due date added to reminders (was missing)

**Medical Appointments** ✓
- Appointment dates trigger reminders when in future (within 30 days)
- Follow-up dates supported
- Orange badges for upcoming, red for overdue
- Reminders ripple up to main panel

**Edit Functionality Fixes** ✓
- Fixed edit not working in list view for Employment, Pensions, Finance panels

**UI Improvements** ✓
- UK date format (DD-MM-YYYY) throughout
- Kakeibo: "Savings Target" replaces "Projected Savings"
- Vehicle print: Recovery Contact now included

---

## Next Up: Dental Panel

**User Requirements:**
- Dentist Surgery (practice name)
- Dentist's name
- Patient name (who the appointment is for - can vary: self, child, spouse)
- Appointment type: checkup, hygienist, treatment, emergency
- Cost (usually covered by direct debit plan, but field for additional work)
- Appointment date - **critical for reminders**
- Documents (receipts, treatment plans)
- Notes

**Data Model (draft):**
```typescript
interface DentalRecord {
  id: string;
  // Practice details
  surgeryName: string;
  surgeryAddress?: string;
  surgeryPhone?: string;

  // Dentist
  dentistName: string;

  // Appointment
  patientName: string;  // Who the appointment is for
  date: string;
  type: 'checkup' | 'hygienist' | 'treatment' | 'emergency' | 'other';
  description?: string;

  // Costs
  cost: number;
  paymentMethod?: 'plan' | 'direct' | 'insurance';

  // Documents & Notes
  documents?: DocumentReference[];
  notes?: string;
}
```

**Reminder Logic:**
- Future appointment dates within 30 days → dueSoon badge
- Overdue appointments (past date, not marked complete?) → overdue badge

**Panel Config:**
```typescript
{
  id: 'dental',
  title: 'Dental',
  icon: ???,  // Need to find suitable icon - maybe Smile or custom
  description: 'Dental appointments, hygienist visits, and treatment records',
  group: 'core',  // or 'lifestyle'?
  defaultVisible: false,  // Niche - opt-in
  region: 'global',
  tags: ['dentist', 'teeth', 'hygienist', 'checkup'],
}
```

---

## PDF Viewing - Reference

Large PDFs need Blob URLs, not data URLs (Chromium limitation):

```typescript
const dataUrlToBlobUrl = (dataUrl: string): string => {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'application/pdf';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  const blob = new Blob([array], { type: mimeType });
  return URL.createObjectURL(blob);
};
```

---

## Document Viewer Consistency

All panels should use:
- Dark header (#1a1a1a) with white text
- Download icon button (white, hover:bg-white/10)
- X close button (white, hover:bg-white/10)
- Full-screen dark overlay

---

## Future Panel Ideas

From docs/PANEL_PLUGIN_ARCHITECTURE.md:
- Subscriptions (recurring services, renewal dates)
- Warranties (product warranties, expiry tracking)
- Pets (vet visits, vaccinations, insurance)
- Travel (bookings, itineraries)
- Gardening (plants, care schedules)

---

*Last updated: January 2026*
