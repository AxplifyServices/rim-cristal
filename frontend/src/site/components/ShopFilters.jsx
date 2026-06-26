'use client'


// commentaire


function FilterGroup({
  title,
  values,
  selectedValues,
  onToggle,
  emptyLabel,
}) {
  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>

      {values.length === 0 ? (
        <p className="filter-empty">
          {emptyLabel}
        </p>
      ) : (
        <div className="filter-options">
          {values.map(value => {
            const checked =
              selectedValues.includes(
                value
              )

            return (
              <label
                key={value}
                className="filter-checkbox"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    onToggle(value)
                  }}
                />

                <span
                  className="filter-checkbox-mark"
                  aria-hidden="true"
                />

                <span>
                  {value}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}

export default function ShopFilters({
  t,
  rubriques,
  categories,
  families,
  selectedRubriques,
  selectedCategories,
  selectedFamilies,
  priceBounds,
  currentMinPrice,
  currentMaxPrice,
  onToggleRubrique,
  onToggleCategory,
  onToggleFamily,
  onPriceChange,
  onReset,
  onClose,
  mobile = false,
}) {
  const absoluteMin =
    Number(priceBounds.min || 0)

  const absoluteMax =
    Math.max(
      Number(priceBounds.max || 0),
      absoluteMin
    )

  const safeMin =
    Math.min(
      Math.max(
        Number(currentMinPrice),
        absoluteMin
      ),
      absoluteMax
    )

  const safeMax =
    Math.max(
      Math.min(
        Number(currentMaxPrice),
        absoluteMax
      ),
      absoluteMin
    )

  function updateMin(value) {
    const nextValue =
      Math.min(
        Number(value),
        safeMax
      )

    onPriceChange(
      nextValue,
      safeMax
    )
  }

  function updateMax(value) {
    const nextValue =
      Math.max(
        Number(value),
        safeMin
      )

    onPriceChange(
      safeMin,
      nextValue
    )
  }

  return (
    <div className="shop-filters">
      <div className="shop-filters-header">
        <h2>
          {t('shop.filters.title')}
        </h2>

        {mobile && (
          <button
            type="button"
            className="filter-close-button"
            onClick={onClose}
            aria-label={t(
              'shop.filters.close'
            )}
          >
            ×
          </button>
        )}
      </div>

      <FilterGroup
        title={t(
          'shop.filters.sections'
        )}
        values={rubriques}
        selectedValues={
          selectedRubriques
        }
        onToggle={onToggleRubrique}
        emptyLabel={t(
          'shop.filters.noOptions'
        )}
      />

      <FilterGroup
        title={t(
          'shop.filters.categories'
        )}
        values={categories}
        selectedValues={
          selectedCategories
        }
        onToggle={onToggleCategory}
        emptyLabel={t(
          'shop.filters.selectSection'
        )}
      />

      <FilterGroup
        title={t(
          'shop.filters.families'
        )}
        values={families}
        selectedValues={
          selectedFamilies
        }
        onToggle={onToggleFamily}
        emptyLabel={t(
          'shop.filters.selectCategory'
        )}
      />

      <fieldset className="filter-group">
        <legend>
          {t('shop.filters.price')}
        </legend>

        <div className="price-values">
          <label>
            <span>
              {t(
                'shop.filters.minPrice'
              )}
            </span>

            <input
              type="number"
              min={absoluteMin}
              max={safeMax}
              value={safeMin}
              onChange={event => {
                updateMin(
                  event.target.value
                )
              }}
            />
          </label>

          <label>
            <span>
              {t(
                'shop.filters.maxPrice'
              )}
            </span>

            <input
              type="number"
              min={safeMin}
              max={absoluteMax}
              value={safeMax}
              onChange={event => {
                updateMax(
                  event.target.value
                )
              }}
            />
          </label>
        </div>

        <div className="price-range">
          <div className="price-range-track" />

          <input
            type="range"
            min={absoluteMin}
            max={absoluteMax}
            value={safeMin}
            onChange={event => {
              updateMin(
                event.target.value
              )
            }}
            aria-label={t(
              'shop.filters.minPrice'
            )}
          />

          <input
            type="range"
            min={absoluteMin}
            max={absoluteMax}
            value={safeMax}
            onChange={event => {
              updateMax(
                event.target.value
              )
            }}
            aria-label={t(
              'shop.filters.maxPrice'
            )}
          />
        </div>

        <div className="price-range-labels">
          <span>
            {absoluteMin} MAD
          </span>

          <span>
            {absoluteMax} MAD
          </span>
        </div>
      </fieldset>

      <div className="filter-actions">
        <button
          type="button"
          className="filter-reset-button"
          onClick={onReset}
        >
          {t('shop.filters.reset')}
        </button>

        {mobile && (
          <button
            type="button"
            className="filter-apply-button"
            onClick={onClose}
          >
            {t('shop.filters.showResults')}
          </button>
        )}
      </div>
    </div>
  )
}