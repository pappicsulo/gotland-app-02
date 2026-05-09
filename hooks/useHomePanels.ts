// ===== useHomePanels.ts =====

'use client'

// =========================
// IMPORTS
// =========================

import { useState } from 'react'

// =========================
// HOOK
// =========================

export function useHomePanels() {
  // =========================
  // STATE
  // =========================

  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false)

  // =========================
  // HANDLERS
  // =========================

  function closeAllPanels() {
    setShowCreatePanel(false)
    setShowSearchPanel(false)
    setShowNotificationsPanel(false)
  }

  function toggleCreatePanel() {
    setShowCreatePanel((prev) => {
      const next = !prev

      if (next) {
        setShowSearchPanel(false)
        setShowNotificationsPanel(false)
      }

      return next
    })
  }

  function toggleSearchPanel() {
    setShowSearchPanel((prev) => {
      const next = !prev

      if (next) {
        setShowCreatePanel(false)
        setShowNotificationsPanel(false)
      }

      return next
    })
  }

  function toggleNotificationsPanel() {
    setShowNotificationsPanel((prev) => {
      const next = !prev

      if (next) {
        setShowCreatePanel(false)
        setShowSearchPanel(false)
      }

      return next
    })
  }

  function closeCreatePanel() {
    setShowCreatePanel(false)
  }

  function closeSearchPanel() {
    setShowSearchPanel(false)
  }

  function closeNotificationsPanel() {
    setShowNotificationsPanel(false)
  }

  // =========================
  // RETURN
  // =========================

  return {
    showCreatePanel,
    showSearchPanel,
    showNotificationsPanel,

    closeAllPanels,

    toggleCreatePanel,
    toggleSearchPanel,
    toggleNotificationsPanel,

    closeCreatePanel,
    closeSearchPanel,
    closeNotificationsPanel,
  }
}