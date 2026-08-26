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

  
/*
  
  

  
  

 
  
  */
}

// ✅ GRUPO A — Adicional
export interface ReporteModelGroupA extends ReportPreviewModel {
  totalTickets?: number;
  ticketsResueltosSoporte?: number;
  ticketsEscaladosUnidad?: number;
}

// ✅ GRUPO B — Por servicio
export interface ReporteModelGroupB extends ReportPreviewModel {
  fallasRecurrentes?: { servicio: string; causaRaiz: string; cantidad: number }[];
  tiempoPorServicio?: { title: string; value: number }[];
  incidentesRecurrentes: { servicio: string; value: number }[];
}

// ✅ GRUPO C — Operativos 7x24
export interface ReporteModelGroupC extends ReportPreviewModel {
  ticketsPorOperador?: { name: string; cantidad: number }[];
  promedioPorOperador?: number;
  cantidadOperadores?: number;
}

// ✅ GRUPO D — Calidad y mejora
export interface ReporteModelGroupD extends ReportPreviewModel {
  incidentesMayoresPorMes?: { mes: string; cantidad: number }[];
  tiempoEscalamientoHoras?: number;
  rankingServicios?: { name: string; cantidad: number }[];
  ticketsDetalle?: any[];
}
