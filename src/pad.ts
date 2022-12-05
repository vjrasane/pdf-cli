import { Argv } from "yargs";
import {
  expression,
  OptionsType,
  readInputOrStdin,
  writeOutputOrStdout,
} from "./utils";
import { either, number, oneOf } from "decoders";
import { PDFDocument, PDFPage } from "pdf-lib";
import { flow } from "lodash/fp";
import { DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH, ioOptions } from "./common";

const command = "pad <pages>";

const description = "Pad PDF document with empty pages";

const builder = flow(
  (args: Argv<{}>) =>
    args
      .positional("pages", {
        describe: "Number of inserted empty pages",
        demandOption: true,
        type: "number",
      })
      .option("multiple", {
        alias: "m",
        describe: "Pad document to a length multiple of given page number",
        type: "boolean",
      })
      .option("position", {
        alias: "p",
        describe: "Padding index or start/end",
        default: "end",
        type: "string",
        coerce: (value: string) =>
          either(number, oneOf(["start", "end"] as const)).verify(value),
      })
      .option("width", {
        alias: "w",
        describe: "Page width",
        type: "string",
        coerce: (value: string) =>
          expression(value, number, { a4: DEFAULT_PAGE_WIDTH }),
      })
      .option("height", {
        alias: "h",
        describe: "Page height",
        type: "string",
        coerce: (value: string) =>
          expression(value, number, { a4: DEFAULT_PAGE_HEIGHT }),
      }),
  ioOptions
);

type PadOptions = OptionsType<typeof builder>;

const addPageAtPosition = (
  doc: PDFDocument,
  position: number | "end" | "start",
  size: [number, number]
): PDFPage => {
  switch (position) {
    case "start":
      return doc.insertPage(0, size);
    case "end":
      return doc.addPage(size);
    default:
      return doc.insertPage(position, size);
  }
};

const handler = async ({
  input,
  output,
  position,
  pages,
  multiple,
  width,
  height,
}: PadOptions): Promise<void> => {
  const data = await readInputOrStdin(input);
  const sourceDoc = await PDFDocument.load(data);

  const sourcePages = sourceDoc.getPages();
  const sourcePageCount = sourcePages.length;
  const lastSourcePage = sourcePages[sourcePageCount - 1];

  const padCount = !multiple ? pages : pages - (sourcePageCount % pages);
  const padPageWidth = width ?? lastSourcePage.getWidth();
  const padPageHeigth = height ?? lastSourcePage.getHeight();

  for (let i = 0; i < padCount; i++) {
    addPageAtPosition(sourceDoc, position, [padPageWidth, padPageHeigth]);
  }

  const pdfBytes = await sourceDoc.save();
  await writeOutputOrStdout(pdfBytes, output);
};

export { command, description, builder, handler };
