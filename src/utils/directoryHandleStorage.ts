/**
 * Utility for persisting FileSystemDirectoryHandle using IndexedDB
 * localStorage cannot store FileSystemDirectoryHandle as it only supports JSON-serializable data
 */

const DB_NAME = 'work-notes-storage'
const DB_VERSION = 1
const STORE_NAME = 'file-system'
const DIRECTORY_HANDLE_KEY = 'directory-handle'

/**
 * Opens the IndexedDB database
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Saves a directory handle to IndexedDB
 */
export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(handle, DIRECTORY_HANDLE_KEY)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Loads a directory handle from IndexedDB
 * Returns null if no handle is stored or if permissions have been lost
 */
export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    const handle = await new Promise<FileSystemDirectoryHandle | undefined>(
      (resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(DIRECTORY_HANDLE_KEY)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      },
    )

    if (!handle) {
      return null
    }

    // Verify we still have permission to the directory
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') {
      return handle
    }

    // Try to request permission
    const requestedPermission = await handle.requestPermission({ mode: 'readwrite' })
    if (requestedPermission === 'granted') {
      return handle
    }

    // Permission denied, clear the stored handle
    await clearDirectoryHandle()
    return null
  } catch (error) {
    console.error('Failed to load directory handle:', error)
    return null
  }
}

/**
 * Clears the stored directory handle from IndexedDB
 */
export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(DIRECTORY_HANDLE_KEY)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('Failed to clear directory handle:', error)
  }
}

/**
 * Checks if a directory handle is currently stored
 */
export async function hasStoredDirectoryHandle(): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(DIRECTORY_HANDLE_KEY)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result !== undefined)
    })
  } catch (error) {
    console.error('Failed to check for directory handle:', error)
    return false
  }
}
