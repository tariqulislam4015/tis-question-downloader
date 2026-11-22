TIS Question Downloader  (Version 1.5.0)
Developer: তারিকুল ইসলাম (সুমন) — Msc Mathematics
========================================

এটা কী করে
-----------
UMS (umsbd.net) এর "Manage Question" পেজে (Exam > Question > Index) একটি ছোট প্যানেল যোগ করে।
আপনি নিজে login করে Organization, Program, Session, Course, Exam আর Version select করবেন,
তারপর "Word File Download" চাপলে ওই Exam এর সব প্রশ্নের মূল Word file (Edit এ যেটা খোলে)
হুবহু একসাথে একটি .docx file এ download হবে। Table, box, image, equation সব যেমন আছে তেমন থাকে।

নিরাপত্তা: এটা শুধু পড়ে। সাইটে কোনো Update / Save / Edit করে না। আপনার password দেখে না বা রাখে না।
সব কাজ আপনার নিজের browser এর ভেতরেই হয়, বাইরে কোথাও কিছু পাঠায় না।

যা লাগবে
---------
- Windows 10 বা 11
- Google Chrome বা Microsoft Edge (Windows 10 এ Edge আগে থেকেই থাকে)
- আলাদা কোনো software install করতে হবে না

একবারের Install (২ মিনিট)
---------------------------
1. "tis-question-downloader-main.zip" file টি Extract করুন (Right click > Extract All)।
   একটি "extension" folder পাবেন। এই folder টি স্থায়ী জায়গায় রাখুন (যেমন D:\Tools\TIS-Extension),
   পরে মুছবেন না বা সরাবেন না।

2. Chrome হলে address bar এ লিখুন:  chrome://extensions
   Edge হলে লিখুন:                    edge://extensions

3. ডান পাশে উপরে (Edge এ বাম পাশে) "Developer mode" চালু করুন।

4. "Load unpacked" বোতাম চাপুন, তারপর "extension" folder টি select করুন
   (যে folder এর ভেতরে manifest.json আছে)।

5. তালিকায় "TIS Question Downloader" দেখা গেলে install শেষ।
   Toolbar এ 🧩 (Extensions) চেপে পিন 📌 করে রাখলে logo সবসময় দেখা যাবে।
   Logo তে click করলে Developer এর পরিচয়, link আর UMS পেজ খোলার বোতাম আসে।

ব্যবহার
--------
1. https://umsbd.net এ নিজে login করুন।
2. যে ধরনের প্রশ্ন লাগবে সেই পেজে যান:
     MCQ প্রশ্ন:      https://umsbd.net/Exam/Question/Index
     Written প্রশ্ন:  https://umsbd.net/Exam/OnlineWrittenQuestion/Index
   নিচে ডান কোণে "TIS Question Downloader" প্যানেল দেখা যাবে।
3. সাইটের ফর্মে স্বাভাবিকভাবে select করুন:
     Select Organization  -> যেমন ONLINE CARE
     Select Program       -> যেমন Class 8 Academic Online Program
     Select Session       -> যেমন 2026
     Select Course        -> যেমন Class 8 Pioneer Batch [Online]
     Search Exam          -> code লিখুন (যেমন 294), নিচে যে তালিকা আসে সেখান থেকে exam এ CLICK করুন
     Version              -> Bangla / English / Version(ALL)
   প্যানেলে প্রতিটির পাশে ✔ চিহ্ন এলে ঠিক আছে।
4. "⬇ Word File Download" চাপুন। কাজ শেষ হলে file আপনার Downloads folder এ চলে যাবে।

File এর নাম যেমন হবে:
     MCQ:      Class_8_Pioneer_Batch_Online_Code-294_Bangla.docx
     Written:  Class_8_Pioneer_Batch_Online_Written_Code-399_Bangla.docx
Version(ALL) দিলে Bangla ও English আলাদা দুটি file হবে।
একাধিক Unique Set থাকলে প্রতিটি Set এর আলাদা file হবে।

জেনে রাখুন
-----------
- একই উদ্দীপকের দুটি প্রশ্ন (যেমন ৬ ও ৭) সাইটে একই Word file এ থাকে; সেটা একবারই রাখা হয়।
- যে প্রশ্ন Word থেকে Import করা নয় (Edit এ Word file খোলে না), সেটা বাদ যায় এবং প্যানেলে লেখা থাকে।
- "উপরে Heading দাও" টিক থাকলে file এর শুরুতে Course ও Exam এর নাম বসে। না চাইলে টিক তুলে দিন।
- Login session শেষ হলে প্যানেল জানাবে, আবার login করে চেষ্টা করুন।
- Chrome মাঝে মাঝে "Developer mode extensions" নিয়ে সতর্কবার্তা দেখাতে পারে, এটা স্বাভাবিক, বন্ধ করে দিলেই হবে।

Update করতে
------------
নতুন version পেলে পুরনো folder এর file গুলো নতুনগুলো দিয়ে replace করুন,
তারপর chrome://extensions (বা edge://extensions) এ extension এর ⟳ (Reload) বোতাম চাপুন।

নিজের ছবি যোগ করতে
--------------------
"extension" folder এর ভেতরে আপনার ছবি "photo.jpg" নামে রাখুন (বা "photo.png")।
বর্গাকার (যেমন 400x400) ছবি সবচেয়ে ভালো দেখায়।
তারপর chrome://extensions (বা edge://extensions) এ extension এর ⟳ Reload চাপুন।
ছবি না থাকলে ছবির জায়গায় "তা" অক্ষরটি দেখা যায়।
