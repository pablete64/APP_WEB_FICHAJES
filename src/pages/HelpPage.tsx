import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle, Clock, Users, FolderKanban, ListTodo, FileBarChart,
  FileSpreadsheet, Briefcase, History, BarChart3, LogIn, Shield, AlertTriangle
} from "lucide-react";

export default function HelpPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Guía Completa de la Aplicación</h1>
      </div>

      {/* Introducción */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">📋 ¿Qué es esta aplicación?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            <strong>Control Horario</strong> es una aplicación web interna de empresa diseñada para que los empleados
            (ingenieros, programadores, montadores y técnicos) registren sus horas de trabajo diarias por proyecto y por tarea.
          </p>
          <p>
            La aplicación funciona como un <strong>panel de control (dashboard)</strong> profesional con navegación lateral,
            optimizada tanto para escritorio como para móvil. Prioriza la <strong>velocidad y simplicidad</strong> para el
            registro diario de horas.
          </p>
          <p>
            Existen dos roles principales: <Badge variant="secondary">Administrador</Badge> y <Badge variant="outline">Empleado (Usuario)</Badge>.
          </p>
        </CardContent>
      </Card>

      {/* Login */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><LogIn className="h-5 w-5" /> Inicio de Sesión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Al abrir la aplicación aparece la pantalla de inicio de sesión con dos pestañas:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Empleado:</strong> Introduce tu nombre completo y la contraseña que te ha asignado el administrador.</li>
            <li><strong>Administrador:</strong> Introduce la contraseña de administrador (por defecto: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">admin123</code>).</li>
          </ul>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs"><strong>Importante:</strong> El nombre de usuario debe coincidir exactamente con el nombre registrado por el administrador (mayúsculas y minúsculas incluidas).</p>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* SECCIÓN ADMINISTRADOR */}
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" /> Funciones del Administrador
      </h2>

      {/* Panel Admin */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Panel de Administración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Es la pantalla principal del administrador. Muestra un resumen general con:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Horas Totales:</strong> Suma de todas las horas registradas por todos los empleados.</li>
            <li><strong>Horas Extra:</strong> Suma total de horas extra registradas.</li>
            <li><strong>Empleados:</strong> Número total de usuarios registrados en el sistema.</li>
            <li><strong>Proyectos:</strong> Número total de proyectos creados.</li>
          </ul>
          <p>Además incluye dos gráficos de barras:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Horas por Proyecto:</strong> Muestra cuántas horas se han dedicado a cada proyecto.</li>
            <li><strong>Horas por Empleado:</strong> Muestra cuántas horas ha registrado cada empleado.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Gestión de Usuarios */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Desde esta sección el administrador puede crear y eliminar usuarios. Para crear un usuario se necesitan los siguientes campos:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Nombre:</strong> Nombre completo del empleado (será usado para iniciar sesión).</li>
            <li><strong>Domicilio:</strong> Ubicación del domicilio del empleado (usado para cálculos de distancia en tareas de planta cliente).</li>
            <li><strong>Rol:</strong> Define qué tipo de tareas puede realizar. Roles disponibles:
              <ul className="list-disc pl-6 mt-1">
                <li>Ingenieros Mecánicos</li>
                <li>Ingenieros Eléctricos</li>
                <li>Programadores</li>
                <li>Montadores</li>
              </ul>
            </li>
            <li><strong>Contraseña:</strong> Contraseña que usará el empleado para iniciar sesión.</li>
          </ul>
          <p>El rol es muy importante porque <strong>filtra las tareas disponibles</strong> cuando el empleado registra horas. Cada rol solo ve las tareas asignadas a su perfil profesional.</p>
        </CardContent>
      </Card>

      {/* Gestión de Proyectos */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Gestión de Proyectos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>El administrador crea proyectos con los siguientes campos:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Tipo de Proyecto:</strong>
              <ul className="list-disc pl-6 mt-1">
                <li><strong>Estándar:</strong> Proyecto normal con múltiples tareas.</li>
                <li><strong>Preparación de Oferta:</strong> Proyecto para registrar preventas y estudios de oferta.</li>

                <li><strong>No Productivo (código 000):</strong> Para registrar horas que no corresponden a ninguna actividad productiva (formación, reuniones internas, etc.).</li>
              </ul>
            </li>
            <li><strong>Nombre del Proyecto:</strong> Nombre descriptivo.</li>
            <li><strong>Código del Proyecto:</strong> Código alfanumérico único introducido manualmente por el administrador.</li>
            <li><strong>Ubicación:</strong> Lugar donde se desarrolla el proyecto.</li>
            <li><strong>Distancia desde el taller (km):</strong> Distancia automática entre el taller de la empresa y la ubicación del proyecto.</li>
            <li><strong>Fecha de inicio:</strong> Fecha de comienzo del proyecto.</li>
            <li><strong>Asignación de usuarios:</strong> Se pueden asignar usuarios individualmente (haciendo clic en sus nombres) o activar "Asignar a todos los usuarios".</li>
          </ul>
          <p>Solo los usuarios asignados a un proyecto lo verán en su lista al registrar horas. Los proyectos "No Productivo" están disponibles para todos.</p>
        </CardContent>
      </Card>

      {/* Sistema de Tareas */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-4 w-4" /> Sistema de Tareas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Las tareas son actividades codificadas que los empleados seleccionan al registrar horas. Están organizadas por categorías:</p>
          
          <div className="space-y-3">
            <div>
              <p className="font-medium">💼 Ofertas (código 100)</p>
              <ul className="list-disc pl-6 text-xs space-y-0.5 text-muted-foreground">
                <li>100 – Ofertas</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">🔧 Ingeniería Mecánica (códigos 1XX)</p>
              <ul className="list-disc pl-6 text-xs space-y-0.5 text-muted-foreground">
                <li>111 – Dirección técnica mecánica</li>
                <li>112 – Diseño 3D</li>
                <li>113 – Diseño 2D</li>
                <li>114 – Documentación mecánica</li>
                <li>115 – Estudio de oferta</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">⚡ Ingeniería Eléctrica y Automatización (códigos 12X)</p>
              <ul className="list-disc pl-6 text-xs space-y-0.5 text-muted-foreground">
                <li>121 – Dirección técnica eléctrica</li>
                <li>122 – Diseño eléctrico</li>
                <li>123 – Programación PLC offline</li>
                <li>124 – Programación robot offline</li>
                <li>125 – Puesta en marcha PLC (interna)</li>
                <li>126 – Puesta en marcha robot (interna)</li>
                <li>127 – Documentación eléctrica</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">📦 Materiales (códigos 2XX)</p>
              <ul className="list-disc pl-6 text-xs space-y-0.5 text-muted-foreground">
                <li>211 – Artículos comerciales mecánicos</li>
                <li>212 – Materia prima</li>
                <li>221 – Artículos comerciales eléctricos</li>
                <li>222 – Artículos comerciales de fluidos</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">🏭 Taller Mecánico (códigos 3XX)</p>
              <ul className="list-disc pl-6 text-xs space-y-0.5 text-muted-foreground">
                <li>311 – Fabricación</li>
                <li>312 – Metrología</li>
                <li>313 – Montaje y preparación de piezas</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">🔌 Taller Eléctrico (códigos 32X)</p>
              <ul className="list-disc pl-6 text-xs space-y-0.5 text-muted-foreground">
                <li>321 – Armarios y cajas eléctricas</li>
                <li>322 – Montaje e instalación eléctrica</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">🏗️ Actividades en Planta del Cliente (códigos 4XX)</p>
              <ul className="list-disc pl-6 text-xs space-y-0.5 text-muted-foreground">
                <li>411 – Montaje y puesta en marcha en cliente</li>
                <li>421 – Instalación eléctrica en cliente</li>
                <li>422 – Instalación de fluidos en cliente</li>
                <li>431 – Puesta en marcha PLC y software</li>
                <li>432 – Puesta en marcha robot</li>
                <li>433 – Formación al cliente</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20 mt-4">
            <AlertTriangle className="h-4 w-4 text-info mt-0.5 shrink-0" />
            <p className="text-xs"><strong>Nota:</strong> Las tareas que ve cada empleado están filtradas según su rol. Un montador no verá tareas de diseño, y un ingeniero mecánico no verá tareas de programación PLC.</p>
          </div>
        </CardContent>
      </Card>

      {/* Informes */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileBarChart className="h-4 w-4" /> Informes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Muestra una tabla completa tipo "hoja de cálculo" con todas las entradas de tiempo registradas. Las columnas son:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fecha</li>
            <li>Empleado</li>
            <li>Proyecto (código + nombre)</li>
            <li>Código de tarea</li>
            <li>Nombre de tarea</li>
            <li>Horas trabajadas</li>
            <li>Horas extra</li>
          </ul>
          <p>Los registros se muestran ordenados del más reciente al más antiguo.</p>
        </CardContent>
      </Card>

      {/* Exportar */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Exportar a Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Permite descargar todos los registros de horas en un archivo <strong>CSV</strong> (compatible con Microsoft Excel, Google Sheets, LibreOffice Calc).</p>
          <p>El archivo incluye las siguientes columnas:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fecha, ID Empleado, Nombre Empleado</li>
            <li>Código Proyecto, Nombre Proyecto</li>
            <li>Código Tarea, Nombre Tarea</li>
            <li>Horas, Horas Extra</li>
            <li>Festivo (Sí/No)</li>
            <li>Vehículo (Personal/Empresa) — solo para tareas 4XX</li>
            <li>Dieta (Sí/No) — solo para tareas 4XX</li>
            <li>Distancia desde (Domicilio/Taller) — solo para tareas 4XX</li>
          </ul>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* SECCIÓN EMPLEADO */}
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" /> Funciones del Empleado
      </h2>

      {/* Registrar Horas */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Registrar Horas (Flujo Principal)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Esta es la <strong>función más importante</strong> de la aplicación. Los empleados registran sus horas de trabajo diarias siguiendo un flujo guiado de 7 pasos:</p>
          
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge className="shrink-0">Paso 1</Badge>
              <div><strong>Seleccionar Proyecto:</strong> Elige uno de los proyectos que te han asignado. También verás el proyecto "Horas No Productivas" (código 000).</div>
            </div>
            <div className="flex gap-3">
              <Badge className="shrink-0">Paso 2</Badge>
              <div><strong>Seleccionar Rol:</strong> Elige tu rol dentro de este proyecto específico (puede ser diferente de tu rol general). Esto filtra las tareas disponibles.</div>
            </div>
            <div className="flex gap-3">
              <Badge className="shrink-0">Paso 3</Badge>
              <div><strong>Seleccionar Fecha:</strong> Por defecto aparece la fecha de hoy. Puedes cambiarla si necesitas registrar horas de días anteriores.</div>
            </div>
            <div className="flex gap-3">
              <Badge className="shrink-0">Paso 4</Badge>
              <div><strong>¿Festivo?:</strong> Marca si el día seleccionado es festivo. Esto queda reflejado en los informes.</div>
            </div>
            <div className="flex gap-3">
              <Badge className="shrink-0">Paso 5</Badge>
              <div><strong>Seleccionar Tarea:</strong> Elige la tarea en la que has trabajado. Solo aparecen las tareas correspondientes al rol seleccionado en los pasos anteriores.</div>

            </div>
            <div className="flex gap-3">
              <Badge className="shrink-0">Paso 6</Badge>
              <div><strong>Horas Trabajadas:</strong> Introduce las horas normales trabajadas (ej. 8). Se aceptan medias horas (0.5, 1.5, etc.).</div>
            </div>
            <div className="flex gap-3">
              <Badge className="shrink-0">Paso 7</Badge>
              <div><strong>Horas Extra:</strong> Introduce las horas extra trabajadas (puede ser 0). Haz clic en "Enviar" para guardar.</div>
            </div>
          </div>

          <p>Tras enviar, la aplicación <strong>vuelve automáticamente al Paso 1</strong> para poder registrar más horas rápidamente.</p>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 mt-3">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-medium mb-1">⚠️ Condiciones especiales para tareas de Planta Cliente (códigos 4XX):</p>
              <p>Cuando seleccionas una tarea con código que empieza por 4 (actividades en la planta del cliente), aparecen campos adicionales obligatorios:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li><strong>Vehículo utilizado:</strong> Personal o de empresa.</li>
                <li><strong>Dieta de comida:</strong> Si se aplica dieta (Sí/No).</li>
                <li><strong>Cálculo de distancia:</strong> Desde tu domicilio al proyecto o desde el taller de la empresa al proyecto.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mis Proyectos */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> Mis Proyectos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Muestra en tarjetas todos los proyectos a los que estás asignado. Cada tarjeta muestra:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nombre y código del proyecto</li>
            <li>Ubicación</li>
            <li>Fecha de inicio</li>
            <li>Distancia desde el taller (si aplica)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Tabla con todos tus registros de horas ordenados del más reciente al más antiguo. Muestra:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fecha (con etiqueta "Festivo" si aplica)</li>
            <li>Proyecto (código + nombre)</li>
            <li>Tarea (código + nombre)</li>
            <li>Horas normales</li>
            <li>Horas extra</li>
          </ul>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Estadísticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>Vista personal con gráficos y resúmenes de tus horas:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Tarjetas resumen:</strong> Horas totales, horas extra totales, y número de proyectos.</li>
            <li><strong>Gráfico de barras:</strong> Distribución de tus horas por proyecto.</li>
            <li><strong>Gráfico circular:</strong> Distribución de tus horas por tipo de tarea (código).</li>
          </ul>
          <p>Estos gráficos se actualizan automáticamente cada vez que registras nuevas horas.</p>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Navegación */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">🧭 Navegación de la Aplicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>La aplicación usa una <strong>barra lateral (sidebar)</strong> que se puede contraer o expandir usando el botón de menú en la esquina superior izquierda.</p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium mb-2">Menú Administrador:</p>
              <ul className="space-y-1 text-xs">
                <li>📊 Panel – Vista general con métricas</li>
                <li>👥 Usuarios – Crear/eliminar empleados</li>
                <li>📁 Proyectos – Gestionar proyectos</li>
                <li>📋 Tareas – Ver catálogo de tareas</li>
                <li>📈 Informes – Tabla detallada</li>
                <li>📥 Exportar Excel – Descargar CSV</li>
                <li>❓ Ayuda – Esta página</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium mb-2">Menú Empleado:</p>
              <ul className="space-y-1 text-xs">
                <li>⏱️ Registrar Horas – Flujo principal</li>
                <li>💼 Mis Proyectos – Proyectos asignados</li>
                <li>📜 Historial – Registros anteriores</li>
                <li>📊 Estadísticas – Gráficos personales</li>
                <li>❓ Ayuda – Esta página</li>
              </ul>
            </div>
          </div>

          <p>En la parte inferior del menú lateral hay un botón <strong>"Cerrar sesión"</strong> y se muestra el nombre del usuario actual.</p>
        </CardContent>
      </Card>

      {/* Notas técnicas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">⚙️ Notas Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <ul className="list-disc pl-6 space-y-2">
            <li>Los datos se almacenan actualmente en el <strong>almacenamiento local del navegador</strong> (localStorage). Esto significa que los datos persisten en el mismo navegador/dispositivo, pero no se sincronizan entre dispositivos.</li>
            <li>La aplicación es <strong>responsive</strong>: funciona correctamente en pantallas de escritorio, tablet y móvil.</li>
            <li>La contraseña de administrador por defecto es <code className="bg-muted px-1.5 py-0.5 rounded text-xs">admin123</code>.</li>
            <li>Para un entorno de producción real, se recomienda utilizar un servidor seguro con base de datos centralizada y autenticación profesional.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
