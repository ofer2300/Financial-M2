-- טבלת עסקאות בנק
CREATE TABLE bank_transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT
);

-- טבלת שיקים
CREATE TABLE checks (
    id SERIAL PRIMARY KEY,
    check_number VARCHAR(50),
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    payer_name VARCHAR(255)
);

-- טבלת העברות בנקאיות
CREATE TABLE bank_transfers (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    reference_number VARCHAR(255)
);

-- טבלת חשבוניות
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    invoice_number VARCHAR(50),
    status VARCHAR(50)
);

-- טבלת קבלות
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    receipt_number VARCHAR(50),
    status VARCHAR(50)
);

-- טבלת התאמות
CREATE TABLE transaction_matches (
    id SERIAL PRIMARY KEY,
    bank_transaction_id INT NOT NULL,
    matched_table VARCHAR(50),
    matched_id INT,
    match_date TIMESTAMP DEFAULT now(),
    FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id)
); 