export default function AdminLayout({ children }) {
  // Admin pages use their own AdminShell with sidebar nav
  // We render children directly — AdminShell provides its own full-page layout
  return children
}
