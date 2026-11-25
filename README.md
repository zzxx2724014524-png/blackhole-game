# 黑洞入侵 · 网页版（原创素材复刻玩法）

纯静态网页，无需构建。任意静态服务器打开 index.html 即可（需要 http(s)，不能直接双击 file://，因为用了 ES Module）：

    cd blackhole-game && python3 -m http.server 8000   # 然后访问 http://localhost:8000

可直接上传到 GitHub Pages / Vercel / Netlify / 任意静态托管。

- 操作：手机按住屏幕任意处拖动（浮动摇杆）；电脑鼠标指向方向 / WASD / 方向键；Esc 暂停
- 模式：经典（2分钟，5个AI，被吃后复活）、大逃杀（7个AI，一条命）、单人（2分钟吞噬城市百分比）
- 所有模型、音效、音乐均为程序生成的原创内容；Three.js r170 已内置于 lib/
