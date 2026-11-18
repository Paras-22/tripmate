import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Form, { FieldError } from '../../src/components/Form'

// Here I test the shared Form wrapper that TripForm and ActivityForm both use

// Here a small form with one field is enough to test the wrapper
function showForm({ validate, onSubmit = vi.fn(async () => {}), onCancel = vi.fn() } = {}) {
  render(
    <Form title="Test form" validate={validate} onSubmit={onSubmit} onCancel={onCancel}>
      <label>
        Name
        <input name="name" defaultValue="Japan" />
        <FieldError name="name" />
      </label>
    </Form>,
  )
  return { onSubmit, onCancel }
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))

test('shows the title', () => {
  showForm()
  expect(screen.getByRole('heading', { name: 'Test form' })).toBeTruthy()
})

// Here the form reads the inputs with FormData, so no state is needed for each field
test('sends the values of the inputs when saved', async () => {
  const { onSubmit } = showForm()
  save()
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Japan' }))
})

test('shows the error under the field and does not save when a rule fails', async () => {
  const { onSubmit } = showForm({ validate: () => ({ name: 'Name is wrong' }) })
  save()
  expect(await screen.findByText('Name is wrong')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
})

// Here the button changes while saving, so the user cannot save twice
test('shows Saving... while it waits for the server', async () => {
  showForm({ onSubmit: () => new Promise(() => {}) }) // a save that never finishes
  save()
  const button = await screen.findByRole('button', { name: 'Saving...' })
  expect(button.disabled).toBe(true)
})

test('shows the server message when the server says no', async () => {
  showForm({
    onSubmit: async () => {
      throw Object.assign(new Error('Only the organiser can do this'), { status: 403 })
    },
  })
  save()
  expect(await screen.findByText('Only the organiser can do this')).toBeTruthy()
})

// Here an error with no status means the server was not reached
test('asks the user to check the connection when the server cannot be reached', async () => {
  showForm({
    onSubmit: async () => {
      throw new TypeError('Failed to fetch')
    },
  })
  save()
  expect(await screen.findByText('Could not save. Check your connection.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Save' }).disabled).toBe(false)
})

test('calls onCancel when Cancel is clicked', () => {
  const { onCancel, onSubmit } = showForm()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onCancel).toHaveBeenCalled()
  expect(onSubmit).not.toHaveBeenCalled()
})
