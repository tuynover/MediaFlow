export interface DemoFault {
  id: string;
  workspaceId: string;
  projectId: string | null;
  runId: string | null;
  step: string | null;
  scenario: 'FL-01' | 'FL-02' | 'FL-03' | 'FL-04' | 'FL-05';
  threshold: number;
  remainingUses: number;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

const DEMO_FAULTS: DemoFault[] = [];

export class ForbiddenDemoModeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenDemoModeException';
  }
}

export class FailureLabService {
  static clearAllFaults() {
    DEMO_FAULTS.length = 0;
  }

  static validateDemoEnvironment(demoMode = process.env.MEDIAFLOW_DEMO_MODE, env = process.env.NODE_ENV) {
    if (demoMode === 'true' && env === 'production') {
      throw new ForbiddenDemoModeException('SECURITY_VIOLATION: MEDIAFLOW_DEMO_MODE is forbidden in production environment!');
    }
  }

  configureFault(
    workspaceId: string,
    userId: string,
    scenario: 'FL-01' | 'FL-02' | 'FL-03' | 'FL-04' | 'FL-05',
    threshold = 50,
    remainingUses = 1,
    runId?: string,
    step?: string
  ): DemoFault {
    FailureLabService.validateDemoEnvironment();

    const fault: DemoFault = {
      id: crypto.randomUUID(),
      workspaceId,
      projectId: null,
      runId: runId || null,
      step: step || null,
      scenario,
      threshold,
      remainingUses,
      enabled: true,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    DEMO_FAULTS.push(fault);
    return fault;
  }

  getFaults(workspaceId: string): DemoFault[] {
    return DEMO_FAULTS.filter((f) => f.workspaceId === workspaceId && f.enabled);
  }

  consumeFault(workspaceId: string, scenario: string, runId?: string, step?: string): DemoFault | null {
    const fault = DEMO_FAULTS.find(
      (f) =>
        f.workspaceId === workspaceId &&
        f.scenario === scenario &&
        f.enabled &&
        f.remainingUses > 0 &&
        (!f.runId || f.runId === runId) &&
        (!f.step || f.step === step)
    );

    if (!fault) return null;

    fault.remainingUses -= 1;
    if (fault.remainingUses <= 0) {
      fault.enabled = false;
    }

    return fault;
  }
}
