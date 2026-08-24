import path from 'node:path';

export default {
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    alias: {
      '@mediaflow/contracts': path.resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@mediaflow/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
      '@mediaflow/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
      '@mediaflow/application': path.resolve(__dirname, 'packages/application/src/index.ts'),
      '@mediaflow/object-storage': path.resolve(__dirname, 'packages/object-storage/src/index.ts'),
      '@mediaflow/queue': path.resolve(__dirname, 'packages/queue/src/index.ts'),
      '@mediaflow/media': path.resolve(__dirname, 'packages/media/src/index.ts'),
      '@mediaflow/observability': path.resolve(__dirname, 'packages/observability/src/index.ts'),
    },
  },
};
