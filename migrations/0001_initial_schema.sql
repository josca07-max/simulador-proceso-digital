-- ===============================================
-- SIMULADOR DE PROCESO DIGITAL - MIGRACIÓN INICIAL
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
    mtbf_hours REAL,
    mttr_hours REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Productos y familias de productos
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    product_code TEXT UNIQUE NOT NULL,
    product_family TEXT NOT NULL,
    standard_cycle_time REAL,
    quality_specs TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- MÓDULO 2: MÉTRICAS OEE Y PERFORMANCE
-- =====================

-- Mediciones de OEE
CREATE TABLE IF NOT EXISTS oee_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    process_id INTEGER NOT NULL,
    measurement_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Componentes OEE
    availability_pct REAL NOT NULL CHECK (availability_pct >= 0 AND availability_pct <= 100),
    performance_pct REAL NOT NULL CHECK (performance_pct >= 0 AND performance_pct <= 100),
    quality_pct REAL NOT NULL CHECK (quality_pct >= 0 AND quality_pct <= 100),
    
    -- Datos detallados
    planned_production_time REAL,
    actual_production_time REAL,
    ideal_cycle_time REAL,
    actual_cycle_time REAL,
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
    variable_name TEXT NOT NULL,
    variable_type TEXT CHECK (variable_type IN ('continuous', 'discrete', 'attribute')) NOT NULL,
    measurement_unit TEXT,
    lower_spec_limit REAL,
    upper_spec_limit REAL,
    target_value REAL,
    measurement_method TEXT,
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
    measurement_source TEXT DEFAULT 'manual',
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
    cp_index REAL,
    cpk_index REAL,
    sigma_level REAL,
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
    internal_setup_time REAL NOT NULL,
    external_setup_time REAL NOT NULL,
    
    -- Clasificación SMED
    setup_complexity TEXT CHECK (setup_complexity IN ('simple', 'medium', 'complex')) DEFAULT 'medium',
    improvement_opportunities TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (from_product_id) REFERENCES products(id),
    FOREIGN KEY (to_product_id) REFERENCES products(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id),
    UNIQUE(from_product_id, to_product_id, resource_id)
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
    seiri_score INTEGER CHECK (seiri_score >= 1 AND seiri_score <= 5),
    seiton_score INTEGER CHECK (seiton_score >= 1 AND seiton_score <= 5),
    seiso_score INTEGER CHECK (seiso_score >= 1 AND seiso_score <= 5),
    seiketsu_score INTEGER CHECK (seiketsu_score >= 1 AND seiketsu_score <= 5),
    shitsuke_score INTEGER CHECK (shitsuke_score >= 1 AND shitsuke_score <= 5),
    
    observations TEXT,
    improvement_actions TEXT,
    
    FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- =====================
-- ÍNDICES PARA PERFORMANCE
-- =====================

CREATE INDEX IF NOT EXISTS idx_oee_timestamp ON oee_measurements(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_oee_resource ON oee_measurements(resource_id);
CREATE INDEX IF NOT EXISTS idx_quality_timestamp ON quality_measurements(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_quality_ctq ON quality_measurements(ctq_id);
CREATE INDEX IF NOT EXISTS idx_setup_products ON setup_configurations(from_product_id, to_product_id);