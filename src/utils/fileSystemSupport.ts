/**
 * Utility functions for checking File System Access API support
 */

/**
 * Checks if the File System Access API is supported in the current browser
 * @returns true if the API is available, false otherwise
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Gets a human-readable message about File System Access API support
 * @returns Object with support status and message
 */
export function getFileSystemSupportInfo(): {
  supported: boolean
  message: string
  browserHint?: string
} {
  const supported = isFileSystemAccessSupported()

  if (supported) {
    return {
      supported: true,
      message: 'Your browser supports file storage.',
    }
  }

  // Detect browser type for helpful hint
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  let browserHint: string | undefined

  if (userAgent.includes('Firefox')) {
    browserHint = 'File storage is not yet supported in Firefox. Try Chrome, Edge, or Opera.'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserHint = 'File storage is not yet supported in Safari. Try Chrome, Edge, or Opera.'
  } else {
    browserHint =
      'File storage requires a Chromium-based browser (Chrome, Edge, Opera, or Brave).'
  }

  return {
    supported: false,
    message: 'File storage is not supported in your browser.',
    browserHint,
  }
}
