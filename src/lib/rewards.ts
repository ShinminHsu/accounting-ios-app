import { supabase } from './supabase';
import { CreditCardRewardRule, RewardType } from '../types/database';
import { createTransaction } from './transactions';

// ── Types ────────────────────────────────────────────────────────────────────

export type RewardPreview = {
  ruleId: string | null;
  earnedAmount: number; // TWD for cashback/deposit; raw points for 'points'
  rewardType: RewardType | null;
  isCapReached: boolean;
  thresholdNotMet: boolean;
  rule: CreditCardRewardRule | null;
};

export type RuleSummary = {
  rule: CreditCardRewardRule;
  earned: number;
  ytdEarned: number;
  capUtilization: number | null; // 0–1, null if no cap
};

export type RewardSummaryData = {
  cashbackTotal: number;
  pointsTotal: number;
  pendingDeposit: number;
  rules: RuleSummary[];
};

// ── Credit card lookup ───────────────────────────────────────────────────────

export async function fetchCreditCardByAccountId(accountId: string) {
  const { data } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('account_id', accountId)
    .single();
  return data ?? null;
}

// ── Reward rules CRUD ────────────────────────────────────────────────────────

export async function fetchRewardRules(creditCardId: string): Promise<CreditCardRewardRule[]> {
  const { data } = await supabase
    .from('credit_card_reward_rules')
    .select('*')
    .eq('credit_card_id', creditCardId)
    .order('created_at');
  return data ?? [];
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
  const { error } = await supabase.from('credit_card_reward_rules').insert({
    credit_card_id: creditCardId,
    user_id: userId,
    rule_type: input.ruleType,
    category_id: input.categoryId,
    merchant_name: input.merchantName,
    reward_rate: input.rewardRate,
    reward_type: input.rewardType,
    monthly_cap: input.monthlyCap,
    min_spend_threshold: input.minSpendThreshold,
    deposit_account_id: input.depositAccountId,
    points_conversion_rate: input.pointsConversionRate,
  });
  return { error: error?.message ?? null };
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
  const { error } = await supabase
    .from('credit_card_reward_rules')
    .update({
      rule_type: input.ruleType,
      category_id: input.categoryId,
      merchant_name: input.merchantName,
      reward_rate: input.rewardRate,
      reward_type: input.rewardType,
      monthly_cap: input.monthlyCap,
      min_spend_threshold: input.minSpendThreshold,
      deposit_account_id: input.depositAccountId,
      points_conversion_rate: input.pointsConversionRate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteRewardRule(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('credit_card_reward_rules').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ── Reward calculation engine ────────────────────────────────────────────────

async function getAccumulated(ruleId: string, yearMonth: string): Promise<number> {
  const { data } = await supabase
    .from('reward_accumulations')
    .select('earned_amount')
    .eq('rule_id', ruleId)
    .eq('year_month', yearMonth)
    .single();
  return data?.earned_amount ?? 0;
}

export async function calculateRewardPreview(
  amount: number,
  categoryId: string | null,
  notes: string,
  creditCardId: string,
  yearMonth: string // 'YYYY-MM'
): Promise<RewardPreview> {
  const noReward: RewardPreview = {
    ruleId: null, earnedAmount: 0, rewardType: null,
    isCapReached: false, thresholdNotMet: false, rule: null,
  };

  if (amount <= 0) return noReward;

  const rules = await fetchRewardRules(creditCardId);
  if (rules.length === 0) return noReward;

  // Merchant-specific rule has higher priority than category rule
  let matchedRule: CreditCardRewardRule | null = null;

  for (const r of rules.filter((r) => r.rule_type === 'merchant')) {
    if (r.merchant_name && notes.toLowerCase().includes(r.merchant_name.toLowerCase())) {
      matchedRule = r;
      break;
    }
  }

  if (!matchedRule && categoryId) {
    matchedRule = rules.find(
      (r) => r.rule_type === 'category' && r.category_id === categoryId
    ) ?? null;
  }

  if (!matchedRule) return noReward;

  // Threshold check
  if (matchedRule.min_spend_threshold && amount < matchedRule.min_spend_threshold) {
    return { ...noReward, thresholdNotMet: true, rule: matchedRule, rewardType: matchedRule.reward_type };
  }

  let rawEarned = (amount * matchedRule.reward_rate) / 100;

  // Cap check
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

  return {
    ruleId: matchedRule.id,
    earnedAmount,
    rewardType: matchedRule.reward_type,
    isCapReached: false,
    thresholdNotMet: false,
    rule: matchedRule,
  };
}

// ── Accumulate reward after transaction save ─────────────────────────────────

export async function accumulateTransactionReward(
  userId: string,
  ruleId: string,
  earnedAmount: number,
  yearMonth: string,
  creditCardId: string,
  rewardType: RewardType
): Promise<void> {
  if (earnedAmount <= 0) return;

  if (rewardType === 'cashback_offset' || rewardType === 'points') {
    const { data: existing } = await supabase
      .from('reward_accumulations')
      .select('id, earned_amount')
      .eq('rule_id', ruleId)
      .eq('year_month', yearMonth)
      .single();

    if (existing) {
      await supabase
        .from('reward_accumulations')
        .update({
          earned_amount: existing.earned_amount + earnedAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('reward_accumulations').insert({
        user_id: userId,
        rule_id: ruleId,
        year_month: yearMonth,
        earned_amount: earnedAmount,
      });
    }
  } else if (rewardType === 'account_deposit') {
    const { data: existing } = await supabase
      .from('pending_reward_deposits')
      .select('id, amount')
      .eq('credit_card_id', creditCardId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase
        .from('pending_reward_deposits')
        .update({ amount: existing.amount + earnedAmount, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('pending_reward_deposits').insert({
        user_id: userId,
        credit_card_id: creditCardId,
        amount: earnedAmount,
      });
    }
  }
}

// ── Mark account-deposit reward as received ──────────────────────────────────

export async function markDepositReceived(
  userId: string,
  creditCardId: string,
  amount: number,
  depositAccountId: string
): Promise<{ error: string | null }> {
  const { error } = await createTransaction(userId, {
    amount,
    date: new Date().toISOString().slice(0, 10),
    categoryId: null,
    accountId: depositAccountId,
    projectId: null,
    notes: '信用卡回饋入帳',
    payerType: 'self',
    contactId: null,
    isIncome: true,
  });
  if (error) return { error };

  await supabase
    .from('pending_reward_deposits')
    .update({ amount: 0, updated_at: new Date().toISOString() })
    .eq('credit_card_id', creditCardId)
    .eq('user_id', userId);

  return { error: null };
}

// ── Monthly reward summary ───────────────────────────────────────────────────

export async function fetchRewardSummary(
  userId: string,
  creditCardId: string,
  yearMonth: string
): Promise<RewardSummaryData> {
  const rules = await fetchRewardRules(creditCardId);

  if (rules.length === 0) {
    return { cashbackTotal: 0, pointsTotal: 0, pendingDeposit: 0, rules: [] };
  }

  const ruleIds = rules.map((r) => r.id);
  const yearPrefix = yearMonth.slice(0, 4);

  const [accums, ytdAccums, deposit] = await Promise.all([
    supabase
      .from('reward_accumulations')
      .select('rule_id, earned_amount')
      .eq('user_id', userId)
      .eq('year_month', yearMonth)
      .in('rule_id', ruleIds),
    supabase
      .from('reward_accumulations')
      .select('rule_id, earned_amount')
      .eq('user_id', userId)
      .like('year_month', `${yearPrefix}-%`)
      .in('rule_id', ruleIds),
    supabase
      .from('pending_reward_deposits')
      .select('amount')
      .eq('credit_card_id', creditCardId)
      .eq('user_id', userId)
      .single(),
  ]);

  const earnedMap: Record<string, number> = {};
  const ytdMap: Record<string, number> = {};

  for (const row of accums.data ?? []) {
    earnedMap[row.rule_id] = (earnedMap[row.rule_id] ?? 0) + row.earned_amount;
  }
  for (const row of ytdAccums.data ?? []) {
    ytdMap[row.rule_id] = (ytdMap[row.rule_id] ?? 0) + row.earned_amount;
  }

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

  return {
    cashbackTotal,
    pointsTotal,
    pendingDeposit: deposit.data?.amount ?? 0,
    rules: ruleSummaries,
  };
}
