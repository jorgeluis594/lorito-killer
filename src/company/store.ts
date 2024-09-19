import { createStore } from "zustand/vanilla";

import { Logo } from "./types";

export type LogoState = {
  logos: Logo[];
};

export type LogoActions = {
  setLogos: (logos: Logo[]) => void;
};

export type LogoStore = LogoState & LogoActions;

export const defaultInitState: LogoState = {
  logos: [],
};

export const initLogosParams = (): LogoState => ({
  logos: [],
});

export const createLogoStore = (
  initState: LogoState = defaultInitState,
) => {
  return createStore<LogoStore>()((set) => ({
    ...initState,
    setLogos: (logos: Logo[]) =>
      set({ logos: [...logos] }),
  }));
};
