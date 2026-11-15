"""General wellness plan: exercise, walking, food and travel limits.
Based on age, known conditions and the latest risk score. Guidance only - not medical advice."""


def build_plan(age: int | None, conditions: list[str], latest_score: int | None, today_walk_km: float = 0.0) -> dict:
    age = age or 65
    cond = " ".join(conditions).lower()
    score = 100 if latest_score is None else latest_score
    heart = any(w in cond for w in ("heart", "cardiac", "hypertension", "bp"))
    diabetes = "diabet" in cond or "sugar" in cond
    kidney = "kidney" in cond
    breath = any(w in cond for w in ("asthma", "copd"))

    if score < 40:
        mode, walk_min, exercise = "rest", 0, ["Rest today. Sit or lie comfortably.", "No exercise until you feel better and your family/doctor is informed."]
    elif score < 70:
        mode, walk_min = "light", 10
        exercise = ["Gentle seated stretches (5 min)", "Slow deep breathing (5 min)", "Short walk inside the house only"]
    else:
        base = 30 if age < 70 else 20
        mode, walk_min = "normal", base - (10 if (heart or breath) else 0)
        exercise = ["10 min gentle stretching (neck, shoulders, ankles)", "Chair squats x8 (hold the chair)",
                    "Balance practice near a wall (30 sec each leg)", "5 min deep breathing / pranayama (easy pace)"]
    step_goal = {"rest": 0, "light": 1500, "normal": 4000 if age >= 70 else 6000}[mode]
    if heart or breath:
        step_goal = int(step_goal * 0.7)
    target_km = round(step_goal * 0.00075, 1)

    do_food = ["Plenty of water through the day (unless your doctor limits fluids)", "Fruits and vegetables with every meal",
               "Protein: dal, curd, eggs, fish or paneer", "Small, regular meals - do not skip breakfast"]
    avoid = ["Very oily or fried food", "Skipping medicines before/after food as per the label"]
    if diabetes:
        do_food += ["Whole grains: ragi, millets, oats", "Check sugar as advised"]
        avoid += ["Sweets, sugary drinks, white bread in large amounts"]
    if heart:
        do_food += ["Low-salt cooking", "Nuts and flaxseed in small amounts"]
        avoid += ["Pickles, papad, packaged salty snacks"]
    if kidney:
        avoid += ["Extra salt and potassium-rich foods unless your doctor allows them"]
    if mode == "light" or mode == "rest":
        do_food = ["Light food: khichdi, idli, soups, curd rice", "ORS / water in small, frequent sips"] + do_food[2:]

    max_trip_km = {"rest": 0, "light": 3}.get(mode, 15 if age < 75 else 8)
    if heart or breath:
        max_trip_km = min(max_trip_km, 8)
    travel = {
        "max_one_way_km": max_trip_km,
        "tips": ["Prefer travelling in daytime, with a family member for trips beyond 5 km",
                 "Carry medicines, water, phone and your emergency contact card",
                 "Take a 10-minute rest for every hour of travel",
                 "Avoid travelling alone if you felt dizzy or unwell in the last 24 hours"],
    }
    if mode == "rest":
        travel["tips"] = ["Do not travel today. If you must see a doctor, go with a family member or ask for an ambulance (108)."]

    return {"mode": mode, "based_on": {"age": age, "conditions": conditions, "latest_risk_score": latest_score},
            "exercise": {"plan": exercise, "daily_minutes_walking": walk_min},
            "walking": {"step_goal": step_goal, "distance_km": target_km, "walked_today_km": today_walk_km,
                        "remaining_km": max(0.0, round(target_km - today_walk_km, 1))},
            "food": {"eat": do_food, "avoid": avoid}, "travel": travel,
            "disclaimer": "General wellness guidance, not medical advice. Follow your doctor's instructions first."}
