<!--
doc-type: セットアップ
id-prefix: なし
related: docs/setup/README.md, docs/development/README.md, docs/INDEX.md
-->

# GitHub SSH接続手順

## 1. 目的

ローカルのGitリポジトリをGitHubリポジトリへSSHで接続し、ソースコードと設計ドキュメントを安全に管理できる状態にする。

対象リポジトリ:

- GitHub: `ichime-develop/study-pm`
- SSH URL: `git@github.com:ichime-develop/study-pm.git`

## 2. SSH接続を利用する理由

SSH接続では、ローカル端末に保存した秘密鍵とGitHubへ登録した公開鍵を使って認証する。GitHubのユーザー名やPersonal Access TokenをGit操作のたびに入力する必要がない。

秘密鍵は端末外へ共有せず、GitHubには公開鍵だけを登録する。

## 3. 前提条件

- macOSのターミナルを利用できる
- GitHubアカウントへログインできる
- GitHubアカウントが`ichime-develop/study-pm`へ書き込みできる
- Gitがインストールされている
- ローカルリポジトリの場所が次である

```text
/Users/ichikawa/StudioProjects/study-pm
```

Gitの確認:

```bash
git --version
```

## 4. セキュリティ上の注意

- 秘密鍵ファイルは、GitHub、チャット、メール、クラウドストレージへ共有しない。
- 公開鍵は`.pub`で終わるファイルであり、GitHubへ登録してよい。
- SSH鍵には推測されにくいパスフレーズを設定する。
- 鍵を紛失した場合や端末を廃棄する場合は、GitHubから該当するSSH鍵を削除する。
- `ssh -T git@github.com`の初回接続時は、表示されたホスト鍵フィンガープリントをGitHub公式情報と照合する。一致を確認せずに`yes`を入力しない。

## 5. 実施手順

### 5.1 Gitのユーザー情報を確認する

コミットに記録されるユーザー名とメールアドレスを確認する。

```bash
git config --global user.name
git config --global user.email
```

未設定または変更が必要な場合:

```bash
git config --global user.name "GitHubで使用する名前"
git config --global user.email "GitHubで使用するメールアドレス"
```

メールアドレスを公開したくない場合は、GitHubが提供する`noreply`メールアドレスの利用を検討する。

### 5.2 既存のSSH鍵を確認する

既存の鍵を上書きしないため、最初に`~/.ssh`の内容を確認する。

```bash
ls -la ~/.ssh
```

`~/.ssh`が存在しない場合は、まだSSH鍵を作成していない可能性がある。次のコマンドで、所有者だけが読み書きできるディレクトリを作成する。

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

既存鍵を再利用する場合は、その鍵がGitHub認証用として安全に管理されていることを確認する。用途を分けるため、本手順ではGitHub専用の鍵を新規作成する。

### 5.3 GitHub用のSSH鍵を作成する

Ed25519形式の鍵を作成する。

```bash
ssh-keygen -t ed25519 -C "GitHubで使用するメールアドレス" -f ~/.ssh/id_ed25519_github
```

実行時にパスフレーズの入力を求められる。空欄にはせず、端末を紛失した場合でも秘密鍵を悪用されにくいパスフレーズを設定する。

作成されるファイル:

| ファイル | 種類 | 取り扱い |
| --- | --- | --- |
| `~/.ssh/id_ed25519_github` | 秘密鍵 | 外部へ共有しない |
| `~/.ssh/id_ed25519_github.pub` | 公開鍵 | GitHubへ登録する |

### 5.4 SSH設定を追加する

`~/.ssh/config`が存在しない場合は作成し、既存ファイルがある場合は内容を確認してから追記する。

```bash
touch ~/.ssh/config
chmod 600 ~/.ssh/config
```

`~/.ssh/config`へ次を追加する。

```sshconfig
Host github.com
  HostName github.com
  User git
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
```

この設定により、`github.com`への接続ではGitHub専用鍵を使用する。

標準手順では、`github.com`のSSH接続に通常の22番ポートを使用する。社内ネットワークやファイアウォールによって22番ポートが拒否される場合だけ、トラブルシューティングの「SSH接続で22番ポートが拒否される」を参照する。

### 5.5 SSH鍵をssh-agentへ追加する

ssh-agentを開始し、秘密鍵のパスフレーズをmacOSのキーチェーンへ保存する。

```bash
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github
```

登録確認:

```bash
ssh-add -l
```

作成したEd25519鍵が表示されることを確認する。

### 5.6 公開鍵をGitHubへ登録する

公開鍵をクリップボードへコピーする。

```bash
pbcopy < ~/.ssh/id_ed25519_github.pub
```

GitHubで次の操作を行う。

1. GitHubへログインする。
2. 右上のプロフィール画像から`Settings`を開く。
3. `SSH and GPG keys`を開く。
4. `New SSH key`を選択する。
5. `Title`へ端末を識別できる名前を入力する。例: `MacBook study-pm`
6. `Key type`は`Authentication Key`を選択する。
7. `Key`へコピーした公開鍵を貼り付ける。
8. `Add SSH key`を選択する。

### 5.7 GitHubへのSSH接続を確認する

```bash
ssh -T git@github.com
```

