# Bản đồ hệ thống (Prompt 0) — phần B: Dữ liệu và CRUD
Khảo sát chỉ đọc mã, ngày 2026-11-13. Dữ liệu nằm trong localStorage của trình duyệt: đây KHÔNG phải database thật.

Gốc mã: `src/` (mọi đường dẫn dưới đây tính từ `src/`).

Toàn bộ dữ liệu nằm trong `localStorage` / `sessionStorage` của trình duyệt (cùng origin), đồng bộ giữa các tab bằng `BroadcastChannel` và sự kiện `storage`. Mỗi khóa dưới đây được coi như một "bảng". Không có schema, khóa ngoại hay transaction; mọi ràng buộc đều do mã JS thực thi.

Ghi chú nền: trang Settings/Workspace/Promotions/Support của cả 4 portal là một prototype nguyên khối `staff/account-settings-content.html` (7907 dòng); `client/account-settings-content.html`, `resident/settings-content.html`, `admin/settings-content.html` chỉ là `<!--include:staff/account-settings-content.html-->`. Dòng 3 của file này có "storage shim" vá `Storage.prototype`:

- đường dẫn `/client/…`: mọi khóa bắt đầu `eso-` (trừ `eso-msg*`) được đổi thành `client:eso-…`;
- đường dẫn `/resident/…`, `/admin/…`: CHỈ khóa bắt đầu `eso-proto` được đổi (`resident:eso-proto`, `admin:eso-proto`); các khóa `eso-` khác dùng chung với Staff.

Shim chỉ có hiệu lực trong document của trang prototype đó.

---

## 1. Bảng dữ liệu

### 1a. Khóa do các module `src/**/*.js` quản lý

