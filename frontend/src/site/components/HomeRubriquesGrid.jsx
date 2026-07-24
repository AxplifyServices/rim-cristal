'use client'

import Image from 'next/image'
import Link from 'next/link'

import {
  useSiteI18n,
} from '../i18n/SiteI18nProvider'

/*
 * La valeur "value" doit rester strictement identique
 * aux valeurs utilisées par le backend et ShopPage.
 *
 * Il ne faut donc pas traduire cette valeur dans l'URL.
 * Seul le texte affiché à l'utilisateur est traduit.
 */
const HOME_RUBRIQUES = [
  {
    value: 'Mobilier',
    translationKey:
      'home.rubriques.items.mobilier',
    image:
      '/images/rubrique-hero/mobilier.webp',
  },
  {
    value: 'Luminaires',
    translationKey:
      'home.rubriques.items.luminaires',
    image:
      '/images/rubrique-hero/luminaires.webp',
  },
  {
    value: 'Décoration',
    translationKey:
      'home.rubriques.items.decoration',
    image:
      '/images/rubrique-hero/decoration.webp',
  },
  {
    value: 'Art mural',
    translationKey:
      'home.rubriques.items.artMural',
    image:
      '/images/rubrique-hero/art-mural.webp',
  },
  {
    value:
      'Fleurs & Arrangements',
    translationKey:
      'home.rubriques.items.fleursArrangements',
    image:
      '/images/rubrique-hero/fleurs-arrangements.webp',
  },
  {
    value:
      'Arts de la table',
    translationKey:
      'home.rubriques.items.artsDeLaTable',
    image:
      '/images/rubrique-hero/arts-de-la-table.webp',
  },
]

/*
 * L'objet pathname/query laisse Next.js encoder
 * correctement les espaces, accents et caractères "&".
 *
 * Exemple généré :
 * /shop?rubrique=Fleurs+%26+Arrangements&page=1
 */
function createRubriqueHref(
  rubrique
) {
  return {
    pathname: '/shop',
    query: {
      rubrique,
      page: '1',
    },
  }
}

export default function HomeRubriquesGrid() {
  const { t } =
    useSiteI18n()

  return (
    <section
      className="home-rubriques-section"
      aria-labelledby="home-rubriques-title"
    >
      <div className="container">
        <header className="home-rubriques-heading">
          <span className="home-section-kicker">
            {t(
              'home.rubriques.kicker'
            )}
          </span>

          <h2 id="home-rubriques-title">
            {t(
              'home.rubriques.title'
            )}
          </h2>

          <p>
            {t(
              'home.rubriques.subtitle'
            )}
          </p>
        </header>

        <nav
          className="home-rubriques-grid"
          aria-label={t(
            'home.rubriques.navigationLabel'
          )}
        >
          {HOME_RUBRIQUES.map(
            rubrique => {
              const translatedName =
                t(
                  rubrique.translationKey
                )

              return (
                <Link
                  key={
                    rubrique.value
                  }
                  href={createRubriqueHref(
                    rubrique.value
                  )}
                  className="home-rubrique-card"
                  aria-label={t(
                    'home.rubriques.openRubrique',
                    {
                      rubrique:
                        translatedName,
                    }
                  )}
                >
                  <span className="home-rubrique-image-wrapper">
                    <Image
                      src={
                        rubrique.image
                      }
                      alt=""
                      fill
                      className="home-rubrique-image"
                      sizes="
                        (max-width: 640px) 50vw,
                        (max-width: 900px) 50vw,
                        33vw
                      "
                    />

                    <span
                      className="home-rubrique-overlay"
                      aria-hidden="true"
                    />
                  </span>

                  <span className="home-rubrique-content">
                    <span className="home-rubrique-name">
                      {
                        translatedName
                      }
                    </span>

                    <span
                      className="home-rubrique-action"
                      aria-hidden="true"
                    >
                      {t(
                        'home.rubriques.discover'
                      )}

                      <span className="home-rubrique-arrow">
                        →
                      </span>
                    </span>
                  </span>
                </Link>
              )
            }
          )}
        </nav>
      </div>
    </section>
  )
}