from sqlalchemy.orm import Session
from app.models.time_entry import TimeEntry
from app.models.project import Project
from app.models.user import User
from app.models.task import Task
from .query import apply_filters

def get_analytics_summary(db: Session, **filters) -> dict:
    # Fetch all relevant entries for the filtered period
    query = db.query(
        TimeEntry.date,
        User.name.label("user_name"),
        Task.name.label("task_name"),
        Task.category.label("task_category"),
        TimeEntry.hours,
        TimeEntry.overtime_hours,
        TimeEntry.vehicle_type,
        TimeEntry.distance_origin,
        TimeEntry.trip_type,
        TimeEntry.meals,
        TimeEntry.meal_ticket_amount,
        Project.distance_from_workshop.label("project_distance"),
        Project.travel_time.label("proj_travel_time"),
        Project.km_rate.label("km_rate"),
        Project.daily_allowance_rate.label("daily_allowance_rate")
    ).join(User, TimeEntry.user_id == User.id)\
     .join(Task, TimeEntry.task_id == Task.id)\
     .join(Project, TimeEntry.project_id == Project.id)

    query = apply_filters(query, **filters)
    entries = query.all()

    if not entries:
        return {
            "heatmap": [], "daily_categories": [], "user_totals": [], "task_totals": [],
            "daily_summary": [], "category_distribution": [], "logistics_km": [],
            "dietas_summary": [], "user_skills": [], "treemap_data": {"name": "root", "children": []},
            "travel_hours": [], "total_overtime": 0.0
        }

    # Data Structures for aggregation
    heatmap_data = {} # {user: {date: hours}}
    daily_cats = {}   # {date: {cat: hours}}
    user_hrs = {}     # {user: hours}
    task_hrs = {}     # {task: hours}
    daily_sum = {}    # {date: {hours: 0, count: 0}}
    cat_dist = {}     # {cat: hours}
    logistics = {}    # {user: {personal: 0, company: 0, km_cost: 0.0}}
    travel_by_user = {}  # {user: total_minutes}
    dietas = {}       # {user: {yes: 0, no: 0, cost: 0.0}}
    skills = {}       # {user: {cat: hours}}
    treemap_raw = {}  # {cat: {task: hours}}
    total_ovt = 0.0

    for e in entries:
        d_str = e.date.isoformat()
        u = e.user_name
        t = e.task_name
        c = e.task_category
        h = float(e.hours)  # Only normal hours in analytics (no overtime)
        ovt = float(e.overtime_hours or 0)
        total_ovt += ovt
        
        # 1. Heatmap
        if u not in heatmap_data: heatmap_data[u] = {}
        heatmap_data[u][d_str] = heatmap_data[u].get(d_str, 0) + h

        # 2. Daily Categories
        if d_str not in daily_cats: daily_cats[d_str] = {}
        daily_cats[d_str][c] = daily_cats[d_str].get(c, 0) + h

        # 3. User Totals
        user_hrs[u] = user_hrs.get(u, 0) + h

        # 4. Task Totals
        task_hrs[t] = task_hrs.get(t, 0) + h

        # 5. Daily Summary
        if d_str not in daily_sum: daily_sum[d_str] = {"hours": 0, "count": 0}
        daily_sum[d_str]["hours"] += h
        daily_sum[d_str]["count"] += 1

        # 6. Category Dist
        cat_dist[c] = cat_dist.get(c, 0) + h

        # 7. Logistics KM
        if u not in logistics: logistics[u] = {"personal": 0, "company": 0, "km_cost": 0.0}
        
        dist = float(e.project_distance or 0)
        km_rate = float(e.km_rate or 0)
        
        if e.vehicle_type in ("personal", "particular"):
            mult = 2.0 if e.trip_type == "round" else 1.0
            logistics[u]["personal"] += dist * mult
            logistics[u]["km_cost"] += (dist * mult) * km_rate
        elif e.vehicle_type in ("company", "empresa"):
             mult = 2.0 if e.trip_type == "round" else 1.0
             logistics[u]["company"] += dist * mult

        # 8. Travel time (minutos → acumulado por usuario)
        if e.vehicle_type and e.proj_travel_time:
            mins = 0
            tt_total = int(e.proj_travel_time)
            if e.trip_type == "round":
                mins = tt_total
            else:
                mins = tt_total // 2 # ida o vuelta por separado
            travel_by_user[u] = travel_by_user.get(u, 0) + mins

        # 9. Dietas
        if u not in dietas: dietas[u] = {"yes": 0, "no": 0, "cost": 0.0}
        if e.meals is True: 
            dietas[u]["yes"] += 1
            # Prioritize ticket amount if present, fallback to fixed project rate
            ticket_amt = float(e.meal_ticket_amount or 0)
            if ticket_amt > 0:
                dietas[u]["cost"] += ticket_amt
            else:
                dietas[u]["cost"] += float(e.daily_allowance_rate or 0)
        elif e.meals is False: 
            dietas[u]["no"] += 1

        # 10. Skills (Radar)
        if u not in skills: skills[u] = {}
        skills[u][c] = skills[u].get(c, 0) + h

        # 11. Treemap
        if c not in treemap_raw: treemap_raw[c] = {}
        treemap_raw[c][t] = treemap_raw[c].get(t, 0) + h

    # Formatting for Recharts
    formatted_heatmap = [{"user": u, "data": [{"date": d, "hours": hrs} for d, hrs in d_map.items()]} for u, d_map in heatmap_data.items()]
    formatted_daily_cats = [{"date": d, **cats} for d, cats in daily_cats.items()]
    formatted_user_totals = sorted([{"name": u, "hours": hrs} for u, hrs in user_hrs.items()], key=lambda x: x["hours"], reverse=True)
    formatted_task_totals = sorted([{"name": t, "hours": hrs} for t, hrs in task_hrs.items()], key=lambda x: x["hours"], reverse=True)[:10]
    formatted_daily_summary = [{"date": d, "hours": v["hours"], "count": v["count"]} for d, v in daily_sum.items()]
    formatted_cat_dist = [{"name": c, "value": h} for c, h in cat_dist.items()]
    formatted_logistics = [{"name": u, "personal_km": v["personal"], "company_km": v["company"], "km_cost": v["km_cost"]} for u, v in logistics.items()]
    formatted_travel_hours = sorted(
        [{"name": u, "travel_hours": round(m / 60, 2)} for u, m in travel_by_user.items() if m > 0],
        key=lambda x: x["travel_hours"]
    )
    formatted_dietas = [{"name": u, "yes": v["yes"], "no": v["no"], "cost": v["cost"]} for u, v in dietas.items()]
    formatted_skills = []
    for u, cats in skills.items():
        for c, h in cats.items():
            formatted_skills.append({"employee": u, "category": c, "hours": h})
    
    treemap_data = {
        "name": "root",
        "children": [
            {"name": c, "children": [{"name": t, "value": h} for t, h in tasks.items()]}
            for c, tasks in treemap_raw.items()
        ]
    }

    return {
        "heatmap": formatted_heatmap,
        "daily_categories": formatted_daily_cats,
        "user_totals": formatted_user_totals,
        "task_totals": formatted_task_totals,
        "daily_summary": formatted_daily_summary,
        "category_distribution": formatted_cat_dist,
        "logistics_km": formatted_logistics,
        "travel_hours": formatted_travel_hours,
        "dietas_summary": formatted_dietas,
        "user_skills": formatted_skills,
        "treemap_data": treemap_data,
        "total_overtime": total_ovt
    }
