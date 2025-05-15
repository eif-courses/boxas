// server/api/students/project-topics/[id]/index.get.ts
import { eq } from 'drizzle-orm'
import { projectTopicRegistrations } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: id'
    })
  }

  try {
    const db = useDB()

    // Fetch the topic registration with comments
    const topic = await db.query.projectTopicRegistrations.findFirst({
      where: eq(projectTopicRegistrations.id, id),
      with: {
        comments: true, // Include comments if you have a relation set up
        versions: {
          // Optionally include a limited number of versions, ordered by most recent
          orderBy: (versions, { desc }) => [desc(versions.createdAt)],
          limit: 5
        }
      }
    })

    if (!topic) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Topic registration not found'
      })
    }

    return { topic }
  }
  catch (error) {
    console.error('Error fetching topic registration:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching topic registration'
    })
  }
})
