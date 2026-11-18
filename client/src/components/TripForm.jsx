import Form, { FieldError } from './Form'
import { validateTrip } from '../utils/validation'

// Here I use the same form to create and to edit a trip
export default function TripForm({ trip = {}, onSubmit, onCancel }) {
  return (
    <Form
      title={trip._id ? 'Edit trip' : 'New trip'}
      validate={validateTrip}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <label>
        Trip name
        <input name="title" defaultValue={trip.title} maxLength={100} required />
        <FieldError name="title" />
      </label>
      <label>
        Destination
        <input name="destination" defaultValue={trip.destination} maxLength={100} required />
        <FieldError name="destination" />
      </label>
      <div className="row">
        <label>
          Start date
          <input type="date" name="startDate" defaultValue={trip.startDate} required />
          <FieldError name="startDate" />
        </label>
        <label>
          End date
          <input type="date" name="endDate" defaultValue={trip.endDate} required />
          <FieldError name="endDate" />
        </label>
      </div>
    </Form>
  )
}