| Khóa | Kiểu lưu | Cấu trúc (gọn) | Ràng buộc MÃ thực thi | Module đọc | Module ghi | Trang dùng |
|---|---|---|---|---|---|---|
| `eso-msg-v1` | localStorage (dự phòng bộ nhớ nếu bị chặn) | Một document: `{ v:1, rev, seq, ticketSeq, convs:{id→conv}, msgs:{convId→[msg]}, prefs:{userId→{dnd, pinned[], muted[], important[], hidden[msgId], hiddenConvs{convId:ts}}} }` (`messaging/store.js:79`). **conv** chung: `id, kind, status, createdAt, updatedAt, last{at,from,kind,text}`; `resident_support`: `residentId, assigneeId, topic, bot{topic,attempts,lastFaq,answered[]}, summary{topic,asked[],details[]}, queuedAt, closedAt, closedBy, closeReason, csat, ticketNo, waiting, claimedAt, emergency{at,by,msgId,ackBy,ackAt,smsAt}` (`:400, :344-382, :481`); `direct`: `participants[2], startedBy, outreach, residentReplied, ticketNo?, resolvedAt?, resolvedBy?` (`:656, :566-569`); `support`: `ticketNo, requesterId, assigneeId, subject, priority, category, resolvedAt` (`:672`); `group`: `participants[], name, createdBy` (`:753`); `announcement`: `authorId, audience, title` (`:801`). **msg**: `id, convId, from(userId/'bot'/'system'), kind(text/bot/system), text, at, readBy{userId:ts}` + tùy chọn `clientId, attachments[{id,kind,name,mime,size,data}], replyTo, emergency, forwarded, viaChoice, choices[], chosen, notify, reactions{emoji:[userId]}, deleted, editedAt, audit{field,from,to,actorId,actorName,at}` (`:212-220, :335-342`) | Ghi qua `act()`→`transport.update` so sánh `rev` (`store.js:193-206`, `transport.js:112-132`). Quyền nhắn `CAN_MESSAGE` (`:15-21`), `canSee`/`postCheck` (`:249-302`). Văn bản bắt buộc, ≤2000 (`:318-323, :449-451`). Đính kèm ≤4, ≤450 KB, phải là `data:` URL, tên ≤80 (`:230-243`). `clientId` không lưu trùng (`:460-463`). `replyTo` phải tồn tại, chưa xóa, không phải system (`:467-471`). Một phiên resident mở mỗi cư dân (`:423-424`). Outreach ≤2 luồng chưa trả lời/24h và 1 tin cho đến khi cư dân trả lời (`:288-291, :652-653`). Ticket Support: subject bắt buộc ≤120, priority ∈ low/normal/high, category ∈ `TICKET_CATEGORIES` (`:672, :683-685`). Nhóm 3–12 người, không có resident, tên bắt buộc ≤60 (`:739-760, :770, :782`). 1 reaction/người/tin (`:848-854`). Unsend/Edit trong 15 phút, chỉ tin của mình (`:866-868, :892-894`). Người dùng phải có trong `personas.js` (`user()` `:209`) | `messaging/store.js` (mọi hàm đọc), qua đó `messaging/app.js`, `tickets.js`, `hub.js`, `notifications/live.js`, `admin/dashboard.js`+`overview.js`, `portal-frame-extras.js` | `messaging/store.js` qua `messaging/transport.js` | `/{resident,staff,client,admin}/messages.html`, `…/tickets.html`, `/messages/index.html` (hub), `/admin/dashboard.html`, mọi trang có chuông và trang Notifications |
| `eso-msg-v1:live` | localStorage | `{ presence:{userId:ts}, typing:{convId:{userId:ts}} }` | Không có `rev`; ghi sau thắng; tự cắt presence >5 phút, typing >15 s (`transport.js:88-101`) | `store.js:1043-1063` | `store.js:1037-1055` | Trang Messages |
| `eso-msg` / `eso-msg:live` | BroadcastChannel | thông điệp `{rev}` / `1` | — | `transport.js:41-48, 69-75` | `transport.js:101, 128` | như trên |
| `eso-msg-draft:<personaId>:<convId>` | localStorage | chuỗi nháp | — | `messaging/app.js:323` | `app.js:1759` (ghi/xóa), `:1670, :1725` (xóa) | Messages |
| `eso-msg-outbox:<personaId>` | localStorage | `[{cid, convId, text, at, attachments, replyTo, emergency}]` | Xóa khóa khi rỗng (`app.js:1621`) | `app.js:1640` | `app.js:1616-1623` | Messages |
| `eso-msg-context` | localStorage | `'1'/'0'` (mở panel chi tiết) | — | `app.js:821` | `app.js:826` | Messages (Staff, Admin) |
| `eso-msg-recent-emoji` | localStorage | `[emoji]` tối đa 16 | cắt 16 (`app.js:1930`) | `app.js:1900` | `app.js:1930` | Messages |
| `eso-msg-contrast` | localStorage | `'1'/'0'` | — | `app.js:2210` | `app.js:2208` | Messages |
| `eso-msg-offline` | **sessionStorage** | `'1'/'0'` (giả lập mất mạng) | — | `app.js:117, 2191` | `app.js:2200` | Messages |
| `eso-feed` | localStorage | `{ posts:[{id,a,t,aud,ann,src,pin,txt,img[[bg,alt]],likes,lk,mr,rp,rb,sb,vw,ed,poll, rs:[{id,a,t,txt,likes,re,rb,del,ed,rs[]}]}], follow[], seen, rpv, myRp[], mrx{commentId:kind}, hid[commentId], removed{commentId:{t,reason?,vid?,quote}}, vio:[{id,post,comment,who,name,reason,note,rule,kind,t,until?,quote,postBy,postText,manual?,by?,lifted?}], folders:[{id,who,name,t,strikes[]}], rules{limit,minPauseMin,maxPauseDays,requireNote,defaults,by,t} }` (`social/staff-store.js:5-8`, `moderation.js:3-8, 29-32, 147`) | Bài ≤1000 ký tự, audience ∈ all/residents/staff, announcement không được "staff" (`staff-store.js:511-517`); ảnh ≤4, chỉ gradient hoặc `data:image/(jpeg/png/webp)` ≤420 000 ký tự, alt ≤120 (`images.js:7-47`); reply ≤500 (`:255-258`); ghim ≤3 (`:560-573`); chỉ sửa/xóa/ghim bài `a==='me'` (`:541, :568, :580`); 1 vi phạm/1 bình luận, chỉ trên bình luận của Resident (`:356-358`); lý do ∈ `REASONS`, note ≤300, note bắt buộc với "other"/khi `requireNote`, pause trong [minPauseMin, maxPauseDays] (`moderation.js:95-110`); rules trong `RULE_LIMITS` (`moderation.js:64-81`); follow chỉ người có thật (`residents.js:52-58`) | `social/staff-store.js`, `social/store.js` (chỉ đọc), `social/residents.js:39`, `notifications/live.js`, prototype (`html:1662`) | `social/staff-store.js:42-44` (`writeFeed`), `social/seed.js:30`, prototype (`html:1662, 1674`) | `/staff/social.html`, `/resident/social.html`, chuông + Notifications (Staff, Resident), trang prototype Staff |
| `eso-res-social:<residentId>` | localStorage | `{ accepted(ver), show, liked[], reacts{id:kind}, shares[], following[], replies{postId:[{id,t,txt,likes,re?,ed?,del?}]}, hidden[], acked[], resumed[] }` (`social/store.js:83-102`) | Reply ≤500, không rỗng (`store.js:339-341`); bị từ chối khi Staff tắt reply, khi đang pause, khi bài/bình luận không nhìn thấy (`:331-338, :281-287`); không follow chính mình (`:312`); chỉ sửa/xóa bình luận của mình, không sửa cái Staff đã remove (`:361-386`); `ackNotice` không được khi pause còn chạy (`:105-111`); `resumePause` chỉ khi mọi pause về 0 và không ở trạng thái review, đồng thời đặt `accepted=0` (`:123-133`) | `social/store.js`, `social/residents.js:12-32` (Staff đọc mọi resident), `staff-store.js:417, 430`, `preview.js:624`, `account-settings.staff.js:288, 444` | `social/store.js:100-102` (`put`) | Social (cả hai), Settings Resident, sidebar Resident |
| `eso-mod` | localStorage | `{ gl:{ver,pub,by,accept,hist,blocks[[title,text]]}, perms{reply…}, queue… }` (`html:3233`) | `social/store.js` chỉ chuẩn hóa khi đọc (`:61-79`) | `social/store.js:61, 75` | CHỈ prototype (`html:3253`) | Social Resident; trang prototype Staff |
| `eso-social` | localStorage | `{ on, sidebar, pres, posts, notif, dnd, muted{people[],kw[],threads[]}, read[] }` (`html:1904`) | — | `social/store.js:55`, `staff-store.js:144-148`, `account-settings.quality.js:19`, `preview.js:624` | `staff-store.js:166, 179` (chỉ `muted`), prototype (`html:1906`) | Social, prototype |
| `eso-social-saved:<personaId>` | localStorage | `[postId]` | — | `social/resident.js:298` | `social/resident.js:1024` | Social (Staff và Resident) |
| `eso-res-privacy:<personaId>` | localStorage | `'1'/'0'` (mặc định bật) | — | `social/resident.js:1184` | `:1242` | Social (dùng cả với id Staff) |
| `eso-res-privacy-log:<personaId>` | localStorage | `[{t,kind}]` 50 mục cuối | cắt 50 (`:1198`) | chỉ đọc để nối thêm (`:1196`) | `:1198` | Social |
| `eso-res-social-seen:<personaId>` | localStorage | `{alertId:true}` | — | `social/resident.js:1285`, `notifications/live.js:54, 72` (chỉ role resident) | `social/resident.js:1286-1290` | Social, chuông Resident |
| `eso-notif-read:<personaId>` | localStorage | `{notifId: true/false}` | Chỉ nhận object (`notifications/store.js:149-154`) | `notifications/store.js:149`, `notifications/app.js:36, 59`, `portal-frame-extras.js:285, 360` | `notifications/store.js:159-164` (`setRead`) | Notifications 4 portal, chuông |
| `eso-pmc-saved` | localStorage | `[{id, st(draft/scheduled/active), x{title,reward,desc,cat,partner,plogo,cover,otype,oval,method,code,prefix,link,limR,limT,start,end,ch[],au,blds[],segs[],terms…}, views, claims}]` (`promotions/store.js:4, 69-95`) | Khi đọc: bỏ draft, ngoài ngày, không có kênh "In-App", ngoài audience (`:57-64, 101-107`); ảnh/link chỉ `data:image/` hoặc `http(s)` (`:67, 71`) | `promotions/store.js:114` | CHỈ prototype (`html:6238`) | `/resident/promotions.html`, prototype Staff |
| `eso-pmc-cats` | localStorage | `[[key,name,emoji]]` | — | `promotions/store.js:39` | prototype (`html:6168`) | như trên |
| `eso-proto` (và `client:eso-proto`, `resident:eso-proto`, `admin:eso-proto` do shim) | localStorage | Object `S` phẳng: toàn bộ thiết lập cá nhân/workspace (theme, accent, sidebar, `promoShow`, `promoSave`, `msg*`, `a11y*`, `rn*`, `resSocial`, `cw*`…) (`html:352-353`, `account-settings.staff.js:48-59`, `client-workspace.js:25-36`) | Trường `cw*` kiểm định dạng email/domain/url/tiền trước khi lưu (`client-workspace.js:205-210, 282-292`) | prototype (`html:353`), `promotions/store.js:32-35` (đọc `eso-proto` không tiền tố), `account-settings.staff.js:566` | prototype `save()` (`html:358`, và `:752, 805, 6747, 6749, 6775`), `account-settings.staff.js:573` | Settings/Workspace 4 portal; Promotions Resident |
| `eso-res-promo:<residentId>` | localStorage | `{ saved[promoId], claims{promoId:{count,code,at}} }` | Save bị từ chối khi Staff tắt `promoSave` (`promotions/store.js:140-147`); claim bị từ chối khi `promo.full`; quá `perResident` thì trả lại mã cũ, không ghi (`:163-174`) | `promotions/store.js:130-133` | `:135-137` | Promotions Resident |
| `eso-res-pref:<personaId>` | localStorage | `{ theme, phone, contact, contrast, reduceMotion }` | theme ∈ light/dark/system, contact ∈ app/email/text, phone 7–15 chữ số, boolean (`settings/prefs.js:25-41`) | `prefs.js:13`, `preview.js:609, 620`, `account-settings.staff.js:222, 262` | `prefs.js:40` (gọi từ `account-settings.staff.js:242`; `settings/resident.js` — module không trang nào nạp) | Settings Resident và Admin, mọi trang Resident |
| `ui-prefs:<portal>` | localStorage | `{ sb[4 hex], theme, accent, icons, counts, cap, collapse, a11y{}, text{}, buttons{}, cards{}, gestures{}, clock, favorites }` | Kiểm khi đọc: hex, khoảng số (`preview.js:98-151`, `look-prefs.js:12-55`) | `preview.js:97, 271, 613`, `portal-frame-extras.js:185, 270` | `account-settings.staff.js:419-431` | mọi trang portal |
| `ui-sidebar-collapsed:<portal>` | localStorage | `'1'/'0'` | — | `preview.js:174` | `preview.js:172` | mọi trang portal |
| `ui-sidebar-aligned:client` | localStorage | `'1'` (cờ migrate một lần) | — | `account-settings.staff.js:570` | `:572` | Settings Client |
| `<portal>:sb-pins`, `<portal>:sb-clock` | localStorage | `[label]`; `'1'/'0'` | lọc chuỗi (`portal-frame-extras.js:183`) | `:183, :268` | `:201, :264` | sidebar |
| `<portal>:status`, `:status-msg`, `:status-dur`, `:status-until` | localStorage | chuỗi; ms | status phải ∈ `STATUS`, duration ∈ `DURATIONS` (`portal-frame-extras.js:505-510`) | `:505-510` | `:520, 530, 597, 613, 617, 642` | menu hồ sơ ở header |
| `eso-scroll:<pathname>` | **sessionStorage** | scrollTop | — | `preview.js:455` | `preview.js:451` | dashboard |
| `eso-docs:client` | localStorage | `[{id,name,category,property,share,updated,uploadedAt,expires,size}]` + W-9 `{kind:'w9',legalName,classification,signed}` | Upload: đuôi ∈ `ACCEPT`, ≤10 MB, tên ≤120, category/property/share hợp lệ, ngày `YYYY-MM-DD` (`documents/store.js:142-166`); W-9: file pdf/png/jpg, legalName ≤120, ngày ký không ở tương lai (`:309-331`); chỉ 1 W-9 (`documents/app.js:339`) | `documents/app.js:34`, `usage/app.js:56`, `portal-frame.js:15` | `documents/app.js:35` | `/client/documents.html`, Capacity, sidebar Client |
| `eso-docs-dismissed:client` | localStorage | `{expired:n, soon:n}` | — | `documents/app.js:40` | `:87, 480, 483` | Documents |
| `docs-prefs:client` | localStorage | `{soonDays, share, storageWarn}` | chuẩn hóa khi đọc (`documents/store.js:41-48`) | `documents/app.js:38, 487` | `client-workspace.js:216` (`mirrorPrefs`) | Documents ← Workspace Client |
| `docs-secret:issued` / `:pending` / `:window` / `:via` / `:log` | localStorage | `[digest SHA-256]` ≤500; `{digest,via,madeAt,expiresAt,tries}`; ms; `'email'/'app'`; `[{at,by,how}]` ≤5 | Khóa không phát trùng (`documents/store.js:202-210`); 1 khóa sống, 5 phút, 5 lần thử, dùng 1 lần (`:214-233`); chỉ lưu digest | `documents/app.js:141, 355-356, 382, 397`, `dockey-settings.js:54, 66-67, 146, 216-217` | `documents/app.js:383-386, 416, 428`, `dockey-settings.js:147-150, 271, 332` | Documents, Workspace Client > Document secret key |
| `docs-secret:guard` / `:tries` | localStorage | `{v,type,iter,salt,hash,set}` (PBKDF2); `{n,lockUntil}` | PIN 6 số, password 8–64, không dễ đoán (`documents/store.js:254-269`); 5 lần sai khóa 5 phút (`:290-295`); ghi `null` thì xóa khóa (`dockey-settings.js:17`) | `dockey-settings.js:30, 176, 240, 257` | `dockey-settings.js:242-243, 265, 276, 288` | Workspace Client |
| `eso-capacity:client` | localStorage | `{parking,residents,staff,storage, properties:[{name,units,address}]}` | Chuẩn hóa khi đọc: số nguyên 0..max, ≤50 property, tên ≤80, địa chỉ ≤120 (`capacity/store.js:21-27`); form property (`:67-80`) | `usage/app.js:16`, `documents/app.js:177`, `portal-frame.js:15` | `usage/app.js:206` | `/client/usage/capacity.html`, Documents, sidebar |
| `eso-capacity-budget:client` | localStorage | số hoặc `'none'` | regex số tiền (`usage/app.js:142-144`) | `usage/app.js:20` | `:144` | Capacity |
| `capacity-prefs:client` | localStorage | `{budget: số/null}` | — | `usage/app.js:20` | `client-workspace.js:218` | Capacity ← Workspace Client |

