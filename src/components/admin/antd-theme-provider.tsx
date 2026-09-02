'use client';

import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd';

/**
 * antd theme mapped onto the KOI Navy/Blue palette (#0D1B2A + #3A86FF).
 * Keep control heights at 36px and radii at 6px so antd controls match the
 * existing Element-style form controls defined in globals.css.
 */
const themeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#3A86FF',
    colorInfo: '#3A86FF',
    colorLink: '#3A86FF',
    colorSuccess: '#16A34A',
    colorWarning: '#F59E0B',
    colorError: '#DC2626',
    colorTextBase: '#0D1B2A',
    colorText: '#0D1B2A',
    colorTextSecondary: '#3A4A5E',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#A8ABB2',
    colorBorder: '#E4E7ED',
    colorBorderSecondary: '#E4E7ED',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F4F6F9',
    fontFamily:
      "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    borderRadius: 6,
    controlHeight: 36,
    controlOutline: 'rgba(58, 134, 255, 0.16)',
    boxShadowSecondary:
      '0 4px 24px rgba(13, 27, 42, 0.10), 0 1px 3px rgba(13, 27, 42, 0.06)',
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightSM: 28,
      defaultBorderColor: '#C0C4CC',
      defaultColor: '#3A4A5E',
    },
    Input: { borderRadius: 6, controlHeight: 36 },
    InputNumber: { borderRadius: 6 },
    Select: { borderRadius: 6, controlHeight: 36 },
    Table: {
      headerBg: '#F4F6F9',
      headerColor: '#0D1B2A',
      borderColor: '#E4E7ED',
      rowHoverBg: 'rgba(58, 134, 255, 0.05)',
    },
    Modal: { borderRadiusLG: 16, contentBg: '#FFFFFF' },
    Tooltip: { colorBgSpotlight: '#0D1B2A' },
    Popover: { borderRadiusLG: 8 },
    Dropdown: { borderRadiusLG: 8 },
    Tag: { borderRadiusSM: 4 },
    Checkbox: { borderRadiusSM: 4 },
    Radio: { borderRadiusSM: 4 },
  },
};

export function AntdThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={themeConfig}>
      <AntdApp className="flex h-full w-full min-w-0 flex-1 flex-row">{children}</AntdApp>
    </ConfigProvider>
  );
}
