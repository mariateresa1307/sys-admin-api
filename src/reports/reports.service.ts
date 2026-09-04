import { Injectable } from '@nestjs/common';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReporteModelGroupA, ReporteModelGroupB, ReporteModelGroupC, ReporteModelGroupD, ReportPreviewModel } from './models/report-preview.model';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Miscellaneous } from 'src/miscellaneous/entities/miscellaneous.entity';
import { CATEGORIA } from 'src/utils/constants/miscelanious.constants';
import { TICKET_STATUS } from 'src/utils/constants/tickets';
import { convertMinutes } from 'src/utils/minutesToHoursMinutes';
import type { Filter } from 'typeorm/driver/mongodb/typings';
import { ObjectId } from 'mongodb';
import { User } from '../users/entities/user.entity';

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
    @InjectRepository(User)
    private readonly userRepository: MongoRepository<User>,
  ) {}

  async getPreview(filterDto: ReportFilterDto): Promise<ReportPreviewModel | undefined> {
    const { grupo, plataforma, cliente, mes } = filterDto;

    const query: Filter<Ticket> = {
      status: TICKET_STATUS.CERRADO,
      afectacion: true,
    };

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
    console.log(' [ReportsService] Total tickets encontrados:', tickets.length);

    switch (grupo) {
      case 'A': return this.GrupoA(tickets, filterDto);
      case 'B': return this.GrupoB(tickets);
      case 'C': return this.GrupoC(tickets);
      case 'D': return this.GrupoD(tickets);
      default: return this.GrupoA(tickets, filterDto);
    }
  }

  async GrupoA(tickets: any[], filterDto: ReportFilterDto): Promise<ReporteModelGroupA> {
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

    console.log(' [ReportsService] MTTR calculado:', {
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

    // ✅ Resolver IDs de operadores a nombres completos
    const operadores = await this.userRepository.find();
    console.log('👥 [ReportsService] Total operadores encontrados:', operadores.length);
    
    const operadorMap = new Map<string, string>();
    operadores.forEach(u => {
      const userId = u._id?.toString();
      if (!userId) return;

      const nombreCompleto = [
        (u as any).primerNombre, 
        (u as any).segundoNombre, 
        (u as any).primerApellido, 
        (u as any).segundoApellido
      ].filter(Boolean).join(' ').trim() || (u as any).nombre || (u as any).username || (u as any).email || 'Usuario Desconocido';
      
      operadorMap.set(userId, nombreCompleto);
    });

    // ✅ Función auxiliar segura para extraer el ID como string
    const getIdString = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'object' && val.toString) return val.toString().trim();
      return String(val).trim();
    };

    // ✅ Construir detalle de tickets usando los campos CORRECTOS de la BD
    const ticketsDetalle = tickets.map(t => {
      // ✅ CAMPOS CORRECTOS: operatorResponsable y operatorAsignado (inglés)
      const opRespId = getIdString((t as any).operatorResponsable || t.operador);
      const opAsigId = getIdString((t as any).operatorAsignado);

      console.log('🔍 [Debug] Ticket:', {
        caseNumber: t.caseNumber,
        operatorResponsableRaw: (t as any).operatorResponsable,
        operatorAsignadoRaw: (t as any).operatorAsignado,
        opRespId,
        opAsigId,
        encontradoResp: operadorMap.get(opRespId),
        encontradoAsig: operadorMap.get(opAsigId)
      });

      return {
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
        
        // ✅ Usar los campos correctos
        operadorResponsable: operadorMap.get(opRespId) || (opRespId ? `ID: ${opRespId}` : 'N/A'),
        operadorAsignado: opAsigId ? (operadorMap.get(opAsigId) || `ID: ${opAsigId}`) : '',
      };
    });

    // Log para verificar el primer ticket procesado
    if (ticketsDetalle.length > 0) {
      console.log(' [ReportsService] Ejemplo de ticket procesado:', {
        operatorResponsableRaw: (tickets[0] as any)?.operatorResponsable,
        operatorAsignadoRaw: (tickets[0] as any)?.operatorAsignado,
        operadorResponsableResuelto: ticketsDetalle[0]?.operadorResponsable,
        operadorAsignadoResuelto: ticketsDetalle[0]?.operadorAsignado,
      });
    }

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
      ticketsDetalle,
    } as ReporteModelGroupA;
  }

  // ... (getTicketsForExport, GrupoB, GrupoC, GrupoD y todos los helpers se mantienen IGUAL) ...

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
      console.log(' [Export] Ejemplo de primer ticket:', {
        id: tickets[0]._id,
        numeroTicket: (tickets[0] as any).numeroTicket || (tickets[0] as any).caseNumber,
        status: tickets[0].status,
        createdAt: tickets[0].createdAt,
        tipoIncidencia: (tickets[0] as any).tipoIncidencia || (tickets[0] as any).incidentType
      });
    }

    return tickets;
  }

