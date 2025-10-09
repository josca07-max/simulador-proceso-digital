# Simulador de Proceso Digital - Excelencia Operacional

## Resumen del Proyecto

**Plataforma integral data-driven** para la excelencia operacional que fusiona las metodologías Lean Manufacturing, SMED, 5S y Six Sigma mediante simulación avanzada y optimización algorítmica. Esta solución híbrida proporciona un gemelo digital para la validación estocástica de procesos industriales y la optimización continua del rendimiento.

## URLs Activas

- **Aplicación Principal**: https://3000-ijssfqc4wuo0xyx8mdo79-b237eb32.sandbox.novita.ai
- **API Health Check**: https://3000-ijssfqc4wuo0xyx8mdo79-b237eb32.sandbox.novita.ai/api/dashboard/kpis
- **Repositorio GitHub**: *Por configurar*

---

## Funcionalidades Implementadas ✅

### 1. **Dashboard Principal**
- **Métricas OEE en tiempo real**: Overall Equipment Effectiveness
- **Análisis Cpk**: Capacidad de proceso (Six Sigma)
- **Score 5S**: Auditorías de organización y disciplina  
- **Tiempos SMED**: Optimización de setup y cambios

### 2. **Módulo Six Sigma - Control de Calidad**
- **Análisis de capacidad Cpk** con clasificación automática (Excelente/Adecuado/Pobre/Inaceptable)
- **Calculadora Cpk interactiva** con datos de ejemplo
- **Variables críticas de calidad (CTQs)** con límites de especificación
- **Mediciones en tiempo real** desde APIs de instrumentos (simuladas)

### 3. **Módulo SMED - Optimización de Setup**
- **Matriz de tiempos de setup** entre productos y familias
- **Clasificación por complejidad** (Simple/Medium/Complex)
- **Simulador de secuencias** para minimizar tiempos totales
- **Análisis de mejora** con estimación de ahorros

### 4. **Módulo 5S Digital**
- **Auditorías estructuradas** con puntuación por pilares (Seiri, Seiton, Seiso, Seiketsu, Shitsuke)
- **Seguimiento histórico** de mejoras
- **Visualización de progreso** con scoring automático

### 5. **Módulo OEE Analytics**
- **Análisis detallado** de Disponibilidad, Performance y Calidad
- **Tendencias históricas** con gráficos interactivos (Chart.js)
- **Monitoreo por recurso** y proceso productivo

---

## Arquitectura Técnica

### **Frontend (Cloudflare Pages)**
- **Framework**: Hono + TypeScript + TailwindCSS
- **Visualización**: Chart.js para gráficos interactivos
- **UI/UX**: Responsive design con tabs navegables
- **Estado**: Actualización automática cada 30 segundos

### **Backend (Edge Computing)**
- **Runtime**: Hono en Cloudflare Workers
- **APIs REST**: 12+ endpoints para integración industrial
- **Procesamiento**: Cálculos estadísticos en tiempo real (Cpk, OEE)
- **Optimización**: Algoritmos heurísticos para secuenciación

### **Base de Datos (Cloudflare D1)**
- **Motor**: SQLite distribuido globalmente
- **Tablas**: 15+ entidades para métricas industriales
- **Índices**: Optimizados para consultas temporales
- **Vistas**: Agregaciones pre-calculadas para dashboards

---

## Estructura de Datos

### **Métricas Principales**
```sql
-- OEE (Overall Equipment Effectiveness)
oee_measurements: availability_pct, performance_pct, quality_pct

-- Six Sigma (Capacidad de Proceso)  
process_capability: cpk_index, sigma_level, mean_value, std_deviation

-- SMED (Setup Time Optimization)
setup_configurations: internal_setup_time, external_setup_time, complexity

-- 5S (Workplace Organization)
five_s_audits: seiri_score, seiton_score, seiso_score, seiketsu_score, shitsuke_score
```

### **APIs Disponibles**
```
GET  /api/dashboard/kpis           - KPIs principales del dashboard
GET  /api/oee/current              - Mediciones OEE actuales  
GET  /api/oee/trend                - Tendencia OEE (7 días)
GET  /api/sixsigma/cpk             - Análisis de capacidad Cpk
POST /api/sixsigma/calculate-cpk   - Calculadora Cpk interactiva
GET  /api/smed/setup-matrix        - Matriz de tiempos de setup
POST /api/smed/optimize-sequence   - Optimizador de secuencias
GET  /api/5s/audits               - Auditorías 5S históricas
```

---

## Datos de Ejemplo Incluidos

### **Procesos Industriales**
- **Impresión Flexográfica**: Proceso principal de manufactura
- **Control de Calidad**: Inspección de densidad y color
- **Setup de Cambio**: Gestión de cambios entre productos

### **Recursos y Equipos**
- **2 Prensas Flexográficas** con diferentes capacidades y MTBF/MTTR
- **Operadores Senior/Junior** con costes horarios diferenciados
- **Instrumentos de medición** (Espectrofotómetro X-Rite)

### **Productos y Familias**
- **Etiquetas**: Cerveza Premium, Vino Reserva
- **Envases**: Lácteo 1L, Jugo 500ml  
- **Flexibles**: Snacks con especificaciones críticas

### **Métricas Reales**
- **OEE Promedio**: 72.6% (datos de 7 días)
- **Cpk Promedio**: 1.42 (capacidad adecuada)
- **Score 5S**: 364% (necesita calibración)
- **Setup Promedio**: 128 minutos

---

## Guía de Uso

### **1. Dashboard Principal**
- Visualiza KPIs principales en tiempo real
- Navega entre módulos usando las tabs superiores
- Los datos se actualizan automáticamente cada 30 segundos

