import {
  Zap,
  ShieldCheck,
  Headphones,
  ListChecks,
  FileSpreadsheet,
  Timer,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Award,
  Star,
  Lock,
  Rocket,
  Heart,
  Globe,
  Users,
  Clock,
  BookOpen,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

// Resolve stored icon names through this allowlist.
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Zap,
  ShieldCheck,
  Headphones,
  ListChecks,
  FileSpreadsheet,
  Timer,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Award,
  Star,
  Lock,
  Rocket,
  Heart,
  Globe,
  Users,
  Clock,
  BookOpen,
  MessageCircle,
};

export type IconName = keyof typeof ICON_REGISTRY;

export const ICON_NAMES = Object.keys(ICON_REGISTRY) as IconName[];

export const DEFAULT_ICON_NAME: IconName = 'Sparkles';

// Unknown stored icon names fall back to the default icon.
export function resolveIcon(name: string | undefined): LucideIcon {
  if (name && name in ICON_REGISTRY) return ICON_REGISTRY[name];
  return ICON_REGISTRY[DEFAULT_ICON_NAME];
}
