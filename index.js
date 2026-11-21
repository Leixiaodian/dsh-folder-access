/**
 * Host half of the folder-access plugin.
 *
 * Owns three things:
 *   1. the persisted policy (whitelist / blacklist / enabled) in `$DSH_HOME/folder-access-policy.json`;
 *   2. enforcement through one global `ctx.tools.guard()`, which denies a tool
 *      call when one of its path arguments leaves the whitelist or enters the blacklist;
 *   3. the JSON bridge the sidebar panel talks to under `/api/folder-access/*`.
 *
 * The guard only ever narrows: it never grants access that the sandbox would deny.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const inject = ['tools']

const ROUTE_PREFIX = '/api/folder-access'
const POLICY_VERSION = 1
const MAX_ENTRIES = 200
const MAX_DENIALS = 20
const MAX_BODY_BYTES = 64 * 1024
const MAX_PATH_CHARS = 1024

/** Argument names that always carry a filesystem path. Compared after lowercasing and stripping `-`, `_`, spaces. */
const STRONG_PATH_KEYS = new Set([
  'path', 'paths', 'file', 'files', 'filepath', 'filename', 'dir', 'directory',
  'cwd', 'workdir', 'workingdir', 'cd', 'folder', 'folders',
])

/** Argument names that carry a path only when the value looks like one (`target: 'this_session'` is not a path). */
const WEAK_PATH_KEYS = new Set([
  'target', 'destination', 'dest', 'source', 'from', 'to', 'output', 'outputpath',
  'input', 'inputpath', 'prefix', 'root', 'location', 'locations',
])

/** Tools whose command text is scanned for absolute paths instead of trusting argument names. */
const SHELL_TOOLS = new Set(['pwsh', 'bash', 'cmd', 'shell'])

/** Tools that fall back to the session working directory when no path argument is given. */
const CWD_ROOTED_TOOLS = new Set(['glob', 'grep', 'pwsh', 'bash', 'cmd', 'shell'])

const WINDOWS_ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\\\\)/
const POSIX_ABSOLUTE = /^\//

const home = () => {
  const configured = process.env.DSH_HOME
  return configured && configured.trim() ? path.resolve(configured.trim()) : path.join(os.homedir(), '.dsh')
}

const POLICY_FILE = path.join(home(), 'folder-access-policy.json')

const state = {
  policy: emptyPolicy(),
  loadError: null,
  denials: [],
  blockedCount: 0,
}

let policyMtime = 0

function emptyPolicy() {
  return { version: POLICY_VERSION, enabled: false, whitelist: [], blacklist: [] }
}

// ---------------------------------------------------------------------------
// Path handling
// ---------------------------------------------------------------------------

/** Expand `~`, strip surrounding quotes, resolve against the process directory, and normalise separators. */
function expandPath(value, base) {
  let text = String(value == null ? '' : value).trim()
  if (!text) return ''
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim()
  }
  if (text === '~') text = os.homedir()
  else if (text.startsWith('~/') || text.startsWith('~\\')) text = path.join(os.homedir(), text.slice(2))
  if (!text) return ''
  if (!path.isAbsolute(text)) text = path.resolve(base || process.cwd(), text)
  return text
}

/** Resolve symlinks and junctions for the longest existing prefix, so a link cannot smuggle a path out of policy. */
function canonical(value) {
  try {
    return fs.realpathSync.native(value)
  } catch {
    // The file may not exist yet (write): canonicalise the nearest existing ancestor and re-append the rest.
  }
  const tail = []
  let current = value
  for (let depth = 0; depth < 64; depth += 1) {
    const parent = path.dirname(current)
    if (parent === current) return value
    tail.unshift(path.basename(current))
    current = parent
    try {
      const resolved = fs.realpathSync.native(current)
      return path.join(resolved, ...tail)
    } catch {
      // Keep walking up.
    }
  }
  return value
}

/** Comparison form: forward slashes, no trailing separator, case-folded on Windows. */
function comparable(value) {
  let text = path.resolve(value).replace(/[\\/]+/g, '/')
  text = text.replace(/\/+$/, '')
  if (!text) text = '/'
  return process.platform === 'win32' ? text.toLowerCase() : text
}

function isUnder(child, parent) {
  if (parent === '/') return true
  return child === parent || child.startsWith(parent + '/')
}

function isPathKey(key) {
  if (!key) return false
  return STRONG_PATH_KEYS.has(String(key).toLowerCase().replace(/[-_\s]/g, ''))
}

