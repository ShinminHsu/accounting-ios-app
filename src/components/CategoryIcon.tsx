import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tag } from 'lucide-react-native';
import { getCategoryIconComponent } from '../lib/categoryIcons';

type Props = {
  iconKey: string | null | undefined;
  size?: number;
  color?: string;
  bgColor?: string;
  containerSize?: number;
};

export function CategoryIcon({ iconKey, size = 18, color = '#6B7280', bgColor, containerSize }: Props) {
  const IconComponent = getCategoryIconComponent(iconKey);

  const cSize = containerSize ?? size + 12;

  if (IconComponent) {
    return (
      <View style={[styles.container, { width: cSize, height: cSize, borderRadius: cSize / 2, backgroundColor: bgColor }]}>
        <IconComponent size={size} color={color} />
      </View>
    );
  }

  // Fallback: emoji or text
  if (iconKey && iconKey.length <= 4) {
    return (
      <View style={[styles.container, { width: cSize, height: cSize, borderRadius: cSize / 2, backgroundColor: bgColor }]}>
        <Text style={{ fontSize: size - 2 }}>{iconKey}</Text>
      </View>
    );
  }

  // Generic fallback
  return (
    <View style={[styles.container, { width: cSize, height: cSize, borderRadius: cSize / 2, backgroundColor: bgColor }]}>
      <Tag size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
