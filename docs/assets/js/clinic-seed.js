/*
 * Datos demostrativos seguros para el frontend público.
 * Los precios, existencias, proveedores y pacientes reales se importan al backend privado.
 */
(function () {
  const demoCategories = ['Preventivo', 'Restaurativo', 'Diagnóstico', 'Especialidad', 'General'];
  const treatmentCatalog = Array.from({ length: 52 }, (_, index) => [
    `Procedimiento demo ${String(index + 1).padStart(2, '0')}`,
    demoCategories[index % demoCategories.length],
  ]);

  const inventoryDemo = [
    ['Material dental demo A', '1. Material Dental', 0, 1, 4, 'Piezas', '🔴 COMPRAR'],
    ['Material dental demo B', '1. Material Dental', 2, 2, 8, 'Piezas', '⚠️ BAJO'],
    ['Anestesia demo', '2. Anestesia', 40, 15, 50, 'Cartuchos', '✅ Ok'],
    ['Desechable demo', '3. Desechables', 22, 20, 100, 'Unidad', '✅ Ok'],
    ['Especialidad demo', '4. Especialidad', '¼', 0.25, 1, 'Frasco', '⚠️ REVISAR'],
    ['Laboratorio demo', '5. Laboratorio', 3, 1, 5, 'Piezas', '✅ Ok'],
    ['Limpieza demo', '6. Limpieza', 1, 2, 6, 'Botella', '⚠️ BAJO'],
  ].map(([product, category, current, minimum, optimal, unit, sourceStatus]) => ({
    product, category, current, minimum, optimal, unit, sourceStatus,
    supplier: 'Configuración privada', approximateCost: null, reorderPointPct: 25,
  }));

  window.SSL_SEED = {
    meta: {
      clinic: "Samantha's Studio Lab",
      location: 'Ubicación de demostración',
      patientsLastMonth: 128,
      sourceVersion: 'Estructura homologada 2026',
      privacy: 'Datos reales fuera del repositorio público',
    },
    goals: {
      monthlyIncomeMinimum: 70000,
      monthlyIncomeTarget: 95000,
      monthlyIncomeAmbitious: 120000,
      patientsPerDayMinimum: 4,
      patientsPerDayTarget: 8,
      ticketMinimum: 500,
      ticketTarget: 700,
      materialsPctMinimum: 10,
      materialsPctMaximum: 25,
      monthlyNetProfitMinimum: 35000,
    },
    paymentFees: [
      { method: 'Efectivo', fee: 0 }, { method: 'Transferencia', fee: 0 },
      { method: 'Tarjeta Débito', fee: 0.01 }, { method: 'Tarjeta Crédito', fee: 0.015 },
      { method: 'MercadoPago', fee: 0.02 },
    ],
    roles: [
      { name: 'Administrador', permissions: ['operación', 'clínica', 'inventario', 'finanzas', 'usuarios'] },
      { name: 'Asistente', permissions: ['operación', 'clínica detallada', 'inventario', 'rayos X'] },
      { name: 'Recepcionista', permissions: ['agenda', 'pacientes', 'historial', 'captura básica'] },
    ],
    cancellationPolicy: {
      generalHours: 36, orthodonticsHours: 60, reminderHours: 36, confirmationHours: 18,
      schedule: 'Horario demostrativo configurable',
    },
    treatments: treatmentCatalog.map(([name, category], index) => ({
      id: index + 1, name, category, hours: null, materialCost: null, hourlyCost: null,
      totalCost: null, targetMargin: 0.30, suggestedPrice: null, currentPrice: null,
      status: '⏳ Pendiente',
    })),
    catalogTreatments: treatmentCatalog.map(([name]) => name),
    priceList: [],
    materials: [
      { id: 'demo-consumable', name: 'Consumible clínico demo', measurable: true, unitCost: 1.75, source: 'Dato ficticio' },
    ],
    inventory: inventoryDemo,
    saleProducts: [],
    sourceSheets: {
      mensual: ['Dashboard', 'Catálogo', 'Registro Diario', 'Venta Productos', 'Gastos', 'Liquidación Especialistas', 'Lab Externo', 'Nómina', 'Inventario', 'Lista de precios'],
      anual: ['Dashboard Anual', 'Metas 2026', 'Datos Mensuales'],
      cuentasPorCobrar: ['Planes de Pago', 'Calendario de Pagos', 'Dashboard CxC'],
      precios: ['📊 Dashboard', '⚙️ Configuración', '📦 Materiales', '📋 Tratamientos', '🔬 Detalle Materiales', '📈 Análisis', '💰 Lista Precios', '📜 Histórico', '🔧 Plantilla'],
      rayosX: ['Dashboard', 'Registro Diario', 'Catálogo', 'Gastos', 'Nómina', 'Base Datos Pacientes', 'Instrucciones'],
    },
  };
})();
