export const formatBook = (book: any): object => {
  if (!book) {
    return {}
  }

  return {
    id: book._id.toString(),
    title: book.title,
    description: book.description || null,
    authorIds: book.authorIds?.map((id: any) => id.toString()) || [],
    categoryIds: book.categoryIds?.map((id: any) => id.toString()) || [],
    isbn: book.isbn || null,
    publishedYear: book.publishedYear || null,
    ratingAverage: book.ratingAverage || 0,
    ratingCount: book.ratingCount || 0,
    pageCount: book.pageCount || 0,
    language: book.language || null,
    coverImage: book.coverImage ?? null,
  }
}
