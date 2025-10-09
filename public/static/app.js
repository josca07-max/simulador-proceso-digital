// ===============================================
// SIMULADOR DE PROCESO DIGITAL - FRONTEND JS
// ===============================================

// Estado global de la aplicación
const AppState = {
  currentTab: 'dashboard',
  kpis: {},
  charts: {},
  updateInterval: null,
  lastUpdate: null
}

// ===============================================
// UTILIDADES Y HELPERS
// ===============================================

// Formatear números con decimales
function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined) return '--'
  return Number(value).toFixed(decimals)
}

// Formatear porcentajes
function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '---%'
  return `${Number(value).toFixed(decimals)}%`
}

// Formatear tiempo en minutos
function formatMinutes(value, decimals = 0) {
  if (value === null || value === undefined) return '--- min'
  return `${Number(value).toFixed(decimals)} min`
}

// Obtener clase de color según el valor OEE
function getOEEClass(oee) {
  if (oee >= 85) return 'oee-excellent'
  if (oee >= 75) return 'oee-good'
  if (oee >= 65) return 'oee-average'
  return 'oee-poor'
}

// Obtener clase de rating Cpk
function getCpkRating(cpk) {
  if (cpk >= 1.67) return { class: 'status-excellent', text: 'Excelente' }
  if (cpk >= 1.33) return { class: 'status-adequate', text: 'Adecuado' }
  if (cpk >= 1.0) return { class: 'status-poor', text: 'Pobre' }
  return { class: 'status-unacceptable', text: 'Inaceptable' }
}

// Mostrar mensajes de error
function showError(message) {
  console.error('Error:', message)
  // Aquí podrías agregar una notificación toast
}

// Mostrar loading state
function showLoading(elementId) {
  const element = document.getElementById(elementId)
  if (element) {
    element.innerHTML = '<div class="flex items-center justify-center py-4"><i class="fas fa-spinner fa-spin text-gray-400 mr-2"></i><span class="text-gray-500">Cargando...</span></div>'
  }
}

// ===============================================
// GESTIÓN DE TABS
// ===============================================

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button')
  const tabContents = document.querySelectorAll('.tab-content')

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab')
      
      // Update button states
      tabButtons.forEach(btn => {
        btn.classList.remove('active', 'border-primary', 'text-primary')
        btn.classList.add('border-transparent', 'text-gray-500')
      })
      
      button.classList.remove('border-transparent', 'text-gray-500')
      button.classList.add('active', 'border-primary', 'text-primary')
      
      // Update content visibility
      tabContents.forEach(content => {
        content.classList.add('hidden')
      })
      
      const activeTab = document.getElementById(`${tabId}-tab`)
      if (activeTab) {
        activeTab.classList.remove('hidden')
        AppState.currentTab = tabId
        
        // Load tab-specific data
        loadTabData(tabId)
      }
    })
  })
}

// Cargar datos específicos de cada tab
async function loadTabData(tabId) {
  switch (tabId) {
    case 'dashboard':
      await loadDashboardData()
      break
    case 'oee':
      await loadOEEData()
      break
    case 'sixsigma':
      await loadSixSigmaData()
      break
    case 'smed':
      await loadSMEDData()
      break
    case '5s':
      await load5SData()
      break
  }
}

// ===============================================
// API CALLS
// ===============================================

async function fetchKPIs() {
  try {
    const response = await axios.get('/api/dashboard/kpis')
    if (response.data.success) {
      AppState.kpis = response.data.data
      updateKPIDisplay()
    }
  } catch (error) {
    showError('Error fetching KPIs: ' + error.message)
  }
}

async function fetchOEETrend() {
  try {
    const response = await axios.get('/api/oee/trend')
    if (response.data.success) {
      updateOEETrendChart(response.data.data)
    }
  } catch (error) {
    showError('Error fetching OEE trend: ' + error.message)
  }
}

async function fetchCurrentMeasurements() {
  try {
    const response = await axios.get('/api/oee/current')
    if (response.data.success) {
      updateCurrentMeasurements(response.data.data)
    }
  } catch (error) {
    showError('Error fetching current measurements: ' + error.message)
  }
}

// ===============================================
// ACTUALIZACIÓN DE UI
// ===============================================