// ============ GRUPO B — POR SERVICIO ============
async GrupoB(tickets: Array<Ticket>): Promise<ReporteModelGroupB> {
  try {
    console.log('📊 [GrupoB] Iniciando procesamiento. Tickets totales:', tickets.length);
    
    const ticketLength = tickets.length;
    const cerrados = tickets.filter(t => t.status === TICKET_STATUS.CERRADO);
    const ahora = Date.now();
    const ultimos30 = cerrados.filter(t => {
      const fechaCierre = (t as any).closedAt || t.updatedAt;
      return fechaCierre && (ahora - new Date(fechaCierre).getTime() <= 30 * 24 * 60 * 60 * 1000);
    });

    // ✅ FILTRAR solo tipoCliente válidos (ObjectIds de 24 caracteres hex)
    const tipoClienteIdsSet = new Set<string>();
    tickets.forEach(ticket => {
      const tc = String(ticket.tipoCliente);
      if (tc && tc.length === 24 && /^[0-9a-fA-F]{24}$/.test(tc)) {
        tipoClienteIdsSet.add(tc);
      }
    });

    const tipoClienteIds = Array.from(tipoClienteIdsSet).map((id) => new ObjectId(id));
    const tipoClientes = tipoClienteIds.length > 0 
      ? await this.miscellaneousRepository.find({ _id: { $in: tipoClienteIds } })
      : [];

    // ✅ También necesitamos resolver las causas raíz
    const causaRaizIdsSet = new Set<string>();
    tickets.forEach(ticket => {
      const cr = String((ticket as any).causaRaiz);
      if (cr && cr.length === 24 && /^[0-9a-fA-F]{24}$/.test(cr)) {
        causaRaizIdsSet.add(cr);
      }
    });

    const causaRaizIds = Array.from(causaRaizIdsSet).map((id) => new ObjectId(id));
    const causasRaiz = causaRaizIds.length > 0
      ? await this.miscellaneousRepository.find({ _id: { $in: causaRaizIds } })
      : [];

    const tiempoPorServicios = this.obtenerTiempoPromedioPorServicio(tickets);
    
    // ✅ Calcular fallas recurrentes
    const fallasRecurrentesRaw = this.calcularFallasRecurrentes(ultimos30);
    
    // ✅ Resolver IDs a nombres en fallas recurrentes
    const fallasRecurrentes = fallasRecurrentesRaw.map(falla => ({
      servicio: tipoClientes.find(tc => tc._id.toString() === falla.servicio)?.valor || falla.servicio,
      causaRaiz: causasRaiz.find(cr => cr._id.toString() === falla.causaRaiz)?.valor || falla.causaRaiz,
      cantidad: falla.cantidad,
    }));

    const totalRecurrentes = fallasRecurrentes.reduce((sum, r) => sum + r.cantidad, 0);
    const tasaRecurrentes = ticketLength > 0 ? Math.round((totalRecurrentes / ticketLength) * 10000) / 100 : 0;

    let tiempoPoServiciosTotal = 0;
    tiempoPorServicios.forEach((tiempoServicio) => {
      tiempoPoServiciosTotal += tiempoServicio.value;
    });

    const hoursMinutes = convertMinutes(tiempoPoServiciosTotal / tiempoPorServicios.length);
    let hoursMinutesString = hoursMinutes.hours > 0 ? `${hoursMinutes.hours} horas ` : '';
    hoursMinutesString += `${hoursMinutes.minutes} minutos`;

    // ✅ GENERAR TICKS DETALLE PARA EXPORTACIÓN
    const ticketsDetalle = tickets.map(t => {
      const ticket = t as any;
      const tipoClienteNombre = tipoClientes.find(tc => tc._id.toString() === String(t.tipoCliente))?.valor || String(t.tipoCliente);
      const causaRaizNombre = causasRaiz.find(cr => cr._id.toString() === String(ticket.causaRaiz))?.valor || String(ticket.causaRaiz);
      
      const horas = t.mttrTotal ? Math.floor(t.mttrTotal / 60) : 0;
      const mins = t.mttrTotal ? Math.round(t.mttrTotal % 60) : 0;
      const duracion = t.mttrTotal ? `${horas}h ${mins}m` : '0h 0m';

      return {
        caseNumber: t.caseNumber || ticket.numeroTicket || '',
        tipoIncidencia: Array.isArray(ticket.incidentType) ? ticket.incidentType[0] : (ticket.incidentType || ticket.tipoIncidencia || ''),
        networkCategory: t.networkCategory || '',
        tipoCliente: tipoClienteNombre,
        horaInicioFalla: ticket.horaInicioFalla || t.createdAt,
        horaCierre: ticket.horaCierreFalla || ticket.closedAt || t.updatedAt,
        duracion: duracion,
        causaRaiz: causaRaizNombre,
        solucionCaso: ticket.SolucionCaso || '',
        operadorResponsable: ticket.operatorResponsable || t.operador || '',
      };
    });

    console.log('📊 [GrupoB] Tickets detallados generados para exportación:', ticketsDetalle.length);

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
        title: tipoClientes.find((tipoClient) => tipoClient._id.toString() === tiempoPorServicio.title)?.valor || tiempoPorServicio.title,
      })),
      incidentesRecurrentes: [],
      totalTickets: ticketLength,
      ticketsDetalle, // ✅ AHORA SÍ SE RETORNA
    };
  } catch (error) {
    console.error('❌ [GrupoB] ERROR CRÍTICO:', error);
    throw error;
  }
}

