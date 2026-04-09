# Time Flow - Plataforma de Control Horario

Sistema integral de registro horario y gestión de proyectos, diseñado para empresas industriales. Separa flujos de trabajo en paneles de administración avanzados y experiencias móviles simplificadas para operarios, conectando la actividad del personal a proyectos, licitaciones e I+D con cálculos de rentabilidad automáticos.

## Stack Tecnológico

**Frontend (Cliente Web):**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Shadcn UI (Componentes Radix)
- React Router DOM
- TanStack Query (React Query)
- Vitest & Playwright (Testing)

**Backend (API Rest):**
- Python 3.12
- FastAPI
- SQLAlchemy (ORM)
- Alembic (Migraciones)
- PostgreSQL (Producción) / SQLite (Testing)
- Pydantic
- Pytest (Testing)

---

## 🚀 Despliegue Rápido (Entorno Demo)

Para ver la aplicación funcionando rápidamente, hemos suministrado un **Script de Auto-arranque** que levanta todo el entorno mediante **Docker Compose** (Frontend Nginx, Backend FastAPI y PostgreSQL) y lo pre-carga con datos oficiales y de prueba.

### Requisitos Previos:
- Docker y Docker Compose instalados.


### Ejecución:

Desde la raíz del proyecto, simplemente ejecuta:

```bash
./start_all.sh
```

El script se encargará de:
  1. Crear una base de datos PostgreSQL persistente.
  2. Inyectar (sembrar) los usuarios oficiales, administradores y datos demo (proyecto MANGO).
  3. Levantar la aplicación completa (UI y API) en el puerto `80`.


Para detener ambos servidores, simplemente pulsa `Ctrl + C` en esa misma terminal o ejecuta `docker compose down`.

---

## 🔗 Enlaces de Acceso (Local)
- **Frontend**: http://localhost
- **Documentación API**: http://localhost/api/docs
- **Salud del Sistema**: http://localhost/api/health


---

## 👥 Cuentas Demo Generadas

Una vez que arranques el script `./start_all.sh` y abras `http://localhost`, puedes probar la aplicación usando los siguientes perfiles generados dinámicamente:

### 👑 Panel de Administración
*Control total sobre proyectos, creación de usuarios, reportes y exportación.*

| Usuario | Contraseña | Nombre | Rol |
|---------|------------|--------------|------------|
| `ADMIN` | `admin123` | Super Admin | Admin |
| `GPinol` | `GP_rk.92#Xp26_!` | Gemma Pinol | Admin |
| `ESoriano` | `ES_rk.47*Zs18_?` | Ernesto Soriano | Admin |
| `CMartinez` | `CM_rk.63+Lm99_$` | Cristian Martinez | Admin |
| `PCabaleiro` | `PC_rk.15&Vr34_#` | Pablo Cabaleiro | Admin |

### 👷 Empleados Reales (seed_mango.py — proyecto MANGO / PRJ-002)
*Contraseña por defecto: `1234` para todos.*

| Usuario | Contraseña | Nombre | Rol |
|---------|------------|------------------|--------------------------|
| `manolosal` | `1234` | Manolo Salamanca | Proyectistas Mecánicos |
| `albertorey` | `1234` | Alberto Reyes | Proyectistas Eléctricos |
| `franciscorey` | `1234` | Francisco Reyes | Programadores |
| `jonathanmor` | `1234` | Jonathan Moral | Montadores |
| `antonioval` | `1234` | Antonio Valverde | Proyectistas Mecánicos |
| `albertoher` | `1234` | Alberto Hernandez | Proyectistas Eléctricos |
| `antoniosil` | `1234` | Antonio Silva | Montadores |
| `arnauani` | `1234` | Arnau Anillo | Proyectistas Mecánicos |
| `xaviercas` | `1234` | Xavier Castillo | Proyectistas Eléctricos |
| `ivandelo` | `1234` | Ivan de los Rios | Programadores |
| `mariogar` | `1234` | Mario García | Montadores |


> [!NOTE]
> **Roles Dinámicos**: En esta versión, un usuario puede tener un rol global (como Programador) pero el Administrador puede asignarle un rol distinto para un proyecto específico (ej. Montador en Proyecto X). La plataforma detectará automáticamente qué tareas mostrar según el rol activo en el proyecto seleccionado.

---

## 🛡️ Estructura del Proyecto

