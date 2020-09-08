// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from 'path';
import initEditor from "./editor";
import EditorPanel from "./model/panel_helper";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("lang-json-editor activated.");

	let editorPanels: EditorPanel[] = new Array();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand("lang-json-editor", (uri: vscode.Uri) => {
		if (uri !== undefined) {
			const uriString = uri.toString();

			const findUri = (el: EditorPanel) => el.uriString === uriString;
			const currentPanel = editorPanels.find(findUri);

			if (currentPanel === undefined) {
				// Create a WebviewPanel for the editor.
				const newPanel = vscode.window.createWebviewPanel(
					"lang-json-editor",
					"Language JSON editor",
					vscode.ViewColumn.One,
					{
						enableScripts: true,
						retainContextWhenHidden: true,
						// Only allow the webview to access resources in our extension's media directory
						localResourceRoots: [
							vscode.Uri.file(path.join(context.extensionPath, "media"))
						]
					}
				);

				initEditor(context, newPanel, uri);

				editorPanels.push({
					uriString: uri.toString(),
					panel: newPanel
				});

				newPanel.onDidDispose(function () {
					const idx = editorPanels.findIndex(findUri);
					editorPanels.splice(idx, 1);
				}, null, context.subscriptions);
			} else {
				const column = vscode.window.activeTextEditor?.viewColumn;
				currentPanel.panel.reveal(column);
			}
		} else {
			vscode.window.showErrorMessage("Language JSON editor must be opened inside a directory.");
		}
	});

	context.subscriptions.push(disposable);

}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log("lang-json-editor deactivated.");
}
