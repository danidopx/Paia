Paia — Instruções de uso

Resumo
- Projeto: Protocolo Científico (frontend estático em `index.html`).
- Admin e usuários (Isis/Maya) com senhas definidas no painel admin (armazenadas em `localStorage`).

Executar localmente
1. Abra um terminal na pasta do projeto:

```powershell
cd "c:\Users\User\OneDrive\Área de Trabalho\Paia"
npx http-server -p 8000
```

2. Abra no navegador: http://127.0.0.1:8000

Modo Admin
- Acesse: http://127.0.0.1:8000/?mode=admin
- Campo `Senha Admin`: senha padrão `dopj1982` (você pode alterar).
- Campo `Senhas por Usuário`: defina a senha para `Isis` e `Maya` (essas senhas serão usadas ao entrar como cada usuário).

Fluxo de teste (usuário)
1. Na tela principal, escolha o botão `Isis` ou `Maya`.
2. Insira a senha definida para o respectivo usuário e um código alfanumérico (ex.: `A1B2C`).
3. Ao autenticar, o topo da página exibirá uma confirmação com o nome do usuário e o código.

Observações importantes
- As senhas dos usuários e do admin são armazenadas localmente no navegador (`localStorage`). Não use senhas sensíveis em ambientes públicos.
- A chave do Supabase está embutida no frontend para facilitar testes; para produção, mova chamadas ao backend/edge function e proteja chaves.
- Para publicar: commit → push para o GitHub (o repositório já está ligado ao Vercel no seu projeto) e o deploy deve ser acionado automaticamente.

Comandos úteis
```bash
git add .
git commit -m "Atualiza admin e instruções"
git push origin main
```

Se quiser, eu também:
- Adiciono confirmação visual mais detalhada ou logout suave sem reload.
- Preparo um pequeno endpoint backend para salvar senhas de usuário de forma segura (requer infra adicional).
