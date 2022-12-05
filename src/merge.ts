import { OptionsType, readInputOrStdin, writeOutputOrStdout } from "./utils";
import { chunk, flow, sumBy } from "lodash/fp";
import { PDFDocument, PDFPage } from "pdf-lib";
import { ioOptions } from "./common";
import { Argv } from "yargs";

const command = "merge";

const description = "Merge consecutive PDF pages";

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

const mergePages = async (sourcePages: PDFPage[], resultDoc: PDFDocument) => {
  sourcePages.forEach((page) => page.drawText("", { opacity: 0 }));
  const embeddedPages = await resultDoc.embedPages(sourcePages);
  const resultPageWidth = sumBy((page) => page.width, embeddedPages);
  const resultPageHeight = Math.max(
    ...embeddedPages.map((page) => page.height)
  );
  const resultPage = resultDoc.addPage([resultPageWidth, resultPageHeight]);
  embeddedPages.reduce((offset, page) => {
    resultPage.drawPage(page, { x: offset, y: 0 });
    return offset + page.width;
  }, 0);
};

const handler = async ({
  input,
  output,
  chunk: chunkSize,
}: OptionsType<typeof builder>): Promise<void> => {
  const data = await readInputOrStdin(input);
  const sourceDoc = await PDFDocument.load(data);
  const resultDoc = await PDFDocument.create();

  const pageMergeChunks = chunk(chunkSize, sourceDoc.getPages());

  await Promise.all(
    pageMergeChunks.map((pages) => mergePages(pages, resultDoc))
  );

  const pdfBytes = await resultDoc.save();
  await writeOutputOrStdout(pdfBytes, output);
};

export { command, description, builder, handler };
