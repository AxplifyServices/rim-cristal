'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import SiteLayout from '../components/SiteLayout'
import { useSiteI18n } from '../i18n/SiteI18nProvider'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const { t } = useSiteI18n()

  const orderNumber =
    searchParams.get('order') || '-'

  return (
    <SiteLayout>
      <section className="section checkout-success-section">
        <div className="container">
          <div className="checkout-success-card">
            <div className="checkout-success-icon">
              ✓
            </div>

            <h1>{t('checkoutSuccess.title')}</h1>

            <p>{t('checkoutSuccess.subtitle')}</p>

            <div className="checkout-order-number">
              <span>
                {t('checkoutSuccess.orderNumber')}
              </span>

              <strong>{orderNumber}</strong>
            </div>

            <p>{t('checkoutSuccess.payment')}</p>

            <Link
              href="/shop"
              className="primary-button"
            >
              {t('checkoutSuccess.back')}
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}