'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import SiteLayout from '../components/SiteLayout'
import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { formatPrice } from '../lib/products'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000/api'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  apt: '',
  city: '',
  zip: '',
  country: 'Morocco',
  notes: '',
}

export default function CheckoutPage() {
  const router = useRouter()
  const { locale, t } = useSiteI18n()
  const {
    items,
    subtotal,
    clear,
  } = useCart()

  const containsBackorder =
    items.some(item =>
      Boolean(item.isBackorder)
    )

  const [form, setForm] =
    useState(initialForm)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [error, setError] =
    useState('')

  function updateField(event) {
    const {
      name,
      value,
    } = event.target

    setForm(current => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (
      items.length === 0 ||
      submitting
    ) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response =
        await fetch(
          `${API_BASE}/orders/checkout`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              customer: {
                first_name:
                  form.firstName,

                last_name:
                  form.lastName,

                email:
                  form.email,

                phone:
                  form.phone,

                address:
                  form.address,

                apt:
                  form.apt,

                city:
                  form.city,

                zip:
                  form.zip,

                country:
                  form.country,
              },

              notes:
                form.notes,

              payment_method:
                'cash_on_delivery',

              items:
                items.map(item => ({
                  product_id:
                    item.id,

                  product_size_variant_id:
                    item.productSizeVariantId ||
                    item.product_size_variant_id ||
                    null,

                  quantity:
                    item.quantity,

                  selected_color:
                    item.selectedColor ||
                    null,

                  requested_as_backorder:
                    Boolean(
                      item.isBackorder
                    ),
                })),
            }),
          }
        )

      const data =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        const message =
          Array.isArray(
            data?.message
          )
            ? data.message.join(
                ', '
              )
            : data?.message

        throw new Error(
          message ||
            t(
              'checkout.submitError'
            )
        )
      }

      clear()

      router.replace(
        `/checkout/success?order=${encodeURIComponent(
          data.order_number
        )}`
      )
    } catch (submitError) {
      setError(
        submitError?.message ||
          t(
            'checkout.submitError'
          )
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <section className="page-hero compact">
          <div className="container">
            <h1>
              {t(
                'checkout.title'
              )}
            </h1>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="empty-cart">
              <h2>
                {t(
                  'checkout.empty'
                )}
              </h2>

              <Link
                href="/shop"
                className="primary-button"
              >
                {t(
                  'cart.continue'
                )}
              </Link>
            </div>
          </div>
        </section>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <section className="page-hero compact">
        <div className="container">
          <h1>
            {t(
              'checkout.title'
            )}
          </h1>

          <p>
            {t(
              'checkout.subtitle'
            )}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {containsBackorder && (
            <div className="checkout-backorder-notice">
              <strong>
                {t(
                  'checkout.backorderTitle'
                )}
              </strong>

              <p>
                {t(
                  'checkout.backorderNotice'
                )}
              </p>
            </div>
          )}

          <div className="checkout-layout">
            <form
              className="checkout-form"
              onSubmit={
                handleSubmit
              }
            >
              <div className="checkout-form-header">
                <h2>
                  {t(
                    'checkout.customerInformation'
                  )}
                </h2>

                <p>
                  {t(
                    'checkout.requiredNotice'
                  )}
                </p>
              </div>

              <div className="checkout-fields-grid">
                <label>
                  <span>
                    {t(
                      'checkout.firstName'
                    )}
                  </span>

                  <input
                    type="text"
                    name="firstName"
                    value={
                      form.firstName
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="given-name"
                    required
                  />
                </label>

                <label>
                  <span>
                    {t(
                      'checkout.lastName'
                    )}
                  </span>

                  <input
                    type="text"
                    name="lastName"
                    value={
                      form.lastName
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="family-name"
                    required
                  />
                </label>

                <label>
                  <span>
                    {t(
                      'checkout.email'
                    )}
                  </span>

                  <input
                    type="email"
                    name="email"
                    value={
                      form.email
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  <span>
                    {t(
                      'checkout.phone'
                    )}
                  </span>

                  <input
                    type="tel"
                    name="phone"
                    value={
                      form.phone
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="tel"
                    required
                  />
                </label>

                <label className="checkout-field-full">
                  <span>
                    {t(
                      'checkout.address'
                    )}
                  </span>

                  <input
                    type="text"
                    name="address"
                    value={
                      form.address
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="street-address"
                    required
                  />
                </label>

                <label>
                  <span>
                    {t(
                      'checkout.apt'
                    )}
                  </span>

                  <input
                    type="text"
                    name="apt"
                    value={
                      form.apt
                    }
                    onChange={
                      updateField
                    }
                  />
                </label>

                <label>
                  <span>
                    {t(
                      'checkout.city'
                    )}
                  </span>

                  <input
                    type="text"
                    name="city"
                    value={
                      form.city
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="address-level2"
                    required
                  />
                </label>

                <label>
                  <span>
                    {t(
                      'checkout.zip'
                    )}
                  </span>

                  <input
                    type="text"
                    name="zip"
                    value={
                      form.zip
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="postal-code"
                  />
                </label>

                <label>
                  <span>
                    {t(
                      'checkout.country'
                    )}
                  </span>

                  <input
                    type="text"
                    name="country"
                    value={
                      form.country
                    }
                    onChange={
                      updateField
                    }
                    autoComplete="country-name"
                    required
                  />
                </label>

                <label className="checkout-field-full">
                  <span>
                    {t(
                      'checkout.notes'
                    )}
                  </span>

                  <textarea
                    name="notes"
                    rows="4"
                    value={
                      form.notes
                    }
                    onChange={
                      updateField
                    }
                  />
                </label>
              </div>

              <div className="checkout-payment-notice">
                <strong>
                  {t(
                    'checkout.paymentTitle'
                  )}
                </strong>

                <p>
                  {t(
                    'checkout.paymentText'
                  )}
                </p>
              </div>

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="primary-button full-width"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? t(
                      'checkout.submitting'
                    )
                  : t(
                      'checkout.confirm'
                    )}
              </button>
            </form>

            <aside className="checkout-summary">
              <h2>
                {t(
                  'checkout.summary'
                )}
              </h2>

              <div className="checkout-summary-items">
                {items.map(
                  item => (
                    <article
                      key={
                        item.cartItemKey ||
                        `${item.id}:${item.productSizeVariantId || ''}:${item.selectedColor || ''}`
                      }
                      className={
                        item.isBackorder
                          ? 'checkout-summary-item is-backorder'
                          : 'checkout-summary-item'
                      }
                    >
<div className="checkout-summary-item-image">
  <Image
    src={
      item.image ||
      '/images/product-placeholder.svg'
    }
    alt={item.name}
    fill
    sizes="72px"
    quality={70}
  />
</div>

                      <div>
                        <strong>
                          {item.name}
                        </strong>

                        <span>
                          {
                            item.quantity
                          }{' '}
                          ×{' '}
                          {formatPrice(
                            item.price,
                            locale
                          )}{' '}
                          {t(
                            'common.currency'
                          )}
                        </span>

                        {item.selectedSize && (
                          <span>
                            {t(
                              'product.size'
                            )}
                            {' : '}
                            {
                              item.selectedSize
                            }
                          </span>
                        )}

                        {item.selectedColor && (
                          <span>
                            {t(
                              'cart.color'
                            )}
                            {' : '}
                            {
                              item.selectedColor
                            }
                          </span>
                        )}

                        {item.isBackorder && (
                          <span className="checkout-item-backorder">
                            {t(
                              'checkout.backorderItem'
                            )}
                          </span>
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>

              <div className="checkout-summary-total">
                <span>
                  {t(
                    'cart.subtotal'
                  )}
                </span>

                <strong>
                  {formatPrice(
                    subtotal,
                    locale
                  )}{' '}
                  {t(
                    'common.currency'
                  )}
                </strong>
              </div>

              <p className="checkout-summary-help">
                {containsBackorder
                  ? t(
                      'checkout.backorderNotice'
                    )
                  : t(
                      'checkout.totalNotice'
                    )}
              </p>
            </aside>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}