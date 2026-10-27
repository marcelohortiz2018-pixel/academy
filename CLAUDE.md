# Projeto "academy" — HortiZ Academy

Plataforma online de estudo/onboarding da HortiZ & Co para clientes do app
"Conciliação Bancária + Classificação de PDC" (provedores de internet / ISPs).
Trabalhamos EXCLUSIVAMENTE neste projeto aqui. Idioma: português (Brasil), tom formal.

## Stack
- Front: site estático (JS puro, roteador por hash) em `site/`, publicado no GitHub Pages
  - Repo: https://github.com/marcelohortiz2018-pixel/academy  → https://marcelohortiz2018-pixel.github.io/academy/
  - supabase-js via CDN (jsDelivr 2.45.4). O index.html do repo usa CDN; `site/supabase.js` é cópia local.
- Back: Supabase, projeto `hortiz-academy` (ID `snjlxzeextzfftxmansy`), URL https://snjlxzeextzfftxmansy.supabase.co
  - Auth e-mail/senha com "Confirm email" DESLIGADO (evita "email rate limit exceeded")
  - Site URL / Redirect: https://marcelohortiz2018-pixel.github.io/academy/
  - Storage bucket `aulas` (vídeos e manuais)
  - Edge Function `ajuda` (IA; precisa do secret ANTHROPIC_API_KEY)
- Python (`python/`): automação de conteúdo, relatórios e correção — ver `python/README.md`.

## Funcionalidades
Login/cadastro, trilha de 14 aulas em vídeo + manuais, "Ajude-me" (IA + kb.json),
acompanhamento de alunos (admin), mentorias (Jitsi), tarefas corrigidas por IA.

## Banco (schema public)
ajuda_msgs, aulas, entregas, faq, mentoria_inscricoes, mentorias, profiles, progresso,
tarefas, view v_progresso_alunos. Detalhes em `supabase/schema.md`.
Paths no storage: `videos/NN-<slug>.mp4`, `videos/NN-<slug>-celular.mp4`, `manuais/*.pdf`.

## Regras fixas
- Entregáveis finais vão para a Área de Trabalho; após divulgação, atualizar `MATERIAL PROSPECÇÃO`.
- Vídeos: texto formal, sem gírias, sem nome/telefone/e-mail do Marcelo, sem CTA/onboarding, sem end card, voz feminina humanizada.
- Teste do app: 1 mês. Promo HORTIZ2026: R$ 99,90/mês no plano de 12 meses, até 31/12/2026.
- NUNCA commitar chaves secretas (service_role, ANTHROPIC_API_KEY). Só `.env` local (ignorado no git).
  A chave publishable do Supabase em `site/config.js` é pública por desenho.
- Segurança: manter RLS ativa em todas as tabelas; rodar advisors do Supabase após mudar schema.

## Pendências conhecidas
1. Subir 28 vídeos + 2 PDFs (em `conteudo/` ou `..\HortiZ Academy\Conteudo`) ao bucket `aulas`: `python python/upload_conteudo.py`.
2. Criar secret ANTHROPIC_API_KEY no Supabase (Edge Functions → Secrets).
3. Mensagem amigável em PT-BR para erros de cadastro/login no `site/app.js`.
4. Pasta do Drive "Videos do App" (ID 10fKVZMOCspUsMIRVBOAiXXBy_uFizjXx) com vídeos novos.

## Próximas melhorias (a aprofundar aqui)
Certificado de conclusão (PDF), painel admin com gráficos, notificações por e-mail (SMTP próprio),
quiz por aula, relatórios semanais por aluno, testes automatizados, CI para publicar no Pages.
