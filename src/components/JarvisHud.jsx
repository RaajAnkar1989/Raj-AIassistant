import React from 'react'
import { Box, Typography } from '@mui/material'
import { useJarvisHud } from '../hooks/useJarvisHud'

function HudBar({ percent, tone = 'cyan' }) {
  const safe = Math.min(100, Math.max(0, percent || 0))
  return (
    <Box className="jarvis-hud-bar">
      <span
        className={`jarvis-hud-bar-fill jarvis-hud-bar-fill--${tone}`}
        style={{ width: `${safe}%` }}
      />
    </Box>
  )
}

function HudStat({ label, value, percent, detail, tone }) {
  return (
    <Box className="jarvis-hud-stat">
      <Box className="jarvis-hud-row">
        <span className="jarvis-hud-label">{label}</span>
        <span className="jarvis-hud-value">{value}</span>
      </Box>
      {percent != null && <HudBar percent={percent} tone={tone} />}
      {detail && <Typography className="jarvis-hud-detail">{detail}</Typography>}
    </Box>
  )
}

function HudTile({ label, value, detail, tone = 'cyan' }) {
  return (
    <Box className={`jarvis-hud-tile jarvis-hud-tile--${tone}`}>
      <span className="jarvis-hud-tile-label">{label}</span>
      <span className="jarvis-hud-tile-value">{value}</span>
      {detail && <span className="jarvis-hud-tile-detail">{detail}</span>}
    </Box>
  )
}

function InboxTasksPanel({ hud }) {
  const mailValue =
    hud.unreadEmailCount != null ? String(hud.unreadEmailCount) : hud.googleConnected ? '0' : '—'
  const mailDetail =
    hud.unreadEmailCount != null
      ? hud.unreadEmailCount === 1
        ? 'Unread in inbox'
        : 'Unread in inbox'
      : hud.googleConnected
        ? 'Inbox clear'
        : 'Connect Google for mail'

  return (
    <Box className="jarvis-hud-panel">
      <Typography className="jarvis-hud-title">Inbox & Tasks</Typography>

      <HudStat
        label="Unread mail"
        value={mailValue}
        percent={hud.unreadEmailCount != null ? Math.min(100, hud.unreadEmailCount * 8) : 0}
        detail={mailDetail}
        tone={hud.unreadEmailCount > 10 ? 'warn' : 'cyan'}
      />

      <HudStat
        label="Open tasks"
        value={String(hud.tasks.pendingCount)}
        percent={Math.min(100, hud.tasks.pendingCount * 12)}
        detail={
          hud.tasks.dueTodayCount > 0
            ? `${hud.tasks.dueTodayCount} due today`
            : hud.tasks.pendingCount > 0
              ? 'Pending in your list'
              : 'All caught up'
        }
        tone={hud.tasks.dueTodayCount > 0 ? 'warn' : 'good'}
      />

      {hud.tasks.topTasks.length > 0 ? (
        hud.tasks.topTasks.map((task) => (
          <Box key={task.id} className="jarvis-hud-task">
            <Typography className="jarvis-hud-task-title">{task.title}</Typography>
            <Typography className="jarvis-hud-detail">{task.when}</Typography>
          </Box>
        ))
      ) : (
        <Typography className="jarvis-hud-empty">No open tasks</Typography>
      )}
    </Box>
  )
}

