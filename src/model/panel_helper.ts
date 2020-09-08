import * as vscode from "vscode";

export default interface Widget {
  uriString: string;
  panel: vscode.WebviewPanel
};