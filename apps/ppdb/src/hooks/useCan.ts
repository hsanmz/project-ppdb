import { usePermission } from '../contexts/AuthContext'

export type AccessLevel = 'dashboard' | 'read' | 'crud'

export function useCanPage(pageKey: string) {
  const { canCrudPage, canAccessPage, isSuperadmin } = usePermission()
  return {
    canAccess: canAccessPage(pageKey),
    canCrud: canCrudPage(pageKey),
    isSuperadmin,
  }
}

export function useCan(module: string, level: AccessLevel = 'crud', pageKey?: string) {
  const { hasModuleAccess, isSuperadmin, permissions, canCrudPage } = usePermission()
  const pageCrud = pageKey ? canCrudPage(pageKey) : true
  return {
    level: (permissions?.[module] || 'none') as string,
    canAccess: hasModuleAccess(module, level),
    canCrud: isSuperadmin || (hasModuleAccess(module, 'crud') && pageCrud),
    canRead: hasModuleAccess(module, 'read'),
    isSuperadmin,
  }
}