// ============ GRUPO C — POR OPERADOR ============
async GrupoC(tickets: any[]): Promise<ReporteModelGroupC> {
  try {
    console.log('📊 [GrupoC] Iniciando procesamiento. Tickets totales:', tickets.length);

    const cerrados = tickets.filter(t => t.status === TICKET_STATUS.CERRADO);
    const recibidosDia = tickets.filter(t => this.esTurnoDiurno(new Date(t.createdAt)));
    const recibidosNoche = tickets.filter(t => !this.esTurnoDiurno(new Date(t.createdAt)));
    const cerradosDia = cerrados.filter(t => this.esTurnoDiurno(new Date((t as any).closedAt || t.updatedAt)));
    const cerradosNoche = cerrados.filter(t => !this.esTurnoDiurno(new Date((t as any).closedAt || t.updatedAt)));

    // 1. Tasas de rotación
    const tasaRotacionDiurna = recibidosDia.length > 0 ? Math.round((cerradosDia.length / recibidosDia.length) * 10000) / 100 : 0;
    const tasaRotacionNocturna = recibidosNoche.length > 0 ? Math.round((cerradosNoche.length / recibidosNoche.length) * 10000) / 100 : 0;

    // 2. ✅ EFICIENCIA DE CIERRE CORREGIDA
    const totalRecibidosTurno = recibidosDia.length + recibidosNoche.length;
    const totalCerradosTurno = cerradosDia.length + cerradosNoche.length;
    
    const eficienciaCierre = totalRecibidosTurno > 0 
      ? Math.round((totalCerradosTurno / totalRecibidosTurno) * 10000) / 100 
      : 0;

    console.log('📊 [GrupoC] Debug Eficiencia:', {
      recibidosDia: recibidosDia.length,
      recibidosNoche: recibidosNoche.length,
      totalRecibidosTurno,
      cerradosDia: cerradosDia.length,
      cerradosNoche: cerradosNoche.length,
      totalCerradosTurno,
      eficienciaCalculada: eficienciaCierre + '%'
    });

    // 3. Identificación robusta de operadores
    const operadorIdsSet = new Set<string>();
    cerrados.forEach(t => {
      const rawOp = (t as any).operatorResponsable || t.operador || (t as any).operatorAsignado;
      if (rawOp) {
        operadorIdsSet.add(String(rawOp).trim());
      }
    });

    const validObjectIds = Array.from(operadorIdsSet)
      .filter(id => /^[0-9a-fA-F]{24}$/.test(id))
      .map(id => new ObjectId(id));

    const operadoresDB = validObjectIds.length > 0
      ? await this.userRepository.find({ _id: { $in: validObjectIds } })
      : [];

    const operadorMap = new Map<string, string>();
    operadoresDB.forEach(u => {
      const userId = u._id?.toString();
      if (!userId) return;
      const nombreCompleto = [
        (u as any).primerNombre, 
        (u as any).segundoNombre, 
        (u as any).primerApellido, 
        (u as any).segundoApellido
      ].filter(Boolean).join(' ').trim() || (u as any).nombre || (u as any).username || (u as any).email || 'Usuario Desconocido';
      
      operadorMap.set(userId, nombreCompleto);
    });

    // 4. Contar tickets por operador
    const ticketsPorOperadorMap = new Map<string, { name: string; cantidad: number }>();
    
    cerrados.forEach(t => {
      const rawOp = (t as any).operatorResponsable || t.operador || (t as any).operatorAsignado;
      if (!rawOp) return;

      const opStr = String(rawOp).trim();
      
      let opName = operadorMap.get(opStr);
      if (!opName) {
        if (!/^[0-9a-fA-F]{24}$/.test(opStr) && opStr.length > 3) {
          opName = opStr;
        } else {
          opName = `ID: ${opStr}`;
        }
      }

      const current = ticketsPorOperadorMap.get(opName) || { name: opName, cantidad: 0 };
      current.cantidad += 1;
      ticketsPorOperadorMap.set(opName, current);
    });

    const ticketsPorOperador = Array.from(ticketsPorOperadorMap.values())
      .sort((a, b) => b.cantidad - a.cantidad);

    const operadoresUnicos = ticketsPorOperador.length || 1;
    const promedioPorOperador = cerrados.length > 0 
      ? Math.round((cerrados.length / operadoresUnicos) * 100) / 100 
      : 0;

    // ==========================================
    // ✅ 5. GENERAR TICKETS DETALLE PARA EXPORTACIÓN
    // ==========================================
    const ticketsDetalle = cerrados.map(t => {
      const rawOp = (t as any).operatorResponsable || t.operador || (t as any).operatorAsignado;
      const opStr = String(rawOp || '').trim();
      
      const opName = operadorMap.get(opStr) || 
        (opStr.length > 3 && !/^[0-9a-fA-F]{24}$/.test(opStr) ? opStr : `ID: ${opStr}`);
      
      const fechaCierre = new Date((t as any).closedAt || t.updatedAt);
      const turno = this.esTurnoDiurno(fechaCierre) ? 'Diurno (7am-7pm)' : 'Nocturno (7pm-7am)';
      
      const horas = t.mttrTotal ? Math.floor(t.mttrTotal / 60) : 0;
      const mins = t.mttrTotal ? Math.round(t.mttrTotal % 60) : 0;
      const duracion = t.mttrTotal ? `${horas}h ${mins}m` : '0h 0m';

      return {
        caseNumber: t.caseNumber || (t as any).numeroTicket || '',
        tipoIncidencia: Array.isArray((t as any).incidentType) ? (t as any).incidentType[0] : ((t as any).incidentType || ''),
        networkCategory: t.networkCategory || '',
        tipoCliente: t.tipoCliente || '',
        horaInicioFalla: (t as any).horaInicioFalla || t.createdAt,
        horaCierre: (t as any).horaCierreFalla || (t as any).closedAt || t.updatedAt,
        duracion: duracion,
        causaRaiz: (t as any).causaRaiz || '',
        operadorResponsable: opName,
        turno: turno,
      };
    });

    console.log('📊 [GrupoC] Operadores únicos:', operadoresUnicos);
    console.log('📊 [GrupoC] Top operador:', ticketsPorOperador[0]);
    console.log('📊 [GrupoC] Tickets detalle generados para exportación:', ticketsDetalle.length);

    return {
      cards: [
        { title: 'Tasa rotación diurna', value: `${tasaRotacionDiurna}%`, color: '#42f5a8', subtitle: 'Turno 7am-7pm' },
        { title: 'Tasa rotación nocturna', value: `${tasaRotacionNocturna}%`, color: '#4287f5', subtitle: 'Turno 7pm-7am' },
        { title: 'Eficiencia de cierre', value: `${eficienciaCierre}%`, color: '#42f5d4', subtitle: 'Tickets cerrados/recibidos' },
      ],
      ticketsPorOperador,
      promedioPorOperador,
      cantidadOperadores: operadoresUnicos,
      ticketsDetalle, // ✅ AGREGADO AL RETURN
    };
  } catch (error) {
    console.error('❌ [GrupoC] ERROR CRÍTICO:', error);
    throw error;
  }
}


