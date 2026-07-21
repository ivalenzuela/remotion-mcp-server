import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handlePreviewFrame, handleScaffoldProject } from './dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const workspace = path.join(__dirname, 'test_props_diag');
  const scaffoldRes = await handleScaffoldProject({
    projectName: 'scaffold_props_test',
    template: 'tiktok-916',
    targetDir: workspace,
  });

  const projPath = path.join(workspace, 'scaffold_props_test');

  console.log('--- TEST 1: WITHOUT PROPS ---');
  const resNoProps = await handlePreviewFrame({
    projectDir: projPath,
    compositionId: 'MainComposition',
    frame: 0,
    outputPath: path.join(workspace, 'noprops.png'),
  });
  console.log('No props result:', resNoProps);

  console.log('\n--- TEST 2: WITH PROPS ---');
  const resWithProps = await handlePreviewFrame({
    projectDir: projPath,
    compositionId: 'MainComposition',
    frame: 0,
    outputPath: path.join(workspace, 'withprops.png'),
    props: { title: 'Test Title' },
  });
  console.log('With props result:', resWithProps);
}

main();
