// composables/useDocumentHandling.ts
/**
 * Composable for handling documents and video files
 */
export function useDocumentHandling() {
  const { t } = useI18n()
  const toast = useToast()

  const isFetchingDocument = ref(false)
  const isVideoModalOpen = ref(false)
  const currentVideo = ref(null)
  const currentStudentVideo = ref(null)

  // Get file URL
  const getFile = async (fileName) => {
    try {
      const response = await $fetch(`/api/blob/get/${fileName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })

      if (response?.url) {
        return response.url
      }
      throw new Error('Invalid response from server: No URL returned')
    }
    catch (error) {
      console.error('Error fetching file URL:', error)
      throw error
    }
  }

  // Open video modal
  const openVideoModal = async (video, student) => {
    currentVideo.value = video
    currentStudentVideo.value = student

    if (video && !video.url && video.filePath) {
      try {
        const url = await getFile(video.filePath)
        if (url) {
          currentVideo.value = {
            ...video,
            url: url
          }
        }
      }
      catch (error) {
        console.error('Error fetching video URL:', error)
        toast.add({
          title: t('error'),
          description: t('error_loading_video'),
          color: 'red'
        })
      }
    }

    isVideoModalOpen.value = true
  }

  // Open document
  const openDocument = async (doc) => {
    isFetchingDocument.value = true

    try {
      const fileUrl = await getFile(doc.filePath)

      if (fileUrl) {
        if (doc.documentType === 'PDF') {
          window.open(fileUrl, '_blank')
        }
        else if (doc.documentType === 'ZIP') {
          const link = document.createElement('a')
          link.href = fileUrl
          link.download = doc.filePath.split('/').pop() || 'download.zip'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
    }
    catch (error) {
      console.error('Error opening document:', error)
      toast.add({
        title: t('error'),
        description: t('error_opening_document'),
        color: 'red'
      })
    }
    finally {
      isFetchingDocument.value = false
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return {
    isFetchingDocument,
    isVideoModalOpen,
    currentVideo,
    currentStudentVideo,
    getFile,
    openVideoModal,
    openDocument,
    formatDate
  }
}
