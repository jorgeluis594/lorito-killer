export type response<DataType = any> = {
    success: boolean
    message?: string
    data?: DataType
}

export type Photo = {
    id?: string
    name: string
    size: number
    key: string
    url: string
    createdAt: Date
}