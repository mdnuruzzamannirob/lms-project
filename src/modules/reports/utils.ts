import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

import { config } from '../../config'
import { auditService } from '../audit/service'
import { reportsAggregationService } from './aggregation.service'
import { MAX_REPORT_RETRIES } from './constants'
import { ReportType } from './interface'
import { ReportArtifactModel } from './model'

export const getReportExpiryDate = (): Date => {
  return new Date(
    Date.now() + config.reportDownloadTtlDays * 24 * 60 * 60 * 1000,
  )
}

export const toJobResponse = (job: any) => {
  return {
    id: job._id.toString(),
    requestedByStaffId: job.requestedByStaffId.toString(),
    type: job.type,
    format: job.format,
    filters: job.filters,
    status: job.status,
    attempts: job.attempts,
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    failedAt: job.failedAt?.toISOString(),
    lastError: job.lastError,
    expiresAt: job.expiresAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }
}

export const escapeCsv = (value: unknown): string => {
  const raw = String(value ?? '')
  if (/[,\n\"]/g.test(raw)) {
    return `"${raw.replace(/\"/g, '""')}"`
  }
  return raw
}

export const toCsv = (data: unknown): { content: string; rowCount: number } => {
  if (Array.isArray(data)) {
    if (!data.length) {
      return { content: '', rowCount: 0 }
    }

    const rows = data as Array<Record<string, unknown>>
    const headers = Object.keys(rows[0] ?? {})
    const contentRows = rows.map((row) =>
      headers.map((key) => escapeCsv(row[key])).join(','),
    )

    return {
      content: [headers.join(','), ...contentRows].join('\n'),
      rowCount: rows.length,
    }
  }

  if (data && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).map(
      ([key, value]) => `${escapeCsv(key)},${escapeCsv(JSON.stringify(value))}`,
    )

    return {
      content: ['key,value', ...entries].join('\n'),
      rowCount: entries.length,
    }
  }

  return {
    content: `value\n${escapeCsv(data)}`,
    rowCount: 1,
  }
}

export const toPdf = async (
  jobType: string,
  data: unknown,
): Promise<{ content: string; rowCount: number }> => {
  const doc = new PDFDocument({ margin: 32 })
  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    doc.on('end', resolve)
    doc.on('error', reject)

    doc.fontSize(18).text(`LMS Report: ${jobType}`)
    doc.moveDown()
    doc.fontSize(10).text(`Generated at: ${new Date().toISOString()}`)
    doc.moveDown()
    doc.fontSize(10).text(JSON.stringify(data, null, 2))
    doc.end()
  })

  const rowCount = Array.isArray(data)
    ? data.length
    : data && typeof data === 'object'
      ? Object.keys(data as Record<string, unknown>).length
      : 1

  return {
    content: Buffer.concat(chunks).toString('base64'),
    rowCount,
  }
}

export const toExcel = async (
  data: unknown,
): Promise<{ content: string; rowCount: number }> => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Report')

  let rowCount = 0

  if (Array.isArray(data) && data.length > 0) {
    const rows = data as Array<Record<string, unknown>>
    const headers = Object.keys(rows[0] ?? {})
    sheet.addRow(headers)
    for (const row of rows) {
      sheet.addRow(headers.map((header) => row[header] ?? ''))
    }
    rowCount = rows.length
  } else if (data && typeof data === 'object') {
    sheet.addRow(['key', 'value'])
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      sheet.addRow([key, JSON.stringify(value)])
    }
    rowCount = Object.keys(data as Record<string, unknown>).length
  } else {
    sheet.addRow(['value'])
    sheet.addRow([String(data ?? '')])
    rowCount = 1
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return {
    content: Buffer.from(buffer).toString('base64'),
    rowCount,
  }
}

export const createArtifact = async (job: any, reportData: unknown) => {
  const expiresAt = getReportExpiryDate()
  const extensionByFormat: Record<string, string> = {
    json: 'json',
    csv: 'csv',
    pdf: 'pdf',
    excel: 'xlsx',
  }
  const mimeByFormat: Record<string, string> = {
    json: 'application/json',
    csv: 'text/csv',
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }

  const fileName = `${job.type}-${job._id.toString()}.${extensionByFormat[job.format] ?? 'json'}`

  let serialized: { content: string; rowCount: number }
  if (job.format === 'csv') {
    serialized = toCsv(reportData)
  } else if (job.format === 'pdf') {
    serialized = await toPdf(job.type, reportData)
  } else if (job.format === 'excel') {
    serialized = await toExcel(reportData)
  } else {
    serialized = {
      content: JSON.stringify(reportData, null, 2),
      rowCount: Array.isArray(reportData) ? reportData.length : 1,
    }
  }

  const artifact = await ReportArtifactModel.findOneAndUpdate(
    {
      reportJobId: job._id,
    },
    {
      $set: {
        fileName,
        mimeType: mimeByFormat[job.format] ?? 'application/json',
        content: serialized.content,
        rowCount: serialized.rowCount,
        expiresAt,
      },
    },
    {
      upsert: true,
      new: true,
    },
  )

  job.status = 'completed'
  job.completedAt = new Date()
  job.failedAt = undefined
  job.lastError = undefined
  job.expiresAt = expiresAt
  await job.save()

  return artifact
}

export const processSingleJob = async (job: any) => {
  try {
    job.status = 'processing'
    job.startedAt = new Date()
    job.attempts += 1
    await job.save()

    const reportData = await reportsAggregationService.buildReportData(
      job.type as ReportType,
      (job.filters ?? {}) as Record<string, unknown>,
    )

    const artifact = await createArtifact(job, reportData)

    await auditService.createLog({
      actorType: 'admin',
      actorId: job.requestedByStaffId.toString(),
      action: 'reports.generated',
      module: 'reports',
      description: `Report job ${job._id.toString()} generated successfully.`,
      targetId: job._id.toString(),
      targetType: 'report-job',
      meta: {
        reportType: job.type,
        format: job.format,
        rowCount: artifact.rowCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    job.lastError = message
    job.failedAt = new Date()

    if (job.attempts >= MAX_REPORT_RETRIES) {
      job.status = 'failed'
    } else {
      job.status = 'queued'
    }

    await job.save()
  }
}
