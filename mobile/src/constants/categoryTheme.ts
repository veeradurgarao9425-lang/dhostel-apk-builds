import {
  Utensils, Car, ShoppingBag, Receipt, Film, MoreHorizontal,
  HeartPulse, Coffee, Plane, Home, Zap, Gift, BookOpen, Dumbbell, Dog,
  Users, Fuel, Wallet
} from 'lucide-react-native';

export interface CategoryTheme {
  Icon: any;
  color: string;
  bg: string;
  gradient: [string, string] | [string, string, string];
  glowColor: string;
  premium?: boolean;
}

export const CATEGORY_THEME: Record<string, CategoryTheme> = {
  Entertainment: {
    Icon: Film, color: '#C026D3', bg: '#FAE8FF',
    gradient: ['#D946EF', '#C026D3'],
    glowColor: '#E879F9',
    premium: true,
  },
  Food: {
    Icon: Utensils, color: '#FF6B35', bg: '#FFF0EA',
    gradient: ['#FF8A65', '#FF6B35'],
    glowColor: '#FF8A65',
  },
  Transport: {
    Icon: Car, color: '#4F6DFF', bg: '#EEF2FF',
    gradient: ['#6B86FF', '#4F6DFF'],
    glowColor: '#6B86FF',
  },
  Shopping: {
    Icon: ShoppingBag, color: '#22C55E', bg: '#DCFCE7',
    gradient: ['#4ADE80', '#22C55E'],
    glowColor: '#4ADE80',
  },
  Bills: {
    Icon: Receipt, color: '#6B7280', bg: '#F3F4F6',
    gradient: ['#9CA3AF', '#6B7280'],
    glowColor: '#9CA3AF',
  },
  Health: {
    Icon: HeartPulse, color: '#F43F5E', bg: '#FFE4E6',
    gradient: ['#FB7185', '#F43F5E'],
    glowColor: '#FB7185',
  },
  Coffee: {
    Icon: Coffee, color: '#8D6E63', bg: '#EFEBE9',
    gradient: ['#A1887F', '#8D6E63'],
    glowColor: '#A1887F',
  },
  Travel: {
    Icon: Plane, color: '#0EA5E9', bg: '#E0F2FE',
    gradient: ['#38BDF8', '#0EA5E9'],
    glowColor: '#38BDF8',
  },
  Rent: {
    Icon: Home, color: '#607D8B', bg: '#ECEFF1',
    gradient: ['#78909C', '#607D8B'],
    glowColor: '#78909C',
  },
  Utilities: {
    Icon: Zap, color: '#FACC15', bg: '#FEF9C3',
    gradient: ['#FDE047', '#FACC15'],
    glowColor: '#FDE047',
  },
  Gifts: {
    Icon: Gift, color: '#EC4899', bg: '#FCE7F3',
    gradient: ['#F472B6', '#EC4899'],
    glowColor: '#F472B6',
  },
  Education: {
    Icon: BookOpen, color: '#6366F1', bg: '#E0E7FF',
    gradient: ['#818CF8', '#6366F1'],
    glowColor: '#818CF8',
  },
  Gym: {
    Icon: Dumbbell, color: '#0D9488', bg: '#CCFBF1',
    gradient: ['#14B8A6', '#0D9488'],
    glowColor: '#14B8A6',
  },
  Pets: {
    Icon: Dog, color: '#D97706', bg: '#FEF3C7',
    gradient: ['#F59E0B', '#D97706'],
    glowColor: '#F59E0B',
  },
  Family: {
    Icon: Users, color: '#8B5CF6', bg: '#EDE9FE',
    gradient: ['#A78BFA', '#8B5CF6'],
    glowColor: '#A78BFA',
  },
  Fuel: {
    Icon: Fuel, color: '#F59E0B', bg: '#FEF3C7',
    gradient: ['#FBBF24', '#F59E0B'],
    glowColor: '#FBBF24',
  },
  Payment: {
    Icon: Wallet, color: '#16A34A', bg: '#DCFCE7',
    gradient: ['#4ADE80', '#16A34A'],
    glowColor: '#4ADE80',
  },
  Others: {
    Icon: MoreHorizontal, color: '#6B7280', bg: '#F3F4F6',
    gradient: ['#9CA3AF', '#6B7280'],
    glowColor: '#9CA3AF',
  },
};

export const CATEGORY_HERO_IMAGES: Record<string, any> = {
  Entertainment: require('../../assets/expenses/entertainment.jpeg'),
  Coffee: require('../../assets/expenses/cofee.jpeg'),
  Food: require('../../assets/expenses/food.jpeg'),
  Gym: require('../../assets/expenses/gym.jpeg'),
  Shopping: require('../../assets/expenses/shopping.jpeg'),
  Rent: require('../../assets/expenses/rent.jpeg'),
  Transport: require('../../assets/expenses/transport.jpeg'),
  Bills: require('../../assets/expenses/bills.jpeg'),
  Education: require('../../assets/expenses/education.jpeg'),
  Family: require('../../assets/expenses/family.jpeg'),
  Fuel: require('../../assets/expenses/fuel.jpeg'),
  Gifts: require('../../assets/expenses/gift.jpeg'),
  Health: require('../../assets/expenses/medical.jpeg'),
  Pets: require('../../assets/expenses/pet.jpeg'),
};

export function getCategoryHeroImage(category: string) {
  return CATEGORY_HERO_IMAGES[category] || null;
}

export const DEFAULT_CATEGORY_THEME = CATEGORY_THEME.Others;

export function getCategoryTheme(name?: string | null): CategoryTheme {
  if (!name) return DEFAULT_CATEGORY_THEME;
  const normalized = name.trim().toLowerCase();
  const matchedKey = Object.keys(CATEGORY_THEME).find(k => k.toLowerCase() === normalized);
  return matchedKey ? CATEGORY_THEME[matchedKey] : DEFAULT_CATEGORY_THEME;
}
