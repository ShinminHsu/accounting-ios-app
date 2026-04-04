import { getDb } from './db';

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
  const db = await getDb();

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND is_default = 1',
    [userId]
  );
  if (result && result.count > 0) return;

  const now = new Date().toISOString();
  let sortOrder = 0;
  for (const parent of DEFAULT_CATEGORIES) {
    const parentId = crypto.randomUUID();
    await db.runAsync(
      'INSERT INTO categories (id, user_id, name, emoji, parent_id, is_default, sort_order, created_at) VALUES (?, ?, ?, ?, NULL, 1, ?, ?)',
      [parentId, userId, parent.name, parent.emoji, sortOrder++, now]
    );
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      await db.runAsync(
        'INSERT INTO categories (id, user_id, name, emoji, parent_id, is_default, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        [crypto.randomUUID(), userId, child.name, child.emoji, parentId, i, now]
      );
    }
  }
}
