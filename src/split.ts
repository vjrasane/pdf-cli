import { Argv } from "yargs";
import { OptionsType, readStdin, writeOutputOrStdout } from "./utils";
import fs from "fs";
import { PDFDocument, PDFPage } from "pdf-lib";
import { ioOptions } from "./common";
import { flow, times } from "lodash/fp";

const command = "split";

const description = "Split PDF pages";

const builder = flow(
  (args: Argv<{}>) =>
    args.option("chunk", {
      alias: "c",
      describe: "Length of each page chunk to merge to a single page",
      type: "number",
      default: 2,
    }),
  ioOptions
);

const splitPage = async (
  sourcePage: PDFPage,
  chunkSize: number,
  resultDoc: PDFDocument
) => {
  const width = sourcePage.getWidth() / chunkSize;
  const height = sourcePage.getHeight();

  await Promise.all(
    times(async (i) => {
      const resultPage = resultDoc.addPage([width, height]);
      const embeddedPage = await resultDoc.embedPage(sourcePage, {
        left: width * i,
        right: width * (i + 1),
        top: height,
        bottom: 0,
      });
      resultPage.drawPage(embeddedPage, { x: 0, y: 0 });
    }, chunkSize)
  );
};

const handler = async ({
  input,
  output,
  chunk: chunkSize,
}: OptionsType<typeof builder>): Promise<void> => {
  const data = input ? fs.readFileSync(input) : await readStdin();
  const sourceDoc = await PDFDocument.load(data);
  const resultDoc = await PDFDocument.create();

  await Promise.all(
    sourceDoc.getPages().map((page) => splitPage(page, chunkSize, resultDoc))
  );

  const pdfBytes = await resultDoc.save();
  await writeOutputOrStdout(pdfBytes, output);
};

export { command, description, builder, handler };
