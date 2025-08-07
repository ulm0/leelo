import { useQuery } from '@tanstack/react-query'
import { ArticleCard } from './article-card'
import { api } from '@/lib/api'

interface ArticlesListProps {
  search?: string
  tag?: string
  isRead?: boolean
  isArchived?: boolean
  isFavorite?: boolean
}

export function ArticlesList({ search, tag, isRead, isArchived, isFavorite }: ArticlesListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['articles', { search, tag, isRead, isArchived, isFavorite }],
    queryFn: () => api.getArticles({ search, tag, isRead, isArchived, isFavorite, limit: 50 }),
  })

  if (isLoading) {
    return (
      <div className="bento-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`bg-muted animate-pulse rounded-lg h-64 ${i === 0 ? 'bento-featured' : ''}`}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load articles. Please try again.</p>
      </div>
    )
  }

  if (!data?.articles.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No articles found.</p>
        {!search && !tag && (
          <p className="text-sm text-muted-foreground mt-2">
            Add your first article using the "Add Article" button above.
          </p>
        )}
      </div>
    )
  }

  const articles = data.articles

  return (
    <div className="bento-grid">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          featured={index === 0 && !search && !tag}
        />
      ))}
    </div>
  )
}