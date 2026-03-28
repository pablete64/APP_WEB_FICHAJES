# 🛡️ Registro de Auditoría de Seguridad - Time Flow

Este documento registra los hallazgos, correcciones y mejoras aplicadas en materia de seguridad y robustez del sistema para asegurar la integridad de la aplicación.

---

## 📅 [2026-03-20] - Corrección de Configuración y Tipado Frontend

**🔍 Hallazgos:**
1.  **URL Base Hardcodeada:** En `src/services/api.ts` y en `AllProjectsDashboard.tsx` se utilizaba el string `"http://localhost:8000"`.
2.  **Limitación de Tipado en Query String:** Las firmas de los métodos de servicio (`reportService.ts`) limitaban `filters` a `Record<string, string>`, impidiendo pasar primitivos como `false` o `0` de forma nativa desde React.
3.  **Comentarios de mockup (Admin Setup):** `AuthContext.tsx` referenciaba un login temporal que de hecho ya es definitivo y compatible con la semilla de base de datos (`ADMIN`).

**🛠️ Acciones de Mitigación:**
1.  **Unificación de Entornos (Vite):**
    *   Se configuró `envDir: 'backend'` en `vite.config.ts` para que Frontend y Backend compartan el almacenamiento de configuraciones.
    *   Se eliminó el fallback estático `'http://localhost:8000'` en `api.ts`.
    *   Se añadieron entradas `VITE_API_URL` en `backend/.env` y `backend/.env.example`.
    *   Se actualizó `AllProjectsDashboard.tsx` para leer la URL dinámicamente.
2.  **Tipado Seguro (`FilterParams`):**
    *   Se creó el tipo `FilterParams` que permite primitivos en `reportService.ts`.
    *   Se actualizaron las firmas de `getAnalyticsSummary`, `getProjectReport`, etc., para admitir este tipo.
3.  **Unificación de Credenciales:**
    *   Se documentó formalmente en el contexto que el Login de Admin (`ADMIN`) es fijo y alineado con semillas y tests visuales/E2E.

---

## 📅 [2026-03-20] - Corrección de CORS Inseguro

**🔍 Hallazgo:**
En `backend/app/main.py`, el middleware CORS (`CORSMiddleware`) permitía cualquier origen (`allow_origins=["*"]`) junto con `allow_credentials=True`. Esto es una práctica insegura que puede permitir que atacantes lean datos confidenciales desde scripts alojados en dominios maliciosos (Cross-Site Scripting / Data Leaks).

**🛠️ Acciones de Mitigación:**
1.  **Parametrización por Entorno:**
    *   Se añadió `ALLOWED_ORIGINS` (cadena separada por comas) en `backend/app/config/settings.py`.
    *   Se modificó `.env` y `.env.example` para incluir por defecto solo el frontend local: `http://localhost:8080`.
2.  **Validación en Arranque (Fail-Fast):**
    *   Se añadió un `@field_validator("ALLOWED_ORIGINS")` que **lanza un error** y detiene el arranque de la API si se intenta colocar un comodín inseguro `*`.
3.  **Middleware Dinámico:**
    *   Se modificó `app/main.py` para que lea y splitee `settings.ALLOWED_ORIGINS` en una lista compatible con el middleware de FastAPI de forma limpia y robusta.
4.  **Tests de Integración y Validación:**
    *   Se creó `backend/tests/test_cors.py` para bloquear fallos en preflights de orígenes no autorizados y validar que Validator de Pydantic bloquea `*` correctamente.

---

## 📅 [2026-03-20] - Endurecimiento de SECRET_KEY y JWT

**🔍 Hallazgo:**
El archivo `backend/app/config/settings.py` contenía un fallback por defecto para `SECRET_KEY` si esta no se definía en las variables de entorno (`super-secret-key-change-it`). Además, `.env.example` contenía un hash estático que podría inducir a su reutilización en entornos de producción.

