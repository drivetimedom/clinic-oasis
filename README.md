# Hof Circle Management

Crie um Sistema de Gestão para Clínicas de Estética chamado "Hof Circle Gestão".

ESTRUTURA:

1. Configure Supabase e execute o SQL fornecido

2. Crie layout com sidebar (menu lateral)

3. Implemente MÓDULO FINANCEIRO completo:

   - Dashboard com métricas

   - Contas a Receber (CRUD + marcar como pago)

   - Contas a Pagar (CRUD + recorrência)

   - Fluxo de Caixa (gráfico + tabela)

4. Implemente MÓDULO PACIENTES básico:

   - Listagem com busca

   - Cadastro completo

   - Ficha do paciente

DESIGN:

- Cores: Preto (#0a0a0a), Cinza (#1a1a1a, #262626), Verde (#4ade80)

- Ícones: Lucide React

- Gráficos: Recharts

FUNCIONALIDADES CRÍTICAS:

- Filtros por status, data, categoria

- Marcar contas como pagas

- Contas recorrentes (mensal, trimestral, etc)

- Vencimentos próximos (alertas)

- Dashboard com gráficos de evolução

- Fluxo de caixa dia a dia

Use React Query para cache, Supabase para backend.

Siga EXATAMENTE a estrutura fornecida no documento.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://clinic-oasis.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/61d9aa45-df83-4778-b640-69f0e581f8a0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
