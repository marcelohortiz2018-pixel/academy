# Ferramentas Python
1. `py -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt`
2. Copie `.env.example` para `.env` e preencha SUPABASE_SERVICE_KEY (Supabase → Settings → API → service_role). Nunca compartilhe.
- `upload_conteudo.py` — envia vídeos/manuais ao bucket `aulas` e atualiza os paths em `aulas`.
- `relatorio_alunos.py` — gera Excel com progresso dos alunos (view v_progresso_alunos).
