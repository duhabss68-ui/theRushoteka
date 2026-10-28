import json, sqlite3, sys
from pathlib import Path
from datetime import datetime

TABLES = {
    'groups': 'groups',
    'students': 'students',
    'attendance': 'attendance',
    'activities': 'activities',
    'grades': 'grades',
    'instruments': 'instruments',
    'evaluations': 'evaluations',
    'gradingSchemes': 'grading_schemes',
    'studentComponents': 'student_components',
}

def rows(con, table):
    try:
        return [dict(r) for r in con.execute(f'SELECT * FROM {table}')]
    except sqlite3.OperationalError:
        return []

def main():
    if len(sys.argv) < 2:
        print('Uso: python exportar_desde_2_4_1.py aula_agil.db [salida.json]')
        raise SystemExit(2)
    src = Path(sys.argv[1]).expanduser().resolve()
    out = Path(sys.argv[2]).expanduser().resolve() if len(sys.argv)>2 else src.with_name('MiAula_Migracion.json')
    if not src.exists():
        raise SystemExit(f'No existe: {src}')
    con=sqlite3.connect(src); con.row_factory=sqlite3.Row
    stores={}
    for target,table in TABLES.items():
        data=rows(con,table)
        if target=='groups':
            for r in data: r.setdefault('active', 1)
        if target=='students':
            for r in data:
                r.setdefault('active', 1)
                r.setdefault('paternal_last_name', '')
                r.setdefault('maternal_last_name', '')
                r.setdefault('given_names', '')
        if target=='attendance':
            for r in data: r.setdefault('class_hours', 1)
        if target=='instruments':
            for r in data:
                raw=r.pop('criteria_json', '[]')
                try: r['criteria']=json.loads(raw or '[]')
                except Exception: r['criteria']=[]
        if target=='evaluations':
            for r in data:
                raw=r.pop('details_json', '{}')
                try: r['details']=json.loads(raw or '{}')
                except Exception: r['details']={}
        if target=='gradingSchemes':
            for r in data: r['key']=f"{r.get('group_id')}:{r.get('period','1')}"
        if target=='studentComponents':
            for r in data: r['key']=f"{r.get('group_id')}:{r.get('period','1')}:{r.get('student_id')}"
        stores[target]=data
    stores['meta']=[{'key':'migrated_from','value':'MiAula 2.4.1'},{'key':'migrated_at','value':datetime.now().isoformat(timespec='seconds')}]
    payload={'format':'MiAulaMobileBackup','schemaVersion':2,'appVersion':'2.0','exportedAt':datetime.now().isoformat(timespec='seconds'),'stores':stores}
    out.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    con.close()
    print(f'OK: {out}')
    print('Ahora copia ese JSON a la tablet y usa Más > Restaurar / migrar respaldo.')

if __name__=='__main__': main()
