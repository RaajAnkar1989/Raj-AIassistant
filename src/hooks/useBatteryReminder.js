import { useEffect, useRef } from 'react'
import {
  evaluateBatteryReminder,
  getBatterySnapshot,
  startBatteryMonitoring,
  subscribeBattery,
} from '../utils/batteryService'

export function useBatteryReminder({ speak, enabled = false } = {}) {
  const lastSpokenAtRef = useRef(0)

  useEffect(() => {
    if (!enabled || typeof speak !== 'function') return undefined

    startBatteryMonitoring()

    const maybeRemind = (snap) => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (snap.level == null) return

      const now = Date.now()
      if (now - lastSpokenAtRef.current < 90_000) return

      const message = evaluateBatteryReminder(snap)
      if (!message) return

      lastSpokenAtRef.current = now
      void speak(message)
    }

    maybeRemind(getBatterySnapshot())
    return subscribeBattery(maybeRemind)
  }, [speak, enabled])
}