### 1b. Khóa chỉ có trong prototype `staff/account-settings-content.html` (không module `src/**/*.js` nào chạm tới)

`eso-sbg` (351), `eso-mfa` (354, 4559), `eso-prop` (467, 811), `eso-status` (1081-1083), `eso-avatar` (1209, 1238), `eso-pvcol` (1292, 1299), `eso-notif` (1533-1534), `eso-bell` (1558-1563), `eso-staffcard` (1854, 3672), `eso-promo` (2104, 7765, 7774), `eso-pm-saved` (2123), `eso-pmf` (2133, 6481), `eso-pb`/`eso-brand` (2443-2445), `pd.tab` (2593), `eso-sec` (3690, 4557), `lw.recent` (4192), `eso-social-terms-v1` (4424), `eso-guide-v1` (4711), `eso-games-v1` (4767), `eso-covers-v1` (5818), `eso-privacy-v1` (5897), `eso-audit-v1` (5908, cắt 200), `eso-pmode` (5911), `eso-pvlast` (5944), `eso-covmig-t152` (6088), `eso-pmc-draft` (6160), `eso-pmclaims` (6383), `eso-pmlim2` (6553), `eso-pmst` (6646), `eso-sup` (6933), `eso-hist` (7074), `eso-pmedits` (7726), `eso-pmpin-v2` (7765), `eso-pmsz` (7803), `eso-pmlk` (7811); sessionStorage: `eso-fsm` (3630), `eso-viewas` (5901). Chỉ thấy đọc: `eso-bld` (4191), `eso-tz` (6164), `eso-test-gate` (4424). Nhóm này chỉ được liệt kê tên + dòng; cấu trúc chi tiết chưa đọc.

