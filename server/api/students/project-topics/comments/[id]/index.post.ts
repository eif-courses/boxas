// server/api/students/project-topics/index.post.ts
import { eq } from 'drizzle-orm'
import { projectTopicRegistrations, projectTopicRegistrationVersions } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Validate required fields
  const requiredFields = ['studentRecordId', 'TITLE', 'TITLE_EN', 'PROBLEM', 'OBJECTIVE', 'TASKS', 'SUPERVISOR']
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

    // Check if this student already has a topic registration
    const existingRegistration = await db.query.projectTopicRegistrations.findFirst({
      where: eq(projectTopicRegistrations.studentRecordId, body.studentRecordId)
    })

    if (existingRegistration) {
      throw createError({
        statusCode: 409, // Conflict
        statusMessage: 'This student already has a topic registration'
      })
    }

    // Set current timestamp
    const now = Math.floor(Date.now() / 1000)

    // Map the incoming data to the database schema fields
    const topicData = {
      studentRecordId: body.studentRecordId,
      title: body.TITLE,
      titleEn: body.TITLE_EN,
      problem: body.PROBLEM,
      objective: body.OBJECTIVE,
      tasks: body.TASKS,
      supervisor: body.SUPERVISOR,
      completionDate: body.COMPLETION_DATE || null,
      status: body.status || 'draft', // Default to draft if not provided
      createdAt: now,
      updatedAt: now,
      submittedAt: body.status === 'submitted' ? now : null,
      isRegistered: 0 // Not registered yet
    }

    // Insert the new topic registration
    const result = await db.insert(projectTopicRegistrations)
      .values(topicData)
      .returning()

    const newTopicId = result[0].id

    // Create a version record for the initial creation
    const versionData = JSON.stringify({
      title: topicData.title,
      titleEn: topicData.titleEn,
      problem: topicData.problem,
      objective: topicData.objective,
      tasks: topicData.tasks,
      completionDate: topicData.completionDate,
      supervisor: topicData.supervisor,
      status: topicData.status
    })

    await db.insert(projectTopicRegistrationVersions)
      .values({
        topicRegistrationId: newTopicId,
        versionData,
        createdBy: body.userRole || 'student',
        createdAt: now
      })

    // Fetch the created record to return (including any auto-generated fields)
    const createdTopic = await db.query.projectTopicRegistrations.findFirst({
      where: eq(projectTopicRegistrations.id, newTopicId)
    })

    return {
      success: true,
      message: 'Topic registration created successfully',
      topic: createdTopic
    }
  }
  catch (error) {
    console.error('Error creating topic registration:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error creating topic registration'
    })
  }
})
