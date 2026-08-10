---
name: spicetify-drive
description: Attach to the running Spotify desktop client over the Chrome DevTools Protocol to inspect or drive it — read Spicetify internals, run real GraphQL requests, measure computed styles and geometry, dispatch real key/mouse/wheel input, and take screenshots. Also covers the build → apply → relaunch → attach loop for testing a Spicetify custom app or extension in the real client. Use when a claim about Spotify's runtime needs verifying rather than guessing (does this GraphQL definition exist, what shape does it return, which element actually receives this click, does this scroll chain), or when the user asks to run, test, or screenshot a Spicetify app in Spotify.
---

# Driving Spotify over the debug port

Spotify is Chromium, so it speaks the DevTools Protocol. That turns guesses about
its private internals into measurements. Reach for this whenever the honest answer
would otherwise be "probably" — undocumented GraphQL definitions, Spotify's own
class names, computed styles, hit testing, scroll behaviour.

## Preconditions

The endpoint only exists if devtools are enabled:

```bash
grep always_enable_devtools "$(spicetify -c)"   # want: = 1
```

If it is `0`: `spicetify enable-devtools`, then relaunch Spotify.

**The port is 8088, not the usual 9222.** There is no `--remote-debugging-port`
flag on the process, so do not go looking for one.

```bash
curl -s http://127.0.0.1:8088/json | python3 -m json.tool   # find the xpui target
```

## Two modes, very different cost

### Inspect — cheap, do this freely

Attaching changes nothing. No build, no restart, no disruption. Use it constantly.

```bash
node .claude/skills/spicetify-drive/driver.mjs ./probe.mjs
```

```js
// probe.mjs
export default async (d) => {
  console.log(await d.eval(`Object.keys(Spicetify.GraphQL.Definitions).filter(k => /search/i.test(k))`));
};
```

Good for: does a definition exist; what does a GraphQL call actually return; what
are the computed styles; what does `document.elementFromPoint` return at these
coordinates; what is in the console.

Note it inspects **the installed build**, which may be older than the working
tree. Check before drawing conclusions:

```bash
ls -la "$(dirname "$(spicetify -c)")/CustomApps/<app>/"
```

### Drive — expensive, confirm with the user first

Testing working-tree changes needs the code inside Spotify's xpui, and there is no
lighter path than a full apply. This **restarts Spotify** and **disturbs playback**.
Get explicit agreement before running it.

```bash
pnpm build                       # into the live CustomApps folder
spicetify apply                  # copies into Spotify.app, then QUITS Spotify
open -a Spotify                  # apply does NOT relaunch it
sleep 14                         # let xpui boot before attaching
```

## Side effects, and putting things back

Driving a real client leaves marks. Save state first, restore after, and tell the
user what moved:

```js
// before
const before = await d.eval(`({
  pathname: Spicetify.Platform.History.location.pathname,
  context: Spicetify.Player.data?.context?.uri,
})`);

// after
await d.eval(`Spicetify.Platform.History.push({ pathname: ${JSON.stringify(before.pathname)} })`);
await d.eval(`Spicetify.Player.pause()`);
```

Playback position and the current track generally cannot be restored — say so
rather than implying it was. Watch for apps that persist to `localStorage`
(name-that-tune writes `name-that-tune:stats`); a test run can leave junk there.

To try a **light theme** without touching the user's actual theme, override the
Spicetify vars inline and remove them afterwards:

```js
await d.eval(`(() => { const s = document.documentElement.style;
  s.setProperty('--spice-main', '#ffffff'); s.setProperty('--spice-text', '#121212'); })()`);
// ... screenshot ...
await d.eval(`['--spice-main','--spice-text'].forEach(p => document.documentElement.style.removeProperty(p))`);
```

## Input gotchas

Both of these cost real debugging time. They look like app bugs and are not.

- **Printable characters must be a lone `char` event.** Pairing `char` with a
  `keyDown` that also carries `text` types everything twice — `bohem` arrives as
  `bboohheemm`. `d.type()` handles this.
- **Enter needs a real `keyDown` with `text: '\r'`.** A `rawKeyDown` suppresses the
  keypress, so Chromium never runs a form's default submit and the Enter appears
  to do nothing. `d.key('Enter', 13)` handles this.

Use real dispatched events, not `el.value = x` — Spotify's UI is React, and
assigning to `value` does not drive a controlled input.

Beware selectors that also match Spotify's own chrome. `input[role=combobox]`
matches the main search bar; scope to something app-specific.

## Driver API

`driver.mjs` needs no dependencies (Node's built-in `WebSocket`). Your script
default-exports an async function taking `d`:

| | |
|---|---|
| `d.eval(expr)` | evaluate in the page, by value, awaits promises |
| `d.waitFor(expr, {timeout})` | poll until truthy |
| `d.type(str, delay?)` | printable text as real key events |
| `d.key(name, keyCode)` | ArrowUp 38, ArrowDown 40, Enter 13, Escape 27, Tab 9 |
| `d.clear(selector)` | empty a React-controlled input |
| `d.click(selector)` / `d.clickText(text, tag?)` | real mouse events |
| `d.wheel(selector, deltaY)` | for overscroll / scroll-chaining checks |
| `d.shot(path)` | PNG screenshot |
| `d.consoleLines` | captured console output |
| `d.send(method, params)` | any raw CDP call |

## Worked checks

**Does a GraphQL definition exist, and what does it return?** Definitions are
persisted queries (`{name, operation, sha256Hash, value: null}`) — there is no
local AST to read, so run it and inspect the response. The server validates
variables against the stored operation, so a wrong variable set gives
`HttpResponseError`; different operations take different variables.

```js
const res = await d.eval(`Spicetify.GraphQL.Request(
  Spicetify.GraphQL.Definitions.searchSuggestions, { query: 'test', limit: 5 })`);
```

**Which element really receives a click?** Settles overlay questions that reading
CSS cannot.

```js
await d.eval(`(() => {
  const r = document.querySelector('button').getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
  return hit.tagName + '.' + hit.className;
})()`);
```

**Does scrolling chain to the page?** Wheel past the end and watch every
scrollable ancestor — if one moves off 0, the inner element needs
`overscroll-behavior: contain`.

## Reporting

Quote the measurement, not the impression: "ancestor `scrollTop` went 0 → 12"
beats "it seems to scroll the page". When a fix is verified, show before and
after from the same probe.

If the driver itself misbehaves, say so plainly rather than reporting it as an
app bug — the two input gotchas above both present as the app ignoring input.
