"""Envia conteudo/videos/*.mp4 e conteudo/manuais/*.pdf ao bucket 'aulas' (upsert)."""
import os, pathlib
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
base = pathlib.Path(os.getenv("CONTEUDO_DIR", "conteudo"))
for sub, mime in (("videos", "video/mp4"), ("manuais", "application/pdf")):
    for f in sorted((base / sub).glob("*")):
        print("enviando", f.name)
        sb.storage.from_("aulas").upload(
            f"{sub}/{f.name}", f.read_bytes(),
            {"content-type": mime, "upsert": "true"})
print("ok")
