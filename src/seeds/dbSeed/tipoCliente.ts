export const TIPO_CLIENTES = [
  {
    valor: 'BANCA',
    descripcion:
      'Cliente bancario con servicios financieros y conexiones dedicadas.',
    tipoSeveridad: 'ALTO',
  },
  {
    valor: 'CARRIER',
    tipoSeveridad: 'ALTO',
    descripcion:
      'Proveedor de telecomunicaciones o red mayorista que ofrece conectividad a terceros.',
  },
  {
    valor: 'RESIDENCIAL',
    tipoSeveridad: 'BAJO',
    descripcion:
      'Cliente particular de hogar con servicios de internet y entretenimiento.',
  },
  {
    valor: 'CORPORATIVO',
    tipoSeveridad: 'MEDIO',
    descripcion:
      'Cliente empresarial con servicios corporativos y soporte especializado.',
  },
];
