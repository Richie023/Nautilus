# 🔌 Nautilus Integration Hub

**Central hub para integrar múltiples herramientas de IT mediante sus APIs.**

Desarrollado por **Rolosa** — uso interno y clientes.

---

## ✨ Características

- 🔌 **Conectores modulares** — Cada herramienta es un conector independiente
- 🔍 **Detección automática de capacidades** — Prueba la API y muestra solo lo disponible
- 🔒 **Credenciales cifradas** — AES-256-GCM con PBKDF2, nunca expuestas al frontend
- 📊 **Dashboard en tiempo real** — Estado de todos los conectores
- 🛠️ **Ejecución de capacidades** — Interactúa con cada herramienta desde la UI

## 🔧 Conectores Soportados

| Herramienta | Tipo | Capacidades |
|-------------|------|-------------|
| **PRTG Network Monitor** | Monitoreo | Dispositivos, sensores, alertas, grupos, reportes |
| **Proxmox VE** | Virtualización | Nodos, VMs, contenedores, storage, cluster |
| **Proxmox Mail Gateway** | Seguridad | Stats de correo, cuarentena, dominios, reglas |
| **pfSense / OPNsense** | Red | Firewall, interfaces, DHCP, VPN, rutas |
| **Threatdown** | Seguridad | Endpoints, detecciones, políticas, grupos |
| **Generic REST API** | Cualquiera | Ping, requests personalizados |

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm 9+

### 1. Instalar dependencias

```bash
# Windows
setup.bat

# O manualmente:
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configurar entorno

```bash
# Copia el template
cp backend/.env.example backend/.env
```

Edita `backend/.env` y **cambia el ENCRYPTION_KEY**:
```env
ENCRYPTION_KEY=tu-clave-de-32-caracteres-segura!!
```

### 3. Iniciar

```bash
# Windows
start.bat

# O manualmente (dos terminales):
cd backend && npm run dev
cd frontend && npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

---

## 🏗️ Arquitectura

```
nautilus-hub/
├── backend/                 # Express + SQLite
│   ├── src/
│   │   ├── config/          # Configuración de entorno
│   │   ├── connectors/
│   │   │   ├── registry.js  # Registro de tipos de conectores
│   │   │   └── adapters/    # Adaptadores por herramienta
│   │   │       ├── base.js      # Clase base
│   │   │       ├── prtg.js      # PRTG adapter
│   │   │       ├── proxmox.js   # Proxmox VE adapter
│   │   │       ├── pmg.js       # Proxmox Mail Gateway
│   │   │       ├── pfsense.js   # pfSense/OPNsense
│   │   │       ├── threatdown.js # Threatdown
│   │   │       └── generic.js   # Generic REST
│   │   ├── db/              # SQLite con better-sqlite3
│   │   ├── middleware/      # Error handling
│   │   ├── routes/          # API endpoints
│   │   └── utils/           # Encryption, logger
│   └── data/                # SQLite database (auto-created)
│
└── frontend/                # React + Vite + Tailwind
    └── src/
        ├── components/
        │   ├── ui/           # Componentes base (shadcn-style)
        │   ├── layout/       # Sidebar, TopBar, Layout
        │   └── connectors/   # StatusBadge, ConnectorIcon, etc.
        ├── pages/            # Dashboard, Connectors, Settings
        └── lib/              # API client, utilities
```

## 🔌 Agregar un Nuevo Conector (Extensibilidad)

1. **Crear adaptador** en `backend/src/connectors/adapters/mi-herramienta.js`:

```javascript
import { BaseAdapter } from './base.js';

export class MiHerramientaAdapter extends BaseAdapter {
  async probe() {
    const result = await this.safeGet('/api/status');
    if (!result.success) return { online: false, capabilities: [], error: result.error };

    return {
      online: true,
      capabilities: ['status', 'metrics'],
      metadata: { version: result.data.version },
    };
  }

  async execute(capability, params) {
    switch (capability) {
      case 'status': return this.getStatus();
      case 'metrics': return this.getMetrics(params);
    }
  }
  // ...
}
```

2. **Registrar** en `backend/src/connectors/registry.js`:

```javascript
import { MiHerramientaAdapter } from './adapters/mi-herramienta.js';

export const CONNECTOR_REGISTRY = {
  // ... existing ...
  mi_herramienta: {
    label: 'Mi Herramienta',
    description: 'Descripción de la herramienta',
    category: 'monitoring',
    icon: 'activity',
    adapter: MiHerramientaAdapter,
    defaultPort: 8080,
    authTypes: ['basic', 'apikey'],
    docsUrl: 'https://docs.mi-herramienta.com',
  },
};
```

¡Listo! El frontend detecta automáticamente el nuevo tipo de conector.

---

## 🔒 Seguridad

- Credenciales cifradas con **AES-256-GCM** + **PBKDF2** (100,000 iteraciones)
- El frontend **nunca recibe** credenciales en texto plano
- Las credenciales mostradas en la UI son **enmascaradas** (****xxxx)
- Rate limiting en todos los endpoints API
- Headers de seguridad con Helmet.js
- SSL verification configurable por conector (para entornos con certs auto-firmados)

---

## 📡 API Reference

### Conectores
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/connectors` | Listar todos |
| GET | `/api/connectors/:id` | Obtener uno |
| POST | `/api/connectors` | Crear |
| PUT | `/api/connectors/:id` | Actualizar |
| DELETE | `/api/connectors/:id` | Eliminar |
| POST | `/api/connectors/:id/execute` | Ejecutar capacidad |
| GET | `/api/connectors/:id/logs` | Ver logs |
| GET | `/api/connectors/types` | Tipos disponibles |

### Probe
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/probe/:connectorId` | Probar un conector |
| POST | `/api/probe/batch/all` | Probar todos |

### Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Resumen general |
| GET | `/api/dashboard/connectors-status` | Estado de conectores |

---

*Nautilus Integration Hub — Rolosa © 2025*
