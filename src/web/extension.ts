// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { helloWorldCmd } from './commands/helloWorldCmd';
import { executePromptCmd } from './commands/executePromptCmd';
import { ext } from './extensionVariables';
import { aiConnectionString } from './constants';
import TelemetryReporter from '@vscode/extension-telemetry';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    ext.context = context;
    ext.logger = vscode.window.createOutputChannel('AI Gallery Extension', { log: true });
    context.subscriptions.push(ext.logger);
    ext.reporter = new TelemetryReporter(aiConnectionString);
    context.subscriptions.push(ext.reporter);

    const extensionVersion = context.extension.packageJSON.version ?? 'unknown';
    ext.logger.info(`Extension Version: ${extensionVersion}`);
    ext.logger.info(`VS Code Version: ${vscode.version}`);

    let helloGallery = vscode.commands.registerCommand('ai-gallery.helloWorld', () => { helloWorldCmd(); });
    let executePrompt = vscode.commands.registerCommand('ai-gallery.executePrompt', async (prompt: string) => { await executePromptCmd(prompt); });
    ext.logger.info(`Commands registered successfully.`);
    await executePromptCmd("");
    context.subscriptions.push(helloGallery);
    context.subscriptions.push(executePrompt);
}

// This method is called when your extension is deactivated
export function deactivate() { }
