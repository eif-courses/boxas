// server/api/students/project-title.patch.ts
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { studentRecords } from '~~/server/database/schema'

// Define validation schema with Zod
const updateProjectTitleSchema = z.object({
  id: z.number().int().positive(),
  finalProjectTitle: z.string().trim().max(255)
})

export default defineEventHandler(async (event) => {
  try {
    const db = useDB()
    const body = await readBody(event)

    // Validate request body with Zod
    const validatedData = updateProjectTitleSchema.safeParse(body)

    if (!validatedData.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid data',
        data: validatedData.error.format()
      })
    }

    const { id, finalProjectTitle } = validatedData.data

    // Update the record in the database
    const result = await db
      .update(studentRecords)
      .set({ finalProjectTitle })
      .where(eq(studentRecords.id, id))
      .returning({ id: studentRecords.id })

    if (!result.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Student record not found'
      })
    }

    return {
      success: true,
      message: 'Final project title updated successfully',
      data: result[0]
    }
  }
  catch (error) {
    console.error('Error updating final project title:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'An error occurred while updating the final project title'
    })
  }
})
