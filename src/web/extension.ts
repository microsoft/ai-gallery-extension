// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { helloWorldCmd } from './commands/helloWorldCmd';
import { executePromptCmd } from './commands/executePromptCmd';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	
	await executePromptCmd("");
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "AI Gallery" is now active in the web extension host!');
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let helloGallery = vscode.commands.registerCommand('ai-gallery.helloWorld', () => { helloWorldCmd(); });
	let executePrompt = vscode.commands.registerCommand('ai-gallery.executePrompt', async (prompt: string) => { await executePromptCmd(prompt); });

	context.subscriptions.push(helloGallery);
	context.subscriptions.push(executePrompt);
}

// This method is called when your extension is deactivated
export function deactivate() { }
