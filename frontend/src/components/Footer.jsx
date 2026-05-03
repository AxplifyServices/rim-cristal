'use client'
import Link from 'next/link'

const SHOP_LINKS   = ['Pendant Lights','Wall Sconces','Floor Lamps','Table Lamps','Ceiling Lights','New Arrivals','Sale']
const HELP_LINKS   = [
  { label: 'Track Your Order', href: '/track' },
  { label: 'Shipping & Delivery', href: '#' },
  { label: 'Returns & Exchanges', href: '#' },
  { label: 'FAQs', href: '#' },
  { label: 'Contact Us', href: '/contact' },
]
const POLICY_LINKS = ['Privacy Policy','Terms of Service','Cookie Policy','Warranty & Care','Trade Program']
const PAY_CHIPS    = ['VISA','MC','AMEX','PAYPAL','APPLE PAY','KLARNA']

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <Link href="/" className="f-logo">Lux <em>Lumina</em></Link>
          <p className="f-brand-p">
            Curating the finest decorative lighting fixtures for modern interiors.
            Each piece selected for craftsmanship, design integrity, and transformative
            presence in your space.
          </p>
          <div className="f-socials">
            {/* Instagram */}
            <a href="#" className="f-soc" aria-label="Instagram">
              <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            {/* Pinterest */}
            <a href="#" className="f-soc" aria-label="Pinterest">
              <svg viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
            </a>
            {/* Facebook */}
            <a href="#" className="f-soc" aria-label="Facebook">
              <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>

        {/* Shop links */}
        <div>
          <div className="f-col-title">Shop</div>
          <ul className="f-links">
            {SHOP_LINKS.map(l => <li key={l}><Link href="/shop">{l}</Link></li>)}
          </ul>
        </div>

        {/* Help */}
        <div>
          <div className="f-col-title">Help</div>
          <ul className="f-links">
            {HELP_LINKS.map(l => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </div>

        {/* Policies */}
        <div>
          <div className="f-col-title">Policies</div>
          <ul className="f-links">
            {POLICY_LINKS.map(l => <li key={l}><a href="#">{l}</a></li>)}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <div className="f-col-title">Contact Us</div>
          <div className="f-contact">
            <div className="f-ci">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              hello@luxlumina.com
            </div>
            <div className="f-ci">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              +1 (800) 586-4621
            </div>
            <div className="f-ci">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>123 Design District<br />New York, NY 10013</span>
            </div>
            <div className="f-ci">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Mon – Fri · 9 am – 6 pm EST
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bar">
        <p>© {new Date().getFullYear()} Lux Lumina. All rights reserved. Crafted with care.</p>
        <div className="pay-chips">
          {PAY_CHIPS.map(c => <span key={c} className="pay-chip">{c}</span>)}
        </div>
      </div>
    </footer>
  )
}
