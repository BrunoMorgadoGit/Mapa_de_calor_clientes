import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DB_PATH, ROOT_DIR, ensureDataDirs } from "./utils.js";
import path from "node:path";

export function openDatabase() {
  ensureDataDirs();
  const db = new DatabaseSync(DB_PATH);
  db.exec(fs.readFileSync(path.join(ROOT_DIR, "scripts/data/schema.sql"), "utf8"));
  return db;
}

export function resetImportedTables(db) {
  db.exec(`
    DELETE FROM comparison_results;
    DELETE FROM commercial_opportunities;
    DELETE FROM sales;
    DELETE FROM external_establishments;
    DELETE FROM current_customers;
    DELETE FROM regions;
  `);
}

export function resetComparisonTables(db) {
  db.exec(`
    DELETE FROM comparison_results;
    DELETE FROM commercial_opportunities;
  `);
}
