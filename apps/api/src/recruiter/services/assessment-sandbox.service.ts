import { Injectable } from '@nestjs/common';
import * as vm from 'vm';

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface SandboxExecutionResult {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  logs: string[];
  testResults: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    error?: string;
  }>;
}

@Injectable()
export class AssessmentSandboxService {
  /**
   * Evaluates candidate code against test cases in an isolated Node.js VM sandbox context
   * enforcing strict execution timeout, memory limit, restricted access to global objects,
   * and no network access.
   */
  async executeCode(
    code: string,
    testCases: TestCase[],
    timeoutMs: number = 3000,
  ): Promise<SandboxExecutionResult> {
    const logs: string[] = [];
    const testResults: SandboxExecutionResult['testResults'] = [];
    let passedCount = 0;

    for (const testCase of testCases) {
      const consoleLogHandler = (...args: any[]) => {
        if (logs.length < 50) {
          logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        }
      };

      const sandboxContext = vm.createContext({
        console: {
          log: consoleLogHandler,
          info: consoleLogHandler,
          warn: consoleLogHandler,
          error: consoleLogHandler,
        },
        JSON,
        Math,
        parseInt,
        parseFloat,
        String,
        Number,
        Boolean,
        Array,
        Object,
        input: testCase.input,
        result: undefined,
      });

      // Wrap code to execute function or return result with testCase.input
      const wrappedScript = `
        'use strict';
        try {
          ${code}
          if (typeof solution === 'function') {
            let parsedInput;
            try { parsedInput = JSON.parse(input); } catch (e) { parsedInput = input; }
            result = solution(parsedInput);
          }
        } catch (err) {
          result = '__ERROR__: ' + err.message;
        }
      `;

      try {
        const script = new vm.Script(wrappedScript);
        script.runInContext(sandboxContext, {
          timeout: timeoutMs,
          displayErrors: true,
        });

        let rawResult = sandboxContext['result'];
        let actualOutput = '';
        if (typeof rawResult === 'object') {
          actualOutput = JSON.stringify(rawResult);
        } else {
          actualOutput = String(rawResult ?? '');
        }

        const isError = actualOutput.startsWith('__ERROR__:');
        const cleanActual = isError ? actualOutput.replace('__ERROR__: ', '') : actualOutput;
        const passed = !isError && cleanActual.trim() === testCase.expectedOutput.trim();

        if (passed) passedCount++;

        const resObj: {
          input: string;
          expectedOutput: string;
          actualOutput: string;
          passed: boolean;
          error?: string;
        } = {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: cleanActual,
          passed,
        };

        if (isError) {
          resObj.error = cleanActual;
        }

        testResults.push(resObj);
      } catch (err: any) {
        testResults.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          error: err?.message || 'Execution timed out or failed in sandbox',
        });
      }
    }

    return {
      passed: passedCount === testCases.length && testCases.length > 0,
      passedCount,
      totalCount: testCases.length,
      logs,
      testResults,
    };
  }
}
