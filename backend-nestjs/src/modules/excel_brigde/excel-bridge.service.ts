import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as path from 'path';

@Injectable()
export class ExcelBridgeService {
  private readonly scriptsDir: string;
  private readonly logger = new Logger(ExcelBridgeService.name);

  constructor() {
    // Project root is 2 levels up from src/modules/excel_bridge
    this.scriptsDir = path.resolve(__dirname, '../../../../python-excel-engine/scripts');
  }

  async runScript<T = any>(scriptName: string, args: string[]): Promise<T> {
    const runScriptPath = path.join(this.scriptsDir, 'run_script.sh');
    
    // Construct the command line
    const escapedArgs = args.map(arg => {
      if (arg === null || arg === undefined || arg === 'None') {
        return 'None';
      }
      // Wrap arguments in single quotes to escape shell specials
      return `'${arg.replace(/'/g, "'\\''")}'`;
    });
    
    const command = `sh "${runScriptPath}" "${scriptName}" ${escapedArgs.join(' ')}`;

    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Error executing script ${scriptName}: ${error.message}`, error as any);
          this.logger.error(`Stderr: ${stderr}`);
          return reject(
            new InternalServerErrorException(
              `Python Script ${scriptName} failed: ${error.message}. Stderr: ${stderr}`
            )
          );
        }
        
        try {
          // Find the last line of stdout which contains the JSON string
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          resolve(result);
        } catch (parseError) {
          this.logger.error(`Failed to parse script output for ${scriptName}: ${parseError}`, parseError as any);
          this.logger.debug(`Raw stdout: ${stdout}`);
          reject(
            new InternalServerErrorException(
              `Failed to parse output of script ${scriptName} as JSON. Raw output: ${stdout}`
            )
          );
        }
      });
    });
  }
}