---

## 2. Dữ liệu mẫu (seed)

| Cái gì | Khi nào | Hàm |
|---|---|---|
| 9 hội thoại mẫu trong `eso-msg-v1` (c1…c9: 3 resident chat, 1 direct, 3 support, 1 announcement, 1 group; ticket T-1081…T-1085), thời gian tính lùi từ "bây giờ" | Lần đầu bất kỳ trang nào tạo store mà khóa chưa có (Messages, Ticket box, hub, Admin dashboard, mọi trang có chuông); và khi bấm "Reset demo data" | `createSeed` `messaging/store.js:78-161`; `ensureLoaded` `:172-179`; `reset` `:1098-1105` (gọi từ `hub.js:68-69`, `app.js:2229-2230`; "Start empty" tạo document rỗng) |
| 9 bài Social (p1…p9) + `follow:['dana','kim']` | Mở trang Social khi chưa có `eso-feed`; không bao giờ ghi đè | `ensureFeed`/`seedPosts` `social/seed.js:12-33`, gọi ở `social/resident.js:32`. Prototype cũng tự seed (`html:1662`) |
| 7 tài liệu mẫu d1…d7 | Mỗi lần mở Documents mà `eso-docs:client` chưa phải mảng. **Chỉ nằm trong bộ nhớ**, chỉ ghi xuống khi có thay đổi đầu tiên | `seed` `documents/store.js:58-71`; `documents/app.js:34-35` |
| Dữ liệu mẫu của prototype | Trong prototype | ví dụ `eso-bell` mặc định (`html:1558`), `eso-pmclaims` (`html:6387-6388`), `eso-sup` (`html:6942`) |
| Promotions | **Không có seed** trong `promotions/store.js`: trang Resident rỗng cho tới khi Staff lưu promotion vào `eso-pmc-saved` | — |

Số liệu hiển thị là mẫu cứng trong mã (không phải dữ liệu lưu):

- **Notifications**: danh sách sinh tại chỗ từ công thức `CLIENT_RECIPES/STAFF_RECIPES/RESIDENT_RECIPES/ADMIN_RECIPES` (`notifications/store.js:40-116`), dựng bởi `buildSample` (`:131-146`). Số chưa đọc gốc: Client 109, Staff 7, Resident 33, Admin 3. Chỉ mục Messages (và Community của Staff/Resident) được thay bằng dữ liệu thật (`REPLACED_BY_LIVE` `:120`, `notifications/live.js:22-52`). Chỉ trạng thái đã đọc được lưu.
- **Admin dashboard**: `PLATFORM` (2 client, 2 property, 43 người, 261 chỗ, $19), `HEALTH` (0 critical, 32 warning, 8 "User n"), `ACTIVITY` (6 lần đăng nhập) — `admin/overview.js:135-166`. Phần thật: hàng đợi Support, tin chưa đọc, emergency (`overview.js:20-67`).
- **Capacity**: `BASE`, `ITEMS` (261/500 chỗ, 9.4 GB…), `PROPERTY` (`capacity/store.js:6-16`); `USAGE`, `CW_DEFAULTS` (`staff/client-workspace.js:19-36`).
- **Người dùng**: `PERSONAS`, `BOT` (`messaging/personas.js:11-24`), kể cả unit/lease/segments. Không lưu trong storage.
- **Trợ lý**: `TOPICS`/FAQ (`messaging/bot.js:7-43`); câu trả lời nhanh `CANNED` (`messaging/app.js:62-65`).
- **Social**: lượt xem `SAMPLE_VIEWS` (`staff-store.js:28`), ai react/share bài mẫu `SAMPLE_BY`, `SAMPLE_SHARES` (`reactions.js:24-36`), tên tác giả `AUTHORS`/`PEOPLE` (`social/store.js:41-44`, `staff-store.js:23-26`, `residents.js:46-49`), `MUTE_DEFAULT` (`staff-store.js:143`), `DEFAULT_GUIDELINES` (`social/store.js:25-37`), `DEFAULT_RULES` (`moderation.js:34-40`).
- **Documents**: người dùng cố định `ME = Dana Whitfield` (`documents/app.js:30`, `dockey-settings.js:14`).

---

## 3. Bản đồ CRUD

Ký hiệu: T = thêm, Đ = đọc, S = sửa, X = xóa. "store" = `messaging/store.js`; "ss" = `social/staff-store.js`; "rs" = `social/store.js`.

