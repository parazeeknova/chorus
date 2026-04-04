interface CommandAttempt {
  args: string[];
  command: string;
}

async function runDetached(command: string, args: string[]): Promise<boolean> {
  try {
    const proc = Bun.spawn({
      cmd: [command, ...args],
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });

    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

export class AuthLoginLauncher {
  async launch(directory: string): Promise<boolean> {
    const shellCommand = `cd ${JSON.stringify(directory)} && opencode auth login`;

    switch (process.platform) {
      case "darwin":
        return runDetached("osascript", [
          "-e",
          `tell application "Terminal" to do script ${JSON.stringify(shellCommand)}`,
        ]);

      case "linux": {
        const attempts: CommandAttempt[] = [
          {
            command: "x-terminal-emulator",
            args: ["-e", "bash", "-lc", shellCommand],
          },
          {
            command: "gnome-terminal",
            args: ["--", "bash", "-lc", shellCommand],
          },
          {
            command: "konsole",
            args: ["-e", "bash", "-lc", shellCommand],
          },
          {
            command: "xfce4-terminal",
            args: ["--command", `bash -lc ${JSON.stringify(shellCommand)}`],
          },
          {
            command: "kitty",
            args: ["bash", "-lc", shellCommand],
          },
          {
            command: "alacritty",
            args: ["-e", "bash", "-lc", shellCommand],
          },
          {
            command: "wezterm",
            args: [
              "start",
              "--cwd",
              directory,
              "--",
              "opencode",
              "auth",
              "login",
            ],
          },
        ];

        for (const attempt of attempts) {
          if (await runDetached(attempt.command, attempt.args)) {
            return true;
          }
        }

        return false;
      }

      case "win32":
        return runDetached("powershell", [
          "-NoProfile",
          "-Command",
          `Start-Process powershell -ArgumentList '-NoExit','-Command',${JSON.stringify(`Set-Location ${directory}; opencode auth login`)}`,
        ]);

      default:
        return false;
    }
  }
}
