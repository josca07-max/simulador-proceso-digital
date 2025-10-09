-- ===============================================
-- SIMULADOR DE PROCESO DIGITAL - ESQUEMA DE BASE DE DATOS
-- Arquitectura Híbrida: Cloudflare D1 + Backend Industrial
-- ===============================================

-- =====================
-- MÓDULO 1: GESTIÓN DE PROCESOS Y RECURSOS
-- =====================

-- Procesos productivos principales
CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    process_type TEXT CHECK (process_type IN ('manufacturing', 'assembly', 'quality_control', 'setup')) DEFAULT 'manufacturing',
    status TEXT CHECK (status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recursos (máquinas, operadores, herramientas)
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    resource_type TEXT CHECK (resource_type IN ('machine', 'operator', 'tool', 'material')) NOT NULL,
    capacity REAL DEFAULT 1.0,
    cost_per_hour REAL DEFAULT 0.0,
    availability_status TEXT CHECK (availability_status IN ('available', 'busy', 'maintenance', 'failure')) DEFAULT 'available',
    mtbf_hours REAL, -- Mean Time Between Failures
    mttr_hours REAL, -- Mean Time To Repair
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Productos y familias de productos
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    product_code TEXT UNIQUE NOT NULL,
    product_family TEXT NOT NULL, -- Para optimización SMED
    standard_cycle_time REAL, -- Tiempo estándar en minutos
    quality_specs TEXT, -- Especificaciones JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- MÓDULO 2: MÉTRICAS OEE Y PERFORMANCE
-- =====================

-- Mediciones de OEE (Overall Equipment Effectiveness)
CREATE TABLE IF NOT EXISTS oee_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    process_id INTEGER NOT NULL,
    measurement_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Componentes OEE
    availability_pct REAL NOT NULL CHECK (availability_pct >= 0 AND availability_pct <= 100),
    performance_pct REAL NOT NULL CHECK (performance_pct >= 0 AND performance_pct <= 100),
    quality_pct REAL NOT NULL CHECK (quality_pct >= 0 AND quality_pct <= 100),
    oee_pct REAL GENERATED ALWAYS AS (availability_pct * performance_pct * quality_pct / 10000) STORED,
    
    -- Datos detallados
    planned_production_time REAL, -- Minutos
    actual_production_time REAL, -- Minutos
    ideal_cycle_time REAL, -- Minutos por unidad
    actual_cycle_time REAL, -- Minutos por unidad
    total_pieces INTEGER,
    good_pieces INTEGER,
    
    FOREIGN KEY (resource_id) REFERENCES resources(id),
    FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- =====================
-- MÓDULO 3: SIX SIGMA - CONTROL DE CALIDAD
-- =====================

-- Variables críticas de calidad (CTQs)
CREATE TABLE IF NOT EXISTS quality_ctqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id INTEGER NOT NULL,
    variable_name TEXT NOT NULL, -- ej: "densidad_tinta", "color_delta_e"
    variable_type TEXT CHECK (variable_type IN ('continuous', 'discrete', 'attribute')) NOT NULL,
    measurement_unit TEXT, -- ej: "g/cm3", "Delta E", "%"
    lower_spec_limit REAL,
    upper_spec_limit REAL,
    target_value REAL,
    measurement_method TEXT, -- ej: "spectrophotometer_api", "densitometer_api"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- Mediciones de calidad en tiempo real
CREATE TABLE IF NOT EXISTS quality_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ctq_id INTEGER NOT NULL,
    process_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    measurement_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    measured_value REAL NOT NULL,
    is_conforming BOOLEAN NOT NULL DEFAULT 1,
    measurement_source TEXT DEFAULT 'manual', -- 'api', 'manual', 'sensor'
    operator_id TEXT,
    
    FOREIGN KEY (ctq_id) REFERENCES quality_ctqs(id),
    FOREIGN KEY (process_id) REFERENCES processes(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Análisis de capacidad de proceso (Cpk)
CREATE TABLE IF NOT EXISTS process_capability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ctq_id INTEGER NOT NULL,
    analysis_period_start DATETIME NOT NULL,
    analysis_period_end DATETIME NOT NULL,
    sample_size INTEGER NOT NULL,
    mean_value REAL NOT NULL,
    standard_deviation REAL NOT NULL,
    cp_index REAL, -- Process Potential
    cpk_index REAL, -- Process Capability
    sigma_level REAL,
    is_capable BOOLEAN GENERATED ALWAYS AS (cpk_index >= 1.33) STORED,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ctq_id) REFERENCES quality_ctqs(id)
);

