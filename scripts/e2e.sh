#!/usr/bin/env bash
# End-to-end check of the studio against a running dev server.
set -uo pipefail

BASE=${BASE:-http://127.0.0.1:3000}
JAR=/tmp/am-cookies.txt
rm -f "$JAR"
PASS=0
FAIL=0

ok() { PASS=$((PASS + 1)); printf '  ✓ %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  ✗ %s\n' "$1"; }
check() { if [ "$1" = "$2" ]; then ok "$3 ($1)"; else bad "$3 — expected $2, got $1"; fi; }

# ---------------------------------------------------------------- server up
printf 'Waiting for dev server…\n'
for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/setup/" || true)
  if [ "$code" = "200" ]; then break; fi
  sleep 2
done
check "$code" "200" "setup page loads"

# ------------------------------------------------------------------- auth
state=$(curl -s "$BASE/api/auth/state")
echo "  state: $state"
setup=$(curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/setup" -H 'content-type: application/json' -d '{"passcode":"harbour123"}')
echo "  setup: $setup"
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/apps")" "401" "apps API rejects signed-out requests"

# -------------------------------------------------------------- create app
created=$(curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/apps" -H 'content-type: application/json' -d '{"name":"Harbour Coffee","template":"cafe"}')
echo "  created: $created"
APP_ID=$(printf '%s' "$created" | python3 -c 'import sys,json;print(json.load(sys.stdin)["app"]["id"])')
SLUG=$(printf '%s' "$created" | python3 -c 'import sys,json;print(json.load(sys.stdin)["app"]["slug"])')
if [ -n "$APP_ID" ]; then ok "app created ($APP_ID / $SLUG)"; else bad "app creation failed"; exit 1; fi

detail=$(curl -s -b "$JAR" "$BASE/api/apps/$APP_ID")
pages=$(printf '%s' "$detail" | python3 -c 'import sys,json;d=json.load(sys.stdin)["app"]["config"];print(len(d["pages"]))')
blocks=$(printf '%s' "$detail" | python3 -c 'import sys,json;d=json.load(sys.stdin)["app"]["config"];print(sum(len(p["blocks"]) for p in d["pages"]))')
echo "  config: $pages pages, $blocks blocks"

# --------------------------------------------------------------- autosave
patched=$(curl -s -b "$JAR" -c "$JAR" -X PATCH "$BASE/api/apps/$APP_ID" -H 'content-type: application/json' \
  -d "$(printf '%s' "$detail" | python3 -c '
import sys, json
app = json.load(sys.stdin)["app"]
cfg = app["config"]
cfg["name"] = "Harbour Coffee Co"
cfg["pages"][0]["blocks"][0]["props"]["title"] = "Coffee before the sea"
print(json.dumps({"name": "Harbour Coffee Co", "config": cfg}))
')")
check "$(printf '%s' "$patched" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("ok"))')" "True" "config saves"

# ---------------------------------------------------------------- publish
pub=$(curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/apps/$APP_ID/publish")
echo "  publish: $pub"
check "$(printf '%s' "$pub" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("publicUrl",""))')" "$BASE/a/$SLUG/" "publish returns public URL"
FILES=$(printf '%s' "$pub" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("files",0))')

# ------------------------------------------------------- serve published app
status=$(curl -s -o /tmp/am-index.html -w '%{http_code}' "$BASE/a/$SLUG/")
check "$status" "200" "published app page serves"
grep -q "Coffee before the sea" /tmp/am-index.html && ok "edited headline appears in published HTML" || bad "published HTML missing edit"
grep -q "am-gate" /tmp/am-index.html && ok "desktop QR gate present" || bad "desktop gate missing"
grep -q "manifest.webmanifest" /tmp/am-index.html && ok "manifest linked" || bad "manifest link missing"

mstatus=$(curl -s -o /tmp/am-manifest.json -w '%{http_code}' "$BASE/a/$SLUG/manifest.webmanifest")
check "$mstatus" "200" "manifest serves"
python3 -c 'import json;m=json.load(open("/tmp/am-manifest.json"));assert m["start_url"]=="./";assert m["display"]=="standalone";assert len(m["icons"])>0;print("  manifest:",m["name"],m["icons"][0]["src"])' \
  && ok "manifest is valid install metadata" || bad "manifest invalid"

curl -s -D /tmp/am-sw-headers.txt -o /tmp/am-sw.js "$BASE/a/$SLUG/sw.js"
check "$(grep -ci 'service-worker-allowed' /tmp/am-sw-headers.txt)" "1" "service worker scope header set"
grep -q 'showNotification' /tmp/am-sw.js && ok "service worker handles push" || bad "sw missing push handler"
check "$(grep -ci 'content-type: text/javascript' /tmp/am-sw-headers.txt)" "1" "service worker served as JS"

check "$(curl -s -o /tmp/am-offline.html -w '%{http_code}' "$BASE/a/$SLUG/offline.html")" "200" "offline page serves"
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/a/$SLUG/icons/icon.svg")" "200" "generated placeholder icon serves"
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/a/$SLUG/nope.png")" "404" "unknown file returns 404"
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/a/does-not-exist/")" "404" "unknown app returns 404"

# ------------------------------------------------------------------- files
count=$(curl -s -b "$JAR" "$BASE/api/apps/$APP_ID/files" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["files"]))')
if [ "$count" -ge 6 ]; then ok "site file browser lists $count files"; else bad "site files list incomplete ($count)"; fi
check "$(curl -s -b "$JAR" -o /tmp/am-app.zip -w '%{http_code}' "$BASE/api/apps/$APP_ID/export")" "200" "zip export downloads"
python3 -c '
import zipfile
z = zipfile.ZipFile("/tmp/am-app.zip")
names = z.namelist()
assert "index.html" in names and "sw.js" in names and "manifest.webmanifest" in names, names
bad = z.testzip()
assert bad is None, bad
print("  zip:", len(names), "files, CRC ok")
' && ok "exported zip is a valid archive" || bad "zip invalid"

# ------------------------------------------------------------------ forms
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/public/apps/$SLUG/forms" -H 'content-type: application/json' \
  -d '{"slug":"harbour-coffee","block":"blk_test","page":"#/visit","values":{"name":"Ada","email":"ada@example.com","message":"Table for two?"}}')" "200" "public form submission accepted"
subs=$(curl -s -b "$JAR" "$BASE/api/apps/$APP_ID/submissions" | python3 -c 'import sys,json;d=json.load(sys.stdin)["submissions"];print(len(d), d[0]["values"]["name"] if d else "")')
check "$subs" "1 Ada" "submission lands in the studio inbox"

# ------------------------------------------------------- push subscriptions
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/public/apps/$SLUG/push/subscribe" -H 'content-type: application/json' \
  -d '{"slug":"harbour-coffee","subscription":{"endpoint":"https://push.example.com/device-1","keys":{"p256dh":"BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM","auth":"tBHItJI5svbpez7KI4CCXg"}}}')" "200" "push subscription accepted"
subcount=$(curl -s -b "$JAR" "$BASE/api/apps/$APP_ID/notifications" | python3 -c 'import sys,json;print(json.load(sys.stdin)["stats"]["subscribers"])')
check "$subcount" "1" "subscriber counted for the app"

# ------------------------------------------------------------ notifications
created_note=$(curl -s -b "$JAR" -X POST "$BASE/api/apps/$APP_ID/notifications" -H 'content-type: application/json' \
  -d "{\"title\":\"Fresh bakes\",\"body\":\"Out of the oven now\",\"url\":\"#/menu\",\"mode\":\"schedule\",\"sendAt\":\"$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ)\"}")
NID=$(printf '%s' "$created_note" | python3 -c 'import sys,json;print(json.load(sys.stdin)["notification"]["id"])')
check "$(printf '%s' "$created_note" | python3 -c 'import sys,json;print(json.load(sys.stdin)["notification"]["status"])')" "scheduled" "notification schedules"
queued=$(curl -s -b "$JAR" "$BASE/api/apps/$APP_ID/notifications" | python3 -c 'import sys,json;print(len([n for n in json.load(sys.stdin)["notifications"] if n["status"]=="scheduled"]))')
check "$queued" "1" "queued notification listed"
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/apps/$APP_ID/notifications/$NID")" "200" "queued notification cancels"

# ----------------------------------------------------------------- preview
check "$(curl -s -b "$JAR" -o /tmp/am-preview.html -w '%{http_code}' "$BASE/preview/$APP_ID/")" "200" "draft preview renders"
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/preview/$APP_ID/")" "401" "preview is private"

# ------------------------------------------------------------- studio pages
check "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE/")" "200" "studio dashboard loads"
check "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE/apps/$APP_ID/")" "200" "builder page loads"
check "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/api/auth/logout")" "200" "logout works"
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/apps")" "401" "session cleared"

printf '\n%d passed, %d failed (%s files published)\n' "$PASS" "$FAIL" "$FILES"
[ "$FAIL" -eq 0 ]
