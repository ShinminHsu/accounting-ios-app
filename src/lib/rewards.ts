import { getDb, generateUUID } from './db';
import { CreditCardRewardRule, RewardType } from '../types/database';
import { createTransaction } from './transactions';

export type RewardPreview = {
  ruleId: string | null;
  earnedAmount: number;
  rewardType: RewardType | null;
  isCapReached: boolean;
  thresholdNotMet: boolean;
  rule: CreditCardRewardRule | null;
};

export type RuleSummary = {
  rule: CreditCardRewardRule;
  earned: number;
  ytdEarned: number;
  capUtilization: number | null;
};

export type RewardSummaryData = {
  cashbackTotal: number;
  pointsTotal: number;
  pendingDeposit: number;
  rules: RuleSummary[];
};

function rowToRule(row: any): CreditCardRewardRule {
  return {
    id: row.id,
    credit_card_id: row.credit_card_id,
    user_id: row.user_id,
    rule_type: row.rule_type,
    category_id: row.category_id ?? null,
    merchant_name: row.merchant_name ?? null,
    reward_rate: row.reward_rate,
    reward_type: row.reward_type as RewardType,
    monthly_cap: row.monthly_cap ?? null,
    min_spend_threshold: row.min_spend_threshold ?? null,
    deposit_account_id: row.deposit_account_id ?? null,
    points_conversion_rate: row.points_conversion_rate ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchCreditCardByAccountId(accountId: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM credit_cards WHERE account_id = ?',
    [accountId]
  );
  return row ?? null;
}

export async function fetchRewardRules(creditCardId: string): Promise<CreditCardRewardRule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM credit_card_reward_rules WHERE credit_card_id = ? ORDER BY created_at ASC',
    [creditCardId]
  );
  return rows.map(rowToRule);
}

export async function createRewardRule(
  userId: string,
  creditCardId: string,
  input: {
    ruleType: 'category' | 'merchant';
    categoryId: string | null;
    merchantName: string | null;
    rewardRate: number;
    rewardType: RewardType;
    monthlyCap: number | null;
    minSpendThreshold: number | null;
    depositAccountId: string | null;
    pointsConversionRate: number | null;
  }
): Promise<{ error: string | null }> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO credit_card_reward_rules
     (id, credit_card_id, user_id, rule_type, category_id, merchant_name, reward_rate, reward_type,
      monthly_cap, min_spend_threshold, deposit_account_id, points_conversion_rate, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateUUID(), creditCardId, userId, input.ruleType,
      input.categoryId ?? null, input.merchantName ?? null, input.rewardRate, input.rewardType,
      input.monthlyCap ?? null, input.minSpendThreshold ?? null,
      input.depositAccountId ?? null, input.pointsConversionRate ?? null, now, now,
    ]
  );
  return { error: null };
}

