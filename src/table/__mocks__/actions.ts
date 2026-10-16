import { fn } from "storybook/test";
import type * as actions from "../actions";

export const createTablesAction = fn<typeof actions.createTablesAction>();
export const updateTableAction = fn<typeof actions.updateTableAction>();
export const deleteTableAction = fn<typeof actions.deleteTableAction>();