| Tính năng | T | Đ | S | X | Khóa | Hàm (path:line) |
|---|---|---|---|---|---|---|
| Gửi tin | msg (+ có thể claim, mở lại direct, chạy bot) | `get` | conv.last/updatedAt/status | — | `eso-msg-v1` (+ outbox, draft) | `send` store:446; UI `app.js:1714, 1645-1673`, `tickets.js:427` |
| Quick reply của trợ lý | msg | — | `chosen`, `conv.bot` | — | `eso-msg-v1` | `choose` store:430 |
| Sửa tin | — | — | `text`, `editedAt` (văn bản cũ không giữ) | — | `eso-msg-v1` | `edit` store:883; `app.js:1707` |
| Unsend | — | — | `deleted=true`, xóa trắng text/attachments/reactions | bản ghi giữ lại | `eso-msg-v1` | `unsend` store:860 |
| Xóa cho riêng mình / hoàn tác | — | `hiddenItems` store:972 | `prefs[user].hidden` | — | `eso-msg-v1` | `hideMessage` :904, `unhideMessage` :921 |
| Ẩn / hiện hội thoại | — | `isHiddenConv` :966 | `prefs.hiddenConvs` | — | `eso-msg-v1` | `hideConversation` :938, `unhideConversation` :951 |
| Ghim / tắt tiếng / quan trọng; DND | — | `pref` :1071 | `prefs[flag]`, `prefs.dnd` | — | `eso-msg-v1` | `toggleFlag` :993; `setPref` :1065 (`app.js:2234`) |
| React tin nhắn | — | — | `msg.reactions` | bỏ reaction cũ | `eso-msg-v1` | `react` store:840 |
| Chuyển tiếp | msg bản sao | — | — | — | `eso-msg-v1` | `forward` store:499 |
| Đọc / chưa đọc | — | `unreadCount` :1109, `badgeCount` :1117, `alertsFor` :1140 | `msg.readBy` | xóa mục `readBy[user]` khi "chưa đọc" | `eso-msg-v1` | `markRead` :809, `markUnread` :827 |
| Cư dân mở phiên / xin gặp người / kết thúc / chấm điểm | conv + lời chào | — | `status`, `ticketNo`, `summary`, `csat` | — | `eso-msg-v1` | `ensureSession` :418, `requestStaff` :528 (`queue` :356), `endChat` :578, `rate` :627 |
| Staff nhận (claim) | msg system + audit | — | `status='active'`, `assigneeId`, `claimedAt` | — | `eso-msg-v1` | `claim` :538, `takeChat` :375 |
| Staff đổi trạng thái ticket | audit | — | `waiting` | — | `eso-msg-v1` | `setTicketState` :613 |
| Resolve | system + audit | — | resident: `status='closed'`; support: `status`, `resolvedAt`; direct Staff↔Client: `ticketNo`, `resolvedAt`, `resolvedBy` | — | `eso-msg-v1` | `resolve` :550, `closeResident` :344, `_setSupportStatus` :689 |
| Emergency | cờ trên msg + `conv.emergency` | `emergencies` :603 | `ackBy/ackAt`, `smsAt` | — | `eso-msg-v1` | `send` :472-484, `acknowledgeEmergency` :588, `tick` :1074 |
| Mở ticket Support | conv + msg | `ticketBox` :1303, `ticketRecord` :1322 | — | — | `eso-msg-v1` | `startSupport` :680, `_startSupportIn` :668; `tickets.js:467`, `app.js:2070` |
| Admin: trạng thái / giao / ưu tiên | audit | — | `status`, `assigneeId`, `priority` | — | `eso-msg-v1` | `setSupportStatus` :701, `assignSupport` :709, `setPriority` :722 |
| Direct / nhóm / thông báo chung | conv + msg | `listFor` :1232, `get` :1343 | `participants` | rời nhóm: bỏ id khỏi mảng | `eso-msg-v1` | `startDirect` :637, `createGroup` :739, `addMember` :762, `leaveGroup` :777, `broadcast` :790 |
| Tự đóng chat / leo thang | system/audit | — | `status`, `smsAt` | — | `eso-msg-v1` | `tick` :1074 |
| Reset demo | toàn bộ seed | — | — | xóa sạch document | `eso-msg-v1` | `reset` :1098 |
| Đăng bài (Staff) | post `u<now>` | `timeline` ss:90 | — | — | `eso-feed` | `addPost` ss:521 (`social/resident.js:1660`) |
| Sửa / ghim / xóa bài | — | — | `txt, aud, ann, src, img, ed`; `pin` | xóa hẳn bài và reply trong feed | `eso-feed` | `editPost` ss:537, `pinPost` ss:564, `deletePost` ss:576 |
| Reply (Staff) | reply `m<now>` trong `posts[].rs` | — | xóa cờ `nr` | — | `eso-feed` | `addReply` ss:255 |
| Reply (Resident) | reply vào `replies[postId]` | `timeline` rs:223 | — | — | `eso-res-social:<id>` | `addReply` rs:331 |
| Sửa / xóa reply | — | — | `txt`, `ed` | xóa mềm: `del=ts` (văn bản vẫn nằm trong storage) | `eso-feed` (Staff) / `eso-res-social:<id>` | ss:304, ss:318; rs:361, rs:377 |
| Ẩn bình luận cho riêng mình | — | — | `feed.hid[]` / `hidden[]` | — | như trên | ss:327; rs:388 |
| Staff gỡ bình luận | `feed.removed[id]` | — | — | cờ, bản gốc giữ | `eso-feed` | `removeComment` ss:339 |
| React bài/bình luận | — | — | Staff: `mr`/`lk`, `mrx`; Resident: `liked`, `reacts` | — | `eso-feed` / `eso-res-social:<id>` | ss:212; rs:281 |
| Share | — | — | `feed.myRp` / `shares` | — | như trên | ss:237; rs:298 |
| Follow | — | `followersOf` `residents.js:35` | `feed.follow` / `following` | — | như trên | ss:190; rs:310 |
| Lưu bài | — | — | danh sách | — | `eso-social-saved:<id>` | `social/resident.js:1021-1024` |
| Mute / unmute | — | `muted` ss:145 | `eso-social.muted` | — | `eso-social` | `muteThread` ss:174, `unmute` ss:160 |
| Vi phạm trên bình luận | `feed.vio[]` (+ `removed` nếu chọn) | `violations` ss:402, `standings` ss:422 | — | — | `eso-feed` | `addViolation` ss:352 |
| Ban / Warn trực tiếp | `feed.vio[]` (`manual:true`) | — | — | — | `eso-feed` | `banResident`/`warnResident` ss:473-475 (`directViolation` ss:456) |
| Unban | — | — | `vio.until=now`, `vio.lifted` | — | `eso-feed` | `unbanResident` ss:479 |
| Mở tài khoản đủ strike | `feed.folders[]` | `accountsUnderReview` ss:377 | — | — | `eso-feed` | `openAccount` ss:391 |
| Quy tắc vi phạm | — | `rules` ss:490 | `feed.rules` | `delete f.rules` | `eso-feed` | `saveRules` ss:495, `resetRules` ss:504 |
| Resident: đọc thông báo vi phạm / Resume | — | `noticesOf` rs:136, `pauseOf` rs:117 | `acked[]`; `resumed[]`, `accepted=0` | — | `eso-res-social:<id>` | `ackNotice` rs:105, `resumePause` rs:123 |
| Guidelines | (Staff soạn trong prototype) | `guidelines` rs:61, `needsGuidelines` rs:154 | Resident: `accepted=ver` | — | `eso-mod` (Staff ghi, `html:3253`); `eso-res-social:<id>` | `acceptGuidelines` rs:159 |
| Bật/tắt Social | — | `socialOn` rs:55 | `show` | — | `eso-social` (Staff), `eso-res-social:<id>` | `setShow` rs:166 |
| Promotions: Staff soạn/đăng | bản ghi | — | bản ghi | — | `eso-pmc-saved`, `eso-pmc-cats`, `eso-pmc-draft` | prototype `html:6160-6238` |
| Promotions: Resident lưu | — | `listPromotions` `promotions/store.js:110` | `saved[]` | bỏ lưu | `eso-res-promo:<id>` | `toggleSaved` :140 |
| Promotions: Resident claim | `claims[promoId]` | `residentState` :130 | `count+1` | — | `eso-res-promo:<id>` | `claim` :163 |
| Documents: upload / xóa / hoàn tác | doc `u<now>` | `documents/app.js:34` | — | lọc khỏi mảng (hoàn tác chèn lại) | `eso-docs:client` | `validateUpload` `documents/store.js:142`; `app.js:465-466, 303-306` |
| W-9 | doc `w9-<now>` thay cái cũ | — | — | cái cũ bị bỏ | `eso-docs:client` | `validateW9` `documents/store.js:309`; `app.js:339-340` |
| Khóa bí mật W-9 | digest, pending, window, log | — | `tries`, `pending=null` | — | `docs-secret:*` | `documents/app.js:380-428`; `dockey-settings.js:144-150, 256-288` |
| Capacity: mua thêm / ngân sách | — | `usage/app.js:16, 20` | `purchased`; budget | — | `eso-capacity:client`, `eso-capacity-budget:client` | `applyCart` `capacity/store.js:59`; `usage/app.js:205-206, 144` |
| Notifications đọc / chưa đọc / đọc hết | — | `readMap` `notifications/store.js:149` | map (và `readBy` của chat tương ứng) | — | `eso-notif-read:<id>`, `eso-msg-v1` | `setRead` :159; `notifications/app.js:69-74, 88-94`; `portal-frame-extras.js:323`; `live.js:74-76` |
| Settings & Personalize | — | `html:353` | object `S` ghi nguyên khối; phát `ui-prefs:<portal>` | — | `eso-proto` (theo shim), `ui-prefs:<portal>` | prototype `save()` `html:358`; `publishUI` `account-settings.staff.js:419-443` |
| Hồ sơ Resident/Admin (phone, contact) | — | `readPrefs` `prefs.js:13` | — | — | `eso-res-pref:<id>` | `savePrefs` `prefs.js:34`; `account-settings.staff.js:235-243` |
| Workspace Client → Documents/Capacity | — | — | bản sao | — | `docs-prefs:client`, `capacity-prefs:client` | `mirrorPrefs` `client-workspace.js:214-219` (móc vào `window.save` `:260-261`) |
| Sidebar pin / đồng hồ / thu gọn; status | — | — | giá trị | — | `<portal>:sb-*`, `ui-sidebar-collapsed:<portal>`, `<portal>:status*` | `portal-frame-extras.js:198-204, 257-265, 518-530, 642`; `preview.js:166-174` |

