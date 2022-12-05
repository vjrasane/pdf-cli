import { Argv, ArgumentsCamelCase } from "yargs";
import { evaluate } from "mathjs";
import { Decoder } from "decoders";
import fs from "fs";
import { promisify } from "util";
export type ArgvType<A> = A extends Argv<infer T> ? T : never;

export type OptionsType<F extends (args: Argv) => Argv> = ArgumentsCamelCase<
  ArgvType<ReturnType<F>>
>;

export const readStdin = (): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    process.stdin.on("end", () => resolve(Buffer.concat(chunks)));

    process.stdin.on("err", reject);
  });
};

export const readInputOrStdin = async (input?: string): Promise<Buffer> => {
  const data = input ? fs.readFileSync(input) : await readStdin();
  return data;
};

export const writeOutputOrStdout = (
  bytes: Uint8Array,
  output?: string
): Promise<void> => promisify(fs.writeFile)(output || 1, bytes);

export const expression = <T>(
  value: string,
  decoder: Decoder<T>,
  scope: object
): T => decoder.verify(evaluate(`${value}`, scope));
