'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import AdminShell from '../components/AdminShell'
import { useAdminI18n } from '../i18n/AdminI18nProvider'
import { adminApi } from '../lib/adminApi'

const EMPTY_FORM = {
  imageUrl: '',
  mobileImageUrl: '',

  altTextFr: '',
  altTextEn: '',

  linkUrl: '',
  linkTarget: '_self',

  sortOrder: 0,
  isActive: true,

  desktopFit: 'cover',
  desktopPositionX: 50,
  desktopPositionY: 50,
  desktopZoom: 1,

  mobileFit: 'cover',
  mobilePositionX: 50,
  mobilePositionY: 50,
  mobileZoom: 1,
}

const DESKTOP_RATIO = 48 / 19
const MOBILE_RATIO = 4 / 5

function numberOrFallback(value, fallback) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : fallback
}

function normalizeBrochureForForm(brochure) {
  return {
    imageUrl:
      brochure?.imageUrl || '',

    mobileImageUrl:
      brochure?.mobileImageUrl || '',

    altTextFr:
      brochure?.altTextFr || '',

    altTextEn:
      brochure?.altTextEn || '',

    linkUrl:
      brochure?.linkUrl || '',

    linkTarget:
      brochure?.linkTarget === '_blank'
        ? '_blank'
        : '_self',

    sortOrder:
      numberOrFallback(
        brochure?.sortOrder,
        0
      ),

    isActive:
      brochure?.isActive !== false,

    desktopFit:
      brochure?.desktopFit === 'contain'
        ? 'contain'
        : 'cover',

    desktopPositionX:
      numberOrFallback(
        brochure?.desktopPositionX,
        50
      ),

    desktopPositionY:
      numberOrFallback(
        brochure?.desktopPositionY,
        50
      ),

    desktopZoom:
      numberOrFallback(
        brochure?.desktopZoom,
        1
      ),

    mobileFit:
      brochure?.mobileFit === 'contain'
        ? 'contain'
        : 'cover',

    mobilePositionX:
      numberOrFallback(
        brochure?.mobilePositionX,
        50
      ),

    mobilePositionY:
      numberOrFallback(
        brochure?.mobilePositionY,
        50
      ),

    mobileZoom:
      numberOrFallback(
        brochure?.mobileZoom,
        1
      ),
  }
}

function clamp(value, min, max) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return min
  }

  return Math.min(
    max,
    Math.max(min, parsed)
  )
}

function BrochurePreview({
  imageUrl,
  altText,
  fit,
  positionX,
  positionY,
  zoom,
  device,
  emptyLabel,
}) {
  const isMobile = device === 'mobile'

  return (
    <div
      className={[
        'admin-brochure-preview',
        isMobile
          ? 'is-mobile'
          : 'is-desktop',
      ].join(' ')}
      style={{
        aspectRatio: isMobile
          ? `${MOBILE_RATIO}`
          : `${DESKTOP_RATIO}`,
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={altText || ''}
          draggable={false}
          style={{
            objectFit:
              fit === 'contain'
                ? 'contain'
                : 'cover',

            objectPosition:
              `${positionX}% ${positionY}%`,

            transform:
              `scale(${zoom})`,
          }}
        />
      ) : (
        <div className="admin-brochure-preview-empty">
          <span>▧</span>
          <p>{emptyLabel}</p>
        </div>
      )}

      <div className="admin-brochure-preview-frame" />
    </div>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}) {
  return (
    <label className="admin-brochure-range">
      <span className="admin-brochure-range-heading">
        <span>{label}</span>

        <strong>
          {value}
          {suffix}
        </strong>
      </span>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event =>
          onChange(
            Number(event.target.value)
          )
        }
      />
    </label>
  )
}