**🛠️ Acciones de Mitigación:**
1.  **Eliminación de Defaults Inseguros:**
    *   Se eliminó el valor por defecto de `SECRET_KEY` en `settings.py`. Ahora es de tipo `SECRET_KEY: str` obligatorio (Fail-Fast: la app no arranca si falta).
2.  **Validación Robusta (Pydantic):**
    *   Se añadió un `@field_validator("SECRET_KEY")` en `settings.py` que comprueba que la clave tenga **al menos 32 caracteres** de longitud y no contenga marcadores por defecto.
3.  **Higiene en .env.example:**
    *   Se reemplazó el hash estático por un string indicativo: `TU_SECRET_KEY_AQUI_MINIMO_32_CARACTERES_PARA_PRODUCCION`.
4.  **Tests de Integración:**
    *   Se creó `backend/tests/test_jwt.py` para verificar que Settings dispare una `ValidationError` ante ausencias o claves cortas.
    *   Se validó el comportamiento del api ante tokens manipulados (tampered) o expirados de forma controlada.

Además del CORS, se aplicaron ajustes para robustez:
*   **Case Insensitivity:** El login de administrador intentaba mandar accidentalmente `admin` en minúsculas mientras que la base de datos tenía `ADMIN` en mayúsculas (creando 401 Unauthorized ante correctas credenciales). Corregido en `src/contexts/AuthContext.tsx`.
*   **Cierre de Dialecto de Bases de Datos:** Parcheado `report_service.py` para detectar condicionalmente motores SQL (evitando bloqueos de `strftime` al correr en PostgreSQL nativo).

---

## 📅 [2026-03-20] - Eliminación de Borrado Físico (Soft Delete)

**🔍 Hallazgo:**
El sistema realizaba borrados físicos (`db.delete()`) en registros críticos (`Users`, `Projects`, `TimeEntries`). Esto generaba pérdida irreversible de datos históricos y eliminaba la trazabilidad (audit trail) indispensable para revisiones operativas e industriales.

**🛠️ Acciones de Mitigación:**
1.  **Columnas de Control (Modelos):** Se añadió `deleted_at = Column(DateTime)` en `User`, `Project` y `TimeEntry` para almacenar la traza del instante de borrado.
2.  **Lógica de Negocio (Servicios):**
    *   Se reemplazó `db.delete(item)` por `item.deleted_at = func.now()`.
    *   Se actualizaron las consultas de listado (`get`, `list_users`, etc.) para filtrar automáticamente registros: `.filter(Model.deleted_at == None)`.
3.  **Filtrado en Reportes:** Se modificó `report_service.py/apply_filters` para descartar fichajes borrados de los cálculos agregados.
4.  **Tests de Regresión:** Creado `backend/tests/test_soft_delete.py` que convalida que el item permanece intacto en BD tras el borrado (`deleted_at != None`) pero desaparece de consultas.
     
---

## 📅 [2026-03-20] - Unificación de Validaciones y Autorización (Allowed Roles)

**🔍 Hallazgo:**
Las validaciones críticas de negocio en `create_time_entry` estaban ausentes en `update_entry` (creando un bypass para administradores o fallas de consistencia). Además, la restricción de `Task.allowed_roles` no se validaba en backend, confiando en reglas frontend o de cliente.

**🛠️ Acciones de Mitigación:**
1.  **Capa de Validación Unificada:** Se creó `_validate_time_entry_business_rules()` en `time_entry_service.py` reuniendo toda la lógica: no fechas futuras, restricciones de rol (no-admin), pertenencia de proyecto y formato de horas.
2.  **Soporte Para Actualizaciones:** Se modificó `update_entry` para disparar exactamente la misma capa antes de aplicar los commits de mutación, sellando el bypass.
3.  **Hacking de Roles (`allowed_roles`):** Se ha habilitado la comprobación estricta que cruza la columna `allowed_roles` de `Task` contra el `User.role` del ejecutor, lanzando `403 Forbidden` si el rol no está expresamente permitido.
4.  **Tests de Regresión:** Creado `backend/tests/test_validation.py` verificando que modificar un task para un rol no autorizado bloquee la creación, y que un intento de actualización (mediante admin) de fechas futuras sea rechazado por el servidor (`400 Bad Request`).

