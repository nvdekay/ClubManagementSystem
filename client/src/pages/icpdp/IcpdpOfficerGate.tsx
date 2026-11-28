import type { ReactNode } from 'react'

import { AppNotice } from '@/components/ui/notice/AppNotice'
import { useAuth } from '@/hooks/useAuth'

interface IcpdpOfficerGateProps {
  /** Thông báo khi người dùng không có vai trò ICPDP Officer. */
  deniedMessage: string
  children: (csrfToken: string) => ReactNode
}

// Cổng quyền ICPDP Officer cho các trang ICPDP; WorkspaceShell đã lo phần chờ phiên và chuyển về /login
export function IcpdpOfficerGate({ deniedMessage, children }: IcpdpOfficerGateProps) {
  const auth = useAuth()
  if (!auth.data) {
    return null
  }
  if (!auth.data.systemRoles.includes('ICPDP_OFFICER')) {
    return (
      <AppNotice tone="danger" role="alert">
        {deniedMessage}
      </AppNotice>
    )
  }
  return <>{children(auth.data.csrfToken)}</>
}
