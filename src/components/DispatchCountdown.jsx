import { useEffect, useState } from 'react'

export function DispatchCountdown({ targetDate }) {
  const destination = targetDate
    ? new Date(targetDate).getTime()
    : Date.now() + (4 * 24 * 60 * 60 + 18 * 60 * 60 + 21 * 60 + 51) * 1000

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(destination))

  function calculateTimeLeft(target) {
    const difference = target - Date.now()

    if (difference <= 0) {
      return { days: '00', hours: '00', mins: '00', secs: '00' }
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
    const mins = Math.floor((difference / 1000 / 60) % 60)
    const secs = Math.floor((difference / 1000) % 60)

    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(destination))
    }, 1000)

    return () => clearInterval(timer)
  }, [destination])

  return (
    <div className="dispatch-countdown">
      <div className="dispatch-countdown-grid">
        {[
          [timeLeft.days, 'DAYS', true],
          [timeLeft.hours, 'HOURS', false],
          [timeLeft.mins, 'MINS', false],
          [timeLeft.secs, 'SECS', true],
        ].map(([value, unit, accent]) => (
          <div className="dispatch-countdown-cell" key={unit}>
            <b className={accent ? 'accent' : ''}>{value}</b>
            <span>{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}