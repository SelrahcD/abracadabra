import { suite } from "mocha";
import { createEditorContractTests } from "../editor-contract-test";
import { Position } from "../position";
import { CliEditor } from "./cli-editor";

suite("CliEditor", () => {
  createEditorContractTests(
    async (code, position = new Position(0, 0)) => new CliEditor(code, position)
  );
});
