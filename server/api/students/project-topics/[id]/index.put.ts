// server/api/students/project-topics/[id]/index.put.ts
import { eq } from 'drizzle-orm'
import { projectTopicRegistrations, projectTopicRegistrationVersions } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: id'
    })
  }

  // Validate required fields
  const requiredFields = ['TITLE', 'TITLE_EN', 'PROBLEM', 'OBJECTIVE', 'TASKS', 'SUPERVISOR']
  for (const field of requiredFields) {
    if (!body[field]) {
      throw createError({
        statusCode: 400,
        statusMessage: `Missing required field: ${field}`
      })
    }
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

    // Set current timestamp
    const now = Math.floor(Date.now() / 1000)

    // Map the incoming data to the database schema fields
    const updateData = {
      title: body.TITLE,
      titleEn: body.TITLE_EN,
      problem: body.PROBLEM,
      objective: body.OBJECTIVE,
      tasks: body.TASKS,
      supervisor: body.SUPERVISOR,
      completionDate: body.COMPLETION_DATE || null,
      status: body.status || registration.status, // Preserve existing status if not provided
      updatedAt: now
    }

    // Update the topic registration
    await db.update(projectTopicRegistrations)
      .set(updateData)
      .where(eq(projectTopicRegistrations.id, id))

    // Create a version record to track changes
    const versionData = JSON.stringify({
      title: updateData.title,
      titleEn: updateData.titleEn,
      problem: updateData.problem,
      objective: updateData.objective,
      tasks: updateData.tasks,
      completionDate: updateData.completionDate,
      supervisor: updateData.supervisor,
      status: updateData.status
    })

    await db.insert(projectTopicRegistrationVersions)
      .values({
        topicRegistrationId: id,
        versionData,
        createdBy: body.userRole || 'student', // Default to student if not specified
        createdAt: now
      })

    // Fetch the updated record to return
    const updatedTopic = await db.query.projectTopicRegistrations.findFirst({
      where: eq(projectTopicRegistrations.id, id),
      with: {
        comments: true // Include comments if you have a relation set up
      }
    })

    return {
      success: true,
      message: 'Topic updated successfully',
      topic: updatedTopic
    }
  }
  catch (error) {
    console.error('Error updating topic:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error updating topic registration'
    })
  }
})
