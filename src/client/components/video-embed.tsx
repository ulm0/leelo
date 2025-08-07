import React from 'react'
import { extractVideoInfo, type VideoInfo } from '@/lib/utils'

interface VideoEmbedProps {
  url: string
  title?: string
  className?: string
}

export function VideoEmbed({ url, title, className = '' }: VideoEmbedProps) {
  const videoInfo = extractVideoInfo(url)

  if (!videoInfo.platform || !videoInfo.embedUrl) {
    return null
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return '🎥 YouTube'
      case 'vimeo':
        return '🎬 Vimeo'
      case 'dailymotion':
        return '📺 Dailymotion'
      case 'twitch':
        return '🎮 Twitch'
      default:
        return '🎥 Video'
    }
  }

  const getAspectRatio = (platform: string) => {
    switch (platform) {
      case 'youtube':
      case 'vimeo':
      case 'dailymotion':
        return 'aspect-video' // 16:9
      case 'twitch':
        return 'aspect-video' // 16:9
      default:
        return 'aspect-video'
    }
  }

  return (
    <div className={`video-embed ${className}`}>
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{getPlatformIcon(videoInfo.platform)}</span>
          <span>•</span>
          <span>Embedded Video</span>
        </div>
        {title && (
          <h3 className="text-lg font-semibold mt-2">{title}</h3>
        )}
      </div>
      
      <div className={`relative w-full ${getAspectRatio(videoInfo.platform)} bg-black rounded-lg overflow-hidden shadow-lg`}>
        <iframe
          src={videoInfo.embedUrl}
          title={title || `Embedded ${videoInfo.platform} video`}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      
      <div className="mt-4 text-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Watch on {videoInfo.platform.charAt(0).toUpperCase() + videoInfo.platform.slice(1)} →
        </a>
      </div>
    </div>
  )
} 