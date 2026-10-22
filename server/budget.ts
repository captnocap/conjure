import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
export interface Usage {
  requests: number;
  decisions: number;
  inputTokens: number;
  outputTokens: number;
  spentUsd: number;
  reservedUsd: number;
  estimatedCharges: number;
  /** The spending cap in dollars, or null when there is none. */
  budgetUsd: number | null;
}

const ledgerSchema = z.object({
  requests: z.number().int().nonnegative(),
  decisions: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  spentUsd: z.number().nonnegative(),
  reservedUsd: z.number().nonnegative(),
  estimatedCharges: z.number().int().nonnegative(),
});

/**
 * Keeps the running total of model spending in a file. A cap is optional: with `limit` null the
 * ledger only records, and every reservation succeeds.
 */
export class BudgetLedger {
  #path: string;
  #limit: number | null;
  #ledger: z.infer<typeof ledgerSchema>;

  constructor(path: string, limit: number | null) {
    if (limit !== null && (!Number.isFinite(limit) || limit <= 0))
      throw new Error('CONJURE_BUDGET_USD must be a positive number of dollars, or unset for no cap.');
    this.#path = path;
    this.#limit = limit;
    this.#ledger = existsSync(path)
      ? ledgerSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
      : {
          requests: 0,
          decisions: 0,
          inputTokens: 0,
          outputTokens: 0,
          spentUsd: 0,
          reservedUsd: 0,
          estimatedCharges: 0,
        };
    // A process may have exited after sending a billable request. Retain its reservation.
    if (this.#ledger.reservedUsd > 0) {
      this.#ledger.spentUsd += this.#ledger.reservedUsd;
      this.#ledger.reservedUsd = 0;
      this.#ledger.estimatedCharges++;
      this.#save();
    }
  }

  reserve(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error('A positive request reservation is required.');
    if (this.#limit !== null && this.#ledger.spentUsd + this.#ledger.reservedUsd + amount > this.#limit) return false;
    this.#ledger.reservedUsd += amount;
    this.#ledger.requests++;
    this.#save();
    return true;
  }

  settle(
    reservation: number,
    charge: { cost: number; input: number; output: number; decisions: number; estimated: boolean },
  ) {
    this.#ledger.reservedUsd = Math.max(0, this.#ledger.reservedUsd - reservation);
    this.#ledger.spentUsd += charge.cost;
    this.#ledger.inputTokens += charge.input;
    this.#ledger.outputTokens += charge.output;
    this.#ledger.decisions += charge.decisions;
    if (charge.estimated) this.#ledger.estimatedCharges++;
    this.#save();
  }

  snapshot(): Usage {
    return { ...this.#ledger, budgetUsd: this.#limit };
  }

  #save() {
    mkdirSync(dirname(this.#path), { recursive: true });
    writeFileSync(`${this.#path}.tmp`, JSON.stringify(this.#ledger, null, 2), { mode: 0o600 });
    renameSync(`${this.#path}.tmp`, this.#path);
  }
}
