// Lấy bản dashboard bot Zalo đã kiểm (GET <BOT_URL>/dash/cho), kiểm lại (phải KHOÁ TOÀN TRANG), ghi index.html.
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

if (/<script id="du-lieu">window\.__DATA=\{/.test(html)) throw new Error("KHÔNG đẩy: dữ liệu để trần (chưa khoá toàn trang / bản nội bộ)");
const m = /<script id="du-lieu">window\.__DATA=null;window\.__KHOA_TOAN=(\{[^<]*?\});window\.__THONG_TIN=(\{[^<]*?\});window\.__BAN="([a-z_]+)";<\/script>/.exec(html);
if (!m) throw new Error("không đọc được khối dữ liệu");
const K = JSON.parse(m[1]), T = JSON.parse(m[2]);
const loi = [];
if (m[3] !== "cong_bo") loi.push("bản nội bộ");
if (!(K.c && K.s && K.i && K.n >= 600000)) loi.push("khối mã hoá không hợp lệ");
if (!/<script type="text\/plain" id="ma-chinh">/.test(html)) loi.push("mã chính chưa bị khoá");
if (!/id="manKhoa"/.test(html)) loi.push("thiếu màn hình passcode");
if (/"(ten_kh|tk_cn|ten_nhom)"\s*:/.test(html.replace(/<script type="text\/plain" id="ma-chinh">[\s\S]*?<\/script>/, ""))) loi.push("có dữ liệu để trần");
if (loi.length) throw new Error("KHÔNG đẩy: " + loi.join("; "));

const cu = fs.existsSync("index.html") ? fs.readFileSync("index.html", "utf8") : "";
if (sha(cu) === sha(html)) { console.log("Giống bản hiện tại."); process.exit(0); }
fs.writeFileSync("index.html", html);
out("co_ban", "1");
out("ky", String(T.ky || "mới").replace(/[\r\n"]/g, " "));
out("nguoi", decodeURIComponent(r.headers.get("x-dash-by") || "Zalo").replace(/[\r\n"]/g, " "));
console.log("Đã ghi index.html, kỳ", T.ky);
