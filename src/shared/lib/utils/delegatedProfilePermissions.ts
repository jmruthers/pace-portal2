/**
 * Whether linked-profile permission allows opening the delegated edit workspace (PR08).
 */
export function hasDelegatedEditPermission(permissionType: string): boolean {
  const p = permissionType.trim().toLowerCase();
  return ['edit', 'update', 'admin', 'full', 'manage', 'write'].some(
    (token) => p === token || p.includes(token)
  );
}