function updateKPIDisplay() {
  const { oee_pct, cpk_index, five_s_score, avg_setup_time } = AppState.kpis
  
  // Update OEE
  const oeeElement = document.getElementById('kpi-oee')
  if (oeeElement) {
    oeeElement.textContent = formatPercent(oee_pct)
    oeeElement.className = `text-3xl font-bold ${getOEEClass(oee_pct)}`
  }
  
  // Update Cpk
  const cpkElement = document.getElementById('kpi-cpk')
  if (cpkElement) {
    cpkElement.textContent = formatNumber(cpk_index, 2)
  }
  
  // Update 5S Score
  const fiveSElement = document.getElementById('kpi-5s')
  if (fiveSElement) {
    fiveSElement.textContent = formatPercent(five_s_score)
  }
  
  // Update SMED
  const smedElement = document.getElementById('kpi-smed')
  if (smedElement) {
    smedElement.textContent = formatMinutes(avg_setup_time)
  }
  
  // Update timestamp
  AppState.lastUpdate = new Date()
  const timestampElement = document.getElementById('last-update')
  if (timestampElement) {
    timestampElement.textContent = `Actualizado: ${AppState.lastUpdate.toLocaleTimeString()}`
  }
}

function updateOEETrendChart(data) {
  const ctx = document.getElementById('oee-trend-chart')
  if (!ctx) return

  // Destroy existing chart if it exists
  if (AppState.charts.oeeTrend) {
    AppState.charts.oeeTrend.destroy()
  }

  const labels = data.map(d => new Date(d.date).toLocaleDateString())
  const oeeData = data.map(d => d.avg_oee)
  const availabilityData = data.map(d => d.avg_availability)
  const performanceData = data.map(d => d.avg_performance)
  const qualityData = data.map(d => d.avg_quality)

  AppState.charts.oeeTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'OEE',
          data: oeeData,
          borderColor: '#1e40af',
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          tension: 0.3
        },
        {
          label: 'Disponibilidad',
          data: availabilityData,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          tension: 0.3
        },
        {
          label: 'Performance',
          data: performanceData,
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.1)',
          tension: 0.3
        },
        {
          label: 'Calidad',
          data: qualityData,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%'
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  })
}

function updateCurrentMeasurements(data) {
  const container = document.getElementById('current-measurements')
  if (!container) return

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No hay mediciones recientes</p>'
    return
  }

  const html = data.map(measurement => `
    <div class="bg-white p-3 rounded border hover-lift">
      <div class="flex justify-between items-center">
        <div>
          <h4 class="font-medium text-gray-900">${measurement.resource_name}</h4>
          <p class="text-sm text-gray-500">${measurement.process_name}</p>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold ${getOEEClass(measurement.oee_pct)}">${formatPercent(measurement.oee_pct)}%</div>
          <div class="text-xs text-gray-500">
            D: ${formatPercent(measurement.availability_pct)}% | 
            P: ${formatPercent(measurement.performance_pct)}% | 
            Q: ${formatPercent(measurement.quality_pct)}%
          </div>
        </div>
      </div>
      <div class="mt-2 flex justify-between text-sm text-gray-600">
        <span>Piezas: ${measurement.good_pieces}/${measurement.total_pieces}</span>
        <span>${new Date(measurement.measurement_timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  `).join('')

  container.innerHTML = html
}

// ===============================================
// LOAD TAB DATA FUNCTIONS
// ===============================================

async function loadDashboardData() {
  await Promise.all([
    fetchKPIs(),
    fetchOEETrend(),
    fetchCurrentMeasurements()
  ])
}

async function loadOEEData() {
  showLoading('oee-detailed')
  try {
    const response = await axios.get('/api/oee/current')
    if (response.data.success) {
      displayDetailedOEE(response.data.data)
    }
  } catch (error) {
    showError('Error loading OEE data: ' + error.message)
  }
}

