export const COUNTRY = "Country";

export type CountryLevelType = typeof COUNTRY;

export const DEPARTMENT = "Department";

export type DepartmentLevelType = typeof DEPARTMENT;

export const PROVINCE = "Province";

export type ProvinceLevelType = typeof PROVINCE;

export const DISTRICT = "District";

export type DistrictLevelType = typeof DISTRICT;

export type LocalityLevelType = CountryLevelType | DepartmentLevelType | ProvinceLevelType | DistrictLevelType;

export type Country = {
  _brand: "Country"
  id: string,
  geoCode: string,
  name: string,
  level: CountryLevelType,
  parentId: string | null,
}

export type Department = {
  _brand: "Department"
  id: string,
  geoCode: string,
  name: string,
  level: DepartmentLevelType,
  parentId: string,
}

export type Province = {
  _brand: "Province"
  id: string,
  geoCode: string,
  name: string,
  level: ProvinceLevelType,
  parentId: string,
}

export type District = {
  _brand: "District"
  id: string,
  geoCode: string,
  provinceName: string,
  departmentName: string,
  name: string,
  level: DistrictLevelType,
  parentId: string,
}

export type Locality = Country | Department | Province | District

export const CountryType = "Country";
export type TypeCountryType = typeof CountryType;

export const DepartmentType = "Department";
export type TypeDepartmentType = typeof DepartmentType;

export const ProvinceType = "Province";
export type TypeProvinceType = typeof ProvinceType;

export const DistrictType = "District";
export type TypeDistrictType = typeof DistrictType;

export type LocalityLevelMap = {
  [CountryType]: Country;
  [DepartmentType]: Department;
  [ProvinceType]: Province;
  [DistrictType]: District;
}

export type LocalityType = keyof LocalityLevelMap;

export type InferLocalityType<T extends LocalityType | undefined> =
  T extends LocalityType ? LocalityLevelMap[T] : Locality;

export type GetManyParamsLocality<
  T extends LocalityType | undefined = undefined,
> = {
  q?: string | null;
  localityLevel?: T;
};