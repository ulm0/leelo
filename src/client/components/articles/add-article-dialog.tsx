import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { isValidUrl } from '@/lib/utils'

interface AddArticleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddArticleDialog({ open, onOpenChange }: AddArticleDialogProps) {
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState('')
  const queryClient = useQueryClient()

  const addArticleMutation = useMutation({
    mutationFn: ({ url, tags }: { url: string; tags: string[] }) =>
      api.addArticle(url, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setUrl('')
      setTags('')
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) return
    
    if (!isValidUrl(url)) {
      // Handle invalid URL error
      return
    }

    const tagList = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    addArticleMutation.mutate({ url: url.trim(), tags: tagList })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Article</DialogTitle>
          <DialogDescription>
            Add a new article to read later. Enter the URL and optionally add tags.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags (optional)
              </label>
              <Input
                id="tags"
                placeholder="tag1, tag2, tag3"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple tags with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!url.trim() || addArticleMutation.isPending}
            >
              {addArticleMutation.isPending ? 'Adding...' : 'Add Article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}