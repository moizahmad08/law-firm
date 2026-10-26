import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL || 'postgresql://lms_migrator:lms_migrator_password@localhost:5432/lms_dev?schema=public',
    },
  },
});

async function main() {
  const statements = [
    `DROP POLICY IF EXISTS constitutional_articles_select_policy ON public.constitutional_articles;`,
    `CREATE POLICY constitutional_articles_select_policy ON public.constitutional_articles FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS constitutional_articles_insert_policy ON public.constitutional_articles;`,
    `CREATE POLICY constitutional_articles_insert_policy ON public.constitutional_articles FOR INSERT WITH CHECK (
      public.current_app_user_id() IS NULL OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
    );`,
    `DROP POLICY IF EXISTS constitutional_articles_update_policy ON public.constitutional_articles;`,
    `CREATE POLICY constitutional_articles_update_policy ON public.constitutional_articles FOR UPDATE USING (
      public.current_app_user_id() IS NULL OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
    );`,
    `DROP POLICY IF EXISTS statutory_rules_select_policy ON public.statutory_rules;`,
    `CREATE POLICY statutory_rules_select_policy ON public.statutory_rules FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS statutory_rules_insert_policy ON public.statutory_rules;`,
    `CREATE POLICY statutory_rules_insert_policy ON public.statutory_rules FOR INSERT WITH CHECK (
      public.current_app_user_id() IS NULL OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
    );`,
    `DROP POLICY IF EXISTS statutory_rules_update_policy ON public.statutory_rules;`,
    `CREATE POLICY statutory_rules_update_policy ON public.statutory_rules FOR UPDATE USING (
      public.current_app_user_id() IS NULL OR public.current_app_user_role() IN ('SUPER_ADMIN', 'OFFICE_ADMIN', 'LAWYER')
    );`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('Constitutional & Statutory Rules RLS policies updated successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
