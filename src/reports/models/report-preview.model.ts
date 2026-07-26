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
}