function isWeakPathKey(key) {
  if (!key) return false
  return WEAK_PATH_KEYS.has(String(key).toLowerCase().replace(/[-_\s]/g, ''))
}

/** True when a value can only plausibly be a filesystem path, not an enum value or a label. */
function looksLikePath(value) {
  const text = String(value || '').trim()
  if (!text) return false
  return (
    WINDOWS_ABSOLUTE.test(text) ||
    POSIX_ABSOLUTE.test(text) ||
    /^[~.]{1,2}[\\/]/.test(text) ||
    /[\\/]/.test(text)
  )
}

// ---------------------------------------------------------------------------
// Policy persistence
// ---------------------------------------------------------------------------

function sanitizeList(list) {
  const out = []
  const seen = new Set()
  for (const raw of Array.isArray(list) ? list : []) {
    if (typeof raw !== 'string') continue
    const text = raw.trim()
    if (!text || text.length > MAX_PATH_CHARS) continue
    const key = comparable(canonical(expandPath(text, os.homedir())))
    if (seen.has(key)) continue
    seen.add(key)
    out.push(expandPath(text, os.homedir()))
    if (out.length >= MAX_ENTRIES) break
  }
  return out
}

function sanitizePolicy(input) {
  const source = input && typeof input === 'object' ? input : {}
  return {
    version: POLICY_VERSION,
    enabled: source.enabled === true,
    whitelist: sanitizeList(source.whitelist),
    blacklist: sanitizeList(source.blacklist),
  }
}

function readPolicyDocument() {
  const text = fs.readFileSync(POLICY_FILE, 'utf8')
  // Notepad and PowerShell's `Set-Content -Encoding UTF8` prepend a BOM.
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
}

function loadPolicy() {
  try {
    state.policy = sanitizePolicy(readPolicyDocument())
    state.loadError = null
    policyMtime = fs.statSync(POLICY_FILE).mtimeMs
  } catch (error) {
    policyMtime = 0
    if (error && error.code === 'ENOENT') {
      state.policy = emptyPolicy()
      state.loadError = null
      return
    }
    state.policy = emptyPolicy()
    state.loadError = error instanceof Error ? error.message : String(error)
  }
}

/**
 * Pick up a policy file edited outside the panel. A transient parse failure keeps
 * the last good policy instead of silently lifting every restriction.
 */
function syncPolicyFromDisk() {
  let stat
  try {
    stat = fs.statSync(POLICY_FILE)
  } catch {
    return
  }
  if (stat.mtimeMs === policyMtime) return
  try {
    state.policy = sanitizePolicy(readPolicyDocument())
    state.loadError = null
    policyMtime = stat.mtimeMs
  } catch (error) {
    state.loadError = error instanceof Error ? error.message : String(error)
  }
}

function persistPolicy(policy) {
  fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true })
  const temporary = `${POLICY_FILE}.${process.pid}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(policy, null, 2)}\n`, 'utf8')
  fs.renameSync(temporary, POLICY_FILE)
  try {
    policyMtime = fs.statSync(POLICY_FILE).mtimeMs
  } catch {
    policyMtime = 0
  }
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

/** Absolute folder entries in comparison form, with the display text kept for messages. Cached per policy object. */
let rulesCache = { policy: null, whitelist: [], blacklist: [] }

function rulesOf(policy, field) {
  if (rulesCache.policy !== policy) {
    const build = (list) =>
      (list || []).map((text) => ({ text, key: comparable(canonical(expandPath(text, os.homedir()))) }))
    rulesCache = { policy, whitelist: build(policy.whitelist), blacklist: build(policy.blacklist) }
  }
  return rulesCache[field]
}

/**
 * @returns {{allowed: boolean, kind?: 'whitelist'|'blacklist', path: string, rule?: string}}
 */
function decide(policy, targetPath) {
  const absolute = canonical(targetPath)
  const shown = absolute
  if (!policy.enabled) return { allowed: true, path: shown }
  const blocked = rulesOf(policy, 'blacklist').find((rule) => isUnder(comparable(absolute), rule.key))
  if (blocked) return { allowed: false, kind: 'blacklist', path: shown, rule: blocked.text }
  if (policy.whitelist.length > 0) {
    const allowed = rulesOf(policy, 'whitelist')
    if (!allowed.some((rule) => isUnder(comparable(absolute), rule.key))) {
      return { allowed: false, kind: 'whitelist', path: shown }
    }
  }
  return { allowed: true, path: shown }
}