---

## 4. Toàn vẹn và đồng thời (chỉ mô tả)

**Ghi nguyên tử hay không**

- Messaging là chỗ duy nhất có kiểm soát đồng thời: `transport.update` đọc state, chạy hàm sửa trên bản sao, đọc lại và so `rev`; lệch thì thử lại, tối đa 6 lần, rồi trả lỗi "Write conflict" (`transport.js:112-132`). Đây là so-sánh-rồi-ghi bằng JS trên `localStorage`, không phải transaction của trình duyệt (vẫn có khe giữa lần đọc lại và `setItem`). Mỗi thao tác store là một lần ghi cả document (`store.js:193-206`); thao tác thất bại hoặc `noop` thì không ghi (`:197`).
- Presence/typing (`eso-msg-v1:live`): không `rev`, ghi sau thắng, lỗi bị nuốt (`transport.js:88-101`).
- Mọi khóa khác (Social, Promotions, Notifications, Documents, Capacity, Settings): đọc-sửa-ghi cả khóa, không phiên bản. `staff-store.js` và `social/store.js` đọc lại từ storage ở mỗi lần gọi; còn `documents/app.js` (biến `docs`, `:34-35`), `usage/app.js` (`purchased`, `:16, 205-206`) và prototype (`S` `html:353/358`, `F` `html:1662/1674`, `SS` `html:1905-1906`, `M` `html:3252-3253`) giữ bản sao trong bộ nhớ từ lúc tải trang rồi ghi đè nguyên khối.

**Storage đầy hoặc bị chặn**

- Messaging: bị chặn lúc khởi tạo → dùng bộ nhớ tạm, `mode='memory'`, dữ liệu không lưu và không chia sẻ giữa tab (`transport.js:17-36`; UI báo ở `hub.js:49`, `app.js:2194`). `setItem` lỗi → `{ok:false, reason:'storage'}` (`transport.js:125-127`, `store.js:199`).
- Social / Promotions / Prefs: hàm ghi trả `false`, store trả lý do ("Could not save…", `staff-store.js:532` nêu riêng trường hợp ảnh).
- Notifications `setRead`, Documents `write`, Usage `write`, dockey `write`, `mirrorPrefs`, `publishUI`: nuốt lỗi; thay đổi chỉ còn trong bộ nhớ đến khi tải lại (`notifications/store.js:162`, `documents/app.js:33`, `usage/app.js:13`).
- Không bọc try/catch: `messaging/app.js:117, 323, 1670, 1725, 1759, 1930`; cấp module `social/resident.js:24`, `promotions/resident.js:16`, `notifications/app.js:36`; nhiều `localStorage.setItem` trong prototype (`html:358, 1083, 1534, 1563, 1674, 1906, 3253`).

**Hai tab**

- Messaging: BroadcastChannel `eso-msg` + sự kiện `storage`; store nạp lại khi `rev` khác (`store.js:183-190`).
- Social: nghe `storage` cho `eso-(feed|mod|social|res-social)` rồi vẽ lại (`social/resident.js:2496-2499`). Notifications: `eso-notif-read:` (`notifications/app.js:59`, `portal-frame-extras.js:379`) và `eso-(feed|res-)` (`live.js:70`). Promotions: `promotions/resident.js:260-262`. Sidebar Resident: `preview.js:630`. `ui-prefs` truyền qua `postMessage` kiểu `eso-ui-prefs` (`account-settings.staff.js:433`, `preview.js:183, 238`).
- Documents chỉ nghe `docs-prefs:client` (`documents/app.js:487`); Capacity không nghe gì; prototype chỉ nghe `eso-games-v1` (`html:5697`). Với các trang này, tab mở trước ghi đè thay đổi của tab kia ở lần lưu kế tiếp.