```text
time-flow-main/
├── backend/                  # Servidor API FastAPI
│   ├── app/                  # Código fuente Backend
│   │   ├── auth/             # Dependencias JWT, Hashing
│   │   ├── config/           # Variables de entorno
│   │   ├── database/         # Motor de DB Local/Prod
│   │   ├── models/           # Esquemas SQLAlchemy (DB)
│   │   ├── routers/          # Controladores Endpoints (/users, /auth, etc)
│   │   ├── schemas/          # Control de Vistas/DTO (Pydantic)
│   │   └── services/         # Lógica de Negocio, validaciones exclusivas
│   ├── tests/                # Suites de Pruebas Pytest (Aislamiento backend)
│   ├── alembic/              # Generador de migraciones ORM
│   ├── main.py               # Entrypoint Uvicorn
│   └── seed_demo.py          # Script de auto-generación poblacional
│
├── src/                      # Cliente SPA UI React
│   ├── components/           # Componentes de UI genéricos e interfaces web
│   ├── contexts/             # Aislamiento de Estado (SessionStorage/Auth)
│   ├── data/                 # Enums y Constantes nativos
│   ├── hooks/                # Custom hooks (e.g. validaciones móviles)
│   ├── pages/                # Vistas enrutadas (Admin Dashboard, Log Hours...)
│   ├── services/             # Wrapper API Fetch (Comunicación con Backend)
│   └── test/                 # Component Testing mediante Vitest / Testing Library
│
├── e2e/                      # Suites Playwright (Flujos Dorados Simulados End-To-End)
├── package.json
└── start_all.sh              # Macro-script de Demostración
```

---

## ✅ Quality Assurance y Testing

El proyecto ha superado una Fase de QA profunda mediante pruebas unitarias, de integración y End-to-End.

### Backend (Pytest)
```bash
cd backend && pytest tests/ -v
```
Comprueba el enrutado, los servicios internos, la autenticación JWT y decenas de Edge Cases en la base de datos (rechazos por falta de asignaciones, restricciones de límite de hora, fallos intencionales RBAC 403).

### Frontend Componentes (Vitest)
```bash
npm run test
```
Renderiza el Virtual DOM de React en JSDom comprobando que los validadores de formularios, las notificaciones Toast y las bifurcaciones lógicas de renderizado condicional operen a la perfección con librerías pesadas como Radix UI.

### Flujos Simulación E2E (Playwright)
```bash
npx playwright test
```
Dos workflows dorados de extremo a extremo automatizados visualmente:
- Secuencia *Admin*: Login administrativo > Crea Usuario > Crea Proyecto > Asigna Proyecto.
- Secuencia *User*: Login de operario > Atraviesa Wizard de Fichaje Dinámico > Recibe comprobante de registro horario.

---

## 🏗️ Base de Datos y Semillas

Para facilitar el despliegue y el desarrollo, el sistema incluye una arquitectura de datos relacional optimizada para la trazabilidad industrial.

### Modelo de Datos (ERD)

La base de datos se estructura en torno a 5 entidades principales:

1.  **`users`**: Empleados con su código único, contraseña (hashed) y rol global.
2.  **`projects`**: Centros de coste/trabajo con ubicación, tipo y tiempos de viaje configurados.
3.  **`project_users` (Asociación)**: Tabla crucial que vincula usuarios a proyectos. Implementa los **Roles Dinámicos**, permitiendo que un usuario sea "Montador" en un proyecto y "Management" en otro.
4.  **`tasks`**: Catálogo de actividades industriales (oficina, taller, planta). Controla la visibilidad mediante `allowed_roles` (formato JSON).
5.  **`time_entries`**: El núcleo del sistema. Registra horas, horas extra, dietas, tipo de vehículo y tiempos de desplazamiento calculados.

### Lógica de la Semilla (Seeders)

El comando `./start_all.sh` utiliza el script `backend/scripts/seeds/seed_demo.py` que realiza las siguientes acciones:

- **Infraestructura**: Crea las tablas automáticamente mediante SQLAlchemy.
- **Catálogo Técnico**: Inyecta 27 tareas industriales categorizadas por fases (100-Oficina, 200-Materiales, 300-Taller, 400-Planta).
- **Proyectos Tipo**: Crea proyectos de tipo `standard` (con control de KM), `offer` (licitaciones) y `non-productive` (I+D interno).
- **Simulación Masiva**: Genera un histórico aleatorio de fichajes para los últimos 10 días para todos los empleados demo, permitiendo visualizar gráficas y métricas de inmediato en el dashboard de administración.

---

---
## Licencia
Uso Privativo Comercial - Todos Los Derechos Reservados.
