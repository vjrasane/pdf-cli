import { chunk, flow } from "lodash/fp";
import { PDFDocument } from "pdf-lib";
import { Argv } from "yargs";
import { ioOptions } from "./common";
import { OptionsType, readInputOrStdin, writeOutputOrStdout } from "./utils";

const command = "reorder [order]";

const description = "Reorder PDF pages";

const builder = flow(
  (args: Argv<{}>) =>
    args.positional("order", {
      choices: ["weave", "unweave", "pamphlet"] as const,
      demandOption: true,
    }),
  ioOptions
);

type Opts = OptionsType<typeof builder>;

type Order = Opts["order"];

const getWeavePageOrder = (pageCount: number): number[] => {
  const sourcePageOrder: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    const resultPageIndex = i;

    const ascending = Math.ceil(resultPageIndex / 2);
    const descending = pageCount - ascending;
    const isEvenPage = resultPageIndex % 2 == 0;

    const sourcePageIndex = isEvenPage ? ascending : descending;
    sourcePageOrder[resultPageIndex] = sourcePageIndex;
  }
  return sourcePageOrder;
};

const getUnweavePageOrder = (pageCount: number): number[] => {
  const sourcePageOrder: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    const sourcePageIndex = i;

    const ascending = Math.ceil(sourcePageIndex / 2);
    const descending = pageCount - ascending;
    const isEvenPage = sourcePageIndex % 2 == 0;

    const resultPageIndex = isEvenPage ? ascending : descending;
    sourcePageOrder[resultPageIndex] = sourcePageIndex;
  }
  return sourcePageOrder;
};

const getPamphletPageOrder = (pageCount: number): number[] => {
  const woven = getWeavePageOrder(pageCount);
  const pairs = chunk(2, woven);
  return pairs.flatMap((pair, index) =>
    index % 2 == 0 ? pair.reverse() : pair
  );
};

const getSourcePageOrder = (order: Order, pageCount: number): number[] => {
  switch (order) {
    case "weave": {
      return getWeavePageOrder(pageCount);
    }
    case "unweave": {
      return getUnweavePageOrder(pageCount);
    }
    case "pamphlet": {
      return getPamphletPageOrder(pageCount);
    }
  }
};

const handler = async ({ input, output, order }: Opts): Promise<void> => {
  const data = await readInputOrStdin(input);
  const sourceDoc = await PDFDocument.load(data);
  const resultDoc = await PDFDocument.create();

  const sourcePages = sourceDoc.getPages();

  const sourcePageOrder = getSourcePageOrder(order, sourcePages.length);

  await Promise.all(
    sourcePageOrder.map(async (sourcePageIndex: number) => {
      const [sourcePage] = await resultDoc.copyPages(sourceDoc, [
        sourcePageIndex,
      ]);
      resultDoc.addPage(sourcePage);
    })
  );

  const pdfBytes = await resultDoc.save();
  writeOutputOrStdout(pdfBytes, output);
};

export { command, description, builder, handler };
