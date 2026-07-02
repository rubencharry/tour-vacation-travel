export interface ServiceItem {
  id: string;
  label: string;
}

export const SERVICES_CATALOG: ServiceItem[] = [
  { id: 'vuelo', label: 'Vuelo incluido' },
  { id: 'hotel', label: 'Alojamiento' },
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'pension_completa', label: 'Pensión completa' },
  { id: 'traslados', label: 'Traslados' },
  { id: 'guia', label: 'Guía turístico' },
  { id: 'seguro', label: 'Seguro de viaje' },
  { id: 'excursiones', label: 'Excursiones' },
  { id: 'buceo', label: 'Actividades acuáticas' },
  { id: 'snorkel', label: 'Snorkel' },
  { id: 'spa', label: 'Spa & bienestar' },
  { id: 'kayak', label: 'Kayak / deportes' },
];

export const SERVICE_IDS = SERVICES_CATALOG.map((s) => s.id) as [string, ...string[]];
