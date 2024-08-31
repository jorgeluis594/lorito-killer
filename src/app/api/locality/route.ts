import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getMany } from "@/locality/db_repository";
import {
  CountryType,
  DepartmentType, DistrictType, ProvinceType,
  TypecountryType,
  TypeDepartmentType,
  TypeDistrictType,
  TypeProvinceType
} from "@/locality/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const param = searchParams.get("param");
  const localityLevel = searchParams.get("localityLevel") || undefined;

  const response = await getMany({
    q: param,
    localityLevel: ensureLocalityLevel(localityLevel),
  });

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}

const ensureLocalityLevel = (
  level?: string,
): TypecountryType | TypeDepartmentType | TypeProvinceType | TypeDistrictType | undefined => {
  return level === CountryType || level === DepartmentType || level === ProvinceType || level === DistrictType
    ? level
    : undefined;
};
