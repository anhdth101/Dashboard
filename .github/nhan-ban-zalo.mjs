// Lấy bản dashboard bot Zalo đã kiểm (GET <BOT_URL>/dash/cho), kiểm lại, ghi index.html.
import fs from "node:fs";
import crypto from "node:crypto";

const BOT = process.env.BOT_URL;
const out = (k, v) => process.env.GITHUB_OUTPUT && fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

let r;
try {
  r = await fetch(`${BOT}/dash/cho`, { headers: { "cache-control": "no-store" }, signal: AbortSignal.timeout(90_000) });
} catch (e) { console.log("Bot không trả lời:", e?.message); process.exit(0); }
if (r.status === 204) { console.log("Không có bản chờ."); process.exit(0); }
if (r.status !== 200) { console.log("Bot trả HTTP", r.status); process.exit(0); }
const html = await r.text();
if (sha(html) !== r.headers.get("x-dash-sha")) throw new Error("sha không khớp, bỏ qua");

const m = /<script id="du-lieu">window\.__DATA=(\{[\s\S]*?\});window\.__BAN="([a-z_]+)";<\/script>/.exec(html);
if (!m) throw new Error("không đọc được khối dữ liệu");
const D = JSON.parse(m[1]);
const loi = [];
if (m[2] !== "cong_bo") loi.push("bản nội bộ");
if (!D.khoa?.c) loi.push("chưa mã hoá Deal/Mass");
const n = D.nhom ?? {};
if ((n.nhom ?? []).length || (n.loai ?? []).length || Object.keys(n.ls_nhom ?? {}).length) loi.push("còn số liệu Deal/Mass");
if (D.ct) loi.push("còn danh sách khách hàng");
if (D.tk_cn) loi.push("còn danh bạ tài khoản");
if (/"duno_(?!bq")[^"]*"\s*:/.test(JSON.stringify(D.nhap ?? {}))) loi.push("còn dư nợ Deal/Mass trong số nhập tay");
for (const cn of ["HN", "HCM", "DN", "CT"]) if (D.kt?.[cn]?.duno_loai) loi.push("còn dư nợ chia nhóm " + cn);
if (loi.length) throw new Error("KHÔNG đẩy: " + loi.join("; "));

const cu = fs.existsSync("index.html") ? fs.readFileSync("index.html", "utf8") : "";
if (sha(cu) === sha(html)) { console.log("Giống bản hiện tại."); process.exit(0); }
fs.writeFileSync("index.html", html);
const t = D.meta.thang;
out("co_ban", "1");
out("ky", `T${t[0]}-T${t[t.length - 1]}/${D.meta.nam}`);
out("nguoi", decodeURIComponent(r.headers.get("x-dash-by") || "Zalo").replace(/[\r\n"]/g, " "));
console.log("Đã ghi index.html, kỳ", `T${t[0]}-T${t[t.length - 1]}`);
