// server/api/students/[id].get.ts
import { eq } from 'drizzle-orm'
import { studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const db = useDB()
    const id = parseInt(getRouterParam(event, 'id') || '', 10)

    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid student ID format'
      })
    }

    const student = await db
      .select()
      .from(studentRecords)
      .where(eq(studentRecords.id, id))
      .limit(1)

    if (!student || student.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Student not found'
      })
    }

    return student[0]
  }
  catch (error) {
    console.error('Error fetching student:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'An error occurred while fetching the student record'
    })
  }
})
