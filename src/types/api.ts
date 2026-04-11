export interface ApiListResponse<T> {
  data?: T[]
  error?: string
}

export interface ApiItemResponse<T> {
  data?: T
  error?: string
  found?: boolean
}
