import { createContext, useContext, useState } from 'react'

// Here I share the form's field errors with the FieldError messages inside it
const ErrorsContext = createContext({})

// Here I show the message for one field, right under its input
export function FieldError({ name }) {
  const message = useContext(ErrorsContext)[name]
  return message ? <span className="field-error" role="alert">{message}</span> : null
}

// Here I made one form wrapper for trips and activities.
// It reads the inputs with FormData, so the forms do not need a state for every field.
// Before saving it runs the validate function and stops if any field is wrong.
export default function Form({ title, validate = () => ({}), onSubmit, onCancel, children }) {
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.target))
    const errors = validate(values)
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length) return

    setSaving(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err.status ? err.message : 'Could not save. Check your connection.')
      setSaving(false)
    }
  }

  // Here I use noValidate to turn off the browser bubbles, so every message comes from my rules
  return (
    <ErrorsContext.Provider value={fieldErrors}>
      <form className="card form" onSubmit={handleSubmit} noValidate>
        <h2>{title}</h2>
        {children}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" className="plain" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </ErrorsContext.Provider>
  )
}
