import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { ArticlesList } from '@/components/articles/articles-list'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, X } from 'lucide-react'
import { api } from '@/lib/api'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | undefined>()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'favorites' | 'archived'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags(),
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedTag(undefined)
    setFilter('all')
  }

  const handleTagSelect = (tagName: string) => {
    setSelectedTag(tagName)
    setSearchQuery('')
    setFilter('all')
    setSidebarOpen(false) // Close sidebar on mobile after selection
  }

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter)
    setSelectedTag(undefined)
    setSearchQuery('')
    setSidebarOpen(false) // Close sidebar on mobile after selection
  }

  const getFilterProps = () => {
    const baseProps = {
      search: searchQuery || undefined,
      tag: selectedTag,
    }

    switch (filter) {
      case 'unread':
        return { ...baseProps, isRead: false, isArchived: false }
      case 'read':
        return { ...baseProps, isRead: true, isArchived: false }
      case 'favorites':
        return { ...baseProps, isFavorite: true, isArchived: false }
      case 'archived':
        return { ...baseProps, isArchived: true }
      default:
        return { ...baseProps, isArchived: false }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      
      <div className="container mx-auto max-w-8xl h-[calc(100vh-4rem)]">
        <div className="flex h-full relative">
          {/* Mobile Sidebar Toggle */}
          <div className={`lg:hidden absolute top-4 left-4 z-50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Left Sidebar */}
          <div className={`
            fixed lg:static inset-y-0 left-0 z-40
            w-80 border-r border-border bg-card overflow-y-auto
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            {/* Mobile Close Button */}
            <div className="lg:hidden absolute top-4 right-4 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6 pt-16 lg:pt-6">
              {/* Statistics Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Statistics</h3>
                {stats && (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unread:</span>
                      <span className="font-medium">{stats.unread}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Favorites:</span>
                      <span className="font-medium">{stats.favorites}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Filters Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Filters</h3>
                <div className="space-y-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('all')}
                  >
                    All Articles
                  </Button>
                  <Button
                    variant={filter === 'unread' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('unread')}
                  >
                    Unread ({stats?.unread || 0})
                  </Button>
                  <Button
                    variant={filter === 'read' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('read')}
                  >
                    Read ({stats?.read || 0})
                  </Button>
                  <Button
                    variant={filter === 'favorites' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('favorites')}
                  >
                    Favorites ({stats?.favorites || 0})
                  </Button>
                  <Button
                    variant={filter === 'archived' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('archived')}
                  >
                    Archived ({stats?.archived || 0})
                  </Button>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                {tagsData?.tags && tagsData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tagsData.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTag === tag.name ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                        onClick={() => 
                          selectedTag === tag.name 
                            ? setSelectedTag(undefined)
                            : handleTagSelect(tag.name)
                        }
                      >
                        {tag.name} ({tag._count.articles})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Filters Display */}
              {(searchQuery || selectedTag || filter !== 'all') && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Filters</h3>
                  <div className="space-y-2">
                    {searchQuery && (
                      <Badge variant="secondary" className="w-full justify-between text-xs">
                        <span className="truncate">Search: "{searchQuery}"</span>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    {selectedTag && (
                      <Badge variant="secondary" className="w-full justify-between text-xs">
                        <span className="truncate">Tag: {selectedTag}</span>
                        <button
                          onClick={() => setSelectedTag(undefined)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    {filter !== 'all' && (
                      <Badge variant="secondary" className="w-full justify-between text-xs">
                        <span className="truncate">Filter: {filter}</span>
                        <button
                          onClick={() => setFilter('all')}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedTag(undefined)
                        setFilter('all')
                      }}
                      className="w-full h-8 text-xs"
                    >
                      Clear all filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content Area */}
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {/* Mobile Stats Bar */}
            <div className="lg:hidden mb-6 pt-12">
              {stats && (
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                  <span className="whitespace-nowrap">Total: {stats.total}</span>
                  <span className="whitespace-nowrap">Unread: {stats.unread}</span>
                  <span className="whitespace-nowrap">Favorites: {stats.favorites}</span>
                </div>
              )}
              {/* Mobile Active Filters */}
              {(searchQuery || selectedTag || filter !== 'all') && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {searchQuery && (
                    <Badge variant="secondary" className="text-xs">
                      Search: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery('')}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedTag && (
                    <Badge variant="secondary" className="text-xs">
                      Tag: {selectedTag}
                      <button
                        onClick={() => setSelectedTag(undefined)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Filter: {filter}
                      <button
                        onClick={() => setFilter('all')}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <ArticlesList {...getFilterProps()} />
          </div>
        </div>
      </div>
    </div>
  )
}