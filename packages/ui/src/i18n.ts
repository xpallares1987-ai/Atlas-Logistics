import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Spanish and English Freight Forwarding Terms
const resources = {
  en: {
    translation: {
      shipments: "Shipments",
      analytics: "Analytics",
      market_rates: "Market Rates",
      freight_comparer: "Freight Comparer",
      book_now: "Book Now",
      booked: "Booked",
      average_rate: "Average Rate",
      cheapest_route: "Cheapest Route",
      surcharge_avg: "Surcharge Avg %",
      surcharges: "Surcharges",
      total_net: "Total Net",
    },
  },
  es: {
    translation: {
      shipments: "Embarques",
      analytics: "Analíticas",
      market_rates: "Tarifas de Mercado",
      freight_comparer: "Comparador de Fletes",
      book_now: "Reservar Ahora",
      booked: "Reservado",
      average_rate: "Tarifa Promedio",
      cheapest_route: "Ruta Más Económica",
      surcharge_avg: "Promedio Recargos %",
      surcharges: "Recargos",
      total_net: "Total Neto",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
