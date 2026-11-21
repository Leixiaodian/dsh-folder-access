window.__ModuleLoader__.load({
  id: '@local/dsh-folder-access',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ---------------------------------------------------------------------
    // Bridge (the Host serves these under /api/folder-access/*)
    // ---------------------------------------------------------------------

    const BRIDGE = 'api/folder-access'

    function bridgeUrl(endpoint) {
      try {
        return new URL(`${BRIDGE}/${endpoint}`, document.baseURI).toString()
      } catch {
        return `/${BRIDGE}/${endpoint}`
      }
    }

    async function call(endpoint, payload) {
      const response = await fetch(bridgeUrl(endpoint), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {}),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    // ---------------------------------------------------------------------
    // Locale
    // ---------------------------------------------------------------------

    const MESSAGES = {
      zh: {
        panelLabel: '文件夹访问',
        title: '文件夹访问权限',
        subtitle: '控制 DSH 工具可以访问的文件夹。黑名单优先；白名单为空时不限制访问范围，只应用黑名单。',
        enabledOn: '限制已启用',
        enabledOff: '限制未启用',
        switchName: '启用限制',
        switchLabel: '启用文件夹访问限制',
        blockedChip: (count) => `已拦截 ${count} 次`,
        whitelistTitle: '白名单',
        whitelistHint: '非空时，只允许访问这些文件夹及其子文件夹。',
        blacklistTitle: '黑名单',
        blacklistHint: '这些文件夹及其子文件夹始终拒绝访问，优先于白名单。',
        emptyWhitelist: '还没有白名单文件夹，当前不限制可访问范围。',
        emptyBlacklist: '还没有黑名单文件夹。',
        addPlaceholder: '文件夹绝对路径，例如 D:\\work',
        add: '添加',
        pick: '选择文件夹…',
        remove: '移除',
        quickWorkspace: '添加当前工作区',
        quickHome: '添加用户目录',
        saved: '已保存并立即生效',
        saveFailed: '保存失败',
        duplicate: '该文件夹已在列表中',
        duplicateOther: '该路径已在另一份列表中',
        relativePath: '请输入完整的绝对路径，例如 D:\\work',
        tooLong: '路径过长',
        policyLoadError: '策略文件读取失败，限制当前未生效',
        rulesInactive: '限制未启用，下面的规则只保存、暂不生效。',
        checkTitle: '检查路径',
        checkHint: '按当前策略判断一个路径会被允许还是拒绝。',
        checkPlaceholder: '要检查的路径',
        checkBtn: '检查',
        checkAllowed: '允许访问',
        checkDenied: '将拒绝访问',
        checkDisabled: '限制未启用，当前不会拦截任何路径。',
        checkBlacklistRule: (rule) => `命中黑名单：${rule}`,
        checkWhitelistRule: '不在任何白名单文件夹内',
        denialsTitle: '最近拦截',
        denialsEmpty: '还没有拦截记录。',
        refresh: '刷新',
        toolLabel: '工具',
        policyFile: '策略文件',
        limits:
          '说明：本策略在工具调用层拦截，只能收紧、不能放开 DSH 沙箱。文件类工具按路径参数精确检查；shell 命令按命令文本中的绝对路径和工作目录检查，无法完全阻止脚本内部的路径拼接。',
        loading: '正在读取策略…',
        loadFailed: '读取策略失败',
        retry: '重试',
        noBridge: '无法连接宿主插件，请确认插件已启用后刷新页面。',
        blockedLabel: '拦截',
        warnWhitelist: '当前工作区不在白名单内，这个会话的文件工具会全部被拒绝。',
        warnBlacklist: '当前工作区位于黑名单内，这个会话的文件工具会全部被拒绝。',
        warnAddWorkspace: '把当前工作区加入白名单',
        warnRemoveWorkspace: '把当前工作区移出黑名单',
      },
      en: {
        panelLabel: 'Folder access',
        title: 'Folder access',
        subtitle:
          'Control which folders DSH tools may touch. The blacklist wins; an empty whitelist only applies the blacklist.',
        enabledOn: 'Restrictions on',
        enabledOff: 'Restrictions off',
        switchName: 'Enable restrictions',
        switchLabel: 'Enable folder access restrictions',
        blockedChip: (count) => `${count} blocked`,
        whitelistTitle: 'Whitelist',
        whitelistHint: 'When non-empty, only these folders and their subfolders are reachable.',
        blacklistTitle: 'Blacklist',
        blacklistHint: 'These folders and their subfolders are always denied, overriding the whitelist.',
        emptyWhitelist: 'No folders yet — access is not narrowed.',
        emptyBlacklist: 'No blocked folders yet.',
        addPlaceholder: 'Absolute folder path, e.g. D:\\work',
        add: 'Add',
        pick: 'Choose folder…',
        remove: 'Remove',
        quickWorkspace: 'Add workspace',
        quickHome: 'Add home',
        saved: 'Saved and active',
        saveFailed: 'Save failed',
        duplicate: 'That folder is already listed',
        duplicateOther: 'That path is already in the other list',
        relativePath: 'Enter a full absolute path, for example D:\\work',
        tooLong: 'That path is too long',
        policyLoadError: 'Could not read the policy file; restrictions are not active',
        rulesInactive: 'Restrictions are off, so these rules are saved but inactive.',
        checkTitle: 'Check a path',
        checkHint: 'See whether the current policy allows or denies a path.',
        checkPlaceholder: 'Path to check',
        checkBtn: 'Check',
        checkAllowed: 'Allowed',
        checkDenied: 'Would be denied',
        checkDisabled: 'Restrictions are off, so nothing is blocked.',
        checkBlacklistRule: (rule) => `Matches blacklist: ${rule}`,
        checkWhitelistRule: 'Not inside any whitelisted folder',
        denialsTitle: 'Recent blocks',
        denialsEmpty: 'Nothing has been blocked yet.',
        refresh: 'Refresh',
        toolLabel: 'Tool',
        policyFile: 'Policy file',
        limits:
          'Note: this policy denies tool calls; it can narrow but never widen the DSH sandbox. File tools are checked by exact path arguments; shell commands are checked by absolute paths in the command text and by their working directory, so path building inside a script cannot be fully prevented.',
        loading: 'Reading policy…',
        loadFailed: 'Could not read the policy',
        retry: 'Retry',
        noBridge: 'Cannot reach the Host plugin; make sure it is enabled, then reload the page.',
        blockedLabel: 'Blocked',
        warnWhitelist: 'The current workspace is not on the whitelist, so every file tool call in this session will be denied.',
        warnBlacklist: 'The current workspace is inside a blacklisted folder, so every file tool call in this session will be denied.',
        warnAddWorkspace: 'Add the workspace to the whitelist',
        warnRemoveWorkspace: 'Remove the workspace from the blacklist',
      },
    }

    let localeService = null
    let activeLocale = 'zh'
    const localeListeners = new Set()
    let picker = null

    function messages() {
      return MESSAGES[activeLocale] || MESSAGES.zh
    }

    function refreshLocale() {
      try {
        const snapshot = localeService && localeService.getLocale ? localeService.getLocale() : null
        const id = snapshot && snapshot.active ? String(snapshot.active) : ''
        if (id) activeLocale = /^zh/i.test(id) ? 'zh' : 'en'
      } catch {
        // Keep the current language.
      }
      for (const listener of localeListeners) {
        try {
          listener()
        } catch {
          // A broken subscriber must not break the panel.
        }
      }
    }

    function useLocaleRefresh() {
      const [, setVersion] = React.useState(0)
      React.useEffect(() => {
        const listener = () => setVersion((value) => value + 1)
        localeListeners.add(listener)
        return () => localeListeners.delete(listener)
      }, [])
    }

    // ---------------------------------------------------------------------
    // Sidebar icon
    // ---------------------------------------------------------------------

    function FolderAccessIcon(props) {
      const size = (props && props.size) || 18
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M3.4 7.1c0-1.1.9-2 2-2h3c.5 0 1 .2 1.4.5l1.3 1c.4.3.9.5 1.4.5h5.1c1.1 0 2 .9 2 2v8.1c0 1.1-.9 2-2 2H5.4c-1.1 0-2-.9-2-2z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M14.9 12.6v-1a2.1 2.1 0 0 1 4.2 0v1',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
        h('rect', { x: 13.7, y: 12.5, width: 6.6, height: 5, rx: 1.2, fill: 'currentColor' }),
      )
    }

    // ---------------------------------------------------------------------
    // Page
    // ---------------------------------------------------------------------

    const CSS = `
.fa-page { height: 100%; min-height: 0; overflow-y: auto; box-sizing: border-box; padding: 24px 32px 48px; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 1.55; container-type: inline-size; }
.fa-inner { max-width: 860px; min-width: 0; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
.fa-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.fa-head-text { min-width: 0; }
.fa-title { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: .2px; }
.fa-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--dsw-alias-label-secondary); max-width: 560px; }
.fa-master { display: flex; align-items: center; gap: 10px; flex: none; padding-top: 2px; }
.fa-master-label { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.fa-switch { position: relative; width: 40px; height: 22px; padding: 0; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); cursor: pointer; transition: background .15s ease, border-color .15s ease; }
.fa-switch.is-on { background: var(--dsw-alias-brand-primary); border-color: transparent; }
.fa-switch:disabled { opacity: .5; cursor: default; }
.fa-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .15s ease; }
.fa-switch.is-on .fa-knob { transform: translateX(18px); }
.fa-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.fa-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.fa-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); }
.fa-dot.is-on { background: var(--dsw-alias-state-success-primary); }
.fa-dot.is-blocked { background: var(--dsw-alias-state-warn-primary); }
.fa-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); padding: 14px 16px 16px; }
.fa-card-head { display: flex; align-items: baseline; gap: 8px; }
.fa-card-title { margin: 0; font-size: 13.5px; font-weight: 600; }
.fa-count { font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.fa-hint { margin: 4px 0 10px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.fa-empty { margin: 0 0 10px; padding: 10px 12px; border-radius: 8px; border: 1px dashed var(--dsw-alias-border-l1); font-size: 12px; color: var(--dsw-alias-label-secondary); }
.fa-list { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.fa-row { display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 10px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); }
.fa-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 12px; }
.fa-remove { flex: none; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; font-size: 13px; line-height: 1; }
.fa-remove:hover:not(:disabled) { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-state-error-primary); }
.fa-remove:disabled { opacity: .4; cursor: default; }
.fa-add { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.fa-input { flex: 1 1 220px; min-width: 0; height: 30px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; outline: none; }
.fa-input::placeholder { color: var(--dsw-alias-label-secondary); }
.fa-input:focus { border-color: var(--dsw-alias-brand-primary); }
.fa-btn { flex: none; display: inline-flex; align-items: center; justify-content: center; height: 30px; padding: 0 12px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
.fa-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.fa-btn:disabled { opacity: .5; cursor: default; }
.fa-btn-primary { border-color: transparent; background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-base); }
.fa-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-label-primary); opacity: .88; }
.fa-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.fa-quick .fa-btn { height: 26px; font-size: 12px; padding: 0 10px; color: var(--dsw-alias-label-secondary); }
.fa-result { margin-top: 10px; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); font-size: 12px; }
.fa-result.is-allow { border-color: var(--dsw-alias-state-success-primary); }
.fa-result.is-deny { border-color: var(--dsw-alias-state-error-primary); }
.fa-result-title { font-weight: 600; }
.fa-result-path { margin-top: 3px; font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 11.5px; color: var(--dsw-alias-label-secondary); word-break: break-all; }
.fa-denials { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.fa-denial { display: flex; align-items: baseline; gap: 8px; padding: 6px 10px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); font-size: 12px; }
.fa-denial-time { flex: none; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; font-size: 11.5px; }
.fa-denial-tool { flex: none; padding: 0 6px; border-radius: 5px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); font-size: 11px; font-family: ui-monospace, "Cascadia Code", Consolas, monospace; }
.fa-denial-path { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 11.5px; }
.fa-foot { margin-top: 4px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); display: flex; flex-direction: column; gap: 4px; }
.fa-foot code { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; word-break: break-all; }
.fa-note { position: sticky; top: 0; z-index: 3; padding: 6px 10px; border-radius: 8px; background: var(--dsw-alias-bg-base); font-size: 12px; }
.fa-note.is-ok { color: var(--dsw-alias-state-success-primary); }
.fa-note.is-error { color: var(--dsw-alias-state-error-primary); }
.fa-warn { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--dsw-alias-state-warn-primary); background: var(--dsw-alias-bg-layer-1); }
.fa-warn.is-error { border-color: var(--dsw-alias-state-error-primary); }
.fa-warn-text { flex: 1 1 320px; font-size: 12px; }
.fa-warn-path { flex: 0 1 auto; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.fa-inactive { padding: 0 2px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.fa-switch:focus-visible, .fa-btn:focus-visible, .fa-remove:focus-visible, .fa-input:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.fa-center { max-width: 860px; margin: 0 auto; padding: 24px 32px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
.fa-center .fa-btn { margin-top: 10px; }
@media (max-width: 720px) { .fa-page { padding: 18px 16px 36px; } }
@container (max-width: 640px) {
  .fa-head { flex-direction: column; align-items: stretch; gap: 12px; }
  .fa-master { justify-content: flex-start; }
}
`

    function samePath(left, right) {
      const clean = (value) =>
        String(value || '')
          .trim()
          .replace(/[\\/]+/g, '/')
          .replace(/\/+$/, '')
          .toLowerCase()
      return clean(left) === clean(right)
    }

    function isUnderPath(child, parent) {
      const clean = (value) =>
        String(value || '')
          .trim()
          .replace(/[\\/]+/g, '/')
          .replace(/\/+$/, '')
          .toLowerCase()
      const target = clean(child)
      const root = clean(parent)
      if (!target || !root) return false
      return target === root || target.startsWith(`${root}/`)
    }

    function FolderAccessPage() {
      useLocaleRefresh()
      const t = messages()
      const [view, setView] = React.useState({ status: 'loading' })
      const [busy, setBusy] = React.useState(false)
      const [note, setNote] = React.useState(null)
      const [draft, setDraft] = React.useState({ whitelist: '', blacklist: '' })
      const [checkPath, setCheckPath] = React.useState('')
      const [checkResult, setCheckResult] = React.useState(null)
      const noteTimer = React.useRef(null)
      const busyRef = React.useRef(false)

      React.useEffect(
        () => () => {
          if (noteTimer.current) clearTimeout(noteTimer.current)
        },
        [],
      )

      const load = React.useCallback(async () => {
        try {
          const result = await call('describe')
          if (result && result.ok) setView({ status: 'ready', data: result.value })
          else setView({ status: 'error', message: (result && result.message) || t.loadFailed })
        } catch (error) {
          setView({ status: 'error', message: String((error && error.message) || error) })
        }
      }, [t.loadFailed])

      React.useEffect(() => {
        load()
      }, [load])

      if (view.status === 'loading') {
        return h('div', { className: 'fa-page' }, h('style', null, CSS), h('div', { className: 'fa-center' }, t.loading))
      }

      if (view.status === 'error') {
        return h(
          'div',
          { className: 'fa-page' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'fa-center' },
            h('div', null, `${t.loadFailed}: ${view.message}`),
            h('div', null, t.noBridge),
            h(
              'button',
              {
                type: 'button',
                className: 'fa-btn',
                onClick: () => {
                  setView({ status: 'loading' })
                  load()
                },
              },
              t.retry,
            ),
          ),
        )
      }

      const data = view.data
      const policy = data.policy || { enabled: false, whitelist: [], blacklist: [] }
      const enabled = policy.enabled === true
      const workspaceRoot = data.workspaceRoot
      const workspaceBlacklisted =
        enabled && Boolean(workspaceRoot) && policy.blacklist.some((entry) => isUnderPath(workspaceRoot, entry))
      const workspaceMissing =
        Boolean(workspaceRoot) &&
        enabled &&
        !workspaceBlacklisted &&
        policy.whitelist.length > 0 &&
        !policy.whitelist.some((entry) => isUnderPath(workspaceRoot, entry))

      function showNote(kind, text) {
        if (noteTimer.current) clearTimeout(noteTimer.current)
        setNote({ kind, text })
        if (kind === 'ok') noteTimer.current = setTimeout(() => setNote(null), 4000)
      }

      async function commit(next) {
        if (busyRef.current) return
        busyRef.current = true
        setBusy(true)
        if (noteTimer.current) clearTimeout(noteTimer.current)
        setNote(null)
        try {
          const saved = await call('save', next)
          if (!saved || !saved.ok) {
            showNote('error', `${t.saveFailed}：${(saved && saved.message) || 'unknown error'}`)
            return
          }
          const described = await call('describe')
          if (described && described.ok) setView({ status: 'ready', data: described.value })
          showNote('ok', t.saved)
        } catch (error) {
          showNote('error', `${t.saveFailed}：${String((error && error.message) || error)}`)
        } finally {
          busyRef.current = false
          setBusy(false)
        }
      }

      function nextPolicy() {
        return {
          enabled,
          whitelist: policy.whitelist.slice(),
          blacklist: policy.blacklist.slice(),
        }
      }

      function addEntry(field, explicit) {
        const value = String(explicit == null ? draft[field] : explicit).trim()
        if (!value) return
        if (value.length > 1024) {
          showNote('error', t.tooLong)
          return
        }
        const absolute = /^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value) || /^\//.test(value) || /^~([\\/]|$)/.test(value)
        if (!absolute) {
          showNote('error', t.relativePath)
          return
        }
        if (policy[field].some((entry) => samePath(entry, value))) {
          showNote('error', t.duplicate)
          return
        }
        const other = field === 'whitelist' ? 'blacklist' : 'whitelist'
        if (policy[other].some((entry) => samePath(entry, value))) {
          showNote('error', t.duplicateOther)
          return
        }
        const next = nextPolicy()
        next[field].push(value)
        setDraft((previous) => ({ ...previous, [field]: '' }))
        commit(next)
      }

      function removeEntry(field, index) {
        const next = nextPolicy()
        next[field].splice(index, 1)
        commit(next)
      }

      async function pickInto(field) {
        if (!picker) return
        try {
          const directory = await picker.pickDirectory()
          if (directory) addEntry(field, directory)
        } catch (error) {
          showNote('error', `${t.saveFailed}：${String((error && error.message) || error)}`)
        }
      }

      function removeWorkspaceFromBlacklist() {
        const index = policy.blacklist.findIndex((entry) => isUnderPath(workspaceRoot, entry))
        if (index >= 0) removeEntry('blacklist', index)
      }

      async function runCheck() {
        const target = checkPath.trim()
        if (!target) return
        try {
          const result = await call('check', { path: target })
          if (result && result.ok) setCheckResult(result.value)
          else showNote('error', (result && result.message) || t.loadFailed)
        } catch (error) {
          showNote('error', `${t.loadFailed}：${String((error && error.message) || error)}`)
        }
      }

      function quickAdd(field, value) {
        if (value) addEntry(field, value)
      }

      function folderCard(field, title, hint, emptyText) {
        const entries = policy[field]
        return h(
          'section',
          { className: 'fa-card', key: field },
          h('div', { className: 'fa-card-head' }, h('h2', { className: 'fa-card-title' }, title), h('span', { className: 'fa-count' }, String(entries.length))),
          h('p', { className: 'fa-hint' }, hint),
          entries.length === 0
            ? h('p', { className: 'fa-empty' }, emptyText)
            : h(
                'ul',
                { className: 'fa-list' },
                entries.map((entry, index) =>
                  h(
                    'li',
                    { className: 'fa-row', key: `${entry}-${index}` },
                    h('span', { className: 'fa-path', title: entry }, entry),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'fa-remove',
                        'aria-label': t.remove,
                        title: t.remove,
                        disabled: busy,
                        onClick: () => removeEntry(field, index),
                      },
                      '\u2715',
                    ),
                  ),
                ),
              ),
          h(
            'div',
            { className: 'fa-add' },
            h('input', {
              className: 'fa-input',
              value: draft[field],
              placeholder: t.addPlaceholder,
              spellCheck: false,
              autoComplete: 'off',
              'aria-label': title,
              onChange: (event) => setDraft((previous) => ({ ...previous, [field]: event.target.value })),
              onKeyDown: (event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addEntry(field)
                }
              },
            }),
            h('button', { type: 'button', className: 'fa-btn fa-btn-primary', disabled: busy, onClick: () => addEntry(field) }, t.add),
            picker
              ? h('button', { type: 'button', className: 'fa-btn', disabled: busy, onClick: () => pickInto(field) }, t.pick)
              : null,
          ),
          entries.length === 0 && field === 'whitelist' && (data.workspaceRoot || data.home)
            ? h(
                'div',
                { className: 'fa-quick' },
                data.workspaceRoot
                  ? h('button', { type: 'button', className: 'fa-btn', disabled: busy, onClick: () => quickAdd(field, data.workspaceRoot) }, `+ ${t.quickWorkspace}`)
                  : null,
                data.home ? h('button', { type: 'button', className: 'fa-btn', disabled: busy, onClick: () => quickAdd(field, data.home) }, `+ ${t.quickHome}`) : null,
              )
            : null,
        )
      }

      const denials = Array.isArray(data.denials) ? data.denials : []

      return h(
        'div',
        { className: 'fa-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'fa-inner' },
          h(
            'header',
            { className: 'fa-head' },
            h('div', { className: 'fa-head-text' }, h('h1', { className: 'fa-title' }, t.title), h('p', { className: 'fa-sub' }, t.subtitle)),
            h(
              'div',
              { className: 'fa-master' },
              h('span', { className: 'fa-master-label' }, t.switchName),
              h(
                'button',
                {
                  type: 'button',
                  role: 'switch',
                  'aria-checked': enabled,
                  'aria-label': t.switchLabel,
                  title: t.switchLabel,
                  className: `fa-switch${enabled ? ' is-on' : ''}`,
                  disabled: busy,
                  onClick: () => commit({ ...nextPolicy(), enabled: !enabled }),
                },
                h('span', { className: 'fa-knob' }),
              ),
            ),
          ),
          h(
            'div',
            { className: 'fa-chips' },
            h('span', { className: 'fa-chip' }, h('span', { className: `fa-dot${enabled ? ' is-on' : ''}` }), enabled ? t.enabledOn : t.enabledOff),
            h('span', { className: 'fa-chip' }, h('span', { className: 'fa-dot is-blocked' }), t.blockedChip(data.blockedCount || 0)),
          ),
          data.loadError
            ? h(
                'div',
                { className: 'fa-warn is-error' },
                h('div', { className: 'fa-warn-text' }, `${t.policyLoadError}：${data.loadError}`),
              )
            : null,
          note ? h('div', { className: `fa-note ${note.kind === 'error' ? 'is-error' : 'is-ok'}`, role: 'status', 'aria-live': 'polite' }, note.text) : null,
          workspaceBlacklisted || workspaceMissing
            ? h(
                'div',
                { className: 'fa-warn' },
                h('div', { className: 'fa-warn-text' }, workspaceBlacklisted ? t.warnBlacklist : t.warnWhitelist),
                h('div', { className: 'fa-warn-path' }, workspaceRoot),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fa-btn',
                    disabled: busy,
                    onClick: () => (workspaceBlacklisted ? removeWorkspaceFromBlacklist() : addEntry('whitelist', workspaceRoot)),
                  },
                  workspaceBlacklisted ? t.warnRemoveWorkspace : t.warnAddWorkspace,
                ),
              )
            : null,
          !enabled ? h('div', { className: 'fa-inactive' }, t.rulesInactive) : null,
          folderCard('whitelist', t.whitelistTitle, t.whitelistHint, t.emptyWhitelist),
          folderCard('blacklist', t.blacklistTitle, t.blacklistHint, t.emptyBlacklist),
          h(
            'section',
            { className: 'fa-card' },
            h('h2', { className: 'fa-card-title' }, t.checkTitle),
            h('p', { className: 'fa-hint' }, t.checkHint),
            h(
              'div',
              { className: 'fa-add' },
              h('input', {
                className: 'fa-input',
                value: checkPath,
                placeholder: t.checkPlaceholder,
                spellCheck: false,
                autoComplete: 'off',
                'aria-label': t.checkPlaceholder,
                onChange: (event) => setCheckPath(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    runCheck()
                  }
                },
              }),
              h('button', { type: 'button', className: 'fa-btn', disabled: busy || !checkPath.trim(), onClick: runCheck }, t.checkBtn),
            ),
            checkResult
              ? h(
                  'div',
                  { className: `fa-result ${checkResult.allowed ? 'is-allow' : 'is-deny'}` },
                  h('div', { className: 'fa-result-title' }, checkResult.allowed ? t.checkAllowed : t.checkDenied),
                  h(
                    'div',
                    { className: 'fa-result-path' },
                    !checkResult.enabled
                      ? t.checkDisabled
                      : checkResult.kind === 'blacklist'
                        ? t.checkBlacklistRule(checkResult.rule || '')
                        : checkResult.kind === 'whitelist'
                          ? t.checkWhitelistRule
                          : '',
                  ),
                  checkResult.path ? h('div', { className: 'fa-result-path' }, checkResult.path) : null,
                )
              : null,
          ),
          h(
            'section',
            { className: 'fa-card' },
            h(
              'div',
              { className: 'fa-card-head' },
              h('h2', { className: 'fa-card-title' }, t.denialsTitle),
              h('span', { className: 'fa-count' }, String(denials.length)),
              h('span', { style: { flex: '1' } }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'fa-btn',
                  style: { height: '24px', padding: '0 9px', fontSize: '11.5px' },
                  disabled: busy,
                  onClick: load,
                },
                t.refresh,
              ),
            ),
            denials.length === 0
              ? h('p', { className: 'fa-hint', style: { margin: '6px 0 0' } }, t.denialsEmpty)
              : h(
                  'ul',
                  { className: 'fa-denials' },
                  denials.map((denial, index) =>
                    h(
                      'li',
                      { className: 'fa-denial', key: `${denial.at}-${index}` },
                      h('span', { className: 'fa-denial-time' }, new Date(denial.at).toLocaleTimeString()),
                      h('span', { className: 'fa-denial-tool' }, denial.tool || 'tool'),
                      h('span', { className: 'fa-denial-path', title: denial.path }, denial.path),
                      denial.rule ? h('span', { className: 'fa-denial-time' }, denial.rule) : null,
                    ),
                  ),
                ),
          ),
          h(
            'footer',
            { className: 'fa-foot' },
            h('div', null, `${t.policyFile}: `, h('code', null, data.policyFile || '')),
            h('div', null, t.limits),
          ),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.inject(['locale'], (scoped) => {
          localeService = scoped.get('locale') || null
          refreshLocale()
          scoped.effect(() => localeService.subscribe(refreshLocale))
        })
        ctx.inject(['uiWorkspace'], (scoped) => {
          picker = scoped.get('uiWorkspace') || null
        })
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'folder-access',
              order: 40,
              label: () => messages().panelLabel,
            },
            FolderAccessIcon,
          ),
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: 'folder-access',
            },
            FolderAccessPage,
          ),
        )
      },
    }
  },
})
