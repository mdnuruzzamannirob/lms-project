import { model, Schema, type Model } from 'mongoose'

import type {
  IReportArtifact,
  IReportJob,
  ReportFormat,
  ReportStatus,
  ReportType,
} from './interface'

const reportJobSchema = new Schema<IReportJob>(
  {
    requestedByStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'admin_overview',
        'revenue_summary',
        'popular_books',
        'borrow_stats',
      ] satisfies ReportType[],
      required: true,
      index: true,
    },
    format: {
      type: String,
      enum: ['json', 'csv'] satisfies ReportFormat[],
      required: true,
      default: 'csv',
    },
    filters: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      enum: [
        'queued',
        'processing',
        'completed',
        'failed',
        'expired',
      ] satisfies ReportStatus[],
      required: true,
      default: 'queued',
      index: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      required: false,
      default: undefined,
    },
    completedAt: {
      type: Date,
      required: false,
      default: undefined,
    },
    failedAt: {
      type: Date,
      required: false,
      default: undefined,
    },
    lastError: {
      type: String,
      required: false,
      default: undefined,
    },
    expiresAt: {
      type: Date,
      required: false,
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

reportJobSchema.index({ status: 1, createdAt: 1 })
reportJobSchema.index({ requestedByStaffId: 1, createdAt: -1 })

const reportArtifactSchema = new Schema<IReportArtifact>(
  {
    reportJobId: {
      type: Schema.Types.ObjectId,
      ref: 'ReportJob',
      required: true,
      unique: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    rowCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

reportArtifactSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const ReportJobModel: Model<IReportJob> = model<IReportJob>(
  'ReportJob',
  reportJobSchema,
)

export const ReportArtifactModel: Model<IReportArtifact> =
  model<IReportArtifact>('ReportArtifact', reportArtifactSchema)
