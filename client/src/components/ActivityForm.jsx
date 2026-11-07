import Form from './Form'

// Here I use the same form to add and to edit an activity.
// The min and max keep the date inside the trip.
export default function ActivityForm({ trip, activity = {}, onSubmit, onCancel }) {
  return (
    <Form title={activity._id ? 'Edit activity' : 'Add activity'} onSubmit={onSubmit} onCancel={onCancel}>
      <label>
        What is happening?
        <input name="title" defaultValue={activity.title} maxLength={120} required />
      </label>
      <div className="row">
        <label>
          Date
          <input
            type="date"
            name="date"
            min={trip.startDate}
            max={trip.endDate}
            defaultValue={activity.date || trip.startDate}
            required
          />
        </label>
        <label>
          Time
          <input type="time" name="time" defaultValue={activity.time} />
        </label>
      </div>
      <label>
        Type
        <select name="type" defaultValue={activity.type || 'other'}>
          <option value="flight">Flight</option>
          <option value="hotel">Hotel</option>
          <option value="tour">Tour</option>
          <option value="meal">Meal</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Location
        <input name="location" defaultValue={activity.location} maxLength={120} />
      </label>
      <label>
        Notes
        <textarea name="notes" defaultValue={activity.notes} maxLength={500} rows={3} />
      </label>
    </Form>
  )
}
