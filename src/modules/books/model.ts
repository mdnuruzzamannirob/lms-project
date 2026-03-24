import { model, Schema, type Model } from 'mongoose'

import type { IBook, IBookFile } from './interface'

const bookFileSchema = new Schema<IBookFile>(
  {
    provider: { type: String, enum: ['cloudinary'], required: true },
    publicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    format: {
      type: String,
      enum: ['pdf', 'epub', 'mobi', 'txt', 'azw3'],
      required: true,
    },
    size: { type: Number, required: true, min: 1 },
    originalFileName: { type: String, required: true, trim: true },
    resourceType: {
      type: String,
      enum: ['raw'],
      required: true,
      default: 'raw',
    },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  {
    _id: true,
    id: false,
  },
)

const bookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    isbn: {
      type: String,
      required: false,
      trim: true,
      unique: true,
      sparse: true,
      default: null,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: 'en',
      index: true,
    },
    pageCount: {
      type: Number,
      required: false,
      min: 1,
      default: null,
    },
    publicationDate: {
      type: Date,
      required: false,
      default: null,
    },
    coverImage: {
      type: new Schema(
        {
          provider: {
            type: String,
            enum: ['cloudinary'],
            required: true,
            default: 'cloudinary',
          },
          publicId: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
          width: { type: Number, required: true },
          height: { type: Number, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    edition: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'unavailable', 'coming_soon'],
      default: 'available',
      index: true,
    },
    authorIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Author',
        required: true,
      },
    ],
    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
      },
    ],
    publisherId: {
      type: Schema.Types.ObjectId,
      ref: 'Publisher',
      required: false,
      default: null,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    files: {
      type: [bookFileSchema],
      default: [],
    },
    accessLevel: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      required: true,
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    ratingAverage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

bookSchema.index({
  title: 'text',
  summary: 'text',
  description: 'text',
  isbn: 'text',
  tags: 'text',
})
bookSchema.index({
  status: 1,
  availabilityStatus: 1,
  featured: 1,
  createdAt: -1,
})
bookSchema.index({ authorIds: 1 })
bookSchema.index({ categoryIds: 1 })

export const BookModel: Model<IBook> = model<IBook>('Book', bookSchema)
