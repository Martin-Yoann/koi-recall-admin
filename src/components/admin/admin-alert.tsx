'use client';

import { App as AntdApp } from 'antd';
import { useCallback } from 'react';

export function useAdminAlert() {
  const { modal } = AntdApp.useApp();
  
  const adminAlert = useCallback((content: string, title: string = 'Notice') => {
    modal.info({
      title,
      content,
      centered: true,
      okText: 'OK',
      okButtonProps: { className: 'admin-btn' }
    });
  }, [modal]);

  return adminAlert;
}
