// server/api/students/project-topics/index.get.ts
import { eq } from 'drizzle-orm'
import { projectTopicRegistrations, topicRegistrationComments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get the studentRecordId from query parameters
  const query = getQuery(event)
  const studentRecordId = Number(query.studentRecordId)

  if (!studentRecordId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: studentRecordId'
    })
  }

  try {
    const db = useDB()

    // Fetch the topic registration for this student
    const topicRegistration = await db.query.projectTopicRegistrations.findFirst({
      where: eq(projectTopicRegistrations.studentRecordId, studentRecordId)
    })

    if (!topicRegistration) {
      return {
        topic: null,
        message: 'No topic registration found for this student'
      }
    }

    // Fetch comments separately - this matches your original implementation
    const comments = await db.query.topicRegistrationComments.findMany({
      where: eq(topicRegistrationComments.topicRegistrationId, topicRegistration.id)
    })

    return {
      topic: {
        ...topicRegistration,
        comments
      }
    }
  }
  catch (error) {
    console.error('Error fetching topic registration:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching topic registration'
    })
  }
})
