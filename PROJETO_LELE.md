# Projeto Lelê — Definições do Produto

## Visão
Lelê é um assistente de rotina familiar para crianças e adolescentes. Os responsáveis definem regras, horários e limites; o aplicativo organiza e apresenta a rotina de forma adequada à idade e aumenta progressivamente a autonomia do jovem.

## Público
Faixas previstas:
- 3–5 anos
- 6–8 anos
- 9–12 anos
- 13–15 anos
- 16–17 anos

A linguagem, o nível de voz, a interface e as sugestões mudam conforme a idade.

## Estrutura de contas
- Uma Família.
- Um ou mais responsáveis autorizados.
- Um ou mais filhos, cada um com perfil/dispositivo próprio.
- Responsáveis acompanham estados das atividades, sem rastreamento contínuo.
- Filho vê apenas a própria rotina.
- Tarefas entre irmãos podem ser compartilhadas, divididas ou alternadas.

## Módulos definidos
1. Rotina diária editável pelos pais.
2. Horários protegidos: escola, curso, terapia, esporte, sono etc.
3. Tarefas de horário fixo, janela, momento do dia ou lembrete.
4. Voz e alerta visual.
5. Hidratação.
6. Biblioteca de tarefas por idade e categoria.
7. Escola: lições, provas, trabalhos, prazos e materiais.
8. Planejamento automático de projetos escolares antes do prazo.
9. Lista de materiais e aviso aos pais.
10. Sugestões de atividades sozinho e em família.
11. Lazer sem tratar descanso como “prêmio”.
12. Botão “Preciso de ajuda”.
13. Mensagens familiares e áudio.
14. Fechamento do dia configurado pelos pais.
15. Resumo do que foi feito e aprendido.
16. Preparação para amanhã.
17. Irmãos: tarefas compartilhadas, revezamento e conquistas coletivas.
18. Evolução da autonomia por idade.
19. Metas maiores para adolescentes.
20. PWA instalável e, futuramente, publicação em lojas.

## Segurança
- Cadastro começa pelo responsável.
- Filho é vinculado por convite/código temporário.
- Sem busca pública de usuários.
- Comunicação apenas com membros autorizados da família.
- Microfone só quando o usuário grava/fala.
- Sem câmera/microfone/localização contínuos.
- RLS no banco por `family_id`.
- Permissões diferentes para pais, crianças e adolescentes.
- Exclusão de conta deve permitir exclusão dos dados relacionados.

## Estratégia técnica
Fase 1: PWA estático no GitHub Pages para validação.
Fase 2: Supabase para autenticação, banco, realtime e arquivos.
Fase 3: notificações e relatórios.
Fase 4: empacotamento Android/iOS, se fizer sentido.

## Nome
Nome de trabalho: **Lelê**.
