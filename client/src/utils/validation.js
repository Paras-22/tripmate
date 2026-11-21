// Here I keep all the form rules in one place. Each function gets the form values
// and gives back an object like { title: 'Please enter a trip name' }.
// An empty object means the form is fine. The server checks the same rules again,
// because anything from the browser can be changed.

const clean = (value) => String(value ?? '').trim()

export function validateTrip(values) {
  const errors = {}
  const title = clean(values.title)
  const destination = clean(values.destination)

  if (!title) errors.title = 'Please enter a trip name'
  else if (title.length > 100) errors.title = 'Trip name must be 100 characters or less'

  if (!destination) errors.destination = 'Please enter where you are going'
  else if (destination.length > 100) errors.destination = 'Destination must be 100 characters or less'

  if (!values.startDate) errors.startDate = 'Please pick a start date'
  if (!values.endDate) errors.endDate = 'Please pick an end date'
  else if (values.startDate && values.endDate < values.startDate) {
    errors.endDate = 'End date must be on or after the start date'
  }
  return errors
}

export function validateActivity(values, trip) {
  const errors = {}
  const title = clean(values.title)

  if (!title) errors.title = 'Please say what is happening'
  else if (title.length > 120) errors.title = 'This must be 120 characters or less'

  // Here I make sure the date is inside the trip, so an activity never shows on a missing day
  if (!values.date) errors.date = 'Please pick a date'
  else if (values.date < trip.startDate || values.date > trip.endDate) {
    errors.date = `Pick a date between ${trip.startDate} and ${trip.endDate}`
  }

  if (values.time && !/^\d{2}:\d{2}$/.test(values.time)) errors.time = 'Please use a time like 09:30'
  if (clean(values.location).length > 120) errors.location = 'Location must be 120 characters or less'
  if (clean(values.notes).length > 500) errors.notes = 'Notes must be 500 characters or less'
  return errors
}

// Here I check the invite code looks like the codes my server makes: 8 letters and numbers
export function validateInviteCode(code) {
  const value = clean(code)
  if (!value) return 'Please type the invite code from the organiser'
  if (!/^[A-F0-9]{8}$/i.test(value)) return 'Invite codes have 8 letters and numbers, like A1B2C3D4'
  return ''
}