export async function updateRewardRule(
  id: string,
  input: {
    ruleType: 'category' | 'merchant';
    categoryId: string | null;
    merchantName: string | null;
    rewardRate: number;
    rewardType: RewardType;
    monthlyCap: number | null;
    minSpendThreshold: number | null;
    depositAccountId: string | null;
    pointsConversionRate: number | null;
  }
): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE credit_card_reward_rules SET
     rule_type=?, category_id=?, merchant_name=?, reward_rate=?, reward_type=?,
     monthly_cap=?, min_spend_threshold=?, deposit_account_id=?, points_conversion_rate=?, updated_at=?
     WHERE id=?`,
    [
      input.ruleType, input.categoryId ?? null, input.merchantName ?? null,
      input.rewardRate, input.rewardType, input.monthlyCap ?? null,
      input.minSpendThreshold ?? null, input.depositAccountId ?? null,
      input.pointsConversionRate ?? null, new Date().toISOString(), id,
    ]
  );
  return { error: null };
}

export async function deleteRewardRule(id: string): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync('DELETE FROM credit_card_reward_rules WHERE id = ?', [id]);
  return { error: null };
}

async function getAccumulated(ruleId: string, yearMonth: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ earned_amount: number }>(
    'SELECT earned_amount FROM reward_accumulations WHERE rule_id = ? AND year_month = ?',
    [ruleId, yearMonth]
  );
  return row?.earned_amount ?? 0;
}

export async function calculateRewardPreview(
  amount: number,
  categoryId: string | null,
  notes: string,
  creditCardId: string,
  yearMonth: string
): Promise<RewardPreview> {
  const noReward: RewardPreview = {
    ruleId: null, earnedAmount: 0, rewardType: null,
    isCapReached: false, thresholdNotMet: false, rule: null,
  };
  if (amount <= 0) return noReward;

  const rules = await fetchRewardRules(creditCardId);
  if (rules.length === 0) return noReward;

  let matchedRule: CreditCardRewardRule | null = null;
  for (const r of rules.filter((r) => r.rule_type === 'merchant')) {
    if (r.merchant_name && notes.toLowerCase().includes(r.merchant_name.toLowerCase())) {
      matchedRule = r;
      break;
    }
  }
  if (!matchedRule && categoryId) {
    matchedRule = rules.find((r) => r.rule_type === 'category' && r.category_id === categoryId) ?? null;
  }
  if (!matchedRule) return noReward;

  if (matchedRule.min_spend_threshold && amount < matchedRule.min_spend_threshold) {
    return { ...noReward, thresholdNotMet: true, rule: matchedRule, rewardType: matchedRule.reward_type };
  }

  let rawEarned = (amount * matchedRule.reward_rate) / 100;
  if (matchedRule.monthly_cap !== null) {
    const accumulated = await getAccumulated(matchedRule.id, yearMonth);
    const remaining = matchedRule.monthly_cap - accumulated;
    if (remaining <= 0) {
      return { ...noReward, isCapReached: true, rule: matchedRule, rewardType: matchedRule.reward_type };
    }
    rawEarned = Math.min(rawEarned, remaining);
  }

  const earnedAmount = matchedRule.reward_type === 'points'
    ? Math.floor(rawEarned)
    : Math.round(rawEarned * 100) / 100;

  return { ruleId: matchedRule.id, earnedAmount, rewardType: matchedRule.reward_type, isCapReached: false, thresholdNotMet: false, rule: matchedRule };
}

export async function accumulateTransactionReward(
  userId: string,
  ruleId: string,
  earnedAmount: number,
  yearMonth: string,
  creditCardId: string,
  rewardType: RewardType
): Promise<void> {
  if (earnedAmount <= 0) return;
  const db = await getDb();
  const now = new Date().toISOString();

  if (rewardType === 'cashback_offset' || rewardType === 'points') {
    const existing = await db.getFirstAsync<{ id: string; earned_amount: number }>(
      'SELECT id, earned_amount FROM reward_accumulations WHERE rule_id = ? AND year_month = ?',
      [ruleId, yearMonth]
    );
    if (existing) {
      await db.runAsync(
        'UPDATE reward_accumulations SET earned_amount = ?, updated_at = ? WHERE id = ?',
        [existing.earned_amount + earnedAmount, now, existing.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO reward_accumulations (id, user_id, rule_id, year_month, earned_amount, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [generateUUID(), userId, ruleId, yearMonth, earnedAmount, now]
      );
    }
  } else if (rewardType === 'account_deposit') {
    const existing = await db.getFirstAsync<{ id: string; amount: number }>(
      'SELECT id, amount FROM pending_reward_deposits WHERE credit_card_id = ? AND user_id = ?',
      [creditCardId, userId]
    );
    if (existing) {
      await db.runAsync(
        'UPDATE pending_reward_deposits SET amount = ?, updated_at = ? WHERE id = ?',
        [existing.amount + earnedAmount, now, existing.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO pending_reward_deposits (id, user_id, credit_card_id, amount, updated_at) VALUES (?, ?, ?, ?, ?)',
        [generateUUID(), userId, creditCardId, earnedAmount, now]
      );
    }
  }
}

export async function markDepositReceived(
  userId: string,
  creditCardId: string,
  amount: number,
  depositAccountId: string
): Promise<{ error: string | null }> {
  const { error } = await createTransaction(userId, {
    amount, date: new Date().toISOString().slice(0, 10),
    name: null,
    categoryId: null, accountId: depositAccountId, projectId: null,
    notes: '信用卡回饋入帳', payerType: 'self', contactId: null, payerName: null, isIncome: true,
  });
  if (error) return { error };

  const db = await getDb();
  await db.runAsync(
    'UPDATE pending_reward_deposits SET amount = 0, updated_at = ? WHERE credit_card_id = ? AND user_id = ?',
    [new Date().toISOString(), creditCardId, userId]
  );
  return { error: null };
}

export async function fetchRewardSummary(
  userId: string,
  creditCardId: string,
  yearMonth: string
): Promise<RewardSummaryData> {
  const rules = await fetchRewardRules(creditCardId);
  if (rules.length === 0) return { cashbackTotal: 0, pointsTotal: 0, pendingDeposit: 0, rules: [] };

  const db = await getDb();
  const yearPrefix = yearMonth.slice(0, 4);
  const ruleIds = rules.map((r) => r.id);
  const placeholders = ruleIds.map(() => '?').join(',');

  const [accums, ytdAccums, depositRow] = await Promise.all([
    db.getAllAsync<{ rule_id: string; earned_amount: number }>(
      `SELECT rule_id, earned_amount FROM reward_accumulations WHERE user_id = ? AND year_month = ? AND rule_id IN (${placeholders})`,
      [userId, yearMonth, ...ruleIds]
    ),
    db.getAllAsync<{ rule_id: string; earned_amount: number }>(
      `SELECT rule_id, SUM(earned_amount) as earned_amount FROM reward_accumulations WHERE user_id = ? AND year_month LIKE ? AND rule_id IN (${placeholders}) GROUP BY rule_id`,
      [userId, `${yearPrefix}-%`, ...ruleIds]
    ),
    db.getFirstAsync<{ amount: number }>(
      'SELECT amount FROM pending_reward_deposits WHERE credit_card_id = ? AND user_id = ?',
      [creditCardId, userId]
    ),
  ]);

  const earnedMap: Record<string, number> = {};
  const ytdMap: Record<string, number> = {};
  for (const row of accums) earnedMap[row.rule_id] = (earnedMap[row.rule_id] ?? 0) + row.earned_amount;
  for (const row of ytdAccums) ytdMap[row.rule_id] = (ytdMap[row.rule_id] ?? 0) + row.earned_amount;

  let cashbackTotal = 0;
  let pointsTotal = 0;
  const ruleSummaries: RuleSummary[] = rules.map((rule) => {
    const earned = earnedMap[rule.id] ?? 0;
    const ytdEarned = ytdMap[rule.id] ?? 0;
    const capUtilization = rule.monthly_cap ? Math.min(earned / rule.monthly_cap, 1) : null;
    if (rule.reward_type === 'cashback_offset') cashbackTotal += earned;
    else if (rule.reward_type === 'points') pointsTotal += earned;
    return { rule, earned, ytdEarned, capUtilization };
  });

  return { cashbackTotal, pointsTotal, pendingDeposit: depositRow?.amount ?? 0, rules: ruleSummaries };
}