**Xóa thật hay chỉ gắn cờ**

- Messaging: không xóa bản ghi nào. Unsend gắn `deleted` và xóa trắng nội dung (`store.js:869-875`); Edit ghi đè, không giữ bản cũ (`:896`); ẩn là tùy chọn riêng từng người; audit là tin `system` thêm vào, không có hàm sửa. Ngoại lệ: `reset` thay cả document (`:1098-1105`).
- Social: bài viết bị **xóa thật** cùng reply trong feed (`staff-store.js:581`). Bình luận xóa mềm bằng `del` (`staff-store.js:322`, `social/store.js:383`). Staff gỡ = cờ `feed.removed` kèm trích dẫn (`:345`). Vi phạm không bao giờ xóa; unban sửa `until` và thêm `lifted` (`:485`); mở tài khoản thêm `folders` (`:396-397`).
- Documents: xóa thật khỏi mảng (`documents/app.js:303`), W-9 mới thay cái cũ (`:339`). Khóa `docs-secret:guard/tries` và outbox/draft dùng `removeItem`.

**Sinh id / số**

- Hội thoại `c<n>` và tin `m<n>` dùng chung bộ đếm `seq` trong document, tăng trong cùng lần ghi (`store.js:82, 208`).
- Số ticket: `ticketSeq` bắt đầu 1080, tăng dần (`store.js:44`); cấp khi vào hàng đợi (`:357`), khi tạo ticket Support (`:672`), khi resolve direct Staff↔Client lần đầu (`:566`). `ticketNo()` có nhánh dự phòng `1000 + số trong id hội thoại` khi bản ghi không có `ticketNo` (`:43`).
- Đính kèm: `a` + 7 ký tự `Math.random` (`:240, :513`), không kiểm trùng. `clientId`: `k` + thời gian + 4 ký tự ngẫu nhiên (`app.js:1727`), chống trùng theo (clientId, người gửi) trong hội thoại (`store.js:460-463`).
- Social: bài `u<ms>` (`staff-store.js:528`), reply `m<ms>` (`staff-store.js:262`, `social/store.js:331-349`), vi phạm `v<ms>` (`:363`), folder `f<ms>` (`:396`) — theo mili-giây, không kiểm trùng. Riêng `directViolation` có vòng lặp thêm `x` khi trùng (`staff-store.js:463-465`). Reply của các cư dân nằm ở các khóa khác nhau nhưng chung không gian id `m<ms>`.
- Documents: `u<ms>`, `w9-<ms>` (`documents/store.js:164, 329`). Notifications: `n-<cat>-<i>`, `msg-<convId>-<msgId>` (`store.js:1161`), `soc-<alertId>` (`live.js:42`).
- Sau `reset`, `seq` về 0 nên id `c1…`, `m1…` được cấp lại, trong khi `eso-msg-draft:*`, `eso-msg-outbox:*` (`app.js:2228` chỉ xóa `ui.pending` trong bộ nhớ) và `eso-notif-read:*` vẫn giữ id cũ.

**Quan hệ mã dựa vào nhưng không cưỡng chế (có thể mồ côi)**

- Xóa bài (`deletePost`) không dọn: `eso-res-social:<id>.replies[postId]`, `liked/reacts/shares/hidden`, `feed.vio[].post/comment`, `feed.removed`, `feed.mrx`, `feed.hid`, `feed.myRp`, `eso-social.muted.threads`, `eso-social-saved:<id>`.
- `re` của reply trỏ tới id bình luận ở khóa khác (feed ↔ `eso-res-social:<id>`); chỉ kiểm lúc ghi (`staff-store.js:263-276`, `social/store.js:336`). Khi đọc, cha không còn thì reply thành bình luận gốc (`threads.js:13`).
- `feed.folders[].strikes[]`, `acked[]`, `resumed[]` trỏ tới `feed.vio[].id`. Trạng thái "đã resume" nằm ở khóa cư dân còn pause nằm ở `eso-feed`; Staff đọc chéo (`staff-store.js:430`).
- `eso-res-promo:<id>.saved/claims` trỏ tới `eso-pmc-saved[].id`; `toggleSaved` không kiểm id tồn tại (`promotions/store.js:140-147`).
- Mọi `residentId/assigneeId/requesterId/participants/authorId` trỏ tới `PERSONAS` trong mã, không phải storage; nhiều chỗ dùng thẳng `user(id).name` (`store.js:1199-1229`).
- Lý do vi phạm nối với tiêu đề khối guidelines bằng chuỗi (`moderation.js:14-19, 87-92`); đổi tiêu đề trong `eso-mod.gl.blocks` thì `ruleFor` trả `{title, text:''}`.
- `eso-notif-read:<id>` chỉ thêm, không dọn.
- `docs-prefs:client`, `capacity-prefs:client` là bản sao một chiều từ `client:eso-proto`, chỉ cập nhật khi trang Workspace Client gọi `save()` (`client-workspace.js:260-261`).

---

## 5. Điểm mù về dữ liệu

**Ghi mà không ai đọc**

- `eso-res-privacy-log:<id>`: chỉ được đọc để nối thêm (`social/resident.js:1194-1199`), không nơi nào hiển thị.
- Trong `eso-msg-v1`: `v` (không chỗ nào kiểm phiên bản), `conv.claimedAt` (`store.js:379`), `conv.startedBy` (`:656`), `conv.createdBy` (`:753`), `conv.resolvedBy` (`:569`, chỉ bị xóa ở `:314`).
- Trong `eso-feed` (xét các module `src/**/*.js`): `seen`, `rpv` (`seed.js:30`), `likes` và `rp` của bài, `likes` của reply — `reactions.js:8` ghi rõ con số `likes` không còn được đếm; `nr` chỉ bị xóa (`staff-store.js:269`).
- `export unreadCount` của `notifications/store.js:173` không được module `src` nào gọi.

**Đọc mà không ai ghi**

- `eso-res-pref:<id>.theme/contrast/reduceMotion` được `preview.js:609-622` đọc, nhưng nơi ghi duy nhất là `settings/resident.js:113, 128, 136` — module này và `partials/settings-app.html` không được trang nào nạp (Settings Resident nay là prototype, `preview.js:549`). Mã đang chạy chỉ ghi `phone`, `contact`.
- Prototype: `eso-bld`, `eso-tz`, `eso-test-gate` chỉ thấy đọc.

