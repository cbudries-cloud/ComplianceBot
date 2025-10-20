import Database from "better-sqlite3";
import crypto from "crypto";

export class Cache {
  db: Database.Database;
  
  constructor(path = "data.db") {
    this.db = new Database(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS seen (
        ticket_id TEXT,
        url_hash TEXT,
        day TEXT,
        PRIMARY KEY(ticket_id, url_hash, day)
      )
    `);
  }
  
  hash(u: string): string {
    return crypto.createHash("sha256").update(u).digest("hex");
  }
  
  today(): string {
    return new Date().toISOString().slice(0, 10);
  }
  
  seenToday(id: string, url: string): boolean {
    return !!this.db.prepare(`SELECT 1 FROM seen WHERE ticket_id=? AND url_hash=? AND day=?`)
      .get(id, this.hash(url), this.today());
  }
  
  mark(id: string, url: string): void {
    this.db.prepare(`INSERT OR IGNORE INTO seen(ticket_id,url_hash,day) VALUES (?,?,?)`)
      .run(id, this.hash(url), this.today());
  }
}

