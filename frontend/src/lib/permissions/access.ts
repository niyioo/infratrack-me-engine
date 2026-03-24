export function hasAnyRole(userRoles: string[], requiredRoles: string[]) {
  return requiredRoles.some((role) => userRoles.includes(role));
}