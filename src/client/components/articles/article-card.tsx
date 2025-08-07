import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, ExternalLink, Star, Archive, BookOpen, Trash2, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Article, api } from '@/lib/api'
import { formatRelativeDate, formatReadingTime, extractDomain } from '@/lib/utils'

interface ArticleCardProps {
  article: Article
  featured?: boolean
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const [imageError, setImageError] = useState(false)
  const queryClient = useQueryClient()

  const updateArticleMutation = useMutation({
    mutationFn: (updates: { isRead?: boolean; isArchived?: boolean; isFavorite?: boolean }) =>
      api.updateArticle(article.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const deleteArticleMutation = useMutation({
    mutationFn: () => api.deleteArticle(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const retryExtractionMutation = useMutation({
    mutationFn: () => api.retryExtraction(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })

  const handleToggleRead = () => {
    updateArticleMutation.mutate({ isRead: !article.isRead })
  }

  const handleToggleFavorite = () => {
    updateArticleMutation.mutate({ isFavorite: !article.isFavorite })
  }

  const handleToggleArchive = () => {
    updateArticleMutation.mutate({ isArchived: !article.isArchived })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this article?')) {
      deleteArticleMutation.mutate()
    }
  }

  const handleRetryExtraction = () => {
    retryExtractionMutation.mutate()
  }

  const cardClass = featured ? 'bento-featured' : ''

  return (
    <Card className={`group hover:shadow-md transition-shadow duration-200 ${cardClass}`}>
      <CardContent className="p-0">
        <div className="flex flex-col h-full">
          {/* Image */}
          {article.image && !imageError && (
            <div className={`relative overflow-hidden rounded-t-lg ${featured ? 'h-48' : 'h-32'}`}>
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              {article.isFavorite && (
                <div className="absolute top-2 left-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/articles/${article.id}`}
                  className="group-hover:text-primary transition-colors"
                >
                  <h3 className={`font-semibold line-clamp-2 ${featured ? 'text-lg' : 'text-base'}`}>
                    {article.title}
                  </h3>
                </Link>
                
                {/* Extraction Status Indicator */}
                {article.extractionStatus !== 'completed' && (
                  <div className="flex items-center gap-1 mt-1">
                    {article.extractionStatus === 'extracting' && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        <span className="text-xs text-blue-500">Extracting...</span>
                      </>
                    )}
                    {article.extractionStatus === 'pending' && (
                      <>
                        <Loader2 className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">Pending extraction</span>
                      </>
                    )}
                    {article.extractionStatus === 'failed' && (
                      <>
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-500">Extraction failed</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleRead}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Mark as {article.isRead ? 'Unread' : 'Read'}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {article.excerpt && (
              <p className={`text-muted-foreground mb-3 line-clamp-2 ${featured ? 'text-base' : 'text-sm'}`}>
                {article.excerpt}
              </p>
            )}

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {article.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {article.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{article.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
              <div className="flex items-center gap-2">
                {article.favicon && (
                  <img
                    src={article.favicon}
                    alt=""
                    className="w-4 h-4 rounded"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                )}
                <span>{extractDomain(article.url)}</span>
              </div>

              <div className="flex items-center gap-2">
                {article.readingTime && (
                  <span>{formatReadingTime(article.readingTime)}</span>
                )}
                <span>{formatRelativeDate(article.createdAt)}</span>
              </div>
            </div>

            {/* Read indicator */}
            {article.isRead && (
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <BookOpen className="h-3 w-3" />
                <span>Read</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}