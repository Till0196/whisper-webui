import { spawn, ChildProcess } from 'child_process';
import { resolve as pathResolve, dirname } from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * テストタイプの定義
 */
type TestType = 'watch' | 'coverage' | 'ui' | 'default';

/**
 * テスト実行オプション
 */
interface TestOptions {
  type: TestType;
  isWindows: boolean;
}

/**
 * コマンドライン引数からテストタイプを取得
 */
function getTestType(args: string[]): TestType {
  if (args.includes('--watch')) return 'watch';
  if (args.includes('--coverage')) return 'coverage';
  if (args.includes('--ui')) return 'ui';
  return 'default';
}

/**
 * テストコマンドを構築
 */
function buildTestCommand(options: TestOptions): { command: string; args: string[] } {
  const baseArgs = ['run'];
  
  switch (options.type) {
    case 'watch':
      baseArgs.push('test:validation:watch');
      break;
    case 'coverage':
      baseArgs.push('test:validation:coverage');
      break;
    case 'ui':
      baseArgs.push('test:validation:ui');
      break;
    default:
      baseArgs.push('test:validation');
      break;
  }

  if (options.isWindows) {
    return {
      command: 'cmd',
      args: ['/c', 'npm', ...baseArgs]
    };
  } else {
    return {
      command: 'npm',
      args: baseArgs
    };
  }
}

/**
 * ヘルプメッセージを表示
 */
function showHelp(): void {
  console.log(`
🧪 Whisper WebUI テストランナー

使用方法:
  npx ts-node src/validations/run-tests.ts [オプション]
  npm run test:validation [-- オプション]

オプション:
  --watch     ファイル変更を監視してテストを自動実行
  --coverage  カバレッジレポートを生成
  --ui        Web UIでテストを実行
  --help, -h  このヘルプを表示

例:
  npm run test:validation
  npm run test:validation:watch
  npm run test:validation:coverage
  npm run test:validation:ui
  
  または:
  npx ts-node src/validations/run-tests.ts --watch
  npx ts-node src/validations/run-tests.ts --coverage
`);
}

/**
 * テストプロセスを実行
 */
function runTestProcess(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log(`🧪 テストを実行中: ${command} ${args.join(' ')}`);
    
    const child: ChildProcess = spawn(command, args, {
      stdio: 'inherit',
      cwd: pathResolve(__dirname, '../..'),
      shell: platform() === 'win32'
    });
    
    child.on('error', (error: Error) => {
      console.error('❌ テスト実行中にエラーが発生しました:', error.message);
      reject(error);
    });
    
    child.on('close', (code: number | null) => {
      const exitCode = code ?? 1;
      if (exitCode === 0) {
        console.log('✅ テストが正常に完了しました');
      } else {
        console.log(`❌ テストが失敗しました (終了コード: ${exitCode})`);
      }
      resolve(exitCode);
    });
  });
}

/**
 * メイン関数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // ヘルプ表示
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const testType = getTestType(args);
  const isWindows = platform() === 'win32';
  
  const options: TestOptions = {
    type: testType,
    isWindows
  };

  try {
    const { command, args: testArgs } = buildTestCommand(options);
    const exitCode = await runTestProcess(command, testArgs);
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ テスト実行に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみメイン関数を実行
if (require.main === module) {
  main().catch((error) => {
    console.error('予期しないエラーが発生しました:', error);
    process.exit(1);
  });
}

export { main, getTestType, buildTestCommand, showHelp };
