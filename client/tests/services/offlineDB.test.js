import 'fake-indexeddb/auto'
import { clearOffline, loadOffline, saveOffline } from '../../src/services/offlineDB'

// Here I test the IndexedDB store that keeps the trips for offline use.
// fake-indexeddb gives the tests a real IndexedDB that lives in memory.

beforeEach(() => clearOffline())

test('saves an answer and loads it back by its key', async () => {
  await saveOffline('/trips/1', { title: 'Japan' })
  expect(await loadOffline('/trips/1')).toEqual({ title: 'Japan' })
})

// Here I check saving the same key again replaces the old copy, so the phone keeps the newest plan
test('saving the same key again keeps only the newest copy', async () => {
  await saveOffline('/trips/1', { title: 'Old plan' })
  await saveOffline('/trips/1', { title: 'New plan' })
  expect(await loadOffline('/trips/1')).toEqual({ title: 'New plan' })
})

test('gives undefined for a key that was never saved', async () => {
  expect(await loadOffline('/trips/unknown')).toBeUndefined()
})

test('keeps different trips apart', async () => {
  await saveOffline('/trips/1', { title: 'Japan' })
  await saveOffline('/trips/2', { title: 'Bali' })
  expect((await loadOffline('/trips/2')).title).toBe('Bali')
})

// Here I test clear, which I use on sign out
test('clear removes everything that was saved', async () => {
  await saveOffline('/trips/1', { title: 'Japan' })
  await saveOffline('/trips', [{ title: 'Japan' }])
  await clearOffline()
  expect(await loadOffline('/trips/1')).toBeUndefined()
  expect(await loadOffline('/trips')).toBeUndefined()
})
