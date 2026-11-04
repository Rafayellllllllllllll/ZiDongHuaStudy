# 小错本 · 微信小程序骨架

手机上的错题本。这个目录是原生微信小程序，跟仓库根目录的网页版分开。网页版不用动，这里也不连它的 Supabase。

现在能做的是：拍照或从相册选题、改题干、放进错题本、按 1 / 2 / 4 / 7 / 15 天排今日复习、自己练习、看一点统计。识别、裁剪、云同步和会员支付还是占位。

## 在微信开发者工具里打开

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 导入项目时，目录选本仓库里的 `miniprogram-app`（这一层有 `project.config.json`），不要选仓库根目录。
3. AppID 用 `wxce3c7c1820a4dd80`。工具如果问要不要用项目里的 AppID，选用。
4. 基础库选 3.5.5 或更新。不需要 npm 构建，也没有要安装的依赖。
5. 云开发先不用开通。不填环境 ID 时，题目存在这台手机的本地存储里，模拟器里就能点。相机和相册的用途说明，正式发布前在小程序后台的隐私协议里配。
6. 第一次打开会放进 6 道示例题。在「我的」里可以恢复示例，或清空。

详情页、拍照页不在底部五个标签里，从主页或错题库进去。

## 目录

```
miniprogram-app/
  app.js / app.json / app.wxss    入口、五个标签、薄荷和天蓝的主题
  project.config.json             AppID、云函数目录
  pages/home                      主页：掌握率、今日复习、最近错题
  pages/bank                      错题库：按学科、待复习、已掌握、星标看
  pages/practice                  练习：自己选题量和科目
  pages/stats                     统计
  pages/me                        我的，含会员入口
  pages/capture                   拍照 / 相册、预览、裁剪占位、改字、保存
  pages/question                  错题详情和编辑
  pages/session                   今日复习或练习的一题一题
  pages/member                    会员说明，没有支付
  services/                       以后要换云开发，只改这里
  utils/                          日期、复习间隔、统计
  data/sample.js                  示例题
  cloudfunctions/vision           识别云函数占位，未部署
  assets/tab                      底部图标，不是文字logo
```

## 现在是真的

- 五个标签和上面这些页面，文案沿用网页版的说法（拍照录错题、今日复习、错题库、我会了 / 不会）。
- 错题存在本地：`wx.setStorageSync`，键名 `xcb_questions_v1`。增删改、星标、清理重复题干、空题干不能存，都是真的。
- 今日复习按间隔走。新题当天就能看；记得一次，下次分别隔 1、2、4、7、15 天；15 天那次还记得，标成已掌握。忘记了回到 1 天，明天再出现。也可以直接标记已掌握，或放回今天。
- 练习不生成解析。有选项、并且记下的答案是 A/B/C/D 时，点选项后和自己的答案对照。没有选项就点「我会了」或「不会」。连续三次「我会了」标成已经会了。
- 统计按北京时间，可看今天、近 7 天、近 30 天，按学科或按日期。
- 拍照用 `wx.chooseMedia`（相机或相册）。保存时用 `FileSystemManager.saveFile` 把照片留在本地，详情里可以再看。临时文件过期后，字还在，照片可能打不开。

## 还是占位

- `services/recognize.js` 的 `recognize()` 不读照片，大约 0.7 秒后返回一段固定示例文字。页面上会写明「不是这张照片读出来的」，保存前要改成原文。
- 裁剪只有一个虚线框和说明，不会真的裁切。识别按整张图来（而识别本身也还没接）。
- `services/cloud.js` 里的 `CLOUD_ENV` 是空字符串，不会调用 `wx.cloud.init`，也不会请求云函数。
- `cloudfunctions/vision` 只是目录和返回示例的入口。没有安装依赖，不要在开发者工具里上传部署。
- 「我的 → 会员」写的是以后 9.9 元永久、用小程序虚拟支付。按钮是「暂未开通」，没有下单代码。
- 不登录、不连 Supabase、不生成解析。网页版里的知识点、笔记本、管理页，这一版没有。
- 「已掌握复查」会说明还没排上，和网页版一样。

## 数据以后怎么换成云开发

页面不直接读写存储，也不直接调云。换后端时改这三处就行：

- `services/store.js`：本地键值。云数据库可以接在这里，或让 `services/questions.js` 改读云数据库。
- `services/recognize.js`：把现在的示例结果换成上传图片 + `services/cloud.js` 的 `call("vision", ...)`。
- `services/cloud.js`：填上云开发环境 ID 后才会 `wx.cloud.init`。

题目字段和网页版大致对应，只是用了驼峰：`subject`、`qkind`、`stem`、`options`、`answer`（网页版是 `correct_answer`）、`mastered`、`streak`（网页版是 `consecutive_correct`）、`createdAt`。`explain` 留着但一直是空的，这一版不写解析。多出来的是复习用的 `intervalIndex`、`intervalDays`、`nextReviewDate`。

## 和网站版的关系

网站版仍是根目录的 HTML，地址是原来的 GitHub Pages，数据仍在 Supabase。这个小程序不读取那份数据，也不把 anon key 写进来。配色改成温暖一点的薄荷绿和天蓝；网页版的米白和红色没有改。底部五个标签与网页版一致：主页、错题、练习、统计、我的。没有用「错」字做图标，目前也没有单独的 logo。

## 上架时先记住

- 类目按「工具」，不要选「在线教育」。这一版只做识别结果的整理和复习安排，不提供讲解。
- 正式发布前，要在小程序后台配好摄像头、相册的隐私说明。
- 虚拟支付以后再做，而且只打算做安卓侧。这里没有 iOS 专用代码。

## 本地检查

在仓库根目录执行：

```bash
node miniprogram-app/tools/check.js
```

它会检查页面是否齐全、JSON 能否解析、WXML 标签是否闭合、图标尺寸，以及复习间隔和示例数据。这不能代替微信开发者工具里的编译。
