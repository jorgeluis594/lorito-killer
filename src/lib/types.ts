export type Persisted<ModelType> = { [k in keyof ModelType]: ModelType[k] };

export type successResponse<DataType = any> = {
  success: true;
  data: DataType;
};

export type errorResponse = {
  success: false;
  message: string;
};

export type response<DataType = any> = (
  | successResponse<DataType>
  | errorResponse
) & { success: boolean };
