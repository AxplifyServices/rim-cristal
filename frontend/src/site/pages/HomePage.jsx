'use client'

import HomeBrochureCarousel from '../components/HomeBrochureCarousel'
import HomePaginatedProducts from '../components/HomePaginatedProducts'
import SiteLayout from '../components/SiteLayout'
import {
  useSiteI18n,
} from '../i18n/SiteI18nProvider'
import HomeReviewsCarousel from '../components/HomeReviewsCarousel'
import HomeRubriquesGrid from '../components/HomeRubriquesGrid'

export default function HomePage({
  initialBrochures = [],
  initialBestsellers = null,
  initialPromotions = null,
  initialRecentProducts = null,
  brochuresLoadFailed = false,
  bestsellersLoadFailed = false,
  promotionsLoadFailed = false,
  recentProductsLoadFailed = false,
  initialReviews = [],
}) {
  const { t } =
    useSiteI18n()

  return (
    <SiteLayout>
      <HomeBrochureCarousel
        initialBrochures={
          initialBrochures
        }
        initialLoadFailed={
          brochuresLoadFailed
        }
      />

      <HomePaginatedProducts
        sectionId="best-sellers"
        initialResult={
          initialBestsellers
        }
        initialLoadFailed={
          bestsellersLoadFailed
        }
        kicker={t(
          'home.featuredKicker'
        )}
        title={t(
          'home.featuredTitle'
        )}
        subtitle={t(
          'home.featuredSubtitle'
        )}
        emptyMessage={t(
          'home.noBestsellers'
        )}
        queryOptions={{
          bestseller: true,
        }}
        viewAllHref="/shop"
        prioritizeFirstImages
      />

      <HomePaginatedProducts
        sectionId="promotions"
        initialResult={
          initialPromotions
        }
        initialLoadFailed={
          promotionsLoadFailed
        }
        kicker={t(
          'home.promotionsKicker'
        )}
        title={t(
          'home.promotionsTitle'
        )}
        subtitle={t(
          'home.promotionsSubtitle'
        )}
        emptyMessage={t(
          'home.noPromotions'
        )}
        queryOptions={{
          promotion: true,
        }}
        viewAllHref="/shop"
      />

      <HomeRubriquesGrid />

      <HomePaginatedProducts
        sectionId="new-arrivals"
        initialResult={
          initialRecentProducts
        }
        initialLoadFailed={
          recentProductsLoadFailed
        }
        kicker={t(
          'home.newArrivalsKicker'
        )}
        title={t(
          'home.newArrivalsTitle'
        )}
        subtitle={t(
          'home.newArrivalsSubtitle'
        )}
        emptyMessage={t(
          'home.noNewArrivals'
        )}
        queryOptions={{
          recent: true,
        }}
        viewAllHref="/shop"
      />

      <HomeReviewsCarousel
  reviews={initialReviews}
/>
    </SiteLayout>
  )
}