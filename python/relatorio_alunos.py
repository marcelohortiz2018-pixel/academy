"""Gera relatorio_alunos.xlsx com o progresso dos alunos."""
import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
rows = sb.table("v_progresso_alunos").select("*").execute().data
df = pd.DataFrame(rows)
if not df.empty:
    df["pct"] = (df["concluidas"] / df["total_aulas"] * 100).round(0)
df.to_excel("relatorio_alunos.xlsx", index=False)
print(len(df), "alunos")
