import * as esbuild from 'esbuild';

// Bundlea el output de `nest build` (dist/main.js) en un único archivo para Lambda.
// nest build ya emite los metadatos de decoradores que NestJS necesita para DI;
// esbuild sólo hace el paso de bundling sobre el JS compilado.
async function buildLambda() {
  await esbuild.build({
    entryPoints: ['dist/main.js'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outfile: 'dist-lambda/main.js',
    format: 'cjs',
    sourcemap: true,
    external: [
      '@aws-sdk/*',
      // Peer deps opcionales de NestJS — no usados en esta app
      '@nestjs/websockets',
      '@nestjs/websockets/*',
      '@nestjs/microservices',
      '@nestjs/microservices/*',
      // Sub-path no resolvible por esbuild; @nestjs/mapped-types lo wrappea en try/catch
      'class-transformer/storage',
    ],
  });

  console.log('Bundle Lambda listo → dist-lambda/main.js');
}

buildLambda().catch((error) => {
  console.error(error);
  process.exit(1);
});
