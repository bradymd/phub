import { useState, useEffect } from 'react';
import { useStorage, useDataVersion } from '../contexts/StorageContext';

// Check if date is in the past
const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Check if date is within 30 days (in the future)
const isDueSoon = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(today);
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
  dental: ReminderCounts;
  pets: ReminderCounts;
  holidayplans: ReminderCounts;
}

const emptyReminders: PanelReminders = {
  property: { overdue: 0, dueSoon: 0 },
  vehicles: { overdue: 0, dueSoon: 0 },
  health: { overdue: 0, dueSoon: 0 },
  dental: { overdue: 0, dueSoon: 0 },
  pets: { overdue: 0, dueSoon: 0 },
  holidayplans: { overdue: 0, dueSoon: 0 },
};

export function useReminders(): PanelReminders {
  const storage = useStorage();
  const { dataVersion } = useDataVersion();
  const [reminders, setReminders] = useState<PanelReminders>(emptyReminders);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        // Deep copy to avoid mutation issues with React StrictMode
        const newReminders: PanelReminders = {
          property: { overdue: 0, dueSoon: 0 },
          vehicles: { overdue: 0, dueSoon: 0 },
          health: { overdue: 0, dueSoon: 0 },
          dental: { overdue: 0, dueSoon: 0 },
          pets: { overdue: 0, dueSoon: 0 },
          holidayplans: { overdue: 0, dueSoon: 0 },
        };

        // Load property data
        try {
          const properties = await storage.get('properties');
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
          const vehicles = await storage.get('vehicles');
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
            // Check tax due date
            if (vehicle.taxDueDate) {
              if (isPastDate(vehicle.taxDueDate)) {
                newReminders.vehicles.overdue++;
              } else if (isDueSoon(vehicle.taxDueDate)) {
                newReminders.vehicles.dueSoon++;
              }
            }
            // Check next service due from most recent service entry
            const serviceHistory = vehicle.serviceHistory || [];
            if (serviceHistory.length > 0) {
              // Find the most recent service entry that has a nextServiceDate
              const entriesWithNextDate = serviceHistory
                .filter((entry: any) => entry.nextServiceDate)
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
              if (entriesWithNextDate.length > 0) {
                const nextServiceDate = entriesWithNextDate[0].nextServiceDate;
                if (isPastDate(nextServiceDate)) {
                  newReminders.vehicles.overdue++;
                } else if (isDueSoon(nextServiceDate)) {
                  newReminders.vehicles.dueSoon++;
                }
              }
            }
          });
        } catch (e) {
          // Vehicles store might not exist yet
        }

        // Load medical records
        try {
          const records = await storage.get('medical_history');
          records.forEach((record: any) => {
            // Check for upcoming appointments (date is in the future within 30 days)
            if (record.date && isDueSoon(record.date)) {
              newReminders.health.dueSoon++;
            }
            // Check for follow-up dates
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

        // Load dental records
        try {
          const dentalRecords = await storage.get('dental_records');
          dentalRecords.forEach((record: any) => {
            // Check for upcoming appointments (date is in the future within 30 days)
            if (record.date && isDueSoon(record.date)) {
              newReminders.dental.dueSoon++;
            }
            // Check for next appointment dates
            if (record.nextAppointmentDate) {
              if (isPastDate(record.nextAppointmentDate)) {
                newReminders.dental.overdue++;
              } else if (isDueSoon(record.nextAppointmentDate)) {
                newReminders.dental.dueSoon++;
              }
            }
          });
        } catch (e) {
          // Dental records store might not exist yet
        }

        // Load pet records
        try {
          const pets = await storage.get('pets');
          pets.forEach((pet: any) => {
            // Check vaccination booster due dates
            (pet.vaccinations || []).forEach((vax: any) => {
              if (vax.nextDueDate) {
                if (isPastDate(vax.nextDueDate)) {
                  newReminders.pets.overdue++;
                } else if (isDueSoon(vax.nextDueDate)) {
                  newReminders.pets.dueSoon++;
                }
              }
            });
            // Check insurance renewal
            if (pet.insurance?.renewalDate) {
              if (isPastDate(pet.insurance.renewalDate)) {
                newReminders.pets.overdue++;
              } else if (isDueSoon(pet.insurance.renewalDate)) {
                newReminders.pets.dueSoon++;
              }
            }
            // Check vet visit follow-ups
            (pet.vetVisits || []).forEach((visit: any) => {
              if (visit.followUpDate) {
                if (isPastDate(visit.followUpDate)) {
                  newReminders.pets.overdue++;
                } else if (isDueSoon(visit.followUpDate)) {
                  newReminders.pets.dueSoon++;
                }
              }
            });
          });
        } catch (e) {
          // Pets store might not exist yet
        }

        // Load holiday plans
        try {
          const holidays = await storage.get('holiday_plans');
          holidays.forEach((holiday: any) => {
            // Check if holiday starts soon (within 30 days)
            // Don't mark past holidays as "overdue" - they're just history
            if (holiday.startDate && isDueSoon(holiday.startDate)) {
              newReminders.holidayplans.dueSoon++;
            }
          });
        } catch (e) {
          // Holiday plans store might not exist yet
        }

        setReminders(newReminders);
      } catch (err) {
        console.error('Error loading reminders:', err);
      }
    };

    loadReminders();
  }, [storage, dataVersion]);

  return reminders;
}
