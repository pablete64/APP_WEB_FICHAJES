from io import BytesIO
from sqlalchemy.orm import Session
from sqlalchemy import func

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from app.models.time_entry import TimeEntry
from app.models.project import Project
from app.models.user import User
from app.models.task import Task
from .query import apply_filters

def generate_xlsx_export(db: Session, **filters) -> bytes:
    # 1. Consulta detallada: obtenemos cada registro individualmente
    query = db.query(
        Project.code.label("project_code"),
        Project.name.label("project_name"),
        Project.client.label("project_client"),
        Project.distance_from_workshop.label("project_distance"),
        Project.travel_time.label("project_travel_time"),
        Project.km_rate.label("project_km_rate"),
        TimeEntry.date.label("date"),
        TimeEntry.is_holiday.label("is_holiday"),
        User.employee_code.label("employee_code"),
        User.name.label("employee_name"),
        Task.code.label("task_code"),
        Task.name.label("task_name"),
        TimeEntry.vehicle_type.label("vehicle_type"),
        TimeEntry.meals.label("meals"),
        TimeEntry.distance_origin.label("distance_origin"),
        TimeEntry.trip_type.label("trip_type"),
        TimeEntry.hours.label("effective_hours"),
        TimeEntry.overtime_hours.label("overtime_hours"),
        TimeEntry.travel_time.label("travel_time"),
        TimeEntry.meal_ticket_amount.label("meal_amount")
    ).join(Project, TimeEntry.project_id == Project.id)\
     .join(Task, TimeEntry.task_id == Task.id)\
     .join(User, TimeEntry.user_id == User.id)

    query = apply_filters(query, **filters)
    
    # Orden lógico: Proyecto -> Fecha -> Usuario -> Tarea
    entries = query.order_by(Project.code, TimeEntry.date, User.employee_code, TimeEntry.created_at).all()

    # Reestructuramos los datos para enviarlos al generador de la hoja:
    projects_dict = {}
    for entry in entries:
        p_code = entry.project_code
        if p_code not in projects_dict:
            projects_dict[p_code] = {
                "code": p_code,
                "name": entry.project_name,
                "client": entry.project_client,
                "rows": []
            }
        
        projects_dict[p_code]["rows"].append({
            "date": entry.date,
            "is_holiday": entry.is_holiday,
            "emp_code": entry.employee_code,
            "emp_name": entry.employee_name,
            "task_code": entry.task_code,
            "task_name": entry.task_name,
            "project_client": entry.project_client,
            "hours": float(entry.effective_hours),
            "overtime": float(entry.overtime_hours),
            "travel_time": float(entry.travel_time or 0),
            "project_travel_time": float(entry.project_travel_time or 0),
            "project_km_rate": float(entry.project_km_rate or 0),
            "vehicle": entry.vehicle_type,
            "meals": entry.meals,
            "meal_amount": float(entry.meal_amount or 0),
            "origin": entry.distance_origin,
            "trip_type": entry.trip_type,
            "project_distance": entry.project_distance
        })

    projects_list = list(projects_dict.values())
    return _build_openpyxl_wb(projects_list)

