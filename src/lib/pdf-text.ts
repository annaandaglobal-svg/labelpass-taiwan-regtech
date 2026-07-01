export async function extractPdfText(buffer: Buffer) {
  try {
    const runtimeRequire = eval("require") as NodeRequire;
    const { PDFParse } = runtimeRequire("pdf-parse") as typeof import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return (result.text ?? "")
        .replace(/--\s*\d+\s+of\s+\d+\s*--/g, " ")
        .replace(/\u0000/g, " ")
        .trim();
    } finally {
      await parser.destroy();
    }
  } catch {
    return "";
  }
}
