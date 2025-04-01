import * as vscode from 'vscode';

export function helloWorldCmd() {
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from AI Gallery in a web extension host!');
}