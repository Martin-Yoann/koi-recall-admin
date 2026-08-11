// ============================================================
// KOI Admin — UI Types
// (shared with KOI-web)
// ============================================================

export type BladeStage = 'safety' | 'verification' | 'resolution';

export interface StepDefinition {
  id: string;
  label: string;
  blade: BladeStage;
  isComplete: boolean;
  isCurrent: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  blade?: BladeStage;
  isExternal?: boolean;
}

export interface StatCardData {
  label: string;
  value: string | number;
  change?: { value: number; direction: 'up' | 'down' };
  bladeVariant?: BladeStage;
  icon: string;
}
