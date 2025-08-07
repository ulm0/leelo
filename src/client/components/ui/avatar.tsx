import { useState, useEffect } from 'react'
import { cn, getGravatarUrl, getInitials } from '@/lib/utils'

interface AvatarProps {
  username: string
  email?: string
  useGravatar?: boolean
  identiconUrl?: string
  size?: number
  className?: string
}

export function Avatar({ 
  username, 
  email, 
  useGravatar = false, 
  identiconUrl,
  size = 40, 
  className 
}: AvatarProps) {
  const [gravatarUrl, setGravatarUrl] = useState<string>('')
  const [imageError, setImageError] = useState(false)
  const [identiconError, setIdenticonError] = useState(false)

  useEffect(() => {
    if (useGravatar && email) {
      getGravatarUrl(email, size).then(setGravatarUrl)
    } else {
      setGravatarUrl('') // Clear gravatar if not used
      setImageError(false) // Reset error state
    }
  }, [email, useGravatar, size])

  const initials = getInitials(username)
  const shouldShowGravatar = useGravatar && email && gravatarUrl && !imageError
  const shouldShowIdenticon = !useGravatar && identiconUrl && !identiconError

  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium",
        className
      )}
      style={{ width: size, height: size }}
    >
      {shouldShowGravatar ? (
        <img
          src={gravatarUrl}
          alt={`Avatar for ${username}`}
          className="w-full h-full rounded-lg object-cover"
          style={{ imageRendering: 'auto' }}
          onError={() => setImageError(true)}
        />
      ) : shouldShowIdenticon ? (
        <img
          src={identiconUrl}
          alt={`Identicon for ${username}`}
          className="w-full h-full rounded-lg object-cover"
          style={{ imageRendering: 'auto' }}
          onError={() => setIdenticonError(true)}
        />
      ) : (
        <span 
          className="text-center leading-none"
          style={{ fontSize: size * 0.4 }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}