初回接続時は、GitHubのホスト鍵フィンガープリントを公式ドキュメントと照合する。一致した場合だけ`yes`を入力する。

認証に成功すると、GitHubユーザー名を含む認証成功メッセージが表示される。GitHubはSSHのシェルアクセスを提供しないため、この確認コマンドが終了コード`1`になることは正常である。

### 5.8 ローカルリポジトリへSSHリモートを設定する

ローカルリポジトリへ移動する。

```bash
cd /Users/ichikawa/StudioProjects/study-pm
```

現在のリモート設定を確認する。

```bash
git remote -v
```

`origin`が未設定の場合:

```bash
git remote add origin git@github.com:ichime-develop/study-pm.git
```

`origin`がHTTPSなど別のURLで設定済みの場合:

```bash
git remote set-url origin git@github.com:ichime-develop/study-pm.git
```

設定確認:

```bash
git remote -v
```

fetchとpushの両方が次のURLになっていることを確認する。

```text
git@github.com:ichime-develop/study-pm.git
```

### 5.9 GitHubリポジトリの既存状態を確認する

初回pushの前に、GitHub側に既存ブランチやコミットがあるか確認する。

```bash
git ls-remote origin
```

- 何も表示されない場合、GitHub側は空のリポジトリである。
- `refs/heads/main`などが表示された場合、GitHub側に既存コミットがある。内容を確認せずに上書きpushしない。

### 5.10 初回コミットとpushを行う

GitHub側が空のリポジトリであることを確認できた場合だけ、初回コミットを作成する。

```bash
git status
git branch -M main
git add docs
git commit -m "Add initial project documentation"
git push -u origin main
```

push後の確認:

```bash
git status
git branch -vv
```

次の状態を確認する。

- 作業ツリーに意図しない未コミット変更がない
- ローカルの`main`ブランチが`origin/main`を追跡している
- GitHubの`ichime-develop/study-pm`でドキュメントを閲覧できる

## 6. 完了条件

| ID | 確認内容 |
| --- | --- |
| GH-SETUP-01 | GitHub専用のEd25519鍵が作成されている |
| GH-SETUP-02 | 秘密鍵が外部へ共有されていない |
| GH-SETUP-03 | 公開鍵がGitHubアカウントへ登録されている |
| GH-SETUP-04 | `ssh -T git@github.com`でGitHubユーザーとして認証できる |
| GH-SETUP-05 | `origin`がSSH URLに設定されている |
| GH-SETUP-06 | `main`ブランチを`origin/main`へpushできる |

## 7. トラブルシューティング

### 7.1 `Permission denied (publickey)`が表示される

確認項目:

```bash
ssh-add -l
ssh -vT git@github.com
```

- ssh-agentへ鍵が追加されているか
- GitHubへ登録した公開鍵と、ローカルの秘密鍵が対応しているか
- `~/.ssh/config`の`IdentityFile`が正しいか
- GitHubアカウントが対象リポジトリへアクセスできるか

### 7.2 `remote origin already exists`が表示される

既存の`origin`を確認し、必要な場合だけSSH URLへ変更する。

```bash
git remote -v
git remote set-url origin git@github.com:ichime-develop/study-pm.git
```

### 7.3 pushが拒否される

GitHub側に既存コミットがある可能性がある。強制pushは行わず、次で状態を確認する。

```bash
git ls-remote origin
git fetch origin
git branch -a
```

既存コミットをどのように取り込むか判断してから作業する。

### 7.4 SSH接続で22番ポートが拒否される

社内ネットワークやファイアウォールによって通常のSSH接続が拒否される場合は、SSH over 443を利用できるか確認する。

まず、設定を変更せずに`ssh.github.com`の443番ポートへ接続できるか確認する。

```bash
ssh -T -p 443 git@ssh.github.com
```

初回接続時は、表示されたホスト鍵フィンガープリントをGitHub公式情報と照合し、一致した場合だけ`yes`を入力する。

認証に成功した場合は、`~/.ssh/config`の`Host github.com`設定を次の内容へ変更する。

```sshconfig
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
```

`Host github.com`はGitのリモートURLで使用する名前、`HostName ssh.github.com`は443番ポート接続用のGitHubホスト名である。リモートURLは`git@github.com:ichime-develop/study-pm.git`のまま変更しない。

設定後、通常と同じコマンドで接続を確認する。

```bash
ssh -T git@github.com
```

SSH over 443は、22番ポートで接続できない場合の代替手段として使用する。プロキシサーバーなどの構成によっては443番ポートでも接続できない場合がある。

### 7.5 秘密鍵を紛失または漏えいした

1. GitHubの`Settings`から`SSH and GPG keys`を開く。
2. 該当するSSH鍵を削除する。
3. 新しいSSH鍵を作成して登録する。
4. 漏えいした秘密鍵を端末から削除する。

## 8. 参考資料

- [GitHub Docs: Connecting to GitHub with SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [GitHub Docs: Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent?platform=mac)
- [GitHub Docs: Adding a new SSH key to your GitHub account](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account?platform=mac)
- [GitHub Docs: Testing your SSH connection](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)
- [GitHub Docs: Using SSH over the HTTPS port](https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)