-- =====================
-- MÓDULO 4: SMED - OPTIMIZACIÓN DE SETUP
-- =====================

-- Configuraciones de setup entre productos
CREATE TABLE IF NOT EXISTS setup_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_product_id INTEGER NOT NULL,
    to_product_id INTEGER NOT NULL,
    resource_id INTEGER NOT NULL,
    
    -- Tiempos SMED
    internal_setup_time REAL NOT NULL, -- Tiempo interno (máquina parada)
    external_setup_time REAL NOT NULL, -- Tiempo externo (máquina funcionando)
    total_setup_time REAL GENERATED ALWAYS AS (internal_setup_time + external_setup_time) STORED,
    
    -- Clasificación SMED
    setup_complexity TEXT CHECK (setup_complexity IN ('simple', 'medium', 'complex')) DEFAULT 'medium',
    improvement_opportunities TEXT, -- JSON con oportunidades identificadas
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (from_product_id) REFERENCES products(id),
    FOREIGN KEY (to_product_id) REFERENCES products(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id),
    UNIQUE(from_product_id, to_product_id, resource_id)
);

-- Registro de actividades de setup
CREATE TABLE IF NOT EXISTS setup_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setup_config_id INTEGER NOT NULL,
    activity_name TEXT NOT NULL,
    activity_type TEXT CHECK (activity_type IN ('internal', 'external', 'parallel')) NOT NULL,
    standard_time REAL NOT NULL, -- Minutos
    actual_time REAL, -- Tiempo real registrado
    improvement_status TEXT CHECK (improvement_status IN ('baseline', 'improved', 'optimized')) DEFAULT 'baseline',
    responsible_operator TEXT,
    
    FOREIGN KEY (setup_config_id) REFERENCES setup_configurations(id)
);

-- =====================
-- MÓDULO 5: 5S DIGITAL
-- =====================

-- Auditorías 5S
CREATE TABLE IF NOT EXISTS five_s_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id INTEGER NOT NULL,
    audit_date DATE NOT NULL,
    auditor_name TEXT NOT NULL,
    
    -- Puntuaciones 5S (1-5)
    seiri_score INTEGER CHECK (seiri_score >= 1 AND seiri_score <= 5), -- Clasificar
    seiton_score INTEGER CHECK (seiton_score >= 1 AND seiton_score <= 5), -- Orden
    seiso_score INTEGER CHECK (seiso_score >= 1 AND seiso_score <= 5), -- Limpieza
    seiketsu_score INTEGER CHECK (seiketsu_score >= 1 AND seiketsu_score <= 5), -- Estandarización
    shitsuke_score INTEGER CHECK (shitsuke_score >= 1 AND shitsuke_score <= 5), -- Disciplina
    
    total_score REAL GENERATED ALWAYS AS ((seiri_score + seiton_score + seiso_score + seiketsu_score + shitsuke_score) * 20.0) STORED,
    
    observations TEXT,
    improvement_actions TEXT, -- JSON con acciones de mejora
    
    FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- =====================
-- MÓDULO 6: SIMULACIÓN Y OPTIMIZACIÓN
-- =====================

-- Escenarios de simulación
CREATE TABLE IF NOT EXISTS simulation_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    scenario_type TEXT CHECK (scenario_type IN ('as_is', 'to_be_smed', 'to_be_six_sigma', 'to_be_integrated')) NOT NULL,
    parameters_json TEXT, -- Parámetros de configuración en JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resultados de simulación
