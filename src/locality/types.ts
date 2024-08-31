export const COUNTRY = "0";

export type CountryType = typeof COUNTRY;

export const DEPARTMENT = "1";

export type DepartmentType = typeof DEPARTMENT;

export const PROVINCE = "2";

export type ProvinceType = typeof PROVINCE;

export const DISTRICT = "3";

export type DistrictType = typeof DISTRICT;

export type LocalityLevelType = CountryType | DepartmentType | ProvinceType | DistrictType;

export type CountryLocal = {
  _branch: "COUNTRY"
  id: string,
  idUbigeo: string,
  name: string,
  code: string,
  tag: string,
  searchValue: string,
  level: LocalityLevelType,
  parentId: string | null,
}

export type DepartmentLocal = {
  _branch: "DEPARTMENT"
  id: string,
  idUbigeo: string,
  name: string,
  code: string,
  tag: string,
  searchValue: string,
  level: LocalityLevelType,
  parentId: string | null,
}

export type ProvinceLocal = {
  _branch: "PROVINCE"
  id: string,
  idUbigeo: string,
  name: string,
  code: string,
  tag: string,
  searchValue: string,
  level: LocalityLevelType,
  parentId: string | null,
}

export type DisctrictLocal = {
  _branch: "DISTRICT"
  id: string,
  idUbigeo: string,
  name: string,
  code: string,
  tag: string,
  searchValue: string,
  level: LocalityLevelType,
  parentId: string | null,
}

export type Locality = CountryLocal | DepartmentLocal | ProvinceLocal | DisctrictLocal

export const CountryType = "COUNTRY";
export type TypecountryType = typeof CountryType;

export const DepartmentType = "DEPARTMENT";
export type TypeDepartmentType = typeof DepartmentType;

export const ProvinceType = "PROVINCE";
export type TypeProvinceType = typeof ProvinceType;

export const DistrictType = "DISTRICT";
export type TypeDistrictType = typeof DistrictType;

type LocalityLevelMap = {
  [CountryType]: CountryLocal;
  [DepartmentType]: DepartmentLocal;
  [ProvinceType]: ProvinceLocal;
  [DistrictType]: DisctrictLocal;
}

export type LocalityType = keyof LocalityLevelMap;

export type InferLocalityType<T extends LocalityType | undefined> =
  T extends LocalityType ? LocalityLevelMap[T] : Locality;

export type GetManyParamsLocality<
  T extends LocalityType | undefined = undefined,
> = {
  q?: string | null;
  localityLevel: T;
};