import React, { useEffect, useState } from 'react'
import { Box, Typography, Dialog, DialogContent, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'

export default function EmailDraftOverlay() {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    const onDraft = (event) => {
      const detail = event.detail
      if (!detail?.to && !detail?.body) return
      setDraft(detail)
    }
    window.addEventListener('raj-email-draft', onDraft)
    return () => window.removeEventListener('raj-email-draft', onDraft)
  }, [])

  if (!draft) return null

  return (
    <Dialog open onClose={() => setDraft(null)} maxWidth="sm" fullWidth PaperProps={{ className: 'jarvis-email-draft' }}>
      <DialogContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ color: '#22d3ee', letterSpacing: 1 }}>
            EMAIL DRAFT
          </Typography>
          <IconButton size="small" onClick={() => setDraft(null)} aria-label="Close">
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Typography className="jarvis-hud-detail" sx={{ mb: 0.5 }}>
          To
        </Typography>
        <Typography sx={{ mb: 1.5, fontWeight: 600 }}>
          {draft.toName || draft.to}
          {draft.to ? ` <${draft.to}>` : ''}
        </Typography>
        <Typography className="jarvis-hud-detail" sx={{ mb: 0.5 }}>
          Subject
        </Typography>
        <Typography sx={{ mb: 1.5 }}>{draft.subject || '(no subject)'}</Typography>
        <Typography className="jarvis-hud-detail" sx={{ mb: 0.5 }}>
          Body
        </Typography>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(34, 211, 238, 0.2)',
            whiteSpace: 'pre-wrap',
            maxHeight: 220,
            overflow: 'auto',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {draft.body || '—'}
        </Box>
        <Typography className="jarvis-hud-detail" sx={{ mt: 1.5 }}>
          Opening in Gmail — review and tap Send, Boss.
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
