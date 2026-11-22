<div align="center">

<img src="extension/icon128.png" width="110" alt="TIS Academy logo">

# TIS Question Downloader

**UMS এর MCQ ও Written প্রশ্নের মূল Word file, হুবহু, এক ক্লিকে একটি Word file এ।**<br>
A Chrome / Edge extension that merges every question of a UMS exam into one `.docx`, unchanged.

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-open-facc15?style=for-the-badge)](https://tariqulislam4015.github.io/tis-question-downloader/)
[![Download](https://img.shields.io/badge/⬇_Download-ZIP-15803d?style=for-the-badge)](https://github.com/tariqulislam4015/tis-question-downloader/archive/refs/heads/main.zip)
![Version](https://img.shields.io/badge/version-1.5.0-14532d?style=for-the-badge)
![Manifest](https://img.shields.io/badge/Chrome-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

<img src="docs/screenshots/live-demo.png" alt="Live demo screenshot" width="860">

</div>

---

## ✨ Features

| | |
|---|---|
| 📄 **হুবহু কপি** | প্রতিটি প্রশ্নের Edit পেজে যে আসল Word file খোলে সেটাই নেয়। Table, box, ছবি, সমীকরণ (OMML) সব অক্ষত থাকে। |
| 🧩 **MCQ + Written** | `Exam/Question/Index` (MCQ) আর `Exam/OnlineWrittenQuestion/Index` (Written) দুই পেজেই কাজ করে। |
| 🔒 **শুধু পড়ে** | কোনো Update/Save করে না, password দেখে না। সব কাজ আপনার browser এর ভেতরেই হয়, বাইরে কিছু পাঠায় না। |
| ♻️ **Smart merge** | একই উদ্দীপকের প্রশ্ন একবার রাখে। ছবির নাম আলাদা করে। ভুল ক্রমে থাকা XML ঠিক করে, যাতে Word এ "repair" prompt না আসে। |
| 🌐 **Version / Set** | Version(ALL) দিলে Bangla ও English আলাদা file হয়। একাধিক Unique Set থাকলে প্রতিটি Set এর আলাদা file হয়। |
| 👤 **Profile card** | Developer এর ছবি, নাম আর সব link animated card এ দেখায় (প্যানেল ও toolbar popup এ)। |

## ▶ Live Demo

**<https://tariqulislam4015.github.io/tis-question-downloader/>**

Demo পেজে UMS এর মতো একটা নকল ফর্ম আছে, আর তার পাশে **আসল extension code** চলে।
**⬇ Word File Download** চাপলে কাল্পনিক নমুনা প্রশ্নগুলো জোড়া লেগে একটা `.docx` download হয়।
কোনো আসল সার্ভারে যোগাযোগ হয় না। ([`demo/demo.js`](demo/demo.js) browser এর ভেতরেই সার্ভারের উত্তর তৈরি করে।)

## 🚀 Install (Windows 10/11 · Chrome / Edge)

1. **[Download ZIP](https://github.com/tariqulislam4015/tis-question-downloader/archive/refs/heads/main.zip)** নামিয়ে Extract করুন। ভেতরের `extension` folder টা স্থায়ী জায়গায় রাখুন।
2. Chrome এ `chrome://extensions` (Edge এ `edge://extensions`) খুলুন।
3. **Developer mode** চালু করুন।
4. **Load unpacked** চেপে `extension` folder টা select করুন (যেখানে `manifest.json` আছে)।
5. Toolbar এ 🧩 চেপে **TIS Question Downloader** পিন 📌 করুন।

বিস্তারিত বাংলা নির্দেশিকা: [`extension/README-বাংলা.txt`](extension/README-বাংলা.txt)

## 🧭 Usage

1. UMS এ নিজে login করুন।
2. MCQ বা Written পেজে যান। নিচে ডান কোণে প্যানেল আসবে।
3. **Organization → Program → Session → Course → Exam → Version** select করুন। প্যানেলে প্রতিটির পাশে ✔ দেখাবে।
4. **⬇ Word File Download** চাপুন। File আপনার Downloads folder এ চলে যাবে, যেমন:
   - `Class_8_Pioneer_Batch_Online_Code-294_Bangla.docx`
   - `Class_8_Pioneer_Batch_Online_Written_Code-399_Bangla.docx`

<p align="center">
  <img src="docs/screenshots/panel.png" alt="Panel" height="430">
  &nbsp;&nbsp;
  <img src="docs/screenshots/popup.png" alt="Toolbar popup" height="430">
</p>

## ⚙️ How it works

```
UMS list endpoint ──► question rows ──► each row's "Edit" page ──► ONLYOFFICE config ──► original .docx
                                                                                         │
                                         merger.js (JSZip) ◄─────────────────────────────┘
                                                │  • body of each file, in order
                                                │  • images/charts copied with unique names
                                                │  • duplicate (shared-stem) files kept once
                                                │  • schema order fixed (tblPr, trPr, m:rPr)
                                                ▼
                                       one .docx → browser download
```

It only sends `GET` requests and the same read-only list `POST` the page itself makes. It never calls the editor's save/update endpoint.

## 📁 Project structure

```
extension/            the Chrome/Edge extension (load this folder)
  manifest.json       MV3 manifest
  content.js          panel UI + reading the question list + downloading originals
  merger.js           .docx merger (browser + Node)
  profile.js/.css     animated developer profile card
  popup.html/.js/.css toolbar popup
  jszip.min.js        JSZip 3.10.1 (MIT)
index.html            Live Demo / landing page (GitHub Pages)
demo/                 demo styles, fake-server script, fictional sample .docx files
tests/                node tests for merger.js
docs/screenshots/     README images
```

## 🧪 Tests

```bash
node tests/merge.test.js
```
No `npm install` needed. The tests check text order, header lines, de-duplication, image relationships, equations and the XML-order fixes.

## 👤 Developer

<img src="extension/photo.jpg" width="90" align="left" style="border-radius:50%;margin-right:14px" alt="Tariqul Islam (Sumon)">

**তারিকুল ইসলাম (সুমন)**<br>
______Msc Mathematics______

[![YouTube](https://img.shields.io/badge/YouTube-TIS_Academy-FF0000?logo=youtube&logoColor=white)](https://www.youtube.com/@tis.academy24)
[![Facebook](https://img.shields.io/badge/Facebook-tariqul.islam-1877F2?logo=facebook&logoColor=white)](https://www.facebook.com/tariqul.islam.422531/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Chat-25D366?logo=whatsapp&logoColor=white)](https://wa.me/8801755489719)
[![GitHub](https://img.shields.io/badge/GitHub-tariqulislam4015-181717?logo=github&logoColor=white)](https://github.com/tariqulislam4015)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-tariqul3315-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tariqul3315/)

<br clear="left">

## 📜 License

[MIT](LICENSE) © 2026 Tariqul Islam (Sumon). Bundled [JSZip](https://stuk.github.io/jszip/) is used under its MIT license ([`extension/JSZIP-LICENSE.markdown`](extension/JSZIP-LICENSE.markdown)).

> This is an independent helper tool for staff who already have access to UMS. It is not affiliated with or endorsed by UMS/Udvash/Online Care. Use it only on accounts and content you are authorised to access.
