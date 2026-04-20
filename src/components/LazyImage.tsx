import { useState } from 'react'

interface Props {
  src: string
  alt: string
  wrapperClassName?: string
  wrapperStyle?: React.CSSProperties
  imgStyle?: React.CSSProperties
}

export default function LazyImage({ src, alt, wrapperClassName, wrapperStyle, imgStyle }: Props) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={wrapperClassName}
      style={{ position: 'relative', ...wrapperStyle }}
    >
      {!loaded && (
        <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease', ...imgStyle }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