**Cùng một sự thật ở nhiều nơi**

- Tên người: `PERSONAS` (`personas.js:11-22`) so với Social `AUTHORS`/`PEOPLE` (3 bản sao: `social/store.js:41-44`, `staff-store.js:23-26`, `residents.js:46-49`). Không khớp: persona `res-2` "Priya Nair" / Social "Priya Shah"; persona `cli-2` "Marcus Cole" (Client) / Social "Marcus Lee" (Resident); "Dana Whitfield" là Client `cli-1` nhưng là Staff trong Social. Chỉ `alex → res:res-1` được nối (`reactions.js:54`). Thêm `ME` trong Documents (`documents/app.js:30`, `dockey-settings.js:14`) và tên trong công thức thông báo (`notifications/store.js:42, 83`).
- Dung lượng gói: `capacity/store.js:11-14` (261/500 chỗ, Staff 0/0) so với thông báo mẫu "261 / 25" và "Staff 18 / 3" (`notifications/store.js:63-64`) và `USAGE` (`client-workspace.js:19-23`).
- Guidelines mặc định: `social/store.js:25-37` và `DEF.gl` của prototype (`html:3233`). Prototype còn `eso-guide-v1` + `eso-social-terms-v1` (`html:4711-4719`), có vẻ là cổng guidelines thứ hai.
- Mute mặc định: `MUTE_DEFAULT` (`staff-store.js:143`) và `SS0.muted` (`html:1904`).
- Lượt claim promotion: `eso-pmc-saved[].claims` (chỉ prototype ghi, `html:6238`) quyết định `full` (`promotions/store.js:89-90`); claim của cư dân chỉ ghi vào `eso-res-promo:<id>` (`:171-172`); prototype còn `eso-pmclaims` riêng (`html:6383-6391`). Ba nguồn không nối với nhau.
- Thông báo: chuông trang thật dùng công thức + `eso-notif-read:*`; prototype có `eso-bell` và `eso-notif` riêng (`html:1533-1563`).
- Trạng thái làm việc: `<portal>:status*` (`portal-frame-extras.js:505-530`) và `eso-status` của prototype (`html:1081-1083`).
- Ticket hỗ trợ: Ticket box dùng `eso-msg-v1`; Help Center của prototype có kho `eso-sup` (`html:6933-6942`).
- Trạng thái "đã xem" Social: trang Social ghi `eso-res-social-seen:<id>` cho cả Staff và Resident, nhưng chuông chỉ đọc khóa này cho Resident (`live.js:72`); với Staff chuông dùng `eso-notif-read:*`.
- Theme Resident: `ui-prefs:resident.theme` và `eso-res-pref:<id>.theme`; cái sau chỉ tính khi cái trước chưa có (`preview.js:610-622`).

**Dữ liệu trộn portal / trộn người**

- `eso-msg-v1` chứa hội thoại của cả 4 portal trong một document; phân quyền chỉ bằng `canSee` trong mã (`store.js:249-265`).
- Shim chỉ tách hoàn toàn bản Client. Bản Resident và Admin của prototype dùng chung với Staff mọi khóa `eso-` trừ `eso-proto` — tức `eso-avatar`, `eso-notif`, `eso-sec`, `eso-mfa`, `eso-status`, `eso-feed`, `eso-social`, `eso-mod`… (`html:3`).
- Bản Client tự tạo bộ khóa song song (`client:eso-feed`… do `html:1662` chạy lúc tải) dù Client không có Social.
- Tác giả `'me'` trong `eso-feed` là "ai đang dùng app Staff": `stf-1` và `stf-2` dùng chung bài viết, `follow`, `mr`, `myRp`, `hid`, `mrx`, và `eso-social.muted` (`staff-store.js:7`). Riêng `eso-social-saved:<id>` lại tách theo persona.
- `eso-res-pref:<id>` chứa cả dữ liệu Admin (`eso-res-pref:adm-1`, `account-settings.staff.js:251-272`); `eso-res-privacy:<id>` và `eso-res-social-seen:<id>` chứa cả id Staff.
- Tách theo portal chứ không theo người: `ui-prefs:<portal>`, `<portal>:status*`, `<portal>:sb-pins`, `eso-proto`. Dùng chung mọi portal và mọi người: `eso-msg-context`, `eso-msg-contrast`, `eso-msg-recent-emoji`.
- Tài liệu mẫu chưa được lưu cho tới thay đổi đầu tiên, nên `portal-frame.js:15` và `usage/app.js:56` (đọc `eso-docs:client`) thấy rỗng trong khi trang Documents hiển thị 7 tài liệu.

---

## 6. Câu hỏi (những chỗ phải đoán)

1. Nhóm khóa 1b của prototype: chỉ liệt kê tên và dòng bằng grep, chưa đọc cấu trúc. Có cần lập bảng chi tiết cho chúng không, hay prototype nằm ngoài phạm vi QA dữ liệu?
2. `eso-sup` (Help Center của prototype) và ticket Support trong `eso-msg-v1`: được coi là hai nguồn độc lập vì không thấy mã nối; chưa đọc hết đoạn `html:6933-7073` để chắc chắn.
3. `eso-guide-v1` / `eso-social-terms-v1` so với `eso-mod.gl`: có phải hai cơ chế guidelines khác nhau (Staff và Resident)? Suy ra từ tên biến.
4. `eso-bld`, `eso-tz`, `eso-test-gate` "chỉ đọc": tìm theo chuỗi literal; có thể được ghi qua tên khóa ghép động hoặc do bộ test đặt.
5. `settings/resident.js` + `partials/settings-app.html`: kết luận "không trang nào nạp" vì không thấy `<script src>` hay `include` nào. Vite có entry nào khác nạp chúng không?
6. Nhánh dự phòng của `ticketNo()` (`store.js:43`): dành cho dữ liệu cũ chưa có `ticketNo`? Trong luồng hiện tại không thấy ticket nào thiếu `ticketNo`.
7. Việc Staff `stf-1` và `stf-2` dùng chung danh tính `'me'` trong Social là chủ ý của bản preview hay giới hạn chưa xử lý?
8. Các trường `emergency.by`, `emergency.msgId`, `vio.by`: chưa xác minh hết nơi đọc nên không xếp vào "không ai dùng".
9. Chưa đọc `tests/*.mjs` nên chưa đối chiếu ràng buộc nào đã có test.
