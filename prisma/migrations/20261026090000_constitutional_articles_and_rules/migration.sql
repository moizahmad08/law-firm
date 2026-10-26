-- Milestone: Constitutional Articles and Statutory Rules Database
-- Creates constitutional_articles and statutory_rules tables with RLS and lms_app grants

-- 1. Create constitutional_articles Table
CREATE TABLE IF NOT EXISTS public.constitutional_articles (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "chapter" TEXT,
    "content" TEXT NOT NULL,
    "explanation" TEXT,
    "key_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cross_references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "amendment_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constitutional_articles_pkey" PRIMARY KEY ("id")
);

-- 2. Create statutory_rules Table
CREATE TABLE IF NOT EXISTS public.statutory_rules (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "statute_code" TEXT NOT NULL,
    "statute_name" TEXT NOT NULL,
    "rule_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "court_type" TEXT,
    "notes" TEXT,
    "key_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cross_references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statutory_rules_pkey" PRIMARY KEY ("id")
);

-- 3. Unique & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "constitutional_articles_article_number_key" ON public.constitutional_articles("article_number");
CREATE INDEX IF NOT EXISTS "idx_constitutional_articles_number" ON public.constitutional_articles("article_number");
CREATE INDEX IF NOT EXISTS "idx_constitutional_articles_part" ON public.constitutional_articles("part");

CREATE UNIQUE INDEX IF NOT EXISTS "statutory_rules_statute_code_rule_number_key" ON public.statutory_rules("statute_code", "rule_number");
CREATE INDEX IF NOT EXISTS "idx_statutory_rules_code" ON public.statutory_rules("statute_code");
CREATE INDEX IF NOT EXISTS "idx_statutory_rules_category" ON public.statutory_rules("category");

-- 4. Enable Row Level Security
ALTER TABLE public.constitutional_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constitutional_articles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.statutory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_rules FORCE ROW LEVEL SECURITY;

-- 5. RLS Policies for constitutional_articles
DROP POLICY IF EXISTS constitutional_articles_select_policy ON public.constitutional_articles;
CREATE POLICY constitutional_articles_select_policy ON public.constitutional_articles
FOR SELECT
USING (true);

DROP POLICY IF EXISTS constitutional_articles_insert_policy ON public.constitutional_articles;
CREATE POLICY constitutional_articles_insert_policy ON public.constitutional_articles
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NULL
  OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

DROP POLICY IF EXISTS constitutional_articles_update_policy ON public.constitutional_articles;
CREATE POLICY constitutional_articles_update_policy ON public.constitutional_articles
FOR UPDATE
USING (
  public.current_app_user_id() IS NULL
  OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

-- 6. RLS Policies for statutory_rules
DROP POLICY IF EXISTS statutory_rules_select_policy ON public.statutory_rules;
CREATE POLICY statutory_rules_select_policy ON public.statutory_rules
FOR SELECT
USING (true);

DROP POLICY IF EXISTS statutory_rules_insert_policy ON public.statutory_rules;
CREATE POLICY statutory_rules_insert_policy ON public.statutory_rules
FOR INSERT
WITH CHECK (
  public.current_app_user_id() IS NULL
  OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

DROP POLICY IF EXISTS statutory_rules_update_policy ON public.statutory_rules;
CREATE POLICY statutory_rules_update_policy ON public.statutory_rules
FOR UPDATE
USING (
  public.current_app_user_id() IS NULL
  OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
);

-- 7. Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.constitutional_articles TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.statutory_rules TO lms_app;
