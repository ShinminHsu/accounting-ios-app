import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { CategoryIcon } from './CategoryIcon';
import { colors } from '../theme';

type Props = {
  iconKey: string | null | undefined;
  selected?: boolean;
  onPress?: () => void;
};

// Uniform icon button: 52×52 touchable, 40×40 icon container, 24pt icon
export function CategoryIconButton({ iconKey, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.touchable, selected && styles.touchableSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <CategoryIcon
        iconKey={iconKey}
        size={24}
        color={selected ? colors.primary : colors.textSecondary}
        bgColor={selected ? colors.primary + '18' : colors.surfaceAlt}
        containerSize={40}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  touchableSelected: {
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
  },
});