function displayDetailedOEE(data) {
  const container = document.getElementById('oee-detailed')
  if (!container || !data) return

  const html = `
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>Recurso</th>
            <th>Proceso</th>
            <th>Disponibilidad</th>
            <th>Performance</th>
            <th>Calidad</th>
            <th>OEE</th>
            <th>Piezas Buenas/Total</th>
            <th>Hora</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td class="font-medium">${row.resource_name}</td>
              <td>${row.process_name}</td>
              <td><span class="badge badge-info">${formatPercent(row.availability_pct)}</span></td>
              <td><span class="badge badge-warning">${formatPercent(row.performance_pct)}</span></td>
              <td><span class="badge badge-success">${formatPercent(row.quality_pct)}</span></td>
              <td><span class="text-lg font-bold ${getOEEClass(row.oee_pct)}">${formatPercent(row.oee_pct)}</span></td>
              <td>${row.good_pieces || 0}/${row.total_pieces || 0}</td>
              <td class="text-sm text-gray-500">${new Date(row.measurement_timestamp).toLocaleTimeString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
  
  container.innerHTML = html
}

async function loadSixSigmaData() {
  showLoading('cpk-analysis')
  try {
    const response = await axios.get('/api/sixsigma/cpk')
    if (response.data.success) {
      displayCpkAnalysis(response.data.data)
    }
  } catch (error) {
    showError('Error loading Six Sigma data: ' + error.message)
  }
}

function displayCpkAnalysis(data) {
  const container = document.getElementById('cpk-analysis')
  if (!container || !data) return

  const html = `
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${data.map(ctq => {
          const rating = getCpkRating(ctq.cpk_index)
          return `
            <div class="bg-white p-4 rounded-lg border hover-lift">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-900">${ctq.variable_name}</h4>
                <span class="badge ${rating.class}">${rating.text}</span>
              </div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Cpk:</span>
                  <span class="font-bold">${formatNumber(ctq.cpk_index, 2)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Sigma Level:</span>
                  <span>${formatNumber(ctq.sigma_level, 1)}σ</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Media:</span>
                  <span>${formatNumber(ctq.mean_value, 3)} ${ctq.measurement_unit}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Std Dev:</span>
                  <span>${formatNumber(ctq.standard_deviation, 4)}</span>
                </div>
                <div class="text-xs text-gray-500 mt-2">
                  LSL: ${formatNumber(ctq.lower_spec_limit, 2)} | USL: ${formatNumber(ctq.upper_spec_limit, 2)}
                </div>
                <div class="text-xs text-gray-500">
                  n=${ctq.sample_size} | ${new Date(ctq.last_analysis).toLocaleDateString()}
                </div>
              </div>
            </div>
          `
        }).join('')}
      </div>
    </div>
  `
  
  container.innerHTML = html
}

async function loadSMEDData() {
  showLoading('smed-analysis')
  try {
    const response = await axios.get('/api/smed/setup-matrix')
    if (response.data.success) {
      displaySMEDAnalysis(response.data.data)
    }
  } catch (error) {
    showError('Error loading SMED data: ' + error.message)
  }
}

function displaySMEDAnalysis(data) {
  const container = document.getElementById('smed-analysis')
  if (!container || !data) return

  const html = `
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>Producto Origen</th>
            <th>Producto Destino</th>
            <th>Familia Origen</th>
            <th>Familia Destino</th>
            <th>Setup Interno</th>
            <th>Setup Externo</th>
            <th>Total</th>
            <th>Complejidad</th>
            <th>Recurso</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(setup => `
            <tr>
              <td class="font-medium">${setup.from_product}</td>
              <td class="font-medium">${setup.to_product}</td>
              <td><span class="badge badge-info">${setup.from_family}</span></td>
              <td><span class="badge badge-info">${setup.to_family}</span></td>
              <td>${formatMinutes(setup.internal_setup_time)}</td>
              <td>${formatMinutes(setup.external_setup_time)}</td>
              <td class="font-bold">${formatMinutes(setup.total_setup_time)}</td>
              <td>
                <span class="badge ${
                  setup.setup_complexity === 'simple' ? 'badge-success' :
                  setup.setup_complexity === 'medium' ? 'badge-warning' : 'badge-danger'
                }">${setup.setup_complexity}</span>
              </td>
              <td class="text-sm text-gray-600">${setup.resource_name}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
  
  container.innerHTML = html
}

async function load5SData() {
  showLoading('5s-audits')
  try {
    const response = await axios.get('/api/5s/audits')
    if (response.data.success) {
      display5SAudits(response.data.data)
    }
  } catch (error) {
    showError('Error loading 5S data: ' + error.message)
  }
}

function display5SAudits(data) {
  const container = document.getElementById('5s-audits')
  if (!container || !data) return

  const html = `
    <div class="space-y-4">
      ${data.map(audit => `
        <div class="bg-white p-4 rounded-lg border hover-lift">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-medium text-gray-900">${audit.process_name}</h4>
              <p class="text-sm text-gray-500">Auditor: ${audit.auditor_name} | ${new Date(audit.audit_date).toLocaleDateString()}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold ${audit.total_score >= 80 ? 'text-green-600' : audit.total_score >= 60 ? 'text-yellow-600' : 'text-red-600'}">
                ${formatPercent(audit.total_score)}
              </div>
            </div>
          </div>
          <div class="grid grid-cols-5 gap-2 mb-3">
            <div class="text-center">
              <div class="text-lg font-bold text-blue-600">${audit.seiri_score}</div>
              <div class="text-xs text-gray-500">Seiri<br>(Clasificar)</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-green-600">${audit.seiton_score}</div>
              <div class="text-xs text-gray-500">Seiton<br>(Orden)</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-yellow-600">${audit.seiso_score}</div>
              <div class="text-xs text-gray-500">Seiso<br>(Limpieza)</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-purple-600">${audit.seiketsu_score}</div>
              <div class="text-xs text-gray-500">Seiketsu<br>(Estandarizar)</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-red-600">${audit.shitsuke_score}</div>
              <div class="text-xs text-gray-500">Shitsuke<br>(Disciplina)</div>
            </div>
          </div>
          ${audit.observations ? `
            <div class="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Observaciones:</strong> ${audit.observations}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `
  
  container.innerHTML = html
}

// ===============================================
// CPK CALCULATOR MODAL
// ===============================================

function initializeCpkCalculator() {
  const modal = document.getElementById('cpk-modal')
  const openBtn = document.getElementById('cpk-calculator-btn')
  const closeBtn = document.getElementById('close-modal')
  const calculateBtn = document.getElementById('calculate-cpk')
  const loadExampleBtn = document.getElementById('load-example')

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      modal.classList.remove('hidden')
      modal.classList.add('flex')
    })
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden')
      modal.classList.remove('flex')
    })
  }

  if (loadExampleBtn) {
    loadExampleBtn.addEventListener('click', () => {
      document.getElementById('lsl-input').value = '1.20'
      document.getElementById('usl-input').value = '1.60'
      document.getElementById('target-input').value = '1.40'
      document.getElementById('measurements-input').value = '1.42, 1.38, 1.45, 1.41, 1.39, 1.43, 1.40, 1.37, 1.44, 1.42, 1.39, 1.41, 1.43, 1.38, 1.45'
    })
  }

  if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateCpk)
  }
}

