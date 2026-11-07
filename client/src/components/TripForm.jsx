import Form from './Form'

// Here I use the same form to create and to edit a trip
export default function TripForm({ trip = {}, onSubmit, onCancel }) {
  return (
    <Form title={trip._id ? 'Edit trip' : 'New trip'} onSubmit={onSubmit} onCancel={onCancel}>
      <label>
        Trip name
        <input name="title" defaultValue={trip.title} maxLength={100} required />
      </label>
      <label>
        Destination
        <input name="destination" defaultValue={trip.destination} maxLength={100} required />
      </label>
      <div className="row">
        <label>
          Start date
          <input type="date" name="startDate" defaultValue={trip.startDate} required />
        </label>
        <label>
          End date
          <input type="date" name="endDate" defaultValue={trip.endDate} required />
        </label>
      </div>
    </Form>
  )
}
