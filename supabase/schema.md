# Schema (public) — projeto snjlxzeextzfftxmansy
- ajuda_msgs(id, user_id, papel, conteudo, aula_id, criado_em)
- aulas(id, ordem, modulo, titulo, descricao, video_path, video_celular_path, manual_path, manual_titulo, duracao_s, ativo)
- entregas(id, tarefa_id, user_id, resposta, feedback_ia, status, criado_em)
- faq(id, pergunta, resposta, aula_id)
- mentoria_inscricoes(mentoria_id, user_id, presente)
- mentorias(id, titulo, tipo, inicio, duracao_min, descricao, sala, aluno_id, criado_em)
- profiles(id, nome, email, papel, empresa, criado_em, ultimo_acesso)
- progresso(user_id, aula_id, concluida, segundos, atualizado_em)
- tarefas(id, aula_id, titulo, enunciado, criterios)
- view v_progresso_alunos(id, nome, email, ultimo_acesso, concluidas, total_aulas, entregas)
Migration aplicada: 20261025230859 academy_schema (obter o SQL completo via Supabase MCP/CLI).
