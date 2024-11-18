import * as vscode from "vscode";
import * as path from "path";
import {
  LanguageClient as BaseLanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { DependencyCheck } from "./update"; // Import DependencyCheck

// Define type aliases
type LanguageClient = BaseLanguageClient;
type ExtensionContext = vscode.ExtensionContext;
type StatusBarItem = vscode.StatusBarItem;
type WebviewPanel = vscode.WebviewPanel;

// Global variables
let client: LanguageClient;
let parserStatus: StatusBarItem;

async function clientInit(context: ExtensionContext): Promise<void> {
  const restartServerCommandId = "delugelang.restartLangServer";

  // First, check and download dependencies if needed
  await DependencyCheck(context);

  // Get the server path from util
  const serverPath = path.join(
    context.globalStoragePath,
    "v0.04-alpha", // or whatever version you're using
    "parser-win.aot", // This will be different based on platform
  );

  const serverOptions: ServerOptions = {
    command: serverPath,
    args: [],
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "dg" }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  client = new BaseLanguageClient(
    "delugeLangServer",
    "Deluge Language Server",
    serverOptions,
    clientOptions,
  );

  try {
    await client.start();
    parserStatus = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1,
    );
    parserStatus.tooltip = "Shows the Deluge parser status";
    parserStatus.text = "$(check) Deluge Server Active";
    parserStatus.show();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to start Deluge language server: ${error}`,
    );
    console.error(error);
  }
}

export async function activate(context: ExtensionContext) {
  try {
    await clientInit(context);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to initialize Deluge extension: ${error}`,
    );
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
