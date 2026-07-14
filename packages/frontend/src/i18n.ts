import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      sidebar: {
        dashboard: 'Dashboard',
        rateComparer: 'Rate Comparer',
        pricing: 'Dynamic Pricing',
        globeTracker: 'Globe Tracker',
        schedules: 'Sailing Schedules',
        bookings: 'Booking & B/L',
        invoicing: 'Invoicing',
        customs: 'Customs Clearance',
        profitability: 'Profitability',
        carbonTracker: 'Carbon Tracker',
        demurrage: 'Demurrage Alerts',
        planner: 'Container Planner',
        lclEngine: 'LCL Engine',
        warehouse: 'Warehouse 3D',
        tasklist: 'Tasklist',
        documents: 'Document Vault',
        aiAssistant: 'AI Assistant',
        customerPortal: 'Customer Portal',
        settings: 'Settings'
      },
      settings: {
        title: 'Settings',
        description: 'Manage your account, team preferences, and system integrations.',
        profile: 'Profile Preferences',
        company: 'Company Settings',
        security: 'Security & Access',
        apiKeys: 'API Keys & Webhooks',
        notifications: 'Notification Rules',
        appearance: 'Appearance',
        devices: 'Active Devices',
        signOut: 'Sign out of all devices',
        language: 'Language',
        theme: 'Interface Theme',
        density: 'Density'
      }
    }
  },
  es: {
    translation: {
      sidebar: {
        dashboard: 'Panel Principal',
        rateComparer: 'Comparador de Tarifas',
        pricing: 'Precios Dinámicos',
        globeTracker: 'Rastreo Global',
        schedules: 'Itinerarios Marítimos',
        bookings: 'Reservas y B/L',
        invoicing: 'Facturación',
        customs: 'Despacho de Aduanas',
        profitability: 'Rentabilidad',
        carbonTracker: 'Rastreador de Carbono',
        demurrage: 'Alertas de Demora',
        planner: 'Planificador de Contenedores',
        lclEngine: 'Motor LCL',
        warehouse: 'Almacén 3D',
        tasklist: 'Lista de Tareas',
        documents: 'Bóveda de Documentos',
        aiAssistant: 'Asistente IA',
        customerPortal: 'Portal de Clientes',
        settings: 'Configuración'
      },
      settings: {
        title: 'Configuración',
        description: 'Administra tu cuenta, preferencias de equipo e integraciones.',
        profile: 'Preferencias de Perfil',
        company: 'Configuración de Empresa',
        security: 'Seguridad y Acceso',
        apiKeys: 'Claves API y Webhooks',
        notifications: 'Reglas de Notificación',
        appearance: 'Apariencia',
        devices: 'Dispositivos Activos',
        signOut: 'Cerrar sesión en todos los dispositivos',
        language: 'Idioma',
        theme: 'Tema de la Interfaz',
        density: 'Densidad'
      }
    }
  },
  de: {
    translation: {
      sidebar: {
        dashboard: 'Instrumententafel',
        rateComparer: 'Tarifvergleich',
        pricing: 'Dynamische Preisgestaltung',
        globeTracker: 'Globales Tracking',
        schedules: 'Fahrpläne',
        bookings: 'Buchungen & B/L',
        invoicing: 'Rechnungsstellung',
        customs: 'Zollabfertigung',
        profitability: 'Rentabilität',
        carbonTracker: 'CO2-Tracker',
        demurrage: 'Liegegeld-Warnungen',
        planner: 'Container-Planer',
        lclEngine: 'LCL-Motor',
        warehouse: '3D-Lager',
        tasklist: 'Aufgabenliste',
        documents: 'Dokumententresor',
        aiAssistant: 'KI-Assistent',
        customerPortal: 'Kundenportal',
        settings: 'Einstellungen'
      },
      settings: {
        title: 'Einstellungen',
        description: 'Verwalten Sie Ihr Konto, Teampräferenzen und Systemintegrationen.',
        profile: 'Profil-Präferenzen',
        company: 'Unternehmenseinstellungen',
        security: 'Sicherheit & Zugang',
        apiKeys: 'API-Schlüssel & Webhooks',
        notifications: 'Benachrichtigungsregeln',
        appearance: 'Erscheinungsbild',
        devices: 'Aktive Geräte',
        signOut: 'Auf allen Geräten abmelden',
        language: 'Sprache',
        theme: 'Schnittstellenthema',
        density: 'Dichte'
      }
    }
  },
  fr: {
    translation: {
      sidebar: {
        dashboard: 'Tableau de bord',
        rateComparer: 'Comparateur de Taux',
        pricing: 'Tarification Dynamique',
        globeTracker: 'Suivi Global',
        schedules: 'Horaires Maritimes',
        bookings: 'Réservations & B/L',
        invoicing: 'Facturation',
        customs: 'Dédouanement',
        profitability: 'Rentabilité',
        carbonTracker: 'Suivi Carbone',
        demurrage: 'Alertes Surestaries',
        planner: 'Planificateur de Conteneurs',
        lclEngine: 'Moteur LCL',
        warehouse: 'Entrepôt 3D',
        tasklist: 'Liste des Tâches',
        documents: 'Coffre-fort à Documents',
        aiAssistant: 'Assistant IA',
        customerPortal: 'Portail Client',
        settings: 'Paramètres'
      },
      settings: {
        title: 'Paramètres',
        description: 'Gérez votre compte, les préférences de votre équipe et les intégrations système.',
        profile: 'Préférences du Profil',
        company: 'Paramètres de l\'Entreprise',
        security: 'Sécurité & Accès',
        apiKeys: 'Clés API & Webhooks',
        notifications: 'Règles de Notification',
        appearance: 'Apparence',
        devices: 'Appareils Actifs',
        signOut: 'Se déconnecter de tous les appareils',
        language: 'Langue',
        theme: 'Thème de l\'interface',
        density: 'Densité'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
