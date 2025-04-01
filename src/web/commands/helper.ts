import { decompressFromBase64 } from "async-lz-string";

export async function decodingUserPrompt(encoded: string): Promise<string> {
    const json = await decompressEncodingUrl(encoded);
    const data = JSON.parse(json);
    let prompt = data.p;
    return prompt;
}

async function decompressEncodingUrl(compressed: string): Promise<string> {
    let decoded = compressed.replace(/-/g, '+').replace(/_/g, '/');
    while (decoded.length % 4) decoded += '=';
    const decompressed = await decompressFromBase64(decoded);
    return decompressed;
}