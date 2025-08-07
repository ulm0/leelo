import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Download, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface ExportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFilters?: {
    search?: string
    tag?: string
    isRead?: boolean
    isArchived?: boolean
    isFavorite?: boolean
  }
}

export function ExportCsvDialog({ open, onOpenChange, currentFilters = {} }: ExportCsvDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState({
    search: currentFilters.search || '',
    tag: currentFilters.tag || '',
    isRead: currentFilters.isRead,
    isArchived: currentFilters.isArchived,
    isFavorite: currentFilters.isFavorite,
  })

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      // Clean up filters - only include defined values
      const exportFilters: any = {}
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          exportFilters[key] = value
        }
      })

      const blob = await api.exportCsv(exportFilters)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'leelo-export.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      onOpenChange(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export CSV. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = () => {
    setFilters({
      search: currentFilters.search || '',
      tag: currentFilters.tag || '',
      isRead: currentFilters.isRead,
      isArchived: currentFilters.isArchived,
      isFavorite: currentFilters.isFavorite,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Articles to CSV</DialogTitle>
          <DialogDescription>
            Export your articles in Pocket CSV format. You can apply filters to export only specific articles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search in titles, authors, or excerpts..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="tag">Tag</Label>
              <Input
                id="tag"
                placeholder="Filter by specific tag..."
                value={filters.tag}
                onChange={(e) => setFilters(prev => ({ ...prev, tag: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Filters</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isRead" className="text-sm font-normal">
                    Only read articles
                  </Label>
                  <Switch
                    id="isRead"
                    checked={filters.isRead === true}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, isRead: checked ? true : undefined }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isArchived" className="text-sm font-normal">
                    Only archived articles
                  </Label>
                  <Switch
                    id="isArchived"
                    checked={filters.isArchived === true}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, isArchived: checked ? true : undefined }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isFavorite" className="text-sm font-normal">
                    Only favorite articles
                  </Label>
                  <Switch
                    id="isFavorite"
                    checked={filters.isFavorite === true}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, isFavorite: checked ? true : undefined }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Export Format</h4>
            <p className="text-xs text-muted-foreground">
              Articles will be exported in Pocket CSV format with columns: title, url, time_added, tags, status.
              The file will be compatible with Pocket and other reading apps.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
