import { spawn } from 'child_process';
import { config } from '../config.js';

const PYTHON_SCRIPT = 'import sys, webbrowser; webbrowser.open(sys.argv[1])';

function getPythonCandidates() {
  if (config.pythonExecutable) {
    return [config.pythonExecutable];
  }

  if (process.platform === 'win32') {
    return ['py', 'python', 'python3'];
  }

  return ['python3', 'python'];
}

function tryOpenWithCommand(command, url) {
  return new Promise((resolve) => {
    const child = spawn(command, ['-c', PYTHON_SCRIPT, url], {
      stdio: 'ignore',
      windowsHide: true,
    });

    let settled = false;

    const finalize = (opened, error = null) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ opened, error, command });
    };

    child.on('error', (error) => {
      finalize(false, error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        finalize(true);
        return;
      }

      finalize(false, new Error(`Python exited with code ${code}`));
    });
  });
}

export async function openWithPythonWebbrowser(url) {
  if (!config.enablePythonBrowserOpen) {
    return { opened: false, reason: 'disabled_by_config' };
  }

  if (!url || typeof url !== 'string') {
    return { opened: false, reason: 'invalid_url' };
  }

  const candidates = getPythonCandidates();
  let lastError = null;

  for (const command of candidates) {
    const result = await tryOpenWithCommand(command, url);
    if (result.opened) {
      return { opened: true, command: result.command };
    }

    lastError = result.error;
  }

  return {
    opened: false,
    reason: 'python_not_available_or_failed',
    error: lastError ? String(lastError.message || lastError) : null,
  };
}
