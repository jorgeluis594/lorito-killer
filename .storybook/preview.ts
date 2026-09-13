import type { Preview } from "@storybook/nextjs-vite";
import { sb } from "storybook/test";
import "../src/app/globals.css";

sb.mock("../src/table/actions.ts");

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
