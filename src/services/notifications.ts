/**
 * Notification Service
 * Checks for upcoming dates and shows system notifications
 */

export interface UpcomingItem {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  date: string;
  daysUntil: number;
  description: string;
  contactInfo?: string;
}

/**
 * Calculate days until a date
 */
export function daysUntilDate(dateString: string): number {
  if (!dateString) return Infinity;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if Electron notifications are available
 */
export function canShowNotifications(): boolean {
  return typeof window !== 'undefined' &&
         'electronAPI' in window &&
         'Notification' in window &&
         Notification.permission === 'granted';
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show a system notification
 */
export function showNotification(title: string, body: string, onClick?: () => void): void {
  if (!canShowNotifications()) {
    console.log('Notifications not available');
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: undefined, // Could add app icon path
    silent: false,
  });

  if (onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
    };
  }
}

/**
 * Scan all data for upcoming dates
 * Returns items due within the specified number of days
 */
export async function getUpcomingItems(
  storage: any,
  withinDays: number = 30
): Promise<UpcomingItem[]> {
  const upcoming: UpcomingItem[] = [];

  try {
    // Check Vehicles
    const vehicles = await storage.getAll('vehicles') || [];
    for (const vehicle of vehicles) {
      // MOT due
      if (vehicle.motDueDate) {
        const days = daysUntilDate(vehicle.motDueDate);
        if (days >= 0 && days <= withinDays) {
          upcoming.push({
            id: `vehicle-mot-${vehicle.id}`,
            title: `MOT Due: ${vehicle.registration}`,
            category: 'Vehicles',
            categoryIcon: '🚗',
            date: vehicle.motDueDate,
            daysUntil: days,
            description: `${vehicle.make} ${vehicle.model} MOT expires`,
            contactInfo: vehicle.breakdownContact,
          });
        }
      }

      // Tax due
      if (vehicle.taxDueDate) {
        const days = daysUntilDate(vehicle.taxDueDate);
        if (days >= 0 && days <= withinDays) {
          upcoming.push({
            id: `vehicle-tax-${vehicle.id}`,
            title: `Road Tax Due: ${vehicle.registration}`,
            category: 'Vehicles',
            categoryIcon: '🚗',
            date: vehicle.taxDueDate,
            daysUntil: days,
            description: `${vehicle.make} ${vehicle.model} road tax expires`,
          });
        }
      }

      // Insurance renewal
      if (vehicle.insuranceRenewalDate) {
        const days = daysUntilDate(vehicle.insuranceRenewalDate);
        if (days >= 0 && days <= withinDays) {
          upcoming.push({
            id: `vehicle-insurance-${vehicle.id}`,
            title: `Insurance Renewal: ${vehicle.registration}`,
            category: 'Vehicles',
            categoryIcon: '🚗',
            date: vehicle.insuranceRenewalDate,
            daysUntil: days,
            description: `${vehicle.insurer || 'Vehicle'} insurance renewal`,
            contactInfo: vehicle.insurer,
          });
        }
      }

      // Service history - next service date
      if (vehicle.serviceHistory) {
        for (const service of vehicle.serviceHistory) {
          if (service.nextServiceDate) {
            const days = daysUntilDate(service.nextServiceDate);
            if (days >= 0 && days <= withinDays) {
              upcoming.push({
                id: `vehicle-service-${vehicle.id}-${service.id}`,
                title: `Service Due: ${vehicle.registration}`,
                category: 'Vehicles',
                categoryIcon: '🚗',
                date: service.nextServiceDate,
                daysUntil: days,
                description: `${service.type} service at ${service.garage || 'garage'}`,
                contactInfo: service.garage,
              });
            }
          }
        }
      }
    }

    // Check Properties
    const properties = await storage.getAll('properties') || [];
    for (const property of properties) {
      // Insurance renewal
      if (property.insuranceRenewalDate) {
        const days = daysUntilDate(property.insuranceRenewalDate);
        if (days >= 0 && days <= withinDays) {
          upcoming.push({
            id: `property-insurance-${property.id}`,
            title: `Home Insurance Renewal`,
            category: 'Property',
            categoryIcon: '🏠',
            date: property.insuranceRenewalDate,
            daysUntil: days,
            description: `${property.address} - ${property.insuranceCompany || 'Insurance'} renewal`,
            contactInfo: property.insuranceCompany,
          });
        }
      }

      // Maintenance items (gas, aircon, alarm, etc.)
      if (property.maintenanceItems) {
        for (const item of property.maintenanceItems) {
          if (item.nextDueDate) {
            const days = daysUntilDate(item.nextDueDate);
            if (days >= 0 && days <= withinDays) {
              upcoming.push({
                id: `property-maintenance-${property.id}-${item.id}`,
                title: `${item.name} Due`,
                category: 'Property',
                categoryIcon: '🏠',
                date: item.nextDueDate,
                daysUntil: days,
                description: `${property.address} - ${item.company || item.name}`,
                contactInfo: item.company || item.contactDetails,
              });
            }
          }
        }
      }
    }

    // Check Medical appointments/tests
    const medicalRecords = await storage.getAll('medicalHistory') || [];
    for (const record of medicalRecords) {
      // Check if it's a future appointment/test
      if (record.date) {
        const days = daysUntilDate(record.date);
        if (days >= 0 && days <= withinDays) {
          upcoming.push({
            id: `medical-${record.id}`,
            title: `Medical: ${record.type || record.condition || 'Appointment'}`,
            category: 'Medical',
            categoryIcon: '🏥',
            date: record.date,
            daysUntil: days,
            description: record.description || record.notes || 'Medical appointment',
            contactInfo: record.provider || record.doctor,
          });
        }
      }
    }

    // Sort by days until (soonest first)
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

    return upcoming;
  } catch (err) {
    console.error('Error scanning for upcoming items:', err);
    return [];
  }
}

/**
 * Check and show notifications for items due soon
 * Typically called on app startup
 */
export async function checkAndNotify(
  storage: any,
  urgentDays: number = 7
): Promise<number> {
  const items = await getUpcomingItems(storage, urgentDays);

  if (items.length === 0) return 0;

  // Group by urgency
  const overdue = items.filter(i => i.daysUntil < 0);
  const today = items.filter(i => i.daysUntil === 0);
  const thisWeek = items.filter(i => i.daysUntil > 0 && i.daysUntil <= 7);

  // Show summary notification
  if (overdue.length > 0) {
    showNotification(
      `⚠️ ${overdue.length} Overdue Items`,
      overdue.slice(0, 3).map(i => i.title).join('\n')
    );
  } else if (today.length > 0) {
    showNotification(
      `📅 ${today.length} Items Due Today`,
      today.slice(0, 3).map(i => i.title).join('\n')
    );
  } else if (thisWeek.length > 0) {
    showNotification(
      `📋 ${thisWeek.length} Items Due This Week`,
      thisWeek.slice(0, 3).map(i => i.title).join('\n')
    );
  }

  return items.length;
}
