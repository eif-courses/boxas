export const useFormUtilities = () => {
  const determineFormVariant = (groupName: string | undefined | null): 'lt' | 'en' => {
    // Check if groupName is a non-empty string
    if (groupName && groupName.trim()) {
      // Check if the last character, converted to uppercase, is 'E'
      if (groupName.trim().toUpperCase().endsWith('E')) {
        console.log(`Group "${groupName}" determined as EN variant.`) // Optional logging
        return 'en'
      }
    }
    // Default to Lithuanian if groupName is missing, empty, or doesn't end with 'E'
    console.log(`Group "${groupName}" determined as LT variant.`) // Optional logging
    return 'lt'
  }
  return { determineFormVariant }
}
