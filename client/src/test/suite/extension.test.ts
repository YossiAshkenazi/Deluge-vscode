import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import { describe, it, before, after } from "mocha";

describe("Extension Test Suite", () => {
  before(async () => {
    // Activate the extension before running tests
    await vscode.extensions.getExtension("yossiashkenazi.deluge")?.activate();
  });

  it("Extension should be present", () => {
    const extension = vscode.extensions.getExtension("yossiashkenazi.deluge");
    assert.notStrictEqual(extension, undefined);
  });

  it("Should activate", async () => {
    const extension = vscode.extensions.getExtension("yossiashkenazi.deluge");
    assert.strictEqual(extension?.isActive, true);
  });

  it("Should show parser status", async () => {
    // Wait for status bar item to be created
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
    );
    assert.strictEqual(
      statusBar.tooltip?.includes("Shows the Deluge parser status"),
      true,
    );
  });

  after(() => {
    // Cleanup after tests
  });
});
