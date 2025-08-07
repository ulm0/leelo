import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, X, Check, Type } from 'lucide-react'
import { api } from '@/lib/api'

export interface FontOption {
  id: string
  name: string
  family: string
  category: 'system' | 'web' | 'dyslexia-friendly' | 'custom'
  description?: string
}

const predefinedFonts: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    family: 'Inter, system-ui, sans-serif',
    category: 'system',
    description: 'Modern, clean sans-serif font optimized for screens'
  },
  {
    id: 'open-sans',
    name: 'Open Sans',
    family: 'Open Sans, system-ui, sans-serif',
    category: 'system',
    description: 'Humanist sans-serif font designed for legibility'
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: 'Roboto, system-ui, sans-serif',
    category: 'system',
    description: 'Clean and modern sans-serif font'
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    family: 'Merriweather, Georgia, serif',
    category: 'web',
    description: 'Serif font designed for on-screen reading'
  },
  {
    id: 'source-sans-pro',
    name: 'Source Sans Pro',
    family: 'Source Sans Pro, system-ui, sans-serif',
    category: 'system',
    description: 'Sans-serif font designed for user interfaces'
  },
  {
    id: 'opendyslexic',
    name: 'OpenDyslexic',
    family: 'OpenDyslexic, system-ui, sans-serif',
    category: 'dyslexia-friendly',
    description: 'Font designed to help readers with dyslexia'
  },
  {
    id: 'lexend',
    name: 'Lexend',
    family: 'Lexend, system-ui, sans-serif',
    category: 'dyslexia-friendly',
    description: 'Font designed to reduce visual stress and improve reading performance'
  },
  {
    id: 'atkinson-hyperlegible',
    name: 'Atkinson Hyperlegible',
    family: 'Atkinson Hyperlegible, system-ui, sans-serif',
    category: 'dyslexia-friendly',
    description: 'Font designed for maximum legibility and readability'
  }
]

interface FontSelectorProps {
  currentFont: string
  customFontUrl?: string
  onFontChange: (fontId: string, customUrl?: string) => void
  className?: string
}

export function FontSelector({ currentFont, customFontUrl, onFontChange, className = '' }: FontSelectorProps) {
  const [selectedFont, setSelectedFont] = useState(currentFont)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFontSelect = (fontId: string) => {
    setSelectedFont(fontId)
    onFontChange(fontId)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const result = await api.uploadCustomFont(file)
      const customFontId = 'custom'
      setSelectedFont(customFontId)
      onFontChange(customFontId, result.fontUrl)
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload font')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeCustomFont = () => {
    setSelectedFont('inter')
    onFontChange('inter')
  }

  const getFontPreviewStyle = (font: FontOption) => {
    if (font.id === 'custom' && customFontUrl) {
      return {
        fontFamily: `custom-font, system-ui, sans-serif`,
        background: `url(${customFontUrl})`,
      }
    }
    return { fontFamily: font.family }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dyslexia-friendly':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'system':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'web':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <Label className="text-sm font-medium flex items-center gap-2 mb-4">
          <Type className="h-4 w-4" />
          Reading Font
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a font for reading articles. Dyslexia-friendly fonts are designed to improve readability for users with dyslexia.
        </p>
      </div>

      {/* Font Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predefinedFonts.map((font) => (
          <Card 
            key={font.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFont === font.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleFontSelect(font.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{font.name}</h4>
                  <Badge variant="outline" className={`text-xs ${getCategoryColor(font.category)}`}>
                    {font.category.replace('-', ' ')}
                  </Badge>
                </div>
                {selectedFont === font.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <div 
                className="text-lg mb-2"
                style={getFontPreviewStyle(font)}
              >
                The quick brown fox jumps over the lazy dog
              </div>
              {font.description && (
                <p className="text-xs text-muted-foreground">{font.description}</p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Custom Font Option */}
        {customFontUrl && (
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFont === 'custom' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleFontSelect('custom')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Custom Font</h4>
                  <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                    custom
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {selectedFont === 'custom' && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCustomFont()
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div 
                className="text-lg mb-2"
                style={getFontPreviewStyle({ id: 'custom', family: 'custom-font', name: 'Custom', category: 'custom' })}
              >
                The quick brown fox jumps over the lazy dog
              </div>
              <p className="text-xs text-muted-foreground">Your uploaded custom font</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Custom Font */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Custom Font
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="font-upload" className="text-sm font-medium">
              Font File (WOFF, WOFF2, TTF, OTF)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Maximum file size: 5MB. Supported formats: WOFF, WOFF2, TTF, OTF
            </p>
            <Input
              id="font-upload"
              type="file"
              accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf"
              onChange={handleFileUpload}
              disabled={uploading}
              ref={fileInputRef}
            />
          </div>
          
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Uploading font...
            </div>
          )}
          
          {uploadError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{uploadError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Font Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="prose prose-sm max-w-none"
            style={getFontPreviewStyle(
              predefinedFonts.find(f => f.id === selectedFont) || 
              { id: 'custom', family: 'custom-font', name: 'Custom', category: 'custom' }
            )}
          >
            <h3>Sample Article</h3>
            <p>
              This is how your articles will look with the selected font. The quick brown fox jumps over the lazy dog. 
              This sentence contains all the letters of the alphabet and is commonly used to test fonts.
            </p>
            <p>
              Reading with a comfortable font can significantly improve your reading experience, especially for longer articles. 
              Dyslexia-friendly fonts are designed with specific characteristics that help reduce visual stress and improve 
              letter recognition for readers with dyslexia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 