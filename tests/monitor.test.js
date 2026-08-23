'use strict';

/**
 * tests/monitor.test.js
 *
 * Unit tests for the CPU monitor service.
 *
 * Roadmap checklist covered:
 *  ✅ Simulate CPU spike → verify auto-restart (process.exit) triggers
 *
 * Strategy:
 *  - Mock `os-utils` so we control the reported CPU value
 *  - Mock `process.exit` so tests don't actually kill the process
 *  - Verify that startMonitor() calls process.exit(1) when CPU >= threshold
 *  - Verify that normal CPU values do NOT trigger process.exit
 *  - Verify that stopMonitor() clears the interval
 */

jest.mock('os-utils');

const osUtils = require('os-utils');

// env vars are already set by tests/env.setup.js (Jest setupFiles)
// so we can safely require the monitor service here.
const { startMonitor, stopMonitor } = require('../src/modules/system/monitor.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mock osUtils to synchronously call the callback with a given CPU fraction */
function mockCpu(fraction) {
  osUtils.cpuUsage.mockImplementation((cb) => cb(fraction));
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

let exitSpy;

beforeEach(() => {
  jest.useFakeTimers();
  exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
  exitSpy.mockRestore();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

const { CPU_THRESHOLD } = require('../src/config/env');

describe('CPU Monitor — spike detection', () => {
  it('should call process.exit(1) when CPU usage is at threshold', () => {
    mockCpu(CPU_THRESHOLD / 100);

    const handle = startMonitor(console);
    jest.advanceTimersByTime(2000); // trigger one tick

    expect(exitSpy).toHaveBeenCalledWith(1);
    stopMonitor(handle);
  });

  it('should call process.exit(1) when CPU usage exceeds threshold (100%)', () => {
    mockCpu(1.0); // 100% — simulates a full CPU spike

    const handle = startMonitor(console);
    jest.advanceTimersByTime(2000);

    expect(exitSpy).toHaveBeenCalledWith(1);
    stopMonitor(handle);
  });

  it('should call process.exit(1) when CPU is above threshold', () => {
    mockCpu(Math.min(1.0, (CPU_THRESHOLD + 5) / 100));

    const handle = startMonitor(console);
    jest.advanceTimersByTime(2000);

    expect(exitSpy).toHaveBeenCalledWith(1);
    stopMonitor(handle);
  });
});


describe('CPU Monitor — normal operation', () => {
  it('should NOT call process.exit when CPU is below threshold (32%)', () => {
    mockCpu(0.32);

    const handle = startMonitor(console);
    jest.advanceTimersByTime(2000);

    expect(exitSpy).not.toHaveBeenCalled();
    stopMonitor(handle);
  });

  it('should NOT call process.exit when CPU is well below threshold (10%)', () => {
    mockCpu(0.10);

    const handle = startMonitor(console);
    jest.advanceTimersByTime(6000); // 3 ticks at 2s each

    expect(exitSpy).not.toHaveBeenCalled();
    stopMonitor(handle);
  });

  it('should poll on every 2-second interval tick', () => {
    mockCpu(0.30); // below threshold

    startMonitor(console);
    jest.advanceTimersByTime(10000); // 5 intervals of 2s

    // cpuUsage called once per tick → 5 times
    expect(osUtils.cpuUsage).toHaveBeenCalledTimes(5);
  });
});

describe('CPU Monitor — stopMonitor', () => {
  it('should clear the interval when stopMonitor is called', () => {
    mockCpu(0.10);

    const handle = startMonitor(console);
    stopMonitor(handle);

    // After stopping, advancing time should trigger no more calls
    const callsBeforeAdvance = osUtils.cpuUsage.mock.calls.length;
    jest.advanceTimersByTime(10000);
    expect(osUtils.cpuUsage).toHaveBeenCalledTimes(callsBeforeAdvance);
  });

  it('should not throw if stopMonitor is called with undefined', () => {
    expect(() => stopMonitor(undefined)).not.toThrow();
    expect(() => stopMonitor(null)).not.toThrow();
  });
});
