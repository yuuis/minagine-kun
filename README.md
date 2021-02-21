# みなじんくん

みなじんを自動で打刻してくれるツール。  
打刻結果と働いた時間などをSlackに通知する。

必要なもの
- SlackのWebhook URL
- Firebase Project (利用するのはCloud Functions For Firebase のみ)

## How to use

打刻するときは
```sh
  curl -X POST -H "X-TOKEN: xxxxxxxxxx" https://xxxxx.cloudfunctions.net/minagine/start # 勤務開始
  curl -X POST -H "X-TOKEN: xxxxxxxxxx" https://xxxxx.cloudfunctions.net/minagine/end # 勤務終了
```

## build

```sh
  npm run lint
  npm run build
```

## deploy

1. Auth用のtokenを作成する。打刻リクエストで毎回使うのでメモしておく。
```sh
uuidgen | pbcopy
```

2. credentials.jsonを作成し、中身を入力する。
```sh
cp functions/credentials_sample.json functions/credentials.json
```
- `key`: 1.で作成したUUID
- `minagine_config`: 自身のアカウントのDomain/ID/Password
- `slack_config.url`: 結果通知用。webhook_url。

3.Firebaseコンソールで新規プロジェクトを作成する
このときのIDを控えておき、CLIで以下のコマンドを実行する

```sh
firebase use ${プロジェクトID}
```
またfirebasercのプロジェクトIDも以下のように修正する
```json
{
  "projects": {
    "personal": "${プロジェクトID}",
    "default": "${プロジェクトID}"
  }
}
```

4.Cloud Functions For Firebase にデプロイする。
```sh
  npm run deploy
```
