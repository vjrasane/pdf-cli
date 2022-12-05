import { number } from "decoders";
import { Argv } from "yargs";
import { expression } from "./utils";
import { flow } from "lodash/fp";

export const DEFAULT_PAGE_HEIGHT = 842;
export const DEFAULT_PAGE_WIDTH = 595;

export const inputOption = <T extends {}>(args: Argv<T>) =>
  args.option("input", {
    alias: "i",
    describe: "Input file name",
    type: "string",
  });

export const outputOption = <T extends {}>(args: Argv<T>) =>
  args.option("output", {
    alias: "o",
    describe: "Output file name",
    type: "string",
  });

export const ioOptions = <T extends {}>(args: Argv<T>) =>
  flow(inputOption, outputOption)(args);

export const sizeOptions = <T extends {}>(args: Argv<T>) =>
  args
    .option("width", {
      alias: "w",
      describe: "Page width",
      default: DEFAULT_PAGE_WIDTH,
      type: "string",
      coerce: (value: string) =>
        expression(value, number, { a4: DEFAULT_PAGE_WIDTH }),
    })
    .option("height", {
      alias: "h",
      describe: "Page height",
      default: DEFAULT_PAGE_HEIGHT,
      type: "string",
      coerce: (value: string) =>
        expression(value, number, { a4: DEFAULT_PAGE_HEIGHT }),
    });
