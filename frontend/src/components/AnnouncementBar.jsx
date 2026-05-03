'use client'
import { useState } from 'react'

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div className="ann-bar">
      Free shipping on orders over <strong>$150</strong> &nbsp;·&nbsp;
      Use code <strong>LUMINA15</strong> for 15% off your first order &nbsp;·&nbsp;
      Free returns within 30 days
      <button className="ann-close" onClick={() => setVisible(false)} aria-label="Close">×</button>
    </div>
  )
}
