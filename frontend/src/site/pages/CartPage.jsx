'use client'

import Link from 'next/link'
import SiteLayout from '../components/SiteLayout'
import { useCart } from '../context/CartContext'
import { useSiteI18n } from '../i18n/SiteI18nProvider'
import { formatPrice } from '../lib/products'

export default function CartPage() {
  const {
    items,
    subtotal,
    update,
    remove,
    clear,
  } = useCart()

  const { locale, t } =
    useSiteI18n()

  return (
    <SiteLayout>
      <section className="page-hero compact">
        <div className="container">
          <h1>
            {t('cart.title')}
          </h1>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {items.length === 0 ? (
            <div className="empty-cart">
              <h2>
                {t('cart.empty')}
              </h2>

              <p>
                {t(
                  'cart.emptyText'
                )}
              </p>

              <Link
                href="/shop"
                className="primary-button"
              >
                {t(
                  'cart.continue'
                )}
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {items.map(item => (
                  <article
                    key={
                      item.cartItemKey
                    }
                    className="cart-item"
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      className="cart-item-image"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                      />
                    </Link>

                    <div className="cart-item-content">
                      <Link
                        href={`/product/${item.slug}`}
                        className="cart-item-name"
                      >
                        {item.name}
                      </Link>

                      {item.reference && (
                        <p>
                          {
                            item.reference
                          }
                        </p>
                      )}

                      {item.selectedColor && (
                        <p>
                          <strong>
                            {t(
                              'cart.color'
                            )}
                            :
                          </strong>{' '}
                          {
                            item.selectedColor
                          }
                        </p>
                      )}

                      <strong>
                        {formatPrice(
                          item.price,
                          locale
                        )}{' '}
                        {t(
                          'common.currency'
                        )}
                      </strong>

                      <div className="cart-item-actions">
                        <div className="cart-quantity">
                          <button
                            type="button"
                            onClick={() => {
                              update(
                                item.cartItemKey,
                                item.quantity -
                                  1
                              )
                            }}
                          >
                            −
                          </button>

                          <span>
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              update(
                                item.cartItemKey,
                                item.quantity +
                                  1
                              )
                            }}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => {
                            remove(
                              item.cartItemKey
                            )
                          }}
                        >
                          {t(
                            'cart.remove'
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="cart-summary">
                <h2>
                  {t(
                    'cart.subtotal'
                  )}
                </h2>

                <div className="summary-price">
                  {formatPrice(
                    subtotal,
                    locale
                  )}{' '}
                  {t(
                    'common.currency'
                  )}
                </div>

                <p>
                  {t('cart.notice')}
                </p>

<Link
  href="/checkout"
  className="primary-button full-width"
>
                  {t(
                    'cart.checkout'
                  )}
                </Link>

                <button
                  type="button"
                  className="secondary-button full-width"
                  onClick={clear}
                >
                  {t('cart.clear')}
                </button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  )
}