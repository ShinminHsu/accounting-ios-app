import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal,
} from 'react-native';
import { X, Search } from 'lucide-react-native';
import { Contact } from '../types/database';
import { colors, typography, spacing, radius } from '../theme';

type Props = {
  contacts: Contact[];
  selectedContactId: string | null;
  payerName: string;
  onChangeContactId: (id: string | null) => void;
  onChangePayerName: (name: string) => void;
  visible: boolean;
  onClose: () => void;
};

export function PayerContactPicker({
  contacts,
  selectedContactId,
  payerName,
  onChangeContactId,
  onChangePayerName,
  visible,
  onClose,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  function handlePickContact(contact: Contact) {
    onChangeContactId(contact.id);
    onChangePayerName('');
    onClose();
  }

  function handleFreeTextChange(text: string) {
    onChangePayerName(text);
    onChangeContactId(null);
  }

  function handleConfirmFreeText() {
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>選擇代付對象</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search bar for saved contacts */}
        <View style={styles.searchRow}>
          <Search size={14} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋已儲存的聯絡人"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>

        {/* Saved contact list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>無已儲存聯絡人</Text>
          }
          renderItem={({ item }) => {
            const selected = item.id === selectedContactId;
            return (
              <TouchableOpacity
                style={[styles.contactRow, selected && styles.contactRowSelected]}
                onPress={() => handlePickContact(item)}
              >
                <Text style={[styles.contactName, selected && styles.contactNameSelected]}>
                  {item.name}
                </Text>
                {selected && (
                  <View style={styles.selectedDot} />
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>或直接輸入名字</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Free-text input */}
        <View style={styles.freeTextRow}>
          <TextInput
            style={styles.freeTextInput}
            placeholder="輸入代付對象名字"
            placeholderTextColor={colors.textSecondary}
            value={payerName}
            onChangeText={handleFreeTextChange}
            returnKeyType="done"
            onSubmitEditing={handleConfirmFreeText}
          />
          {payerName.length > 0 && (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmFreeText}
            >
              <Text style={styles.confirmText}>確認</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    margin: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
    paddingVertical: 4,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginTop: spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactRowSelected: {
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  contactName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  contactNameSelected: {
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  freeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  freeTextInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
});
