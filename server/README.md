# HEXTEKO License Server — Hướng dẫn chi tiết từng bước (100% free)

Hệ thống này gồm 2 phần:
- **`server/`** — API + panel admin/seller (chạy trên **Render.com**, miễn phí)
- **App Electron** (máy khách) — nhập key để kích hoạt, HWID sẽ gửi về server

> Dữ liệu được lưu ở **GitHub Gist** (miễn phí) vì Render bản free không giữ file cứng.
> Nếu chỉ chạy local trên máy mình thì không cần GitHub — server tự lưu file `db.json` trong thư mục.

---

## A. TRƯỚC KHI BẮT ĐẦU

Cần chuẩn bị:
- ✅ Tài khoản **GitHub** (miễn phí) → https://github.com/signup
- ✅ Tài khoản **Render** (dùng GitHub để đăng nhập) → https://render.com
- ✅ Folder code `server/` này

---

## B. ĐĂNG KÝ / CHUẨN BỊ

### Bước 1. Đăng nhập GitHub
Vào https://github.com/login → đăng nhập.
- Chưa có tài khoản? Bấm **Sign up**, tạo xong xác nhận email.

---

## C. TẠO "DATABASE" TRÊN GITHUB (2 việc)

> Vì Render free không giữ file, ta mượn **GitHub Gist** làm kho dữ liệu (key, seller, log).
> Cần 2 thứ: **1 token** + **1 gist**.

### Bước 2. Tạo GitHub Personal Access Token (có quyền gist)
1. Mở: https://github.com/settings/tokens/new
2. Trong ô **Note** gõ bất kỳ: `hexteko-license`
3. Trong **Expiration** chọn: `No expiration` (không bao giờ hết hạn)
4. Tick đúng vào ô **`gist`** (mục *Select scopes* — kéo xuống thấy chữ *gist*)
5. Cuối trang bấm **Generate token**
6. Màn hình hiện ra chuỗi text dạng `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` → **copy và cất giữ cẩn thận** (chỉ hiện 1 lần, không xem lại được!)
   - ⚠️ Không chia sẻ token này cho ai.

### Bước 3. Tạo GitHub Gist (chứa dữ liệu)
1. Mở: https://gist.github.com
2. Ô **Gist description** gõ: `hexteko db`
3. Ô **Filename including extension** gõ đúng chữ: **`db.json`**
4. Ô trống lớn bên dưới **dán đúng** một trong hai (nên dùng chuẩn đầu):
   ```json
   {}
   ```
   hoặc đầy đủ:
   ```json
   {
     "meta": { "adminPass": "trankhoi0803" },
     "sellers": [],
     "keys": [],
     "logs": []
   }
   ```
5. Chọn **Create secret gist** (dạng tối — không ai xem được) → bấm **Create gist**.
6. Sau khi tạo, nhìn URL trình duyệt: `https://gist.github.com/tennguoidung/<GIST_ID đây>`
   - Copy **GIST_ID** (dãy chữ số/chữ dài ~32 ký tự).
   - Ví dụ URL `https://gist.github.com/ngocbui/a1b2c3...xyz` thì `GIST_ID = a1b2c3...xyz`.

> ⚠️ File trong gist bắt buộc tên là `db.json` (server code đang trỏ tới tên đó).

---

## D. ĐẨY CODE LÊN GITHUB (1 repo)

### Bước 4. Tạo repo (kho chứa code)
1. GitHub → dấu **+** (góc trên phải) → **New repository**
2. Tên repo: `hexteko-license`
3. Chọn **Public** (hoặc Private cũng được, miễn Render kết nối được)
4. Bấm **Create repository**

### Bước 5. Upload folder `server/` vào repo
Cách nhanh nhất — **upload trực tiếp trên web** (không cần biết Git):
1. Ở repo vừa tạo, bấm **Add file → Upload files**.
2. Kéo toàn bộ **nội dung bên trong** thư mục `server/` vào khung:
   - `server.js`
   - `db.js`
   - `keys.js`
   - `package.json`
   - `public/` (cả thư mục)
3. Ô *Commit changes* gõ: `init server`
4. Bấm **Commit changes**.

> Nếu bạn biết Git, đẩy bằng lệnh:
> ```
> cd server
> git init
> git add .
> git commit -m "init server"
> git branch -M main
> git remote add origin https://<token>@github.com/<username>/hexteko-license.git
> git push -u origin main
> ```

---

## E. DEPLOY LÊN RENDER (miễn phí)

### Bước 6. Đăng ký Render
1. Mở https://render.com → **Get Started** → **Sign up with GitHub** → cho phép.
2. Sau khi đăng nhập, nó hiện Dashboard.

### Bước 7. Tạo Web Service
1. Bấm **New +** (góc trên) → **Web Service**
2. Nó hiện danh sách repo → chọn `hexteko-license`
   - Chưa thấy repo? Bấm **Configure account** để cấp quyền truy cập repo → quay lại rồi bấm Next.
3. Render tự phân tích → **Page Owner** chọn bạn → bấm **Create Web Service**.

### Bước 8. Cấu hình thông số (quan trọng!)
Trong màn hình **Settings / Create Web Service**, sửa đúng:

| Mục | Giá trị nhập |
|---|---|
| **Name** | `hexteko-license` (tạo URL `https://hexteko-license.onrender.com`) |
| **Region** | `Singapore (Southeast Asia)` — gần VN nhất |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` (tự nhận) |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` |

