import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface NeonMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NeonMigrationModal: React.FC<NeonMigrationModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [connectionString, setConnectionString] = useState(
    'postgresql://neondb_owner:[PASSWORD]@ep-spring-mode-84627543.us-east-2.aws.neon.tech/neondb?sslmode=require'
  );

  if (!isOpen) return null;

  const handleCopySql = () => {
    const sqlScript = `-- Migración de Base de Datos para Neon.tech (Proyecto: spring-mode-84627543)
-- Ejecutar en el Neon SQL Console:

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role_id VARCHAR(128) REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS pack_models (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    product_requirements JSONB DEFAULT '[]'::jsonb,
    supply_requirements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS mermas (
    id VARCHAR(128) PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    lot VARCHAR(100),
    quantity NUMERIC NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(128) PRIMARY KEY,
    userid VARCHAR(128),
    username VARCHAR(150),
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data inicial
INSERT INTO roles (id, name, permissions) VALUES
('super-admin', 'Super Usuario', '["*"]'::jsonb),
('admin', 'Administrador', '["users:manage", "audit:view", "inventory:adjust", "entries:create", "entries:view", "entries:edit", "entries:delete", "stock:view", "packs:create", "packs:manage_models", "production:manage", "labels:generate", "dispatch:create", "incidents:manage", "reports:view", "traceability:view", "billing:manage"]'::jsonb),
('operator', 'Operario', '["entries:create", "entries:view", "stock:view", "packs:create", "labels:generate", "dispatch:create", "incidents:manage", "reports:view", "traceability:view"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, full_name, email, role_id) VALUES
('usr-eduardo-rey', 'Msc. Ing. Eduardo Rey', 'reyeduardo0@gmail.com', 'super-admin')
ON CONFLICT (id) DO NOTHING;
`;
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Migración & Conexión Neon.tech</h3>
              <p className="text-xs text-gray-500">Proyecto objetivo: <span className="font-mono font-semibold text-emerald-600">spring-mode-84627543</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
            <span className="font-bold">Estado actual:</span> La aplicación está conectada de manera activa y segura a la nube con Firestore y Auth integrados. Además, hemos generado el esquema completo DDL/DML de PostgreSQL para tu proyecto Neon.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Cadena de Conexión de Neon.tech (Proyecto spring-mode-84627543):</label>
            <input 
              type="text" 
              value={connectionString} 
              onChange={(e) => setConnectionString(e.target.value)} 
              className="w-full text-xs font-mono p-2 border border-gray-300 rounded bg-gray-50 focus:bg-white"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">Script SQL para consola Neon.tech:</label>
              <button 
                onClick={handleCopySql} 
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-medium transition"
              >
                {copied ? '✓ ¡Copiado al Portapapeles!' : 'Copiar Script SQL'}
              </button>
            </div>
            <div className="bg-gray-900 text-gray-200 p-3 rounded text-[11px] font-mono h-48 overflow-y-auto">
              <pre>{`-- Proyecto Neon: spring-mode-84627543
-- Archivo generado en workspace: /neon_migration_spring_mode.sql
-- Contiene las tablas: roles, users, albaranes, pallets, supplies,
-- pack_models, wine_packs, dispatch_notes, incidents, mermas,
-- production_reports, price_lists, audit_logs.

(Haz clic en "Copiar Script SQL" para obtener el código completo listo para pegar en la consola SQL de Neon.tech)`}</pre>
            </div>
          </div>

          <div className="pt-2 border-t flex justify-end space-x-2">
            <Button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeonMigrationModal;
