# Lelê — protótipo GitHub/PWA

Este pacote é uma versão de teste do Lelê feita para rodar gratuitamente como PWA (aplicativo web instalável).

## O que já funciona nesta versão
- Alternância entre Modo Pais e Modo Filho.
- Perfis de dois filhos de idades diferentes.
- Rotina diária e conclusão de tarefas.
- Biblioteca de tarefas filtrada pela idade.
- Criação e edição de tarefas.
- Tarefas com voz usando síntese de voz do navegador.
- Horário escolar/protegido.
- Meta e registro de água.
- Trabalhos escolares com entrega, materiais e etapas sugeridas.
- Sugestões de lazer e atividades em família.
- “Preciso de ajuda” enviando recado no protótipo.
- Mensagens de texto locais.
- Gravação de áudio local (quando o navegador permitir).
- Fechamento do dia e lembrete de preparação para amanhã.
- Estrutura de irmãos e tarefas compartilhadas/revezamento.
- PWA instalável e funcionamento offline básico.

## Limitações deste protótipo
Os dados ficam no `localStorage` do próprio navegador. Portanto:
- Ainda NÃO há sincronização real entre o celular dos pais e o celular dos filhos.
- Áudios gravados não são enviados para outro aparelho.
- Não há login/autenticação real.
- Não há notificação push em segundo plano.

Essas funções entram quando conectarmos o Supabase.

## Publicar grátis no GitHub Pages
1. Crie um repositório novo no GitHub, por exemplo `lele-app`.
2. Envie TODOS os arquivos desta pasta para a raiz do repositório.
3. Abra **Settings > Pages**.
4. Em **Build and deployment > Source**, escolha **Deploy from a branch**.
5. Em **Branch**, selecione `main` e pasta `/ (root)`.
6. Clique em **Save**.
7. Aguarde alguns minutos. O GitHub mostrará o endereço público do Lelê.
8. Abra esse endereço no celular.
9. No Chrome/Android, use **Adicionar à tela inicial / Instalar app**.

## Próxima fase
Conectar Supabase:
- autenticação de responsáveis;
- famílias;
- convite/código para vincular filho;
- RLS e permissões por família;
- tarefas sincronizadas em tempo real;
- mensagens e áudios;
- notificações;
- resumos diários.

O arquivo `supabase-schema.sql` contém um esqueleto inicial do banco.
