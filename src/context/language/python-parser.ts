import { PythonAbstractParser, PythonEnclosingContext } from "../../constants";
// import * as Parser from 'web-tree-sitter';
// const Parser = require('web-tree-sitter');
// import type * as Parser from 'web-tree-sitter';
// import { Parser } from 'web-tree-sitter';
import Parser = require("web-tree-sitter");


interface Node {
  type: 'ClassDeclaration' | 'FunctionDeclaration' | 'Module';
  name: string;
  start: number;
  end: number;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  leadingComments: any;
  trailingComments: any;
  innerComments: any;
}
export class PythonParser implements PythonAbstractParser {
  // private parser: Parser;
  private parser: any;
  private initialized = false;

  // private async initialize() {
  //   if (!this.initialized) {
  //     this.parser = new Parser;
  //     const Lang = await Parser.Language.load('tree-sitter-python.wasm');
  //     this.parser.setLanguage(Lang);
  //     this.initialized = true;
  //   }
  // }

  private async initialize() {
    if (!this.initialized) {
      await Parser.init();
      this.parser = new Parser;
      const Lang = await Parser.Language.load('src/tree-sitter-python.wasm');
      this.parser.setLanguage(Lang);
      this.initialized = true;
    }
  }

  // initialize() {
  //   // Import both Parser and the Python language
  //   return import('web-tree-sitter').then(async Parser => {
  //     await Parser.init();
  //     this.parser = new Parser();
  //     const Lang = await import('tree-sitter-python');
  //     this.parser.setLanguage(Lang);
  //   });
  // }

  private nodeToEnclosingContext(node: Parser.SyntaxNode): Node {
    return {
      type:
        node.type === 'class_definition'
          ? 'ClassDeclaration'
          : 'FunctionDeclaration',
      name: node.childForFieldName('name')?.text ?? '',
      start: node.startIndex,
      end: node.endIndex,
      loc: {
        start: {
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
        },
        end: {
          line: node.endPosition.row + 1,
          column: node.endPosition.column,
        },
      },
      leadingComments: null,
      trailingComments: null,
      innerComments: null,
    };
  }

  async findEnclosingContext(
    file: string,
    lineStart: number,
    lineEnd: number
  ): Promise<PythonEnclosingContext | null> {
    await this.initialize();

    const tree = this.parser.parse(file);

    const startPoint = { row: lineStart - 1, column: 0 };
    const endPoint = { row: lineEnd - 1, column: 0 };
    // const point = { row: lineStart - 1, column: 0 };

    // let startNode = tree.rootNode.descendantForPosition(startPoint);
    // let endNode = tree.rootNode.descendantForPosition(endPoint);

    let currentNode = tree.rootNode.descendantForPosition(startPoint);

    while (currentNode) {
      if (
        (currentNode.type === 'class_definition' ||
         currentNode.type === 'function_definition') &&
        currentNode.startPosition.row <= startPoint.row &&
        currentNode.endPosition.row >= endPoint.row
      ) {
        return this.nodeToEnclosingContext(currentNode);
      }
      currentNode = currentNode.parent;
    }

    return {
      type: 'Module',
      name: 'module',
      start: 0,
      end: file.split('\n').length,
      loc: {
        start: { line: 1, column: 0 },
        end: { line: file.split('\n').length, column: 0 }
      },
      leadingComments: null,
      trailingComments: null,
      innerComments: null,
    };
  }

  async dryRun(file: string): Promise<{ valid: boolean; error: string }> {
    try {
      await this.initialize();
      const tree = this.parser.parse(file);

      const hasErrors = tree.rootNode.hasError;

      if (hasErrors) {
        let errorNode = null;
        const cursor = tree.rootNode.walk();
        do {
          if (cursor.nodeType === 'ERROR') {
            errorNode = cursor.currentNode;
            break;
          }
        } while (cursor.gotoNextSibling());

        return {
          valid: false,
          error: `Syntax error at line ${
            errorNode?.startPosition.row + 1 ?? 'unknown'
          }`,
        };
      }

      return { valid: true, error: '' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  //   findEnclosingContext(
  //     file: string,
  //     lineStart: number,
  //     lineEnd: number
  //   ): EnclosingContext {
  //     // TODO: Implement this method for Python
  //     return null;
  //   }
  //   dryRun(file: string): { valid: boolean; error: string } {
  //     // TODO: Implement this method for Python
  //     return { valid: false, error: "Not implemented yet" };
  //   }
}
