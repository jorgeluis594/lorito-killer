export const COUNTRY = "0";

export type CountryType = typeof COUNTRY;

export const DEPARTMENT = "1";

export type DepartmentType = typeof DEPARTMENT;

export const PROVINCE = "2";

export type ProvinceType = typeof PROVINCE;

export const DISTRICT = "3";

export type DistrictType = typeof DISTRICT;

export type LocalityLevelType = CountryType | DepartmentType | ProvinceType | DistrictType;

export type Locality = {
  id: string,
  idUbigeo: string,
  name: string,
  code: string,
  tag: string,
  searchValue: string,
  level: LocalityLevelType,
  parentId: string | null,
}