import * as vscode from 'vscode';
import { decodingUserPromptJson } from './helper';
import { githubCopilotChatMode } from '../constants';
import { ext } from '../extensionVariables';

export async function executePromptCmd(galleryPromptParameter: string) {
    let telemetryDate = {
        measurements: {
            galleryPromptEncodedSize: 0,
            galleryPromptDecodedSize: 0,
            promptVersion: 0,
        },
        properties: {
            initGHCPLogin: "false",
            completeGHCPLogin: "false",
            executeResult: "failed",
            errorMessage: ""
        }
    };
    let galleryPromptEncoded = galleryPromptParameter;

    try {
        ext.logger.info(`Starting the executePromptCmd function.`);
        const galleryPromptdecoded = await tryGetPromptFromUrl(galleryPromptEncoded, telemetryDate);

        await trySetupChat(telemetryDate);

        await tryOpenPrompt(galleryPromptdecoded.p, telemetryDate);
    }

    catch (error) {
        telemetryDate.properties.executeResult = "failed";
        telemetryDate.properties.errorMessage = error instanceof Error ? error.message + "\n" + error.stack : String(error);
    }
    finally {
        ext.logger.info(`executePromptCmd function finished with: ${JSON.stringify(telemetryDate)}`);
        ext.reporter.sendTelemetryEvent('gallerypassingpromptresult',
            telemetryDate.properties,
            telemetryDate.measurements
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

async function tryGetPromptFromUrl(promptEncoded: string, telemetryDate: any): Promise<any> {
    let galleryPromptEncoded = promptEncoded;
    let galleryPromptDecoded = {} as any;
    ext.logger.info(`Starting handle prompt.`);
    if (galleryPromptEncoded === null || galleryPromptEncoded === undefined || galleryPromptEncoded === "") {
        ext.logger.info(`Prompt is empty. Try to get the prompt from URL.`);
        const url = (await vscode.commands.executeCommand('vscode-dev-azurecloudshell.webOpener.getUrl') as { url: string }).url;
        galleryPromptEncoded = new URLSearchParams(url).get('aiGalleryParam') ?? "";
        telemetryDate.measurements.galleryPromptEncodedSize = galleryPromptEncoded.length;
    }
    ext.logger.info(`Get the gallery prompt: ${galleryPromptEncoded}`);

    if (galleryPromptEncoded !== "") {
        galleryPromptDecoded = await decodingUserPromptJson(galleryPromptEncoded);
        telemetryDate.measurements.promptVersion = galleryPromptDecoded.v;
        telemetryDate.measurements.galleryPromptDecodedSize = JSON.stringify(galleryPromptDecoded).length;
        ext.logger.info(`Decoded gallery prompt successfully: ${JSON.stringify(galleryPromptDecoded)}`);
    }
    else {
        const message = `Gallery prompt in URL is empty.`;
        vscode.window.showErrorMessage("AI Gallery: Gallery prompt is empty. Please retry or report the issue in gallery site.");
        ext.logger.error(message);
        throw new Error(message);
    }
    return galleryPromptDecoded;
}

async function trySetupChat(telemetryDate: any): Promise<void> {
    let waitTimeForSeconds = 10;
    let loginStatus = false;

    ext.logger.info(`Starting setup GHCP chat.`);
    // Check if the chat is already set up
    let loginSession = await vscode.authentication.getAccounts('github');
    if (loginSession && loginSession.length > 0) {
        telemetryDate.properties.initGHCPLogin = "true";
        telemetryDate.properties.completeGHCPLogin = "true";
        loginStatus = true;
        ext.logger.info(`[${loginSession[0].label}] has logged in to GitHub.`);
    }
    else {
        waitTimeForSeconds = 30; // Increase wait time if not logged in
        telemetryDate.properties.initGHCPLogin = "false";
        ext.logger.info(`No GitHub account found. Need log in to GitHub.`);
        let retryCount = 0;
        while (retryCount < 3 && (!loginSession || loginSession.length === 0)) {
            await vscode.commands.executeCommand("workbench.action.chat.triggerSetup");
            loginSession = await vscode.authentication.getAccounts('github');
            if (loginSession && loginSession.length > 0) {
                telemetryDate.properties.completeGHCPLogin = "true";
                ext.logger.info(`[${loginSession[0].label}] has logged in to GitHub.`);
                loginStatus = true;
                break;
            }
            retryCount++;
            ext.logger.info(`Retrying to log in to GitHub... (${retryCount})`);
        }
    }

    if (loginStatus) {
        ext.logger.info(`Waiting ${waitTimeForSeconds}s for setup.`)
        await vscode.commands.executeCommand("workbench.action.chat.newChat");
        await vscode.commands.executeCommand("workbench.action.chat.triggerSetup");
        await vscode.commands.executeCommand("workbench.action.chat.openAgent");
        const message = "AI Gallery: GitHub copilot chat is initializing, please wait...";
        let customCancellationToken: vscode.CancellationTokenSource | null = null;

        await vscode.window.withProgress({
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

                    const seconds = waitTimeForSeconds;
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
        ext.logger.info(`Waited ${waitTimeForSeconds}s for setup.`);
        vscode.window.showInformationMessage("AI Gallery: Setup completed. Starting code generation. Please wait and retry in Chat if needed.");
    }
    else {
        const message = `Failed to log in to GitHub.`
        vscode.window.showErrorMessage("AI Gallery: Failed to log in to GitHub. Please check your account and retry from gallery site.");
        ext.logger.info(message);
        throw new Error(message);
    }
}


async function tryOpenPrompt(prompt: string, telemetryDate: any, retries = 3, delay = 1000): Promise<void> {
    ext.logger.info(`Starting to open chat with prompt.`);
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await vscode.commands.executeCommand("workbench.action.chat.open", { mode: githubCopilotChatMode, query: prompt });
            ext.logger.info(`Chat opened successfully with prompt: ${prompt}`);
            telemetryDate.properties.executeResult = "success";
            break;
        } catch (err) {
            ext.logger.warn(`Attempt ${attempt + 1} failed to open chat. Retrying...`, err);
            if (attempt < retries - 1) {
                await new Promise(res => setTimeout(res, delay));
            }
            else {
                vscode.window.showErrorMessage("AI Gallery: Failed to open chat. Please retry in Chat or retry from gallery site.");
                const message = `Failed to open chat after ${retries} attempts.` + (err instanceof Error ? err.message : String(err));
                ext.logger.error(message);
                throw new Error(message);
            }
        }
    }
}