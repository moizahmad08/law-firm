import { prisma } from "./client";
import { Prisma } from "@prisma/client";

export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface TransactionContextOptions {
  maxWait?: number;
  timeout?: number;
}

/**
 * Executes a callback inside a PostgreSQL transaction with local session context
 * setting `app.user_id`. Required for all queries accessing RLS-protected tables.
 */
export async function withUserContext<T>(
  userId: string,
  callback: (tx: PrismaTransaction) => Promise<T>,
  options?: TransactionContextOptions
): Promise<T> {
  return await prisma.$transaction(
    async (tx) => {
      // Set transaction-local session variable (is_local = true)
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.user_id', $1, true);`,
        userId
      );
      return await callback(tx);
    },
    {
      maxWait: options?.maxWait ?? 10000,
      timeout: options?.timeout ?? 30000,
    }
  );
}

/**
 * Checks whether the specified user has access to a case under RLS.
 * Returns true if permitted, false otherwise.
 */
export async function assertCaseAccess(
  userId: string,
  caseId: string
): Promise<boolean> {
  return await withUserContext(userId, async (tx) => {
    const record = await tx.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    return record !== null;
  });
}
