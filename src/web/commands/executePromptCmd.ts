import * as vscode from 'vscode';
import { decodingUserPrompt } from './helper';

export async function executePromptCmd(galleryPromptParameter: string) {
    let galleryPromptEncoded = galleryPromptParameter;
    if (galleryPromptEncoded === null || galleryPromptEncoded === undefined || galleryPromptEncoded === "") {
        const url = (await vscode.commands.executeCommand('vscode-dev-azurecloudshell.webOpener.getUrl') as { url: string }).url;
        galleryPromptEncoded = new URLSearchParams(url).get('aiGalleryParam') ?? "";
    }
    if (galleryPromptEncoded !== "") {
        const galleryPromptdecoded = await decodingUserPrompt(galleryPromptEncoded);
        await vscode.commands.executeCommand("workbench.action.chat.open", galleryPromptdecoded);
    }
}
