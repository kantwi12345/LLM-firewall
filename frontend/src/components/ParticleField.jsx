import { useMemo } from 'react'

export default function ParticleField({ count = 24 }) {
  const particles = useMemo(() => (
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 5,
    }))
  ), [count])

  return (
    <div className="particle-field">
      {particles.map(p => (
        <span
          key={p.id}
          className="particle"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
