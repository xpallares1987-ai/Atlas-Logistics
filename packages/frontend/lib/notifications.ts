'use client';

export interface SCMNotification {
  id: string;
  type: 'ETD' | 'ETA' | 'CUSTOMS' | 'BOOKING' | 'GENERAL';
  title: string;
  description: string;
  shipmentRef?: string;
  date: string;
  read: boolean;
}

export interface NotificationPreferences {
  etdEnabled: boolean;
  etaEnabled: boolean;
  customsEnabled: boolean;
  bookingEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  emailAddress: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  etdEnabled: true,
  etaEnabled: true,
  customsEnabled: true,
  bookingEnabled: true,
  emailNotifications: true,
  pushNotifications: true,
  emailAddress: 'x.pallares1987@gmail.com'
};

const DEFAULT_NOTIFICATIONS: SCMNotification[] = [
  {
    id: 'notif-1',
    type: 'CUSTOMS',
    title: 'Aduana Despachada exitosamente',
    description: 'El contenedor de importación HLXU1100223 en el flete FWD-2026-004 ha completado el despacho de aduanas en Barcelona (ESBCN) y cuenta con autorización de levante.',
    shipmentRef: 'FWD-2026-004',
    date: '2026-06-15T15:20:00Z',
    read: false
  },
  {
    id: 'notif-2',
    type: 'ETA',
    title: 'Alerta de Demora Marítima (ETA Demorado)',
    description: 'El buque CMA CGM asignado al embarque HAZMAT FWD-2026-003 ha sido demorado debido a congestión de descarga en puerto ESBCN.',
    shipmentRef: 'FWD-2026-003',
    date: '2026-06-14T10:15:00Z',
    read: false
  },
  {
    id: 'notif-3',
    type: 'BOOKING',
    title: 'Booking Confirmado con Air France',
    description: 'El espacio aéreo de alta prioridad para portátiles (FWD-2026-005) ha sido reservado y confirmado.',
    shipmentRef: 'FWD-2026-005',
    date: '2026-06-14T08:30:00Z',
    read: true
  }
];

export function getPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  const saved = localStorage.getItem('forwarderos_notification_prefs');
  if (saved) {
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(prefs: NotificationPreferences) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('forwarderos_notification_prefs', JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent('forwarderos_prefs_changed', { detail: prefs }));
}

export function getNotifications(): SCMNotification[] {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  const saved = localStorage.getItem('forwarderos_notifications_list');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  }
  localStorage.setItem('forwarderos_notifications_list', JSON.stringify(DEFAULT_NOTIFICATIONS));
  return DEFAULT_NOTIFICATIONS;
}

export function triggerScmNotification(
  type: 'ETD' | 'ETA' | 'CUSTOMS' | 'BOOKING' | 'GENERAL',
  title: string,
  description: string,
  shipmentRef?: string
): boolean {
  if (typeof window === 'undefined') return false;
  
  const prefs = getPreferences();
  
  // Check if this notification category is enabled in user settings
  if (type === 'ETD' && !prefs.etdEnabled) return false;
  if (type === 'ETA' && !prefs.etaEnabled) return false;
  if (type === 'CUSTOMS' && !prefs.customsEnabled) return false;
  if (type === 'BOOKING' && !prefs.bookingEnabled) return false;

  const list = getNotifications();
  const newNotif: SCMNotification = {
    id: `notif-${Date.now()}`,
    type,
    title,
    description,
    shipmentRef,
    date: new Date().toISOString(),
    read: false
  };

  const updatedList = [newNotif, ...list];
  localStorage.setItem('forwarderos_notifications_list', JSON.stringify(updatedList));

  // Dispatch custom browser event so AppLayout can update badge and trigger dynamic Toast
  window.dispatchEvent(new CustomEvent('forwarderos_new_notification', { detail: newNotif }));

  // Simulate Email Dispatch if email notification toggle is set
  if (prefs.emailNotifications && prefs.emailAddress) {
    console.log(`%c[SCM Mail Delivery] Simulación de correo enviado exitosamente a: ${prefs.emailAddress}\nAsunto: [ForwarderOS Alert] ${title}\nContenido: ${description}`, 'color: #10b981; font-weight: bold;');
    
    // Create custom event for layout notification toast to display email sent message
    window.dispatchEvent(new CustomEvent('forwarderos_email_sent', { 
      detail: { to: prefs.emailAddress, subject: title } 
    }));
  }

  return true;
}

export function markAllAsRead() {
  if (typeof window === 'undefined') return;
  const list = getNotifications();
  const updated = list.map(n => ({ ...n, read: true }));
  localStorage.setItem('forwarderos_notifications_list', JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('forwarderos_notifications_changed'));
}

export function clearAllNotifications() {
  if (typeof window === 'undefined') return;
  localStorage.setItem('forwarderos_notifications_list', JSON.stringify([]));
  window.dispatchEvent(new CustomEvent('forwarderos_notifications_changed'));
}
