'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../lib/adminApi'
import { useAdminI18n } from '../i18n/AdminI18nProvider'

const CONTACT_STATUSES = [
  'new',
  'to_contact',
  'contacted',
  'qualified',
  'converted',
  'closed',
  'unreachable',
]

export default function AdminContacts() {
  const { t, locale } = useAdminI18n()

  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (statusFilter) {
        params.set('status', statusFilter)
      }

      if (search.trim()) {
        params.set('search', search.trim())
      }

      const query = params.toString()
      const data = await adminApi.get(
        `/contacts${query ? `?${query}` : ''}`
      )

      setContacts(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  const counts = useMemo(() => {
    return contacts.reduce(
      (result, contact) => {
        result.total += 1
        result[contact.status] =
          (result[contact.status] || 0) + 1

        return result
      },
      {
        total: 0,
      }
    )
  }, [contacts])

  async function updateContact(contact, patch) {
    setSavingId(contact.id)
    setError('')

    try {
      const updated = await adminApi.patch(
        `/contacts/${contact.id}`,
        patch
      )

      setContacts(current =>
        current.map(item =>
          item.id === contact.id
            ? updated
            : item
        )
      )

      setSelectedContact(current =>
        current?.id === contact.id
          ? updated
          : current
      )
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setSavingId(null)
    }
  }

  function formatDate(value) {
    if (!value) return '-'

    return new Intl.DateTimeFormat(
      locale === 'en' ? 'en-GB' : 'fr-FR',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    ).format(new Date(value))
  }

  return (
    <AdminShell>
      <div className="admin-page-heading">
        <div>
          <h1>{t('contacts.title')}</h1>
          <p>{t('contacts.subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="admin-feedback-error">
          {error}
        </div>
      )}

      <section className="admin-contact-stats">
        <div>
          <span>{t('contacts.total')}</span>
          <strong>{counts.total}</strong>
        </div>

        <div>
          <span>{t('contacts.new')}</span>
          <strong>{counts.new || 0}</strong>
        </div>

        <div>
          <span>{t('contacts.toContact')}</span>
          <strong>{counts.to_contact || 0}</strong>
        </div>

        <div>
          <span>{t('contacts.converted')}</span>
          <strong>{counts.converted || 0}</strong>
        </div>
      </section>

      <section className="admin-contact-filters">
        <input
          type="search"
          value={search}
          onChange={event =>
            setSearch(event.target.value)
          }
          onKeyDown={event => {
            if (event.key === 'Enter') {
              load()
            }
          }}
          placeholder={t('common.search')}
        />

        <select
          value={statusFilter}
          onChange={event =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="">
            {t('contacts.allStatuses')}
          </option>

          {CONTACT_STATUSES.map(status => (
            <option key={status} value={status}>
              {t(`contacts.statuses.${status}`)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={load}
        >
          {t('common.search')}
        </button>
      </section>

      {loading ? (
        <div className="admin-empty-card">
          {t('common.loading')}
        </div>
      ) : contacts.length === 0 ? (
        <div className="admin-empty-card">
          {t('common.empty')}
        </div>
      ) : (
        <section className="admin-contact-list">
          {contacts.map(contact => (
            <article
              key={contact.id}
              className="admin-contact-card"
            >
              <div className="admin-contact-card-header">
                <div>
                  <strong>{contact.name}</strong>
                  <span>{formatDate(contact.created_at)}</span>
                </div>

                <span
                  className={`admin-contact-status status-${contact.status}`}
                >
                  {t(`contacts.statuses.${contact.status}`)}
                </span>
              </div>

              <div className="admin-contact-coordinates">
                <a href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>

                {contact.phone && (
                  <a href={`tel:${contact.phone}`}>
                    {contact.phone}
                  </a>
                )}
              </div>

              <h3>
                {contact.subject ||
                  t('contacts.noSubject')}
              </h3>

              <p className="admin-contact-message">
                {contact.message}
              </p>

              {contact.next_action_at && (
                <p className="admin-contact-next-action">
                  <strong>
                    {t('contacts.nextAction')} :
                  </strong>{' '}
                  {formatDate(contact.next_action_at)}
                </p>
              )}

              <div className="admin-contact-actions">
                <select
                  value={contact.status}
                  disabled={savingId === contact.id}
                  onChange={event =>
                    updateContact(contact, {
                      status: event.target.value,
                      note: t('contacts.automaticStatusNote'),
                    })
                  }
                >
                  {CONTACT_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {t(`contacts.statuses.${status}`)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedContact(contact)
                  }
                >
                  {t('contacts.open')}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedContact && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setSelectedContact(null)
            }
          }}
        >
          <div className="admin-contact-modal">
            <div className="admin-modal-header">
              <div>
                <h2>{selectedContact.name}</h2>
                <p>{selectedContact.email}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedContact(null)
                }
              >
                ×
              </button>
            </div>

            <ContactEditor
              contact={selectedContact}
              saving={savingId === selectedContact.id}
              t={t}
              formatDate={formatDate}
              onSave={patch =>
                updateContact(
                  selectedContact,
                  patch
                )
              }
            />
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function ContactEditor({
  contact,
  saving,
  t,
  formatDate,
  onSave,
}) {
  const [status, setStatus] =
    useState(contact.status)

  const [adminNotes, setAdminNotes] =
    useState(contact.admin_notes || '')

  const [note, setNote] =
    useState('')

  const [nextActionAt, setNextActionAt] =
    useState(
      contact.next_action_at
        ? new Date(contact.next_action_at)
            .toISOString()
            .slice(0, 16)
        : ''
    )

  return (
    <div className="admin-contact-editor">
      <div className="admin-contact-editor-message">
        <h3>
          {contact.subject ||
            t('contacts.noSubject')}
        </h3>

        <p>{contact.message}</p>
      </div>

      <label>
        <span>{t('contacts.status')}</span>

        <select
          value={status}
          onChange={event =>
            setStatus(event.target.value)
          }
        >
          {CONTACT_STATUSES.map(value => (
            <option key={value} value={value}>
              {t(`contacts.statuses.${value}`)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>{t('contacts.nextAction')}</span>

        <input
          type="datetime-local"
          value={nextActionAt}
          onChange={event =>
            setNextActionAt(event.target.value)
          }
        />
      </label>

      <label>
        <span>{t('contacts.internalNotes')}</span>

        <textarea
          rows="4"
          value={adminNotes}
          onChange={event =>
            setAdminNotes(event.target.value)
          }
        />
      </label>

      <label>
        <span>{t('contacts.historyNote')}</span>

        <textarea
          rows="3"
          value={note}
          onChange={event =>
            setNote(event.target.value)
          }
        />
      </label>

      <div className="admin-contact-history">
        <h3>{t('contacts.history')}</h3>

        {contact.history?.length ? (
          contact.history.map(history => (
            <article key={history.id}>
              <strong>
                {history.status
                  ? t(
                      `contacts.statuses.${history.status}`
                    )
                  : '-'}
              </strong>

              <span>
                {formatDate(history.created_at)}
              </span>

              {history.note && (
                <p>{history.note}</p>
              )}
            </article>
          ))
        ) : (
          <p>{t('common.empty')}</p>
        )}
      </div>

      <button
        type="button"
        className="admin-contact-save"
        disabled={saving}
        onClick={() =>
          onSave({
            status,
            admin_notes: adminNotes,
            next_action_at:
              nextActionAt || null,
            note,
            is_read: true,
          })
        }
      >
        {saving
          ? t('common.loading')
          : t('common.save')}
      </button>
    </div>
  )
}