'use client'
import Link from 'next/link'

const STATS = [
  { num: '2018',  label: 'Founded' },
  { num: '1,200+', label: 'Products Curated' },
  { num: '42',    label: 'Countries Served' },
  { num: '98%',   label: 'Customer Satisfaction' },
]

const VALUES = [
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: 'Uncompromising Quality',
    desc: 'Every fixture in our collection is rigorously vetted for material integrity, structural durability, and finish quality before it earns a place in our catalogue.',
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    title: 'Sustainable Sourcing',
    desc: 'We partner exclusively with manufacturers who hold FSC and ISO 14001 certifications, ensuring responsible material sourcing and production practices.',
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: 'Artisan Partnerships',
    desc: 'We work directly with independent craftspeople across Europe and Asia, championing traditional techniques while supporting fair wages and safe working conditions.',
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
    title: 'Design Integrity',
    desc: 'Our curation team, led by interior designers with decades of combined experience, ensures every piece achieves the rare balance of beauty, function, and longevity.',
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.01-8.36"/></svg>,
    title: '30-Day Returns',
    desc: "We believe in our products completely. If for any reason you're not satisfied, return any item within 30 days, no questions asked, for a full refund.",
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    title: 'Dedicated Support',
    desc: 'Our in-house lighting specialists offer personalised advice to help you select the right fixture for your space — from initial question to final installation.',
  },
]

export default function About() {
  return (
    <>
      {/* Hero */}
      <div className="about-hero">
        <img src="https://picsum.photos/seed/about-hero/1800/600" alt="About Lux Lumina" />
        <div className="about-hero-overlay" />
        <div className="about-hero-content">
          <p className="overline" style={{ color: 'var(--gold-lt)', marginBottom: 14 }}>Our Story</p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2.2rem,5vw,4rem)', fontWeight: 600, color: 'white', maxWidth: 560, lineHeight: 1.1 }}>
            Lighting designed to become part of your story
          </h1>
        </div>
      </div>

      {/* Brand Story */}
      <section className="section page-wrap">
        <div className="about-story">
          <div className="about-story-img">
            <img src="https://picsum.photos/seed/about-story/700/900" alt="Our Story" />
          </div>
          <div className="about-story-text">
            <p className="overline" style={{ marginBottom: 12 }}>Since 2018</p>
            <h2 className="h2" style={{ marginBottom: 24 }}>Where craft meets contemporary design</h2>
            <p>
              Lux Lumina began as a simple observation: the lighting market was dominated by mass-produced
              fixtures that prioritised price over beauty, leaving discerning homeowners and designers with
              few curated options that truly honoured the transformative power of light in a space.
            </p>
            <p>
              Founded in New York's Design District in 2018, we set out to build a different kind of
              lighting brand — one grounded in the belief that a beautifully designed fixture is not a
              luxury, but an investment in the quality of everyday life.
            </p>
            <p>
              Today, we work with over 60 artisan studios across Scandinavia, southern Europe, and
              Southeast Asia, bringing their best work to a global audience that shares our passion for
              considered design. Every piece in our collection has been handled, tested, and approved
              by our curation team before it appears on our shelves.
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 28 }}>
              <Link href="/shop" className="btn btn-dark">Shop Collection</Link>
              <Link href="/contact" className="btn btn-outline">Get in Touch</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-strip">
        <div className="stats-grid page-wrap">
          {STATS.map(s => (
            <div key={s.label} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <section className="section page-wrap">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p className="overline">What We Stand For</p>
          <h2 className="h2" style={{ marginTop: 6 }}>Our Core Values</h2>
        </div>
        <div className="values-grid-about">
          {VALUES.map(v => (
            <div key={v.title} className="value-card">
              <div className="value-card-icon">{v.icon}</div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <div style={{ background: 'var(--black)', color: 'white', padding: '72px 0' }}>
        <div className="page-wrap">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p className="overline" style={{ color: 'var(--gold)' }}>How We Curate</p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem,3vw,2.8rem)', fontWeight: 600, marginTop: 8 }}>
              From studio to your space
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32 }}>
            {[
              { step: '01', title: 'Discovery', desc: 'Our team travels to artisan studios, trade shows, and design weeks to find distinctive pieces.' },
              { step: '02', title: 'Vetting',   desc: 'Every product is tested for safety, material quality, and finish consistency before approval.' },
              { step: '03', title: 'Curation',  desc: 'Our design panel selects only pieces that achieve a perfect balance of beauty and function.' },
              { step: '04', title: 'Delivery',  desc: 'White-glove packaging and tracked delivery ensure every piece arrives in perfect condition.' },
            ].map(item => (
              <div key={item.step} style={{ borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 22 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--gold)', opacity: .6, marginBottom: 12 }}>{item.step}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.75 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="section page-wrap" style={{ textAlign: 'center' }}>
        <p className="overline" style={{ marginBottom: 12 }}>Start Your Journey</p>
        <h2 className="h2" style={{ marginBottom: 18 }}>Ready to transform your space?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.75 }}>
          Browse our curated collection or speak with a lighting specialist to find the perfect piece for your home.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/shop" className="btn btn-dark">Shop All Lighting</Link>
          <Link href="/contact" className="btn btn-outline">Talk to a Specialist</Link>
        </div>
      </section>
    </>
  )
}
