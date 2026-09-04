# Deploy — Hof Circle Gestão (clinic-oasis ejetado do Lovable)

App **Vite estático** que aponta pro Supabase da **Donna** (`nbmbiepwfogekfyijpew`).
Servido pelo `donna-nginx` como site estático no subdomínio **clinica.timedom.com.br**.

## Pré-requisito
- Rodar o **F1_v2_schema.sql** no SQL Editor do Supabase da Donna (cria as tabelas do oasis).
- Ter uma conta (auth.users) na Donna pra logar.

## Build + publicar arquivos
```
npm install
npm run build
python deploy/_deploy_dist.py     # sobe dist/ -> VPS /home/donna/clinica/dist
```
Deploys seguintes = repetir esses 3 comandos (só troca os arquivos; nginx não reinicia).

## Ir ao ar (uma vez) — 4 passos

1. **DNS**: criar registro **A** `clinica.timedom.com.br` -> `177.7.44.25`.

2. **Volume estático no nginx** — editar `/home/donna/docker-compose.yml`, no serviço
   `donna-nginx`, na lista `volumes:`, acrescentar:
   ```yaml
       - ./clinica/dist:/usr/share/nginx/clinica:ro
   ```

3. **Config do site**: copiar `deploy/clinica.conf` para `/home/donna/nginx/conf.d/clinica.conf`.

4. **Certificado + subir**:
   ```
   cd /home/donna
   # emitir cert (webroot ja mapeado em ./nginx/certbot/www -> /var/www/certbot):
   docker run --rm \
     -v /home/donna/nginx/certbot/www:/var/www/certbot \
     -v /home/donna/certbot-etc:/etc/letsencrypt \
     certbot/certbot certonly --webroot -w /var/www/certbot \
     -d clinica.timedom.com.br --email drivetimedom@gmail.com --agree-tos -n
   # copiar pro padrao de nomes que o nginx espera:
   cp /home/donna/certbot-etc/live/clinica.timedom.com.br/fullchain.pem /home/donna/nginx/ssl/clinica-fullchain.pem
   cp /home/donna/certbot-etc/live/clinica.timedom.com.br/privkey.pem   /home/donna/nginx/ssl/clinica-privkey.pem
   # recriar nginx (pega o volume novo) e recarregar:
   docker compose up -d donna-nginx
   ```
   Obs.: o passo 4 do cert só funciona depois do DNS (passo 1) propagar. O ACME usa
   a rota `/.well-known/acme-challenge/` já viva no bloco :80 do clinica.conf.

## Notas
- **appointments**: no spike a agenda do oasis é tabela própria (`appointments`), separada
  da `agendamentos` da Donna/n8n. Fusão de agenda = fase futura.
- **Edge functions** do oasis (`supabase/functions/admin-set-password`, `invite-member`)
  NÃO foram portadas — dependem de deploy no Supabase (reset de senha / convite de membro).
  Não são críticas pro spike; portar depois se necessário.
- Multi-membro real (recepção/doutoras não-donas) depende de ampliar a RLS da Donna
  pra `clinic_members` (F3). No spike, logar como **dono** da clínica funciona 100%.