const JarvisHud = ({ sessionActive = false, sessionStartedAt = null }) => {
  const hud = useJarvisHud({ sessionActive, sessionStartedAt })

  const batteryValue = hud.battery.supported && hud.battery.level != null
    ? `${hud.battery.level}%${hud.battery.charging ? ' ⚡' : ''}`
    : hud.battery.iosLimited
      ? '—'
      : 'N/A'
  const batteryPct = hud.battery.supported && hud.battery.level != null ? hud.battery.level : 0
  const batteryDetail = hud.battery.charging
    ? 'Charging'
    : hud.battery.source === 'reported'
      ? 'Reported level'
      : hud.battery.iosLimited && !hud.battery.supported
        ? 'Say: battery is 45 percent'
        : hud.battery.supported
          ? 'Power'
          : 'Unavailable'
  const batteryTone =
    batteryPct > 0 && batteryPct <= 20
      ? 'warn'
      : batteryPct > 0 && batteryPct <= 50
        ? 'warn'
        : hud.battery.charging
          ? 'good'
          : 'cyan'

  const mailTileValue =
    hud.unreadEmailCount != null ? String(hud.unreadEmailCount) : hud.googleConnected ? '0' : '—'
  const weatherTileValue = hud.weather ? `${hud.weather.temp}°` : '—'
  const timeShort = hud.clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Desktop side panels */}
      <Box className="jarvis-hud-desktop" aria-hidden={false}>
        <aside className="jarvis-hud jarvis-hud--left" aria-label="System status">
          <Box className="jarvis-hud-panel">
            <Typography className="jarvis-hud-title">System</Typography>

            <HudStat label="Battery" value={batteryValue} percent={batteryPct} detail={batteryDetail} tone={batteryTone} />

            <HudStat
              label="Memory"
              value={hud.memory.label}
              percent={hud.memory.percent}
              detail={hud.memory.detail}
              tone={hud.memory.percent > 80 ? 'warn' : 'cyan'}
            />

            <HudStat
              label="Session"
              value={hud.sessionLabel}
              percent={hud.sessionActive ? 72 : 8}
              detail={hud.sessionActive ? 'Voice link active' : 'Standby'}
              tone={hud.sessionActive ? 'good' : 'cyan'}
            />
          </Box>

          <Box className="jarvis-hud-panel">
            <Typography className="jarvis-hud-title">Recent Apps</Typography>
            {hud.recentApps.length > 0 ? (
              hud.recentApps.map((app) => (
                <Typography key={app.name} className="jarvis-hud-app">
                  {app.label}
                </Typography>
              ))
            ) : (
              <Typography className="jarvis-hud-empty">No apps opened yet</Typography>
            )}
          </Box>
        </aside>

        <aside className="jarvis-hud jarvis-hud--right" aria-label="Daily briefing">
          <Box className="jarvis-hud-panel">
            <Typography className="jarvis-hud-title">Today</Typography>

            <Box className="jarvis-hud-clock-block">
              <Typography className="jarvis-hud-clock">
                {hud.clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <Typography className="jarvis-hud-date">
                {hud.clock.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </Typography>
            </Box>

            {hud.weather ? (
              <Box className="jarvis-hud-stat">
                <Box className="jarvis-hud-row">
                  <span className="jarvis-hud-label">Weather</span>
                  <span className="jarvis-hud-value">
                    {hud.weather.temp}°{hud.weather.unit}
                  </span>
                </Box>
                <Typography className="jarvis-hud-detail">
                  {hud.weather.desc} · {hud.weather.humidity}% humidity
                </Typography>
              </Box>
            ) : (
              <Typography className="jarvis-hud-empty">Allow location for weather</Typography>
            )}

            {hud.nextEvent ? (
              <Box className="jarvis-hud-stat">
                <span className="jarvis-hud-label">Next</span>
                <Typography className="jarvis-hud-event-title">{hud.nextEvent.title}</Typography>
                <Typography className="jarvis-hud-detail">{hud.nextEvent.when}</Typography>
              </Box>
            ) : (
              <Typography className="jarvis-hud-empty">
                {hud.googleConnected ? 'No upcoming events' : 'Connect Google for calendar'}
              </Typography>
            )}
          </Box>

          <InboxTasksPanel hud={hud} />

          <Box className="jarvis-hud-panel">
            <Typography className="jarvis-hud-title">Quick Commands</Typography>
            {hud.tips.map((tip) => (
              <Typography key={tip} className="jarvis-hud-tip">
                {tip}
              </Typography>
            ))}
          </Box>
        </aside>
      </Box>

      {/* iPhone / mobile HUD */}
      <Box className="jarvis-hud-mobile" aria-label="Status overview">
        <Box className="jarvis-hud-tiles-scroll">
          <HudTile label="Time" value={timeShort} detail={hud.clock.toLocaleDateString([], { weekday: 'short' })} />
          <HudTile
            label="Battery"
            value={batteryValue}
            detail={batteryDetail}
            tone={batteryTone}
          />
          <HudTile
            label="Mail"
            value={mailTileValue}
            detail={hud.unreadEmailCount != null ? 'Unread' : 'Inbox'}
            tone={hud.unreadEmailCount > 10 ? 'warn' : 'cyan'}
          />
          <HudTile
            label="Tasks"
            value={String(hud.tasks.pendingCount)}
            detail={hud.tasks.dueTodayCount > 0 ? `${hud.tasks.dueTodayCount} due today` : 'Open'}
            tone={hud.tasks.dueTodayCount > 0 ? 'warn' : 'good'}
          />
          <HudTile
            label="Weather"
            value={weatherTileValue}
            detail={hud.weather?.desc || 'Local'}
            tone="cyan"
          />
          <HudTile
            label="Session"
            value={hud.sessionLabel}
            detail={hud.sessionActive ? 'Live' : 'Idle'}
            tone={hud.sessionActive ? 'good' : 'cyan'}
          />
        </Box>

        <Box className="jarvis-hud-mobile-grid">
          <Box className="jarvis-hud-panel jarvis-hud-panel--compact">
            <Typography className="jarvis-hud-title">Recent Apps</Typography>
            {hud.recentApps.length > 0 ? (
              hud.recentApps.map((app) => (
                <Typography key={app.name} className="jarvis-hud-app">
                  {app.label}
                </Typography>
              ))
            ) : (
              <Typography className="jarvis-hud-empty">Say: open YouTube</Typography>
            )}
          </Box>

          <Box className="jarvis-hud-panel jarvis-hud-panel--compact">
            <Typography className="jarvis-hud-title">Next Up</Typography>
            {hud.nextEvent ? (
              <>
                <Typography className="jarvis-hud-event-title">{hud.nextEvent.title}</Typography>
                <Typography className="jarvis-hud-detail">{hud.nextEvent.when}</Typography>
              </>
            ) : (
              <Typography className="jarvis-hud-empty">
                {hud.googleConnected ? 'Calendar clear' : 'Connect Google'}
              </Typography>
            )}
            {hud.tasks.topTasks[0] && (
              <>
                <Typography className="jarvis-hud-label" sx={{ display: 'block', mt: 1 }}>
                  Top task
                </Typography>
                <Typography className="jarvis-hud-task-title">{hud.tasks.topTasks[0].title}</Typography>
              </>
            )}
          </Box>
        </Box>

        <Box className="jarvis-hud-panel jarvis-hud-panel--compact jarvis-hud-mobile-tips">
          {hud.tips.slice(0, 2).map((tip) => (
            <Typography key={tip} className="jarvis-hud-tip">
              {tip}
            </Typography>
          ))}
        </Box>
      </Box>
    </>
  )
}

export default JarvisHud
