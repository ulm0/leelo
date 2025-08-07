import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, BookOpen } from 'lucide-react'
import { api } from '@/lib/api'

interface ArticlesMenuProps {
  search?: string
  tag?: string
  isRead?: boolean
  isArchived?: boolean
  isFavorite?: boolean
  onArticleSelect?: (articleId: string) => void
  selectedArticleId?: string
}

export function ArticlesMenu({ 
  search, 
  tag, 
  isRead, 
  isArchived, 
  isFavorite, 
  onArticleSelect,
  selectedArticleId 
}: ArticlesMenuProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['articles', { search, tag, isRead, isArchived, isFavorite }],
    queryFn: () => api.getArticles({ search, tag, isRead, isArchived, isFavorite, limit: 50 }),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted animate-pulse rounded-lg h-20" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load articles. Please try again.</p>
      </div>
    )
  }

  if (!data?.articles.length) {
    return (
      <div className="text-center py-8">
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
    <div className="space-y-3">
      {articles.map((article) => (
        <div
          key={article.id}
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedArticleId === article.id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
          onClick={() => onArticleSelect?.(article.id)}
        >
          {/* Article Title */}
          <h3 className="font-medium text-foreground mb-2 line-clamp-2 text-sm">
            {article.title}
          </h3>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {article.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Article Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {article.isRead && (
                <BookOpen className="h-3 w-3" />
              )}
              <span className="truncate max-w-32">{article.url}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                window.open(article.url, '_blank')
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
} 