import { Injectable } from '@nestjs/common';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReportPreviewModel } from './models/report-preview.model';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Miscellaneous } from 'src/miscellaneous/entities/miscellaneous.entity';
import { CATEGORIA } from 'src/utils/constants/miscelanious.constants';
import { TICKET_STATUS } from 'src/utils/constants/tickets';
import { TicketDto } from 'src/ticket/dto/create-ticket.dto';
import { convertMinutes } from 'src/utils/minutesToHoursMinutes';
import type { Filter } from 'typeorm/driver/mongodb/typings';
import { ObjectId } from 'mongodb';

type TicketConTipoCliente = Omit<Ticket, 'tipoCliente'> & {
  tipoCliente: string | Miscellaneous;
};

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

    const query: Filter<Ticket> = {
      status: TICKET_STATUS.CERRADO,
      afectacion: true,
    };

    // ✅ Filtro por Mes (YYYY-MM)
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

    const tickets = await this.ticketRepository.find(query);

    switch (grupo) {
      case 'A':
        return this.GrupoA(tickets, filterDto);
      case 'B':
        return this.GrupoB(tickets);
      case 'C':
        return this.GrupoC(tickets);
      case 'D':
        return this.GrupoD(tickets);
      default:
        return this.GrupoA(tickets, filterDto);
    }
  }

  async GrupoA(
    tickets: any[],
    filterDto: ReportFilterDto,
  ): Promise<ReportPreviewModel> {
    const { plataforma, cliente, mes } = filterDto;
    
    // Reconstruimos el query base para los aggregates de MTTR
    const closedFilter: any = { status: TICKET_STATUS.CERRADO };
    if (mes) {
      const [year, month] = mes.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      closedFilter.createdAt = { $gte: startDate, $lte: endDate };
    }
    if (plataforma && plataforma !== 'TODAS') {
      closedFilter.networkCategory = plataforma;
    }
    if (cliente && cliente !== 'TODOS') {
      closedFilter.tipoCliente = cliente;
    }

    const [categoriasRed, tiposCliente] = await Promise.all([
      this.miscellaneousRepository.find({ categoria: CATEGORIA.CATEGORIA_RED }),
      this.miscellaneousRepository.find({ categoria: CATEGORIA.TIPO_CLIENTE }),
    ]);

    const categoryIds = categoriasRed.map((item) => item._id.toString());
    const tipoClienteIds = tiposCliente.map((item) => item._id.toString());

    const [
      incidentesPorPlataforma,
      incidentesPorServicio,
      totalTicketsSinEscalar,
      totalTickets,
      mttrByCategory,
      mttrTipoCliente
    ] = await Promise.all([
      this.ticketRepository.count({ ...closedFilter, networkCategory: { $in: categoryIds } }),
      this.ticketRepository.count({ ...closedFilter, tipoCliente: { $in: tipoClienteIds } }),
      this.ticketRepository.count({ ...closedFilter, escaladoA: null }),
      this.ticketRepository.count(closedFilter),
      this.aggregateAverageMttrByField('networkCategory', categoryIds, closedFilter),
      this.aggregateAverageMttrByField('tipoCliente', tipoClienteIds, closedFilter),
    ]);

    // ✅ NUEVO: Conteo por tipo de incidencia sobre los tickets filtrados
    const incidentesPorTipo = this.countByTipoIncidencia(tickets);

    const fallasResueltasEnSoporte =
      totalTickets > 0
        ? Math.round((totalTicketsSinEscalar / totalTickets) * 10000) / 100
        : 0;

    const mttrPlataforma = this.mapMttrByMiscellaneous(categoriasRed, mttrByCategory);
    const mttrServicio = this.mapMttrByMiscellaneous(tiposCliente, mttrTipoCliente);

    return {
      cards: [
        {
          title: 'Incidentes por plataforma',
          value: `${incidentesPorPlataforma}`,
          color: '#4287f5',
          subtitle: 'Categoria de red',
        },
        {
          title: 'Incidentes por servicio',
          value: `${incidentesPorServicio}`,
          color: '#7542f5',
          subtitle: 'Tipo cliente',
        },
        {
          title: '% fallas resueltas en Soporte',
          value: `${fallasResueltasEnSoporte}%`,
          color: '#bf42f5',
          subtitle: '',
        },
        // ✅ NUEVAS CARDS
        {
          title: 'Incidencias Puntuales',
          value: `${incidentesPorTipo.PUNTUAL}`,
          color: '#42f5a8',
          subtitle: 'Tipo: Puntual',
        },
        {
          title: 'Incidencias Masivas',
          value: `${incidentesPorTipo.MASIVA}`,
          color: '#f54242',
          subtitle: 'Tipo: Masiva',
        },
        {
          title: 'Ventana de Mantenimiento',
          value: `${incidentesPorTipo.MANTENIMIENTO}`,
          color: '#f5a842',
          subtitle: 'Tipo: Mantenimiento',
        },
      ],
      mttrPlataforma,
      mttrServicio,
    };
  }

  // ============ GRUPO B — POR SERVICIO ============
  async GrupoB(tickets: Array<Ticket>): Promise<ReportPreviewModel> {
    const ticketLength = tickets.length;

    const tipoClienteIds = Array.from(
      new Set(tickets.map((ticket) => String(ticket.tipoCliente)))
    ).map((id) => new ObjectId(id));

    const tipoClientes = await this.miscellaneousRepository.find({
      _id: { $in: tipoClienteIds },
    });

    const tiempoPorServicios = this.obtenerTiempoPromedioPorServicio(tickets);
    const fallasRecurrentes = this.calcularFallasRecurrentes(tickets);
    const totalRecurrentes = fallasRecurrentes.reduce(
      (sum, r) => sum + r.cantidad,
      0,
    );
    const tasaRecurrentes =
      ticketLength > 0
        ? Math.round((totalRecurrentes / ticketLength) * 10000) / 100
        : 0;

    let tiempoPoServiciosTotal = 0;
    tiempoPorServicios.forEach((tiempoServicio) => {
      tiempoPoServiciosTotal += tiempoServicio.value;
    });

    const hoursMinutes = convertMinutes(
      tiempoPoServiciosTotal / tiempoPorServicios.length,
    );
    let hoursMinutesString = hoursMinutes.hours > 0 ? `${hoursMinutes.hours} horas ` : '';
    hoursMinutesString += `${hoursMinutes.minutes} minutos`;



    return {
      cards: [
        {
          title: 'Tiempo promedio por servicio',
          value: `${hoursMinutesString}`,
          color: '#4287f5',
          subtitle: 'Promedio MTTR',
        },
        {
          title: 'Fallas recurrentes',
          value: `${fallasRecurrentes.length}`,
          color: '#f54242',
          subtitle: 'Últimos 30 días',
        },
        {
          title: 'Tasa de recurrencia',
          value: `${tasaRecurrentes}%`,
          color: '#f5a842',
          subtitle: 'Misma causa raíz',
        },
      ],
      fallasRecurrentes,
      tiempoPorServicio: tiempoPorServicios.map((tiempoPorServicio) => ({
        ...tiempoPorServicio,
        title:
          tipoClientes.find(
            (tipoClient) =>
              tipoClient._id.toString() === tiempoPorServicio.title,
          )?.valor || '',
      })),
    };
  }

  // ============ GRUPO C — OPERATIVOS 7x24 ============
  async GrupoC(tickets: any[]): Promise<ReportPreviewModel> {
    const cerrados = tickets.filter(t => t.status === TICKET_STATUS.CERRADO);

    const recibidosDia = tickets.filter(t => this.esTurnoDiurno(new Date(t.createdAt)));
    const recibidosNoche = tickets.filter(t => !this.esTurnoDiurno(new Date(t.createdAt)));
    const cerradosDia = cerrados.filter(t => this.esTurnoDiurno(new Date(t.closedAt || t.updatedAt)));
    const cerradosNoche = cerrados.filter(t => !this.esTurnoDiurno(new Date(t.closedAt || t.updatedAt)));

    const tasaRotacionDiurna = recibidosDia.length > 0 ? Math.round((cerradosDia.length / recibidosDia.length) * 10000) / 100 : 0;
    const tasaRotacionNocturna = recibidosNoche.length > 0 ? Math.round((cerradosNoche.length / recibidosNoche.length) * 10000) / 100 : 0;

    const ticketsPorOperador = this.groupCount(cerrados, t => t.operador || t.operadorAsignado || 'SIN_OPERADOR');
    const operadoresUnicos = new Set(cerrados.map(t => t.operador || t.operadorAsignado).filter(Boolean)).size || 1;
    const promedioPorOperador = cerrados.length > 0 ? Math.round((cerrados.length / operadoresUnicos) * 100) / 100 : 0;

    const proactivas = tickets.filter(t => t.detectadaProactivamente === true || (t.origen || '').toUpperCase() === 'MONITOREO');
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

  // ============ GRUPO D — CALIDAD Y MEJORA ============
  async GrupoD(tickets: any[]): Promise<ReportPreviewModel> {
    const mayores = tickets.filter(t => (t.tipoIncidencia || '').toUpperCase() === 'MASIVA' || t.fallaPlataforma === true);
    const incidentesPorMes = this.groupByMonth(mayores);

    const escalados = tickets.filter(t => t.escaladoA && t.horaEscalamiento);
    const tiempoEscalamientoHoras = escalados.length > 0
      ? Math.round(escalados.reduce((sum, t) => {
          const diff = new Date(t.horaEscalamiento).getTime() - new Date(t.createdAt).getTime();
          return sum + Math.max(0, diff / 36e5);
        }, 0) / escalados.length * 100) / 100
      : 0;

    const criticas = tickets.filter(t => (t.tipoIncidencia || '').toUpperCase() === 'MASIVA' || t.fallaPlataforma === true);
    const documentadas = criticas.filter(t => (t.bitacora || '').trim().length > 0 || t.documentado === true);
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

  // ============ HELPERS ============
  private countByTipoIncidencia(tickets: any[]) {
    const counts = { PUNTUAL: 0, MASIVA: 0, MANTENIMIENTO: 0 };
    tickets.forEach(t => {
      const tipo = (t.tipoIncidencia || '').toUpperCase();
      if (tipo.includes('PUNTUAL')) counts.PUNTUAL++;
      else if (tipo.includes('MASIVA')) counts.MASIVA++;
      else if (tipo.includes('MANTENIMIENTO')) counts.MANTENIMIENTO++;
    });
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
      const causaRaiz = t.causaRaiz || 'SIN_CAUSA';
      const key = `${servicio}||${causaRaiz}`;
      if (!combos.has(key)) combos.set(key, { servicio, causaRaiz, cantidad: 0 });
      combos.get(key)!.cantidad += 1;
    });
    return Array.from(combos.values()).filter(r => r.cantidad > 1).sort((a, b) => b.cantidad - a.cantidad);
  }

  /*
   * Para calcular Tiempo promedio por servicio
   * 1. Recorrer tickets y usar de horaInicioFalla y horaFinAfectacion 
   * 2. Calcular promedia basado en el tiempo transcurrido desde el inicio al final  
   * 3. Retornar el valor en minutos
   */
  private obtenerTiempoPromedioPorServicio(
    tickets: Array<Ticket>,
  ): { title: string; value: number }[] {
    const acc = new Map<string, { sum: number; n: number }>();
    tickets.forEach((ticket) => {
      const key = ticket.tipoCliente || 'SIN_CLASIFICAR';
      const cur = acc.get(key) || { sum: 0, n: 0 };
      cur.sum += ticket.mttrTotal || 0;
      cur.n += 1;
      acc.set(key, cur);
    });
    const promedioPorServicio = Array.from(acc.entries())
      .map(([title, { sum, n }]) => ({
        title,
        value: n ? Math.round((sum / n) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return promedioPorServicio;
  }

  private async aggregateAverageMttrByField(
    field: 'networkCategory' | 'tipoCliente',
    ids: string[],
    matchQuery: any = {}, // ✅ NUEVO: para aplicar filtros de mes/plataforma
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();

    const results = await this.ticketRepository
      .aggregate<{ _id: string; averageMttr: number }>([
        {
          $match: {
            ...matchQuery,
            [field]: { $in: ids },
            mttrTotal: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: `$${field}`,
            averageMttr: { $avg: '$mttrTotal' },
          },
        },
      ])
      .toArray();

    return new Map(results.map(({ _id, averageMttr }) => [_id, Math.round(averageMttr * 100) / 100]));
  }

  private mapMttrByMiscellaneous(items: Miscellaneous[], mttrById: Map<string, number>): { title: string; value: number }[] {
    return items.map((item) => ({
      title: item.valor,
      value: mttrById.get(item._id.toString()) ?? 0,
    }));
  }
}