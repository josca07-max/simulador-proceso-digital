-- ===============================================
-- DATOS DE PRUEBA - SIMULADOR DE PROCESO DIGITAL
-- ===============================================

-- Insertar procesos de ejemplo
INSERT OR IGNORE INTO processes (name, description, process_type, status) VALUES 
  ('Impresión Flexográfica', 'Proceso principal de impresión en prensa flexográfica', 'manufacturing', 'active'),
  ('Control de Calidad', 'Inspección de densidad de tinta y registro de color', 'quality_control', 'active'),
  ('Setup de Cambio', 'Proceso de cambio entre productos diferentes', 'setup', 'active');

-- Insertar recursos (máquinas y operadores)
INSERT OR IGNORE INTO resources (name, resource_type, capacity, cost_per_hour, mtbf_hours, mttr_hours) VALUES 
  ('Prensa Flexográfica #1', 'machine', 1.0, 150.0, 120.0, 2.5),
  ('Prensa Flexográfica #2', 'machine', 1.0, 150.0, 100.0, 3.0),
  ('Operador Senior', 'operator', 1.0, 25.0, NULL, NULL),
  ('Operador Junior', 'operator', 1.0, 18.0, NULL, NULL),
  ('Espectrofotómetro X-Rite', 'tool', 1.0, 5.0, 480.0, 0.5);

-- Insertar familias de productos
INSERT OR IGNORE INTO products (name, product_code, product_family, standard_cycle_time, quality_specs) VALUES 
  ('Etiqueta Cerveza Premium', 'ETQ-CERV-001', 'Etiquetas', 2.5, '{"densidad_tinta": {"min": 1.45, "max": 1.55}, "delta_e": {"max": 2.0}}'),
  ('Etiqueta Vino Reserva', 'ETQ-VINO-002', 'Etiquetas', 2.8, '{"densidad_tinta": {"min": 1.40, "max": 1.50}, "delta_e": {"max": 1.5}}'),
  ('Envase Lácteo 1L', 'ENV-LACT-003', 'Envases', 1.8, '{"densidad_tinta": {"min": 1.30, "max": 1.40}, "delta_e": {"max": 3.0}}'),
  ('Envase Jugo 500ml', 'ENV-JUGO-004', 'Envases', 1.5, '{"densidad_tinta": {"min": 1.25, "max": 1.35}, "delta_e": {"max": 2.5}}'),
  ('Flexible Snacks', 'FLX-SNCK-005', 'Flexibles', 3.2, '{"densidad_tinta": {"min": 1.50, "max": 1.60}, "delta_e": {"max": 1.8}}');

-- Insertar CTQs (Variables Críticas de Calidad)
INSERT OR IGNORE INTO quality_ctqs (process_id, variable_name, variable_type, measurement_unit, lower_spec_limit, upper_spec_limit, target_value, measurement_method) VALUES 
  (1, 'Densidad Tinta Cian', 'continuous', 'g/cm³', 1.20, 1.60, 1.40, 'densitometer_api'),
  (1, 'Densidad Tinta Magenta', 'continuous', 'g/cm³', 1.25, 1.55, 1.40, 'densitometer_api'),
  (1, 'Delta E Color', 'continuous', 'Delta E', 0.0, 3.0, 0.0, 'spectrophotometer_api'),
  (1, 'Registro Longitudinal', 'continuous', 'mm', -0.5, 0.5, 0.0, 'vision_system'),
  (2, 'Grosor Material', 'continuous', 'µm', 18.0, 22.0, 20.0, 'micrometer');

-- Insertar configuraciones de setup SMED
INSERT OR IGNORE INTO setup_configurations (from_product_id, to_product_id, resource_id, internal_setup_time, external_setup_time, setup_complexity) VALUES 
  -- Cambios dentro de la misma familia (más rápidos)
  (1, 2, 1, 45.0, 15.0, 'simple'),    -- Etiqueta a Etiqueta
  (2, 1, 1, 45.0, 15.0, 'simple'),
  (3, 4, 1, 30.0, 10.0, 'simple'),    -- Envase a Envase
  (4, 3, 1, 30.0, 10.0, 'simple'),
  
  -- Cambios entre familias diferentes (más lentos)
  (1, 3, 1, 120.0, 45.0, 'complex'),  -- Etiqueta a Envase
  (1, 5, 1, 150.0, 60.0, 'complex'),  -- Etiqueta a Flexible
  (3, 1, 1, 135.0, 50.0, 'complex'),  -- Envase a Etiqueta
  (3, 5, 1, 90.0, 35.0, 'medium'),    -- Envase a Flexible
  (5, 1, 1, 180.0, 70.0, 'complex'),  -- Flexible a Etiqueta
  (5, 3, 1, 105.0, 40.0, 'medium');   -- Flexible a Envase

