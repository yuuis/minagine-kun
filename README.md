# みなじんくん

みなじんを自動で打刻してくれるくん

## how to use

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

```sh
  npm run deploy
```
