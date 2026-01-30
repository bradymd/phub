import { useState, useEffect } from 'react';
import { useStorage } from '../contexts/StorageContext';

// Check if date is in the past
const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Check if date is within 30 days
const isDueSoon = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(today.getDate() + 30);
  return date >= today && date <= thirtyDays;
};

export interface ReminderCounts {
  overdue: number;
  dueSoon: number;
}

export interface PanelReminders {
  property: ReminderCounts;
  vehicles: ReminderCounts;
  health: ReminderCounts;
}

const emptyReminders: PanelReminders = {
  property: { overdue: 0, dueSoon: 0 },
  vehicles: { overdue: 0, dueSoon: 0 },
  health: { overdue: 0, dueSoon: 0 },
};

export function useReminders(): PanelReminders {
  const storage = useStorage();
  const [reminders, setReminders] = useState<PanelReminders>(emptyReminders);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        const newReminders: PanelReminders = { ...emptyReminders };

        // Load property data
        try {
          const properties = await storage.getAll('properties');
          properties.forEach((property: any) => {
            // Check maintenance items
            (property.maintenanceItems || []).forEach((item: any) => {
              if (item.nextDueDate) {
                if (isPastDate(item.nextDueDate)) {
                  newReminders.property.overdue++;
                } else if (isDueSoon(item.nextDueDate)) {
                  newReminders.property.dueSoon++;
                }
              }
            });
            // Check insurance renewal
            if (property.insuranceRenewalDate) {
              if (isPastDate(property.insuranceRenewalDate)) {
                newReminders.property.overdue++;
              } else if (isDueSoon(property.insuranceRenewalDate)) {
                newReminders.property.dueSoon++;
              }
            }
          });
        } catch (e) {
          // Property store might not exist yet
        }

        // Load vehicle data
        try {
          const vehicles = await storage.getAll('vehicles');
          vehicles.forEach((vehicle: any) => {
            // Check MOT due date
            if (vehicle.motDueDate) {
              if (isPastDate(vehicle.motDueDate)) {
                newReminders.vehicles.overdue++;
              } else if (isDueSoon(vehicle.motDueDate)) {
                newReminders.vehicles.dueSoon++;
              }
            }
            // Check insurance renewal
            if (vehicle.insuranceRenewalDate) {
              if (isPastDate(vehicle.insuranceRenewalDate)) {
                newReminders.vehicles.overdue++;
              } else if (isDueSoon(vehicle.insuranceRenewalDate)) {
                newReminders.vehicles.dueSoon++;
              }
            }
          });
        } catch (e) {
          // Vehicles store might not exist yet
        }

        // Load medical records
        try {
          const records = await storage.getAll('medical_records');
          records.forEach((record: any) => {
            if (record.followUpDate) {
              if (isPastDate(record.followUpDate)) {
                newReminders.health.overdue++;
              } else if (isDueSoon(record.followUpDate)) {
                newReminders.health.dueSoon++;
              }
            }
          });
        } catch (e) {
          // Medical records store might not exist yet
        }

        setReminders(newReminders);
      } catch (err) {
        console.error('Error loading reminders:', err);
      }
    };

    loadReminders();
  }, [storage]);

  return reminders;
}
