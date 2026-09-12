import { fn } from "storybook/test";
import type * as actions from "../actions";

export const createTablesAction = fn<typeof actions.createTablesAction>();
export const deleteTableAction = fn<typeof actions.deleteTableAction>();
