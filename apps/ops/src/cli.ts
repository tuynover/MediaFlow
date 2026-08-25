#!/usr/bin/env node
import { Command } from 'commander';

export class MediaFlowOperatorCLI {
  static async listProjects(status?: string) {
    console.log(`📋 [CLI Operator] Projects List ${status ? `(Filter: ${status})` : ''}`);
    const result = [
      { id: 'proj_1', name: 'Summer Campaign Cut 01', status: status || 'processing', workspaceId: 'acme_workspace' },
    ];
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  static async listAttentionRuns() {
    console.log('🚨 [CLI Operator] Runs Requiring Attention');
    const result = [
      { id: 'run_attn_1', status: 'needs_attention', reason: 'Uncertain publish copy result', workspaceId: 'acme_workspace' },
    ];
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  static async inspectRun(runId: string) {
    console.log(`🔍 [CLI Operator] Inspecting Run: ${runId}`);
    const result = {
      runId,
      status: 'needs_attention',
      attemptCount: 2,
      evidence: { lastError: 'Network timeout during publish copy' },
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  static async retryRun(runId: string, reason: string) {
    if (!reason) throw new Error('Reason is required for retry mutation');
    console.log(`🔄 [CLI Operator] Retrying Run: ${runId} | Reason: ${reason}`);
    const result = { success: true, runId, status: 'queued' };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  static async reconcilePublish(operationId: string, reason: string) {
    if (!reason) throw new Error('Reason is required for publish reconciliation mutation');
    console.log(`⚖️ [CLI Operator] Reconciling Publish Operation: ${operationId} | Reason: ${reason}`);
    const result = { success: true, operationId, state: 'confirmed' };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  static async watchEvents(severity = 'info') {
    console.log(`👀 [CLI Operator] Watching Event Stream (Severity: ${severity})...`);
    const result = { watching: true, severity };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

// Commander CLI Entrypoint
const program = new Command();
program.name('mediaflow').description('MediaFlow Baseline v1 Operator CLI Tool');

const projectsCmd = program.command('projects').description('Project operations');
projectsCmd
  .command('list')
  .option('--status <status>', 'Filter by project status')
  .action(async (options) => {
    await MediaFlowOperatorCLI.listProjects(options.status);
  });

const runsCmd = program.command('runs').description('Run operations');
runsCmd
  .command('list')
  .option('--attention', 'Filter runs requiring operator attention')
  .action(async () => {
    await MediaFlowOperatorCLI.listAttentionRuns();
  });

runsCmd
  .command('inspect <runId>')
  .description('Inspect run details, steps, and failure evidence')
  .action(async (runId) => {
    await MediaFlowOperatorCLI.inspectRun(runId);
  });

runsCmd
  .command('retry <runId>')
  .requiredOption('--reason <reason>', 'Reason for manual retry mutation')
  .action(async (runId, options) => {
    await MediaFlowOperatorCLI.retryRun(runId, options.reason);
  });

const publishCmd = program.command('publish').description('Publish operations');
publishCmd
  .command('reconcile <operationId>')
  .requiredOption('--reason <reason>', 'Reason for publish reconciliation mutation')
  .action(async (operationId, options) => {
    await MediaFlowOperatorCLI.reconcilePublish(operationId, options.reason);
  });

program
  .command('watch')
  .option('--severity <severity>', 'Watch event severity (info, warning, error)', 'info')
  .action(async (options) => {
    await MediaFlowOperatorCLI.watchEvents(options.severity);
  });

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  program.parse(process.argv);
}
