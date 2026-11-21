import { act, renderHook } from '@testing-library/react'
import useOnline from '../../src/hooks/useOnline'

// Here I test the hook that tells a page when the internet goes off and on

// Here I pretend the internet changed, the same way the browser tells the page
function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
  act(() => window.dispatchEvent(new Event(value ? 'online' : 'offline')))
}

afterEach(() => Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }))

test('starts with the current state of the browser', () => {
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
  const { result } = renderHook(() => useOnline())
  expect(result.current).toBe(false)
})

test('follows the internet going off and on', () => {
  const { result } = renderHook(() => useOnline())
  setOnline(false)
  expect(result.current).toBe(false)
  setOnline(true)
  expect(result.current).toBe(true)
})

// Here I check the hook stops listening when the page closes, or it would leak memory
test('removes its listeners when the page closes', () => {
  const remove = vi.spyOn(window, 'removeEventListener')
  const { unmount } = renderHook(() => useOnline())
  unmount()
  expect(remove).toHaveBeenCalledWith('online', expect.any(Function))
  expect(remove).toHaveBeenCalledWith('offline', expect.any(Function))
})
