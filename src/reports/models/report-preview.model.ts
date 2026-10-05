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
  ticketsDetalle?: any[];
}

// ✅ GRUPO B — Por servicio
export interface ReporteModelGroupB extends ReportPreviewModel {
  fallasRecurrentes?: { servicio: string; causaRaiz: string; cantidad: number }[];
  tiempoPorServicio?: { title: string; value: number }[];
  incidentesRecurrentes: { servicio: string; value: number }[];
   totalTickets?: number; 
    ticketsDetalle?: any[];
}

// ✅ GRUPO C — Operativos 7x24
export interface ReporteModelGroupC extends ReportPreviewModel {
  ticketsPorOperador?: { name: string; cantidad: number }[];
  promedioPorOperador?: number;
  cantidadOperadores?: number;
    ticketsDetalle?: any[];
     totalTicketsCerrados?: number;
  totalTicketsActivos?: number;
  totalTicketsGeneral?: number;
  ticketsDia?: number;
  ticketsNoche?: number;
    recibidosDia?: number;
  recibidosNoche?: number;
  cerradosDia?: number;
  cerradosNoche?: number;
}

// ✅ GRUPO D — Calidad y mejora
export interface ReporteModelGroupD extends ReportPreviewModel {
  incidentesMayoresPorMes?: { mes: string; cantidad: number }[];
  tiempoEscalamientoHoras?: number;
  rankingServicios?: { name: string; cantidad: number }[];
  casoMasDemandante?: { name: string; cantidad: number } | null; // ✅ AGREGADO
  totalFallasCriticas?: number; // ✅ AGREGADO
  totalFallasDocumentadas?: number; // ✅ AGREGADO
  ticketsDetalle?: any[];
}
