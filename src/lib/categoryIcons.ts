import {
  Utensils, Coffee, GlassWater, Bus, Car, Fuel,
  ShoppingBag, Shirt, Laptop, ShoppingCart,
  Clapperboard, Film, Gamepad2, Tv,
  Heart, Pill, Stethoscope, Dumbbell,
  Home, Key, Zap, Wrench,
  Plane, BookOpen, Package, Train, Tag, UtensilsCrossed,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Utensils, Coffee, GlassWater, Bus, Car, Fuel,
  ShoppingBag, Shirt, Laptop, ShoppingCart,
  Clapperboard, Film, Gamepad2, Tv,
  Heart, Pill, Stethoscope, Dumbbell,
  Home, Key, Zap, Wrench,
  Plane, BookOpen, Package, Train, Tag, UtensilsCrossed,
};

export function getCategoryIconComponent(iconKey: string | null | undefined): LucideIcon | null {
  if (!iconKey) return null;
  return CATEGORY_ICON_MAP[iconKey] ?? null;
}
