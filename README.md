# 📚 Word Note – Vocabulary Learning Extension

Word Note là một tiện ích mở rộng trình duyệt giúp bạn **học và quản lý từ vựng thông minh** thông qua việc chọn văn bản trực tiếp trên website, dịch nhanh và luyện tập với quiz tương tác.

---

## ✨ Tính năng

### 🎯 Lưu từ nhanh (Quick Word Capture)
- Bôi đen bất kỳ từ hoặc cụm từ nào trên trang web
- Popup bubble thông minh tự động xuất hiện
- Lưu từ chỉ với 1 click
- Phân loại từ theo category:  
  **Noun, Verb, Adjective, Adverb, Phrase, Other**

---

### 🌐 Dịch miễn phí
- Tích hợp Google Translate (miễn phí)
- Tự động phát hiện ngôn ngữ nguồn
- Hỗ trợ nhiều cặp ngôn ngữ:
  - English ↔ Vietnamese
  - Chinese, Japanese, Korean
  - French, German, Spanish
- Dịch trực tiếp từ popup hoặc dashboard

---

### 📝 Quản lý từ vựng thông minh
- Dashboard hiển thị toàn bộ từ đã lưu
- Tìm kiếm theo từ hoặc category
- Sắp xếp:
  - Mới nhất / Cũ nhất
  - A–Z / Z–A
- Thêm ghi chú cá nhân cho từng từ
- Xem lại trang web nguồn của từ

---

### 🎮 Quiz tương tác
- Luyện tập bằng câu hỏi trắc nghiệm
- Sử dụng chính từ vựng bạn đã lưu
- Theo dõi tiến trình học tập

---

### 🎨 Giao diện
- Hỗ trợ **Light mode / Dark mode**
- Thiết kế hiện đại, gọn gàng
- Responsive
- Hiệu ứng animation mượt mà

---

### 💾 Quản lý dữ liệu
- Export danh sách từ vựng ra file JSON
- Import dữ liệu từ file backup
- Toàn bộ dữ liệu lưu **local trong trình duyệt**
- Không gửi dữ liệu ra ngoài

---

## 📦 Cài đặt

### 🔹 Cài đặt từ Release (Khuyến nghị)

1. Vào trang **Releases** của repository
2. Tải file ZIP của Word Note
3. Giải nén file ZIP vào một thư mục bất kỳ

---

### 🔹 Cài đặt Extension

#### Chrome / Brave / Edge
1. Mở trình duyệt và truy cập:
   - Chrome: `chrome://extensions/`
   - Brave: `brave://extensions/`
   - Edge: `edge://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục đã giải nén Word Note
5. Extension sẽ xuất hiện trên thanh công cụ 🎉

---

#### Firefox (Temporary)
1. Truy cập: `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Chọn file `manifest.json` trong thư mục extension

---

## 🚀 Cách sử dụng

### 1️⃣ Lưu từ vựng nhanh
- Bôi đen từ trên bất kỳ website nào
- Click **Save it** để lưu
- Hoặc click **Translate** để dịch trước khi lưu

---

### 2️⃣ Lưu kèm dịch
- Bôi đen từ → **Translate**
- Từ và nghĩa được điền tự động
- Click Save để lưu vào danh sách

---

### 3️⃣ Quản lý từ đã lưu
- Click icon Word Note trên toolbar
- Xem danh sách từ trong dashboard
- Click vào từ để chỉnh sửa ghi chú
- Click icon để mở trang web nguồn

---

### 4️⃣ Luyện tập với Quiz
- Click **Open Quiz**
- Trả lời câu hỏi trắc nghiệm
- Ôn lại từ vựng đã lưu

---

### 5️⃣ Export / Import
- **Export**: Tải file JSON để backup
- **Import**: Khôi phục dữ liệu từ file JSON

---

## 📁 Cấu trúc dự án

Word-Note/
├── board/
│   ├── board.html        # Dashboard chính hiển thị danh sách từ
│   ├── board.css         # Style cho dashboard
│   └── board.js          # Logic quản lý từ vựng
│
├── manage_page/
│   ├── ManagePage.html   # Trang quản lý & chỉnh sửa từ
│   ├── ManagePage.css    # Style trang quản lý
│
├── page_interactor/
│   ├── content.js        # Content script xử lý text selection
│   ├── translate.js      # Logic dịch từ
│   └── content.css       # Style cho popup bubble
│
├── Quiz/
│   ├── quiz.html         # Trang quiz luyện tập
│   ├── quiz.css          # Style cho quiz
│   └── quiz.js           # Logic quiz
│
├── welcome/
│   ├── welcome.html      # Trang chào mừng người dùng lần đầu
│   ├── welcome.css       # Style trang welcome
│   └── welcome.js        # Logic welcome
│
├── img/                  # Hình ảnh, icons
│
├── background.js         # Service worker (context menu, events)
├── manifest.json         # Cấu hình extension (Manifest V3)
└── README.md             # Tài liệu hướng dẫn


---

## 🔧 Technical Stack
- Manifest V3
- Vanilla JavaScript
- Chrome Storage API
- Context Menus API
- Clipboard API
- Google Translate (free)
- Modern CSS
- No framework

---

## 🔒 Quyền riêng tư
- Không tracking
- Không analytics
- Không gửi dữ liệu ra ngoài
- 100% dữ liệu lưu cục bộ

---

## 🎯 Kế hoạch phát triển
- Đồng bộ dữ liệu cloud
- Flashcards & spelling quiz
- Audio phát âm
- Ví dụ sử dụng từ
- Thống kê & analytics học tập
- Mobile companion app

---

## 📝 License
Made by **CDinh**

---

## 🤝 Feedback
Có bug hoặc ý tưởng mới?  
Hãy mở issue trên GitHub — mọi góp ý đều được chào đón ❤️
