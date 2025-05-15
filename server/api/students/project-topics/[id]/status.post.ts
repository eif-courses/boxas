// server/api/students/project-topics/[id]/status.post.ts
import { eq } from 'drizzle-orm'
import { projectTopicRegistrations, projectTopicRegistrationVersions } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get the id from route params
  const id = Number(event.context.params?.id)

  // Get request body
  const { status, userRole } = await readBody(event)

  if (!id || !status) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters'
    })
  }

  // Validate status
  const validStatuses = ['draft', 'submitted', 'needs_revision', 'approved', 'rejected']
  if (!validStatuses.includes(status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid status value'
    })
  }

  try {
    const db = useDB()

    // Check if the topic registration exists
    const registration = await db.query.projectTopicRegistrations.findFirst({
      where: eq(projectTopicRegistrations.id, id)
    })

    if (!registration) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Topic registration not found'
      })
    }

    // Validate status transitions
    const now = Math.floor(Date.now() / 1000)
    let submittedAt = registration.submittedAt

    // If status is changing to submitted, update submittedAt
    if (status === 'submitted' && registration.status !== 'submitted') {
      submittedAt = now
    }

    // Update the status
    await db.update(projectTopicRegistrations)
      .set({
        status,
        updatedAt: now,
        submittedAt
      })
      .where(eq(projectTopicRegistrations.id, id))

    // Create a new version to track the status change
    const versionData = JSON.stringify({
      title: registration.title,
      titleEn: registration.titleEn,
      problem: registration.problem,
      objective: registration.objective,
      tasks: registration.tasks,
      completionDate: registration.completionDate,
      supervisor: registration.supervisor,
      status
    })

    await db.insert(projectTopicRegistrationVersions)
      .values({
        topicRegistrationId: id,
        versionData,
        createdBy: userRole || 'unknown', // Use the role of the user making the change
        createdAt: now
      })

    return {
      success: true,
      message: `Status updated to ${status}`
    }
  }
  catch (error) {
    console.error('Error updating topic status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error updating topic status'
    })
  }
})
