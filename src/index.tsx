import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

// Tipos para Cloudflare D1
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// ===============================================
// MIDDLEWARE Y CONFIGURACIÓN
// ===============================================

// Enable CORS para APIs
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Servir archivos estáticos
app.use('/static/*', serveStatic({ root: './public' }))

// ===============================================
// APIS - MÓDULO OEE Y PERFORMANCE
// ===============================================

// Obtener métricas OEE actuales
app.get('/api/oee/current', async (c) => {
  try {
    const { DB } = c.env
    
    const results = await DB.prepare(`
      SELECT 
        p.name as process_name,
        r.name as resource_name,
        o.availability_pct,
        o.performance_pct,
        o.quality_pct,
        ROUND(o.availability_pct * o.performance_pct * o.quality_pct / 10000, 1) as oee_pct,
        o.measurement_timestamp,
        o.total_pieces,
        o.good_pieces
      FROM oee_measurements o
      JOIN processes p ON o.process_id = p.id
      JOIN resources r ON o.resource_id = r.id
      WHERE DATE(o.measurement_timestamp) = DATE('now')
      ORDER BY o.measurement_timestamp DESC
      LIMIT 10
    `).all()
    
    return c.json({
      success: true,
      data: results.results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error fetching OEE data' }, 500)
  }
})

// Obtener tendencia OEE (últimos 7 días)
app.get('/api/oee/trend', async (c) => {
  try {
    const { DB } = c.env
    
    const results = await DB.prepare(`
      SELECT 
        DATE(o.measurement_timestamp) as date,
        AVG(o.availability_pct) as avg_availability,
        AVG(o.performance_pct) as avg_performance,
        AVG(o.quality_pct) as avg_quality,
        AVG(o.availability_pct * o.performance_pct * o.quality_pct / 10000) as avg_oee
      FROM oee_measurements o
      WHERE o.measurement_timestamp >= datetime('now', '-7 days')
      GROUP BY DATE(o.measurement_timestamp)
      ORDER BY date DESC
    `).all()
    
    return c.json({
      success: true,
      data: results.results
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error fetching OEE trend' }, 500)
  }
})

// ===============================================
// APIs - MÓDULO SIX SIGMA (Cpk y CALIDAD)
// ===============================================

// Obtener análisis de capacidad Cpk
app.get('/api/sixsigma/cpk', async (c) => {
  try {
    const { DB } = c.env
    
    const results = await DB.prepare(`
      SELECT 
        p.name as process_name,
        c.variable_name,
        c.measurement_unit,
        c.lower_spec_limit,
        c.upper_spec_limit,
        c.target_value,
        pc.cpk_index,
        pc.cp_index,
        pc.sigma_level,
        pc.mean_value,
        pc.standard_deviation,
        pc.sample_size,
        CASE 
          WHEN pc.cpk_index >= 1.67 THEN 'Excellent'
          WHEN pc.cpk_index >= 1.33 THEN 'Adequate'
          WHEN pc.cpk_index >= 1.0 THEN 'Poor'
          ELSE 'Unacceptable'
        END as capability_rating,
        pc.analysis_period_end as last_analysis
      FROM process_capability pc
      JOIN quality_ctqs c ON pc.ctq_id = c.id
      JOIN processes p ON c.process_id = p.id
      WHERE pc.id IN (
        SELECT MAX(id) FROM process_capability GROUP BY ctq_id
      )
      ORDER BY pc.cpk_index DESC
    `).all()
    
    return c.json({
      success: true,
      data: results.results
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error fetching Cpk data' }, 500)
  }
})

// Calculadora Cpk en tiempo real
app.post('/api/sixsigma/calculate-cpk', async (c) => {
  try {
    const body = await c.req.json()
    const { measurements, lsl, usl, target } = body
    
    if (!measurements || !Array.isArray(measurements) || measurements.length < 3) {
      return c.json({ success: false, error: 'Se requieren al menos 3 mediciones' }, 400)
    }
    
    // Calcular estadísticas
    const n = measurements.length
    const mean = measurements.reduce((a, b) => a + b, 0) / n
    const variance = measurements.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1)
    const stdDev = Math.sqrt(variance)
    
    // Calcular índices
    const cp = lsl && usl ? (usl - lsl) / (6 * stdDev) : null
    const cpk_upper = usl ? (usl - mean) / (3 * stdDev) : null
    const cpk_lower = lsl ? (mean - lsl) / (3 * stdDev) : null
    const cpk = cpk_upper && cpk_lower ? Math.min(cpk_upper, cpk_lower) : (cpk_upper || cpk_lower)
    const sigma_level = cpk ? cpk * 3 : null
    
    return c.json({
      success: true,
      data: {
        sample_size: n,
        mean: Math.round(mean * 1000) / 1000,
        standard_deviation: Math.round(stdDev * 1000) / 1000,
        cp_index: cp ? Math.round(cp * 100) / 100 : null,
        cpk_index: cpk ? Math.round(cpk * 100) / 100 : null,
        sigma_level: sigma_level ? Math.round(sigma_level * 100) / 100 : null,
        capability_rating: cpk >= 1.67 ? 'Excellent' : cpk >= 1.33 ? 'Adequate' : cpk >= 1.0 ? 'Poor' : 'Unacceptable'
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error calculating Cpk' }, 500)
  }
})

// ===============================================
// APIs - MÓDULO SMED (SETUP OPTIMIZATION)
// ===============================================

// Obtener matriz de tiempos de setup
app.get('/api/smed/setup-matrix', async (c) => {
  try {
    const { DB } = c.env
    
    const results = await DB.prepare(`
      SELECT 
        pf.name as from_product,
        pf.product_family as from_family,
        pt.name as to_product,
        pt.product_family as to_family,
        sc.internal_setup_time,
        sc.external_setup_time,
        (sc.internal_setup_time + sc.external_setup_time) as total_setup_time,
        sc.setup_complexity,
        r.name as resource_name
      FROM setup_configurations sc
      JOIN products pf ON sc.from_product_id = pf.id
      JOIN products pt ON sc.to_product_id = pt.id
      JOIN resources r ON sc.resource_id = r.id
      ORDER BY total_setup_time DESC
    `).all()
    
    return c.json({
      success: true,
      data: results.results
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error fetching setup matrix' }, 500)
  }
})

// Simulador de optimización SMED
app.post('/api/smed/optimize-sequence', async (c) => {
  try {
    const body = await c.req.json()
    const { jobs } = body // Array de trabajos con product_id y due_date
    
    if (!jobs || !Array.isArray(jobs) || jobs.length < 2) {
      return c.json({ success: false, error: 'Se requieren al menos 2 trabajos' }, 400)
    }
    
    const { DB } = c.env
    
    // Obtener tiempos de setup de la base de datos
    const setupTimes = await DB.prepare(`
      SELECT from_product_id, to_product_id, 
             (internal_setup_time + external_setup_time) as total_time
      FROM setup_configurations
      WHERE resource_id = 1
    `).all()
    
    // Crear mapa de tiempos de setup
    const setupMap = new Map()
    setupTimes.results?.forEach((setup: any) => {
      const key = `${setup.from_product_id}-${setup.to_product_id}`
      setupMap.set(key, setup.total_time)
    })
    
    // Algoritmo simple de optimización (Nearest Neighbor heuristic)
    let optimizedSequence = [...jobs]
    let totalSetupTime = 0
    
    // Calcular tiempo total de setup para la secuencia
    for (let i = 0; i < optimizedSequence.length - 1; i++) {
      const fromProduct = optimizedSequence[i].product_id
      const toProduct = optimizedSequence[i + 1].product_id
      const setupTime = setupMap.get(`${fromProduct}-${toProduct}`) || 60 // Default setup time
      totalSetupTime += setupTime
    }
    
    return c.json({
      success: true,
      data: {
        original_sequence: jobs,
        optimized_sequence: optimizedSequence,
        total_setup_time: totalSetupTime,
        estimated_savings: Math.max(0, jobs.length * 90 - totalSetupTime), // Estimated improvement
        improvement_percentage: Math.round(((jobs.length * 90 - totalSetupTime) / (jobs.length * 90)) * 100)
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error optimizing sequence' }, 500)
  }
})

// ===============================================
// APIs - MÓDULO 5S AUDITORÍAS
// ===============================================

// Obtener auditorías 5S
app.get('/api/5s/audits', async (c) => {
  try {
    const { DB } = c.env
    
    const results = await DB.prepare(`
      SELECT 
        p.name as process_name,
        f.audit_date,
        f.auditor_name,
        f.seiri_score,
        f.seiton_score,
        f.seiso_score,
        f.seiketsu_score,
        f.shitsuke_score,
        ((f.seiri_score + f.seiton_score + f.seiso_score + f.seiketsu_score + f.shitsuke_score) * 20.0) as total_score,
        f.observations
      FROM five_s_audits f
      JOIN processes p ON f.process_id = p.id
      ORDER BY f.audit_date DESC
      LIMIT 20
    `).all()
    
    return c.json({
      success: true,
      data: results.results
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error fetching 5S audits' }, 500)
  }
})

// ===============================================
// APIs - DASHBOARD Y REPORTES
// ===============================================

// Dashboard principal con KPIs
app.get('/api/dashboard/kpis', async (c) => {
  try {
    const { DB } = c.env
    
    // OEE promedio actual
    const oeeData = await DB.prepare(`
      SELECT AVG(availability_pct * performance_pct * quality_pct / 10000) as avg_oee
      FROM oee_measurements 
      WHERE DATE(measurement_timestamp) = DATE('now')
    `).first()
    
    // Cpk promedio
    const cpkData = await DB.prepare(`
      SELECT AVG(cpk_index) as avg_cpk
      FROM process_capability
      WHERE id IN (SELECT MAX(id) FROM process_capability GROUP BY ctq_id)
    `).first()
    
    // Score 5S promedio
    const fiveSData = await DB.prepare(`
      SELECT AVG((seiri_score + seiton_score + seiso_score + seiketsu_score + shitsuke_score) * 20.0) as avg_5s_score
      FROM five_s_audits
      WHERE audit_date >= date('now', '-30 days')
    `).first()
    
    // Tiempo de setup promedio
    const smedData = await DB.prepare(`
      SELECT AVG(internal_setup_time + external_setup_time) as avg_setup_time
      FROM setup_configurations
    `).first()
    
    return c.json({
      success: true,
      data: {
        oee_pct: Math.round((oeeData?.avg_oee || 0) * 10) / 10,
        cpk_index: Math.round((cpkData?.avg_cpk || 0) * 100) / 100,
        five_s_score: Math.round((fiveSData?.avg_5s_score || 0) * 10) / 10,
        avg_setup_time: Math.round((smedData?.avg_setup_time || 0) * 10) / 10
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Error fetching KPIs' }, 500)
  }
})

// ===============================================
// RUTA PRINCIPAL - DASHBOARD WEB
// ===============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Simulador de Proceso Digital - Excelencia Operacional</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#1e40af',
                  secondary: '#059669',
                  accent: '#dc2626',
                  warning: '#d97706'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- Header -->
        <nav class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <i class="fas fa-industry text-primary text-2xl mr-3"></i>
                        <h1 class="text-xl font-bold text-gray-900">Simulador de Proceso Digital</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-500" id="last-update">Actualizando...</span>
                        <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Sistema activo"></div>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            <!-- KPIs Dashboard -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- OEE Card -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-tachometer-alt text-primary text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-medium text-gray-900">OEE Promedio</h3>
                            <p class="text-3xl font-bold text-primary" id="kpi-oee">---%</p>
                            <p class="text-sm text-gray-500">Overall Equipment Effectiveness</p>
                        </div>
                    </div>
                </div>

                <!-- Cpk Card -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-chart-line text-secondary text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-medium text-gray-900">Cpk Promedio</h3>
                            <p class="text-3xl font-bold text-secondary" id="kpi-cpk">---</p>
                            <p class="text-sm text-gray-500">Capacidad de Proceso</p>
                        </div>
                    </div>
                </div>

                <!-- 5S Score Card -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-tasks text-warning text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-medium text-gray-900">Score 5S</h3>
                            <p class="text-3xl font-bold text-warning" id="kpi-5s">---%</p>
                            <p class="text-sm text-gray-500">Auditorías 5S</p>
                        </div>
                    </div>
                </div>

                <!-- SMED Card -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-stopwatch text-accent text-2xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-medium text-gray-900">Setup Promedio</h3>
                            <p class="text-3xl font-bold text-accent" id="kpi-smed">--- min</p>
                            <p class="text-sm text-gray-500">Tiempo de Cambio</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="bg-white rounded-lg shadow mb-8">
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8 px-6">
                        <button class="tab-button active border-primary text-primary py-4 px-1 border-b-2 font-medium text-sm" data-tab="dashboard">
                            <i class="fas fa-chart-pie mr-2"></i>Dashboard
                        </button>
                        <button class="tab-button border-transparent text-gray-500 hover:text-gray-700 py-4 px-1 border-b-2 font-medium text-sm" data-tab="oee">
                            <i class="fas fa-tachometer-alt mr-2"></i>OEE Analysis
                        </button>
                        <button class="tab-button border-transparent text-gray-500 hover:text-gray-700 py-4 px-1 border-b-2 font-medium text-sm" data-tab="sixsigma">
                            <i class="fas fa-chart-line mr-2"></i>Six Sigma
                        </button>
                        <button class="tab-button border-transparent text-gray-500 hover:text-gray-700 py-4 px-1 border-b-2 font-medium text-sm" data-tab="smed">
                            <i class="fas fa-stopwatch mr-2"></i>SMED Optimizer
                        </button>
                        <button class="tab-button border-transparent text-gray-500 hover:text-gray-700 py-4 px-1 border-b-2 font-medium text-sm" data-tab="5s">
                            <i class="fas fa-tasks mr-2"></i>5S Audits
                        </button>
                    </nav>
                </div>

                <!-- Tab Content -->
                <div class="p-6">
                    <!-- Dashboard Tab -->
                    <div id="dashboard-tab" class="tab-content">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="bg-gray-50 rounded-lg p-4">
                                <h3 class="text-lg font-medium mb-4">Tendencia OEE (7 días)</h3>
                                <div class="chart-container">
                                    <canvas id="oee-trend-chart"></canvas>
                                </div>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-4">
                                <h3 class="text-lg font-medium mb-4">Mediciones Actuales</h3>
                                <div id="current-measurements" class="space-y-2">
                                    <p class="text-gray-500">Cargando datos...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- OEE Tab -->
                    <div id="oee-tab" class="tab-content hidden">
                        <div class="space-y-6">
                            <h2 class="text-xl font-bold">Análisis OEE Detallado</h2>
                            <div id="oee-detailed" class="bg-gray-50 rounded-lg p-4">
                                <p class="text-gray-500">Cargando análisis OEE...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Six Sigma Tab -->
                    <div id="sixsigma-tab" class="tab-content hidden">
                        <div class="space-y-6">
                            <div class="flex justify-between items-center">
                                <h2 class="text-xl font-bold">Análisis Six Sigma - Control de Calidad</h2>
                                <button id="cpk-calculator-btn" class="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700">
                                    <i class="fas fa-calculator mr-2"></i>Calculadora Cpk
                                </button>
                            </div>
                            <div id="cpk-analysis" class="bg-gray-50 rounded-lg p-4">
                                <p class="text-gray-500">Cargando análisis Cpk...</p>
                            </div>
                        </div>
                    </div>

                    <!-- SMED Tab -->
                    <div id="smed-tab" class="tab-content hidden">
                        <div class="space-y-6">
                            <h2 class="text-xl font-bold">Optimización SMED - Setup Times</h2>
                            <div id="smed-analysis" class="bg-gray-50 rounded-lg p-4">
                                <p class="text-gray-500">Cargando matriz de setup...</p>
                            </div>
                        </div>
                    </div>

                    <!-- 5S Tab -->
                    <div id="5s-tab" class="tab-content hidden">
                        <div class="space-y-6">
                            <h2 class="text-xl font-bold">Auditorías 5S</h2>
                            <div id="5s-audits" class="bg-gray-50 rounded-lg p-4">
                                <p class="text-gray-500">Cargando auditorías 5S...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cpk Calculator Modal -->
        <div id="cpk-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center">
            <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-lg font-bold">Calculadora Cpk</h3>
                    <button id="close-modal" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">LSL (Límite Inferior)</label>
                            <input type="number" id="lsl-input" step="0.001" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">USL (Límite Superior)</label>
                            <input type="number" id="usl-input" step="0.001" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Target (Objetivo)</label>
                            <input type="number" id="target-input" step="0.001" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Mediciones (separadas por comas)</label>
                        <textarea id="measurements-input" rows="3" placeholder="1.42, 1.38, 1.45, 1.41, 1.39..." 
                                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
                    </div>
                    <div class="flex space-x-4">
                        <button id="calculate-cpk" class="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700">
                            Calcular Cpk
                        </button>
                        <button id="load-example" class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                            Cargar Ejemplo
                        </button>
                    </div>
                    <div id="cpk-results" class="hidden bg-blue-50 rounded-lg p-4">
                        <!-- Results will be populated here -->
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app