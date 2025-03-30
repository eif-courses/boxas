export default defineOAuthMicrosoftEventHandler({
  async onSuccess(event, { user }) {
    // Get logger from event context
    const logger = event.context.logger || console
    logger.info('Microsoft OAuth success callback', {
      userId: user.id,
      email: user.mail
    })

    try {
      logger.debug('Setting user session')
      await setUserSession(event, { user })

      logger.info('OAuth authentication completed successfully', {
        userId: user.id,
        email: user.mail,
        redirectTo: '/'
      })

      // Redirect to dashboard or another page
      return sendRedirect(event, '/')
    }
    catch (error) {
      logger.error('OAuth authentication error', {
        userId: user.id,
        email: user.mail,
        error: error.message,
        stack: error.stack
      })

      throw error // Re-throw to maintain original error handling
    }
  }
})
