/**
 * Minimal shapes of stored records as read by the reminder aggregator
 * (useReminders). Panels own the full interfaces; these describe only
 * the fields the aggregator touches, so a renamed field becomes a build
 * error here instead of silently dropping alerts.
 */

export interface PropertyReminderSource {
  maintenanceItems?: { nextDueDate?: string }[];
  insuranceRenewalDate?: string;
  maintenanceHistory?: { date?: string }[];
}

export interface VehicleReminderSource {
  status?: 'active' | 'on_order' | 'archived';
  motDueDate?: string;
  insuranceRenewalDate?: string;
  taxDueDate?: string;
  serviceHistory?: { date: string; nextServiceDate?: string }[];
}

export interface MedicalRecordReminderSource {
  date?: string;
  followUpDate?: string;
}

export interface DentalRecordReminderSource {
  date?: string;
  nextAppointmentDate?: string;
}

export interface PetReminderSource {
  vaccinations?: { nextDueDate?: string }[];
  insurance?: { renewalDate?: string };
  vetVisits?: { followUpDate?: string }[];
}

export interface HolidayPlanReminderSource {
  startDate?: string;
  accommodation?: {
    balanceDue?: number;
    balanceDueDate?: string;
    balancePaidDate?: string;
  }[];
}
