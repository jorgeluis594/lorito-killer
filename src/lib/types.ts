export type response = {
    success: boolean
    message?: string
    data?: any
}

export type Photo = {
    name: string
    size: number
    key: string
    url: string
}