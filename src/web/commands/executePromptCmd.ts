import * as vscode from 'vscode';
import { decodingUserPrompt, decodingUserPromptJson } from './helper';
import { aiConnectionString } from '../constants';
import TelemetryReporter from '@vscode/extension-telemetry';

export async function executePromptCmd(galleryPromptParameter: string) {
    let galleryPromptEncoded = galleryPromptParameter;

    const reporter = new TelemetryReporter(aiConnectionString);
    let executeResult = false;
    let galleryPromptEncodedSize = 0;
    let galleryPromptDecodedSize = 0;
    let promptVersion = 0;
    let errorMessage = "";

    try {
        if (galleryPromptEncoded === null || galleryPromptEncoded === undefined || galleryPromptEncoded === "") {
            const url = (await vscode.commands.executeCommand('vscode-dev-azurecloudshell.webOpener.getUrl') as { url: string }).url;
            galleryPromptEncoded = new URLSearchParams(url).get('aiGalleryParam') ?? "";
        }

        if (galleryPromptEncoded !== "") {
            const galleryPromptdecoded = await decodingUserPromptJson(galleryPromptEncoded);
            promptVersion = galleryPromptdecoded.v;

            // Telemetry data
            galleryPromptEncodedSize = galleryPromptEncoded.length;
            galleryPromptDecodedSize = JSON.stringify(galleryPromptdecoded).length;

            await trySetupChat();
            vscode.window.showInformationMessage("AI Gallery: Loading completed. Start generating code by prompt.");

            const success = await tryOpenPrompt(galleryPromptdecoded.p);
            if (success) {
                executeResult = true;
            }
            else {
                errorMessage = "Failed to open the prompt.";
            }
        }
        else {
            errorMessage = "Gallery prompt is empty. Please check the URL.";
        }
    }
    catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
    }
    finally {
        reporter.sendTelemetryEvent('gallerypassingpromptresult',
            {
                passedResult: executeResult.toString(),
                errorMessage: errorMessage,
            },
            {
                promptVersion: promptVersion,
                galleryPromptEncodedSize: galleryPromptEncodedSize,
                galleryPromptDecodedSize: galleryPromptDecodedSize,
            }
        );
    }

}

const sleep = (time: number) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, time);
    });
  }

async function trySetupChat(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.chat.toggle");
    await new Promise(res => setTimeout(res, 1000));
    await vscode.commands.executeCommand("workbench.action.chat.triggerSetup");
    //vscode.window.showInformationMessage("AI Gallery: Chat is setup. Please wait for loading...");
    //await new Promise(res => setTimeout(res, 30000));
    const message = "AI Gallery: GitHub copilot chat is initializing, please wait...";
    let customCancellationToken: vscode.CancellationTokenSource | null = null;

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false
      },
      async (progress, token) => {
        return new Promise((async (resolve) => {
          customCancellationToken = new vscode.CancellationTokenSource();
  
          customCancellationToken.token.onCancellationRequested(() => {
            customCancellationToken?.dispose();
            customCancellationToken = null;  
            vscode.window.showInformationMessage("Cancelled the progress");
            resolve(null);
            return;
          });
  
          const seconds = 30;
          const increase = 100 / seconds;
          for (let i = 0; i < seconds; i++) {
            // Increment is summed up with the previous value
            progress.report({ increment: increase, message: `${message}` + Math.round(i * increase) + "%" });           
            await sleep(1000);
          }
  
          resolve(null);
        }));
      }
    );
    await new Promise(res => setTimeout(res, 30000));
}


async function tryOpenPrompt(prompt: string, retries = 3, delay = 1000): Promise<boolean> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await vscode.commands.executeCommand("workbench.action.chat.open", prompt);
            return true;
        } catch (err) {
            console.warn(`Attempt ${attempt + 1} failed to open chat. Retrying...`, err);
            if (attempt < retries - 1) {
                await new Promise(res => setTimeout(res, delay));
            }
            else {
                throw new Error(`Failed to open chat after ${retries} attempts. ` + err);
            }
        }
    }
    return false;
}