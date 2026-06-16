type Language = 'en' | 'es';

const dictionaries = {
  en: {
    dashboard_title: 'Shipment Dashboard',
    freight_calculator: 'Freight Calculator',
    carrier: 'Carrier',
    origin: 'Origin Port',
    destination: 'Destination Port',
    status_booked: 'Booked',
    settings: 'Settings',
    doc_generator: 'B/L Generator',
    shipper: 'Shipper',
    consignee: 'Consignee',
    cargo_details: 'Cargo Details',
    generate_bl: 'Generate Bill of Lading',
    shipment_ref: 'Shipment Reference',
    process_modeler: 'BPMN Process Modeler',
    deploy_process: 'Deploy to Zeebe',
    download_xml: 'Download XML'
  },
  es: {
    dashboard_title: 'Panel de Embarques',
    freight_calculator: 'Cotizador de Fletes',
    carrier: 'Transportista',
    origin: 'Puerto de Origen',
    destination: 'Puerto de Destino',
    status_booked: 'Reservado',
    settings: 'Ajustes',
    doc_generator: 'Generador de B/L',
    shipper: 'Expedidor (Shipper)',
    consignee: 'Consignatario (Consignee)',
    cargo_details: 'Detalles de Carga',
    generate_bl: 'Generar Bill of Lading',
    shipment_ref: 'Referencia de Embarque',
    process_modeler: 'Modelador de Procesos BPMN',
    deploy_process: 'Desplegar en Zeebe',
    download_xml: 'Descargar XML'
  }
};

class I18nService {
  private currentLanguage: Language = 'en';
  private subscribers: (() => void)[] = [];

  setLanguage(lang: Language) {
    this.currentLanguage = lang;
    this.notifySubscribers();
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  t(key: keyof typeof dictionaries['en']): string {
    return dictionaries[this.currentLanguage][key] || key;
  }

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }
}

export const i18n = new I18nService();