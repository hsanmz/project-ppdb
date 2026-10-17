from src.core.database import execute_raw

WAVE_ID = "wave-d72e542d-f2f0-4edb-9f69-1ad76aa0e095"
rows = execute_raw(
    "SELECT status, count(id) FROM ppdb_applicants "
    f"WHERE wave_id = '{WAVE_ID}' GROUP BY status"
)
print(rows)
