import { validateActivity, validateInviteCode, validateTrip } from '../../src/utils/validation'

// Here I test the form rules. Each rule gives back an object of field errors,
// and an empty object means the form is correct.

const goodTrip = { title: 'Japan', destination: 'Tokyo', startDate: '2027-01-10', endDate: '2027-01-15' }
const trip = { startDate: '2027-01-10', endDate: '2027-01-15' }

describe('validateTrip', () => {
  test('a correct trip has no errors', () => {
    expect(validateTrip(goodTrip)).toEqual({})
  })

  // Here typing only spaces must not count as a name
  test('a trip needs a name and destination, and spaces alone do not count', () => {
    const errors = validateTrip({ ...goodTrip, title: '   ', destination: '' })
    expect(errors.title).toBe('Please enter a trip name')
    expect(errors.destination).toBe('Please enter where you are going')
  })

  test('a trip needs both dates', () => {
    const errors = validateTrip({ ...goodTrip, startDate: '', endDate: '' })
    expect(errors.startDate).toBe('Please pick a start date')
    expect(errors.endDate).toBe('Please pick an end date')
  })

  // Here a one-day trip is allowed, so the same start and end date is fine
  test('a trip cannot end before it starts, but can be one day', () => {
    expect(validateTrip({ ...goodTrip, endDate: '2027-01-09' }).endDate).toBe(
      'End date must be on or after the start date',
    )
    expect(validateTrip({ ...goodTrip, endDate: '2027-01-10' })).toEqual({})
  })

  // Here the limit is the same as the server, so the two never disagree
  test('a trip name longer than 100 characters is stopped', () => {
    expect(validateTrip({ ...goodTrip, title: 'a'.repeat(101) }).title).toMatch(/100 characters/)
    expect(validateTrip({ ...goodTrip, title: 'a'.repeat(100) })).toEqual({})
  })
})

describe('validateActivity', () => {
  const activity = { title: 'Flight', date: '2027-01-10', time: '09:30' }

  test('a correct activity has no errors', () => {
    expect(validateActivity(activity, trip)).toEqual({})
  })

  // Here the first and last day of the trip are both allowed
  test('an activity must be on a day of the trip', () => {
    expect(validateActivity({ ...activity, date: '2027-01-15' }, trip)).toEqual({})
    expect(validateActivity({ ...activity, date: '2027-01-16' }, trip).date).toBe(
      'Pick a date between 2027-01-10 and 2027-01-15',
    )
    expect(validateActivity({ ...activity, date: '2027-01-09' }, trip).date).toMatch(/Pick a date between/)
  })

  test('an activity needs a title and short notes', () => {
    const errors = validateActivity({ title: '', date: '2027-01-11', notes: 'x'.repeat(501) }, trip)
    expect(errors.title).toBe('Please say what is happening')
    expect(errors.notes).toMatch(/500 characters/)
  })

  // Here the time is optional, but when it is there it must look like 09:30
  test('the time is optional but must be HH:MM', () => {
    expect(validateActivity({ ...activity, time: '' }, trip)).toEqual({})
    expect(validateActivity({ ...activity, time: '9am' }, trip).time).toBeTruthy()
  })
})

describe('validateInviteCode', () => {
  // Here small letters are fine, because the server changes the code to capitals
  test('invite codes must be 8 letters and numbers', () => {
    expect(validateInviteCode('a1b2c3d4')).toBe('')
    expect(validateInviteCode('')).toBe('Please type the invite code from the organiser')
    expect(validateInviteCode('ABC')).toMatch(/8 letters and numbers/)
    expect(validateInviteCode('ZZZZZZZZ')).toMatch(/8 letters and numbers/)
  })
})
