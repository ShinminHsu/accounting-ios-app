import { getDb, generateUUID } from './db';

const DEFAULT_CATEGORIES: { name: string; emoji: string; children: { name: string; emoji: string }[] }[] = [
  {
    name: '餐飲', emoji: 'Utensils',
    children: [
      { name: '早餐', emoji: 'UtensilsCrossed' },
      { name: '午餐', emoji: 'Utensils' },
      { name: '晚餐', emoji: 'Utensils' },
      { name: '咖啡廳', emoji: 'Coffee' },
      { name: '飲料', emoji: 'GlassWater' },
    ],
  },
  {
    name: '交通', emoji: 'Bus',
    children: [
      { name: '大眾運輸', emoji: 'Train' },
      { name: '計程車/叫車', emoji: 'Car' },
      { name: '油費', emoji: 'Fuel' },
      { name: '停車費', emoji: 'Car' },
    ],
  },
  {
    name: '購物', emoji: 'ShoppingBag',
    children: [
      { name: '服飾', emoji: 'Shirt' },
      { name: '3C 電子', emoji: 'Laptop' },
      { name: '超市/生鮮', emoji: 'ShoppingCart' },
    ],
  },
  {
    name: '娛樂', emoji: 'Clapperboard',
    children: [
      { name: '電影', emoji: 'Film' },
      { name: '遊戲', emoji: 'Gamepad2' },
      { name: '訂閱服務', emoji: 'Tv' },
    ],
  },
  {
    name: '健康', emoji: 'Heart',
    children: [
      { name: '藥局', emoji: 'Pill' },
      { name: '診所/醫院', emoji: 'Stethoscope' },
      { name: '健身', emoji: 'Dumbbell' },
    ],
  },
  {
    name: '居家', emoji: 'Home',
    children: [
      { name: '租金', emoji: 'Key' },
      { name: '水電費', emoji: 'Zap' },
      { name: '家居維修', emoji: 'Wrench' },
    ],
  },
  { name: '旅遊', emoji: 'Plane', children: [] },
  { name: '教育', emoji: 'BookOpen', children: [] },
  { name: '其他', emoji: 'Package', children: [] },
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
    const parentId = generateUUID();
    await db.runAsync(
      'INSERT INTO categories (id, user_id, name, emoji, parent_id, is_default, sort_order, created_at) VALUES (?, ?, ?, ?, NULL, 1, ?, ?)',
      [parentId, userId, parent.name, parent.emoji, sortOrder++, now]
    );
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      await db.runAsync(
        'INSERT INTO categories (id, user_id, name, emoji, parent_id, is_default, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        [generateUUID(), userId, child.name, child.emoji, parentId, i, now]
      );
    }
  }
}