-- Insertar mediciones OEE de ejemplo (últimos 7 días)
INSERT OR IGNORE INTO oee_measurements (resource_id, process_id, measurement_timestamp, availability_pct, performance_pct, quality_pct, planned_production_time, actual_production_time, total_pieces, good_pieces) VALUES 
  -- Día 1
  (1, 1, datetime('now', '-6 days', '+8 hours'), 85.5, 78.2, 96.5, 480, 410, 1200, 1158),
  (2, 1, datetime('now', '-6 days', '+8 hours'), 92.1, 82.3, 94.8, 480, 442, 1350, 1280),
  
  -- Día 2
  (1, 1, datetime('now', '-5 days', '+8 hours'), 88.7, 81.5, 97.2, 480, 426, 1280, 1244),
  (2, 1, datetime('now', '-5 days', '+8 hours'), 90.3, 79.8, 95.1, 480, 433, 1320, 1255),
  
  -- Día 3
  (1, 1, datetime('now', '-4 days', '+8 hours'), 91.2, 83.7, 95.8, 480, 438, 1340, 1284),
  (2, 1, datetime('now', '-4 days', '+8 hours'), 87.9, 85.1, 96.3, 480, 422, 1380, 1329),
  
  -- Día 4
  (1, 1, datetime('now', '-3 days', '+8 hours'), 89.8, 80.4, 94.2, 480, 431, 1290, 1215),
  (2, 1, datetime('now', '-3 days', '+8 hours'), 93.5, 78.9, 97.8, 480, 449, 1310, 1281),
  
  -- Día 5
  (1, 1, datetime('now', '-2 days', '+8 hours'), 86.3, 82.8, 96.9, 480, 414, 1330, 1289),
  (2, 1, datetime('now', '-2 days', '+8 hours'), 91.7, 81.2, 95.4, 480, 440, 1290, 1231),
  
  -- Día 6
  (1, 1, datetime('now', '-1 days', '+8 hours'), 90.1, 84.3, 97.5, 480, 432, 1370, 1336),
  (2, 1, datetime('now', '-1 days', '+8 hours'), 88.4, 83.7, 96.1, 480, 424, 1340, 1288),
  
  -- Día 7 (hoy)
  (1, 1, datetime('now', '+8 hours'), 92.6, 85.8, 95.7, 480, 444, 1390, 1330),
  (2, 1, datetime('now', '+8 hours'), 89.7, 82.4, 97.3, 480, 431, 1350, 1313);

-- Insertar mediciones de calidad de ejemplo
INSERT OR IGNORE INTO quality_measurements (ctq_id, process_id, product_id, measurement_timestamp, measured_value, is_conforming, measurement_source) VALUES 
  -- Mediciones de densidad de tinta para diferentes productos
  (1, 1, 1, datetime('now', '-2 hours'), 1.42, 1, 'densitometer_api'),
  (1, 1, 1, datetime('now', '-1 hour'), 1.38, 1, 'densitometer_api'),
  (1, 1, 1, datetime('now', '-30 minutes'), 1.45, 1, 'densitometer_api'),
  
  (2, 1, 1, datetime('now', '-2 hours'), 1.41, 1, 'densitometer_api'),
  (2, 1, 1, datetime('now', '-1 hour'), 1.39, 1, 'densitometer_api'),
  (2, 1, 1, datetime('now', '-30 minutes'), 1.43, 1, 'densitometer_api'),
  
  -- Mediciones Delta E
  (3, 1, 1, datetime('now', '-2 hours'), 1.8, 1, 'spectrophotometer_api'),
  (3, 1, 1, datetime('now', '-1 hour'), 2.1, 1, 'spectrophotometer_api'),
  (3, 1, 1, datetime('now', '-30 minutes'), 1.5, 1, 'spectrophotometer_api'),
  
  -- Mediciones para producto diferente
  (1, 1, 3, datetime('now', '-3 hours'), 1.32, 1, 'densitometer_api'),
  (1, 1, 3, datetime('now', '-2 hours'), 1.35, 1, 'densitometer_api'),
  (3, 1, 3, datetime('now', '-3 hours'), 2.3, 1, 'spectrophotometer_api'),
  (3, 1, 3, datetime('now', '-2 hours'), 2.7, 1, 'spectrophotometer_api');

-- Insertar análisis de capacidad Cpk
INSERT OR IGNORE INTO process_capability (ctq_id, analysis_period_start, analysis_period_end, sample_size, mean_value, standard_deviation, cp_index, cpk_index, sigma_level) VALUES 
  (1, datetime('now', '-7 days'), datetime('now'), 168, 1.405, 0.045, 1.48, 1.42, 4.26),
  (2, datetime('now', '-7 days'), datetime('now'), 168, 1.412, 0.038, 1.58, 1.51, 4.53),
  (3, datetime('now', '-7 days'), datetime('now'), 168, 1.85, 0.35, 1.43, 1.38, 4.14),
  (4, datetime('now', '-7 days'), datetime('now'), 120, 0.05, 0.12, 1.39, 1.35, 4.05);

-- Insertar auditorías 5S
INSERT OR IGNORE INTO five_s_audits (process_id, audit_date, auditor_name, seiri_score, seiton_score, seiso_score, seiketsu_score, shitsuke_score, observations) VALUES 
  (1, date('now', '-30 days'), 'Juan Pérez', 3, 4, 3, 3, 3, 'Herramientas desordenadas, necesita mejora en limpieza'),
  (1, date('now', '-15 days'), 'María González', 4, 4, 4, 3, 4, 'Mejoras evidentes, mantener disciplina'),
  (1, date('now', '-1 days'), 'Carlos Ruiz', 4, 5, 4, 4, 4, 'Excelente progreso, área muy organizada'),
  (2, date('now', '-20 days'), 'Ana López', 3, 3, 4, 3, 3, 'Área de control de calidad necesita estandarización'),
  (2, date('now', '-5 days'), 'Roberto Silva', 4, 4, 4, 4, 3, 'Buena mejora, trabajar en disciplina continua');

-- Crear vista para análisis rápido de OEE
CREATE VIEW IF NOT EXISTS v_oee_current AS
SELECT 
    p.name as process_name,
    r.name as resource_name,
    o.availability_pct,
    o.performance_pct,
    o.quality_pct,
    ROUND(o.availability_pct * o.performance_pct * o.quality_pct / 10000, 1) as oee_pct,
    o.measurement_timestamp
FROM oee_measurements o
JOIN processes p ON o.process_id = p.id
JOIN resources r ON o.resource_id = r.id
WHERE DATE(o.measurement_timestamp) = DATE('now')
ORDER BY o.measurement_timestamp DESC;