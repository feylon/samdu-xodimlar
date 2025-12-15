import type { UploadedFile } from '~/types/api'

export type FileCategory = 'PHOTO' | 'PASSPORT' | 'LOGO' | 'DOCUMENT'

export const useFiles = () => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const fileBase = config.public.fileBase

  const contentUrl = (fileId: string | null | undefined, withToken = false): string | null => {
    if (!fileId) return null
    const url = `${fileBase}/files/${fileId}/content`
    return withToken && auth.accessToken ? `${url}?token=${encodeURIComponent(auth.accessToken)}` : url
  }

  const upload = (file: File, category: FileCategory, onProgress?: (ratio: number) => void, ownerUserId?: string): Promise<UploadedFile> =>
    new Promise((resolve, reject) => {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      if (ownerUserId) form.append('ownerUserId', ownerUserId)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${fileBase}/files/upload`)
      if (auth.accessToken) xhr.setRequestHeader('Authorization', `Bearer ${auth.accessToken}`)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total)
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as UploadedFile)
          } catch {
            reject(new ApiError(xhr.status, 'FILE_UPLOAD_FAILED'))
          }
          return
        }
        let code = 'FILE_UPLOAD_FAILED'
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string | string[] }
          if (typeof parsed.message === 'string') code = parsed.message
        } catch {
          code = 'FILE_UPLOAD_FAILED'
        }
        reject(new ApiError(xhr.status, code))
      }
      xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR'))
      xhr.send(form)
    })

  const metadata = async (fileId: string): Promise<UploadedFile> =>
    $fetch<UploadedFile>(`${fileBase}/files/${fileId}`, { headers: auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {} })

  return { contentUrl, upload, metadata }
}
