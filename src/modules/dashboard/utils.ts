export const formatBook = (book: any): object => {
  if (!book) {
    return {}
  }

  return {
    id: book._id?.toString() || book._id,
    title: book.title,
    description: book.description || null,
    authorIds: book.authorIds?.map((id: any) => id.toString()) || [],
    categoryIds: book.categoryIds?.map((id: any) => id.toString()) || [],
    reason: book.reason || null,
    coverImage: book.coverImage ?? null,
    ratingAverage: book.ratingAverage || 0,
    ratingCount: book.ratingCount || 0,
  }
}