**Thêm Environment Variables** (mục phía dưới, bấm **Advanced** hoặc thêm dòng):
| Key | Value |
|---|---|
| `GITHUB_TOKEN` | token `ghp_...` ở Bước 2 |
| `GIST_ID` | ID gist ở Bước 3 |
| `PORT` | `10000` |

> Nếu không hiện ô env, bấm **Show advanced** rồi **Add Environment Variable**.

### Bước 9. Deploy
Bấm **Create Web Service** → Render tự build và chạy.
- Đợi đến khi dòng log hiện:
  ```
  HEXTEKO License API đang chạy: http://0.0.0.0:10000
  Admin panel: http://localhost:10000/
  DB trên GitHub Gist: <GIST_ID>
  ```
- Dòng `DB trên GitHub Gist` xuất hiện = **đã nối được Gist thành công** ✅.
- Nếu thấy `Không tải được từ Gist` → đọc phần **Xử lý lỗi** ở dưới.

---

## F. KHỞI ĐỘNG LẦN ĐẦU (tạo seller + tạo key)

### Bước 10. Vào Panel Admin
1. Mở trình duyệt: `https://hexteko-license.onrender.com/`
2. Đăng nhập:
   - **Username**: `admin`
   - **Password**: `trankhoi0803`
3. Vào tab **🛒 Seller** → tạo seller:
   - **Username seller**: `shopA`
   - **Password**: đặt mật khẩu riêng cho seller
   - **Ghi chú**: Zalo / FB...
   - Bấm **➕ Thêm seller**.

### Bước 11. Tạo key (bán cho khách)
- **Admin cũng có thể tạo key**: tab **✨ Tạo key**.
- **Seller tạo key**: seller vào `https://hexteko-license.onrender.com/` → đăng nhập bằng tài khoản seller (`shopA` / mật khẩu) → tab **✨ Tạo key**.

Các lựa chọn khi tạo key:
| Lựa chọn | Ý nghĩa |
|---|---|
| **Ngày / Tháng** | Thời hạn được tính theo ngày hoặc tháng |
| **Số ngày/tháng** | vd 30 ngày, 1 tháng |
| **Số acc treo** | `1 acc` / `3 acc` / `Vô hạn acc` |
| **Số thiết bị** | `0` = vô hạn thiết bị, `1` = dùng trên 1 máy |
| **Số lượng key** | tạo nhiều key 1 lần (tối đa 100) |
| **Ghi chú** | tên khách, SĐT — dễ tìm lại |

Key có dạng: **`HEXTEKO-XXXXXXXXXX`** (chữ hoa + số, không nhầm 0/O/1/I).

### Bước 12. Admin theo dõi (ai tạo key nào)
- Tab **🔑 Quản lý key**: xem **tất cả key của mọi seller**, lọc theo seller, tìm theo key, bấm **Chi tiết** để xem **HWID nào đã kích hoạt**.
- Tab **📊 Tổng quan**: số seller, tổng key, còn hạn, hết hạn, bị khóa, lượt kích hoạt.
- Tab **📜 Lịch sử**: log mọi hành động (ai tạo key, ai kích hoạt, khóa/xóa...).

---

## G. NỐI APP VÀO SERVER

### Bước 13. Mở app Electron
1. Chạy app (máy bạn): `npm start` (cần cài `npm install` trước).
2. App mở ra màn **Activate**.
3. Nhập:
   - **Link server API**: `https://hexteko-license.onrender.com`
   - **Key**: dán key vd `HEXTEKO-ABCDEFGH12`
4. Bấm **Activate** (dấu tick xanh = thành công; app hiện hết màn khoá).

> HWID app sinh tự động (dựa trên phần cứng máy), tự đăng ký về server.
> Key chọn 1 thiết bị → chỉ máy này kích hoạt được; máy khác bị chặn.

---

## H. SỬA LỖI THƯỜNG GẶP

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Không thấy `DB trên GitHub Gist` | Sai token / thêm GIST_ID | Kiểm tra 2 biến môi trường trong Render |
| `GitHub 404` khi tải Gist | Sai GIST_ID | Kiểm tra đúng ID, file trong gist tên đúng `db.json` |
| `GitHub 401 Unauthorized` | Token sai / thiếu quyền gist | Tạo lại token, tick ô **gist** |
| Bấm Activate báo lỗi kết nối | Gõ thiếu `https://` / sai URL | Gõ đủ `https://hexteko-license.onrender.com` |
| Activate báo `Key đã hết số thiết bị` | Key chỉ cho 1 máy, đã kích hoạt máy khác | Tạo key mới hoặc để số thiết bị = 0 |
| Lần truy cập đầu chậm 30-60s | Bản Free "ngủ" khi không dùng | Kiên nhẫn chờ, lần sau sẽ nhanh |
| App thông báo giới hạn acc | Key cho 1/3 acc mà bạn mở nhiều acc hơn | Đóng bớt acc, hoặc dùng key Vô hạn |

---

## I. KHI HẾT GIST (dữ liệu đầy ~ vài nghìn key)

- Gist file miễn phí tối đa ~1MB (an toàn, khó đầy).
- Nếu đầy: tạo **gist mới** cùng cấu trúc → đổi `GIST_ID` trong Render → redeploy, hoặc giảm `logs` (lịch sử tự giữ tối đa 5000 dòng).

---

## J. CÁC LINK NHANH

- Panel admin + seller: `https://hexteko-license.onrender.com/`
- Render dashboard: https://dashboard.render.com
- GitHub: https://github.com
- Tạo token: https://github.com/settings/tokens/new
- Tạo gist: https://gist.github.com