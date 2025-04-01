export function generateAccessCode(department: string): string {
  // Create department prefix (first 3-4 chars)
  const deptPrefix = department.slice(0, 3).toUpperCase()

  // Generate 6 random alphanumeric characters
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluded similar-looking chars
  let randomPart = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    randomPart += characters.charAt(randomIndex)
  }

  // Return format: DEPT-RANDOM (e.g. ELE-A2B3C4)
  return `${deptPrefix}-${randomPart}`
}
