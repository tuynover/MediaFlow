import { describe, it, expect } from 'vitest';
import { isValidProjectStateTransition, assertProjectStateTransition } from './index';

describe('Media Project State Machine Domain Rules', () => {
  it('should allow valid transition from draft to uploading', () => {
    expect(isValidProjectStateTransition('draft', 'uploading')).toBe(true);
  });

  it('should allow valid transition from processing to awaiting_approval', () => {
    expect(isValidProjectStateTransition('processing', 'awaiting_approval')).toBe(true);
  });

  it('should reject invalid transition from draft to completed', () => {
    expect(isValidProjectStateTransition('draft', 'completed')).toBe(false);
  });

  it('should throw Error on invalid state transition assertion', () => {
    expect(() => assertProjectStateTransition('draft', 'completed')).toThrow(
      "Invalid project state transition from 'draft' to 'completed'"
    );
  });
});
