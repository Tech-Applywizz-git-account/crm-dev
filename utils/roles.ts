/**
 * Parse a combined role string into an array of roles
 * Example: "Resume Head-Sales Associate" => ["Resume Head", "Sales Associate"]
 * Example: "Resume Head" => ["Resume Head"]
 */
export function getRoles(roleString: string): string[] {
  if (!roleString) return [];
  return roleString.split("-").map((r) => r.trim());
}

/**
 * Combine roles array into a single string
 * Example: ["Resume Head", "Sales Associate"] => "Resume Head-Sales Associate"
 */
export function combineRoles(roles: string[]): string {
  return roles.join("-");
}