def _build_openpyxl_wb(projects: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Informe Horas"

    # ── Estilos ──
    header_font = Font(name="Arial", bold=True, size=10)
    header_fill = PatternFill("solid", fgColor="FFFF00")  # amarillo
    header_alignment = Alignment(horizontal="center", vertical="center")

    data_font = Font(name="Arial", size=10)
    data_alignment_left = Alignment(horizontal="left", vertical="center")
    data_alignment_center = Alignment(horizontal="center", vertical="center")
    data_alignment_right = Alignment(horizontal="right", vertical="center")

    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    # ── Anchos de columna ──
    col_widths = {
        "A": 12,   # Fecha
        "B": 10,   # Festivo
        "C": 14,   # Cód. empleado
        "D": 25,   # Nombre
        "E": 22,   # Cliente
        "F": 12,   # Cód. artículo
        "G": 25,   # Desc. artículo
        "H": 10,   # Horas
        "I": 10,   # H. Extra
        "J": 28,   # Horas extras sin desplazamiento
        "K": 12,   # Desplaz. (h)
        "L": 18,   # Horas productivas
        "M": 15,   # Transporte
        "N": 10,   # KMs
        "O": 12,   # Coste KM
        "P": 10,   # Dieta (S/N)
        "Q": 12,   # Importe Dieta
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    HEADERS = ["Fecha", "Festivo", "Cód. empleado", "Nombre", "Cliente", "Cód. artículo", "Desc. artículo", 
               "Horas", "H. Extra", "Horas extras sin desplazamiento", "Desplaz. (h)", "Horas productivas",
               "Transporte", "KMs", "Coste KM", "Dieta", "Importe Dieta"]

    # Style for holiday rows
    holiday_fill = PatternFill("solid", fgColor="FFC7CE")  # light red

    current_row = 1

    for proj_idx, project in enumerate(projects):
        if proj_idx > 0:
            current_row += 1  # fila en blanco entre proyectos

        # Título del proyecto
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=len(HEADERS))
        title_cell = ws.cell(row=current_row, column=1)
        title_cell.value = f"Proyecto: {project['code']} - {project['name']}"
        title_cell.font = Font(name="Arial", bold=True, size=11, color="333333")
        title_cell.alignment = Alignment(horizontal="left", vertical="center")
        title_cell.fill = PatternFill("solid", fgColor="D9E1F2")  # azul claro
        for col in range(1, len(HEADERS) + 1):
            ws.cell(row=current_row, column=col).border = thin_border
        current_row += 1

        # ── Cabecera amarilla ──
        for col_idx, header in enumerate(HEADERS, start=1):
            cell = ws.cell(row=current_row, column=col_idx)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border
        current_row += 1

        # ── Filas de datos agrupados por día y trabajador ──
        first_data_row = current_row
        for row_info in project["rows"]:
            
            # Castings estéticos
            emp_code = str(row_info["emp_code"])
            task_code = str(row_info["task_code"])
            is_holiday = row_info.get("is_holiday", False)
            
            # Mapeo de términos para mejor lectura: coche, moto o empresa
            v_type = str(row_info["vehicle"] or "").lower()
            if "coche" in v_type:
                transporte = "Coche particular"
            elif "moto" in v_type:
                transporte = "Moto particular"
            elif v_type in ("personal", "particular"):
                transporte = "Particular"
            elif v_type in ("company", "empresa"):
                transporte = "Empresa"
            else:
                transporte = "-"
            
            dieta = "SÍ" if row_info["meals"] else ("NO" if row_info["meals"] is False else "-")
            
            # Cálculo de KM: siempre reflejamos la distancia realizada, independientemente del transporte.
            multiplier = 2.0 if row_info["trip_type"] == "round" else 1.0
            dist_base = float(row_info["project_distance"] or 0.0)
            kms = dist_base * multiplier
            km_cost = kms * float(row_info.get("project_km_rate", 0) or 0)
            
            # Para el Excel usamos el tiempo configurado en proyecto.
            # En proyecto se guarda el total ida+vuelta en minutos.
            project_round_trip_minutes = float(row_info.get("project_travel_time", 0) or 0)
            if row_info["trip_type"] == "round":
                round_trip_travel = project_round_trip_minutes / 60.0
            elif row_info["trip_type"] in ("to", "from"):
                round_trip_travel = (project_round_trip_minutes / 2.0) / 60.0
            else:
                round_trip_travel = 0.0

            # Las horas extra son directas, las normales pueden verse afectadas por el viaje en algunos informes (opcional)
            # Para este reporte, mostramos lo que hay en base de datos de forma limpia:
            effective_hours = row_info["hours"]
            overtime_hours = row_info["overtime"]
            hours_without_travel = effective_hours + overtime_hours
            productive_hours = hours_without_travel - round_trip_travel

            row_data = [
                row_info["date"].strftime("%d-%m-%Y"),                 # Fecha
                "SÍ" if is_holiday else "",                            # Festivo
                int(emp_code) if emp_code.isdigit() else emp_code,     # Cód. empleado
                row_info["emp_name"],                                  # Nombre operario
                row_info["project_client"] or "",                      # Cliente
                int(task_code) if task_code.isdigit() else task_code,  # Cód. artículo (tarea)
                row_info["task_name"],                                 # Desc. artículo
                effective_hours,                                       # Horas normales
                overtime_hours,                                        # Horas extra
                hours_without_travel,                                  # Horas extra sin desplazamiento
                round_trip_travel,                                     # Desplaz. (h) ida+vuelta
                productive_hours,                                      # Horas productivas
                transporte,                                            # Transporte
                kms,                                                   # KMs
                km_cost,                                               # Coste KM
                dieta,                                                 # Dieta (S/N)
                row_info["meal_amount"],                               # Importe Dieta (€)
            ]

            for col_idx, value in enumerate(row_data, start=1):
                cell = ws.cell(row=current_row, column=col_idx)
                cell.value = value
                cell.font = data_font
                cell.border = thin_border

                if is_holiday:
                    cell.fill = holiday_fill

                if col_idx == 1:  # Fecha
                    cell.alignment = data_alignment_center
                elif col_idx == 2:  # Festivo
                    cell.alignment = data_alignment_center
                elif col_idx in (3, 6):  # códigos numéricos
                    cell.alignment = data_alignment_center
                elif col_idx in (4, 5, 7, 13, 16):  # textos y etiquetas
                    cell.alignment = data_alignment_left
                elif col_idx in (8, 9, 10, 11, 12, 14, 15, 17):  # numéricos
                    cell.alignment = data_alignment_right
                    cell.number_format = '#,##0.00'

            current_row += 1
            
        if first_data_row == current_row:
            last_data_row = first_data_row
            ws.cell(row=first_data_row, column=1).value = "Sin registros"
            current_row += 1
        else:
            last_data_row = current_row - 1

        # ── Fila de TOTAL por proyecto ──
        total_font = Font(name="Arial", bold=True, size=10)
        total_fill = PatternFill("solid", fgColor="E2EFDA")  # verde claro

        for col in range(1, 8):
            c = ws.cell(row=current_row, column=col)
            c.value = ""
            c.border = thin_border
            c.fill = total_fill

        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=7)
        label_cell = ws.cell(row=current_row, column=1)
        label_cell.value = f"TOTAL {project['code']}"
        label_cell.font = total_font
        label_cell.alignment = Alignment(horizontal="right", vertical="center")
        label_cell.fill = total_fill

        # Fórmula SUM para Horas (col G)
        sum_cell = ws.cell(row=current_row, column=8)
        sum_cell.value = f"=SUM(H{first_data_row}:H{last_data_row})"
        sum_cell.font = total_font
        sum_cell.alignment = data_alignment_right
        sum_cell.number_format = '#,##0.00'
        sum_cell.border = thin_border
        sum_cell.fill = total_fill

        # Fórmula SUM para H. Extra (col H)
        overtime_cell = ws.cell(row=current_row, column=9)
        overtime_cell.value = f"=SUM(I{first_data_row}:I{last_data_row})"
        overtime_cell.font = total_font
        overtime_cell.alignment = data_alignment_right
        overtime_cell.number_format = '#,##0.00'
        overtime_cell.border = thin_border
        overtime_cell.fill = total_fill

        # Fórmula SUM para Horas extra sin desplazamiento (col I)
        travel_cell = ws.cell(row=current_row, column=10)
        travel_cell.value = f"=SUM(J{first_data_row}:J{last_data_row})"
        travel_cell.font = total_font
        travel_cell.alignment = data_alignment_right
        travel_cell.number_format = '#,##0.00'
        travel_cell.border = thin_border
        travel_cell.fill = total_fill

        # Fórmula SUM para Desplaz. (col J)
        displacement_total_cell = ws.cell(row=current_row, column=11)
        displacement_total_cell.value = f"=SUM(K{first_data_row}:K{last_data_row})"
        displacement_total_cell.font = total_font
        displacement_total_cell.alignment = data_alignment_right
        displacement_total_cell.number_format = '#,##0.00'
        displacement_total_cell.border = thin_border
        displacement_total_cell.fill = total_fill

        # Fórmula SUM para Horas productivas (col K)
        productive_total_cell = ws.cell(row=current_row, column=12)
        productive_total_cell.value = f"=SUM(L{first_data_row}:L{last_data_row})"
        productive_total_cell.font = total_font
        productive_total_cell.alignment = data_alignment_right
        productive_total_cell.number_format = '#,##0.00'
        productive_total_cell.border = thin_border
        productive_total_cell.fill = total_fill

        # Columna de totales para KMs (col M)
        km_total_cell = ws.cell(row=current_row, column=14)
        km_total_cell.value = f"=SUM(N{first_data_row}:N{last_data_row})"
        km_total_cell.font = total_font
        km_total_cell.alignment = data_alignment_right
        km_total_cell.number_format = '#,##0.00'
        km_total_cell.border = thin_border
        km_total_cell.fill = total_fill

        # Columna de totales para Coste KM (col N)
        km_cost_total_cell = ws.cell(row=current_row, column=14)
        km_cost_total_cell.value = f"=SUM(N{first_data_row}:N{last_data_row})"
        km_cost_total_cell.font = total_font
        km_cost_total_cell.alignment = data_alignment_right
        km_cost_total_cell.number_format = '#,##0.00€'
        km_cost_total_cell.border = thin_border
        km_cost_total_cell.fill = total_fill

        # Columna de totales para Importe Dieta (col P)
        diet_total_cell = ws.cell(row=current_row, column=16)
        diet_total_cell.value = f"=SUM(P{first_data_row}:P{last_data_row})"
        diet_total_cell.font = total_font
        diet_total_cell.alignment = data_alignment_right
        diet_total_cell.number_format = '#,##0.00€'
        diet_total_cell.border = thin_border
        diet_total_cell.fill = total_fill

        for col in (12, 15):
            c = ws.cell(row=current_row, column=col)
            c.value = ""
            c.border = thin_border
            c.fill = total_fill

        current_row += 1

    # ── Configuración de impresión ──
    ws.sheet_properties.pageSetUpPr = None
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_options.horizontalCentered = True
    ws.oddHeader.center.text = "TimeFlow - Informe Diario de Horas por Proyecto"
    ws.oddFooter.right.text = "Página &P de &N"

    # Save to BytesIO stream
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()
