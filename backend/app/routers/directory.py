"""Search hospitals, doctors, medicines (type 'A' -> names starting with A) and list pharmacies. Public (no login),
because the registration form needs it before the account exists."""
from fastapi import APIRouter, Depends, Query

from ..db import get_db, q
from ..services.pharmacy import PHARMACIES

router = APIRouter(prefix="/directory", tags=["directory"])


def _like(text: str) -> str:
    return text.replace("%", "").replace("_", "").strip()


@router.get("/hospitals")
def hospitals(q_: str = Query("", alias="q", description="prefix or part of the name; 'A' = names starting with A"),
              state: str | None = None, city: str | None = None, kind: str | None = None,
              limit: int = Query(30, le=200), offset: int = 0, conn=Depends(get_db)):
    term = _like(q_)
    where, params = ["1=1"], []
    if term:
        where.append("(name LIKE ? OR name LIKE ?)")
        params += [f"{term}%", f"%{term}%"]
    for col, val in (("state", state), ("city", city), ("kind", kind)):
        if val:
            where.append(f"lower({col})=lower(?)")
            params.append(val)
    sql = (f"SELECT * FROM hospitals WHERE {' AND '.join(where)} "
           f"ORDER BY (name LIKE ?) DESC, name LIMIT ? OFFSET ?")
    return q(conn, sql, (*params, f"{term}%", limit, offset))


@router.get("/doctors")
def doctors(q_: str = Query("", alias="q"), specialty: str | None = None, hospital_id: int | None = None,
            city: str | None = None, limit: int = Query(30, le=200), offset: int = 0, conn=Depends(get_db)):
    term = _like(q_)
    where, params = ["1=1"], []
    if term:
        where.append("(d.name LIKE ? OR d.name LIKE ?)")
        params += [f"{term}%", f"%{term}%"]
    if specialty:
        where.append("lower(d.specialty) LIKE lower(?)")
        params.append(f"%{specialty}%")
    if hospital_id:
        where.append("d.hospital_id=?")
        params.append(hospital_id)
    if city:
        where.append("lower(d.city)=lower(?)")
        params.append(city)
    sql = (f"SELECT d.*, h.name AS hospital_name FROM doctors d LEFT JOIN hospitals h ON h.id=d.hospital_id "
           f"WHERE {' AND '.join(where)} ORDER BY (d.name LIKE ?) DESC, d.name LIMIT ? OFFSET ?")
    return q(conn, sql, (*params, f"{term}%", limit, offset))


@router.get("/medicines")
def medicines(q_: str = Query("", alias="q"), category: str | None = None, limit: int = Query(30, le=200), conn=Depends(get_db)):
    term = _like(q_)
    where, params = ["1=1"], []
    if term:
        where.append("(name LIKE ? OR name LIKE ? OR generic LIKE ?)")
        params += [f"{term}%", f"%{term}%", f"%{term}%"]
    if category:
        where.append("lower(category)=lower(?)")
        params.append(category)
    return q(conn, f"SELECT * FROM medicines WHERE {' AND '.join(where)} ORDER BY (name LIKE ?) DESC, name LIMIT ?",
             (*params, f"{term}%", limit))


@router.get("/states")
def states(conn=Depends(get_db)):
    return [r["state"] for r in q(conn, "SELECT DISTINCT state FROM hospitals WHERE state IS NOT NULL ORDER BY state")]


@router.get("/pharmacies")
def pharmacies():
    return PHARMACIES