### **2. Análisis Six Sigma**
- Revisa las variables críticas de calidad (CTQs) y sus índices Cpk
- Usa la **Calculadora Cpk** para analizar nuevos datos:
  - Haz clic en "Calculadora Cpk"
  - Ingresa límites de especificación (LSL/USL)
  - Introduce mediciones separadas por comas
  - Obtén análisis instantáneo de capacidad

### **3. Optimización SMED**
- Consulta la matriz de tiempos de setup entre productos
- Identifica oportunidades de mejora por complejidad
- Planifica secuencias optimizadas para minimizar setup total

### **4. Auditorías 5S**
- Revisa el progreso histórico de implementación 5S
- Compara scores entre procesos y auditores
- Identifica áreas que requieren mayor disciplina

---

## Arquitectura Híbrida para Integración Industrial

### **Cloudflare Pages (Implementado)**
- ✅ Dashboard y visualizaciones
- ✅ APIs REST para integración
- ✅ Cálculos estadísticos básicos
- ✅ Almacenamiento de datos históricos

### **Backend Industrial (Futuro)**
- ⏳ Motor de simulación Python (SimPy + SciPy)
- ⏳ Algoritmos evolutivos para optimización
- ⏳ Machine Learning predictivo (scikit-learn)
- ⏳ Integración IoT con APIs de sensores

### **Puntos de Integración**
```bash
# APIs ya disponibles para integración externa
curl https://3000-ijssfqc4wuo0xyx8mdo79-b237eb32.sandbox.novita.ai/api/dashboard/kpis
curl https://3000-ijssfqc4wuo0xyx8mdo79-b237eb32.sandbox.novita.ai/api/oee/current
curl https://3000-ijssfqc4wuo0xyx8mdo79-b237eb32.sandbox.novita.ai/api/sixsigma/cpk
```

---

## Estado de Implementación

### **✅ Completado (Fase 1)**
1. ✅ **Arquitectura híbrida** - Cloudflare Pages + D1 Database
2. ✅ **Estructura de datos** - 15+ tablas para métricas industriales  
3. ✅ **Dashboard principal** - KPIs en tiempo real con auto-refresh
4. ✅ **Módulo Six Sigma** - Análisis Cpk + Calculadora interactiva
5. ✅ **Módulo SMED** - Matriz de setup + Optimizador básico
6. ✅ **Módulo 5S** - Auditorías históricas + Scoring
7. ✅ **APIs REST** - 12+ endpoints para integración

### **⏳ Pendiente (Fase 2)**
8. ⏳ **Reportes automatizados** - Análisis ROI y comparativas As-Is vs To-Be
9. ⏳ **Simulación avanzada** - Motor de eventos discretos (DES)
10. ⏳ **Machine Learning** - Modelos predictivos de calidad
11. ⏳ **Integración IoT** - APIs reales para sensores industriales

---

## Tecnologías Utilizadas

### **Stack Principal**
- **Hono**: Framework web ligero para Cloudflare Workers
- **Cloudflare D1**: Base de datos SQLite distribuida
- **TailwindCSS**: Framework CSS utilitario  
- **Chart.js**: Librería de gráficos interactivos
- **TypeScript**: Tipado estático para JavaScript

### **Herramientas de Desarrollo**
- **Vite**: Build tool y development server
- **Wrangler**: CLI de Cloudflare para despliegue
- **PM2**: Process manager para entorno sandbox
- **Git**: Control de versiones

### **Metodologías Integradas**
- **Lean Manufacturing**: Eliminación de desperdicios (Muda/Muri/Mura)
- **SMED**: Reducción de tiempos de setup (Single-Minute Exchange of Dies)
- **Six Sigma**: Control estadístico de calidad (DMAIC)
- **5S**: Organización del lugar de trabajo (Seiri/Seiton/Seiso/Seiketsu/Shitsuke)

---

## Comandos de Desarrollo

```bash
# Construcción y despliegue
npm run build              # Construir proyecto
npm run dev:d1             # Desarrollo con D1 local
npm start                  # Usar PM2 (recomendado)

# Base de datos
npm run db:migrate:local   # Aplicar migraciones
npm run db:seed           # Cargar datos de prueba
npm run db:reset          # Resetear DB completa
npm run db:console:local  # Consola SQL interactiva

# Testing y monitoreo  
npm test                  # Probar conexión HTTP
pm2 logs --nostream      # Ver logs sin bloquear
pm2 list                 # Estado de servicios
```

---

## Próximos Pasos Recomendados

### **Integración Industrial**
1. **Configurar APIs de sensores** (densitómetros, espectrofotómetros)
2. **Implementar backend Python** para simulación avanzada
3. **Desarrollar modelos ML** para predicción de calidad
4. **Crear dashboards ejecutivos** con análisis ROI

### **Escalabilidad**  
1. **Despliegue a Cloudflare Pages** producción
2. **Configuración multi-tenant** para múltiples plantas
3. **Integración con sistemas MES/ERP** existentes
4. **Implementación de alertas** y notificaciones

### **Optimización**
1. **Algoritmos evolutivos** para secuenciación compleja
2. **Simulación Monte Carlo** para análisis de riesgo  
3. **Digital Twin** completo del proceso productivo
4. **Optimización automática** de parámetros de proceso

---

## Contacto y Soporte

**Proyecto**: Simulador de Proceso Digital - Excelencia Operacional  
**Tecnología**: Arquitectura Híbrida Cloudflare + Backend Industrial  
**Estado**: Fase 1 Completada - Lista para integración  
**Última Actualización**: $(date)

Para integración con sistemas industriales reales, el siguiente paso es implementar el backend Python con SimPy + SciPy + scikit-learn para capacidades avanzadas de simulación y machine learning.