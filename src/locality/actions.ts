"use server";

import {find as findLocal} from "@/locality/db_repository";

export const findLocality = (id: string) => {
  return findLocal(id)
};