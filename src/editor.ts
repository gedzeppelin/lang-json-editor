import * as path from 'path';
import * as vscode from 'vscode';

import Message from "./model/message";
import LangRow from "./model/lang_row";

export default async function initEditor(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  dirUri: vscode.Uri
) {
  panel.iconPath = getMediaUri(context, "favicon.ico");
  panel.webview.html = await getWebviewContent(context, panel.webview);
  panel.webview.onDidReceiveMessage(async function (message: Message) {
    if (message.type === "webview.ready") {
      const uri = vscode.Uri.file(dirUri.fsPath);
      const payload = await loadFiles(uri);
      panel.webview.postMessage(payload);
    } else if (message.type === "webview.save") {
      saveFiles(dirUri, message);
    } else {
      console.error("Received an invalid message.");
    }
  });
}

function getMediaUri(context: vscode.ExtensionContext, fileName: string): vscode.Uri {
  const mediaPath = path.join(context.extensionPath, "media", fileName);
  return vscode.Uri.file(mediaPath);
}

async function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): Promise<string> {
  const template = getMediaUri(context, "template.html");
  const stylesCss = getMediaUri(context, "styles.css");
  const indexJs = getMediaUri(context, "index.js");

  const html = await vscode.workspace.fs.readFile(template);
  return html.toString()
    .replace(
      "$styles.css",
      webview.asWebviewUri(stylesCss).toString()
    )
    .replace(
      "$index.js",
      webview.asWebviewUri(indexJs).toString()
    );
}

async function loadFiles(dirUri: vscode.Uri): Promise<Message> {
  console.log(`lang-json-editor opened directory: ${dirUri.fsPath}`);

  const message: Message = {
    type: "extension.onReady",
    metadataArray: new Array(),
    rowArray: new Array(),
  };

  const fileNames = (await vscode.workspace.fs.readDirectory(dirUri))
    .filter(file => file[1] === vscode.FileType.File && file[0].endsWith(".json"))
    .map(file => file[0]);

  for (const fileName of fileNames) {
    const langCode = fileName.split(".")[0];
    message.metadataArray.push({ fileName, langCode });

    try {
      const filePath = path.join(dirUri.fsPath, fileName);
      const fileUri = vscode.Uri.file(filePath);

      const rawBytes = await vscode.workspace.fs.readFile(fileUri);
      const rawData = JSON.parse(rawBytes.toString());

      for (const rawKey in rawData) {
        const value = rawData[rawKey];

        if (typeof value === "string" || typeof value === "number") {
          const idx = message.rowArray.findIndex(el => el.key === rawKey);

          if (idx >= 0) {
            message.rowArray[idx][langCode] = value;
          } else {
            const langRow: LangRow = { key: rawKey };

            langRow[langCode] = value;
            message.rowArray.push(langRow);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  return message;
}

async function saveFiles(dirUri: vscode.Uri, message: Message) {
  const errorSet: Set<string> = new Set();

  for (const langMetadata of message.metadataArray) {
    try {
      const filePath = path.join(dirUri.fsPath, langMetadata.fileName);
      const fileUri = vscode.Uri.file(filePath);

      const fileBakUri = vscode.Uri.file(`${filePath}.bak`);
      await vscode.workspace.fs.copy(fileUri, fileBakUri, { overwrite: true });

      const outputJson: any = {};

      for (const item of message.rowArray) {
        outputJson[item.key] = item[langMetadata.langCode];
      }

      const jsonContent = JSON.stringify(outputJson, null, 2);
      const jsonBytes = Buffer.from(jsonContent, "utf-8");
      vscode.workspace.fs.writeFile(fileUri, jsonBytes);
    } catch (e) {
      errorSet.add(langMetadata.fileName);
      console.error(e);
    }
  }

  const isSingular = message.metadataArray.length === 1;
  const fileCount = message.metadataArray.length;
  const errorCount = errorSet.keys.length;

  if (errorCount === fileCount && fileCount !== 0) {
    vscode.window.showErrorMessage(`An error ocurred while saving your JSON ${isSingular ? "file" : "files"}.`);
  } if (errorCount > 0) {
    vscode.window.showErrorMessage(`An error ocurred while saving some of your JSON ${isSingular ? "file" : "files"}.`);
  } else {
    vscode.window.showInformationMessage(`Your JSON ${isSingular ? "file" : "files"} were saved successfully!`);
  }
}