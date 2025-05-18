// composables/useSupervisorReports.ts
/**
 * Composable for handling supervisor reports
 */
export function useSupervisorReports(refreshFunction) {
  const toast = useToast()
  const { t } = useI18n()
  const isParentSaving = ref(false)

  // Handle report save
  const handleReportSave = async (recordId, updatedData) => {
    if (recordId === undefined || recordId === null) {
      toast.add({ title: 'Klaida', description: 'Trūksta studento įrašo ID.', color: 'red' })
      return
    }

    if (!updatedData) {
      toast.add({ title: 'Klaida', description: 'Negauti formos duomenys.', color: 'red' })
      return
    }

    isParentSaving.value = true

    try {
      const apiPayload = {
        studentRecordId: recordId,
        EXPL: updatedData.EXPL || '',
        WORK: updatedData.WORK || 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
        OM: updatedData.OM ?? 0,
        SSM: updatedData.SSM ?? 0,
        STUM: updatedData.STUM ?? 0,
        JM: updatedData.JM ?? 0,
        POS: updatedData.POS || '',
        PASS: updatedData.PASS ? 1 : 0
      }

      const { data, error } = await useFetch('/api/students/supervisor-reports', {
        method: 'POST',
        body: apiPayload
      })

      if (error.value) {
        toast.add({
          title: 'Klaida',
          description: error.value.data?.message || error.value.statusMessage || 'Nepavyko išsaugoti atsiliepimo.',
          color: 'red'
        })
      }
      else {
        toast.add({
          title: 'Pavyko',
          description: data.value?.message || 'Atsiliepimas sėkmingai išsaugotas.',
          color: 'green'
        })

        await refreshFunction()
      }
    }
    catch (err) {
      console.error('Unexpected error during report save fetch:', err)
      toast.add({ title: 'Sistemos Klaida', description: 'Įvyko netikėta klaida bandant išsaugoti.', color: 'red' })
    }
    finally {
      isParentSaving.value = false
    }
  }

  return {
    isParentSaving,
    handleReportSave
  }
}
