import React from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Star, Archive, BookOpen, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { formatDate, formatReadingTime, extractDomain, isVideoUrl, getVideoThumbnailUrl } from '@/lib/utils'
import { VideoEmbed } from '@/components/video-embed'
import { useFontStore, getFontFamily, loadCustomFont } from '@/stores/font'

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { readingFont, customFontUrl } = useFontStore()

  // Load custom font if needed
  React.useEffect(() => {
    if (readingFont === 'custom' && customFontUrl) {
      loadCustomFont(customFontUrl)
    }
  }, [readingFont, customFontUrl])

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', id],
    queryFn: () => api.getArticle(id!),
    enabled: !!id,
  })

  const updateArticleMutation = useMutation({
    mutationFn: (updates: { isRead?: boolean; isArchived?: boolean; isFavorite?: boolean }) =>
      api.updateArticle(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', id] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  // Mark as read when opening the article
  const markAsReadMutation = useMutation({
    mutationFn: () => api.updateArticle(id!, { isRead: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article', id] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  // Mark as read when component mounts (if not already read)
  React.useEffect(() => {
    if (article && !article.isRead) {
      markAsReadMutation.mutate()
    }
  }, [article?.isRead])

  if (!id) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-6"></div>
            <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-6">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to articles
          </Link>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Article not found or failed to load.</p>
          </div>
        </div>
      </div>
    )
  }

  const handleToggleFavorite = () => {
    updateArticleMutation.mutate({ isFavorite: !article.isFavorite })
  }

  const handleToggleArchive = () => {
    updateArticleMutation.mutate({ isArchived: !article.isArchived })
  }

  const videoThumbnail = !article.image && isVideoUrl(article.url) ? getVideoThumbnailUrl(article.url) : undefined

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6">
        {/* Navigation */}
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to articles
        </Link>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex-1">
                {article.title}
              </h1>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFavorite}
                  className={article.isFavorite ? 'text-yellow-600' : ''}
                >
                  <Star className={`h-4 w-4 ${article.isFavorite ? 'fill-current' : ''}`} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleToggleArchive}>
                      <Archive className="mr-2 h-4 w-4" />
                      {article.isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
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
            </div>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
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
              
              {article.author && (
                <>
                  <span>•</span>
                  <span>by {article.author}</span>
                </>
              )}
              
              {article.publishedAt && (
                <>
                  <span>•</span>
                  <span>{formatDate(article.publishedAt)}</span>
                </>
              )}
              
              {article.readingTime && (
                <>
                  <span>•</span>
                  <span>{formatReadingTime(article.readingTime)}</span>
                </>
              )}
            </div>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {article.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Featured Image */}
            {(article.image || videoThumbnail) && (
              <div className="mb-8">
                <img
                  src={article.image || videoThumbnail}
                  alt={article.title}
                  className="w-full rounded-lg shadow-sm"
                  style={{ maxHeight: 400, objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Embedded Video */}
            {isVideoUrl(article.url) && (
              <div className="mb-8">
                <VideoEmbed 
                  url={article.url} 
                  title={article.title}
                />
              </div>
            )}
          </header>

          {/* Article Content */}
          <div 
            className="article-content prose prose-lg max-w-none"
            style={{ fontFamily: getFontFamily(readingFont, customFontUrl) }}
            dangerouslySetInnerHTML={{ __html: article.content || '' }}
          />

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Article saved on {formatDate(article.createdAt)}</span>
              </div>
              
              <Button asChild variant="outline">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Original
                </a>
              </Button>
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}