// ============ GRUPO D —  ============

async GrupoD(tickets: any[]): Promise<ReporteModelGroupD> {
  try {
    console.log('📊 [GrupoD] === INICIO PROCESAMIENTO ===');
    console.log('📊 [GrupoD] Tickets totales recibidos:', tickets.length);
    
    // 1. Resolver IDs de tipoCliente a nombres
    const tipoClienteIdsSet = new Set<string>();
    let sinServicioCount = 0;

    tickets.forEach(t => {
      const tc = String(t.tipoCliente || '').trim();
      if (!tc || tc === 'SIN_SERVICIO' || !/^[0-9a-fA-F]{24}$/.test(tc)) {
        sinServicioCount++;
      } else {
        tipoClienteIdsSet.add(tc);
      }
    });

    console.log(`️ [GrupoD] Tickets SIN SERVICIO válido: ${sinServicioCount}`);

    const tipoClienteIds = Array.from(tipoClienteIdsSet).map(id => new ObjectId(id));
    const tipoClientes = tipoClienteIds.length > 0 
      ? await this.miscellaneousRepository.find({ _id: { $in: tipoClienteIds } }) 
      : [];

    const tipoClienteMap = new Map<string, string>();
    tipoClientes.forEach(tc => {
      tipoClienteMap.set(tc._id.toString(), tc.valor);
    });

    // 2. INCIDENTES MAYORES (para el KPI y % documentados)
    const incidentesMayores = tickets.filter(t => {
      const rawTipo = t.incidentType || t.tipoIncidencia || '';
      const tipoIncidencia = String(rawTipo).toUpperCase();
      
      const esMasiva = tipoIncidencia.includes('MASIVA');
      const esFallaPlataforma = (t as any).fallaPlataforma === true || 
                                 (t as any).granImpacto === true ||
                                 tipoIncidencia.includes('PLATAFORMA');
      
      return esMasiva || esFallaPlataforma;
    });

    console.log('📊 [GrupoD] Incidentes mayores encontrados:', incidentesMayores.length);

    // 3. ✅ GRÁFICA: TODOS los tickets categorizados por tipo
    const incidentesPorMesMap = new Map<string, { 
      total: number; 
      masivas: number; 
      banca: number; 
      carrier: number;
      corporativo: number;
      otros: number;
      tickets: string[] 
    }>();

    // ✅ Usar TODOS los tickets, no solo incidentesMayores
    tickets.forEach(t => {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const rawTipo = t.incidentType || t.tipoIncidencia || '';
      const tipoIncidencia = String(rawTipo).toUpperCase();
      const tipoClienteId = String(t.tipoCliente || '');
      const tipoClienteNombre = tipoClienteMap.get(tipoClienteId) || '';
      
      const esMasiva = tipoIncidencia.includes('MASIVA');
      const esBanca = tipoClienteNombre.toUpperCase().includes('BANCA');
      const esCarrier = tipoClienteNombre.toUpperCase().includes('CARRIER');
      const esCorporativo = tipoClienteNombre.toUpperCase().includes('CORPORATIVO');
      
      if (!incidentesPorMesMap.has(key)) {
        incidentesPorMesMap.set(key, { 
          total: 0, 
          masivas: 0, 
          banca: 0, 
          carrier: 0,
          corporativo: 0,
          otros: 0,
          tickets: [] 
        });
      }
      
      const mesData = incidentesPorMesMap.get(key)!;
      mesData.total += 1;
      
      // Categorizar cada ticket
      if (esMasiva) {
        mesData.masivas += 1;
      } else if (esBanca) {
        mesData.banca += 1;
      } else if (esCarrier) {
        mesData.carrier += 1;
      } else if (esCorporativo) {
        mesData.corporativo += 1;
      } else {
        mesData.otros += 1;
      }
      
      mesData.tickets.push(t.caseNumber || t.numeroTicket || '');
    });

    const incidentesPorMes = Array.from(incidentesPorMesMap.entries())
      .map(([mes, data]) => ({
        mes,
        cantidad: data.total,
        masivas: data.masivas,
        banca: data.banca,
        carrier: data.carrier,
        corporativo: data.corporativo,
        otros: data.otros,
        tickets: data.tickets.join(', ') || `${data.total} incidente(s)`
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    console.log('📊 [GrupoD] Incidentes por mes (TODOS los tickets):', incidentesPorMes);

    // 4. TIEMPO DE ESCALAMIENTO
    const escalados = tickets.filter(t => {
      const tieneEscaladoA = t.escaladoA && String(t.escaladoA).trim().length > 0;
      const tieneHoraEscalamiento = (t as any).horaEscalamiento || (t as any).escaladoEnviadoA || (t as any).fechaAsignacionPA;
      return tieneEscaladoA && tieneHoraEscalamiento;
    });

    let tiempoEscalamientoHoras = 0;
    if (escalados.length > 0) {
      const totalHoras = escalados.reduce((sum, t) => {
        const horaInicio = new Date(t.createdAt).getTime();
        const horaEscalamiento = new Date((t as any).horaEscalamiento || (t as any).escaladoEnviadoA || (t as any).fechaAsignacionPA).getTime();
        return sum + Math.max(0, (horaEscalamiento - horaInicio) / 36e5);
      }, 0);
      tiempoEscalamientoHoras = Math.round((totalHoras / escalados.length) * 100) / 100;
    }

    console.log('📊 [GrupoD] Tickets escalados:', escalados.length, '| Promedio:', tiempoEscalamientoHoras + 'h');

    // 5. % CAMBIOS DOCUMENTADOS (solo sobre incidentes mayores)
    const fallasCriticas = incidentesMayores;
    const fallasDocumentadas = fallasCriticas.filter(t => {
      const tieneActualizacion = t.updatedAt && t.createdAt && new Date(t.updatedAt).getTime() !== new Date(t.createdAt).getTime();
      const tieneBitacora = ((t as any).bitacora || '').trim().length > 0;
      const tieneTT = ((t as any).ticketCambio || (t as any).ttCambio || '').toString().trim().length > 0;
      const estaDocumentado = (t as any).documentado === true || (t as any).cambioDocumentado === true;
      return tieneActualizacion || tieneBitacora || tieneTT || estaDocumentado;
    });

    const pctCambiosDocumentados = fallasCriticas.length > 0 
      ? Math.round((fallasDocumentadas.length / fallasCriticas.length) * 10000) / 100 
      : 0;

    console.log('📊 [GrupoD] Fallas críticas:', fallasCriticas.length);
    console.log(' [GrupoD] Fallas documentadas:', fallasDocumentadas.length);
    console.log(' [GrupoD] % Documentados calculado:', pctCambiosDocumentados + '%');

    // 6. CASO MÁS DEMANDANTE
    const rankingServiciosConNombres = this.groupCount(tickets, t => {
      const tipoClienteId = String(t.tipoCliente);
      const nombreServicio = tipoClienteMap.get(tipoClienteId);
      
      if (!nombreServicio || !tipoClienteId || tipoClienteId.length < 3) {
        return 'FALLAS MASIVAS';
      }
      
      return nombreServicio;
    });
    
    const casoMasDemandante = rankingServiciosConNombres.length > 0 ? rankingServiciosConNombres[0] : null;

    // Formatear tiempo como "Xh Ym"
    const horasEnteras = Math.floor(tiempoEscalamientoHoras);
    const minutosRestantes = Math.round((tiempoEscalamientoHoras - horasEnteras) * 60);
    const tiempoFormateado = `${horasEnteras}h ${minutosRestantes}m`;

    return {
      cards: [
        { title: 'Incidentes mayores', value: `${incidentesMayores.length}`, color: '#c62828', subtitle: 'Masivos/Plataforma' },
        { title: 'Tiempo escalamiento', value: tiempoFormateado, color: '#f57c00', subtitle: 'Promedio horas' },
        { title: '% cambios documentados', value: `${pctCambiosDocumentados}%`, color: '#388e3c', subtitle: 'Post-falla crítica' },
        { title: 'Caso más demandante', value: casoMasDemandante ? `${casoMasDemandante.cantidad} tickets` : '0 tickets', color: '#1976d2', subtitle: casoMasDemandante?.name || 'Sin datos' },
      ],
      incidentesMayoresPorMes: incidentesPorMes,
      tiempoEscalamientoHoras,
      rankingServicios: rankingServiciosConNombres,
      casoMasDemandante,
      totalFallasCriticas: fallasCriticas.length,
      totalFallasDocumentadas: fallasDocumentadas.length,
    };
  } catch (error) {
    console.error('❌ [GrupoD] ERROR CRÍTICO:', error);
    throw error;
  }
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