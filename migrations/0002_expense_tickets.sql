-- Migration: Create expense_tickets table for digital expense management
CREATE TABLE IF NOT EXISTS expense_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_date DATE NOT NULL,
    establishment_name TEXT NOT NULL,
    concept TEXT NOT NULL,
    amount REAL NOT NULL,
    vat REAL NOT NULL,
    pdf_filename TEXT NOT NULL,
    pdf_base64 TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
