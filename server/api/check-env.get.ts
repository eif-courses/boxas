export default defineEventHandler(() => {
  return {
    hasTenantId: !!process.env.AZURE_TENANT_ID,
    hasClientId: !!process.env.AZURE_CLIENT_ID,
    hasClientSecret: !!process.env.AZURE_CLIENT_SECRET
  }
})