function sessionCwd(ctx, agent) {
  try {
    const workingDirectory = ctx.get('workingDirectory')
    const sessions = ctx.get('sessions')
    if (workingDirectory && sessions && agent && agent.id) {
      const session = sessions.get(agent.id)
      if (session) {
        const directory = workingDirectory.get(session)
        if (directory) return directory
      }
    }
    if (workingDirectory && typeof workingDirectory.defaultDirectory === 'string' && workingDirectory.defaultDirectory) {
      return workingDirectory.defaultDirectory
    }
  } catch {
    // Fall through to the process directory.
  }
  return process.cwd()
}

function collectPathArguments(value, key, out, depth) {
  if (depth > 8 || value == null) return
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return
    if (isPathKey(key) || (isWeakPathKey(key) && looksLikePath(text))) out.push(text)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPathArguments(item, key, out, depth + 1)
    return
  }
  if (typeof value === 'object') {
    for (const [childKey, item] of Object.entries(value)) collectPathArguments(item, childKey, out, depth + 1)
  }
}

/** Absolute-path tokens in a shell command line. Best effort: variables and nested scripts can hide a path. */
function scanCommandText(text, out) {
  if (typeof text !== 'string' || !text) return
  const pattern = /"([^"]+)"|'([^']+)'|(\S+)/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    const token = (match[1] || match[2] || match[3] || '').trim()
    if (!token) continue
    const cleaned = token.replace(/^[<>{},;=|&]+/, '').replace(/[<>{},;=|&]+$/, '')
    if (cleaned && (WINDOWS_ABSOLUTE.test(cleaned) || POSIX_ABSOLUTE.test(cleaned))) out.push(cleaned)
  }
}

function summarizeWhitelist(policy) {
  const shown = policy.whitelist.slice(0, 4).join('、')
  const suffix = policy.whitelist.length > 4 ? ` 等 ${policy.whitelist.length} 个` : ''
  return `${shown}${suffix}`
}

function denialMessage(policy, decision, subject) {
  if (decision.kind === 'blacklist') {
    return `文件夹访问策略拦截：${subject} 位于黑名单文件夹「${decision.rule}」内。可在左侧栏「文件夹访问」面板中调整。`
  }
  return `文件夹访问策略拦截：${subject} 不在白名单内（白名单：${summarizeWhitelist(policy)}）。可在左侧栏「文件夹访问」面板中调整。`
}

function recordDenial(tool, subject, decision) {
  state.blockedCount += 1
  state.denials.unshift({ at: Date.now(), tool, path: subject, kind: decision.kind || 'whitelist', rule: decision.rule || null })
  if (state.denials.length > MAX_DENIALS) state.denials.length = MAX_DENIALS
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

function makeGuard(ctx) {
  return function folderAccessGuard(execution) {
    try {
      return evaluate(execution)
    } catch {
      // A guard bug must not brick every tool call; the policy file remains the authority.
      return undefined
    }

    function evaluate(call) {
      syncPolicyFromDisk()
      const policy = state.policy
      if (!policy.enabled) return undefined
      const name = String(call.name || '')
      let args = call.arguments
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args)
        } catch {
          args = undefined
        }
      }
      const cwd = sessionCwd(ctx, call.agent)
      const raw = []
      collectPathArguments(args, '', raw, 0)
      const candidates = raw.map((value) => ({ value, origin: 'argument' }))
      if (SHELL_TOOLS.has(name) && args && typeof args === 'object') {
        const commandPaths = []
        scanCommandText(args.command, commandPaths)
        scanCommandText(args.script, commandPaths)
        for (const value of commandPaths) candidates.push({ value, origin: 'command' })
        if (typeof args.workdir !== 'string' || !args.workdir.trim()) candidates.push({ value: cwd, origin: 'cwd' })
      } else if (CWD_ROOTED_TOOLS.has(name) && !(args && typeof args.path === 'string' && args.path.trim())) {
        candidates.push({ value: cwd, origin: 'cwd' })
      }
      let firstDenial
      for (const candidate of candidates) {
        const absolute = expandPath(candidate.value, cwd)
        if (!absolute) continue
        const decision = decide(policy, absolute)
        if (decision.allowed) continue
        firstDenial = { absolute, decision, origin: candidate.origin }
        break
      }
      if (!firstDenial) return undefined
      const { absolute, decision } = firstDenial
      const subject =
        firstDenial.origin === 'cwd' ? `${SHELL_TOOLS.has(name) ? 'shell 工作目录' : '默认工作目录'} ${absolute}` : absolute
      recordDenial(name, absolute, decision)
      return {
        reason: denialMessage(policy, decision, subject),
        info: { name: 'FolderAccessPolicy', code: 'folder-access-denied' },
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

function writeJson(response, status, body) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  response.end(payload)
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size <= MAX_BODY_BYTES) chunks.push(chunk)
    })
    request.on('end', () => {
      if (size > MAX_BODY_BYTES) return resolve(undefined)
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text.trim() ? JSON.parse(text) : {})
      } catch {
        resolve(undefined)
      }
    })
    request.on('error', () => resolve(undefined))
  })
}

