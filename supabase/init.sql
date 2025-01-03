-- Enable RLS
ALTER DATABASE postgres SET "app.settings.jwt_secret" = 'your-jwt-secret';

-- Create tables
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_number TEXT NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payer_name TEXT,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.bank_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number TEXT,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.transaction_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_transaction_id UUID REFERENCES public.bank_transactions(id) NOT NULL,
  matched_table TEXT NOT NULL,
  matched_id UUID NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES public.users(id),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS policies
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can only view their own data
CREATE POLICY "Users can view own bank_transactions"
  ON public.bank_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own checks"
  ON public.checks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bank_transfers"
  ON public.bank_transfers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own receipts"
  ON public.receipts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transaction_matches"
  ON public.transaction_matches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tasks"
  ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to get match details
CREATE OR REPLACE FUNCTION public.get_match_details()
RETURNS TABLE (
  bank_transaction_id UUID,
  bank_date DATE,
  bank_amount DECIMAL(15,2),
  bank_description TEXT,
  matched_table TEXT,
  matched_id UUID,
  matched_date DATE,
  matched_amount DECIMAL(15,2),
  matched_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bt.id AS bank_transaction_id,
    bt.date AS bank_date,
    bt.amount AS bank_amount,
    bt.description AS bank_description,
    tm.matched_table,
    tm.matched_id,
    CASE
      WHEN tm.matched_table = 'checks' THEN (SELECT date FROM checks WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'bank_transfers' THEN (SELECT date FROM bank_transfers WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'invoices' THEN (SELECT date FROM invoices WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'receipts' THEN (SELECT date FROM receipts WHERE id = tm.matched_id)
    END AS matched_date,
    CASE
      WHEN tm.matched_table = 'checks' THEN (SELECT amount FROM checks WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'bank_transfers' THEN (SELECT amount FROM bank_transfers WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'invoices' THEN (SELECT amount FROM invoices WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'receipts' THEN (SELECT amount FROM receipts WHERE id = tm.matched_id)
    END AS matched_amount,
    CASE
      WHEN tm.matched_table = 'checks' THEN (SELECT check_number FROM checks WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'bank_transfers' THEN (SELECT reference_number FROM bank_transfers WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'invoices' THEN (SELECT invoice_number FROM invoices WHERE id = tm.matched_id)
      WHEN tm.matched_table = 'receipts' THEN (SELECT receipt_number FROM receipts WHERE id = tm.matched_id)
    END AS matched_description
  FROM
    bank_transactions bt
    JOIN transaction_matches tm ON bt.id = tm.bank_transaction_id
  WHERE
    bt.user_id = auth.uid();
END;
$$; 