# 讓 GitHub 準時每 5 分鐘更新

> 這份是給小韋自己照著做的。**裡面有一個步驟要產生金鑰，那一步一定要你自己做、自己貼，
> 不要把金鑰貼給任何人（包括我）。**

---

## 為什麼要做這件事

workflow 裡設定的是 `cron: '*/5 * * * *'`（每 5 分鐘），但 GitHub 實際跑的紀錄是：

```
10/1 20:11  →  10/2 00:18  →  05:08  →  08:48  →  14:27
```

**大約每 4～5 小時才跑一次。**

這不是程式壞掉。GitHub 對免費帳號的「排程（schedule）」是**盡力而為**，負載高的時候
會延後、甚至整批跳過，官方文件自己就這樣寫。相對的，**手動觸發（workflow_dispatch）
不受這個限制，按下去就跑**——我自己 push 觸發的那幾次都是幾秒內開始。

所以解法是：**找一個外部的排程服務，每 5 分鐘替你「按一下」那個手動觸發。**

---

## 做完會怎樣

- 看板資料從「可能放了 4 小時」變成「最多 5 分鐘前」
- 手錶版、TDX 版、手機版全部受惠
- repo 是公開的，所以 **GitHub Actions 的執行時間不用錢**（公開 repo 無限免費）
- 原本的 `schedule` 保留當備胎，外部服務掛了至少還有幾小時一次

---

## 步驟 A：產生一把只能做這件事的金鑰（這步你自己做）

1. 用瀏覽器登入 GitHub，進 <https://github.com/settings/personal-access-tokens/new>
   （路徑：右上角頭像 → **Settings** → 最下面 **Developer settings**
   → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**）

2. 這樣填：

   | 欄位 | 填什麼 |
   |---|---|
   | **Token name** | `桃機看板排程` |
   | **Expiration** | 挑 1 年（到期要再產一次，順手記在行事曆） |
   | **Resource owner** | `xsos32-design`（你自己） |
   | **Repository access** | 選 **Only select repositories** → 勾 **T2arrival21402153** |

3. 往下到 **Repository permissions**，只開這一個：

   - **Actions** → 選 **Read and write**

   （**Metadata: Read-only** 會自動勾起來，那是必要的，不用管。其他全部維持 **No access**。）

4. 按 **Generate token**，畫面會出現一串 `github_pat_` 開頭的字。
   **這串只會出現這一次**，先複製起來。

> **為什麼要用 fine-grained（細緻權限）而不是舊的 classic token**：
> 這把鑰匙只能碰 `T2arrival21402153` 這一個 repo，而且只能碰 Actions。
> 就算哪天外流，別人也不能動你其他東西、不能改你的程式碼。

---

## 步驟 B：設定外部排程（cron-job.org，免費）

1. 到 <https://cron-job.org> 註冊一個帳號（免費方案就夠，支援到 1 分鐘間隔）

2. 按 **CREATE CRONJOB**，填：

   | 欄位 | 填什麼 |
   |---|---|
   | **Title** | `桃機看板 5 分鐘更新` |
   | **URL** | `https://api.github.com/repos/xsos32-design/T2arrival21402153/actions/workflows/build.yml/dispatches` |
   | **Execution schedule** | 選 **Every 5 minutes**（或自訂 `*/5 * * * *`） |

3. 展開 **ADVANCED**（進階）：

   - **Request method**：改成 **POST**

   - **Headers**（一行一組，按 + 新增）：

     | Key | Value |
     |---|---|
     | `Accept` | `application/vnd.github+json` |
     | `Authorization` | `Bearer 你剛剛複製的那串 github_pat_...` |
     | `X-GitHub-Api-Version` | `2022-11-28` |
     | `Content-Type` | `application/json` |

   - **Request body**（請求內容）填：

     ```json
     {"ref":"main"}
     ```

4. 存檔（**CREATE**）。

---

## 步驟 C：確認真的有效

1. 在 cron-job.org 的那個 job 上按 **TEST RUN**（或等 5 分鐘）

2. 看回應狀態碼：

   | 狀態碼 | 意思 | 怎麼辦 |
   |---|---|---|
   | **204** | **成功**（GitHub 收到了，沒有回傳內容是正常的） | 完成 |
   | 401 | 金鑰錯了或貼漏了 | 檢查 `Authorization` 有沒有 `Bearer ` 開頭（Bearer 後面有一個空格） |
   | 403 | 金鑰權限不足 | 回步驟 A 確認 **Actions = Read and write** |
   | 404 | 網址打錯，或金鑰沒有這個 repo 的權限 | 檢查網址、檢查有沒有勾到 T2arrival21402153 |
   | 422 | `ref` 錯了 | 確認 body 是 `{"ref":"main"}` |

3. 到 <https://github.com/xsos32-design/T2arrival21402153/actions> 看，
   應該會出現一筆新的執行，而且**每 5 分鐘一筆**。

4. 最後開看板，標題列的「幾分前」應該維持在 **5 分鐘以內**。

---

## 之後要注意的

- **金鑰會到期**。到期前 GitHub 會寄信給你。重新產一把，回 cron-job.org 把
  `Authorization` 那一行換掉就好，其他不用動。
- **如果哪天覺得金鑰可能外流**：到
  <https://github.com/settings/personal-access-tokens> 把它 **Revoke**（撤銷），
  再產一把新的。撤銷是立即生效的。
- **不要把這串金鑰貼在對話、截圖、或任何公開的地方。** repo 是公開的，
  千萬不要把它寫進程式碼或 commit 上去。

---

## 有沒有不用金鑰的做法？

有，但我不建議：

把 workflow 改成「**一個工作跑五個半小時，裡面每 5 分鐘自己重建一次**」
（GitHub 單一 job 上限 6 小時）。這樣完全不用金鑰。

**為什麼不建議**：
- 現在的部署是走 GitHub 官方的 Pages action，那個**沒辦法在同一個 job 裡重複執行**，
  得改成「自己 push 到 gh-pages 分支」，Pages 的設定也要跟著改
- 等於把現在**已經正常運作**的部署流程整個換掉，壞掉的機會變多
- 那個長時間的 job 一旦中途掛掉，就要等下一次排程（又是好幾小時）

用外部排程的做法**完全不動現有流程**，只是多一隻手在旁邊幫你按按鈕。
壞了就退回現在的狀況，不會更糟。

---

## 順帶一提：手錶版已經有保險了

就算這個排程你還沒設好，手錶版**每次開頁都會自己跟 TDX 對一次**
時間、登機門、狀態（10/2 改的）。所以你看到的那三項一定是即時的。

這個排程要修的是另外兩件 TDX 補不到的事：
**班機清單本身**（這段時間新增／取消的班機）和**預估入境人數**。
