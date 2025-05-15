// server/api/students/project-topics/index.post.ts
import { eq } from 'drizzle-orm'
import { projectTopicRegistrations, projectTopicRegistrationVersions } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const {
    studentRecordId,
    TITLE,
    TITLE_EN,
    PROBLEM,
    OBJECTIVE,
    TASKS,
    COMPLETION_DATE,
    SUPERVISOR,
    status
  } = body

  if (!studentRecordId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: studentRecordId'
    })
  }

  try {
    const db = useDB()

    // Check if this student already has a topic registration
    const existingRegistration = await db.query.projectTopicRegistrations.findFirst({
      where: eq(projectTopicRegistrations.studentRecordId, studentRecordId)
    })

    // Set current timestamp
    const now = Math.floor(Date.now() / 1000)

    // If updating an existing registration
    if (existingRegistration) {
      await db.update(projectTopicRegistrations)
        .set({
          title: TITLE,
          titleEn: TITLE_EN,
          problem: PROBLEM,
          objective: OBJECTIVE,
          tasks: TASKS,
          completionDate: COMPLETION_DATE,
          supervisor: SUPERVISOR,
          status: status || existingRegistration.status,
          updatedAt: now,
          submittedAt: status === 'submitted' ? now : existingRegistration.submittedAt,
          currentVersion: existingRegistration.currentVersion + 1
        })
        .where(eq(projectTopicRegistrations.id, existingRegistration.id))

      // Save a new version
      const versionData = JSON.stringify({
        title: TITLE,
        titleEn: TITLE_EN,
        problem: PROBLEM,
        objective: OBJECTIVE,
        tasks: TASKS,
        completionDate: COMPLETION_DATE,
        supervisor: SUPERVISOR,
        status: status || existingRegistration.status
      })

      await db.insert(projectTopicRegistrationVersions)
        .values({
          topicRegistrationId: existingRegistration.id,
          versionData,
          createdBy: 'student', // Assuming this is coming from student
          createdAt: now
        })

      return {
        id: existingRegistration.id,
        message: 'Topic registration updated successfully'
      }
    }
    // Creating a new registration
    else {
      const result = await db.insert(projectTopicRegistrations)
        .values({
          studentRecordId,
          title: TITLE,
          titleEn: TITLE_EN,
          problem: PROBLEM,
          objective: OBJECTIVE,
          tasks: TASKS,
          completionDate: COMPLETION_DATE,
          supervisor: SUPERVISOR,
          status: status || 'draft',
          createdAt: now,
          updatedAt: now,
          submittedAt: status === 'submitted' ? now : null,
          currentVersion: 1
        })
        .returning({ id: projectTopicRegistrations.id })

      const newRegistrationId = result[0].id

      // Save the initial version
      const versionData = JSON.stringify({
        title: TITLE,
        titleEn: TITLE_EN,
        problem: PROBLEM,
        objective: OBJECTIVE,
        tasks: TASKS,
        completionDate: COMPLETION_DATE,
        supervisor: SUPERVISOR,
        status: status || 'draft'
      })

      await db.insert(projectTopicRegistrationVersions)
        .values({
          topicRegistrationId: newRegistrationId,
          versionData,
          createdBy: 'student', // Assuming this is coming from student
          createdAt: now
        })

      return {
        id: newRegistrationId,
        message: 'Topic registration created successfully'
      }
    }
  }
  catch (error) {
    console.error('Error creating/updating topic registration:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error saving topic registration'
    })
  }
})