/** Reuse the Host's own browser-trust decision when it is available, and fail closed to loopback otherwise. */
function authorize(ctx, request) {
  try {
    const connection = ctx.get('connection')
    if (connection && typeof connection.admit === 'function') {
      const admission = connection.admit(request)
      if (admission && typeof admission === 'object') {
        if ('rejection' in admission) return false
        if ('peer' in admission) return true
      }
    }
  } catch {
    // Fall through to the loopback check.
  }
  const address = request.socket && request.socket.remoteAddress
  return address === '::1' || address === '127.0.0.1' || address === '::ffff:127.0.0.1'
}

function describe(ctx) {
  syncPolicyFromDisk()
  let workspaceRoot = null
  try {
    const workingDirectory = ctx.get('workingDirectory')
    if (workingDirectory && typeof workingDirectory.defaultDirectory === 'string') workspaceRoot = workingDirectory.defaultDirectory
  } catch {
    // Not available in this composition.
  }
  return {
    policy: state.policy,
    policyFile: POLICY_FILE,
    dshHome: home(),
    home: os.homedir(),
    platform: process.platform,
    workspaceRoot,
    denials: state.denials,
    blockedCount: state.blockedCount,
    loadError: state.loadError,
  }
}

function buildRoutes(ctx) {
  const guard = (request, response) => {
    if (!authorize(ctx, request)) {
      writeJson(response, 403, { ok: false, code: 'forbidden', message: 'request did not pass the browser-trust check' })
      return false
    }
    if (request.method !== 'POST') {
      writeJson(response, 405, { ok: false, code: 'method-not-allowed', message: 'POST required' })
      return false
    }
    return true
  }

  return [
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/describe`,
      handler: (request, response) => {
        if (!guard(request, response)) return
        writeJson(response, 200, { ok: true, value: describe(ctx) })
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/save`,
      handler: async (request, response) => {
        if (!guard(request, response)) return
        const body = await readJsonBody(request)
        if (!body || typeof body !== 'object') {
          writeJson(response, 400, { ok: false, code: 'bad-request', message: 'malformed JSON body' })
          return
        }
        const next = sanitizePolicy(body)
        try {
          persistPolicy(next)
        } catch (error) {
          writeJson(response, 500, {
            ok: false,
            code: 'save-failed',
            message: error instanceof Error ? error.message : String(error),
          })
          return
        }
        state.policy = next
        state.loadError = null
        writeJson(response, 200, { ok: true, value: { policy: state.policy, policyFile: POLICY_FILE } })
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/check`,
      handler: async (request, response) => {
        if (!guard(request, response)) return
        const body = await readJsonBody(request)
        const target = body && typeof body.path === 'string' ? body.path.trim() : ''
        if (!target) {
          writeJson(response, 400, { ok: false, code: 'bad-request', message: 'path is required' })
          return
        }
        const decision = decide(state.policy, expandPath(target, describe(ctx).workspaceRoot || os.homedir()))
        writeJson(response, 200, {
          ok: true,
          value: { allowed: decision.allowed, kind: decision.kind || null, rule: decision.rule || null, path: decision.path, enabled: state.policy.enabled },
        })
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export function apply(ctx) {
  loadPolicy()
  ctx.effect(() => ctx.tools.guard(makeGuard(ctx)))
  ctx.inject(['webServer'], (scoped) => {
    scoped.effect(() => {
      const routes = buildRoutes(ctx)
      const disposers = routes.map((route) => scoped.webServer.register(route))
      return () => {
        for (const dispose of disposers) dispose()
      }
    })
  })
}
