import { err, info } from '@magickml/embedder/config'
import { processEmbedJob } from '@magickml/embedder/queue'
import { Worker } from 'bullmq'
import { defineNitroPlugin } from 'nitropack/runtime'

const connection = { host: 'localhost', port: 6379 }

export const embedderWorkerPlugin = defineNitroPlugin(() => {
  const queueName = 'embedJobs'

  const worker = new Worker<
    {
      jobId: string
    },
    void,
    'processJob'
  >(
    queueName,
    async job => {
      console.log(`Processing job ${job.id}`)
      try {
        await processEmbedJob(job.data.jobId)
      } catch (error) {
        err(`Error processing job ${job.id}`)
      }
    },
    { connection }
  )

  worker.on('completed', job => {
    info(`Job ${job.id} has been completed`)
  })

  worker.on('failed', (job, errr) => {
    err(`Job ${job?.id} has failed with error: ${errr.message}`)
  })

  info('BullMQ worker initialized')
})
