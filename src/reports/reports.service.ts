import { Injectable } from '@nestjs/common';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReportPreviewModel } from './models/report-preview.model';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Miscellaneous } from 'src/miscellaneous/entities/miscellaneous.entity';
import { CATEGORIA } from 'src/utils/constants/miscelanious.constants';
import { TICKET_STATUS } from 'src/utils/constants/tickets';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: MongoRepository<Ticket>,
    @InjectRepository(Miscellaneous)
    private readonly miscellaneousRepository: MongoRepository<Miscellaneous>,
  ) {}

  async getPreview(filterDto: ReportFilterDto): Promise<ReportPreviewModel | undefined> {
    const { grupo, plataforma, cliente, mes } = filterDto;
    const query: any = { status: TICKET_STATUS.CERRADO };

    if (mes) {
      const [year, month] = mes.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (plataforma && plataforma !== 'TODAS') {
      query.networkCategory = plataforma;
    }
    if (cliente && cliente !== 'TODOS') {
      query.tipoCliente = cliente;
    }

    const tickets = await this.ticketRepository.find(query as any);
    console.log('📊 [ReportsService] Total tickets encontrados:', tickets.length);

    switch (grupo) {
      case 'A': return this.GrupoA(tickets, filterDto);
      case 'B': return this.GrupoB(tickets);
      case 'C': return this.GrupoC(tickets);
      case 'D': return this.GrupoD(tickets);
      default: return this.GrupoA(tickets, filterDto);
    }
  }

  async GrupoA(tickets: any[], filterDto: ReportFilterDto): Promise<ReportPreviewModel> {
    const { plataforma, cliente, mes } = filterDto;

    const closedFilter: any = { status: TICKET_STATUS.CERRADO };
    if (mes) {
      const [year, month] = mes.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      closedFilter.createdAt = { $gte: startDate, $lte: endDate };
    }
    if (plataforma && plataforma !== 'TODAS') closedFilter.networkCategory = plataforma;
    if (cliente && cliente !== 'TODOS') closedFilter.tipoCliente = cliente;

    const [categoriasRed, tiposCliente] = await Promise.all([
      this.miscellaneousRepository.find({ categoria: CATEGORIA.CATEGORIA_RED }),
      this.miscellaneousRepository.find({ categoria: CATEGORIA.TIPO_CLIENTE }),
    ]);

    const categoryIds = categoriasRed.map((item) => item._id.toString());
    const tipoClienteIds = tiposCliente.map((item) => item._id.toString());

    const [
      incidentesPorPlataforma,
      incidentesPorServicio,
      totalTickets,
      mttrByCategory,
      mttrTipoCliente
    ] = await Promise.all([
      this.ticketRepository.count({ ...closedFilter, networkCategory: { $in: categoryIds } } as any),
      this.ticketRepository.count({ ...closedFilter, tipoCliente: { $in: tipoClienteIds } } as any),
      this.ticketRepository.count(closedFilter as any),
      this.aggregateAverageMttrByField('networkCategory', categoryIds, closedFilter),
      this.aggregateAverageMttrByField('tipoCliente', tipoClienteIds, closedFilter),
    ]);

    const ticketsResueltosSoporte = tickets.filter(t => {
      const escaladoA = (t.escaladoA || '').toString().trim().toUpperCase();
      return escaladoA === 'NO' || escaladoA === '' || !t.escaladoA;
    }).length;

    const ticketsEscaladosUnidad = tickets.filter(t => {
      const escaladoA = (t.escaladoA || '').toString().trim().toUpperCase();
      return escaladoA === 'SI' || (escaladoA !== '' && escaladoA !== 'NO');
    }).length;

    const incidentesPorTipo = this.countByTipoIncidencia(tickets);

    const fallasResueltasEnSoporte = totalTickets > 0
      ? Math.round((ticketsResueltosSoporte / totalTickets) * 10000) / 100
      : 0;

    const mttrPlataforma = this.mapMttrByMiscellaneous(categoriasRed, mttrByCategory);
    const mttrServicio = this.mapMttrByMiscellaneous(tiposCliente, mttrTipoCliente);

    // MTTR Tiempo Medio Plataforma (formateado como Xh Ym)
    const ticketsConMttrPlataforma = tickets.filter(t => t.mttrTotal && t.networkCategory);
    const totalMttrPlataforma = ticketsConMttrPlataforma.reduce((sum, t) => sum + (t.mttrTotal || 0), 0);
    const avgMttrPlataformaMinutos = ticketsConMttrPlataforma.length > 0
      ? Math.round(totalMttrPlataforma / ticketsConMttrPlataforma.length)
      : 0;
    const horasPlataforma = Math.floor(avgMttrPlataformaMinutos / 60);
    const minutosPlataforma = avgMttrPlataformaMinutos % 60;
    const mttrPlataformaFormateado = `${horasPlataforma}h ${minutosPlataforma}m`;

    // MTTR Tiempo Medio Servicio (formateado como Xh Ym)
    const ticketsConMttrServicio = tickets.filter(t => t.mttrTotal && t.tipoCliente);
    const totalMttrServicio = ticketsConMttrServicio.reduce((sum, t) => sum + (t.mttrTotal || 0), 0);
    const avgMttrServicioMinutos = ticketsConMttrServicio.length > 0
      ? Math.round(totalMttrServicio / ticketsConMttrServicio.length)
      : 0;
    const horasServicio = Math.floor(avgMttrServicioMinutos / 60);
    const minutosServicio = avgMttrServicioMinutos % 60;
    const mttrServicioFormateado = `${horasServicio}h ${minutosServicio}m`;

    console.log('📊 [ReportsService] MTTR calculado:', {
      ticketsConMttrPlataforma: ticketsConMttrPlataforma.length,
      minutosPlataforma: avgMttrPlataformaMinutos,
      formateadoPlataforma: mttrPlataformaFormateado,
      ticketsConMttrServicio: ticketsConMttrServicio.length,
      minutosServicio: avgMttrServicioMinutos,
      formateadoServicio: mttrServicioFormateado,
    });

    // ✅ Resolver IDs de misceláneos a nombres legibles
    const miscAll = await this.miscellaneousRepository.find();
    const miscMap = new Map<string, string>();
    miscAll.forEach(m => miscMap.set(m._id.toString(), m.valor));

    // ✅ Construir detalle de tickets para el Excel (con nombres resueltos)
    const ticketsDetalle = tickets.map(t => ({
      caseNumber: t.caseNumber || t.numeroTicket || '',
      tipoIncidencia: Array.isArray((t as any).incidentType) ? (t as any).incidentType[0] : ((t as any).incidentType || t.tipoIncidencia || ''),
      networkCategory: miscMap.get(String(t.networkCategory)) || t.networkCategory || '',
      tipoCliente: miscMap.get(String(t.tipoCliente)) || t.tipoCliente || '',
      city: miscMap.get(String((t as any).city)) || (t as any).city || '',
      estado: (t as any).estado || '',
      horaInicioFalla: (t as any).horaInicioFalla || t.createdAt,
      horaCierre: (t as any).horaCierreFalla || (t as any).horaCierre || (t as any).closedAt || t.updatedAt,
      duracion: t.mttrTotal
        ? `${Math.floor(t.mttrTotal / 60)}h ${t.mttrTotal % 60}m`
        : '0h 0m',
      causaRaiz: miscMap.get(String((t as any).causaRaiz)) || (t as any).causaRaiz || '',
      solucionCaso: miscMap.get(String((t as any).SolucionCaso)) || (t as any).SolucionCaso || '',
      // Nota: Si 'operador' llega como ID, necesitarás inyectar UserRepository y hacer un map similar a miscMap
      operador: t.operador || (t as any).operatorAsignado || 'N/A',
    }));

    return {
      cards: [
        { title: 'Incidentes por plataforma', value: `${incidentesPorPlataforma}`, color: '#4287f5', subtitle: 'Categoria de red' },
        { title: 'Incidentes por servicio', value: `${incidentesPorServicio}`, color: '#7542f5', subtitle: 'Tipo cliente' },
        {
          title: '% fallas resueltas en Soporte',
          value: `${fallasResueltasEnSoporte}%`,
          color: '#bf42f5',
          subtitle: `Resueltas: ${ticketsResueltosSoporte} | Escaladas: ${ticketsEscaladosUnidad}`
        },
        { title: 'Incidencias Puntuales', value: `${incidentesPorTipo.PUNTUAL}`, color: '#42f5a8', subtitle: 'Tipo: Puntual' },
        { title: 'Incidencias Masivas', value: `${incidentesPorTipo.MASIVA}`, color: '#f54242', subtitle: 'Tipo: Masiva' },
        { title: 'Ventana de Mantenimiento', value: `${incidentesPorTipo.MANTENIMIENTO}`, color: '#f5a842', subtitle: 'Tipo: Mantenimiento' },
        { title: 'Total Tickets', value: `${totalTickets}`, color: '#f5a842', subtitle: 'Cerrados en el período' },
        {
          title: 'MTTR Tiempo Medio Plataforma',
          value: mttrPlataformaFormateado,
          color: '#0288d1',
          subtitle: `Basado en ${ticketsConMttrPlataforma.length} tickets`
        },
        {
          title: 'MTTR Tiempo Medio Servicio',
          value: mttrServicioFormateado,
          color: '#7b1fa2',
          subtitle: `Basado en ${ticketsConMttrServicio.length} tickets`
        },
      ],
      mttrPlataforma,
      mttrServicio,
      totalTickets,
      ticketsResueltosSoporte,
      ticketsEscaladosUnidad,
      ticketsDetalle, // ✅ Incluido para la exportación frontend
    };
  }

  async getTicketsForExport(filterDto: ReportFilterDto): Promise<any[]> {
    const { plataforma, cliente, mes } = filterDto;
    
    const query: any = { status: TICKET_STATUS.CERRADO };
    
    console.log('📊 [Export] Filtros recibidos:', filterDto);

    if (mes) {
      const [year, month] = mes.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
      console.log('📊 [Export] Rango de fechas aplicado:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    }
    
    if (plataforma && plataforma !== 'TODAS') {
      query.networkCategory = plataforma;
    }
    if (cliente && cliente !== 'TODOS') {
      query.tipoCliente = cliente;
      console.log('📊 [Export] Filtro cliente aplicado:', cliente);
    }
    
    const tickets = await this.ticketRepository.find(query as any);

    console.log('📊 [Export] Tickets encontrados en BD:', tickets.length);
    if (tickets.length > 0) {
      console.log('📊 [Export] Ejemplo de primer ticket:', {
        id: tickets[0]._id,
        numeroTicket: (tickets[0] as any).numeroTicket || (tickets[0] as any).caseNumber,
        status: tickets[0].status,
        createdAt: tickets[0].createdAt,
        tipoIncidencia: (tickets[0] as any).tipoIncidencia || (tickets[0] as any).incidentType
      });
    }

    return tickets;
  }

  async GrupoB(tickets: any[]): Promise<ReportPreviewModel> {
    const cerrados = tickets.filter(t => t.status === TICKET_STATUS.CERRADO);
    const ahora = Date.now();
    const ultimos30 = cerrados.filter(t => ahora - new Date((t as any).closedAt || t.updatedAt).getTime() <= 30 * 24 * 60 * 60 * 1000);

    const tiempoPorServicio = this.aggregateAverageMttrByFieldFromTickets(cerrados, 'tipoCliente');
    const fallasRecurrentes = this.calcularFallasRecurrentes(ultimos30);
    const totalRecurrentes = fallasRecurrentes.reduce((sum, r) => sum + r.cantidad, 0);
    const tasaRecurrentes = cerrados.length > 0 ? Math.round((totalRecurrentes / cerrados.length) * 10000) / 100 : 0;

    return {
      cards: [
        { title: 'Tiempo promedio por servicio', value: `${tiempoPorServicio.length} servicios`, color: '#4287f5', subtitle: 'Promedio MTTR' },
        { title: 'Fallas recurrentes', value: `${fallasRecurrentes.length}`, color: '#f54242', subtitle: 'Últimos 30 días' },
        { title: 'Tasa de recurrencia', value: `${tasaRecurrentes}%`, color: '#f5a842', subtitle: 'Misma causa raíz' },
      ],
      fallasRecurrentes,
      tiempoPorServicio,
    };
  }

  async GrupoC(tickets: any[]): Promise<ReportPreviewModel> {
    const cerrados = tickets.filter(t => t.status === TICKET_STATUS.CERRADO);
    const recibidosDia = tickets.filter(t => this.esTurnoDiurno(new Date(t.createdAt)));
    const recibidosNoche = tickets.filter(t => !this.esTurnoDiurno(new Date(t.createdAt)));
    const cerradosDia = cerrados.filter(t => this.esTurnoDiurno(new Date((t as any).closedAt || t.updatedAt)));
    const cerradosNoche = cerrados.filter(t => !this.esTurnoDiurno(new Date((t as any).closedAt || t.updatedAt)));

    const tasaRotacionDiurna = recibidosDia.length > 0 ? Math.round((cerradosDia.length / recibidosDia.length) * 10000) / 100 : 0;
    const tasaRotacionNocturna = recibidosNoche.length > 0 ? Math.round((cerradosNoche.length / recibidosNoche.length) * 10000) / 100 : 0;
    const ticketsPorOperador = this.groupCount(cerrados, t => t.operador || (t as any).operatorAsignado || 'SIN_OPERADOR');
    const operadoresUnicos = new Set(cerrados.map(t => t.operador || (t as any).operatorAsignado).filter(Boolean)).size || 1;
    const promedioPorOperador = cerrados.length > 0 ? Math.round((cerrados.length / operadoresUnicos) * 100) / 100 : 0;
    const proactivas = tickets.filter(t => (t as any).detectadaProactivamente === true || ((t as any).origen || '').toUpperCase() === 'MONITOREO');
    const pctProactivas = tickets.length > 0 ? Math.round((proactivas.length / tickets.length) * 10000) / 100 : 0;
    const eficienciaCierre = tickets.length > 0 ? Math.round((cerrados.length / tickets.length) * 10000) / 100 : 0;

    return {
      cards: [
        { title: 'Tasa rotación diurna', value: `${tasaRotacionDiurna}%`, color: '#42f5a8', subtitle: 'Turno 7am-7pm' },
        { title: 'Tasa rotación nocturna', value: `${tasaRotacionNocturna}%`, color: '#4287f5', subtitle: 'Turno 7pm-7am' },
        { title: '% Detección proactiva', value: `${pctProactivas}%`, color: '#f542f5', subtitle: 'Por monitoreo' },
        { title: 'Eficiencia de cierre', value: `${eficienciaCierre}%`, color: '#42f5d4', subtitle: 'Tickets cerrados/total' },
      ],
      ticketsPorOperador,
      promedioPorOperador,
      cantidadOperadores: operadoresUnicos,
    };
  }

  async GrupoD(tickets: any[]): Promise<ReportPreviewModel> {
    const mayores = tickets.filter(t => (t.tipoIncidencia || '').toUpperCase() === 'MASIVA' || (t as any).fallaPlataforma === true);
    const incidentesPorMes = this.groupByMonth(mayores);
    const escalados = tickets.filter(t => t.escaladoA && (t as any).horaEscalamiento);

    const tiempoEscalamientoHoras = escalados.length > 0
      ? Math.round(escalados.reduce((sum, t) => {
        const diff = new Date((t as any).horaEscalamiento).getTime() - new Date(t.createdAt).getTime();
        return sum + Math.max(0, diff / 36e5);
      }, 0) / escalados.length * 100) / 100
      : 0;

    const criticas = tickets.filter(t => (t.tipoIncidencia || '').toUpperCase() === 'MASIVA' || (t as any).fallaPlataforma === true);
    const documentadas = criticas.filter(t => ((t as any).bitacora || '').trim().length > 0 || (t as any).documentado === true);
    const pctDocumentados = criticas.length > 0 ? Math.round((documentadas.length / criticas.length) * 10000) / 100 : 0;
    const rankingServicios = this.groupCount(tickets, t => t.tipoCliente || 'SIN_SERVICIO');

    return {
      cards: [
        { title: 'Incidentes mayores', value: `${mayores.length}`, color: '#f54242', subtitle: 'Masivos/Plataforma' },
        { title: 'Tiempo escalamiento', value: `${tiempoEscalamientoHoras}h`, color: '#f5a842', subtitle: 'Promedio horas' },
        { title: '% Documentados', value: `${pctDocumentados}%`, color: '#42f5a8', subtitle: 'Post-falla crítica' },
      ],
      incidentesMayoresPorMes: incidentesPorMes,
      tiempoEscalamientoHoras,
      rankingServicios,
    };
  }

  private countByTipoIncidencia(tickets: any[]) {
    const counts = { PUNTUAL: 0, MASIVA: 0, MANTENIMIENTO: 0 };

    const normalize = (t: any): string => {
      const raw = t.incidentType || t.tipoIncidencia || '';
      const value = Array.isArray(raw) ? raw[0] : raw;
      return (value || '').toString().toUpperCase().trim();
    };

    if (tickets.length > 0) {
      const tiposUnicos = [...new Set(tickets.map(t => normalize(t) || 'SIN_TIPO'))];
      console.log('🔍 [ReportsService] Tipos de incidencia únicos en BD:', tiposUnicos);
    }

    tickets.forEach(t => {
      const tipo = normalize(t);
      if (tipo.includes('MASIVA')) {
        counts.MASIVA++;
      } else if (tipo.includes('MANTENIMIENTO') || tipo.includes('VENTANA')) {
        counts.MANTENIMIENTO++;
      } else if (tipo.includes('PUNTUAL') || tipo.includes('FALLA')) {
        counts.PUNTUAL++;
      }
    });

    console.log('📊 [ReportsService] Conteo final por tipo:', counts);
    return counts;
  }

  private esTurnoDiurno(d: Date): boolean {
    const h = d.getHours();
    return h >= 7 && h < 19;
  }

  private groupCount(tickets: any[], keyFn: (t: any) => string) {
    const map = new Map<string, number>();
    tickets.forEach(t => {
      const k = keyFn(t);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, cantidad]) => ({ name, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private groupByMonth(tickets: any[]) {
    const map = new Map<string, number>();
    tickets.forEach(t => {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([mes, cantidad]) => ({ mes, cantidad }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  private calcularFallasRecurrentes(tickets: any[]) {
    const combos = new Map<string, { servicio: string; causaRaiz: string; cantidad: number }>();
    tickets.forEach(t => {
      const servicio = t.tipoCliente || 'SIN_SERVICIO';
      const causaRaiz = (t as any).causaRaiz || 'SIN_CAUSA';
      const key = `${servicio}||${causaRaiz}`;
      if (!combos.has(key)) combos.set(key, { servicio, causaRaiz, cantidad: 0 });
      combos.get(key)!.cantidad += 1;
    });
    return Array.from(combos.values()).filter(r => r.cantidad > 1).sort((a, b) => b.cantidad - a.cantidad);
  }

  private aggregateAverageMttrByFieldFromTickets(tickets: any[], field: string): { title: string; value: number }[] {
    const acc = new Map<string, { sum: number; n: number }>();
    tickets.forEach(t => {
      const key = t[field] || 'SIN_CLASIFICAR';
      const cur = acc.get(key) || { sum: 0, n: 0 };
      cur.sum += t.mttrTotal || 0;
      cur.n += 1;
      acc.set(key, cur);
    });
    return Array.from(acc.entries())
      .map(([title, { sum, n }]) => ({ title, value: n ? Math.round((sum / n) * 100) / 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }

  private async aggregateAverageMttrByField(
    field: 'networkCategory' | 'tipoCliente',
    ids: string[],
    matchQuery: any = {},
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const results = await this.ticketRepository
      .aggregate<{ _id: string; averageMttr: number }>([
        { $match: { ...matchQuery, [field]: { $in: ids }, mttrTotal: { $exists: true, $ne: null } } },
        { $group: { _id: `$${field}`, averageMttr: { $avg: '$mttrTotal' } } },
      ])
      .toArray();
    return new Map(results.map(({ _id, averageMttr }) => [_id, Math.round(averageMttr * 100) / 100]));
  }

  private mapMttrByMiscellaneous(items: Miscellaneous[], mttrById: Map<string, number>): { title: string; value: number }[] {
    return items.map((item) => ({ title: item.valor, value: mttrById.get(item._id.toString()) ?? 0 }));
  }
}