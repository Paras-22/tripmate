import { useState } from 'react'

// Here I made one form wrapper for trips and activities.
// It reads the inputs with FormData, so the forms do not need a state for every field.
export default function Form({ title, onSubmit, onCancel, children }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(Object.fromEntries(new FormData(event.target)))
    } catch (err) {
      setError(err.status ? err.message : 'Could not save. Check your connection.')
      setSaving(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{title}</h2>
      {children}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="plain" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
