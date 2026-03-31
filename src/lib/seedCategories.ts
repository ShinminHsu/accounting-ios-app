import { supabase } from './supabase';

const DEFAULT_CATEGORIES: { name: string; emoji: string; children: { name: string; emoji: string }[] }[] = [
  {
    name: '餐飲', emoji: '🍽️',
    children: [
      { name: '早餐', emoji: '🍳' },
      { name: '午餐', emoji: '🥗' },
      { name: '晚餐', emoji: '🍜' },
      { name: '咖啡廳', emoji: '☕' },
      { name: '飲料', emoji: '🧋' },
    ],
  },
  {
    name: '交通', emoji: '🚌',
    children: [
      { name: '大眾運輸', emoji: '🚇' },
      { name: '計程車/叫車', emoji: '🚕' },
      { name: '油費', emoji: '⛽' },
      { name: '停車費', emoji: '🅿️' },
    ],
  },
  {
    name: '購物', emoji: '🛍️',
    children: [
      { name: '服飾', emoji: '👗' },
      { name: '3C 電子', emoji: '💻' },
      { name: '超市/生鮮', emoji: '🛒' },
    ],
  },
  {
    name: '娛樂', emoji: '🎬',
    children: [
      { name: '電影', emoji: '🎞️' },
      { name: '遊戲', emoji: '🎮' },
      { name: '訂閱服務', emoji: '📺' },
    ],
  },
  {
    name: '健康', emoji: '🏥',
    children: [
      { name: '藥局', emoji: '💊' },
      { name: '診所/醫院', emoji: '🩺' },
      { name: '健身', emoji: '🏋️' },
    ],
  },
  {
    name: '居家', emoji: '🏠',
    children: [
      { name: '租金', emoji: '🔑' },
      { name: '水電費', emoji: '💡' },
      { name: '家居維修', emoji: '🔧' },
    ],
  },
  { name: '旅遊', emoji: '✈️', children: [] },
  { name: '教育', emoji: '📚', children: [] },
  { name: '其他', emoji: '📦', children: [] },
];

export async function seedDefaultCategories(userId: string): Promise<void> {
  // Check if user already has categories (idempotent)
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_default', true);

  if (count && count > 0) return;

  let sortOrder = 0;
  for (const parent of DEFAULT_CATEGORIES) {
    const { data: parentRow, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: parent.name,
        emoji: parent.emoji,
        parent_id: null,
        is_default: true,
        sort_order: sortOrder++,
      })
      .select('id')
      .single();

    if (error || !parentRow) continue;

    if (parent.children.length > 0) {
      await supabase.from('categories').insert(
        parent.children.map((child, i) => ({
          user_id: userId,
          name: child.name,
          emoji: child.emoji,
          parent_id: parentRow.id,
          is_default: true,
          sort_order: i,
        }))
      );
    }
  }
}
