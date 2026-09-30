-- =====================================================================
-- MIGRACIÓN DE BASE DE DATOS: SUPABASE -> NEON.TECH
-- Proyecto Neon: spring-mode-84627543
-- Aplicación: Mi Solución en Vinos Plus
-- Generado automáticamente para migración de datos y estructura
-- =====================================================================

-- 1. Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role_id VARCHAR(128) REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Albaranes (Entradas)
CREATE TABLE IF NOT EXISTS albaranes (
    id VARCHAR(128) PRIMARY KEY,
    order_id VARCHAR(128),
    entry_date VARCHAR(50) NOT NULL,
    truck_plate VARCHAR(50) NOT NULL,
    origin VARCHAR(150),
    carrier VARCHAR(150) NOT NULL,
    driver VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    incident_details TEXT,
    incident_images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Pallets (Asociados a Albaranes)
CREATE TABLE IF NOT EXISTS pallets (
    id VARCHAR(128) PRIMARY KEY,
    albaran_id VARCHAR(128) REFERENCES albaranes(id) ON DELETE CASCADE,
    palletnumber VARCHAR(100),
    product_name VARCHAR(200),
    product_lot VARCHAR(100),
    product_code VARCHAR(100),
    boxesperpallet INT DEFAULT 0,
    bottlesperbox INT DEFAULT 0,
    totalbottles INT DEFAULT 0,
    eanbottle VARCHAR(50),
    eanbox VARCHAR(50),
    sscc VARCHAR(50),
    labelimage TEXT,
    incident_description TEXT,
    incident_images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Consumibles / Suministros
CREATE TABLE IF NOT EXISTS supplies (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    code VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Modelos de Pack
CREATE TABLE IF NOT EXISTS pack_models (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    product_requirements JSONB DEFAULT '[]'::jsonb,
    supply_requirements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Wine Packs (Lotes y órdenes de packs)
CREATE TABLE IF NOT EXISTS wine_packs (
    id VARCHAR(128) PRIMARY KEY,
    model_id VARCHAR(128) REFERENCES pack_models(id) ON DELETE SET NULL,
    model_name VARCHAR(200) NOT NULL,
    order_id VARCHAR(128) NOT NULL,
    quantity INT DEFAULT 1,
    creation_date VARCHAR(50) NOT NULL,
    contents JSONB DEFAULT '[]'::jsonb,
    supplies_used JSONB DEFAULT '[]'::jsonb,
    additional_components TEXT,
    pack_image TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Ensamblado',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabla de Salidas / Albaranes de Despacho
CREATE TABLE IF NOT EXISTS dispatch_notes (
    id VARCHAR(128) PRIMARY KEY,
    dispatch_note_id VARCHAR(128),
    dispatch_date VARCHAR(50) NOT NULL,
    customer VARCHAR(200) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    carrier VARCHAR(200) NOT NULL,
    truck_plate VARCHAR(50),
    driver VARCHAR(150),
    total_pallets INT DEFAULT 0,
    pack_ids JSONB DEFAULT '[]'::jsonb,
    dispatch_details JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'Despachado',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla de Incidencias
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(128) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    date VARCHAR(50) NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    related_id VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabla de Mermas
CREATE TABLE IF NOT EXISTS mermas (
    id VARCHAR(128) PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    lot VARCHAR(100),
    quantity NUMERIC NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Tabla de Partes de Producción / Montaje
CREATE TABLE IF NOT EXISTS production_reports (
    id VARCHAR(128) PRIMARY KEY,
    pack_id VARCHAR(128),
    report_date VARCHAR(50) NOT NULL,
    expedition_lot VARCHAR(100),
    produced_quantity INT NOT NULL,
    consumptions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    is_holiday BOOLEAN DEFAULT FALSE,
    is_night_shift BOOLEAN DEFAULT FALSE,
    overtime_hours NUMERIC DEFAULT 0,
    billing_status VARCHAR(50) DEFAULT 'pending',
    assigned_billing_month VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Tabla de Tarifas de Precios (Billing)
CREATE TABLE IF NOT EXISTS price_lists (
    id VARCHAR(128) PRIMARY KEY,
    model_id VARCHAR(128),
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50),
    base_price NUMERIC NOT NULL,
    holiday_surcharge_percent NUMERIC DEFAULT 0,
    night_surcharge_percent NUMERIC DEFAULT 0,
    overtime_price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Tabla de Auditoría (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userid VARCHAR(128),
    username VARCHAR(150),
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- DATOS INICIALES / SEED DATA
-- =====================================================================

-- Roles por defecto
INSERT INTO roles (id, name, permissions) VALUES
('super-admin', 'Super Usuario', '["*"]'::jsonb),
('admin', 'Administrador', '["users:manage", "audit:view", "inventory:adjust", "entries:create", "entries:view", "entries:edit", "entries:delete", "stock:view", "packs:create", "packs:manage_models", "production:manage", "labels:generate", "dispatch:create", "incidents:manage", "reports:view", "traceability:view", "billing:manage"]'::jsonb),
('operator', 'Operario', '["entries:create", "entries:view", "stock:view", "packs:create", "labels:generate", "dispatch:create", "incidents:manage", "reports:view", "traceability:view"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Usuario Inicial Administrador
INSERT INTO users (id, full_name, email, role_id) VALUES
('usr-eduardo-rey', 'Msc. Ing. Eduardo Rey', 'reyeduardo0@gmail.com', 'super-admin')
ON CONFLICT (id) DO NOTHING;

-- Consumibles / Suministros
INSERT INTO supplies (id, name, code, type, unit, quantity, min_stock) VALUES
('sup-1', 'BOTELLA BORGOÑA 75CL', 'BOT-BOR-75', 'Contable', 'unidades', 1200, 200),
('sup-2', 'CAJA 6 BOTELLAS SERIGRAFIADA', 'CAJ-6-SER', 'Contable', 'cajas', 250, 50),
('sup-3', 'CORCHO NATURAL PREMIUM', 'COR-NAT-PRE', 'Contable', 'unidades', 1500, 300),
('sup-4', 'CÁPSULA RETRÁCTIL NEGRA', 'CAP-RET-NEG', 'Contable', 'unidades', 1400, 250),
('sup-5', 'CINTA DE EMBALAR IMPRESA', 'CIN-EMB-IMP', 'No Contable', 'rollos', 30, 5)
ON CONFLICT (id) DO NOTHING;

-- Modelo de Pack
INSERT INTO pack_models (id, name, description, product_requirements, supply_requirements) VALUES
('mod-1', 'PACK SELECCIÓN RESERVA 6 BOTELLAS', 'Estuche de 6 botellas de Reserva selección especial', 
 '[{"productName": "VINO TINTO RESERVA 2018", "quantity": 6}]'::jsonb,
 '[{"supplyId": "sup-2", "name": "CAJA 6 BOTELLAS SERIGRAFIADA", "code": "CAJ-6-SER", "quantity": 1}, {"supplyId": "sup-5", "name": "CINTA DE EMBALAR IMPRESA", "code": "CIN-EMB-IMP", "quantity": 1}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Entrada Inicial
INSERT INTO albaranes (id, order_id, entry_date, truck_plate, origin, carrier, driver, status) VALUES
('ALB-2026-001', 'PO-98214', '2026-09-30', '4921-HJK', 'Bodegas de Rioja', 'Transportes Logística Ibérica', 'Manuel Gómez', 'verified')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pallets (id, albaran_id, palletnumber, product_name, product_lot, product_code, boxesperpallet, bottlesperbox, totalbottles, eanbottle, eanbox, sscc) VALUES
('pal-001', 'ALB-2026-001', 'PAL-001', 'VINO TINTO RESERVA 2018', 'L-2018-09', 'VT-RES-18', 80, 6, 480, '8437001234567', '8437001234568', '384370012345678901'),
('pal-002', 'ALB-2026-001', 'PAL-002', 'VINO TINTO CRIANZA 2021', 'L-2021-04', 'VT-CRI-21', 80, 6, 480, '8437009876543', '8437009876544', '384370012345678902')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (username, action) VALUES
('Msc. Ing. Eduardo Rey', 'Migración e inicialización de base de datos exitosa para proyecto spring-mode-84627543');
