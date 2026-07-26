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

  async getPreview(
    filterDto: ReportFilterDto,
  ): Promise<ReportPreviewModel | undefined> {
    if (filterDto.grupo === 'A') {
      return this.GrupoA();
    }
  }

  async GrupoA(): Promise<ReportPreviewModel> {
    const closedFilter = { status: TICKET_STATUS.CERRADO };

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
      this.ticketRepository.count({
        ...closedFilter,
        networkCategory: { $in: categoryIds },
      }),
      this.ticketRepository.count({
        ...closedFilter,
        tipoCliente: { $in: tipoClienteIds },
      }),
      this.ticketRepository.count({ ...closedFilter, escaladoA: null }),
      this.ticketRepository.count(closedFilter),
      this.aggregateAverageMttrByField('networkCategory', categoryIds),
      this.aggregateAverageMttrByField('tipoCliente', tipoClienteIds),
    ]);

    const fallasResueltasEnSoporte =
      totalTickets > 0
        ? Math.round((totalTicketsSinEscalar / totalTickets) * 10000) / 100
        : 0;

    const mttrPlataforma = this.mapMttrByMiscellaneous(
      categoriasRed,
      mttrByCategory,
    );

    const mttrServicio = this.mapMttrByMiscellaneous(
      tiposCliente,
      mttrTipoCliente,
    );

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
      ],
      mttrPlataforma,
      mttrServicio,
    };
  }

  private async aggregateAverageMttrByField(
    field: 'networkCategory' | 'tipoCliente',
    ids: string[],
  ): Promise<Map<string, number>> {
    if (ids.length === 0) {
      return new Map();
    }

    const results = await this.ticketRepository
      .aggregate<{ _id: string; averageMttr: number }>([
        {
          $match: {
            status: TICKET_STATUS.CERRADO,
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

    return new Map(
      results.map(({ _id, averageMttr }) => [
        _id,
        Math.round(averageMttr * 100) / 100,
      ]),
    );
  }

  private mapMttrByMiscellaneous(
    items: Miscellaneous[],
    mttrById: Map<string, number>,
  ): { title: string; value: number }[] {
    return items.map((item) => ({
      title: item.valor,
      value: mttrById.get(item._id.toString()) ?? 0,
    }));
  }
}
