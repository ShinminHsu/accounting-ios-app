import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
  CategoryWithChildren,
} from '../../lib/categories';
import { Category } from '../../types/database';
import { colors, typography, spacing, radius } from '../../theme';

export function CategorySettingsScreen() {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const data = await fetchCategories(session.user.id);
    setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate(pid: string | null) {
    setEditing(null);
    setParentId(pid);
    setName('');
    setEmoji('');
    setModalVisible(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setParentId(cat.parent_id);
    setName(cat.name);
    setEmoji(cat.emoji ?? '');
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('錯誤', '請輸入分類名稱');
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (editing) {
        const { error } = await updateCategory(editing.id, name, emoji || null);
        if (error) { Alert.alert('失敗', error); return; }
      } else {
        const { error } = await createCategory(session.user.id, name, emoji || null, parentId);
        if (error) { Alert.alert('失敗', error); return; }
      }

      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('錯誤', e?.message ?? '操作失敗，請重試');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    Alert.alert(
      '刪除分類',
      `確定要刪除「${cat.name}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除', style: 'destructive',
          onPress: async () => {
            const { error } = await deleteCategory(cat.id);
            if (error) Alert.alert('無法刪除', error);
            else load();
          },
        },
      ]
    );
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list}>
        {categories.map((parent) => (
          <View key={parent.id} style={styles.parentGroup}>
            {/* Parent row */}
            <View style={styles.parentRow}>
              <TouchableOpacity style={styles.expandBtn} onPress={() => toggleExpand(parent.id)}>
                <Text style={styles.arrow}>{expanded.has(parent.id) ? '▾' : '▸'}</Text>
              </TouchableOpacity>
              <Text style={styles.parentEmoji}>{parent.emoji}</Text>
              <Text style={styles.parentName}>{parent.name}</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(parent)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>編輯</Text>
                </TouchableOpacity>
                {!parent.is_default && (
                  <TouchableOpacity onPress={() => handleDelete(parent)} style={styles.actionBtn}>
                    <Text style={[styles.actionText, styles.deleteText]}>刪除</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Children */}
            {expanded.has(parent.id) && (
              <View style={styles.childrenContainer}>
                {parent.children.map((child) => (
                  <View key={child.id} style={styles.childRow}>
                    <Text style={styles.childEmoji}>{child.emoji}</Text>
                    <Text style={styles.childName}>{child.name}</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => openEdit(child)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>編輯</Text>
                      </TouchableOpacity>
                      {!child.is_default && (
                        <TouchableOpacity onPress={() => handleDelete(child)} style={styles.actionBtn}>
                          <Text style={[styles.actionText, styles.deleteText]}>刪除</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addChildBtn}
                  onPress={() => openCreate(parent.id)}
                >
                  <Text style={styles.addChildText}>＋ 新增子分類</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addParentBtn} onPress={() => openCreate(null)}>
          <Text style={styles.addParentText}>＋ 新增分類</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? '編輯分類' : parentId ? '新增子分類' : '新增分類'}
            </Text>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.emojiInput]}
                placeholder="😀"
                value={emoji}
                onChangeText={setEmoji}
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.nameInput]}
                placeholder="分類名稱"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.saveText}>儲存</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  parentGroup: { marginBottom: spacing.sm },
  parentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  expandBtn: { marginRight: spacing.xs },
  arrow: { fontSize: typography.sizes.sm, color: colors.textSecondary, width: 16 },
  parentEmoji: { fontSize: typography.sizes.lg, marginRight: spacing.sm },
  parentName: { flex: 1, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  childrenContainer: {
    marginLeft: spacing.lg,
    borderLeftWidth: 2, borderLeftColor: colors.borderLight,
    paddingLeft: spacing.sm,
  },
  childRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  childEmoji: { fontSize: typography.sizes.md, marginRight: spacing.sm },
  childName: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  actions: { flexDirection: 'row' },
  actionBtn: { paddingHorizontal: spacing.xs },
  actionText: { fontSize: typography.sizes.xs, color: colors.primary },
  deleteText: { color: colors.expense },
  addChildBtn: { paddingVertical: spacing.sm },
  addChildText: { fontSize: typography.sizes.sm, color: colors.primary },
  addParentBtn: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    borderStyle: 'dashed', paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.md,
  },
  addParentText: { color: colors.primary, fontSize: typography.sizes.md },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.sizes.md, color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  emojiInput: { width: 56, textAlign: 'center' },
  nameInput: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontSize: typography.sizes.md },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});
