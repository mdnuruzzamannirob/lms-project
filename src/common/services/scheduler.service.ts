import { logger } from '../../config/logger'

type JobHandler = () => Promise<void>

type ScheduledJobDefinition = {
  name: string
  intervalMs: number
  handler: JobHandler
}

type RunningJob = {
  definition: ScheduledJobDefinition
  timer: NodeJS.Timeout
}

class SchedulerService {
  private readonly jobs = new Map<string, RunningJob>()

  registerJob(definition: ScheduledJobDefinition): void {
    if (this.jobs.has(definition.name)) {
      throw new Error(`Job already registered: ${definition.name}`)
    }

    const timer = setInterval(() => {
      void definition
        .handler()
        .then(() => {
          logger.debug('Scheduled job completed', { job: definition.name })
        })
        .catch((error: unknown) => {
          logger.error('Scheduled job failed', {
            job: definition.name,
            error:
              error instanceof Error
                ? (error.stack ?? error.message)
                : String(error),
          })
        })
    }, definition.intervalMs)

    this.jobs.set(definition.name, {
      definition,
      timer,
    })

    logger.info('Scheduled job registered', {
      job: definition.name,
      intervalMs: definition.intervalMs,
    })
  }

  async runJobNow(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName)

    if (!job) {
      throw new Error(`Scheduled job not found: ${jobName}`)
    }

    await job.definition.handler()
  }

  stopAllJobs(): void {
    this.jobs.forEach((job, name) => {
      clearInterval(job.timer)
      logger.info('Scheduled job stopped', { job: name })
    })

    this.jobs.clear()
  }

  getRegisteredJobs(): Array<{ name: string; intervalMs: number }> {
    return Array.from(this.jobs.values()).map((job) => ({
      name: job.definition.name,
      intervalMs: job.definition.intervalMs,
    }))
  }
}

export const schedulerService = new SchedulerService()
