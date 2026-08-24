export interface KpiCardModel {
  title: string;
  value: string;
  color: string;
  subtitle?: string;
}

export interface ReportPreviewModel {
  cards: KpiCardModel[];
  mttrPlataforma?: { title: string; value: number }[];
  mttrServicio?: { title: string; value: number }[];
  

  fallasRecurrentes?: {
    servicio: string;
    causaRaiz: string;
    cantidad: number;
  }[];
  tiempoPorServicio?: { title: string; value: number }[];


  ticketsPorOperador?: { name: string; cantidad: number }[];
  promedioPorOperador?: number;
  cantidadOperadores?: number;
  
 
  incidentesMayoresPorMes?: { mes: string; cantidad: number }[];
  tiempoEscalamientoHoras?: number;
  rankingServicios?: { name: string; cantidad: number }[];
}