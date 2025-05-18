export const useUnixDateUtils = () => {
  const formatUnixDate = (timestamp: number | undefined | null): string => {
    if (timestamp === undefined || timestamp === null) return 'N/A'
    try {
      return new Date(timestamp * 1000).toLocaleDateString('lt-LT')
    }
    catch (e) {
      return 'Invalid Date'
    }
  }

  const formatUnixDateTime = (timestamp: number | undefined | null): string | undefined => {
    if (timestamp === undefined || timestamp === null) return undefined
    try {
      return new Date(timestamp * 1000).toLocaleString('lt-LT', { dateStyle: 'short', timeStyle: 'short' })
    }
    catch (e) {
      return undefined
    }
  }

  return {
    formatUnixDate,
    formatUnixDateTime
  }
}
