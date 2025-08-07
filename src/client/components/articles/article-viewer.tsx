import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ExternalLink, 
  BookOpen, 
  BookOpenCheck, 
  Star, 
  Archive, 
  MoreVertical,
  RefreshCw
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface ArticleViewerProps {
  articleId?: string
}

export function ArticleViewer({ articleId }: ArticleViewerProps) {
  const queryClient = useQueryClient()

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => api.getArticle(articleId!),
    enabled: !!articleId,
  })

  const toggleReadMutation = useMutation({
    mutationFn: (articleId: string) => api.updateArticle(articleId, { isRead: !article?.isRead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      if (articleId) {
        queryClient.invalidateQueries({ queryKey: ['article', articleId] })
      }
    },
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: (articleId: string) => api.updateArticle(articleId, { isFavorite: !article?.isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      if (articleId) {
        queryClient.invalidateQueries({ queryKey: ['article', articleId] })
      }
    },
  })

  const toggleArchiveMutation = useMutation({
    mutationFn: (articleId: string) => api.updateArticle(articleId, { isArchived: !article?.isArchived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      if (articleId) {
        queryClient.invalidateQueries({ queryKey: ['article', articleId] })
      }
    },
  })

  const retryExtractionMutation = useMutation({
    mutationFn: (articleId: string) => api.retryExtraction(articleId),
    onSuccess: () => {
      if (articleId) {
        queryClient.invalidateQueries({ queryKey: ['article', articleId] })
      }
    },
  })

  if (!articleId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Select an article to read</p>
          <p className="text-sm">Choose an article from the menu to view its content</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted animate-pulse rounded-lg h-8 w-3/4" />
        <div className="bg-muted animate-pulse rounded-lg h-4 w-1/2" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-muted animate-pulse rounded-lg h-4" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load article. Please try again.</p>
      </div>
    )
  }

  const handleToggleRead = () => {
    toggleReadMutation.mutate(article.id)
  }

  const handleToggleFavorite = () => {
    toggleFavoriteMutation.mutate(article.id)
  }

  const handleToggleArchive = () => {
    toggleArchiveMutation.mutate(article.id)
  }

  const handleRetryExtraction = () => {
    retryExtractionMutation.mutate(article.id)
  }

  return (
    <div className="space-y-6">
      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-foreground pr-4">
            {article.title}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleRead}>
                {article.isRead ? (
                  <>
                    <BookOpenCheck className="mr-2 h-4 w-4" />
                    Mark as Unread
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Mark as Read
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleFavorite}>
                <Star className="mr-2 h-4 w-4" />
                {article.isFavorite ? 'Remove from' : 'Add to'} Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleArchive}>
                <Archive className="mr-2 h-4 w-4" />
                {article.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              {(article.extractionStatus === 'failed' || article.extractionStatus === 'pending') && (
                <DropdownMenuItem 
                  onClick={handleRetryExtraction}
                  disabled={retryExtractionMutation.isPending}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${retryExtractionMutation.isPending ? 'animate-spin' : ''}`} />
                  Retry Extraction
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Article Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{article.url}</span>
          {article.isRead && (
            <div className="flex items-center gap-1">
              <BookOpenCheck className="h-4 w-4" />
              <span>Read</span>
            </div>
          )}
          {article.isFavorite && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>Favorite</span>
            </div>
          )}
          {article.isArchived && (
            <div className="flex items-center gap-1">
              <Archive className="h-4 w-4" />
              <span>Archived</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Article Content */}
      {article.content ? (
        <div className="article-content">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {article.extractionStatus === 'pending' 
              ? 'Content is being extracted...' 
              : article.extractionStatus === 'failed'
              ? 'Failed to extract content. Please try again.'
              : 'No content available.'
            }
          </p>
          {(article.extractionStatus === 'failed' || article.extractionStatus === 'pending') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryExtraction}
              disabled={retryExtractionMutation.isPending}
              className="mt-4"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${retryExtractionMutation.isPending ? 'animate-spin' : ''}`} />
              Retry Extraction
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 