CREATE TABLE IF NOT EXISTS simulation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    simulation_run_id TEXT NOT NULL, -- UUID de la corrida
    run_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Métricas proyectadas
    projected_oee_pct REAL,
    projected_throughput REAL,
    projected_wip_units REAL, -- Work In Process
    projected_tardiness_days REAL,
    projected_setup_cost REAL,
    projected_quality_cost REAL,
    
    -- ROI Analysis
    investment_required REAL,
    annual_savings REAL,
    roi_pct REAL,
    payback_months REAL,
    
    confidence_interval REAL DEFAULT 95.0,
    simulation_iterations INTEGER DEFAULT 1000,
    
    FOREIGN KEY (scenario_id) REFERENCES simulation_scenarios(id)
);

-- =====================
-- MÓDULO 7: INTEGRACIÓN Y APIs
-- =====================

-- Registro de integraciones externas
CREATE TABLE IF NOT EXISTS external_integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_name TEXT NOT NULL, -- 'SCADA', 'MES', 'ERP', 'Spectrophotometer_API'
    endpoint_url TEXT,
    integration_type TEXT CHECK (integration_type IN ('data_source', 'data_sink', 'bidirectional')) NOT NULL,
    status TEXT CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'active',
    last_sync_timestamp DATETIME,
    sync_frequency_minutes INTEGER DEFAULT 5,
    api_key_encrypted TEXT, -- Clave API encriptada
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Log de sincronización de datos
CREATE TABLE IF NOT EXISTS data_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL,
    sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    sync_status TEXT CHECK (sync_status IN ('success', 'partial', 'failed')) NOT NULL,
    error_message TEXT,
    
    FOREIGN KEY (integration_id) REFERENCES external_integrations(id)
);

-- =====================
-- VISTAS PARA ANÁLISIS RÁPIDO
-- =====================

-- Vista resumen de OEE por proceso
CREATE VIEW IF NOT EXISTS v_oee_summary AS
SELECT 
    p.name as process_name,
    r.name as resource_name,
    DATE(o.measurement_timestamp) as measurement_date,
    AVG(o.availability_pct) as avg_availability,
    AVG(o.performance_pct) as avg_performance,
    AVG(o.quality_pct) as avg_quality,
    AVG(o.oee_pct) as avg_oee
FROM oee_measurements o
JOIN processes p ON o.process_id = p.id
JOIN resources r ON o.resource_id = r.id
WHERE o.measurement_timestamp >= date('now', '-30 days')
GROUP BY p.id, r.id, DATE(o.measurement_timestamp);

-- Vista resumen de Cpk por CTQ
CREATE VIEW IF NOT EXISTS v_cpk_summary AS
SELECT 
    p.name as process_name,
    c.variable_name,
    c.measurement_unit,
    pc.cpk_index,
    pc.sigma_level,
    pc.is_capable,
    pc.analysis_period_end as last_analysis
FROM process_capability pc
JOIN quality_ctqs c ON pc.ctq_id = c.id
JOIN processes p ON c.process_id = p.id
WHERE pc.id IN (
    SELECT MAX(id) FROM process_capability GROUP BY ctq_id
);

-- Vista de tiempos de setup por familia de producto
CREATE VIEW IF NOT EXISTS v_setup_matrix AS
SELECT 
    pf.name as from_product_family,
    pt.name as to_product_family,
    AVG(sc.total_setup_time) as avg_setup_time,
    COUNT(*) as setup_count
FROM setup_configurations sc
JOIN products pf ON sc.from_product_id = pf.id
JOIN products pt ON sc.to_product_id = pt.id
GROUP BY pf.product_family, pt.product_family;

-- =====================
-- ÍNDICES PARA PERFORMANCE
-- =====================

CREATE INDEX IF NOT EXISTS idx_oee_timestamp ON oee_measurements(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_oee_resource ON oee_measurements(resource_id);
CREATE INDEX IF NOT EXISTS idx_quality_timestamp ON quality_measurements(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_quality_ctq ON quality_measurements(ctq_id);
CREATE INDEX IF NOT EXISTS idx_setup_products ON setup_configurations(from_product_id, to_product_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON data_sync_log(sync_timestamp);