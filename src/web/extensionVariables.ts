import TelemetryReporter from '@vscode/extension-telemetry';
import * as vscode from 'vscode';

export namespace ext {
    export let logger: vscode.LogOutputChannel;
    export let reporter: TelemetryReporter;
    export let context: vscode.ExtensionContext;
}