export default function AdminBrochures() {
  const { t } = useAdminI18n()

  const [brochures, setBrochures] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [
    uploadingDesktop,
    setUploadingDesktop,
  ] = useState(false)

  const [
    uploadingMobile,
    setUploadingMobile,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editingId, setEditingId] =
    useState(null)

  const [form, setForm] =
    useState(EMPTY_FORM)

  const [activeDevice, setActiveDevice] =
    useState('desktop')

  const orderedBrochures = useMemo(
    () =>
      [...brochures].sort((a, b) => {
        const orderDifference =
          Number(a.sortOrder) -
          Number(b.sortOrder)

        if (orderDifference !== 0) {
          return orderDifference
        }

        return Number(a.id) -
          Number(b.id)
      }),
    [brochures]
  )

  async function loadBrochures() {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi.get(
        '/homepage-brochures/admin'
      )

      setBrochures(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBrochures()
  }, [])

  useEffect(() => {
    if (!modalOpen) {
      return undefined
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    document.addEventListener(
      'keydown',
      handleEscape
    )

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      )

      document.body.style.overflow =
        previousOverflow
    }
  }, [modalOpen])

  function updateField(name, value) {
    setForm(current => ({
      ...current,
      [name]: value,
    }))
  }

  function openCreateModal() {
    setEditingId(null)

    setForm({
      ...EMPTY_FORM,
      sortOrder: brochures.length,
    })

    setActiveDevice('desktop')
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  function openEditModal(brochure) {
    setEditingId(brochure.id)

    setForm(
      normalizeBrochureForForm(
        brochure
      )
    )

    setActiveDevice('desktop')
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  function closeModal() {
    if (
      saving ||
      uploadingDesktop ||
      uploadingMobile
    ) {
      return
    }

    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function validateForm() {
    if (!form.imageUrl.trim()) {
      return t(
        'brochures.errors.desktopImageRequired'
      )
    }

    if (!form.altTextFr.trim()) {
      return t(
        'brochures.errors.altTextFrRequired'
      )
    }

    if (
      form.linkUrl.trim() &&
      !isAllowedLink(form.linkUrl)
    ) {
      return t(
        'brochures.errors.invalidLink'
      )
    }

    return ''
  }

  function isAllowedLink(value) {
    const normalized =
      String(value || '').trim()

    if (!normalized) {
      return true
    }

    if (
      normalized.startsWith('/') &&
      !normalized.startsWith('//')
    ) {
      return true
    }

    try {
      const url = new URL(normalized)

      return (
        url.protocol === 'http:' ||
        url.protocol === 'https:'
      )
    } catch {
      return false
    }
  }

  async function uploadImage(
    file,
    type
  ) {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError(
        t(
          'brochures.errors.invalidImage'
        )
      )

      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        t(
          'brochures.errors.imageTooLarge'
        )
      )

      return
    }

    const isDesktop =
      type === 'desktop'

    if (isDesktop) {
      setUploadingDesktop(true)
    } else {
      setUploadingMobile(true)
    }

    setError('')
    setSuccess('')

    try {
      const data = new FormData()
      data.append('file', file)

      const response =
        await adminApi.upload(
          '/homepage-brochures/upload-image',
          data
        )

      const uploadedUrl =
        response?.url || ''

      if (!uploadedUrl) {
        throw new Error(
          t(
            'brochures.errors.missingUploadUrl'
          )
        )
      }

      setForm(current => ({
        ...current,

        [isDesktop
          ? 'imageUrl'
          : 'mobileImageUrl']:
          uploadedUrl,
      }))

      setSuccess(
        t('brochures.uploadSuccess')
      )
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      if (isDesktop) {
        setUploadingDesktop(false)
      } else {
        setUploadingMobile(false)
      }
    }
  }

  async function submitForm(event) {
    event.preventDefault()

    const validationError =
      validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      imageUrl:
        form.imageUrl.trim(),

      mobileImageUrl:
        form.mobileImageUrl.trim() ||
        null,

      altTextFr:
        form.altTextFr.trim(),

      altTextEn:
        form.altTextEn.trim() ||
        null,

      linkUrl:
        form.linkUrl.trim() ||
        null,

      linkTarget:
        form.linkTarget,

      sortOrder:
        Math.max(
          0,
          Number(form.sortOrder) || 0
        ),

      isActive:
        Boolean(form.isActive),

      desktopFit:
        form.desktopFit,

      desktopPositionX:
        clamp(
          form.desktopPositionX,
          0,
          100
        ),

      desktopPositionY:
        clamp(
          form.desktopPositionY,
          0,
          100
        ),

      desktopZoom:
        clamp(
          form.desktopZoom,
          0.25,
          4
        ),

      mobileFit:
        form.mobileFit,

      mobilePositionX:
        clamp(
          form.mobilePositionX,
          0,
          100
        ),

      mobilePositionY:
        clamp(
          form.mobilePositionY,
          0,
          100
        ),

      mobileZoom:
        clamp(
          form.mobileZoom,
          0.25,
          4
        ),
    }

    try {
      if (editingId) {
        await adminApi.put(
          `/homepage-brochures/${editingId}`,
          payload
        )
      } else {
        await adminApi.post(
          '/homepage-brochures',
          payload
        )
      }

      setSuccess(
        editingId
          ? t('brochures.updateSuccess')
          : t('brochures.createSuccess')
      )

      setModalOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)

      await loadBrochures()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteBrochure(
    brochure
  ) {
    const confirmed = window.confirm(
      t('brochures.confirmDelete')
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await adminApi.del(
        `/homepage-brochures/${brochure.id}`
      )

      setSuccess(
        t('brochures.deleteSuccess')
      )

      await loadBrochures()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function toggleActive(
    brochure
  ) {
    setError('')
    setSuccess('')

    try {
      const updated =
        await adminApi.put(
          `/homepage-brochures/${brochure.id}`,
          {
            isActive:
              !brochure.isActive,
          }
        )

      setBrochures(current =>
        current.map(item =>
          item.id === brochure.id
            ? updated
            : item
        )
      )
    } catch (toggleError) {
      setError(toggleError.message)
    }
  }

  async function moveBrochure(
    brochureId,
    direction
  ) {
    const currentIndex =
      orderedBrochures.findIndex(
        item => item.id === brochureId
      )

    if (currentIndex < 0) {
      return
    }

    const nextIndex =
      currentIndex + direction

    if (
      nextIndex < 0 ||
      nextIndex >=
        orderedBrochures.length
    ) {
      return
    }

    const reordered = [
      ...orderedBrochures,
    ]

    const [moved] =
      reordered.splice(
        currentIndex,
        1
      )

    reordered.splice(
      nextIndex,
      0,
      moved
    )

    const normalized = reordered.map(
      (item, index) => ({
        ...item,
        sortOrder: index,
      })
    )

    setBrochures(normalized)
    setError('')
    setSuccess('')

    try {
      const updated =
        await adminApi.post(
          '/homepage-brochures/reorder',
          {
            items: normalized.map(
              (item, index) => ({
                id: item.id,
                sortOrder: index,
              })
            ),
          }
        )

      setBrochures(
        Array.isArray(updated)
          ? updated
          : normalized
      )

      setSuccess(
        t('brochures.reorderSuccess')
      )
    } catch (reorderError) {
      setError(reorderError.message)
      await loadBrochures()
    }
  }

  function resetDesktopFraming() {
    setForm(current => ({
      ...current,
      desktopFit: 'cover',
      desktopPositionX: 50,
      desktopPositionY: 50,
      desktopZoom: 1,
    }))
  }

  function resetMobileFraming() {
    setForm(current => ({
      ...current,
      mobileFit: 'cover',
      mobilePositionX: 50,
      mobilePositionY: 50,
      mobileZoom: 1,
    }))
  }

  function useDesktopImageOnMobile() {
    setForm(current => ({
      ...current,
      mobileImageUrl: '',
    }))
  }

  const displayedMobileImage =
    form.mobileImageUrl ||
    form.imageUrl

  const currentPreview =
    activeDevice === 'desktop'
      ? {
          imageUrl:
            form.imageUrl,

          fit:
            form.desktopFit,

          positionX:
            form.desktopPositionX,

          positionY:
            form.desktopPositionY,

          zoom:
            form.desktopZoom,
        }
      : {
          imageUrl:
            displayedMobileImage,

          fit:
            form.mobileFit,

          positionX:
            form.mobilePositionX,

          positionY:
            form.mobilePositionY,

          zoom:
            form.mobileZoom,
        }

  return (
    <AdminShell>
      <div className="admin-page-heading admin-page-heading-with-action">
        <div>
          <h1>
            {t('brochures.title')}
          </h1>

          <p>
            {t('brochures.subtitle')}
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={openCreateModal}
        >
          {t('brochures.create')}
        </button>
      </div>

      {error && (
        <div className="admin-feedback-error">
          {error}
        </div>
      )}

      {success && !modalOpen && (
        <div className="admin-feedback-success">
          {success}
        </div>
      )}

      <section className="admin-brochure-information">
        <div>
          <strong>
            {t(
              'brochures.information.title'
            )}
          </strong>

          <p>
            {t(
              'brochures.information.description'
            )}
          </p>
        </div>

        <span>
          {orderedBrochures.length}
        </span>
      </section>

      {loading ? (
        <div className="admin-empty-card">
          {t('common.loading')}
        </div>
      ) : orderedBrochures.length === 0 ? (
        <div className="admin-empty-card admin-brochure-empty-state">
          <span>▧</span>

          <h2>
            {t('brochures.emptyTitle')}
          </h2>

          <p>
            {t('brochures.emptyDescription')}
          </p>

          <button
            type="button"
            className="admin-primary-button"
            onClick={openCreateModal}
          >
            {t('brochures.createFirst')}
          </button>
        </div>
      ) : (
        <section className="admin-brochure-list">
          {orderedBrochures.map(
            (brochure, index) => (
              <article
                key={brochure.id}
                className="admin-brochure-card"
              >
                <div className="admin-brochure-card-image">
                  <BrochurePreview
                    device="desktop"
                    imageUrl={
                      brochure.imageUrl
                    }
                    altText={
                      brochure.altTextFr
                    }
                    fit={
                      brochure.desktopFit
                    }
                    positionX={
                      brochure.desktopPositionX
                    }
                    positionY={
                      brochure.desktopPositionY
                    }
                    zoom={
                      brochure.desktopZoom
                    }
                    emptyLabel={t(
                      'brochures.noImage'
                    )}
                  />

                  <span className="admin-brochure-order">
                    {index + 1}
                  </span>

                  <span
                    className={[
                      'admin-brochure-status',
                      brochure.isActive
                        ? 'is-active'
                        : 'is-inactive',
                    ].join(' ')}
                  >
                    {brochure.isActive
                      ? t(
                          'brochures.active'
                        )
                      : t(
                          'brochures.inactive'
                        )}
                  </span>
                </div>

                <div className="admin-brochure-card-content">
                  <div>
                    <h2>
                      {brochure.altTextFr}
                    </h2>

                    {brochure.altTextEn && (
                      <p className="admin-brochure-card-alt">
                        {brochure.altTextEn}
                      </p>
                    )}
                  </div>

                  <dl className="admin-brochure-card-details">
                    <div>
                      <dt>
                        {t(
                          'brochures.link'
                        )}
                      </dt>

                      <dd>
                        {brochure.linkUrl ||
                          t(
                            'brochures.noLink'
                          )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        {t(
                          'brochures.mobileImage'
                        )}
                      </dt>

                      <dd>
                        {brochure.mobileImageUrl
                          ? t(
                              'brochures.dedicatedMobileImage'
                            )
                          : t(
                              'brochures.sameImage'
                            )}
                      </dd>
                    </div>
                  </dl>

                  <div className="admin-brochure-card-actions">
                    <div className="admin-brochure-order-actions">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          moveBrochure(
                            brochure.id,
                            -1
                          )
                        }
                        title={t(
                          'brochures.moveUp'
                        )}
                        aria-label={t(
                          'brochures.moveUp'
                        )}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={
                          index ===
                          orderedBrochures.length -
                            1
                        }
                        onClick={() =>
                          moveBrochure(
                            brochure.id,
                            1
                          )
                        }
                        title={t(
                          'brochures.moveDown'
                        )}
                        aria-label={t(
                          'brochures.moveDown'
                        )}
                      >
                        ↓
                      </button>
                    </div>

                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() =>
                        toggleActive(
                          brochure
                        )
                      }
                    >
                      {brochure.isActive
                        ? t(
                            'brochures.deactivate'
                          )
                        : t(
                            'brochures.activate'
                          )}
                    </button>

                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() =>
                        openEditModal(
                          brochure
                        )
                      }
                    >
                      {t('common.edit')}
                    </button>

                    <button
                      type="button"
                      className="admin-danger-button"
                      onClick={() =>
                        deleteBrochure(
                          brochure
                        )
                      }
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </article>
            )
          )}
        </section>
      )}

      {modalOpen && (
        <div
          className="admin-brochure-modal-overlay"
          role="presentation"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal()
            }
          }}
        >
          <section
            className="admin-brochure-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-brochure-modal-title"
          >
            <header className="admin-brochure-modal-header">
              <div>
                <h2 id="admin-brochure-modal-title">
                  {editingId
                    ? t(
                        'brochures.editTitle'
                      )
                    : t(
                        'brochures.createTitle'
                      )}
                </h2>

                <p>
                  {t(
                    'brochures.modalSubtitle'
                  )}
                </p>
              </div>

              <button
                type="button"
                className="admin-brochure-modal-close"
                onClick={closeModal}
                aria-label={t(
                  'common.close'
                )}
              >
                ×
              </button>
            </header>

            <form
              className="admin-brochure-modal-body"
              onSubmit={submitForm}
            >
              {error && (
                <div className="admin-feedback-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="admin-feedback-success">
                  {success}
                </div>
              )}

              <div className="admin-brochure-editor-layout">
                <div className="admin-brochure-editor-settings">
                  <section className="admin-brochure-form-section">
                    <div className="admin-brochure-form-section-heading">
                      <div>
                        <h3>
                          {t(
                            'brochures.images'
                          )}
                        </h3>

                        <p>
                          {t(
                            'brochures.imagesHelp'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="admin-brochure-upload-grid">
                      <label className="admin-brochure-upload">
                        <span>
                          {t(
                            'brochures.desktopImage'
                          )}
                        </span>

                        <strong>
                          {uploadingDesktop
                            ? t(
                                'brochures.uploading'
                              )
                            : t(
                                'brochures.chooseImage'
                              )}
                        </strong>

                        <small>
                          {t(
                            'brochures.desktopFormat'
                          )}
                        </small>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          disabled={
                            uploadingDesktop
                          }
                          onChange={event => {
                            uploadImage(
                              event
                                .target
                                .files?.[0],
                              'desktop'
                            )

                            event.target.value =
                              ''
                          }}
                        />
                      </label>

                      <label className="admin-brochure-upload">
                        <span>
                          {t(
                            'brochures.mobileImage'
                          )}
                        </span>

                        <strong>
                          {uploadingMobile
                            ? t(
                                'brochures.uploading'
                              )
                            : t(
                                'brochures.chooseImage'
                              )}
                        </strong>

                        <small>
                          {t(
                            'brochures.mobileFormat'
                          )}
                        </small>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          disabled={
                            uploadingMobile
                          }
                          onChange={event => {
                            uploadImage(
                              event
                                .target
                                .files?.[0],
                              'mobile'
                            )

                            event.target.value =
                              ''
                          }}
                        />
                      </label>
                    </div>

                    {form.mobileImageUrl && (
                      <button
                        type="button"
                        className="admin-text-button"
                        onClick={
                          useDesktopImageOnMobile
                        }
                      >
                        {t(
                          'brochures.useDesktopOnMobile'
                        )}
                      </button>
                    )}
                  </section>

                  <section className="admin-brochure-form-section">
                    <div className="admin-brochure-form-section-heading">
                      <div>
                        <h3>
                          {t(
                            'brochures.accessibility'
                          )}
                        </h3>

                        <p>
                          {t(
                            'brochures.accessibilityHelp'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="admin-brochure-fields-grid">
                      <label className="admin-brochure-field">
                        <span>
                          {t(
                            'brochures.altTextFr'
                          )}
                          <em>*</em>
                        </span>

                        <input
                          type="text"
                          maxLength={255}
                          required
                          value={
                            form.altTextFr
                          }
                          onChange={event =>
                            updateField(
                              'altTextFr',
                              event.target
                                .value
                            )
                          }
                        />
                      </label>

                      <label className="admin-brochure-field">
                        <span>
                          {t(
                            'brochures.altTextEn'
                          )}
                        </span>

                        <input
                          type="text"
                          maxLength={255}
                          value={
                            form.altTextEn
                          }
                          onChange={event =>
                            updateField(
                              'altTextEn',
                              event.target
                                .value
                            )
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <section className="admin-brochure-form-section">
                    <div className="admin-brochure-form-section-heading">
                      <div>
                        <h3>
                          {t(
                            'brochures.navigation'
                          )}
                        </h3>

                        <p>
                          {t(
                            'brochures.navigationHelp'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="admin-brochure-fields-grid">
                      <label className="admin-brochure-field admin-brochure-field-wide">
                        <span>
                          {t(
                            'brochures.linkUrl'
                          )}
                        </span>

                        <input
                          type="text"
                          value={
                            form.linkUrl
                          }
                          placeholder="/shop?rubrique=Mobilier"
                          onChange={event =>
                            updateField(
                              'linkUrl',
                              event.target
                                .value
                            )
                          }
                        />
                      </label>

                      <label className="admin-brochure-field">
                        <span>
                          {t(
                            'brochures.linkTarget'
                          )}
                        </span>

                        <select
                          value={
                            form.linkTarget
                          }
                          onChange={event =>
                            updateField(
                              'linkTarget',
                              event.target
                                .value
                            )
                          }
                        >
                          <option value="_self">
                            {t(
                              'brochures.sameTab'
                            )}
                          </option>

                          <option value="_blank">
                            {t(
                              'brochures.newTab'
                            )}
                          </option>
                        </select>
                      </label>

                      <label className="admin-brochure-toggle">
                        <input
                          type="checkbox"
                          checked={
                            form.isActive
                          }
                          onChange={event =>
                            updateField(
                              'isActive',
                              event.target
                                .checked
                            )
                          }
                        />

                        <span>
                          <strong>
                            {t(
                              'brochures.activeLabel'
                            )}
                          </strong>

                          <small>
                            {t(
                              'brochures.activeHelp'
                            )}
                          </small>
                        </span>
                      </label>
                    </div>
                  </section>
                </div>

                <div className="admin-brochure-editor-preview-column">
                  <section className="admin-brochure-preview-panel">
                    <div className="admin-brochure-device-tabs">
                      <button
                        type="button"
                        className={
                          activeDevice ===
                          'desktop'
                            ? 'is-active'
                            : ''
                        }
                        onClick={() =>
                          setActiveDevice(
                            'desktop'
                          )
                        }
                      >
                        {t(
                          'brochures.desktop'
                        )}
                      </button>

                      <button
                        type="button"
                        className={
                          activeDevice ===
                          'mobile'
                            ? 'is-active'
                            : ''
                        }
                        onClick={() =>
                          setActiveDevice(
                            'mobile'
                          )
                        }
                      >
                        {t(
                          'brochures.mobile'
                        )}
                      </button>
                    </div>

                    <div className="admin-brochure-preview-stage">
                      <BrochurePreview
                        device={
                          activeDevice
                        }
                        imageUrl={
                          currentPreview.imageUrl
                        }
                        altText={
                          form.altTextFr
                        }
                        fit={
                          currentPreview.fit
                        }
                        positionX={
                          currentPreview.positionX
                        }
                        positionY={
                          currentPreview.positionY
                        }
                        zoom={
                          currentPreview.zoom
                        }
                        emptyLabel={t(
                          'brochures.previewEmpty'
                        )}
                      />
                    </div>

                    <div className="admin-brochure-framing-controls">
                      {activeDevice ===
                      'desktop' ? (
                        <>
                          <label className="admin-brochure-field">
                            <span>
                              {t(
                                'brochures.imageFit'
                              )}
                            </span>

                            <select
                              value={
                                form.desktopFit
                              }
                              onChange={event =>
                                updateField(
                                  'desktopFit',
                                  event.target
                                    .value
                                )
                              }
                            >
                              <option value="cover">
                                {t(
                                  'brochures.cover'
                                )}
                              </option>

                              <option value="contain">
                                {t(
                                  'brochures.contain'
                                )}
                              </option>
                            </select>
                          </label>

                          <RangeField
                            label={t(
                              'brochures.horizontalPosition'
                            )}
                            value={
                              form.desktopPositionX
                            }
                            min={0}
                            max={100}
                            step={1}
                            suffix="%"
                            onChange={value =>
                              updateField(
                                'desktopPositionX',
                                value
                              )
                            }
                          />

                          <RangeField
                            label={t(
                              'brochures.verticalPosition'
                            )}
                            value={
                              form.desktopPositionY
                            }
                            min={0}
                            max={100}
                            step={1}
                            suffix="%"
                            onChange={value =>
                              updateField(
                                'desktopPositionY',
                                value
                              )
                            }
                          />

                          <RangeField
                            label={t(
                              'brochures.zoom'
                            )}
                            value={
                              form.desktopZoom
                            }
                            min={0.25}
                            max={4}
                            step={0.05}
                            suffix="×"
                            onChange={value =>
                              updateField(
                                'desktopZoom',
                                value
                              )
                            }
                          />

                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={
                              resetDesktopFraming
                            }
                          >
                            {t(
                              'brochures.resetFraming'
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <label className="admin-brochure-field">
                            <span>
                              {t(
                                'brochures.imageFit'
                              )}
                            </span>

                            <select
                              value={
                                form.mobileFit
                              }
                              onChange={event =>
                                updateField(
                                  'mobileFit',
                                  event.target
                                    .value
                                )
                              }
                            >
                              <option value="cover">
                                {t(
                                  'brochures.cover'
                                )}
                              </option>

                              <option value="contain">
                                {t(
                                  'brochures.contain'
                                )}
                              </option>
                            </select>
                          </label>

                          <RangeField
                            label={t(
                              'brochures.horizontalPosition'
                            )}
                            value={
                              form.mobilePositionX
                            }
                            min={0}
                            max={100}
                            step={1}
                            suffix="%"
                            onChange={value =>
                              updateField(
                                'mobilePositionX',
                                value
                              )
                            }
                          />

                          <RangeField
                            label={t(
                              'brochures.verticalPosition'
                            )}
                            value={
                              form.mobilePositionY
                            }
                            min={0}
                            max={100}
                            step={1}
                            suffix="%"
                            onChange={value =>
                              updateField(
                                'mobilePositionY',
                                value
                              )
                            }
                          />

                          <RangeField
                            label={t(
                              'brochures.zoom'
                            )}
                            value={
                              form.mobileZoom
                            }
                            min={0.25}
                            max={4}
                            step={0.05}
                            suffix="×"
                            onChange={value =>
                              updateField(
                                'mobileZoom',
                                value
                              )
                            }
                          />

                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={
                              resetMobileFraming
                            }
                          >
                            {t(
                              'brochures.resetFraming'
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <footer className="admin-brochure-modal-footer">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={closeModal}
                  disabled={
                    saving ||
                    uploadingDesktop ||
                    uploadingMobile
                  }
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={
                    saving ||
                    uploadingDesktop ||
                    uploadingMobile
                  }
                >
                  {saving
                    ? t(
                        'brochures.saving'
                      )
                    : t(
                        'common.save'
                      )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  )
}