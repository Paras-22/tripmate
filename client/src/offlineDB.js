// Here I did the IndexedDB code. It is one small store of saved API answers.
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tripmate', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('saved')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Here I run one read or write and wait for the result
async function run(mode, action) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const request = action(db.transaction('saved', mode).objectStore('saved'))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const saveOffline = (key, value) => run('readwrite', (store) => store.put(value, key))
export const loadOffline = (key) => run('readonly', (store) => store.get(key))
export const clearOffline = () => run('readwrite', (store) => store.clear())
