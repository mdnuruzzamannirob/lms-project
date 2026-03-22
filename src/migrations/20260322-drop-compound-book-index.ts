import { BookModel } from '../modules/books/model'

/**
 * Migration: Drop compound multikey index on Book.authorIds and Book.categoryIds
 *
 * MongoDB does not allow compound indexes on multiple array fields (multikey fields).
 * This migration removes any existing compound index that was previously created.
 * New separate single-field indexes on authorIds and categoryIds will be created
 * automatically by Mongoose when the model is loaded.
 */
export const migration20260322DropCompoundBookIndex =
  async (): Promise<void> => {
    try {
      const indexes = await BookModel.collection.indexes()

      // Find compound index with both authorIds and categoryIds
      const compoundIndex = indexes.find((ix: any) => {
        if (!ix.key) return false
        const keys = Object.keys(ix.key)
        return (
          keys.length === 2 &&
          keys.includes('authorIds') &&
          keys.includes('categoryIds')
        )
      })

      if (compoundIndex) {
        const name = compoundIndex.name
        if (name) {
          console.log(`[Books Migration] Dropping compound index: "${name}"`)
          await BookModel.collection.dropIndex(name)
          console.log('[Books Migration] Compound index dropped successfully')
        }
      } else {
        console.log(
          '[Books Migration] No compound index found; nothing to drop',
        )
      }
    } catch (err) {
      console.error(
        '[Books Migration] Error while processing compound index:',
        err,
      )
      throw err
    }
  }
