import {
  Utensils, Car, ShoppingBag, Receipt, Film, MoreHorizontal,
  HeartPulse, Coffee, Plane, Home, Zap, Gift, BookOpen, Dumbbell, Dog,
  Users, Fuel
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
    Icon: Film, color: '#8E24AA', bg: '#F4E5FA',
    gradient: ['#6A1B9A', '#AB47BC', '#FF4D9E'],
    glowColor: '#FF2E88',
    premium: true,
  },
  Food: {
    Icon: Utensils, color: '#EF5350', bg: '#FDEAEA',
    gradient: ['#F4511E', '#FF8A65'],
    glowColor: '#FF7043',
  },
  Transport: {
    Icon: Car, color: '#2245D4', bg: '#EEF3FF',
    gradient: ['#3E5CE0', '#7B93FF'],
    glowColor: '#3E5CE0',
  },
  Shopping: {
    Icon: ShoppingBag, color: '#43A047', bg: '#EAF5EA',
    gradient: ['#43A047', '#81C784'],
    glowColor: '#43A047',
  },
  Bills: {
    Icon: Receipt, color: '#FB8C00', bg: '#FFF3E0',
    gradient: ['#FB8C00', '#FFB74D'],
    glowColor: '#FFA726',
  },
  Health: {
    Icon: HeartPulse, color: '#E53935', bg: '#FDEAEA',
    gradient: ['#E53935', '#FF7B72'],
    glowColor: '#EF5350',
  },
  Coffee: {
    Icon: Coffee, color: '#795548', bg: '#EFEBE9',
    gradient: ['#795548', '#A98274'],
    glowColor: '#A1887F',
  },
  Travel: {
    Icon: Plane, color: '#0288D1', bg: '#E1F5FE',
    gradient: ['#0288D1', '#4FC3F7'],
    glowColor: '#29B6F6',
  },
  Rent: {
    Icon: Home, color: '#546E7A', bg: '#ECEFF1',
    gradient: ['#546E7A', '#8EACBB'],
    glowColor: '#78909C',
  },
  Utilities: {
    Icon: Zap, color: '#F9A825', bg: '#FFFDE7',
    gradient: ['#F9A825', '#FFCA28'],
    glowColor: '#FFCA28',
  },
  Gifts: {
    Icon: Gift, color: '#00897B', bg: '#E0F2F1',
    gradient: ['#00897B', '#4DB6AC'],
    glowColor: '#26A69A',
  },
  Education: {
    Icon: BookOpen, color: '#3949AB', bg: '#E8EAF6',
    gradient: ['#3F51B5', '#7986CB'],
    glowColor: '#5C6BC0',
  },
  Gym: {
    Icon: Dumbbell, color: '#F4511E', bg: '#FBE9E7',
    gradient: ['#E64A19', '#FF8A65'],
    glowColor: '#FF7043',
  },
  Pets: {
    Icon: Dog, color: '#6D4C41', bg: '#EFEBE9',
    gradient: ['#795548', '#A1887F'],
    glowColor: '#A1887F',
  },
  Family: {
    Icon: Users, color: '#D81B60', bg: '#FCE4EC',
    gradient: ['#D81B60', '#F06292'],
    glowColor: '#E91E63',
  },
  Fuel: {
    Icon: Fuel, color: '#FF9800', bg: '#FFF3E0',
    gradient: ['#F57C00', '#FFB74D'],
    glowColor: '#FF9800',
  },
  Others: {
    Icon: MoreHorizontal, color: '#546E7A', bg: '#ECEFF1',
    gradient: ['#607D8B', '#90A4AE'],
    glowColor: '#78909C',
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
  return (name && CATEGORY_THEME[name]) || DEFAULT_CATEGORY_THEME;
}
