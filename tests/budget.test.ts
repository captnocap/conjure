import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BudgetLedger } from '../server/budget';

const ledgerPath = () => join(mkdtempSync(join(tmpdir(), 'conjure-ledger-')), 'usage.json');

test('with no cap the ledger records every request and never refuses', () => {
  const path = ledgerPath();
  const ledger = new BudgetLedger(path, null);
  for (let index = 0; index < 50; index++) {
    assert.equal(ledger.reserve(1), true);
    ledger.settle(1, { cost: 1, input: 1000, output: 0, decisions: 3, estimated: false });
  }
  const usage = ledger.snapshot();
  assert.equal(usage.budgetUsd, null);
  assert.equal(usage.spentUsd, 50);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).requests, 50, 'the total is kept on disk');
});

test('a cap, when set, still refuses past its total and accepts any positive amount', () => {
  const ledger = new BudgetLedger(ledgerPath(), 40);
  assert.equal(ledger.reserve(30), true);
  ledger.settle(30, { cost: 30, input: 1, output: 0, decisions: 1, estimated: false });
  assert.equal(ledger.reserve(11), false);
  assert.equal(ledger.snapshot().budgetUsd, 40);
  assert.throws(() => new BudgetLedger(ledgerPath(), 0));
  assert.throws(() => new BudgetLedger(ledgerPath(), Number.NaN));
});
