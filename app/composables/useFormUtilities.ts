export const useFormUtilities = () => {
  const determineFormVariant = (groupName: string | undefined | null): 'lt' | 'en' => {
    if (groupName && groupName.trim()) {
      if (groupName.trim().toUpperCase().endsWith('E')) {
        console.log(`Group "${groupName}" determined as EN variant.`)
        return 'en'
      }
      console.log(`Group "${groupName}" determined as LT variant.`)
      return 'lt'
    }

    if (import.meta.dev) {
      console.warn('⚠️ [determineFormVariant] Invalid group name received:', groupName)
    }

    return 'lt'
  }

  return { determineFormVariant }
}
