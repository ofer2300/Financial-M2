-- פונקציה להתאמה בין עו"ש לנתונים נוספים
CREATE OR REPLACE FUNCTION match_transactions(tolerance_days INTEGER DEFAULT 3)
RETURNS TABLE (
    bank_transaction_id INTEGER,
    matched_table TEXT,
    matched_id INTEGER,
    match_score FLOAT
) 
LANGUAGE plpgsql 
AS $$
BEGIN
    -- מחיקת התאמות קודמות
    DELETE FROM transaction_matches;
    
    RETURN QUERY
    
    -- התאמות עם שיקים
    SELECT 
        bt.id,
        'checks'::TEXT,
        c.id,
        CASE
            WHEN bt.date = c.date THEN 1.0
            ELSE 1.0 - (ABS(bt.date - c.date) / tolerance_days::FLOAT)
        END as score
    FROM bank_transactions bt
    JOIN checks c ON ABS(bt.amount) = ABS(c.amount)
    WHERE ABS(bt.date - c.date) <= tolerance_days
    
    UNION ALL
    
    -- התאמות עם העברות בנקאיות
    SELECT 
        bt.id,
        'bank_transfers'::TEXT,
        t.id,
        CASE
            WHEN bt.date = t.date THEN 1.0
            ELSE 1.0 - (ABS(bt.date - t.date) / tolerance_days::FLOAT)
        END as score
    FROM bank_transactions bt
    JOIN bank_transfers t ON ABS(bt.amount) = ABS(t.amount)
    WHERE ABS(bt.date - t.date) <= tolerance_days
    
    UNION ALL
    
    -- התאמות עם חשבוניות
    SELECT 
        bt.id,
        'invoices'::TEXT,
        i.id,
        CASE
            WHEN bt.date = i.date THEN 1.0
            ELSE 1.0 - (ABS(bt.date - i.date) / tolerance_days::FLOAT)
        END as score
    FROM bank_transactions bt
    JOIN invoices i ON ABS(bt.amount) = ABS(i.amount)
    WHERE ABS(bt.date - i.date) <= tolerance_days
    
    UNION ALL
    
    -- התאמות עם קבלות
    SELECT 
        bt.id,
        'receipts'::TEXT,
        r.id,
        CASE
            WHEN bt.date = r.date THEN 1.0
            ELSE 1.0 - (ABS(bt.date - r.date) / tolerance_days::FLOAT)
        END as score
    FROM bank_transactions bt
    JOIN receipts r ON ABS(bt.amount) = ABS(r.amount)
    WHERE ABS(bt.date - r.date) <= tolerance_days
    
    ORDER BY score DESC;
END;
$$;

-- פונקציה לשמירת ההתאמות הטובות ביותר
CREATE OR REPLACE FUNCTION save_best_matches(min_score FLOAT DEFAULT 0.7)
RETURNS void 
LANGUAGE plpgsql 
AS $$
BEGIN
    -- מחיקת התאמות קודמות
    DELETE FROM transaction_matches;
    
    -- שמירת ההתאמות הטובות ביותר
    WITH ranked_matches AS (
        SELECT 
            bank_transaction_id,
            matched_table,
            matched_id,
            match_score,
            ROW_NUMBER() OVER (PARTITION BY bank_transaction_id ORDER BY match_score DESC) as rank
        FROM match_transactions()
        WHERE match_score >= min_score
    )
    INSERT INTO transaction_matches (bank_transaction_id, matched_table, matched_id)
    SELECT bank_transaction_id, matched_table, matched_id
    FROM ranked_matches
    WHERE rank = 1;
END;
$$;

-- פונקציה לקבלת פרטי ההתאמות
CREATE OR REPLACE FUNCTION get_match_details()
RETURNS TABLE (
    bank_transaction_id INTEGER,
    bank_date DATE,
    bank_amount NUMERIC,
    bank_description TEXT,
    matched_table TEXT,
    matched_id INTEGER,
    matched_date DATE,
    matched_amount NUMERIC,
    matched_reference TEXT,
    match_date TIMESTAMP
) 
LANGUAGE plpgsql 
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.bank_transaction_id,
        bt.date as bank_date,
        bt.amount as bank_amount,
        bt.description as bank_description,
        tm.matched_table,
        tm.matched_id,
        CASE
            WHEN tm.matched_table = 'checks' THEN c.date
            WHEN tm.matched_table = 'bank_transfers' THEN t.date
            WHEN tm.matched_table = 'invoices' THEN i.date
            WHEN tm.matched_table = 'receipts' THEN r.date
        END as matched_date,
        CASE
            WHEN tm.matched_table = 'checks' THEN c.amount
            WHEN tm.matched_table = 'bank_transfers' THEN t.amount
            WHEN tm.matched_table = 'invoices' THEN i.amount
            WHEN tm.matched_table = 'receipts' THEN r.amount
        END as matched_amount,
        CASE
            WHEN tm.matched_table = 'checks' THEN c.check_number
            WHEN tm.matched_table = 'bank_transfers' THEN t.reference_number
            WHEN tm.matched_table = 'invoices' THEN i.invoice_number
            WHEN tm.matched_table = 'receipts' THEN r.receipt_number
        END as matched_reference,
        tm.match_date
    FROM transaction_matches tm
    JOIN bank_transactions bt ON tm.bank_transaction_id = bt.id
    LEFT JOIN checks c ON tm.matched_table = 'checks' AND tm.matched_id = c.id
    LEFT JOIN bank_transfers t ON tm.matched_table = 'bank_transfers' AND tm.matched_id = t.id
    LEFT JOIN invoices i ON tm.matched_table = 'invoices' AND tm.matched_id = i.id
    LEFT JOIN receipts r ON tm.matched_table = 'receipts' AND tm.matched_id = r.id
    ORDER BY tm.match_date DESC;
END;
$$; 