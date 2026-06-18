PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL DEFAULT 'SP',
  regiao TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cidade, uf)
);

CREATE TABLE IF NOT EXISTS current_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cnpj TEXT,
  normalized_cnpj TEXT,
  razao_social TEXT,
  nome_estabelecimento TEXT,
  normalized_name TEXT,
  cidade TEXT,
  normalized_city TEXT,
  regiao TEXT,
  status_cliente TEXT,
  produtos_comprados TEXT,
  source_file TEXT,
  validation_status TEXT NOT NULL DEFAULT 'VALID',
  validation_errors TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_current_customers_cnpj ON current_customers(normalized_cnpj);
CREATE INDEX IF NOT EXISTS idx_current_customers_name_city ON current_customers(normalized_name, normalized_city);

CREATE TABLE IF NOT EXISTS external_establishments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cnpj TEXT,
  normalized_cnpj TEXT,
  nome_estabelecimento TEXT,
  normalized_name TEXT,
  cidade TEXT,
  normalized_city TEXT,
  regiao TEXT,
  segmento_cnae TEXT,
  endereco TEXT,
  telefone TEXT,
  source_file TEXT,
  validation_status TEXT NOT NULL DEFAULT 'VALID',
  validation_errors TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_establishments_cnpj ON external_establishments(normalized_cnpj);
CREATE INDEX IF NOT EXISTS idx_external_establishments_name_city ON external_establishments(normalized_name, normalized_city);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_cnpj TEXT,
  normalized_cnpj TEXT,
  nome_estabelecimento TEXT,
  normalized_name TEXT,
  cidade TEXT,
  normalized_city TEXT,
  produto TEXT,
  valor REAL DEFAULT 0,
  data_venda TEXT,
  source_file TEXT,
  validation_status TEXT NOT NULL DEFAULT 'VALID',
  validation_errors TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_cnpj ON sales(normalized_cnpj);

CREATE TABLE IF NOT EXISTS commercial_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_establishment_id INTEGER,
  cnpj TEXT,
  nome_estabelecimento TEXT,
  cidade TEXT,
  regiao TEXT,
  segmento_cnae TEXT,
  classification TEXT NOT NULL,
  match_strategy TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (external_establishment_id) REFERENCES external_establishments(id)
);

CREATE INDEX IF NOT EXISTS idx_commercial_opportunities_classification ON commercial_opportunities(classification);
CREATE INDEX IF NOT EXISTS idx_commercial_opportunities_city ON commercial_opportunities(cidade);

CREATE TABLE IF NOT EXISTS comparison_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_establishment_id INTEGER,
  current_customer_id INTEGER,
  cnpj TEXT,
  nome_estabelecimento TEXT,
  cidade TEXT,
  regiao TEXT,
  classification TEXT NOT NULL,
  match_strategy TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (external_establishment_id) REFERENCES external_establishments(id),
  FOREIGN KEY (current_customer_id) REFERENCES current_customers(id)
);

CREATE INDEX IF NOT EXISTS idx_comparison_results_classification ON comparison_results(classification);
CREATE INDEX IF NOT EXISTS idx_comparison_results_city ON comparison_results(cidade);
