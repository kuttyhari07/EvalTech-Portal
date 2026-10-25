import crypto from 'crypto';

export interface SebConfigOptions {
  examCode: string;
  examTitle: string;
  startUrl: string;
  quitUrl?: string;
  exitPassword?: string;
  browserExamKey?: string;
}

export class SebService {
  /**
   * Generates a valid Safe Exam Browser (.seb) XML Property List (plist) configuration
   */
  static generateSebXml(options: SebConfigOptions): string {
    const {
      examTitle,
      startUrl,
      quitUrl,
      exitPassword,
      browserExamKey,
    } = options;

    let hashedQuitPassword = '';
    if (exitPassword && exitPassword.trim()) {
      hashedQuitPassword = crypto
        .createHash('sha256')
        .update(exitPassword.trim())
        .digest('hex');
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>originatorVersion</key>
    <string>SEB_EvalTech_3.7</string>
    <key>startURL</key>
    <string>${escapeXml(startUrl)}</string>
    <key>startResource</key>
    <string></string>
    <key>sebServerURL</key>
    <string></string>
    <key>hashedAdminPassword</key>
    <string></string>
    <key>allowQuit</key>
    <true/>
    <key>ignoreExitKeys</key>
    <false/>
    <key>hashedQuitPassword</key>
    <string>${hashedQuitPassword}</string>
    <key>exitKey1</key>
    <integer>2</integer>
    <key>exitKey2</key>
    <integer>10</integer>
    <key>exitKey3</key>
    <integer>5</integer>
    <key>quitURL</key>
    <string>${escapeXml(quitUrl || startUrl + '/quit')}</string>
    <key>quitURLConfirm</key>
    <true/>
    <key>browserExamKey</key>
    <string>${escapeXml(browserExamKey || '')}</string>
    <key>sendBrowserExamKey</key>
    <${browserExamKey ? 'true' : 'false'}/>
    <key>allowPreferencesWindow</key>
    <false/>
    <key>browserWindowAllowReload</key>
    <true/>
    <key>browserWindowShowURL</key>
    <integer>0</integer>
    <key>enableAltTab</key>
    <false/>
    <key>enableWindowsKey</key>
    <false/>
    <key>enableCtrlEsc</key>
    <false/>
    <key>enableF1</key>
    <false/>
    <key>enableF2</key>
    <false/>
    <key>enableF3</key>
    <false/>
    <key>enableF4</key>
    <false/>
    <key>enableF5</key>
    <false/>
    <key>enableF6</key>
    <false/>
    <key>enableF7</key>
    <false/>
    <key>enableF8</key>
    <false/>
    <key>enableF9</key>
    <false/>
    <key>enableF10</key>
    <false/>
    <key>enableF11</key>
    <false/>
    <key>enableF12</key>
    <false/>
    <key>enablePrintScreen</key>
    <false/>
    <key>killExplorerShell</key>
    <false/>
    <key>hookKeys</key>
    <true/>
    <key>allowVirtualMachine</key>
    <false/>
    <key>blockScreenCapture</key>
    <true/>
    <key>allowSpellCheck</key>
    <false/>
    <key>showTaskBar</key>
    <true/>
    <key>showQuitButton</key>
    <true/>
    <key>taskBarHeight</key>
    <integer>40</integer>
    <key>showReloadButton</key>
    <false/>
    <key>showTime</key>
    <true/>
    <key>showInputLanguage</key>
    <false/>
    <key>browserViewMode</key>
    <integer>0</integer>
    <key>examTitle</key>
    <string>${escapeXml(examTitle)}</string>
</dict>
</plist>`;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
