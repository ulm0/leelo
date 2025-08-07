import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

export function ImportCsvDialog({ open, onOpenChange, onImportComplete }: ImportCsvDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors?: string[]
  } | null>(null)

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      alert('Please select a valid CSV file')
      return
    }

    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
    }
    reader.readAsText(selectedFile)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleImport = async () => {
    if (!csvContent) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const result = await api.importCsv(csvContent)
      setImportResult(result)
      onImportComplete?.()
    } catch (error: any) {
      console.error('Import failed:', error)
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [error.message || 'Import failed']
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setCsvContent('')
    setImportResult(null)
    onOpenChange(false)
  }

  const validateCsvFormat = (content: string) => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return false
    
    const headers = lines[0].split(',').map(h => h.trim())
    const expectedHeaders = ['title', 'url', 'time_added', 'tags', 'status']
    
    return expectedHeaders.every(h => headers.includes(h))
  }

  const isValidFormat = csvContent && validateCsvFormat(csvContent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Articles from CSV</DialogTitle>
          <DialogDescription>
            Import articles from a Pocket CSV export. The file should have columns: title, url, time_added, tags, status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Drop your CSV file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports Pocket export format
                </p>
              </div>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) {
                    handleFileSelect(selectedFile)
                  }
                }}
                className="mt-4"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setCsvContent('')
                  }}
                >
                  Remove
                </Button>
              </div>

              {csvContent && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="max-h-32 overflow-y-auto p-3 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                    {csvContent.split('\n').slice(0, 5).join('\n')}
                    {csvContent.split('\n').length > 5 && '\n...'}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isValidFormat ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">
                      {isValidFormat 
                        ? 'Valid Pocket CSV format' 
                        : 'Invalid format - expected Pocket CSV headers'
                      }
                    </span>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium">Import Results</h4>
                  <div className="text-sm space-y-1">
                    <p>✅ Imported: {importResult.imported} articles</p>
                    <p>⏭️ Skipped: {importResult.skipped} articles (already exist)</p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div>
                        <p className="text-red-600">❌ Errors:</p>
                        <ul className="text-xs text-red-600 ml-4 list-disc">
                          {importResult.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {importResult.errors.length > 5 && (
                            <li>... and {importResult.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!isValidFormat || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Articles'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
