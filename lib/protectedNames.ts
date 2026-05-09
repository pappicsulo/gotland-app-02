// ===== protectedNames.ts =====

const EXACT_PROTECTED_NAMES = new Set([
  'gotly',
  'admin',
  'administrator',
  'support',
  'help',
  'security',
  'moderator',
  'mod',
  'official',
  'team',
  'staff',
  'root',
  'system',
  'api',
  'www',
])

const COMPACT_PROTECTED_PARTS = [
  'gotly',
  'gotlysupport',
  'gotlyteam',
  'admin',
  'administrator',
  'moderator',
  'official',
  'support',
  'staff',
]

function normalizeExact(value: string) {
  return value.trim().toLowerCase()
}

function normalizeCompact(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s._-]/g, '')
}

function isProtectedName(value: string) {
  const exact = normalizeExact(value)
  const compact = normalizeCompact(value)

  if (EXACT_PROTECTED_NAMES.has(exact)) {
    return true
  }

  return COMPACT_PROTECTED_PARTS.some((word) => compact.includes(word))
}

export function isProtectedUsername(username: string) {
  return isProtectedName(username)
}

export function isProtectedDisplayName(displayName: string) {
  return isProtectedName(displayName)
}