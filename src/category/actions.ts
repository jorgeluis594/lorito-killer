"use server"

import { Category } from "./types"
import { create } from "./db_respository"
import { response } from "@/lib/types";

export const createCategory = async (category: Category):Promise<response<Category>> => await create(category)