async function calculateCpk() {
  const lsl = parseFloat(document.getElementById('lsl-input').value) || null
  const usl = parseFloat(document.getElementById('usl-input').value) || null
  const target = parseFloat(document.getElementById('target-input').value) || null
  const measurementsText = document.getElementById('measurements-input').value

  if (!measurementsText.trim()) {
    alert('Por favor ingrese las mediciones')
    return
  }

  const measurements = measurementsText.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val))

  if (measurements.length < 3) {
    alert('Se requieren al menos 3 mediciones válidas')
    return
  }

  try {
    const response = await axios.post('/api/sixsigma/calculate-cpk', {
      measurements,
      lsl,
      usl,
      target
    })

    if (response.data.success) {
      displayCpkResults(response.data.data)
    } else {
      alert('Error: ' + response.data.error)
    }
  } catch (error) {
    alert('Error calculating Cpk: ' + error.message)
  }
}

function displayCpkResults(results) {
  const container = document.getElementById('cpk-results')
  if (!container) return

  const rating = getCpkRating(results.cpk_index)
  
  const html = `
    <h4 class="text-lg font-bold mb-4">Resultados del Análisis Cpk</h4>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <div class="flex justify-between">
          <span>Tamaño de muestra:</span>
          <span class="font-bold">${results.sample_size}</span>
        </div>
        <div class="flex justify-between">
          <span>Media (μ):</span>
          <span class="font-bold">${results.mean}</span>
        </div>
        <div class="flex justify-between">
          <span>Desviación estándar (σ):</span>
          <span class="font-bold">${results.standard_deviation}</span>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex justify-between">
          <span>Cp:</span>
          <span class="font-bold">${results.cp_index || 'N/A'}</span>
        </div>
        <div class="flex justify-between">
          <span>Cpk:</span>
          <span class="font-bold text-lg">${results.cpk_index || 'N/A'}</span>
        </div>
        <div class="flex justify-between">
          <span>Nivel Sigma:</span>
          <span class="font-bold">${results.sigma_level || 'N/A'}σ</span>
        </div>
      </div>
    </div>
    <div class="mt-4 p-3 rounded ${rating.class}">
      <div class="flex justify-between items-center">
        <span class="font-bold">Evaluación de Capacidad:</span>
        <span class="font-bold text-lg">${rating.text}</span>
      </div>
    </div>
  `
  
  container.innerHTML = html
  container.classList.remove('hidden')
}

// ===============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('Simulador de Proceso Digital - Inicializando...')
  
  // Initialize components
  initializeTabs()
  initializeCpkCalculator()
  
  // Load initial data
  loadDashboardData()
  
  // Set up auto-refresh (every 30 seconds)
  AppState.updateInterval = setInterval(() => {
    if (AppState.currentTab === 'dashboard') {
      fetchKPIs()
      fetchCurrentMeasurements()
    }
  }, 30000)
  
  console.log('Aplicación inicializada correctamente')
})

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (AppState.updateInterval) {
    clearInterval(AppState.updateInterval)
  }
  
  // Destroy charts
  Object.values(AppState.charts).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy()
    }
  })
})