---

## 📅 [2026-03-20] - Refactorización de Informes y Autenticidad de Pruebas (PostgreSQL)

**🔍 Hallazgos:**
1.  **Monolito de Servicios:** `report_service.py` gestionaba filtrado, consultas SQL exactas, procesamiento in-memory para analíticas de Dashboard (Recharts) y exportación de hojas Excel XLSX, mezclando responsabilidades.
2.  **Entorno de Tests Aislado (Monkeypatched):** `backend/tests/conftest.py` aplicaba un hack (`ARRAY = lambda x: ArrayAsJSON()`) para emular soporte de arrays en SQLite en memoria, ocultando el comportamiento del dialecto real de producción (PostgreSQL).
3.  **Fixtures Desalineados:** Los nombres de categorías y roles en los tests (`"Mechanical Engineering"`, `"Assemblers"`) diferían de los usados en producción/seeds (`"Oficina Técnica"`, `"Montadores"`), provocando que pruebas de seguridad (RBAC) corrieran sobre escenarios no realistas.

**🛠️ Acciones de Mitigación:**
1.  **Refactorización Modular (`report_service/`):**
    *   Se dividió el archivo en sub-módulos: `query.py` (filtros y sumas), `analytics.py` (estructuras JSON de agregados) y `export.py` (construcción binaria de XLSX de OpenPyXL).
    *   Se empaquetó como carpeta de servicio para mantener la compatibilidad con el router de FastAPI de forma limpia y transparente.
2.  **Habilitación de Entorno PostgreSQL para Tests:**
    *   Se eliminó el monkeypatch de emulación de array de SQLite.
    *   Se actualizó `conftest.py` para crear/conectar en caliente una base de datos `timeflow_test` en PostgreSQL, habilitando la ejecución de pruebas nativas sobre el motor de producción.
3.  **Sincronización de Datos de Dominio (Fixtures):**
    *   Se tradujeron las categorías y roles en `conftest.py` a su homólogo en español actualizados según `seed_demo.py`.
    *   Se corrigieron las pruebas de creación de fichajes asegurando que crucen las validaciones RBAC de forma legítima.
4.  **Tests y Verificación:**
    *   Añadidos tests para consolidado de Dashboard (`test_reports_analytics_summary`).
    *   **Estatus:** 42 de 42 pruebas de la API superadas exitosamente con Postgres real ✅.

---

## 📅 [2026-03-20] - Endurecimiento de Scripts de Arranque (`start_all.sh`)

**🔍 Hallazgos:**
1.  **Arranque Frágil:** `start_all.sh` carecía de directivas `set -e` o mitigaciones de fallas en cascada, continuando el flujo para levantar el Frontend uvicorn incluso si las semillas (`python seed_demo.py`) o el Backend fallaban al arrancar.
2.  **Falta de Coordinación (*Race Condition*):** Anunciaba que los servicios estaban levantados sin validar que los sockets de los puertos `8000` y `8080` estuvieran realmente respondiendo conexiones.

**🛠️ Acciones de Mitigación:**
1.  **Fail-Fast Activado:** Introducción de `set -euo pipefail` para frenar la ejecución de inmediato ante el primer error de tubería o script de base de datos.
2.  **Readiness Checks (Validación en vivo):**
    *   Implementada la función `wait_for_port()` mediante `nc -z` para bloquear el paso de fases hasta que el Backend y el Frontend estén escuchando en sus puertos respectivos.
3.  **Supervisión de Procesos en Segundo Plano:**
    *   Añadida pausa de seguridad para verificar instantáneamente con `kill -0 "$PID"` si los servidores mueren por conflictos (ej: puerto ocupado).
    *   Implementado un bucle de monitorización continua que detecta si el Frontend o Backend se detienen para apagar ambos limpiamente y evitar procesos huérfanos.
4.  **Verificación**: Probado y validado de forma e2e mediante script shell levantando servicios y testeando con `curl Docs` con éxito ✅.
