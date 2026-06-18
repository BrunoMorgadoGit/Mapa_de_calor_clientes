# Deusa Analytics data imports

Coloque arquivos exportados em `data/imports`.

Arquivos aceitos pelo importador:

- `.csv`
- `.json`
- `.xlsx`

Convenções recomendadas de nome:

- `clientes*.csv|json|xlsx` para a base interna da Deusa Alimentos
- `externos*.csv|json|xlsx` ou `estabelecimentos*.csv|json|xlsx` para a base externa
- `vendas*.csv|json|xlsx` para histórico de vendas

O importador aceita variações comuns de nomes de colunas, valida campos faltantes e ignora registros inválidos sem quebrar o frontend.

Comandos:

```bash
npm run data:import
npm run data:compare
npm run data:prepare
```

Saídas geradas:

- `data/deusa_analytics.db`
- `data/processed/import-report.json`
- `data/processed/comparison-report.json`
- `src/data/commercial-comparison-summary.json`
