export class TicketResponseDto {
  _id!: string;
  caseNumber!: string;
  incidentType!: string;
  subject!: string;
  networkCategory!: string;
  description?: string;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
