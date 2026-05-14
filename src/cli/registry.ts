import {
  RefactoringConfig,
  RefactoringWithActionProviderConfig
} from "../refactorings";
import addNumericSeparator from "../refactorings/add-numeric-separator";
import changeSignature from "../refactorings/change-signature";
import convertCommentToJSDoc from "../refactorings/convert-comment-to-jsdoc";
import convertForEachToForOf from "../refactorings/convert-for-each-to-for-of";
import convertForToForEach from "../refactorings/convert-for-to-for-each";
import convertGuardToIf from "../refactorings/convert-guard-to-if";
import convertIfElseToSwitch from "../refactorings/convert-if-else-to-switch";
import convertIfElseToTernary from "../refactorings/convert-if-else-to-ternary";
import convertLetToConst from "../refactorings/convert-let-to-const";
import convertSwitchToIfElse from "../refactorings/convert-switch-to-if-else";
import convertTernaryToIfElse from "../refactorings/convert-ternary-to-if-else";
import convertToArrowFunction from "../refactorings/convert-to-arrow-function";
import convertToTemplateLiteral from "../refactorings/convert-to-template-literal";
import createFactoryForConstructor from "../refactorings/create-factory-for-constructor";
import extract from "../refactorings/extract";
import extractFunction from "../refactorings/extract-function";
import extractGenericType from "../refactorings/extract-generic-type";
import extractInterface from "../refactorings/extract-interface";
import extractParameter from "../refactorings/extract-parameter";
import extractToInstanceProperty from "../refactorings/extract-to-instance-property";
import flipIfElse from "../refactorings/flip-if-else";
import flipOperator from "../refactorings/flip-operator";
import flipTernary from "../refactorings/flip-ternary";
import inline from "../refactorings/inline";
import invertBooleanLogic from "../refactorings/invert-boolean-logic";
import liftUpConditional from "../refactorings/lift-up-conditional";
import mergeIfStatements from "../refactorings/merge-if-statements";
import mergeWithPreviousIfStatement from "../refactorings/merge-with-previous-if-statement";
import moveLastStatementOutOfIfElse from "../refactorings/move-last-statement-out-of-if-else";
import moveStatementDown from "../refactorings/move-statement/move-statement-down";
import moveStatementUp from "../refactorings/move-statement/move-statement-up";
import removeDeadCode from "../refactorings/remove-dead-code";
import removeJsxFragment from "../refactorings/remove-jsx-fragment";
import removeRedundantElse from "../refactorings/remove-redundant-else";
import renameSymbol from "../refactorings/rename-symbol";
import replaceBinaryWithAssignment from "../refactorings/replace-binary-with-assignment";
import simplifyBoolean from "../refactorings/simplify-boolean";
import simplifyTernary from "../refactorings/simplify-ternary";
import splitDeclarationAndInitialization from "../refactorings/split-declaration-and-initialization";
import splitIfStatement from "../refactorings/split-if-statement";
import splitMultipleDeclarations from "../refactorings/split-multiple-declarations";
import toggleBraces from "../refactorings/toggle-braces";
import wrapInJsxFragment from "../refactorings/wrap-in-jsx-fragment";

export type AnyRefactoringConfig =
  | RefactoringConfig
  | RefactoringWithActionProviderConfig;

const ALL: AnyRefactoringConfig[] = [
  addNumericSeparator,
  changeSignature,
  convertCommentToJSDoc,
  convertForEachToForOf,
  convertForToForEach,
  convertGuardToIf,
  convertIfElseToSwitch,
  convertIfElseToTernary,
  convertLetToConst,
  convertSwitchToIfElse,
  convertTernaryToIfElse,
  convertToArrowFunction,
  convertToTemplateLiteral,
  createFactoryForConstructor,
  extract,
  extractFunction,
  extractGenericType,
  extractInterface,
  extractParameter,
  extractToInstanceProperty,
  flipIfElse,
  flipOperator,
  flipTernary,
  inline,
  invertBooleanLogic,
  liftUpConditional,
  mergeIfStatements,
  mergeWithPreviousIfStatement,
  moveLastStatementOutOfIfElse,
  moveStatementDown,
  moveStatementUp,
  removeDeadCode,
  removeJsxFragment,
  removeRedundantElse,
  renameSymbol,
  replaceBinaryWithAssignment,
  simplifyBoolean,
  simplifyTernary,
  splitDeclarationAndInitialization,
  splitIfStatement,
  splitMultipleDeclarations,
  toggleBraces,
  wrapInJsxFragment
];

export function listRefactorings(): {
  name: string;
  title: string;
  crossFile: boolean;
}[] {
  return ALL.map((cfg) => ({
    name: toKebabCase(cfg.command.key),
    title: titleOf(cfg),
    crossFile: cfg.crossFile === true
  }));
}

export function findRefactoring(
  name: string
): AnyRefactoringConfig | undefined {
  const normalised = name.includes("-") ? toCamelCase(name) : name;
  return ALL.find((cfg) => cfg.command.key === normalised);
}

function titleOf(cfg: AnyRefactoringConfig): string {
  if ("title" in cfg.command && typeof cfg.command.title === "string") {
    return cfg.command.title;
  }
  return toTitleCase(cfg.command.key);
}

function toKebabCase(camel: string): string {
  return camel.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toTitleCase(camel: string): string {
  return camel
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (m) => m.toUpperCase())
    .trim();
}
