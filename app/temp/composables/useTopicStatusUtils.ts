// composables/useTopicStatusUtils.ts
/**
 * Composable for topic status utilities (labels, colors, icons)
 */
export function useTopicStatusUtils() {
  const { t } = useI18n()

  // Get button label based on topic status
  const getTopicButtonLabel = (row) => {
    if (!row.projectTopicRegistrations || row.projectTopicRegistrations.length === 0) {
      return t('topic')
    }

    const status = row.projectTopicRegistrations[0].status

    switch (status) {
      case 'draft': return t('edit')
      case 'submitted': return t('review')
      case 'needs_revision': return t('review')
      case 'approved': return t('view')
      case 'head_approved': return t('view')
      default: return t('edit')
    }
  }

  // Get status label
  const getTopicStatusLabel = (status) => {
    switch (status) {
      case 'submitted': return t('submitted')
      case 'approved': return t('approved')
      case 'needs_revision': return t('needs_revision')
      case 'head_approved': return t('head_approved')
      case 'draft': return t('draft')
      default: return t('unknown')
    }
  }

  // Get tooltip text
  const getTopicStatusTooltip = (status) => {
    switch (status) {
      case 'submitted': return t('topic_submitted_tooltip')
      case 'approved': return t('topic_approved_tooltip')
      case 'head_approved': return t('topic_head_approved_tooltip')
      case 'needs_revision': return t('topic_needs_revision_tooltip')
      case 'rejected': return t('topic_rejected_tooltip')
      case 'draft': return t('topic_draft_tooltip')
      default: return ''
    }
  }

  // Get status color
  const getTopicStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'blue'
      case 'approved': return 'blue'
      case 'needs_revision': return 'orange'
      case 'head_approved': return 'green'
      case 'rejected': return 'red'
      case 'draft': return 'gray'
      default: return 'gray'
    }
  }

  // Get status icon
  const getTopicStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return 'i-heroicons-document-check'
      case 'approved': return 'i-heroicons-check-circle'
      case 'needs_revision': return 'i-heroicons-exclamation-circle'
      case 'rejected': return 'i-heroicons-x-circle'
      case 'head_approved': return 'i-heroicons-eye'
      case 'draft': return 'i-heroicons-pencil-square'
      default: return 'i-heroicons-document'
    }
  }

  return {
    getTopicButtonLabel,
    getTopicStatusLabel,
    getTopicStatusTooltip,
    getTopicStatusColor,
    getTopicStatusIcon
  }
}
