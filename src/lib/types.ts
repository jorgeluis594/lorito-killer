export type Persisted<ModelType> = { [k in keyof ModelType]: ModelType[k] };

export type successResponse<DataType = any> = {
  success: true;
  data: DataType; //Product
};

export type ErrorResponse = {
  success: false;
  message: string;
  type?: "AuthError";
};

export type response<DataType = any> =
  | successResponse<DataType>
  | ErrorResponse;

export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType[number];
