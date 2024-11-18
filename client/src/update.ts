import * as vscode from "vscode";
import * as requestPromise from "request-promise-native";
import { promises as fs } from "fs";
import * as util from "./util";
import * as path from "path";

const baseUrl: string =
  "https://github.com/YossiAshkenazi/Deluge-Language-Parser/releases/download/";

async function isFileAvailable(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.log(`File not available from ${path}`);
    } else {
      console.log(`File not found, ${error}`);
      throw error;
    }
    return false;
  }
}

async function isPathExists(path: string): Promise<boolean> {
  try {
    await fs.readdir(path);
    return true;
  } catch (error) {
    console.log("path does not exist!");
  }
  return false;
}

async function createPath(path: string): Promise<boolean> {
  try {
    await fs.mkdir(path);
    return true;
  } catch (error) {
    console.log(`Path creation error ${path}`);
  }
  return false;
}

async function DownloadFile(filePath: string, url: string): Promise<void> {
  const options: requestPromise.RequestPromiseOptions = {
    followAllRedirects: true,
    gzip: true,
    strictSSL: true,
    encoding: null,
  };

  try {
    const data = await requestPromise.get(url, options);
    await fs.writeFile(filePath, data);
  } catch (error: unknown) {
    console.error(`File download error from ${url} to ${filePath}!`);
    if (error instanceof Error) {
      throw new Error(`Failed to download file: ${error.message}`);
    } else {
      throw new Error("Failed to download file: Unknown error");
    }
  }
}

async function DownloadPackage(
  runTime: boolean,
  runTimePath: string,
  app: boolean,
  appPath: string,
  docs: boolean,
  docsPath: string,
  context: vscode.ExtensionContext,
): Promise<void> {
  if (!(runTime && app && docs)) {
    await vscode.window.withProgress(
      {
        title: "Downloading",
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      async (progress) => {
        const baseUrlVers = baseUrl + util.getServerVersion(context) + "/";
        if (!runTime) {
          progress.report({ message: "Runtime" });
          await DownloadFile(runTimePath, baseUrlVers + util.getRunTimeName());
          console.log("downloaded runtime");

          if (util.getPlatform() !== util.Platform.Windows) {
            await fs.chmod(runTimePath, 0o777);
            console.log("set the executable status");
          }
        }

        if (!app) {
          progress.report({ message: "Parser" });
          await DownloadFile(appPath, baseUrlVers + util.getParserName());
          console.log("downloaded parser");
        }

        if (!docs) {
          progress.report({ message: "Docs" });
          await DownloadFile(docsPath, baseUrlVers + util.getDocsName());
          console.log("downloaded docs");
        }

        return Promise.resolve();
      },
    );
  }
}

async function updatePackage(
  version: string,
  context: vscode.ExtensionContext,
): Promise<void> {
  const homePath = path.join(util.getHomeDir(context), version);
  if (!(await isPathExists(homePath))) {
    await createPath(homePath);
  }
  await util.updateServerVersion(version, context);

  await DownloadPackage(
    false,
    path.join(homePath, util.getRunTimeName()),
    false,
    path.join(homePath, util.getParserName()),
    false,
    path.join(homePath, util.getDocsName()),
    context,
  );

  await vscode.window.showInformationMessage("Updated successfully");
}

async function getLatestRelease(): Promise<string> {
  try {
    const repoApiUrl =
      "https://api.github.com/repos/GuruDhanush/Deluge-Language-Parser/releases/latest";

    const data = await requestPromise.get(repoApiUrl, {
      headers: {
        "User-Agent": "Deluge-Language-Parser",
        Accept: "application/vnd.github.v3+json",
      },
      json: true,
    });

    return data.tag_name || "v0.04-alpha";
  } catch (error: unknown) {
    console.error("Failed to get latest release:", error);
    // Log error details for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    // Return a default version if we can't get the latest
    return "v0.04-alpha";
  }
}

export async function checkDependencies(
  context: vscode.ExtensionContext,
): Promise<{ command: string; args: string[] }> {
  const serverVersion = util.getServerVersion(context);
  const homeDir = util.getHomeDir(context);
  const serverPath = path.join(homeDir, serverVersion, util.getParserName());

  if (!(await isFileAvailable(serverPath))) {
    await vscode.window.showInformationMessage("Downloading dependencies...");
    await updatePackage(serverVersion, context);
  }

  return {
    command: serverPath,
    args: [],
  };
}

export async function DependencyCheck(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    let isNewlyDownloaded = false;
    const homePath = util.getHomeDir(context);

    // Create the home directory if it doesn't exist
    if (!(await isPathExists(homePath))) {
      await createPath(homePath);
    }

    // Get or set default server version
    let serverVersion = util.getServerVersion(context);
    if (!serverVersion) {
      serverVersion = "v0.04-alpha";
      await util.updateServerVersion(serverVersion, context);
    }

    const versionPath = path.join(homePath, serverVersion);
    if (!(await isPathExists(versionPath))) {
      await createPath(versionPath);
    }

    // Download required files
    await DownloadPackage(
      false,
      path.join(versionPath, util.getRunTimeName()),
      false,
      path.join(versionPath, util.getParserName()),
      false,
      path.join(versionPath, util.getDocsName()),
      context,
    );

    // Verify files exist
    const parserPath = path.join(versionPath, util.getParserName());
    if (!(await isFileAvailable(parserPath))) {
      throw new Error(`Parser file not found at ${parserPath}`);
    }
  } catch (error: unknown) {
    console.error("DependencyCheck failed:", error);
    if (error instanceof Error) {
      throw new Error(
        `Failed to check/download dependencies: ${error.message}`,
      );
    } else {
      throw new Error("Failed to check/download dependencies: Unknown error");
    }
  }
}
